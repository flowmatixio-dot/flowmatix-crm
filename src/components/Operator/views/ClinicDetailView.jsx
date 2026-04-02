import React, { useState, useEffect, useCallback } from 'react';
import StatCard from '../shared/StatCard.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import WaOnboardingModal from '../shared/WaOnboardingModal.jsx';
import { safe, safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

export default function ClinicDetailView({ clinic, onClose, onRefresh }) {
  const [detail, setDetail] = useState(null);
  const [waLogEntries, setWaLogEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWaModal, setShowWaModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg] = useState(null);

  const orgId = clinic?.id || clinic?.org_id;

  const loadDetail = useCallback(async () => {
    if (!orgId) return;
    try {
      const [overview, logs, templates] = await Promise.all([
        fmApi.getClinicOverview(orgId).catch(() => null),
        fmApi.waLogs(orgId).catch(() => null),
        fmApi.apiFetch(`/api/v1/ops/clinic/${orgId}/templates`).catch(() => null),
      ]);
      if (overview) overview._templates = Array.isArray(templates?.templates) ? templates.templates : [];
      setDetail(overview);
      setWaLogEntries(Array.isArray(logs?.logs) ? logs.logs : Array.isArray(logs) ? logs : []);
    } catch {} finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const flash = (text, type = 'ok') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      if (action === 'wa-start') { await fmApi.waStart(orgId); flash('WA setup started'); }
      else if (action === 'wa-retry') { await fmApi.waRetry(orgId); flash('WA retry triggered'); }
      else if (action === 'wa-force') { await fmApi.waForceConnect(orgId); flash('WA force connect sent'); }
      else if (action === 'wa-reset') { await fmApi.waReset(orgId); flash('WA reset complete'); }
      else if (action === 'suspend') {
        const reason = prompt('Suspend reason:');
        if (reason) { await fmApi.suspendClinic(orgId, reason); flash('Clinic suspended'); }
      }
      else if (action === 'resume') { await fmApi.resumeClinic(orgId); flash('Clinic resumed'); }
      else if (action === 'impersonate') {
        const reason = prompt('Impersonation reason (min 5 chars, for audit log):');
        if (reason && reason.length >= 5) {
          const res = await fmApi.impersonateClinic(orgId, reason);
          const token = res?.impersonation?.accessToken || res?.token;
          if (token) {
            window.open(`https://crm.flowmatix.io?impersonate_token=${encodeURIComponent(token)}`, '_blank');
            flash('Impersonation session opened (30 min)');
          } else {
            flash('Impersonation failed: ' + (res?.error || 'No token'), 'err');
          }
        }
      }
      loadDetail();
      onRefresh?.();
    } catch (err) { flash(safeStr(err?.message, 'Action failed'), 'err'); }
    finally { setActionLoading(null); }
  };

  const card = { background: 'var(--bg-card)', borderRadius: 12, padding: 20, marginBottom: 16 };
  const sectionTitle = { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-secondary)', margin: '0 0 14px' };
  const row = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 };
  const lbl = { color: 'var(--text-muted)' };
  const val = { color: 'var(--text-primary)', fontWeight: 600 };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading clinic details...</div>;

  const d = detail || clinic || {};
  const ws = safeStr(d.workspace_state || clinic?.workspace_state, '---');
  const subStatus = safeStr(d.subscription_status || clinic?.subscription_status, '---');
  const waStatus = safeStr(d.wa_setup_status || d.whatsapp_status || clinic?.required_action, '---');
  const waPhone = safeStr(d.phone_number || d.wa_phone, '---');
  const waActive = d.whatsapp_connected === true || d.wa_active === true || clinic?.whatsapp_connected === true;
  const gcOk = d.google_connected === true || clinic?.google_connected === true;
  const readiness = safeNum(d.readiness_score || clinic?.readiness_score);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button onClick={onClose} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Back
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, flex: 1 }}>{safeStr(d.name || clinic?.name)}</h1>
        <StatusBadge status={waStatus} size="lg" />
      </div>

      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: msg.type === 'ok' ? '#10b98120' : '#ef444420', color: msg.type === 'ok' ? '#10b981' : '#ef4444', fontSize: 13, fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Plan" value={safeStr(d.plan_name || clinic?.plan_name, 'No plan')} color="blue" />
        <StatCard label="Patients" value={safeNum(d.patient_count || clinic?.patient_count)} color="purple" />
        <StatCard label="Health" value={`${readiness}%`} color={readiness > 80 ? 'green' : readiness >= 50 ? 'yellow' : 'red'} />
        <StatCard label="MRR" value={`EUR ${safeNum(d.mrr || clinic?.mrr).toLocaleString('de-DE')}`} color="green" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Overview Section */}
        <div style={card}>
          <h3 style={sectionTitle}>Overview</h3>
          <div style={row}><span style={lbl}>Name</span><span style={val}>{safeStr(d.name || clinic?.name)}</span></div>
          <div style={row}><span style={lbl}>Email</span><span style={val}>{safeStr(d.email || clinic?.email)}</span></div>
          <div style={row}><span style={lbl}>Plan</span><span style={val}>{safeStr(d.plan_name || clinic?.plan_name, '---')}</span></div>
          <div style={row}><span style={lbl}>Workspace State</span><span style={val}><StatusBadge status={ws} /></span></div>
          <div style={row}><span style={lbl}>Subscription</span><span style={val}><StatusBadge status={subStatus} /></span></div>
          <div style={row}><span style={lbl}>Trial End</span><span style={val}>{d.trial_end ? new Date(d.trial_end).toLocaleDateString('de-DE') : '---'}</span></div>
          <div style={row}><span style={lbl}>Created</span><span style={val}>{d.created_at ? new Date(d.created_at).toLocaleDateString('de-DE') : '---'}</span></div>
        </div>

        {/* WhatsApp Section */}
        <div style={card}>
          <h3 style={sectionTitle}>WhatsApp</h3>
          <div style={row}><span style={lbl}>Status</span><span style={val}><StatusBadge status={waStatus} /></span></div>
          <div style={row}><span style={lbl}>Phone</span><span style={val}>{waPhone}</span></div>
          <div style={row}>
            <span style={lbl}>Connected</span>
            <span style={{ color: waActive ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 13 }}>
              {waActive ? 'Yes' : 'No'}
            </span>
          </div>
          {d.wa_error && <div style={row}><span style={lbl}>Error</span><span style={{ color: '#ef4444', fontSize: 12 }}>{safeStr(d.wa_error)}</span></div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={() => setShowWaModal(true)} style={actionBtn('#ff8a2a')}>WA Onboarding Wizard</button>
            <button onClick={() => handleAction('wa-force')} disabled={actionLoading === 'wa-force'} style={actionBtn('#10b981')}>Force Connect</button>
            <button onClick={() => handleAction('wa-reset')} disabled={actionLoading === 'wa-reset'} style={actionBtn('#ef4444')}>Reset WA</button>
          </div>
        </div>

        {/* Integrations Section */}
        <div style={card}>
          <h3 style={sectionTitle}>Integrations</h3>
          <div style={row}>
            <span style={lbl}>Google Calendar</span>
            <span style={{ color: gcOk ? '#10b981' : '#6b7280', fontWeight: 700, fontSize: 13 }}>
              {gcOk ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <div style={row}>
            <span style={lbl}>Automations</span>
            <span style={val}>{safeNum(d.active_workflows || clinic?.active_workflows)} active</span>
          </div>
          <div style={row}>
            <span style={lbl}>Readiness Score</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: readiness === 100 ? '#10b981' : readiness >= 50 ? '#eab308' : '#ef4444' }}>{readiness}%</span>
          </div>
        </div>

        {/* Templates Section */}
        {(() => {
          const tpl = d._templates || [];
          const approved = tpl.filter(t => t.status === 'approved' || t.status === 'APPROVED');
          const pending = tpl.filter(t => t.status === 'pending' || t.status === 'PENDING');
          const rejected = tpl.filter(t => t.status === 'rejected' || t.status === 'REJECTED');
          return (
            <div style={card}>
              <h3 style={sectionTitle}>WhatsApp Templates</h3>
              {tpl.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No template data available</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{approved.length} approved</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#eab308' }}>{pending.length} pending</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{rejected.length} rejected</span>
                  </div>
                  {tpl.slice(0, 8).map((t, i) => (
                    <div key={i} style={{ ...row, padding: '6px 0' }}>
                      <span style={{ color: 'var(--text-primary)', fontSize: 12 }}>{safeStr(t.name || t.template_name)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.status === 'approved' || t.status === 'APPROVED' ? '#10b981' : t.status === 'rejected' || t.status === 'REJECTED' ? '#ef4444' : '#eab308' }}>
                        {safeStr(t.status)} {t.language ? `(${safeStr(t.language)})` : ''}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })()}

        {/* Conversion Metrics */}
        <div style={card}>
          <h3 style={sectionTitle}>Conversion Metrics</h3>
          {(() => {
            const patients = safeNum(d.patient_count || d.usage?.patients || clinic?.patient_count);
            const appointments = safeNum(d.usage?.appointments || d.appointments_this_month);
            const messages = safeNum(d.usage?.messages || d.messages_this_month);
            const convRate = patients > 0 && appointments > 0 ? Math.round((appointments / patients) * 100) : 0;
            return (
              <>
                <div style={row}><span style={lbl}>Total Patients</span><span style={val}>{patients}</span></div>
                <div style={row}><span style={lbl}>Appointments</span><span style={val}>{appointments}</span></div>
                <div style={row}><span style={lbl}>Messages</span><span style={val}>{messages}</span></div>
                <div style={row}><span style={lbl}>Conversion Rate</span><span style={{ fontWeight: 700, fontSize: 13, color: convRate > 20 ? '#10b981' : convRate > 0 ? '#eab308' : 'var(--text-muted)' }}>{convRate}%</span></div>
              </>
            );
          })()}
        </div>

        {/* Actions Section */}
        <div style={card}>
          <h3 style={sectionTitle}>Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => handleAction('impersonate')} disabled={actionLoading === 'impersonate'}
              style={{ ...bigBtn('#a78bfa'), opacity: actionLoading === 'impersonate' ? 0.6 : 1 }}>
              Impersonate Clinic
            </button>
            {ws !== 'suspended' ? (
              <button onClick={() => handleAction('suspend')} disabled={actionLoading === 'suspend'}
                style={{ ...bigBtn('#ef4444'), opacity: actionLoading === 'suspend' ? 0.6 : 1 }}>
                Suspend Clinic
              </button>
            ) : (
              <button onClick={() => handleAction('resume')} disabled={actionLoading === 'resume'}
                style={{ ...bigBtn('#10b981'), opacity: actionLoading === 'resume' ? 0.6 : 1 }}>
                Resume Clinic
              </button>
            )}
          </div>
        </div>
      </div>

      {/* WA Audit Logs */}
      <div style={{ ...card, marginTop: 0 }}>
        <h3 style={sectionTitle}>WhatsApp Audit Logs</h3>
        {waLogEntries.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>No WA logs available</div>
        ) : (
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            {waLogEntries.map((log, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, fontFamily: 'monospace' }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0, width: 140 }}>
                  {log.created_at ? new Date(log.created_at).toLocaleString('de-DE') : log.timestamp ? new Date(log.timestamp).toLocaleString('de-DE') : '---'}
                </span>
                <span style={{ color: logColor(log.level || log.severity), fontWeight: 600, width: 60, flexShrink: 0 }}>
                  {safeStr(log.level || log.severity || log.type, 'info')}
                </span>
                <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {safeStr(log.message || log.action || log.details, '---')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WA Onboarding Modal */}
      {showWaModal && (
        <WaOnboardingModal
          clinic={{ ...clinic, ...(detail || {}), id: clinic?.id }}
          onClose={() => setShowWaModal(false)}
          onComplete={() => { setShowWaModal(false); loadDetail(); onRefresh?.(); }}
        />
      )}
    </div>
  );
}

function actionBtn(bg) {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
}

function bigBtn(bg) {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center' };
}

function logColor(level) {
  const l = typeof level === 'string' ? level.toLowerCase() : '';
  if (l === 'error' || l === 'critical') return '#ef4444';
  if (l === 'warning' || l === 'warn') return '#f97316';
  if (l === 'success' || l === 'ok') return '#10b981';
  return '#3b82f6';
}
