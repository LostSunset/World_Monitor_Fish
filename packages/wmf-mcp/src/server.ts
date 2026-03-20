import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// --- Configuration ---

const WM_API_URL = process.env.WM_API_URL || "http://localhost:3000";
const MF_API_URL = process.env.MF_API_URL || "http://localhost:5001";
const INTEGRATION_API_URL =
  process.env.INTEGRATION_API_URL || "http://localhost:4000";
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();
const INTEGRATION_API_KEY = process.env.INTEGRATION_API_KEY || "";
const MF_API_KEY = process.env.MF_API_KEY || "";

// --- Helpers ---

async function fetchJSON(
  url: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...options.headers,
      },
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { error: `Connection failed: ${(err as Error).message}` },
    };
  }
}

function mfHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (MF_API_KEY) h["X-API-Key"] = MF_API_KEY;
  return h;
}

function integrationHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (INTEGRATION_API_KEY)
    h["Authorization"] = `Bearer ${INTEGRATION_API_KEY}`;
  return h;
}

async function dockerCompose(
  cmd: string
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(`docker compose ${cmd}`, { cwd: PROJECT_ROOT });
}

const VALID_DOCKER_SERVICES = [
  "redis",
  "redis-rest",
  "worldmonitor",
  "ais-relay",
  "mirofish-backend",
  "mirofish-frontend",
  "integration-gw",
] as const;

function formatJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// --- MCP Server ---

const server = new McpServer({
  name: "wmf",
  version: "1.0.0",
});

// =====================
//  Monitoring Tools
// =====================

server.tool(
  "service_health",
  "Check health status of all WMF services (WorldMonitor, MiroFish, Integration, Redis)",
  {},
  async () => {
    const [wm, mf, integration, docker] = await Promise.all([
      fetchJSON(`${WM_API_URL}/api/health`),
      fetchJSON(`${MF_API_URL}/health`),
      fetchJSON(`${INTEGRATION_API_URL}/health`),
      dockerCompose("ps --format json").catch((e) => ({
        stdout: "",
        stderr: (e as Error).message,
      })),
    ]);

    let dockerServices = "Docker not available";
    if ("stdout" in docker && docker.stdout) {
      try {
        const lines = docker.stdout.trim().split("\n");
        const services = lines.map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return l;
          }
        });
        dockerServices = formatJSON(services);
      } catch {
        dockerServices = docker.stdout;
      }
    } else if ("stderr" in docker && docker.stderr) {
      dockerServices = `Error: ${docker.stderr}`;
    }

    const result = {
      worldmonitor: {
        url: WM_API_URL,
        status: wm.ok ? "healthy" : "unreachable",
        details: wm.data,
      },
      mirofish: {
        url: MF_API_URL,
        status: mf.ok ? "healthy" : "unreachable",
        details: mf.data,
      },
      integration: {
        url: INTEGRATION_API_URL,
        status: integration.ok ? "healthy" : "unreachable",
        details: integration.data,
      },
      docker: dockerServices,
    };

    return { content: [{ type: "text", text: formatJSON(result) }] };
  }
);

server.tool(
  "list_projects",
  "List all MiroFish projects",
  { limit: z.number().optional().describe("Max number of projects to return") },
  async ({ limit }) => {
    const q = limit ? `?limit=${limit}` : "";
    const res = await fetchJSON(`${MF_API_URL}/api/graph/project/list${q}`, {
      headers: mfHeaders(),
    });
    return { content: [{ type: "text", text: formatJSON(res.data) }] };
  }
);

server.tool(
  "list_simulations",
  "List all MiroFish simulations and their statuses",
  {
    limit: z.number().optional().describe("Max number of simulations"),
    offset: z.number().optional().describe("Offset for pagination"),
  },
  async ({ limit, offset }) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", String(limit));
    if (offset !== undefined) params.set("offset", String(offset));
    const q = params.toString() ? `?${params}` : "";
    const res = await fetchJSON(`${MF_API_URL}/api/simulation/list${q}`, {
      headers: mfHeaders(),
    });
    return { content: [{ type: "text", text: formatJSON(res.data) }] };
  }
);

server.tool(
  "simulation_status",
  "Get real-time status of a specific simulation",
  {
    simulation_id: z.string().describe("Simulation ID to query"),
    detail: z
      .boolean()
      .optional()
      .describe("Include detailed status (agents, rounds)"),
  },
  async ({ simulation_id, detail }) => {
    const endpoint = detail ? "run-status/detail" : "run-status";
    const res = await fetchJSON(
      `${MF_API_URL}/api/simulation/${simulation_id}/${endpoint}`,
      { headers: mfHeaders() }
    );
    return { content: [{ type: "text", text: formatJSON(res.data) }] };
  }
);

server.tool(
  "get_predictions",
  "Get simulation results and predictions",
  {
    simulation_id: z.string().describe("Simulation ID"),
  },
  async ({ simulation_id }) => {
    const res = await fetchJSON(
      `${INTEGRATION_API_URL}/api/integration/results/${simulation_id}`,
      { headers: integrationHeaders() }
    );
    return { content: [{ type: "text", text: formatJSON(res.data) }] };
  }
);

server.tool(
  "get_report",
  "Get analysis report for a simulation",
  {
    simulation_id: z.string().describe("Simulation ID"),
  },
  async ({ simulation_id }) => {
    const res = await fetchJSON(
      `${MF_API_URL}/api/report/by-simulation/${simulation_id}`,
      { headers: mfHeaders() }
    );
    return { content: [{ type: "text", text: formatJSON(res.data) }] };
  }
);

server.tool(
  "data_freshness",
  "Check WorldMonitor data source freshness and cache status",
  {},
  async () => {
    const res = await fetchJSON(`${WM_API_URL}/api/health?compact=1`);
    return { content: [{ type: "text", text: formatJSON(res.data) }] };
  }
);

server.tool(
  "security_check",
  "Run the security test suite",
  {},
  async () => {
    try {
      const { stdout, stderr } = await execAsync("npm run test", {
        cwd: PROJECT_ROOT,
        timeout: 120_000,
      });
      return {
        content: [
          {
            type: "text",
            text: `## Test Results\n\n**stdout:**\n\`\`\`\n${stdout}\n\`\`\`\n\n**stderr:**\n\`\`\`\n${stderr}\n\`\`\``,
          },
        ],
      };
    } catch (err) {
      const e = err as Error & { stdout?: string; stderr?: string };
      return {
        content: [
          {
            type: "text",
            text: `## Test Failed\n\n**stdout:**\n\`\`\`\n${e.stdout || ""}\n\`\`\`\n\n**stderr:**\n\`\`\`\n${e.stderr || e.message}\n\`\`\``,
          },
        ],
      };
    }
  }
);

// =====================
//  Operation Tools
// =====================

server.tool(
  "trigger_simulation",
  "Trigger a MiroFish simulation from WorldMonitor event data",
  {
    domain: z
      .string()
      .describe(
        "Analysis domain: conflict, finance, climate, cyber, maritime"
      ),
    topic: z.string().describe("Main topic of analysis"),
    events: z
      .array(
        z.object({
          title: z.string(),
          description: z.string(),
          timestamp: z.string(),
          source: z.string().optional(),
          location: z
            .object({ lat: z.number(), lng: z.number() })
            .optional(),
          entities: z.array(z.string()).optional(),
        })
      )
      .describe("WorldMonitor events to analyze"),
    simulation_config: z
      .object({
        platforms: z.array(z.string()).optional(),
        maxRounds: z.number().optional(),
        agentCount: z.number().optional(),
      })
      .optional()
      .describe("Optional simulation configuration overrides"),
  },
  async ({ domain, topic, events, simulation_config }) => {
    const body: Record<string, unknown> = { domain, topic, events };
    if (simulation_config) body.simulationConfig = simulation_config;

    const res = await fetchJSON(
      `${INTEGRATION_API_URL}/api/integration/trigger`,
      {
        method: "POST",
        headers: integrationHeaders(),
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Trigger failed (${res.status}): ${formatJSON(res.data)}`,
          },
        ],
      };
    }

    return { content: [{ type: "text", text: formatJSON(res.data) }] };
  }
);

server.tool(
  "start_services",
  "Start all WMF Docker Compose services",
  {
    detach: z
      .boolean()
      .optional()
      .default(true)
      .describe("Run in detached mode (default: true)"),
  },
  async ({ detach }) => {
    try {
      const flag = detach ? "-d" : "";
      const { stdout, stderr } = await dockerCompose(`up ${flag}`);
      return {
        content: [
          { type: "text", text: `Services started.\n\n${stdout}\n${stderr}` },
        ],
      };
    } catch (err) {
      const e = err as Error & { stderr?: string };
      return {
        content: [
          {
            type: "text",
            text: `Failed to start services: ${e.stderr || e.message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "stop_services",
  "Stop all WMF Docker Compose services",
  {},
  async () => {
    try {
      const { stdout, stderr } = await dockerCompose("down");
      return {
        content: [
          { type: "text", text: `Services stopped.\n\n${stdout}\n${stderr}` },
        ],
      };
    } catch (err) {
      const e = err as Error & { stderr?: string };
      return {
        content: [
          {
            type: "text",
            text: `Failed to stop services: ${e.stderr || e.message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "restart_service",
  "Restart a specific Docker Compose service",
  {
    service: z
      .enum(VALID_DOCKER_SERVICES)
      .describe("Service name to restart"),
  },
  async ({ service }) => {
    try {
      const { stdout, stderr } = await dockerCompose(`restart ${service}`);
      return {
        content: [
          {
            type: "text",
            text: `Service '${service}' restarted.\n\n${stdout}\n${stderr}`,
          },
        ],
      };
    } catch (err) {
      const e = err as Error & { stderr?: string };
      return {
        content: [
          {
            type: "text",
            text: `Failed to restart '${service}': ${e.stderr || e.message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "run_tests",
  "Run test suite (integration, security, or all)",
  {
    scope: z
      .enum(["all", "integration", "worldmonitor", "mirofish"])
      .optional()
      .default("all")
      .describe("Test scope to run"),
  },
  async ({ scope }) => {
    try {
      let cmd: string;
      switch (scope) {
        case "integration":
          cmd = "npm run test --workspace=@wmf/integration";
          break;
        case "worldmonitor":
          cmd = "npm run test --workspace=packages/worldmonitor";
          break;
        case "mirofish":
          cmd = "npm run test --workspace=packages/mirofish/frontend";
          break;
        default:
          cmd = "npm run test";
      }
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: PROJECT_ROOT,
        timeout: 180_000,
      });
      return {
        content: [
          {
            type: "text",
            text: `## Tests (${scope})\n\n\`\`\`\n${stdout}\n\`\`\`\n${stderr ? `\n**stderr:**\n\`\`\`\n${stderr}\n\`\`\`` : ""}`,
          },
        ],
      };
    } catch (err) {
      const e = err as Error & { stdout?: string; stderr?: string };
      return {
        content: [
          {
            type: "text",
            text: `## Tests Failed (${scope})\n\n\`\`\`\n${e.stdout || ""}\n\`\`\`\n\n**stderr:**\n\`\`\`\n${e.stderr || e.message}\n\`\`\``,
          },
        ],
      };
    }
  }
);

// =====================
//  Interactive Tools
// =====================

server.tool(
  "chat_agent",
  "Chat with a MiroFish simulation agent (interview an agent)",
  {
    simulation_id: z.string().describe("Simulation ID"),
    agent_uuid: z
      .string()
      .optional()
      .describe("Specific agent UUID (omit to interview all agents)"),
    prompt: z.string().describe("Message / question to send to the agent(s)"),
  },
  async ({ simulation_id, agent_uuid, prompt }) => {
    let url: string;
    let body: Record<string, unknown>;

    if (agent_uuid) {
      url = `${MF_API_URL}/api/simulation/interview`;
      body = { simulation_id, agent_uuid, prompt };
    } else {
      url = `${MF_API_URL}/api/simulation/interview/all`;
      body = { simulation_id, prompt };
    }

    const res = await fetchJSON(url, {
      method: "POST",
      headers: mfHeaders(),
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text", text: formatJSON(res.data) }] };
  }
);

server.tool(
  "chat_report",
  "Chat with the MiroFish ReportAgent to analyze a report interactively",
  {
    report_id: z.string().describe("Report ID to discuss"),
    message: z.string().describe("Question or analysis request"),
  },
  async ({ report_id, message }) => {
    const res = await fetchJSON(`${MF_API_URL}/api/report/chat`, {
      method: "POST",
      headers: mfHeaders(),
      body: JSON.stringify({ report_id, message }),
    });
    return { content: [{ type: "text", text: formatJSON(res.data) }] };
  }
);

// --- Start server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("WMF MCP server failed to start:", err);
  process.exit(1);
});
