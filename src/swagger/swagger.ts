import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Domain Crawler API',
      version: '1.0.0',
      description:
        'A production-grade background domain crawler. Start crawls, track progress, and retrieve results.',
    },
    servers: [
      {
        url: process.env.APP_BASE_URL || 'http://localhost:5005',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
