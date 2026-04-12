import React, { useState, useEffect } from 'react';
import * as fmApi from '../../api/client.js';

export default function AlertBar({ events = [], criticalCount = 0, unresolvedCount = 0, connected = false, onEventClick, onDismiss }) {
  const [backupAlert, setBackupAlert] = useState(null);

  // Check backup status periodically
  useEffect(() => {
    const checkBackup = () => {
      fmApi.getBackupStatus?.().then(res => {
        if (!res?.lastBackupAt) {
          setBackupAlert('No backup data available');
          return;
        }
        const hoursAgo = (Date.now() - new Date(res.lastBackupAt).getTime()) / 3600000;
        if (hoursAgo > 25) setBackupAlert(`Last backup ${Math.floor(hoursAgo)}h ago — overdue`);
        else if (res.error) setBackupAlert(`Backup error: ${res.error}`);
        else setBackupAlert(null);
      }).catch(() => {});
    };
    checkBackup();
    const iv = setInterval(checkBackup, 300000); // every 5min
    return () => clearInterval(iv);
  }, []);

  const totalAlerts = unresolvedCount + (backupAlert ? 1 : 0);

  if (totalAlerts === 0) {
    return (
      <div style={{ background: 'linear-gradient(90deg, #22c55e20, #22c55e08)', borderBottom: '1px solid #22c55e30', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>All systems operational</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{connected ? '● Live' : ''}</span>
      </div>
    );
  }

  const hasCritical = criticalCount > 0;
  const hasBackupIssue = !!backupAlert;
  const barColor = hasCritical ? '#ef4444' : (hasBackupIssue ? '#ff8c2a' : '#ffcf40');
  const bgGrad = hasCritical
    ? 'linear-gradient(90deg, #ef444420, #ef444408)'
    : hasBackupIssue ? 'linear-gradient(90deg, #ff8c2a20, #ff8c2a08)' : 'linear-gradient(90deg, #ffcf4020, #ffcf4008)';

  const topEvents = events.filter(e => !e.resolved).slice(0, 3);

  return (
    <div style={{ background: bgGrad, borderBottom: `1px solid ${barColor}30`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: barColor, boxShadow: `0 0 8px ${barColor}`, animation: hasCritical ? 'fmPulse 2s infinite' : 'none' }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
        {criticalCount > 0 ? `${criticalCount} critical` : ''}{criticalCount > 0 && unresolvedCount > criticalCount ? ' · ' : ''}{unresolvedCount > criticalCount ? `${unresolvedCount - criticalCount} pending` : ''}
        {criticalCount === 0 && unresolvedCount > 0 ? `${unresolvedCount} pending` : ''}
        {unresolvedCount === 0 && hasBackupIssue ? 'Backup warning' : ''}
      </span>
      <div style={{ display: 'flex', gap: 12, flex: 1, overflow: 'hidden' }}>
        {backupAlert && (
          <span style={{ fontSize: 11, color: '#ff8c2a', whiteSpace: 'nowrap', fontWeight: 600 }}>
            Backup: {backupAlert}
          </span>
        )}
        {topEvents.map(ev => (
          <span key={ev.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span onClick={() => onEventClick?.(ev)} style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: ev.organization_id ? 'pointer' : 'default', borderBottom: ev.organization_id ? '1px dashed rgba(255,255,255,0.2)' : 'none' }}>
              {ev.org_name || 'System'}: {typeof ev.type === 'string' ? ev.type.replaceAll(/_/g, ' ').toLowerCase() : ''}
            </span>
            <span onClick={(e) => { e.stopPropagation(); onDismiss?.(ev.id); }} style={{ fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6, fontWeight: 600 }} title="Dismiss">✕</span>
          </span>
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{connected ? '● Live' : ''}</span>
    </div>
  );
}
