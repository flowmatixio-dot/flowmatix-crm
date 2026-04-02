import React, { useState, useEffect, useCallback } from 'react';
import { safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

const SOURCES = [
  { key: '', label: 'All' },
  { key: 'audit', label: 'Audit' },
  { key: 'webhook', label: 'Webhook' },
  { key: 'provisioning', label: 'Provisioning' },
];

const SOURCE_COLORS = {
  audit: '#5ee0ff',
  webhook: '#c4a6ff',
  provisioning: '#ffcf40',
  system: '#22c55e',
  error: '#ef4444',
};

export default function LogsView() {
  const [logs, setLogs] = useState([]);
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fmApi.getUnifiedLogs({ page, limit: 50, source: source || undefined })
      .then(res => {
        setLogs(Array.isArray(res?.entries) ? res.entries : []);
        setTotal(res?.pagination?.total || 0);
        setLoading(false);
      })
      .catch(() => { setLogs([]); setLoading(false); });
  }, [page, source]);

  useEffect(() => { load(); }, [load]);

  // Client-side search filter
  const filtered = search
    ? logs.filter(l => {
        const q = search.toLowerCase();
        const ev = (l.event_type || l.action || l.type || '').toLowerCase();
        const actor = (l.actor || '').toLowerCase();
        const det = (l.details_text || '').toLowerCase();
        return ev.includes(q) || actor.includes(q) || det.includes(q);
      })
    : logs;

  const totalPages = Math.ceil(total / 50) || 1;

  const handleExport = () => {
    const data = JSON.stringify(filtered, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operator-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSourceColor = (src) => {
    if (typeof src !== 'string') return '#8899b0';
    return SOURCE_COLORS[src.toLowerCase()] || '#8899b0';
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Logs</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {SOURCES.map(s => (
            <button key={s.key} onClick={() => { setSource(s.key); setPage(1); }}
              style={{ background: source === s.key ? 'var(--brand)' : 'var(--bg-card)', color: source === s.key ? '#fff' : 'var(--text-secondary)', border: source === s.key ? 'none' : '1px solid var(--border-subtle)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {s.label}
            </button>
          ))}
          <button onClick={handleExport} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 14px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            Export JSON
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter logs..."
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '9px 16px', color: 'var(--text-primary)', fontSize: 13, width: 320, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            {filtered.map((l, i) => {
              const isExpanded = expandedRow === i;
              const srcStr = typeof l.source === 'string' ? l.source : '---';
              const action = typeof l.event_type === 'string' ? l.event_type : typeof l.action === 'string' ? l.action : typeof l.type === 'string' ? l.type : '';
              const actor = typeof l.actor === 'string' ? l.actor : '';
              const resType = typeof l.resource_type === 'string' ? l.resource_type : '';
              const hasDetails = l.details_text && typeof l.details_text === 'string' && l.details_text.length > 1;
              const detailStr = l.details_text || '';

              return (
                <div key={i}>
                  <div
                    onClick={() => hasDetails ? setExpandedRow(isExpanded ? null : i) : null}
                    style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, fontFamily: 'monospace', display: 'flex', gap: 12, cursor: hasDetails ? 'pointer' : 'default', transition: 'background 0.15s' }}
                    onMouseEnter={e => { if (hasDetails) e.currentTarget.style.background = 'var(--bg-card)'; }}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0, width: 140 }}>
                      {l.created_at ? new Date(l.created_at).toLocaleString('de-DE') : ''}
                    </span>
                    <span style={{ color: getSourceColor(srcStr), fontWeight: 600, width: 90, flexShrink: 0 }}>
                      {srcStr}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {action}{resType ? ` → ${resType}` : ''}{actor ? ` by ${actor}` : ''} {!isExpanded && detailStr ? detailStr.slice(0, 100) : ''}
                    </span>
                    {hasDetails && (
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: 10 }}>{isExpanded ? 'collapse' : 'expand'}</span>
                    )}
                  </div>
                  {isExpanded && detailStr && (
                    <div style={{ padding: '8px 16px 12px 242px', background: 'var(--bg-section)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <pre style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 300, overflow: 'auto' }}>
                        {detailStr}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                {search ? 'No logs match your filter' : 'No logs found'}
              </div>
            )}
          </div>

          {/* Pagination */}
          {total > 50 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 12, borderTop: '1px solid var(--border-default)' }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                style={pageBtn(page > 1)}>Prev</button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                style={pageBtn(page < totalPages)}>Next</button>
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
        {filtered.length} entries shown{search ? ' (filtered)' : ''} / {total} total
      </div>
    </div>
  );
}

function pageBtn(enabled) {
  return { background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: enabled ? 'pointer' : 'default', opacity: enabled ? 1 : 0.4, fontFamily: 'inherit', transition: 'all 0.15s' };
}
