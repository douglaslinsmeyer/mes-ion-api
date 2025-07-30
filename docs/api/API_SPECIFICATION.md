# MES ION API Specification

## Version: 1.0.0

This document provides the complete API specification for the MES ION API gateway service.

## Base URL

```
Production: https://mes-ion-api.company.com
Development: http://localhost:3000
```

## Authentication

All requests must include an API key in the header:

```http
X-API-Key: <your-api-key>
```

## Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API authentication key |
| `X-Request-ID` | No | Unique request identifier for tracing |
| `X-Tenant-ID` | No | ION tenant identifier (defaults to primary) |

## Response Format

All responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { },
  "metadata": {
    "timestamp": "2024-01-20T10:30:00Z",
    "requestId": "req-123-456",
    "version": "1.0.0"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { }
  },
  "metadata": {
    "timestamp": "2024-01-20T10:30:00Z",
    "requestId": "req-123-456"
  }
}
```

## Endpoints

### Manufacturing Orders

#### List Manufacturing Orders

```http
GET /api/v1/manufacturing-orders
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `facility` | string | Yes | Facility code |
| `status` | string | No | Order status filter |
| `product` | string | No | Product number filter |
| `workCenter` | string | No | Work center filter |
| `dateFrom` | string | No | Start date (ISO 8601) |
| `dateTo` | string | No | End date (ISO 8601) |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 50, max: 100) |
| `sort` | string | No | Sort field (default: -createdAt) |

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "MO-2024-001",
        "facility": "FAC001",
        "product": {
          "id": "PROD-123",
          "description": "Product Description",
          "revision": "A"
        },
        "quantity": {
          "ordered": 100,
          "completed": 0,
          "scrapped": 0
        },
        "dates": {
          "created": "2024-01-15T10:00:00Z",
          "scheduled": "2024-01-20T08:00:00Z",
          "due": "2024-01-25T17:00:00Z"
        },
        "status": "RELEASED",
        "priority": 1,
        "customerOrder": "CO-2024-456",
        "operations": [
          {
            "sequence": 10,
            "workCenter": "WC-101",
            "description": "Assembly",
            "status": "NOT_STARTED",
            "standardTime": 2.5
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get Manufacturing Order

```http
GET /api/v1/manufacturing-orders/{orderId}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | string | Yes | Manufacturing order ID |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "MO-2024-001",
    "facility": "FAC001",
    "product": {
      "id": "PROD-123",
      "description": "Product Description",
      "revision": "A",
      "uom": "EA"
    },
    "quantity": {
      "ordered": 100,
      "completed": 50,
      "scrapped": 2,
      "remaining": 48
    },
    "dates": {
      "created": "2024-01-15T10:00:00Z",
      "scheduled": "2024-01-20T08:00:00Z",
      "started": "2024-01-20T08:15:00Z",
      "due": "2024-01-25T17:00:00Z",
      "lastModified": "2024-01-20T12:30:00Z"
    },
    "status": "IN_PROCESS",
    "priority": 1,
    "customerOrder": "CO-2024-456",
    "operations": [
      {
        "sequence": 10,
        "workCenter": {
          "id": "WC-101",
          "description": "Assembly Line 1"
        },
        "description": "Assembly",
        "status": "COMPLETED",
        "quantity": {
          "completed": 50,
          "scrapped": 2
        },
        "time": {
          "standard": 2.5,
          "actual": 2.3
        },
        "dates": {
          "started": "2024-01-20T08:15:00Z",
          "completed": "2024-01-20T10:30:00Z"
        }
      }
    ],
    "materials": [
      {
        "sequence": 10,
        "material": {
          "id": "MAT-789",
          "description": "Component A",
          "revision": "B"
        },
        "quantity": {
          "required": 100,
          "issued": 52,
          "returned": 0
        },
        "warehouse": "WH001",
        "location": "A-01-01"
      }
    ],
    "attributes": {
      "customerPO": "PO-123456",
      "specialInstructions": "Handle with care",
      "qualityLevel": "STANDARD"
    }
  }
}
```

#### Create Manufacturing Order

```http
POST /api/v1/manufacturing-orders
```

**Request Body:**

```json
{
  "facility": "FAC001",
  "product": "PROD-123",
  "quantity": 100,
  "dueDate": "2024-01-25T17:00:00Z",
  "scheduledDate": "2024-01-20T08:00:00Z",
  "priority": 1,
  "customerOrder": "CO-2024-456",
  "attributes": {
    "customerPO": "PO-123456",
    "specialInstructions": "Handle with care"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "MO-2024-002",
    "status": "PLANNED",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

#### Update Manufacturing Order

```http
PUT /api/v1/manufacturing-orders/{orderId}
```

**Request Body:**

```json
{
  "quantity": 150,
  "dueDate": "2024-01-26T17:00:00Z",
  "priority": 2,
  "attributes": {
    "specialInstructions": "Updated instructions"
  }
}
```

### Materials

#### Get Material Availability

```http
GET /api/v1/materials/{materialId}/availability
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `warehouse` | string | Yes | Warehouse code |
| `location` | string | No | Specific location |
| `lot` | string | No | Lot number |

**Response:**

```json
{
  "success": true,
  "data": {
    "material": {
      "id": "MAT-789",
      "description": "Component A",
      "revision": "B",
      "uom": "EA"
    },
    "warehouse": "WH001",
    "inventory": {
      "onHand": 500,
      "available": 350,
      "allocated": 150,
      "onOrder": 200,
      "inTransit": 50
    },
    "planning": {
      "reorderPoint": 100,
      "reorderQuantity": 500,
      "leadTime": 7,
      "safetyStock": 50
    },
    "locations": [
      {
        "location": "A-01-01",
        "quantity": 300,
        "lot": "LOT-2024-001",
        "expirationDate": "2025-01-01"
      },
      {
        "location": "A-01-02",
        "quantity": 200,
        "lot": "LOT-2024-002",
        "expirationDate": "2025-02-01"
      }
    ]
  }
}
```

#### Create Material Transaction

```http
POST /api/v1/materials/transactions
```

**Request Body:**

```json
{
  "type": "ISSUE",
  "material": "MAT-789",
  "quantity": 50,
  "warehouse": "WH001",
  "location": "A-01-01",
  "lot": "LOT-2024-001",
  "reference": {
    "type": "MANUFACTURING_ORDER",
    "id": "MO-2024-001",
    "operation": 10
  },
  "operator": "OP-123",
  "timestamp": "2024-01-20T10:30:00Z"
}
```

**Transaction Types:**
- `ISSUE`: Issue material to order
- `RETURN`: Return material from order
- `RECEIPT`: Receive material
- `ADJUSTMENT`: Inventory adjustment
- `TRANSFER`: Transfer between locations

### Work Centers

#### List Work Centers

```http
GET /api/v1/work-centers
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `facility` | string | Yes | Facility code |
| `department` | string | No | Department filter |
| `status` | string | No | Status filter |

**Response:**

```json
{
  "success": true,
  "data": {
    "workCenters": [
      {
        "id": "WC-101",
        "description": "Assembly Line 1",
        "facility": "FAC001",
        "department": "ASSEMBLY",
        "status": "AVAILABLE",
        "capacity": {
          "shifts": 2,
          "hoursPerShift": 8,
          "efficiency": 0.85
        },
        "capabilities": ["ASSEMBLY", "TESTING"],
        "currentOrder": null
      }
    ]
  }
}
```

#### Get Work Center Status

```http
GET /api/v1/work-centers/{workCenterId}/status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "workCenter": {
      "id": "WC-101",
      "description": "Assembly Line 1"
    },
    "status": "RUNNING",
    "currentOrder": {
      "id": "MO-2024-001",
      "operation": 10,
      "startTime": "2024-01-20T08:15:00Z",
      "expectedCompletion": "2024-01-20T12:00:00Z"
    },
    "metrics": {
      "oee": {
        "overall": 85.5,
        "availability": 98.2,
        "performance": 92.1,
        "quality": 94.5
      },
      "production": {
        "target": 50,
        "actual": 48,
        "efficiency": 96.0
      }
    },
    "schedule": {
      "currentShift": "SHIFT1",
      "nextOrders": [
        {
          "orderId": "MO-2024-003",
          "operation": 20,
          "scheduledStart": "2024-01-20T13:00:00Z"
        }
      ]
    }
  }
}
```

### Operations

#### Confirm Operation

```http
POST /api/v1/operations/confirm
```

**Request Body:**

```json
{
  "manufacturingOrder": "MO-2024-001",
  "operation": 10,
  "confirmation": {
    "quantity": {
      "good": 48,
      "scrap": 2,
      "rework": 0
    },
    "time": {
      "setup": 0.5,
      "run": 3.5,
      "teardown": 0.25
    },
    "operator": {
      "id": "OP-123",
      "name": "John Doe"
    },
    "workCenter": "WC-101",
    "startTime": "2024-01-20T08:15:00Z",
    "endTime": "2024-01-20T12:30:00Z"
  },
  "materials": [
    {
      "material": "MAT-789",
      "quantity": 52,
      "lot": "LOT-2024-001"
    }
  ],
  "comments": "Completed without issues"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "confirmationId": "CONF-2024-12345",
    "status": "POSTED",
    "postedAt": "2024-01-20T12:31:00Z"
  }
}
```

### Events and Webhooks

#### Register Webhook

```http
POST /api/v1/webhooks
```

**Request Body:**

```json
{
  "url": "https://your-app.com/webhooks/ion",
  "events": [
    "manufacturing_order.created",
    "manufacturing_order.updated",
    "manufacturing_order.completed",
    "material_transaction.posted",
    "work_center.status_changed"
  ],
  "filters": {
    "facility": ["FAC001", "FAC002"]
  },
  "headers": {
    "X-Custom-Header": "value"
  },
  "secret": "webhook-secret-key"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "webhookId": "wh-123-456",
    "status": "ACTIVE",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

#### List Webhooks

```http
GET /api/v1/webhooks
```

#### Update Webhook

```http
PUT /api/v1/webhooks/{webhookId}
```

#### Delete Webhook

```http
DELETE /api/v1/webhooks/{webhookId}
```

### Health and Monitoring

#### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00Z",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "cache": "healthy",
    "ion_api": "healthy"
  }
}
```

#### Metrics

```http
GET /metrics
```

Returns Prometheus-formatted metrics.

## Rate Limiting

API rate limits:
- Default: 1000 requests per 15 minutes
- Bulk operations: 100 requests per 15 minutes

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642684800
```

## Versioning

API version is specified in the URL path:
- Current version: `/api/v1/`
- Version header: `X-API-Version: 1.0.0`

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 502 | Bad Gateway (ION API Error) |
| 503 | Service Unavailable |