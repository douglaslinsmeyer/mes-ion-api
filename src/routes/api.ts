import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { proxyRouter } from './proxy';
import { webhookRouter } from './webhook';

export const apiRouter = Router();

// Apply authentication to all API routes
apiRouter.use(authMiddleware);

// Mount sub-routers
apiRouter.use('/proxy', proxyRouter);
apiRouter.use('/webhooks', webhookRouter);

// API root info
apiRouter.get('/', (_req, res) => {
  res.json({
    service: 'MES ION API',
    version: '1.0.0',
    endpoints: {
      proxy: '/proxy/*',
      webhooks: '/webhooks/*',
    },
  });
});