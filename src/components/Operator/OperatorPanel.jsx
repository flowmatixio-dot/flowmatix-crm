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

const Empty = ({ text }) => <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>{text || 'No data yet'}</div>;
const Spin = () => <div style={{ padding: 32, textAlign: 'center', color: '#8888aa' }}>Loading...</div>;

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
      default: break;
    }
  }, [load]);

  return { d, loading, apiConnected, loadForTab, reload: loadAll, load };
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function OperatorPanel() {
  const { opSubTab } = useApp();
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
        <span style={{ fontSize: 12, color: '#8888aa' }}>{apiConnected ? 'API Connected' : apiConnected === false ? 'API Disconnected' : 'Connecting...'}</span>
        <button onClick={reload} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: S.accent, fontSize: 12, cursor: 'pointer' }}>Refresh</button>
      </div>

      {/* Pending applications alert banner */}
      {d.applicationStats?.pending > 0 && (
        <div
          onClick={() => { /* navigate to applications tab if possible */ }}
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
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Platform Overview</h2>
      <div style={S.grid4}>
        <div style={S.card}>
          <div style={S.kpiLabel}>MRR</div>
          <div style={S.kpi}>{fmtEur(ov?.totalMrr || ov?.mrr)}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Active Clinics</div>
          <div style={S.kpi}>{ov?.activeClinics ?? ov?.clinicCount ?? 0}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Total Users</div>
          <div style={S.kpi}>{ov?.totalUsers ?? ov?.userCount ?? 0}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>System Health</div>
          <div style={S.kpi}>{h?.status === 'healthy' ? '✓' : '!'}</div>
          <div style={{ fontSize: 12, color: h?.status === 'healthy' ? S.green : S.red }}>{h?.status || 'unknown'}</div>
        </div>
      </div>

      {/* Enhanced KPIs from /stats */}
      {st && (
        <div style={S.grid3}>
          <div style={S.card}>
            <div style={S.kpiLabel}>Messages Today</div>
            <div style={S.kpiSm}>{st.messagesToday ?? 0}</div>
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Automation Success Rate</div>
            <div style={{ ...S.kpiSm, color: (st.automationSuccessRate ?? 100) >= 95 ? S.green : (st.automationSuccessRate ?? 100) >= 80 ? S.yellow : S.red }}>{st.automationSuccessRate ?? 100}%</div>
            {st.automationStats && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{st.automationStats.success}/{st.automationStats.total} jobs OK, {st.automationStats.failed} failed</div>}
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Webhook Error Rate</div>
            <div style={{ ...S.kpiSm, color: (st.webhookErrorRate ?? 0) <= 2 ? S.green : (st.webhookErrorRate ?? 0) <= 10 ? S.yellow : S.red }}>{st.webhookErrorRate ?? 0}%</div>
            {st.webhookStats && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{st.webhookStats.failed}/{st.webhookStats.total} failed (24h)</div>}
          </div>
        </div>
      )}

      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.kpiLabel}>Services</div>
          {h?.checks ? Object.entries(h.checks).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e1e3e' }}>
              <span style={{ color: '#ccc', textTransform: 'capitalize' }}>{k}</span>
              <span>{statusBadge(v.status)}</span>
            </div>
          )) : <Empty text="No health data" />}
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>System Info</div>
          {h && (
            <div style={{ fontSize: 13, color: '#ccc', lineHeight: 2 }}>
              <div>Uptime: <b style={{ color: '#fff' }}>{fmtSec(h.uptime || 0)}</b></div>
              <div>DB Latency: <b style={{ color: '#fff' }}>{h.checks?.database?.latency ?? '?'}ms</b></div>
              <div>Redis Latency: <b style={{ color: '#fff' }}>{h.checks?.redis?.latency ?? '?'}ms</b></div>
              <div>Version: <b style={{ color: '#fff' }}>{h.version}</b></div>
            </div>
          )}
        </div>
      </div>
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
   2) CLINICS
   ═══════════════════════════════════════════════════════════ */
function TabClinics({ d, load }) {
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState(null);
  const clinics = d.clinics;

  const doSearch = () => load('clinics', () => api.getPlatformClinics({ search }));
  const refresh = () => load('clinics', api.getPlatformClinics);

  const handleAction = async (action, orgId, orgName) => {
    try {
      setActionMsg(null);
      if (action === 'suspend') {
        if (!confirm(`Suspend clinic "${orgName}"?`)) return;
        await api.suspendClinic(orgId, 'Manual suspension from operator console');
        setActionMsg({ type: 'ok', text: `${orgName} suspended` });
      } else if (action === 'resume') {
        await api.resumeClinic(orgId, 'Resumed from operator console');
        setActionMsg({ type: 'ok', text: `${orgName} resumed` });
      } else if (action === 'impersonate') {
        const reason = prompt('Reason for impersonation (min 5 chars):');
        if (!reason || reason.length < 5) return;
        const res = await api.impersonateClinic(orgId, reason);
        setActionMsg({ type: 'ok', text: `Impersonating ${res.impersonation?.targetUser} — expires in ${res.impersonation?.expiresIn}` });
      } else if (action === 'regen') {
        const res = await api.regenOnboardingLink(orgId);
        setActionMsg({ type: 'ok', text: `New onboarding link: ${res.invitation?.link}` });
      }
      await refresh();
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Clinics</h2>
      {actionMsg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${actionMsg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: actionMsg.type === 'ok' ? S.green : S.red, wordBreak: 'break-all' }}>{actionMsg.text}</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="Search clinics..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13 }} />
        <Btn onClick={doSearch}>Search</Btn>
      </div>
      {!clinics ? <Spin /> : !clinics.clinics?.length ? <Empty text="No clinics onboarded yet" /> : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Name</th><th style={S.th}>Status</th><th style={S.th}>Plan</th><th style={S.th}>Provisioning</th><th style={S.th}>Created</th><th style={S.th}>Actions</th>
            </tr></thead>
            <tbody>
              {clinics.clinics.map(c => (
                <tr key={c.id}>
                  <td style={S.td}><span style={{ color: '#fff', fontWeight: 600 }}>{c.name}</span><br /><span style={{ fontSize: 11, color: '#666' }}>{c.email}</span></td>
                  <td style={S.td}>{statusBadge(c.is_active ? 'active' : 'inactive')}</td>
                  <td style={S.td}>{c.plan_name || '-'}</td>
                  <td style={S.td}>{statusBadge(c.provisioning_status || 'pending')}</td>
                  <td style={S.td}>{c.created_at ? timeAgo(c.created_at) : '-'}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {c.is_active
                        ? <Btn small danger onClick={() => handleAction('suspend', c.id, c.name)}>Suspend</Btn>
                        : <Btn small onClick={() => handleAction('resume', c.id, c.name)}>Resume</Btn>}
                      <Btn small onClick={() => handleAction('impersonate', c.id, c.name)}>Impersonate</Btn>
                      <Btn small onClick={() => handleAction('regen', c.id, c.name)}>Regen Link</Btn>
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
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Onboarding & Provisioning</h2>
      {!orgs ? <Spin /> : !orgs.organizations?.length ? (
        <div style={S.card}><Empty text="No organizations yet. Clinics will appear here after onboarding." /></div>
      ) : (
        <>
          <div style={S.card}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Organization</th><th style={S.th}>Status</th><th style={S.th}>Provisioned By</th><th style={S.th}>Created</th><th style={S.th}>Actions</th>
              </tr></thead>
              <tbody>
                {orgs.organizations.map(o => (
                  <tr key={o.id}>
                    <td style={S.td}><span style={{ color: '#fff', fontWeight: 600 }}>{o.name}</span><br /><span style={{ fontSize: 11, color: '#666' }}>{o.slug}</span></td>
                    <td style={S.td}>{statusBadge(o.provisioning_status || 'pending')}</td>
                    <td style={S.td}>{o.provisioned_by_name || '-'}</td>
                    <td style={S.td}>{o.created_at ? timeAgo(o.created_at) : '-'}</td>
                    <td style={S.td}><Btn small onClick={() => viewLogs(o.id)}>View Logs</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedOrg && (
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={S.kpiLabel}>Provisioning Steps</div>
                <Btn small onClick={() => setSelectedOrg(null)}>Close</Btn>
              </div>
              {!logs ? <Spin /> : !logs.length ? <Empty text="No provisioning logs found" /> : (
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
                      {l.status === 'failed' && <Btn small onClick={async () => { try { await api.retryProvisioningStep(selectedOrg, l.step); await viewLogs(selectedOrg); } catch (err) { alert('Retry failed: ' + err.message); } }}>Retry</Btn>}
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
      setMsg({ type: 'ok', text: 'WhatsApp credentials saved & activated' });
      await selectClinic(selectedClinic);
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
    setSaving(false);
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 12, color: '#8888aa', marginBottom: 4, display: 'block', fontWeight: 600 };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>WhatsApp / Meta — Per Clinic</h2>

      {msg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${msg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: msg.type === 'ok' ? S.green : S.red }}>{msg.text}</div>
        </div>
      )}

      {/* Clinic list with WA status */}
      {!clinics ? <Spin /> : !clinics.clinics?.length ? <Empty text="No clinics onboarded yet" /> : (
        <div style={S.card}>
          <div style={S.kpiLabel}>Select Clinic to Configure</div>
          <table style={{ ...S.table, marginTop: 12 }}>
            <thead><tr>
              <th style={S.th}>Clinic</th><th style={S.th}>Phone Number ID</th><th style={S.th}>Status</th><th style={S.th}>Actions</th>
            </tr></thead>
            <tbody>
              {clinics.clinics.map(c => (
                <tr key={c.id} style={{ background: selectedClinic === c.id ? 'rgba(76,201,255,0.06)' : 'transparent' }}>
                  <td style={S.td}><span style={{ color: '#fff', fontWeight: 600 }}>{c.name}</span><br /><span style={{ fontSize: 11, color: '#666' }}>{c.slug}</span></td>
                  <td style={S.td}>{c.whatsapp_phone_id || <span style={{ color: '#666' }}>Not set</span>}</td>
                  <td style={S.td}>{c.whatsapp_active ? badge(S.green, 'Active') : badge(S.gray, 'Inactive')}</td>
                  <td style={S.td}><Btn small onClick={() => selectClinic(c.id)}>Configure</Btn></td>
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
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>WhatsApp Configuration</div>
            <Btn small onClick={() => { setSelectedClinic(null); setWaConfig(null); }}>Close</Btn>
          </div>

          {waLoading ? <Spin /> : (
            <>
              {/* Current status */}
              {waConfig?.whatsapp && (
                <div style={{ ...S.grid3, marginBottom: 16 }}>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>Token Set</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: waConfig.whatsapp.accessTokenSet ? S.green : S.red, marginTop: 4 }}>
                      {waConfig.whatsapp.accessTokenSet ? 'Yes' : 'No'}
                    </div>
                    {waConfig.whatsapp.accessTokenPreview && <div style={{ fontSize: 11, color: '#555', marginTop: 4, fontFamily: 'monospace' }}>{waConfig.whatsapp.accessTokenPreview}</div>}
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>Active</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: waConfig.whatsapp.isActive ? S.green : S.gray, marginTop: 4 }}>
                      {waConfig.whatsapp.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>Last Webhook</div>
                    <div style={{ fontSize: 14, color: '#ccc', marginTop: 4 }}>{waConfig.whatsapp.lastWebhookAt ? timeAgo(waConfig.whatsapp.lastWebhookAt) : 'Never'}</div>
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
                <label style={labelStyle}>Access Token {waConfig?.whatsapp?.accessTokenSet && <span style={{ color: S.green, fontWeight: 400 }}>(currently set — leave blank to keep)</span>}</label>
                <input value={form.accessToken} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))} placeholder="EAAxxxxxxxxx..." type="password" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Webhook Verify Token</label>
                <input value={form.webhookVerifyToken} onChange={e => setForm(f => ({ ...f, webhookVerifyToken: e.target.value }))} placeholder="Custom verify token for Meta webhook" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={saveConfig} disabled={saving}>{saving ? 'Saving...' : 'Save & Activate'}</Btn>
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
    if (!selectedClinic || !confirm('Disconnect Google Calendar for this clinic?')) return;
    try {
      await api.disconnectGoogle(selectedClinic);
      setMsg({ type: 'ok', text: 'Google Calendar disconnected' });
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
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Integrations — Per Clinic</h2>

      {msg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${msg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: msg.type === 'ok' ? S.green : S.red }}>{msg.text}</div>
        </div>
      )}

      {/* Clinic selector */}
      {!clinics ? <Spin /> : !clinics.clinics?.length ? <Empty text="No clinics onboarded yet" /> : (
        <div style={S.card}>
          <div style={S.kpiLabel}>Select Clinic</div>
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
                  {googleStatus?.connected ? badge(S.green, 'Connected') : badge(S.gray, 'Not connected')}
                </div>

                {googleStatus?.connected ? (
                  <div>
                    <div style={S.grid3}>
                      <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#8888aa' }}>Connected Since</div>
                        <div style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>{googleStatus.connectedAt ? timeAgo(googleStatus.connectedAt) : '-'}</div>
                      </div>
                      <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#8888aa' }}>Last Used</div>
                        <div style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>{googleStatus.lastUsed ? timeAgo(googleStatus.lastUsed) : 'Never'}</div>
                      </div>
                      <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#8888aa' }}>Status</div>
                        <div style={{ fontSize: 13, color: googleStatus.lastError ? S.red : S.green, marginTop: 4 }}>{googleStatus.lastError || 'OK'}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Btn small danger onClick={handleDisconnect}>Disconnect</Btn>
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
                      <div style={{ fontSize: 12, color: S.yellow }}>Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env</div>
                    )}
                  </div>
                )}
              </div>

              {/* API Usage (Flowmatix-global keys) */}
              <div style={S.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>📊</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>API Usage (Flowmatix-managed)</div>
                    <div style={{ fontSize: 12, color: '#8888aa' }}>OpenAI, SMTP, n8n — globale Keys, Limits per Plan</div>
                  </div>
                </div>
                <div style={S.grid3}>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>OpenAI</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: S.green, marginTop: 4 }}>Flowmatix Key</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Usage tracked per plan limits</div>
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>SMTP / E-Mail</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: S.green, marginTop: 4 }}>Flowmatix Key</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Transactional emails</div>
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>n8n Workflows</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: S.green, marginTop: 4 }}>Flowmatix Key</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Automation engine</div>
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
    } catch (err) { alert('Retry failed: ' + err.message); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Automations & Queues</h2>

      {/* Queue overview */}
      {!stats ? <Spin /> : !stats.queues?.length ? (
        <div style={S.card}><Empty text="No queue jobs yet. Jobs will appear when automations run." /></div>
      ) : (
        <div style={S.grid3}>
          {stats.queues.map(q => (
            <div key={q.queue_name} style={S.card}>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, marginBottom: 8 }}>{q.queue_name}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {q.pending > 0 && badge(S.yellow, `${q.pending} pending`)}
                {q.running > 0 && badge(S.accent, `${q.running} running`)}
                {q.completed > 0 && badge(S.green, `${q.completed} done`)}
                {q.failed > 0 && badge(S.red, `${q.failed} failed`)}
                {q.dead_letter > 0 && badge(S.red, `${q.dead_letter} DLQ`)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* n8n link */}
      <div style={{ ...S.card, borderLeft: `3px solid ${S.accent}` }}>
        <div style={{ fontSize: 13, color: S.accent, fontWeight: 600, marginBottom: 4 }}>n8n Workflow Engine</div>
        <div style={{ fontSize: 12, color: '#8888aa' }}>Advanced workflow management available at <a href="https://n8n.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ color: S.accent }}>n8n.flowmatix.io</a></div>
      </div>

      {/* Recent jobs */}
      {jobs?.jobs?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Recent Jobs</div>
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr>
              <th style={S.th}>Queue</th><th style={S.th}>Type</th><th style={S.th}>Status</th><th style={S.th}>Org</th><th style={S.th}>Created</th><th style={S.th}>Actions</th>
            </tr></thead>
            <tbody>
              {jobs.jobs.map(j => (
                <tr key={j.id}>
                  <td style={S.td}>{j.queue_name}</td>
                  <td style={S.td}>{j.job_type}</td>
                  <td style={S.td}>{statusBadge(j.status)}</td>
                  <td style={S.td}>{j.org_name || '-'}</td>
                  <td style={S.td}>{timeAgo(j.created_at)}</td>
                  <td style={S.td}>{(j.status === 'failed' || j.status === 'dead_letter') && <Btn small onClick={() => handleRetry(j.id)}>Retry</Btn>}</td>
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
  if (infra.error) return <div style={S.card}><div style={{ color: S.red }}>Failed to load infrastructure data: {infra.error}</div></div>;

  const cpuPct = infra.cpu?.usagePercent ?? 0;
  const memPct = infra.memory?.usagePercent ?? 0;
  const diskPct = infra.disk?.usagePercent ?? 0;

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Server Monitoring</h2>

      {/* Main gauges */}
      <div style={S.grid3}>
        <div style={S.card}>
          <div style={S.kpiLabel}>CPU Usage</div>
          <div style={{ ...S.kpi, color: pctColor(cpuPct) }}>{cpuPct.toFixed(1)}%</div>
          <ProgressBar pct={cpuPct} />
          {infra.load && <div style={{ fontSize: 11, color: '#8888aa', marginTop: 4 }}>Load: {infra.load.load1?.toFixed(2)} / {infra.load.load5?.toFixed(2)} / {infra.load.load15?.toFixed(2)}</div>}
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Memory</div>
          <div style={{ ...S.kpi, color: pctColor(memPct) }}>{fmtBytes(infra.memory?.usedBytes)}</div>
          <ProgressBar pct={memPct} label={`${fmtBytes(infra.memory?.usedBytes)} / ${fmtBytes(infra.memory?.totalBytes)}`} />
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Disk</div>
          <div style={{ ...S.kpi, color: pctColor(diskPct) }}>{fmtBytes(infra.disk?.usedBytes)}</div>
          <ProgressBar pct={diskPct} label={`${fmtBytes(infra.disk?.usedBytes)} / ${fmtBytes(infra.disk?.totalBytes)}`} />
        </div>
      </div>

      {/* System info */}
      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.kpiLabel}>System</div>
          <div style={{ fontSize: 13, color: '#ccc', lineHeight: 2 }}>
            <div>Uptime: <b style={{ color: '#fff' }}>{fmtSec(infra.uptimeSeconds || 0)}</b></div>
            <div>Load 1m/5m/15m: <b style={{ color: '#fff' }}>{infra.load?.load1?.toFixed(2)} / {infra.load?.load5?.toFixed(2)} / {infra.load?.load15?.toFixed(2)}</b></div>
          </div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Quick Links</div>
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
          <div style={S.kpiLabel}>Service Status (Prometheus)</div>
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr>
              <th style={S.th}>Service</th><th style={S.th}>Status</th><th style={S.th}>Memory</th>
            </tr></thead>
            <tbody>
              {containers.containers.map((c, i) => (
                <tr key={i}>
                  <td style={S.td}><span style={{ color: '#fff', fontWeight: 600 }}>{c.job || c.name}</span><br /><span style={{ fontSize: 11, color: '#555' }}>{c.instance}</span></td>
                  <td style={S.td}>{statusBadge(c.status === 'up' || c.status === '1' || c.status === 1 ? 'up' : 'down')}</td>
                  <td style={S.td}>{c.memory ? fmtBytes(c.memory) : '-'}</td>
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
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const handleAcknowledge = async (id) => {
    try {
      await api.acknowledgeIncident(id);
      await load('incidents', () => api.getIncidents({ limit: 50 }));
    } catch (err) { alert('Failed: ' + err.message); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Incidents</h2>
      {!incidents ? <Spin /> : !incidents.incidents?.length ? (
        <div style={S.card}><Empty text="No incidents. All systems operational." /></div>
      ) : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Severity</th><th style={S.th}>Title</th><th style={S.th}>Status</th><th style={S.th}>Created</th><th style={S.th}>Actions</th>
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
                      {inc.status !== 'resolved' && !inc.resolved_at && <Btn small onClick={() => handleResolve(inc.id)}>Resolve</Btn>}
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
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Platform Logs</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select value={source} onChange={e => setSource(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13 }}>
          <option value="">All Sources</option>
          <option value="audit">Audit</option>
          <option value="webhook">Webhook</option>
          <option value="provisioning">Provisioning</option>
        </select>
        <Btn onClick={doFilter}>Filter</Btn>
      </div>

      {!logData ? <Spin /> : !logData.entries?.length ? (
        <div style={S.card}><Empty text="No log entries yet" /></div>
      ) : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Time</th><th style={S.th}>Source</th><th style={S.th}>Actor</th><th style={S.th}>Event</th><th style={S.th}>Resource</th><th style={S.th}>Details</th>
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
              Page {logData.pagination.page} of {logData.pagination.pages} ({logData.pagination.total} entries)
            </div>
          )}
        </div>
      )}

      <div style={{ ...S.card, borderLeft: `3px solid ${S.accent}` }}>
        <div style={{ fontSize: 12, color: '#8888aa' }}>Detailed request logs and worker logs available in <a href="https://grafana.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ color: S.accent }}>Grafana / Loki</a></div>
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
    if (!confirm(`Revoke API key "${name}"?`)) return;
    try {
      await api.revokeApiKey(id);
      setActionMsg({ type: 'ok', text: `Key "${name}" revoked` });
      await refresh();
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
  };

  const handleRotate = async (id, name) => {
    if (!confirm(`Rotate API key "${name}"? The old key will be revoked.`)) return;
    try {
      const res = await api.rotateApiKey(id);
      setCreatedKey(res.apiKey);
      setActionMsg({ type: 'ok', text: `Key "${name}" rotated` });
      await refresh();
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>API Keys & Secrets</h2>

      {actionMsg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${actionMsg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: actionMsg.type === 'ok' ? S.green : S.red }}>{actionMsg.text}</div>
        </div>
      )}

      {createdKey && (
        <div style={{ ...S.card, borderLeft: `3px solid ${S.yellow}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: S.yellow, fontWeight: 700, marginBottom: 8 }}>New API Key Created — Copy it now!</div>
          <code style={{ fontSize: 13, color: '#fff', background: '#1a1a2e', padding: '8px 12px', borderRadius: 6, display: 'block', wordBreak: 'break-all' }}>{createdKey.key}</code>
          <div style={{ fontSize: 11, color: S.red, marginTop: 6 }}>{createdKey.warning}</div>
          <div style={{ marginTop: 8 }}>
            <Btn small onClick={() => { navigator.clipboard?.writeText(createdKey.key); }}>Copy Key</Btn>
            <button onClick={() => setCreatedKey(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#666', fontSize: 11, cursor: 'pointer' }}>Dismiss</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        {!showCreate ? (
          <Btn onClick={() => setShowCreate(true)}>+ Create API Key</Btn>
        ) : (
          <div style={{ ...S.card, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Key Name</div>
              <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g. n8n-production" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Expires in (days)</div>
              <input value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)} placeholder="90" type="number" style={{ width: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13 }} />
            </div>
            <Btn onClick={handleCreate}>Create</Btn>
            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        )}
      </div>

      {!keys ? <Spin /> : !keys.apiKeys?.length ? (
        <div style={S.card}><Empty text="No API keys created yet" /></div>
      ) : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Name</th><th style={S.th}>Prefix</th><th style={S.th}>Scopes</th><th style={S.th}>Org</th><th style={S.th}>Last Used</th><th style={S.th}>Status</th><th style={S.th}>Actions</th>
            </tr></thead>
            <tbody>
              {keys.apiKeys.map(k => (
                <tr key={k.id} style={k.revoked_at ? { opacity: .5 } : {}}>
                  <td style={S.td}>{k.name}</td>
                  <td style={S.td}><code style={{ fontSize: 12, color: S.accent }}>{k.key_prefix}...</code></td>
                  <td style={S.td}>{(k.scopes || []).join(', ') || '-'}</td>
                  <td style={S.td}>{k.org_name || '-'}</td>
                  <td style={S.td}>{k.last_used_at ? timeAgo(k.last_used_at) : 'Never'}</td>
                  <td style={S.td}>{k.revoked_at ? badge(S.red, 'Revoked') : k.expires_at && new Date(k.expires_at) < new Date() ? badge(S.yellow, 'Expired') : badge(S.green, 'Active')}</td>
                  <td style={S.td}>
                    {!k.revoked_at && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Btn small onClick={() => handleRotate(k.id, k.name)}>Rotate</Btn>
                        <Btn small danger onClick={() => handleRevoke(k.id, k.name)}>Revoke</Btn>
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
    if (!confirm('Auto-suspend all clinics overdue > 14 days?')) return;
    try {
      const res = await api.autoSuspendOverdue(14);
      setActionMsg({ type: 'ok', text: `${res.count} clinic(s) suspended` });
      await load('overdue', api.getOverdueSubscriptions);
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Billing & Finance</h2>

      {actionMsg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${actionMsg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: actionMsg.type === 'ok' ? S.green : S.red }}>{actionMsg.text}</div>
        </div>
      )}

      {/* KPIs */}
      <div style={S.grid3}>
        <div style={S.card}>
          <div style={S.kpiLabel}>Monthly Recurring Revenue</div>
          <div style={S.kpi}>{fmtEur(rev?.mrr)}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Active Subscriptions</div>
          <div style={S.kpi}>{subs?.pagination?.total ?? 0}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Overdue</div>
          <div style={{ ...S.kpi, color: (overdue?.overdue?.length || 0) > 0 ? S.red : S.green }}>{overdue?.overdue?.length || 0}</div>
        </div>
      </div>

      {/* DATEV Export */}
      <div style={S.card}>
        <div style={S.kpiLabel}>DATEV Export</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>From</div>
            <input type="date" value={datevFrom} onChange={e => setDatevFrom(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 12 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>To</div>
            <input type="date" value={datevTo} onChange={e => setDatevTo(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 12 }} />
          </div>
          <Btn onClick={handleDatevExport}>Download CSV</Btn>
        </div>
      </div>

      {/* Overdue subscriptions */}
      {overdue?.overdue?.length > 0 && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={S.kpiLabel}>Overdue Subscriptions</div>
            <Btn small danger onClick={handleAutoSuspend}>Auto-Suspend (14d+)</Btn>
          </div>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Clinic</th><th style={S.th}>Plan</th><th style={S.th}>Days Overdue</th><th style={S.th}>Status</th></tr></thead>
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
          <div style={S.kpiLabel}>Subscriptions by Status</div>
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
          <div style={S.kpiLabel}>Subscription Plans</div>
          <div style={{ ...S.grid3, marginTop: 12 }}>
            {plans.plans.map(p => (
              <div key={p.id} style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, border: '1px solid #333366' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{p.name}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: S.accent, margin: '8px 0' }}>{fmtEur(p.price_monthly)}<span style={{ fontSize: 12, color: '#666' }}>/mo</span></div>
                <div style={{ fontSize: 11, color: '#888', lineHeight: 1.8 }}>
                  <div>{p.patient_limit} patients</div>
                  <div>{(p.monthly_message_limit || 0).toLocaleString()} msgs/mo</div>
                  <div>{p.max_languages} languages</div>
                  <div>{p.max_workflows} workflows</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription list */}
      {subs?.subscriptions?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Subscriptions</div>
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr>
              <th style={S.th}>Clinic</th><th style={S.th}>Plan</th><th style={S.th}>Status</th><th style={S.th}>Started</th>
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
          <div style={S.kpiLabel}>Recent Billing Events</div>
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr><th style={S.th}>Type</th><th style={S.th}>Amount</th><th style={S.th}>Date</th></tr></thead>
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
    if (!confirm('Revoke this session?')) return;
    try {
      await api.revokeSession(id);
      await load('sessions', api.getSessions);
    } catch (err) { alert('Failed: ' + err.message); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Security & Compliance</h2>

      {/* Active sessions */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Active Sessions</div>
        {!sessions ? <Spin /> : !sessions.sessions?.length ? <Empty text="No active sessions" /> : (
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr>
              <th style={S.th}>User</th><th style={S.th}>Role</th><th style={S.th}>IP</th><th style={S.th}>Last Active</th><th style={S.th}>Actions</th>
            </tr></thead>
            <tbody>
              {sessions.sessions.map(s => (
                <tr key={s.id}>
                  <td style={S.td}>{s.name || s.email}</td>
                  <td style={S.td}>{statusBadge(s.role)}</td>
                  <td style={S.td}><code style={{ fontSize: 11 }}>{s.ip_address}</code></td>
                  <td style={S.td}>{s.created_at ? timeAgo(s.created_at) : '-'}</td>
                  <td style={S.td}><Btn small danger onClick={() => handleRevoke(s.id)}>Revoke</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* RBAC */}
      <div style={S.card}>
        <div style={S.kpiLabel}>RBAC Permission Matrix</div>
        {!rbac ? <Spin /> : (
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr>
              <th style={S.th}>Endpoint</th><th style={S.th}>Method</th><th style={S.th}>Allowed Roles</th>
            </tr></thead>
            <tbody>
              {rbac.permissions?.map((p, i) => (
                <tr key={i}>
                  <td style={S.td}><code style={{ fontSize: 11, color: S.accent }}>{p.endpoint_pattern}</code></td>
                  <td style={S.td}>{p.http_method}</td>
                  <td style={S.td}>{(p.allowed_roles || []).length === 0 ? <span style={{ color: '#666' }}>public</span> : p.allowed_roles.map(r => <span key={r} style={{ marginRight: 4 }}>{badge(S.accent, r)}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* API Keys overview */}
      {keys?.apiKeys?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>API Keys ({keys.apiKeys.length})</div>
          <div style={{ fontSize: 12, color: '#8888aa', marginTop: 4 }}>Manage in API & Secrets tab</div>
        </div>
      )}

      {/* Data retention */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Data Retention & Compliance</div>
        <div style={{ fontSize: 13, color: '#ccc', lineHeight: 2, marginTop: 8 }}>
          <div>Audit Logs: <b style={{ color: '#fff' }}>90 days</b></div>
          <div>Webhook Events: <b style={{ color: '#fff' }}>30 days</b></div>
          <div>Backups: <b style={{ color: '#fff' }}>7 daily / 4 weekly / 6 monthly</b></div>
          <div>Session Tokens: <b style={{ color: '#fff' }}>7 days (JWT refresh)</b></div>
          <div>GDPR: <b style={{ color: '#fff' }}>Data request handling via admin panel</b></div>
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
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Infrastructure</h2>

      {/* Server metrics */}
      {infra && (
        <div style={S.grid3}>
          <div style={S.card}>
            <div style={S.kpiLabel}>CPU</div>
            <ProgressBar pct={infra.cpu?.usagePercent ?? 0} label="CPU Usage" />
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Memory</div>
            <ProgressBar pct={infra.memory?.usagePercent ?? 0} label={`${fmtBytes(infra.memory?.usedBytes)} / ${fmtBytes(infra.memory?.totalBytes)}`} />
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Disk</div>
            <ProgressBar pct={infra.disk?.usagePercent ?? 0} label={`${fmtBytes(infra.disk?.usedBytes)} / ${fmtBytes(infra.disk?.totalBytes)}`} />
          </div>
        </div>
      )}

      {/* Database health */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Database Health</div>
        {!db ? <Spin /> : (
          <div style={{ marginTop: 8 }}>
            <div style={S.grid3}>
              <div><div style={S.kpiLabel}>DB Size</div><div style={S.kpiSm}>{fmtBytes(db.databaseSize)}</div></div>
              <div><div style={S.kpiLabel}>Active Connections</div><div style={S.kpiSm}>{db.activeConnections}</div></div>
              <div><div style={S.kpiLabel}>Tables</div><div style={S.kpiSm}>{db.topTables?.length || 0}+</div></div>
            </div>
            {db.topTables?.length > 0 && (
              <table style={{ ...S.table, marginTop: 12 }}>
                <thead><tr><th style={S.th}>Table</th><th style={S.th}>Size</th></tr></thead>
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
          <div style={S.kpiLabel}>Services</div>
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
        {!backups ? <Spin /> : !backups.backups?.length ? <Empty text="No backup records. Configure automated backups." /> : (
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr><th style={S.th}>Type</th><th style={S.th}>Status</th><th style={S.th}>Size</th><th style={S.th}>Duration</th><th style={S.th}>Date</th></tr></thead>
            <tbody>
              {backups.backups.map(b => (
                <tr key={b.id}><td style={S.td}>{b.backup_type}</td><td style={S.td}>{statusBadge(b.status)}</td><td style={S.td}>{fmtBytes(b.file_size_bytes)}</td><td style={S.td}>{b.duration_seconds}s</td><td style={S.td}>{timeAgo(b.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {backups?.restoreDrills?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={S.kpiLabel}>Restore Drills</div>
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
        <div style={S.kpiLabel}>Recent Deployments</div>
        {!deployments ? <Spin /> : !deployments.deployments?.length ? <Empty text="No deployment records yet" /> : (
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr><th style={S.th}>Service</th><th style={S.th}>Version</th><th style={S.th}>Status</th><th style={S.th}>By</th><th style={S.th}>Date</th></tr></thead>
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
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Support Toolkit</h2>

      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.kpiLabel}>Quick Diagnostics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <a href="https://grafana.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, color: S.accent, fontSize: 13, textDecoration: 'none', border: '1px solid #333366' }}>Grafana Dashboards</a>
            <a href="https://prometheus.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, color: S.accent, fontSize: 13, textDecoration: 'none', border: '1px solid #333366' }}>Prometheus Metrics</a>
            <a href="https://status.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, color: S.accent, fontSize: 13, textDecoration: 'none', border: '1px solid #333366' }}>Uptime Kuma Status</a>
            <a href="https://n8n.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, color: S.accent, fontSize: 13, textDecoration: 'none', border: '1px solid #333366' }}>n8n Workflows</a>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.kpiLabel}>Incident Templates</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {[
              { title: 'Service Degradation', text: 'We are currently investigating degraded performance on [service]. Updates will follow.' },
              { title: 'Planned Maintenance', text: 'Scheduled maintenance on [date] from [time] to [time] UTC. Brief service interruption expected.' },
              { title: 'Incident Resolved', text: 'The incident affecting [service] has been resolved. All systems are operational.' },
            ].map((t, i) => (
              <div key={i} style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, border: '1px solid #333366' }}>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{t.title}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{t.text}</div>
                <button onClick={() => navigator.clipboard?.writeText(t.text)} style={{ marginTop: 6, background: 'none', border: 'none', color: S.accent, fontSize: 11, cursor: 'pointer' }}>Copy to clipboard</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clinic health summary */}
      {d.clinics?.clinics?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Clinic Health Summary</div>
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr><th style={S.th}>Clinic</th><th style={S.th}>Status</th><th style={S.th}>Provisioning</th><th style={S.th}>Created</th></tr></thead>
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
