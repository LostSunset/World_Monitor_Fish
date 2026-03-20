import { Router, Request, Response } from 'express';

const MF_API_URL = process.env.MF_API_URL || 'http://localhost:5001';
const MF_API_KEY = process.env.MIROFISH_API_KEYS?.split(',')[0]?.trim() || '';

export const statusRouter = Router();

/**
 * GET /api/integration/status/:simulationId
 * Get the current status of a MiroFish simulation.
 */
statusRouter.get('/:simulationId', async (req: Request, res: Response) => {
  try {
    const { simulationId } = req.params;

    const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
    if (MF_API_KEY) headers['X-MiroFish-Key'] = MF_API_KEY;

    const response = await fetch(`${MF_API_URL}/api/simulation/${simulationId}/run-status`, { headers });
    const data = await response.json();

    res.json({
      success: true,
      simulationId,
      status: data.status || 'unknown',
      progress: data.progress || null,
      currentRound: data.current_round || null,
      totalRounds: data.total_rounds || null,
    });
  } catch (error) {
    console.error('[status] Error:', error);
    res.status(500).json({ error: 'Failed to fetch simulation status' });
  }
});

/**
 * GET /api/integration/status/task/:taskId
 * Get the status of an async task (graph building, etc.)
 */
statusRouter.get('/task/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
    if (MF_API_KEY) headers['X-MiroFish-Key'] = MF_API_KEY;

    const response = await fetch(`${MF_API_URL}/api/graph/task/${taskId}`, { headers });
    const data = await response.json();

    res.json({
      success: true,
      taskId,
      status: data.status || 'unknown',
      progress: data.progress || null,
    });
  } catch (error) {
    console.error('[status] Error:', error);
    res.status(500).json({ error: 'Failed to fetch task status' });
  }
});
