import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import DataTable from '../shared/DataTable.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

const PERIODS = [
  { v: '1', l: 'Today', days: 1 },
  { v: '7', l: 'Week', days: 7 },
  { v: '30', l: 'Month', days: 30 },
];

export default function AnalyticsView() {
  const [period, setPeriod] = useState('30');
  const [metrics, setMetrics] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [visitors, setVisitors] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fmApi.getPlatformMetrics(parseInt(period)).catch(() => null),
      fmApi.getRevenue().catch(() => null),
      fmApi.getVisitorStats().catch(() => null),
    ]).then(([m, r, v]) => {
      setMetrics(Array.isArray(m?.metrics) ? m.metrics : []);
      setRevenue(r);
      setVisitors(v);
      setLoading(false);
    });
  }, [period]);

  const fmt = n => `EUR ${safeNum(n).toLocaleString('de-DE')}`;
  const mrr = safeNum(revenue?.mrr);
  const countByStatus = (revenue?.countByStatus && typeof revenue.countByStatus === 'object') ? revenue.countByStatus : {};

  const totalLeads = metrics.reduce((s, m) => s + safeNum(m.new_patients), 0);
  const totalMessages = metrics.reduce((s, m) => s + safeNum(m.messages_sent), 0);

  // Visitor data
  const visitorCount = period === '1' ? safeNum(visitors?.today) : period === '7' ? safeNum(visitors?.week) : safeNum(visitors?.month);
  const topPages = Array.isArray(visitors?.topPages) ? visitors.topPages : [];
  const countries = Array.isArray(visitors?.countries) ? visitors.countries : [];
  const topReferrers = Array.isArray(visitors?.topReferrers) ? visitors.topReferrers : [];
  const languages = Array.isArray(visitors?.languages) ? visitors.languages : [];

  const pageColumns = [
    { key: 'path', label: 'Page', render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{safeStr(v)}</span> },
    { key: 'views', label: 'Views', render: v => safeNum(v) },
    { key: 'visitors', label: 'Visitors', render: v => safeNum(v) },
  ];

  const countryColumns = [
    { key: 'country', label: 'Country', render: v => safeStr(v) },
    { key: 'visitors', label: 'Visitors', render: v => safeNum(v) },
  ];

  const referrerColumns = [
    { key: 'referrer', label: 'Referrer', render: v => <span style={{ fontSize: 12 }}>{safeStr(v, 'Direct')}</span> },
    { key: 'visitors', label: 'Visitors', render: v => safeNum(v) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Analytics</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {PERIODS.map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              style={{ background: period === p.v ? '#ff8a2a' : 'var(--bg-card)', color: period === p.v ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div> : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            <StatCard label="MRR" value={fmt(mrr / 100)} color="green" sub={`${safeNum(countByStatus.active)} active subs`} />
            <StatCard label="Visitors" value={visitorCount} color="blue" sub={`Last ${period}d`} />
            <StatCard label="New Leads" value={totalLeads} color="purple" sub={`Last ${period}d`} />
            <StatCard label="Messages" value={totalMessages} color="orange" sub={`Last ${period}d`} />
          </div>

          {/* Daily Activity Bar Chart */}
          <h2 style={sectionH}>Daily Activity</h2>
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

          {/* Tables Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div>
              <h2 style={sectionH}>Top Pages</h2>
              <DataTable columns={pageColumns} data={topPages.slice(0, 10)} emptyText="No page data" />
            </div>
            <div>
              <h2 style={sectionH}>Countries</h2>
              <DataTable columns={countryColumns} data={countries.slice(0, 10)} emptyText="No country data" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div>
              <h2 style={sectionH}>Top Referrers</h2>
              <DataTable columns={referrerColumns} data={topReferrers.slice(0, 10)} emptyText="No referrer data" />
            </div>
            <div>
              <h2 style={sectionH}>Languages</h2>
              <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 16 }}>
                {languages.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No language data</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {languages.slice(0, 10).map((l, i) => {
                      const langName = safeStr(l.language || l.code || l.name, 'Unknown');
                      const count = safeNum(l.visitors || l.count);
                      const totalLang = languages.reduce((s, x) => s + safeNum(x.visitors || x.count), 1);
                      const pct = Math.round((count / totalLang) * 100);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', width: 60 }}>{langName}</span>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#3b82f6' }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 40, textAlign: 'right' }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subscriptions Breakdown */}
          <h2 style={sectionH}>Subscriptions</h2>
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

const sectionH = { fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 };
