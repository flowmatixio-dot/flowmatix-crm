import React, { useState, useEffect, useCallback } from 'react';
import StatCard from '../shared/StatCard.jsx';
import { safe, safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

export default function MonitoringView({ actions }) {
  const [infra, setInfra] = useState(null);
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      fmApi.getInfrastructure().catch(() => null),
      fmApi.getInfraDatabase().catch(() => null),
    ]).then(([i, d]) => {
      setInfra(i);
      setDb(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const { clinics = [] } = actions || {};
  const containers = Array.isArray(infra?.containers) ? infra.containers : [];

  // CPU/memory/disk might be objects like {usage:45} — handle both
  const extractPct = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'object' && val !== null) {
      for (const key of ['usage', 'value', 'percent', 'pct']) {
        if (typeof val[key] === 'number') return val[key];
      }
    }
    if (typeof val === 'string') { const n = parseFloat(val); if (!isNaN(n)) return n; }
    return 0;
  };

  const cpuVal = extractPct(infra?.cpu);
  const memVal = extractPct(infra?.memory);
  const diskVal = extractPct(infra?.disk);
  const uptimeVal = safeNum(infra?.uptimeSeconds);

  // Database info
  const dbSize = safeStr(db?.databaseSize, '---');
  const dbConns = safeNum(db?.activeConnections);
  const topTables = Array.isArray(db?.topTables) ? db.topTables : [];

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  const formatUptime = (seconds) => {
    if (!seconds) return '---';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    if (d > 0) return `${d}d ${h}h`;
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Monitoring</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: '#10b981', boxShadow: '0 0 8px #10b98160' }} />
          <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Auto-refresh 30s</span>
        </div>
      </div>

      {/* System Stats */}
      <h2 style={sectionH}>System</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="CPU" value={cpuVal ? `${cpuVal.toFixed(1)}%` : '---'} color={cpuVal > 80 ? 'red' : cpuVal > 60 ? 'orange' : 'green'} />
        <StatCard label="Memory" value={memVal ? `${memVal.toFixed(1)}%` : '---'} color={memVal > 80 ? 'red' : memVal > 60 ? 'orange' : 'green'} />
        <StatCard label="Disk" value={diskVal ? `${diskVal.toFixed(1)}%` : '---'} color={diskVal > 85 ? 'red' : diskVal > 70 ? 'orange' : 'green'} />
        <StatCard label="Uptime" value={formatUptime(uptimeVal)} color="blue" />
      </div>

      {/* Containers Grid */}
      <h2 style={sectionH}>Containers ({containers.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 28 }}>
        {containers.map((c, i) => {
          const name = safeStr(c?.name || c?.Names, 'unknown');
          const status = safeStr(c?.status, 'unknown');
          const isRunning = status === 'running' || status.startsWith('Up');
          const mem = typeof c?.memory === 'string' ? c.memory : null;
          return (
            <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '12px 16px', borderLeft: `3px solid ${isRunning ? '#10b981' : '#ef4444'}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: 11, color: isRunning ? '#10b981' : '#ef4444', marginTop: 4 }}>
                {isRunning ? 'Running' : status}
              </div>
              {mem && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{mem}</div>}
            </div>
          );
        })}
        {containers.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>No container data</div>}
      </div>

      {/* Database Section */}
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
                  <span style={{ color: 'var(--text-muted)' }}>{safeStr(t.size || t.total_size, '---')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Integration Status */}
      <h2 style={sectionH}>Integration Status</h2>
      <div style={{ background: 'var(--bg-card)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Clinic', 'WhatsApp', 'Google Cal', 'Automations', 'Readiness'].map(h => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clinics.map(c => {
              const waOk = c.whatsapp_connected === true;
              const gcOk = c.google_connected === true;
              const wf = safeNum(c.active_workflows);
              const rd = safeNum(c.readiness_score);
              return (
                <tr key={c.id}>
                  <td style={td}><span style={{ fontWeight: 600 }}>{safeStr(c.name)}</span></td>
                  <td style={td}><span style={{ color: waOk ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 600 }}>{waOk ? 'OK' : 'Missing'}</span></td>
                  <td style={td}><span style={{ color: gcOk ? '#10b981' : '#6b7280', fontSize: 12, fontWeight: 600 }}>{gcOk ? 'OK' : '---'}</span></td>
                  <td style={td}><span style={{ fontSize: 12, color: wf > 0 ? '#10b981' : '#6b7280' }}>{wf} active</span></td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 40, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ width: `${rd}%`, height: '100%', borderRadius: 3, background: rd === 100 ? '#10b981' : rd >= 50 ? '#eab308' : '#ef4444' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: rd === 100 ? '#10b981' : rd >= 50 ? '#eab308' : '#ef4444' }}>{rd}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {clinics.length === 0 && (
              <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>No clinics</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const sectionH = { fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 };
const td = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)' };
