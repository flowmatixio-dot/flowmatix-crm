import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import * as fmApi from '../../../api/client.js';

export default function AnalyticsView() {
  const [period, setPeriod] = useState('30');
  const [metrics, setMetrics] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fmApi.getPlatformMetrics?.(parseInt(period)).catch(() => null),
      fmApi.getRevenue?.().catch(() => null),
      fmApi.getPlatformStats?.().catch(() => null),
    ]).then(([m, r, s]) => { setMetrics(m?.metrics || []); setRevenue(r); setStats(s); setLoading(false); });
  }, [period]);

  const fmt = n => typeof n === 'number' ? `€${n.toLocaleString('de-DE')}` : '—';
  const mrr = revenue?.mrr || 0;
  const countByStatus = revenue?.countByStatus || {};

  // Compute totals from metrics
  const totalLeads = metrics.reduce((s, m) => s + (m.new_patients || 0), 0);
  const totalBookings = metrics.reduce((s, m) => s + (m.new_appointments || 0), 0);
  const totalMessages = metrics.reduce((s, m) => s + (m.messages_sent || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Analytics</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ v: '1', l: 'Today' }, { v: '7', l: 'Week' }, { v: '30', l: 'Month' }].map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              style={{ background: period === p.v ? '#ff8a2a' : 'var(--bg-card)', color: period === p.v ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            <StatCard label="MRR" value={fmt(mrr / 100)} color="green" sub={`${countByStatus.active || 0} active subs`} />
            <StatCard label="New Leads" value={totalLeads} color="blue" sub={`Last ${period}d`} />
            <StatCard label="Bookings" value={totalBookings} color="purple" sub={`Last ${period}d`} />
            <StatCard label="Messages" value={totalMessages} color="orange" sub={`Last ${period}d`} />
          </div>

          {/* Daily chart (simple bar visualization) */}
          <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>Daily Activity</h2>
          <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 20, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
              {metrics.slice(-30).map((m, i) => {
                const maxMsg = Math.max(...metrics.slice(-30).map(d => d.messages_sent || 1));
                const h = Math.max(4, ((m.messages_sent || 0) / maxMsg) * 100);
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ width: '100%', maxWidth: 16, height: h, background: '#3b82f6', borderRadius: '3px 3px 0 0', opacity: 0.8 }}
                      title={`${m.day}: ${m.messages_sent || 0} messages`} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{metrics[0]?.day?.slice(5) || ''}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{metrics[metrics.length - 1]?.day?.slice(5) || ''}</span>
            </div>
          </div>

          {/* Subscription breakdown */}
          <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>Subscriptions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {Object.entries(countByStatus).map(([status, count]) => (
              <div key={status} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '14px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 4 }}>{status}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
