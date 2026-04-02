import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import DataTable from '../shared/DataTable.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

const bizFetch = (path) => fmApi.apiFetch(`/api/v1/ops/analytics-biz${path}`);

export default function AnalyticsView() {
  const [period, setPeriod] = useState('30');
  const [metrics, setMetrics] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [visitors, setVisitors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [waPerf, setWaPerf] = useState(null);
  const [bizRev, setBizRev] = useState(null);
  const [clinicRank, setClinicRank] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fmApi.getPlatformMetrics(parseInt(period)).catch(() => null),
      fmApi.getRevenue().catch(() => null),
      fmApi.getVisitorStats().catch(() => null),
      bizFetch(`/funnel?days=${period}`).catch(() => null),
      bizFetch('/whatsapp').catch(() => null),
      bizFetch('/revenue').catch(() => null),
      bizFetch('/clinics').catch(() => null),
    ]).then(([m, r, v, fn, wa, rev, cl]) => {
      setMetrics(Array.isArray(m?.metrics) ? m.metrics : []);
      setRevenue(r);
      setVisitors(v);
      setFunnel(fn);
      setWaPerf(wa);
      setBizRev(rev);
      setClinicRank(Array.isArray(cl?.clinics) ? cl.clinics : []);
      setLoading(false);
    }).catch(err => {
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

          {/* ══ BUSINESS ANALYTICS ══ */}

          {/* Funnel */}
          {funnel && <FunnelSection funnel={funnel} visitors={visitorCount} />}

          {/* WhatsApp Performance */}
          {waPerf && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={sectionH}>WhatsApp Performance</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {[
                  { label: 'Today', value: safeNum(waPerf.messages_today), color: '#3b82f6' },
                  { label: 'Last 7d', value: safeNum(waPerf.messages_7d), color: '#a78bfa' },
                  { label: 'Last 30d', value: safeNum(waPerf.messages_30d), color: '#f97316' },
                  { label: 'Active Convos', value: safeNum(waPerf.active_conversations), color: '#10b981' },
                  { label: 'Failed', value: safeNum(waPerf.failed_messages), color: safeNum(waPerf.failed_messages) > 0 ? '#ef4444' : '#6b7280' },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '14px 16px', borderTop: `2px solid ${m.color}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{m.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: m.color, textTransform: 'uppercase', marginTop: 4 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue & Bookings */}
          {bizRev && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={sectionH}>Revenue & Bookings</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <StatCard label="Bookings Today" value={safeNum(bizRev.bookings_today)} color="orange" />
                <StatCard label="Bookings 7d" value={safeNum(bizRev.bookings_7d)} color="purple" />
                <StatCard label="Active Subs" value={safeNum(bizRev.active_subs)} color="green" sub={`${safeNum(bizRev.trial_subs)} trials`} />
                <StatCard label="MRR" value={`€${(safeNum(bizRev.mrr_cents) / 100).toLocaleString('de-DE')}`} color="green" />
              </div>
            </div>
          )}

          {/* Clinic Performance Ranking */}
          {clinicRank.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={sectionH}>Clinic Performance</h2>
              <DataTable
                columns={[
                  { key: 'name', label: 'Clinic', render: v => <span style={{ fontWeight: 700 }}>{safeStr(v)}</span> },
                  { key: 'leads', label: 'Leads', render: v => safeNum(v) },
                  { key: 'bookings', label: 'Bookings', render: v => safeNum(v) },
                  { key: 'conversion', label: 'Conversion', render: v => <span style={{ color: safeNum(v) > 20 ? '#10b981' : safeNum(v) > 0 ? '#eab308' : 'var(--text-muted)' }}>{safeNum(v)}%</span> },
                  { key: 'messages_30d', label: 'Messages 30d', render: v => safeNum(v) },
                ]}
                data={clinicRank}
                emptyText="No clinic data"
              />
            </div>
          )}

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

function FunnelSection({ funnel, visitors }) {
  const steps = [
    { label: 'Visitors', value: visitors || 0, color: '#6b7280' },
    { label: 'Leads', value: parseInt(funnel.leads) || 0, color: '#3b82f6' },
    { label: 'WhatsApp Started', value: parseInt(funnel.wa_started) || 0, color: '#a78bfa' },
    { label: 'Intake Done', value: parseInt(funnel.intake_completed) || 0, color: '#f97316' },
    { label: 'Photos Received', value: parseInt(funnel.photos_received) || 0, color: '#eab308' },
    { label: 'Quotes', value: parseInt(funnel.quotes_generated) || 0, color: '#10b981' },
    { label: 'Bookings', value: parseInt(funnel.bookings_created) || 0, color: '#10b981' },
    { label: 'Confirmed', value: parseInt(funnel.bookings_confirmed) || 0, color: '#10b981' },
  ];

  const maxVal = Math.max(1, ...steps.map(s => s.value));
  let worstDrop = { from: '', to: '', pct: 0 };
  for (let i = 1; i < steps.length; i++) {
    if (steps[i - 1].value > 0) {
      const dropPct = Math.round((1 - steps[i].value / steps[i - 1].value) * 100);
      if (dropPct > worstDrop.pct) worstDrop = { from: steps[i - 1].label, to: steps[i].label, pct: dropPct };
    }
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Conversion Funnel
      </h2>
      {worstDrop.pct > 50 && (
        <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 12, background: '#f9731612', border: '1px solid #f9731630', fontSize: 12, color: '#f97316', fontWeight: 600 }}>
          Biggest drop: {worstDrop.from} → {worstDrop.to} ({worstDrop.pct}% lost)
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map((s, i) => {
          const prev = i > 0 ? steps[i - 1].value : null;
          const convPct = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
          const barWidth = maxVal > 0 ? Math.max(2, (s.value / maxVal) * 100) : 2;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 120, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>{s.label}</span>
              <div style={{ flex: 1, height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barWidth}%`, background: s.color, borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 8, minWidth: 40 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{s.value}</span>
                </div>
              </div>
              {convPct !== null && (
                <span style={{ width: 50, fontSize: 11, fontWeight: 700, color: convPct > 50 ? '#10b981' : convPct > 20 ? '#eab308' : '#ef4444', textAlign: 'right', flexShrink: 0 }}>{convPct}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const sectionH = { fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 };
