import Redis from 'ioredis';
import { CacheDriver } from '../types';
import { config } from '../../config/index';
import logger from '../../utils/logger';
import { CacheError } from '../../utils/errors';

export class RedisCacheDriver implements CacheDriver {
  private client: Redis | null = null;
  private readonly prefix: string;

  constructor() {
    this.prefix = config.cache.redis.prefix;
  }

  async connect(): Promise<void> {
    if (!config.cache.redis.url) {
      throw new CacheError('Redis URL not configured');
    }

    try {
      this.client = new Redis(config.cache.redis.url, {
        password: config.cache.redis.password,
        db: config.cache.redis.db,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      // Test connection
      await this.client.ping();
    } catch (error) {
      throw new CacheError('Failed to connect to Redis', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) {
      throw new CacheError('Redis client not initialized');
    }

    try {
      const value = await this.client.get(this.prefixKey(key));
      return value ? JSON.parse(value) as T : null;
    } catch (error) {
      throw new CacheError(`Failed to get key: ${key}`, error);
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client) {
      throw new CacheError('Redis client not initialized');
    }

    try {
      const serialized = JSON.stringify(value);
      const prefixedKey = this.prefixKey(key);

      if (ttlSeconds) {
        await this.client.setex(prefixedKey, ttlSeconds, serialized);
      } else {
        await this.client.set(prefixedKey, serialized);
      }
    } catch (error) {
      throw new CacheError(`Failed to set key: ${key}`, error);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.client) {
      throw new CacheError('Redis client not initialized');
    }

    try {
      const result = await this.client.del(this.prefixKey(key));
      return result > 0;
    } catch (error) {
      throw new CacheError(`Failed to delete key: ${key}`, error);
    }
  }

  async clear(): Promise<void> {
    if (!this.client) {
      throw new CacheError('Redis client not initialized');
    }

    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      throw new CacheError('Failed to clear cache', error);
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.client) {
      throw new CacheError('Redis client not initialized');
    }

    try {
      const exists = await this.client.exists(this.prefixKey(key));
      return exists === 1;
    } catch (error) {
      throw new CacheError(`Failed to check key existence: ${key}`, error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  private prefixKey(key: string): string {
    return `${this.prefix}${key}`;
  }
}