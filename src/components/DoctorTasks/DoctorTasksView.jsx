import React, { useState, useEffect, useCallback } from 'react';
import * as fmApi from '../../api/client.js';
import { useApp } from '../../context/AppContext';
import { dt } from './doctorI18n';

// Fallback techniques if API has none
const FALLBACK_TECHNIQUES = [
  { value: 'fue', label: 'FUE' },
  { value: 'dhi', label: 'DHI' },
  { value: 'fue_sapphire', label: 'FUE Saphir' },
];

function getUrgency(createdAt) {
  if (!createdAt) return { color: 'rgba(76,201,255,0.5)', bg: 'rgba(76,201,255,0.04)', border: 'rgba(76,201,255,0.08)', label: '' };
  const h = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (h >= 24) return { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)' };
  if (h >= 6) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' };
  return { color: 'rgba(76,201,255,0.6)', bg: 'rgba(76,201,255,0.05)', border: 'rgba(76,201,255,0.12)' };
}

function timeLabel(createdAt) {
  if (!createdAt) return '';
  const h = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const l = (localStorage.getItem('fm_doctor_lang') || localStorage.getItem('fm_lang') || 'de');
  const since = { de: 'Seit', en: 'Since', tr: 'Beri' }[l] || 'Seit';
  if (h >= 1) return `${since} ${Math.floor(h)}h`.trim();
  return `${since} ${Math.floor(h * 60)}m`.trim();
}

const S = {
  input: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  select: { width: '100%', background: '#0f1623', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer' },
  textarea: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', minHeight: 60 },
  label: { fontSize: 10, fontWeight: 700, color: 'rgba(167,177,195,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' },
};

export default function DoctorTasksView({ onLogout } = {}) {
  const ctx = useApp();
  const t = ctx?.t || (k => k);
  const lang = localStorage.getItem('fm_doctor_lang') || localStorage.getItem('fm_lang') || 'de';
  const tl = (key) => dt(lang, key);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [formData, setFormData] = useState({});
  const [lightbox, setLightbox] = useState(null);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('pending');
  const [taskPhotos, setTaskPhotos] = useState({});
  const [clinicConfig, setClinicConfig] = useState({});
  const [techniques, setTechniques] = useState(FALLBACK_TECHNIQUES);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('fm_doctor_onboarded'));
  const [skippedIds, setSkippedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('fm_doctor_skipped') || '[]')); } catch { return new Set(); }
  });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const skipTask = (id) => { setSkippedIds(prev => { const n = new Set(prev); n.add(id); localStorage.setItem('fm_doctor_skipped', JSON.stringify([...n])); return n; }); showToast(tl('case_skipped') || 'Fall übersprungen'); };
  const getForm = (id) => formData[id] || {};
  const setForm = (id, patch) => setFormData(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));

  const loadTasks = useCallback(async () => {
    try { const res = await fmApi.fetchTasks(); setTasks(res.tasks || []); }
    catch (e) {
      console.error('Failed to load tasks:', e);
      if (e.message?.includes('Session expired') || e.message?.includes('Failed to fetch')) {
        window.location.reload();
      }
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => {
    fmApi.getClinicSettings().then(res => { if (res?.clinic) setClinicConfig(res.clinic); }).catch(() => {});
    fmApi.getTreatments().then(res => {
      const tt = res?.treatments;
      if (tt?.length) setTechniques(tt.map(t => ({ value: t.slug || t.name?.toLowerCase().replaceAll(/\s+/g, '_') || t.id, label: t.name || t.label })));
    }).catch(() => {});
  }, []);
  useEffect(() => {
    tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').forEach(async (task) => {
      if (taskPhotos[task.id]) return;
      try { const res = await fmApi.fetchTaskPhotos(task.id); if (res?.photos?.length) setTaskPhotos(prev => ({ ...prev, [task.id]: res.photos })); } catch {}
    });
  }, [tasks]);
  useEffect(() => { const iv = setInterval(loadTasks, 15000); return () => clearInterval(iv); }, [loadTasks]);
  useEffect(() => {
    const token = sessionStorage.getItem('fm_access_token');
    if (!token) return;
    const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = window.location.hostname.replaceAll('app.', 'api.').replaceAll('crm.', 'api.');
    let ws, pingIv, reconnectTo, failCount = 0;
    const connect = () => {
      const freshToken = sessionStorage.getItem('fm_access_token');
      if (!freshToken) return;
      ws = new WebSocket(`${wsProto}://${wsHost}/ws/v1/realtime?token=${freshToken}`);
      ws.onopen = () => { failCount = 0; pingIv = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' })); }, 30000); };
      ws.onmessage = (e) => { try { const d = JSON.parse(e.data); if (d.type?.startsWith('task:')) loadTasks(); } catch {} };
      ws.onclose = () => { clearInterval(pingIv); failCount++; if (failCount < 5) reconnectTo = setTimeout(connect, Math.min(failCount * 5000, 30000)); };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => { clearInterval(pingIv); clearTimeout(reconnectTo); if (ws) ws.close(); };
  }, [loadTasks]);

  const handlePickupSubmit = async (task) => {
    const form = getForm(task.id);
    if (!form.driverName?.trim()) { showToast(tl('error_enter_driver'), 'error'); return; }
    setSubmitting(task.id);
    try {
      await fmApi.updateTask(task.id, { result: { driverName: form.driverName.trim(), driverPhone: form.driverPhone || '', vehicle: form.vehicle || '', notes: form.notes || '', assignedAt: new Date().toISOString() } });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed', result: { driverName: form.driverName }, completedAt: new Date().toISOString() } : t));
      setFormData(prev => { const n = { ...prev }; delete n[task.id]; return n; });
      showToast(tl('review_saved'));
    } catch { showToast(tl('error_saving'), 'error'); }
    finally { setSubmitting(null); }
  };

  const handleSubmit = async (task) => {
    const form = getForm(task.id);
    const grafts = Number.parseInt(form.grafts, 10);
    const price = Number.parseInt(form.price, 10);
    if (!grafts || grafts < 1) { showToast(tl('error_enter_grafts'), 'error'); return; }
    if (!price || price < 1) { showToast(tl('error_enter_price'), 'error'); return; }
    setSubmitting(task.id);
    try {
      const res = await fmApi.updateTask(task.id, { result: { graftCount: grafts, price, technique: form.technique || 'fue', notes: form.notes || '', currency: 'EUR', depositRequested: form.depositRequested || false, depositAmount: form.depositRequested ? Number.parseInt(form.depositAmount || '0') : 0 } });
      if (res?.error) { showToast(res.error, 'error'); setSubmitting(null); return; }
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed', result: { graftCount: grafts, price, technique: form.technique || 'fue', notes: form.notes }, completedAt: new Date().toISOString() } : t));
      setFormData(prev => { const n = { ...prev }; delete n[task.id]; return n; });
      showToast(tl('review_saved'));
    } catch (e) {
      console.error('[doctor] Submit failed:', e);
      if (e.message === 'DEMO_BLOCKED') { showToast(tl('demo_blocked') || 'Not available in demo mode', 'error'); }
      else if (e.message?.includes('Session expired') || e.message?.includes('Failed to fetch')) { showToast(tl('session_expired') || 'Session expired — please log in again', 'error'); setTimeout(() => window.location.reload(), 2000); }
      else { showToast(tl('error_saving'), 'error'); }
    }
    setSubmitting(null);
  };

  const pendingTasks = tasks.filter(t => (t.status === 'pending' || t.status === 'in_progress') && !skippedIds.has(t.id)).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'canceled').sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#ff8a2a', borderRadius: '50%', animation: 'fmSpin .8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ color: 'rgba(167,177,195,0.75)', fontSize: 13 }}>{tl('loading_tasks')}</div>
        <style>{`@keyframes fmSpin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ color: '#f1f5f9', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      {/* Toast */}
      {toast && <div style={{ position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(16,185,129,0.95)', color: '#fff', padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 6px 24px rgba(0,0,0,0.4)', fontFamily: 'inherit' }}>{toast.msg}</div>}

      {/* Lightbox */}
      {lightbox && <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 20 }}><img src={lightbox} style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} alt="" /></div>}

      {/* Header */}
      <div style={{ padding: '20px 28px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{tl('doctor_portal_title') || 'Arzt-Portal'}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onLogout && <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(167,177,195,0.6)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>{tl('logout')}</button>}
          </div>
        </div>
      </div>

      {/* Intro (once) */}
      {showOnboarding && (
        <div style={{ margin: '12px 28px 0', padding: '12px 16px', borderRadius: 10, background: 'rgba(76,201,255,0.03)', border: '1px solid rgba(76,201,255,0.08)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
          <div style={{ flex: 1, fontSize: 12, color: 'rgba(167,177,195,0.7)', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(232,238,252,0.9)', marginBottom: 6 }}>{tl('onboarding_title')}</div>
            <div><strong style={{ color: 'rgba(255,138,42,0.7)' }}>1.</strong> {tl('onboarding_line1')}</div>
            <div><strong style={{ color: 'rgba(255,138,42,0.7)' }}>2.</strong> {tl('onboarding_line2')}</div>
            <div><strong style={{ color: 'rgba(255,138,42,0.7)' }}>3.</strong> {tl('onboarding_line4')}</div>
          </div>
          <button onClick={() => { setShowOnboarding(false); localStorage.setItem('fm_doctor_onboarded', '1'); }} style={{ background: 'none', border: 'none', color: 'rgba(167,177,195,0.65)', fontSize: 14, cursor: 'pointer', padding: '0 2px', flexShrink: 0, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '12px 0 0' }}>
        {[
          { key: 'pending', label: `${tl('tab_open')} (${pendingTasks.length})`, dot: pendingTasks.length > 0 },
          { key: 'completed', label: `${tl('tab_reviewed')} (${completedTasks.length})` },
        ].map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} style={{
            background: 'none', border: 'none', borderBottom: tab === tb.key ? '2px solid #ff8a2a' : '2px solid transparent',
            color: tab === tb.key ? '#fff' : 'rgba(167,177,195,0.75)', padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {tb.dot && tab !== tb.key && <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 99, background: '#ff8a2a', marginRight: 5, verticalAlign: 'middle' }} />}
            {tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 28px 40px' }}>

        {/* Skipped tasks hint */}
        {tab === 'pending' && skippedIds.size > 0 && (
          <div style={{ textAlign: 'right', marginBottom: 8 }}>
            <button onClick={() => { setSkippedIds(new Set()); localStorage.removeItem('fm_doctor_skipped'); }} style={{ background: 'none', border: 'none', color: 'rgba(76,201,255,0.5)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
              {skippedIds.size} {tl('skipped_cases_show') || 'skipped — show again'}
            </button>
          </div>
        )}

        {/* Empty: Open */}
        {tab === 'pending' && pendingTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 18 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(232,238,252,0.95)' }}>{tl("empty_open_title")}</div>
            <div style={{ fontSize: 12, color: 'rgba(167,177,195,0.7)', marginTop: 6, maxWidth: 320, margin: '6px auto 0', lineHeight: 1.5 }}>{tl("empty_open_desc")}</div>
          </div>
        )}

        {/* Empty: Reviewed */}
        {tab === 'completed' && completedTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(232,238,252,0.45)' }}>{tl("no_reviewed_cases")}</div>
            <div style={{ fontSize: 12, color: 'rgba(167,177,195,0.65)', marginTop: 4 }}>{tl("reviewed_cases_hint")}</div>
          </div>
        )}

        {/* ═══ OPEN CASES ═══ */}
        {tab === 'pending' && pendingTasks.map(task => {
          const photos = taskPhotos[task.id] || [];
          const intake = task.payload?.intake || {};
          const form = getForm(task.id);
          const isPickup = task.type === 'airport_pickup';
          const flight = task.payload || {};
          const canSubmit = isPickup ? (form.driverName?.trim()) : (form.grafts && Number.parseInt(form.grafts) > 0 && form.price && Number.parseInt(form.price) > 0);
          const urg = getUrgency(task.createdAt);
          const name = `${task.patient?.firstName || '?'} ${task.patient?.lastName || ''}`.trim();

          return (
            <div key={task.id} style={{ borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${urg.border}`, marginBottom: 14, overflow: 'hidden' }}>

              {/* ── TOP: Identity + Context + Urgency ── */}
              <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: urg.bg, border: `1px solid ${urg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: urg.color, flexShrink: 0 }}>
                    {isPickup ? '✈️' : '⚕️'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.6)', marginTop: 1, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {intake.treatment && <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(76,201,255,0.06)', border: '1px solid rgba(76,201,255,0.1)', color: 'rgba(76,201,255,0.7)', fontWeight: 600, fontSize: 10 }}>{intake.treatment}</span>}
                      {intake.concern && <span>{intake.concern}</span>}
                      {photos.length > 0 && <span>📷 {photos.length}</span>}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: urg.bg, color: urg.color, border: `1px solid ${urg.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {timeLabel(task.createdAt)}
                </span>
              </div>

              <div style={{ padding: '14px 16px' }}>

                {/* ── Scroll hint ── */}
                {!isPickup && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,138,42,0.06)', border: '1px solid rgba(255,138,42,0.15)', marginBottom: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#ff8a2a' }}>👇 {tl('scroll_hint') || 'Bitte nach unten scrollen und die Fotos bewerten'}</div>
                </div>}
                {/* ── MIDDLE: Photos ── */}
                {!isPickup && photos.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(photos.length, 4)}, 1fr)`, gap: 5 }}>
                      {photos.slice(0, 8).map((photo, i) => (
                        <div key={photo.id || i} onClick={() => setLightbox(photo.dataUri)} style={{ cursor: 'pointer', borderRadius: 7, overflow: 'hidden', aspectRatio: '1', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <img src={photo.dataUri} alt={`${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flight data (pickup) */}
                {isPickup && (
                  <div style={{ background: 'rgba(59,130,246,0.04)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, border: '1px solid rgba(59,130,246,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 11, color: 'rgba(167,177,195,0.7)' }}>
                    {flight.airline && <div>{t("airline_label") || "Airline:"} <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{flight.airline}</span></div>}
                    {flight.flight_number && <div>{t("flight_label") || "Flug:"} <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{flight.flight_number}</span></div>}
                    {flight.arrival_date && <div>{t("arrival_label") || "Ankunft:"} <span style={{ color: '#22c55e', fontWeight: 700 }}>{flight.arrival_date}</span></div>}
                    {flight.arrival_time && <div>{t("time_label") || "Zeit:"} <span style={{ color: '#22c55e', fontWeight: 700 }}>{flight.arrival_time}</span></div>}
                  </div>
                )}

                {/* Context note */}
                {!isPickup && (intake.hair_loss_duration || intake.previous_treatments || intake.medications) && (
                  <div style={{ background: 'rgba(255,255,255,0.015)', borderRadius: 7, padding: '8px 10px', marginBottom: 12, fontSize: 11, color: 'rgba(167,177,195,0.6)', lineHeight: 1.5 }}>
                    {intake.hair_loss_duration && <span>{tl('hair_loss_since')}: <strong style={{ color: 'rgba(232,238,252,0.95)' }}>{intake.hair_loss_duration}</strong> · </span>}
                    {intake.previous_treatments && intake.previous_treatments !== 'none' && intake.previous_treatments !== 'keine' && <span>{tl('previous_treatments')}: <strong style={{ color: 'rgba(232,238,252,0.95)' }}>{intake.previous_treatments}</strong> · </span>}
                    {intake.medications && intake.medications !== 'none' && intake.medications !== 'keine' && <span>{tl('medications')}: <strong style={{ color: 'rgba(232,238,252,0.95)' }}>{intake.medications}</strong></span>}
                  </div>
                )}

                {/* Assigner note */}
                {task.notes && <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.6)', background: 'rgba(167,107,255,0.03)', borderRadius: 7, padding: '7px 10px', marginBottom: 12, borderLeft: '2px solid rgba(167,139,250,0.3)' }}>{task.notes === 'Broadcast an alle Aerzte' ? tl('broadcast_all_doctors') || task.notes : task.notes}</div>}

                {/* ── BOTTOM: Decision Form ── */}
                {isPickup ? (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div><label style={S.label}>Fahrer *</label><input type="text" placeholder="Ahmet" value={form.driverName || ''} onChange={e => setForm(task.id, { driverName: e.target.value })} style={S.input} /></div>
                      <div><label style={S.label}>Telefon</label><input type="tel" placeholder="+90 555..." value={form.driverPhone || ''} onChange={e => setForm(task.id, { driverPhone: e.target.value })} style={S.input} /></div>
                    </div>
                    <div style={{ marginBottom: 8 }}><label style={S.label}>Fahrzeug</label><input type="text" placeholder="Mercedes Vito" value={form.vehicle || ''} onChange={e => setForm(task.id, { vehicle: e.target.value })} style={S.input} /></div>
                    <div style={{ marginBottom: 12 }}><label style={S.label}>Notiz</label><textarea placeholder="Terminal, Treffpunkt..." value={form.notes || ''} onChange={e => setForm(task.id, { notes: e.target.value })} style={S.textarea} /></div>
                    <button onClick={() => handlePickupSubmit(task)} disabled={!canSubmit || submitting === task.id} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default', fontFamily: 'inherit', background: canSubmit ? 'linear-gradient(135deg,#ff8a2a,#ff6b00)' : 'rgba(255,255,255,0.04)', color: canSubmit ? '#fff' : 'rgba(167,177,195,0.65)', opacity: submitting === task.id ? 0.6 : 1 }}>
                      {submitting === task.id ? '...' : tl('assign_driver') || 'Fahrer zuweisen'}
                    </button>
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div><label style={S.label}>{tl('grafts') || 'Grafts'} *</label><input type="number" placeholder="3000" value={form.grafts || ''} onChange={e => setForm(task.id, { grafts: e.target.value })} style={S.input} min="1" /></div>
                      <div><label style={S.label}>{tl('price_eur') || 'Preis (€)'} *</label><input type="number" placeholder="3500" value={form.price || ''} onChange={e => setForm(task.id, { price: e.target.value })} style={S.input} min="1" /></div>
                      <div><label style={S.label}>{tl('technique') || 'Technik'}</label><div style={{ position: 'relative' }}><select value={form.technique || 'fue'} onChange={e => setForm(task.id, { technique: e.target.value })} style={S.select}>{techniques.map(tc => <option key={tc.value} value={tc.value}>{tc.label}</option>)}</select><div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(167,177,195,0.65)', fontSize: 9 }}>▼</div></div></div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={S.label}>{tl('internal_notes') || 'Notiz (intern)'}</label>
                      <textarea placeholder={tl('notes_hint') || "Anmerkung für das Team..."} value={form.notes || ''} onChange={e => setForm(task.id, { notes: e.target.value })} style={S.textarea} />
                    </div>

                    {/* Deposit toggle */}
                    {clinicConfig.depositPolicy && clinicConfig.depositPolicy !== 'none' && (
                      <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(167,107,255,0.03)', border: '1px solid rgba(167,107,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13 }}>💳</span>
                          <span style={{ fontWeight: 600, fontSize: 11, color: '#a78bfa' }}>{tl('request_deposit') || 'Anzahlung anfordern'}</span>
                        </div>
                        <button onClick={() => { const nv = !form.depositRequested; const p = { depositRequested: nv }; if (nv && form.price) p.depositAmount = String(Math.max(Math.round(Number.parseInt(form.price) * 0.25), 500)); setForm(task.id, p); }} style={{ width: 36, height: 20, borderRadius: 10, background: form.depositRequested ? '#a78bfa' : 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', position: 'relative' }}>
                          <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff', position: 'absolute', top: 3, left: form.depositRequested ? 19 : 3, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />
                        </button>
                      </div>
                    )}

                    {/* ── ACTION AREA ── */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleSubmit(task)} disabled={!canSubmit || submitting === task.id} style={{
                        flex: 1, padding: '12px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default', fontFamily: 'inherit',
                        background: canSubmit ? 'linear-gradient(135deg,#ff8a2a,#ff6b00)' : 'rgba(255,255,255,0.04)',
                        color: canSubmit ? '#fff' : 'rgba(167,177,195,0.65)', opacity: submitting === task.id ? 0.6 : 1,
                        boxShadow: canSubmit ? '0 4px 14px rgba(255,138,42,0.25)' : 'none',
                      }}>
                        {submitting === task.id ? '...' : tl('submit_review') || 'Bewertung abschließen'}
                      </button>
                      <button onClick={() => skipTask(task.id)} style={{
                        padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)',
                        color: 'rgba(167,177,195,0.75)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                      }}>{t("skip") || "Überspringen"}</button>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(167,177,195,0.6)', marginTop: 6, textAlign: 'center' }}>{tl('patient_auto_contacted') || 'Patient wird automatisch kontaktiert'}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ═══ REVIEWED ═══ */}
        {tab === 'completed' && completedTasks.map(task => {
          const r = task.result || {};
          const tech = techniques.find(tc => tc.value === r.technique);
          const name = `${task.patient?.firstName || '?'} ${task.patient?.lastName || ''}`.trim();
          return (
            <div key={task.id} style={{ borderRadius: 10, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', marginBottom: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(232,238,252,0.65)' }}>{name}</div>
                <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.75)', marginTop: 2 }}>
                  {task.type === 'airport_pickup' ? (
                    <>{r.driverName && <span>{r.driverName}</span>}{task.payload?.flight_number && <span> · {task.payload.flight_number}</span>}</>
                  ) : (
                    <>{r.graftCount && <span style={{ fontWeight: 600, color: 'rgba(232,238,252,0.9)' }}>{r.graftCount.toLocaleString()} Grafts</span>}{r.price && <span> · €{r.price.toLocaleString()}</span>}{tech && <span> · {tech.label}</span>}</>
                  )}
                </div>
                {(task.assignedTo?.name || task.completedByName || task.result?.doctorName) && <div style={{ fontSize: 10, color: 'rgba(167,177,195,0.7)', marginTop: 2 }}>{"👨‍⚕️"} Bewertet von {task.assignedTo?.name || task.completedByName || task.result?.doctorName}</div>}
                {task.completedAt && <div style={{ fontSize: 9, color: 'rgba(167,177,195,0.6)', marginTop: 2 }}>{new Date(task.completedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.12)', flexShrink: 0 }}>✓</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fmSpin{to{transform:rotate(360deg)}}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
      `}</style>
    </div>
  );
}
