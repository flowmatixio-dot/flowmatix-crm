import React, { useState, useMemo } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';
import ClinicDetailView from './ClinicDetailView.jsx';

// Priority order for sorting — problems first
const ACTION_PRIORITY = {
  FIX_ERROR: 0, VERIFY_OTP: 1, CONNECT_WHATSAPP: 2, START_SETUP: 3,
  WAIT_FOR_NUMBER: 4, ACTIVATE: 5, NONE: 6,
};

// Smart CTA per action
const SMART_CTA = {
  TRIAL: { label: 'Trial', color: '#ffcf40' },
  WA_PENDING: { label: 'WA Pending', color: '#ff8c2a' },
  FIX_ERROR: { label: 'Fix Error', color: '#ef4444' },
  VERIFY_OTP: { label: 'Verify OTP', color: '#ff8c2a' },
  CONNECT_WHATSAPP: { label: 'Connect WhatsApp', color: '#ffcf40' },
  START_SETUP: { label: 'Continue Setup', color: '#5ee0ff' },
  WAIT_FOR_NUMBER: { label: 'Waiting...', color: '#8899b0' },
  ACTIVATE: { label: 'Activate', color: '#22c55e' },
  NONE: { label: 'Open CRM', color: '#c4a6ff' },
};

// Row accent color by priority
const ROW_ACCENT = {
  FIX_ERROR: 'rgba(239,68,68,0.08)', VERIFY_OTP: 'rgba(249,115,22,0.06)',
  CONNECT_WHATSAPP: 'rgba(234,179,8,0.04)', START_SETUP: 'rgba(59,130,246,0.04)',
};

export default function ClinicsView({ actions, selectedClinic, onSelectClinic, navigateTo }) {
  const { clinics = [], loading, reload } = actions || {};
  const [actionLoading, setActionLoading] = useState(null);
  const [showBrokenOnly, setShowBrokenOnly] = useState(false);
  const [healthTooltip, setHealthTooltip] = useState(null);

  const brokenCount = clinics.filter(c => c.required_action && c.required_action !== 'NONE').length;

  // Priority-sorted clinics
  const sorted = useMemo(() => {
    const list = showBrokenOnly ? clinics.filter(c => c.required_action && c.required_action !== 'NONE') : clinics;
    return [...list].sort((a, b) => (ACTION_PRIORITY[a.required_action] ?? 6) - (ACTION_PRIORITY[b.required_action] ?? 6));
  }, [clinics, showBrokenOnly]);

  const handleAction = async (e, orgId, action) => {
    e.stopPropagation();
    setActionLoading(`${orgId}-${action}`);
    try {
      if (action === 'impersonate') {
        const reason = prompt('Impersonation reason (min 5 chars):');
        if (reason && reason.length >= 5) {
          const res = await fmApi.impersonateClinic(orgId, reason);
          const token = res?.impersonation?.accessToken || res?.token;
          if (token) window.open(`https://crm.flowmatix.io#impersonate=${encodeURIComponent(token)}`, '_blank');
        }
      } else if (action === 'wa-start') await fmApi.waStart(orgId);
      else if (action === 'wa-retry') await fmApi.waRetry(orgId);
      else if (action === 'wa-force') await fmApi.waForceConnect(orgId);
      reload?.();
    } catch {} finally { setActionLoading(null); }
  };

  if (selectedClinic) {
    return <ClinicDetailView clinic={selectedClinic} onClose={() => onSelectClinic?.(null)} onRefresh={reload} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Clinics</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sorted.length} clinics</span>
          {brokenCount > 0 && (
            <button onClick={() => setShowBrokenOnly(!showBrokenOnly)}
              style={{ background: showBrokenOnly ? '#ef444420' : 'var(--bg-card)', border: `1px solid ${showBrokenOnly ? '#ef444440' : 'var(--border-default)'}`, borderRadius: 8, padding: '6px 14px', color: showBrokenOnly ? '#ef4444' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {showBrokenOnly ? 'Show All' : `Issues (${brokenCount})`}
            </button>
          )}
          <button onClick={reload} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 16px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading clinics...</div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-subtle)' }}>No clinics found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 1fr 1fr 1.2fr', gap: 12, padding: '8px 16px' }}>
            {['Clinic', 'Plan', 'Status', 'WhatsApp', 'Health', 'Patients', 'Action'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {sorted.map(c => {
            const action = c.required_action || 'NONE';
            const cta = SMART_CTA[action] || SMART_CTA.NONE;
            const accent = ROW_ACCENT[action] || 'transparent';
            const health = safeNum(c.readiness_score);
            const patients = safeNum(c.patient_count);
            const waOk = c.whatsapp_connected === true;
            const isCritical = action === 'FIX_ERROR';

            return (
              <div key={c.id} onClick={() => onSelectClinic?.(c)}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 1fr 1fr 1.2fr', gap: 12, padding: '14px 16px', background: accent, borderRadius: 10, cursor: 'pointer', transition: 'all 0.12s', border: isCritical ? '1px solid rgba(239,68,68,0.15)' : '1px solid transparent' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = accent; e.currentTarget.style.transform = ''; }}>

                {/* Clinic */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{safeStr(c.name)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{safeStr(c.email)}</div>
                </div>

                {/* Plan */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{safeStr(c.plan_name, '—')}</span>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <StatusBadge status={action} />
                </div>

                {/* WhatsApp */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: waOk ? 'var(--success)' : 'var(--error)' }}>
                    {waOk ? '● Connected' : '● Not connected'}
                  </span>
                </div>

                {/* Health */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}
                  onMouseEnter={() => setHealthTooltip(c.id)} onMouseLeave={() => setHealthTooltip(null)}>
                  <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--progress-track)' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${health}%`, background: health > 80 ? 'var(--success)' : health >= 50 ? 'var(--warning)' : 'var(--error)' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: health > 80 ? 'var(--success)' : health >= 50 ? 'var(--warning)' : 'var(--error)' }}>{health}%</span>
                  {healthTooltip === c.id && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, padding: '10px 14px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-strong)', borderRadius: 8, zIndex: 50, fontSize: 11, lineHeight: 1.8, whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                      <div style={{ color: waOk ? 'var(--success)' : 'var(--error)' }}>WhatsApp: {waOk ? 'Connected' : 'Missing (-40)'}</div>
                      <div style={{ color: c.google_connected ? '#10b981' : '#6b7280' }}>Google Cal: {c.google_connected ? 'Connected' : 'Missing (-10)'}</div>
                      <div style={{ color: safeNum(c.active_workflows) > 0 ? '#10b981' : '#6b7280' }}>Automations: {safeNum(c.active_workflows) > 0 ? 'Active' : 'None (-10)'}</div>
                      <div style={{ color: c.has_recent_error ? '#ef4444' : '#10b981' }}>Errors: {c.has_recent_error ? 'Yes (-20)' : 'None'}</div>
                    </div>
                  )}
                </div>

                {/* Patients */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {patients} {patients === 1 ? 'patient' : 'patients'}
                  </span>
                </div>

                {/* Smart Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={e => {
                    e.stopPropagation();
                    if (action === 'NONE') handleAction(e, c.id, 'impersonate');
                    else onSelectClinic?.(c);
                  }}
                    style={{ background: `${cta.color}18`, color: cta.color, border: `1px solid ${cta.color}30`, borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.background = `${cta.color}30`}
                    onMouseLeave={e => e.currentTarget.style.background = `${cta.color}18`}>
                    {cta.label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
