# System Architecture Overview

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Applications"
        WebUI[Web UI]
        WorkflowAPI[Workflow API]
        Mobile[Mobile Apps]
        External[External Services]
    end
    
    subgraph "MES ION API Gateway"
        subgraph "Middleware Stack"
            Helmet[Security Headers]
            CORS[CORS Handler]
            Compression[Response Compression]
            RateLimiter[Rate Limiter]
            Logger[Request Logger]
        end
        
        subgraph "Core Components"
            Router[Express Router]
            ProxyHandler[Proxy Handler]
            AuthManager[OAuth Manager]
            TokenRefresher[Token Refresher]
            ErrorHandler[Error Handler]
        end
        
        subgraph "Cache Layer"
            CacheManager[Cache Manager]
            RedisDriver[Redis Driver]
            MemoryDriver[Memory Driver]
        end
    end
    
    subgraph "External Systems"
        IONGateway[ION API Gateway]
        M3[M3 ERP System]
        LN[LN System]
        IDM[Item Data Management]
    end
    
    subgraph "Infrastructure"
        Redis[(Redis Cache)]
        Metrics[Prometheus Metrics]
    end
    
    WebUI --> Router
    WorkflowAPI --> Router
    Mobile --> Router
    External --> Router
    
    Router --> Helmet
    Helmet --> CORS
    CORS --> Compression
    Compression --> RateLimiter
    RateLimiter --> Logger
    Logger --> ProxyHandler
    
    ProxyHandler --> AuthManager
    ProxyHandler --> CacheManager
    AuthManager --> TokenRefresher
    
    CacheManager --> RedisDriver
    CacheManager --> MemoryDriver
    RedisDriver --> Redis
    
    ProxyHandler --> IONGateway
    IONGateway --> M3
    IONGateway --> LN
    IONGateway --> IDM
    
    ProxyHandler --> Metrics
```

## Component Architecture

### Application Structure
```
src/
├── app.ts                 # Express application setup
├── server.ts             # Server initialization
├── routes/
│   ├── proxy.ts         # Main proxy endpoint
│   ├── health.ts        # Health check endpoints
│   └── metrics.ts       # Prometheus metrics
├── integrations/
│   └── ion/
│       ├── auth.ts      # OAuth authentication
│       ├── client.ts    # ION API client
│       ├── config.ts    # ION configuration
│       └── token-refresher.ts # Token management
├── cache/
│   ├── manager.ts       # Cache abstraction
│   └── drivers/
│       ├── redis.driver.ts    # Redis implementation
│       └── memory.driver.ts   # Memory implementation
├── middleware/
│   ├── rate-limiter.ts  # Request throttling
│   ├── error-handler.ts # Error handling
│   └── logger.ts        # Request logging
└── services/
    └── health-check.service.ts # Health monitoring
```

## Request Flow

### Standard Request Processing
```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Cache
    participant Auth
    participant ION
    participant M3
    
    Client->>Gateway: API Request
    Gateway->>Gateway: Rate Limit Check
    Gateway->>Cache: Check Cache
    
    alt Cache Hit
        Cache-->>Gateway: Cached Response
        Gateway-->>Client: Return Cached Data
    else Cache Miss
        Gateway->>Auth: Get Access Token
        
        alt Token Valid
            Auth-->>Gateway: Return Token
        else Token Expired
            Auth->>ION: Request New Token
            ION-->>Auth: New Access Token
            Auth-->>Gateway: Return Token
        end
        
        Gateway->>ION: Forward Request + Token
        ION->>M3: Query Data
        M3-->>ION: Response Data
        ION-->>Gateway: API Response
        Gateway->>Cache: Store Response
        Gateway-->>Client: Return Data
    end
```

## Authentication Architecture

### OAuth 2.0 Flow
```mermaid
graph LR
    subgraph "Token Management"
        Check[Check Token]
        Validate[Validate Expiry]
        Refresh[Refresh Token]
        Store[Store Token]
    end
    
    subgraph "Token Storage"
        CacheStore[Cache Storage]
        TTL[TTL Management]
    end
    
    Check --> Validate
    Validate -->|Expired| Refresh
    Validate -->|Valid| Return[Return Token]
    Refresh --> Store
    Store --> CacheStore
    CacheStore --> TTL
    Store --> Return
```

### Token Refresh Strategy
```typescript
class TokenRefresher {
  // Proactive refresh - 5 minutes before expiry
  private readonly REFRESH_BUFFER = 5 * 60 * 1000;
  
  // Check interval - every 60 seconds
  private readonly CHECK_INTERVAL = 60 * 1000;
  
  // Reactive refresh on 401 responses
  async handleUnauthorized(): Promise<void> {
    await this.clearToken();
    await this.refreshNow();
  }
  
  // Background refresh process
  private async backgroundRefresh(): Promise<void> {
    const token = await this.getToken();
    const expiresIn = token.expiresAt - Date.now();
    
    if (expiresIn < this.REFRESH_BUFFER) {
      await this.refreshNow();
    }
  }
}
```

## Caching Architecture

### Cache Layers
```mermaid
graph TD
    Request[API Request]
    
    Request --> CacheKey[Generate Cache Key]
    CacheKey --> CheckCache{Cache Check}
    
    CheckCache -->|Hit| ReturnCached[Return Cached]
    CheckCache -->|Miss| FetchData[Fetch from ION]
    
    FetchData --> StoreCache[Store in Cache]
    StoreCache --> SetTTL[Set TTL]
    SetTTL --> ReturnFresh[Return Fresh Data]
    
    subgraph "Cache Drivers"
        Redis[Redis Driver]
        Memory[Memory Driver]
    end
    
    StoreCache --> Redis
    StoreCache --> Memory
```

### Cache Key Strategy
```typescript
// Cache key generation
function generateCacheKey(req: Request): string {
  const parts = [
    'ion',
    req.method,
    req.path,
    crypto.createHash('md5')
      .update(JSON.stringify(req.query))
      .digest('hex')
  ];
  return parts.join(':');
}

// TTL configuration by endpoint
const ttlConfig = {
  '/m3api-rest': 300,      // 5 minutes
  '/IDM/api/items': 600,   // 10 minutes
  '/LN/api': 300,          // 5 minutes
  default: 300             // 5 minutes
};
```

## Error Handling Architecture

### Error Classification
```typescript
enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'AUTH_001',
  TOKEN_EXPIRED = 'AUTH_002',
  TOKEN_REFRESH_FAILED = 'AUTH_003',
  
  // API errors
  UPSTREAM_ERROR = 'API_001',
  TIMEOUT = 'API_002',
  INVALID_REQUEST = 'API_003',
  
  // System errors
  CACHE_ERROR = 'SYS_001',
  RATE_LIMIT_EXCEEDED = 'SYS_002',
  INTERNAL_ERROR = 'SYS_003'
}
```

### Error Recovery Flow
```mermaid
stateDiagram-v2
    [*] --> Request
    Request --> Processing
    
    Processing --> Success
    Processing --> Error
    
    Error --> Classify
    
    Classify --> Retryable
    Classify --> NonRetryable
    
    Retryable --> Retry
    Retry --> Processing
    Retry --> MaxRetries
    
    NonRetryable --> LogError
    MaxRetries --> LogError
    
    LogError --> ReturnError
    Success --> ReturnSuccess
    
    ReturnError --> [*]
    ReturnSuccess --> [*]
```

## Rate Limiting Architecture

### Rate Limit Strategy
```typescript
const rateLimitConfig = {
  // Window configuration
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,                  // 1000 requests per window
  
  // Client identification
  keyGenerator: (req: Request) => {
    return req.headers['x-client-id'] || 
           req.ip || 
           'anonymous';
  },
  
  // Skip health checks
  skip: (req: Request) => {
    return req.path === '/health' || 
           req.path === '/ready';
  }
};
```

### Rate Limit Distribution
```mermaid
graph LR
    subgraph "Client Requests"
        Client1[Client A]
        Client2[Client B]
        Client3[Client C]
    end
    
    subgraph "Rate Limiter"
        Counter1[Counter A: 450/1000]
        Counter2[Counter B: 200/1000]
        Counter3[Counter C: 950/1000]
    end
    
    subgraph "Actions"
        Allow[Allow Request]
        Reject[429 Too Many Requests]
    end
    
    Client1 --> Counter1
    Client2 --> Counter2
    Client3 --> Counter3
    
    Counter1 --> Allow
    Counter2 --> Allow
    Counter3 --> Reject
```

## Monitoring Architecture

### Health Check System
```typescript
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    cache: ComponentHealth;
    ionApi: ComponentHealth;
    tokenRefresh: ComponentHealth;
  };
  metrics: {
    responseTime: number;
    cacheHitRatio: number;
    activeConnections: number;
  };
}
```

### Metrics Collection
```typescript
// Prometheus metrics
const metrics = {
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status']
  }),
  
  cacheHits: new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['endpoint']
  }),
  
  tokenRefreshes: new Counter({
    name: 'token_refreshes_total',
    help: 'Total number of token refreshes',
    labelNames: ['success']
  }),
  
  activeConnections: new Gauge({
    name: 'active_connections',
    help: 'Number of active connections'
  })
};
```

## Security Architecture

### Security Layers
1. **Transport Security**: HTTPS enforcement
2. **Authentication**: OAuth 2.0 token validation
3. **Authorization**: Header-based client identification
4. **Rate Limiting**: Request throttling per client
5. **Input Validation**: Request sanitization
6. **Output Filtering**: Response data filtering

### Security Headers
```typescript
// Helmet.js configuration
const securityHeaders = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
};
```

## Deployment Architecture

### Container Architecture
```dockerfile
# Multi-stage build
FROM node:20-alpine AS development
# Development dependencies and debugging

FROM node:20-alpine AS builder
# Production build

FROM node:20-alpine AS production
# Minimal runtime with security
USER nodejs:1001
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: mes-ion-api
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
        readinessProbe:
          httpGet:
            path: /ready
```

## Scalability Considerations

### Horizontal Scaling
- Stateless design allows multiple instances
- Redis cache shared across instances
- Load balancing via Kubernetes service

### Performance Optimizations
- Connection pooling for HTTP clients
- Response compression with gzip
- Efficient cache key generation
- Minimal middleware overhead

### Resource Management
- Memory limits enforced
- CPU throttling configured
- Connection limits implemented
- Graceful shutdown handling