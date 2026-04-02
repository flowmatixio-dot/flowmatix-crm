import React from 'react';

const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' };

const ACTION_LABELS = {
  NEW_CUSTOMER:        { icon: '🆕', label: 'New customer — setup required' },
  PHONE_SUBMITTED:     { icon: '📱', label: 'Phone number submitted' },
  OTP_RECEIVED:        { icon: '🔑', label: 'OTP received — verify now' },
  WHATSAPP_CONNECTED:  { icon: '✅', label: 'WhatsApp connected' },
  ERROR_OCCURRED:      { icon: '🚨', label: 'Error occurred' },
  PAYMENT_FAILED:      { icon: '💳', label: 'Payment failed' },
  TRIAL_EXPIRING:      { icon: '⏰', label: 'Trial expiring soon' },
  // Actions
  START_SETUP:         { icon: '🔧', label: 'Start clinic setup' },
  WAIT_FOR_NUMBER:     { icon: '📞', label: 'Waiting for phone number' },
  VERIFY_OTP:          { icon: '🔑', label: 'OTP ready — verify in 360dialog' },
  CONNECT_WHATSAPP:    { icon: '💬', label: 'Connect WhatsApp' },
  FIX_ERROR:           { icon: '🚨', label: 'Fix error' },
  BOT_NO_RESPONSE:     { icon: '🤖', label: 'Bot not responding' },
  BOT_ERROR:           { icon: '🤖', label: 'Bot error' },
  WHATSAPP_SEND_FAILED:{ icon: '❌', label: 'WhatsApp send failed' },
  QUEUE_STUCK:         { icon: '⏳', label: 'Queue stuck' },
};

export default function ActionCard({ type, priority = 'medium', clinicName, detail, timestamp, cta, onAction, onResolve }) {
  const safeType = typeof type === 'string' ? type : 'UNKNOWN';
  const safePriority = typeof priority === 'string' ? priority : 'medium';
  const pc = PRIORITY_COLORS[safePriority] || PRIORITY_COLORS.medium;
  const cfg = ACTION_LABELS[safeType] || { icon: '📋', label: safeType };
  const safeName = typeof clinicName === 'string' ? clinicName : 'System';
  const safeDetail = typeof detail === 'string' ? detail : (typeof detail === 'object' ? JSON.stringify(detail) : String(cfg.label || ''));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-card)', borderRadius: 10, padding: '14px 18px', borderLeft: `4px solid ${pc}` }}>
      <span style={{ fontSize: 22 }}>{cfg.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{safeName}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{safeDetail}</div>
        {timestamp && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{timeAgo(timestamp)}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {cta && (
          <button onClick={onAction} style={{ background: pc, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {cta}
          </button>
        )}
        {onResolve && (
          <button onClick={onResolve} style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer' }}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

function timeAgo(ts) {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return 'just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}
