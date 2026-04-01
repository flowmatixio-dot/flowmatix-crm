import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import ActionCard from '../shared/ActionCard.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

export default function OverviewView({ events, actions }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fmApi.getPlatformStats?.().then(setStats).catch(() => {});
  }, []);

  const { actionRequired = [], totalMrr = 0, liveCount = 0, clinics = [] } = actions || {};
  const evts = Array.isArray(events?.events) ? events.events : [];
  const unresolvedEvents = evts.filter(e => !e.resolved);

  const fmt = (n) => typeof n === 'number' ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }) : '—';
  const msgToday = safeNum(stats?.messagesToday);
  const autoRate = safeNum(stats?.automationSuccessRate);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 20px' }}>Control Center</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Monthly Revenue" value={fmt(totalMrr)} color="green" icon="💰" sub={`${safeNum(liveCount)} active`} />
        <StatCard label="Active Clinics" value={safeNum(liveCount)} color="blue" icon="🏥" sub={`${safeNum(clinics.length)} total`} />
        <StatCard label="Actions Required" value={safeNum(actionRequired.length)} color={actionRequired.length > 0 ? 'red' : 'green'} icon="🎯" sub={actionRequired.length > 0 ? 'needs attention' : 'all good'} />
        <StatCard label="Messages Today" value={msgToday} color="purple" icon="💬" sub={autoRate ? `${autoRate}% auto` : ''} />
      </div>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: actionRequired.length > 0 ? '#ef4444' : '#10b981', marginBottom: 12 }}>
          {actionRequired.length > 0 ? `● ${actionRequired.length} Actions Required` : '● No Actions Required'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {unresolvedEvents.slice(0, 5).map(ev => (
            <ActionCard
              key={ev.id}
              type={safeStr(ev.type, 'UNKNOWN')}
              priority={safeStr(ev.priority, 'medium')}
              clinicName={safeStr(ev.org_name, 'System')}
              detail={safeStr(ev.payload?.email || ev.payload?.error || (typeof ev.type === 'string' ? ev.type.replace(/_/g, ' ').toLowerCase() : ''), '')}
              timestamp={ev.created_at}
              cta={ev.type === 'NEW_CUSTOMER' ? 'Setup' : ev.type === 'OTP_RECEIVED' ? 'Verify' : ev.type === 'PAYMENT_FAILED' ? 'View' : 'Open'}
              onResolve={() => events?.resolveEvent?.(ev.id)}
            />
          ))}
          {actionRequired.slice(0, 10).map(c => (
            <ActionCard
              key={c.id}
              type={safeStr(c.required_action, 'START_SETUP')}
              priority={c.required_action === 'FIX_ERROR' ? 'critical' : c.required_action === 'VERIFY_OTP' ? 'high' : 'medium'}
              clinicName={safeStr(c.name)}
              detail={`${safeStr(c.plan_name, 'No plan')} · Readiness: ${safeNum(c.readiness_score)}%`}
            />
          ))}
          {actionRequired.length === 0 && unresolvedEvents.length === 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              All clear — no actions required right now
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.8 }}>WhatsApp Status</h3>
          {clinics.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clinics.filter(c => c.required_action !== 'NONE').map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{safeStr(c.name)}</span>
                  <StatusBadge status={safeStr(c.required_action, 'NONE')} />
                </div>
              ))}
              {clinics.filter(c => c.required_action !== 'NONE').length === 0 && (
                <div style={{ color: '#10b981', fontSize: 13 }}>All clinics connected</div>
              )}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.8 }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {evts.slice(0, 8).map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
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
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return '—';
  const d = Date.now() - new Date(ts).getTime();
  if (isNaN(d)) return '—';
  if (d < 60000) return 'now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
  return `${Math.floor(d / 86400000)}d`;
}
