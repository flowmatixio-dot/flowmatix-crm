/**
 * Request validation middleware helpers.
 * Use Fastify's built-in JSON Schema validation where possible.
 * These are additional guards for common patterns.
 */

// Validate UUID parameter
export function validateUuid(paramName = 'id') {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return async (req, reply) => {
    const value = req.params?.[paramName];
    if (!value || !UUID_RE.test(value)) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: `Invalid ${paramName}: must be a valid UUID`,
        statusCode: 400,
      });
    }
  };
}

// Validate pagination params
export function validatePagination(req) {
  const page = Math.max(1, Number.parseInt(req.query?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query?.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Sanitize string input (strip HTML tags)
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.replaceAll(/<[^>]*>/g, '').trim();
}

// Validate required fields in body
export function requireFields(...fields) {
  return async (req, reply) => {
    const missing = fields.filter(f => !req.body?.[f] && req.body?.[f] !== 0);
    if (missing.length > 0) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: `Missing required fields: ${missing.join(', ')}`,
        statusCode: 400,
      });
    }
  };
}
