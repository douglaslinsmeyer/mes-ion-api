# MES ION API Architecture

## Overview

The MES ION API is designed as a microservice that acts as a gateway between MES applications and Infor ION APIs. It follows a layered architecture pattern with clear separation of concerns.

## Architecture Principles

1. **Single Responsibility**: Each component has a single, well-defined purpose
2. **Dependency Inversion**: Depend on abstractions, not concrete implementations
3. **Open/Closed**: Open for extension, closed for modification
4. **DRY**: Don't Repeat Yourself - reusable components and utilities
5. **YAGNI**: You Aren't Gonna Need It - build only what's required

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MES Applications                          │
│  (Workflow API, REST API, UI Applications)                      │
└─────────────────┬───────────────────────┬───────────────────────┘
                  │ REST API              │ GraphQL
                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MES ION API                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐        │
│  │   Routes    │  │  GraphQL     │  │   Middleware   │        │
│  │  (REST)     │  │  Resolvers   │  │  (Auth, Log)   │        │
│  └──────┬──────┘  └──────┬───────┘  └────────────────┘        │
│         │                 │                                      │
│         ▼                 ▼                                      │
│  ┌────────────────────────────────────────────────────┐        │
│  │                 Service Layer                       │        │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐ │        │
│  │  │   Auth     │ │    ION     │ │  Transform     │ │        │
│  │  │  Service   │ │   Client   │ │   Service      │ │        │
│  │  └────────────┘ └────────────┘ └────────────────┘ │        │
│  └────────────────────────────────────────────────────┘        │
│         │                                                        │
│         ▼                                                        │
│  ┌────────────────────────────────────────────────────┐        │
│  │              Infrastructure Layer                   │        │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐ │        │
│  │  │   Cache    │ │  Database  │ │    Queue       │ │        │
│  │  │  (Redis)   │ │ (PostgreSQL)│ │  (RabbitMQ)    │ │        │
│  │  └────────────┘ └────────────┘ └────────────────┘ │        │
│  └────────────────────────────────────────────────────┘        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS/OAuth 2.0
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Infor ION API                             │
│  (Manufacturing, Materials, Work Centers, Events)                │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. API Layer
- **REST Controllers**: Express routes handling HTTP requests
- **GraphQL Resolvers**: GraphQL schema and resolvers
- **WebSocket Handlers**: Real-time event handling

### 2. Middleware Layer
- **Authentication**: JWT validation, API key verification
- **Authorization**: Role-based access control
- **Request Validation**: Input validation and sanitization
- **Error Handling**: Centralized error processing
- **Logging**: Request/response logging
- **Rate Limiting**: API throttling

### 3. Service Layer
- **ION Client Service**: HTTP client for ION API calls
- **Auth Service**: OAuth 2.0 token management
- **Transform Service**: Data mapping between MES and ION formats
- **Cache Service**: Response caching logic
- **Event Service**: Webhook and event processing

### 4. Infrastructure Layer
- **Database**: PostgreSQL for configuration and audit logs
- **Cache**: Redis for token and response caching
- **Message Queue**: RabbitMQ for async processing
- **Monitoring**: Prometheus metrics collection

## Data Flow

### Synchronous API Calls
```
1. MES App → API Gateway (Authentication)
2. API Gateway → Middleware (Validation, Logging)
3. Middleware → Service Layer (Business Logic)
4. Service Layer → Cache (Check for cached response)
5. If not cached → ION Client → Infor ION API
6. ION API → Transform Service (Data mapping)
7. Transform Service → Cache (Store response)
8. Cache → API Gateway → MES App
```

### Asynchronous Events
```
1. Infor ION → Webhook Endpoint
2. Webhook → Event Validation
3. Event → Message Queue
4. Queue Consumer → Event Processing
5. Event Processing → Database (Store/Update)
6. Database → Notification Service
7. Notification → MES Applications
```

## Security Architecture

### Authentication Flow
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  MES App    │      │  ION API    │      │   OAuth     │
│             │      │  Gateway    │      │   Server    │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │ 1. Request         │                     │
       │ with API Key       │                     │
       ├───────────────────►│                     │
       │                    │ 2. Validate         │
       │                    │    API Key          │
       │                    │                     │
       │                    │ 3. Check Token      │
       │                    │    Cache            │
       │                    │                     │
       │                    │ 4. Request Token    │
       │                    ├────────────────────►│
       │                    │                     │
       │                    │ 5. Return Token     │
       │                    │◄────────────────────┤
       │                    │                     │
       │                    │ 6. Cache Token      │
       │                    │                     │
       │ 7. Response        │                     │
       │◄───────────────────┤                     │
       │                    │                     │
```

## Deployment Architecture

### Container Structure
```
┌─────────────────────────────────────────────┐
│           Kubernetes Cluster                 │
├─────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Ingress       │  │   Service       │  │
│  │   Controller    │  │   Mesh         │  │
│  └────────┬────────┘  └─────────────────┘  │
│           │                                  │
│  ┌────────▼────────────────────────────┐   │
│  │         ION API Pods (3x)           │   │
│  │  ┌──────────┐ ┌──────────┐         │   │
│  │  │  App     │ │  Sidecar │         │   │
│  │  │Container │ │  Proxy   │         │   │
│  │  └──────────┘ └──────────┘         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────┐  ┌─────────────────┐     │
│  │   Redis     │  │   PostgreSQL    │     │
│  │   Cluster   │  │   Cluster       │     │
│  └─────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────┘
```

## Scalability Considerations

### Horizontal Scaling
- Stateless application design
- Load balancing across multiple instances
- Connection pooling for database and cache
- Distributed caching strategy

### Performance Optimization
- Response caching with TTL
- Connection keep-alive for ION APIs
- Batch processing for bulk operations
- Async processing for non-critical operations

## Monitoring and Observability

### Metrics Collection
```
Application Metrics → Prometheus → Grafana
    │
    ├── Request rate
    ├── Response time
    ├── Error rate
    ├── Cache hit ratio
    └── Token refresh rate
```

### Logging Strategy
```
Application Logs → Winston → ELK Stack
    │
    ├── Request/Response logs
    ├── Error logs
    ├── Audit logs
    └── Performance logs
```

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 20.x LTS
- **Framework**: Express.js 5.x
- **Language**: TypeScript 5.x
- **API**: REST + GraphQL
- **Database**: PostgreSQL 15.x
- **Cache**: Redis 7.x
- **Message Queue**: RabbitMQ 3.x

### Development Tools
- **Build**: tsx, esbuild
- **Testing**: Jest, Supertest
- **Linting**: ESLint, Prettier
- **API Docs**: Swagger/OpenAPI
- **Containerization**: Docker
- **Orchestration**: Kubernetes

## Design Patterns

### Implemented Patterns
1. **Repository Pattern**: Data access abstraction
2. **Service Pattern**: Business logic encapsulation
3. **Factory Pattern**: Object creation
4. **Singleton Pattern**: Database connections
5. **Observer Pattern**: Event handling
6. **Circuit Breaker**: Fault tolerance
7. **Retry Pattern**: Transient failure handling
8. **Cache-Aside Pattern**: Performance optimization

## Error Handling Strategy

### Error Categories
1. **Client Errors (4xx)**
   - Validation errors
   - Authentication failures
   - Authorization errors
   - Not found errors

2. **Server Errors (5xx)**
   - ION API errors
   - Database errors
   - Internal server errors
   - Service unavailable

### Error Response Format
```json
{
  "error": {
    "code": "ION_AUTH_FAILED",
    "message": "Failed to authenticate with ION API",
    "details": {
      "timestamp": "2024-01-20T10:30:00Z",
      "path": "/api/v1/manufacturing-orders",
      "requestId": "abc-123-def"
    }
  }
}
```

## Future Enhancements

1. **GraphQL Subscriptions**: Real-time data updates
2. **API Versioning**: Support multiple API versions
3. **Multi-tenancy**: Support multiple ION instances
4. **Advanced Caching**: Predictive cache warming
5. **Machine Learning**: Anomaly detection in API usage
6. **Event Sourcing**: Complete audit trail of all changes