import { readFileSync } from 'fs';
import { resolve } from 'path';

const startTime = Date.now();

let packageVersion = '0.0.0';
try {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));
  packageVersion = pkg.version || '0.0.0';
} catch { /* no package.json */ }

export default async function healthRoutes(fastify) {

  // ── GET /health — basic liveness ──────────────────────────
  fastify.get('/health', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // ── GET /api/v1/system/health — full system check ─────────
  fastify.get('/api/v1/system/health', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const checks = {};
    let overall = 'ok';

    // Database check
    try {
      const { data, error } = await fastify.supabaseAdmin
        .from('clinics')
        .select('id')
        .limit(1);
      checks.database = error ? 'error' : 'ok';
      if (error) overall = 'degraded';
    } catch {
      checks.database = 'error';
      overall = 'degraded';
    }

    // Redis check
    try {
      if (fastify.redis) {
        await fastify.redis.ping();
        checks.redis = 'ok';
      } else {
        checks.redis = 'not_configured';
      }
    } catch {
      checks.redis = 'error';
      overall = 'degraded';
    }

    // n8n check
    const n8nUrl = process.env.N8N_URL || 'https://n8n.flowmatix.io';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${n8nUrl}/healthz`, { signal: controller.signal });
      clearTimeout(timeout);
      checks.n8n = res.ok ? 'ok' : 'error';
      if (!res.ok) overall = 'degraded';
    } catch {
      checks.n8n = 'unreachable';
      overall = 'degraded';
    }

    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    const result = {
      status: overall,
      database: checks.database,
      redis: checks.redis,
      n8n: checks.n8n,
      uptime: uptimeSeconds,
      version: packageVersion,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    const statusCode = overall === 'ok' ? 200 : 503;
    return reply.status(statusCode).send(result);
  });
}
