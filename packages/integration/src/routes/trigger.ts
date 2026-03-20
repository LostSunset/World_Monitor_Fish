import { Router, Request, Response } from 'express';

const MF_API_URL = process.env.MF_API_URL || 'http://localhost:5001';
const MF_API_KEY = process.env.MIROFISH_API_KEYS?.split(',')[0]?.trim() || '';

export const triggerRouter = Router();

interface TriggerRequest {
  domain: string;
  topic: string;
  events: Array<{
    title: string;
    description: string;
    timestamp: string;
    source?: string;
    location?: { lat: number; lng: number };
    entities?: string[];
  }>;
  simulationConfig?: {
    platforms?: string[];
    maxRounds?: number;
    agentCount?: number;
  };
}

/**
 * POST /api/integration/trigger
 * Trigger a MiroFish simulation from WorldMonitor event data.
 * Converts WM events into documents, builds a knowledge graph, and starts simulation.
 */
triggerRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as TriggerRequest;

    if (!body.domain || !body.topic || !body.events?.length) {
      res.status(400).json({ error: 'Missing required fields: domain, topic, events' });
      return;
    }

    // Step 1: Convert WM events to a text document for MiroFish
    const documentContent = convertEventsToDocument(body);

    // Step 2: Generate ontology via MiroFish API
    const ontologyResponse = await callMiroFish('/api/graph/ontology/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text_content: documentContent,
        requirement: `Analyze ${body.domain} events about "${body.topic}" and predict social media reactions and outcomes.`,
      }),
    });

    if (!ontologyResponse.success) {
      res.status(502).json({ error: 'Failed to generate ontology', details: ontologyResponse.error });
      return;
    }

    // Step 3: Build knowledge graph
    const graphResponse = await callMiroFish('/api/graph/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: ontologyResponse.project_id,
      }),
    });

    res.json({
      success: true,
      project_id: ontologyResponse.project_id,
      task_id: graphResponse.task_id,
      message: 'Simulation pipeline triggered. Use /status to track progress.',
    });
  } catch (error) {
    console.error('[trigger] Error:', error);
    res.status(500).json({ error: 'Failed to trigger simulation' });
  }
});

function convertEventsToDocument(data: TriggerRequest): string {
  const lines: string[] = [
    `# ${data.domain.toUpperCase()} Intelligence Report: ${data.topic}`,
    `Generated: ${new Date().toISOString()}`,
    `Source: WorldMonitor Real-time Intelligence`,
    '',
    `## Events Summary`,
    '',
  ];

  for (const event of data.events) {
    lines.push(`### ${event.title}`);
    lines.push(`- Time: ${event.timestamp}`);
    if (event.source) lines.push(`- Source: ${event.source}`);
    if (event.location) lines.push(`- Location: ${event.location.lat}, ${event.location.lng}`);
    if (event.entities?.length) lines.push(`- Key Entities: ${event.entities.join(', ')}`);
    lines.push('');
    lines.push(event.description);
    lines.push('');
  }

  return lines.join('\n');
}

async function callMiroFish(path: string, init: RequestInit): Promise<any> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (MF_API_KEY) {
    headers['X-MiroFish-Key'] = MF_API_KEY;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  const response = await fetch(`${MF_API_URL}${path}`, { ...init, headers });
  return response.json();
}
