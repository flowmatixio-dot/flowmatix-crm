import React from 'react';

const NAV_ITEMS = [
  { id: 'overview',     icon: '🎯', label: 'Overview' },
  { id: 'clinics',      icon: '🏥', label: 'Clinics' },
  { id: 'trials',       icon: '🧪', label: 'Trials' },
  'divider',
  { id: 'automations',  icon: '⚡', label: 'Automations' },
  { id: 'analytics',    icon: '📊', label: 'Analytics' },
  { id: 'monitoring',   icon: '📡', label: 'Monitoring' },
  { id: 'incidents',    icon: '🚨', label: 'Incidents' },
  'divider',
  { id: 'logs',         icon: '📋', label: 'Logs' },
  { id: 'billing',      icon: '💳', label: 'Billing' },
  { id: 'settings',     icon: '⚙️', label: 'Settings' },
];

export default function OperatorSidebar({ activeTab, onTabChange, badges = {} }) {
  return (
    <div style={{ width: 220, background: '#0c1220', borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#ff8a2a', letterSpacing: 1.5 }}>FLOWMATIX</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginTop: 2, letterSpacing: 2 }}>CONTROL CENTER</div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: '12px 10px', overflow: 'auto' }}>
        {NAV_ITEMS.map((item, i) => {
          if (item === 'divider') return <div key={`d${i}`} style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 6px' }} />;
          const isActive = activeTab === item.id;
          const badge = badges[item.id];
          return (
            <div key={item.id} onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 8, marginBottom: 2, cursor: 'pointer', transition: 'all 0.15s',
                background: isActive ? 'rgba(255,138,42,0.12)' : 'transparent',
                color: isActive ? '#ff8a2a' : 'rgba(200,215,240,0.6)',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--border-subtle)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ fontSize: 15, width: 22, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, flex: 1 }}>{item.label}</span>
              {badge > 0 && (
                <span style={{ background: badge > 0 ? '#ef4444' : '#eab308', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, minWidth: 18, textAlign: 'center' }}>
                  {badge}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Status */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-default)', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
        Operator v2.0
      </div>
    </div>
  );
}
