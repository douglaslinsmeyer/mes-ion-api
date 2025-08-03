import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

// Determine protocol based on environment
const protocol = config.isProduction ? 'https' : 'http';

const options: swaggerJsdoc.Options = {
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
        url: `${protocol}://${config.apiHostname}${config.apiPrefix}`,
        description: 'Current server',
      },
      ...(config.isDevelopment ? [{
        url: `http://localhost:${config.port}${config.apiPrefix}`,
        description: 'Direct local server',
      }] : []),
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Invalid request parameters',
                },
                details: {
                  type: 'object',
                  additionalProperties: true,
                },
              },
              required: ['code', 'message'],
            },
          },
        },
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
            version: {
              type: 'string',
            },
            environment: {
              type: 'string',
            },
            uptime: {
              type: 'number',
            },
            services: {
              type: 'object',
              properties: {
                cache: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['connected', 'disconnected'],
                    },
                    driver: {
                      type: 'string',
                    },
                  },
                },
                ionApi: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['connected', 'disconnected', 'unknown'],
                    },
                    lastCheck: {
                      type: 'string',
                      format: 'date-time',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);