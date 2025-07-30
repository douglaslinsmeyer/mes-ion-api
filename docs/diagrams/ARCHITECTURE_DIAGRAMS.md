# MES ION API Architecture Diagrams

## System Context Diagram

```mermaid
graph TB
    subgraph "MES Ecosystem"
        MWA[MES Workflow API]
        MRA[MES REST API]
        MUI[MES UI Applications]
    end
    
    MIA[MES ION API<br/>Gateway]
    
    subgraph "Infrastructure"
        PG[(PostgreSQL)]
        RD[(Redis)]
        RMQ[RabbitMQ]
    end
    
    subgraph "Infor ION"
        ION[ION API]
        IDP[Identity Provider]
        EVT[Event Hub]
    end
    
    subgraph "External Systems"
        MON[Monitoring<br/>Prometheus/Grafana]
        LOG[Logging<br/>ELK Stack]
    end
    
    MWA --> MIA
    MRA --> MIA
    MUI --> MIA
    
    MIA --> PG
    MIA --> RD
    MIA --> RMQ
    
    MIA --> ION
    MIA --> IDP
    EVT --> MIA
    
    MIA --> MON
    MIA --> LOG
```

## Component Architecture

```mermaid
graph LR
    subgraph "API Layer"
        REST[REST API<br/>Controllers]
        GQL[GraphQL<br/>Resolvers]
        WS[WebSocket<br/>Handlers]
    end
    
    subgraph "Middleware"
        AUTH[Authentication]
        VAL[Validation]
        RL[Rate Limiting]
        ERR[Error Handler]
    end
    
    subgraph "Service Layer"
        AS[Auth Service]
        IC[ION Client]
        TS[Transform Service]
        CS[Cache Service]
        ES[Event Service]
    end
    
    subgraph "Data Layer"
        REPO[Repositories]
        CACHE[Cache Manager]
        QUEUE[Queue Manager]
    end
    
    REST --> AUTH
    GQL --> AUTH
    WS --> AUTH
    
    AUTH --> VAL
    VAL --> RL
    RL --> AS
    
    AS --> IC
    AS --> TS
    IC --> CS
    TS --> ES
    
    CS --> CACHE
    ES --> QUEUE
    IC --> REPO
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant App as MES Application
    participant GW as ION API Gateway
    participant Cache as Redis Cache
    participant ION as ION OAuth Server
    
    App->>GW: Request with API Key
    GW->>GW: Validate API Key
    
    alt Token in Cache
        GW->>Cache: Get ION Token
        Cache-->>GW: Return Token
    else Token Not Cached
        GW->>ION: Request Token<br/>(Client Credentials)
        ION-->>GW: OAuth Token
        GW->>Cache: Store Token<br/>(with TTL)
    end
    
    GW->>ION: API Request<br/>(with Bearer Token)
    ION-->>GW: API Response
    GW-->>App: Transformed Response
```

## Data Flow - Manufacturing Order

```mermaid
graph TD
    subgraph "Request Flow"
        REQ[API Request<br/>GET /orders/MO-001]
        MW[Middleware Pipeline]
        CTRL[Order Controller]
        SVC[Order Service]
    end
    
    subgraph "Caching Layer"
        CHK{Cache<br/>Check}
        HIT[Cache Hit]
        MISS[Cache Miss]
    end
    
    subgraph "ION Integration"
        CLIENT[ION Client]
        TRANS[Transform<br/>Service]
        API[ION API Call]
    end
    
    subgraph "Response"
        CACHE[Update Cache]
        RESP[API Response]
    end
    
    REQ --> MW
    MW --> CTRL
    CTRL --> SVC
    SVC --> CHK
    
    CHK -->|Found| HIT
    CHK -->|Not Found| MISS
    
    HIT --> RESP
    
    MISS --> CLIENT
    CLIENT --> API
    API --> TRANS
    TRANS --> CACHE
    CACHE --> RESP
```

## Event Processing Architecture

```mermaid
graph LR
    subgraph "ION Events"
        EVT1[Order Created]
        EVT2[Material Updated]
        EVT3[Operation Complete]
    end
    
    subgraph "Gateway"
        WH[Webhook<br/>Endpoint]
        VAL[Event<br/>Validator]
        QUEUE[Event Queue]
    end
    
    subgraph "Processing"
        CONS[Queue<br/>Consumer]
        PROC[Event<br/>Processor]
        HAND[Event<br/>Handlers]
    end
    
    subgraph "Distribution"
        PUB[Event<br/>Publisher]
        SUB1[MES Workflow]
        SUB2[MES REST]
        SUB3[MES UI]
    end
    
    EVT1 --> WH
    EVT2 --> WH
    EVT3 --> WH
    
    WH --> VAL
    VAL --> QUEUE
    QUEUE --> CONS
    CONS --> PROC
    PROC --> HAND
    HAND --> PUB
    
    PUB --> SUB1
    PUB --> SUB2
    PUB --> SUB3
```

## Database Schema

```mermaid
erDiagram
    ION_TENANTS {
        uuid id PK
        string tenant_id UK
        string client_id
        string client_secret_encrypted
        string token_endpoint
        string api_endpoint
        boolean active
        timestamp created_at
        timestamp updated_at
    }
    
    API_KEYS {
        uuid id PK
        string key_hash UK
        uuid tenant_id FK
        string application_name
        jsonb permissions
        boolean active
        timestamp last_used_at
        timestamp created_at
        timestamp expires_at
    }
    
    AUDIT_LOGS {
        uuid id PK
        string request_id
        uuid api_key_id FK
        string method
        string path
        integer status_code
        jsonb request_body
        jsonb response_body
        string ion_request_id
        integer duration_ms
        timestamp created_at
    }
    
    ION_EVENTS {
        uuid id PK
        string event_id UK
        string event_type
        uuid tenant_id FK
        jsonb payload
        string status
        timestamp processed_at
        text error_message
        integer retry_count
        timestamp created_at
    }
    
    WEBHOOKS {
        uuid id PK
        string url
        jsonb events
        jsonb headers
        string secret_hash
        boolean active
        timestamp created_at
    }
    
    ION_TENANTS ||--o{ API_KEYS : has
    API_KEYS ||--o{ AUDIT_LOGS : generates
    ION_TENANTS ||--o{ ION_EVENTS : receives
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Ingress"
            ING[NGINX Ingress<br/>Controller]
        end
        
        subgraph "Application Namespace"
            subgraph "API Pods"
                POD1[ION API<br/>Pod 1]
                POD2[ION API<br/>Pod 2]
                POD3[ION API<br/>Pod 3]
            end
            
            SVC[Service<br/>Load Balancer]
            
            subgraph "ConfigMaps/Secrets"
                CM[ConfigMap]
                SEC[Secrets]
            end
        end
        
        subgraph "Data Namespace"
            PG[PostgreSQL<br/>StatefulSet]
            RD[Redis<br/>StatefulSet]
            RMQ[RabbitMQ<br/>StatefulSet]
        end
        
        subgraph "Monitoring Namespace"
            PROM[Prometheus]
            GRAF[Grafana]
            ALERT[AlertManager]
        end
    end
    
    ING --> SVC
    SVC --> POD1
    SVC --> POD2
    SVC --> POD3
    
    POD1 --> CM
    POD1 --> SEC
    POD1 --> PG
    POD1 --> RD
    POD1 --> RMQ
    
    POD1 --> PROM
    PROM --> GRAF
    PROM --> ALERT
```

## Error Handling Flow

```mermaid
graph TD
    REQ[Incoming Request]
    
    subgraph "Error Detection"
        VAL{Validation<br/>Error?}
        AUTH{Auth<br/>Error?}
        BIZ{Business<br/>Error?}
        ION{ION API<br/>Error?}
        SYS{System<br/>Error?}
    end
    
    subgraph "Error Handling"
        E400[400 Bad Request]
        E401[401 Unauthorized]
        E403[403 Forbidden]
        E404[404 Not Found]
        E422[422 Unprocessable]
        E429[429 Rate Limited]
        E502[502 Bad Gateway]
        E503[503 Unavailable]
        E500[500 Internal Error]
    end
    
    subgraph "Response"
        LOG[Log Error]
        METRIC[Record Metric]
        RESP[Error Response]
    end
    
    REQ --> VAL
    VAL -->|Yes| E400
    VAL -->|No| AUTH
    
    AUTH -->|Yes| E401
    AUTH -->|No| BIZ
    
    BIZ -->|Not Found| E404
    BIZ -->|Invalid| E422
    BIZ -->|No| ION
    
    ION -->|Yes| E502
    ION -->|No| SYS
    
    SYS -->|Yes| E500
    SYS -->|Overload| E503
    
    E400 --> LOG
    E401 --> LOG
    E404 --> LOG
    E422 --> LOG
    E502 --> LOG
    E500 --> LOG
    E503 --> LOG
    
    LOG --> METRIC
    METRIC --> RESP
```

## Circuit Breaker Pattern

```mermaid
stateDiagram-v2
    [*] --> Closed
    
    Closed --> Open: Failure Threshold Reached
    Closed --> Closed: Success
    Closed --> Closed: Failure < Threshold
    
    Open --> HalfOpen: Timeout Expires
    Open --> Open: Request (Fail Fast)
    
    HalfOpen --> Closed: Success
    HalfOpen --> Open: Failure
    
    note right of Closed
        Normal operation
        All requests pass through
    end note
    
    note right of Open
        Circuit broken
        Requests fail immediately
    end note
    
    note right of HalfOpen
        Testing state
        Limited requests allowed
    end note
```

## Cache Strategy

```mermaid
graph LR
    subgraph "Cache Layers"
        L1[L1: Memory<br/>Cache]
        L2[L2: Redis<br/>Cache]
        L3[L3: Database]
    end
    
    subgraph "Cache Keys"
        K1[order:MO-001]
        K2[material:MAT-789]
        K3[workcenter:WC-101]
    end
    
    subgraph "TTL Strategy"
        T1[Orders: 5 min]
        T2[Materials: 10 min]
        T3[Work Centers: 1 min]
        T4[Config: 1 hour]
    end
    
    REQ[Request] --> L1
    L1 -->|Miss| L2
    L2 -->|Miss| L3
    
    L3 --> L2
    L2 --> L1
    L1 --> RESP[Response]
    
    K1 --> T1
    K2 --> T2
    K3 --> T3
```

## Monitoring Dashboard Layout

```mermaid
graph TB
    subgraph "Grafana Dashboard"
        subgraph "Row 1: Overview"
            M1[Request Rate]
            M2[Error Rate]
            M3[Response Time]
            M4[Uptime]
        end
        
        subgraph "Row 2: API Performance"
            M5[Endpoint Latency]
            M6[ION API Calls]
            M7[Cache Hit Ratio]
            M8[Queue Depth]
        end
        
        subgraph "Row 3: System Health"
            M9[CPU Usage]
            M10[Memory Usage]
            M11[Connection Pool]
            M12[Thread Count]
        end
        
        subgraph "Row 4: Business Metrics"
            M13[Orders/Hour]
            M14[Failed Operations]
            M15[Active Sessions]
            M16[Event Processing]
        end
    end
```

These diagrams provide a comprehensive view of the MES ION API architecture, showing system context, component interactions, data flows, and operational aspects. They can be rendered using Mermaid-compatible tools or documentation systems.