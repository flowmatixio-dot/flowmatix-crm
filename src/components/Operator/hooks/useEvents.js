import { useState, useEffect, useRef, useCallback } from 'react';
import * as fmApi from '../../../api/client.js';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const ivRef = useRef(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fmApi.apiFetch('/api/v1/ops/operator-events');
        if (res?.events) setEvents(res.events);
        setConnected(true);
      } catch { setConnected(false); }
    };
    poll();
    ivRef.current = setInterval(poll, 10000);
    return () => clearInterval(ivRef.current);
  }, []);

  const resolveEvent = useCallback(async (id) => {
    try {
      await fmApi.apiFetch(`/api/v1/ops/operator-events/${id}/resolve`, { method: 'POST' });
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch {}
  }, []);

  const unresolvedCount = events.filter(e => !e.resolved).length;
  const criticalCount = events.filter(e => e.priority === 'critical' && !e.resolved).length;

  return { events, connected, resolveEvent, unresolvedCount, criticalCount };
}
