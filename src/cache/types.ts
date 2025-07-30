export interface CacheDriver {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
}

export interface CacheOptions {
  ttlSeconds?: number;
  prefix?: string;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}