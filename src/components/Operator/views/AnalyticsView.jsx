import React, { useState, useEffect, useCallback, useRef } from 'react';
import StatCard from '../shared/StatCard.jsx';
import DataTable from '../shared/DataTable.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

const COUNTRY_NAMES = {
  AF:'Afghanistan', AL:'Albanien', DZ:'Algerien', AD:'Andorra', AO:'Angola',
  AG:'Antigua und Barbuda', AR:'Argentinien', AM:'Armenien', AU:'Australien', AT:'Österreich',
  AZ:'Aserbaidschan', BS:'Bahamas', BH:'Bahrain', BD:'Bangladesch', BB:'Barbados',
  BY:'Weißrussland', BE:'Belgien', BZ:'Belize', BJ:'Benin', BT:'Bhutan',
  BO:'Bolivien', BA:'Bosnien und Herzegowina', BW:'Botswana', BR:'Brasilien', BN:'Brunei',
  BG:'Bulgarien', BF:'Burkina Faso', BI:'Burundi', CV:'Kap Verde', KH:'Kambodscha',
  CM:'Kamerun', CA:'Kanada', CF:'Zentralafrikanische Rep.', TD:'Tschad', CL:'Chile',
  CN:'China', CO:'Kolumbien', KM:'Komoren', CG:'Kongo', CD:'Dem. Rep. Kongo',
  CR:'Costa Rica', HR:'Kroatien', CU:'Kuba', CY:'Zypern', CZ:'Tschechien',
  DK:'Dänemark', DJ:'Dschibuti', DM:'Dominica', DO:'Dominikanische Rep.', EC:'Ecuador',
  EG:'Ägypten', SV:'El Salvador', GQ:'Äquatorialguinea', ER:'Eritrea', EE:'Estland',
  SZ:'Eswatini', ET:'Äthiopien', FJ:'Fidschi', FI:'Finnland', FR:'Frankreich',
  GA:'Gabun', GM:'Gambia', GE:'Georgien', DE:'Deutschland', GH:'Ghana',
  GR:'Griechenland', GD:'Grenada', GT:'Guatemala', GN:'Guinea', GW:'Guinea-Bissau',
  GY:'Guyana', HT:'Haiti', HN:'Honduras', HU:'Ungarn', IS:'Island',
  IN:'Indien', ID:'Indonesien', IR:'Iran', IQ:'Irak', IE:'Irland',
  IL:'Israel', IT:'Italien', JM:'Jamaika', JP:'Japan', JO:'Jordanien',
  KZ:'Kasachstan', KE:'Kenia', KI:'Kiribati', KP:'Nordkorea', KR:'Südkorea',
  KW:'Kuwait', KG:'Kirgisistan', LA:'Laos', LV:'Lettland', LB:'Libanon',
  LS:'Lesotho', LR:'Liberia', LY:'Libyen', LI:'Liechtenstein', LT:'Litauen',
  LU:'Luxemburg', MG:'Madagaskar', MW:'Malawi', MY:'Malaysia', MV:'Malediven',
  ML:'Mali', MT:'Malta', MH:'Marshallinseln', MR:'Mauretanien', MU:'Mauritius',
  MX:'Mexiko', FM:'Mikronesien', MD:'Moldau', MC:'Monaco', MN:'Mongolei',
  ME:'Montenegro', MA:'Marokko', MZ:'Mosambik', MM:'Myanmar', NA:'Namibia',
  NR:'Nauru', NP:'Nepal', NL:'Niederlande', NZ:'Neuseeland', NI:'Nicaragua',
  NE:'Niger', NG:'Nigeria', MK:'Nordmazedonien', NO:'Norwegen', OM:'Oman',
  PK:'Pakistan', PW:'Palau', PA:'Panama', PG:'Papua-Neuguinea', PY:'Paraguay',
  PE:'Peru', PH:'Philippinen', PL:'Polen', PT:'Portugal', QA:'Katar',
  RO:'Rumänien', RU:'Russland', RW:'Ruanda', KN:'St. Kitts und Nevis', LC:'St. Lucia',
  VC:'St. Vincent', WS:'Samoa', SM:'San Marino', ST:'São Tomé und Príncipe', SA:'Saudi-Arabien',
  SN:'Senegal', RS:'Serbien', SC:'Seychellen', SL:'Sierra Leone', SG:'Singapur',
  SK:'Slowakei', SI:'Slowenien', SB:'Salomonen', SO:'Somalia', ZA:'Südafrika',
  SS:'Südsudan', ES:'Spanien', LK:'Sri Lanka', SD:'Sudan', SR:'Suriname',
  SE:'Schweden', CH:'Schweiz', SY:'Syrien', TW:'Taiwan', TJ:'Tadschikistan',
  TZ:'Tansania', TH:'Thailand', TL:'Timor-Leste', TG:'Togo', TO:'Tonga',
  TT:'Trinidad und Tobago', TN:'Tunesien', TR:'Türkei', TM:'Turkmenistan', TV:'Tuvalu',
  UG:'Uganda', UA:'Ukraine', AE:'Vereinigte Arab. Emirate', GB:'Großbritannien', US:'USA',
  UY:'Uruguay', UZ:'Usbekistan', VU:'Vanuatu', VE:'Venezuela', VN:'Vietnam',
  YE:'Jemen', ZM:'Sambia', ZW:'Simbabwe', HK:'Hongkong', MO:'Macau',
  PS:'Palästina', XK:'Kosovo', TF:'Franz. Südgebiete', AX:'Ålandinseln',
  XX:'Unbekannt / VPN',
};

// Reverse map: English country names/variants → ISO-2 (for backends that send full names)
const ENGLISH_TO_ISO = {
  'AFGHANISTAN':'AF','ALBANIA':'AL','ALGERIA':'DZ','ANGOLA':'AO','ARGENTINA':'AR',
  'ARMENIA':'AM','AUSTRALIA':'AU','AUSTRIA':'AT','AZERBAIJAN':'AZ','BAHAMAS':'BS',
  'BAHRAIN':'BH','BANGLADESH':'BD','BARBADOS':'BB','BELARUS':'BY','BELGIUM':'BE',
  'BELIZE':'BZ','BENIN':'BJ','BHUTAN':'BT','BOLIVIA':'BO','BOSNIA':'BA',
  'BOTSWANA':'BW','BRAZIL':'BR','BRUNEI':'BN','BULGARIA':'BG','CAMBODIA':'KH',
  'CAMEROON':'CM','CANADA':'CA','CHAD':'TD','CHILE':'CL','CHINA':'CN',
  'COLOMBIA':'CO','COMOROS':'KM','CONGO':'CG','COSTA RICA':'CR','CROATIA':'HR',
  'CUBA':'CU','CYPRUS':'CY','CZECHIA':'CZ','CZECH REPUBLIC':'CZ','DENMARK':'DK',
  'DJIBOUTI':'DJ','ECUADOR':'EC','EGYPT':'EG','EL SALVADOR':'SV','ERITREA':'ER',
  'ESTONIA':'EE','ESWATINI':'SZ','ETHIOPIA':'ET','FIJI':'FJ','FINLAND':'FI',
  'FRANCE':'FR','GABON':'GA','GAMBIA':'GM','GEORGIA':'GE','GERMANY':'DE',
  'GHANA':'GH','GREECE':'GR','GRENADA':'GD','GUATEMALA':'GT','GUINEA':'GN',
  'GUYANA':'GY','HAITI':'HT','HONDURAS':'HN','HUNGARY':'HU','ICELAND':'IS',
  'INDIA':'IN','INDIAN':'IN','INDONESIA':'ID','IRAN':'IR','IRAQ':'IQ',
  'IRELAND':'IE','ISRAEL':'IL','ITALY':'IT','JAMAICA':'JM','JAPAN':'JP',
  'JORDAN':'JO','KAZAKHSTAN':'KZ','KENYA':'KE','NORTH KOREA':'KP','SOUTH KOREA':'KR',
  'KUWAIT':'KW','KYRGYZSTAN':'KG','LAOS':'LA','LATVIA':'LV','LEBANON':'LB',
  'LESOTHO':'LS','LIBERIA':'LR','LIBYA':'LY','LIECHTENSTEIN':'LI','LITHUANIA':'LT',
  'LUXEMBOURG':'LU','MADAGASCAR':'MG','MALAWI':'MW','MALAYSIA':'MY','MALDIVES':'MV',
  'MALI':'ML','MALTA':'MT','MAURITANIA':'MR','MAURITIUS':'MU','MEXICO':'MX',
  'MOLDOVA':'MD','MONACO':'MC','MONGOLIA':'MN','MONTENEGRO':'ME','MOROCCO':'MA',
  'MOZAMBIQUE':'MZ','MYANMAR':'MM','NAMIBIA':'NA','NEPAL':'NP','NETHERLANDS':'NL',
  'NEW ZEALAND':'NZ','NICARAGUA':'NI','NIGER':'NE','NIGERIA':'NG','NORWAY':'NO',
  'OMAN':'OM','PAKISTAN':'PK','PALAU':'PW','PANAMA':'PA','PARAGUAY':'PY',
  'PERU':'PE','PHILIPPINES':'PH','POLAND':'PL','PORTUGAL':'PT','QATAR':'QA',
  'ROMANIA':'RO','RUSSIA':'RU','RWANDA':'RW','SAUDI ARABIA':'SA','SENEGAL':'SN',
  'SERBIA':'RS','SEYCHELLES':'SC','SIERRA LEONE':'SL','SINGAPORE':'SG',
  'SLOVAKIA':'SK','SLOVENIA':'SI','SOMALIA':'SO','SOUTH AFRICA':'ZA',
  'SOUTH SUDAN':'SS','SPAIN':'ES','SRI LANKA':'LK','SUDAN':'SD','SURINAME':'SR',
  'SWEDEN':'SE','SWITZERLAND':'CH','SYRIA':'SY','TAIWAN':'TW','TAJIKISTAN':'TJ',
  'TANZANIA':'TZ','THAILAND':'TH','TOGO':'TG','TONGA':'TO','TRINIDAD':'TT',
  'TRINIDAD AND TOBAGO':'TT','TUNISIA':'TN','TURKEY':'TR','TURKMENISTAN':'TM',
  'UGANDA':'UG','UKRAINE':'UA','UNITED ARAB EMIRATES':'AE','UAE':'AE',
  'UNITED KINGDOM':'GB','UK':'GB','UNITED STATES':'US','UNITED STATES OF AMERICA':'US',
  'URUGUAY':'UY','UZBEKISTAN':'UZ','VENEZUELA':'VE','VIETNAM':'VN',
  'YEMEN':'YE','ZAMBIA':'ZM','ZIMBABWE':'ZW','HONG KONG':'HK','MACAU':'MO',
  'PALESTINE':'PS','KOSOVO':'XK',
};

function normalizeCountry(raw) {
  if (!raw) return 'XX';
  const up = raw.trim().toUpperCase();
  if (up.length === 2) return up;
  return ENGLISH_TO_ISO[up] || 'XX';
}

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
  const [dailyVisitors, setDailyVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [ownerIps, setOwnerIps] = useState(null);
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
      fmApi.getPlatformMetrics(Number.parseInt(period)).catch(() => null),
      fmApi.getRecentVisitors().catch(() => []),
      fmApi.getDailyVisitors().catch(() => []),
      fmApi.getVisitorHeatmap().catch(() => []),
      fmApi.getOwnerIps().catch(() => null),
    ]).then(([rev, vis, fn, wa, br, cl, met, rv, dv, hm, oips]) => {
      setRevenue(rev);
      setVisitors(vis);
      setFunnel(fn);
      setWaPerf(wa);
      setBizRev(br);
      setClinicRank(Array.isArray(cl?.clinics) ? cl.clinics : []);
      setDaily(Array.isArray(met?.metrics) ? met.metrics : []);
      setRecentVisitors(Array.isArray(rv) ? rv : []);
      setDailyVisitors(Array.isArray(dv) ? dv : []);
      setHeatmap(Array.isArray(hm) ? hm : []);
      if (oips?.ips) setOwnerIps(oips.ips);
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
  const periodDays = Number.parseInt(period) || 30;
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

      {/* ═══ 6. DAILY HOMEPAGE VISITORS ═══ */}
      <SectionTitle>Daily Visitors (Homepage)</SectionTitle>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '22px 24px', border: '1px solid var(--border-subtle)', marginBottom: 28 }}>
        {dailyVisitors.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
            {dailyVisitors.slice(-30).map((d, i) => {
              const vals = dailyVisitors.slice(-30).map(x => safeNum(x.visitors));
              const maxV = Math.max(1, ...vals);
              const val = safeNum(d.visitors);
              const h = Math.max(4, (val / maxV) * 80);
              const dateStr = typeof d.day === 'string' ? d.day.slice(5, 10) : '';
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{val}</div>
                  <div style={{ width: '100%', maxWidth: 20, height: h, background: '#a78bfa', borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
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
            { key: 'country', label: 'Country', render: v => {
              const cc = normalizeCountry(v);
              const flag = countryFlag(cc);
              const name = COUNTRY_NAMES[cc] || (cc === 'XX' ? 'Unbekannt / VPN' : (safeStr(v, 'Unknown')));
              return <span>{flag} {name}</span>;
            }},
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

      {/* ═══ 9. BESUCHER HEATMAP ═══ */}
      <SectionTitle sub="Marketing">Wann kommen Besucher?</SectionTitle>
      <VisitorHeatmap data={heatmap} />

      {/* ═══ 10. OWNER IPs ═══ */}
      <OwnerIpsEditor ips={ownerIps} onSave={async (newIps) => {
        await fmApi.saveOwnerIps(newIps);
        setOwnerIps(newIps);
      }} />
    </div>
  );
}

// ── Country flag from 2-letter ISO code ──
function countryFlag(cc) {
  if (!cc || cc === 'XX' || cc.length !== 2) return '🌐';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

// ── Format relative time, >24h as date ──
function fmtAgo(dateStr) {
  const d = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (d < 60) return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}min`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

// ── Sessions within a country ──
function SessionList({ rows }) {
  const [openSess, setOpenSess] = useState({});

  // Group by session_id (fallback: ip)
  const sessions = {};
  rows.forEach(v => {
    const key = v.session_id || v.ip || 'unknown';
    if (!sessions[key]) sessions[key] = [];
    sessions[key].push(v);
  });
  const sorted = Object.entries(sessions).sort((a, b) => {
    const la = Math.max(...a[1].map(v => new Date(v.created_at).getTime()));
    const lb = Math.max(...b[1].map(v => new Date(v.created_at).getTime()));
    return lb - la;
  });

  return (
    <div style={{ background: 'var(--bg-section)' }}>
      {sorted.map(([sid, svs], si) => {
        const first = svs[0];
        const lastVisit = svs.reduce((max, v) => new Date(v.created_at) > new Date(max) ? v.created_at : max, svs[0].created_at);
        const isMobile = /mobile|android|iphone|ipad/i.test(first.user_agent || '');
        const uniquePaths = [...new Set(svs.map(v => { try { return new URL(v.url).pathname || '/'; } catch { return v.url; } }))];
        const isOpen = !!openSess[sid];
        const shortIp = (first.ip || '').replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.x.x');
        // Hot lead: visited 3+ of the key sales pages
        const SALES_PAGES = ['/pricing', '/product', '/crm', '/contact'];
        const salesHits = SALES_PAGES.filter(p => uniquePaths.some(up => up.startsWith(p))).length;
        const isHotLead = salesHits >= 3;
        // Return visitor: visits on more than 1 distinct calendar day
        const visitDays = new Set(svs.map(v => new Date(v.created_at).toDateString())).size;
        const isReturn = visitDays > 1;
        // Total session duration (sum of non-null duration_seconds, deduplicated by value+time proximity)
        const totalDuration = svs.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);
        return (
          <div key={si} style={{ borderBottom: si < sorted.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <div onClick={() => setOpenSess(p => ({ ...p, [sid]: !p[sid] }))}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 20px 6px 32px', cursor: 'pointer', background: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
              <span style={{ fontSize: 13 }}>{isMobile ? '📱' : '🖥️'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', flex: 1 }}>{shortIp}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{first.city || ''}</span>
              {isHotLead && <span style={{ fontSize: 9, fontWeight: 700, color: '#ff8c2a', background: '#ff8c2a18', padding: '1px 6px', borderRadius: 4 }}>HOT</span>}
              {isReturn && <span style={{ fontSize: 9, fontWeight: 700, color: '#c4a6ff', background: '#c4a6ff18', padding: '1px 6px', borderRadius: 4 }}>{visitDays}×</span>}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{fmtAgo(lastVisit)}</span>
              <span style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, marginLeft: 8 }}>{uniquePaths.length} Seite{uniquePaths.length !== 1 ? 'n' : ''}</span>
              {totalDuration > 0 && <span style={{ fontSize: 10, color: '#22c55e', marginLeft: 6 }}>{totalDuration >= 60 ? `${Math.round(totalDuration/60)}min` : `${totalDuration}s`}</span>}
              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div style={{ padding: '4px 20px 8px 48px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {svs.map((v, vi) => {
                  const path = (() => { try { return new URL(v.url).pathname || '/'; } catch { return v.url; } })();
                  return (
                    <div key={vi} style={{ display: 'flex', gap: 12, fontSize: 11, alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', width: 40, flexShrink: 0 }}>{fmtAgo(v.created_at)}</span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{path}</span>
                      {v.duration_seconds ? <span style={{ color: '#22c55e', marginLeft: 'auto' }}>{v.duration_seconds}s</span> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
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

  // Group by normalized ISO country code
  const groups = {};
  visitors.forEach(v => {
    const key = normalizeCountry(v.country);
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  });
  const sorted = Object.entries(groups).sort((a, b) => {
    const la = Math.max(...a[1].map(v => new Date(v.created_at).getTime()));
    const lb = Math.max(...b[1].map(v => new Date(v.created_at).getTime()));
    return lb - la;
  });

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-subtle)', marginBottom: 28, overflow: 'hidden' }}>
      {sorted.map(([cc, rows], gi) => {
        const flag = countryFlag(cc);
        const name = COUNTRY_NAMES[cc] || cc;
        const isOpen = !!open[cc];
        return (
          <div key={cc}>
            {/* Country header row */}
            <div onClick={() => setOpen(p => ({ [cc]: !p[cc] }))}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', cursor: 'pointer', borderBottom: isOpen || gi < sorted.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: isOpen ? 'var(--bg-hover)' : 'transparent', transition: 'background 0.15s' }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{flag}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{rows.length} Besuch{rows.length !== 1 ? 'e' : ''}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {/* Expanded: group by session (= one person) */}
            {isOpen && <SessionList rows={rows} />}
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
    { label: 'Leads', value: Number.parseInt(funnel.leads) || 0, color: '#5ee0ff' },
    { label: 'WhatsApp', value: Number.parseInt(funnel.wa_started) || 0, color: '#c4a6ff' },
    { label: 'Intake', value: Number.parseInt(funnel.intake_completed) || 0, color: '#ff8c2a' },
    { label: 'Photos', value: Number.parseInt(funnel.photos_received) || 0, color: '#ffcf40' },
    { label: 'Quotes', value: Number.parseInt(funnel.quotes_generated) || 0, color: '#22c55e' },
    { label: 'Bookings', value: Number.parseInt(funnel.bookings_created) || 0, color: '#22c55e' },
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
      {/* Website → WA conversion */}
      {visitors > 0 && steps[2].value > 0 && (
        <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 8, background: '#5ee0ff10', border: '1px solid #5ee0ff25', fontSize: 12, color: '#5ee0ff', fontWeight: 600 }}>
          Website → WhatsApp: {Math.round((steps[2].value / visitors) * 100)}% ({steps[2].value} von {visitors} Besuchern)
        </div>
      )}
    </div>
  );
}

// ── Visitor Heatmap (hour × weekday) ──
const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
function VisitorHeatmap({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border-subtle)', marginBottom: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Noch keine Daten</div>;
  }
  const grid = {};
  let maxVal = 1;
  data.forEach(({ dow, hour, sessions }) => {
    const n = Number(sessions);
    grid[`${dow}-${hour}`] = n;
    if (n > maxVal) maxVal = n;
  });
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border-subtle)', marginBottom: 28, overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `30px repeat(24, 1fr)`, gap: 2, minWidth: 500 }}>
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center' }}>{h}</div>
        ))}
        {DAYS.map((day, dow) => (
          <React.Fragment key={dow}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{day}</div>
            {Array.from({ length: 24 }, (_, h) => {
              const val = grid[`${dow}-${h}`] || 0;
              const opacity = val > 0 ? 0.15 + (val / maxVal) * 0.85 : 0.05;
              return (
                <div key={h} title={`${day} ${h}:00 — ${val} Sessions`}
                  style={{ height: 14, borderRadius: 2, background: val > 0 ? `rgba(167,139,250,${opacity})` : 'var(--bg-section)' }} />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>Uhrzeiten in Türkei-Zeit (letzte 30 Tage)</div>
    </div>
  );
}

// ── Owner IPs Editor ──
function OwnerIpsEditor({ ips, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  if (ips === null) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <SectionTitle>Owner IPs (gefiltert)</SectionTitle>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '16px 20px', border: '1px solid var(--border-subtle)' }}>
        {!editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
              {ips.length === 0 ? 'Keine IPs konfiguriert' : ips.join(', ')}
            </span>
            <button onClick={() => { setValue(ips.join('\n')); setEditing(true); }}
              style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Bearbeiten
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea value={value} onChange={e => setValue(e.target.value)} rows={4}
              placeholder="Eine IP pro Zeile"
              style={{ fontSize: 12, fontFamily: 'monospace', padding: '8px 10px', borderRadius: 6, background: 'var(--bg-section)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={saving} onClick={async () => {
                setSaving(true);
                const newIps = value.split('\n').map(s => s.trim()).filter(Boolean);
                await onSave(newIps);
                setSaving(false);
                setEditing(false);
              }} style={{ fontSize: 11, padding: '4px 14px', borderRadius: 6, background: '#a78bfa', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                {saving ? '...' : 'Speichern'}
              </button>
              <button onClick={() => setEditing(false)}
                style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
