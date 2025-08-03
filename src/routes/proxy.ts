import { Router, Request, Response } from 'express';
import { ionClient, IONRequestOptions } from '../integrations/ion';
import logger from '../utils/logger';
import { cache } from '../cache/index';
import { config } from '../config/index';

export const proxyRouter = Router();

// Cache configuration for different endpoints
const CACHE_CONFIG: Record<string, { ttl: number; methods: string[] }> = {
  '/m3api-rest/': { ttl: 300, methods: ['GET'] }, // 5 minutes for M3 API queries
  '/M3/m3api-rest/': { ttl: 300, methods: ['GET'] }, // 5 minutes for M3 API queries (alternate path)
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
 *       This endpoint is publicly accessible and does not require an API key.
 *       The service automatically adds ION authentication headers before forwarding the request.
 *       Supports caching for GET requests on specific endpoints.
 *     tags: [Proxy]
 *     security: []  # No security required - this is a public endpoint
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ION API path to proxy to
 *         example: m3api-rest/v2/execute/PMS100MI/SearchMO
 *       - in: query
 *         name: queryParams
 *         schema:
 *           type: object
 *         description: Query parameters to forward to ION API
 *         example:
 *           SQRY: "0000002786"
 *           maxrecs: "100"
 *       - in: header
 *         name: X-Client-ID
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional client identifier for tracking and caching purposes
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
 *         description: ION authentication failed
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
proxyRouter.all('/*path', async (req: Request, res: Response) => {
  const ionPath = req.path; // Path after /proxy
  const method = req.method as IONRequestOptions['method'];
  
  try {
    // Extract client identifier from headers or use IP
    const clientIdentifier = req.headers['x-client-id'] as string || req.ip || 'anonymous';
    
    // Use ION Gateway base URL for proxying requests, with fallback to known working URL
    const ionGatewayUrl = process.env.ION_GATEWAY_URL || 'https://mingle-ionapi.inforcloudsuite.com/XK3JRT8CJCAF9GWY_TRN';
    const constructedUrl = `${ionGatewayUrl}${ionPath}`;
    
    logger.info('Proxying request to ION API', {
      clientIdentifier,
      method,
      path: ionPath,
      query: req.query,
      ionGatewayUrl,
      constructedUrl,
    });

    // Check cache for GET requests
    if (method === 'GET') {
      const cacheKey = cache.key('proxy', clientIdentifier, method, ionPath, JSON.stringify(req.query));
      const cachedResponse = await cache.get(cacheKey);
      
      if (cachedResponse) {
        logger.debug('Returning cached response', { path: ionPath });
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }
    }

    // Build ION API request options
    const options: IONRequestOptions = {
      method,
      queryParams: req.query as Record<string, string>,
      body: req.body,
      baseUrl: ionGatewayUrl, // Use ION Gateway URL instead of auth endpoint
      headers: {
        // Forward relevant headers
        ...(req.headers['content-type'] && { 'Content-Type': req.headers['content-type'] as string }),
        ...(req.headers['accept'] && { 'Accept': req.headers['accept'] as string }),
        // Add client identification
        'X-MES-Client': clientIdentifier,
        'X-Request-ID': req.headers['x-request-id'] as string || `proxy-${Date.now()}`,
      },
    };

    // Make request to ION API - the ION client will automatically add authentication headers
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
      const cacheKey = cache.key('proxy', clientIdentifier, method, ionPath, JSON.stringify(req.query));
      await cache.set(cacheKey, ionResponse.data, { ttlSeconds: cacheConfig.ttl });
      logger.debug('Cached response', { path: ionPath, ttl: cacheConfig.ttl });
    }

    // Send response
    res.json(ionResponse.data);
  } catch (error) {
    // Calculate the full URL that was attempted
    const ionGatewayUrl = process.env.ION_GATEWAY_URL || 'https://mingle-ionapi.inforcloudsuite.com/XK3JRT8CJCAF9GWY_TRN';
    const fullUrl = `${ionGatewayUrl}${ionPath}`;
    
    logger.error('Proxy request failed', {
      error,
      clientIdentifier: req.headers['x-client-id'] || req.ip,
      path: req.path,
      method: req.method,
      proxiedUrl: fullUrl,
      queryParams: req.query,
    });

    // If it's an ION API error, enhance it with the proxied URL
    if (error && typeof error === 'object' && 'name' in error && error.name === 'IONAPIError') {
      const enhancedError = Object.assign(error, {
        details: {
          ...(error as any).details,
          proxiedUrl: fullUrl,
          originalPath: ionPath,
          requestedPath: req.path,
          queryParams: req.query,
        }
      });
      throw enhancedError;
    }

    // Let error handler middleware handle it
    throw error;
  }
});