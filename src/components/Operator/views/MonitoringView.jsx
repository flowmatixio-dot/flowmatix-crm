import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import * as fmApi from '../../../api/client.js';

export default function MonitoringView({ actions }) {
  const [infra, setInfra] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fmApi.getInfrastructure?.().catch(() => null),
      fmApi.getPlatformOverview?.().catch(() => null),
    ]).then(([i, o]) => { setInfra(i); setOverview(o); setLoading(false); });
    const iv = setInterval(() => {
      fmApi.getInfrastructure?.().then(setInfra).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const { clinics = [] } = actions || {};
  const containers = infra?.containers || [];

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 20px' }}>Monitoring</h1>

      {/* System metrics */}
      <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>System</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="CPU" value={infra?.cpu ? `${infra.cpu}%` : '—'} color={infra?.cpu > 80 ? 'red' : 'green'} />
        <StatCard label="Memory" value={infra?.memory ? `${infra.memory}%` : '—'} color={infra?.memory > 80 ? 'red' : 'green'} />
        <StatCard label="Disk" value={infra?.disk ? `${infra.disk}%` : '—'} color={infra?.disk > 85 ? 'red' : 'green'} />
        <StatCard label="Uptime" value={infra?.uptimeSeconds ? `${Math.floor(infra.uptimeSeconds / 86400)}d` : '—'} color="blue" />
      </div>

      {/* Containers */}
      <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>Containers</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200, 1fr))', gap: 10, marginBottom: 28 }}>
        {containers.map((c, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '12px 16px', borderLeft: `3px solid ${c.status === 'running' ? '#10b981' : '#ef4444'}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name || c.Names}</div>
            <div style={{ fontSize: 11, color: c.status === 'running' ? '#10b981' : '#ef4444', marginTop: 4 }}>
              {c.status === 'running' ? '● Running' : `○ ${c.status}`}
            </div>
            {c.memory && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{c.memory}</div>}
          </div>
        ))}
      </div>

      {/* Business Health — integrations per clinic */}
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
            {clinics.map(c => (
              <tr key={c.id}>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{c.name}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: c.whatsapp_connected ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 600 }}>{c.whatsapp_connected ? '● OK' : '○ Missing'}</span>
                </td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: c.google_connected ? '#10b981' : '#6b7280', fontSize: 12, fontWeight: 600 }}>{c.google_connected ? '● OK' : '○ —'}</span>
                </td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 12, color: c.active_workflows > 0 ? '#10b981' : '#6b7280' }}>{c.active_workflows || 0} active</span>
                </td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.readiness_score === 100 ? '#10b981' : c.readiness_score >= 50 ? '#eab308' : '#ef4444' }}>{c.readiness_score}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
