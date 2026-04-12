import React from 'react';

const PRIORITY_STYLES = {
  critical: { color: 'var(--error)', bg: 'var(--error-subtle)', border: 'var(--error-muted)', badge: 'Critical' },
  high:     { color: 'var(--warning)', bg: 'var(--warning-subtle)', border: 'var(--warning-muted)', badge: 'High' },
  medium:   { color: 'var(--text-secondary)', bg: 'transparent', border: 'var(--border-subtle)', badge: 'Medium' },
  low:      { color: 'var(--text-muted)', bg: 'transparent', border: 'var(--border-subtle)', badge: 'Low' },
};

// Human-readable labels — no technical jargon
const ACTION_LABELS = {
  NEW_CUSTOMER:          { icon: '🆕', label: 'New customer signed up',            desc: 'Initial setup required' },
  PHONE_SUBMITTED:       { icon: '📱', label: 'Phone number submitted',            desc: 'Ready for WhatsApp setup' },
  OTP_RECEIVED:          { icon: '🔑', label: 'Verification code ready',           desc: 'Verify now to connect WhatsApp' },
  WHATSAPP_CONNECTED:    { icon: '✅', label: 'WhatsApp connected',                desc: 'Connection established' },
  ERROR_OCCURRED:        { icon: '🚨', label: 'System issue detected',             desc: 'Requires investigation' },
  PAYMENT_FAILED:        { icon: '💳', label: 'Payment processing failed',         desc: 'Revenue at risk' },
  TRIAL_EXPIRING:        { icon: '⏰', label: 'Trial ending soon',                 desc: 'Follow up to convert' },
  START_SETUP:           { icon: '🔧', label: 'Clinic setup pending',              desc: 'Onboarding not started' },
  WAIT_FOR_NUMBER:       { icon: '📞', label: 'Waiting for phone number',          desc: 'Clinic needs to submit number' },
  VERIFY_OTP:            { icon: '🔑', label: 'OTP ready — verify now',            desc: 'Verify in 360dialog' },
  CONNECT_WHATSAPP:      { icon: '💬', label: 'WhatsApp connection needed',        desc: 'Complete WA setup' },
  WA_PENDING:            { icon: '📱', label: 'WhatsApp activation pending',       desc: 'Number submitted, awaiting setup' },
  FIX_ERROR:             { icon: '🚨', label: 'Connection error',                  desc: 'Fix required to restore service' },
  SETUP_INCOMPLETE:      { icon: '🔧', label: 'Setup incomplete',                   desc: 'Clinic still setting up — not an error' },
  BOT_NO_RESPONSE:       { icon: '🤖', label: 'Bot not responding',               desc: 'Patients not receiving replies' },
  BOT_ERROR:             { icon: '🤖', label: 'Bot encountered an error',          desc: 'AI response failing' },
  WHATSAPP_SEND_FAILED:  { icon: '❌', label: 'WhatsApp delivery failed',          desc: 'Messages not being sent' },
  QUEUE_STUCK:           { icon: '⏳', label: 'Message queue delayed',             desc: 'Messages waiting to be processed' },
  PROFILE_SUBMITTED:     { icon: '📋', label: 'WA profile submitted',              desc: 'Set up in 360dialog' },
};

export default function ActionCard({ type, priority = 'medium', clinicName, detail, timestamp, cta, onAction, onResolve }) {
  const safeType = typeof type === 'string' ? type : 'UNKNOWN';
  const safePriority = typeof priority === 'string' ? priority : 'medium';
  const ps = PRIORITY_STYLES[safePriority] || PRIORITY_STYLES.medium;
  const cfg = ACTION_LABELS[safeType] || { icon: '📋', label: safeType.replaceAll(/_/g, ' ').toLowerCase(), desc: '' };
  const safeName = typeof clinicName === 'string' ? clinicName : 'System';
  const isCritical = safePriority === 'critical';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      background: ps.bg,
      borderRadius: 12,
      padding: '16px 20px',
      borderLeft: `4px solid ${ps.color}`,
      border: `1px solid ${ps.border}`,
      borderLeftWidth: 4,
      borderLeftColor: ps.color,
      transition: 'all 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = ps.bg; e.currentTarget.style.transform = ''; }}
    >
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${ps.color}12`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{safeName}</span>
          {isCritical && (
            <span style={{
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5,
              background: 'rgba(239,68,68,0.12)', color: '#ef4444',
              padding: '2px 7px', borderRadius: 4,
            }}>Critical</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{cfg.label}</div>
        {timestamp && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{timeAgo(timestamp)}</div>
        )}
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {cta && onAction && (
          <button onClick={onAction} style={{
            background: isCritical ? ps.color : 'var(--bg-active)',
            color: isCritical ? '#fff' : 'var(--text-primary)',
            border: isCritical ? 'none' : '1px solid var(--border-default)',
            borderRadius: 8, padding: '7px 16px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}>
            {cta}
          </button>
        )}
        {onResolve && (
          <button onClick={onResolve} style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8, padding: '7px 12px',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

function timeAgo(ts) {
  const d = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(d) || d < 0) return '—';
  if (d < 60000) return 'just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}
