import React, { useMemo } from 'react';
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

const ACTION_CTA = {
  START_SETUP: 'Start Setup',
  WAIT_FOR_NUMBER: 'Waiting...',
  CONNECT_WHATSAPP: 'Connect WA',
  VERIFY_OTP: 'Verify OTP',
  FIX_ERROR: 'Fix Error',
  ACTIVATE: 'Activate',
  NONE: null,
};

export default function TrialsView({ actions, navigateTo }) {
  const { clinics = [] } = actions || {};

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
    return (new Date(c.trial_end) - Date.now()) / 3600000 < 48 && (new Date(c.trial_end) - Date.now()) > 0;
  });
  const converted = columns.find(c => c.id === 'converted')?.items || [];
  const pipelineMrr = converted.reduce((s, c) => s + safeNum(c.mrr), 0);

  return (
    <div>
      {/* Header + Compact Summary Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Pipeline</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {[
            { label: 'Trials', value: activeTrials.length, color: '#3b82f6' },
            { label: 'Critical', value: critical.length, color: critical.length > 0 ? '#ef4444' : '#6b7280' },
            { label: 'Converted', value: converted.length, color: '#10b981' },
            { label: 'MRR', value: `€${pipelineMrr.toLocaleString('de-DE')}`, color: '#10b981' },
          ].map((s, i) => (
            <span key={i} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {s.label}: <strong style={{ color: s.color, fontWeight: 800 }}>{s.value}</strong>
            </span>
          ))}
          <span style={{ width: 6, height: 6, borderRadius: 99, background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
        </div>
      </div>

      {/* Pipeline Board */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${PIPELINE_COLS.length}, 1fr)`, gap: 10, minHeight: 'calc(100vh - 200px)' }}>
        {columns.map(col => (
          <div key={col.id} style={{ background: 'rgba(255,255,255,0.015)', borderRadius: 12, borderTop: `2px solid ${col.color}`, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Column Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: col.color }}>{col.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: col.items.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{col.items.length}</span>
            </div>

            {/* Cards */}
            {col.items.map(c => {
              const rs = safeNum(c.readiness_score);
              const daysLeft = c.trial_end ? Math.max(0, Math.ceil((new Date(c.trial_end) - Date.now()) / 86400000)) : null;
              const isCritical = daysLeft !== null && daysLeft < 2;
              const cta = ACTION_CTA[c.required_action] || null;

              return (
                <div key={c.id}
                  onClick={() => navigateTo?.('clinics', c)}
                  style={{
                    background: 'var(--bg-card)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s',
                    border: isCritical ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.04)',
                    boxShadow: isCritical ? '0 0 12px rgba(239,68,68,0.08)' : 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 16px ${isCritical ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.2)'}` ; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isCritical ? '0 0 12px rgba(239,68,68,0.08)' : 'none'; }}>

                  {/* Name + Plan */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, lineHeight: 1.3 }}>{safeStr(c.name)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{safeStr(c.plan_name, 'No plan')}</div>

                  {/* Status + Time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <StatusBadge status={safeStr(c.required_action || c.workspace_state, 'NONE')} />
                    {daysLeft !== null && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: isCritical ? '#ef4444' : daysLeft < 5 ? '#f97316' : 'var(--text-muted)' }}>
                        {daysLeft}d left
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginBottom: cta ? 10 : 0 }}>
                    <div style={{ height: '100%', borderRadius: 2, background: rs === 100 ? '#10b981' : rs >= 50 ? '#eab308' : '#ef4444', width: `${rs}%`, transition: 'width 0.3s' }} />
                  </div>

                  {/* CTA */}
                  {cta && (
                    <button
                      onClick={e => { e.stopPropagation(); navigateTo?.('clinics', c); }}
                      style={{ width: '100%', padding: '7px 0', borderRadius: 6, border: 'none', background: isCritical ? '#ef4444' : `${col.color}20`, color: isCritical ? '#fff' : col.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = isCritical ? '#dc2626' : `${col.color}35`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isCritical ? '#ef4444' : `${col.color}20`; }}>
                      {cta}
                    </button>
                  )}
                </div>
              );
            })}

            {/* Empty State */}
            {col.items.length === 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.12)' }}>No clinics in this stage</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
