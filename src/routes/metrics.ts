import { Router, Request, Response } from 'express';
import { getMetrics } from '../utils/metrics';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Get Prometheus metrics
 *     description: Returns metrics in Prometheus format for monitoring
 *     tags:
 *       - Monitoring
 *     responses:
 *       200:
 *         description: Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       500:
 *         description: Internal server error
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', error);
    res.status(500).json({
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to generate metrics',
      },
    });
  }
});

export { router as metricsRouter };