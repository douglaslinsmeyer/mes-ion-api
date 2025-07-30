import { Router, Request, Response } from 'express';
import { config } from './config/index';
import logger from './utils/logger';

export const healthRouter = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services?: {
    cache?: {
      status: 'connected' | 'disconnected';
      driver: string;
    };
    ionApi?: {
      status: 'connected' | 'disconnected' | 'unknown';
      lastCheck?: string;
    };
  };
}

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current health status of the API
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
    uptime: process.uptime(),
  };

  res.status(200).json(health);
});

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Readiness check endpoint
 *     description: Returns the readiness status including dependent services
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       503:
 *         description: Service is not ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 error:
 *                   type: string
 *                   example: Service not ready
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  try {
    // TODO: Add readiness checks (cache, ION API connectivity)
    const ready: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv,
      uptime: process.uptime(),
      services: {
        cache: {
          status: 'connected',
          driver: config.cache.driver,
        },
        ionApi: {
          status: 'unknown',
          lastCheck: new Date().toISOString(),
        },
      },
    };

    res.status(200).json(ready);
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service not ready',
    });
  }
});