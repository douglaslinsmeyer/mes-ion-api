import { Router, Response } from 'express';
import { AuthenticatedRequest } from './middleware/auth';
import { ionClient, IONRequestOptions } from './integrations/ion';
import logger from './utils/logger';
import { cache } from './cache/index';

export const proxyRouter = Router();

// Cache configuration for different endpoints
const CACHE_CONFIG: Record<string, { ttl: number; methods: string[] }> = {
  '/M3/m3api-rest/execute': { ttl: 300, methods: ['GET'] }, // 5 minutes for M3 API queries
  '/IDM/api/items': { ttl: 600, methods: ['GET'] }, // 10 minutes for item master data
  '/LN/api': { ttl: 300, methods: ['GET'] }, // 5 minutes for LN queries
};

// Helper to determine if response should be cached
const shouldCache = (path: string, method: string): { cache: boolean; ttl?: number } => {
  for (const [pattern, config] of Object.entries(CACHE_CONFIG)) {
    if (path.startsWith(pattern) && config.methods.includes(method.toUpperCase())) {
      return { cache: true, ttl: config.ttl };
    }
  }
  return { cache: false };
};

/**
 * @swagger
 * /api/v1/proxy/{path}:
 *   all:
 *     summary: Proxy requests to Infor ION API
 *     description: |
 *       Forwards requests to the Infor ION API with automatic OAuth authentication.
 *       Supports caching for GET requests on specific endpoints.
 *     tags: [Proxy]
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ION API path to proxy to
 *         example: M3/m3api-rest/execute/CRS610MI/List
 *       - in: query
 *         name: queryParams
 *         schema:
 *           type: object
 *         description: Query parameters to forward to ION API
 *     requestBody:
 *       description: Request body to forward to ION API
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successful response from ION API
 *         headers:
 *           X-Cache:
 *             description: Cache status (HIT or MISS)
 *             schema:
 *               type: string
 *               enum: [HIT, MISS]
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error or ION API error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Main proxy handler
proxyRouter.all('/*', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ionPath = req.path; // Path after /proxy
    const method = req.method as IONRequestOptions['method'];
    
    logger.info('Proxying request to ION API', {
      clientId: req.clientId,
      method,
      path: ionPath,
    });

    // Check cache for GET requests
    if (method === 'GET') {
      const cacheKey = cache.key('proxy', req.clientId || 'unknown', method, ionPath, JSON.stringify(req.query));
      const cachedResponse = await cache.get(cacheKey);
      
      if (cachedResponse) {
        logger.debug('Returning cached response', { path: ionPath });
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }
    }

    // Build ION request options
    const options: IONRequestOptions = {
      method,
      queryParams: req.query as Record<string, string>,
      body: req.body,
      headers: {
        // Forward relevant headers
        ...(req.headers['content-type'] && { 'Content-Type': req.headers['content-type'] as string }),
        ...(req.headers['accept'] && { 'Accept': req.headers['accept'] as string }),
        // Add client identification
        'X-MES-Client': req.clientId || 'unknown',
        'X-Request-ID': req.headers['x-request-id'] as string,
      },
    };

    // Make request to ION API
    const ionResponse = await ionClient.request(ionPath, options);

    // Set response headers
    res.status(ionResponse.status);
    res.setHeader('X-Cache', 'MISS');
    
    // Forward relevant ION headers
    const headersToForward = ['content-type', 'x-total-count', 'x-has-more-rows'];
    headersToForward.forEach((header) => {
      if (ionResponse.headers[header]) {
        res.setHeader(header, ionResponse.headers[header]);
      }
    });

    // Cache successful GET responses if configured
    const cacheConfig = shouldCache(ionPath, method);
    if (method === 'GET' && ionResponse.status === 200 && cacheConfig.cache) {
      const cacheKey = cache.key('proxy', req.clientId || 'unknown', method, ionPath, JSON.stringify(req.query));
      await cache.set(cacheKey, ionResponse.data, { ttlSeconds: cacheConfig.ttl });
      logger.debug('Cached response', { path: ionPath, ttl: cacheConfig.ttl });
    }

    // Send response
    res.json(ionResponse.data);
  } catch (error) {
    logger.error('Proxy request failed', {
      error,
      clientId: req.clientId,
      path: req.path,
      method: req.method,
    });

    // Let error handler middleware handle it
    throw error;
  }
});