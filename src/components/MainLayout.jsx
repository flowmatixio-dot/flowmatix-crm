import React, { useContext, useRef, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import { STAGES, CONV_STATUS, APPT_C, PLAN_LIMITS, PLAN_C, PLAN_PRICE, NOTIF_ICONS, NOTIF_COLORS, hasModuleAccess } from "../data/constants";
import { Btn, IC, Section, getAvatarGradient, getInitials } from "../components/shared/index";
import { timeAgo } from "../utils/helpers";
import * as fmApi from "../api/client";
import { usePatientStore } from "../stores/patientStore";
import { useAppointmentStore } from "../stores/appointmentStore";
import { useInboxStore } from "../stores/inboxStore";
import { useBillingStore } from "../stores/billingStore";

import AuditLogView from "./AuditLog/AuditLogView";
import SupportView from "./Support/SupportView";
import ManualPage from "./Manual/ManualPage";
import AutomationsView from "./Automations/AutomationsView";
import FilesView from "./Files/FilesView";
import AnalyticsView from "./Analytics/AnalyticsView";
import SettingsView from "./Settings/SettingsView";
import SubscriptionView from "./Subscription/SubscriptionView";
import AddonsView from "./Addons/AddonsView";
import PatientPanel from "./Patients/PatientPanel";
import PipelineView from "./Patients/PipelineView";
import PatientsPage from "./Patients/PatientsPage";
import ActionNeededView from "./ActionNeeded/ActionNeededView";
import RevenueView from "./Revenue/RevenueView";
import ProductTour, { TourWelcomeModal } from "./Tour/ProductTour";
import AISupportWidget from "./AISupport/AISupportWidget";
import OperatorPanel from "./Operator/OperatorPanel";
import ThemeToggle from "./Theme/ThemeToggle";
import DashboardView from "./Dashboard/DashboardView";
import InboxView from "./Inbox/InboxView";
import AppointmentsPage from "./Appointments/AppointmentsPage";
import AIControlView from "./AIControl/AIControlView";
import WhatsAppSetupPage from "./WhatsApp/WhatsAppSetupPage";
import SetupView from "./SetupGuide/SetupView";
import ErrorBoundary from "./shared/ErrorBoundary";
import OpPrepView from "./OpPrep/OpPrepView";
import ReviewBoard from "./DoctorTasks/ReviewBoard";
import DoctorTasksView from "./DoctorTasks/DoctorTasksView";
import ArchiveView from "./Archive/ArchiveView";
import OnboardingWizard from "./Onboarding/OnboardingWizard";
import AutoDemoPlayer from "./Onboarding/AutoDemoPlayer";
import { isFromSetup, clearFromSetup } from "../lib/setupNav";
import PaymentsView from "./Finance/PaymentsView";

const IS_CLIENT_MODE = window.location.hostname === "crm.flowmatix.io" || window.location.hostname === "localhost";

export default function MainLayout() {
  const ctx = useContext(AppContext);
  const {
    user, view, setView, clinics, setClinics, leads, setLeads, appts, setAppts,
    msgs, setMsgs, selLead, setSelLead, selAppt, setSelAppt, selChat, setSelChat,
    dragItem, setDragItem, newMsg, setNewMsg, sidebar, setSidebar, toast, setToast,
    settingsData, setSettingsData, adminClinic, setAdminClinic, cancelConfirm, setCancelConfirm,
    calView, setCalView, calDate, setCalDate,
    reviewGrafts, setReviewGrafts, reviewPrice, setReviewPrice, reviewNotes, setReviewNotes,
    searchQuery, setSearchQuery, searchOpen, setSearchOpen, notifOpen, setNotifOpen,
    patientTab, setPatientTab, newNote, setNewNote,
    aiConfigData, setAiConfigData,
    lang, setLang,
    rescheduleAppt, setRescheduleAppt, rescheduleDate, setRescheduleDate, rescheduleTime, setRescheduleTime,
    showPlanPicker, setShowPlanPicker,
    showRevenue, setShowRevenue,
    invoiceModal, setInvoiceModal, invAmount, setInvAmount, invItems, setInvItems, invVat, setInvVat, invDeposit, setInvDeposit,
    paymentModal, setPaymentModal, payAmount, setPayAmount, payCurrency, setPayCurrency,
    tourActive, setTourActive, tourStep, setTourStep, tourCompleted, setTourCompleted,
    templateModal, setTemplateModal, templateFilter, setTemplateFilter, successModal, setSuccessModal,
    isAdmin, isOperator, activeClinicId, clinic, myLeads, myAppts, allClinicMsgs, myMsgs, unread, opSubTab, setOpSubTab,
    myNotifs, unreadNotifs, myFiles, myAutomations, totalActions,
    usageMetrics, todayMetrics,
    searchResults, flightAlerts, flightMatches,
    needsOnboarding, completeOnboarding,
    t, getCS, getClinicById, getLeadById, getStageById, showT,
    logAction, getLeadScore, getSLA, getAiSuggestions,
    moveLead, addTL, setConvStatus, handleDrop, updateAppt,
    assignDriver, notifyDriver, handleDriverResponse, escalateToBackup, handleBackupDriverResponse,
    sendMessage, markResolved, doReschedule, openPatient,
    generatePDF, generateMagicLink, generateInvoicePDF, generateStripeLink,
    generateDepositLink, markInvoicePaid, sendPaymentLink, sendTemplateMsg,
    simulatePaymentReceived, resolveTemplate, exportRevenue,
    browserNotify, estimateRevenue, getWeekRevenue, createInvoice,
    handleLogout,
    SystemStatus, CalMonth, CalDay, nav,
    demoMode, toggleDemoMode, demoLoading,
    markNotifsRead, loginLang, setLoginLang,
    pendingApps, userRole,
  } = ctx;

  const clinicPlan = clinic?.plan || "core";
  const effectiveRole = userRole || "admin";
  const canAccess = (mod) => hasModuleAccess(effectiveRole, mod, clinicPlan);
  const [billingCycle, setBillingCycle] = React.useState('monthly');
  const [promoCode, setPromoCode] = React.useState('');
  const [promoLoading, setPromoLoading] = React.useState(false);
  const [promoError, setPromoError] = React.useState('');
  const [showPromoInput, setShowPromoInput] = React.useState(false);
  const [showPwModal, setShowPwModal] = React.useState(false);
  const [pwForm, setPwForm] = React.useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = React.useState(false);
  const [pwToast, setPwToast] = React.useState(null);
  const handlePwChange = async () => {
    if (pwForm.newPw.length < 8) { setPwToast({ msg: t('pw_min_8') || 'Mindestens 8 Zeichen', type: 'error' }); setTimeout(() => setPwToast(null), 3000); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwToast({ msg: t('pw_mismatch') || 'Passwörter stimmen nicht überein', type: 'error' }); setTimeout(() => setPwToast(null), 3000); return; }
    setPwLoading(true);
    try {
      await fmApi.updatePassword(pwForm.newPw, pwForm.current);
      setPwToast({ msg: t('pw_changed') || 'Passwort geändert — Sie werden abgemeldet' }); setTimeout(() => setPwToast(null), 3000);
      setShowPwModal(false);
      setTimeout(() => handleLogout(), 2000);
    } catch (e) {
      setPwToast({ msg: e.message || t('pw_error') || 'Fehler beim Ändern', type: 'error' }); setTimeout(() => setPwToast(null), 3000);
    }
    setPwLoading(false);
  };
  const [showTrialReviewPopup, setShowTrialReviewPopup] = React.useState(false);
  const [trialReviewPatient, setTrialReviewPatient] = React.useState(null);
  const trialReviewShownIds = React.useRef(new Set());

  // Trial popup: show once per patient when they reach needs_medical_review
  React.useEffect(() => {
    if (!['live_test', 'activation_pending'].includes(ctx.workspaceState)) return;
    if (showTrialReviewPopup) return;
    const realReview = myLeads.find(l => l.is_demo !== true && l.isDemo !== true && !l.demo && l.convStatus === 'needs_medical_review' && (l.photos || (l.photoUrls || []).length >= 3 || l.photosReceived >= 3) && !trialReviewShownIds.current.has(l.id));
    if (realReview) {
      setTimeout(() => {
        trialReviewShownIds.current.add(realReview.id);
        setTrialReviewPatient(realReview);
        setShowTrialReviewPopup(true);
      }, 10000);
    }
  }, [myLeads, ctx.workspaceState, showTrialReviewPopup]);

  // Manual "open review" trigger — fired by buttons in InboxView via CustomEvent.
  // Without this listener, the click handlers in InboxView (lines ~593, ~887) were silent no-ops.
  // Also used by the auto demo tour to open the popup at step 3 (review).
  React.useEffect(() => {
    const openHandler = () => setShowTrialReviewPopup(true);
    const closeHandler = () => setShowTrialReviewPopup(false);
    window.addEventListener('fm-open-review', openHandler);
    window.addEventListener('fm-close-review', closeHandler);
    return () => {
      window.removeEventListener('fm-open-review', openHandler);
      window.removeEventListener('fm-close-review', closeHandler);
    };
  }, []);

  // Live clock for operator top bar
  const [clockNow, setClockNow] = React.useState(new Date());
  React.useEffect(() => { const iv = setInterval(() => setClockNow(new Date()), 30000); return () => clearInterval(iv); }, []);

  // ── Mobile detection: show desktop-only notice ──
  const [isMobile] = useState(() => window.innerWidth < 768);
  if (isMobile) {
    const mobileLabels = {
      en: { title: "Desktop Only", msg: "Flowmatix CRM is optimized for desktop. Please open it on a computer for the best experience.", btn: "Continue anyway" },
      de: { title: "Nur Desktop", msg: "Flowmatix CRM ist fuer Desktop optimiert. Bitte oeffne es auf einem Computer fuer die beste Erfahrung.", btn: "Trotzdem fortfahren" },
      tr: { title: "Yalnizca Masaustu", msg: "Flowmatix CRM masaustu icin optimize edilmistir. En iyi deneyim icin lutfen bilgisayarda acin.", btn: "Yine de devam et" },
    };
    const ml = mobileLabels[lang] || mobileLabels.de;
    return <div style={{minHeight:"100vh",background:"#0f1623",display:"flex",alignItems:"center",justifyContent:"center",padding:32,fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}>
      <div style={{textAlign:"center",maxWidth:360}}>
        <div style={{fontSize:48,marginBottom:16}}>💻</div>
        <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:12}}>{ml.title}</div>
        <div style={{fontSize:14,color:"rgba(167,177,195,0.6)",lineHeight:1.6,marginBottom:24}}>{ml.msg}</div>
        <button onClick={()=>window.location.reload()} style={{padding:"10px 24px",borderRadius:10,background:"rgba(76,201,255,0.1)",border:"1px solid rgba(76,201,255,0.25)",color:"#4cc9ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{ml.btn}</button>
      </div>
    </div>;
  }
  const scrollRef = useRef(null);

  // ── Doctor: global new-task popup (polls every 15s, works on ANY view) ──
  const [doctorAlert, setDoctorAlert] = React.useState(null);
  const doctorPrevIds = useRef(new Set());
  const doctorShownIds = useRef(new Set()); // never show same task twice per session
  useEffect(() => {
    if (effectiveRole !== "doctor") return;
    let mounted = true;
    const check = async () => {
      try {
        const res = await fmApi.apiFetch("/api/v1/tasks");
        const tasks = res.tasks || [];
        if (doctorPrevIds.current.size > 0) {
          const fresh = tasks.find(t => t.status === "pending" && !doctorPrevIds.current.has(t.id) && !doctorShownIds.current.has(t.id));
          if (fresh && mounted) {
            doctorShownIds.current.add(fresh.id);
            const name = `${fresh.patient?.firstName || "?"} ${fresh.patient?.lastName || ""}`.trim();
            setDoctorAlert({ id: fresh.id, name, type: fresh.type });
            setTimeout(() => setDoctorAlert(prev => prev?.id === fresh.id ? null : prev), 15000);
          }
        }
        doctorPrevIds.current = new Set(tasks.map(t => t.id));
      } catch {}
    };
    check();
    const iv = setInterval(check, 15000);
    return () => { mounted = false; clearInterval(iv); };
  }, [effectiveRole]);
  // Reset scroll on view change
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [view, opSubTab]);
  // Listen for internal tab scroll reset
  useEffect(() => {
    const handler = () => { if (scrollRef.current) scrollRef.current.scrollTop = 0; };
    window.addEventListener("fm:scroll-top", handler);
    return () => window.removeEventListener("fm:scroll-top", handler);
  }, []);

  /* ======== APPOINTMENT DRAWER ======== */
  const ApptDrawer = () => {
    const a = appts.find(x => x.id === selAppt); if (!a) return null; const ac = APPT_C[a.status] || APPT_C.booked;
    return <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex" }}><div onClick={() => setSelAppt(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", marginLeft: "auto", width: "min(500px,90vw)", height: "100vh", background: "#131c2e", borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", animation: "slI .25s ease", boxShadow: "-4px 0 12px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", flexShrink: 0 }}><div><div style={{ fontWeight: 800, fontSize: 20 }}>{a.patient}</div><div style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", marginTop: 2 }}>{a.treatment}</div><div style={{ display: "flex", gap: 6, marginTop: 8 }}><span style={{ padding: "3px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: `${ac.c}18`, color: ac.c }}>{ac.l}</span></div></div><button onClick={() => setSelAppt(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(167,177,195,0.7)", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <Section title={t("actions")}><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{a.status !== "completed" && a.status !== "cancelled" && <Btn color="#4cc9ff" icon="📅" label={t("reschedule")} onClick={() => { setRescheduleAppt(a.id); setRescheduleDate(a.date); setRescheduleTime(a.time); }} />}{a.status !== "completed" && <Btn color="#10b981" icon="✓" label={t("complete")} onClick={() => { updateAppt(a.id, { status: "completed" }); setSelAppt(null); }} />}{a.status !== "cancelled" && <Btn color="#ef4444" icon="✕" label={t("cancel")} onClick={() => { updateAppt(a.id, { status: "cancelled" }); setSelAppt(null); }} />}{a.status === "booked" && <Btn color="#a78bfa" icon="◈" label={t("confirm")} onClick={() => updateAppt(a.id, { status: "confirmed" })} />}</div></Section>
          {/* Reschedule Form */}
          {rescheduleAppt === a.id && <Section title={`📅 ${t("reschedule")}`}>
            <div style={{ padding: 16, borderRadius: 12, background: "rgba(76,201,255,0.05)", border: "1px solid rgba(76,201,255,0.15)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 4 }}>{t("new_date")}</div><input id="rescheduleDate" name="rescheduleDate" type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 4 }}>{t("new_time")}</div><input id="rescheduleTime" name="rescheduleTime" type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}><Btn color="#4cc9ff" icon="✓" label={t("save")} onClick={doReschedule} /><Btn color="rgba(167,177,195,0.7)" icon="✕" label={t("cancel")} secondary onClick={() => { setRescheduleAppt(null); setRescheduleDate(""); setRescheduleTime(""); }} /></div>
            </div>
          </Section>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}><IC label={t("date")} value={a.date} /><IC label={t("time")} value={`${a.time}–${a.endTime}`} /><IC label={t("assigned")} value={a.assigned} /><IC label={t("source")} value={a.source} /></div>
          {a.notes && <Section title={t("notes")}><div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 14 }}>{a.notes}</div></Section>}
        </div>
      </div>
    </div>;
  };

  // Shimmer/highlight listener — triggered from Dashboard KI-Einblicke
  React.useEffect(() => {
    const handler = (e) => {
      const { ids } = e.detail || {};
      if (!ids || !ids.length) return;
      // Scroll to first matching element and apply shimmer
      setTimeout(() => {
        ids.forEach((id, i) => {
          const el = document.querySelector(`[data-patient-id="${id}"]`);
          if (el) {
            if (i === 0) el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.style.animation = "fmHighlight 1.5s ease 2";
            setTimeout(() => { el.style.animation = ""; }, 3000);
          }
        });
      }, 300);
    };
    window.addEventListener("fm:highlight", handler);
    return () => window.removeEventListener("fm:highlight", handler);
  }, []);

  // ── Copy number state ──
  const [phoneCopied, setPhoneCopied] = useState(false);

  // ── Trial Countdown ──
  const [trialCountdown, setTrialCountdown] = useState(null);
  useEffect(() => {
    const ws = ctx.workspaceState;
    if (!ws || ws === 'active' || ws === 'trial_expired') { setTrialCountdown(null); return; }
    // Get trial end from workspace state API response (stored in ctx)
    const checkCountdown = () => {
      fmApi.getWorkspaceState().then(res => {
        if (!res?.trialEndsAt) { setTrialCountdown(null); return; }
        const diff = new Date(res.trialEndsAt).getTime() - Date.now();
        if (diff <= 0) { setTrialCountdown(null); return; }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days >= 2) setTrialCountdown((t("lt_trial_days")||"Trial ends in {n} days").replace("{n}",days));
        else if (days >= 1) setTrialCountdown((t("lt_trial_dh")||"Trial ends in {n}d {h}h").replace("{n}",days).replace("{h}",hours));
        else if (hours >= 1) setTrialCountdown((t("lt_trial_hours")||"Trial ends in {n} hours").replace("{n}",hours));
        else setTrialCountdown(t("lt_trial_today")||'Trial ends today');
      }).catch(() => {});
    };
    checkCountdown();
    const iv = setInterval(checkCountdown, 60000);
    return () => clearInterval(iv);
  }, [ctx.workspaceState]);

  // ── Onboarding Wizard (ONLY after payment — workspace_state === 'active') ──
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    const wsActive = ctx.workspaceState === 'active';
    if (needsOnboarding && isAdmin && IS_CLIENT_MODE && !demoMode && wsActive) setShowOnboarding(true);
    else if (demoMode || !wsActive) setShowOnboarding(false);
  }, [needsOnboarding, isAdmin, demoMode, ctx.workspaceState]);

  // ── Redirect legacy billing confirm to plan picker ──
  useEffect(() => {
    if (ctx.showBillingConfirm) {
      ctx.setShowBillingConfirm(false);
      ctx.setShowPlanPicker(true);
    }
  }, [ctx.showBillingConfirm]);

  return (
    <ErrorBoundary>

    {/* ── Trial Review Popup — real DoctorTasksView after 3 photos ── */}
    {showTrialReviewPopup && (
      <div style={{ position: "fixed", inset: 0, zIndex: 999998, background: "rgba(8,12,22,0.92)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
        <div style={{ maxWidth: 900, width: "100%", maxHeight: "90vh", background: "#0f1623", borderRadius: 18, border: "1px solid rgba(255,138,42,0.2)", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
          {/* Header with info */}
          <div style={{ padding: "16px 24px", background: "linear-gradient(135deg, rgba(255,138,42,0.08), rgba(76,201,255,0.03))", borderBottom: "1px solid rgba(255,138,42,0.15)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{"⚕️"}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{t("trial_review_title") || "Arzt-Bewertung — Live Preview"}</div>
                  <div style={{ fontSize: 11, color: "rgba(200,215,240,0.6)", marginTop: 2 }}>{t("trial_review_sub") || "Bewerten Sie den Patienten — die Nachricht geht direkt raus"}</div>
                </div>
              </div>
              <button onClick={() => setShowTrialReviewPopup(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(200,215,240,0.6)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"✕"}</button>
            </div>
            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.1)", fontSize: 11, color: "rgba(200,215,240,0.7)", lineHeight: 1.6 }}>
              {"💡"} {t("trial_review_hint") || "Im Live-Betrieb sehen Ihre Ärzte diese Ansicht in ihrem eigenen Portal. Jeder Arzt bekommt die Bewertung. Der erste der bewertet, schließt den Fall ab — der Patient wird automatisch kontaktiert."}
            </div>
          </div>
          {/* Actual DoctorTasksView */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
            <DoctorTasksView />
          </div>
        </div>
      </div>
    )}

    {showOnboarding && <OnboardingWizard onComplete={() => {
      setShowOnboarding(false);
      completeOnboarding(ctx.activeClinicId, t("onboarding_complete") || "Setup abgeschlossen!");
    }} onSkip={() => setShowOnboarding(false)} />}

    {/* AutoDemoPlayer overlay — mounted globally so it survives view changes
        triggered by the player itself (it calls setView to walk through CRM) */}
    {ctx.demoTourOpen && <AutoDemoPlayer onClose={() => ctx.setDemoTourOpen(false)} />}
    <style>{`@keyframes fmHighlight{0%{box-shadow:0 0 0 0 rgba(76,201,255,0.5)}50%{box-shadow:0 0 24px 6px rgba(76,201,255,0.35)}100%{box-shadow:0 0 0 0 rgba(76,201,255,0)}}`}</style>

    {/* ── Plan Picker Modal (trial_expired forced OR manual trigger) ── */}
    {(ctx.workspaceState === 'trial_expired' || ctx.showPlanPicker) && (() => {
      const isForced = ctx.workspaceState === 'trial_expired';
      const isYearly = billingCycle === 'yearly';
      const PLAN_ORDER = ["core", "pro", "operations", "enterprise"];
      const PLAN_LABELS = { core: "Core", pro: "Pro", operations: "Operations", enterprise: "Enterprise" };
      const sharedFeatures = [t("pf_shared_ai")||"AI WhatsApp assistant", t("pf_shared_crm")||"Full CRM & pipeline", t("pf_shared_calendar")||"Calendar & booking", t("pf_shared_automations")||"All automations", t("pf_shared_languages")||"All languages", t("pf_shared_team")||"Unlimited team members"];
      const PLAN_FEATURES = {
        core: [t("pf_c1")||"Up to 250 patients/month", ...sharedFeatures],
        pro: [t("pf_p1")||"Up to 500 patients/month", ...sharedFeatures],
        operations: [t("pf_o1")||"Up to 1,000 patients/month", ...sharedFeatures],
        enterprise: [t("pf_e1")||"Unlimited patients", ...sharedFeatures, t("pf_e_dedicated")||"Dedicated support & SLA"],
      };
      const handleSelectPlan = async (plan) => {
        if (plan === "enterprise") {
          window.open(`https://mail.google.com/mail/?view=cm&to=info@flowmatix.io&su=${encodeURIComponent("Enterprise Anfrage")}&body=${encodeURIComponent(`Wir interessieren uns für den Enterprise Plan.\n\nKlinik: ${clinic?.name || ''}`)}`, '_blank');
          return;
        }
        setPromoLoading(true);
        setPromoError('');
        try {
          await fmApi.setWorkspaceState('checkout_pending');
          ctx.setWorkspaceState('checkout_pending');
          const res = await fmApi.startTrialActivation(plan, billingCycle, promoCode.trim() || null);
          if (res?.url) window.location.href = res.url;
          else { ctx.setWorkspaceState('live_test'); ctx.showT?.(t("plan_checkout_error")||'Checkout failed'); }
        } catch (e) {
          ctx.setWorkspaceState('live_test');
          const msg = e.message || '';
          if (msg.includes('Ungültiger') || msg.includes('Promo')) setPromoError(msg);
          else ctx.showT?.((t("plan_checkout_error")||'Checkout failed') + ': ' + msg);
        } finally { setPromoLoading(false); }
      };
      const valueItems = [
        { icon: "🤖", text: t("pv_1")||"WhatsApp AI active 24/7" },
        { icon: "📋", text: t("pv_2")||"Automatic patient qualification" },
        { icon: "📅", text: t("pv_3")||"Smart booking & reminders" },
        { icon: "🏥", text: t("pv_4")||"Central CRM for all patients" },
      ];
      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 999999, background: "rgba(8,12,22,0.95)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
          <div style={{ maxWidth: 960, width: "100%", position: "relative" }}>
            {!isForced && (
              <button onClick={() => ctx.setShowPlanPicker(false)} style={{ position: "absolute", top: -12, right: -12, width: 36, height: 36, borderRadius: 99, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,215,240,0.7)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>✕</button>
            )}

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 16px", borderRadius: 99, background: isForced ? "rgba(251,191,36,0.08)" : "rgba(76,201,255,0.06)", border: `1px solid ${isForced ? "rgba(251,191,36,0.15)" : "rgba(76,201,255,0.12)"}`, marginBottom: 14, fontSize: 11, fontWeight: 700, color: isForced ? "#fbbf24" : "#4cc9ff" }}>
                {isForced ? "⏸" : "⚡"} {isForced ? (t("pp_paused")||"System paused") : (t("pp_upgrade")||"Upgrade")}
              </div>
              <h2 style={{ color: "white", fontSize: 24, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.3 }}>
                {isForced ? (t("pp_title_expired")||"Your system is currently paused") : (t("pp_title")||"Choose your plan")}
              </h2>
              <p style={{ color: "rgba(200,215,240,0.6)", fontSize: 13, margin: "0 0 4px", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
                {isForced ? (t("pp_desc_expired")||"Activate your plan to continue receiving and converting patient inquiries via WhatsApp") : (t("pp_desc")||"Select the right plan for your clinic")}
              </p>
              <p style={{ color: "rgba(167,177,195,0.7)", fontSize: 11, margin: 0 }}>
                {t("pp_trust")||"Activation takes less than 2 minutes \u00b7 No setup required"}
              </p>
            </div>

            {/* Value Bar */}
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
              {valueItems.map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(167,177,195,0.7)" }}>
                  <span style={{ fontSize: 14 }}>{v.icon}</span>{v.text}
                </div>
              ))}
            </div>

            {/* Billing Cycle Toggle */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, border: "1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={() => setBillingCycle('monthly')} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: "none", background: !isYearly ? "rgba(76,201,255,0.12)" : "transparent", color: !isYearly ? "#4cc9ff" : "rgba(167,177,195,0.6)" }}>{t("pp_monthly")||"Monatlich"}</button>
                <button onClick={() => setBillingCycle('yearly')} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: "none", background: isYearly ? "rgba(16,185,129,0.12)" : "transparent", color: isYearly ? "#10b981" : "rgba(167,177,195,0.6)" }}>
                  {t("pp_yearly")||"Jährlich"} <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(16,185,129,0.1)", color: "#10b981", marginLeft: 4 }}>{t("pp_no_setup")||"Keine Setup-Gebühr"}</span>
                </button>
              </div>
            </div>

            {/* Promo Code */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              {!showPromoInput ? (
                <button onClick={() => setShowPromoInput(true)} style={{ background: "transparent", border: "none", color: "rgba(167,177,195,0.5)", fontSize: 11, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
                  {t("pp_have_promo") || "Promo-Code vorhanden?"}
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexDirection: "column" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                      placeholder="TRIAL-XXXX"
                      maxLength={12}
                      style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: `1px solid ${promoError ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`, color: "#fff", fontSize: 13, fontFamily: "inherit", letterSpacing: "0.05em", width: 160, outline: "none" }}
                    />
                    <button onClick={() => { setShowPromoInput(false); setPromoCode(''); setPromoError(''); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "rgba(167,177,195,0.5)", fontSize: 11, cursor: "pointer", padding: "8px 12px", fontFamily: "inherit" }}>✕</button>
                  </div>
                  {promoError && <div style={{ fontSize: 11, color: "#ef4444" }}>{promoError}</div>}
                  {promoCode && !promoError && <div style={{ fontSize: 11, color: "#10b981" }}>30 Tage kostenlos — Setup Fee + Abo nach Trial</div>}
                </div>
              )}
            </div>

            {/* Plan Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {PLAN_ORDER.map((pk) => {
                const color = PLAN_C[pk];
                const features = PLAN_FEATURES[pk] || [];
                const isPro = pk === "pro";
                return (
                  <div key={pk} style={{
                    padding: isPro ? "26px 18px 20px" : "22px 18px 18px", borderRadius: 16, position: "relative",
                    background: isPro ? `linear-gradient(165deg, ${color}0c, ${color}04)` : "rgba(255,255,255,0.015)",
                    border: `1px solid ${isPro ? `${color}35` : "rgba(255,255,255,0.05)"}`,
                    display: "flex", flexDirection: "column",
                    boxShadow: isPro ? `0 0 60px ${color}12, 0 8px 32px rgba(0,0,0,0.3)` : "0 2px 8px rgba(0,0,0,0.15)",
                    transform: isPro ? "scale(1.03)" : "none",
                    opacity: isPro ? 1 : 0.85,
                    transition: "opacity 0.2s, transform 0.2s",
                  }}
                  onMouseEnter={e => { if (!isPro) { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1.01)"; }}}
                  onMouseLeave={e => { if (!isPro) { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "none"; }}}
                  >
                    {isPro && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", padding: "4px 14px", borderRadius: 99, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: "#fff", boxShadow: `0 2px 12px ${color}40` }}>{t("pp_popular")||"MOST POPULAR"}</div>}

                    <div style={{ fontWeight: 800, fontSize: 13, color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{PLAN_LABELS[pk]}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "rgba(232,238,252,0.95)", marginBottom: 2 }}>
                      {(() => { const prices = { core: 690, pro: 990, operations: 1490, enterprise: 2500 }; const m = prices[pk] || 0; return isYearly ? `€${(m * 12).toLocaleString('de-DE')}` : PLAN_PRICE[pk]; })()}<span style={{ fontSize: 12, fontWeight: 500, color: "rgba(167,177,195,0.7)" }}>{isYearly ? "/Jahr" : "/mo"}</span>
                    </div>
                    <div style={{ fontSize: 10, color: isYearly ? "rgba(16,185,129,0.5)" : "rgba(167,177,195,0.65)", marginBottom: 16 }}>
                      {isYearly ? (t("pp_no_setup_fee")||"Keine Setup-Gebühr") : `+ ${t("pp_setup")||"€1.990 Setup-Gebühr (einmalig)"}`}
                    </div>

                    <div style={{ flex: 1, marginBottom: 18 }}>
                      {features.map((f, i) => (
                        <div key={i} style={{ fontSize: 11, color: "rgba(167,177,195,0.75)", padding: "4px 0", display: "flex", alignItems: "flex-start", gap: 7 }}>
                          <span style={{ color, fontSize: 10, marginTop: 1, flexShrink: 0 }}>✓</span><span>{f}</span>
                        </div>
                      ))}
                    </div>

                    {pk === "enterprise" ? (
                      <button onClick={() => handleSelectPlan(pk)} style={{
                        width: "100%", padding: "11px 0", borderRadius: 10,
                        background: "rgba(255,255,255,0.03)", border: `1px solid ${color}20`, color,
                        fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      }}>{t("plan_contact_us")||"Contact us"}</button>
                    ) : (
                      <button onClick={() => handleSelectPlan(pk)} disabled={promoLoading} style={{
                        width: "100%", padding: isPro ? "12px 0" : "11px 0", borderRadius: 10,
                        background: isPro ? `linear-gradient(135deg, ${color}, ${color}cc)` : `${color}10`,
                        border: isPro ? "none" : `1px solid ${color}20`, color: isPro ? "#fff" : color,
                        fontWeight: 700, fontSize: isPro ? 14 : 12, cursor: promoLoading ? "default" : "pointer", fontFamily: "inherit",
                        boxShadow: isPro ? `0 4px 20px ${color}35` : "none",
                        transition: "box-shadow 0.2s", opacity: promoLoading ? 0.6 : 1,
                      }}>{promoLoading ? "..." : (t("pp_activate")||"Activate Plan")}</button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reactivation clarity */}
            {isForced && (
              <div style={{ textAlign: "center", marginTop: 20, padding: "14px 20px", borderRadius: 12, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}>
                <div style={{ fontSize: 11, color: "rgba(16,185,129,0.7)", lineHeight: 1.7 }}>
                  {t("pp_reactivation")||"Once activated, your system resumes instantly — incoming WhatsApp messages are processed, patients re-enter your pipeline, and automations continue."}
                </div>
              </div>
            )}

            {/* Logout — minimal */}
            {isForced && (
              <div style={{ textAlign: "center", marginTop: 14 }}>
                <button onClick={() => { if (ctx.handleLogout) ctx.handleLogout(); }} style={{ padding: "6px 18px", background: "transparent", color: "rgba(200,215,240,0.2)", fontWeight: 400, fontSize: 11, border: "none", cursor: "pointer" }}>
                  {t("lt_logout")||"Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      );
    })()}

    <div style={{ display: "flex", height: "calc(100vh / 1.04)", background: "var(--bg-app)", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "var(--text-primary)", overflow: "hidden", transition: "background .25s ease, color .25s ease", ...(ctx.workspaceState === 'trial_expired' || ctx.showPlanPicker ? { filter: "blur(3px)", pointerEvents: "none" } : {}) }}>
      {toast && <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, padding: "12px 24px", borderRadius: 12, background: "var(--bg-card-solid)", border: `1px solid ${(typeof toast === 'object' ? toast.type : 'success') === 'error' ? 'var(--danger-muted)' : 'var(--success-muted)'}`, color: (typeof toast === 'object' ? toast.type : 'success') === 'error' ? 'var(--danger)' : 'var(--success)', fontWeight: 700, fontSize: 14, boxShadow: "var(--shadow-md)" }}>{(typeof toast === 'object' ? toast.type : 'success') === 'error' ? '✕' : '✓'} {typeof toast === 'object' ? toast.msg : toast}</div>}

      {/* ── Doctor: New Task Popup (global, any view) ── */}
      {doctorAlert && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9998, background: "rgba(15,22,35,0.97)", borderBottom: "2px solid rgba(255,138,42,0.3)", backdropFilter: "blur(12px)" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,138,42,0.12)", border: "1px solid rgba(255,138,42,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚕️</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#ff8a2a" }}>{ctx.t("doctor_alert_title") || "Neuer Patient zur Bewertung"}</div>
                <div style={{ fontSize: 13, color: "rgba(232,238,252,0.95)", marginTop: 1 }}>{doctorAlert.name}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setDoctorAlert(null); if (ctx.setView) ctx.setView("doctor_portal"); }} style={{ padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg,#ff8a2a,#ff6b00)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(255,138,42,0.3)" }}>{ctx.t("review_now")||"Review Now"}</button>
              <button onClick={() => setDoctorAlert(null)} style={{ padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.7)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{ctx.t("ob_skip")||"Later"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SUCCESS / DOPAMINE SCREEN ═══ */}
      {successModal && <div style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={() => setSuccessModal(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
        <div style={{ position: "relative", maxWidth: 420, width: "90vw", borderRadius: 20, background: "#162032", border: "1px solid rgba(16,185,129,0.15)", overflow: "hidden", animation: "slI .3s ease", textAlign: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          <div style={{ padding: "32px 28px 20px", background: "linear-gradient(135deg,rgba(16,185,129,0.08),rgba(76,201,255,0.04))" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: "#10b981" }}>{successModal.type === "booking" ? "Appointment Booked!" : successModal.type === "deposit" ? "Deposit Received!" : "Treatment Completed!"}</h2>
            <p style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", margin: 0 }}>via AI Assistant</p>
          </div>
          <div style={{ padding: "20px 28px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", marginBottom: 4 }}>Patient</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{successModal.lead?.name || "—"}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", marginBottom: 4 }}>Treatment</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{successModal.treatment || "—"}</div>
              </div>
            </div>
            {successModal.revenue && <div style={{ padding: 16, borderRadius: 14, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(16,185,129,0.6)", textTransform: "uppercase", marginBottom: 4 }}>Revenue</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#10b981" }}>{successModal.revenue}</div>
            </div>}
            <div style={{ padding: 12, borderRadius: 12, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.1)", marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)" }}>🤖 AI handled <span style={{ color: "#4cc9ff", fontWeight: 800 }}>{clinic?.stats?.aiHandled || 82}%</span> of conversations automatically this week</div>
            </div>
            <button onClick={() => setSuccessModal(null)} style={{ width: "100%", padding: 14, borderRadius: 14, background: "linear-gradient(135deg,#10b981,#059669)", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(16,185,129,0.25)" }}>Continue →</button>
          </div>
        </div>
      </div>}
      <style>{`
        @keyframes aiPulse{0%,80%{opacity:.3}40%{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes urgGlow{0%,100%{border-color:rgba(251,191,36,0.08)}50%{border-color:rgba(251,191,36,0.35)}}
        @keyframes emptyDayBlink{0%,100%{background:rgba(251,191,36,0.03);border-color:rgba(251,191,36,0.12);box-shadow:0 0 0 rgba(251,191,36,0)}50%{background:rgba(251,191,36,0.12);border-color:rgba(251,191,36,0.45);box-shadow:0 0 8px rgba(251,191,36,0.15)}}
        @keyframes progFill{from{width:0}to{width:100%}}
        @keyframes slI{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .ai-dot{width:6px;height:6px;border-radius:99px;background:#4cc9ff;animation:aiPulse 1.2s ease-in-out infinite}
        .ai-dot:nth-child(2){animation-delay:.2s}
        .ai-dot:nth-child(3){animation-delay:.4s}
        .empty-day{animation:emptyDayBlink 2s ease-in-out infinite}
        *::-webkit-scrollbar{width:5px}
        *::-webkit-scrollbar-track{background:transparent}
        *::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px}
        *::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.12)}
        ::selection{background:rgba(76,201,255,0.15);color:#fff}
      `}</style>
      {selLead && <PatientPanel />}{selAppt && ApptDrawer()}
      {/* ═══ INVOICE CREATION MODAL ═══ */}
      {invoiceModal && (() => { const lead = getLeadById(invoiceModal); if (!lead) return null; return <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={() => setInvoiceModal(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
        <div style={{ position: "relative", width: "min(520px,90vw)", background: "#162032", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28, animation: "slI .2s ease", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div><div style={{ fontSize: 18, fontWeight: 800 }}>🧾 Create Invoice</div><div style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", marginTop: 2 }}>for {lead.name} — {lead.treatment}</div></div>
            <button onClick={() => setInvoiceModal(null)} style={{ background: "none", border: "none", color: "rgba(167,177,195,0.7)", fontSize: 20, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 6 }}>Line Items / Description</div>
            <textarea id="invItems" name="invItems" value={invItems} onChange={e => setInvItems(e.target.value)} rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical" }} placeholder="FUE Hair Transplant 3000 grafts&#10;Hotel package (3 nights)&#10;Airport transfer" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 6 }}>Net Amount (€)</div>
              <input id="invAmount" name="invAmount" type="number" value={invAmount} onChange={e => setInvAmount(e.target.value)} placeholder="2800" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 6 }}>VAT %</div>
              <div style={{ display: "flex", gap: 8 }}>
                <select id="invVat" name="invVat" value={["0", "8", "19", "20"].includes(String(invVat)) ? invVat : "custom"} onChange={e => { if (e.target.value === "custom") { setInvVat(""); } else { setInvVat(e.target.value); } }} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "pointer" }}>
                  <option value="0">0% (International)</option>
                  <option value="8">8% (Turkey)</option>
                  <option value="19">19% (Germany)</option>
                  <option value="20">20% (UK)</option>
                  <option value="custom">Custom</option>
                </select>
                {!["0", "8", "19", "20"].includes(String(invVat)) && <input type="number" min="0" max="100" placeholder="%" value={invVat} onChange={e => setInvVat(e.target.value)} style={{ width: 80, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(76,201,255,0.2)", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box", textAlign: "center" }} autoFocus />}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 6 }}>Total (Gross)</div>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", fontSize: 16, fontWeight: 800, color: "#10b981" }}>€{((parseInt(invAmount) || 0) + (parseInt(invAmount) || 0) * (parseInt(invVat) || 0) / 100).toLocaleString()}</div>
            </div>
          </div>
          {/* Deposit option */}
          <div style={{ padding: 12, borderRadius: 10, background: "rgba(167,107,255,0.04)", border: "1px solid rgba(167,107,255,0.1)", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>💳 Generate Stripe Deposit Link?</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[25, 50].map(pct => <button key={pct} onClick={() => setInvDeposit(String(Math.round((parseInt(invAmount) || 0) * pct / 100)))} style={{ padding: "4px 10px", borderRadius: 6, background: invDeposit === String(Math.round((parseInt(invAmount) || 0) * pct / 100)) ? "rgba(167,107,255,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${invDeposit === String(Math.round((parseInt(invAmount) || 0) * pct / 100)) ? "rgba(167,107,255,0.3)" : "rgba(255,255,255,0.08)"}`, color: invDeposit === String(Math.round((parseInt(invAmount) || 0) * pct / 100)) ? "#a78bfa" : "rgba(167,177,195,0.7)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{pct}% — €{Math.round((parseInt(invAmount) || 0) * pct / 100)}</button>)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => {
              const net = parseInt(invAmount) || 0; if (!net) { showT("Enter an amount"); return; }
              const inv = createInvoice(lead.id, invItems, net, parseInt(invVat) || 0);
              if (inv && invDeposit) { generateDepositLink(lead.id, parseInt(invDeposit)); }
              if (inv) setInvoiceModal(null);
            }} style={{ flex: 1, padding: "12px 20px", borderRadius: 12, background: "linear-gradient(135deg,#10b981,#059669)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>🧾 Create Invoice{invDeposit ? " + Deposit Link" : ""}</button>
            <button onClick={() => setInvoiceModal(null)} style={{ padding: "12px 20px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.6)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{ctx.t("cancel") || "Cancel"}</button>
          </div>
        </div>
      </div>; })()}

      {/* ═══ PAYMENT LINK MODAL ═══ */}
      {paymentModal && (() => { const lead = getLeadById(paymentModal.leadId); if (!lead) return null; const amt = parseInt(payAmount) || 0; return <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={() => setPaymentModal(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
        <div style={{ position: "relative", width: "min(440px,90vw)", background: "#0d1220", border: "1px solid rgba(0,180,216,0.2)", borderRadius: 20, padding: 0, overflow: "hidden", animation: "slI .2s ease" }}>
          <div style={{ padding: "20px 24px", background: "linear-gradient(135deg,rgba(0,180,216,0.08),rgba(76,201,255,0.04))", borderBottom: "1px solid rgba(0,180,216,0.12)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#00B4D8,#4cc9ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 800, boxShadow: "0 4px 12px rgba(0,180,216,0.3)" }}>💳</div>
              <div><div style={{ fontSize: 16, fontWeight: 800 }}>{ctx.t("pay_generate_link")}</div><div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", marginTop: 1 }}>{ctx.t("pay_for")} {lead.name} — {lead.treatment}</div></div>
            </div>
          </div>
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 6 }}>{ctx.t("pay_amount")}</div>
                <input id="payAmount" name="payAmount" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,180,216,0.15)", color: "#fff", fontFamily: "inherit", fontSize: 18, fontWeight: 800, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 6 }}>{ctx.t("pay_currency")}</div>
                <select id="payCurrency" name="payCurrency" value={payCurrency} onChange={e => setPayCurrency(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(0,180,216,0.15)", color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 700, outline: "none", boxSizing: "border-box", cursor: "pointer" }}>
                  <option value="EUR">€ EUR</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option><option value="TRY">₺ TRY</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {[250, 500, 1000].map(a => <button key={a} onClick={() => setPayAmount(String(a))} style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: payAmount === String(a) ? "rgba(0,180,216,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${payAmount === String(a) ? "rgba(0,180,216,0.25)" : "rgba(255,255,255,0.06)"}`, color: payAmount === String(a) ? "#4cc9ff" : "rgba(167,177,195,0.7)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>€{a}</button>)}
              {lead.reviewData?.price && <button onClick={() => { const p = parseInt(lead.reviewData.price.replace(/[^0-9]/g, "")) || 0; setPayAmount(String(Math.round(p * 0.25))); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: "rgba(167,107,255,0.08)", border: "1px solid rgba(167,107,255,0.15)", color: "#a78bfa", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>25%</button>}
            </div>
            <div style={{ padding: 14, borderRadius: 12, background: "rgba(0,180,216,0.04)", border: "1px solid rgba(0,180,216,0.1)", display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 26, borderRadius: 5, background: "linear-gradient(135deg,#00B4D8,#4cc9ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 800 }}>💳</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#4cc9ff" }}>{payCurrency === "EUR" ? "€" : payCurrency === "USD" ? "$" : payCurrency === "GBP" ? "£" : "₺"}{amt.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)" }}>{ctx.t("pay_stripe_pending")}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { sendPaymentLink(amt, lead.id, "manual"); setPaymentModal(null); }} style={{ flex: 1, padding: "12px 20px", borderRadius: 12, background: "linear-gradient(135deg,#00B4D8,#0096c7)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(0,180,216,0.25)" }}>💳 {ctx.t("pay_send_now")}</button>
              <button onClick={() => setPaymentModal(null)} style={{ padding: "12px 20px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.6)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{ctx.t("cancel") || "Cancel"}</button>
            </div>
          </div>
        </div>
      </div>; })()}

      {/* Sidebar */}
      <div style={{ width: sidebar ? 260 : 68, minWidth: sidebar ? 260 : 68, background: "#131c2e", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", transition: "all .3s cubic-bezier(.4,0,.2,1)", overflow: "visible", position: "relative" }}>
        <button onClick={() => setSidebar(!sidebar)} title={sidebar ? "Collapse sidebar" : "Expand sidebar"} style={{ position: "absolute", top: "50%", right: -14, transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", background: IS_CLIENT_MODE ? "#4cc9ff" : "#d4af37", border: "2px solid #131c2e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, boxShadow: IS_CLIENT_MODE ? "0 2px 8px rgba(76,201,255,0.3)" : "0 2px 8px rgba(212,175,55,0.3)", transition: "all .3s cubic-bezier(.4,0,.2,1)", padding: 0 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: sidebar ? "rotate(0deg)" : "rotate(180deg)", transition: "transform .3s cubic-bezier(.4,0,.2,1)" }}><path d="M9 3L5 7L9 11" stroke="#131c2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div style={{ padding: sidebar ? "20px 18px 16px" : "20px 14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{ width: sidebar ? 38 : 34, height: sidebar ? 38 : 34, borderRadius: 10, objectFit: "cover", flexShrink: 0, transition: "all .3s cubic-bezier(.4,0,.2,1)", border: "2px solid rgba(255,255,255,0.12)", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }} />
            {sidebar && <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "0.06em", background: IS_CLIENT_MODE ? "linear-gradient(135deg,#fff 30%,rgba(76,201,255,0.85) 100%)" : "linear-gradient(135deg,#fff 30%,rgba(212,175,55,0.9) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FLOWMATIX</span>}
          </div>
          {sidebar && isAdmin && !isOperator && !IS_CLIENT_MODE && <div style={{ marginTop: 12 }}><select id="adminClinic" name="adminClinic" value={adminClinic} onChange={e => { setAdminClinic(e.target.value); setSelChat(null); setAiConfigData(null); }} style={{ width: "100%", padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#fff", fontFamily: "inherit", fontSize: 12, outline: "none", cursor: "pointer", transition: "border-color .2s" }}>{clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
        </div>
        {!isOperator && canAccess("action_needed") && <div onClick={() => setView("action_needed")} style={{ margin: "10px 10px 0", padding: sidebar ? "12px 14px" : "10px 0", borderRadius: 10, background: totalActions > 0 ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.04)", border: `1px solid ${totalActions > 0 ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.08)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: sidebar ? "flex-start" : "center", gap: 10, transition: "all .2s" }}
          onMouseEnter={e => e.currentTarget.style.background = totalActions > 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = totalActions > 0 ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.04)"}
        >
          <div style={{ width: 26, height: 26, borderRadius: 8, background: totalActions > 0 ? "#ef4444" : "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{totalActions > 0 ? totalActions : "\u2713"}</div>
          {sidebar && <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: totalActions > 0 ? "#ef4444" : "#10b981" }}>{totalActions > 0 ? (t("action_needed") || "Aktion Erforderlich") : (t("all_clear") || "Alles OK")}</div>
            {totalActions > 0 && <div style={{ fontSize: 10, color: "rgba(167,177,195,0.6)", marginTop: 1 }}>{totalActions} {t("tasks_open") || "offene Aufgaben"}</div>}
          </div>}
        </div>}
        <nav style={{ flex: 1, padding: "8px 10px", overflowY: "auto" }}>{(() => {
          const navItems = [...nav];
          return navItems;
        })().map((it, idx) => { if (it === "div") return <div key={idx} style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "10px 8px" }} />; const isOpSub = it.id.startsWith("op_") && it.id !== "op_prep"; const isActive = isOpSub ? (view === "operator" && opSubTab === it.id.replace("op_", "")) : (view === it.id); return <div key={it.id} data-tour={it.id} onClick={() => { if (isOpSub) { setView("operator"); setOpSubTab(it.id.replace("op_", "")); } else if (it.id === "operator") { setView("operator"); setOpSubTab("dashboard"); } else { setView(it.id); } setSelChat(null); if (it.id === "settings") setSettingsData(clinic ? { ...clinic } : null); if (it.id === "ai_control") setAiConfigData(clinic?.aiConfig ? { ...clinic.aiConfig } : null); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: sidebar ? "10px 14px" : "10px 0", justifyContent: sidebar ? "flex-start" : "center", borderRadius: 10, cursor: "pointer", marginBottom: 3, background: isActive ? (IS_CLIENT_MODE ? "rgba(76,201,255,0.08)" : "rgba(212,175,55,0.08)") : "transparent", borderLeft: isActive ? "3px solid " + (IS_CLIENT_MODE ? (it.color || "#4cc9ff") : (it.color || "#d4af37")) : "3px solid transparent", color: isActive ? "#fff" : it.color || "rgba(167,177,195,0.75)", fontWeight: isActive ? 700 : 500, fontSize: 14, transition: "all .2s cubic-bezier(.4,0,.2,1)", letterSpacing: isActive ? "0.01em" : "0" }}><span style={{ fontSize: 16, flexShrink: 0, opacity: isActive ? 1 : 0.7, transition: "opacity .2s" }}>{it.icon}</span>{sidebar && <span style={{ textTransform: "capitalize" }}>{it.l}</span>}{sidebar && it.badge && <span style={{ marginLeft: "auto", background: "#ff8a2a", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 99, minWidth: 16, textAlign: "center" }}>{it.badge}</span>}</div>; })}</nav>
        <div style={{ padding: sidebar ? "14px 16px" : "14px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>{sidebar ? <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: 10, background: getAvatarGradient(user.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>{getInitials(user.name)}</div><div><div style={{ fontWeight: 600, color: "rgba(232,238,252,0.95)", fontSize: 13 }}>{user.name}</div><div style={{ fontSize: 10, color: "rgba(167,177,195,0.75)", fontWeight: 500 }}>{isAdmin ? "Admin" : clinic?.name}</div></div></div><button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.7)", cursor: "pointer", fontSize: 13, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }} title="Logout">↗</button></div> : <div onClick={handleLogout} style={{ cursor: "pointer", textAlign: "center", color: "rgba(167,177,195,0.6)", fontSize: 13, width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>↗</div>}</div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* ═══ IMPERSONATION BANNER ═══ */}
        {(() => {
          if (sessionStorage.getItem('fm_impersonation') !== 'true') return null;
          let info = {};
          try { info = JSON.parse(sessionStorage.getItem('fm_impersonation_info') || '{}'); } catch {}
          return (
            <div style={{ background: "linear-gradient(90deg, #ff8a2a, #ef4444)", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, zIndex: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14 }}>{"⚠\uFE0F"}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>IMPERSONATION AKTIV</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Du bist als <strong>{info.user || "Klinik"}</strong> eingeloggt</span>
                {info.reason && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", padding: "1px 8px", borderRadius: 4, background: "rgba(0,0,0,0.2)" }}>Grund: {info.reason}</span>}
              </div>
              <button onClick={() => { window.close(); }} style={{ padding: "5px 16px", borderRadius: 6, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Impersonation beenden</button>
            </div>
          );
        })()}
        {/* ═══ TOP BAR — Redesigned ═══ */}
        <div className="fm-topbar" style={{ height: 52, minHeight: 52, borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-topbar)", display: "flex", alignItems: "center", padding: "0 24px", gap: 0, flexShrink: 0, minWidth: 0, position: "relative", zIndex: 100, transition: "background .25s ease, border-color .25s ease" }}>

          {/* ── LEFT: Global Search (hidden for doctor) ── */}
          <div style={{ flex: "0 0 340px", position: "relative" }}>
            {!isOperator && effectiveRole !== "doctor" && <><input id="searchQuery" name="searchQuery" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }} onFocus={(e) => { setSearchOpen(true); e.target.style.borderColor = "var(--border-input-focus)"; }} onBlur={(e) => { setTimeout(() => setSearchOpen(false), 200); e.target.style.borderColor = "var(--border-subtle)"; }} placeholder={t("search_placeholder") || `Search... (${navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}+K)`} style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12, fontWeight: 500, outline: "none", boxSizing: "border-box", transition: "border-color .2s" }} />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-muted)" }}>🔍</span></>}
            {searchOpen && searchResults.length > 0 && <div style={{ position: "absolute", top: "100%", left: 0, width: "100%", maxHeight: 320, overflowY: "auto", marginTop: 4, borderRadius: 10, background: "var(--bg-card-solid)", border: "1px solid var(--border-strong)", zIndex: 100, boxShadow: "var(--shadow-lg)" }}>
              <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{searchResults.length} Ergebnisse</span><span style={{ fontSize: 9, color: "var(--text-faint)" }}>ESC</span></div>
              {searchResults.map((r, i) => <div key={i} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 8, alignItems: "center" }} onMouseDown={() => {
                if (r.type === "lead") setSelLead(r.id);
                else if (r.type === "appt") setSelAppt(r.id);
                else if (r.type === "chat") { setView("inbox"); setSelChat(r.data); }
                setSearchQuery(""); setSearchOpen(false);
              }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ fontSize: 14 }}>{r.icon}</span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 12 }}>{r.label}</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>{r.sub}</div></div>
              </div>)}
            </div>}
          </div>

          {/* ── CENTER: Operational KPIs (hidden for doctor) ── */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 6 }}>
            {!isOperator && effectiveRole !== "doctor" && [
              { label: ({de:"Bewertungen",en:"Reviews",tr:"İncelemeler"}[lang]||"Bewertungen"), value: myLeads.filter(l => l.convStatus === "needs_medical_review").length, color: "#ff8a2a", icon: "⚕️", view: "action_needed" },
              { label: ({de:"Buchungen",en:"Bookings",tr:"Randevular"}[lang]||"Buchungen"), value: myLeads.filter(l => l.stage === "booked").length, color: "#10b981", icon: "📅", view: "appointments" },
              { label: ({de:"Neue Leads",en:"New Leads",tr:"Yeni Leadler"}[lang]||"Neue Leads"), value: myLeads.filter(l => l.stage === "new").length, color: "#4cc9ff", icon: "👤", view: "pipeline" },
            ].map((k, i) => <div key={i} onClick={() => setView(k.view)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, cursor: "pointer", background: "transparent", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = `${k.color}08`} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 14, fontWeight: 800, color: k.color, letterSpacing: "-0.02em" }}>{k.value}</span>
              <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>{k.label}</span>
            </div>)}
            {/* Operator badges */}
            {!IS_CLIENT_MODE && isOperator && <>
              <div onClick={() => { setView("operator"); setOpSubTab("trials"); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 6, cursor: "pointer", background: pendingApps > 0 ? "rgba(255,183,77,0.06)" : "transparent" }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: pendingApps > 0 ? "#fbbf24" : "#10b981", boxShadow: `0 0 6px ${pendingApps > 0 ? "#fbbf24" : "#10b981"}` }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: pendingApps > 0 ? "#fbbf24" : "#10b981" }}>{pendingApps > 0 ? pendingApps + " Trials" : "All Good"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#d4af37" }}>{clinics.length}</span>
                <span style={{ fontSize: 10, color: "rgba(212,175,55,0.4)", fontWeight: 600 }}>Clinics</span>
              </div>
            </>}
          </div>

          {/* ── RIGHT: System Status + Account ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Patient usage meter (hidden for doctor) */}
            {!isOperator && effectiveRole !== "doctor" && clinic && (() => {
              const limit = clinic.patient_limit || (PLAN_LIMITS[clinic.plan] || PLAN_LIMITS.core).patients || 1000;
              const pct = Math.round((myLeads.length / limit) * 100);
              return <div onClick={() => setView("subscription")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }} title={`${myLeads.length} / ${limit} Patienten`}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--progress-track)", overflow: "hidden" }}>
                  <div style={{ height: 4, borderRadius: 2, width: `${Math.min(100, pct)}%`, background: pct > 80 ? "var(--error)" : pct > 50 ? "var(--warning)" : "var(--text-muted)", transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{myLeads.length}/{limit}</span>
              </div>;
            })()}

            {/* System status */}
            {IS_CLIENT_MODE && <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px" }} title="System Online">
              <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--success)", boxShadow: "var(--shadow-glow-success)" }} />
              <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>Online</span>
            </div>}

            {/* Demo/Live toggle */}
            {IS_CLIENT_MODE && clinic && effectiveRole === "admin" && <button data-tour="demo_toggle" onClick={toggleDemoMode} disabled={demoLoading} style={{ padding: "3px 10px", borderRadius: 6, background: demoMode ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.04)", border: `1px solid ${demoMode ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.08)"}`, color: demoMode ? "#ef4444" : "#10b981", fontWeight: 700, fontSize: 9, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, letterSpacing: "0.04em" }}><span style={{ width: 5, height: 5, borderRadius: 99, background: demoMode ? "#ef4444" : "#10b981", flexShrink: 0 }} />{demoLoading ? "..." : demoMode ? "DEMO" : "LIVE"}</button>}

            {/* Notification bell (hidden for doctor) */}
            {IS_CLIENT_MODE && effectiveRole !== "doctor" && <div style={{ position: "relative" }}>
              <button data-notif-bell onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) markNotifsRead(); }} style={{ width: 32, height: 32, borderRadius: 8, background: notifOpen ? "var(--info-subtle)" : "transparent", border: "1px solid var(--border-subtle)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--text-muted)", position: "relative", transition: "all .15s" }}>🔔
                {unreadNotifs > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 14, height: 14, borderRadius: 99, background: "#ff8a2a", color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{unreadNotifs}</span>}
              </button>
              {notifOpen && <div data-notif-panel style={{ position: "absolute", top: "100%", right: 0, width: 360, maxHeight: 400, overflowY: "auto", marginTop: 6, borderRadius: 12, background: "var(--bg-modal)", border: "1px solid var(--border-default)", zIndex: 9000, boxShadow: "var(--shadow-xl)" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 700, fontSize: 13 }}>{t("notif_title")}</div>
                {myNotifs.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)", fontSize: 12 }}>{t("no_notifications")}</div>}
                {myNotifs.map(n => <div key={n.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 8, alignItems: "flex-start", background: n.read ? "transparent" : "var(--info-subtle)" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: `${NOTIF_COLORS[n.type] || "rgba(167,177,195,0.1)"}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>{NOTIF_ICONS[n.type] || "🔔"}</div>
                  <div><div style={{ fontSize: 12, lineHeight: 1.4, color: n.read ? "var(--text-secondary)" : "var(--text-primary)" }}>{n.text}</div><div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{timeAgo(n.time)}</div></div>
                </div>)}
              </div>}
            </div>}

            {/* Clock (operator only) */}
            {isOperator && <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gold-text)", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>{clockNow.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>}
            {/* Theme toggle (operator only) */}
            {isOperator && <ThemeToggle />}
            {/* User menu (gear icon trigger) */}
            {(() => {
              const LANGS = IS_CLIENT_MODE ? [{ code: "de", flag: "🇩🇪", label: "Deutsch" }, { code: "en", flag: "🇬🇧", label: "English" }, { code: "tr", flag: "🇹🇷", label: "Türkçe" }] : [{ code: "en", flag: "🇬🇧", label: "English" }, { code: "de", flag: "🇩🇪", label: "Deutsch" }];
              return <div style={{ position: "relative" }} data-gear-menu>
                <button onClick={e => { const dd = e.currentTarget.nextSibling; dd.style.display = dd.style.display === "none" ? "block" : "none"; }} style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: "1px solid var(--border-subtle)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--text-muted)" }}>
                  ⚙️
                </button>
                <div style={{ display: "none", position: "absolute", top: 38, right: 0, minWidth: 180, background: "var(--bg-modal)", border: "1px solid var(--border-default)", borderRadius: 10, padding: 6, zIndex: 200, boxShadow: "var(--shadow-xl)" }}>
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{user.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{user.email || (isAdmin ? "Admin" : clinic?.name)}</div>
                  </div>
                  {effectiveRole !== "doctor" && <button onClick={() => setView("settings")} style={{ width: "100%", padding: "7px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", border: "none", color: "var(--text-muted)", textAlign: "left", fontFamily: "inherit" }}>⚙️ {t("settings_label")}</button>}
                  <button onClick={() => { setShowPwModal(true); document.querySelector('[data-gear-menu] > div:last-child').style.display = 'none'; }} style={{ width: "100%", padding: "7px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", border: "none", color: "var(--text-muted)", textAlign: "left", fontFamily: "inherit" }}>🔑 {t("change_password") || "Passwort ändern"}</button>
                  {/* Language picker inside menu */}
                  <div style={{ padding: "4px 12px", display: "flex", gap: 4 }}>
                    {LANGS.map(l => <button key={l.code} onClick={() => { ctx.setLang(l.code); ctx.setLoginLang?.(l.code); try { localStorage.setItem("fm_lang", l.code); } catch {} window.location.reload(); }} title={l.label} style={{ width: 28, height: 28, borderRadius: 6, background: lang === l.code ? "var(--info-subtle)" : "transparent", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{l.flag}</button>)}
                  </div>
                  <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />
                  <button onClick={handleLogout} style={{ width: "100%", padding: "7px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", border: "none", color: "var(--error-text)", textAlign: "left", fontFamily: "inherit" }}>↗ {t("sign_out")}</button>
                </div>
              </div>;
            })()}

            {/* Demo reset (small) */}
          </div>
        </div>

        {/* Password Change Modal */}
        {showPwModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99990, background: 'var(--overlay-heavy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowPwModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: 16, padding: 28, width: 380, maxWidth: '90vw' }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>{'🔑'} {t('change_password') || 'Passwort ändern'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Aktuelles Passwort <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                  <input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>{t('new_password') || 'Neues Passwort'}</label>
                  <input type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} placeholder="Mindestens 8 Zeichen" />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>{t('confirm_password') || 'Passwort bestätigen'}</label>
                  <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handlePwChange()} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              {pwToast && <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: pwToast.type === 'error' ? 'var(--error-subtle)' : 'var(--success-subtle)', color: pwToast.type === 'error' ? 'var(--error)' : 'var(--success)', fontSize: 12, fontWeight: 600 }}>{pwToast.msg}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowPwModal(false)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>{t('cancel') || 'Abbrechen'}</button>
                <button onClick={handlePwChange} disabled={pwLoading} style={{ background: pwLoading ? 'var(--brand-muted)' : 'var(--brand)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 20px', cursor: pwLoading ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>{pwLoading ? '...' : 'Speichern'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Trial Countdown Banner ── */}
        {IS_CLIENT_MODE && trialCountdown && !demoMode && ctx.workspaceState !== 'active' && ctx.workspaceState !== 'trial_expired' && (
          <div style={{ padding: "8px 20px", background: "rgba(76,201,255,0.04)", borderBottom: "1px solid rgba(76,201,255,0.08)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13 }}>⏱</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: trialCountdown.includes('hours') || trialCountdown.includes('today') ? "#ff8a2a" : "rgba(200,215,240,0.7)" }}>{trialCountdown}</span>
            </div>
            <button onClick={() => ctx.setShowPlanPicker(true)} style={{ padding: "4px 14px", background: "transparent", border: "1px solid rgba(76,201,255,0.15)", borderRadius: 8, color: "#4CC9FF", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {t("skip_trial")||"Skip trial — choose plan"}
            </button>
          </div>
        )}

        {/* ── Post-Activation Banner (active but no WA connected) ── */}
        {ctx.workspaceState === 'active' && !demoMode && view === 'dashboard' && clinic && !clinic.waName && (
          <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(76,201,255,0.04))", borderBottom: "1px solid rgba(16,185,129,0.2)", flexShrink: 0 }}>
            <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#10b981", marginBottom: 6 }}>{t("lt_clinic_active")}</div>
              <p style={{ fontSize: 13, color: "rgba(200,215,240,0.55)", margin: "0 0 16px", lineHeight: 1.5 }}>
                {t("lt_clinic_active_sub")}
              </p>
              <button onClick={() => ctx.setView('whatsapp_setup')} style={{ padding: "10px 28px", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontWeight: 700, fontSize: 14, border: "none", borderRadius: 10, cursor: "pointer" }}>
                {t("lt_connect_wa")}
              </button>
            </div>
          </div>
        )}

        {/* Live Test Panel removed — moved into DashboardView as a secondary
            section below the demo hero. This used to be a global header banner
            that took the top of the dashboard; now it lives inline so the
            demo hero is the first thing the trial user sees. */}

        {/* ── Activation UI (workspace_state === 'activation_pending') ── */}
        {ctx.showActivation && ctx.workspaceState === 'activation_pending' && (
          <div style={{ position: "fixed", inset: 0, zIndex: 99998, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => ctx.setShowActivation(false)}>
            <div style={{ background: "linear-gradient(165deg, #0d1520, #131d2e)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 20, padding: "40px 36px", maxWidth: 480, width: "90%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h2 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>{t("lt_patient_captured")}</h2>
              <p style={{ color: "rgba(200,215,240,0.6)", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
                {t("lt_patient_captured_sub")}<br/>
                
              </p>
              <button onClick={() => { ctx.setShowActivation(false); ctx.setShowBillingConfirm(true); }} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontWeight: 700, fontSize: 15, border: "none", borderRadius: 12, cursor: "pointer", marginBottom: 10 }}>
                {t("lt_go_live")}
              </button>
              <button onClick={() => ctx.setShowActivation(false)} style={{ width: "100%", padding: "12px", background: "transparent", color: "rgba(200,215,240,0.7)", fontWeight: 500, fontSize: 14, border: "1px solid rgba(200,215,240,0.1)", borderRadius: 12, cursor: "pointer" }}>
                {t("lt_continue_testing")}
              </button>
              <p style={{ color: "rgba(200,215,240,0.7)", fontSize: 12, marginTop: 14 }}>
                {t("lt_test_limit_note")}
              </p>
            </div>
          </div>
        )}

        {/* Billing confirm removed — plan picker used instead */}

        {/* Per-view demo banner */}
        {demoMode && (() => {
          const _db = {
            "dashboard": [t("demo_banner_dashboard_title") || "Hier siehst du dein komplettes System in Echtzeit", t("demo_banner_dashboard_desc") || "Teste alles mit Beispieldaten und aktiviere dein System für echte Patienten. Wenn du bereit bist, wechsle oben rechts auf LIVE."],
            "action_needed": [t("demo_banner_tasks_title") || "Aufgaben erscheinen nur wenn etwas fehlt", t("demo_banner_tasks_desc") || "Alles läuft automatisch – du greifst nur bei Ausnahmen ein."],
            "inbox": [t("demo_banner_inbox_title") || "Hier landen alle WhatsApp Nachrichten automatisch", t("demo_banner_inbox_desc") || "Im Live-Modus antwortet dein Bot sofort auf echte Patientenanfragen."],
            "pipeline": [t("demo_banner_pipeline_title") || "Hier siehst du jeden Patienten von Anfrage bis OP", t("demo_banner_pipeline_desc") || "Alle Schritte werden automatisch organisiert."],
            "appointments": [t("demo_banner_appts_title") || "Alle Buchungen werden automatisch hier erstellt", t("demo_banner_appts_desc") || "Dein Kalender bleibt immer aktuell."],
            "op_prep": [t("demo_banner_opprep_title") || "Welche Patienten sind bereit für die OP?", t("demo_banner_opprep_desc") || "Vorbereitung wird automatisch verfolgt."],
            "whatsapp_setup": [t("demo_banner_wa_title") || "Dein Bot übernimmt alles automatisch", t("demo_banner_wa_desc") || "Aktiviere dein System für echte Patienten."],
            "settings": [t("demo_banner_settings_title") || "Hier richtest du dein System einmal ein", t("demo_banner_settings_desc") || "Danach läuft alles im Hintergrund."],
          };
          const _t = _db[view];
          if (!_t) return null;
          return (
            <div style={{ padding: "14px 20px", background: "rgba(255,140,66,0.08)", borderBottom: "1px solid rgba(255,140,66,0.25)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: "#FFB07A", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#FFB07A" }}>{_t[0]}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,140,66,0.45)", marginLeft: 14 }}>{_t[1]}</div>
              </div>
              {view === "dashboard" && effectiveRole === "admin" && <button onClick={toggleDemoMode} disabled={demoLoading} style={{ background: "#FF8C42", color: "#fff", borderRadius: 8, padding: "8px 16px", fontWeight: 500, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap" }}>{demoLoading ? "..." : (t("go_live_now") || "Jetzt live gehen")}</button>}
            </div>
          );
        })()}
        {/* SetupBanner removed — dashboard is now a sales experience, not a
            settings page. The detailed checklist still lives in DashboardView
            as the optional "System weiter optimieren" card. */}

        {/* ── "Zurück zum Setup" pill — visible on the deep-link target views ── */}
        {clinic && IS_CLIENT_MODE && isFromSetup() && view !== "dashboard" && (
          <div style={{
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12,
            padding: "10px 32px",
            background: "linear-gradient(135deg, rgba(76,201,255,0.07), rgba(76,201,255,0.02))",
            borderBottom: "1px solid rgba(76,201,255,0.18)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14 }}>⚙️</span>
              <div style={{ fontSize: 12.5, color: "rgba(232,238,252,0.85)", fontWeight: 600 }}>
                {(() => { const v = t("from_setup_hint"); return v && v !== "from_setup_hint" ? v : "Du bist hier vom Setup. Schließe diesen Schritt ab und geh zurück."; })()}
              </div>
            </div>
            <button
              onClick={() => { clearFromSetup(); ctx.setView("dashboard"); }}
              style={{
                padding: "6px 14px", borderRadius: 8,
                background: "rgba(76,201,255,0.12)",
                border: "1px solid rgba(76,201,255,0.28)",
                color: "#4cc9ff",
                fontSize: 11.5, fontWeight: 700, fontFamily: "inherit",
                cursor: "pointer", whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(76,201,255,0.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(76,201,255,0.12)"; }}
            >
              {(() => { const v = t("back_to_setup"); return v && v !== "back_to_setup" ? v : "Zurück zum Setup"; })()} →
            </button>
          </div>
        )}
        <div ref={scrollRef} style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {view === "action_needed" && clinic && canAccess("action_needed") && <ErrorBoundary t={t}><ActionNeededView /></ErrorBoundary>}
        {view === "dashboard" && clinic && canAccess("dashboard") && <ErrorBoundary t={t}><DashboardView /></ErrorBoundary>}
        {view === "inbox" && canAccess("inbox") && <ErrorBoundary t={t}><InboxView /></ErrorBoundary>}
        {view === "pipeline" && canAccess("pipeline") && <ErrorBoundary t={t}><PipelineView /></ErrorBoundary>}
        {view === "patients_db" && clinic && canAccess("patients_db") && <ErrorBoundary t={t}><PatientsPage /></ErrorBoundary>}
        {view === "appointments" && canAccess("appointments") && <ErrorBoundary t={t}><AppointmentsPage /></ErrorBoundary>}
        {view === "op_prep" && clinic && canAccess("op_prep") && <ErrorBoundary t={t}><OpPrepView /></ErrorBoundary>}
        {view === "review_board" && clinic && canAccess("review_board") && <ErrorBoundary t={t}><ReviewBoard /></ErrorBoundary>}
        {view === "doctor_portal" && clinic && canAccess("doctor_portal") && <ErrorBoundary t={t}><DoctorTasksView /></ErrorBoundary>}
        {view === "archive" && clinic && canAccess("archive") && <ErrorBoundary t={t}><ArchiveView /></ErrorBoundary>}
        {view === "analytics" && clinic && canAccess("analytics") && <ErrorBoundary t={t}><AnalyticsView /></ErrorBoundary>}
        {view === "ai_control" && clinic && canAccess("ai_control") && <ErrorBoundary t={t}><AIControlView /></ErrorBoundary>}
        {view === "whatsapp_setup" && clinic && canAccess("whatsapp_setup") && <ErrorBoundary t={t}><WhatsAppSetupPage /></ErrorBoundary>}
        {view === "setup" && clinic && canAccess("setup") && <ErrorBoundary t={t}><SetupView /></ErrorBoundary>}
        {view === "automations" && clinic && canAccess("automations") && <ErrorBoundary t={t}><AutomationsView /></ErrorBoundary>}
        {view === "files" && clinic && canAccess("files") && <ErrorBoundary t={t}><FilesView /></ErrorBoundary>}
        {view === "revenue" && clinic && canAccess("revenue") && <ErrorBoundary t={t}><RevenueView /></ErrorBoundary>}
        {view === "payments" && clinic && canAccess("payments") && <ErrorBoundary t={t}><PaymentsView /></ErrorBoundary>}
        {view === "addons" && clinic && canAccess("addons") && <ErrorBoundary t={t}><AddonsView /></ErrorBoundary>}
        {view === "subscription" && clinic && canAccess("billing") && <ErrorBoundary t={t}><SubscriptionView /></ErrorBoundary>}
        {view === "settings" && canAccess("settings") && <ErrorBoundary t={t}><SettingsView /></ErrorBoundary>}
        {view === "audit_log" && canAccess("audit_log") && <ErrorBoundary t={t}><AuditLogView /></ErrorBoundary>}
        {view === "support" && canAccess("support") && <ErrorBoundary t={t}><SupportView /></ErrorBoundary>}
        {view === "manual" && canAccess("settings") && <ErrorBoundary t={t}><div style={{position:"fixed",inset:0,zIndex:900,display:"flex"}}><div onClick={()=>setView("dashboard")} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} /><div style={{position:"relative",marginLeft:"auto",width:"min(900px,85vw)",height:"100vh",overflowY:"auto",background:"#fff",boxShadow:"-4px 0 20px rgba(0,0,0,0.3)"}}><ManualPage isPublic={false} /></div></div></ErrorBoundary>}
        {view === "operator" && (isAdmin || isOperator) && !IS_CLIENT_MODE && <ErrorBoundary t={t}><OperatorPanel /></ErrorBoundary>}
        </div></div>
    </div>
    {/* Tour disabled — not in production v368 */}
    {IS_CLIENT_MODE && user && <AISupportWidget />}
    </ErrorBoundary>
  );
}
