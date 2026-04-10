import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../shared/DataTable.jsx';
import PriorityDot from '../shared/PriorityDot.jsx';
import { safeStr, safeNum } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

const SEVERITY_MAP = { critical: 'critical', warning: 'high', info: 'medium' };
const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

export default function IncidentsView() {
  const [incidents, setIncidents] = useState([]);
  const [tab, setTab] = useState('open');
  const [loading, setLoading] = useState(true);
  const [sortBySeverity, setSortBySeverity] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    // Fetch from both incident sources (incidents-v2 + incidents table)
    const p1 = (tab === 'open' ? fmApi.getLiveIncidents() : fmApi.getIncidentHistory()).catch(() => null);
    const p2 = fmApi.apiFetch(`/api/v1/ops/incidents?status=${tab === 'open' ? 'open' : 'resolved'}&limit=50`).catch(() => null);
    Promise.all([p1, p2]).then(([r1, r2]) => {
      const list1 = Array.isArray(r1?.incidents) ? r1.incidents : [];
      const list2 = Array.isArray(r2?.incidents) ? r2.incidents : [];
      let items = [...list1, ...list2];
      if (sortBySeverity) {
        items = [...items].sort((a, b) => {
          const sa = SEVERITY_ORDER[a.severity] ?? 99;
          const sb = SEVERITY_ORDER[b.severity] ?? 99;
          return sa - sb;
        });
      }
      setIncidents(items);
      setLoading(false);
    }).catch(() => { setIncidents([]); setLoading(false); });
  }, [tab, sortBySeverity]);

  useEffect(() => {
    load();
    if (tab === 'open') {
      const iv = setInterval(load, 30000);
      return () => clearInterval(iv);
    }
  }, [load, tab]);

  const resolve = async (id) => {
    try {
      // Try both endpoints (incidents-v2 for operator_incidents, incidents for regular)
      await Promise.any([
        fmApi.resolveIncidentV2(id),
        fmApi.resolveIncident(id),
      ]);
      load();
    } catch { load(); }
  };

  const acknowledge = async (id) => {
    try {
      await Promise.any([
        fmApi.acknowledgeIncidentV2(id),
        fmApi.acknowledgeIncident(id),
      ]);
      load();
    } catch { load(); }
  };

  const formatDuration = (createdAt, resolvedAt) => {
    if (!createdAt || !resolvedAt) return '---';
    const ms = new Date(resolvedAt) - new Date(createdAt);
    if (isNaN(ms) || ms < 0) return '---';
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
    return `${Math.round(ms / 86400000)}d`;
  };

  const openColumns = [
    { key: 'severity', label: '', width: 30, sortable: false, render: v => <PriorityDot priority={SEVERITY_MAP[v] || 'medium'} /> },
    { key: 'title', label: 'Incident', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{safeStr(v)}</div>
        {row.description && typeof row.description === 'string' && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.description}
          </div>
        )}
      </div>
    )},
    { key: 'severity', label: 'Severity', render: v => {
      const s = safeStr(v, 'info');
      const colors = { critical: '#ef4444', warning: '#ff8c2a', info: '#5ee0ff' };
      return <span style={{ fontSize: 11, fontWeight: 700, color: colors[s] || '#5ee0ff', textTransform: 'uppercase' }}>{s}</span>;
    }},
    { key: 'created_at', label: 'When', render: v => v ? new Date(v).toLocaleString('de-DE') : '---' },
    { key: 'acknowledged', label: 'Ack', width: 50, render: (v) => (
      <span style={{ fontSize: 11, fontWeight: 600, color: v ? '#22c55e' : '#8899b0' }}>{v ? 'Yes' : 'No'}</span>
    )},
    { key: 'id', label: '', sortable: false, width: 180, render: (v, row) => (
      <div style={{ display: 'flex', gap: 6 }}>
        {!row.acknowledged && (
          <button onClick={() => acknowledge(v)} style={{ background: '#ffcf40', color: '#000', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' }}>
            Acknowledge
          </button>
        )}
        <button onClick={() => resolve(v)} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' }}>
          Resolve
        </button>
      </div>
    )},
  ];

  const historyColumns = [
    { key: 'severity', label: '', width: 30, sortable: false, render: v => <PriorityDot priority={SEVERITY_MAP[v] || 'medium'} /> },
    { key: 'title', label: 'Incident', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{safeStr(v)}</div>
        {row.description && typeof row.description === 'string' && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{row.description}</div>
        )}
      </div>
    )},
    { key: 'severity', label: 'Severity', render: v => {
      const s = safeStr(v, 'info');
      const colors = { critical: '#ef4444', warning: '#ff8c2a', info: '#5ee0ff' };
      return <span style={{ fontSize: 11, fontWeight: 700, color: colors[s] || '#5ee0ff', textTransform: 'uppercase' }}>{s}</span>;
    }},
    { key: 'created_at', label: 'Created', render: v => v ? new Date(v).toLocaleString('de-DE') : '---' },
    { key: 'resolved_at', label: 'Resolved', render: v => v ? new Date(v).toLocaleString('de-DE') : '---' },
    { key: 'created_at', label: 'Duration', render: (v, row) => (
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDuration(v, row.resolved_at)}</span>
    )},
  ];

  const openCount = tab === 'open' ? incidents.length : 0;
  const criticalCount = tab === 'open' ? incidents.filter(i => i.severity === 'critical').length : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Incidents</h1>
          {tab === 'open' && incidents.length > 0 && (
            <span style={{ background: criticalCount > 0 ? '#ef444420' : '#ffcf4020', color: criticalCount > 0 ? '#ef4444' : '#ffcf40', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6 }}>
              {incidents.length} open{criticalCount > 0 ? ` (${criticalCount} critical)` : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['open', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ background: tab === t ? 'var(--brand)' : 'var(--bg-card)', color: tab === t ? '#fff' : 'var(--text-secondary)', border: tab === t ? 'none' : '1px solid var(--border-subtle)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {t === 'open' ? 'Open' : 'History'}
            </button>
          ))}
          <button onClick={async () => {
            try { await fmApi.apiFetch('/api/v1/ops/incident-detector/run', { method: 'POST' }); load(); } catch {}
          }} style={{ background: 'var(--warning-subtle)', border: '1px solid var(--warning-muted)', borderRadius: 8, padding: '6px 14px', color: 'var(--warning)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            Detect Issues
          </button>
          <button onClick={load} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 14px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <DataTable
          columns={tab === 'open' ? openColumns : historyColumns}
          data={incidents}
          emptyText={tab === 'open' ? 'No active incidents -- all systems operational' : 'No incident history'}
        />
      )}
    </div>
  );
}
