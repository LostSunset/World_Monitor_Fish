# World Monitor Fish

Monorepo integrating **WorldMonitor** (real-time intelligence dashboard) and **MiroFish** (swarm intelligence prediction engine).

## Architecture

```
packages/
  worldmonitor/   # TypeScript/Vite SPA + Vercel Edge Functions + Tauri desktop
  mirofish/       # Python Flask backend + Vue 3 frontend
  integration/    # Node.js/Express bridge service (WM <-> MF)
  wmf-mcp/        # Claude Code MCP plugin (stdio transport)
```

### WorldMonitor
Real-time global intelligence dashboard tracking 28+ data domains — conflict, maritime, cyber, economic, climate, and more. Built with TypeScript/Vite as a SPA with Vercel Edge Functions for API routes and Tauri for desktop packaging.

### MiroFish
Swarm intelligence prediction engine. Python Flask backend generates knowledge graphs from documents, runs multi-agent simulations, and produces analysis reports. Vue 3 frontend for simulation management.

### Integration Service
Node.js/Express bridge that connects WorldMonitor events to MiroFish simulations. Transforms WM event data into MF-compatible documents, triggers simulations, and publishes predictions back to Redis for WM consumption.

### WMF MCP Plugin
Claude Code plugin providing direct system control via MCP (Model Context Protocol). 14 tools for monitoring, operations, and interactive agent communication. Includes slash commands (`/wmf-status`, `/wmf-simulate`, `/wmf-monitor`) and an automated ops agent.

## Quick Start

```bash
# Install dependencies
npm install

# Start all services
npm run dev

# Or via Docker
docker compose up -d
```

### Individual Services

```bash
npm run dev:wm           # WorldMonitor (port 5173)
npm run dev:mf           # MiroFish (backend 5001, frontend 3000)
npm run dev:integration  # Integration service (port 4000)
```

## Environment

Copy `.env.example` to `.env` and configure required variables:

```bash
cp .env.example .env
```

Key variables: `REDIS_TOKEN`, `SECRET_KEY`, `INTEGRATION_API_KEYS`

## Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| redis | 6379 | Shared cache |
| redis-rest | 8079 | Serverless Redis HTTP |
| worldmonitor | 3000 | Intelligence dashboard |
| ais-relay | 3001 | Vessel tracking relay |
| mirofish-backend | 5001 | Prediction engine |
| mirofish-frontend | 3001 | Simulation UI |
| integration-gw | 4000 | WM-MF bridge |

## WMF MCP Plugin

Install the plugin in Claude Code to get direct system control:

**Slash Commands:**
- `/wmf-status` — System health overview
- `/wmf-simulate` — Interactive simulation trigger
- `/wmf-monitor` — Continuous monitoring mode

**MCP Tools (14):**

| Category | Tools |
|----------|-------|
| Monitoring | `service_health`, `list_projects`, `list_simulations`, `simulation_status`, `get_predictions`, `get_report`, `data_freshness`, `security_check` |
| Operations | `trigger_simulation`, `start_services`, `stop_services`, `restart_service`, `run_tests` |
| Interactive | `chat_agent`, `chat_report` |

## License

Private — All rights reserved.
