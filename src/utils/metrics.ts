import { Registry, Counter, Histogram, Gauge, register } from 'prom-client';

// Create a custom registry for ION API metrics
export const metricsRegistry = new Registry();

// Add default metrics
metricsRegistry.setDefaultLabels({
  app: 'mes-ion-api',
});

// Authentication metrics
export const authMetrics = {
  tokenRequests: new Counter({
    name: 'ion_auth_token_requests_total',
    help: 'Total number of ION OAuth token requests',
    labelNames: ['status'],
    registers: [metricsRegistry],
  }),

  tokenCacheHits: new Counter({
    name: 'ion_auth_token_cache_hits_total',
    help: 'Total number of ION token cache hits',
    registers: [metricsRegistry],
  }),

  tokenCacheMisses: new Counter({
    name: 'ion_auth_token_cache_misses_total',
    help: 'Total number of ION token cache misses',
    registers: [metricsRegistry],
  }),

  tokenRefreshes: new Counter({
    name: 'ion_auth_token_refreshes_total',
    help: 'Total number of ION token refreshes',
    labelNames: ['trigger', 'status'],
    registers: [metricsRegistry],
  }),

  tokenRequestDuration: new Histogram({
    name: 'ion_auth_token_request_duration_seconds',
    help: 'Duration of ION OAuth token requests in seconds',
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    registers: [metricsRegistry],
  }),

  tokenExpiryTime: new Gauge({
    name: 'ion_auth_token_expiry_seconds',
    help: 'Time until current ION token expires in seconds',
    registers: [metricsRegistry],
  }),

  activeTokens: new Gauge({
    name: 'ion_auth_active_tokens',
    help: 'Number of active ION tokens in cache',
    registers: [metricsRegistry],
  }),
};

// API request metrics
export const apiMetrics = {
  requests: new Counter({
    name: 'ion_api_requests_total',
    help: 'Total number of ION API requests',
    labelNames: ['method', 'endpoint', 'status_code'],
    registers: [metricsRegistry],
  }),

  requestDuration: new Histogram({
    name: 'ion_api_request_duration_seconds',
    help: 'Duration of ION API requests in seconds',
    labelNames: ['method', 'endpoint'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [metricsRegistry],
  }),

  requestErrors: new Counter({
    name: 'ion_api_request_errors_total',
    help: 'Total number of ION API request errors',
    labelNames: ['method', 'endpoint', 'error_type'],
    registers: [metricsRegistry],
  }),

  rateLimitHits: new Counter({
    name: 'ion_api_rate_limit_hits_total',
    help: 'Total number of ION API rate limit hits',
    registers: [metricsRegistry],
  }),
};

// Cache metrics
export const cacheMetrics = {
  operations: new Counter({
    name: 'cache_operations_total',
    help: 'Total number of cache operations',
    labelNames: ['operation', 'status'],
    registers: [metricsRegistry],
  }),

  size: new Gauge({
    name: 'cache_size_bytes',
    help: 'Current size of cache in bytes',
    labelNames: ['cache_type'],
    registers: [metricsRegistry],
  }),

  evictions: new Counter({
    name: 'cache_evictions_total',
    help: 'Total number of cache evictions',
    labelNames: ['reason'],
    registers: [metricsRegistry],
  }),
};

// System metrics
export const systemMetrics = {
  healthChecks: new Counter({
    name: 'health_checks_total',
    help: 'Total number of health check requests',
    labelNames: ['status'],
    registers: [metricsRegistry],
  }),

  activeConnections: new Gauge({
    name: 'active_connections',
    help: 'Number of active connections',
    labelNames: ['type'],
    registers: [metricsRegistry],
  }),
};

// Helper functions for common metric operations
export const recordAuthTokenRequest = (success: boolean, duration: number): void => {
  authMetrics.tokenRequests.inc({ status: success ? 'success' : 'failure' });
  authMetrics.tokenRequestDuration.observe(duration);
};

export const recordTokenCacheHit = (): void => {
  authMetrics.tokenCacheHits.inc();
};

export const recordTokenCacheMiss = (): void => {
  authMetrics.tokenCacheMisses.inc();
};

export const recordTokenRefresh = (trigger: 'proactive' | 'reactive' | 'manual', success: boolean): void => {
  authMetrics.tokenRefreshes.inc({ 
    trigger, 
    status: success ? 'success' : 'failure' 
  });
};

export const updateTokenExpiry = (expiryTimeSeconds: number): void => {
  authMetrics.tokenExpiryTime.set(expiryTimeSeconds);
};

export const recordApiRequest = (
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number
): void => {
  apiMetrics.requests.inc({ method, endpoint, status_code: statusCode });
  apiMetrics.requestDuration.observe({ method, endpoint }, duration);
  
  if (statusCode >= 400) {
    const errorType = statusCode < 500 ? 'client_error' : 'server_error';
    apiMetrics.requestErrors.inc({ method, endpoint, error_type: errorType });
  }
  
  if (statusCode === 429) {
    apiMetrics.rateLimitHits.inc();
  }
};

export const recordCacheOperation = (
  operation: 'get' | 'set' | 'delete' | 'clear',
  success: boolean
): void => {
  cacheMetrics.operations.inc({ 
    operation, 
    status: success ? 'success' : 'failure' 
  });
};

// Export function to get all metrics
export const getMetrics = async (): Promise<string> => {
  return metricsRegistry.metrics();
};

// Export function to reset all metrics (useful for testing)
export const resetMetrics = (): void => {
  metricsRegistry.resetMetrics();
};