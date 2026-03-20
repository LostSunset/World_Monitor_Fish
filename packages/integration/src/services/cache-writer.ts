/**
 * Cache Writer Service
 * Writes MiroFish prediction results to Redis for WorldMonitor panel consumption.
 */

const REDIS_URL = process.env.REDIS_URL || 'http://localhost:8079';
const REDIS_TOKEN = process.env.REDIS_TOKEN || '';
const CACHE_TTL = 3600; // 1 hour default TTL

export interface PredictionResult {
  simulationId: string;
  topic: string;
  domain: string;
  predictions: Prediction[];
  agentConsensus: number; // 0-1 score
  sentimentTrend: 'positive' | 'negative' | 'neutral' | 'mixed';
  summary: string;
  generatedAt: string;
}

export interface Prediction {
  statement: string;
  confidence: number; // 0-1
  supportingAgents: number;
  opposingAgents: number;
  timeframe?: string;
}

/**
 * Publish predictions to Redis with WorldMonitor-compatible key format.
 */
export async function publishPredictions(result: PredictionResult): Promise<void> {
  if (!REDIS_TOKEN) {
    console.warn('[cache-writer] No REDIS_TOKEN, skipping publish');
    return;
  }

  const key = `mirofish:predictions:${result.domain}:${result.topic}`;
  const value = JSON.stringify({
    ...result,
    _wmf_version: 1,
    _cached_at: new Date().toISOString(),
  });

  await redisSet(key, value, CACHE_TTL);

  // Update the prediction index for WM bootstrap
  await redisAppendToList('mirofish:predictions:__index', JSON.stringify({
    key,
    domain: result.domain,
    topic: result.topic,
    simulationId: result.simulationId,
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Write simulation summary for WM SwarmIntelPanel.
 */
export async function publishSimulationSummary(
  simulationId: string,
  summary: {
    status: string;
    rounds: number;
    agents: number;
    platforms: string[];
    startedAt: string;
    topic: string;
  },
): Promise<void> {
  if (!REDIS_TOKEN) return;

  const key = `mirofish:simulations:${simulationId}:summary`;
  await redisSet(key, JSON.stringify(summary), CACHE_TTL * 2);
}

async function redisSet(key: string, value: string, ttl?: number): Promise<void> {
  try {
    const url = ttl
      ? `${REDIS_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/EX/${ttl}`
      : `${REDIS_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`;

    await fetch(url, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
  } catch (err) {
    console.error(`[cache-writer] Redis SET failed for ${key}:`, err);
  }
}

async function redisAppendToList(key: string, value: string): Promise<void> {
  try {
    await fetch(`${REDIS_URL}/rpush/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
  } catch (err) {
    console.error(`[cache-writer] Redis RPUSH failed for ${key}:`, err);
  }
}
