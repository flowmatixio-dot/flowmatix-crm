import React from 'react';

const COLORS = {
  green:  { main: '#22c55e', bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.35)' },
  red:    { main: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)' },
  blue:   { main: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)' },
  purple: { main: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.35)' },
  orange: { main: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)' },
  yellow: { main: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)' },
};

function MiniSparkline({ color, seed = 0 }) {
  // Deterministic sparkline based on seed
  const pts = [];
  let v = 50 + (seed % 30);
  for (let i = 0; i < 7; i++) {
    v = Math.max(15, Math.min(85, v + ((seed * (i + 1) * 7) % 25) - 12));
    pts.push(v);
  }
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const range = max - min || 1;
  const h = 32, w = 80;
  const points = pts.map((p, i) => {
    const x = (i / 6) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} style={{ overflow: 'visible', opacity: 0.8 }}>
      <defs>
        <linearGradient id={`sg-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#sg-${seed})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StatCard({ label, value, sub, color = 'blue', icon, onClick, trend, trendLabel }) {
  const c = COLORS[color] || COLORS.blue;
  const safeVal = (v) => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  };

  const numVal = typeof value === 'number' ? value : (typeof value === 'string' ? Number.parseInt(value.replaceAll(/[^0-9]/g, '')) : 0);

  return (
    <div onClick={onClick} className="dash-card"
      style={{
        background: 'var(--bg-card)',
        borderRadius: 14,
        padding: '22px 24px',
        border: `1px solid ${c.border}`,
        minWidth: 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
      {/* Sparkline background */}
      <div style={{ position: 'absolute', bottom: 0, right: 8, pointerEvents: 'none' }}>
        <MiniSparkline color={c.main} seed={numVal + label.length} />
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: 1.2, color: 'var(--text-secondary)',
        }}>
          {safeVal(label)}
        </div>
        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: c.bg, border: `1px solid ${c.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{
        fontSize: 32, fontWeight: 800, color: 'var(--text-primary)',
        lineHeight: 1, letterSpacing: '-0.02em', position: 'relative',
      }}>
        {safeVal(value)}
      </div>

      {/* Trend + Sub */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, position: 'relative' }}>
        {trend !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: trend >= 0 ? '#10b981' : '#ef4444',
            background: trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            padding: '2px 7px', borderRadius: 5,
          }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
        {sub && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            {safeVal(sub)}
          </span>
        )}
      </div>
    </div>
  );
}
