import { useState, useEffect, useCallback } from 'react';
import * as fmApi from '../../../api/client.js';

export function useActions() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fmApi.apiFetch('/api/v1/ops/clinic-actions');
      if (res?.clinics) setClinics(res.clinics);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const actionRequired = clinics.filter(c => c.required_action !== 'NONE');
  const totalMrr = clinics.reduce((sum, c) => sum + (c.mrr || 0), 0);
  const liveCount = clinics.filter(c => c.required_action === 'NONE').length;

  return { clinics, loading, reload: load, actionRequired, totalMrr, liveCount };
}
