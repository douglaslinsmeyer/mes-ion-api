# Infor ION API Integration Guide

## Overview

This guide provides detailed information on integrating with Infor ION APIs through the MES ION API gateway. It covers authentication, API endpoints, data formats, and best practices.

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
3. [Data Formats](#data-formats)
4. [Error Handling](#error-handling)
5. [Webhooks](#webhooks)
6. [Best Practices](#best-practices)

## Authentication

### OAuth 2.0 Client Credentials Flow

The MES ION API uses OAuth 2.0 client credentials flow to authenticate with Infor ION.

#### Configuration

```json
{
  "ion": {
    "tenantId": "your-tenant-id",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "tokenEndpoint": "https://mingle-ionapi.inforcloudsuite.com/TENANT/as/token.oauth2",
    "apiEndpoint": "https://mingle-ionapi.inforcloudsuite.com/TENANT/api"
  }
}
```

#### Token Management

The gateway automatically handles:
- Token acquisition
- Token caching (Redis with TTL)
- Token refresh (5 minutes before expiration)
- Retry logic for failed token requests

### API Key Authentication (MES Applications)

MES applications authenticate with the ION API gateway using API keys.

#### Request Header

```http
X-API-Key: your-api-key-here
```

#### API Key Format

```json
{
  "keyId": "550e8400-e29b-41d4-a716-446655440000",
  "application": "mes-workflow-api",
  "permissions": ["read:orders", "write:orders", "read:materials"],
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

## API Endpoints

### Manufacturing Orders

#### Get Manufacturing Orders

```http
GET /api/v1/manufacturing-orders?facility=FAC001&status=RELEASED
```

**Query Parameters:**
- `facility` (required): Facility code
- `status`: Order status (RELEASED, IN_PROCESS, COMPLETED)
- `product`: Product number
- `dateFrom`: Start date (ISO 8601)
- `dateTo`: End date (ISO 8601)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "MO-2024-001",
      "facility": "FAC001",
      "product": "PROD-123",
      "quantity": 100,
      "status": "RELEASED",
      "startDate": "2024-01-20T08:00:00Z",
      "dueDate": "2024-01-25T17:00:00Z",
      "operations": [
        {
          "sequence": 10,
          "workCenter": "WC-101",
          "description": "Assembly",
          "status": "NOT_STARTED"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

#### Create Manufacturing Order

```http
POST /api/v1/manufacturing-orders
Content-Type: application/json

{
  "facility": "FAC001",
  "product": "PROD-123",
  "quantity": 100,
  "dueDate": "2024-01-25T17:00:00Z",
  "priority": 1,
  "customerOrder": "CO-2024-456"
}
```

### Materials

#### Get Material Availability

```http
GET /api/v1/materials/{materialId}/availability?warehouse=WH001
```

**Response:**
```json
{
  "materialId": "MAT-789",
  "warehouse": "WH001",
  "onHand": 500,
  "available": 350,
  "allocated": 150,
  "onOrder": 200,
  "reorderPoint": 100,
  "locations": [
    {
      "location": "A-01-01",
      "quantity": 300,
      "lot": "LOT-2024-001"
    }
  ]
}
```

#### Report Material Consumption

```http
POST /api/v1/materials/transactions
Content-Type: application/json

{
  "type": "CONSUMPTION",
  "materialId": "MAT-789",
  "quantity": 50,
  "warehouse": "WH001",
  "location": "A-01-01",
  "lot": "LOT-2024-001",
  "manufacturingOrder": "MO-2024-001",
  "operation": 10
}
```

### Work Centers

#### Get Work Center Status

```http
GET /api/v1/work-centers/{workCenterId}/status
```

**Response:**
```json
{
  "workCenterId": "WC-101",
  "description": "Assembly Line 1",
  "status": "RUNNING",
  "currentOrder": "MO-2024-001",
  "currentOperation": 10,
  "efficiency": 95.5,
  "availability": 98.2,
  "scheduledDowntime": [],
  "unscheduledDowntime": []
}
```

### Operations

#### Confirm Operation

```http
POST /api/v1/operations/confirm
Content-Type: application/json

{
  "manufacturingOrder": "MO-2024-001",
  "operation": 10,
  "quantity": 50,
  "scrapQuantity": 2,
  "laborHours": 4.5,
  "machineHours": 4.0,
  "operator": "OP-123",
  "completedAt": "2024-01-20T12:30:00Z"
}
```

## Data Formats

### Business Object Documents (BODs)

ION uses Business Object Documents for data exchange. The gateway handles transformation between MES formats and BODs.

#### Example: ProcessManufacturingOrder BOD

```xml
<ProcessManufacturingOrder>
  <ApplicationArea>
    <Sender>
      <LogicalID>MES</LogicalID>
    </Sender>
    <CreationDateTime>2024-01-20T10:00:00Z</CreationDateTime>
  </ApplicationArea>
  <DataArea>
    <Process>
      <ActionCriteria>
        <ActionExpression actionCode="Add"/>
      </ActionCriteria>
    </Process>
    <ManufacturingOrder>
      <DocumentID>
        <ID>MO-2024-001</ID>
      </DocumentID>
      <ItemInstance>
        <ItemID>
          <ID>PROD-123</ID>
        </ItemID>
        <Quantity>100</Quantity>
      </ItemInstance>
    </ManufacturingOrder>
  </DataArea>
</ProcessManufacturingOrder>
```

### JSON Transformation

The gateway automatically transforms between JSON (MES) and XML/BOD (ION) formats.

**MES JSON:**
```json
{
  "orderId": "MO-2024-001",
  "product": "PROD-123",
  "quantity": 100
}
```

**ION BOD:** (Transformed automatically)
```xml
<ManufacturingOrder>
  <DocumentID><ID>MO-2024-001</ID></DocumentID>
  <ItemInstance>
    <ItemID><ID>PROD-123</ID></ItemID>
    <Quantity>100</Quantity>
  </ItemInstance>
</ManufacturingOrder>
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ION_API_ERROR",
    "message": "Failed to create manufacturing order",
    "details": {
      "ionError": "Item PROD-999 not found",
      "requestId": "req-123-456",
      "timestamp": "2024-01-20T10:30:00Z"
    }
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|------------|
| `AUTH_FAILED` | Authentication failed | 401 |
| `PERMISSION_DENIED` | Insufficient permissions | 403 |
| `RESOURCE_NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Invalid request data | 400 |
| `ION_API_ERROR` | ION API returned error | 502 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `SERVICE_UNAVAILABLE` | Service temporarily down | 503 |

### Retry Strategy

```typescript
const retryConfig = {
  retries: 3,
  retryDelay: 1000, // ms
  retryCondition: (error) => {
    // Retry on 5xx errors and network errors
    return error.response?.status >= 500 || error.code === 'ECONNREFUSED';
  },
  onRetry: (retryCount, error) => {
    logger.warn(`Retry attempt ${retryCount} for ${error.config.url}`);
  }
};
```

## Webhooks

### Webhook Configuration

Register webhooks to receive real-time updates from ION:

```http
POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://mes-ion-api.example.com/webhooks/ion/events",
  "events": [
    "ManufacturingOrder.Created",
    "ManufacturingOrder.Updated",
    "MaterialTransaction.Posted"
  ],
  "secret": "webhook-secret-key"
}
```

### Webhook Event Format

```json
{
  "eventId": "evt-123-456",
  "eventType": "ManufacturingOrder.Updated",
  "timestamp": "2024-01-20T10:30:00Z",
  "tenantId": "TENANT001",
  "data": {
    "manufacturingOrderId": "MO-2024-001",
    "changes": {
      "status": {
        "old": "RELEASED",
        "new": "IN_PROCESS"
      }
    }
  },
  "signature": "sha256=..."
}
```

### Webhook Security

Verify webhook signatures:

```typescript
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}
```

## Best Practices

### 1. Pagination

Always use pagination for list endpoints:

```typescript
async function getAllOrders(facility: string): Promise<Order[]> {
  const orders: Order[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await api.get('/manufacturing-orders', {
      params: { facility, page, limit: 100 }
    });
    
    orders.push(...response.data.data);
    hasMore = page < response.data.pagination.pages;
    page++;
  }
  
  return orders;
}
```

### 2. Error Handling

Implement comprehensive error handling:

```typescript
try {
  const response = await ionApi.createOrder(orderData);
  return response;
} catch (error) {
  if (error.response?.status === 429) {
    // Handle rate limiting
    const retryAfter = error.response.headers['retry-after'];
    await sleep(retryAfter * 1000);
    return ionApi.createOrder(orderData);
  } else if (error.response?.status >= 500) {
    // Log and retry for server errors
    logger.error('ION API server error', error);
    throw new ServiceUnavailableError('ION API temporarily unavailable');
  } else {
    // Handle client errors
    throw new ValidationError(error.response?.data?.message);
  }
}
```

### 3. Caching

Implement intelligent caching:

```typescript
const cacheConfig = {
  'GET /materials/*': { ttl: 300 }, // 5 minutes
  'GET /work-centers/*': { ttl: 60 }, // 1 minute
  'GET /manufacturing-orders': { ttl: 30 }, // 30 seconds
};
```

### 4. Bulk Operations

Use bulk endpoints when available:

```typescript
// Instead of multiple single updates
for (const order of orders) {
  await api.updateOrder(order.id, order.data);
}

// Use bulk update
await api.bulkUpdateOrders(orders.map(o => ({
  id: o.id,
  data: o.data
})));
```

### 5. Field Selection

Request only needed fields:

```http
GET /api/v1/manufacturing-orders?fields=id,status,product,quantity
```

### 6. Monitoring

Implement comprehensive monitoring:

```typescript
// Track API metrics
metrics.increment('ion_api.requests', {
  endpoint: '/manufacturing-orders',
  method: 'GET',
  status: response.status
});

// Log slow requests
if (duration > 1000) {
  logger.warn('Slow ION API request', {
    endpoint,
    duration,
    requestId
  });
}
```

## Testing

### Integration Testing

```typescript
describe('ION API Integration', () => {
  it('should create manufacturing order', async () => {
    const order = {
      facility: 'TEST-FAC',
      product: 'TEST-PROD',
      quantity: 10
    };
    
    const response = await ionApi.createManufacturingOrder(order);
    
    expect(response.status).toBe(201);
    expect(response.data.id).toBeDefined();
    expect(response.data.status).toBe('RELEASED');
  });
});
```

### Mock Server

Use mock server for development:

```typescript
// mock-ion-server.ts
app.post('/api/manufacturing-orders', (req, res) => {
  const order = req.body;
  res.status(201).json({
    id: `MO-${Date.now()}`,
    ...order,
    status: 'RELEASED',
    createdAt: new Date().toISOString()
  });
});
```