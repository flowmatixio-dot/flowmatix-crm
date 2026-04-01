import React, { useState, useEffect } from 'react';
import DataTable from '../shared/DataTable.jsx';
import PriorityDot from '../shared/PriorityDot.jsx';
import * as fmApi from '../../../api/client.js';

const SEVERITY_MAP = { critical: 'critical', warning: 'high', info: 'medium' };

export default function IncidentsView() {
  const [incidents, setIncidents] = useState([]);
  const [tab, setTab] = useState('open');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const fn = tab === 'open' ? fmApi.getLiveIncidents : fmApi.getIncidentHistory;
    fn?.().then(res => { setIncidents(res?.incidents || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [tab]);

  const resolve = async (id) => {
    try { await fmApi.resolveIncidentV2?.(id); load(); } catch {}
  };

  const columns = [
    { key: 'severity', label: '', width: 30, render: v => <PriorityDot priority={SEVERITY_MAP[v] || 'medium'} /> },
    { key: 'title', label: 'Incident', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 700 }}>{v}</div>
        {row.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{row.description}</div>}
      </div>
    )},
    { key: 'severity', label: 'Severity', render: v => (
      <span style={{ fontSize: 11, fontWeight: 700, color: v === 'critical' ? '#ef4444' : v === 'warning' ? '#f97316' : '#3b82f6', textTransform: 'uppercase' }}>{v}</span>
    )},
    { key: 'created_at', label: 'When', render: v => v ? new Date(v).toLocaleString('de-DE') : '—' },
    ...(tab === 'open' ? [{ key: 'id', label: '', sortable: false, render: (v) => (
      <button onClick={() => resolve(v)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Resolve</button>
    )}] : [{ key: 'resolved_at', label: 'Resolved', render: v => v ? new Date(v).toLocaleString('de-DE') : '—' }]),
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Incidents</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['open', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? '#ff8a2a' : 'var(--bg-card)', color: tab === t ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div> : (
        <DataTable columns={columns} data={incidents} emptyText={tab === 'open' ? 'No active incidents' : 'No incident history'} />
      )}
    </div>
  );
}
