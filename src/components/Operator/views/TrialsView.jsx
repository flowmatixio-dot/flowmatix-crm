import React, { useMemo } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import { safeNum, safeStr } from '../shared/safe.js';

// Pipeline columns — reordered for conversion priority
const PIPELINE_COLS = [
  { id: 'setup', label: 'Setup Pending', color: '#f97316', priority: true, filter: c => ['WAIT_FOR_NUMBER', 'CONNECT_WHATSAPP', 'START_SETUP', 'ACTIVATE'].includes(c.required_action) },
  { id: 'action', label: 'Action Required', color: '#ef4444', filter: c => c.required_action === 'FIX_ERROR' || c.required_action === 'VERIFY_OTP' },
  { id: 'converted', label: 'Live', color: '#10b981', filter: c => c.workspace_state === 'active' && c.subscription_status === 'active' },
  { id: 'expired', label: 'Expired', color: '#6b7280', filter: c => c.workspace_state === 'trial_expired' || c.subscription_status === 'canceled' },
];

// Setup step checks
function getSetupSteps(c) {
  const wa = c.whatsapp_connected === true;
  const gc = c.google_connected === true;
  const wf = safeNum(c.active_workflows) > 0;
  return [
    { label: 'WhatsApp', done: wa },
    { label: 'Calendar', done: gc },
    { label: 'Automations', done: wf },
  ];
}

function formatTimeLeft(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return null;
  if (daysLeft <= 0) return { text: 'Expires TODAY', color: '#ef4444', urgent: true };
  if (daysLeft === 1) return { text: '1 day left', color: '#ef4444', urgent: true };
  if (daysLeft <= 3) return { text: `${daysLeft} days left`, color: '#f97316', urgent: false };
  return { text: `${daysLeft}d left`, color: 'var(--text-muted)', urgent: false };
}

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
    }).filter(col => col.items.length > 0); // HIDE empty columns
  }, [clinics]);

  const activeTrials = clinics.filter(c => c.subscription_status === 'trialing' || (c.workspace_state !== 'active' && c.workspace_state !== 'trial_expired'));
  const critical = clinics.filter(c => c.trial_end && (new Date(c.trial_end) - Date.now()) / 3600000 < 48 && (new Date(c.trial_end) - Date.now()) > 0);
  const setupPending = columns.find(c => c.id === 'setup')?.items || [];
  const actionRequired = columns.find(c => c.id === 'action')?.items || [];
  const converted = columns.find(c => c.id === 'converted')?.items || [];
  const pipelineMrr = converted.reduce((s, c) => s + safeNum(c.mrr), 0);

  const hasCritical = critical.length > 0 || actionRequired.length > 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Pipeline</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Trials: <strong style={{ color: '#3b82f6' }}>{activeTrials.length}</strong></span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Live: <strong style={{ color: '#10b981' }}>{converted.length}</strong></span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>MRR: <strong style={{ color: '#10b981' }}>€{pipelineMrr.toLocaleString('de-DE')}</strong></span>
        </div>
      </div>

      {/* Urgency Banner */}
      {hasCritical && (
        <div style={{ padding: '10px 18px', borderRadius: 10, marginBottom: 16, background: '#ef444410', border: '1px solid #ef444425', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
            {setupPending.length + actionRequired.length} trial{setupPending.length + actionRequired.length > 1 ? 's' : ''} need{setupPending.length + actionRequired.length === 1 ? 's' : ''} immediate action
          </span>
        </div>
      )}

      {/* Pipeline — only columns with data */}
      {columns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No trials in pipeline</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: columns.map(col => col.priority ? '1.3fr' : '1fr').join(' '), gap: 12, minHeight: 'calc(100vh - 240px)' }}>
          {columns.map(col => (
            <div key={col.id} style={{ background: 'rgba(255,255,255,0.015)', borderRadius: 12, borderTop: `3px solid ${col.color}`, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: col.color }}>{col.label}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{col.items.length}</span>
              </div>

              {/* Cards */}
              {col.items.map(c => {
                const rs = safeNum(c.readiness_score);
                const daysLeft = c.trial_end ? Math.max(0, Math.ceil((new Date(c.trial_end) - Date.now()) / 86400000)) : null;
                const time = formatTimeLeft(daysLeft);
                const steps = getSetupSteps(c);
                const doneCount = steps.filter(s => s.done).length;
                const isSetup = col.id === 'setup' || col.id === 'action';
                const isAction = col.id === 'action';

                // What's missing?
                const missing = steps.filter(s => !s.done).map(s => s.label);

                return (
                  <div key={c.id} onClick={() => navigateTo?.('clinics', c)}
                    style={{
                      background: 'var(--bg-card)', borderRadius: 10, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s',
                      border: isAction ? '1px solid rgba(239,68,68,0.25)' : time?.urgent ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.04)',
                      boxShadow: isAction ? '0 0 14px rgba(239,68,68,0.06)' : 'none',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isAction ? '0 0 14px rgba(239,68,68,0.06)' : 'none'; }}>

                    {/* Name + Plan */}
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{safeStr(c.name)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{safeStr(c.plan_name, 'No plan')}</div>

                    {/* Status + Time */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <StatusBadge status={safeStr(c.required_action || c.workspace_state, 'NONE')} />
                      {time && <span style={{ fontSize: 11, fontWeight: 700, color: time.color }}>{time.urgent ? '❗ ' : ''}{time.text}</span>}
                    </div>

                    {/* Setup Steps (only for setup/action columns) */}
                    {isSetup && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Setup {doneCount}/{steps.length}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {steps.map((s, i) => (
                            <span key={i} style={{ fontSize: 10, color: s.done ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                              {s.done ? '✓' : '✗'} {s.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Required — show what's missing */}
                    {isAction && missing.length > 0 && (
                      <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 10 }}>
                        {missing.map(m => `${m} missing`).join(' · ')}
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginBottom: isSetup ? 10 : 0 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: rs === 100 ? '#10b981' : rs >= 50 ? '#eab308' : '#ef4444', width: `${rs}%`, transition: 'width 0.3s' }} />
                    </div>

                    {/* CTA Button */}
                    {isSetup && (
                      <button onClick={e => { e.stopPropagation(); navigateTo?.('clinics', c); }}
                        style={{
                          width: '100%', padding: '8px 0', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          background: time?.urgent ? '#ef4444' : '#f97316', color: '#fff',
                        }}>
                        🔥 Complete Setup Now
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
