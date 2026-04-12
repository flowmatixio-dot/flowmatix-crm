import fp from 'fastify-plugin';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const ACCESS_TOKEN_TTL = 15 * 60;        // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 3600; // 7 days

const IS_PROD = process.env.NODE_ENV === 'production';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'strict',
  path: '/',
};

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function authPlugin(fastify) {
  // Service-role client for admin operations
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Anon client for user-scoped queries
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  fastify.decorate('supabaseAdmin', supabaseAdmin);
  fastify.decorate('supabaseAnon', supabaseAnon);

  // ── Set auth cookies ──────────────────────────────────────
  fastify.decorate('setAuthCookies', (reply, accessToken, refreshToken) => {
    reply.setCookie('fm_access', accessToken, {
      ...COOKIE_OPTS,
      maxAge: ACCESS_TOKEN_TTL,
    });
    reply.setCookie('fm_refresh', refreshToken, {
      ...COOKIE_OPTS,
      maxAge: REFRESH_TOKEN_TTL,
    });
  });

  // ── Clear auth cookies ────────────────────────────────────
  fastify.decorate('clearAuthCookies', (reply) => {
    reply.clearCookie('fm_access', COOKIE_OPTS);
    reply.clearCookie('fm_refresh', COOKIE_OPTS);
  });

  // ── Authenticate request decorator ────────────────────────
  fastify.decorate('authenticate', async (req, reply) => {
    // Try cookie-based auth first, then fallback to Bearer token
    const cookieToken = req.cookies?.fm_access;
    const bearerToken = req.headers.authorization?.replaceAll('Bearer ', '');
    const token = cookieToken || bearerToken;

    if (!token) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    try {
      const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
      if (error || !user) throw new Error('Invalid token');

      // Fetch user profile with membership info
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('*, memberships(clinic_id, role)')
        .eq('id', user.id)
        .single();

      req.user = {
        id: user.id,
        email: user.email,
        role: profile?.role || 'readonly',
        clinicId: profile?.clinic_id,
        memberships: profile?.memberships || [],
        isOperator: profile?.role === 'admin' && !profile?.clinic_id,
      };
    } catch {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        statusCode: 401,
      });
    }
  });

  // ── Operator-only guard ───────────────────────────────────
  fastify.decorate('requireOperator', async (req, reply) => {
    await fastify.authenticate(req, reply);
    if (reply.sent) return;

    if (!req.user?.isOperator) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Operator access required. Clinic users cannot access this resource.',
        statusCode: 403,
      });
    }
  });

  // ── Clinic member guard ───────────────────────────────────
  fastify.decorate('requireClinicAccess', (clinicId) => async (req, reply) => {
    await fastify.authenticate(req, reply);
    if (reply.sent) return;

    if (req.user.isOperator) return; // operators can access any clinic

    const hasMembership = req.user.memberships.some(m => m.clinic_id === clinicId);
    const hasLegacy = req.user.clinicId === clinicId;

    if (!hasMembership && !hasLegacy) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have access to this clinic',
        statusCode: 403,
      });
    }
  });
}

export default fp(authPlugin, { name: 'auth' });
