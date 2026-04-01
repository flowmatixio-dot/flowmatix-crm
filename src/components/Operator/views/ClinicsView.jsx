import React from 'react';
import DataTable from '../shared/DataTable.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { safeNum, safeStr } from '../shared/safe.js';

const READINESS_BAR = (score) => { const s = safeNum(score); return (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 60, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
      <div style={{ width: `${s}%`, height: '100%', borderRadius: 3, background: s === 100 ? '#10b981' : s >= 50 ? '#eab308' : '#ef4444', transition: 'width 0.3s' }} />
    </div>
    <span style={{ fontSize: 11, fontWeight: 600, color: s === 100 ? '#10b981' : 'var(--text-muted)' }}>{s}%</span>
  </div>
); };

const columns = [
  { key: 'name', label: 'Clinic', width: '20%', render: (v, row) => (
    <div>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{safeStr(v)}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{safeStr(row.email)}</div>
    </div>
  )},
  { key: 'plan_name', label: 'Plan', render: v => <span style={{ fontSize: 12, fontWeight: 600 }}>{safeStr(v, '—')}</span> },
  { key: 'required_action', label: 'Status', render: v => <StatusBadge status={safeStr(v, 'NONE')} /> },
  { key: 'whatsapp_connected', label: 'WhatsApp', render: v => (
    <span style={{ fontSize: 12, color: v ? '#10b981' : '#ef4444', fontWeight: 600 }}>{v ? '● Connected' : '○ Missing'}</span>
  )},
  { key: 'google_connected', label: 'Google', render: v => (
    <span style={{ fontSize: 12, color: v ? '#10b981' : '#6b7280', fontWeight: 600 }}>{v ? '● Connected' : '○ —'}</span>
  )},
  { key: 'readiness_score', label: 'Readiness', render: v => READINESS_BAR(v || 0) },
  { key: 'patient_count', label: 'Patients', render: (v, row) => (
    <span style={{ fontSize: 12 }}>{safeNum(v)} <span style={{ color: 'var(--text-muted)' }}>/ {safeNum(row.patient_limit) || '∞'}</span></span>
  )},
  { key: 'mrr', label: 'MRR', render: v => {
    const n = safeNum(v);
    return <span style={{ fontSize: 12, fontWeight: 700, color: n > 0 ? '#10b981' : 'var(--text-muted)' }}>
      {n > 0 ? `€${n.toLocaleString('de-DE')}` : '—'}
    </span>;
  }},
];

export default function ClinicsView({ actions }) {
  const { clinics = [], loading, reload } = actions || {};

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Clinics</h1>
        <button onClick={reload} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 16px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Refresh
        </button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading clinics...</div>
      ) : (
        <DataTable columns={columns} data={clinics} searchable searchKeys={['name', 'email', 'plan_name']} emptyText="No clinics found" />
      )}
    </div>
  );
}
