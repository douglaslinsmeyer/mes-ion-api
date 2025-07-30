import { CacheDriver, CacheOptions } from './types';
import { MemoryCacheDriver } from './drivers/memory.driver';
import { RedisCacheDriver } from './drivers/redis.driver';
import { config } from '../config/index';
import logger from '../utils/logger';

class CacheManager {
  private driver: CacheDriver | null = null;
  private defaultTtl: number;

  constructor() {
    this.defaultTtl = config.cache.ttlSeconds;
  }

  async initialize(): Promise<void> {
    logger.info(`Initializing cache with driver: ${config.cache.driver}`);

    switch (config.cache.driver) {
      case 'redis':
        this.driver = new RedisCacheDriver();
        await this.driver.connect?.();
        break;
      case 'memory':
      default:
        this.driver = new MemoryCacheDriver();
        break;
    }

    logger.info('Cache initialized successfully');
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.driver) {
      throw new Error('Cache not initialized');
    }
    return this.driver.get<T>(key);
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.driver) {
      throw new Error('Cache not initialized');
    }
    const ttl = options?.ttlSeconds ?? this.defaultTtl;
    return this.driver.set(key, value, ttl);
  }

  async delete(key: string): Promise<boolean> {
    if (!this.driver) {
      throw new Error('Cache not initialized');
    }
    return this.driver.delete(key);
  }

  async clear(): Promise<void> {
    if (!this.driver) {
      throw new Error('Cache not initialized');
    }
    return this.driver.clear();
  }

  async has(key: string): Promise<boolean> {
    if (!this.driver) {
      throw new Error('Cache not initialized');
    }
    return this.driver.has(key);
  }

  async disconnect(): Promise<void> {
    if (this.driver?.disconnect) {
      await this.driver.disconnect();
    }
  }

  // Helper method for caching function results
  async remember<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  // Generate cache key with namespace
  key(...parts: string[]): string {
    return parts.join(':');
  }

  // Get the current cache driver type
  getDriver(): string {
    return config.cache.driver;
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Export types
export * from './types';