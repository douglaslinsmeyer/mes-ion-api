# MES ION API Development Guide

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Coding Standards](#coding-standards)
4. [Development Workflow](#development-workflow)
5. [Testing](#testing)
6. [Debugging](#debugging)
7. [Common Tasks](#common-tasks)

## Development Environment Setup

### Prerequisites

- Node.js 20.x LTS or higher
- npm 10.x or higher
- PostgreSQL 15.x
- Redis 7.x
- Docker and Docker Compose (recommended)
- VS Code or preferred IDE

### Initial Setup

1. **Clone the repository:**
```bash
git clone https://github.com/company/mes-ion-api.git
cd mes-ion-api
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your local configuration
```

4. **Start infrastructure services:**
```bash
docker-compose up -d postgres redis rabbitmq
```

5. **Run database migrations:**
```bash
npm run db:migrate
```

6. **Seed test data (optional):**
```bash
npm run db:seed
```

7. **Start development server:**
```bash
npm run dev
```

### VS Code Configuration

Recommended extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Jest Runner
- Docker
- PostgreSQL

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "node_modules": true,
    "dist": true,
    "coverage": true
  }
}
```

## Project Structure

```
mes-ion-api/
├── src/
│   ├── config/         # Configuration and environment setup
│   ├── controllers/    # HTTP request handlers
│   ├── services/       # Business logic layer
│   ├── middleware/     # Express middleware functions
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions and helpers
│   ├── db/             # Database models and migrations
│   ├── graphql/        # GraphQL schema and resolvers
│   ├── app.ts          # Express application setup
│   └── index.ts        # Application entry point
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── fixtures/       # Test data and mocks
├── docs/               # Documentation
├── scripts/            # Utility scripts
└── manifests/          # Kubernetes deployment files
```

### Key Directories Explained

- **config/**: Environment configuration, database setup, ION API settings
- **controllers/**: REST API endpoint handlers, request/response handling
- **services/**: Core business logic, ION API client, data transformation
- **middleware/**: Authentication, validation, error handling, logging
- **types/**: TypeScript interfaces and type definitions
- **utils/**: Helper functions, constants, shared utilities
- **db/**: Database entities, repositories, migration files

## Coding Standards

### TypeScript Guidelines

1. **Use strict type checking:**
```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // Implementation
}

// Bad
function getUser(id: any): Promise<any> {
  // Implementation
}
```

2. **Use type imports:**
```typescript
// Good
import type { Request, Response } from 'express';
import { Router } from 'express';

// Bad
import { Request, Response, Router } from 'express';
```

3. **Prefer interfaces over types:**
```typescript
// Good
interface ManufacturingOrder {
  id: string;
  product: string;
  quantity: number;
}

// Avoid unless needed for unions/intersections
type OrderStatus = 'PLANNED' | 'RELEASED' | 'COMPLETED';
```

### Naming Conventions

- **Files**: kebab-case (e.g., `manufacturing-order.service.ts`)
- **Classes**: PascalCase (e.g., `ManufacturingOrderService`)
- **Interfaces**: PascalCase with 'I' prefix for services (e.g., `IAuthService`)
- **Functions**: camelCase (e.g., `getManufacturingOrder`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_PAGE_SIZE`)

### Code Organization

1. **Service Pattern:**
```typescript
// manufacturing-order.service.ts
export class ManufacturingOrderService {
  constructor(
    private readonly ionClient: IONClient,
    private readonly cache: CacheService,
    private readonly logger: Logger
  ) {}

  async getOrder(id: string): Promise<ManufacturingOrder> {
    // Check cache first
    const cached = await this.cache.get(`order:${id}`);
    if (cached) return cached;

    // Fetch from ION
    const order = await this.ionClient.getManufacturingOrder(id);
    
    // Transform and cache
    const transformed = this.transformOrder(order);
    await this.cache.set(`order:${id}`, transformed, 300);
    
    return transformed;
  }

  private transformOrder(ionOrder: IONOrder): ManufacturingOrder {
    // Transformation logic
  }
}
```

2. **Controller Pattern:**
```typescript
// manufacturing-order.controller.ts
export class ManufacturingOrderController {
  constructor(private readonly orderService: ManufacturingOrderService) {}

  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.orderService.getOrder(id);
      res.json({ success: true, data: order });
    } catch (error) {
      throw new ApiError('Failed to get order', 500, error);
    }
  }
}
```

### Error Handling

```typescript
// Custom error class
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Usage
throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
```

## Development Workflow

### Git Workflow

1. **Branch naming:**
   - Feature: `feature/mes-123-order-api`
   - Bug fix: `fix/mes-456-auth-error`
   - Hotfix: `hotfix/critical-security-patch`

2. **Commit messages:**
```bash
# Good
git commit -m "feat(orders): add bulk order creation endpoint"
git commit -m "fix(auth): resolve token refresh race condition"
git commit -m "docs: update API documentation for v1.2"

# Use conventional commits
feat: new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semicolons, etc.
refactor: restructuring code
test: adding tests
chore: maintain
```

3. **Pull request process:**
   - Create feature branch from `main`
   - Write code and tests
   - Run linting and tests locally
   - Create PR with description
   - Address review comments
   - Squash and merge

### Local Development

1. **Start development server with hot reload:**
```bash
npm run dev
```

2. **Run linting:**
```bash
npm run lint
npm run lint:fix
```

3. **Format code:**
```bash
npm run format
```

4. **Type checking:**
```bash
npx tsc --noEmit
```

## Testing

### Unit Testing

```typescript
// manufacturing-order.service.test.ts
describe('ManufacturingOrderService', () => {
  let service: ManufacturingOrderService;
  let mockIonClient: jest.Mocked<IONClient>;
  let mockCache: jest.Mocked<CacheService>;

  beforeEach(() => {
    mockIonClient = createMockIonClient();
    mockCache = createMockCache();
    service = new ManufacturingOrderService(mockIonClient, mockCache);
  });

  describe('getOrder', () => {
    it('should return cached order if available', async () => {
      const cachedOrder = { id: 'MO-001', product: 'PROD-123' };
      mockCache.get.mockResolvedValue(cachedOrder);

      const result = await service.getOrder('MO-001');

      expect(result).toEqual(cachedOrder);
      expect(mockIonClient.getManufacturingOrder).not.toHaveBeenCalled();
    });

    it('should fetch from ION if not cached', async () => {
      mockCache.get.mockResolvedValue(null);
      const ionOrder = { OrderID: 'MO-001', ItemID: 'PROD-123' };
      mockIonClient.getManufacturingOrder.mockResolvedValue(ionOrder);

      const result = await service.getOrder('MO-001');

      expect(mockIonClient.getManufacturingOrder).toHaveBeenCalledWith('MO-001');
      expect(mockCache.set).toHaveBeenCalled();
    });
  });
});
```

### Integration Testing

```typescript
// api.integration.test.ts
describe('Manufacturing Order API Integration', () => {
  let app: Application;
  
  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('GET /api/v1/manufacturing-orders/:id', () => {
    it('should return order details', async () => {
      const response = await request(app)
        .get('/api/v1/manufacturing-orders/MO-001')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: 'MO-001',
          product: expect.any(String),
          quantity: expect.any(Number)
        }
      });
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run only unit tests
npm test -- --testPathPattern=unit

# Run only integration tests
npm test -- --testPathPattern=integration
```

## Debugging

### Debug Configuration

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal",
      "env": {
        "DEBUG": "mes-ion-api:*"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--detectOpenHandles"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

```typescript
// Use structured logging
import { logger } from '@utils/logger';

logger.info('Order created', {
  orderId: 'MO-001',
  facility: 'FAC001',
  product: 'PROD-123',
  quantity: 100
});

logger.error('Failed to create order', {
  error: error.message,
  stack: error.stack,
  orderId: 'MO-001'
});
```

### Performance Profiling

```typescript
// Add timing to critical operations
import { performance } from '@utils/performance';

const timer = performance.startTimer();
const result = await ionClient.getManufacturingOrder(id);
const duration = timer.end();

logger.info('ION API call completed', { duration, orderId: id });
```

## Common Tasks

### Adding a New Endpoint

1. **Define types:**
```typescript
// types/material.ts
export interface Material {
  id: string;
  description: string;
  quantity: number;
  warehouse: string;
}
```

2. **Create service:**
```typescript
// services/material.service.ts
export class MaterialService {
  async getMaterial(id: string): Promise<Material> {
    // Implementation
  }
}
```

3. **Create controller:**
```typescript
// controllers/material.controller.ts
export class MaterialController {
  async getMaterial(req: Request, res: Response): Promise<void> {
    const material = await this.materialService.getMaterial(req.params.id);
    res.json({ success: true, data: material });
  }
}
```

4. **Add route:**
```typescript
// routes/material.routes.ts
router.get('/materials/:id', authenticate, materialController.getMaterial);
```

5. **Add tests:**
```typescript
// Write unit and integration tests
```

### Database Migrations

```bash
# Create new migration
npm run migration:create -- AddMaterialsTable

# Run migrations
npm run db:migrate

# Rollback migration
npm run db:rollback
```

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Update specific package
npm install package@latest

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### Performance Optimization

1. **Enable query logging:**
```typescript
// In development
DATABASE_LOG_QUERIES=true
```

2. **Monitor slow queries:**
```sql
-- PostgreSQL slow query log
ALTER SYSTEM SET log_min_duration_statement = 1000;
```

3. **Use explain analyze:**
```typescript
const explainQuery = `EXPLAIN ANALYZE ${query}`;
const plan = await db.query(explainQuery);
logger.debug('Query plan', { plan });
```

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Infor ION API Documentation](internal-link-to-ion-docs)