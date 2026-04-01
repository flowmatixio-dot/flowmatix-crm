import { useState, useEffect, useCallback, useRef } from 'react';
import * as fmApi from '../../../api/client.js';

export function useOperatorData(fetchFn, { autoRefresh = 0, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchFn();
      setData(res);
    } catch (err) {
      setError(err?.message || 'Failed to load');
    } finally { setLoading(false); }
  }, [fetchFn, ...deps]);

  useEffect(() => {
    load();
    if (autoRefresh > 0) {
      intervalRef.current = setInterval(load, autoRefresh);
      return () => clearInterval(intervalRef.current);
    }
  }, [load, autoRefresh]);

  return { data, loading, error, reload: load };
}
