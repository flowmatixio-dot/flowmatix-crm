import { useState, useEffect, useRef, useCallback } from 'react';
import * as fmApi from '../../../api/client.js';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.flowmatix.io';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    const token = fmApi.getAccessToken();
    if (!token) return;

    // SSE with auth via query param (EventSource doesn't support headers)
    const url = `${API_URL}/api/v1/ops/operator-events/stream?token=${encodeURIComponent(token)}`;

    // Fallback: poll instead of SSE if EventSource fails
    let pollInterval;
    const startPolling = () => {
      const poll = async () => {
        try {
          const res = await fmApi.apiFetch('/api/v1/ops/operator-events');
          if (res?.events) setEvents(res.events);
          setConnected(true);
        } catch { setConnected(false); }
      };
      poll();
      pollInterval = setInterval(poll, 10000);
    };

    // Try SSE first, fall back to polling
    try {
      const es = new EventSource(url);
      esRef.current = es;
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'init') setEvents(data.events || []);
          else if (data.type === 'new') setEvents(prev => [...data.events, ...prev]);
        } catch {}
      };
      es.onopen = () => setConnected(true);
      es.onerror = () => {
        es.close();
        esRef.current = null;
        setConnected(false);
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      if (esRef.current) esRef.current.close();
      if (pollInterval) clearInterval(pollInterval);
    };
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
