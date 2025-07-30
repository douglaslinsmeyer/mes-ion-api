# MES ION API

A centralized API gateway service for integrating MES applications with Infor ION APIs.

## Overview

The MES ION API serves as an intermediary layer between Manufacturing Execution System (MES) applications and Infor ION APIs. It handles authentication, request routing, data transformation, and provides a unified interface for all ION interactions.

## Features

- 🔐 **Centralized Authentication** - OAuth 2.0 client credentials flow with token caching
- 🔄 **Data Transformation** - Automatic conversion between MES JSON and ION BOD formats
- 🚀 **High Performance** - Response caching, connection pooling, and circuit breakers
- 📊 **Monitoring** - Comprehensive metrics, logging, and health checks
- 🔌 **Webhook Support** - Real-time event processing from ION
- 🛡️ **Security** - API key management, request signing, and audit logging
- 📖 **Dual API** - REST and GraphQL endpoints for flexibility

## Architecture

```
MES Applications → MES ION API → Infor ION APIs
                        ↓
                  PostgreSQL, Redis
```

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 15.x
- Redis 7.x
- Docker and Docker Compose (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/douglaslinsmeyer/mes-ion-api.git
cd mes-ion-api
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:
```bash
npm run db:migrate
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Docker Setup

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f api
```

## Configuration

### Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/mes_ion_api

# Redis Configuration
REDIS_URL=redis://localhost:6379

# ION API Configuration
ION_TENANT_ID=your-tenant-id
ION_CLIENT_ID=your-client-id
ION_CLIENT_SECRET=your-client-secret
ION_TOKEN_ENDPOINT=https://mingle-ionapi.inforcloudsuite.com/TENANT/as/token.oauth2
ION_API_ENDPOINT=https://mingle-ionapi.inforcloudsuite.com/TENANT/api

# Security
API_KEY_SALT=your-random-salt
WEBHOOK_SECRET=your-webhook-secret
```

## API Documentation

### Authentication

Include your API key in the request header:

```http
X-API-Key: your-api-key
```

### Example Requests

#### Get Manufacturing Orders

```bash
curl -X GET "http://localhost:3000/api/v1/manufacturing-orders?facility=FAC001" \
  -H "X-API-Key: your-api-key"
```

#### Create Manufacturing Order

```bash
curl -X POST "http://localhost:3000/api/v1/manufacturing-orders" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "facility": "FAC001",
    "product": "PROD-123",
    "quantity": 100,
    "dueDate": "2024-01-25T17:00:00Z"
  }'
```

### GraphQL

Access the GraphQL playground at `http://localhost:3000/graphql`

```graphql
query {
  manufacturingOrders(facility: "FAC001") {
    id
    product {
      id
      description
    }
    quantity
    status
  }
}
```

## Development

### Project Structure

```
mes-ion-api/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # REST API controllers
│   ├── services/       # Business logic
│   ├── middleware/     # Express middleware
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   └── db/             # Database layer
├── tests/              # Test files
├── docs/               # Documentation
├── scripts/            # Utility scripts
└── manifests/          # Kubernetes manifests
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Code Style

This project uses ESLint and Prettier for code formatting:

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Deployment

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -k manifests/overlays/production

# Check deployment status
kubectl get pods -n mes-system
```

### Health Checks

- Health endpoint: `GET /health`
- Readiness endpoint: `GET /ready`
- Metrics endpoint: `GET /metrics`

## Monitoring

### Prometheus Metrics

The API exposes Prometheus metrics at `/metrics`:

- `http_request_duration_seconds` - Request duration histogram
- `http_requests_total` - Total request counter
- `ion_api_requests_total` - ION API request counter
- `cache_hits_total` - Cache hit counter
- `active_connections` - Active connection gauge

### Logging

Logs are structured JSON format using Winston:

```json
{
  "timestamp": "2024-01-20T10:30:00Z",
  "level": "info",
  "message": "Manufacturing order created",
  "requestId": "req-123-456",
  "orderId": "MO-2024-001",
  "duration": 145
}
```

## API Reference

Full API documentation is available at:
- REST API: `http://localhost:3000/api-docs`
- GraphQL: `http://localhost:3000/graphql`

See [API Specification](docs/api/API_SPECIFICATION.md) for detailed endpoint documentation.

## Authentication

The MES ION API uses a two-layer authentication system. For complete details, see:
- [ION Authentication Guide](docs/ION_AUTHENTICATION_GUIDE.md) - Comprehensive authentication documentation
- [Infor ION Reference](docs/INFOR_ION_REFERENCE.md) - ION-specific API information

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- Report security vulnerabilities to security@company.com
- See [SECURITY.md](SECURITY.md) for security policies
- Regular dependency updates via Dependabot

## License

This project is proprietary and confidential.

## Support

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/douglaslinsmeyer/mes-ion-api/issues)
- Email: mes-team@company.com

## Roadmap

- [ ] Multi-tenant support
- [ ] Advanced caching strategies
- [ ] GraphQL subscriptions
- [ ] API versioning
- [ ] Machine learning for anomaly detection

## Acknowledgments

- Built using the architecture patterns from mes-workflow-api
- Inspired by modern API gateway designs
- ION API integration patterns from mes-api-workflow