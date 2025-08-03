import { Router } from 'express';
import { proxyRouter } from './proxy';

export const apiRouter = Router();

// API root info (no auth required)
apiRouter.get('/', (_req, res) => {
  res.json({
    service: 'MES ION API',
    version: '1.0.0',
    endpoints: {
      proxy: '/proxy/*',
    },
  });
});

// Mount proxy router - all endpoints are public
apiRouter.use('/proxy', proxyRouter);