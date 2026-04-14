import { useState, useEffect, useCallback } from 'react';
import * as fmApi from '../../api/client';

const ACTION_COLORS = {
  login:                    '#10b981',
  logout:                   '#6b7280',
  login_failed:             '#ef4444',
  password_changed:         '#f59e0b',
  mfa_enabled:              '#10b981',
  mfa_disabled:             '#ef4444',
  session_revoked:          '#ef4444',
  magic_link_requested:     '#4cc9ff',
  consent_given:            '#10b981',
  consent_withdrawn:        '#ef4444',
  patient_viewed:           '#a78bfa',
  photo_viewed:             '#ff8a2a',
  conversation_viewed:      '#4cc9ff',
  appointment_viewed:       '#4cc9ff',
  data_export:              '#f59e0b',
  patient_exported:         '#f59e0b',
  patient_created:          '#10b981',
  patient_updated:          '#4cc9ff',
  patient_deleted:          '#ef4444',
  patient_anonymized:       '#ef4444',
  gdpr_patient_deleted:     '#ef4444',
  data_deletion_requested:  '#ef4444',
  appointment_created:      '#10b981',
  appointment_updated:      '#4cc9ff',
  appointment_canceled:     '#ef4444',
  whatsapp_message_sent:    '#4cc9ff',
  whatsapp_message_received:'#6b7280',
  settings_changed:         '#f59e0b',
  integration_connected:    '#10b981',
  integration_disconnected: '#ef4444',
  team_invite:              '#10b981',
  team_remove:              '#ef4444',
  role_changed:             '#f59e0b',
  task_created:             '#a78bfa',
  task_completed:           '#10b981',
  task_reassigned:          '#f59e0b',
  workflow_executed:        '#4cc9ff',
  billing_payment_received: '#10b981',
  billing_payment_failed:   '#ef4444',
};

const FILTER_ACTIONS = [
  { value: '', label: 'Alle' },
  { value: 'consent_given', label: 'Einwilligung erteilt' },
  { value: 'consent_withdrawn', label: 'Einwilligung widerrufen' },
  { value: 'login', label: 'Login' },
  { value: 'login_failed', label: 'Login fehlgeschlagen' },
  { value: 'patient_viewed', label: 'Patient aufgerufen' },
  { value: 'photo_viewed', label: 'Foto aufgerufen' },
  { value: 'data_export', label: 'Datenexport' },
  { value: 'patient_deleted', label: 'Patient gelöscht' },
];

export default function AuditLogView() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fmApi.getClinicAuditLog({ page, limit: 50, action: filterAction || undefined }),
      page === 1 ? fmApi.getClinicAuditStats() : Promise.resolve(null),
    ]).then(([res, statsRes]) => {
      setEntries(Array.isArray(res?.entries) ? res.entries : []);
      setTotal(res?.pagination?.total || 0);
      if (statsRes) setStats(statsRes);
      setLoading(false);
    }).catch(() => { setEntries([]); setLoading(false); });
  }, [page, filterAction]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 50) || 1;

  const handleExport = () => {
    const csv = ['Timestamp,User,Action,Resource,Details',
      ...entries.map(e => `"${e.createdAt}","${e.userEmail || e.userName || ''}","${e.action}","${e.resourceType || ''}","${JSON.stringify(e.details || {}).replace(/"/g, "'")}"`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const getColor = (action) => ACTION_COLORS[action] || 'rgba(167,177,195,0.6)';

  const consentGiven = stats?.byAction?.find(a => a.action === 'consent_given')?.count || 0;
  const consentWithdrawn = stats?.byAction?.find(a => a.action === 'consent_withdrawn')?.count || 0;
  const photoViews = stats?.byAction?.find(a => a.action === 'photo_viewed')?.count || 0;
  const logins = stats?.byAction?.find(a => a.action === 'login')?.count || 0;

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📋 Audit Log</h1>
          <p style={{ fontSize: 13, color: 'rgba(167,177,195,0.6)', margin: '4px 0 0' }}>
            Alle sicherheitsrelevanten Aktionen — Einträge aus der Datenbank
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(1); }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 12px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {FILTER_ACTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <button
            onClick={handleExport}
            style={{ padding: '7px 16px', borderRadius: 9, background: 'rgba(76,201,255,0.08)', border: '1px solid rgba(76,201,255,0.2)', color: '#4cc9ff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Einwilligungen (7d)', value: consentGiven, color: '#10b981' },
            { label: 'Widerrufe (7d)', value: consentWithdrawn, color: '#ef4444' },
            { label: 'Foto-Zugriffe (7d)', value: photoViews, color: '#ff8a2a' },
            { label: 'Logins (7d)', value: logins, color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Lade...</div>
      ) : (
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 160px 120px 1fr', padding: '10px 16px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, color: 'rgba(167,177,195,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div>Zeitpunkt</div><div>Benutzer</div><div>Aktion</div><div>Ressource</div><div>Details</div>
          </div>

          {entries.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(167,177,195,0.7)' }}>Keine Einträge</div>
          )}

          {entries.map((e, i) => {
            const color = getColor(e.action);
            const isExp = expanded === i;
            const hasDetails = e.details && Object.keys(e.details).length > 0;
            return (
              <div key={e.id || i}>
                <div
                  onClick={() => hasDetails && setExpanded(isExp ? null : i)}
                  style={{ display: 'grid', gridTemplateColumns: '160px 140px 160px 120px 1fr', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 13, alignItems: 'center', cursor: hasDetails ? 'pointer' : 'default', transition: 'background 0.15s' }}
                  onMouseEnter={ev => { if (hasDetails) ev.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ color: 'rgba(167,177,195,0.7)', fontSize: 12, fontFamily: 'monospace' }}>
                    {new Date(e.createdAt).toLocaleString('de', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.userName || e.userEmail || '—'}
                  </div>
                  <div>
                    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${color}18`, color }}>
                      {e.action?.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(167,177,195,0.7)' }}>
                    {e.resourceType || '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(232,238,252,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.resourceId ? <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(167,177,195,0.5)', marginRight: 6 }}>{e.resourceId.slice(0, 8)}…</span> : null}
                    {hasDetails ? Object.entries(e.details).map(([k, v]) => `${k}: ${v}`).join(' · ').slice(0, 80) : ''}
                    {hasDetails && <span style={{ color: 'rgba(167,177,195,0.4)', fontSize: 10, marginLeft: 6 }}>{isExp ? '▲' : '▼'}</span>}
                  </div>
                </div>
                {isExp && (
                  <div style={{ padding: '8px 16px 12px 476px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <pre style={{ margin: 0, fontSize: 11, color: 'rgba(167,177,195,0.8)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(e.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {total > 50 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 12 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: page > 1 ? 'pointer' : 'default', opacity: page > 1 ? 1 : 0.4, fontFamily: 'inherit' }}>
            Zurück
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Seite {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: page < totalPages ? 'pointer' : 'default', opacity: page < totalPages ? 1 : 0.4, fontFamily: 'inherit' }}>
            Weiter
          </button>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
        {total} Einträge gesamt · Stats: letzte 7 Tage
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'rgba(255,138,42,0.04)', border: '1px solid rgba(255,138,42,0.12)', fontSize: 12, color: 'rgba(167,177,195,0.7)' }}>
        🔒 <strong style={{ color: '#ff8a2a' }}>Datenisolation:</strong> Du siehst nur Einträge deiner Klinik — technisch erzwungen durch Row-Level Security in der Datenbank.
      </div>
    </div>
  );
}
