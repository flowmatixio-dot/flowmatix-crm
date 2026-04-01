import React from 'react';

export default function AlertBar({ events = [], criticalCount = 0, unresolvedCount = 0, connected = false }) {
  if (unresolvedCount === 0) {
    return (
      <div style={{ background: 'linear-gradient(90deg, #10b98120, #10b98108)', borderBottom: '1px solid #10b98130', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>All systems operational</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{connected ? '● Live' : '○ Polling'}</span>
      </div>
    );
  }

  const hasCritical = criticalCount > 0;
  const barColor = hasCritical ? '#ef4444' : '#eab308';
  const bgGrad = hasCritical
    ? 'linear-gradient(90deg, #ef444420, #ef444408)'
    : 'linear-gradient(90deg, #eab30820, #eab30808)';

  const topEvents = events.filter(e => !e.resolved).slice(0, 3);

  return (
    <div style={{ background: bgGrad, borderBottom: `1px solid ${barColor}30`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: barColor, boxShadow: `0 0 8px ${barColor}`, animation: hasCritical ? 'fmPulse 2s infinite' : 'none' }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
        {criticalCount > 0 ? `${criticalCount} critical` : ''}{criticalCount > 0 && unresolvedCount > criticalCount ? ' · ' : ''}{unresolvedCount > criticalCount ? `${unresolvedCount - criticalCount} pending` : ''}
        {criticalCount === 0 ? `${unresolvedCount} pending` : ''}
      </span>
      <div style={{ display: 'flex', gap: 12, flex: 1, overflow: 'hidden' }}>
        {topEvents.map(ev => (
          <span key={ev.id} style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ev.org_name || 'System'}: {ev.type.replace(/_/g, ' ').toLowerCase()}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{connected ? '● Live' : '○ Polling'}</span>
    </div>
  );
}
