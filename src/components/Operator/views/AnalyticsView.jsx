import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import DataTable from '../shared/DataTable.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

export default function AnalyticsView() {
  const [period, setPeriod] = useState('30');
  const [metrics, setMetrics] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [visitors, setVisitors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fmApi.getPlatformMetrics(parseInt(period)).catch(() => null),
      fmApi.getRevenue().catch(() => null),
      fmApi.getVisitorStats().catch(e => { console.warn('Visitor stats failed:', e); return null; }),
    ]).then(([m, r, v]) => {
      if (import.meta.env.DEV) {
        console.log('ANALYTICS metrics:', m);
        console.log('ANALYTICS revenue:', r);
        console.log('ANALYTICS visitors:', v);
      }
      setMetrics(Array.isArray(m?.metrics) ? m.metrics : []);
      setRevenue(r);
      setVisitors(v);
      setLoading(false);
    }).catch(err => {
      console.error('Analytics load failed:', err);
      setError(err?.message || 'Failed');
      setLoading(false);
    });
  }, [period]);

  const fmt = n => `€${safeNum(n).toLocaleString('de-DE')}`;
  const mrr = safeNum(revenue?.mrr);
  const countByStatus = (revenue?.countByStatus && typeof revenue.countByStatus === 'object') ? revenue.countByStatus : {};

  const totalLeads = metrics.reduce((s, m) => s + safeNum(m.new_patients), 0);
  const totalMessages = metrics.reduce((s, m) => s + safeNum(m.messages_sent), 0);

  // Visitor data — API returns { today: {visitors,views}, week: {}, month: {}, topPages: [], daily: [], countries: [], topReferrers: [], languages: [] }
  const visitorCount = period === '1' ? safeNum(visitors?.today?.visitors) : period === '7' ? safeNum(visitors?.week?.visitors) : safeNum(visitors?.month?.visitors);
  const viewCount = period === '1' ? safeNum(visitors?.today?.views) : period === '7' ? safeNum(visitors?.week?.views) : safeNum(visitors?.month?.views);

  // topPages: [{ url, views, visitors }]
  const topPages = Array.isArray(visitors?.topPages) ? visitors.topPages : [];
  // daily: [{ date, views, visitors }]
  const daily = Array.isArray(visitors?.daily) ? visitors.daily : [];
  // countries: [{ country, visitors }]
  const countries = Array.isArray(visitors?.countries) ? visitors.countries : [];
  // topReferrers: [{ referrer, count }]
  const topReferrers = Array.isArray(visitors?.topReferrers) ? visitors.topReferrers : [];
  // languages: [{ language, count }]
  const languages = Array.isArray(visitors?.languages) ? visitors.languages : [];

  const pageColumns = [
    { key: 'url', label: 'Page', render: v => {
      const path = typeof v === 'string' ? v.replace(/^https?:\/\/[^/]+/, '') || '/' : safeStr(v);
      return <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{path}</span>;
    }},
    { key: 'views', label: 'Views', render: v => safeNum(v) },
    { key: 'visitors', label: 'Visitors', render: v => safeNum(v) },
  ];

  const countryColumns = [
    { key: 'country', label: 'Country', render: v => safeStr(v, 'Unknown') },
    { key: 'visitors', label: 'Visitors', render: v => safeNum(v) },
  ];

  const referrerColumns = [
    { key: 'referrer', label: 'Referrer', render: v => {
      const ref = typeof v === 'string' ? v : safeStr(v);
      const short = ref.length > 50 ? ref.slice(0, 47) + '...' : ref;
      return <span style={{ fontSize: 12 }}>{short || 'Direct'}</span>;
    }},
    { key: 'count', label: 'Visits', render: v => safeNum(v) },
  ];

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

      {error && (
        <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 10, padding: 12, marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading analytics...</div> : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            <StatCard label="MRR" value={fmt(mrr / 100)} color="green" sub={`${safeNum(countByStatus.active)} active subs`} />
            <StatCard label="Visitors" value={visitorCount} color="blue" sub={`${viewCount} page views`} />
            <StatCard label="New Leads" value={totalLeads} color="purple" sub={`Last ${period}d`} />
            <StatCard label="Messages" value={totalMessages} color="orange" sub={`Last ${period}d`} />
          </div>

          {/* Daily Activity Bar Chart — from visitors.daily */}
          <h2 style={sectionH}>Daily Activity (last 14 days)</h2>
          <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 20, marginBottom: 28 }}>
            {daily.length > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
                  {daily.map((d, i) => {
                    const maxViews = Math.max(1, ...daily.map(x => safeNum(x.views || x.visitors, 1)));
                    const h = Math.max(4, (safeNum(d.views || d.visitors) / maxViews) * 100);
                    const dateStr = typeof d.date === 'string' ? d.date.slice(5, 10) : typeof d.day === 'string' ? d.day.slice(5, 10) : '';
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{safeNum(d.views || d.visitors)}</div>
                        <div style={{ width: '100%', maxWidth: 24, height: h, background: '#3b82f6', borderRadius: '3px 3px 0 0', opacity: 0.8 }}
                          title={`${dateStr}: ${safeNum(d.views)} views, ${safeNum(d.visitors)} visitors`} />
                        <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>{dateStr}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No daily activity data</div>
            )}
          </div>

          {/* Tables Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div>
              <h2 style={sectionH}>Top Pages ({topPages.length})</h2>
              <DataTable columns={pageColumns} data={topPages} emptyText="No page data yet" />
            </div>
            <div>
              <h2 style={sectionH}>Countries ({countries.length})</h2>
              <DataTable columns={countryColumns} data={countries} emptyText="No country data yet" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div>
              <h2 style={sectionH}>Top Referrers ({topReferrers.length})</h2>
              <DataTable columns={referrerColumns} data={topReferrers} emptyText="No referrer data yet" />
            </div>
            <div>
              <h2 style={sectionH}>Languages ({languages.length})</h2>
              <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 16 }}>
                {languages.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No language data yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {languages.slice(0, 10).map((l, i) => {
                      const langName = safeStr(l.language || l.code || l.name, 'Unknown');
                      const count = safeNum(l.count || l.visitors);
                      const totalLang = languages.reduce((s, x) => s + safeNum(x.count || x.visitors), 1);
                      const pct = Math.round((count / totalLang) * 100);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', width: 60 }}>{langName}</span>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#3b82f6' }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 50, textAlign: 'right' }}>{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subscriptions */}
          <h2 style={sectionH}>Subscriptions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {Object.entries(countByStatus).map(([status, count]) => (
              <div key={status} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '14px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{safeNum(count)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 4 }}>{safeStr(status)}</div>
              </div>
            ))}
            {Object.keys(countByStatus).length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: 20, background: 'var(--bg-card)', borderRadius: 8 }}>No subscription data</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const sectionH = { fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 };
