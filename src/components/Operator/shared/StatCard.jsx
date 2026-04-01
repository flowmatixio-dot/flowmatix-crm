import React from 'react';

const COLORS = { green: '#10b981', red: '#ef4444', orange: '#f97316', yellow: '#eab308', blue: '#3b82f6', purple: '#a78bfa', gray: '#6b7280' };

export default function StatCard({ label, value, sub, color = 'blue', icon }) {
  const c = COLORS[color] || color;
  // Prevent rendering objects directly
  const safeVal = (v) => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  };
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '20px 24px', borderTop: `3px solid ${c}`, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: c, marginBottom: 8 }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{safeVal(label)}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{safeVal(value)}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{safeVal(sub)}</div>}
    </div>
  );
}
