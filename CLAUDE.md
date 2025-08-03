# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Commands

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to dist/
- `npm start` - Run production build

### Testing
- `npm test` - Run all tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report (80% threshold required)
- `npm run test:integration` - Run integration tests
- `npm run test:proxy` - Test proxy endpoints

### Code Quality
- `npm run lint` - Run ESLint checks
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting

### Docker
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container
- `docker-compose up -d` - Start all services

## Architecture Overview

This is a MES ION API gateway that acts as an intermediary between Manufacturing Execution System applications and Infor ION APIs. Key components:

### Core Structure
- **Entry Point**: `src/index.ts` → `src/app.ts`
- **Configuration**: `src/config/` - Environment-based config with Joi validation
- **ION Integration**: `src/integrations/ion/` - OAuth 2.0 authentication, token management, API client
- **Routes**: `src/routes/` - API endpoints including proxy, health, metrics
- **Middleware**: `src/middleware/` - Auth, error handling, rate limiting, logging
- **Services**: `src/services/` - Business logic layer
- **Caching**: `src/cache/` - Memory and Redis caching strategies

### Authentication
- **Client → MES API**: No authentication required - all endpoints are public
- **MES API → ION**: OAuth 2.0 client credentials flow (handled automatically)
- **Optional**: Use `X-Client-ID` header for request tracking

### ION Credentials
Supports two configuration methods:
1. **ION_API_JSON**: Full .ionapi file content as JSON string (recommended)
2. **Individual env vars**: ION_TENANT_ID, ION_CLIENT_ID, etc.

### Key Features
- OAuth token caching and automatic refresh
- Request/response caching for GET requests
- Prometheus metrics at `/metrics`
- Health checks at `/health` and `/ready`
- Structured JSON logging with Winston
- Rate limiting and circuit breakers
- Swagger documentation at `/api-docs`

### Testing Strategy
- Unit tests co-located with source files (`*.test.ts`)
- Integration tests in `tests/integration/`
- 80% minimum coverage requirement
- Mock ION API responses for testing

### Development Workflow
1. Always run `npm run lint` and `npm run format` before committing
2. Ensure tests pass with `npm test`
3. Use TypeScript strict mode - no `any` types
4. Follow existing patterns for new endpoints
5. Add Swagger documentation for new APIs

### Important Files
- `src/integrations/ion/auth.ts` - OAuth token management
- `src/routes/proxy.ts` - Proxy endpoint implementation
- `src/middleware/auth.middleware.ts` - API key validation
- `src/utils/ionapi-parser.ts` - .ionapi file parsing
- `src/cache/strategy.ts` - Caching implementation