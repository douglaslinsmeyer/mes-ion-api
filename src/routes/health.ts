import { Router, Request, Response } from 'express';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';
import { healthCheckService } from '../services/health-check.service.js';

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
      tokenExpiry?: string;
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
healthRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    const services = await healthCheckService.checkAll();
    
    // Determine overall health status
    const isHealthy = services.cache.status !== 'error' && 
                     services.ionApi.status !== 'error';
    
    const health: HealthStatus = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv,
      uptime: process.uptime(),
      services: {
        cache: {
          status: services.cache.status === 'connected' ? 'connected' : 'disconnected',
          driver: services.cache.driver || config.cache.driver,
        },
        ionApi: {
          status: services.ionApi.status === 'connected' ? 'connected' : 'disconnected',
          lastCheck: services.ionApi.lastCheck,
          tokenExpiry: services.ionApi.tokenExpiry,
        },
      },
    };

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
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
    const services = await healthCheckService.checkAll();
    
    // Service is ready if cache is connected and ION is at least configured
    const isReady = services.cache.status === 'connected' && 
                   services.ionApi.status !== 'error';
    
    const ready: HealthStatus = {
      status: isReady ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv,
      uptime: process.uptime(),
      services: {
        cache: {
          status: services.cache.status === 'connected' ? 'connected' : 'disconnected',
          driver: services.cache.driver || config.cache.driver,
        },
        ionApi: {
          status: services.ionApi.status === 'connected' ? 'connected' : 
                  services.ionApi.status === 'error' ? 'disconnected' : 'disconnected',
          lastCheck: services.ionApi.lastCheck,
        },
      },
    };

    res.status(isReady ? 200 : 503).json(ready);
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service not ready',
    });
  }
});