import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StatCard from '../shared/StatCard.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import { normalizeInfra, normalizeClinics, clinicField } from '../shared/normalize.js';
import * as fmApi from '../../../api/client.js';

export default function MonitoringView({ actions }) {
  const [infra, setInfra] = useState(null);
  const [db, setDb] = useState(null);
  const [backup, setBackup] = useState(null);
  const [r2, setR2] = useState(null);
  const [queueStats, setQueueStats] = useState(null);
  const [localClinics, setLocalClinics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    Promise.all([
      fmApi.getInfrastructure().catch(() => null),
      fmApi.getInfraDatabase?.().catch(() => null),
      fmApi.getPlatformClinics().catch(() => null),
      fmApi.getBackupStatus?.().catch(() => null),
      fmApi.getQueueStats?.().catch(() => null),
      fmApi.getR2Stats?.().catch(() => null),
    ]).then(([infraRes, dbRes, clinicsRes, backupRes, queueRes, r2Res]) => {
      setInfra(infraRes ? normalizeInfra(infraRes) : null);
      setDb(dbRes);
      setLocalClinics(normalizeClinics(clinicsRes));
      setBackup(backupRes);
      setR2(r2Res);
      setQueueStats(queueRes);
      setLoading(false);
    }).catch(err => { setError(err?.message || 'Failed'); setLoading(false); });
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  const clinics = (actions?.clinics?.length > 0) ? actions.clinics : (localClinics || []);
  const cpu = infra?.cpu || {};
  const mem = infra?.memory || {};
  const disk = infra?.disk || {};
  const containers = infra?.containers || [];
  const queues = Array.isArray(queueStats?.queues) ? queueStats.queues : [];

  // ── Global Health Calculation ──
  const globalStatus = useMemo(() => {
    const issues = [];
    // WA disconnected clinics
    const waDown = clinics.filter(c => c.required_action === 'FIX_ERROR' || c.required_action === 'CONNECT_WHATSAPP');
    if (waDown.length > 0) issues.push({ level: 'red', msg: `${waDown.length} clinic${waDown.length > 1 ? 's' : ''} WA not connected` });
    // Queue backlog
    const totalFailed = queues.reduce((s, q) => s + safeNum(q.failed), 0);
    const totalPending = queues.reduce((s, q) => s + safeNum(q.pending), 0);
    if (totalFailed > 0) issues.push({ level: 'red', msg: `${totalFailed} failed queue jobs` });
    else if (totalPending > 50) issues.push({ level: 'yellow', msg: `${totalPending} pending queue jobs` });
    // Backup
    if (backup?.lastBackupAt) {
      const hoursAgo = (Date.now() - new Date(backup.lastBackupAt).getTime()) / 3600000;
      if (hoursAgo > 25) issues.push({ level: 'yellow', msg: `Backup ${Math.floor(hoursAgo)}h old` });
    }
    // CPU/Memory
    const cpuPct = typeof cpu === 'number' ? cpu : cpu?.pct;
    const memPct = typeof mem === 'number' ? mem : mem?.pct;
    if (cpuPct > 90) issues.push({ level: 'red', msg: `CPU at ${cpuPct?.toFixed(1)}%` });
    else if (cpuPct > 75) issues.push({ level: 'yellow', msg: `CPU at ${cpuPct?.toFixed(1)}%` });
    if (memPct > 90) issues.push({ level: 'red', msg: `Memory at ${memPct?.toFixed(1)}%` });

    const hasRed = issues.some(i => i.level === 'red');
    const hasYellow = issues.some(i => i.level === 'yellow');
    return { status: hasRed ? 'red' : hasYellow ? 'yellow' : 'green', issues };
  }, [clinics, queues, backup, cpu, mem]);

  const cpuPct = typeof cpu === 'number' ? cpu : cpu?.pct;
  const memPct = typeof mem === 'number' ? mem : mem?.pct;
  const diskPct = typeof disk === 'number' ? disk : disk?.pct;
  const uptimeVal = infra?.uptimeSeconds;

  const fmtPct = v => v != null && typeof v === 'number' ? `${v.toFixed(1)}%` : '—';
  const fmtGB = v => v != null && typeof v === 'number' ? `${v.toFixed(1)} GB` : '—';
  const formatUptime = s => { if (!s) return '—'; const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600); return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((s % 3600) / 60)}m`; };

  // Backup
  const backupAge = backup?.lastBackupAt ? (Date.now() - new Date(backup.lastBackupAt).getTime()) / 3600000 : null;
  const backupOk = backupAge !== null && backupAge < 25;

  // DB
  const dbSize = safeStr(db?.databaseSize, '—');
  const dbConns = safeNum(db?.activeConnections);
  const topTables = Array.isArray(db?.topTables) ? db.topTables : [];

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  const statusColors = { green: '#10b981', yellow: '#eab308', red: '#ef4444' };
  const sc = statusColors[globalStatus.status];

  return (
    <div>
      {/* Global Status Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderRadius: 12, marginBottom: 20, background: `${sc}08`, border: `1px solid ${sc}25` }}>
        <span style={{ width: 10, height: 10, borderRadius: 99, background: sc, boxShadow: `0 0 10px ${sc}`, animation: globalStatus.status === 'red' ? 'fmPulse 2s infinite' : 'none', flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: sc }}>
          {globalStatus.status === 'green' ? 'All Systems Operational' : globalStatus.status === 'yellow' ? 'Degraded Performance' : 'Critical Issues Detected'}
        </span>
        {globalStatus.issues.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginLeft: 16, flex: 1, overflow: 'hidden' }}>
            {globalStatus.issues.map((iss, i) => (
              <span key={i} style={{ fontSize: 11, color: statusColors[iss.level], whiteSpace: 'nowrap' }}>{iss.msg}</span>
            ))}
          </div>
        )}
        <button onClick={load} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, padding: '4px 10px', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>Refresh</button>
      </div>

      {/* Business Health */}
      <h2 style={secH}>Business Health</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginBottom: 24 }}>
        {clinics.map(c => {
          const health = safeNum(c.readiness_score);
          const waOk = c.whatsapp_connected === true;
          const gcOk = c.google_connected === true;
          const wf = safeNum(c.active_workflows);
          const hasError = c.has_recent_error || c.required_action === 'FIX_ERROR';
          const borderColor = health > 80 ? '#10b981' : health >= 50 ? '#eab308' : '#ef4444';
          return (
            <div key={c.id} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '16px 18px', borderLeft: `3px solid ${borderColor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{safeStr(c.name)}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: borderColor }}>{health}%</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <HealthLine label="WhatsApp" ok={waOk} detail={waOk ? 'Connected' : 'Not connected (-40)'} />
                <HealthLine label="Google Cal" ok={gcOk} detail={gcOk ? 'Connected' : 'Missing (-10)'} />
                <HealthLine label="Automations" ok={wf > 0} detail={wf > 0 ? `${wf} active` : 'None (-10)'} />
                <HealthLine label="Errors" ok={!hasError} detail={hasError ? 'Active errors (-20)' : 'None'} />
              </div>
            </div>
          );
        })}
        {clinics.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>No clinic data</div>}
      </div>

      {/* System Metrics */}
      <h2 style={secH}>System</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <MetricCard label="CPU" pct={cpuPct} detail={infra?.load ? `Load: ${Number(infra.load.load1 || 0).toFixed(2)} / ${Number(infra.load.load5 || 0).toFixed(2)}` : null} />
        <MetricCard label="Memory" pct={memPct} detail={mem?.usedGB != null ? `${fmtGB(mem.usedGB)} / ${fmtGB(mem.totalGB)}` : null} sub={mem?.freeGB != null ? `${fmtGB(mem.freeGB)} free` : null} />
        <MetricCard label="Disk" pct={diskPct} detail={disk?.usedGB != null ? `${fmtGB(disk.usedGB)} / ${fmtGB(disk.totalGB)}` : null} sub={disk?.freeGB != null ? `${fmtGB(disk.freeGB)} free` : null} />
        <MetricCard label="Uptime" value={formatUptime(uptimeVal)} color="#3b82f6" />
      </div>

      {/* Containers */}
      <h2 style={secH}>Containers ({containers.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 24 }}>
        {containers.map((c, i) => {
          const on = c.status === 'running';
          return (
            <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 14px', borderLeft: `3px solid ${on ? '#10b981' : '#ef4444'}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
              <div style={{ fontSize: 11, color: on ? '#10b981' : '#ef4444', marginTop: 3 }}>{on ? 'Running' : c.status}</div>
              {c.memory && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{c.memory}</div>}
            </div>
          );
        })}
        {containers.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No container data</div>}
      </div>

      {/* Queue Health + Backup side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Queues */}
        <div>
          <h2 style={secH}>Queue Health</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {queues.map((q, i) => {
              const f = safeNum(q.failed), p = safeNum(q.pending);
              const c = f > 0 ? '#ef4444' : p > 10 ? '#f97316' : '#10b981';
              return (
                <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 14px', borderLeft: `3px solid ${c}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{safeStr(q.name)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p} pending · <span style={{ color: f > 0 ? '#ef4444' : 'inherit', fontWeight: f > 0 ? 700 : 400 }}>{f} failed</span></span>
                </div>
              );
            })}
            {queues.length === 0 && <div style={{ color: '#10b981', fontSize: 13, padding: 10 }}>All queues clear — no backlog</div>}
          </div>
        </div>

        {/* Backup + Database */}
        <div>
          <h2 style={secH}>Backup, Database & Storage</h2>
          <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 16, borderLeft: `3px solid ${backupOk ? '#10b981' : '#f97316'}`, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Backup</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: backupOk ? '#10b981' : '#f97316', background: backupOk ? '#10b98115' : '#f9731615', padding: '2px 8px', borderRadius: 4 }}>{backupOk ? 'OK' : 'Check'}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Last: {backup?.lastBackupAt ? new Date(backup.lastBackupAt).toLocaleString('de-DE') : '—'} ({backupAge != null ? (backupAge < 1 ? 'just now' : `${Math.floor(backupAge)}h ago`) : '—'})
            </div>
            {backup?.lastBackupSize && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Size: {(backup.lastBackupSize / 1e6).toFixed(0)} MB</div>}
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Database</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Size</span><span style={{ color: 'var(--text-primary)' }}>{dbSize}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Connections</span><span style={{ color: dbConns > 50 ? '#f97316' : 'var(--text-primary)' }}>{dbConns}</span>
            </div>
            {topTables.length > 0 && (
              <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                {topTables.slice(0, 5).map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: 'var(--text-muted)' }}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{safeStr(t.table_name || t.name)}</span>
                    <span>{safeStr(t.size || t.total_size, '—')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* R2 Storage */}
      {r2 && r2.configured !== false && <R2Card r2={r2} />}

      {/* Integration Status */}
      <h2 style={secH}>Integration Status</h2>
      <div style={{ background: 'var(--bg-card)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Clinic', 'WhatsApp', 'Google Cal', 'Automations', 'Health'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {clinics.map(c => {
              const waOk = c.whatsapp_connected === true;
              const gcOk = c.google_connected === true;
              const wf = safeNum(c.active_workflows);
              const rd = safeNum(c.readiness_score);
              return (
                <tr key={c.id}>
                  <td style={td}><span style={{ fontWeight: 600 }}>{safeStr(clinicField(c, 'name'))}</span></td>
                  <td style={td}><span style={{ color: waOk ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 600 }}>{waOk ? '● OK' : '● Missing'}</span></td>
                  <td style={td}><span style={{ color: gcOk ? '#10b981' : '#6b7280', fontSize: 12, fontWeight: 600 }}>{gcOk ? '● OK' : '○ —'}</span></td>
                  <td style={td}><span style={{ fontSize: 12, color: wf > 0 ? '#10b981' : '#6b7280' }}>{wf} active</span></td>
                  <td style={td}><span style={{ fontSize: 12, fontWeight: 700, color: rd > 80 ? '#10b981' : rd >= 50 ? '#eab308' : '#ef4444' }}>{rd}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HealthLine({ label, ok, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: ok ? '#10b981' : '#ef4444', flexShrink: 0 }} />
      <span style={{ color: 'var(--text-muted)', width: 80 }}>{label}</span>
      <span style={{ color: ok ? '#10b981' : '#ef4444', fontWeight: 600 }}>{detail}</span>
    </div>
  );
}

function MetricCard({ label, pct, detail, sub, value, color }) {
  const hasPct = pct != null && typeof pct === 'number';
  const c = color || (hasPct ? (pct > 80 ? '#ef4444' : pct > 60 ? '#f97316' : '#10b981') : '#3b82f6');
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '18px 22px', borderTop: `3px solid ${c}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: c, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value || (hasPct ? `${pct.toFixed(1)}%` : '—')}</div>
      {detail && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{detail}</div>}
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function R2Card({ r2 }) {
  const totalGB = r2.totalSize ? (r2.totalSize / 1e9).toFixed(2) : 0;
  const limitGB = 10; // R2 free tier = 10GB
  const pct = totalGB > 0 ? Math.min(100, (totalGB / limitGB) * 100) : 0;
  const color = pct > 85 ? '#ef4444' : pct > 70 ? '#eab308' : '#10b981';
  const isCritical = pct > 85;
  const isWarning = pct > 70;

  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>Media Storage (R2)</h2>
      {isCritical && (
        <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 10, background: '#ef444412', border: '1px solid #ef444430', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: '#ef4444', animation: 'fmPulse 2s infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>R2 storage nearly full — uploads may fail</span>
        </div>
      )}
      {isWarning && !isCritical && (
        <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 10, background: '#eab30812', border: '1px solid #eab30830' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#eab308' }}>Storage usage above 70%</span>
        </div>
      )}
      <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 16, borderLeft: `3px solid ${color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Cloudflare R2</span>
          <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}15`, padding: '2px 8px', borderRadius: 4 }}>
            {pct.toFixed(0)}%
          </span>
        </div>
        {/* Usage bar */}
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', marginBottom: 10 }}>
          <div style={{ height: '100%', borderRadius: 3, background: color, width: `${pct}%`, transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Used</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{totalGB} GB / {limitGB} GB</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Files</span>
          <span style={{ color: 'var(--text-primary)' }}>{safeNum(r2.totalFiles).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Bucket</span>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{safeStr(r2.bucket, '—')}</span>
        </div>
        {r2.error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 8 }}>Error: {safeStr(r2.error)}</div>}
      </div>
    </div>
  );
}

const secH = { fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 };
const th = { padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textAlign: 'left' };
const td = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)' };
