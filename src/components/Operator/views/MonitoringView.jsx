import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import { safe, safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

export default function MonitoringView({ actions }) {
  const [infra, setInfra] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fmApi.getInfrastructure?.().then(setInfra).catch(() => {}).finally(() => setLoading(false));
    const iv = setInterval(() => {
      fmApi.getInfrastructure?.().then(setInfra).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const { clinics = [] } = actions || {};
  const containers = Array.isArray(infra?.containers) ? infra.containers : [];
  const cpuVal = safeNum(infra?.cpu);
  const memVal = safeNum(infra?.memory);
  const diskVal = safeNum(infra?.disk);
  const uptimeVal = safeNum(infra?.uptimeSeconds);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 20px' }}>Monitoring</h1>

      <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>System</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="CPU" value={cpuVal ? `${cpuVal}%` : '—'} color={cpuVal > 80 ? 'red' : 'green'} />
        <StatCard label="Memory" value={memVal ? `${memVal}%` : '—'} color={memVal > 80 ? 'red' : 'green'} />
        <StatCard label="Disk" value={diskVal ? `${diskVal}%` : '—'} color={diskVal > 85 ? 'red' : 'green'} />
        <StatCard label="Uptime" value={uptimeVal ? `${Math.floor(uptimeVal / 86400)}d` : '—'} color="blue" />
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>Containers</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200, 1fr))', gap: 10, marginBottom: 28 }}>
        {containers.map((c, i) => {
          const name = safeStr(c?.name || c?.Names, 'unknown');
          const status = safeStr(c?.status, 'unknown');
          const mem = typeof c?.memory === 'string' ? c.memory : null;
          return (
            <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '12px 16px', borderLeft: `3px solid ${status === 'running' ? '#10b981' : '#ef4444'}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</div>
              <div style={{ fontSize: 11, color: status === 'running' ? '#10b981' : '#ef4444', marginTop: 4 }}>
                {status === 'running' ? '● Running' : `○ ${status}`}
              </div>
              {mem && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{mem}</div>}
            </div>
          );
        })}
        {containers.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>No container data</div>}
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>Integration Status</h2>
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
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{safeStr(c.name)}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: waOk ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 600 }}>{waOk ? '● OK' : '○ Missing'}</span>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: gcOk ? '#10b981' : '#6b7280', fontSize: 12, fontWeight: 600 }}>{gcOk ? '● OK' : '○ —'}</span>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 12, color: wf > 0 ? '#10b981' : '#6b7280' }}>{wf} active</span>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: rd === 100 ? '#10b981' : rd >= 50 ? '#eab308' : '#ef4444' }}>{rd}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
