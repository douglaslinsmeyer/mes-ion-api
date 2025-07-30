const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = process.env.PORT || 3000;

// Swagger configuration
const swaggerOptions = {
  definition: {
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
        url: `http://api.ion.mes.localhost`,
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
        ReadyStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ready', 'not-ready'],
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
  },
  apis: [], // We'll define routes inline
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Add Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Add OpenAPI JSON endpoint
app.get('/openapi.json', (req: any, res: any) => {
  res.json(swaggerSpec);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current health status of the API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 */
app.get('/health', (req: any, res: any) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Readiness check endpoint
 *     description: Returns the readiness status of the API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadyStatus'
 */
app.get('/ready', (req: any, res: any) => {
  res.json({ 
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/v1/proxy/{path}:
 *   all:
 *     summary: Proxy requests to Infor ION API
 *     description: |
 *       Forwards requests to the Infor ION API with automatic OAuth authentication.
 *       Currently returns a placeholder response.
 *     tags: [Proxy]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ION API path to proxy to
 *         example: M3/m3api-rest/execute/CRS610MI/List
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 path:
 *                   type: string
 *                 method:
 *                   type: string
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
// Middleware to handle API authentication
app.use('/api/v1/*', (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  next();
});

// Handle all proxy routes
app.all('/api/v1/proxy/*', (req: any, res: any) => {
  // Extract the path after /api/v1/proxy/
  const proxyPath = req.path.replace('/api/v1/proxy/', '');
  
  // Return placeholder response
  res.json({
    message: 'ION API proxy endpoint (placeholder)',
    path: proxyPath,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Add root endpoint
app.get('/', (req: any, res: any) => {
  res.json({
    service: 'MES ION API',
    version: '1.0.0',
    documentation: '/api-docs',
    openapi: '/openapi.json',
    health: '/health',
    ready: '/ready'
  });
});

// Update swagger spec with defined routes
swaggerSpec.paths = {
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
                $ref: '#/components/schemas/ReadyStatus'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/proxy/{path}': {
    get: {
      summary: 'Proxy GET requests to Infor ION API',
      description: 'Forwards GET requests to the Infor ION API with automatic OAuth authentication.',
      tags: ['Proxy'],
      security: [{ ApiKeyAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'The ION API path to proxy to',
          example: 'M3/m3api-rest/execute/CRS610MI/List'
        }
      ],
      responses: {
        '200': {
          description: 'Successful response from ION API',
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        '401': {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    post: {
      summary: 'Proxy POST requests to Infor ION API',
      description: 'Forwards POST requests to the Infor ION API with automatic OAuth authentication.',
      tags: ['Proxy'],
      security: [{ ApiKeyAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'The ION API path to proxy to'
        }
      ],
      requestBody: {
        description: 'Request body to forward to ION API',
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Successful response from ION API',
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        '401': {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }
};

app.listen(PORT, () => {
  console.log(`MES ION API running on port ${PORT}`);
  console.log(`API Documentation available at http://api.ion.mes.localhost/api-docs`);
});