import React from 'react';

const COLORS = { green: '#10b981', red: '#ef4444', orange: '#f97316', yellow: '#eab308', blue: '#3b82f6', purple: '#a78bfa', gray: '#6b7280' };

export default function StatCard({ label, value, sub, color = 'blue', icon, onClick }) {
  const c = COLORS[color] || color;
  const safeVal = (v) => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  };
  return (
    <div onClick={onClick}
      style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '20px 24px', borderTop: `3px solid ${c}`, minWidth: 0, cursor: onClick ? 'pointer' : 'default', transition: 'all 0.15s' }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${c}15`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: c, marginBottom: 8 }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{safeVal(label)}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{safeVal(value)}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{safeVal(sub)}</div>}
    </div>
  );
}
