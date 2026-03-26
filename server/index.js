import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import authPlugin from './plugins/auth.js';
import loggingPlugin from './plugins/logging.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://app.flowmatix.io';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    } : undefined,
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          remoteAddress: req.ip,
          userAgent: req.headers?.['user-agent'],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  },
  trustProxy: true,
});

// ── Security Headers ────────────────────────────────────────
await app.register(helmet, {
  contentSecurityPolicy: false, // handled by Nginx
});

// ── CORS ────────────────────────────────────────────────────
await app.register(cors, {
  origin: [
    CORS_ORIGIN,
    'https://crm.flowmatix.io',
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:3000'] : []),
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// ── Cookies ─────────────────────────────────────────────────
await app.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'flowmatix-cookie-secret-change-in-production',
  parseOptions: {},
});

// ── Rate Limiting ───────────────────────────────────────────
await app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: (req, context) => ({
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Retry after ${Math.ceil(context.ttl / 1000)}s`,
    statusCode: 429,
    retryAfter: Math.ceil(context.ttl / 1000),
  }),
});

// ── Plugins ─────────────────────────────────────────────────
await app.register(loggingPlugin);
await app.register(authPlugin);

// ── Request Validation Defaults ─────────────────────────────
app.setErrorHandler((error, req, reply) => {
  const statusCode = error.statusCode || 500;
  const isValidation = error.validation;

  app.log.error({
    err: error,
    req: { method: req.method, url: req.url, ip: req.ip },
    statusCode,
  });

  if (isValidation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
      statusCode: 400,
    });
  }

  if (statusCode === 429) {
    return reply.status(429).send({
      error: 'Too Many Requests',
      message: error.message,
      statusCode: 429,
    });
  }

  return reply.status(statusCode).send({
    error: statusCode >= 500 ? 'Internal Server Error' : error.message,
    message: statusCode >= 500 ? 'An unexpected error occurred' : error.message,
    statusCode,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
});

// ── 404 Handler ─────────────────────────────────────────────
app.setNotFoundHandler((req, reply) => {
  reply.status(404).send({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    statusCode: 404,
  });
});

// ── Routes ──────────────────────────────────────────────────
await app.register(healthRoutes);
await app.register(authRoutes, { prefix: '/api/v1/auth' });

// ── Start ───────────────────────────────────────────────────
try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Flowmatix API running on ${HOST}:${PORT}`);
} catch (err) {
  app.log.fatal(err);
  process.exit(1);
}

export default app;
