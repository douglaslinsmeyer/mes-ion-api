import { CacheDriver, CacheEntry } from '../types';
import logger from '../../utils/logger';

export class MemoryCacheDriver implements CacheDriver {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly cleanupIntervalMs = 60000; // 1 minute

  constructor() {
    this.startCleanupInterval();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    
    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt && entry.expiresAt < now) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug(`Memory cache cleanup: removed ${cleaned} expired entries`);
      }
    }, this.cleanupIntervalMs);

    // Don't prevent the process from exiting
    this.cleanupInterval.unref();
  }

  // Stats method for monitoring
  getStats(): { size: number; memoryUsage: number } {
    return {
      size: this.cache.size,
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }
}