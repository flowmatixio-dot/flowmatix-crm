import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import DataTable from '../shared/DataTable.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

const biz = (path) => fmApi.apiFetch(`/api/v1/ops/analytics-biz${path}`).catch(() => null);
const noData = (v) => (v === null || v === undefined) ? 'No data' : v;
const fmtEur = (cents) => { const n = safeNum(cents); return n > 0 ? `€${(n / 100).toLocaleString('de-DE')}` : '€0'; };

export default function AnalyticsView() {
  const [period, setPeriod] = useState('30');
  const [visitors, setVisitors] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [waPerf, setWaPerf] = useState(null);
  const [bizRev, setBizRev] = useState(null);
  const [clinicRank, setClinicRank] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fmApi.getRevenue().catch(() => null),
      fmApi.getVisitorStats().catch(() => null),
      biz(`/funnel?days=${period}`).catch(() => null),
      biz('/whatsapp').catch(() => null),
      biz('/revenue').catch(() => null),
      biz('/clinics').catch(() => null),
      fmApi.getPlatformMetrics(parseInt(period)).catch(() => null),
    ]).then(([rev, vis, fn, wa, br, cl, met]) => {
      setRevenue(rev);
      setVisitors(vis);
      setFunnel(fn);
      setWaPerf(wa);
      setBizRev(br);
      setClinicRank(Array.isArray(cl?.clinics) ? cl.clinics : []);
      setDaily(Array.isArray(met?.metrics) ? met.metrics : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [period]);

  const mrr = safeNum(revenue?.mrr) || safeNum(bizRev?.mrr_cents);
  const countByStatus = (revenue?.countByStatus && typeof revenue.countByStatus === 'object') ? revenue.countByStatus : {};
  const activeSubs = safeNum(countByStatus.active) || safeNum(bizRev?.active_subs);
  const trialSubs = safeNum(countByStatus.trialing) || safeNum(bizRev?.trial_subs);
  const visitorCount = period === '1' ? safeNum(visitors?.today?.visitors) : period === '7' ? safeNum(visitors?.week?.visitors) : safeNum(visitors?.month?.visitors);
  const totalMsgs = safeNum(waPerf?.messages_30d);
  const totalLeads = safeNum(funnel?.leads);

  // Marketing data
  const topPages = Array.isArray(visitors?.topPages) ? visitors.topPages : [];
  const countries = Array.isArray(visitors?.countries) ? visitors.countries : [];
  const topReferrers = Array.isArray(visitors?.topReferrers) ? visitors.topReferrers : [];
  const languages = Array.isArray(visitors?.languages) ? visitors.languages : [];

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Analytics</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ v: '1', l: 'Today' }, { v: '7', l: 'Week' }, { v: '30', l: 'Month' }].map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              style={{ background: period === p.v ? '#ff8a2a' : 'var(--bg-card)', color: period === p.v ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 1. TOP KPIs ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        <StatCard label="MRR" value={fmtEur(mrr)} color="green" sub={`${activeSubs} active · ${trialSubs} trial`} />
        <StatCard label="Bookings" value={noData(safeNum(bizRev?.bookings_30d))} color="orange" sub={`${noData(safeNum(bizRev?.bookings_today))} today`} />
        <StatCard label="Leads" value={noData(totalLeads)} color="purple" sub={`Last ${period}d`} />
        <StatCard label="Messages" value={noData(totalMsgs)} color="blue" sub={`${noData(safeNum(waPerf?.messages_today))} today`} />
      </div>

      {/* ═══ 2. BUSINESS OVERVIEW ═══ */}
      <SectionTitle>Business Overview</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 32 }}>
        {[
          { l: 'Bookings Today', v: safeNum(bizRev?.bookings_today), c: '#f97316' },
          { l: 'Bookings 7d', v: safeNum(bizRev?.bookings_7d), c: '#a78bfa' },
          { l: 'Bookings 30d', v: safeNum(bizRev?.bookings_30d), c: '#3b82f6' },
          { l: 'Active Subs', v: activeSubs, c: '#10b981' },
          { l: 'Trial Subs', v: trialSubs, c: '#eab308' },
          { l: 'MRR', v: fmtEur(mrr), c: '#10b981' },
        ].map((m, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '14px 12px', borderTop: `2px solid ${m.c}`, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{noData(m.v)}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: m.c, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{m.l}</div>
          </div>
        ))}
      </div>

      {/* ═══ 3. PATIENT FUNNEL ═══ */}
      {funnel && <FunnelSection funnel={funnel} visitors={visitorCount} />}

      {/* ═══ 4. WHATSAPP PERFORMANCE ═══ */}
      <SectionTitle>WhatsApp Performance</SectionTitle>
      {waPerf ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 32 }}>
          {[
            { l: 'Messages Today', v: safeNum(waPerf.messages_today), c: '#3b82f6' },
            { l: 'Messages 7d', v: safeNum(waPerf.messages_7d), c: '#a78bfa' },
            { l: 'Messages 30d', v: safeNum(waPerf.messages_30d), c: '#f97316' },
            { l: 'Active Convos', v: safeNum(waPerf.active_conversations), c: '#10b981' },
            { l: 'Failed', v: safeNum(waPerf.failed_messages), c: safeNum(waPerf.failed_messages) > 0 ? '#ef4444' : '#6b7280' },
          ].map((m, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '14px 16px', borderTop: `2px solid ${m.c}`, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{noData(m.v)}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: m.c, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{m.l}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 20, marginBottom: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No WhatsApp data</div>
      )}

      {/* ═══ 5. CLINIC PERFORMANCE ═══ */}
      {clinicRank.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionTitle>Top Clinics</SectionTitle>
          <DataTable
            columns={[
              { key: 'name', label: 'Clinic', render: v => <span style={{ fontWeight: 700, fontSize: 13 }}>{safeStr(v)}</span> },
              { key: 'leads', label: 'Leads', render: v => noData(safeNum(v)) },
              { key: 'bookings', label: 'Bookings', render: v => <span style={{ fontWeight: 700, color: safeNum(v) > 0 ? '#10b981' : 'var(--text-muted)' }}>{noData(safeNum(v))}</span> },
              { key: 'conversion', label: 'Conversion', render: v => { const n = safeNum(v); return <span style={{ fontWeight: 700, color: n > 20 ? '#10b981' : n > 0 ? '#eab308' : 'var(--text-muted)' }}>{n > 0 ? `${n}%` : 'No data'}</span>; }},
              { key: 'messages_30d', label: 'Messages', render: v => noData(safeNum(v)) },
            ]}
            data={clinicRank}
            emptyText="No clinic data"
          />
        </div>
      )}

      {/* ═══ 6. DAILY ACTIVITY ═══ */}
      <SectionTitle sub="Marketing">Daily Website Activity</SectionTitle>
      <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 20, marginBottom: 28 }}>
        {daily.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
            {daily.slice(-14).map((d, i) => {
              const maxV = Math.max(1, ...daily.slice(-14).map(x => safeNum(x.messages_sent || x.views || x.visitors, 1)));
              const val = safeNum(d.messages_sent || d.views || d.visitors);
              const h = Math.max(4, (val / maxV) * 80);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{val}</div>
                  <div style={{ width: '100%', maxWidth: 20, height: h, background: '#3b82f6', borderRadius: '3px 3px 0 0', opacity: 0.7 }} />
                </div>
              );
            })}
          </div>
        ) : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 16 }}>No data</div>}
      </div>

      {/* ═══ 7. MARKETING TABLES ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div>
          <SectionTitle sub="Marketing">Top Pages</SectionTitle>
          <DataTable columns={[
            { key: 'url', label: 'Page', render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{typeof v === 'string' ? v.replace(/^https?:\/\/[^/]+/, '') || '/' : '—'}</span> },
            { key: 'views', label: 'Views', render: v => safeNum(v) },
            { key: 'visitors', label: 'Visitors', render: v => safeNum(v) },
          ]} data={topPages} emptyText="No data" />
        </div>
        <div>
          <SectionTitle sub="Marketing">Countries</SectionTitle>
          <DataTable columns={[
            { key: 'country', label: 'Country', render: v => safeStr(v, 'Unknown') },
            { key: 'visitors', label: 'Visitors', render: v => safeNum(v) },
          ]} data={countries} emptyText="No data" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div>
          <SectionTitle sub="Marketing">Top Referrers</SectionTitle>
          <DataTable columns={[
            { key: 'referrer', label: 'Referrer', render: v => <span style={{ fontSize: 12 }}>{safeStr(v, 'Direct').slice(0, 50)}</span> },
            { key: 'count', label: 'Visits', render: v => safeNum(v) },
          ]} data={topReferrers} emptyText="No data" />
        </div>
        <div>
          <SectionTitle sub="Marketing">Languages</SectionTitle>
          <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 16 }}>
            {languages.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>No data</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {languages.slice(0, 8).map((l, i) => {
                  const name = safeStr(l.language || l.code, '?');
                  const count = safeNum(l.count || l.visitors);
                  const total = languages.reduce((s, x) => s + safeNum(x.count || x.visitors), 1);
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', width: 50 }}>{name}</span>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#3b82f6' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 40, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section Title with optional "Marketing" sub-label ──
function SectionTitle({ children, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-primary)', margin: 0 }}>{children}</h2>
      {sub && <span style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{sub}</span>}
    </div>
  );
}

// ── Funnel ──
function FunnelSection({ funnel, visitors }) {
  const steps = [
    { label: 'Visitors', value: visitors || 0, color: '#6b7280' },
    { label: 'Leads', value: parseInt(funnel.leads) || 0, color: '#3b82f6' },
    { label: 'WhatsApp', value: parseInt(funnel.wa_started) || 0, color: '#a78bfa' },
    { label: 'Intake', value: parseInt(funnel.intake_completed) || 0, color: '#f97316' },
    { label: 'Photos', value: parseInt(funnel.photos_received) || 0, color: '#eab308' },
    { label: 'Quotes', value: parseInt(funnel.quotes_generated) || 0, color: '#10b981' },
    { label: 'Bookings', value: parseInt(funnel.bookings_created) || 0, color: '#10b981' },
  ];

  const max = Math.max(1, ...steps.map(s => s.value));
  let worst = { from: '', to: '', pct: 0 };
  for (let i = 1; i < steps.length; i++) {
    if (steps[i - 1].value > 0) {
      const drop = Math.round((1 - steps[i].value / steps[i - 1].value) * 100);
      if (drop > worst.pct) worst = { from: steps[i - 1].label, to: steps[i].label, pct: drop };
    }
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle>Patient Funnel</SectionTitle>
      {worst.pct > 50 && (
        <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 12, background: '#f9731610', border: '1px solid #f9731625', fontSize: 12, color: '#f97316', fontWeight: 600 }}>
          Biggest drop: {worst.from} → {worst.to} ({worst.pct}% lost)
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((s, i) => {
          const prev = i > 0 ? steps[i - 1].value : null;
          const conv = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
          const w = max > 0 ? Math.max(3, (s.value / max) * 100) : 3;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 80, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>{s.label}</span>
              <div style={{ flex: 1, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.025)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${w}%`, background: `${s.color}cc`, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 10, minWidth: 50 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{s.value}</span>
                </div>
              </div>
              <span style={{ width: 45, fontSize: 11, fontWeight: 700, color: conv === null ? 'transparent' : conv > 50 ? '#10b981' : conv > 20 ? '#eab308' : '#ef4444', textAlign: 'right', flexShrink: 0 }}>
                {conv !== null ? `${conv}%` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
