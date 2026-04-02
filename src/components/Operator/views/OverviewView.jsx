import React, { useState, useEffect, useCallback } from 'react';
import StatCard from '../shared/StatCard.jsx';
import ActionCard from '../shared/ActionCard.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import WaOnboardingModal from '../shared/WaOnboardingModal.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

/* ─── Human-readable priority descriptions ─── */
const PRIORITY_DESCRIPTIONS = {
  WHATSAPP_SEND_FAILED: { title: 'WhatsApp delivery failed', desc: 'Patients are not receiving messages', icon: '🚨' },
  BOT_NO_RESPONSE:      { title: 'Bot not responding',       desc: 'Incoming messages going unanswered', icon: '🚨' },
  BOT_ERROR:            { title: 'Bot error detected',       desc: 'AI responses are failing',           icon: '🚨' },
  FIX_ERROR:            { title: 'Connection error',         desc: 'Service disruption detected',        icon: '🚨' },
  ERROR_OCCURRED:       { title: 'System issue',             desc: 'Requires investigation',             icon: '⚠️' },
  PAYMENT_FAILED:       { title: 'Payment failed',           desc: 'Revenue at risk',                    icon: '💰' },
  OTP_RECEIVED:         { title: 'Verification code ready',  desc: 'Verify to connect WhatsApp',         icon: '🔑' },
  VERIFY_OTP:           { title: 'OTP ready to verify',      desc: 'Complete WhatsApp setup',             icon: '🔑' },
  NEW_CUSTOMER:         { title: 'New customer',             desc: 'Start onboarding',                   icon: '🆕' },
  CONNECT_WHATSAPP:     { title: 'Connect WhatsApp',         desc: 'Clinic waiting for activation',      icon: '💬' },
  TRIAL_EXPIRING:       { title: 'Trial ending soon',        desc: 'Follow up to convert',               icon: '⏰' },
  QUEUE_STUCK:          { title: 'Queue delayed',            desc: 'Messages waiting to process',        icon: '⏳' },
  WAIT_FOR_NUMBER:      { title: 'Waiting for phone number', desc: 'Clinic needs to submit their number', icon: '📱' },
  START_SETUP:          { title: 'Setup pending',            desc: 'Clinic onboarding not started',       icon: '🔧' },
  ACTIVATE:             { title: 'Ready to activate',        desc: 'Clinic setup complete',               icon: '🚀' },
  WA_PENDING:           { title: 'WhatsApp activation pending', desc: 'Number submitted, awaiting setup', icon: '📱' },
  PHONE_SUBMITTED:      { title: 'Phone number submitted',   desc: 'Ready for WhatsApp setup',            icon: '📱' },
  PROFILE_SUBMITTED:    { title: 'WA profile submitted',     desc: 'Set up in 360dialog',                 icon: '📋' },
};

/* ─── Revenue Trend (SVG) — uses real daily metrics ─── */
function RevenueTrend({ mrr, dailyMetrics }) {
  const data = Array.isArray(dailyMetrics) && dailyMetrics.length > 0
    ? dailyMetrics.slice(-7)
    : null;

  if (!data) return null; // hide if no real data

  const pts = data.map(d => d.revenue || (d.revenue_cents ? d.revenue_cents / 100 : 0));
  const labels = data.map(d => {
    if (!d.day) return '';
    const dt = new Date(d.day);
    return dt.toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2);
  });

  const max = Math.max(...pts, 1);
  const w = 320, h = 64, pad = 2;
  const count = pts.length;

  const points = pts.map((p, i) => {
    const x = pad + (i / (count - 1 || 1)) * (w - pad * 2);
    const y = h - pad - (p / max) * (h - pad * 2);
    return `${x},${y}`;
  });

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)' }}>
            Revenue Trend
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>Last {count} days</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
          {fmt(mrr || 0)}<span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>/mo</span>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${w} ${h + 16}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="rv-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={pad} y1={h - pad - p * (h - pad * 2)} x2={w - pad} y2={h - pad - p * (h - pad * 2)}
            stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="4 4" />
        ))}
        <polygon points={`${pad},${h - pad} ${points.join(' ')} ${w - pad},${h - pad}`} fill="url(#rv-grad)" />
        <polyline points={points.join(' ')} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          const [x, y] = p.split(',').map(Number);
          return <circle key={i} cx={x} cy={y} r="3" fill="#22c55e" stroke="var(--bg-card)" strokeWidth="2" />;
        })}
        {labels.map((d, i) => {
          const x = pad + (i / (count - 1 || 1)) * (w - pad * 2);
          return <text key={i} x={x} y={h + 12} textAnchor="middle" fill="var(--text-faint)" fontSize="9" fontWeight="600">{d}</text>;
        })}
      </svg>
    </div>
  );
}

/* ─── Helpers ─── */
function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }) : '---';
}

function timeAgo(ts) {
  if (!ts) return '—';
  const d = Date.now() - new Date(ts).getTime();
  if (isNaN(d)) return '—';
  if (d < 60000) return 'just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}


/* ═══════════════════════════════════════════════════════════
   OverviewView — Premium Control Center Dashboard
   ═══════════════════════════════════════════════════════════ */
export default function OverviewView({ events, actions, navigateTo }) {
  const [stats, setStats] = useState(null);
  const [waActivations, setWaActivations] = useState([]);
  const [dailyMetrics, setDailyMetrics] = useState([]);
  const [onboardingClinic, setOnboardingClinic] = useState(null);

  const load = useCallback(() => {
    fmApi.getPlatformStats().then(setStats).catch(() => {});
    fmApi.apiFetch('/api/v1/ops/clinic/whatsapp-activations').then(res => {
      setWaActivations(Array.isArray(res?.activations) ? res.activations : []);
    }).catch(() => {});
    fmApi.apiFetch('/api/v1/ops/platform/daily-metrics?days=7').then(res => {
      if (Array.isArray(res?.metrics)) setDailyMetrics(res.metrics);
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
  const msgToday = safeNum(stats?.messagesToday);
  const autoRate = safeNum(stats?.automationSuccessRate);

  // ── Build unified action feed ──
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
        : ev.payload?.error_type === 'WHATSAPP_SEND_FAILED' ? 'Fix Now'
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
      detail: `${safeStr(c.plan_name, 'No plan')} — Health: ${safeNum(c.readiness_score)}%`,
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
      detail: `WA activation — ${safeStr(wa.status, 'pending')}`,
      cta: 'Setup WA',
      onAction: () => { fmApi.waStart(wa.org_id).then(load).catch(() => {}); },
    });
  });

  allActions.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

  // WA queue
  const waQueue = clinics.filter(c =>
    c.required_action === 'START_SETUP' || c.required_action === 'WAIT_FOR_NUMBER' ||
    c.required_action === 'VERIFY_OTP' || c.required_action === 'CONNECT_WHATSAPP' || c.required_action === 'FIX_ERROR'
  );

  // ── Priority items (top 3 most urgent) ──
  const priorityItems = allActions.slice(0, 3).map(a => {
    const cfg = PRIORITY_DESCRIPTIONS[a.type] || { title: a.type.replace(/_/g, ' '), desc: a.detail, icon: '📋' };
    return { ...a, ...cfg };
  });

  // ── Group actions by severity ──
  const criticalActions = allActions.filter(a => a.priority === 'critical');
  const highActions = allActions.filter(a => a.priority === 'high');
  const otherActions = allActions.filter(a => a.priority !== 'critical' && a.priority !== 'high');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* ═══ HEADER ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28, paddingBottom: 20,
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Control Center
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}{safeNum(clinics.length)} clinics managed
          </div>
        </div>
        <button onClick={async () => {
          try {
            const res = await fmApi.apiFetch('/api/v1/ops/clinic-actions/detect-stuck', { method: 'POST' });
            if (res?.detected > 0) { load(); actions?.reload?.(); }
          } catch {}
        }} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-default)',
          borderRadius: 10, padding: '8px 18px',
          color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
        >
          Scan for Issues
        </button>
      </div>

      {/* ═══ TODAY'S PRIORITY ═══ */}
      {priorityItems.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: 1.5, color: 'var(--text-muted)', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 99,
              background: criticalActions.length > 0 ? 'var(--error)' : 'var(--warning)',
              boxShadow: criticalActions.length > 0 ? '0 0 8px rgba(239,68,68,0.5)' : '0 0 8px rgba(249,115,22,0.3)',
              animation: criticalActions.length > 0 ? 'statusGlow 2s ease infinite' : 'none',
            }} />
            Today's Priority
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(priorityItems.length, 3)}, 1fr)`, gap: 14 }}>
            {priorityItems.map(item => {
              const isCrit = item.priority === 'critical';
              const borderColor = isCrit ? 'rgba(239,68,68,0.2)' : item.priority === 'high' ? 'rgba(249,115,22,0.15)' : 'var(--border-default)';
              return (
                <div key={item.id} style={{
                  background: isCrit ? 'rgba(239,68,68,0.04)' : 'var(--bg-card)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 14, padding: '20px 22px',
                  cursor: item.onAction ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
                  onClick={item.onAction}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 24 }}>{item.icon}</span>
                    {isCrit && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                        background: 'var(--error-muted)', color: 'var(--error)',
                        padding: '3px 8px', borderRadius: 5, letterSpacing: 0.5,
                      }}>Urgent</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.4 }}>
                    {item.clinicName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</div>
                  {item.cta && (
                    <button onClick={e => { e.stopPropagation(); item.onAction?.(); }} style={{
                      marginTop: 14, width: '100%',
                      background: isCrit ? 'var(--error)' : 'var(--bg-active)',
                      color: isCrit ? '#fff' : 'var(--text-primary)',
                      border: isCrit ? 'none' : '1px solid var(--border-default)',
                      borderRadius: 8, padding: '8px 16px',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'inherit', transition: 'all 0.15s',
                    }}>
                      {item.cta}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ KPI CARDS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard
          label="Monthly Revenue"
          value={fmt(totalMrr)}
          color="green"
          icon="💰"
          sub={`${safeNum(liveCount)} paying`}
          onClick={() => navigateTo?.('billing')}
        />
        <StatCard
          label="Active Clinics"
          value={safeNum(liveCount)}
          color="blue"
          icon="🏥"
          sub={`${safeNum(clinics.length)} total`}
          onClick={() => navigateTo?.('clinics')}
        />
        <StatCard
          label="Actions Required"
          value={safeNum(allActions.length)}
          color={allActions.length > 0 ? 'red' : 'green'}
          icon={allActions.length > 0 ? '⚡' : '✓'}
          sub={allActions.length > 0 ? `${criticalActions.length} critical` : 'all clear'}
        />
        <StatCard
          label="Messages Today"
          value={msgToday}
          color="purple"
          icon="💬"
          sub={autoRate ? `${autoRate}% automated` : ''}
          onClick={() => navigateTo?.('analytics')}
        />
      </div>

      {/* ═══ REVENUE TREND ═══ */}
      <div style={{ marginBottom: 28 }}>
        <RevenueTrend mrr={totalMrr} dailyMetrics={dailyMetrics} />
      </div>

      {/* ═══ ACTIONS REQUIRED ═══ */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: 1.5,
            color: allActions.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            Actions Required
            {allActions.length > 0 && (
              <span style={{
                background: criticalActions.length > 0 ? 'var(--error-muted)' : 'rgba(249,115,22,0.1)',
                color: criticalActions.length > 0 ? 'var(--error)' : 'var(--warning)',
                fontSize: 11, fontWeight: 800,
                padding: '3px 9px', borderRadius: 6,
              }}>
                {allActions.length}
              </span>
            )}
          </div>
        </div>

        {allActions.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)', borderRadius: 14,
            border: '1px solid var(--border-subtle)',
            padding: '48px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>All clear</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No actions required right now</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Critical */}
            {criticalActions.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--error)', textTransform: 'uppercase', letterSpacing: 1, margin: '4px 0 2px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--error)' }} /> Critical
                </div>
                {criticalActions.map(a => <ActionCard key={a.id} {...a} />)}
              </>
            )}
            {/* High */}
            {highActions.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: 1, margin: '8px 0 2px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--warning)' }} /> High Priority
                </div>
                {highActions.map(a => <ActionCard key={a.id} {...a} />)}
              </>
            )}
            {/* Other */}
            {otherActions.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, margin: '8px 0 2px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--text-faint)' }} /> Other
                </div>
                {otherActions.slice(0, 10).map(a => <ActionCard key={a.id} {...a} />)}
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══ BOTTOM PANELS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
        {/* WhatsApp Onboarding */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 14,
          border: '1px solid var(--border-subtle)',
          padding: '22px 24px',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>WhatsApp Onboarding</span>
            {waQueue.length > 0 && (
              <span style={{
                background: 'rgba(249,115,22,0.1)', color: 'var(--warning)',
                fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 5,
              }}>{waQueue.length}</span>
            )}
          </div>
          {waQueue.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }} />
              All clinics connected
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {waQueue.map(c => (
                <div key={c.id} onClick={() => navigateTo?.('clinics', c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10,
                    background: 'var(--bg-section)', border: '1px solid var(--border-subtle)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-section)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{safeStr(c.name)}</div>
                    <div style={{ marginTop: 3 }}><StatusBadge status={safeStr(c.required_action, 'NONE')} /></div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setOnboardingClinic(c); }} style={{
                    background: 'var(--brand)', color: '#fff', border: 'none',
                    borderRadius: 7, padding: '6px 12px',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                    Continue
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Activity */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 14,
          border: '1px solid var(--border-subtle)',
          padding: '22px 24px',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>Live Activity</span>
            {events?.connected && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--success)', boxShadow: '0 0 4px var(--success)' }} />
                Live
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {evts.slice(0, 10).map(ev => (
              <div key={ev.id}
                onClick={() => ev.type === 'ERROR_OCCURRED' ? navigateTo?.('incidents') : navigateTo?.('logs')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 12, color: 'var(--text-secondary)',
                  cursor: 'pointer', padding: '6px 8px', borderRadius: 8,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: 99, flexShrink: 0,
                  background: ev.resolved ? 'var(--text-faint)' : ev.priority === 'critical' ? 'var(--error)' : 'var(--warning)',
                  boxShadow: ev.resolved ? 'none' : ev.priority === 'critical' ? '0 0 6px rgba(239,68,68,0.4)' : '0 0 4px rgba(234,179,8,0.3)',
                }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{safeStr(ev.org_name, 'System')}</span>
                  {' — '}
                  {typeof ev.type === 'string' ? ev.type.replace(/_/g, ' ').toLowerCase() : '—'}
                </span>
                <span style={{ color: 'var(--text-faint)', fontSize: 10, flexShrink: 0, fontWeight: 500 }}>
                  {timeAgo(ev.created_at)}
                </span>
              </div>
            ))}
            {evts.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>
                No recent events
              </div>
            )}
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
