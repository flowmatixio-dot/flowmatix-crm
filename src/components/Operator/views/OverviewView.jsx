import React, { useState, useEffect, useCallback } from 'react';
import StatCard from '../shared/StatCard.jsx';
import ActionCard from '../shared/ActionCard.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import WaOnboardingModal from '../shared/WaOnboardingModal.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

export default function OverviewView({ events, actions, navigateTo }) {
  const [stats, setStats] = useState(null);
  const [waActivations, setWaActivations] = useState([]);
  const [onboardingClinic, setOnboardingClinic] = useState(null);

  const load = useCallback(() => {
    fmApi.getPlatformStats().then(setStats).catch(() => {});
    fmApi.apiFetch('/api/v1/ops/clinic/whatsapp-activations').then(res => {
      setWaActivations(Array.isArray(res?.activations) ? res.activations : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const { actionRequired = [], totalMrr = 0, liveCount = 0, clinics = [] } = actions || {};
  const evts = Array.isArray(events?.events) ? events.events : [];
  const unresolvedEvents = evts.filter(e => !e.resolved);

  const fmt = (n) => typeof n === 'number' ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }) : '---';
  const msgToday = safeNum(stats?.messagesToday);
  const autoRate = safeNum(stats?.automationSuccessRate);

  // Build priority-sorted action feed
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const allActions = [];

  unresolvedEvents.forEach(ev => {
    allActions.push({
      id: `ev-${ev.id}`,
      type: safeStr(ev.type, 'UNKNOWN'),
      priority: safeStr(ev.priority, 'medium'),
      clinicName: safeStr(ev.org_name, 'System'),
      detail: safeStr(ev.payload?.detail || ev.payload?.email || ev.payload?.error || (typeof ev.type === 'string' ? ev.type.replace(/_/g, ' ').toLowerCase() : ''), ''),
      timestamp: ev.created_at,
      cta: ev.payload?.error_type === 'BOT_ERROR' ? 'Impersonate'
        : ev.payload?.error_type === 'BOT_NO_RESPONSE' ? 'Check Bot'
        : ev.payload?.error_type === 'WHATSAPP_SEND_FAILED' ? 'Retry'
        : ev.type === 'NEW_CUSTOMER' ? 'Setup'
        : ev.type === 'OTP_RECEIVED' ? 'Verify'
        : ev.type === 'PAYMENT_FAILED' ? 'View'
        : 'Open',
      onAction: ev.organization_id ? () => navigateTo?.('clinics', { id: ev.organization_id, name: ev.org_name }) : undefined,
      onResolve: () => events?.resolveEvent?.(ev.id),
    });
  });

  actionRequired.forEach(c => {
    allActions.push({
      id: `action-${c.id}`,
      type: safeStr(c.required_action, 'START_SETUP'),
      priority: c.required_action === 'FIX_ERROR' ? 'critical' : c.required_action === 'VERIFY_OTP' ? 'high' : 'medium',
      clinicName: safeStr(c.name),
      detail: `${safeStr(c.plan_name, 'No plan')} - Health: ${safeNum(c.readiness_score)}%`,
      cta: 'Open Clinic',
      onAction: () => navigateTo?.('clinics', c),
    });
  });

  waActivations.forEach(wa => {
    allActions.push({
      id: `wa-${wa.org_id || wa.id}`,
      type: 'CONNECT_WHATSAPP',
      priority: 'high',
      clinicName: safeStr(wa.org_name || wa.clinic_name, 'Unknown Clinic'),
      detail: `WA activation request - ${safeStr(wa.status, 'pending')}`,
      cta: 'Setup WA',
      onAction: () => {
        fmApi.waStart(wa.org_id).then(load).catch(() => {});
      },
    });
  });

  allActions.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

  // WA onboarding queue — clinics needing WA setup
  const waQueue = clinics.filter(c =>
    c.required_action === 'START_SETUP' ||
    c.required_action === 'WAIT_FOR_NUMBER' ||
    c.required_action === 'VERIFY_OTP' ||
    c.required_action === 'CONNECT_WHATSAPP' ||
    c.required_action === 'FIX_ERROR'
  );

  const handleWaAction = async (orgId, action) => {
    try {
      if (action === 'start') await fmApi.waStart(orgId);
      else if (action === 'retry') await fmApi.waRetry(orgId);
      else if (action === 'force') await fmApi.waForceConnect(orgId);
      load();
      actions?.reload?.();
    } catch {}
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Control Center</h1>
        <button onClick={async () => {
          try {
            const res = await fmApi.apiFetch('/api/v1/ops/clinic-actions/detect-stuck', { method: 'POST' });
            if (res?.detected > 0) { load(); actions?.reload?.(); }
          } catch {}
        }} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 16px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Detect Stuck
        </button>
      </div>

      {/* KPI Strip — all clickable */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Monthly Revenue" value={fmt(totalMrr)} color="green" icon="$" sub={`${safeNum(liveCount)} active`} onClick={() => navigateTo?.('billing')} />
        <StatCard label="Active Clinics" value={safeNum(liveCount)} color="blue" sub={`${safeNum(clinics.length)} total`} onClick={() => navigateTo?.('clinics')} />
        <StatCard label="Actions Required" value={safeNum(allActions.length)} color={allActions.length > 0 ? 'red' : 'green'} sub={allActions.length > 0 ? 'needs attention' : 'all good'} />
        <StatCard label="Messages Today" value={msgToday} color="purple" sub={autoRate ? `${autoRate}% auto` : ''} onClick={() => navigateTo?.('analytics')} />
      </div>

      {/* Action Feed */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: allActions.length > 0 ? '#ef4444' : '#10b981', marginBottom: 12 }}>
          {allActions.length > 0 ? `${allActions.length} Actions Required` : 'No Actions Required'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allActions.slice(0, 15).map(a => (
            <ActionCard
              key={a.id}
              type={a.type}
              priority={a.priority}
              clinicName={a.clinicName}
              detail={a.detail}
              timestamp={a.timestamp}
              cta={a.cta}
              onAction={a.onAction}
              onResolve={a.onResolve}
            />
          ))}
          {allActions.length === 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              All clear -- no actions required right now
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Onboarding Queue + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.8 }}>WhatsApp Onboarding Queue</h3>
          {waQueue.length === 0 ? (
            <div style={{ color: '#10b981', fontSize: 13 }}>All clinics connected</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {waQueue.map(c => (
                <div key={c.id} onClick={() => navigateTo?.('clinics', c)} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{safeStr(c.name)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      <StatusBadge status={safeStr(c.required_action, 'NONE')} />
                    </div>
                  </div>
                  <button onClick={() => setOnboardingClinic(c)} style={waBtn('#ff8a2a')}>
                    Continue Setup
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.8 }}>Live Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {evts.slice(0, 10).map(ev => (
              <div key={ev.id} onClick={() => ev.type === 'ERROR_OCCURRED' ? navigateTo?.('incidents') : navigateTo?.('logs')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', padding: '3px 6px', borderRadius: 6, transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: ev.resolved ? '#6b7280' : ev.priority === 'critical' ? '#ef4444' : '#eab308', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {safeStr(ev.org_name, 'System')} — {typeof ev.type === 'string' ? ev.type.replace(/_/g, ' ').toLowerCase() : '—'}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0 }}>{timeAgo(ev.created_at)}</span>
              </div>
            ))}
            {evts.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recent events</div>}
          </div>
        </div>
      </div>

      {/* WA Onboarding Modal */}
      {onboardingClinic && (
        <WaOnboardingModal
          clinic={onboardingClinic}
          onClose={() => setOnboardingClinic(null)}
          onComplete={() => { setOnboardingClinic(null); load(); actions?.reload?.(); }}
        />
      )}
    </div>
  );
}

function waBtn(bg) {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
}

function timeAgo(ts) {
  if (!ts) return '---';
  const d = Date.now() - new Date(ts).getTime();
  if (isNaN(d)) return '---';
  if (d < 60000) return 'now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
  return `${Math.floor(d / 86400000)}d`;
}
