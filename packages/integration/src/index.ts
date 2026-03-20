import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth.js';
import { triggerRouter } from './routes/trigger.js';
import { statusRouter } from './routes/status.js';
import { resultsRouter } from './routes/results.js';

const app = express();
const port = parseInt(process.env.PORT || '4000', 10);

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'integration-gw', timestamp: new Date().toISOString() });
});

// Authenticated routes
app.use('/api/integration', authMiddleware);
app.use('/api/integration/trigger', triggerRouter);
app.use('/api/integration/status', statusRouter);
app.use('/api/integration/results', resultsRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[integration-gw] Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
  });
});

app.listen(port, () => {
  console.log(`[integration-gw] Running on port ${port}`);
  console.log(`[integration-gw] WM API: ${process.env.WM_API_URL || 'http://localhost:3000'}`);
  console.log(`[integration-gw] MF API: ${process.env.MF_API_URL || 'http://localhost:5001'}`);
});
