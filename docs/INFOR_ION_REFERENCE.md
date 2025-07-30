# Infor ION API Reference Guide

## Overview

This document provides essential information about Infor ION APIs that the MES ION API gateway integrates with. It covers authentication, common endpoints, data formats, and best practices specific to Infor ION.

## Table of Contents

1. [ION Authentication](#ion-authentication)
2. [API Endpoints](#api-endpoints)
3. [Business Object Documents (BODs)](#business-object-documents-bods)
4. [Event Management](#event-management)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## ION Authentication

### OAuth 2.0 Configuration

Infor ION uses OAuth 2.0 with the Resource Owner Password Credentials grant type.

#### Token Endpoint
```
https://mingle-ionapi.inforcloudsuite.com/{tenant}/as/token.oauth2
```

#### Required Parameters
- `grant_type`: "password"
- `client_id`: Your ION client ID
- `client_secret`: Your ION client secret
- `username`: Your ION username
- `password`: Your ION password
- `scope`: Space-separated list of scopes (optional)

#### Example Token Request
```bash
curl -X POST "https://mingle-ionapi.inforcloudsuite.com/TENANT/as/token.oauth2" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=TENANT~AbC123..." \
  -d "client_secret=xYz789..." \
  -d "username=your-username" \
  -d "password=your-password" \
  -d "scope=https://mingle-ionapi.inforcloudsuite.com/TENANT"
```

#### Token Response
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "https://mingle-ionapi.inforcloudsuite.com/TENANT"
}
```

### API Request Headers

All API requests must include:

```http
Authorization: Bearer {access_token}
Content-Type: application/json
Accept: application/json
X-Infor-ION-API-Version: 2.0
```

## API Endpoints

### Base URL
```
https://mingle-ionapi.inforcloudsuite.com/{tenant}/{application}
```

### Manufacturing Endpoints

#### Manufacturing Orders

**List Manufacturing Orders**
```http
GET /DATACATALOG/api/datalake/v1/manufacturing/orders
```

Query Parameters:
- `facility`: Facility code
- `status`: Order status
- `product`: Product ID
- `_limit`: Max records (default: 50)
- `_offset`: Skip records

**Get Manufacturing Order**
```http
GET /DATACATALOG/api/datalake/v1/manufacturing/orders/{orderId}
```

**Create Manufacturing Order**
```http
POST /M3/m3api-rest/v2/execute/MOS100MI/AddMOhead
```

Request Body:
```json
{
  "FACI": "FAC001",
  "PRNO": "PROD-123",
  "ORQA": "100",
  "STDT": "20240120",
  "FIDT": "20240125"
}
```

#### Operations

**Report Operation**
```http
POST /M3/m3api-rest/v2/execute/MOS070MI/RptOperation
```

Request Body:
```json
{
  "FACI": "FAC001",
  "MFNO": "MO-2024-001",
  "OPNO": "10",
  "MAQA": "50",
  "SCQA": "2",
  "UMAT": "4.5",
  "UPIT": "4.0",
  "RPDT": "20240120",
  "RPTM": "1230"
}
```

#### Materials

**Get Item Availability**
```http
GET /M3/m3api-rest/v2/execute/MMS060MI/GetItmWhsBalance
```

Query Parameters:
- `WHLO`: Warehouse
- `ITNO`: Item number

**Issue Material**
```http
POST /M3/m3api-rest/v2/execute/MOS100MI/IssueMtrl
```

### Work Centers

**List Work Centers**
```http
GET /M3/m3api-rest/v2/execute/PDS010MI/LstWorkCenter
```

Query Parameters:
- `FACI`: Facility
- `PLGR`: Planning group

## Business Object Documents (BODs)

ION uses BODs for data exchange. Common BODs include:

### ProcessManufacturingOrder

```xml
<ProcessManufacturingOrder>
  <ApplicationArea>
    <Sender>
      <LogicalID>lid://infor.m3.1</LogicalID>
      <ComponentID>M3</ComponentID>
    </Sender>
    <CreationDateTime>2024-01-20T10:00:00Z</CreationDateTime>
    <BODID>infor-nid:infor:FAC001:MO-2024-001</BODID>
  </ApplicationArea>
  <DataArea>
    <Process>
      <ActionCriteria>
        <ActionExpression actionCode="Add"/>
      </ActionCriteria>
    </Process>
    <ManufacturingOrder>
      <ManufacturingOrderHeader>
        <DocumentID>
          <ID>MO-2024-001</ID>
        </DocumentID>
        <DocumentDateTime>2024-01-20T10:00:00Z</DocumentDateTime>
        <Status>
          <Code>Released</Code>
        </Status>
      </ManufacturingOrderHeader>
      <ManufacturingOrderLine>
        <LineNumber>1</LineNumber>
        <Item>
          <ItemID>
            <ID>PROD-123</ID>
          </ItemID>
        </Item>
        <OrderQuantity unitCode="EA">100</OrderQuantity>
        <Site>
          <ID>FAC001</ID>
        </Site>
      </ManufacturingOrderLine>
    </ManufacturingOrder>
  </DataArea>
</ProcessManufacturingOrder>
```

### SyncItemMaster

```xml
<SyncItemMaster>
  <ApplicationArea>
    <Sender>
      <LogicalID>lid://infor.m3.1</LogicalID>
    </Sender>
  </ApplicationArea>
  <DataArea>
    <Sync>
      <ActionCriteria>
        <ActionExpression actionCode="Change"/>
      </ActionCriteria>
    </Sync>
    <ItemMaster>
      <ItemMasterHeader>
        <ItemID>
          <ID>MAT-789</ID>
        </ItemID>
        <Description>Component A</Description>
        <Classification>
          <Code>RAW</Code>
        </Classification>
      </ItemMasterHeader>
    </ItemMaster>
  </DataArea>
</SyncItemMaster>
```

## Event Management

### Webhook Configuration

Register webhooks through ION API:

```http
POST /ION/api/v1/webhooks
```

Request Body:
```json
{
  "name": "MES Integration",
  "url": "https://mes-ion-api.company.com/webhooks/ion",
  "events": [
    "ManufacturingOrder.Created",
    "ManufacturingOrder.Updated",
    "ManufacturingOrder.Completed",
    "Operation.Reported",
    "Material.Issued"
  ],
  "active": true,
  "headers": {
    "X-API-Key": "webhook-api-key"
  }
}
```

### Event Format

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "ManufacturingOrder.Updated",
  "eventTime": "2024-01-20T10:30:00Z",
  "dataContentType": "application/json",
  "data": {
    "tenantId": "TENANT001",
    "documentId": "MO-2024-001",
    "changeType": "UPDATE",
    "changes": {
      "status": {
        "from": "PLANNED",
        "to": "RELEASED"
      }
    },
    "bodDocument": "<ProcessManufacturingOrder>...</ProcessManufacturingOrder>"
  }
}
```

### Event Types

| Event Type | Description | BOD |
|------------|-------------|-----|
| `ManufacturingOrder.Created` | New order created | ProcessManufacturingOrder |
| `ManufacturingOrder.Updated` | Order modified | ProcessManufacturingOrder |
| `ManufacturingOrder.Completed` | Order completed | ProcessManufacturingOrder |
| `Operation.Reported` | Operation time reported | ProcessProductionPerformance |
| `Material.Issued` | Material issued to order | ProcessInventoryMovement |
| `WorkCenter.StatusChanged` | Work center status update | SyncWorkCenter |

## Error Handling

### ION Error Response Format

```json
{
  "error": {
    "code": "M3_API_ERROR",
    "message": "Item PROD-999 does not exist",
    "target": "ITNO",
    "details": [
      {
        "code": "MMS001",
        "message": "Item number not found in item master",
        "field": "ITNO",
        "value": "PROD-999"
      }
    ],
    "innererror": {
      "transactionId": "TXN-123456",
      "timestamp": "2024-01-20T10:30:00Z"
    }
  }
}
```

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `UNAUTHORIZED` | Invalid or expired token | Refresh OAuth token |
| `FORBIDDEN` | Insufficient permissions | Check API scopes |
| `NOT_FOUND` | Resource not found | Verify ID exists |
| `VALIDATION_ERROR` | Invalid request data | Check field formats |
| `RATE_LIMIT` | Too many requests | Implement backoff |
| `SERVICE_UNAVAILABLE` | ION service down | Retry with backoff |

### M3-Specific Error Codes

| Code | Description |
|------|-------------|
| `MMS001` | Item not found |
| `MOS001` | Manufacturing order not found |
| `MOS002` | Invalid order status |
| `MOS003` | Operation already reported |
| `MMS002` | Insufficient inventory |
| `PDS001` | Work center not found |

## Best Practices

### 1. Connection Management

```typescript
// Use connection pooling
const axiosInstance = axios.create({
  baseURL: 'https://mingle-ionapi.inforcloudsuite.com',
  timeout: 30000,
  httpAgent: new http.Agent({ 
    keepAlive: true,
    maxSockets: 50
  }),
  httpsAgent: new https.Agent({ 
    keepAlive: true,
    maxSockets: 50
  })
});
```

### 2. Pagination

Always use pagination for list endpoints:

```typescript
async function getAllOrders(facility: string): Promise<Order[]> {
  const orders: Order[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  
  while (hasMore) {
    const response = await ionApi.get('/orders', {
      params: { facility, _limit: limit, _offset: offset }
    });
    
    orders.push(...response.data.items);
    hasMore = response.data.items.length === limit;
    offset += limit;
  }
  
  return orders;
}
```

### 3. Field Selection

Request only needed fields to reduce payload:

```http
GET /orders?_fields=orderId,status,product,quantity
```

### 4. Batch Operations

Use batch endpoints when available:

```http
POST /M3/m3api-rest/v2/execute/batch
```

Request Body:
```json
{
  "transactions": [
    {
      "program": "MOS070MI",
      "transaction": "RptOperation",
      "record": {
        "FACI": "FAC001",
        "MFNO": "MO-001",
        "OPNO": "10"
      }
    },
    {
      "program": "MOS070MI",
      "transaction": "RptOperation",
      "record": {
        "FACI": "FAC001",
        "MFNO": "MO-002",
        "OPNO": "20"
      }
    }
  ]
}
```

### 5. Retry Strategy

```typescript
const retryConfig = {
  retries: 3,
  retryDelay: (retryCount: number) => {
    return Math.pow(2, retryCount) * 1000; // Exponential backoff
  },
  retryCondition: (error: any) => {
    return error.response?.status >= 500 || 
           error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT';
  }
};
```

## Troubleshooting

### Common Issues

#### 1. Token Expiration

**Symptom**: 401 Unauthorized errors

**Solution**:
```typescript
// Implement token refresh
if (error.response?.status === 401) {
  await refreshToken();
  return retry(request);
}
```

#### 2. Rate Limiting

**Symptom**: 429 Too Many Requests

**Solution**:
```typescript
// Respect Retry-After header
const retryAfter = error.response.headers['retry-after'];
await sleep(retryAfter * 1000);
```

#### 3. Timeout Errors

**Symptom**: ETIMEDOUT or ECONNRESET

**Solution**:
- Increase timeout values
- Implement retry logic
- Check network connectivity

#### 4. Invalid BOD Format

**Symptom**: 400 Bad Request with XML parsing error

**Solution**:
- Validate BOD against XSD schema
- Ensure proper namespace declarations
- Check date/time formats (ISO 8601)

### Debugging Tips

1. **Enable Request Logging**:
```typescript
axiosInstance.interceptors.request.use(request => {
  console.log('ION Request:', {
    method: request.method,
    url: request.url,
    headers: request.headers,
    data: request.data
  });
  return request;
});
```

2. **Capture Full Error Details**:
```typescript
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    console.error('ION Error:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    });
    throw error;
  }
);
```

3. **Use ION API Explorer**:
- Test endpoints directly in ION API Explorer
- Verify request/response formats
- Check available fields and parameters

4. **Monitor ION Metrics**:
- Check ION API health dashboard
- Monitor API usage quotas
- Review error logs in ION

## Additional Resources

- [Infor ION API Documentation](https://docs.infor.com/ion-api/)
- [M3 API Documentation](https://docs.infor.com/m3/api/)
- [BOD Schema Reference](https://docs.infor.com/bod/)
- [ION Event Catalog](https://docs.infor.com/ion/events/)
- [OAuth 2.0 Configuration Guide](https://docs.infor.com/ion/oauth/)