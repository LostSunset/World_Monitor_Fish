import { Router, Request, Response } from 'express';

const MF_API_URL = process.env.MF_API_URL || 'http://localhost:5001';
const MF_API_KEY = process.env.MIROFISH_API_KEYS?.split(',')[0]?.trim() || '';
const REDIS_URL = process.env.REDIS_URL || 'http://localhost:8079';
const REDIS_TOKEN = process.env.REDIS_TOKEN || '';

export const resultsRouter = Router();

/**
 * GET /api/integration/results/:simulationId
 * Fetch simulation results from MiroFish and optionally cache to Redis for WorldMonitor.
 */
resultsRouter.get('/:simulationId', async (req: Request, res: Response) => {
  try {
    const { simulationId } = req.params;

    const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
    if (MF_API_KEY) headers['X-MiroFish-Key'] = MF_API_KEY;

    // Fetch multiple data points in parallel
    const [postsRes, timelineRes, statsRes] = await Promise.all([
      fetch(`${MF_API_URL}/api/simulation/${simulationId}/posts?limit=50`, { headers }),
      fetch(`${MF_API_URL}/api/simulation/${simulationId}/timeline`, { headers }),
      fetch(`${MF_API_URL}/api/simulation/${simulationId}/agent-stats`, { headers }),
    ]);

    const [posts, timeline, stats] = await Promise.all([
      postsRes.json(),
      timelineRes.json(),
      statsRes.json(),
    ]);

    const result = {
      success: true,
      simulationId,
      summary: {
        totalPosts: posts.data?.length || 0,
        rounds: timeline.data?.length || 0,
        activeAgents: stats.data?.length || 0,
      },
      posts: posts.data || [],
      timeline: timeline.data || [],
      agentStats: stats.data || [],
    };

    // Cache results to Redis for WorldMonitor consumption
    if (req.query.cache === 'true') {
      await cacheToRedis(`mirofish:results:${simulationId}`, JSON.stringify(result));
    }

    res.json(result);
  } catch (error) {
    console.error('[results] Error:', error);
    res.status(500).json({ error: 'Failed to fetch simulation results' });
  }
});

/**
 * POST /api/integration/results/:simulationId/publish
 * Publish simulation predictions to Redis for WorldMonitor panels.
 */
resultsRouter.post('/:simulationId/publish', async (req: Request, res: Response) => {
  try {
    const { simulationId } = req.params;
    const { topic, predictions } = req.body;

    if (!topic || !predictions) {
      res.status(400).json({ error: 'Missing required fields: topic, predictions' });
      return;
    }

    const predictionData = {
      simulationId,
      topic,
      predictions,
      publishedAt: new Date().toISOString(),
    };

    await cacheToRedis(`mirofish:predictions:${topic}`, JSON.stringify(predictionData));
    // Also update the predictions index
    await cacheToRedis(
      'mirofish:predictions:__index',
      JSON.stringify({ topic, simulationId, updatedAt: new Date().toISOString() }),
    );

    res.json({ success: true, message: `Predictions published for topic: ${topic}` });
  } catch (error) {
    console.error('[results] Error publishing:', error);
    res.status(500).json({ error: 'Failed to publish predictions' });
  }
});

async function cacheToRedis(key: string, value: string): Promise<void> {
  if (!REDIS_TOKEN) {
    console.warn('[results] No REDIS_TOKEN configured, skipping cache write');
    return;
  }
  try {
    await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
  } catch (err) {
    console.error('[results] Redis cache write failed:', err);
  }
}
