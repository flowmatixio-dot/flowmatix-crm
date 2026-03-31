import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { timeAgo } from "../../utils/helpers";
import * as api from "../../api/client";

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const S = {
  card: { background: '#23234a', borderRadius: 12, padding: 20, marginBottom: 16 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
  grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 },
  kpi: { fontSize: 28, fontWeight: 800, color: '#fff' },
  kpiSm: { fontSize: 22, fontWeight: 800, color: '#fff' },
  kpiLabel: { fontSize: 11, color: '#8888aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #333366', color: '#8888aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  td: { padding: '10px 12px', borderBottom: '1px solid #1e1e3e', color: '#ccc' },
  accent: '#00B4D8',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  gray: '#6b7280',
};

const badge = (color, text) => (
  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + '22', color }}>{text}</span>
);

const statusBadge = (status) => {
  const map = { active: S.green, healthy: S.green, ok: S.green, up: S.green, success: S.green, completed: S.green, processed: S.green, firing: S.red, critical: S.red, failed: S.red, down: S.red, error: S.red, dead_letter: S.red, warning: S.yellow, pending: S.yellow, running: S.accent, provisioning: S.accent, suspended: S.gray, inactive: S.gray, revoked: S.gray };
  return badge(map[status] || S.gray, status);
};

const pctColor = (pct) => pct >= 80 ? S.red : pct >= 60 ? S.yellow : S.green;

const ProgressBar = ({ pct, label }) => (
  <div style={{ marginBottom: 8 }}>
    {label && <div style={{ fontSize: 12, color: '#8888aa', marginBottom: 4 }}>{label}</div>}
    <div style={{ height: 8, borderRadius: 4, background: '#1a1a2e', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, borderRadius: 4, background: pctColor(pct), transition: 'width .3s' }} />
    </div>
    <div style={{ fontSize: 11, color: pctColor(pct), marginTop: 2 }}>{pct.toFixed(1)}%</div>
  </div>
);

const Btn = ({ children, onClick, small, danger, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: small ? '4px 12px' : '8px 16px', borderRadius: 8, border: 'none', background: danger ? S.red + '33' : S.accent + '22', color: danger ? S.red : S.accent, fontWeight: 600, fontSize: small ? 11 : 13, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1 }}>{children}</button>
);

const Empty = ({ text }) => <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>{text || 'Noch keine Daten'}</div>;
const Spin = () => <div style={{ padding: 32, textAlign: 'center', color: '#8888aa' }}>Laden...</div>;

const fmtBytes = (b) => { if (!b) return '0 B'; const u = ['B','KB','MB','GB','TB']; let i = 0; let v = Number(b); while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; } return v.toFixed(i > 1 ? 1 : 0) + ' ' + u[i]; };
const fmtSec = (s) => { const d = Math.floor(s/86400); const h = Math.floor((s%86400)/3600); return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((s%3600)/60)}m`; };
const fmtEur = (cents) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((cents||0)/100);

/* ═══════════════════════════════════════════════════════════
   DATA HOOK
   ═══════════════════════════════════════════════════════════ */
function useOperatorData() {
  const [d, setD] = useState({});
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(null);

  const load = useCallback(async (key, fn) => {
    try {
      const data = await fn();
      setD(prev => ({ ...prev, [key]: data }));
      setApiConnected(true);
      return data;
    } catch (err) {
      console.warn(`Failed to load ${key}:`, err.message);
      if (key === 'overview') setApiConnected(false);
      return null;
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      load('overview', api.getPlatformOverview),
      load('health', api.getHealth),
      load('applicationStats', api.getApplicationStats),
    ]);
    setLoading(false);
  }, [load]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Tab-specific loaders
  const loadForTab = useCallback(async (tab) => {
    switch (tab) {
      case 'clinics': await load('clinics', api.getPlatformClinics); break;
      case 'monitoring':
      case 'infrastructure':
        await Promise.allSettled([
          load('infra', api.getInfrastructure),
          load('infraContainers', api.getInfraContainers),
          load('infraDb', api.getInfraDatabase),
        ]); break;
      case 'onboarding': await load('onboarding', api.getOnboarding); break;
      case 'automations': await Promise.allSettled([load('queueStats', api.getQueueStats), load('queueJobs', () => api.getQueueJobs({ limit: 20 }))]); break;
      case 'incidents': await load('incidents', () => api.getIncidents({ limit: 50 })); break;
      case 'dashboard': await load('platformStats', api.getPlatformStats); break;
      case 'logs': await load('unifiedLogs', () => api.getUnifiedLogs({ limit: 50 })); break;
      case 'api': await load('apiKeys', api.getApiKeys); break;
      case 'billing':
        await Promise.allSettled([
          load('subscriptions', api.getSubscriptions),
          load('plans', api.getSubscriptionPlans),
          load('revenue', api.getRevenue),
          load('overdue', api.getOverdueSubscriptions),
        ]); break;
      case 'security':
        await Promise.allSettled([
          load('rbac', api.getRbacPermissions),
          load('sessions', api.getSessions),
          load('apiKeys', api.getApiKeys),
        ]); break;
      case 'support': await load('clinics', api.getPlatformClinics); break;
      case 'users': await Promise.allSettled([load('users', api.getUsers), load('userStats', api.getUserStats)]); break;
      case 'whatsapp': await load('clinics', api.getPlatformClinics); break;
      case 'integrations': await load('clinics', api.getPlatformClinics); break;
      case 'applications': await Promise.allSettled([load('applications', api.getApplications), load('applicationStats', api.getApplicationStats)]); break;
      case 'outreach': await Promise.allSettled([load('outreach', api.getOutreachLeads), load('outreachStats', api.getOutreachStats)]); break;
      default: break;
    }
  }, [load]);

  return { d, loading, apiConnected, loadForTab, reload: loadAll, load };
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function OperatorPanel() {
  const { opSubTab, setOpSubTab } = useApp();
  const tab = opSubTab || "dashboard";
  const { d, loading, apiConnected, loadForTab, reload, load } = useOperatorData();

  // Load tab-specific data when tab changes
  useEffect(() => { loadForTab(tab); }, [tab, loadForTab]);

  // Auto-refresh every 30s for monitoring tabs
  useEffect(() => {
    if (tab === 'monitoring' || tab === 'infrastructure' || tab === 'dashboard') {
      const iv = setInterval(() => { loadForTab(tab); if (tab === 'dashboard') reload(); }, 30000);
      return () => clearInterval(iv);
    }
  }, [tab, loadForTab, reload]);

  return (
    <div style={{ padding: '0 8px', maxWidth: 1200 }}>
      {/* Connection status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: apiConnected ? S.green : apiConnected === false ? S.red : S.yellow }} />
        <span style={{ fontSize: 12, color: '#8888aa' }}>{apiConnected ? 'API verbunden' : apiConnected === false ? 'API getrennt' : 'Verbinden...'}</span>
        <button onClick={reload} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: S.accent, fontSize: 12, cursor: 'pointer' }}>Aktualisieren</button>
      </div>

      {/* Pending applications alert banner */}
      {d.applicationStats?.pending > 0 && (
        <div
          onClick={() => { setOpSubTab('applications'); }}
          style={{
            marginBottom: 16,
            padding: '12px 18px',
            borderRadius: 12,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            animation: 'opPulse 2s ease-in-out infinite',
          }}
        >
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: S.red,
            boxShadow: '0 0 8px rgba(239,68,68,0.6)',
            flexShrink: 0,
            animation: 'opDotPulse 1.5s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: S.red }}>
            {d.applicationStats.pending} neue Bewerbung{d.applicationStats.pending !== 1 ? 'en' : ''} warten
          </span>
        </div>
      )}
      <style>{`
        @keyframes opPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
        @keyframes opDotPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 8px rgba(239,68,68,0.6); }
          50% { transform: scale(1.3); box-shadow: 0 0 16px rgba(239,68,68,0.8); }
        }
      `}</style>

      {loading && !d.overview ? <Spin /> : (
        <>
          {tab === 'dashboard' && <TabDashboard d={d} />}
          {tab === 'clinics' && <TabClinics d={d} load={load} />}
          {tab === 'onboarding' && <TabOnboarding d={d} load={load} />}
          {tab === 'applications' && <TabApplications d={d} load={load} />}
          {tab === 'outreach' && <TabOutreach d={d} load={load} />}
          {tab === 'whatsapp' && <TabWhatsApp d={d} load={load} />}
          {tab === 'integrations' && <TabIntegrations d={d} load={load} />}
          {tab === 'automations' && <TabAutomations d={d} load={load} />}
          {tab === 'monitoring' && <TabMonitoring d={d} />}
          {tab === 'incidents' && <TabIncidents d={d} load={load} />}
          {tab === 'logs' && <TabLogs d={d} load={load} />}
          {tab === 'api' && <TabApiKeys d={d} load={load} />}
          {tab === 'billing' && <TabBilling d={d} load={load} />}
          {tab === 'security' && <TabSecurity d={d} load={load} />}
          {tab === 'infrastructure' && <TabInfrastructure d={d} load={load} />}
          {tab === 'support' && <TabSupport d={d} />}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   1) OVERVIEW / DASHBOARD
   ═══════════════════════════════════════════════════════════ */
function TabDashboard({ d }) {
  const ov = d.overview;
  const h = d.health;
  const st = d.platformStats;
  return (
    <><style>{`[id*="fm-analytics"] div, [id*="fm-analytics"] span, .fm-analytics-wrap div, .fm-analytics-wrap span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .fm-analytics-wrap { max-width: 100%; overflow: hidden; }`}</style>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Plattformübersicht</h2>
      <div style={S.grid4}>
        <div style={S.card}>
          <div style={S.kpiLabel}>MRR</div>
          <div style={S.kpi}>{fmtEur(ov?.totalMrr || ov?.mrr)}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Aktive Kliniken</div>
          <div style={S.kpi}>{ov?.activeClinics ?? ov?.clinicCount ?? 0}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Benutzer gesamt</div>
          <div style={S.kpi}>{ov?.totalUsers ?? ov?.userCount ?? 0}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Systemzustand</div>
          <div style={S.kpi}>{h?.status === 'healthy' ? '✓' : '!'}</div>
          <div style={{ fontSize: 12, color: h?.status === 'healthy' ? S.green : S.red }}>{h?.status || 'unbekannt'}</div>
        </div>
      </div>

      {/* Enhanced KPIs from /stats */}
      {st && (
        <div style={S.grid3}>
          <div style={S.card}>
            <div style={S.kpiLabel}>Nachrichten heute</div>
            <div style={S.kpiSm}>{st.messagesToday ?? 0}</div>
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Automatisierung Erfolgsrate</div>
            <div style={{ ...S.kpiSm, color: (st.automationSuccessRate ?? 100) >= 95 ? S.green : (st.automationSuccessRate ?? 100) >= 80 ? S.yellow : S.red }}>{st.automationSuccessRate ?? 100}%</div>
            {st.automationStats && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{st.automationStats.success}/{st.automationStats.total} Jobs OK, {st.automationStats.failed} fehlgeschlagen</div>}
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Webhook-Fehlerrate</div>
            <div style={{ ...S.kpiSm, color: (st.webhookErrorRate ?? 0) <= 2 ? S.green : (st.webhookErrorRate ?? 0) <= 10 ? S.yellow : S.red }}>{st.webhookErrorRate ?? 0}%</div>
            {st.webhookStats && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{st.webhookStats.failed}/{st.webhookStats.total} fehlgeschlagen (24h)</div>}
          </div>
        </div>
      )}

      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.kpiLabel}>Dienste</div>
          {h?.checks ? Object.entries(h.checks).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e1e3e' }}>
              <span style={{ color: '#ccc', textTransform: 'capitalize' }}>{k}</span>
              <span>{statusBadge(v.status)}</span>
            </div>
          )) : <Empty text="Keine Gesundheitsdaten" />}
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Systeminfo</div>
          {h && (
            <div style={{ fontSize: 13, color: '#ccc', lineHeight: 2 }}>
              <div>Betriebszeit: <b style={{ color: '#fff' }}>{fmtSec(h.uptime || 0)}</b></div>
              <div>DB-Latenz: <b style={{ color: '#fff' }}>{h.checks?.database?.latency ?? '?'}ms</b></div>
              <div>Redis-Latenz: <b style={{ color: '#fff' }}>{h.checks?.redis?.latency ?? '?'}ms</b></div>
              <div>Version: <b style={{ color: '#fff' }}>{h.version}</b></div>
            </div>
          )}
        </div>
      </div>

      {/* WA Profile Requests from Clinics */}
      {st?.profileRequests?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 12 }}>📱 WhatsApp-Profil Anfragen</h3>
          {st.profileRequests.map(pr => {
            const p = pr.wa_profile_request || {};
            return (
              <div key={pr.id} style={{ ...S.card, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{pr.name}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Eingereicht: {new Date(pr.wa_profile_request_at).toLocaleString('de-DE')}</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(255,138,42,0.12)', color: '#ff8a2a' }}>Einrichten</span>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {p.logoUrl && (
                    <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '2px solid #333', flexShrink: 0 }}>
                      <img src={p.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
                    <div><span style={{ color: '#666' }}>Display Name:</span> <b style={{ color: '#fff' }}>{p.botName || '—'}</b></div>
                    <div><span style={{ color: '#666' }}>About:</span> <b style={{ color: '#fff' }}>{p.about || '—'}</b></div>
                    <div><span style={{ color: '#666' }}>Adresse:</span> <b style={{ color: '#fff' }}>{p.address || '—'}</b></div>
                    <div><span style={{ color: '#666' }}>E-Mail:</span> <b style={{ color: '#fff' }}>{p.email || '—'}</b></div>
                    <div><span style={{ color: '#666' }}>Website:</span> <b style={{ color: '#fff' }}>{p.websites?.join(', ') || '—'}</b></div>
                    <div><span style={{ color: '#666' }}>Kategorie:</span> <b style={{ color: '#fff' }}>{p.vertical || '—'}</b></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   1b) APPLICATIONS / BEWERBUNGEN
   ═══════════════════════════════════════════════════════════ */
function TabApplications({ d, load }) {
  const [filter, setFilter] = useState('pending');
  const [msg, setMsg] = useState(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const apps = d.applications;
  const stats = d.applicationStats;

  const refresh = () => load('applications', () => api.getApplications({ status: filter === 'all' ? undefined : filter }));

  useEffect(() => {
    load('applications', () => api.getApplications({ status: filter === 'all' ? undefined : filter }));
  }, [filter]);

  const handleApprove = async (app) => {
    try {
      setMsg(null);
      await api.approveApplication(app.id, { paymentLink: paymentLink || undefined });
      setMsg({ type: 'ok', text: `${app.clinic_name} angenommen${paymentLink ? ' — Zahlungslink gesendet' : ''}` });
      setPaymentLink('');
      setExpandedId(null);
      await refresh();
      load('applicationStats', api.getApplicationStats);
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  };

  const handleReject = async (app) => {
    if (!confirm(`"${app.clinic_name}" wirklich ablehnen?`)) return;
    try {
      setMsg(null);
      await api.rejectApplication(app.id, { reason: rejectReason || undefined });
      setMsg({ type: 'ok', text: `${app.clinic_name} abgelehnt` });
      setRejectReason('');
      setExpandedId(null);
      await refresh();
      load('applicationStats', api.getApplicationStats);
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  };

  const planBadge = (plan) => {
    const colors = { core: S.accent, pro: S.green, operations: '#a855f7', enterprise: '#eab308' };
    const labels = { core: 'Core €690', pro: 'Pro €990', operations: 'Ops €1.490', enterprise: 'Enterprise €2.500+' };
    return badge(colors[plan] || S.gray, labels[plan] || plan);
  };

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Bewerbungen</h2>

      {/* Stats */}
      {stats && (
        <div style={S.grid4}>
          <div style={S.card}>
            <div style={S.kpiLabel}>Ausstehend</div>
            <div style={{ ...S.kpi, color: stats.pending > 0 ? '#fbbf24' : '#fff' }}>{stats.pending}</div>
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Angenommen</div>
            <div style={{ ...S.kpi, color: S.green }}>{stats.approved}</div>
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Abgelehnt</div>
            <div style={{ ...S.kpi, color: S.gray }}>{stats.rejected}</div>
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Letzte 7 Tage</div>
            <div style={S.kpi}>{stats.last_7_days}</div>
          </div>
        </div>
      )}

      {msg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${msg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: msg.type === 'ok' ? S.green : S.red }}>{msg.text}</div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: 8, border: `1px solid ${filter === f ? S.accent : '#333366'}`,
            background: filter === f ? S.accent + '22' : 'transparent', color: filter === f ? S.accent : '#8888aa',
            fontWeight: filter === f ? 700 : 500, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
          }}>{f === 'pending' ? 'Ausstehend' : f === 'approved' ? 'Angenommen' : f === 'rejected' ? 'Abgelehnt' : 'Alle'}</button>
        ))}
      </div>

      {/* Applications list */}
      {!apps ? <Spin /> : !apps.applications?.length ? <Empty text="Keine Bewerbungen" /> : (
        <div>
          {apps.applications.map(app => (
            <div key={app.id} style={{ ...S.card, borderLeft: `3px solid ${app.status === 'pending' ? '#fbbf24' : app.status === 'approved' ? S.green : S.gray}` }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{app.clinic_name}</div>
                  <div style={{ fontSize: 13, color: '#8888aa', marginTop: 2 }}>
                    {app.contact_name} · {app.email}
                    {app.phone && ` · ${app.phone}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {planBadge(app.selected_plan)}
                  {app.meta_verified ? badge(S.green, 'Meta ✓') : badge(S.red, 'Meta ✗')}
                  {statusBadge(app.status)}
                </div>
              </div>

              {/* Quick info */}
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: '#8888aa' }}>
                {app.patients_per_month && <span>📊 {app.patients_per_month} Pat./Monat</span>}
                {app.start_timeline && <span>📅 Start: {app.start_timeline}</span>}
                {app.website && <span>🌐 {app.website}</span>}
                <span style={{ marginLeft: 'auto' }}>{timeAgo(app.created_at)}</span>
              </div>

              {/* Expanded detail */}
              {expandedId === app.id && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e1e3e' }}>
                  <div style={S.grid3}>
                    <div>
                      <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Klinik</div>
                      <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{app.clinic_name}</div>
                      {app.website && <a href={app.website.startsWith('http') ? app.website : `https://${app.website}`} target="_blank" rel="noopener" style={{ fontSize: 12, color: S.accent }}>{app.website}</a>}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Kontakt</div>
                      <div style={{ fontSize: 14, color: '#fff' }}>{app.contact_name}</div>
                      <div style={{ fontSize: 12, color: '#8888aa' }}>{app.email}</div>
                      {app.phone && <div style={{ fontSize: 12, color: '#8888aa' }}>{app.phone}</div>}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Qualifikation</div>
                      <div style={{ fontSize: 13, color: '#ccc' }}>
                        Meta: {app.meta_verified ? <span style={{ color: S.green }}>Verifiziert ✓</span> : <span style={{ color: S.red }}>Nicht verifiziert ✗</span>}
                      </div>
                      <div style={{ fontSize: 13, color: '#ccc' }}>Patienten: {app.patients_per_month || '-'}/Monat</div>
                      <div style={{ fontSize: 13, color: '#ccc' }}>Start: {app.start_timeline || '-'}</div>
                    </div>
                  </div>

                  {app.message && (
                    <div style={{ marginTop: 12, padding: 12, background: '#1a1a2e', borderRadius: 8, fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>
                      <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Nachricht</div>
                      {app.message}
                    </div>
                  )}

                  {/* Actions */}
                  {app.status === 'pending' && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e1e3e' }}>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, color: '#8888aa', display: 'block', marginBottom: 4 }}>Stripe Zahlungslink (optional — wird per Mail gesendet)</label>
                        <input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} placeholder="https://buy.stripe.com/..." style={inputStyle} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Btn onClick={() => handleApprove(app)}>🟢 Annehmen{paymentLink ? ' & Link senden' : ''}</Btn>
                        <Btn danger onClick={() => handleReject(app)}>🔴 Ablehnen</Btn>
                      </div>
                    </div>
                  )}

                  {app.status === 'approved' && app.stripe_payment_link && (
                    <div style={{ marginTop: 12, fontSize: 12, color: '#8888aa' }}>
                      Zahlungslink: <a href={app.stripe_payment_link} target="_blank" rel="noopener" style={{ color: S.accent }}>{app.stripe_payment_link}</a>
                      {app.payment_status === 'paid' ? badge(S.green, 'Bezahlt') : badge(S.yellow, 'Ausstehend')}
                    </div>
                  )}

                  {app.status === 'rejected' && app.rejection_reason && (
                    <div style={{ marginTop: 12, fontSize: 12, color: S.red }}>Grund: {app.rejection_reason}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   1c) OUTREACH / LEAD TRACKING
   ═══════════════════════════════════════════════════════════ */
const OUTREACH_TEMPLATES = {
  en_message_1: `Hi {contact},\n\nI came across {clinic} and was impressed by your results and patient volume.\n\nQuick question — how long does your team take to respond to new WhatsApp inquiries? We found that 60% of patients book with the clinic that responds first.\n\nWe built an AI WhatsApp system specifically for hair transplant clinics:\n- Responds in under 30 seconds, 24/7\n- Qualifies patients, answers pricing & technique questions automatically\n- Books consultations in 7 languages (TR, EN, DE, AR, FR, ES, IT)\n- Works on your existing WhatsApp number\n\nWould a 10-minute screen share be worth your time this week?\n\nBest,\nBastian\nFlowmatix — flowmatix.io`,

  tr_message_1: `Merhaba {contact},\n\n{clinic} hakkında araştırma yaparken klinik sonuçlarınız ve hasta hacminiz dikkatimi çekti.\n\nKısa bir soru — ekibiniz yeni WhatsApp hasta başvurularına ne kadar sürede dönüş yapıyor? Araştırmalarımıza göre hastaların %60'ı ilk yanıt veren kliniği tercih ediyor.\n\nSaç ekimi klinikleri için özel olarak geliştirdiğimiz bir yapay zeka WhatsApp sistemi var:\n- 30 saniye içinde otomatik yanıt, 7/24\n- Hastaları otomatik olarak değerlendirir, fiyat ve teknik soruları yanıtlar\n- 7 dilde randevu oluşturur (TR, EN, DE, AR, FR, ES, IT)\n- Mevcut WhatsApp numaranız üzerinden çalışır\n\nBu hafta 10 dakikalık kısa bir demo için müsait olur musunuz?\n\nSaygılarımla,\nBastian\nFlowmatix — flowmatix.io`,

  en_follow_up_1: `Hi {contact},\n\nFollowing up briefly — I know your schedule is packed.\n\nOne concrete number: a clinic using our system went from 4-hour average response time to 28 seconds. Their booking rate doubled within the first month.\n\nIf this isn't relevant for {clinic} right now, no worries at all. But if you're curious, I can show you a live demo in 10 minutes — no commitment.\n\nBastian`,

  tr_follow_up_1: `Merhaba {contact},\n\nKısaca tekrar yazmak istedim — programınızın yoğun olduğunu biliyorum.\n\nSomut bir rakam: Sistemimizi kullanan bir klinik, ortalama yanıt süresini 4 saatten 28 saniyeye düşürdü. İlk ay içinde randevu oranları ikiye katlandı.\n\nEğer şu an {clinic} için uygun değilse, hiç sorun değil. Ama merak ediyorsanız, 10 dakikada canlı bir demo gösterebilirim — herhangi bir taahhüt yok.\n\nBastian`,

  en_follow_up_2: `Hi {contact},\n\nLast message from me, I promise 😊\n\nWe're currently onboarding our first 5 clinics in Turkey with a special launch offer — setup fee waived and 50% off the first 3 months.\n\nIf the timing is better later, feel free to apply anytime: flowmatix.io/apply\n\nWishing {clinic} continued success!\n\nBastian`,

  tr_follow_up_2: `Merhaba {contact},\n\nSon mesajım, söz veriyorum 😊\n\nŞu anda Türkiye'deki ilk 5 kliniğimizi özel bir lansman teklifiyle kabul ediyoruz — kurulum ücreti ücretsiz ve ilk 3 ay %50 indirimli.\n\nEğer zamanlama şu an uygun değilse, istediğiniz zaman başvurabilirsiniz: flowmatix.io/apply\n\n{clinic}'e başarılar diliyorum!\n\nBastian`,
};

const OUTREACH_STATUSES = [
  { key: 'not_contacted', label: 'Nicht kontaktiert', color: '#6b7280' },
  { key: 'message_1', label: 'Nachricht 1', color: '#3b82f6' },
  { key: 'follow_up_1', label: 'Follow-up 1', color: '#8b5cf6' },
  { key: 'follow_up_2', label: 'Follow-up 2', color: '#a855f7' },
  { key: 'replied', label: 'Geantwortet', color: '#eab308' },
  { key: 'demo_scheduled', label: 'Demo', color: '#f97316' },
  { key: 'won', label: 'Gewonnen', color: '#22c55e' },
  { key: 'lost', label: 'Verloren', color: '#ef4444' },
];

function TabOutreach({ d, load }) {
  const [filter, setFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newLead, setNewLead] = useState({ clinic_name: '', contact_name: '', contact_title: '', city: 'Istanbul', website: '', email: '', phone: '', tags: '' });
  const [notesMap, setNotesMap] = useState({});

  const leads = d.outreach?.leads || [];
  const stats = d.outreachStats || {};

  const filteredLeads = filter ? leads.filter(l => l.status === filter) : leads;

  const refresh = () => {
    load('outreach', () => api.getOutreachLeads(filter ? { status: filter } : {}));
    load('outreachStats', api.getOutreachStats);
  };

  const doSearch = () => {
    load('outreach', () => api.getOutreachLeads({ search }));
  };

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2000);
  };

  const copyTemplate = (templateKey, lead) => {
    const contact = lead.contact_name || lead.contact_title || 'there';
    const clinic = lead.clinic_name;
    const text = OUTREACH_TEMPLATES[templateKey]
      .replace(/\{contact\}/g, contact)
      .replace(/\{clinic\}/g, clinic);
    navigator.clipboard?.writeText(text);
    showToast('Kopiert!');
  };

  const handleStatusChange = async (lead, newStatus) => {
    try {
      const update = { status: newStatus, last_contacted_at: new Date().toISOString() };
      if (newStatus === 'follow_up_1') {
        update.next_follow_up_at = new Date(Date.now() + 3 * 86400000).toISOString();
      } else if (newStatus === 'follow_up_2') {
        update.next_follow_up_at = new Date(Date.now() + 7 * 86400000).toISOString();
      } else if (newStatus === 'replied') {
        update.reply_received_at = new Date().toISOString();
        update.next_follow_up_at = null;
      } else if (newStatus === 'demo_scheduled' || newStatus === 'won' || newStatus === 'lost') {
        update.next_follow_up_at = null;
      }
      await api.updateOutreachLead(lead.id, update);
      setMsg({ type: 'ok', text: `${lead.clinic_name} -> ${newStatus}` });
      refresh();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  };

  const handleNotesSave = async (lead, notes) => {
    try {
      await api.updateOutreachLead(lead.id, { notes });
    } catch (err) { console.warn('Notes save failed', err); }
  };

  const handleCreate = async () => {
    if (!newLead.clinic_name.trim()) return;
    try {
      await api.createOutreachLead(newLead);
      setMsg({ type: 'ok', text: `${newLead.clinic_name} hinzugefügt` });
      setNewLead({ clinic_name: '', contact_name: '', contact_title: '', city: 'Istanbul', website: '', email: '', phone: '', tags: '' });
      setShowAdd(false);
      refresh();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  };

  const handleDelete = async (lead) => {
    if (!confirm(`"${lead.clinic_name}" wirklich löschen?`)) return;
    try {
      await api.deleteOutreachLead(lead.id);
      setMsg({ type: 'ok', text: `${lead.clinic_name} gelöscht` });
      refresh();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  };

  const outreachBadge = (status) => {
    const s = OUTREACH_STATUSES.find(x => x.key === status);
    if (!s) return badge(S.gray, status);
    return badge(s.color, s.label);
  };

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 20, margin: 0 }}>Outreach-Pipeline</h2>
        <Btn onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Abbrechen' : '+ Lead hinzufügen'}</Btn>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, padding: '8px 20px', borderRadius: 8, background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 13, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,.3)' }}>{toast}</div>
      )}

      {/* Add lead form */}
      {showAdd && (
        <div style={{ ...S.card, borderLeft: `3px solid ${S.accent}`, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Neuer Lead</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <input value={newLead.clinic_name} onChange={e => setNewLead({ ...newLead, clinic_name: e.target.value })} placeholder="Klinikname *" style={inputStyle} />
            <input value={newLead.contact_name} onChange={e => setNewLead({ ...newLead, contact_name: e.target.value })} placeholder="Kontaktname" style={inputStyle} />
            <input value={newLead.contact_title} onChange={e => setNewLead({ ...newLead, contact_title: e.target.value })} placeholder="Titel (z.B. Inhaber)" style={inputStyle} />
            <input value={newLead.city} onChange={e => setNewLead({ ...newLead, city: e.target.value })} placeholder="Stadt" style={inputStyle} />
            <input value={newLead.website} onChange={e => setNewLead({ ...newLead, website: e.target.value })} placeholder="Website" style={inputStyle} />
            <input value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} placeholder="E-Mail" style={inputStyle} />
            <input value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} placeholder="Telefon" style={inputStyle} />
            <input value={newLead.tags} onChange={e => setNewLead({ ...newLead, tags: e.target.value })} placeholder="Tags (kommagetrennt)" style={inputStyle} />
            <div><Btn onClick={handleCreate}>Lead erstellen</Btn></div>
          </div>
        </div>
      )}

      {msg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${msg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: msg.type === 'ok' ? S.green : S.red }}>{msg.text}</div>
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {OUTREACH_STATUSES.map(s => (
          <div key={s.key} onClick={() => setFilter(filter === s.key ? null : s.key)} style={{
            padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
            background: filter === s.key ? s.color + '33' : '#23234a',
            border: `1px solid ${filter === s.key ? s.color : '#333366'}`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{stats[s.key] || 0}</span>
            <span style={{ fontSize: 11, color: filter === s.key ? s.color : '#8888aa', fontWeight: filter === s.key ? 700 : 500 }}>{s.label}</span>
          </div>
        ))}
        <div style={{ padding: '6px 14px', borderRadius: 8, background: '#23234a', border: '1px solid #333366', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{stats.total || 0}</span>
          <span style={{ fontSize: 11, color: '#8888aa' }}>Gesamt</span>
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="Kliniken, Kontakte, Städte, Tags suchen..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13 }} />
        <Btn onClick={doSearch}>Suchen</Btn>
        {(search || filter) && <Btn onClick={() => { setSearch(''); setFilter(null); load('outreach', api.getOutreachLeads); }}>Zurücksetzen</Btn>}
      </div>

      {/* Leads list */}
      {!d.outreach ? <Spin /> : !filteredLeads.length ? <Empty text="Keine Leads gefunden" /> : (
        <div>
          {filteredLeads.map(lead => {
            const isExpanded = expandedId === lead.id;
            const currentNotes = notesMap[lead.id] !== undefined ? notesMap[lead.id] : (lead.notes || '');
            return (
              <div key={lead.id} style={{
                ...S.card,
                borderLeft: `3px solid ${(OUTREACH_STATUSES.find(x => x.key === lead.status) || {}).color || S.gray}`,
                transition: 'all .2s',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{lead.clinic_name}</div>
                    <div style={{ fontSize: 13, color: '#8888aa', marginTop: 2 }}>
                      {lead.contact_name && <span>{lead.contact_name}</span>}
                      {lead.contact_title && <span style={{ color: '#666' }}> · {lead.contact_title}</span>}
                      {lead.city && <span style={{ color: '#666' }}> · {lead.city}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {outreachBadge(lead.status)}
                    {lead.website && (
                      <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: S.accent, textDecoration: 'none' }}>
                        {lead.website}
                      </a>
                    )}
                  </div>
                </div>

                {/* Quick info row */}
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#8888aa', flexWrap: 'wrap' }}>
                  {lead.tags && lead.tags.split(',').map(t => (
                    <span key={t.trim()} style={{ padding: '1px 8px', borderRadius: 99, background: '#1a1a2e', border: '1px solid #333366', fontSize: 10, color: '#8888aa' }}>{t.trim()}</span>
                  ))}
                  {lead.last_contacted_at && <span>Zuletzt: {timeAgo(lead.last_contacted_at)}</span>}
                  {lead.next_follow_up_at && <span style={{ color: new Date(lead.next_follow_up_at) < new Date() ? S.red : S.yellow }}>Follow-up: {new Date(lead.next_follow_up_at).toLocaleDateString()}</span>}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e1e3e' }}>
                    <div style={S.grid3}>
                      <div>
                        <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Kontaktdaten</div>
                        {lead.email && <div style={{ fontSize: 13, color: '#ccc' }}>E-Mail: {lead.email}</div>}
                        {lead.phone && <div style={{ fontSize: 13, color: '#ccc' }}>Telefon: {lead.phone}</div>}
                        {lead.whatsapp && <div style={{ fontSize: 13, color: '#ccc' }}>WhatsApp: {lead.whatsapp}</div>}
                        {lead.linkedin_url && <a href={lead.linkedin_url} target="_blank" rel="noopener" style={{ fontSize: 13, color: S.accent }}>LinkedIn</a>}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Standort</div>
                        <div style={{ fontSize: 13, color: '#ccc' }}>{lead.city}, {lead.country || 'Turkey'}</div>
                        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Quelle: {lead.source || 'research'}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>Hinzugefügt: {timeAgo(lead.created_at)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Status</div>
                        <select
                          value={lead.status}
                          onChange={e => handleStatusChange(lead, e.target.value)}
                          style={{ ...inputStyle, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
                        >
                          {OUTREACH_STATUSES.map(s => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Notes */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Notizen</div>
                      <textarea
                        value={currentNotes}
                        onChange={e => setNotesMap(prev => ({ ...prev, [lead.id]: e.target.value }))}
                        onBlur={() => {
                          if (notesMap[lead.id] !== undefined && notesMap[lead.id] !== (lead.notes || '')) {
                            handleNotesSave(lead, notesMap[lead.id]);
                          }
                        }}
                        placeholder="Notizen hinzufügen..."
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                      />
                    </div>

                    {/* Copy Template buttons */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 6 }}>Vorlagen kopieren</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => copyTemplate('en_message_1', lead)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #333366', background: '#1a1a2e', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>EN Nachricht 1</button>
                        <button onClick={() => copyTemplate('tr_message_1', lead)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #333366', background: '#1a1a2e', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>TR Nachricht 1</button>
                        <button onClick={() => copyTemplate('en_follow_up_1', lead)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #333366', background: '#1a1a2e', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>EN Follow-up 1</button>
                        <button onClick={() => copyTemplate('tr_follow_up_1', lead)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #333366', background: '#1a1a2e', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>TR Follow-up 1</button>
                        <button onClick={() => copyTemplate('en_follow_up_2', lead)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #333366', background: '#1a1a2e', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>EN Follow-up 2</button>
                        <button onClick={() => copyTemplate('tr_follow_up_2', lead)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #333366', background: '#1a1a2e', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>TR Follow-up 2</button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      <Btn small danger onClick={() => handleDelete(lead)}>Löschen</Btn>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   2) CLINICS
   ═══════════════════════════════════════════════════════════ */
function TabClinics({ d, load }) {
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState(null);
  const [waStatus, setWaStatus] = useState(null);
  const [provLoading, setProvLoading] = useState(null);
  const clinics = d.clinics;

  const doSearch = () => load('clinics', () => api.getPlatformClinics({ search }));
  const refresh = () => load('clinics', api.getPlatformClinics);

  // Load WhatsApp status
  useEffect(() => {
    api.getWaProvisionStatus().then(r => setWaStatus(r.clinics || [])).catch(() => {});
  }, []);

  const getWaState = (orgId) => {
    if (!waStatus) return null;
    return waStatus.find(w => w.organization_id === orgId);
  };

  const waStateBadge = (state) => {
    const map = {
      'requested': { label: '📱 Nummer eingereicht', color: '#fbbf24' },
      'awaiting_otp': { label: '🟡 Warte auf OTP', color: '#fbbf24' },
      'active': { label: '🟢 Verbunden', color: '#10b981' },
      'connected': { label: '🟢 Verbunden', color: '#10b981' },
      'not_connected': { label: '⚪ Nicht verbunden', color: '#666' },
      'failed': { label: '🔴 Fehler', color: '#ef4444' },
    };
    const m = map[state] || { label: state || '—', color: '#666' };
    return <span style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{m.label}</span>;
  };

  const handleProvision = async (orgId, orgName) => {
    setProvLoading(orgId);
    setActionMsg(null);
    try {
      await api.provisionWhatsApp(orgId);
      setActionMsg({ type: 'ok', text: `${orgName}: WhatsApp provisioniert — OTP wurde gesendet` });
      // Refresh WA status
      const r = await api.getWaProvisionStatus();
      setWaStatus(r.clinics || []);
    } catch (err) {
      setActionMsg({ type: 'err', text: `${orgName}: ${err.message}` });
    }
    setProvLoading(null);
  };

  const handleAction = async (action, orgId, orgName) => {
    try {
      setActionMsg(null);
      if (action === 'suspend') {
        if (!confirm(`Klinik "${orgName}" wirklich sperren?`)) return;
        await api.suspendClinic(orgId, 'Manual suspension from operator console');
        setActionMsg({ type: 'ok', text: `${orgName} gesperrt` });
      } else if (action === 'resume') {
        await api.resumeClinic(orgId, 'Resumed from operator console');
        setActionMsg({ type: 'ok', text: `${orgName} fortgesetzt` });
      } else if (action === 'impersonate') {
        const reason = prompt('Grund für Impersonation (mind. 5 Zeichen):');
        if (!reason || reason.length < 5) return;
        const res = await api.impersonateClinic(orgId, reason);
        setActionMsg({ type: 'ok', text: `Impersonation als ${res.impersonation?.targetUser} — läuft ab in ${res.impersonation?.expiresIn}` });
      } else if (action === 'regen') {
        const res = await api.regenOnboardingLink(orgId);
        setActionMsg({ type: 'ok', text: `Neuer Onboarding-Link: ${res.invitation?.link}` });
      }
      await refresh();
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Kliniken</h2>
      {actionMsg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${actionMsg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: actionMsg.type === 'ok' ? S.green : S.red, wordBreak: 'break-all' }}>{actionMsg.text}</div>
        </div>
      )}

      {/* WhatsApp Requests Alert */}
      {waStatus && waStatus.filter(w => w.onboarding_state === 'requested').length > 0 && (
        <div style={{ ...S.card, borderLeft: '3px solid #fbbf24', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>📱 WhatsApp-Anfragen</div>
          {waStatus.filter(w => w.onboarding_state === 'requested').map(w => (
            <div key={w.organization_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e1e3e' }}>
              <div>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{w.clinic_name}</span>
                <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{w.phone_number}</span>
              </div>
              <Btn small onClick={() => handleProvision(w.organization_id, w.clinic_name)} disabled={provLoading === w.organization_id}>
                {provLoading === w.organization_id ? 'Wird provisioniert...' : 'Provisionieren'}
              </Btn>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="Kliniken durchsuchen..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13 }} />
        <Btn onClick={doSearch}>Suchen</Btn>
      </div>
      {!clinics ? <Spin /> : !clinics.clinics?.length ? <Empty text="Noch keine Kliniken eingerichtet" /> : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Name</th><th style={S.th}>Status</th><th style={S.th}>Plan</th><th style={S.th}>WhatsApp</th><th style={S.th}>Erstellt</th><th style={S.th}>Aktionen</th>
            </tr></thead>
            <tbody>
              {clinics.clinics.map(c => {
                const wa = getWaState(c.id);
                return (
                <tr key={c.id}>
                  <td style={S.td}><span style={{ color: '#fff', fontWeight: 600 }}>{c.name}</span><br /><span style={{ fontSize: 11, color: '#666' }}>{c.email}</span></td>
                  <td style={S.td}>{statusBadge(c.is_active ? 'active' : 'inactive')}</td>
                  <td style={S.td}>{c.plan_name || '-'}</td>
                  <td style={S.td}>
                    {waStateBadge(wa?.onboarding_state || wa?.status)}
                    {wa?.phone_number && <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{wa.phone_number}</div>}
                    {wa?.onboarding_state === 'requested' && (
                      <Btn small onClick={() => handleProvision(c.id, c.name)} disabled={provLoading === c.id} style={{ marginTop: 4 }}>
                        {provLoading === c.id ? '...' : 'Provisionieren'}
                      </Btn>
                    )}
                  </td>
                  <td style={S.td}>{c.created_at ? timeAgo(c.created_at) : '-'}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {c.is_active
                        ? <Btn small danger onClick={() => handleAction('suspend', c.id, c.name)}>Sperren</Btn>
                        : <Btn small onClick={() => handleAction('resume', c.id, c.name)}>Fortsetzen</Btn>}
                      <Btn small onClick={() => handleAction('impersonate', c.id, c.name)}>Impersonieren</Btn>
                      <Btn small onClick={() => handleAction('regen', c.id, c.name)}>Link erneuern</Btn>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   3) ONBOARDING & PROVISIONING
   ═══════════════════════════════════════════════════════════ */
function TabOnboarding({ d, load }) {
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [logs, setLogs] = useState(null);
  const orgs = d.onboarding;

  const viewLogs = async (orgId) => {
    setSelectedOrg(orgId);
    try {
      const data = await api.getOnboardingLogs(orgId);
      setLogs(data.logs || []);
    } catch { setLogs([]); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Onboarding & Bereitstellung</h2>
      {!orgs ? <Spin /> : !orgs.organizations?.length ? (
        <div style={S.card}><Empty text="Noch keine Organisationen. Kliniken erscheinen hier nach dem Onboarding." /></div>
      ) : (
        <>
          <div style={S.card}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Organisation</th><th style={S.th}>Status</th><th style={S.th}>Bereitgestellt von</th><th style={S.th}>Erstellt</th><th style={S.th}>Aktionen</th>
              </tr></thead>
              <tbody>
                {orgs.organizations.map(o => (
                  <tr key={o.id}>
                    <td style={S.td}><span style={{ color: '#fff', fontWeight: 600 }}>{o.name}</span><br /><span style={{ fontSize: 11, color: '#666' }}>{o.slug}</span></td>
                    <td style={S.td}>{statusBadge(o.provisioning_status || 'pending')}</td>
                    <td style={S.td}>{o.provisioned_by_name || '-'}</td>
                    <td style={S.td}>{o.created_at ? timeAgo(o.created_at) : '-'}</td>
                    <td style={S.td}><Btn small onClick={() => viewLogs(o.id)}>Logs anzeigen</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedOrg && (
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={S.kpiLabel}>Bereitstellungsschritte</div>
                <Btn small onClick={() => setSelectedOrg(null)}>Schließen</Btn>
              </div>
              {!logs ? <Spin /> : !logs.length ? <Empty text="Keine Bereitstellungs-Logs gefunden" /> : (
                <div>
                  {logs.map((l, i) => (
                    <div key={l.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e1e3e' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: l.status === 'success' ? S.green + '22' : l.status === 'failed' ? S.red + '22' : S.yellow + '22', color: l.status === 'success' ? S.green : l.status === 'failed' ? S.red : S.yellow }}>{l.step_order || i+1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{l.step}</div>
                        {l.error_message && <div style={{ fontSize: 11, color: S.red, marginTop: 2 }}>{l.error_message}</div>}
                      </div>
                      <div>{statusBadge(l.status)}</div>
                      {l.duration_ms && <div style={{ fontSize: 11, color: '#666' }}>{l.duration_ms}ms</div>}
                      {l.status === 'failed' && <Btn small onClick={async () => { try { await api.retryProvisioningStep(selectedOrg, l.step); await viewLogs(selectedOrg); } catch (err) { alert('Wiederholung fehlgeschlagen: ' + err.message); } }}>Wiederholen</Btn>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   4) WHATSAPP / META OPERATIONS
   ═══════════════════════════════════════════════════════════ */
function TabWhatsApp({ d, load }) {
  const clinics = d.clinics;
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [waConfig, setWaConfig] = useState(null);
  const [waLoading, setWaLoading] = useState(false);
  const [form, setForm] = useState({ phoneNumberId: '', businessAccountId: '', accessToken: '', webhookVerifyToken: '' });
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectClinic = async (orgId) => {
    setSelectedClinic(orgId);
    setWaLoading(true);
    setMsg(null);
    try {
      const data = await api.getClinicWhatsapp(orgId);
      setWaConfig(data);
      if (data.whatsapp) {
        setForm({
          phoneNumberId: data.whatsapp.phoneNumberId || '',
          businessAccountId: data.whatsapp.businessAccountId || '',
          accessToken: '',
          webhookVerifyToken: data.whatsapp.webhookVerifyToken || '',
        });
      } else {
        setForm({ phoneNumberId: '', businessAccountId: '', accessToken: '', webhookVerifyToken: '' });
      }
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
    setWaLoading(false);
  };

  const saveConfig = async () => {
    if (!selectedClinic) return;
    setSaving(true);
    setMsg(null);
    try {
      const payload = {};
      if (form.phoneNumberId) payload.phoneNumberId = form.phoneNumberId;
      if (form.businessAccountId) payload.businessAccountId = form.businessAccountId;
      if (form.accessToken) payload.accessToken = form.accessToken;
      if (form.webhookVerifyToken) payload.webhookVerifyToken = form.webhookVerifyToken;
      payload.isActive = true;
      await api.updateClinicWhatsapp(selectedClinic, payload);
      setMsg({ type: 'ok', text: 'WhatsApp-Zugangsdaten gespeichert & aktiviert' });
      await selectClinic(selectedClinic);
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
    setSaving(false);
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 12, color: '#8888aa', marginBottom: 4, display: 'block', fontWeight: 600 };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>WhatsApp / Meta — Pro Klinik</h2>

      {msg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${msg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: msg.type === 'ok' ? S.green : S.red }}>{msg.text}</div>
        </div>
      )}

      {/* Clinic list with WA status */}
      {!clinics ? <Spin /> : !clinics.clinics?.length ? <Empty text="Noch keine Kliniken eingerichtet" /> : (
        <div style={S.card}>
          <div style={S.kpiLabel}>Klinik zum Konfigurieren auswählen</div>
          <table style={{ ...S.table, marginTop: 12 }}>
            <thead><tr>
              <th style={S.th}>Klinik</th><th style={S.th}>Phone Number ID</th><th style={S.th}>Status</th><th style={S.th}>Aktionen</th>
            </tr></thead>
            <tbody>
              {clinics.clinics.map(c => (
                <tr key={c.id} style={{ background: selectedClinic === c.id ? 'rgba(76,201,255,0.06)' : 'transparent' }}>
                  <td style={S.td}><span style={{ color: '#fff', fontWeight: 600 }}>{c.name}</span><br /><span style={{ fontSize: 11, color: '#666' }}>{c.slug}</span></td>
                  <td style={S.td}>{c.whatsapp_phone_id || <span style={{ color: '#666' }}>Nicht gesetzt</span>}</td>
                  <td style={S.td}>{c.whatsapp_active ? badge(S.green, 'Aktiv') : badge(S.gray, 'Inaktiv')}</td>
                  <td style={S.td}><Btn small onClick={() => selectClinic(c.id)}>Konfigurieren</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Config form for selected clinic */}
      {selectedClinic && (
        <div style={{ ...S.card, borderLeft: `3px solid ${S.accent}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>WhatsApp-Konfiguration</div>
            <Btn small onClick={() => { setSelectedClinic(null); setWaConfig(null); }}>Schließen</Btn>
          </div>

          {waLoading ? <Spin /> : (
            <>
              {/* Current status */}
              {waConfig?.whatsapp && (
                <div style={{ ...S.grid3, marginBottom: 16 }}>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>Token gesetzt</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: waConfig.whatsapp.accessTokenSet ? S.green : S.red, marginTop: 4 }}>
                      {waConfig.whatsapp.accessTokenSet ? 'Ja' : 'Nein'}
                    </div>
                    {waConfig.whatsapp.accessTokenPreview && <div style={{ fontSize: 11, color: '#555', marginTop: 4, fontFamily: 'monospace' }}>{waConfig.whatsapp.accessTokenPreview}</div>}
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>Aktiv</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: waConfig.whatsapp.isActive ? S.green : S.gray, marginTop: 4 }}>
                      {waConfig.whatsapp.isActive ? 'Aktiv' : 'Inaktiv'}
                    </div>
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>Letzter Webhook</div>
                    <div style={{ fontSize: 14, color: '#ccc', marginTop: 4 }}>{waConfig.whatsapp.lastWebhookAt ? timeAgo(waConfig.whatsapp.lastWebhookAt) : 'Nie'}</div>
                  </div>
                </div>
              )}

              {/* Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Phone Number ID</label>
                  <input value={form.phoneNumberId} onChange={e => setForm(f => ({ ...f, phoneNumberId: e.target.value }))} placeholder="e.g. 123456789012345" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Business Account ID</label>
                  <input value={form.businessAccountId} onChange={e => setForm(f => ({ ...f, businessAccountId: e.target.value }))} placeholder="e.g. 987654321098765" style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Access Token {waConfig?.whatsapp?.accessTokenSet && <span style={{ color: S.green, fontWeight: 400 }}>(aktuell gesetzt — leer lassen zum Beibehalten)</span>}</label>
                <input value={form.accessToken} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))} placeholder="EAAxxxxxxxxx..." type="password" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Webhook Verify Token</label>
                <input value={form.webhookVerifyToken} onChange={e => setForm(f => ({ ...f, webhookVerifyToken: e.target.value }))} placeholder="Eigener Verify-Token für Meta-Webhook" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={saveConfig} disabled={saving}>{saving ? 'Speichern...' : 'Speichern & Aktivieren'}</Btn>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   4b) INTEGRATIONS (Google Calendar, API Usage)
   ═══════════════════════════════════════════════════════════ */
function TabIntegrations({ d, load }) {
  const clinics = d.clinics;
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [googleStatus, setGoogleStatus] = useState(null);
  const [gLoading, setGLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const selectClinic = async (orgId) => {
    setSelectedClinic(orgId);
    setGLoading(true);
    setMsg(null);
    try {
      const status = await api.getGoogleStatus(orgId);
      setGoogleStatus(status);
    } catch (err) {
      setGoogleStatus({ connected: false, googleOAuthAvailable: false });
    }
    setGLoading(false);
  };

  const handleDisconnect = async () => {
    if (!selectedClinic || !confirm('Google Calendar für diese Klinik trennen?')) return;
    try {
      await api.disconnectGoogle(selectedClinic);
      setMsg({ type: 'ok', text: 'Google Calendar getrennt' });
      await selectClinic(selectedClinic);
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  };

  const handleConnect = () => {
    if (!selectedClinic) return;
    const url = api.getGoogleConnectUrl(selectedClinic);
    window.open(url, '_blank', 'width=600,height=700');
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Integrationen — Pro Klinik</h2>

      {msg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${msg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: msg.type === 'ok' ? S.green : S.red }}>{msg.text}</div>
        </div>
      )}

      {/* Clinic selector */}
      {!clinics ? <Spin /> : !clinics.clinics?.length ? <Empty text="Noch keine Kliniken eingerichtet" /> : (
        <div style={S.card}>
          <div style={S.kpiLabel}>Klinik auswählen</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {clinics.clinics.map(c => (
              <button key={c.id} onClick={() => selectClinic(c.id)} style={{
                padding: '8px 16px', borderRadius: 8, border: `1px solid ${selectedClinic === c.id ? S.accent : '#333366'}`,
                background: selectedClinic === c.id ? S.accent + '22' : '#1a1a2e', color: selectedClinic === c.id ? S.accent : '#ccc',
                fontWeight: selectedClinic === c.id ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}>{c.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Integration details for selected clinic */}
      {selectedClinic && (
        <>
          {gLoading ? <Spin /> : (
            <>
              {/* Google Calendar */}
              <div style={{ ...S.card, borderLeft: `3px solid ${googleStatus?.connected ? S.green : S.gray}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>📅</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Google Calendar</div>
                      <div style={{ fontSize: 12, color: '#8888aa' }}>Termine automatisch synchronisieren</div>
                    </div>
                  </div>
                  {googleStatus?.connected ? badge(S.green, 'Verbunden') : badge(S.gray, 'Nicht verbunden')}
                </div>

                {googleStatus?.connected ? (
                  <div>
                    <div style={S.grid3}>
                      <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#8888aa' }}>Verbunden seit</div>
                        <div style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>{googleStatus.connectedAt ? timeAgo(googleStatus.connectedAt) : '-'}</div>
                      </div>
                      <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#8888aa' }}>Zuletzt verwendet</div>
                        <div style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>{googleStatus.lastUsed ? timeAgo(googleStatus.lastUsed) : 'Nie'}</div>
                      </div>
                      <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#8888aa' }}>Status</div>
                        <div style={{ fontSize: 13, color: googleStatus.lastError ? S.red : S.green, marginTop: 4 }}>{googleStatus.lastError || 'OK'}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Btn small danger onClick={handleDisconnect}>Trennen</Btn>
                    </div>
                  </div>
                ) : (
                  <div>
                    {googleStatus?.googleOAuthAvailable ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Btn onClick={handleConnect}>Google Calendar verbinden</Btn>
                        <span style={{ fontSize: 12, color: '#8888aa' }}>Klinik-Admin wird zu Google weitergeleitet</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: S.yellow }}>Google OAuth nicht konfiguriert. GOOGLE_CLIENT_ID und GOOGLE_CLIENT_SECRET in .env setzen</div>
                    )}
                  </div>
                )}
              </div>

              {/* API Usage (Flowmatix-global keys) */}
              <div style={S.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>📊</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>API-Nutzung (Flowmatix-verwaltet)</div>
                    <div style={{ fontSize: 12, color: '#8888aa' }}>OpenAI, SMTP, n8n — globale Keys, Limits pro Plan</div>
                  </div>
                </div>
                <div style={S.grid3}>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>OpenAI</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: S.green, marginTop: 4 }}>Flowmatix Key</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Nutzung pro Plan-Limits erfasst</div>
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>SMTP / E-Mail</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: S.green, marginTop: 4 }}>Flowmatix Key</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Transaktions-E-Mails</div>
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>n8n Workflows</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: S.green, marginTop: 4 }}>Flowmatix Key</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Automatisierungs-Engine</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   5) AUTOMATIONS / n8n / QUEUES
   ═══════════════════════════════════════════════════════════ */
function TabAutomations({ d, load }) {
  const stats = d.queueStats;
  const jobs = d.queueJobs;

  const handleRetry = async (id) => {
    try {
      await api.retryJob(id);
      await load('queueJobs', () => api.getQueueJobs({ limit: 20 }));
      await load('queueStats', api.getQueueStats);
    } catch (err) { alert('Wiederholung fehlgeschlagen: ' + err.message); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Automatisierungen & Warteschlangen</h2>

      {/* Queue overview */}
      {!stats ? <Spin /> : !stats.queues?.length ? (
        <div style={S.card}><Empty text="Noch keine Queue-Jobs. Jobs erscheinen wenn Automatisierungen laufen." /></div>
      ) : (
        <div style={S.grid3}>
          {stats.queues.map(q => (
            <div key={q.queue_name} style={S.card}>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, marginBottom: 8 }}>{q.queue_name}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {q.pending > 0 && badge(S.yellow, `${q.pending} ausstehend`)}
                {q.running > 0 && badge(S.accent, `${q.running} laufend`)}
                {q.completed > 0 && badge(S.green, `${q.completed} fertig`)}
                {q.failed > 0 && badge(S.red, `${q.failed} fehlgeschlagen`)}
                {q.dead_letter > 0 && badge(S.red, `${q.dead_letter} DLQ`)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* n8n link */}
      <div style={{ ...S.card, borderLeft: `3px solid ${S.accent}` }}>
        <div style={{ fontSize: 13, color: S.accent, fontWeight: 600, marginBottom: 4 }}>n8n Workflow Engine</div>
        <div style={{ fontSize: 12, color: '#8888aa' }}>Erweiterte Workflow-Verwaltung verfügbar unter <a href="https://n8n.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ color: S.accent }}>n8n.flowmatix.io</a></div>
      </div>

      {/* Recent jobs */}
      {jobs?.jobs?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Letzte Jobs</div>
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr>
              <th style={S.th}>Queue</th><th style={S.th}>Typ</th><th style={S.th}>Status</th><th style={S.th}>Org</th><th style={S.th}>Erstellt</th><th style={S.th}>Aktionen</th>
            </tr></thead>
            <tbody>
              {jobs.jobs.map(j => (
                <tr key={j.id}>
                  <td style={S.td}>{j.queue_name}</td>
                  <td style={S.td}>{j.job_type}</td>
                  <td style={S.td}>{statusBadge(j.status)}</td>
                  <td style={S.td}>{j.org_name || '-'}</td>
                  <td style={S.td}>{timeAgo(j.created_at)}</td>
                  <td style={S.td}>{(j.status === 'failed' || j.status === 'dead_letter') && <Btn small onClick={() => handleRetry(j.id)}>Wiederholen</Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   6) MONITORING (REAL SERVER DATA)
   ═══════════════════════════════════════════════════════════ */
function TabMonitoring({ d }) {
  const infra = d.infra;
  const containers = d.infraContainers;

  if (!infra) return <Spin />;
  if (infra.error) return <div style={S.card}><div style={{ color: S.red }}>Infrastrukturdaten konnten nicht geladen werden: {infra.error}</div></div>;

  const cpuPct = Number(infra.cpu?.usagePercent) || 0;
  const memPct = Number(infra.memory?.usagePercent) || 0;
  const diskPct = Number(infra.disk?.usagePercent) || 0;

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Serverüberwachung</h2>

      {/* Main gauges */}
      <div style={S.grid3}>
        <div style={S.card}>
          <div style={S.kpiLabel}>CPU-Auslastung</div>
          <div style={{ ...S.kpi, color: pctColor(cpuPct) }}>{cpuPct.toFixed(1)}%</div>
          <ProgressBar pct={cpuPct} />
          {infra.load && <div style={{ fontSize: 11, color: '#8888aa', marginTop: 4 }}>Load: {Number(infra.load.load1||0).toFixed(2)} / {Number(infra.load.load5||0).toFixed(2)} / {Number(infra.load.load15||0).toFixed(2)}</div>}
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Speicher</div>
          <div style={{ ...S.kpi, color: pctColor(memPct) }}>{fmtBytes(infra.memory?.usedBytes)}</div>
          <ProgressBar pct={memPct} label={`${fmtBytes(infra.memory?.usedBytes)} / ${fmtBytes(infra.memory?.totalBytes)}`} />
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Festplatte</div>
          <div style={{ ...S.kpi, color: pctColor(diskPct) }}>{fmtBytes(infra.disk?.usedBytes)}</div>
          <ProgressBar pct={diskPct} label={`${fmtBytes(infra.disk?.usedBytes)} / ${fmtBytes(infra.disk?.totalBytes)}`} />
        </div>
      </div>

      {/* System info */}
      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.kpiLabel}>System</div>
          <div style={{ fontSize: 13, color: '#ccc', lineHeight: 2 }}>
            <div>Betriebszeit: <b style={{ color: '#fff' }}>{fmtSec(infra.uptimeSeconds || 0)}</b></div>
            <div>Load 1m/5m/15m: <b style={{ color: '#fff' }}>{Number(infra.load?.load1||0).toFixed(2)} / {Number(infra.load?.load5||0).toFixed(2)} / {Number(infra.load?.load15||0).toFixed(2)}</b></div>
          </div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Schnellzugriff</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            <a href="https://grafana.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ color: S.accent, fontSize: 13 }}>Grafana Dashboards</a>
            <a href="https://prometheus.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ color: S.accent, fontSize: 13 }}>Prometheus Metrics</a>
            <a href="https://status.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ color: S.accent, fontSize: 13 }}>Uptime Kuma</a>
          </div>
        </div>
      </div>

      {/* Service Status */}
      {containers?.containers?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Dienststatus (Prometheus)</div>
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr>
              <th style={S.th}>Dienst</th><th style={S.th}>Status</th><th style={S.th}>Speicher</th>
            </tr></thead>
            <tbody>
              {containers.containers.map((c, i) => (
                <tr key={i}>
                  <td style={S.td}><span style={{ color: '#fff', fontWeight: 600 }}>{String(c.job || c.name || '?')}</span><br /><span style={{ fontSize: 11, color: '#555' }}>{String(c.instance || '')}</span></td>
                  <td style={S.td}>{statusBadge(c.status === 'up' || c.status === '1' || c.status === 1 ? 'up' : 'down')}</td>
                  <td style={S.td}>{c.memory ? fmtBytes(Number(c.memory) || 0) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   7) INCIDENTS
   ═══════════════════════════════════════════════════════════ */
function TabIncidents({ d, load }) {
  const incidents = d.incidents;

  const handleResolve = async (id) => {
    try {
      await api.resolveIncident(id);
      await load('incidents', () => api.getIncidents({ limit: 50 }));
    } catch (err) { alert('Fehlgeschlagen: ' + err.message); }
  };

  const handleAcknowledge = async (id) => {
    try {
      await api.acknowledgeIncident(id);
      await load('incidents', () => api.getIncidents({ limit: 50 }));
    } catch (err) { alert('Fehlgeschlagen: ' + err.message); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Vorfälle</h2>
      {!incidents ? <Spin /> : !incidents.incidents?.length ? (
        <div style={S.card}><Empty text="Keine Vorfälle. Alle Systeme betriebsbereit." /></div>
      ) : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Schweregrad</th><th style={S.th}>Titel</th><th style={S.th}>Status</th><th style={S.th}>Erstellt</th><th style={S.th}>Aktionen</th>
            </tr></thead>
            <tbody>
              {incidents.incidents.map(inc => (
                <tr key={inc.id}>
                  <td style={S.td}>{statusBadge(inc.severity)}</td>
                  <td style={S.td}>
                    <span style={{ color: '#fff' }}>{inc.title}</span>
                    {inc.description && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{inc.description?.substring(0, 80)}</div>}
                    {inc.acknowledged_at && <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>ACK {timeAgo(inc.acknowledged_at)}</div>}
                  </td>
                  <td style={S.td}>{statusBadge(inc.status || (inc.resolved_at ? 'resolved' : 'open'))}</td>
                  <td style={S.td}>{timeAgo(inc.created_at)}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {inc.status === 'open' && <Btn small onClick={() => handleAcknowledge(inc.id)}>ACK</Btn>}
                      {inc.status !== 'resolved' && !inc.resolved_at && <Btn small onClick={() => handleResolve(inc.id)}>Lösen</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   8) LOGS (Audit Log)
   ═══════════════════════════════════════════════════════════ */
function TabLogs({ d, load }) {
  const [source, setSource] = useState('');
  const logData = d.unifiedLogs;

  const doFilter = () => load('unifiedLogs', () => api.getUnifiedLogs({ limit: 50, source: source || undefined }));

  const sourceBadge = (src) => {
    const colors = { audit: S.accent, webhook: S.yellow, provisioning: S.green };
    return badge(colors[src] || S.gray, src);
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Plattform-Logs</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select value={source} onChange={e => setSource(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13 }}>
          <option value="">Alle Quellen</option>
          <option value="audit">Audit</option>
          <option value="webhook">Webhook</option>
          <option value="provisioning">Provisioning</option>
        </select>
        <Btn onClick={doFilter}>Filtern</Btn>
      </div>

      {!logData ? <Spin /> : !logData.entries?.length ? (
        <div style={S.card}><Empty text="Noch keine Log-Einträge" /></div>
      ) : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Zeit</th><th style={S.th}>Quelle</th><th style={S.th}>Akteur</th><th style={S.th}>Ereignis</th><th style={S.th}>Ressource</th><th style={S.th}>Details</th>
            </tr></thead>
            <tbody>
              {logData.entries.map(e => (
                <tr key={`${e.source}-${e.id}`}>
                  <td style={S.td}>{e.created_at ? timeAgo(e.created_at) : '-'}</td>
                  <td style={S.td}>{sourceBadge(e.source)}</td>
                  <td style={S.td}>{e.actor || '-'}</td>
                  <td style={S.td}>{statusBadge(e.event_type)}</td>
                  <td style={S.td}>{e.resource_type || '-'}</td>
                  <td style={S.td}><span style={{ fontSize: 11, color: '#888' }}>{e.details_text?.substring(0, 60) || '-'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {logData.pagination && (
            <div style={{ textAlign: 'center', padding: 12, fontSize: 12, color: '#666' }}>
              Seite {logData.pagination.page} von {logData.pagination.pages} ({logData.pagination.total} Einträge)
            </div>
          )}
        </div>
      )}

      <div style={{ ...S.card, borderLeft: `3px solid ${S.accent}` }}>
        <div style={{ fontSize: 12, color: '#8888aa' }}>Detaillierte Request- und Worker-Logs verfügbar in <a href="https://grafana.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ color: S.accent }}>Grafana / Loki</a></div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   9) API KEYS & SECRETS
   ═══════════════════════════════════════════════════════════ */
function TabApiKeys({ d, load }) {
  const keys = d.apiKeys;
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

  const refresh = () => load('apiKeys', api.getApiKeys);

  const handleCreate = async () => {
    if (!newKeyName) return;
    try {
      const res = await api.createApiKey({ name: newKeyName, expiresInDays: newKeyExpiry ? parseInt(newKeyExpiry) : undefined });
      setCreatedKey(res.apiKey);
      setNewKeyName('');
      setNewKeyExpiry('');
      setShowCreate(false);
      await refresh();
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
  };

  const handleRevoke = async (id, name) => {
    if (!confirm(`API-Schlüssel "${name}" wirklich widerrufen?`)) return;
    try {
      await api.revokeApiKey(id);
      setActionMsg({ type: 'ok', text: `Schlüssel "${name}" widerrufen` });
      await refresh();
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
  };

  const handleRotate = async (id, name) => {
    if (!confirm(`API-Schlüssel "${name}" rotieren? Der alte Schlüssel wird widerrufen.`)) return;
    try {
      const res = await api.rotateApiKey(id);
      setCreatedKey(res.apiKey);
      setActionMsg({ type: 'ok', text: `Schlüssel "${name}" rotiert` });
      await refresh();
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>API-Schlüssel & Geheimnisse</h2>

      {actionMsg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${actionMsg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: actionMsg.type === 'ok' ? S.green : S.red }}>{actionMsg.text}</div>
        </div>
      )}

      {createdKey && (
        <div style={{ ...S.card, borderLeft: `3px solid ${S.yellow}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: S.yellow, fontWeight: 700, marginBottom: 8 }}>Neuer API-Schlüssel erstellt — Jetzt kopieren!</div>
          <code style={{ fontSize: 13, color: '#fff', background: '#1a1a2e', padding: '8px 12px', borderRadius: 6, display: 'block', wordBreak: 'break-all' }}>{createdKey.key}</code>
          <div style={{ fontSize: 11, color: S.red, marginTop: 6 }}>{createdKey.warning}</div>
          <div style={{ marginTop: 8 }}>
            <Btn small onClick={() => { navigator.clipboard?.writeText(createdKey.key); }}>Schlüssel kopieren</Btn>
            <button onClick={() => setCreatedKey(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#666', fontSize: 11, cursor: 'pointer' }}>Schließen</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        {!showCreate ? (
          <Btn onClick={() => setShowCreate(true)}>+ API-Schlüssel erstellen</Btn>
        ) : (
          <div style={{ ...S.card, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Schlüsselname</div>
              <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g. n8n-production" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Läuft ab in (Tage)</div>
              <input value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)} placeholder="90" type="number" style={{ width: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13 }} />
            </div>
            <Btn onClick={handleCreate}>Erstellen</Btn>
            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer' }}>Abbrechen</button>
          </div>
        )}
      </div>

      {!keys ? <Spin /> : !keys.apiKeys?.length ? (
        <div style={S.card}><Empty text="Noch keine API-Schlüssel erstellt" /></div>
      ) : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Name</th><th style={S.th}>Präfix</th><th style={S.th}>Bereiche</th><th style={S.th}>Org</th><th style={S.th}>Zuletzt verwendet</th><th style={S.th}>Status</th><th style={S.th}>Aktionen</th>
            </tr></thead>
            <tbody>
              {keys.apiKeys.map(k => (
                <tr key={k.id} style={k.revoked_at ? { opacity: .5 } : {}}>
                  <td style={S.td}>{k.name}</td>
                  <td style={S.td}><code style={{ fontSize: 12, color: S.accent }}>{k.key_prefix}...</code></td>
                  <td style={S.td}>{(k.scopes || []).join(', ') || '-'}</td>
                  <td style={S.td}>{k.org_name || '-'}</td>
                  <td style={S.td}>{k.last_used_at ? timeAgo(k.last_used_at) : 'Nie'}</td>
                  <td style={S.td}>{k.revoked_at ? badge(S.red, 'Widerrufen') : k.expires_at && new Date(k.expires_at) < new Date() ? badge(S.yellow, 'Abgelaufen') : badge(S.green, 'Aktiv')}</td>
                  <td style={S.td}>
                    {!k.revoked_at && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Btn small onClick={() => handleRotate(k.id, k.name)}>Rotieren</Btn>
                        <Btn small danger onClick={() => handleRevoke(k.id, k.name)}>Widerrufen</Btn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   10) BILLING & FINANCE
   ═══════════════════════════════════════════════════════════ */
function TabBilling({ d, load }) {
  const subs = d.subscriptions;
  const plans = d.plans;
  const rev = d.revenue;
  const overdue = d.overdue;
  const [datevFrom, setDatevFrom] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; });
  const [datevTo, setDatevTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [actionMsg, setActionMsg] = useState(null);

  const handleDatevExport = () => {
    const url = api.getDatevExportUrl(datevFrom, datevTo);
    window.open(url, '_blank');
  };

  const handleAutoSuspend = async () => {
    if (!confirm('Alle Kliniken mit > 14 Tagen Zahlungsverzug automatisch sperren?')) return;
    try {
      const res = await api.autoSuspendOverdue(14);
      setActionMsg({ type: 'ok', text: `${res.count} Klinik(en) gesperrt` });
      await load('overdue', api.getOverdueSubscriptions);
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Abrechnung & Finanzen</h2>

      {actionMsg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${actionMsg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: actionMsg.type === 'ok' ? S.green : S.red }}>{actionMsg.text}</div>
        </div>
      )}

      {/* KPIs */}
      <div style={S.grid3}>
        <div style={S.card}>
          <div style={S.kpiLabel}>Monatlich wiederkehrender Umsatz</div>
          <div style={S.kpi}>{fmtEur(rev?.mrr)}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Aktive Abonnements</div>
          <div style={S.kpi}>{subs?.pagination?.total ?? 0}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Überfällig</div>
          <div style={{ ...S.kpi, color: (overdue?.overdue?.length || 0) > 0 ? S.red : S.green }}>{overdue?.overdue?.length || 0}</div>
        </div>
      </div>

      {/* DATEV Export */}
      <div style={S.card}>
        <div style={S.kpiLabel}>DATEV Export</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Von</div>
            <input type="date" value={datevFrom} onChange={e => setDatevFrom(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 12 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Bis</div>
            <input type="date" value={datevTo} onChange={e => setDatevTo(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 12 }} />
          </div>
          <Btn onClick={handleDatevExport}>CSV herunterladen</Btn>
        </div>
      </div>

      {/* Overdue subscriptions */}
      {overdue?.overdue?.length > 0 && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={S.kpiLabel}>Überfällige Abonnements</div>
            <Btn small danger onClick={handleAutoSuspend}>Auto-Sperre (14T+)</Btn>
          </div>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Klinik</th><th style={S.th}>Plan</th><th style={S.th}>Tage überfällig</th><th style={S.th}>Status</th></tr></thead>
            <tbody>
              {overdue.overdue.map(o => (
                <tr key={o.id}>
                  <td style={S.td}>{o.org_name}</td>
                  <td style={S.td}>{o.plan_name}</td>
                  <td style={S.td}><span style={{ color: Math.round(o.days_overdue) > 14 ? S.red : S.yellow, fontWeight: 700 }}>{Math.round(o.days_overdue)}d</span></td>
                  <td style={S.td}>{statusBadge(o.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Subscription by status */}
      {rev?.countByStatus?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Abonnements nach Status</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {rev.countByStatus.map(s => (
              <div key={s.status}>{badge(s.status === 'active' ? S.green : s.status === 'canceled' ? S.red : S.yellow, `${s.count} ${s.status}`)}</div>
            ))}
          </div>
        </div>
      )}

      {/* Plans */}
      {plans?.plans?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Abonnement-Pläne</div>
          <div style={{ ...S.grid3, marginTop: 12 }}>
            {plans.plans.map(p => (
              <div key={p.id} style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, border: '1px solid #333366' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{p.name}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: S.accent, margin: '8px 0' }}>{fmtEur(p.price_monthly)}<span style={{ fontSize: 12, color: '#666' }}>/mo</span></div>
                <div style={{ fontSize: 11, color: '#888', lineHeight: 1.8 }}>
                  <div>{p.patient_limit} Patienten</div>
                  <div>{(p.monthly_message_limit || 0).toLocaleString()} Nachr./Mon.</div>
                  <div>{p.max_languages} Sprachen</div>
                  <div>{p.max_workflows} Workflows</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription list */}
      {subs?.subscriptions?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Abonnements</div>
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr>
              <th style={S.th}>Klinik</th><th style={S.th}>Plan</th><th style={S.th}>Status</th><th style={S.th}>Gestartet</th>
            </tr></thead>
            <tbody>
              {subs.subscriptions.map(s => (
                <tr key={s.id}>
                  <td style={S.td}>{s.org_name}</td>
                  <td style={S.td}>{s.plan_name}</td>
                  <td style={S.td}>{statusBadge(s.status)}</td>
                  <td style={S.td}>{timeAgo(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent billing events */}
      {rev?.recentBillingEvents?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Letzte Abrechnungsereignisse</div>
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr><th style={S.th}>Typ</th><th style={S.th}>Betrag</th><th style={S.th}>Datum</th></tr></thead>
            <tbody>
              {rev.recentBillingEvents.map(e => (
                <tr key={e.id}><td style={S.td}>{e.event_type}</td><td style={S.td}>{fmtEur(e.amount)}</td><td style={S.td}>{timeAgo(e.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   11) SECURITY & COMPLIANCE
   ═══════════════════════════════════════════════════════════ */
function TabSecurity({ d, load }) {
  const rbac = d.rbac;
  const sessions = d.sessions;
  const keys = d.apiKeys;

  const handleRevoke = async (id) => {
    if (!confirm('Diese Sitzung widerrufen?')) return;
    try {
      await api.revokeSession(id);
      await load('sessions', api.getSessions);
    } catch (err) { alert('Fehlgeschlagen: ' + err.message); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Sicherheit & Compliance</h2>

      {/* Active sessions */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Aktive Sitzungen</div>
        {!sessions ? <Spin /> : !sessions.sessions?.length ? <Empty text="Keine aktiven Sitzungen" /> : (
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr>
              <th style={S.th}>Benutzer</th><th style={S.th}>Rolle</th><th style={S.th}>IP</th><th style={S.th}>Zuletzt aktiv</th><th style={S.th}>Aktionen</th>
            </tr></thead>
            <tbody>
              {sessions.sessions.map(s => (
                <tr key={s.id}>
                  <td style={S.td}>{s.name || s.email}</td>
                  <td style={S.td}>{statusBadge(s.role)}</td>
                  <td style={S.td}><code style={{ fontSize: 11 }}>{s.ip_address}</code></td>
                  <td style={S.td}>{s.created_at ? timeAgo(s.created_at) : '-'}</td>
                  <td style={S.td}><Btn small danger onClick={() => handleRevoke(s.id)}>Widerrufen</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* RBAC */}
      <div style={S.card}>
        <div style={S.kpiLabel}>RBAC Berechtigungsmatrix</div>
        {!rbac ? <Spin /> : (
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr>
              <th style={S.th}>Endpunkt</th><th style={S.th}>Methode</th><th style={S.th}>Erlaubte Rollen</th>
            </tr></thead>
            <tbody>
              {rbac.permissions?.map((p, i) => (
                <tr key={i}>
                  <td style={S.td}><code style={{ fontSize: 11, color: S.accent }}>{p.endpoint_pattern}</code></td>
                  <td style={S.td}>{p.http_method}</td>
                  <td style={S.td}>{(p.allowed_roles || []).length === 0 ? <span style={{ color: '#666' }}>öffentlich</span> : p.allowed_roles.map(r => <span key={r} style={{ marginRight: 4 }}>{badge(S.accent, r)}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* API Keys overview */}
      {keys?.apiKeys?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>API-Schlüssel ({keys.apiKeys.length})</div>
          <div style={{ fontSize: 12, color: '#8888aa', marginTop: 4 }}>Verwalten im Tab API-Schlüssel & Geheimnisse</div>
        </div>
      )}

      {/* Data retention */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Datenspeicherung & Compliance</div>
        <div style={{ fontSize: 13, color: '#ccc', lineHeight: 2, marginTop: 8 }}>
          <div>Audit-Logs: <b style={{ color: '#fff' }}>90 Tage</b></div>
          <div>Webhook-Ereignisse: <b style={{ color: '#fff' }}>30 Tage</b></div>
          <div>Backups: <b style={{ color: '#fff' }}>7 täglich / 4 wöchentlich / 6 monatlich</b></div>
          <div>Session-Tokens: <b style={{ color: '#fff' }}>7 Tage (JWT Refresh)</b></div>
          <div>DSGVO: <b style={{ color: '#fff' }}>Datenanfragen über Admin-Panel</b></div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   12) INFRASTRUCTURE
   ═══════════════════════════════════════════════════════════ */
function TabInfrastructure({ d, load }) {
  const infra = d.infra;
  const db = d.infraDb;
  const containers = d.infraContainers;
  const [backups, setBackups] = useState(null);
  const [deployments, setDeployments] = useState(null);

  useEffect(() => {
    api.getInfraBackups().then(setBackups).catch(() => setBackups({ backups: [], drills: [] }));
    api.getInfraDeployments().then(setDeployments).catch(() => setDeployments({ deployments: [] }));
  }, []);

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Infrastruktur</h2>

      {/* Server metrics */}
      {infra && (
        <div style={S.grid3}>
          <div style={S.card}>
            <div style={S.kpiLabel}>CPU</div>
            <ProgressBar pct={infra.cpu?.usagePercent ?? 0} label="CPU-Auslastung" />
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Speicher</div>
            <ProgressBar pct={infra.memory?.usagePercent ?? 0} label={`${fmtBytes(infra.memory?.usedBytes)} / ${fmtBytes(infra.memory?.totalBytes)}`} />
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Festplatte</div>
            <ProgressBar pct={infra.disk?.usagePercent ?? 0} label={`${fmtBytes(infra.disk?.usedBytes)} / ${fmtBytes(infra.disk?.totalBytes)}`} />
          </div>
        </div>
      )}

      {/* Database health */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Datenbank-Zustand</div>
        {!db ? <Spin /> : (
          <div style={{ marginTop: 8 }}>
            <div style={S.grid3}>
              <div><div style={S.kpiLabel}>DB-Größe</div><div style={S.kpiSm}>{fmtBytes(db.databaseSize)}</div></div>
              <div><div style={S.kpiLabel}>Aktive Verbindungen</div><div style={S.kpiSm}>{db.activeConnections}</div></div>
              <div><div style={S.kpiLabel}>Tabellen</div><div style={S.kpiSm}>{db.topTables?.length || 0}+</div></div>
            </div>
            {db.topTables?.length > 0 && (
              <table style={{ ...S.table, marginTop: 12 }}>
                <thead><tr><th style={S.th}>Tabelle</th><th style={S.th}>Größe</th></tr></thead>
                <tbody>
                  {db.topTables.map(t => (
                    <tr key={t.name}><td style={S.td}>{t.name}</td><td style={S.td}>{fmtBytes(t.sizeBytes)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Service Status */}
      {containers?.containers?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Dienste</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {containers.containers.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#1a1a2e', borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: (c.status === 'up' || c.status === '1' || c.status === 1) ? S.green : S.red }} />
                <span style={{ fontSize: 12, color: '#ccc' }}>{c.job}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backups */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Backups</div>
        {!backups ? <Spin /> : !backups.backups?.length ? <Empty text="Keine Backup-Einträge. Automatische Backups konfigurieren." /> : (
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr><th style={S.th}>Typ</th><th style={S.th}>Status</th><th style={S.th}>Größe</th><th style={S.th}>Dauer</th><th style={S.th}>Datum</th></tr></thead>
            <tbody>
              {backups.backups.map(b => (
                <tr key={b.id}><td style={S.td}>{b.backup_type}</td><td style={S.td}>{statusBadge(b.status)}</td><td style={S.td}>{fmtBytes(b.file_size_bytes)}</td><td style={S.td}>{b.duration_seconds}s</td><td style={S.td}>{timeAgo(b.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {backups?.restoreDrills?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={S.kpiLabel}>Wiederherstellungstests</div>
            {backups.restoreDrills.map(dr => (
              <div key={dr.id} style={{ padding: '8px 0', borderBottom: '1px solid #1e1e3e', fontSize: 13, color: '#ccc' }}>
                {statusBadge(dr.status)} — {timeAgo(dr.created_at)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deployments */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Letzte Deployments</div>
        {!deployments ? <Spin /> : !deployments.deployments?.length ? <Empty text="Noch keine Deployment-Einträge" /> : (
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr><th style={S.th}>Dienst</th><th style={S.th}>Version</th><th style={S.th}>Status</th><th style={S.th}>Von</th><th style={S.th}>Datum</th></tr></thead>
            <tbody>
              {deployments.deployments.map(dep => (
                <tr key={dep.id}><td style={S.td}>{dep.service}</td><td style={S.td}><code style={{ fontSize: 11, color: S.accent }}>{dep.version}</code></td><td style={S.td}>{statusBadge(dep.status)}</td><td style={S.td}>{dep.deployed_by || '-'}</td><td style={S.td}>{timeAgo(dep.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   13) SUPPORT TOOLKIT
   ═══════════════════════════════════════════════════════════ */
function TabSupport({ d }) {
  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Support-Werkzeuge</h2>

      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.kpiLabel}>Schnelldiagnose</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <a href="https://grafana.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, color: S.accent, fontSize: 13, textDecoration: 'none', border: '1px solid #333366' }}>Grafana Dashboards</a>
            <a href="https://prometheus.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, color: S.accent, fontSize: 13, textDecoration: 'none', border: '1px solid #333366' }}>Prometheus Metrics</a>
            <a href="https://status.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, color: S.accent, fontSize: 13, textDecoration: 'none', border: '1px solid #333366' }}>Uptime Kuma Status</a>
            <a href="https://n8n.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, color: S.accent, fontSize: 13, textDecoration: 'none', border: '1px solid #333366' }}>n8n Workflows</a>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.kpiLabel}>Vorfall-Vorlagen</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {[
              { title: 'Dienststörung', text: 'Wir untersuchen derzeit eine Leistungsbeeinträchtigung bei [Dienst]. Updates folgen.' },
              { title: 'Geplante Wartung', text: 'Geplante Wartung am [Datum] von [Uhrzeit] bis [Uhrzeit] UTC. Kurze Dienstunterbrechung möglich.' },
              { title: 'Vorfall behoben', text: 'Der Vorfall bei [Dienst] wurde behoben. Alle Systeme sind betriebsbereit.' },
            ].map((t, i) => (
              <div key={i} style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, border: '1px solid #333366' }}>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{t.title}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{t.text}</div>
                <button onClick={() => navigator.clipboard?.writeText(t.text)} style={{ marginTop: 6, background: 'none', border: 'none', color: S.accent, fontSize: 11, cursor: 'pointer' }}>In Zwischenablage kopieren</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clinic health summary */}
      {d.clinics?.clinics?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Klinik-Gesundheitsübersicht</div>
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr><th style={S.th}>Klinik</th><th style={S.th}>Status</th><th style={S.th}>Bereitstellung</th><th style={S.th}>Erstellt</th></tr></thead>
            <tbody>
              {d.clinics.clinics.map(c => (
                <tr key={c.id}><td style={S.td}>{c.name}</td><td style={S.td}>{statusBadge(c.is_active ? 'active' : 'inactive')}</td><td style={S.td}>{statusBadge(c.provisioning_status || 'pending')}</td><td style={S.td}>{timeAgo(c.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
