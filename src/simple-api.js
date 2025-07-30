const express = require('express');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = process.env.PORT || 3000;

// Swagger specification
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'MES ION API',
    version: '1.0.0',
    description: 'A centralized API gateway service for integrating MES applications with Infor ION APIs',
    contact: {
      name: 'MES Team',
      email: 'mes-team@company.com',
    },
  },
  servers: [
    {
      url: 'http://api.ion.mes.localhost',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for authentication. Use "dev-api-key-mes-workflow" for development.',
      },
    },
    schemas: {
      HealthStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'unhealthy'],
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          environment: {
            type: 'string',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check endpoint',
        description: 'Returns the current health status of the API',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthStatus'
                }
              }
            }
          }
        }
      }
    },
    '/ready': {
      get: {
        summary: 'Readiness check endpoint',
        description: 'Returns the readiness status of the API',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is ready',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/proxy': {
      get: {
        summary: 'Proxy endpoint information',
        description: 'Returns information about the proxy endpoint',
        tags: ['Proxy'],
        security: [{ ApiKeyAuth: [] }],
        responses: {
          '200': {
            description: 'Proxy endpoint info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    examples: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    }
  }
};

// Middleware
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.get('/openapi.json', (req, res) => {
  res.json(swaggerSpec);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/ready', (req, res) => {
  res.json({ 
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'MES ION API',
    version: '1.0.0',
    documentation: '/api-docs',
    openapi: '/openapi.json',
    health: '/health',
    ready: '/ready'
  });
});

// API routes with authentication for proxy endpoints
app.use('/proxy', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  next();
});

app.get('/proxy', (req, res) => {
  res.json({
    message: 'ION API proxy endpoint',
    examples: [
      'GET /proxy/M3/m3api-rest/execute/CRS610MI/List',
      'POST /proxy/IDM/api/items',
      'GET /proxy/LN/api/orders'
    ]
  });
});

// Catch-all for proxy routes
app.use('/proxy', (req, res) => {
  const path = req.path;
  res.json({
    message: 'ION API proxy endpoint (placeholder)',
    path: path,
    method: req.method,
    timestamp: new Date().toISOString(),
    note: 'This is a placeholder response. In production, this would forward to ION API.'
  });
});

app.listen(PORT, () => {
  console.log(`MES ION API running on port ${PORT}`);
  console.log(`API Documentation available at http://api.ion.mes.localhost/api-docs`);
});