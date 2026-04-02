import React, { useState, useEffect } from 'react';
import * as fmApi from '../../api/client.js';

export default function AlertBar({ events = [], criticalCount = 0, unresolvedCount = 0, connected = false }) {
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
      <div style={{ background: 'linear-gradient(90deg, #10b98120, #10b98108)', borderBottom: '1px solid #10b98130', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>All systems operational</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{connected ? '● Live' : '○ Polling'}</span>
      </div>
    );
  }

  const hasCritical = criticalCount > 0;
  const hasBackupIssue = !!backupAlert;
  const barColor = hasCritical ? '#ef4444' : (hasBackupIssue ? '#f97316' : '#eab308');
  const bgGrad = hasCritical
    ? 'linear-gradient(90deg, #ef444420, #ef444408)'
    : hasBackupIssue ? 'linear-gradient(90deg, #f9731620, #f9731608)' : 'linear-gradient(90deg, #eab30820, #eab30808)';

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
          <span style={{ fontSize: 11, color: '#f97316', whiteSpace: 'nowrap', fontWeight: 600 }}>
            Backup: {backupAlert}
          </span>
        )}
        {topEvents.map(ev => (
          <span key={ev.id} style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ev.org_name || 'System'}: {typeof ev.type === 'string' ? ev.type.replace(/_/g, ' ').toLowerCase() : ''}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{connected ? '● Live' : '○ Polling'}</span>
    </div>
  );
}
