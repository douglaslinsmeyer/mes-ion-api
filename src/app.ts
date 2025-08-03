import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { swaggerSpec } from './config/swagger.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { requestLogger } from './middleware/request-logger.js';
import { healthRouter } from './routes/health.js';
import { apiRouter } from './routes/api.js';
import { metricsRouter } from './routes/metrics.js';

export const createApp = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID', 'X-Client-ID'],
    }),
  );

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Rate limiting
  app.use(rateLimiter);

  // Health check routes (no auth required)
  app.use('/', healthRouter);

  // Metrics endpoint (no auth required for Prometheus scraping)
  app.use('/', metricsRouter);

  // API documentation (no auth required)
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/openapi.json', (_req, res) => {
    res.json(swaggerSpec);
  });

  // API routes
  app.use(config.apiPrefix, apiRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
};

export default createApp;