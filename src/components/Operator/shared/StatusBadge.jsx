import React from 'react';

const STATE_CONFIG = {
  NEW:               { label: 'New',              bg: '#3b82f620', color: '#3b82f6', dot: '#3b82f6' },
  START_SETUP:       { label: 'Setup',            bg: '#3b82f620', color: '#3b82f6', dot: '#3b82f6' },
  WAIT_FOR_NUMBER:   { label: 'Waiting Number',   bg: '#eab30820', color: '#eab308', dot: '#eab308' },
  WAITING_OTP:       { label: 'OTP Pending',      bg: '#f9731620', color: '#f97316', dot: '#f97316' },
  VERIFY_OTP:        { label: 'Verify OTP',       bg: '#f9731620', color: '#f97316', dot: '#f97316' },
  CONNECT_WHATSAPP:  { label: 'Connect WA',       bg: '#eab30820', color: '#eab308', dot: '#eab308' },
  VERIFYING:         { label: 'Verifying',        bg: '#a78bfa20', color: '#a78bfa', dot: '#a78bfa' },
  LIVE:              { label: 'Live',              bg: '#10b98120', color: '#10b981', dot: '#10b981' },
  NONE:              { label: 'Live',              bg: '#10b98120', color: '#10b981', dot: '#10b981' },
  ACTIVATE:          { label: 'Ready to Activate', bg: '#10b98120', color: '#10b981', dot: '#10b981' },
  FIX_ERROR:         { label: 'Error',             bg: '#ef444420', color: '#ef4444', dot: '#ef4444' },
  ERROR:             { label: 'Error',             bg: '#ef444420', color: '#ef4444', dot: '#ef4444' },
  BOT_NO_RESPONSE:   { label: 'Bot Silent',        bg: '#ef444420', color: '#ef4444', dot: '#ef4444' },
  BOT_ERROR:         { label: 'Bot Error',         bg: '#ef444420', color: '#ef4444', dot: '#ef4444' },
  // workspace states
  pending_setup:     { label: 'Pending Setup',     bg: '#f9731620', color: '#f97316', dot: '#f97316' },
  // subscription statuses
  active:            { label: 'Active',            bg: '#10b98120', color: '#10b981', dot: '#10b981' },
  trialing:          { label: 'Trial',             bg: '#eab30820', color: '#eab308', dot: '#eab308' },
  past_due:          { label: 'Past Due',          bg: '#ef444420', color: '#ef4444', dot: '#ef4444' },
  canceled:          { label: 'Canceled',          bg: '#6b728020', color: '#6b7280', dot: '#6b7280' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATE_CONFIG[status] || { label: status || '—', bg: '#6b728020', color: '#6b7280', dot: '#6b7280' };
  const fontSize = size === 'lg' ? 13 : 11;
  const pad = size === 'lg' ? '5px 12px' : '3px 10px';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, fontSize, fontWeight: 700, padding: pad, borderRadius: 6, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
      {cfg.label}
    </span>
  );
}
