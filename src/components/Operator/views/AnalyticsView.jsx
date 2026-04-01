import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

export default function AnalyticsView() {
  const [period, setPeriod] = useState('30');
  const [metrics, setMetrics] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fmApi.getPlatformMetrics?.(parseInt(period)).catch(() => null),
      fmApi.getRevenue?.().catch(() => null),
    ]).then(([m, r]) => {
      setMetrics(Array.isArray(m?.metrics) ? m.metrics : []);
      setRevenue(r);
      setLoading(false);
    });
  }, [period]);

  const fmt = n => `€${safeNum(n).toLocaleString('de-DE')}`;
  const mrr = safeNum(revenue?.mrr);
  const countByStatus = (revenue?.countByStatus && typeof revenue.countByStatus === 'object') ? revenue.countByStatus : {};

  const totalLeads = metrics.reduce((s, m) => s + safeNum(m.new_patients), 0);
  const totalBookings = metrics.reduce((s, m) => s + safeNum(m.new_appointments), 0);
  const totalMessages = metrics.reduce((s, m) => s + safeNum(m.messages_sent), 0);

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
            <StatCard label="MRR" value={fmt(mrr / 100)} color="green" sub={`${safeNum(countByStatus.active)} active subs`} />
            <StatCard label="New Leads" value={totalLeads} color="blue" sub={`Last ${period}d`} />
            <StatCard label="Bookings" value={totalBookings} color="purple" sub={`Last ${period}d`} />
            <StatCard label="Messages" value={totalMessages} color="orange" sub={`Last ${period}d`} />
          </div>

          <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>Daily Activity</h2>
          <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 20, marginBottom: 28 }}>
            {metrics.length > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
                  {metrics.slice(-30).map((m, i) => {
                    const maxMsg = Math.max(1, ...metrics.slice(-30).map(d => safeNum(d.messages_sent, 1)));
                    const h = Math.max(4, (safeNum(m.messages_sent) / maxMsg) * 100);
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '100%', maxWidth: 16, height: h, background: '#3b82f6', borderRadius: '3px 3px 0 0', opacity: 0.8 }}
                          title={`${safeStr(m.day)}: ${safeNum(m.messages_sent)} messages`} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{safeStr(metrics[0]?.day, '').slice(5)}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{safeStr(metrics[metrics.length - 1]?.day, '').slice(5)}</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No metrics data</div>
            )}
          </div>

          <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>Subscriptions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {Object.entries(countByStatus).map(([status, count]) => (
              <div key={status} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '14px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{safeNum(count)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 4 }}>{safeStr(status)}</div>
              </div>
            ))}
            {Object.keys(countByStatus).length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No subscription data</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
