const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskFlow API',
      version: '1.0.0',
      description: `
## TaskFlow API Documentation

A complete **Task Manager REST API** with:
- 🔐 JWT Authentication (7-day tokens)
- 🛡️ Role-Based Access Control (ADMIN, MANAGER, EMPLOYEE)
- 📋 Full Task CRUD with filters and pagination
- 📊 Audit logging for all task actions
- 🚦 Rate limiting protection

### Authentication
Use the \`/api/auth/login\` endpoint to obtain a Bearer token, then click **Authorize** and enter: \`Bearer <your-token>\`
      `,
      contact: {
        name: 'TaskFlow API Support',
        email: 'support@taskflow.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://your-vercel-app.vercel.app'
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clxyz123abc' },
            name: { type: 'string', example: 'Alice Admin' },
            email: { type: 'string', example: 'admin@taskflow.com' },
            role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clxyz456def' },
            title: { type: 'string', example: 'Design landing page' },
            description: { type: 'string', example: 'Create mockups in Figma' },
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            userId: { type: 'string', nullable: true },
            assignedTo: {
              nullable: true,
              allOf: [{ $ref: '#/components/schemas/User' }],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
            taskId: { type: 'string', nullable: true },
            task: { nullable: true, allOf: [{ $ref: '#/components/schemas/Task' }] },
            action: { type: 'string', enum: ['CREATED', 'UPDATED', 'DELETED'] },
            changes: {
              type: 'object',
              example: { before: { status: 'TODO' }, after: { status: 'IN_PROGRESS' } },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
              },
            },
          },
        },
        TaskResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                task: { $ref: '#/components/schemas/Task' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 42 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 5 },
            hasNextPage: { type: 'boolean', example: true },
            hasPrevPage: { type: 'boolean', example: false },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Email already in use' },
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
