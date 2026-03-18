import swaggerJsdoc from 'swagger-jsdoc';

const { version } = require('../../package.json');

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WebCrawler.buzz API',
      version,
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
