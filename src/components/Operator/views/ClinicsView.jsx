import React, { useState } from 'react';
import DataTable from '../shared/DataTable.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';
import ClinicDetailView from './ClinicDetailView.jsx';

const READINESS_BAR = (score) => {
  const s = safeNum(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${s}%`, height: '100%', borderRadius: 3, background: s === 100 ? '#10b981' : s >= 50 ? '#eab308' : '#ef4444', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: s === 100 ? '#10b981' : 'var(--text-muted)' }}>{s}%</span>
    </div>
  );
};

export default function ClinicsView({ actions, selectedClinic, onSelectClinic }) {
  const { clinics = [], loading, reload } = actions || {};
  const [hoveredRow, setHoveredRow] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const handleAction = async (orgId, action) => {
    setActionLoading(`${orgId}-${action}`);
    try {
      if (action === 'wa-start') await fmApi.waStart(orgId);
      else if (action === 'wa-retry') await fmApi.waRetry(orgId);
      else if (action === 'wa-force') await fmApi.waForceConnect(orgId);
      else if (action === 'wa-reset') await fmApi.waReset(orgId);
      else if (action === 'suspend') {
        const reason = prompt('Suspend reason:');
        if (reason) await fmApi.suspendClinic(orgId, reason);
      }
      else if (action === 'resume') await fmApi.resumeClinic(orgId);
      else if (action === 'impersonate') {
        const reason = prompt('Impersonation reason:');
        if (reason) {
          const res = await fmApi.impersonateClinic(orgId, reason);
          if (res?.token) {
            const url = `https://crm.flowmatix.io?impersonate=${res.token}`;
            window.open(url, '_blank');
          }
        }
      }
      reload?.();
    } catch {} finally { setActionLoading(null); }
  };

  const columns = [
    { key: 'name', label: 'Clinic', width: '18%', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{safeStr(v)}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{safeStr(row.email)}</div>
      </div>
    )},
    { key: 'plan_name', label: 'Plan', render: v => <span style={{ fontSize: 12, fontWeight: 600 }}>{safeStr(v, '---')}</span> },
    { key: 'required_action', label: 'Status', render: v => <StatusBadge status={safeStr(v, 'NONE')} /> },
    { key: 'whatsapp_connected', label: 'WhatsApp', render: (v, row) => (
      <span style={{ fontSize: 12, color: v ? '#10b981' : '#ef4444', fontWeight: 600 }}>{v ? 'Connected' : 'Missing'}</span>
    )},
    { key: 'google_connected', label: 'Google Cal', render: v => (
      <span style={{ fontSize: 12, color: v ? '#10b981' : '#6b7280', fontWeight: 600 }}>{v ? 'Connected' : '---'}</span>
    )},
    { key: 'readiness_score', label: 'Readiness', render: v => READINESS_BAR(v || 0) },
    { key: 'patient_count', label: 'Patients', render: (v, row) => (
      <span style={{ fontSize: 12 }}>{safeNum(v)} <span style={{ color: 'var(--text-muted)' }}>/ {safeNum(row.patient_limit) || 'inf'}</span></span>
    )},
    { key: 'mrr', label: 'MRR', render: v => {
      const n = safeNum(v);
      return <span style={{ fontSize: 12, fontWeight: 700, color: n > 0 ? '#10b981' : 'var(--text-muted)' }}>
        {n > 0 ? `EUR ${n.toLocaleString('de-DE')}` : '---'}
      </span>;
    }},
    { key: 'id', label: 'Actions', sortable: false, width: '12%', render: (v, row) => (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {!row.whatsapp_connected && (
          <button onClick={(e) => { e.stopPropagation(); handleAction(v, 'wa-start'); }} disabled={actionLoading === `${v}-wa-start`}
            style={actionBtn('#3b82f6')}>WA Start</button>
        )}
        {row.required_action === 'FIX_ERROR' && (
          <button onClick={(e) => { e.stopPropagation(); handleAction(v, 'wa-retry'); }} disabled={actionLoading === `${v}-wa-retry`}
            style={actionBtn('#f97316')}>Retry</button>
        )}
        <button onClick={(e) => { e.stopPropagation(); handleAction(v, 'impersonate'); }}
          style={actionBtn('#a78bfa')}>Login</button>
      </div>
    )},
  ];

  if (selectedClinic) {
    return (
      <ClinicDetailView
        clinic={selectedClinic}
        onClose={() => onSelectClinic?.(null)}
        onRefresh={() => { reload?.(); }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Clinics</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{clinics.length} clinics</span>
          <button onClick={reload} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 16px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Refresh
          </button>
        </div>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading clinics...</div>
      ) : (
        <DataTable
          columns={columns}
          data={clinics}
          searchable
          searchKeys={['name', 'email', 'plan_name']}
          emptyText="No clinics found"
          onRowClick={(row) => onSelectClinic?.(row)}
        />
      )}
    </div>
  );
}

function actionBtn(bg) {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
}
