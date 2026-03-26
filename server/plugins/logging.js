import fp from 'fastify-plugin';

async function loggingPlugin(fastify) {
  // ── Request/Response structured logging ───────────────────
  fastify.addHook('onRequest', async (req) => {
    req.startTime = Date.now();
  });

  fastify.addHook('onResponse', async (req, reply) => {
    const duration = Date.now() - (req.startTime || Date.now());
    const level = reply.statusCode >= 500 ? 'error'
      : reply.statusCode >= 400 ? 'warn'
      : 'info';

    fastify.log[level]({
      type: 'http',
      method: req.method,
      url: req.url,
      statusCode: reply.statusCode,
      duration,
      ip: req.ip,
      userId: req.user?.id || null,
      userAgent: req.headers['user-agent'],
    });
  });

  // ── Slow request warning ──────────────────────────────────
  fastify.addHook('onResponse', async (req, reply) => {
    const duration = Date.now() - (req.startTime || Date.now());
    if (duration > 2000) {
      fastify.log.warn({
        type: 'slow_request',
        method: req.method,
        url: req.url,
        duration,
        threshold: 2000,
      });
    }
  });
}

export default fp(loggingPlugin, { name: 'logging' });
