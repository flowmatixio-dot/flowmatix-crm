import { useState, useEffect, useCallback } from 'react';
import * as fmApi from '../../../api/client.js';

export function useActions() {
  const [clinics, setClinics] = useState([]);
  const [waActivations, setWaActivations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [actionsRes, waRes] = await Promise.all([
        fmApi.apiFetch('/api/v1/ops/clinic-actions').catch(() => null),
        fmApi.apiFetch('/api/v1/ops/clinic/whatsapp-activations').catch(() => null),
      ]);

      const clinicList = Array.isArray(actionsRes?.clinics) ? actionsRes.clinics : [];
      const activations = Array.isArray(waRes?.activations) ? waRes.activations : [];

      // Merge WA activation data into clinic records
      if (activations.length > 0) {
        const activationMap = new Map();
        activations.forEach(a => {
          if (a.org_id) activationMap.set(a.org_id, a);
        });

        clinicList.forEach(c => {
          const activation = activationMap.get(c.id);
          if (activation) {
            c._waActivation = activation;
            // If clinic has no required_action but has a pending WA activation, flag it
            if (c.required_action === 'NONE' && activation.status === 'pending') {
              c.required_action = 'CONNECT_WHATSAPP';
            }
          }
        });
      }

      setClinics(clinicList);
      setWaActivations(activations);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const actionRequired = clinics.filter(c => c.required_action !== 'NONE');
  const totalMrr = clinics.reduce((sum, c) => sum + (c.mrr || 0), 0);
  const liveCount = clinics.filter(c => c.required_action === 'NONE').length;

  return { clinics, waActivations, loading, reload: load, actionRequired, totalMrr, liveCount };
}
