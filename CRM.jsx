import React, { useRef, useEffect, useMemo, useCallback } from "react";
import * as fmApi from "./src/api/client";

/* ═══ ZUSTAND STORES ═══ */
import { useUiStore } from "./src/stores/uiStore";
/* useAuthStore accessed via useAuth hook */
import { useClinicStore } from "./src/stores/clinicStore";
import { usePatientStore } from "./src/stores/patientStore";
import { useInboxStore } from "./src/stores/inboxStore";
import { useAppointmentStore } from "./src/stores/appointmentStore";
import { useBillingStore } from "./src/stores/billingStore";

/* ═══ EXTRACTED MODULES ═══ */
import { genId, getMonthDays, fmtDate, isToday } from "./src/utils/helpers";
import { T } from "./src/data/i18n";
import { AUTH_BG, STAGES, APPT_C, DAYS, PLAN_LIMITS, hasModuleAccess } from "./src/data/constants";

/* ═══ CONTEXT + EXTRACTED VIEWS ═══ */
import { AppContext } from "./src/context/AppContext";
import DoctorTasksView from "./src/components/DoctorTasks/DoctorTasksView.jsx";

/* ═══ EXTRACTED HOOKS ═══ */
import { useAuth } from "./src/hooks/useAuth";
import { useBusinessLogic } from "./src/hooks/useBusinessLogic";
import { useCrmHandlers } from "./src/hooks/useCrmHandlers";
import { useCrmData } from "./src/hooks/useCrmData";

/* ═══ EXTRACTED COMPONENTS ═══ */
import LoginScreen from "./src/components/LoginScreen";
import MainLayout from "./src/components/MainLayout";
import RouterSync from "./src/router/RouterSync";

/* ═══ DEMO DATA ═══ */
import { enrichDemoData as _enrichDemoData, cleanDemoData as _cleanDemoData } from "./src/data/demoEnrichment";

const IS_CLIENT_MODE = window.location.hostname === "crm.flowmatix.io" || window.location.hostname === "localhost";

/* Analog Clock for Client CRM (cyan theme) */
function CrmClock({size=32}){
  const ref=React.useRef(null);
  React.useEffect(()=>{
    const cv=ref.current;if(!cv)return;const ctx=cv.getContext("2d");const r=size/2;
    const draw=()=>{
      ctx.clearRect(0,0,size,size);const now=new Date();
      const h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds();
      ctx.save();ctx.translate(r,r);
      ctx.beginPath();ctx.arc(0,0,r-1.5,0,Math.PI*2);
      ctx.strokeStyle="rgba(76,201,255,0.25)";ctx.lineWidth=1.5;ctx.stroke();
      for(let i=0;i<12;i++){const a=(i*Math.PI)/6-Math.PI/2;const main=i%3===0;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*(r-(main?7:5)),Math.sin(a)*(r-(main?7:5)));
        ctx.lineTo(Math.cos(a)*(r-2.5),Math.sin(a)*(r-2.5));
        ctx.strokeStyle=main?"rgba(76,201,255,0.7)":"rgba(76,201,255,0.25)";ctx.lineWidth=main?1.5:0.5;ctx.stroke();}
      const hA=((h+m/60)*Math.PI)/6-Math.PI/2;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(hA)*(r*0.42),Math.sin(hA)*(r*0.42));
      ctx.strokeStyle="#4cc9ff";ctx.lineWidth=2;ctx.lineCap="round";ctx.stroke();
      const mA=((m+s/60)*Math.PI)/30-Math.PI/2;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(mA)*(r*0.62),Math.sin(mA)*(r*0.62));
      ctx.strokeStyle="rgba(76,201,255,0.7)";ctx.lineWidth=1.2;ctx.lineCap="round";ctx.stroke();
      const sA=(s*Math.PI)/30-Math.PI/2;
      ctx.beginPath();ctx.moveTo(Math.cos(sA+Math.PI)*(r*0.1),Math.sin(sA+Math.PI)*(r*0.1));
      ctx.lineTo(Math.cos(sA)*(r*0.68),Math.sin(sA)*(r*0.68));
      ctx.strokeStyle="rgba(76,201,255,0.3)";ctx.lineWidth=0.5;ctx.lineCap="round";ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.fillStyle="#4cc9ff";ctx.fill();
      ctx.beginPath();ctx.arc(0,0,0.8,0,Math.PI*2);ctx.fillStyle="#0f1623";ctx.fill();
      ctx.restore();
    };
    draw();const iv=setInterval(draw,1000);return()=>clearInterval(iv);
  },[size]);
  return <canvas ref={ref} width={size} height={size} style={{width:size,height:size}}/>;
}

/* ======== MAIN ======== */
export default function App() {
  /* ═══ ZUSTAND STORE STATE ═══ */
  const {
    view, setView, sidebar, setSidebar, lang, setLang,
    toast, searchQuery, setSearchQuery, searchOpen, setSearchOpen,
    notifOpen, setNotifOpen, calView, setCalView, calDate, setCalDate,
    tourActive, setTourActive, tourStep, setTourStep, tourCompleted, setTourCompleted,
    templateModal, setTemplateModal, templateFilter, setTemplateFilter,
    successModal, setSuccessModal, showPlanPicker, setShowPlanPicker,
    showRevenue, setShowRevenue, patientTab, setPatientTab, opSubTab, setOpSubTab,
    showToast,
  } = useUiStore();
  const setToast = (msg) => { if(msg) showToast(msg); else useUiStore.setState({toast:null}); };

  const {
    clinics, setClinics, adminClinic, setAdminClinic,
    settingsData, setSettingsData, aiConfigData, setAiConfigData,
  } = useClinicStore();

  const {
    leads, setLeads, selLead, setSelLead,
    dragItem, setDragItem,
    reviewGrafts, setReviewGrafts, reviewPrice, setReviewPrice, reviewNotes, setReviewNotes,
    newNote, setNewNote,
  } = usePatientStore();

  const {
    msgs, setMsgs, selChat, setSelChat,
    newMsg, setNewMsg, inboxFilter, setInboxFilter,
    msgPage, setMsgPage,
  } = useInboxStore();
  const msgPageSize = useInboxStore((s) => s.msgPageSize);

  const {
    appts, setAppts, selAppt, setSelAppt,
    rescheduleAppt, setRescheduleAppt, rescheduleDate, setRescheduleDate,
    rescheduleTime, setRescheduleTime, cancelConfirm, setCancelConfirm,
  } = useAppointmentStore();

  const {
    invoices, setInvoices, invoiceModal, setInvoiceModal,
    invAmount, setInvAmount, invItems, setInvItems, invVat, setInvVat, invDeposit, setInvDeposit,
    paymentModal, setPaymentModal, payAmount, setPayAmount, payCurrency, setPayCurrency,
    magicLinks, setMagicLinks, auditLog, setAuditLog,
  } = useBillingStore();

  /* ═══ REMAINING LOCAL STATE ═══ */
  const [newFaqQ, setNewFaqQ] = React.useState("");
  const [newFaqA, setNewFaqA] = React.useState("");
  const [supportMsg, setSupportMsg] = React.useState("");
  const [onboardingDismissed, setOnboardingDismissed] = React.useState(()=>localStorage.getItem("fm_ob_dismissed")==="true");
  const [dismissedUsageWarnings, setDismissedUsageWarnings] = React.useState(()=>{try{return JSON.parse(localStorage.getItem("fm_usage_dismissed")||"{}");}catch{return{};}});
  const [dismissedRevSuggestion, setDismissedRevSuggestion] = React.useState(()=>localStorage.getItem("fm_rev_dismissed")==="true");
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("Receptionist");
  const [demoMode, setDemoMode] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState(false);
  const [demoBlockedModal, setDemoBlockedModal] = React.useState(false);
  // ── Workspace state (demo/trial/live_test/activation_pending/checkout_pending/active) ──
  const [workspaceState, setWorkspaceState] = React.useState('demo');
  const [testInfo, setTestInfo] = React.useState(null);
  const [showActivation, setShowActivation] = React.useState(false);
  const [showBillingConfirm, setShowBillingConfirm] = React.useState(false);
  // Sync demo mode to window for API guard + demo time
  const DEMO_NOW_MS = new Date("2026-03-25T12:00:00").getTime();
  const _now = () => demoMode ? DEMO_NOW_MS : Date.now();
  React.useEffect(() => {
    window.__fmDemoMode = demoMode;
    window.__fmDemoNowMs = demoMode ? DEMO_NOW_MS : null;
    window.__fmWorkspaceActive = workspaceState === 'active';
    import("./src/utils/demoTime").then(m => m.setDemoMode(demoMode)).catch(() => {});
  }, [demoMode, workspaceState]);
  React.useEffect(() => {
    const handler = () => setDemoBlockedModal(true);
    window.addEventListener('fm:demo-blocked', handler);
    return () => window.removeEventListener('fm:demo-blocked', handler);
  }, []);
  const [pendingApps, setPendingApps] = React.useState(0);

  /* i18n helper */
  const t = (key) => (T[lang]||T.en)[key] || (T.en)[key] || key;

  const showT = useCallback(m=>{showToast(m);},[showToast]);

  /* ═══ AUTH HOOK ═══ */
  const enrichDemoDataRef = React.useRef(null);
  const enrichDemoData = useCallback(() => {
    const cid = enrichDemoDataRef.current?.();
    if (cid) _enrichDemoData(cid, setClinics);
  }, [setClinics]);
  const cleanDemoData = useCallback(() => {
    const cid = enrichDemoDataRef.current?.();
    if (cid) _cleanDemoData(cid, setClinics);
  }, [setClinics]);

  const authState = useAuth({ setView, setTourStep, setTourActive, showToast: showT, enrichDemoData });
  enrichDemoDataRef.current = () => authState.user?.orgId || authState.user?.clinicId;
  const { user, handleLogout, handleLogin, handleMagicLink, handleForgotPw, handleSetPassword, handlePasswordReset } = authState;

  const isAdmin=user?.apiRole==="platform_owner"||user?.apiRole==="admin"||(user?.role==="clinic_admin");
  const isOperator=user?.apiRole==="platform_owner";
  const activeClinicId=isAdmin&&!user?.orgId?adminClinic:(user?.orgId||user?.clinicId);
  const clinic=clinics.find(c=>c.id===activeClinicId);
  const clinicPlan=clinic?.plan||"core";
  const userRole=(()=>{
    if(isOperator||isAdmin)return"admin";
    const raw=(user?.apiRole||user?.role||"").toLowerCase();
    if(raw==="clinic_doctor"||raw==="doctor")return"doctor";
    if(raw==="clinic_finance"||raw==="finance")return"finance";
    if(raw==="clinic_coordinator"||raw==="coordinator")return"coordinator";
    if(raw==="clinic_staff"||raw==="staff")return"coordinator";
    return"coordinator";
  })();
  const canAccess=(mod)=>hasModuleAccess(userRole,mod,clinicPlan);

  // ── Load workspace state when user is authenticated ──
  React.useEffect(() => {
    if (!user?.orgId || !IS_CLIENT_MODE) return;
    fmApi.getWorkspaceState().then(res => {
      if (res?.workspaceState) {
        setWorkspaceState(res.workspaceState);
        if (res.workspaceState === 'activation_pending') setShowActivation(true);
        if (['active', 'live_test', 'activation_pending'].includes(res.workspaceState)) { setDemoMode(false); }
      }
    }).catch(() => {});
  }, [user?.orgId]);

  // ── Poll test info when in live_test mode ──
  React.useEffect(() => {
    if (workspaceState !== 'live_test' || !user?.orgId) return;
    const loadTest = () => fmApi.getTestInfo().then(res => {
      if (res) {
        setTestInfo(res);
        if (res.session?.messagesCount >= 20) { setWorkspaceState('activation_pending'); setShowActivation(true); }
      }
    }).catch(() => {});
    loadTest();
    const iv = setInterval(loadTest, 5000);
    return () => clearInterval(iv);
  }, [workspaceState, user?.orgId]);

  // Doctor: redirect to portal if on restricted view
  React.useEffect(()=>{if(userRole==="doctor"&&!canAccess(view)&&view!=="doctor_portal"&&view!=="support")setView("doctor_portal");},[userRole,view]);
  const getClinicById=id=>clinics.find(c=>c.id===id);
  const getLeadById=id=>leads.find(l=>l.id===id);
  const getStageById=id=>STAGES.find(s=>s.id===id);

  const myAppts=useMemo(()=>appts.filter(a=>!a.clinic||a.clinic===activeClinicId),[appts,activeClinicId]);
  const myLeads=useMemo(()=>{
    const now=_now();
    // Build set of IDs AND names of patients with future appointments
    const futureApptIds=new Set();
    const futureApptNames=new Set();
    myAppts.forEach(a=>{
      const d=a.date||a.scheduledAt;
      if(d&&new Date(d).getTime()>now){
        if(a.leadId)futureApptIds.add(a.leadId);
        if(a.patientId)futureApptIds.add(a.patientId);
        if(a.patient_id)futureApptIds.add(a.patient_id);
        if(a.lead_id)futureApptIds.add(a.lead_id);
        // Name fallback for cross-table matching
        const name=(a.patient||a.patientName||a.patient_name||"").trim().toLowerCase();
        if(name)futureApptNames.add(name);
      }
    });
    // Build confirmed future appointment name set (status confirmed/booked)
    const confirmedFutureNames=new Set();
    myAppts.forEach(a=>{
      const d=a.date||a.scheduledAt;
      const s=a.status||"";
      if(d&&new Date(d).getTime()>now&&(s==="confirmed"||s==="booked")){
        const name=(a.patient||a.patientName||a.patient_name||"").trim().toLowerCase();
        if(name)confirmedFutureNames.add(name);
      }
    });
    // Build appointment status maps (by ID + name fallback)
    const completedApptIds=new Set();const completedApptNames=new Set();
    const noshowApptIds=new Set();const noshowApptNames=new Set();
    const canceledApptIds=new Set();const canceledApptNames=new Set();
    myAppts.forEach(a=>{
      const pid=a.patientId||a.patient_id||a.lead_id;
      const name=(a.patient||a.patientName||a.patient_name||"").trim().toLowerCase();
      const s=(a.status||"").toLowerCase();
      if(s==="completed"||s==="done"){if(pid)completedApptIds.add(pid);if(name)completedApptNames.add(name);}
      if(s==="no_show"||s==="noshow"){if(pid)noshowApptIds.add(pid);if(name)noshowApptNames.add(name);}
      if(s==="canceled"||s==="cancelled"){if(pid)canceledApptIds.add(pid);if(name)canceledApptNames.add(name);}
    });

    return leads.filter(l=>!l.clinic||l.clinic===activeClinicId).map(l=>{
      const ln=(l.name||"").trim().toLowerCase();
      const hasById=futureApptIds.has(l.id);
      const hasByName=futureApptNames.has(ln);
      const hasConfirmedByName=confirmedFutureNames.has(ln);

      let stage=l.stage;

      // 1. Appointment completed/done → stage "done" (ID-first, name-fallback)
      if((completedApptIds.has(l.id)||completedApptNames.has(ln))&&stage!=="done"&&stage!=="cancelled"){stage="done";}

      // 2. No-show → back to "contacted"
      if((noshowApptIds.has(l.id)||noshowApptNames.has(ln))&&stage==="booked"&&!hasById&&!hasByName){stage="contacted";}

      // 3. Canceled appointment → archive (cancelled)
      if((canceledApptIds.has(l.id)||canceledApptNames.has(ln))&&stage==="booked"&&!hasById&&!hasByName){stage="cancelled";}

      // 4. Confirmed future appointment + not yet booked → move to booked
      if((stage==="contacted"||stage==="new")&&hasConfirmedByName){stage="booked";}

      // Build result
      const changed=stage!==l.stage;
      if(changed||hasById||hasByName){return{...l,stage,_hasFutureAppt:hasById||hasByName||false};}
      return l;
    });
  },[leads,activeClinicId,myAppts]);
  const allClinicMsgs=useMemo(()=>msgs[activeClinicId]||[],[msgs,activeClinicId]);
  const getCS = (chat) => {
    const lid = chat?.leadId || chat?.patientId || chat?.id;
    if (!lid) return "ai_active";
    if (chat?.convStatus) return chat.convStatus;
    if (chat?.status && chat.status !== "open") return chat.status;
    const lead = leads.find(l => l.id === lid);
    return lead?.convStatus || "ai_active";
  };
  const myMsgs=useMemo(()=>allClinicMsgs.filter(m=>{const cs=getCS(m);if(inboxFilter==="all")return true;if(inboxFilter==="resolved")return cs==="resolved"||cs==="closed";if(inboxFilter==="needs_action")return["needs_medical_review","waiting_for_clinic_reply","booking_pending","human_takeover"].includes(cs);if(inboxFilter==="ai_handling")return cs==="ai_active"||cs==="collecting_photos";return cs!=="resolved"&&cs!=="closed";}),[allClinicMsgs,inboxFilter,leads]);
  const unread=useMemo(()=>allClinicMsgs.filter(m=>m.unread).length,[allClinicMsgs]);
  const myNotifs=useMemo(()=>{
    const apiNotifs=clinic?.notifications||[];
    const leadNotifs=[];
    const _7d=7*86400000;const __n=_now();
    leads.forEach(l=>{
      if(l.stage==="new"&&l.createdAt&&(_now()-new Date(l.createdAt).getTime())<_7d)
        leadNotifs.push({id:"nl_new_"+l.id,type:"lead",text:"\uD83C\uDD95 "+t("new_inquiry_from","Neue Anfrage von")+" "+l.name,time:l.createdAt,read:false});
      if((l.photoUrls||[]).length>=3)
        leadNotifs.push({id:"nl_photo_"+l.id,type:"photo",text:"\uD83D\uDCF7 "+l.name+" "+t("uploaded_photos","hat Fotos hochgeladen"),time:l.lastAiInteraction||l.createdAt,read:true});
      if(l.convStatus==="deposit_paid")
        leadNotifs.push({id:"nl_dep_"+l.id,type:"payment",text:"\uD83D\uDCB0 "+t("deposit_from","Anzahlung von")+" "+l.name,time:l.lastAiInteraction||l.createdAt,read:true});
      if(l.flightConfirmed?.date)
        leadNotifs.push({id:"nl_fl_"+l.id,type:"flight",text:"\u2708\uFE0F "+t("flight_detected","Flugdaten erkannt")+": "+l.name+" "+l.flightConfirmed.flightNo,time:l.lastAiInteraction||l.createdAt,read:true});
      if(l.convStatus==="human_takeover")
        leadNotifs.push({id:"nl_ht_"+l.id,type:"alert",text:"\u26A0\uFE0F "+l.name+" "+t("needs_help","braucht Hilfe"),time:l.lastAiInteraction||l.createdAt,read:false});
    });
    return[...apiNotifs,...leadNotifs].sort((a,b)=>new Date(b.time||0)-new Date(a.time||0)).slice(0,50);
  },[clinic,leads]);
  const unreadNotifs=useMemo(()=>(clinic?.notifications||[]).filter(n=>!n.read).length,[clinic]);
  const myFiles=useMemo(()=>clinic?.files||[],[clinic]);
  const myAutomations=useMemo(()=>clinic?.automations||[],[clinic]);

  const totalActions = useMemo(()=>{
    let count = 0;
    const isLocal = l => !!(l.metadata?.noTransferNeeded || l.metadata?.noFlightNeeded);
    myLeads.forEach(l => {
      const lg = l.logistics || {};
      // 1. Chat takeover
      if (l.convStatus === "human_takeover") count++;
      // 2. Driver — ONLY after automation failed
      if (!isLocal(l) && (l.stage === "booked" || l.stage === "done") && !lg.driverName && (lg.status === "all_declined" || lg.status === "failed_auto_assignment" || (lg.retryCount || 0) >= 2)) count++;
      // 3. Hotel — delayed (>24h since booking OR <48h before appointment)
      if (!isLocal(l) && (l.stage === "booked" || l.stage === "done") && !(l.hotelInfo?.name || l.hotel?.name)) {
        const hba = l.bookedAt || l.metadata?.bookedAt || l.updatedAt;
        const had = l.appointmentDate || l.booking?.date;
        const hsb = hba ? (_now() - new Date(hba).getTime()) / 3600000 : 999;
        const hua = had ? (new Date(had).getTime() - _now()) / 3600000 : 999;
        if (hsb > 24 || hua < 48) count++;
      }
      // 4. DSGVO — immediate if photos without consent
      if (!l.consentGiven && ((l.photoUrls || []).length >= 3 || l.photos)) count++;
      // 5. Flight — only escalation (<48h + reminder sent)
      const apptDate = l.appointmentDate || l.booking?.date;
      const hoursToAppt = apptDate ? (new Date(apptDate).getTime() - _now()) / 3600000 : 999;
      if (!isLocal(l) && l.stage === "booked" && !l.flightConfirmed?.date && l.metadata?.flightReminderSent && hoursToAppt < 48) count++;
      // 6. Follow-up needed
      if (l.metadata?.followup_needed && !l.metadata?.followup_completed) count++;
      // 7. (DSGVO merged into #4 above)
    });
    return count;
  },[myLeads]);

  /* ═══ AUDIT LOG ═══ */
  const logAction=(action,target,details)=>{
    const entry={id:genId(),time:new Date().toISOString(),user:user?.name||"System",role:user?.role||"system",clinicId:activeClinicId,action,target,details};
    setAuditLog(prev=>[entry,...prev].slice(0,500));
  };

  /* ── Auto-sync patient card PDF to Google Drive (debounced) ── */
  const _syncTimers=useRef({});
  const syncPatientCard=(patientId)=>{
    if(!patientId)return;
    clearTimeout(_syncTimers.current[patientId]);
    _syncTimers.current[patientId]=setTimeout(()=>{
      fmApi.syncPatientCardToDrive(patientId).then(r=>{if(r?.success)console.log("[sync] Patient card synced to Drive:",patientId);}).catch(()=>{});
    },3000);
  };

  const moveLead=(lid,ns)=>{const l=leads.find(x=>x.id===lid);if(!l||l.stage===ns)return;const st=getStageById(ns);setLeads(p=>p.map(x=>x.id===lid?{...x,stage:ns,timeline:[...(x.timeline||[]),{time:"now",type:"action",text:`→ ${st.label}`}]}:x));showT(`${l.name} → ${st.label}`);if(ns==="booked"||ns==="done")setSuccessModal({lead:l,type:ns==="booked"?"booking":"completed",revenue:l.reviewData?.price||"",treatment:l.treatment});fmApi.updatePatient(lid,{stage:ns}).catch(err=>console.warn("updatePatient failed:",err));syncPatientCard(lid);};
  const addTL=(lid,tp,tx)=>{setLeads(p=>p.map(x=>x.id===lid?{...x,timeline:[...(x.timeline||[]),{time:"now",type:tp,text:tx}]}:x));};
  const setConvStatus=(lid,st)=>{
    const controlMap={ai_active:"ai",collecting_photos:"ai",human_takeover:"human",needs_medical_review:"paused",booking_pending:"human",waiting_for_clinic_reply:"human",deposit_paid:"ai",awaiting_reactivation:"paused",resolved:"closed",closed:"closed"};
    const controlMode=controlMap[st]||"ai";
    setLeads(p=>p.map(x=>x.id===lid?{...x,convStatus:st,controlMode,controlUpdatedAt:new Date().toISOString()}:x));
    const cid=activeClinicId;
    if(cid){useInboxStore.getState().setMsgs(prev=>{const cm=[...(prev[cid]||[])];const idx=cm.findIndex(c=>(c.leadId||c.patientId||c.id)===lid);if(idx>-1)cm[idx]={...cm[idx],convStatus:st};return{...prev,[cid]:cm};});}
    const sc=useInboxStore.getState().selChat;if(sc&&(sc.leadId||sc.patientId||sc.id)===lid){useInboxStore.getState().setSelChat({...sc,convStatus:st});}
    fmApi.updatePatient(lid,{conv_status:st,control_mode:controlMode}).catch(err=>console.warn("updatePatient convStatus failed:",err));
  };
  const handleDrop=st=>{if(dragItem){moveLead(dragItem,st);setDragItem(null);}};
  const updateAppt=(id,data)=>{setAppts(p=>p.map(a=>a.id===id?{...a,...data}:a));showT("Updated");fmApi.updateAppointment(id,data).catch(err=>console.warn("updateAppointment failed:",err));};
  const openPatient=(lid)=>{setSelLead(lid);const l=leads.find(x=>x.id===lid);if(l)logAction("patient_opened",l.name,`Viewed profile (${l.treatment})`);};
  const openPatientPhotos=(lid)=>{const l=leads.find(x=>x.id===lid);if(l)logAction("photos_viewed",l.name,`Viewed ${l.photoUrls?.length||0} photos`);};
  const browserNotify=(title,body)=>{if("Notification" in window && Notification.permission==="granted"){new Notification(title,{body,icon:"/Flowmatix-Logo.png"});}};
  const completeOnboarding=(clinicId,showToastMsg)=>{
    setClinics(cs=>cs.map(c=>c.id===clinicId?{...c,setupStatus:"live"}:c));
    if(showToastMsg)showT(showToastMsg);
    fmApi.updateClinicSettings({onboarding_completed:true,setup_status:"live"}).catch(e=>{console.error('[CRM] completeOnboarding failed:',e.message||e);});
  };
  const markNotifsRead=()=>{
    setClinics(cs=>cs.map(c=>c.id===activeClinicId?{...c,notifications:(c.notifications||[]).map(n=>({...n,read:true}))}:c));
    myNotifs.forEach(n=>readNotifIdsRef.current.add(n.id));
  };
  const toggleAutomation=async(autId)=>{
    const auto=(clinic?.automations||[]).find(a=>a.id===autId);
    if(auto?.locked)return showT(t("requires_plan")||"Requires upgrade");
    const newActive=!auto?.active;
    setClinics(cs=>cs.map(c=>c.id===activeClinicId?{...c,automations:(c.automations||[]).map(a=>a.id===autId?{...a,active:newActive}:a)}:c));
    try{const res=await fmApi.updateAutomation(autId,{active:newActive,type:auto?.type});showT(res?.n8n_synced?"Automation synced with n8n":"Automation updated");}catch(e){setClinics(cs=>cs.map(c=>c.id===activeClinicId?{...c,automations:(c.automations||[]).map(a=>a.id===autId?{...a,active:!newActive}:a)}:c));if(e?.status===403||e?.response?.status===403)showT(t("requires_plan")||"Plan upgrade required");else showT(t("auto_error_saving")||"Error saving");}
  };

  const toggleDemoMode = async () => {
    if(!IS_CLIENT_MODE) return;
    if(userRole!=="admin"){showToast(t("admin_only_mode_switch")||"Only admins can switch mode");return;}
    setDemoLoading(true);
    const isActive = workspaceState === 'active';

    if (demoMode) {
      // Demo → Live
      try {
        if (!isActive) {
          await fmApi.setWorkspaceState('live_test');
          setWorkspaceState('live_test');
        }
        await fmApi.setClinicMode('live');
        setDemoMode(false);
        cleanDemoData();
        setView('dashboard');
        await Promise.all([
          usePatientStore.getState().fetchPatients(),
          useAppointmentStore.getState().fetchAppointments(),
          (user?.orgId || user?.clinicId) ? useInboxStore.getState().fetchConversations(user.orgId || user.clinicId) : Promise.resolve(),
          useBillingStore.getState().fetchInvoices(),
        ]);
        showToast(t("live_enabled") || "Live mode enabled");
      } catch (err) { showToast(t("mode_switch_failed")||"Mode switch failed"); }
    } else {
      // Live → Demo
      try {
        if (!isActive) {
          await fmApi.setWorkspaceState('demo');
          setWorkspaceState('demo');
        }
        await fmApi.setClinicMode('demo');
        setDemoMode(true);
        await fmApi.resetDemoData();
        await Promise.all([
          usePatientStore.getState().fetchPatients(),
          useAppointmentStore.getState().fetchAppointments(),
          (user?.orgId || user?.clinicId) ? useInboxStore.getState().fetchConversations(user.orgId || user.clinicId) : Promise.resolve(),
          useBillingStore.getState().fetchInvoices(),
        ]);
        enrichDemoData();
        showToast(t("demo_enabled") || "Demo mode enabled");
        if (!isActive) setTimeout(() => { setTourStep(0); setTourActive(true); }, 800);
      } catch (err) { showToast(t("mode_switch_failed")||"Mode switch failed"); }
    }
    setDemoLoading(false);
  };

  /* ═══ BUSINESS LOGIC HOOK ═══ */
  const businessLogic = useBusinessLogic({
    leads, setLeads, invoices, setInvoices, msgs, setMsgs, appts, setAppts,
    clinic, activeClinicId, user, magicLinks, setMagicLinks,
    myAppts, calDate, logAction, addTL, showT, setConvStatus, setSuccessModal,
    reviewGrafts, setReviewGrafts, reviewPrice, setReviewPrice, reviewNotes, setReviewNotes,
    getLeadById, newNote, setNewNote,
  });

  /* ═══ CRM HANDLERS HOOK ═══ */
  const crmHandlers = useCrmHandlers({
    leads, setLeads, msgs, setMsgs, appts, setAppts,
    clinic, activeClinicId, user, selChat,
    newMsg, setNewMsg, rescheduleAppt, setRescheduleAppt,
    rescheduleDate, setRescheduleDate, rescheduleTime, setRescheduleTime,
    setClinics, logAction, addTL, setConvStatus, showT, browserNotify, t,
  });

  /* ═══ CRM DATA HOOK ═══ */
  const crmData = useCrmData({
    user, leads, setLeads, appts, msgs, invoices,
    clinic, activeClinicId, adminClinic, setAdminClinic,
    setClinics, myLeads, myAppts, allClinicMsgs, myAutomations,
    inboxFilter, getCS, showT, logAction, addTL, setConvStatus,
    openPatient, sendTemplateMsg: null, sendPaymentLink: businessLogic.sendPaymentLink, moveLead,
    demoMode, setDemoMode, enrichDemoData, setSuccessModal,
    setLang, setLoginLang: authState.setLoginLang,
  });

  /* Wire up sendTemplateMsg after crmData is available */
  const { resolveTemplate, sendTemplateMsg } = crmData;

  const chatEnd = useRef(null);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[selChat,newMsg]);

  /* Browser notifications permission */
  useEffect(()=>{if("Notification" in window && Notification.permission==="default"){Notification.requestPermission();}},[]);
  /* Kill any existing service worker to prevent stale cache */
  useEffect(()=>{if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister()));if(typeof caches!=="undefined")caches.keys().then(names=>names.forEach(n=>caches.delete(n)));}},[]);
  /* Cmd+K / Ctrl+K global search shortcut */
  useEffect(()=>{
    const handler=(e)=>{if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();const el=document.getElementById("searchQuery");if(el){el.focus();setSearchOpen(true);}}if(e.key==="Escape"){setSearchOpen(false);setSearchQuery("");document.getElementById("searchQuery")?.blur();}};
    const closeDropdowns=(e)=>{if(!e.target.closest("[data-notif-panel]")&&!e.target.closest("[data-notif-bell]"))setNotifOpen(false);if(!e.target.closest("[data-gear-menu]"))document.querySelectorAll("[data-gear-menu] > div:last-child").forEach(d=>{d.style.display="none";});};window.addEventListener("click",closeDropdowns);window.addEventListener("keydown",handler);return()=>{window.removeEventListener("keydown",handler);window.removeEventListener("click",closeDropdowns);};
  },[]);

  /* Fetch pending applications count for operator badge */
  useEffect(()=>{
    if(!isOperator||!user)return;
    let cancelled=false;
    const fetchPending=async()=>{try{const stats=await fmApi.getApplicationStats();if(!cancelled&&stats?.pending)setPendingApps(stats.pending);}catch{}};
    fetchPending();
    const iv=setInterval(fetchPending,60000);
    return()=>{cancelled=true;clearInterval(iv);};
  },[isOperator,user]);

  /* WebSocket: listen for task:completed */
  useEffect(() => {
    if (!user || !activeClinicId) return;
    const token = localStorage.getItem('fm_access_token');
    if (!token) return;
    const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = window.location.hostname.replace('app.', 'api.').replace('crm.', 'api.');
    let ws, pingIv, reconnectTo, wsFails = 0;
    const connect = () => {
      const freshToken = sessionStorage.getItem('fm_access_token') || token;
      ws = new WebSocket(`${wsProto}://${wsHost}/ws/v1/realtime?token=${freshToken}`);
      ws.onopen = () => {
        wsFails = 0;
        pingIv = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' })); }, 30000);
      };
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.type === 'conv:updated' && d.patientId) {
            // Check if this is a trial photos-ready signal
            if (d.convStatus === 'needs_medical_review' || d.flowState === 'REVIEW_PENDING') {
              window.dispatchEvent(new CustomEvent('fm:trial-photos-ready', { detail: JSON.stringify({ patientId: d.patientId }) }));
            }
            fmApi.getPatient(d.patientId).then(res => {
              const p = res?.patient || res;
              if (p) setLeads(prev => {
                const exists = prev.some(l => l.id === d.patientId);
                if (exists) return prev.map(l => l.id === d.patientId ? { ...l, ...p } : l);
                return [p, ...prev];
              });
            }).catch(() => {});
          }
          if (d.type === 'task:completed' && d.task?.id) {
            const result = d.task.result || {};
            if (result.patientId || d.task.patientId) {
              const pid = result.patientId || d.task.patientId;
              fmApi.getPatient(pid).then(res => {
                const p = res?.patient || res;
                if (p) {
                  setLeads(prev => prev.map(l => l.id === pid ? {
                    ...l, reviewData: p.reviewData || l.reviewData, convStatus: p.convStatus || l.convStatus,
                    graftCount: result.graftCount || p.graftCount || l.graftCount,
                    timeline: [...(l.timeline || []), { time: 'now', type: 'system', text: `Task completed: ${result.graftCount ? result.graftCount + ' grafts' : 'Review done'}${result.price ? ' - ' + result.price : ''}` }],
                  } : l));
                  showT('Doctor completed review for ' + (p.first_name || p.name || 'patient'));
                }
              }).catch(err => console.warn('[CRM] Failed to refresh patient after task:', err));
            }
          }
        } catch {}
      };
      ws.onclose = () => { clearInterval(pingIv); wsFails++; if (wsFails < 5) reconnectTo = setTimeout(connect, Math.min(wsFails * 5000, 30000)); };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => { clearInterval(pingIv); clearTimeout(reconnectTo); if (ws) ws.close(); };
  }, [user, activeClinicId]);

  /* Polling: refresh conversations every 30s + patients every 10s */
  useEffect(()=>{
    if(!user||!activeClinicId)return;if(user.apiRole==="clinic_doctor")return;
    const orgId=user.orgId||user.clinicId;
    if(!orgId)return;
    const iv=setInterval(()=>{
      if(demoMode)return;
      useInboxStore.getState().fetchConversations(orgId).then(convs=>{
        if(!convs)return;
        setLeads(prev=>{
          let changed=false;
          const next=prev.map(l=>{
            const conv=convs.find(c=>(c.patientId||c.id)===l.id);
            if(conv?.convStatus&&conv.convStatus!==l.convStatus){changed=true;return{...l,convStatus:conv.convStatus};}
            return l;
          });
          return changed?next:prev;
        });
      }).catch(e=>{});
    },30000);
    const iv2=setInterval(()=>{
      if(demoMode)return;
      fmApi.getPatients().then(data=>{
        const pats=data?.patients||data||[];
        if(!pats.length)return;
        setLeads(prev=>{
          let changed=false;
          // Add new patients that aren't in the list yet
          const existingIds=new Set(prev.map(l=>l.id));
          const newPats=pats.filter(p=>!existingIds.has(p.id)&&!p.is_demo);
          if(newPats.length>0)changed=true;
          const next=[...newPats,...prev].map(l=>{
            if(l.is_demo)return l;
            const p=pats.find(pt=>pt.id===l.id);
            if(!p)return l;
            const updates={...l,...p};
            // Check if anything changed
            let diff=false;
            for(const k of Object.keys(p)){if(JSON.stringify(p[k])!==JSON.stringify(l[k])){diff=true;break;}}
            // Auto-progress stage based on convStatus (if backend didn't update stage)
            if(!diff||!p.stage){
              const cs=updates.convStatus||l.convStatus;
              const st=updates.stage||l.stage;
              if(cs==="deposit_paid"&&st==="contacted"){updates.stage="booked";diff=true;}
            }
            // Trigger trial review popup when patient reaches needs_medical_review
            if(diff && p.convStatus==='needs_medical_review' && l.convStatus!=='needs_medical_review' && !p.is_demo){
              window.dispatchEvent(new CustomEvent('fm:trial-photos-ready',{detail:JSON.stringify({patientId:p.id})}));
            }
            if(diff){changed=true;return updates;}
            return l;
          });
          return changed?next:prev;
        });
      }).catch(()=>{});
    },5000);
    return()=>{clearInterval(iv);clearInterval(iv2);};
  },[user,activeClinicId]);

  /* Onboarding check */
  // Setup wizard only when workspace is ACTIVE (paid) and setup is incomplete
  const needsOnboarding=clinic&&!onboardingDismissed&&workspaceState==='active'&&(!clinic.clinicEmail||clinic.clinicEmail==="info@hairclinicturkiye.com"||!clinic.waName);
  const onboardingSteps=clinic?[
    {key:"clinic",label:t("ob_clinic"),done:!!clinic.clinicEmail&&!!clinic.address&&!!clinic.phone},
    {key:"wa",label:t("ob_whatsapp"),done:!!clinic.waName},
    {key:"ai",label:t("ob_ai"),done:!!clinic.aiConfig?.responseTone},
  ]:[];

  /* ═══ NAV ═══ */
  const nav=isOperator&&!IS_CLIENT_MODE?[
    {id:"operator",icon:"📊",l:"Overview"},
    {id:"op_clinics",icon:"🏥",l:"Clinics"},
    {id:"op_trials",icon:"🧪",l:"Trials",badge:pendingApps||null},
    "div",
    {id:"op_automations",icon:"⚡",l:"Automations"},
    {id:"op_monitoring",icon:"📡",l:"Monitoring"},
    {id:"op_incidents",icon:"🚨",l:"Incidents"},
    "div",
    {id:"op_logs",icon:"📋",l:"Logs"},
    {id:"op_billing",icon:"💳",l:"Billing"},
    {id:"op_settings",icon:"⚙️",l:"Settings"},
  ]:IS_CLIENT_MODE?[
    {id:"dashboard",icon:"🏠",l:t("dashboard")},
    {id:"inbox",icon:"💬",l:t("inbox"),badge:unread||null},
    {id:"pipeline",icon:"📊",l:t("pipeline")},
    {id:"appointments",icon:"📅",l:t("appointments")},
    {id:"doctor_portal",icon:"⚕️",l:t("doctor_portal")||"Arzt-Portal"},
    {id:"op_prep",icon:"🏥",l:t("op_preparation")||"OP-Planung"},
    {id:"payments",icon:"💳",l:t("payments")||"Zahlungen",financeOnly:true},
    {id:"revenue",icon:"💰",l:t("revenue")||"Umsatz",financeOnly:true},
    {id:"whatsapp_setup",icon:"📱",l:"WhatsApp"},
    "div",
    {id:"settings",icon:"⚙️",l:t("settings"),mod:"settings"},
    {id:"support",icon:"❓",l:t("support")},
  ]:[
    {id:"dashboard",icon:"🏠",l:t("dashboard")},
    {id:"inbox",icon:"💬",l:t("inbox"),badge:unread||null},
    {id:"pipeline",icon:"📊",l:t("pipeline")},
    {id:"appointments",icon:"📅",l:t("appointments")},
    {id:"patients_db",icon:"👥",l:t("patients")||"Patienten"},
    {id:"doctor_portal",icon:"⚕️",l:t("doctor_portal")||"Arzt-Portal"},
    {id:"op_prep",icon:"🏥",l:t("op_preparation")||"OP-Planung"},
    {id:"payments",icon:"💳",l:t("payments")||"Zahlungen",financeOnly:true},
    {id:"analytics",icon:"📈",l:t("analytics")||"Statistiken",mod:"finance_analytics"},
    {id:"revenue",icon:"💰",l:t("revenue")||"Umsatz",financeOnly:true},
    {id:"subscription",icon:"💳",l:t("subscription")||"Abonnement",mod:"finance_billing"},
    {id:"whatsapp_setup",icon:"📱",l:"WhatsApp"},
    {id:"settings",icon:"⚙️",l:t("settings"),mod:"settings"},
    {id:"support",icon:"❓",l:t("support")},
    ...(isAdmin?["div",{id:"operator",icon:"🔐",l:"Operator"}]:[]),
  ];
  const VIEW_TO_MODULE={dashboard:"dashboard",action_needed:"action_needed",inbox:"inbox",pipeline:"pipeline",patients:"patients",patients_db:"patients_db",appointments:"appointments",op_prep:"op_prep",doctor_portal:"doctor_portal",analytics:"analytics",revenue:"revenue",payments:"payments",automations:"automations",files:"files",archive:"archive",setup:"setup",settings:"settings",subscription:"billing",billing:"billing",support:"support",addons:"billing",ai_control:"settings",audit_log:"settings",whatsapp_setup:"whatsapp_setup"};
  const filteredNav=(!isOperator)?nav.filter(it=>{if(it==="div")return true;const mod=VIEW_TO_MODULE[it.id];if(!mod)return true;if(it.financeOnly&&userRole!=="finance")return false;return canAccess(mod);}).filter((it,i,arr)=>{if(it==="div"&&(i===0||arr[i-1]==="div"||i===arr.length-1))return false;return true;}):nav;

  /* ═══ CALENDAR ═══ */
  const CalMonth=()=>{const days=getMonthDays(calDate.getFullYear(),calDate.getMonth());return<div><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>{DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",padding:"8px 0"}}>{d}</div>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>{days.map((d,i)=>{const ds=fmtDate(d.date);const da=myAppts.filter(a=>a.date===ds);const td=isToday(d.date);const dayRev=da.filter(a=>a.status!=="cancelled").reduce((s,a)=>s+businessLogic.estimateRevenue(a),0);const isWeekday=d.date.getDay()>0&&d.date.getDay()<6;const isEmpty=da.length===0&&isWeekday&&d.current&&d.date>=new Date();return<div key={i} className={isEmpty?"empty-day":""} style={{minHeight:100,padding:6,borderRadius:10,background:td?"rgba(76,201,255,0.06)":isEmpty?"rgba(251,191,36,0.03)":"rgba(255,255,255,0.02)",border:`1px solid ${td?"rgba(76,201,255,0.2)":isEmpty?"rgba(251,191,36,0.12)":"rgba(255,255,255,0.04)"}`,opacity:d.current?1:0.35,cursor:"pointer"}} onClick={()=>{setCalDate(d.date);setCalView("day");}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:12,fontWeight:td?800:600,color:td?"#4cc9ff":"rgba(232,238,252,0.7)"}}>{d.date.getDate()}</span>{showRevenue&&dayRev>0&&<span style={{fontSize:9,fontWeight:700,color:"#10b981",background:"rgba(16,185,129,0.1)",padding:"1px 5px",borderRadius:4}}>€{(dayRev/1000).toFixed(1)}k</span>}{isEmpty&&<span style={{fontSize:8,color:"#fbbf24",fontWeight:700}}>open</span>}</div>{da.slice(0,2).map(a=>{const ac=APPT_C[a.status];return<div key={a.id} onClick={e=>{e.stopPropagation();setSelAppt(a.id);}} style={{padding:"2px 6px",borderRadius:5,background:`${ac.c}15`,borderLeft:`3px solid ${ac.c}`,marginBottom:2,fontSize:10,fontWeight:600,color:ac.c,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer"}}>{a.time} {a.patient}</div>;})}{da.length>2&&<div style={{fontSize:10,color:"rgba(167,177,195,0.4)"}}>+{da.length-2}</div>}</div>;})}</div></div>;};
  const CalDay=()=>{const ds=fmtDate(calDate);const da=myAppts.filter(a=>a.date===ds);const hours=Array.from({length:14},(_,i)=>i+7);return<div>{da.length===0&&<div style={{textAlign:"center",padding:40,color:"rgba(167,177,195,0.4)"}}>No appointments.</div>}{hours.map(h=>{const ha=da.filter(a=>parseInt(a.time)>=h&&parseInt(a.time)<h+1);return<div key={h} style={{display:"grid",gridTemplateColumns:"60px 1fr",gap:12,minHeight:60,borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div style={{fontSize:13,color:"rgba(167,177,195,0.3)",textAlign:"right",paddingTop:8,fontWeight:600}}>{String(h).padStart(2,"0")}:00</div><div style={{padding:"6px 0"}}>{ha.map(a=>{const ac=APPT_C[a.status];return<div key={a.id} onClick={()=>setSelAppt(a.id)} style={{padding:"12px 16px",borderRadius:12,background:`${ac.c}08`,border:`1px solid ${ac.c}20`,borderLeft:`4px solid ${ac.c}`,marginBottom:6,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:700,fontSize:15}}>{a.patient}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginTop:2}}>{a.treatment} · {a.time}–{a.endTime}</div></div><span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:`${ac.c}18`,color:ac.c}}>{ac.l}</span></div>;})}</div></div>;})}</div>;};

  /* ═══ SYSTEM STATUS ═══ */
  const SystemStatus=()=>{
    const [gStatus,setGStatus]=React.useState(null);
    const [waStatus,setWaStatus]=React.useState(clinic?.connection_status);
    React.useEffect(()=>{if(!activeClinicId)return;(async()=>{try{const mod=await import("./src/api/client");const[gRes,cRes]=await Promise.all([mod.apiFetch("/api/v1/auth/google/status?orgId="+activeClinicId),mod.getMyClinic()]);setGStatus(gRes);if(cRes?.clinic?.connection_status)setWaStatus(cRes.clinic.connection_status);}catch(e){}})();},[activeClinicId]);
    const waConnected=waStatus==="connected";
    const gCal=gStatus?.hasCalendar||false;
    const gDrive=gStatus?.hasDrive||false;
    const gSheets=gStatus?.hasSheets||false;
    const items=[
      {label:"AI Bot",status:waConnected,icon:"🤖"},
      {label:"WhatsApp",status:waConnected,icon:"💬"},
      {label:"Google Calendar",status:gCal,icon:"📅"},
      {label:"Google Drive",status:gDrive,icon:"📁"},
      {label:"Google Sheets",status:gSheets,icon:"📊"},
      {label:"Automations",status:myAutomations.some(a=>a.active),icon:"⚡"},
    ];
    return<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{items.map((it,i)=><div key={i} style={{padding:"8px 14px",borderRadius:10,background:it.status?"rgba(16,185,129,0.06)":"rgba(239,68,68,0.06)",border:`1px solid ${it.status?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)"}`,display:"flex",alignItems:"center",gap:8,fontSize:12}}>
      <div style={{width:7,height:7,borderRadius:99,background:it.status?"#10b981":"#ef4444",boxShadow:it.status?"0 0 6px #10b981":"0 0 6px #ef4444"}}/><span style={{fontSize:13}}>{it.icon}</span><span style={{fontWeight:600,color:it.status?"rgba(232,238,252,0.8)":"#ef4444"}}>{it.label}</span>
    </div>)}</div>;
  };

  /* ═══ SEARCH RESULTS (computed) ═══ */
  const searchResults = crmData.searchResults(searchQuery);

  /* ═══ CONTEXT VALUE ═══ */
  const ctxValue = {
    user, view, setView, clinics, setClinics, leads, setLeads, appts, setAppts,
    msgs, setMsgs, selLead, setSelLead, selAppt, setSelAppt, selChat, setSelChat,
    dragItem, setDragItem, newMsg, setNewMsg, sidebar, setSidebar, toast, setToast,
    settingsData, setSettingsData, adminClinic, setAdminClinic, cancelConfirm, setCancelConfirm,
    calView, setCalView, calDate, setCalDate,
    reviewGrafts, setReviewGrafts, reviewPrice, setReviewPrice, reviewNotes, setReviewNotes,
    searchQuery, setSearchQuery, searchOpen, setSearchOpen, notifOpen, setNotifOpen,
    patientTab, setPatientTab, newNote, setNewNote,
    aiConfigData, setAiConfigData, newFaqQ, setNewFaqQ, newFaqA, setNewFaqA,
    supportMsg, setSupportMsg, lang, setLang,
    rescheduleAppt, setRescheduleAppt, rescheduleDate, setRescheduleDate, rescheduleTime, setRescheduleTime,
    onboardingDismissed, setOnboardingDismissed, dismissedUsageWarnings, setDismissedUsageWarnings,
    dismissedRevSuggestion, setDismissedRevSuggestion, resetEmail: authState.resetEmail, setResetEmail: authState.setResetEmail, showResetForm: authState.showResetForm, setShowResetForm: authState.setShowResetForm,
    inboxFilter, setInboxFilter, showPlanPicker, setShowPlanPicker,
    inviteOpen, setInviteOpen, inviteEmail, setInviteEmail, inviteRole, setInviteRole,
    auditLog, setAuditLog, showRevenue, setShowRevenue, msgPageSize, msgPage, setMsgPage,
    magicLinks, setMagicLinks, invoices, setInvoices,
    invoiceModal, setInvoiceModal, invAmount, setInvAmount, invItems, setInvItems, invVat, setInvVat, invDeposit, setInvDeposit,
    paymentModal, setPaymentModal, payAmount, setPayAmount, payCurrency, setPayCurrency,
    tourActive, setTourActive, tourStep, setTourStep, tourCompleted, setTourCompleted,
    templateModal, setTemplateModal, templateFilter, setTemplateFilter, successModal, setSuccessModal,
    isAdmin, isOperator, activeClinicId, clinic, myLeads, myAppts, allClinicMsgs, myMsgs, unread, opSubTab, setOpSubTab,
    myNotifs, unreadNotifs, myFiles, myAutomations, totalActions,
    usageMetrics: crmData.usageMetrics, todayMetrics: crmData.todayMetrics,
    searchResults, flightAlerts: crmData.flightAlerts, flightMatches: crmData.flightMatches,
    needsOnboarding, onboardingSteps,
    chatEnd,
    t, getCS, getClinicById, getLeadById, getStageById, showT,
    logAction, getLeadScore: crmData.getLeadScore, getSLA: crmData.getSLA, getAiSuggestions: crmData.getAiSuggestions,
    moveLead, addTL, setConvStatus, handleDrop, updateAppt,
    sendTreatmentPlan: businessLogic.sendTreatmentPlan, addInternalNote: businessLogic.addInternalNote,
    markNotifsRead, toggleAutomation,
    assignDriver: crmHandlers.assignDriver, notifyDriver: crmHandlers.notifyDriver,
    handleDriverResponse: crmHandlers.handleDriverResponse, escalateToBackup: crmHandlers.escalateToBackup,
    handleBackupDriverResponse: crmHandlers.handleBackupDriverResponse,
    sendMessage: crmHandlers.sendMessage, markResolved: crmHandlers.markResolved, doReschedule: crmHandlers.doReschedule,
    openPatient, openPatientPhotos, syncPatientCard,
    generatePDF: businessLogic.generatePDF, generateMagicLink: businessLogic.generateMagicLink,
    generateInvoicePDF: businessLogic.generateInvoicePDF, generateStripeLink: businessLogic.generateStripeLink,
    generateDepositLink: businessLogic.generateDepositLink, markInvoicePaid: businessLogic.markInvoicePaid,
    sendPaymentLink: businessLogic.sendPaymentLink, sendTemplateMsg,
    simulatePaymentReceived: businessLogic.simulatePaymentReceived, resolveTemplate,
    exportRevenue: businessLogic.exportRevenue,
    browserNotify, estimateRevenue: businessLogic.estimateRevenue, getWeekRevenue: businessLogic.getWeekRevenue,
    createInvoice: businessLogic.createInvoice,
    completeOnboarding, handleLogout, handleLogin, handleMagicLink,
    handleForgotPw, handleSetPassword, handlePasswordReset,
    SystemStatus, CalMonth, CalDay, nav: filteredNav, userRole, canAccess,
    demoMode, toggleDemoMode, demoLoading,
    enrichDemoData, setDemoLoading,
    workspaceState, setWorkspaceState, testInfo, setTestInfo,
    showActivation, setShowActivation, showBillingConfirm, setShowBillingConfirm,
    loginLang: authState.loginLang, setLoginLang: authState.setLoginLang,
    pendingApps,
  };

  /* ═══ RENDER ═══ */
  /* Wait for API role to resolve before rendering anything */
  if (user && user.apiUser && !user.apiRole) {
    return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0f1623",color:"rgba(167,177,195,0.5)"}}>Laden...</div>;
  }

  /* clinic_doctor: load clinic data like other roles (no bypass) */

  /* Wait for clinic data to load */
  if(user&&activeClinicId&&!clinic){
    if(!clinic&&activeClinicId&&!window._fmClinicLoading){
      window._fmClinicLoading=true;
      fmApi.getMyClinic().then(res=>{if(res?.clinic){const cd=res.clinic;const c={...cd,plan:cd.plan||"core",status:cd.status||"active",type:cd.type,setupStatus:(cd.onboarding_completed||cd.onboarded_at)?"live":(cd.setup_status||"new"),onboarded:cd.onboarded_at,lastLogin:new Date().toISOString(),stats:{leadsMonth:0,bookingsMonth:0,convRate:0,aiHandled:0,activeConvs:0,avgResponse:"—"},notifications:[],billing:cd.billing||null,cancelled_at:cd.cancelled_at||null,clinicEmail:cd.clinicEmail||cd.email,drivers:cd.drivers||[],logisticsConfig:cd.logisticsConfig||{}};setClinics(prev=>{const exists=prev.find(x=>x.id===c.id);return exists?prev.map(x=>x.id===c.id?{...x,...c}:x):[...prev,c];});setAdminClinic(activeClinicId);fmApi.getAutomations().then(aRes=>{if(aRes?.automations?.length){setClinics(prev=>prev.map(cx=>cx.id===activeClinicId?{...cx,automations:aRes.automations.map(a=>({id:a.id,name:a.name,type:a.type,trigger:a.trigger,action:a.action,active:a.active!==false,runs:a.runs||0,lastRun:a.lastRun||null,locked:a.locked||false,min_plan:a.min_plan||"core",n8n_synced:a.n8n_synced||false,n8n_workflow_id:a.n8n_workflow_id||null}))}:cx));}}).catch(()=>{});}window._fmClinicLoading=false;}).catch(()=>{window._fmClinicLoading=false;});
    }
    return<div style={{minHeight:"100vh",background:AUTH_BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}><div style={{textAlign:"center"}}><img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{width:56,height:56,borderRadius:16,objectFit:"cover",marginBottom:16}}/><div style={{fontWeight:800,fontSize:22,letterSpacing:"0.12em",background:"linear-gradient(135deg,#fff,rgba(76,201,255,.7))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:16}}>FLOWMATIX</div><div style={{fontSize:14,color:"rgba(167,177,195,0.5)"}}>Klinikdaten laden...</div></div></div>;
  }

  /* Login screen */
  if(!user) return <LoginScreen
    authCallbackMode={authState.authCallbackMode} authCallbackErr={authState.authCallbackErr}
    setAuthCallbackMode={authState.setAuthCallbackMode}
    authLoading={authState.authLoading}
    newPassword={authState.newPassword} setNewPassword={authState.setNewPassword}
    confirmPassword={authState.confirmPassword} setConfirmPassword={authState.setConfirmPassword}
    handleSetPassword={handleSetPassword}
    loginEmail={authState.loginEmail} setLoginEmail={authState.setLoginEmail}
    loginPass={authState.loginPass} setLoginPass={authState.setLoginPass}
    loginErr={authState.loginErr} setLoginErr={authState.setLoginErr}
    loginMode={authState.loginMode} setLoginMode={authState.setLoginMode}
    showPass={authState.showPass} setShowPass={authState.setShowPass}
    loginLang={authState.loginLang} setLoginLang={authState.setLoginLang}
    handleLogin={handleLogin} handleMagicLink={handleMagicLink} handleForgotPw={handleForgotPw}
  />;

  /* Auth callback screens (shown even when user is set) */
  if(authState.authCallbackMode) return <LoginScreen
    authCallbackMode={authState.authCallbackMode} authCallbackErr={authState.authCallbackErr}
    setAuthCallbackMode={authState.setAuthCallbackMode}
    authLoading={authState.authLoading}
    newPassword={authState.newPassword} setNewPassword={authState.setNewPassword}
    confirmPassword={authState.confirmPassword} setConfirmPassword={authState.setConfirmPassword}
    handleSetPassword={handleSetPassword}
    loginEmail={authState.loginEmail} setLoginEmail={authState.setLoginEmail}
    loginPass={authState.loginPass} setLoginPass={authState.setLoginPass}
    loginErr={authState.loginErr} setLoginErr={authState.setLoginErr}
    loginMode={authState.loginMode} setLoginMode={authState.setLoginMode}
    showPass={authState.showPass} setShowPass={authState.setShowPass}
    loginLang={authState.loginLang} setLoginLang={authState.setLoginLang}
    handleLogin={handleLogin} handleMagicLink={handleMagicLink} handleForgotPw={handleForgotPw}
  />;

  /* Main app */
  return(
    <AppContext.Provider value={ctxValue}>
      <RouterSync />
      <MainLayout />
      {/* Demo write-blocked modal */}
      {demoBlockedModal && <div style={{position:"fixed",inset:0,zIndex:99999,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setDemoBlockedModal(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#162032",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"32px 28px",maxWidth:400,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
          <div style={{fontSize:36,marginBottom:12}}>🔒</div>
          <div style={{fontSize:16,fontWeight:700,color:"rgba(232,238,252,0.9)",marginBottom:8}}>{t("demo_mode_title") || "Demo-Modus"}</div>
          <div style={{fontSize:13,color:"rgba(167,177,195,0.6)",lineHeight:1.6,marginBottom:20}}>{t("demo_mode_desc") || "Im Demo-Modus kannst du alles erkunden, aber keine echten Änderungen speichern. Wechsle zu LIVE, um diese Funktion zu aktivieren."}</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button onClick={()=>setDemoBlockedModal(false)} style={{padding:"8px 20px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.6)",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{t("close_btn") || "Schließen"}</button>
            <button onClick={()=>{setDemoBlockedModal(false);toggleDemoMode();}} style={{padding:"8px 20px",borderRadius:10,background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 12px rgba(16,185,129,0.3)"}}>{t("go_live_now") || "Jetzt live gehen"}</button>
          </div>
        </div>
      </div>}
    </AppContext.Provider>
  );
}
