import React, { useState, useEffect, useCallback, useRef } from 'react';
import StatCard from '../shared/StatCard.jsx';
import DataTable from '../shared/DataTable.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

const COUNTRY_NAMES = {
  DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz', TR: 'Türkei', GB: 'Großbritannien',
  US: 'USA', FR: 'Frankreich', NL: 'Niederlande', PL: 'Polen', RU: 'Russland',
  SA: 'Saudi-Arabien', AE: 'Vereinigte Arab. Emirate', KW: 'Kuwait', QA: 'Katar',
  IQ: 'Irak', EG: 'Ägypten', LY: 'Libyen', MA: 'Marokko', DZ: 'Algerien',
  IT: 'Italien', ES: 'Spanien', PT: 'Portugal', BE: 'Belgien', SE: 'Schweden',
  NO: 'Norwegen', DK: 'Dänemark', FI: 'Finnland', GR: 'Griechenland', CZ: 'Tschechien',
  RO: 'Rumänien', HU: 'Ungarn', BG: 'Bulgarien', HR: 'Kroatien', RS: 'Serbien',
  UA: 'Ukraine', CA: 'Kanada', AU: 'Australien', NZ: 'Neuseeland', JP: 'Japan',
  KR: 'Südkorea', CN: 'China', IN: 'Indien', BR: 'Brasilien', MX: 'Mexiko',
  AR: 'Argentinien', IL: 'Israel', IR: 'Iran', JO: 'Jordanien', LB: 'Libanon',
  SY: 'Syrien', TN: 'Tunesien', NG: 'Nigeria', ZA: 'Südafrika', KE: 'Kenia',
  PK: 'Pakistan', BD: 'Bangladesch', SG: 'Singapur', MY: 'Malaysia', TH: 'Thailand',
};

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
  const [recentVisitors, setRecentVisitors] = useState([]);
  const initialLoad = useRef(true);

  const loadAnalytics = useCallback(() => {
    if (initialLoad.current) setLoading(true);
    Promise.all([
      fmApi.getRevenue().catch(() => null),
      fmApi.getVisitorStats().catch(() => null),
      biz(`/funnel?days=${period}`).catch(() => null),
      biz('/whatsapp').catch(() => null),
      biz('/revenue').catch(() => null),
      biz('/clinics').catch(() => null),
      fmApi.getPlatformMetrics(parseInt(period)).catch(() => null),
      fmApi.getRecentVisitors().catch(() => []),
    ]).then(([rev, vis, fn, wa, br, cl, met, rv]) => {
      setRevenue(rev);
      setVisitors(vis);
      setFunnel(fn);
      setWaPerf(wa);
      setBizRev(br);
      setClinicRank(Array.isArray(cl?.clinics) ? cl.clinics : []);
      setDaily(Array.isArray(met?.metrics) ? met.metrics : []);
      setRecentVisitors(Array.isArray(rv) ? rv : []);
      setLoading(false);
      initialLoad.current = false;
    }).catch(() => { setLoading(false); initialLoad.current = false; });
  }, [period]);

  useEffect(() => {
    loadAnalytics();
    const iv = setInterval(loadAnalytics, 120000);
    return () => clearInterval(iv);
  }, [loadAnalytics]);

  const mrr = safeNum(revenue?.mrr) || safeNum(bizRev?.mrr_cents);
  const countByStatus = (revenue?.countByStatus && typeof revenue.countByStatus === 'object') ? revenue.countByStatus : {};
  const activeSubs = safeNum(countByStatus.active) || safeNum(bizRev?.active_subs);
  const trialSubs = safeNum(countByStatus.trialing) || safeNum(bizRev?.trial_subs);
  const visitorCount = period === '1' ? safeNum(visitors?.today?.visitors) : period === '7' ? safeNum(visitors?.week?.visitors) : safeNum(visitors?.month?.visitors);
  const totalMsgs = safeNum(waPerf?.messages_30d) || daily.reduce((s, d) => s + safeNum(d.messages), 0);
  const totalLeads = safeNum(funnel?.leads);
  // "Purchases" = new clinic signups, filtered by selected period
  const periodDays = parseInt(period) || 30;
  const periodDaily = daily.slice(-periodDays);
  const purchasesInPeriod = periodDaily.reduce((s, d) => s + safeNum(d.new_clinics), 0);
  const messagesInPeriod = periodDaily.reduce((s, d) => s + safeNum(d.messages), 0);
  const purchasesToday = daily.find(d => d.day && new Date(d.day).toDateString() === new Date().toDateString());

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
              style={{ background: period === p.v ? 'var(--brand)' : 'var(--bg-card)', color: period === p.v ? '#fff' : 'var(--text-secondary)', border: period === p.v ? 'none' : '1px solid var(--border-subtle)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 1. TOP KPIs ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        <StatCard label="MRR" value={fmtEur(mrr)} color="green" sub={`${activeSubs} active · ${trialSubs} trial`} />
        <StatCard label="Purchases" value={purchasesInPeriod} color="orange" sub={`${safeNum(purchasesToday?.new_clinics)} today`} />
        <StatCard label="Leads" value={noData(totalLeads)} color="purple" sub={`Last ${period}d`} />
        <StatCard label="Messages" value={messagesInPeriod || totalMsgs} color="blue" sub={`Last ${period}d`} />
      </div>

      {/* ═══ 2. BUSINESS OVERVIEW ═══ */}
      <SectionTitle>Business Overview</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 32 }}>
        {[
          { l: 'Purchases Today', v: safeNum(purchasesToday?.new_clinics), c: '#ff8c2a' },
          { l: `Purchases ${period}d`, v: purchasesInPeriod, c: '#c4a6ff' },
          { l: `Messages ${period}d`, v: messagesInPeriod, c: '#5ee0ff' },
          { l: 'Active Subs', v: activeSubs, c: '#22c55e' },
          { l: 'Trial Subs', v: trialSubs, c: '#ffcf40' },
          { l: 'MRR', v: fmtEur(mrr), c: '#22c55e' },
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
            { l: 'Messages Today', v: safeNum(waPerf.messages_today), c: '#5ee0ff' },
            { l: 'Messages 7d', v: safeNum(waPerf.messages_7d), c: '#c4a6ff' },
            { l: 'Messages 30d', v: safeNum(waPerf.messages_30d), c: '#ff8c2a' },
            { l: 'Active Convos', v: safeNum(waPerf.active_conversations), c: '#22c55e' },
            { l: 'Failed', v: safeNum(waPerf.failed_messages), c: safeNum(waPerf.failed_messages) > 0 ? '#ef4444' : '#8899b0' },
          ].map((m, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '14px 16px', borderTop: `2px solid ${m.c}`, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{noData(m.v)}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: m.c, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{m.l}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '22px 24px', border: '1px solid var(--border-subtle)', marginBottom: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No WhatsApp data</div>
      )}

      {/* ═══ 5. CLINIC PERFORMANCE ═══ */}
      {clinicRank.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionTitle>Top Clinics</SectionTitle>
          <DataTable
            columns={[
              { key: 'name', label: 'Clinic', render: v => <span style={{ fontWeight: 700, fontSize: 13 }}>{safeStr(v)}</span> },
              { key: 'leads', label: 'Leads', render: v => noData(safeNum(v)) },
              { key: 'bookings', label: 'Bookings', render: v => <span style={{ fontWeight: 700, color: safeNum(v) > 0 ? '#22c55e' : 'var(--text-muted)' }}>{noData(safeNum(v))}</span> },
              { key: 'conversion', label: 'Conversion', render: v => { const n = safeNum(v); return <span style={{ fontWeight: 700, color: n > 20 ? '#22c55e' : n > 0 ? '#ffcf40' : 'var(--text-muted)' }}>{n > 0 ? `${n}%` : 'No data'}</span>; }},
              { key: 'messages_30d', label: 'Messages', render: v => noData(safeNum(v)) },
            ]}
            data={clinicRank}
            emptyText="No clinic data"
          />
        </div>
      )}

      {/* ═══ 6. DAILY ACTIVITY ═══ */}
      <SectionTitle>Daily Messages</SectionTitle>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '22px 24px', border: '1px solid var(--border-subtle)', marginBottom: 28 }}>
        {daily.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
            {daily.slice(-14).map((d, i) => {
              const maxV = Math.max(1, ...daily.slice(-14).map(x => safeNum(x.messages || x.messages_sent || x.views || x.visitors, 1)));
              const val = safeNum(d.messages || d.messages_sent || d.views || d.visitors);
              const h = Math.max(4, (val / maxV) * 80);
              const dateStr = typeof d.day === 'string' ? d.day.slice(5, 10) : '';
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{val}</div>
                  <div style={{ width: '100%', maxWidth: 20, height: h, background: '#5ee0ff', borderRadius: '3px 3px 0 0', opacity: 0.7 }} />
                  <div style={{ fontSize: 7, color: 'var(--text-muted)', marginTop: 2 }}>{dateStr}</div>
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
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border-subtle)' }}>
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
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--progress-track)' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#5ee0ff' }} />
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
      {/* ═══ 8. WEBSITE BESUCHER ═══ */}
      <SectionTitle sub="Marketing">Website Besucher</SectionTitle>
      <VisitorsByCountry visitors={recentVisitors} />
    </div>
  );
}

// ── Country flag from 2-letter ISO code ──
function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '🌐';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

// ── Website Besucher grouped by country ──
function VisitorsByCountry({ visitors }) {
  const [open, setOpen] = useState({});

  if (!visitors.length) {
    return (
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border-subtle)', marginBottom: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
        Keine Daten
      </div>
    );
  }

  // Group by country code
  const groups = {};
  visitors.forEach(v => {
    const key = v.country?.toUpperCase() || 'XX';
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  });
  const sorted = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-subtle)', marginBottom: 28, overflow: 'hidden' }}>
      {sorted.map(([cc, rows], gi) => {
        const flag = countryFlag(cc);
        const name = COUNTRY_NAMES[cc] || cc;
        const isOpen = !!open[cc];
        return (
          <div key={cc}>
            {/* Country header row */}
            <div onClick={() => setOpen(p => ({ ...p, [cc]: !p[cc] }))}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', cursor: 'pointer', borderBottom: isOpen || gi < sorted.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: isOpen ? 'var(--bg-hover)' : 'transparent', transition: 'background 0.15s' }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{flag}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{rows.length} Besuch{rows.length !== 1 ? 'e' : ''}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {/* Expanded visits */}
            {isOpen && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {rows.map((v, i) => {
                    const isMobile = /mobile|android|iphone|ipad/i.test(v.user_agent || '');
                    const path = (() => { try { return new URL(v.url).pathname || '/'; } catch { return v.url; } })();
                    const ago = (() => { const d = Math.floor((Date.now() - new Date(v.created_at)) / 1000); return d < 60 ? `${d}s` : d < 3600 ? `${Math.floor(d / 60)}min` : `${Math.floor(d / 3600)}h`; })();
                    return (
                      <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: 'var(--bg-section)' }}>
                        <td style={{ padding: '6px 20px', color: 'var(--text-muted)', whiteSpace: 'nowrap', width: 60 }}>{ago}</td>
                        <td style={{ padding: '6px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{v.city || '—'}</td>
                        <td style={{ padding: '6px 10px', color: 'var(--text-primary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</td>
                        <td style={{ padding: '6px 10px', fontSize: 14 }}>{isMobile ? '📱' : '🖥️'}</td>
                        <td style={{ padding: '6px 20px 6px 0', color: v.duration_seconds ? '#22c55e' : 'var(--text-muted)', textAlign: 'right' }}>{v.duration_seconds ? `${v.duration_seconds}s` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Section Title with optional "Marketing" sub-label ──
function SectionTitle({ children, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-primary)', margin: 0 }}>{children}</h2>
      {sub && <span style={{ fontSize: 9, fontWeight: 700, color: '#8899b0', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{sub}</span>}
    </div>
  );
}

// ── Funnel ──
function FunnelSection({ funnel, visitors }) {
  const steps = [
    { label: 'Visitors', value: visitors || 0, color: '#8899b0' },
    { label: 'Leads', value: parseInt(funnel.leads) || 0, color: '#5ee0ff' },
    { label: 'WhatsApp', value: parseInt(funnel.wa_started) || 0, color: '#c4a6ff' },
    { label: 'Intake', value: parseInt(funnel.intake_completed) || 0, color: '#ff8c2a' },
    { label: 'Photos', value: parseInt(funnel.photos_received) || 0, color: '#ffcf40' },
    { label: 'Quotes', value: parseInt(funnel.quotes_generated) || 0, color: '#22c55e' },
    { label: 'Bookings', value: parseInt(funnel.bookings_created) || 0, color: '#22c55e' },
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
        <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 12, background: '#ff8c2a10', border: '1px solid #ff8c2a25', fontSize: 12, color: '#ff8c2a', fontWeight: 600 }}>
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
              <div style={{ flex: 1, height: 28, borderRadius: 6, background: 'var(--bg-section)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${w}%`, background: `${s.color}cc`, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 10, minWidth: 50 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{s.value}</span>
                </div>
              </div>
              <span style={{ width: 45, fontSize: 11, fontWeight: 700, color: conv === null ? 'transparent' : conv > 50 ? '#22c55e' : conv > 20 ? '#ffcf40' : '#ef4444', textAlign: 'right', flexShrink: 0 }}>
                {conv !== null ? `${conv}%` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
