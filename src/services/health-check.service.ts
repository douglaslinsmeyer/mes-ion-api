import { IONAuthManager } from '../integrations/ion/auth';
import logger from '../utils/logger';
import { cache } from '../cache/index';

export interface ServiceHealth {
  status: 'connected' | 'disconnected' | 'error';
  message?: string;
  lastCheck: string;
  responseTime?: number;
  tokenExpiry?: string;
}

export interface HealthCheckResult {
  cache: ServiceHealth & { driver?: string };
  ionApi: ServiceHealth;
}

export class HealthCheckService {
  private ionAuthManager: IONAuthManager;

  constructor() {
    this.ionAuthManager = new IONAuthManager();
  }

  async checkAll(): Promise<HealthCheckResult> {
    const [cacheHealth, ionHealth] = await Promise.all([
      this.checkCache(),
      this.checkIONApi(),
    ]);

    return {
      cache: cacheHealth,
      ionApi: ionHealth,
    };
  }

  async checkCache(): Promise<ServiceHealth & { driver?: string }> {
    const startTime = Date.now();
    try {
      // Try to set and get a test value
      const testKey = 'health:check:test';
      const testValue = Date.now().toString();
      
      await cache.set(testKey, testValue, { ttlSeconds: 10 });
      const retrieved = await cache.get(testKey);
      await cache.delete(testKey);

      if (retrieved !== testValue) {
        throw new Error('Cache read/write test failed');
      }

      return {
        status: 'connected',
        driver: cache.getDriver(),
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return {
        status: 'error',
        driver: cache.getDriver(),
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  async checkIONApi(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      // Try to get an access token
      await this.ionAuthManager.getAccessToken();
      
      // Get token expiry if available
      const tokenExpiry = await this.ionAuthManager.getTokenExpiry();

      return {
        status: 'connected',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        ...(tokenExpiry && { tokenExpiry }),
      };
    } catch (error) {
      logger.error('ION API health check failed:', error);
      
      // Determine if it's a configuration issue or connectivity issue
      let status: 'disconnected' | 'error' = 'error';
      let message = 'Unknown error';

      if (error instanceof Error) {
        message = error.message;
        if (message.includes('Missing required ION configuration')) {
          status = 'error';
          message = 'ION API not configured';
        } else if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
          status = 'disconnected';
          message = 'Cannot connect to ION API';
        }
      }

      return {
        status,
        message,
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService();