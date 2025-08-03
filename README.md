# MES ION API

MES ION API Gateway - Centralized integration layer for Infor ION APIs

## Description

The MES ION API serves as an intermediary layer between Manufacturing Execution System (MES) applications and Infor ION APIs. It handles OAuth 2.0 authentication, request routing, data transformation, and provides a unified interface for all ION interactions.

## Prerequisites

- Node.js >=20.0.0
- npm >=10.0.0
- Docker and Docker Compose (optional)
- Kubernetes cluster (for deployment)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/douglaslinsmeyer/mes-ion-api.git
cd mes-ion-api
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Configure your `.env` file with ION API credentials (see Configuration section)

## Configuration

### ION API Credentials

The service supports two methods for providing ION credentials:

#### Method 1: Using ION_API_JSON (Recommended)
Set the entire .ionapi file content as a JSON string:
```bash
export ION_API_JSON='{"ti":"TENANT_ID","ci":"CLIENT_ID","cs":"CLIENT_SECRET","saak":"USERNAME","sask":"PASSWORD","pu":"https://mingle-sso.inforcloudsuite.com:443/TENANT/as/","ot":"token.oauth2","iu":"https://mingle-ionapi.inforcloudsuite.com","sc":["Infor-ION"]}'
```

#### Method 2: Individual Environment Variables
```env
ION_TENANT_ID=your-tenant-id
ION_CLIENT_ID=your-client-id
ION_CLIENT_SECRET=your-client-secret
ION_USERNAME=your-ion-username
ION_PASSWORD=your-ion-password
ION_TOKEN_ENDPOINT=https://mingle-ionapi.inforcloudsuite.com/TENANT/as/token.oauth2
ION_API_ENDPOINT=https://mingle-ionapi.inforcloudsuite.com/TENANT
```

### Other Configuration Options
```env
# Server
PORT=3000
LOG_LEVEL=info

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Cache
CACHE_DRIVER=memory
CACHE_TTL_SECONDS=300
```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker Compose (includes PostgreSQL, Redis, RabbitMQ)
```bash
docker-compose up -d
```

## API Endpoints

All endpoints are publicly accessible - no authentication required.

### Available Endpoints

#### Health Check
```bash
GET /health
curl http://localhost:3000/health
```

#### Metrics (Prometheus format)
```bash
GET /metrics
curl http://localhost:3000/metrics
```

#### API Documentation
```bash
GET /api-docs
# Swagger UI
```

#### Proxy Endpoint
```bash
GET/POST/PUT/DELETE /proxy/*
# Forwards requests to ION API with automatic OAuth authentication
curl http://localhost:3000/proxy/m3api-rest/v2/execute/PMS100MI/SearchMO?SQRY=0000002786

# Optional: Include X-Client-ID header for request tracking
curl -H "X-Client-ID: my-app" http://localhost:3000/proxy/m3api-rest/v2/execute/PMS100MI/SearchMO
```

## Project Structure

```
mes-ion-api/
├── src/
│   ├── app.ts              # Express application setup
│   ├── index.ts            # Server entry point
│   ├── config/             # Configuration and Swagger setup
│   ├── integrations/ion/   # ION API integration (auth, client, token management)
│   ├── routes/             # API route definitions
│   ├── middleware/         # Express middleware (auth, error handling, rate limiting)
│   ├── services/           # Business logic layer
│   ├── cache/              # Caching strategies (memory/Redis)
│   └── utils/              # Utility functions (logging, metrics, errors)
├── tests/                  # Test suites
├── manifests/              # Kubernetes deployment files
└── scripts/                # Utility scripts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to dist/ |
| `npm start` | Run production server |
| `npm test` | Run all tests |
| `npm run test:coverage` | Run tests with coverage (80% threshold) |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run docker:build` | Build Docker image |

## Testing

The project uses Jest with TypeScript support:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report (80% minimum required)
npm run test:coverage

# Integration tests only
npm run test:integration
```

Test files are located alongside source files (`*.test.ts`) and in the `tests/` directory.

## Kubernetes Deployment

Deploy to Kubernetes using Kustomize:

```bash
# Deploy to local development
kubectl apply -k manifests/overlays/localdev

# Access the service at http://localhost/ion/*
```

The service is configured to run behind an ingress at `/ion` path.

## Development Tools

- **TypeScript 5.3.3** - Type safety and modern JavaScript features
- **Express 5.0.0-beta.1** - Web framework
- **Winston** - Structured logging
- **Prometheus Client** - Metrics collection
- **Swagger** - API documentation
- **ESLint & Prettier** - Code quality and formatting
- **Husky & Commitizen** - Git hooks and conventional commits

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes using conventional commits (`npm run commit`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential (UNLICENSED).

## Support

- Issues: [GitHub Issues](https://github.com/douglaslinsmeyer/mes-ion-api/issues)
- Repository: [https://github.com/douglaslinsmeyer/mes-ion-api](https://github.com/douglaslinsmeyer/mes-ion-api)