import { useState, useEffect, useCallback } from 'react';
import * as fmApi from '../../../api/client.js';

export function useActions() {
  const [clinics, setClinics] = useState([]);
  const [waActivations, setWaActivations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      // Try clinic-actions first (has computed required_action + readiness_score)
      // Fall back to getPlatformClinics if clinic-actions fails
      let clinicList = [];

      try {
        const actionsRes = await fmApi.apiFetch('/api/v1/ops/clinic-actions');
        clinicList = Array.isArray(actionsRes?.clinics) ? actionsRes.clinics : [];
      } catch {
        // Fallback: use the proven getPlatformClinics endpoint
        try {
          const fallbackRes = await fmApi.getPlatformClinics();
          const raw = Array.isArray(fallbackRes?.clinics) ? fallbackRes.clinics
            : Array.isArray(fallbackRes?.data) ? fallbackRes.data
            : Array.isArray(fallbackRes) ? fallbackRes : [];
          // Add computed fields that clinic-actions would provide
          clinicList = raw.map(c => ({
            ...c,
            required_action: computeAction(c),
            readiness_score: computeReadiness(c),
            mrr: (c.subscription_status === 'active' && c.plan_price_monthly) ? c.plan_price_monthly / 100 : (c.plan_price || 0),
          }));
        } catch {}
      }

      // WA activations (non-critical, OK if fails)
      let activations = [];
      try {
        const waRes = await fmApi.apiFetch('/api/v1/ops/clinic/whatsapp-activations');
        activations = Array.isArray(waRes?.requests) ? waRes.requests
          : Array.isArray(waRes?.activations) ? waRes.activations : [];
      } catch {}

      // Merge WA activation data into clinic records
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
      console.error('[useActions] Failed to load clinics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const actionRequired = clinics.filter(c => c.required_action && c.required_action !== 'NONE');
  const totalMrr = clinics.reduce((sum, c) => sum + (typeof c.mrr === 'number' ? c.mrr : 0), 0);
  const liveCount = clinics.filter(c => !c.required_action || c.required_action === 'NONE').length;

  return { clinics, waActivations, loading, reload: load, actionRequired, totalMrr, liveCount };
}

// Client-side action computation (used when clinic-actions endpoint unavailable)
function computeAction(c) {
  const ws = c.workspace_state || '';
  const wa = c.wa_setup_status || c.whatsapp_connected;
  const sub = c.subscription_status || '';

  if (ws === 'demo' && sub !== 'active') return 'START_SETUP';
  if ((ws === 'live_test' || ws === 'activation_pending') && !wa) return 'WAIT_FOR_NUMBER';
  if (ws === 'active' && sub === 'active') return 'NONE';
  if (ws === 'active' && !wa) return 'CONNECT_WHATSAPP';
  return 'START_SETUP';
}

function computeReadiness(c) {
  let score = 0;
  if (c.whatsapp_connected || c.whatsapp_active) score += 25;
  if (c.google_connected) score += 25;
  if ((c.active_workflows || 0) > 0) score += 25;
  if (c.whatsapp_connected || c.whatsapp_active) score += 25; // templates proxy
  return score;
}
