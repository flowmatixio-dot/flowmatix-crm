import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function authRoutes(fastify) {

  // ── POST /api/v1/auth/login ───────────────────────────────
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
    },
    config: {
      rateLimit: { max: 10, timeWindow: '5 minutes' },
    },
  }, async (req, reply) => {
    const { email, password } = req.body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return reply.status(401).send({
        error: 'Authentication Failed',
        message: 'Invalid email or password',
        statusCode: 401,
      });
    }

    // Fetch user profile
    const { data: profile } = await fastify.supabaseAdmin
      .from('users')
      .select('*, memberships(clinic_id, role)')
      .eq('id', data.user.id)
      .single();

    // Set httpOnly cookies
    fastify.setAuthCookies(reply, data.session.access_token, data.session.refresh_token);

    const isOperator = profile?.role === 'admin' && !profile?.clinic_id;

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.display_name || profile?.first_name || email.split('@')[0],
        role: isOperator ? 'platform_owner' : profile?.role || 'readonly',
        organizationId: profile?.clinic_id,
        memberships: profile?.memberships || [],
      },
      // Also return tokens for backward compatibility with existing frontend
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  });

  // ── POST /api/v1/auth/refresh ─────────────────────────────
  fastify.post('/refresh', {
    config: {
      rateLimit: { max: 30, timeWindow: '1 minute' },
    },
  }, async (req, reply) => {
    // Try cookie first, then body
    const refreshToken = req.cookies?.fm_refresh || req.body?.refreshToken;

    if (!refreshToken) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'No refresh token provided',
        statusCode: 401,
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      fastify.clearAuthCookies(reply);
      return reply.status(401).send({
        error: 'Session Expired',
        message: 'Please log in again',
        statusCode: 401,
      });
    }

    fastify.setAuthCookies(reply, data.session.access_token, data.session.refresh_token);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  });

  // ── GET /api/v1/auth/me ───────────────────────────────────
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (req) => {
    return { user: req.user };
  });

  // ── POST /api/v1/auth/logout ──────────────────────────────
  fastify.post('/logout', async (req, reply) => {
    // Try to invalidate Supabase session
    const token = req.cookies?.fm_access || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await supabase.auth.admin.signOut(token);
      } catch {
        // Best-effort logout
      }
    }

    // Clear httpOnly cookies
    fastify.clearAuthCookies(reply);

    return { success: true, message: 'Logged out' };
  });
}
