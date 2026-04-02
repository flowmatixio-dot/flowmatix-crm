import React, { useState, useEffect, useCallback } from 'react';
import StatCard from '../shared/StatCard.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import { normalizeInfra, normalizeClinics, clinicField } from '../shared/normalize.js';
import * as fmApi from '../../../api/client.js';

export default function MonitoringView({ actions }) {
  const [infra, setInfra] = useState(null);
  const [db, setDb] = useState(null);
  const [backup, setBackup] = useState(null);
  const [localClinics, setLocalClinics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fmApi.getInfrastructure().catch(e => { console.warn('Infra fetch failed:', e); return null; }),
      fmApi.getInfraDatabase?.().catch(() => null),
      fmApi.getPlatformClinics().catch(() => null),
      fmApi.getBackupStatus?.().catch(() => null),
    ]).then(([infraRes, dbRes, clinicsRes, backupRes]) => {
      // DEV logging removed for security
      setInfra(infraRes ? normalizeInfra(infraRes) : null);
      setDb(dbRes);
      setBackup(backupRes);
      setLocalClinics(normalizeClinics(clinicsRes));
      setLoading(false);
    }).catch(err => {
      console.error('Monitoring load failed:', err);
      setError(err?.message || 'Failed to load monitoring data');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  // Use clinics from actions prop (preferred) or local fetch (fallback)
  const clinics = (actions?.clinics?.length > 0) ? actions.clinics : (localClinics || []);

  // CPU: { pct, load1, load5, load15 }
  const cpu = infra?.cpu || {};
  // Memory/Disk: { pct, usedGB, totalGB, freeGB }
  const mem = infra?.memory || {};
  const disk = infra?.disk || {};
  const uptimeVal = infra?.uptimeSeconds;
  const containers = infra?.containers || [];

  // Database info
  const dbSize = safeStr(db?.databaseSize, '—');
  const dbConns = safeNum(db?.activeConnections);
  const topTables = Array.isArray(db?.topTables) ? db.topTables : [];

  const formatUptime = (seconds) => {
    if (!seconds || typeof seconds !== 'number') return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    if (d > 0) return `${d}d ${h}h`;
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const fmtPct = (v) => v !== null && v !== undefined && typeof v === 'number' ? `${v.toFixed(1)}%` : '—';
  const fmtGB = (v) => v !== null && v !== undefined && typeof v === 'number' ? `${v.toFixed(1)} GB` : '—';

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading monitoring data...</div>;

  if (error) return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 20px' }}>Monitoring</h1>
      <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 10, padding: 16, color: '#ef4444', fontSize: 13 }}>
        Failed to load: {error}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Monitoring</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: '#10b981', boxShadow: '0 0 8px #10b98160' }} />
          <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Auto-refresh 30s</span>
          <button onClick={load} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginLeft: 8 }}>Refresh</button>
        </div>
      </div>

      {/* System Stats */}
      <h2 style={sectionH}>System</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {/* CPU */}
        <MetricCard
          label="CPU"
          pct={cpu.pct}
          color={cpu.pct > 80 ? '#ef4444' : cpu.pct > 60 ? '#f97316' : '#10b981'}
          detail={cpu.load1 != null ? `Load: ${Number(cpu.load1).toFixed(2)} / ${Number(cpu.load5).toFixed(2)} / ${Number(cpu.load15).toFixed(2)}` : 'Current usage'}
        />
        {/* Memory */}
        <MetricCard
          label="Memory"
          pct={mem.pct}
          color={mem.pct > 80 ? '#ef4444' : mem.pct > 60 ? '#f97316' : '#10b981'}
          detail={mem.usedGB != null && mem.totalGB != null ? `${fmtGB(mem.usedGB)} / ${fmtGB(mem.totalGB)} used` : null}
          detail2={mem.freeGB != null ? `${fmtGB(mem.freeGB)} free` : null}
        />
        {/* Disk */}
        <MetricCard
          label="Disk"
          pct={disk.pct}
          color={disk.pct > 85 ? '#ef4444' : disk.pct > 70 ? '#f97316' : '#10b981'}
          detail={disk.usedGB != null && disk.totalGB != null ? `${fmtGB(disk.usedGB)} / ${fmtGB(disk.totalGB)} used` : null}
          detail2={disk.freeGB != null ? `${fmtGB(disk.freeGB)} free` : null}
        />
        {/* Uptime */}
        <StatCard label="Uptime" value={formatUptime(uptimeVal)} color="blue" />
      </div>

      {/* Containers */}
      <h2 style={sectionH}>Containers ({containers.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 28 }}>
        {containers.map((c, i) => {
          const isRunning = c.status === 'running';
          return (
            <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '12px 16px', borderLeft: `3px solid ${isRunning ? '#10b981' : '#ef4444'}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
              <div style={{ fontSize: 11, color: isRunning ? '#10b981' : '#ef4444', marginTop: 4 }}>
                {isRunning ? '● Running' : `○ ${c.status}`}
              </div>
              {c.instance && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{c.instance}</div>}
              {c.memory && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{c.memory}</div>}
            </div>
          );
        })}
        {containers.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, gridColumn: '1 / -1' }}>
            {infra ? 'No container data from Prometheus — check if node_exporter is configured' : 'Infrastructure API not available'}
          </div>
        )}
      </div>

      {/* Database */}
      {db && (
        <>
          <h2 style={sectionH}>Database</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <StatCard label="DB Size" value={dbSize} color="blue" />
              <StatCard label="Connections" value={dbConns} color={dbConns > 50 ? 'orange' : 'green'} />
            </div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.8 }}>Top Tables</h3>
              {topTables.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 10 }}>No table data</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topTables.slice(0, 8).map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{safeStr(t.table_name || t.name)}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{safeStr(t.size || t.total_size, '—')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Backups */}
      <BackupSection backup={backup} />

      {/* Integration Status */}
      <h2 style={sectionH}>Integration Status ({clinics.length} clinics)</h2>
      {clinics.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No clinic data available — check API connection
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Clinic', 'WhatsApp', 'Google Cal', 'Automations', 'Health'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clinics.map((c, i) => {
                const name = safeStr(clinicField(c, 'name'), `Clinic ${i + 1}`);
                const waOk = clinicField(c, 'whatsapp') === true;
                const gcOk = clinicField(c, 'google') === true;
                const wf = safeNum(c.active_workflows);
                const rd = safeNum(clinicField(c, 'readiness'));
                return (
                  <tr key={c.id || i}>
                    <td style={td}><span style={{ fontWeight: 600 }}>{name}</span></td>
                    <td style={td}><span style={{ color: waOk ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 600 }}>{waOk ? '● OK' : '○ Missing'}</span></td>
                    <td style={td}><span style={{ color: gcOk ? '#10b981' : '#6b7280', fontSize: 12, fontWeight: 600 }}>{gcOk ? '● OK' : '○ —'}</span></td>
                    <td style={td}><span style={{ fontSize: 12, color: wf > 0 ? '#10b981' : '#6b7280' }}>{wf} active</span></td>
                    <td style={td}><span style={{ fontSize: 12, fontWeight: 700, color: rd === 100 ? '#10b981' : rd >= 50 ? '#eab308' : rd > 0 ? '#ef4444' : 'var(--text-muted)' }}>{rd}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, pct, color, detail, detail2 }) {
  const hasPct = pct !== null && pct !== undefined && typeof pct === 'number';
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '20px 24px', borderTop: `3px solid ${color || '#3b82f6'}`, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: color || '#3b82f6', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
        {hasPct ? `${pct.toFixed(1)}%` : '—'}
      </div>
      {detail && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{detail}</div>}
      {detail2 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{detail2}</div>}
    </div>
  );
}

function BackupSection({ backup }) {
  if (!backup) return null;

  const lastAt = backup.lastBackupAt ? new Date(backup.lastBackupAt) : null;
  const hoursAgo = lastAt ? (Date.now() - lastAt.getTime()) / 3600000 : null;
  const isOverdue = hoursAgo === null || hoursAgo > 25;
  const isFailed = backup.error && !backup.lastBackupAt;
  const statusColor = isFailed ? '#ef4444' : isOverdue ? '#f97316' : '#10b981';
  const statusLabel = isFailed ? 'Failed' : isOverdue ? 'Overdue' : 'OK';
  const sizeStr = backup.lastBackupSize ? `${(backup.lastBackupSize / 1e6).toFixed(1)} MB` : '—';

  return (
    <>
      <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>Backups</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, borderLeft: `3px solid ${statusColor}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Database Backup</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: `${statusColor}15`, padding: '2px 8px', borderRadius: 4 }}>{statusLabel}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Last backup</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{lastAt ? lastAt.toLocaleString('de-DE') : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Age</span>
              <span style={{ color: hoursAgo && hoursAgo > 25 ? '#f97316' : 'var(--text-primary)', fontWeight: 600 }}>
                {hoursAgo !== null ? (hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? `${Math.floor(hoursAgo)}h ago` : `${Math.floor(hoursAgo / 24)}d ${Math.floor(hoursAgo % 24)}h ago`) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Size</span>
              <span style={{ color: 'var(--text-primary)' }}>{sizeStr}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Total backups</span>
              <span style={{ color: 'var(--text-primary)' }}>{safeNum(backup.totalBackups)}</span>
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Schedule & Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Schedule</span>
              <span style={{ color: 'var(--text-primary)' }}>{safeStr(backup.schedule, '—')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Target</span>
              <span style={{ color: 'var(--text-primary)' }}>Local + Server</span>
            </div>
          </div>
          {backup.recentLog && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Recent Log</div>
              <pre style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.02)', borderRadius: 6, padding: 8, margin: 0, whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'auto' }}>
                {safeStr(backup.recentLog)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const sectionH = { fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 };
const th = { padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textAlign: 'left' };
const td = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)' };
