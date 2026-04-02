import { useState, useEffect, useCallback } from 'react';
import * as fmApi from '../../../api/client.js';
import { normalizeClinics } from '../shared/normalize.js';

export function useActions() {
  const [clinics, setClinics] = useState([]);
  const [waActivations, setWaActivations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Fetch both endpoints in parallel — use whichever succeeds
      const [actionsRes, platformRes, waRes] = await Promise.all([
        fmApi.apiFetch('/api/v1/ops/clinic-actions').catch(() => null),
        fmApi.getPlatformClinics({ limit: 100 }).catch(() => null),
        fmApi.apiFetch('/api/v1/ops/clinic/whatsapp-activations').catch(() => null),
      ]);

      // DEV logging removed for security

      // Prefer clinic-actions (has computed fields), fall back to platformClinics
      let clinicList = [];

      if (actionsRes?.clinics && Array.isArray(actionsRes.clinics) && actionsRes.clinics.length > 0) {
        clinicList = actionsRes.clinics;
      } else {
        // Fallback to getPlatformClinics
        const raw = normalizeClinics(platformRes);
        if (raw.length > 0) {
          clinicList = raw.map(c => ({
            ...c,
            required_action: computeAction(c),
            readiness_score: computeReadiness(c),
            mrr: (c.subscription_status === 'active' && c.plan_price_monthly) ? c.plan_price_monthly / 100 : (c.plan_price || c.mrr || 0),
          }));
        }
      }

      if (clinicList.length === 0) {
        console.warn('[useActions] No clinics found from either endpoint');
        setError('No clinic data returned from API');
      }

      // WA activations
      const activations = Array.isArray(waRes?.requests) ? waRes.requests
        : Array.isArray(waRes?.activations) ? waRes.activations : [];

      // Merge WA activation data
      if (activations.length > 0) {
        const activationMap = new Map();
        activations.forEach(a => {
          const orgId = a.orgId || a.org_id;
          if (orgId) activationMap.set(orgId, a);
        });
        clinicList.forEach(c => {
          const activation = activationMap.get(c.id);
          if (activation) {
            c._waActivation = activation;
            if (c.required_action === 'NONE' && (activation.status === 'pending' || activation.number_request_status === 'pending')) {
              c.required_action = 'CONNECT_WHATSAPP';
            }
          }
        });
      }

      setClinics(clinicList);
      setWaActivations(activations);
    } catch (err) {
      console.error('[useActions] Critical failure:', err);
      setError(err?.message || 'Failed to load clinic data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const actionRequired = clinics.filter(c => c.required_action && c.required_action !== 'NONE');
  const totalMrr = clinics.reduce((sum, c) => sum + (typeof c.mrr === 'number' ? c.mrr : 0), 0);
  const liveCount = clinics.filter(c => !c.required_action || c.required_action === 'NONE').length;

  return { clinics, waActivations, loading, error, reload: load, actionRequired, totalMrr, liveCount };
}

function computeAction(c) {
  const ws = c.workspace_state || '';
  const wa = c.whatsapp_connected || c.whatsapp_active;
  const waSetup = c.wa_setup_status || 'not_started';
  const sub = c.subscription_status || '';

  if (waSetup === 'failed') return 'FIX_ERROR';
  if (ws === 'pending_setup' && waSetup === 'not_started') return 'START_SETUP';
  if (ws === 'pending_setup' && waSetup === 'link_sent') return 'CONNECT_WHATSAPP';
  if (ws === 'pending_setup' && waSetup === 'otp_pending') return 'VERIFY_OTP';
  if (ws === 'pending_setup' && waSetup === 'verified') return 'ACTIVATE';
  if (ws === 'demo' && sub !== 'active') return 'START_SETUP';
  if ((ws === 'live_test' || ws === 'activation_pending') && !wa) return 'WAIT_FOR_NUMBER';
  if (ws === 'active' && sub === 'active') return 'NONE';
  if (ws === 'active' && !wa) return 'CONNECT_WHATSAPP';
  return 'START_SETUP';
}

function computeReadiness(c) {
  let score = 100;
  if (!c.whatsapp_connected && !c.whatsapp_active) score -= 40;
  if (!c.google_connected) score -= 10;
  if ((c.active_workflows || 0) === 0) score -= 10;
  if (!c.whatsapp_connected && !c.whatsapp_active) score -= 10; // no templates
  return Math.max(0, score);
}
