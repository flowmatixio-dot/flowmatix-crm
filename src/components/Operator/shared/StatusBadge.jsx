import React from 'react';

const STATE_CONFIG = {
  TRIAL:             { label: 'Trial',            color: 'var(--warning)' },
  WA_PENDING:        { label: 'WA Pending',       color: 'var(--brand)' },
  NEW:               { label: 'New',              color: 'var(--info)' },
  START_SETUP:       { label: 'Setup',            color: 'var(--info)' },
  WAIT_FOR_NUMBER:   { label: 'Waiting Number',   color: 'var(--warning)' },
  WAITING_OTP:       { label: 'OTP Pending',      color: 'var(--brand)' },
  VERIFY_OTP:        { label: 'Verify OTP',       color: 'var(--brand)' },
  CONNECT_WHATSAPP:  { label: 'Connect WA',       color: 'var(--warning)' },
  VERIFYING:         { label: 'Verifying',        color: '#c4a6ff' },
  LIVE:              { label: 'Live',             color: 'var(--success)' },
  NONE:              { label: 'Live',             color: 'var(--success)' },
  ACTIVATE:          { label: 'Ready to Activate', color: 'var(--success)' },
  FIX_ERROR:         { label: 'Error',            color: 'var(--error)' },
  ERROR:             { label: 'Error',            color: 'var(--error)' },
  BOT_NO_RESPONSE:   { label: 'Bot Silent',       color: 'var(--error)' },
  BOT_ERROR:         { label: 'Bot Error',        color: 'var(--error)' },
  // workspace states
  pending_setup:     { label: 'Pending Setup',    color: 'var(--brand)' },
  // subscription statuses
  active:            { label: 'Active',           color: 'var(--success)' },
  trialing:          { label: 'Trial',            color: 'var(--warning)' },
  past_due:          { label: 'Past Due',         color: 'var(--error)' },
  canceled:          { label: 'Canceled',         color: 'var(--text-muted)' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATE_CONFIG[status] || { label: status || '—', color: 'var(--text-muted)' };
  const fontSize = size === 'lg' ? 13 : 11;
  const pad = size === 'lg' ? '5px 12px' : '3px 10px';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--bg-active)',
      color: cfg.color,
      fontSize, fontWeight: 700,
      padding: pad, borderRadius: 6,
      whiteSpace: 'nowrap',
      border: '1px solid var(--border-subtle)',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 99,
        background: cfg.color,
        boxShadow: `0 0 8px ${cfg.color === 'var(--error)' ? 'rgba(255,92,92,0.5)' : cfg.color === 'var(--success)' ? 'rgba(45,252,180,0.4)' : 'transparent'}`,
      }} />
      {cfg.label}
    </span>
  );
}
