import dotenv from 'dotenv';
import Joi from 'joi';
import { loadIONCredentials } from '../utils/ionapi-parser.js';

dotenv.config();

// Load ION credentials from JSON if available
const ionCredentials = loadIONCredentials();

const envSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),

  // CORS Configuration
  CORS_ORIGINS: Joi.string().required(),

  // Security
  API_KEY_SALT: Joi.string().required(),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(1000),

  // ION API Configuration
  ION_API_JSON: Joi.string().optional(),
  ION_TENANT_ID: Joi.string().optional(),
  ION_CLIENT_ID: Joi.string().optional(),
  ION_CLIENT_SECRET: Joi.string().optional(),
  ION_USERNAME: Joi.string().optional(),
  ION_PASSWORD: Joi.string().optional(),
  ION_TOKEN_ENDPOINT: Joi.string().uri().optional(),
  ION_API_ENDPOINT: Joi.string().uri().optional(),
  ION_SUBSCRIPTION_KEY: Joi.string().optional(),
  ION_ORGANIZATION: Joi.string().optional(),

  // Cache Configuration
  CACHE_DRIVER: Joi.string().valid('memory', 'redis').default('memory'),
  CACHE_TTL_SECONDS: Joi.number().default(300), // 5 minutes
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_DB: Joi.number().optional(),
  REDIS_PREFIX: Joi.string().default('mes-ion:'),

  // Request Configuration
  REQUEST_TIMEOUT_MS: Joi.number().default(30000), // 30 seconds
  API_PREFIX: Joi.string().allow('').default(''),
  API_HOSTNAME: Joi.string().default('localhost'),

  // Webhook Configuration
  WEBHOOK_SECRET: Joi.string().optional(),

  // Monitoring
  HEALTH_CHECK_INTERVAL: Joi.number().default(30000), // 30 seconds

  // Development Configuration
  DEBUG: Joi.string().optional(),
  PRETTY_LOGS: Joi.boolean().default(true),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  // Server
  nodeEnv: envVars.NODE_ENV as string,
  port: envVars.PORT as number,
  logLevel: envVars.LOG_LEVEL as string,
  
  // CORS
  corsOrigins: (envVars.CORS_ORIGINS as string).split(',').map((origin) => origin.trim()),
  
  // Security
  apiKeySalt: envVars.API_KEY_SALT as string,
  rateLimitWindowMs: envVars.RATE_LIMIT_WINDOW_MS as number,
  rateLimitMaxRequests: envVars.RATE_LIMIT_MAX_REQUESTS as number,
  
  // ION API - merge JSON credentials with env vars (env vars take precedence)
  ion: {
    tenantId: (envVars.ION_TENANT_ID || ionCredentials.tenantId) as string,
    clientId: (envVars.ION_CLIENT_ID || ionCredentials.clientId) as string,
    clientSecret: (envVars.ION_CLIENT_SECRET || ionCredentials.clientSecret) as string,
    username: (envVars.ION_USERNAME || ionCredentials.username) as string,
    password: (envVars.ION_PASSWORD || ionCredentials.password) as string,
    tokenEndpoint: (envVars.ION_TOKEN_ENDPOINT || ionCredentials.tokenEndpoint) as string,
    apiEndpoint: (envVars.ION_API_ENDPOINT || ionCredentials.apiEndpoint) as string,
    subscriptionKey: envVars.ION_SUBSCRIPTION_KEY as string | undefined,
    organization: envVars.ION_ORGANIZATION as string | undefined,
    scopes: ionCredentials.scopes || [],
  },
  
  // Cache
  cache: {
    driver: envVars.CACHE_DRIVER as 'memory' | 'redis',
    ttlSeconds: envVars.CACHE_TTL_SECONDS as number,
    redis: {
      url: envVars.REDIS_URL as string | undefined,
      password: envVars.REDIS_PASSWORD as string | undefined,
      db: envVars.REDIS_DB as number | undefined,
      prefix: envVars.REDIS_PREFIX as string,
    },
  },
  
  // Request
  requestTimeoutMs: envVars.REQUEST_TIMEOUT_MS as number,
  apiPrefix: envVars.API_PREFIX as string,
  apiHostname: envVars.API_HOSTNAME as string,
  
  // Webhook
  webhookSecret: envVars.WEBHOOK_SECRET as string | undefined,
  
  // Monitoring
  healthCheckInterval: envVars.HEALTH_CHECK_INTERVAL as number,
  
  // Development
  debug: envVars.DEBUG as string | undefined,
  prettyLogs: envVars.PRETTY_LOGS as boolean,
  
  // Computed
  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',
};

export type Config = typeof config;