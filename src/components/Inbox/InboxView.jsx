import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";
import { CONV_STATUS, MSG_TEMPLATES } from "../../data/constants";
import { getAvatarGradient, getInitials } from "../shared/index";
import { getNow, isDemoMode } from "../../utils/demoTime";
import { translateValue, fmLocale } from "../../utils/helpers";

/* ── Helper: 24h WhatsApp window state with remaining time ── */
function getWindowState(lastPatientMsg) {
  if (!lastPatientMsg) return { state: "no_interaction", label: "—", color: "rgba(167,177,195,0.6)", icon: "—", remaining: null };
  const now = Date.now();
  const elapsed = now - new Date(lastPatientMsg).getTime();
  const hours = elapsed / 3600000;
  const remainingMs = Math.max(0, 24 * 3600000 - elapsed);
  const remainingH = Math.floor(remainingMs / 3600000);
  const remainingM = Math.floor((remainingMs % 3600000) / 60000);
  const remaining = remainingMs > 0 ? `${remainingH}h ${String(remainingM).padStart(2,"0")}m` : null;
  if (hours < 20) return { state: "active", label: "✓", color: "#10b981", icon: "✓", remaining };
  if (hours < 24) return { state: "expiring", label: "⏳", color: "#fbbf24", icon: "⏳", remaining };
  return { state: "expired", label: "⚠", color: "#ef4444", icon: "⚠", remaining: null };
}

/* ── Demo mode: fixed timer values per chat position ── */
function getDemoWindowState(chatIndex) {
  const offsets = [
    { h: 4, state: "active", label: "✓", color: "#10b981", icon: "✓", remaining: "20h 00m" },
    { h: 8, state: "active", label: "✓", color: "#10b981", icon: "✓", remaining: "16h 00m" },
    { h: 14, state: "active", label: "✓", color: "#10b981", icon: "✓", remaining: "10h 00m" },
    { h: 21, state: "expiring", label: "⏳", color: "#fbbf24", icon: "⏳", remaining: "3h 00m" },
    { h: 30, state: "expired", label: "⚠", color: "#ef4444", icon: "⚠", remaining: null },
    { h: 48, state: "expired", label: "⚠", color: "#ef4444", icon: "⚠", remaining: null },
  ];
  const o = offsets[chatIndex % offsets.length] || offsets[0];
  return { state: o.state, label: o.label, color: o.color, icon: o.icon, remaining: o.remaining };
}

/* ── Hook: live-updating window state ── */
function useWindowState(lastPatientMsg, demoIndex) {
  const [ws, setWs] = useState(() => isDemoMode() && demoIndex >= 0 ? getDemoWindowState(demoIndex) : getWindowState(lastPatientMsg));
  useEffect(() => {
    if (isDemoMode() && demoIndex >= 0) {
      setWs(getDemoWindowState(demoIndex));
      return; // No interval in demo mode — fixed values
    }
    setWs(getWindowState(lastPatientMsg));
    const id = setInterval(() => setWs(getWindowState(lastPatientMsg)), 30000);
    return () => clearInterval(id);
  }, [lastPatientMsg, demoIndex]);
  return ws;
}

/* ── Helper: Derive assigned-to info from lead data ── */
function getAssignedInfo(lead) {
  if (!lead) return { label: "AI", color: "#4cc9ff", icon: "🤖" };
  if (lead.reviewAssignedTo) return { label: lead.reviewAssignedTo, color: "#ff8a2a", icon: "⚕️" };
  if (lead.controlMode === "human") return { label: "Staff", color: "#a78bfa", icon: "👤" };
  return { label: "AI", color: "#4cc9ff", icon: "🤖" };
}

/* ── Right Panel: Fallübersicht (Case Overview) ── */
function CaseOverviewPanel({ chat, lead, t, onClose, clinic }) {
  if (!lead) return (
    <div style={{width:320,minWidth:320,maxWidth:320,borderLeft:"1px solid #2a2a3a",background:"#131c2e",padding:16,overflowY:"auto",overflowX:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontWeight:800,fontSize:15,color:"#4cc9ff"}}>{t("case_overview") || "Fallübersicht"}</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:16}}>✕</button>
      </div>
      <div style={{color:"#64748b",fontSize:13}}>{t("no_patient_data") || "Keine Patientendaten verfügbar."}</div>
    </div>
  );

  // Dynamic value translation for patient data displayed in CRM language
  const lang = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
  const TV = translateValue;

  const photos = lead.photoUrls || [];
  const reviewData = lead.reviewData || {};
  const stage = lead.stage || "new";
  const stageLabels = { new: t("stage_new") || "Neuer Lead", contacted: t("stage_contacted") || "Kontaktiert", booked: t("stage_booked") || "Gebucht", done: t("stage_done") || "Erledigt" };
  const stageColors = { new: "#4cc9ff", contacted: "#fbbf24", booked: "#a78bfa", done: "#10b981" };
  const intake = lead.intake || lead.extractedFields || {};
  const cs = lead.convStatus;

  // Consent status — 3 states: granted (green), pending (yellow), refused (red)
  const consentRefused = lead.metadata?.gdpr_consent === 'refused' || lead.consent?.refused;
  const consentStatus = lead.consentGiven ? (t("consent_granted") || "Erteilt") : consentRefused ? (t("consent_refused") || "Verweigert") : (t("consent_pending") || "Ausstehend");
  const consentColor = lead.consentGiven ? "#10b981" : consentRefused ? "#ef4444" : "#fbbf24";

  // Assessment status
  const assessmentStatus = cs === "needs_medical_review" ? (t("assessment_pending") || "Pending") : reviewData.grafts ? (t("assessment_complete") || "Complete") : (t("assessment_not_started") || "Not started");
  const assessmentColor = cs === "needs_medical_review" ? "#fbbf24" : reviewData.grafts ? "#10b981" : "var(--text-faint)";

  // Booking info
  const treatmentLabel = lead.treatment || lead.treatmentType || "—";
  const graftsLabel = reviewData.grafts ? `${treatmentLabel} ${reviewData.grafts} Grafts` : treatmentLabel;

  return (
    <div style={{width:320,minWidth:320,maxWidth:320,borderLeft:"1px solid #2a2a3a",background:"#131c2e",display:"flex",flexDirection:"column",overflowY:"auto",overflowX:"hidden"}}>
      {/* Header */}
      <div style={{padding:"16px 18px",borderBottom:"1px solid #2a2a3a",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <span style={{fontWeight:800,fontSize:15,color:"#4cc9ff"}}>{t("case_overview") || "Fallübersicht"}</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:16,fontFamily:"inherit"}}>✕</button>
      </div>
      <div style={{padding:"14px 16px",flex:1,overflowY:"auto",overflowX:"hidden",maxWidth:320,boxSizing:"border-box"}}>
        {/* Patient avatar + name */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"12px 14px",borderRadius:12,background:"#1e293b",border:"1px solid #2a2a3a"}}>
          {lead.metadata?.avatar ? (
            <img src={lead.metadata.avatar} alt={lead.name} style={{width:40,height:40,borderRadius:10,objectFit:"cover",flexShrink:0}} />
          ) : (
            <div style={{width:40,height:40,borderRadius:10,background:getAvatarGradient(lead.name),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,0.3)",fontSize:14,flexShrink:0}}>
              {getInitials(lead.name)}
            </div>
          )}
          <div style={{overflow:"hidden",minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.name}</div>
            <div style={{fontSize:11,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.phone || lead.from || chat?.from || "—"}</div>
          </div>
        </div>

        {/* Photo thumbnails — unified blue style */}
        {photos.length > 0 && (
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            {photos.slice(0, 6).map((p, i) => {
              const photoUrl = typeof p === 'string' ? p : p?.url;
              const authUrl = photoUrl ? fmApi.authPhotoUrl(photoUrl) : null;
              const isReal = !!authUrl && (authUrl.startsWith('https://') || authUrl.startsWith('http://'));
              const labels = [t("photo_front")||"Front",t("photo_top")||"Top",t("photo_left")||"Left",t("photo_right")||"Right",t("photo_back")||"Back",t("photo_extra")||"Extra"];
              return (
              <div key={i} style={{width:48,height:48,borderRadius:8,overflow:"hidden",background:isReal?"rgba(0,0,0,0.2)":"rgba(76,201,255,0.06)",border:isReal?"1px solid rgba(255,255,255,0.1)":"1px solid rgba(76,201,255,0.12)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:1}} onClick={() => {
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;cursor:pointer;';
                overlay.onclick = () => overlay.remove();
                if(isReal){const img = document.createElement('img');img.src = authUrl;img.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.5);';overlay.appendChild(img);}
                const counter = document.createElement('div');
                counter.style.cssText = 'color:rgba(255,255,255,0.5);font-size:13px;';
                counter.textContent = (isReal?'':'📷 ')+labels[i] + ' — Foto ' + (i+1) + ' / ' + Math.min(photos.length, 6);
                overlay.appendChild(counter);
                document.body.appendChild(overlay);
              }}>
                {isReal ? <img src={authUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} /> : <><span style={{fontSize:14}}>📷</span><span style={{fontSize:7,color:"rgba(76,201,255,0.5)",fontWeight:600}}>{labels[i]}</span></>}
              </div>);
            })}
          </div>
        )}

        {/* Last contact */}
        {lead.lastContactAt && (
          <div style={{fontSize:11,color:"rgba(167,177,195,0.75)",marginBottom:12}}>
            {t("last_contact") || "Last contact"}: {new Date(lead.lastContactAt).toLocaleDateString(fmLocale())}
          </div>
        )}

        {/* PATIENT section */}
        <SectionHeader label={t("section_patient") || "PATIENT"} />
        <FieldRow label="Name" value={lead.name || "—"} bold />
        <FieldRow label={t("lbl_age") || "Age"} value={intake.age || lead.age || "—"} />
        <FieldRow label={t("lbl_country") || "Country"} value={<span>{TV(lead.country) || "—"}{lead.country && clinic?.country && lead.country.toLowerCase() === clinic.country.toLowerCase() && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>{t("local_patient") || "LOKAL"}</span>}</span>} />
        <FieldRow label={t("lbl_language") || "Language"} value={(lead.language || "—").toUpperCase()} />

        <SectionHeader label={t("section_medical") || "MEDICAL"} />
        <FieldRow label={t("lbl_concern") || "Concern"} value={TV(intake.concern || lead.treatment) || "—"} />
        <FieldRow label={t("lbl_grafts") || "Grafts"} value={reviewData.grafts || intake.grafts || "—"} />
        <FieldRow label={t("lbl_hair_loss") || "Hair Loss"} value={TV(intake.hair_loss_type || intake.norwood) || "—"} />
        {(intake.previous_treatments || intake.vorh_behandlung) && <FieldRow label={t("prev_treatment") || "Vorh. Behandlung"} value={TV(intake.previous_treatments || intake.vorh_behandlung)} />}
        {(intake.medications || intake.medikamente) && <FieldRow label={t("lbl_medications") || "Medications"} value={TV(intake.medications || intake.medikamente)} />}
        {(intake.allergies || intake.allergien) && (
          <FieldRow label={t("lbl_allergies") || "Allergies"} value={TV(intake.allergies || intake.allergien)} valueColor={(intake.allergies || intake.allergien || "").toLowerCase().match(/^(no|none|nein|keine|-|—|yok|hayır)$/) ? undefined : "#ef4444"} />
        )}
        {(intake.medical_conditions || intake.medical_history) && (
          <FieldRow label={t("lbl_med_history") || "Med. History"} value={TV(intake.medical_conditions || intake.medical_history)} valueColor={(intake.medical_conditions || intake.medical_history || "").toLowerCase().match(/^(no|none|nein|keine|-|—|yok|hayır)$/) ? undefined : "#f59e0b"} />
        )}

        <SectionHeader label={t("section_assessment") || "ASSESSMENT"} />
        <FieldRow label={t("lbl_status") || "Status"} value={assessmentStatus} valueColor={assessmentColor} />
        {reviewData.treatment && <FieldRow label={t("recommendation") || "Empfehlung"} value={reviewData.treatment} />}
        {reviewData.doctor && <FieldRow label={t("reviewed_by") || "Bewertet von"} value={reviewData.doctor} />}

        {/* TERMIN section */}
        {(lead.appointmentDoctor || lead.appointmentDate) && <>
          <SectionHeader label={t("appointment_section") || "TERMIN"} />
          {lead.appointmentDoctor && <FieldRow label={t("doctor") || "Arzt"} value={lead.appointmentDoctor} bold />}
          {lead.appointmentDate && <FieldRow label={t("date") || "Datum"} value={new Date(lead.appointmentDate).toLocaleDateString(fmLocale())} />}
        </>}

        {/* EINWILLIGUNG section */}
        <SectionHeader label={t("section_consent") || "CONSENT"} />
        <FieldRow label={t("lbl_status") || "Status"} value={consentStatus} valueColor={consentColor} />

        <SectionHeader label={t("section_booking") || "BOOKING"} />
        <FieldRow label={t("treatment") || "Treatment"} value={graftsLabel} />
        <FieldRow label={t("lbl_costs") || "Costs"} value={reviewData.price || lead.budget || "—"} />

        {/* STATUS section — tab-style stages */}
        <SectionHeader label="STATUS" />
        <div style={{padding:"10px 0"}}>
          <div style={{display:"flex",gap:0,alignItems:"stretch"}}>
            {Object.entries(stageLabels).map(([key, label]) => {
              const isActive = key === stage;
              const color = stageColors[key];
              return (
                <div key={key} style={{flex:1,textAlign:"center",padding:"6px 2px 8px",borderBottom:isActive ? `3px solid ${color}` : "3px solid transparent",transition:"all .2s"}}>
                  <div style={{fontSize:10,fontWeight:isActive ? 700 : 500,color:isActive ? color : "var(--text-faint)",whiteSpace:"nowrap"}}>{label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{marginTop:18,display:"flex",flexDirection:"column",gap:6}}>
          {chat?.leadId && (
            <button onClick={() => {}} id="overview-open-patient" style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"transparent",border:"1px solid #4cc9ff",color:"#4cc9ff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              {t("open_patient_profile") || "Patientenprofil öffnen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Small helpers for the right panel ── */
function SectionHeader({ label }) {
  return (
    <div style={{padding:"8px 0 4px",marginTop:6,fontSize:10,fontWeight:800,color:"#4cc9ff",letterSpacing:"0.8px"}}>
      {label}
    </div>
  );
}

function FieldRow({ label, value, bold, valueColor }) {
  const valColor = valueColor || (bold ? "#e2e8f0" : (value === "—" || value === "--") ? "#475569" : "#94a3b8");
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid rgba(30,41,59,0.5)"}}>
      <span style={{fontSize:11,fontWeight:500,color:"#64748b",flexShrink:0}}>{label}</span>
      <span style={{fontSize:12,fontWeight:bold ? 700 : 500,color:valColor,textAlign:"right",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",wordBreak:"break-all"}}>{value}</span>
    </div>
  );
}

/* ── Badge helper for conversation list items ── */
function ConvBadge({ icon, label, color, variant }) {
  const bg = variant === "solid" ? `${color}20` : `${color}15`;
  return (
    <span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:bg,color,display:"inline-flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}>
      {icon && <span style={{fontSize:9}}>{icon}</span>}{label}
    </span>
  );
}

export default function InboxView() {
  const {
    clinic, activeClinicId, myMsgs, msgs, leads, selChat, setSelChat,
    inboxFilter, setInboxFilter, newMsg, setNewMsg, msgPage, setMsgPage,
    templateModal, setTemplateModal, templateFilter, setTemplateFilter,
    chatEnd, getCS, getLeadScore, getSLA, getLeadById, openPatient,
    setConvStatus, addTL, markResolved, sendMessage, sendTemplateMsg,
    resolveTemplate, simulatePaymentReceived, showT, t, setMsgs,
    demoMode,
  } = useApp();

  const msgPageSize = 30;
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [translations, setTranslations] = useState({});
  const [transLang, setTransLang] = useState(() => { try { return localStorage.getItem("fm_trans_lang") || "en"; } catch { return "en"; } });
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showOverview, setShowOverview] = useState(true);
  const [reactivationPicker, setReactivationPicker] = useState(false);

  /* ── 24h WhatsApp window timer ── */
  const lastPatientMsgTime = useMemo(() => {
    if (!selChat) return null;
    // Primary: use last_user_message_at from conversation (most reliable, set by backend)
    if (selChat.lastUserMessageAt || selChat.last_user_message_at) {
      return selChat.lastUserMessageAt || selChat.last_user_message_at;
    }
    // Fallback: scan loaded messages
    const allMsgs = (msgs[activeClinicId] || []).find(c => c.id === selChat.id)?.msgs || selChat.msgs || [];
    const lastPat = [...allMsgs].filter(m => m.sender === "patient").pop();
    if (lastPat?.createdAt) return lastPat.createdAt;
    return selChat.lastContactAt || selChat.lastMessageAt || null;
  }, [selChat, msgs, activeClinicId]);
  const demoTimerIndex = useMemo(() => {
    if (!isDemoMode() || !selChat) return -1;
    const chatList = msgs[activeClinicId] || [];
    const idx = chatList.findIndex(c => c.id === selChat.id);
    return idx >= 0 ? idx : 0;
  }, [selChat, msgs, activeClinicId]);
  const windowState = useWindowState(lastPatientMsgTime, demoTimerIndex);

  /* ── Current lead for overview panel ── */
  const overviewLead = useMemo(() => {
    if (!selChat) return null;
    const lid = selChat.leadId || selChat.patientId;
    const base = lid ? leads.find(l => l.id === lid) : null;
    if (!base) return null;
    // Merge fresh extractedFields from selChat (polled every 5s) so Fallübersicht stays in sync
    const ef = selChat.extractedFields || {};
    return {
      ...base,
      name: ef.name || selChat.name || base.name,
      extractedFields: { ...(base.extractedFields || {}), ...ef },
      intake: { ...(base.intake || {}), ...ef },
    };
  }, [selChat, leads]);

  /* ── Load + auto-refresh messages from API ── */
  const loadMessages = useCallback(() => {
    if (!selChat?.id || !activeClinicId) return;
    if (selChat.is_demo) return;
    fmApi.getMessages(selChat.id).then(data => {
      const apiMsgs = (data?.messages || []).map(m => ({
        text: m.text || m.content || '',
        time: new Date(m.createdAt).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }),
        sender: m.sender === 'patient' ? 'patient' : m.sender === 'note' ? 'system' : 'bot',
        msgType: m.media ? 'media' : m.type === 'note' ? 'note' : m.messageType === 'image' ? 'media' : undefined,
        media: m.media || null,
        _id: m.id,
      }));
      setMsgs(prev => {
        const cm = [...(prev[activeClinicId] || [])];
        const idx = cm.findIndex(c => c.id === selChat.id);
        if (idx > -1) { cm[idx] = { ...cm[idx], msgs: apiMsgs, _msgsLoaded: true }; }
        return { ...prev, [activeClinicId]: cm };
      });
    }).catch(e => { console.error('Failed to load messages:', e); showT(t("messages_load_error") || "Messages could not be loaded"); });
  }, [selChat?.id, activeClinicId]);

  useEffect(() => {
    if (!selChat?.id || selChat.is_demo) return;
    setLoadingMsgs(true);
    loadMessages();
    setLoadingMsgs(false);
    const iv = setInterval(loadMessages, 15000);
    return () => clearInterval(iv);
  }, [selChat?.id, loadMessages]);

  // Auto-translate when chat selected or messages update
  const chatMsgs = msgs[activeClinicId]?.find(c => c.id === selChat?.id)?.msgs || selChat?.msgs || [];
  useEffect(() => {
    if (!autoTranslate || !selChat?.id || !chatMsgs.length) return;
    const toTr = chatMsgs.filter(m => m.sender === "patient" || m.sender === "bot").map((m, i) => ({ id: m.text?.substring(0, 80) || String(i), text: m.text }));
    if (!toTr.length) return;
    (async () => {
      try {
        const batchSize = 30;
        for (let b = 0; b < toTr.length; b += batchSize) {
          const batch = toTr.slice(b, b + batchSize);
          const res = await fmApi.translateBatch(batch, transLang);
          if (res && res.translations) setTranslations(prev => ({ ...prev, ...res.translations }));
        }
      } catch (e) { console.error(e); showT(t("translation_failed") || "Translation failed"); }
    })();
  }, [selChat?.id, chatMsgs.length, autoTranslate, transLang]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatEnd?.current) {
      setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [selChat?.id, chatMsgs.length]);

  /* ── Get photo count for a conversation ── */
  const getPhotoCount = (ch) => {
    const lead = ch.leadId ? leads.find(l => l.id === ch.leadId) : null;
    return lead?.photoUrls?.length || 0;
  };

  return (
    <div style={{display:"flex",height:"100%",overflow:"hidden"}}>
      {/* ═══════════════════════════════════════════════════════════
          LEFT PANEL - Conversation List
         ═══════════════════════════════════════════════════════════ */}
      <div style={{width:320,minWidth:320,borderRight:"1px solid var(--border-default)",display:"flex",flexDirection:"column",background:"var(--bg-sidebar)"}}>
        {/* Filter tabs: Offen | Aktion | KI | Erledigt | Alle */}
        <div style={{display:"flex",borderBottom:"1px solid var(--border-subtle)",flexShrink:0}}>
          {[
            { id: "open", l: t('open') || "Offen" },
            { id: "needs_action", l: t('action_filter') || "⚡ Aktion" },
            { id: "ai_handling", l: t('ai_filter') || "KI" },
            { id: "resolved", l: t('done_filter') || "✓ Erledigt" },
            { id: "all", l: t('all') || "Alle" },
          ].map(f => (
            <button key={f.id} onClick={() => setInboxFilter(f.id)} style={{
              flex: 1,
              padding: "11px 0",
              background: inboxFilter === f.id ? "rgba(76,201,255,0.06)" : "transparent",
              border: "none",
              borderBottom: inboxFilter === f.id ? "2px solid #4cc9ff" : "2px solid transparent",
              color: inboxFilter === f.id ? "#4cc9ff" : "var(--text-faint)",
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all .15s",
            }}>{f.l}</button>
          ))}
        </div>

        {/* Conversation list */}
        <div style={{flex:1,overflowY:"auto"}}>
          {myMsgs.map(ch => {
            const cs = CONV_STATUS[getCS(ch)];
            const csKey = getCS(ch);
            const lead = (ch.leadId ? leads.find(l => l.id === ch.leadId) : null) || (ch.patientId ? leads.find(l => l.id === ch.patientId) : null);
            const score = lead ? getLeadScore(lead) : null;
            const sla = lead ? getSLA(lead) : null;
            const photoCount = lead?.photoUrls?.length || 0;
            const lastMsg = (ch.msgs || [])[(ch.msgs || []).length - 1];
            const isHumanTakeover = csKey === "human_takeover";
            const isDepositPaid = csKey === "deposit_paid";
            const isMedReview = csKey === "needs_medical_review";
            const isAiActive = csKey === "ai_active" || csKey === "collecting_photos" || csKey === "new";

            // Avatar initials + unified color
            const initials = ch.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

            return (
              <div
                key={ch.id}
                data-patient-id={ch.leadId || ch.patientId || ch.id}
                onClick={() => { setSelChat(ch); if (ch.unread) { setMsgs(prev => { const cl = activeClinicId || Object.keys(prev)[0]; if (!cl) return prev; return { ...prev, [cl]: (prev[cl]||[]).map(c => c.id === ch.id ? { ...c, unread: false } : c) }; }); const pid = ch.leadId || ch.patientId; if (pid) fmApi.updatePatient(pid, { metadata: { last_read_at: new Date().toISOString() } }).catch(() => {}); } }}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border-subtle)",
                  background: selChat?.id === ch.id ? "rgba(76,201,255,0.08)" : ch.unread ? "rgba(76,201,255,0.04)" : "transparent",
                  borderLeft: sla?.overdue ? "3px solid #ef4444" : "3px solid transparent",
                  opacity: ch.unread || selChat?.id === ch.id ? 1 : 0.7,
                }}
                onMouseEnter={e => { if (selChat?.id !== ch.id) e.currentTarget.style.background = "var(--bg-card)"; }}
                onMouseLeave={e => { if (selChat?.id !== ch.id) e.currentTarget.style.background = ch.unread ? "rgba(76,201,255,0.04)" : "transparent"; }}
              >
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  {/* Avatar */}
                  {(lead?.metadata?.avatar || ch.avatar) ? (
                    <img src={lead?.metadata?.avatar || ch.avatar} alt={ch.name} style={{width:36,height:36,borderRadius:10,objectFit:"cover",flexShrink:0,marginTop:2}} />
                  ) : (
                    <div style={{width:36,height:36,borderRadius:10,background:getAvatarGradient(ch.name),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,0.3)",flexShrink:0,marginTop:2}}>
                      {initials}
                    </div>
                  )}
                  <div style={{flex:1,minWidth:0}}>
                    {/* Name + time */}
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontWeight: ch.unread ? 800 : 700, fontSize:14, color: ch.unread ? "#fff" : "rgba(232,238,252,0.95)"}}>
                        {!!ch.unread && <span style={{display:"inline-block",width:7,height:7,borderRadius:99,background:"#4cc9ff",marginRight:6,verticalAlign:"middle"}} />}
                        {ch.name}
                        {score && <span style={{marginLeft:6,fontSize:10,fontWeight:700,color:score.color}} title={`Lead Score: ${score.score}%`}>{score.icon}</span>}
                      </span>
                      <span style={{fontSize:10,color:"var(--text-faint)"}}>{(() => {
                        const ts = ch.lastMessageAt || lastMsg?.timestamp || lastMsg?.time;
                        if (!ts) return "";
                        const d = new Date(ts);
                        if (isNaN(d.getTime())) return lastMsg?.time || "";
                        const mins = Math.floor((Date.now() - d.getTime()) / 60000);
                        if (mins < 1) return "jetzt";
                        if (mins < 60) return mins + "m";
                        if (mins < 1440) return Math.floor(mins / 60) + "h";
                        return Math.floor(mins / 1440) + "d";
                      })()}</span>
                    </div>
                    {/* Last message preview */}
                    <div style={{fontSize:12,color:"var(--text-muted)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:6}}>
                      {lastMsg?.text?.substring(0, 40) || ch.lastMessage?.substring(0, 40) || ch.snippet?.substring(0, 40) || "—"}
                    </div>
                    {/* Status badges — cancelled: only show Storniert, nothing else */}
                    <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
                      {lead?.stage==="cancelled" ? (
                        <ConvBadge label={t("badge_cancelled") || "Storniert"} color="#ef4444" />
                      ) : (<>
                        {isMedReview && <ConvBadge label={t("badge_review") || "Bewertung"} color="#f59e0b" />}
                        {isAiActive && <ConvBadge label={t("ai_active_badge") || "AI Active"} color="#4cc9ff" />}
                        {isHumanTakeover && <ConvBadge label={t("human_takeover_badge") || "Menschliche Übernahme"} color="#ef4444" />}
                        {isDepositPaid && <ConvBadge label={t("deposit_paid_badge") || "Anzahlung bezahlt"} color="#10b981" />}
                        {sla?.overdue && <ConvBadge label={`${sla.hrs}h ${t("overdue_sla") || "überfällig"}`} color="#ef4444" />}
                        {photoCount > 0 && <ConvBadge label={`${photoCount} Fotos`} color="#a78bfa" />}
                        {lead?.flightConfirmed?.date && !lead?.logistics?.driverName && <ConvBadge label={t("driver_missing")||"Fahrer fehlt"} color="#ec4899" />}
                        {lead?.flightConfirmed?.date && !(lead?.hotelInfo?.name||lead?.hotel?.name) && <ConvBadge label={t("hotel_missing")||"Hotel fehlt"} color="#a78bfa" />}
                        {lead?.stage==="booked" && !lead?.flightConfirmed?.date && !(lead?.metadata?.noFlightNeeded) && <ConvBadge label={t("flight_missing_badge")||"Flug fehlt"} color="#ef4444" />}
                        {!isMedReview && !isAiActive && !isHumanTakeover && !isDepositPaid && cs && (
                          <ConvBadge icon={cs.icon} label={cs.label} color={cs.color} />
                        )}
                      </>)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {myMsgs.length === 0 && (
            <div style={{padding:40,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:12}}>💬</div>
              <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>{t('no_conversations') || "Keine Konversationen"}</div>
              <div style={{fontSize:12,color:"rgba(167,177,195,0.7)",marginBottom:8}}>{t("hint_inbox_empty")}</div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CENTER PANEL - Chat
         ═══════════════════════════════════════════════════════════ */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>
        {!selChat ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-faint)"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:13}}>{t("select_conv") || "Wähle eine Konversation"}</div>
            </div>
          </div>
        ) : (() => {
          const chatCS = getCS(selChat);
          const chatCSObj = CONV_STATUS[chatCS];
          const isAiLocked = chatCS === "ai_active" || chatCS === "collecting_photos";
          const isReviewWait = chatCS === "needs_medical_review";
          const isClosed = chatCS === "resolved" || chatCS === "closed";
          const isHumanMode = chatCS === "human_takeover";
          const leadId = selChat.leadId || selChat.patientId;

          return (
            <>
              {/* Status banners */}
              {isAiLocked && (
                <div style={{padding:"10px 22px",background:"rgba(76,201,255,0.06)",borderBottom:"1px solid rgba(76,201,255,0.15)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:14}}>🤖</span>
                    <span style={{fontSize:13,fontWeight:700,color:"#4cc9ff"}}>{chatCS === "collecting_photos" ? (t('ai_collecting_photos') || "AI sammelt Fotos") : (t("ai_handling_conv") || "KI bearbeitet dieses Gespräch")}</span>
                  </div>
                  <button onClick={() => { if (leadId) { setConvStatus(leadId, "human_takeover"); addTL(leadId, "handover", "Manual takeover from chat"); showT(t("human_takeover")); } }} style={{padding:"5px 14px",borderRadius:8,background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:"0.5px"}}>
                    {t("stop_ai_btn") || "KI STOPPEN & ÜBERNEHMEN"}
                  </button>
                </div>
              )}
              {isReviewWait && (
                <div style={{padding:"10px 22px",background:"rgba(255,138,42,0.06)",borderBottom:"1px solid rgba(255,138,42,0.15)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:14}}>⚕️</span>
                    <span style={{fontSize:13,fontWeight:700,color:"#ff8a2a"}}>{t('waiting_review') || "Wartet auf Bewertung"}</span>
                    <span style={{fontSize:12,color:"var(--text-muted)"}}>— {t('ai_paused_review') || "KI pausiert"}</span>
                  </div>
                  <button onClick={() => { if (leadId) openPatient(leadId, {openReview: true}); }} style={{padding:"5px 14px",borderRadius:8,background:"rgba(255,138,42,0.1)",border:"1px solid rgba(255,138,42,0.25)",color:"#ff8a2a",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    ⚕️ {t('open_review') || "Bewertung öffnen"}
                  </button>
                </div>
              )}
              {isHumanMode && (
                <div style={{padding:"10px 22px",background:"rgba(239,68,68,0.06)",borderBottom:"1px solid rgba(239,68,68,0.15)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:14}}>👤</span>
                    <span style={{fontSize:13,fontWeight:700,color:"#ef4444"}}>{t('you_in_control') || "Du hast die Kontrolle"}</span>
                    <span style={{fontSize:12,color:"var(--text-muted)"}}>— {t('ai_paused') || "KI pausiert"}</span>
                  </div>
                  <button onClick={() => { if (leadId) { setConvStatus(leadId, "ai_active"); addTL(leadId, "system", "AI resumed from chat"); showT(t("ai_resumed")); } }} style={{padding:"5px 14px",borderRadius:8,background:"rgba(76,201,255,0.1)",border:"1px solid rgba(76,201,255,0.25)",color:"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    🤖 {t('resume_ai') || "KI fortsetzen"}
                  </button>
                </div>
              )}
              {chatCS === "booking_pending" && (
                <div style={{padding:"10px 22px",background:"rgba(76,201,255,0.06)",borderBottom:"1px solid rgba(76,201,255,0.15)",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <span style={{fontSize:14}}>📅</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#4cc9ff"}}>{t('plan_sent_awaiting') || "Plan gesendet — wartet"}</span>
                </div>
              )}
              {chatCS === "deposit_paid" && (
                <div style={{padding:"10px 22px",background:"rgba(16,185,129,0.06)",borderBottom:"1px solid rgba(16,185,129,0.15)",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <span style={{fontSize:14}}>💰</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#10b981"}}>{t('deposit_confirmed') || "Anzahlung bestätigt"}</span>
                </div>
              )}
              {chatCS === "waiting_for_clinic_reply" && (
                <div style={{padding:"10px 22px",background:"rgba(251,191,36,0.06)",borderBottom:"1px solid rgba(251,191,36,0.15)",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <span style={{fontSize:14}}>⏳</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>{t('patient_waiting') || "Patient wartet"}</span>
                </div>
              )}
              {isClosed && (
                <div style={{padding:"10px 22px",background:"rgba(107,114,128,0.08)",borderBottom:"1px solid rgba(107,114,128,0.15)",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <span>✓</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#6b7280"}}>{t("resolved") || "Erledigt"}</span>
                </div>
              )}
              {chatCS === "awaiting_reactivation" && (
                <div style={{padding:"10px 22px",background:"rgba(245,158,11,0.06)",borderBottom:"1px solid rgba(245,158,11,0.15)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:14}}>📨</span>
                    <div>
                      <span style={{fontSize:13,fontWeight:700,color:"#f59e0b"}}>{t("reactivation_sent") || "Reaktivierungs-Template gesendet"}</span>
                      <div style={{fontSize:11,color:"rgba(245,158,11,0.6)",marginTop:2}}>{t("waiting_patient_reply") || "Warte auf Antwort des Patienten…"}</div>
                    </div>
                  </div>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#f59e0b",animation:"fmPulse 2s infinite"}}/>
                </div>
              )}

              {/* 24h WhatsApp session window */}
              {selChat && windowState.state !== "no_interaction" && (
                <div style={{padding:"6px 22px",borderBottom:`1px solid ${windowState.color}20`,background:`${windowState.color}06`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:windowState.color,boxShadow:windowState.state==="expiring"?`0 0 6px ${windowState.color}`:undefined,animation:windowState.state==="expiring"?"fmPulse 2s infinite":undefined}}/>
                    <span style={{fontSize:11,fontWeight:600,color:windowState.color}}>{windowState.icon} {windowState.remaining || ""}</span>
                  </div>
                  {windowState.remaining ? (
                    <span style={{fontSize:11,fontWeight:700,color:windowState.color,fontVariantNumeric:"tabular-nums"}}>
                      {windowState.remaining}
                    </span>
                  ) : windowState.state === "expired" ? (
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:10,color:"rgba(239,68,68,0.6)",maxWidth:200}}>{t("expired_hint") || "Freie Antworten nicht möglich — nur Templates"}</span>
                      <button onClick={() => setReactivationPicker(true)} style={{padding:"3px 12px",borderRadius:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                        📋 {t("request_template") || "Template senden"}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
              <style>{`@keyframes fmPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
              {/* Chat header */}
              <div style={{padding:"12px 22px",borderBottom:"1px solid var(--border-default)",display:"flex",gap:12,alignItems:"center",flexShrink:0}}>
                {/* Avatar */}
                <div style={{width:36,height:36,borderRadius:10,background:getAvatarGradient(selChat.name),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,0.3)",fontSize:13,flexShrink:0}}>
                  {getInitials(selChat.name)}
                </div>
                {/* Name */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:16}}>{selChat.name}</div>
                </div>
                {/* Full action button row */}
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {/* Language selector */}
                  <select value={transLang} onChange={e => {
                    const nl = e.target.value;
                    setTransLang(nl);
                    localStorage.setItem("fm_trans_lang", nl);
                    setTranslations({});
                    if (leadId) {
                      fmApi.updatePatient(leadId, { locale: nl }).catch(err => console.warn("lang update failed:", err));
                      showT((t("bot_language") || "Bot language") + " → " + nl.toUpperCase());
                    }
                  }} style={{padding:"4px 8px",borderRadius:6,background:"rgba(76,201,255,0.12)",border:"1px solid rgba(76,201,255,0.25)",color:"#4cc9ff",fontSize:11,fontWeight:700,fontFamily:"inherit",outline:"none",cursor:"pointer"}}>
                    <option value="de">DE</option><option value="en">EN</option><option value="tr">TR</option>
                  </select>
                  {/* "am" tag */}
                  <span style={{padding:"4px 10px",borderRadius:6,background:"rgba(76,201,255,0.12)",border:"1px solid rgba(76,201,255,0.25)",color:"#4cc9ff",fontSize:11,fontWeight:700}}>am</span>
                  {/* Patient button */}
                  <button onClick={() => { if (leadId) openPatient(leadId); }} style={{padding:"6px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border-strong)",color:"var(--text-muted)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    {t("patient") || "Patient"}
                  </button>
                  {/* Erledigt button */}
                  {!isClosed && (
                    <button onClick={() => markResolved(selChat.id)} style={{padding:"6px 14px",borderRadius:8,background:"transparent",border:"1px solid rgba(107,114,128,0.3)",color:"#6b7280",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      {t("resolve") || "Erledigt"}
                    </button>
                  )}
                  {/* KI fortsetzen button (visible in human mode) */}
                  {isHumanMode && (
                    <button onClick={() => { if (leadId) { setConvStatus(leadId, "ai_active"); addTL(leadId, "system", "AI resumed from header"); showT(t("ai_resumed")); } }} style={{padding:"6px 14px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      🤖 {t("ai_resume") || "Resume AI"}
                    </button>
                  )}
                  {/* Übernehmen button */}
                  {!isClosed && !isHumanMode && (
                    <button onClick={() => { if (leadId) { setConvStatus(leadId, "human_takeover"); addTL(leadId, "handover", "Manual takeover"); showT(t("human_takeover")); } }} style={{padding:"6px 14px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      {t("take_over") || "Übernehmen"}
                    </button>
                  )}
                  {/* Overview panel toggle — always visible */}
                  <button onClick={() => setShowOverview(s => !s)} style={{
                    padding: "6px 14px", borderRadius: 8,
                    background: showOverview ? "rgba(76,201,255,0.12)" : "rgba(76,201,255,0.06)",
                    border: showOverview ? "1px solid rgba(76,201,255,0.25)" : "1px solid rgba(76,201,255,0.15)",
                    color: "#4cc9ff",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 6,
                  }} title={showOverview ? (t("case_overview_hide") || "Fallübersicht ausblenden") : (t("case_overview_toggle") || "Fallübersicht einblenden")}>
                    📋 {!showOverview && (t("case_overview") || "Fallübersicht")}
                  </button>
                </div>
              </div>

              {/* Chat messages area */}
              <div style={{flex:1,overflowY:"auto",padding:"20px 22px",display:"flex",flexDirection:"column",gap:10}}>
                {(() => {
                  const allMsgs = (msgs[activeClinicId] || []).find(c => c.id === selChat.id)?.msgs || selChat.msgs || [];
                  const pageKey = selChat.id;
                  const visibleCount = msgPage[pageKey] || msgPageSize;
                  const startIdx = Math.max(0, allMsgs.length - visibleCount);
                  const visible = allMsgs.slice(startIdx);

                  return (
                    <>
                      {startIdx > 0 && (
                        <button onClick={() => setMsgPage(p => ({ ...p, [pageKey]: (p[pageKey] || msgPageSize) + msgPageSize }))} style={{alignSelf:"center",padding:"6px 16px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
                          ↑ {(t("load_older_messages") || "Ältere laden ({n})").replace("{n}", Math.min(startIdx, msgPageSize))}
                        </button>
                      )}
                      {visible.map((msg, i) => (
                        <div key={i} style={{display:"flex",justifyContent:msg.sender === "patient" ? "flex-start" : msg.sender === "system" ? "center" : "flex-end"}}>
                          {/* Payment card message */}
                          {msg.msgType === "payment_card" ? (() => {
                            try {
                              const card = JSON.parse(msg.text);
                              const isPaid = card.status === "paid";
                              return (
                                <div style={{maxWidth:"75%",padding:0,borderRadius:16,background:isPaid ? "rgba(16,185,129,0.06)" : "rgba(76,201,255,0.06)",border:`1.5px solid ${isPaid ? "rgba(16,185,129,0.25)" : "rgba(76,201,255,0.2)"}`,overflow:"hidden"}}>
                                  <div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
                                    <div style={{width:44,height:30,borderRadius:6,background:isPaid ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#00B4D8,#4cc9ff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"var(--text-primary)",fontWeight:800,boxShadow:isPaid ? "0 2px 8px rgba(16,185,129,0.3)" : "0 2px 8px rgba(0,180,216,0.3)"}}>💳</div>
                                    <div style={{flex:1}}>
                                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                        <span style={{fontWeight:800,fontSize:18,color:isPaid ? "#10b981" : "#4cc9ff"}}>€{card.amount}</span>
                                        <span style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,background:isPaid ? "rgba(16,185,129,0.15)" : "rgba(251,191,36,0.12)",color:isPaid ? "#10b981" : "#fbbf24",letterSpacing:"0.5px"}}>{isPaid ? `✅ ${t("paid") || "Bezahlt"}` : `⏳ ${t("pending") || "Ausstehend"}`}</span>
                                      </div>
                                      <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{t("stripe_payment_link") || "Zahlungslink"} · {card.currency || "EUR"} · <span style={{fontFamily:"monospace",fontSize:10,opacity:0.6}}>ID: {card.id?.substring(0, 12) || "—"}</span></div>
                                    </div>
                                  </div>
                                  {!isPaid && selChat?.leadId && (
                                    <div style={{padding:"8px 18px 12px",borderTop:"1px solid var(--border-subtle)"}}>
                                      <button onClick={() => simulatePaymentReceived(leadId)} style={{width:"100%",padding:"6px 12px",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ {t("simulate_payment") || "Zahlung simulieren"}</button>
                                    </div>
                                  )}
                                  {isPaid && (
                                    <div style={{padding:"6px 18px 10px",borderTop:"1px solid rgba(16,185,129,0.1)",fontSize:11,color:"#10b981",fontWeight:600}}>✓ {t("paid") || "Bezahlt"} {card.paidAt ? new Date(card.paidAt).toLocaleTimeString("de", { hour: "2-digit", minute: "2-digit" }) : ""}</div>
                                  )}
                                </div>
                              );
                            } catch { return <div style={{fontSize:12,color:"var(--text-faint)"}}>{t("payment_card_error") || "Zahlungskarten-Fehler"}</div>; }
                          })()
                          /* Media message with URL */
                          : msg.msgType === "media" && msg.media?.url ? (
                            <div style={{maxWidth:"70%",borderRadius:14,overflow:"hidden",background:msg.sender === "patient" ? "rgba(255,255,255,0.06)" : "rgba(76,201,255,0.06)",border:`1px solid ${msg.sender === "patient" ? "var(--border-strong)" : "rgba(76,201,255,0.1)"}`,borderBottomLeftRadius:msg.sender === "patient" ? 4 : 14,borderBottomRightRadius:msg.sender !== "patient" ? 4 : 14}}>
                              <img src={fmApi.authPhotoUrl(msg.media.url)} alt="Foto" style={{width:"100%",maxWidth:300,display:"block",borderRadius:"12px 12px 0 0",cursor:"pointer"}} onClick={() => window.open(fmApi.authPhotoUrl(msg.media.url), '_blank')} />
                              <div style={{padding:"6px 12px",fontSize:11,color:"var(--text-faint)",textAlign:msg.sender === "patient" ? "left" : "right"}}>{msg.time} 📷</div>
                            </div>
                          )
                          /* Media message without URL */
                          : msg.msgType === "media" ? (
                            <div style={{maxWidth:"70%",padding:"12px 16px",borderRadius:14,background:msg.sender === "patient" ? "rgba(255,255,255,0.06)" : "rgba(76,201,255,0.06)",border:`1px solid ${msg.sender === "patient" ? "var(--border-strong)" : "rgba(76,201,255,0.1)"}`,borderBottomLeftRadius:msg.sender === "patient" ? 4 : 14,borderBottomRightRadius:msg.sender !== "patient" ? 4 : 14}}>
                              <div style={{fontSize:13,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:6}}>📷 <span>{t("photo_sent") || "Foto gesendet"}</span></div>
                              <div style={{fontSize:11,color:"var(--text-faint)",marginTop:4,textAlign:msg.sender === "patient" ? "left" : "right"}}>{msg.time}</div>
                            </div>
                          )
                          /* System message */
                          : msg.sender === "system" ? (
                            <div style={{padding:"6px 14px",borderRadius:8,background:"rgba(255,138,42,0.1)",border:"1px solid rgba(255,138,42,0.2)",fontSize:12,color:"#ff8a2a",fontWeight:600}}>
                              {msg.text}
                            </div>
                          )
                          /* Regular chat bubble — WhatsApp style */
                          : (
                            <div style={{maxWidth:"70%",display:"flex",gap:6,alignItems:msg.sender === "patient" ? "flex-start" : "flex-end",flexDirection:msg.sender === "patient" ? "row" : "row-reverse"}}>
                              {/* Bot icon for bot messages */}
                              {msg.sender === "bot" && (
                                <div style={{width:24,height:24,borderRadius:8,background:"rgba(76,201,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,marginTop:4}}>🤖</div>
                              )}
                              <div style={{
                                padding: "10px 14px",
                                borderRadius: 14,
                                background: msg.sender === "patient"
                                  ? "rgba(255,255,255,0.06)"
                                  : msg.sender === "staff"
                                    ? "rgba(255,138,42,0.10)"
                                    : "rgba(76,201,255,0.06)",
                                border: `1px solid ${
                                  msg.sender === "patient"
                                    ? "var(--border-strong)"
                                    : msg.sender === "staff"
                                      ? "rgba(255,138,42,0.25)"
                                      : "rgba(76,201,255,0.1)"
                                }`,
                                borderBottomLeftRadius: msg.sender === "patient" ? 4 : 14,
                                borderBottomRightRadius: msg.sender !== "patient" ? 4 : 14,
                              }}>
                                {/* Staff message with translation: show original first, then translated */}
                                {msg.sender === "staff" && msg._originalText ? (
                                  <>
                                    <div style={{fontSize:14,lineHeight:1.5,color:"rgba(232,238,252,0.95)"}}>{msg._originalText}</div>
                                    <div style={{fontSize:12,lineHeight:1.5,color:"rgba(232,238,252,0.60)",marginTop:6,paddingTop:6,borderTop:"1px solid rgba(255,138,42,0.15)",fontStyle:"italic"}}>{msg.text}</div>
                                  </>
                                ) : (
                                  <div style={{fontSize:14,lineHeight:1.5}}>{msg.text}</div>
                                )}
                                <div style={{fontSize:11,color:"var(--text-faint)",marginTop:4,textAlign:msg.sender === "patient" ? "left" : "right"}}>
                                  {msg.time}
                                  {msg.sender === "bot" && " 🤖"}
                                  {msg.sender === "staff" && " 👤"}
                                </div>
                                {autoTranslate && translations[msg.text?.substring(0, 80)] && (
                                  <div style={{fontSize:12,color:"var(--info)",marginTop:4,fontStyle:"italic",borderTop:"1px solid var(--info-subtle)",paddingTop:4}}>
                                    🟢 {translations[msg.text?.substring(0, 80)]}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  );
                })()}
                {/* AI thinking animation */}
                {selChat && getCS(selChat) === "ai_active" && (
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <div style={{padding:"12px 18px",borderRadius:14,borderBottomRightRadius:4,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.12)",display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:11,color:"#4cc9ff",fontWeight:600,marginRight:4}}>🧠 {t("ai_analyzing") || "KI analysiert"}</span>
                      <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
                    </div>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>

              {/* Chat input bar */}
              {(() => {
                if (isClosed) return (
                  <div style={{padding:"14px 22px",borderTop:"1px solid var(--border-default)",textAlign:"center",color:"var(--text-faint)",fontSize:13}}>
                    {t("conversation_closed") || "Konversation geschlossen"} {chatCS}. <span onClick={() => { if (leadId) { setConvStatus(leadId, "ai_active"); showT(t("reopened")); } }} style={{color:"#4cc9ff",cursor:"pointer",fontWeight:700}}>{t("reopen") || "Wieder öffnen"}</span>
                  </div>
                );
                if (isAiLocked) return (
                  <div style={{padding:"14px 22px",borderTop:"1px solid var(--border-default)",flexShrink:0}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderRadius:14,background:"rgba(76,201,255,0.06)",border:"1px solid rgba(76,201,255,0.15)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div className="ai-dot" style={{width:8,height:8}} />
                        <span style={{fontSize:13,color:"#4cc9ff",fontWeight:600}}>🤖 {t("ai_handling_conv") || "KI bearbeitet dieses Gespräch"}</span>
                      </div>
                      <button onClick={() => { if (leadId) { setConvStatus(leadId, "human_takeover"); addTL(leadId, "handover", "Manual takeover from chat input"); showT(t("human_takeover")); } }} style={{padding:"6px 16px",borderRadius:8,background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:"0.5px"}}>
                        {t("stop_ai_btn") || "KI STOPPEN & ÜBERNEHMEN"}
                      </button>
                    </div>
                  </div>
                );
                if (isReviewWait) return (
                  <div style={{padding:"14px 22px",borderTop:"1px solid var(--border-default)",flexShrink:0}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderRadius:14,background:"rgba(255,138,42,0.04)",border:"1px solid rgba(255,138,42,0.12)"}}>
                      <span style={{fontSize:13,color:"rgba(255,138,42,0.7)",fontWeight:600}}>⚕️ {t("ai_paused_review_chat") || "KI wartet auf medizinische Bewertung"}</span>
                      <button onClick={() => { if (leadId) openPatient(leadId, {openReview: true}); }} style={{padding:"6px 16px",borderRadius:8,background:"rgba(255,138,42,0.1)",border:"1px solid rgba(255,138,42,0.25)",color:"#ff8a2a",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        {t('open_review') || "Bewertung öffnen"}
                      </button>
                    </div>
                  </div>
                );
                // Normal input: text + Senden + KI fortsetzen
                return (
                  <div style={{padding:"14px 22px",borderTop:"1px solid var(--border-default)",flexShrink:0}}>
                    {/* Template picker */}
                    {templateModal && selChat?.leadId && (
                      <div style={{marginBottom:10,borderRadius:14,background:"var(--bg-card)",border:"1px solid rgba(76,201,255,0.12)",maxHeight:240,overflowY:"auto"}}>
                        <div style={{padding:"8px 14px",borderBottom:"1px solid var(--border-subtle)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:11,fontWeight:700,color:"#4cc9ff"}}>📋 {t("templates") || "Vorlagen"}</span>
                          <div style={{display:"flex",gap:4}}>
                            {["all", "billing", "intake", "booking", "followup", "logistics"].map(cat => (
                              <button key={cat} onClick={() => setTemplateFilter(cat)} style={{padding:"2px 8px",borderRadius:5,fontSize:9,fontWeight:700,background:templateFilter === cat ? "rgba(76,201,255,0.12)" : "transparent",border:`1px solid ${templateFilter === cat ? "rgba(76,201,255,0.2)" : "transparent"}`,color:templateFilter === cat ? "#4cc9ff" : "var(--text-faint)",cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{cat}</button>
                            ))}
                          </div>
                        </div>
                        {MSG_TEMPLATES.filter(t => templateFilter === "all" || t.category === templateFilter).map(tpl => {
                          const lead = getLeadById(leadId);
                          const preview = resolveTemplate(tpl, lead);
                          return (
                            <div key={tpl.id} onClick={() => { sendTemplateMsg(leadId, tpl); setTemplateModal(false); }} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid var(--border-subtle)",display:"flex",gap:10,alignItems:"center"}} onMouseEnter={e => e.currentTarget.style.background = "var(--info-subtle)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              <div style={{flex:1}}>
                                <div style={{fontSize:12,fontWeight:700}}>{tpl.name} <span style={{fontSize:9,color:"var(--text-faint)",textTransform:"uppercase"}}>{tpl.lang}</span></div>
                                <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:350}}>{preview}</div>
                              </div>
                              <span style={{fontSize:10,color:"#4cc9ff",fontWeight:700}}>{t("send_arrow") || "→"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {windowState.state === "expired" ? (
                    <div style={{display:"flex",alignItems:"center",gap:10,width:"100%"}}>
                      <div style={{flex:1,padding:"12px 16px",borderRadius:12,background:"rgba(239,68,68,0.04)",border:"1px solid rgba(239,68,68,0.12)",display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:12,color:"rgba(239,68,68,0.7)"}}>{t("wa_expired_input") || "24h expired — free messages not possible"}</span>
                      </div>
                      <button onClick={() => setReactivationPicker(true)} style={{padding:"12px 20px",borderRadius:12,background:"linear-gradient(135deg,#4cc9ff,#2b7cff)",border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13,whiteSpace:"nowrap"}}>
                        {t("wa_template_send") || "Send Template"}
                      </button>
                    </div>
                    ) : (
                    <div style={{display:"flex",gap:10}}>
                      <button onClick={() => setTemplateModal(!templateModal)} style={{padding:"12px",borderRadius:12,background:templateModal ? "var(--info-subtle)" : "var(--bg-input)",border:`1px solid ${templateModal ? "var(--info-muted)" : "var(--border-strong)"}`,color:templateModal ? "var(--info)" : "var(--text-muted)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}} title="Vorlagen">📋</button>
                      <input
                        id="chatMsg"
                        name="chatMsg"
                        value={newMsg}
                        onChange={e => setNewMsg(e.target.value)}
                        placeholder={t("type_message") || "Nachricht schreiben..."}
                        style={{flex:1,padding:"12px 16px",borderRadius:12,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:14,outline:"none"}}
                        onKeyDown={e => { if (e.key === "Enter" && newMsg.trim()) sendMessage(selChat.id); }}
                      />
                      {selChat?.lang ? <button onClick={async () => {
                        if (!newMsg.trim()) return;
                        const btn = document.getElementById("fm-translate-btn");
                        if (btn) { btn.textContent = "..."; btn.disabled = true; }
                        try {
                          const res = await fmApi.translateBatch([{id:"out",text:newMsg.trim()}], selChat.lang);
                          const translated = res?.translations?.out;
                          if (translated) {
                            // Store original for display, put translation in input
                            window.__fmTranslateOriginal = newMsg.trim();
                            setNewMsg(translated);
                            showT("✓ " + (selChat.lang||"").toUpperCase());
                          }
                        } catch(e) { console.warn(e); showT(t("translation_failed") || "Translation failed"); }
                        if (btn) { btn.textContent = "🌐 → " + (selChat?.lang||"").toUpperCase(); btn.disabled = false; }
                      }} id="fm-translate-btn" style={{padding:"12px",borderRadius:12,background:"var(--bg-input)",border:"1px solid var(--border-strong)",color:"var(--text-muted)",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:4,flexShrink:0}} title={(t("translate_to") || "Translate") + " → " + (selChat.lang||"").toUpperCase()}>🌐 → {(selChat.lang||"").toUpperCase()}</button> : null}
                      <button onClick={() => sendMessage(selChat.id)} style={{padding:"12px 20px",borderRadius:12,background:"linear-gradient(135deg,#ff8a2a,#ff6b00)",border:"none",color:"var(--text-primary)",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        {t("send") || "Senden"}
                      </button>
                      {isHumanMode && (
                        <button onClick={() => { if (leadId) { setConvStatus(leadId, "ai_active"); addTL(leadId, "system", "AI resumed from chat"); showT(t("ai_resumed")); } }} style={{padding:"12px 16px",borderRadius:12,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13,whiteSpace:"nowrap"}}>
                          🤖 {t("ai_resume") || "Resume AI"}
                        </button>
                      )}
                    </div>
                    )}
                  </div>
                );
              })()}
            </>
          );
        })()}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT PANEL - Fallübersicht (Case Overview)
         ═══════════════════════════════════════════════════════════ */}
      {selChat && showOverview && <CaseOverviewPanel chat={selChat} lead={overviewLead} t={t} clinic={clinic} onClose={() => setShowOverview(false)} />}

      {/* ══ Reactivation Template Modal ══ */}
      {reactivationPicker && selChat && (() => {
        const patLang = (selChat.lang || overviewLead?.language || "en").substring(0,2).toLowerCase();
        const langMap = { english: "en", german: "de", turkish: "tr", deutsch: "de", "türkisch": "tr", englisch: "en" };
        const lang = langMap[patLang] || (patLang.length === 2 ? patLang : "en");
        const langLabel = { en: "English", de: "Deutsch", tr: "Türkçe" }[lang] || lang.toUpperCase();
        const tpls = MSG_TEMPLATES.filter(t => t.isReactivation && t.lang === lang);
        const autoTpl = (tpls.length > 0 ? tpls : MSG_TEMPLATES.filter(t => t.isReactivation && t.lang === "en"))[0];
        const lid = selChat.leadId || selChat.patientId;
        const lead = lid ? getLeadById(lid) : null;
        const preview = autoTpl ? resolveTemplate(autoTpl, lead) : "";
        return (
          <div onClick={() => setReactivationPicker(false)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
            <div onClick={e => e.stopPropagation()} style={{width:440,maxWidth:"90vw",borderRadius:16,background:"#1a1f2e",border:"1px solid rgba(76,201,255,0.15)",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",overflow:"hidden"}}>
              {/* Header */}
              <div style={{padding:"18px 22px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Reaktivierung senden</div>
                  <button onClick={() => setReactivationPicker(false)} style={{width:28,height:28,borderRadius:8,background:"rgba(255,255,255,0.06)",border:"none",color:"rgba(167,177,195,0.6)",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>
                <div style={{fontSize:12,color:"rgba(167,177,195,0.7)",marginTop:4}}>
                  An <b style={{color:"#e2e8f0"}}>{selChat.name}</b> — Sprache: <span style={{color:"#4cc9ff",fontWeight:600}}>{langLabel}</span> <span style={{color:"rgba(167,177,195,0.75)"}}>(automatisch erkannt)</span>
                </div>
              </div>
              {/* Preview */}
              <div style={{padding:"18px 22px"}}>
                <div style={{fontSize:11,fontWeight:600,color:"rgba(167,177,195,0.6)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Vorschau</div>
                <div style={{padding:"14px 16px",borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",fontSize:13,color:"rgba(232,238,252,0.95)",lineHeight:1.6}}>
                  {preview}
                </div>
              </div>
              {/* Action */}
              <div style={{padding:"0 22px 18px",display:"flex",gap:10,alignItems:"center"}}>
                <button onClick={() => {
                  if (autoTpl) {
                    sendTemplateMsg(lid, autoTpl);
                    if (lid) { setConvStatus(lid, "awaiting_reactivation"); addTL(lid, "bot", "Reactivation template sent (" + lang + ")"); }
                  }
                  setReactivationPicker(false);
                  showT("📨 " + (t("reactivation_sent") || "Reactivation sent") + " (" + langLabel + ")");
                }} style={{flex:1,padding:"12px",borderRadius:10,background:"linear-gradient(135deg,#4cc9ff,#2b7cff)",border:"none",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                  {t("send") || "Senden"}
                </button>
              </div>
              {/* Footer */}
              <div style={{padding:"12px 22px",borderTop:"1px solid rgba(255,255,255,0.04)",fontSize:11,color:"rgba(167,177,195,0.7)",display:"flex",justifyContent:"space-between"}}>
                <span>Wird als WhatsApp-Vorlage gesendet. Patient antwortet → Session reaktiviert → KI übernimmt.</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
