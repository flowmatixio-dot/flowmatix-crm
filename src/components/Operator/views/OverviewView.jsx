import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import ActionCard from '../shared/ActionCard.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import * as fmApi from '../../../api/client.js';

export default function OverviewView({ events, actions }) {
  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    fmApi.getPlatformStats?.().then(setStats).catch(() => {});
    fmApi.getPlatformOverview?.().then(setOverview).catch(() => {});
  }, []);

  const { actionRequired = [], totalMrr = 0, liveCount = 0, clinics = [] } = actions || {};
  const evts = events?.events || [];
  const unresolvedEvents = evts.filter(e => !e.resolved);

  const fmt = (n) => typeof n === 'number' ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }) : '—';

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 20px' }}>Control Center</h1>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Monthly Revenue" value={fmt(totalMrr)} color="green" icon="💰" sub={`${liveCount} active`} />
        <StatCard label="Active Clinics" value={liveCount} color="blue" icon="🏥" sub={`${clinics.length} total`} />
        <StatCard label="Actions Required" value={actionRequired.length} color={actionRequired.length > 0 ? 'red' : 'green'} icon="🎯" sub={actionRequired.length > 0 ? 'needs attention' : 'all good'} />
        <StatCard label="Messages Today" value={stats?.messagesToday || 0} color="purple" icon="💬" sub={stats?.automationSuccessRate ? `${stats.automationSuccessRate}% auto` : ''} />
      </div>

      {/* Action Feed */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: actionRequired.length > 0 ? '#ef4444' : '#10b981', marginBottom: 12 }}>
          {actionRequired.length > 0 ? `● ${actionRequired.length} Actions Required` : '● No Actions Required'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Events first (highest priority) */}
          {unresolvedEvents.slice(0, 5).map(ev => (
            <ActionCard
              key={ev.id}
              type={ev.type}
              priority={ev.priority}
              clinicName={ev.org_name}
              detail={ev.payload?.email || ev.payload?.error || ev.type.replace(/_/g, ' ').toLowerCase()}
              timestamp={ev.created_at}
              cta={ev.type === 'NEW_CUSTOMER' ? 'Setup' : ev.type === 'OTP_RECEIVED' ? 'Verify' : ev.type === 'PAYMENT_FAILED' ? 'View' : 'Open'}
              onResolve={() => events.resolveEvent(ev.id)}
            />
          ))}
          {/* Clinic actions */}
          {actionRequired.slice(0, 10).map(c => (
            <ActionCard
              key={c.id}
              type={c.required_action}
              priority={c.required_action === 'FIX_ERROR' ? 'critical' : c.required_action === 'VERIFY_OTP' ? 'high' : 'medium'}
              clinicName={c.name}
              detail={`${c.plan_name || 'No plan'} · Readiness: ${c.readiness_score}%`}
            />
          ))}
          {actionRequired.length === 0 && unresolvedEvents.length === 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              All clear — no actions required right now
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Status Block */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.8 }}>WhatsApp Status</h3>
          {clinics.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clinics.filter(c => c.required_action !== 'NONE').map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{c.name}</span>
                  <StatusBadge status={c.required_action} />
                </div>
              ))}
              {clinics.filter(c => c.required_action !== 'NONE').length === 0 && (
                <div style={{ color: '#10b981', fontSize: 13 }}>All clinics connected</div>
              )}
            </div>
          )}
        </div>

        {/* Live Activity */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.8 }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {evts.slice(0, 8).map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: ev.resolved ? '#6b7280' : ev.priority === 'critical' ? '#ef4444' : '#eab308', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.org_name || 'System'} — {ev.type.replace(/_/g, ' ').toLowerCase()}
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
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return 'now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
  return `${Math.floor(d / 86400000)}d`;
}
