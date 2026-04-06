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
  const [trialLinks, setTrialLinks] = useState(null);

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
            window.open(`https://crm.flowmatix.io#impersonate=${encodeURIComponent(token)}`, '_blank');
            flash('Impersonation session opened (30 min)');
          } else {
            flash('Impersonation failed: ' + (res?.error || 'No token'), 'err');
          }
        }
      }
      else if (action === 'trial') {
        const res = await fmApi.generateTrialLink(orgId);
        if (res?.links) {
          setTrialLinks(res.links);
        } else flash('Fehler beim Generieren', 'err');
        return;
      }
      loadDetail();
      onRefresh?.();
    } catch (err) { flash(safeStr(err?.message, 'Action failed'), 'err'); }
    finally { setActionLoading(null); }
  };

  const card = { background: 'var(--bg-card)', borderRadius: 14, padding: '22px 24px', marginBottom: 16, border: '1px solid var(--border-subtle)' };
  const sectionTitle = { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-secondary)', margin: '0 0 14px' };
  const row = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 };
  const lbl = { color: 'var(--text-muted)' };
  const val = { color: 'var(--text-primary)', fontWeight: 600 };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading clinic details...</div>;

  const d = detail || clinic || {};
  const ws = safeStr(d.workspace_state || clinic?.workspace_state, '---');
  const subStatus = safeStr(d.subscription_status || clinic?.subscription_status, '---');
  // Status: use required_action from clinic-actions, but override if WA not connected
  const rawAction = safeStr(d.required_action || clinic?.required_action, 'NONE');
  const waPhone = safeStr(d.phone_number || d.wa_phone || d.organization?.metadata?.wa_phone || clinic?.wa_phone || clinic?.metadata?.wa_phone || clinic?.whatsapp_phone_id, '---');
  const waSetupStatus = safeStr(d.wa_setup_status || clinic?.wa_setup_status, 'not_started');
  const waActive = (d.whatsapp_connected === true || clinic?.whatsapp_connected === true) && waSetupStatus !== 'not_started';
  const waStatus = (rawAction === 'NONE' && !waActive) ? 'CONNECT_WHATSAPP' : rawAction;
  const gcOk = d.google_connected === true || clinic?.google_connected === true;
  const readiness = safeNum(d.readiness_score || clinic?.readiness_score);
  const trialEnd = d.trial_end || clinic?.trial_end;

  return (
    <div>
      {/* Trial Links Modal */}
      {trialLinks && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }} onClick={() => setTrialLinks(null)}>
          <div style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, width: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 4 }}>🎁 Trial-Links</div>
            <div style={{ fontSize: 12, color: '#8D93A6', marginBottom: 20 }}>30 Tage kostenlos · dann Setup-Gebühr + Abo · Kreditkarte jetzt hinterlegen</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {trialLinks.map(l => (
                <div key={l.plan} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{l.plan.charAt(0).toUpperCase() + l.plan.slice(1)} — bis {l.patientLimit} Patienten</div>
                    <div style={{ fontSize: 11, color: '#10b981', fontFamily: 'monospace' }}>{l.shortUrl}</div>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(l.shortUrl); }} style={{ padding: '6px 12px', borderRadius: 7, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Kopieren</button>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: '#8D93A6', marginBottom: 16 }}>Links gültig 24h. Kreditkarte wird sofort hinterlegt, Abbuchung erst nach 30 Tagen.</div>
            <button onClick={() => setTrialLinks(null)} style={{ width: '100%', padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8D93A6', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Schließen</button>
          </div>
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button onClick={onClose} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 14px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{safeStr(d.name || clinic?.name)}</h1>
          <div onClick={() => navigator.clipboard.writeText(d.id || clinic?.id || '')} style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.5, cursor: 'pointer', fontFamily: 'monospace', marginTop: 2 }} title="Klick zum Kopieren">{d.id || clinic?.id}</div>
        </div>
        <StatusBadge status={waStatus} size="lg" />
      </div>

      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: msg.type === 'ok' ? '#22c55e20' : '#ef444420', color: msg.type === 'ok' ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: 600 }}>
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

      {/* Clinic Lifecycle Timeline */}
      <ClinicTimeline ws={ws} waStatus={waStatus} waActive={waActive} subStatus={subStatus} templates={d._templates || []} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Overview Section */}
        <div style={card}>
          <h3 style={sectionTitle}>Overview</h3>
          <div style={row}><span style={lbl}>Name</span><span style={val}>{safeStr(d.name || clinic?.name)}</span></div>
          <div style={row}><span style={lbl}>Email</span><span style={val}>{safeStr(d.email || clinic?.email)}</span></div>
          <div style={row}><span style={lbl}>Plan</span><span style={val}>{safeStr(d.plan_name || clinic?.plan_name, '---')}</span></div>
          <div style={row}><span style={lbl}>Workspace State</span><span style={val}><StatusBadge status={ws} /></span></div>
          <div style={row}><span style={lbl}>Subscription</span><span style={val}><StatusBadge status={subStatus} /></span></div>
          <div style={row}><span style={lbl}>Trial End</span><span style={val}>{trialEnd ? new Date(trialEnd).toLocaleDateString('de-DE') : '---'}</span></div>
          <div style={row}><span style={lbl}>Created</span><span style={val}>{d.created_at ? new Date(d.created_at).toLocaleDateString('de-DE') : '---'}</span></div>
        </div>

        {/* WhatsApp Section */}
        <div style={card}>
          <h3 style={sectionTitle}>WhatsApp</h3>
          <div style={row}><span style={lbl}>Status</span><span style={val}><StatusBadge status={waStatus} /></span></div>
          <div style={row}><span style={lbl}>Phone</span><span style={val}>{waPhone}</span></div>
          <div style={row}>
            <span style={lbl}>Connected</span>
            <span style={{ color: waActive ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 13 }}>
              {waActive ? 'Yes' : 'No'}
            </span>
          </div>
          {d.wa_error && <div style={row}><span style={lbl}>Error</span><span style={{ color: '#ef4444', fontSize: 12 }}>{safeStr(d.wa_error)}</span></div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={() => setShowWaModal(true)} style={actionBtn('#ff8a2a')}>Setup WhatsApp</button>
            <button onClick={() => handleAction('wa-force')} disabled={actionLoading === 'wa-force'} style={actionBtn('#22c55e')}>Force Connect</button>
            <button onClick={() => handleAction('wa-reset')} disabled={actionLoading === 'wa-reset'} style={actionBtn('#ef4444')}>Reset WA</button>
          </div>
        </div>

        {/* WA Business Profile (submitted by customer) */}
        <WaProfileCard profile={d.wa_profile_request || clinic?.wa_profile_request} submittedAt={d.wa_profile_request_at || clinic?.wa_profile_request_at} />

        {/* Integrations Section */}
        <div style={card}>
          <h3 style={sectionTitle}>Integrations</h3>
          <div style={row}>
            <span style={lbl}>Google Calendar</span>
            <span style={{ color: gcOk ? '#22c55e' : '#8899b0', fontWeight: 700, fontSize: 13 }}>
              {gcOk ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <div style={row}>
            <span style={lbl}>Automations</span>
            <span style={val}>{safeNum(d.active_workflows || clinic?.active_workflows)} active</span>
          </div>
          <div style={row}>
            <span style={lbl}>Readiness Score</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: readiness === 100 ? '#22c55e' : readiness >= 50 ? '#ffcf40' : '#ef4444' }}>{readiness}%</span>
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{approved.length} approved</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#ffcf40' }}>{pending.length} pending</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{rejected.length} rejected</span>
                  </div>
                  {tpl.slice(0, 8).map((t, i) => (
                    <div key={i} style={{ ...row, padding: '6px 0' }}>
                      <span style={{ color: 'var(--text-primary)', fontSize: 12 }}>{safeStr(t.name || t.template_name)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.status === 'approved' || t.status === 'APPROVED' ? '#22c55e' : t.status === 'rejected' || t.status === 'REJECTED' ? '#ef4444' : '#ffcf40' }}>
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
            const patients = safeNum(d.usage?.total_patients || d.patient_count || clinic?.patient_count);
            const appointments = safeNum(d.usage?.appointments_this_month || d.appointments_this_month || clinic?.appointments_this_month);
            const messages = safeNum(d.usage?.messages_this_month || d.messages_this_month || clinic?.messages_this_month);
            const convRate = patients > 0 && appointments > 0 ? Math.round((appointments / patients) * 100) : 0;
            return (
              <>
                <div style={row}><span style={lbl}>Total Patients</span><span style={val}>{patients}</span></div>
                <div style={row}><span style={lbl}>Appointments</span><span style={val}>{appointments}</span></div>
                <div style={row}><span style={lbl}>Messages</span><span style={val}>{messages}</span></div>
                <div style={row}><span style={lbl}>Conversion Rate</span><span style={{ fontWeight: 700, fontSize: 13, color: convRate > 20 ? '#22c55e' : convRate > 0 ? '#ffcf40' : 'var(--text-muted)' }}>{convRate}%</span></div>
              </>
            );
          })()}
        </div>

        {/* Actions Section */}
        <div style={card}>
          <h3 style={sectionTitle}>Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => handleAction('trial')} disabled={actionLoading === 'trial'}
              style={{ ...bigBtn('#10b981'), opacity: actionLoading === 'trial' ? 0.6 : 1 }}>
              🎁 Trial-Link generieren
            </button>
            <button onClick={() => handleAction('impersonate')} disabled={actionLoading === 'impersonate'}
              style={{ ...bigBtn('#c4a6ff'), opacity: actionLoading === 'impersonate' ? 0.6 : 1 }}>
              Impersonate Clinic
            </button>
            {ws !== 'suspended' ? (
              <button onClick={() => handleAction('suspend')} disabled={actionLoading === 'suspend'}
                style={{ ...bigBtn('#ef4444'), opacity: actionLoading === 'suspend' ? 0.6 : 1 }}>
                Suspend Clinic
              </button>
            ) : (
              <button onClick={() => handleAction('resume')} disabled={actionLoading === 'resume'}
                style={{ ...bigBtn('#22c55e'), opacity: actionLoading === 'resume' ? 0.6 : 1 }}>
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
              <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, fontFamily: 'monospace' }}>
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
  return { background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'opacity 0.15s' };
}

function bigBtn(bg) {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', transition: 'opacity 0.15s' };
}

// Force React import for fragments
const _React = React;

function WaProfileCard({ profile, submittedAt }) {
  if (!profile) return null;
  const p = typeof profile === 'string' ? (() => { try { return JSON.parse(profile); } catch { return null; } })() : profile;
  if (!p) return null;

  const card = { background: 'var(--bg-card)', borderRadius: 14, padding: '22px 24px', marginBottom: 16, border: '1px solid var(--border-subtle)' };
  const row = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 };
  const lbl = { color: 'var(--text-muted)' };
  const val = { color: 'var(--text-primary)', fontWeight: 600 };

  const downloadImage = (dataUrl, filename) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const hours = p.businessHours?.business_hours;
  const dayNames = { MONDAY: 'Mo', TUESDAY: 'Di', WEDNESDAY: 'Mi', THURSDAY: 'Do', FRIDAY: 'Fr', SATURDAY: 'Sa', SUNDAY: 'So' };
  const fmtTime = (t) => t ? `${t.slice(0,2)}:${t.slice(2)}` : '';

  return (
    <div style={{ ...card, border: '1px solid rgba(255,138,42,0.2)', background: 'rgba(255,138,42,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#ff8a2a', margin: 0 }}>WA Business Profile (Eingereicht)</h3>
        {submittedAt && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(submittedAt).toLocaleString('de-DE')}</span>}
      </div>

      {/* Images */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {p.logoUrl && (
          <div style={{ textAlign: 'center' }}>
            <img src={p.logoUrl} alt="Logo" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-strong)' }} />
            <div style={{ marginTop: 6 }}>
              <button onClick={() => downloadImage(p.logoUrl, 'wa-profile-photo.jpg')}
                style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' }}>
                Download Profilbild
              </button>
            </div>
          </div>
        )}
        {p.bannerUrl && (
          <div style={{ textAlign: 'center' }}>
            <img src={p.bannerUrl} alt="Banner" style={{ width: 120, height: 72, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--border-strong)' }} />
            <div style={{ marginTop: 6 }}>
              <button onClick={() => downloadImage(p.bannerUrl, 'wa-banner.jpg')}
                style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' }}>
                Download Banner
              </button>
            </div>
          </div>
        )}
        {!p.logoUrl && !p.bannerUrl && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Keine Bilder eingereicht</span>}
      </div>

      {/* Profile Data */}
      {p.botName && <div style={row}><span style={lbl}>Bot Name</span><span style={val}>{p.botName}</span></div>}
      {p.about && <div style={row}><span style={lbl}>About / Status</span><span style={val}>{p.about}</span></div>}
      {p.description && p.description !== p.about && <div style={row}><span style={lbl}>Description</span><span style={val}>{p.description}</span></div>}
      {p.address && <div style={row}><span style={lbl}>Address</span><span style={val}>{p.address}</span></div>}
      {p.email && <div style={row}><span style={lbl}>Email</span><span style={val}>{p.email}</span></div>}
      {p.websites?.length > 0 && <div style={row}><span style={lbl}>Website</span><span style={val}>{p.websites.join(', ')}</span></div>}
      {p.vertical && <div style={row}><span style={lbl}>Category</span><span style={val}>{{ HEALTH: 'Gesundheit / Medizin', BEAUTY: 'Schönheit / Kosmetik', MEDICAL: 'Medizin / Gesundheit', OTHER: 'Sonstiges' }[p.vertical] || p.vertical}</span></div>}

      {/* 360dialog Button */}
      <div style={{ marginTop: 14 }}>
        <a href="https://hub.360dialog.com/dashboard/partner/pipes" target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit', transition: 'opacity 0.15s' }}>
          360dialog öffnen →
        </a>
      </div>

      {/* Business Hours */}
      {hours?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Öffnungszeiten</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {hours.map((h, i) => (
              <span key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-hover)', borderRadius: 4, padding: '3px 8px' }}>
                {dayNames[h.day_of_week] || h.day_of_week} {fmtTime(h.open_time)}–{fmtTime(h.close_time)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function logColor(level) {
  const l = typeof level === 'string' ? level.toLowerCase() : '';
  if (l === 'error' || l === 'critical') return '#ef4444';
  if (l === 'warning' || l === 'warn') return '#ff8c2a';
  if (l === 'success' || l === 'ok') return '#22c55e';
  return '#5ee0ff';
}

function ClinicTimeline({ ws, waStatus, waActive, subStatus, templates = [] }) {
  const hasPurchased = subStatus === 'active';
  const setupStarted = ws !== 'demo' && ws !== '---';
  const waConnected = waActive && waStatus !== 'not_started' && waStatus !== '---' && waStatus !== 'Setup';
  const steps = [
    { id: 'purchased', label: hasPurchased ? 'Purchased' : 'Trial', done: hasPurchased },
    { id: 'setup', label: 'Setup Started', done: setupStarted },
    { id: 'wa_connected', label: 'WhatsApp Connected', done: waConnected },
    { id: 'templates', label: 'Templates Ready', done: templates.some(t => t.status === 'approved' || t.status === 'APPROVED') },
    { id: 'live', label: 'Live', done: ws === 'active' && subStatus === 'active' && waConnected },
  ];
  const currentIdx = steps.findLastIndex(s => s.done);

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {steps.map((step, i) => {
          const isDone = step.done;
          const isCurrent = i === currentIdx + 1;
          const color = isDone ? '#22c55e' : isCurrent ? '#ff8a2a' : 'var(--border-hover)';
          return (
            <React.Fragment key={step.id}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0, flex: '0 0 auto' }}>
                <div style={{ width: 24, height: 24, borderRadius: 99, background: isDone ? '#22c55e20' : isCurrent ? '#ff8a2a20' : 'var(--bg-hover)', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color }}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 10, fontWeight: isDone || isCurrent ? 700 : 500, color: isDone ? '#22c55e' : isCurrent ? '#ff8a2a' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, background: isDone ? '#22c55e' : 'var(--border-default)', margin: '0 8px', marginBottom: 20 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
