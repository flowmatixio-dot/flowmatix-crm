import React, { useMemo } from 'react';
import StatCard from '../shared/StatCard.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { safeNum, safeStr } from '../shared/safe.js';

const PIPELINE_COLS = [
  { id: 'new', label: 'New', color: '#3b82f6', filter: c => c.workspace_state === 'demo' && c.subscription_status !== 'active' && !['FIX_ERROR', 'VERIFY_OTP'].includes(c.required_action) },
  { id: 'setup', label: 'Setup Pending', color: '#a78bfa', filter: c => ['WAIT_FOR_NUMBER', 'CONNECT_WHATSAPP', 'START_SETUP'].includes(c.required_action) },
  { id: 'fix', label: 'Fix Integrations', color: '#f97316', filter: c => c.required_action === 'FIX_ERROR' || c.required_action === 'VERIFY_OTP' },
  { id: 'ready', label: 'Ready', color: '#eab308', filter: c => c.workspace_state === 'activation_pending' || (c.workspace_state === 'live_test' && safeNum(c.readiness_score) >= 75 && c.required_action === 'NONE') },
  { id: 'converted', label: 'Converted', color: '#10b981', filter: c => c.workspace_state === 'active' && c.subscription_status === 'active' },
  { id: 'expired', label: 'Expired', color: '#6b7280', filter: c => c.workspace_state === 'trial_expired' || c.subscription_status === 'canceled' },
];

export default function TrialsView({ actions }) {
  const { clinics = [], totalMrr = 0 } = actions || {};

  const columns = useMemo(() => {
    const assigned = new Set();
    return PIPELINE_COLS.map(col => {
      const items = clinics.filter(c => {
        if (assigned.has(c.id)) return false;
        if (col.filter(c)) { assigned.add(c.id); return true; }
        return false;
      });
      return { ...col, items };
    });
  }, [clinics]);

  const activeTrials = clinics.filter(c => c.subscription_status === 'trialing' || (c.workspace_state !== 'active' && c.workspace_state !== 'trial_expired'));
  const critical = clinics.filter(c => {
    if (!c.trial_end) return false;
    const hoursLeft = (new Date(c.trial_end) - Date.now()) / 3600000;
    return hoursLeft > 0 && hoursLeft < 48;
  });
  const converted = columns.find(c => c.id === 'converted')?.items || [];
  const expired = columns.find(c => c.id === 'expired')?.items || [];
  const pipelineMrr = converted.reduce((s, c) => s + safeNum(c.mrr), 0);

  const fmt = n => `EUR ${n.toLocaleString('de-DE')}`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Trial Pipeline</h1>
        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Live</span>
      </div>

      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Active Trials" value={activeTrials.length} color="blue" />
        <StatCard label="Critical (<48h)" value={critical.length} color={critical.length > 0 ? 'red' : 'green'} />
        <StatCard label="Converted" value={converted.length} color="green" />
        <StatCard label="Expired" value={expired.length} color="gray" />
        <StatCard label="Pipeline MRR" value={fmt(pipelineMrr)} color="green" />
      </div>

      {/* Pipeline Board */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${PIPELINE_COLS.length}, 1fr)`, gap: 12, minHeight: 300 }}>
        {columns.map(col => (
          <div key={col.id} style={{ background: 'var(--bg-card)', borderRadius: 10, borderTop: `3px solid ${col.color}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: col.color }}>{col.label}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{col.items.length}</span>
            </div>
            {col.items.map(c => {
              const rs = safeNum(c.readiness_score);
              const daysLeft = c.trial_end ? Math.max(0, Math.ceil((new Date(c.trial_end) - Date.now()) / 86400000)) : null;
              const isCritical = daysLeft !== null && daysLeft < 2;
              return (
                <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px', borderLeft: isCritical ? '3px solid #ef4444' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{safeStr(c.name)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{safeStr(c.plan_name, 'No plan')}</div>
                  {c.required_action && c.required_action !== 'NONE' && (
                    <div style={{ marginBottom: 4 }}>
                      <StatusBadge status={safeStr(c.required_action)} />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: isCritical ? '#ef4444' : 'var(--text-muted)', fontWeight: isCritical ? 700 : 400 }}>
                      {daysLeft !== null ? `${daysLeft}d left` : '---'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: rs === 100 ? '#10b981' : '#eab308' }}>
                      {rs}%
                    </span>
                  </div>
                </div>
              );
            })}
            {col.items.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Empty</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
