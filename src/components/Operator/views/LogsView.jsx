import React, { useState, useEffect } from 'react';
import * as fmApi from '../../../api/client.js';

export default function LogsView() {
  const [logs, setLogs] = useState([]);
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fmApi.getUnifiedLogs?.({ page, limit: 50, source: source || undefined })
      .then(res => { setLogs(res?.entries || []); setTotal(res?.pagination?.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, source]);

  const SOURCES = ['', 'audit', 'webhook', 'provisioning'];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Logs</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {SOURCES.map(s => (
            <button key={s} onClick={() => { setSource(s); setPage(1); }}
              style={{ background: source === s ? '#ff8a2a' : 'var(--bg-card)', color: source === s ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div> : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            {logs.map((l, i) => (
              <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, fontFamily: 'monospace', display: 'flex', gap: 12 }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0, width: 140 }}>{l.created_at ? new Date(l.created_at).toLocaleString('de-DE') : ''}</span>
                <span style={{ color: (typeof l.source === 'string' && l.source === 'webhook') ? '#a78bfa' : (typeof l.source === 'string' && l.source === 'audit') ? '#3b82f6' : '#eab308', fontWeight: 600, width: 80, flexShrink: 0 }}>{typeof l.source === 'string' ? l.source : '—'}</span>
                <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {typeof l.action === 'string' ? l.action : typeof l.type === 'string' ? l.type : ''} {typeof l.org_name === 'string' ? `[${l.org_name}]` : ''} {l.details && typeof l.details === 'object' ? JSON.stringify(l.details).slice(0, 120) : typeof l.details === 'string' ? l.details.slice(0, 120) : ''}
                </span>
              </div>
            ))}
            {logs.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No logs found</div>}
          </div>
          {total > 50 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: 12, borderTop: '1px solid var(--border)' }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: page > 1 ? 'pointer' : 'default', opacity: page > 1 ? 1 : 0.4 }}>Prev</button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>Page {page} / {Math.ceil(total / 50)}</span>
              <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)} style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: page * 50 < total ? 'pointer' : 'default', opacity: page * 50 < total ? 1 : 0.4 }}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
