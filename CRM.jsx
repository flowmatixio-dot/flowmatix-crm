import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabase";
import * as fmApi from "./src/api/client";

/* ═══ EXTRACTED MODULES ═══ */
import { escHtml, genId, timeAgo, getMonthDays, fmtDate, isToday } from "./src/utils/helpers";
import { Btn, IC, Section } from "./src/components/shared/index";
import { T } from "./src/data/i18n";
import {
  AUTH_BG, DATA_VERSION, CONV_STATUS, STAGES,
  APPT_C, TL, DAYS, MONTHS, NOTIF_ICONS, NOTIF_COLORS, PRICE_MAP,
  MSG_TEMPLATES, ROLE_PERMISSIONS, PERM_LABELS, DRIVER_STATUS, PLAN_LIMITS,
} from "./src/data/constants";
import {
  DEMO_ACCOUNTS, CLINICS_INIT, LEADS_INIT, INVOICES_INIT,
  APPOINTMENTS_INIT, MSGS_INIT,
} from "./src/data/demoData";

/* ═══ CONTEXT + EXTRACTED VIEWS ═══ */
import { AppContext } from "./src/context/AppContext";
import AuditLogView from "./src/components/AuditLog/AuditLogView";
import SupportView from "./src/components/Support/SupportView";
import AutomationsView from "./src/components/Automations/AutomationsView";
import FilesView from "./src/components/Files/FilesView";
import AnalyticsView from "./src/components/Analytics/AnalyticsView";
import SettingsView from "./src/components/Settings/SettingsView";
import BillingView from "./src/components/Billing/BillingView";
import AddonsView from "./src/components/Addons/AddonsView";
import PatientPanel from "./src/components/Patients/PatientPanel";
import RevenueView from "./src/components/Revenue/RevenueView";
import ProductTour, { TourWelcomeModal } from "./src/components/Tour/ProductTour";
import OperatorApp from "./src/components/Operator/OperatorApp.jsx";
import DashboardView from "./src/components/Dashboard/DashboardView";
import InboxView from "./src/components/Inbox/InboxView";
import AppointmentsView from "./src/components/Appointments/AppointmentsView";
import AIControlView from "./src/components/AIControl/AIControlView";
import WhatsAppSetup from "./src/components/SetupGuide/WhatsAppSetup";
import ErrorBoundary from "./src/components/shared/ErrorBoundary";

/* ═══ AUTH REDIRECT — Supabase whitelists this in Dashboard → Auth → URL Configuration ═══
 * Add BOTH to Supabase Redirect URLs:
 *   http://localhost:5173  (dev)
 *   https://app.flowmatix.io  (production)
 * Supabase appends #access_token=... to this URL after magic link click.
 * No /auth/callback route needed — we parse the hash in useEffect. */
const AUTH_CALLBACK_URL = window.location.origin;

/* Data version — bump this to force localStorage reset on next load */
(()=>{try{if(localStorage.getItem("fm_data_v")!==DATA_VERSION){["fm_clinics","fm_leads","fm_appts","fm_msgs","fm_audit","fm_magic","fm_invoices"].forEach(k=>localStorage.removeItem(k));localStorage.setItem("fm_data_v",DATA_VERSION);}}catch{}})();

/* ======== MAIN ======== */
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [clinics, setClinics] = useState(()=>{try{const s=localStorage.getItem("fm_clinics");return s?JSON.parse(s):CLINICS_INIT;}catch{return CLINICS_INIT;}});
  const [leads, setLeads] = useState(()=>{try{const s=localStorage.getItem("fm_leads");return s?JSON.parse(s):LEADS_INIT;}catch{return LEADS_INIT;}});
  const [appts, setAppts] = useState(()=>{try{const s=localStorage.getItem("fm_appts");return s?JSON.parse(s):APPOINTMENTS_INIT;}catch{return APPOINTMENTS_INIT;}});
  const [msgs, setMsgs] = useState(()=>{try{const s=localStorage.getItem("fm_msgs");return s?JSON.parse(s):MSGS_INIT;}catch{return MSGS_INIT;}});
  const [selLead, setSelLead] = useState(null);
  const [selAppt, setSelAppt] = useState(null);
  const [selChat, setSelChat] = useState(null);
  const [dragItem, setDragItem] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const [sidebar, setSidebar] = useState(true);
  const [toast, setToast] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [adminClinic, setAdminClinic] = useState("c1");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginMode, setLoginMode] = useState("magic"); /* magic | password | forgot | sent */
  const [authLoading, setAuthLoading] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loginLang, setLoginLang] = useState("en");
  const [authCallbackMode, setAuthCallbackMode] = useState(null); /* null | 'processing' | 'recovery' | 'error' */
  const [authCallbackErr, setAuthCallbackErr] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [calView, setCalView] = useState("month");
  const [calDate, setCalDate] = useState(new Date());
  const [reviewGrafts, setReviewGrafts] = useState("");
  const [reviewPrice, setReviewPrice] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  /* NEW STATE */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [patientTab, setPatientTab] = useState("timeline");
  const [newNote, setNewNote] = useState("");
  const [aiConfigData, setAiConfigData] = useState(null);
  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");
  const [supportMsg, setSupportMsg] = useState("");
  const [lang, setLang] = useState(()=>localStorage.getItem("fm_lang")||"en");
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [onboardingDismissed, setOnboardingDismissed] = useState(()=>localStorage.getItem("fm_ob_dismissed")==="true");
  const [dismissedUsageWarnings, setDismissedUsageWarnings] = useState(()=>{try{return JSON.parse(localStorage.getItem("fm_usage_dismissed")||"{}");}catch{return{};}});
  const [dismissedRevSuggestion, setDismissedRevSuggestion] = useState(()=>localStorage.getItem("fm_rev_dismissed")==="true");
  const [resetEmail, setResetEmail] = useState("");
  const [opSubTab, setOpSubTab] = useState("dashboard");
  const [showResetForm, setShowResetForm] = useState(false);
  const [inboxFilter, setInboxFilter] = useState("open"); // open, needs_action, ai_handling, resolved, all
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Receptionist");
  const [auditLog, setAuditLog] = useState(()=>{try{const s=localStorage.getItem("fm_audit");return s?JSON.parse(s):[];}catch{return[];}});
  const [showRevenue, setShowRevenue] = useState(true);
  const [msgPageSize] = useState(50);
  const [msgPage, setMsgPage] = useState({});
  const [magicLinks, setMagicLinks] = useState(()=>{try{const s=localStorage.getItem("fm_magic");return s?JSON.parse(s):{};}catch{return{};}});
  const [invoices, setInvoices] = useState(()=>{try{const s=localStorage.getItem("fm_invoices");return s?JSON.parse(s):INVOICES_INIT;}catch{return INVOICES_INIT;}});
  const [invoiceModal, setInvoiceModal] = useState(null); /* leadId when creating */
  const [invAmount, setInvAmount] = useState("");
  const [invItems, setInvItems] = useState("");
  const [invVat, setInvVat] = useState("19");
  const [invDeposit, setInvDeposit] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(()=>{try{const v=localStorage.getItem("fm_env");if(!v){localStorage.setItem("fm_env","demo");return true;}return v!=="live";}catch{return true;}}); /* ← getEnv(): ONLY switchEnv button may change this */
  const [paymentModal, setPaymentModal] = useState(null); /* {leadId, amount, currency} */
  const [payAmount, setPayAmount] = useState("500");
  const [payCurrency, setPayCurrency] = useState("EUR");
  const [templateModal, setTemplateModal] = useState(false);
  const [templateFilter, setTemplateFilter] = useState("all");
  const [successModal, setSuccessModal] = useState(null); /* {lead, type} */
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourCompleted, setTourCompleted] = useState(()=>{try{return localStorage.getItem("fm_tour_done")==="1";}catch{return false;}});
  const [pendingApps, setPendingApps] = useState(0);

  /* i18n helper */
  const t = (key) => (T[lang]||T.en)[key] || (T.en)[key] || key;

  /* Get convStatus from lead (single source of truth — never from msgs) */
  const getCS = (chat) => {
    if (!chat?.leadId) return "ai_active";
    const lead = leads.find(l => l.id === chat.leadId);
    return lead?.convStatus || "ai_active";
  };

  const chatEnd = useRef(null);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[selChat,newMsg]);

  /* localStorage persistence */
  useEffect(()=>{try{localStorage.setItem("fm_clinics",JSON.stringify(clinics));}catch{}},[clinics]);
  useEffect(()=>{try{localStorage.setItem("fm_leads",JSON.stringify(leads));}catch{}},[leads]);
  useEffect(()=>{try{localStorage.setItem("fm_appts",JSON.stringify(appts));}catch{}},[appts]);
  useEffect(()=>{try{localStorage.setItem("fm_msgs",JSON.stringify(msgs));}catch{}},[msgs]);
  useEffect(()=>{try{localStorage.setItem("fm_audit",JSON.stringify(auditLog.slice(-500)));}catch{}},[auditLog]);
  useEffect(()=>{try{localStorage.setItem("fm_magic",JSON.stringify(magicLinks));}catch{}},[magicLinks]);
  useEffect(()=>{try{localStorage.setItem("fm_invoices",JSON.stringify(invoices));}catch{}},[invoices]);
  useEffect(()=>{localStorage.setItem("fm_lang",lang);},[lang]);
  useEffect(()=>{try{localStorage.setItem("fm_usage_dismissed",JSON.stringify(dismissedUsageWarnings));}catch{}},[dismissedUsageWarnings]);
  useEffect(()=>{localStorage.setItem("fm_rev_dismissed",dismissedRevSuggestion?"true":"false");},[dismissedRevSuggestion]);

  /* Browser notifications permission */
  useEffect(()=>{if("Notification" in window && Notification.permission==="default"){Notification.requestPermission();}},[]);
  /* Cmd+K / Ctrl+K global search shortcut */
  useEffect(()=>{
    const handler=(e)=>{if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();const el=document.getElementById("searchQuery");if(el){el.focus();setSearchOpen(true);}}if(e.key==="Escape"){setSearchOpen(false);setSearchQuery("");document.getElementById("searchQuery")?.blur();}};    window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);
  },[]);

  const browserNotify=(title,body)=>{if("Notification" in window && Notification.permission==="granted"){new Notification(title,{body,icon:"/Flowmatix-Logo.png"});}};

  /* Reset data helper */
  const resetAllData=()=>{localStorage.removeItem("fm_clinics");localStorage.removeItem("fm_leads");localStorage.removeItem("fm_appts");localStorage.removeItem("fm_msgs");localStorage.removeItem("fm_audit");localStorage.removeItem("fm_magic");localStorage.removeItem("fm_invoices");setClinics(CLINICS_INIT);setLeads(LEADS_INIT);setAppts(APPOINTMENTS_INIT);setMsgs(MSGS_INIT);setAuditLog([]);setMagicLinks({});setInvoices(INVOICES_INIT);showT("Data reset to defaults");};

  /* ═══ AUDIT LOG ═══ */
  const logAction=(action,target,details)=>{
    const entry={id:genId(),time:new Date().toISOString(),user:user?.name||"System",role:user?.role||"system",clinicId:activeClinicId,action,target,details};
    setAuditLog(prev=>[entry,...prev].slice(0,500));
  };

  /* ═══ PDF TREATMENT PLAN ═══ */
  const generatePDF=(lead)=>{
    if(!lead?.reviewData)return;
    const c=clinic;
    const method=lead.treatment?.includes("FUE")?"FUE (Follicular Unit Extraction)":lead.treatment?.includes("DHI")?"DHI (Direct Hair Implantation)":lead.treatment;
    const grafts=lead.reviewData.grafts||"3500 Grafts";
    const price=lead.reviewData.price||"€3,250";
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:'Helvetica Neue',sans-serif;padding:0;color:#1a1a2e;max-width:760px;margin:0 auto}
      .top-bar{height:6px;background:linear-gradient(90deg,#00B4D8,#4cc9ff,#00B4D8);margin-bottom:32px}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:0 40px;margin-bottom:32px}
      .logo-box{display:flex;align-items:center;gap:12px}
      .logo-icon{width:42px;height:42px;border-radius:10px;object-fit:cover}
      .logo-text{font-size:22px;font-weight:800;color:#00B4D8;letter-spacing:2px}
      .logo-sub{font-size:11px;color:#888;letter-spacing:3px;text-transform:uppercase}
      .clinic-info{text-align:right;font-size:12px;color:#666;line-height:1.6}
      .content{padding:0 40px}
      .title{font-size:24px;font-weight:800;color:#1a1a2e;margin:0 0 4px}
      .subtitle{color:#888;font-size:14px;margin-bottom:28px}
      .grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-bottom:28px}
      .card{background:#f8f9fa;padding:16px;border-radius:12px;border-top:3px solid #00B4D8}
      .card-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
      .card-value{font-size:15px;font-weight:700}
      .plan-box{background:linear-gradient(135deg,#f0fbff,#e6f7ff);border:2px solid #00B4D8;border-radius:16px;padding:28px;margin:0 0 28px}
      .plan-title{font-size:20px;font-weight:800;color:#00B4D8;margin:0 0 20px;display:flex;align-items:center;gap:8px}
      .plan-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px}
      .plan-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px}
      .plan-value{font-size:16px;font-weight:700;margin-top:4px}
      .plan-price{font-size:32px;font-weight:900;color:#00B4D8;margin-top:4px}
      .notes-box{background:#fff;border:1px solid #e0e7ef;border-radius:10px;padding:16px;margin-top:20px;font-size:14px;line-height:1.7;color:#444}
      .next-steps{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0}
      .next-steps h3{color:#16a34a;margin:0 0 12px;font-size:15px}
      .next-steps ol{margin:0;padding-left:20px;color:#444;font-size:13px;line-height:2}
      .legal{font-size:12px;color:#888;line-height:1.7;margin:20px 0}
      .footer{padding:20px 40px;border-top:2px solid #00B4D8;display:flex;justify-content:space-between;align-items:center;margin-top:32px}
      .stamp{display:inline-block;border:2px solid #00B4D8;color:#00B4D8;padding:6px 16px;border-radius:8px;font-weight:800;font-size:13px;letter-spacing:1px}
      .ft-text{font-size:11px;color:#999;text-align:right}
    </style></head><body>
    <div class="top-bar"></div>
    <div class="hdr">
      <div class="logo-box"><img class="logo-icon" src="/Flowmatix-Logo.png" alt="Flowmatix"/><div><div class="logo-text">${escHtml(c?.name||"FLOWMATIX")}</div><div class="logo-sub">Treatment Plan</div></div></div>
      <div class="clinic-info"><strong>${escHtml(c?.name||"")}</strong><br>${escHtml(c?.address||"")}<br>${escHtml(c?.phone||"")}<br>${escHtml(c?.clinicEmail||"")}</div>
    </div>
    <div class="content">
      <div class="title">Personalized Treatment Plan</div>
      <div class="subtitle">Prepared on ${new Date().toLocaleDateString("en",{year:"numeric",month:"long",day:"numeric"})} by ${escHtml(lead.assigned||"Medical Team")}</div>
      <div class="grid4">
        <div class="card"><div class="card-label">Patient</div><div class="card-value">${escHtml(lead.name)}</div></div>
        <div class="card"><div class="card-label">Date of Birth</div><div class="card-value">${escHtml(lead.dob||"—")}</div></div>
        <div class="card"><div class="card-label">Country</div><div class="card-value">${escHtml(lead.country||"—")}</div></div>
        <div class="card"><div class="card-label">Language</div><div class="card-value">${escHtml(lead.language||"—")}</div></div>
      </div>
      <div class="plan-box">
        <div class="plan-title">⚕️ Recommended Treatment</div>
        <div class="plan-grid">
          <div><div class="plan-label">Procedure</div><div class="plan-value">${escHtml(grafts)}</div></div>
          <div><div class="plan-label">Method</div><div class="plan-value">${escHtml(method)}</div></div>
          <div><div class="plan-label">Estimated Cost</div><div class="plan-price">${escHtml(price)}</div></div>
        </div>
        ${lead.reviewData.notes?`<div class="notes-box"><strong>Medical Notes:</strong><br>${escHtml(lead.reviewData.notes)}</div>`:""}
      </div>
      <div class="next-steps"><h3>✅ Next Steps</h3><ol><li>Review this plan and reply with any questions</li><li>Confirm your preferred appointment date</li><li>Complete the 25% deposit to secure your booking</li><li>Book your flights — our team will assist with hotel arrangements</li></ol></div>
      <div class="legal">This treatment plan is a medical recommendation based on evaluation of submitted photographs and patient history. Final assessment will be made during the in-person consultation. Prices are subject to confirmation during consultation. All medical procedures comply with local regulatory standards.</div>
    </div>
    <div class="footer"><div class="stamp">✦ ${escHtml((c?.name||"FLOWMATIX").toUpperCase())} CERTIFIED</div><div class="ft-text">${escHtml(c?.name||"Flowmatix")} · ${escHtml(c?.website||"flowmatix.io")}<br>Auto-generated by Flowmatix CRM · Plan ID: TP-${Date.now().toString(36).toUpperCase()}</div></div>
    </body></html>`;
    const w=window.open("","_blank");
    if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
    logAction("pdf_generated",lead.name,`Treatment plan: ${grafts}, ${price}`);
    showT("PDF generated");
  };

  /* ═══ MAGIC LINK (Photo Upload) ═══ */
  const generateMagicLink=(leadId)=>{
    const lead=leads.find(l=>l.id===leadId);if(!lead)return;
    const token=genId();
    const link=`${window.location.origin}/upload/${token}`;
    setMagicLinks(prev=>({...prev,[leadId]:{token,link,created:new Date().toISOString(),status:"pending",views:[]}}));
    /* Copy to clipboard */
    navigator.clipboard?.writeText(link).then(()=>showT("Link copied!")).catch(()=>showT("Link generated"));
    addTL(leadId,"system",`Photo upload link sent`);
    logAction("magic_link_created",lead.name,`Upload link: ${link}`);
  };

  /* ═══ REVENUE HELPERS ═══ */
  const estimateRevenue=(appt)=>{
    const key=Object.keys(PRICE_MAP).find(k=>appt.treatment?.toLowerCase().includes(k.toLowerCase()));
    return key?PRICE_MAP[key]:2000; /* default €2k for unknown */
  };
  const getWeekRevenue=(weekStart)=>{
    const end=new Date(weekStart);end.setDate(end.getDate()+7);
    return myAppts.filter(a=>{const d=new Date(a.date);return d>=weekStart&&d<end&&a.status!=="cancelled";}).reduce((sum,a)=>sum+estimateRevenue(a),0);
  };

  /* ═══ PATIENT INVOICING ═══ */
  const nextInvoiceNr=()=>{
    const yr=new Date().getFullYear();
    const existing=invoices.filter(i=>i.nr?.startsWith(`INV-${yr}`));
    return `INV-${yr}-${String(existing.length+1).padStart(4,"0")}`;
  };

  const createInvoice=(leadId,items,totalNet,vatPct)=>{
    const lead=leads.find(l=>l.id===leadId);if(!lead)return null;
    const c=clinic;
    const vatAmount=Math.round(totalNet*vatPct/100);
    const totalGross=totalNet+vatAmount;
    const inv={
      id:genId(), nr:nextInvoiceNr(), clinicId:activeClinicId,
      leadId, patientName:lead.name, patientEmail:lead.email,
      treatment:lead.treatment, items,
      net:totalNet, vatPct, vatAmount, gross:totalGross,
      currency:"EUR", status:"unpaid",
      created:new Date().toISOString(),
      clinicName:c?.name||"", clinicAddress:c?.address||"",
      clinicEmail:c?.clinicEmail||"", clinicPhone:c?.phone||"",
      dueDate:new Date(Date.now()+14*86400000).toISOString().slice(0,10),
      payments:[]
    };
    setInvoices(prev=>[inv,...prev]);
    addTL(leadId,"system",`Invoice ${inv.nr} created — €${totalGross.toLocaleString()}`);
    logAction("invoice_created",lead.name,`${inv.nr}: €${totalGross} (net €${totalNet} + ${vatPct}% VAT)`);
    showT(`Invoice ${inv.nr} created`);
    return inv;
  };

  const markInvoicePaid=(invId,method)=>{
    setInvoices(prev=>prev.map(i=>i.id===invId?{...i,status:"paid",paidDate:new Date().toISOString(),paidMethod:method||"cash",payments:[...i.payments,{amount:i.gross,date:new Date().toISOString(),method:method||"cash"}]}:i));
    const inv=invoices.find(i=>i.id===invId);
    if(inv){addTL(inv.leadId,"system",`Invoice ${inv.nr} marked as paid (${method||"cash"})`);logAction("invoice_paid",inv.patientName,`${inv.nr}: €${inv.gross} via ${method||"cash"}`);}
    showT("Marked as paid");
  };

  const generateInvoicePDF=(inv)=>{
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:'Helvetica Neue',sans-serif;padding:40px;color:#1a1a2e;max-width:720px;margin:0 auto;font-size:14px}
      .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #4cc9ff;padding-bottom:20px;margin-bottom:30px}
      .logo{font-size:22px;font-weight:800;color:#4cc9ff;letter-spacing:2px}
      .meta{text-align:right;font-size:12px;color:#666}
      .inv-nr{font-size:20px;font-weight:800;color:#1a1a2e;margin:0 0 4px}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}
      .box{background:#f8f9fa;padding:16px;border-radius:10px}
      .lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
      .val{font-size:14px;font-weight:600}
      table{width:100%;border-collapse:collapse;margin:24px 0}
      th{text-align:left;padding:10px 12px;background:#f1f5f9;font-size:11px;text-transform:uppercase;color:#666;letter-spacing:0.5px}
      td{padding:10px 12px;border-bottom:1px solid #e5e7eb}
      .total-row td{font-weight:700;border-top:2px solid #1a1a2e;font-size:15px}
      .paid{display:inline-block;background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:6px;font-weight:700;font-size:12px}
      .unpaid{display:inline-block;background:#fef2f2;color:#dc2626;padding:4px 12px;border-radius:6px;font-weight:700;font-size:12px}
      .bank{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;margin:20px 0;font-size:13px}
      .bank strong{color:#0369a1}
      .ft{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#999;text-align:center}
    </style></head><body>
    <div class="hdr"><div class="logo">${escHtml(inv.clinicName||"FLOWMATIX")}</div><div class="meta">${escHtml(inv.clinicAddress||"")}<br>${escHtml(inv.clinicPhone||"")}<br>${escHtml(inv.clinicEmail||"")}</div></div>
    <div class="inv-nr">INVOICE ${escHtml(inv.nr)}</div>
    <div style="color:#666;margin-bottom:24px">Date: ${new Date(inv.created).toLocaleDateString("en",{year:"numeric",month:"long",day:"numeric"})} · Due: ${escHtml(inv.dueDate)} · <span class="${inv.status==="paid"?"paid":"unpaid"}">${escHtml(inv.status.toUpperCase())}</span></div>
    <div class="grid2">
      <div class="box"><div class="lbl">Bill to</div><div class="val">${escHtml(inv.patientName)}</div><div style="color:#666;font-size:13px;margin-top:4px">${escHtml(inv.patientEmail||"")}</div></div>
      <div class="box"><div class="lbl">Treatment</div><div class="val">${escHtml(inv.treatment)}</div></div>
    </div>
    <table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>
    ${(inv.items||inv.treatment).split("\n").map(item=>`<tr><td>${escHtml(item)}</td><td style="text-align:right">—</td></tr>`).join("")}
    <tr><td style="text-align:right;color:#666">Subtotal (net)</td><td style="text-align:right">€${inv.net?.toLocaleString()}</td></tr>
    <tr><td style="text-align:right;color:#666">VAT ${inv.vatPct}%</td><td style="text-align:right">€${inv.vatAmount?.toLocaleString()}</td></tr>
    <tr class="total-row"><td style="text-align:right">Total</td><td style="text-align:right">€${inv.gross?.toLocaleString()}</td></tr>
    </tbody></table>
    <div class="bank"><strong>Payment Details</strong><br>Bank: ${escHtml(clinic?.bankName||"Deutsche Bank")} · IBAN: ${escHtml(clinic?.iban||"—")}<br>BIC: ${escHtml(clinic?.bic||"—")} · Ref: ${escHtml(inv.nr)}<br><br>Or pay online via the Stripe link sent to your WhatsApp.</div>
    ${inv.status==="paid"?`<div style="text-align:center;margin:24px 0"><div class="paid" style="font-size:16px;padding:8px 24px">✓ PAID — ${inv.paidDate?new Date(inv.paidDate).toLocaleDateString():""}${inv.paidMethod?" via "+escHtml(inv.paidMethod):""}</div></div>`:""}
    <div class="ft">${escHtml(inv.clinicName||"Flowmatix Clinic")}<br>Generated by Flowmatix CRM · Invoice ${escHtml(inv.nr)}</div>
    </body></html>`;
    const w=window.open("","_blank");
    if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
    logAction("invoice_pdf",inv.patientName,`Invoice ${inv.nr} PDF generated`);
  };

  const generateStripeLink=(inv)=>{
    if(!inv)return;
    /* ⚠️ DEMO: Not a real Stripe link — replace with actual Stripe Checkout in production */
    const link=`#DEMO-stripe-link/cs_demo_${inv.id.substring(0,8)}?amount=${inv.gross}&currency=eur&ref=${inv.nr}`;
    navigator.clipboard?.writeText(link).then(()=>showT("Stripe link copied — paste in WhatsApp!")).catch(()=>showT("Stripe link generated"));
    setInvoices(prev=>prev.map(i=>i.id===inv.id?{...i,stripeLink:link,stripeLinkCreated:new Date().toISOString()}:i));
    /* Simulate bot message in chat */
    setMsgs(prev=>{
      const cm=[...(prev[activeClinicId]||[])];
      const idx=cm.findIndex(c=>c.leadId===inv.leadId);
      if(idx>-1){cm[idx]={...cm[idx],msgs:[...cm[idx].msgs,{text:`🤖 KI: Stripe-Zahlungslink über €${inv.gross} (${inv.nr}) wurde an ${inv.patientName} gesendet.`,time:new Date().toLocaleTimeString("de",{hour:"2-digit",minute:"2-digit"}),sender:"bot"}]};}
      return{...prev,[activeClinicId]:cm};
    });
    addTL(inv.leadId,"system",`Stripe payment link sent for ${inv.nr}`);
    logAction("stripe_link",inv.patientName,`Payment link: €${inv.gross} for ${inv.nr}`);
  };

  const generateDepositLink=(leadId,amount)=>{
    const lead=leads.find(l=>l.id===leadId);if(!lead)return;
    /* ⚠️ DEMO: Not a real Stripe link — replace with actual Stripe Checkout in production */
    const link=`#DEMO-stripe-deposit/cs_dep_${genId().substring(0,8)}?amount=${amount}&currency=eur&desc=Deposit_${lead.name.replace(/\s/g,"_")}`;
    navigator.clipboard?.writeText(link).then(()=>showT(`Deposit link €${amount} copied!`)).catch(()=>showT("Deposit link generated"));
    /* Simulate bot message in chat */
    setMsgs(prev=>{
      const cm=[...(prev[activeClinicId]||[])];
      const idx=cm.findIndex(c=>c.leadId===leadId);
      if(idx>-1){cm[idx]={...cm[idx],msgs:[...cm[idx].msgs,{text:`🤖 KI: Stripe-Anzahlungslink über €${amount} wurde an ${lead.name} gesendet. "Hallo ${lead.name}, um deinen Termin zu sichern, überweise bitte die Anzahlung von €${amount} über diesen Link."`,time:new Date().toLocaleTimeString("de",{hour:"2-digit",minute:"2-digit"}),sender:"bot"}]};}
      return{...prev,[activeClinicId]:cm};
    });
    addTL(leadId,"system",`Deposit link €${amount} generated`);
    logAction("deposit_link",lead.name,`Deposit: €${amount}`);
  };

  /* ═══ AUTH CALLBACK DETECTION (no router — hash-based) ═══ */
  /* Supabase redirects back to window.location.origin with:
     - Hash: #access_token=...&type=magiclink  (magic link)
     - Hash: #access_token=...&type=recovery   (password reset)
     - Search: ?code=...                        (PKCE flow)
     detectSessionInUrl:true in supabase.js auto-parses and creates session. */
  useEffect(()=>{
    const hash=window.location.hash;
    const search=window.location.search;
    const hasAuthToken=hash.includes("access_token")||search.includes("code=");
    if(hasAuthToken){
      const isRecovery=hash.includes("type=recovery")||search.includes("type=recovery");
      setAuthCallbackMode(isRecovery?"recovery":"processing");
    }
  },[]);

  useEffect(()=>{try{
    /* Restore API session from stored tokens (operator accounts) */
    if(fmApi.isAuthenticated()){
      const stored=localStorage.getItem("fm_api_user");
      if(stored){try{const u=JSON.parse(stored);const isOp=u.role==="platform_owner"||u.role==="admin";setUser({email:u.email,role:"admin",clinicId:isOp?null:"c1",name:u.name||u.email.split("@")[0],apiUser:true,apiRole:u.role,orgId:u.organizationId});if(isOp)setView("operator");setAuthLoading(false);return;}catch(e){fmApi.clearTokens();}}
    }
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session){
        resolveUser(session.user);
        /* Clean URL hash/params after successful auth (unless recovery — user needs to set password) */
        if(authCallbackMode&&authCallbackMode!=="recovery"){
          window.history.replaceState(null,"",window.location.pathname);
          setAuthCallbackMode(null);
        }
      }else setAuthLoading(false);
    }).catch(()=>setAuthLoading(false));
    const{data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{
      if(s){
        resolveUser(s.user);
        if(authCallbackMode&&authCallbackMode!=="recovery"){
          setTimeout(()=>{window.history.replaceState(null,"",window.location.pathname);setAuthCallbackMode(null);},300);
        }
      }else{setUser(null);setAuthLoading(false);}
    });
    const onSessionExpired=()=>{fmApi.clearTokens();setUser(null);setAuthLoading(false);};
    window.addEventListener("fm:session-expired",onSessionExpired);
    return()=>{subscription.unsubscribe();window.removeEventListener("fm:session-expired",onSessionExpired);};
  }catch(e){setAuthLoading(false);if(authCallbackMode)setAuthCallbackMode("error");}},[]);
  /* ═══ ROUTE AFTER LOGIN — checks onboarding_completed in DB ═══ */
  const routeAfterLogin=async(userId,clinicId)=>{
    if(!clinicId||isDemoMode)return; /* demo mode uses local setupStatus */
    try{
      const{data:clinic}=await supabase.from("clinics").select("onboarding_completed,setup_status").eq("id",clinicId).single();
      if(clinic){
        /* Map DB state → local setupStatus so existing UI gate works */
        const status=clinic.onboarding_completed?"live":(clinic.setup_status||"new");
        setClinics(cs=>cs.map(c=>c.id===clinicId?{...c,setupStatus:status}:c));
      }
    }catch(e){/* DB unavailable — fall through to local state */}
  };
  const resolveUser=async(au)=>{try{const{data:p}=await supabase.from("users").select("*").eq("id",au.id).single();if(p){setUser({email:au.email,role:p.role,clinicId:p.clinic_id,name:p.display_name||au.email});if(p.clinic_id){setAdminClinic(p.clinic_id);await routeAfterLogin(au.id,p.clinic_id);}}else{const adm=au.email==="admin@flowmatix.io";setUser({email:au.email,role:adm?"admin":"clinic_staff",clinicId:adm?null:"c1",name:au.email.split("@")[0]});}}catch(e){const adm=au.email==="admin@flowmatix.io";setUser({email:au.email,role:adm?"admin":"clinic_staff",clinicId:adm?null:"c1",name:au.email.split("@")[0]});}setAuthLoading(false);};
  const handleLogin=async()=>{setLoginErr("");setAuthLoading(true);
    /* 1. Try Flowmatix API login first (operator accounts) */
    try{const res=await fmApi.login(loginEmail,loginPass);if(res?.user){const u=res.user;const isOp=u.role==="platform_owner"||u.role==="admin";setUser({email:u.email,role:"admin",clinicId:isOp?null:"c1",name:u.name||u.email.split("@")[0],apiUser:true,apiRole:u.role,orgId:u.organizationId});if(isOp)setView("operator");setLang(loginLang);setAuthLoading(false);setAuditLog(prev=>[{id:genId(),time:new Date().toISOString(),user:u.name||u.email,role:u.role,clinicId:"admin",action:"login",target:"CRM",details:`API login from ${navigator.userAgent?.substring(0,50)}`},...prev]);return;}}catch(e){/* API login failed — continue to Supabase/demo */}
    /* 2. Live mode: try Supabase */
    if(!isDemoMode){try{const{error}=await supabase.auth.signInWithPassword({email:loginEmail,password:loginPass});if(!error){setLang(loginLang);return;}}catch(e){/* Supabase unavailable — try demo fallback below */}}
    /* 3. Demo accounts (works in both modes — fallback for Live when Supabase is down) */
    const demo=DEMO_ACCOUNTS.find(a=>a.email===loginEmail&&a.pass===loginPass);
    if(demo){setUser(demo);if(demo.clinicId)setAdminClinic(demo.clinicId);setLang(loginLang);setAuthLoading(false);setAuditLog(prev=>[{id:genId(),time:new Date().toISOString(),user:demo.name,role:demo.role,clinicId:demo.clinicId||"admin",action:"login",target:"CRM",details:`Logged in from ${navigator.userAgent?.substring(0,50)}`},...prev]);return;}
    setLoginErr(!isDemoMode?"Invalid credentials or Supabase unavailable.":"Invalid email or password.");setAuthLoading(false);};
  /* ═══ MAGIC LINK LOGIN (Live mode only) ═══ */
  const handleMagicLink=async()=>{
    if(!loginEmail.trim()){setLoginErr("Please enter your email.");return;}
    setLoginErr("");setAuthLoading(true);
    /* Demo mode: simulate magic link sent */
    if(isDemoMode){
      setAuthLoading(false);setLoginMode("sent");return;
    }
    try{
      const{error}=await supabase.auth.signInWithOtp({email:loginEmail.trim().toLowerCase(),options:{emailRedirectTo:AUTH_CALLBACK_URL}});
      setAuthLoading(false);
      if(error){setLoginErr(error.message);return;}
      setLoginMode("sent");
    }catch(e){setAuthLoading(false);setLoginErr("Could not send magic link. Check your connection.");}
  };
  /* Demo magic link "click" — simulates the callback + login */
  const handleDemoMagicClick=()=>{
    setAuthCallbackMode("processing");setLoginMode("magic");
    setTimeout(()=>{
      const demo=DEMO_ACCOUNTS.find(a=>a.email===loginEmail.trim().toLowerCase())||DEMO_ACCOUNTS.find(a=>a.role==="clinic_staff");
      setUser(demo);if(demo.clinicId)setAdminClinic(demo.clinicId);setLang(loginLang);
      setAuthCallbackMode(null);setAuthLoading(false);
    },2000);/* 2s spinner to simulate real flow */
  };
  /* ═══ FORGOT PASSWORD (Live mode only) ═══ */
  const handleForgotPw=async()=>{
    const email=(resetEmail||loginEmail).trim().toLowerCase();
    if(!email){setLoginErr("Enter your email first.");return;}
    setLoginErr("");setAuthLoading(true);
    try{
      const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:AUTH_CALLBACK_URL+"?type=recovery"});
      setAuthLoading(false);
      if(error){setLoginErr(error.message);return;}
      setLoginMode("sent");
    }catch(e){setAuthLoading(false);setLoginErr("Could not send reset link.");}
  };
  /* ═══ SET NEW PASSWORD (Recovery callback) ═══ */
  const handleSetPassword=async()=>{
    if(newPassword.length<8){setAuthCallbackErr("Password must be at least 8 characters");return;}
    if(newPassword!==confirmPassword){setAuthCallbackErr("Passwords do not match");return;}
    setAuthCallbackErr("");setAuthLoading(true);
    try{
      const{error}=await supabase.auth.updateUser({password:newPassword});
      setAuthLoading(false);
      if(error){setAuthCallbackErr(error.message);return;}
      /* Password set — clean URL and enter CRM */
      window.history.replaceState(null,"","/");
      setAuthCallbackMode(null);
      setNewPassword("");setConfirmPassword("");
      showT("Password set successfully!");
    }catch(e){setAuthLoading(false);setAuthCallbackErr("Could not update password.");}
  };
  /* Log patient profile opens */
  const openPatient=(lid)=>{setSelLead(lid);const l=leads.find(x=>x.id===lid);if(l)logAction("patient_opened",l.name,`Viewed profile (${l.treatment})`);};
  const openPatientPhotos=(lid)=>{const l=leads.find(x=>x.id===lid);if(l)logAction("photos_viewed",l.name,`Viewed ${l.photoUrls?.length||0} photos`);};
  /* ═══ COMPLETE ONBOARDING — sets local state + persists to Supabase ═══ */
  const completeOnboarding=(clinicId,showToast)=>{
    setClinics(cs=>cs.map(c=>c.id===clinicId?{...c,setupStatus:"live"}:c));
    if(showToast)showT(showToast);
    /* Persist to DB (non-blocking) */
    if(!isDemoMode){
      supabase.from("clinics").update({onboarding_completed:true,setup_status:"live"}).eq("id",clinicId).then(()=>{}).catch(()=>{});
    }
  };
  const handleLogout=async()=>{try{await fmApi.logout();}catch(e){}try{await supabase.auth.signOut();}catch(e){}fmApi.clearTokens();setUser(null);setLoginEmail("");setLoginPass("");setAuthCallbackMode(null);setNewPassword("");setConfirmPassword("");};

  const isAdmin=user?.role==="admin";
  const isOperator=isAdmin||!!(user?.apiUser);
  const activeClinicId=isAdmin?adminClinic:user?.clinicId;
  const clinic=clinics.find(c=>c.id===activeClinicId);
  const getClinicById=id=>clinics.find(c=>c.id===id);
  const getLeadById=id=>leads.find(l=>l.id===id);
  const getStageById=id=>STAGES.find(s=>s.id===id);
  const showT=useCallback(m=>{setToast(m);setTimeout(()=>setToast(null),2500);},[]);

  const myLeads=useMemo(()=>leads.filter(l=>l.clinic===activeClinicId),[leads,activeClinicId]);
  const myAppts=useMemo(()=>appts.filter(a=>a.clinic===activeClinicId),[appts,activeClinicId]);
  const allClinicMsgs=useMemo(()=>msgs[activeClinicId]||[],[msgs,activeClinicId]);
  const myMsgs=useMemo(()=>allClinicMsgs.filter(m=>{const cs=getCS(m);if(inboxFilter==="all")return true;if(inboxFilter==="resolved")return cs==="resolved"||cs==="closed";if(inboxFilter==="needs_action")return["needs_medical_review","waiting_for_clinic_reply","booking_pending","human_takeover"].includes(cs);if(inboxFilter==="ai_handling")return cs==="ai_active"||cs==="collecting_photos";return cs!=="resolved"&&cs!=="closed";}),[allClinicMsgs,inboxFilter,leads]);
  const unread=useMemo(()=>allClinicMsgs.filter(m=>m.unread).length,[allClinicMsgs]);

  /* Fetch pending applications count for operator badge */
  useEffect(()=>{
    if(!isOperator||!user)return;
    let cancelled=false;
    const fetchPending=async()=>{try{const stats=await fmApi.getApplicationStats();if(!cancelled&&stats?.pending)setPendingApps(stats.pending);}catch{}};
    fetchPending();
    const iv=setInterval(fetchPending,60000);
    return()=>{cancelled=true;clearInterval(iv);};
  },[isOperator,user]);

  /* Supabase Realtime — subscribe to message inserts for live updates */
  useEffect(()=>{
    if(!user||!activeClinicId)return;
    const channel=supabase.channel(`msgs-${activeClinicId}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`clinic_id=eq.${activeClinicId}`},(payload)=>{
        const m=payload.new;if(!m)return;
        setMsgs(prev=>{
          const clinicMsgs=[...(prev[activeClinicId]||[])];
          const idx=clinicMsgs.findIndex(c=>c.id===m.conversation_id);
          if(idx>-1){
            const chat={...clinicMsgs[idx]};
            chat.msgs=[...chat.msgs,{text:m.text,time:new Date(m.created_at).toLocaleTimeString("de",{hour:"2-digit",minute:"2-digit"}),sender:m.sender}];
            if(m.sender==="patient")chat.unread=true;
            clinicMsgs[idx]=chat;
          }
          return{...prev,[activeClinicId]:clinicMsgs};
        });
        if(m.sender==="patient")browserNotify("New message",m.text?.substring(0,50));
      })
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[user,activeClinicId]);
  const myNotifs=useMemo(()=>clinic?.notifications||[],[clinic]);
  const unreadNotifs=useMemo(()=>myNotifs.filter(n=>!n.read).length,[myNotifs]);
  const myFiles=useMemo(()=>clinic?.files||[],[clinic]);
  const myAutomations=useMemo(()=>clinic?.automations||[],[clinic]);

  const actionCounts = useMemo(()=>({
    needs_medical_review: myLeads.filter(l=>l.convStatus==="needs_medical_review").length,
    waiting_for_clinic_reply: myLeads.filter(l=>l.convStatus==="waiting_for_clinic_reply").length,
    booking_pending: myLeads.filter(l=>l.convStatus==="booking_pending").length,
    human_takeover: myLeads.filter(l=>l.convStatus==="human_takeover").length,
  }),[myLeads]);
  const totalActions = useMemo(()=>Object.values(actionCounts).reduce((s,v)=>s+v,0),[actionCounts]);

  /* ═══ USAGE METRICS ═══ */
  const usageMetrics = useMemo(()=>{
    if(!clinic) return null;
    const limits = PLAN_LIMITS[clinic.plan] || PLAN_LIMITS.starter;
    const totalMsgs = allClinicMsgs.reduce((s,c)=>s+(c.msgs?c.msgs.length:0),0);
    const activeAutos = myAutomations.filter(a=>a.active).length;
    const storageMB = (clinic.files||[]).reduce((s,f)=>{
      const str = f.size||"0";
      const num = parseFloat(str);
      if(str.toLowerCase().includes("gb")) return s+num*1024;
      if(str.toLowerCase().includes("kb")) return s+num/1024;
      return s+num;
    },0);
    const confirmedRev = invoices.filter(inv=>inv.status==="paid"&&(inv.clinicId===activeClinicId||!inv.clinicId)).reduce((s,inv)=>s+(inv.gross||0),0);
    const raw = [
      { key:"patients", label:"Patients", icon:"👥", color:"#4cc9ff", value:myLeads.length, limit:limits.patients },
      { key:"messages", label:"Messages", icon:"💬", color:"#a78bfa", value:totalMsgs, limit:limits.messages },
      { key:"automations", label:"Automations", icon:"⚡", color:"#10b981", value:activeAutos, limit:limits.automations },
      { key:"storage", label:"Storage (MB)", icon:"📁", color:"#fbbf24", value:Math.round(storageMB), limit:limits.storageMB },
    ];
    const metrics = raw.map(m=>{
      const isUnlimited = m.limit===null;
      const pct = isUnlimited?0:Math.round(m.value/m.limit*100);
      return { ...m, pct, isUnlimited, isWarning:!isUnlimited&&pct>80, isUrgent:!isUnlimited&&pct>95 };
    });
    const anyWarning = metrics.some(m=>m.isWarning);
    const anyUrgent = metrics.some(m=>m.isUrgent);
    const revenueExceedsThreshold = limits.revenueCap!==null && confirmedRev>limits.revenueCap;
    const planOrder = ["starter","pro","premium","enterprise"];
    const curIdx = planOrder.indexOf(clinic.plan);
    const suggestedPlan = curIdx<planOrder.length-1 ? planOrder[curIdx+1] : null;
    return { metrics, anyWarning, anyUrgent, revenueExceedsThreshold, suggestedPlan, confirmedRev };
  },[clinic,myLeads,allClinicMsgs,myAutomations,invoices,activeClinicId]);

  /* ═══ TODAY METRICS ═══ */
  const todayMetrics = useMemo(()=>{
    const today = new Date().toISOString().slice(0,10);
    const newPatientsToday = myLeads.filter(l=>l.lastAiInteraction&&l.lastAiInteraction.startsWith(today)).length;
    const aiConvsToday = allClinicMsgs.filter(c=>c.msgs&&c.msgs.some(m=>m.sender==="bot")).length;
    const apptsToday = (myAppts||[]).filter(a=>a.date===today&&(a.status==="booked"||a.status==="confirmed")).length;
    const arrivalsToday = myLeads.filter(l=>l.flightConfirmed&&l.flightConfirmed.date===today).length;
    const driverPickupsToday = myLeads.filter(l=>l.flightConfirmed&&l.flightConfirmed.date===today&&l.logistics&&l.logistics.driverStatus==="confirmed").length;
    const paidToday = invoices.filter(i=>i.paidDate&&i.paidDate.startsWith(today)&&(i.clinicId===activeClinicId||!i.clinicId));
    const paymentsToday = paidToday.length;
    const paymentAmountToday = paidToday.reduce((s,i)=>s+(i.gross||0),0);
    const automationsToday = myAutomations.filter(a=>a.lastRun&&a.lastRun.startsWith(today)).length;
    return { newPatientsToday, aiConvsToday, apptsToday, arrivalsToday, driverPickupsToday, paymentsToday, paymentAmountToday, automationsToday };
  },[myLeads,allClinicMsgs,myAppts,myAutomations,invoices,activeClinicId]);

  /* ═══ C2: LEAD SCORE + SLA ═══ */
  const getLeadScore=(l)=>{
    let score=0;
    if(l.photos||l.photoUrls?.length>0)score+=20;
    if(l.reviewData)score+=25;
    if(l.booking)score+=20;
    if(l.flightConfirmed?.date)score+=15;
    if(invoices.some(i=>i.leadId===l.id&&i.status==="paid"))score+=20;
    if(l.convStatus==="deposit_paid")score+=10;
    if(l.email)score+=5;if(l.phone)score+=5;
    /* Recency bonus */
    if(l.lastAiInteraction){const hrs=(Date.now()-new Date(l.lastAiInteraction).getTime())/3600000;if(hrs<24)score+=10;else if(hrs<72)score+=5;}
    const pct=Math.min(score,100);
    return{score:pct,tier:pct>=70?"hot":pct>=40?"warm":"cold",color:pct>=70?"#ef4444":pct>=40?"#fbbf24":"#6b7280",icon:pct>=70?"🔥":pct>=40?"🌡️":"❄️",label:pct>=70?"Hot":pct>=40?"Warm":"Cold"};
  };

  const getSLA=(l)=>{
    if(!l.lastAiInteraction||l.convStatus==="closed"||l.convStatus==="resolved")return null;
    const needsReply=["needs_medical_review","waiting_for_clinic_reply","human_takeover","booking_pending"];
    if(!needsReply.includes(l.convStatus))return null;
    const hrs=Math.round((Date.now()-new Date(l.lastAiInteraction).getTime())/3600000);
    const threshold=l.convStatus==="needs_medical_review"?24:l.convStatus==="human_takeover"?2:48;
    const pct=Math.min(Math.round(hrs/threshold*100),100);
    return{hrs,threshold,pct,overdue:hrs>=threshold,label:hrs>=threshold?`⚠️ ${hrs}h overdue`:`${hrs}h / ${threshold}h`,color:pct>=100?"#ef4444":pct>=75?"#fbbf24":"#10b981"};
  };

  /* ═══ C1: AI ACTION SUGGESTIONS ═══ */
  const getAiSuggestions=(l)=>{
    const s=[];
    if(!l)return s;
    /* No photos yet */
    if(!l.photos&&(!l.photoUrls||l.photoUrls.length===0)&&l.convStatus!=="closed")s.push({id:"ask_photos",icon:"📸",label:"Ask for photos",desc:"Patient hasn't sent photos yet",action:()=>{const tpl=MSG_TEMPLATES.find(t=>t.id==="t3");if(tpl)sendTemplateMsg(l.id,tpl);},priority:1});
    /* Needs medical review */
    if(l.convStatus==="needs_medical_review")s.push({id:"do_review",icon:"⚕️",label:"Complete medical review",desc:`${l.photoUrls?.length||0} photos waiting for evaluation`,action:()=>openPatient(l.id),priority:0});
    /* Has review but no deposit */
    if(l.reviewData&&!invoices.some(i=>i.leadId===l.id&&i.status==="paid")&&l.convStatus!=="deposit_paid")s.push({id:"send_deposit",icon:"💳",label:"Send deposit link",desc:`${l.reviewData.price} — send 25% deposit request`,action:()=>{const price=parseInt(l.reviewData.price?.replace(/[^0-9]/g,""))||0;sendPaymentLink(Math.max(Math.round(price*0.25),500),l.id,"auto");},priority:1});
    /* Treatment plan sent but no reply (48h) */
    if(l.treatmentPlanSentAt){const hrs=(Date.now()-new Date(l.treatmentPlanSentAt).getTime())/3600000;if(hrs>=48&&l.convStatus==="booking_pending")s.push({id:"followup",icon:"🔄",label:"Send follow-up",desc:`No reply for ${Math.round(hrs)}h — send reminder`,action:()=>{const tpl=MSG_TEMPLATES.find(t=>t.id==="t6");if(tpl)sendTemplateMsg(l.id,tpl);},priority:0});}
    /* Has booking but no flight */
    if(l.booking&&!l.flightConfirmed?.date)s.push({id:"ask_flight",icon:"✈️",label:"Request flight details",desc:"Appointment booked but no flight info yet",action:()=>{const tpl=MSG_TEMPLATES.find(t=>t.id==="t7");if(tpl)sendTemplateMsg(l.id,tpl);},priority:2});
    /* Move to booking if contacted */
    if(l.stage==="contacted"&&l.reviewData)s.push({id:"move_booked",icon:"📅",label:"Move to Booked",desc:"Treatment plan sent — ready to book?",action:()=>moveLead(l.id,"booked"),priority:2});
    /* No consent yet */
    if(!l.consent)s.push({id:"get_consent",icon:"📋",label:"Request data consent",desc:"DSGVO/GDPR consent not recorded",action:()=>{setLeads(p=>p.map(x=>x.id===l.id?{...x,consent:{granted:true,timestamp:new Date().toISOString(),method:"verbal"}}:x));addTL(l.id,"system","Data consent recorded (verbal)");showT("Consent recorded");},priority:3});
    return s.sort((a,b)=>a.priority-b.priority);
  };

  /* ═══ C4: TEMPLATE RESOLVER ═══ */
  const resolveTemplate=(tpl,lead)=>{
    if(!tpl||!lead)return tpl?.text||"";
    let text=tpl.text;
    const vars={"{first_name}":lead.name?.split(" ")[0]||lead.name,"{name}":lead.name,"{treatment}":lead.treatment||"","{doctor}":lead.assigned||"Dr. Yilmaz","{date}":lead.booking?.date||"TBD","{time}":lead.booking?.time||"TBD","{price}":lead.reviewData?.price||"","{payment_link}":"checkout.stripe.com/pay/...","{clinic}":clinic?.name||"Flowmatix"};
    Object.entries(vars).forEach(([k,v])=>{text=text.replaceAll(k,v);});
    return text;
  };
  const sendTemplateMsg=(leadId,tpl)=>{
    const lead=getLeadById(leadId);if(!lead||!tpl)return;
    const resolved=resolveTemplate(tpl,lead);
    setMsgs(prev=>{const cm=[...(prev[activeClinicId]||[])];const idx=cm.findIndex(c=>c.leadId===leadId);if(idx>-1){cm[idx]={...cm[idx],msgs:[...cm[idx].msgs,{text:`🤖 Template "${tpl.name}": ${resolved}`,time:new Date().toLocaleTimeString("de",{hour:"2-digit",minute:"2-digit"}),sender:"bot"}]};}return{...prev,[activeClinicId]:cm};});
    addTL(leadId,"bot",`Template sent: ${tpl.name}`);
    logAction("template_sent",lead.name,`${tpl.name}: ${resolved.substring(0,80)}…`);
    showT(`Template "${tpl.name}" sent to ${lead.name}`);
  };

  /* ═══ LIVE DEMO SIMULATION ═══ */
  useEffect(()=>{
    if(!user||!isDemoMode)return;
    const timers=[];
    /* 10s: WhatsApp notification */
    timers.push(setTimeout(()=>{
      setClinics(cs=>cs.map(c=>c.id===activeClinicId?{...c,notifications:[{id:`sim_${Date.now()}`,type:"lead",text:"Neue Nachricht von Carlos Mendez (WhatsApp): 'Hallo, wann kann ich den Termin buchen?'",time:new Date().toISOString(),read:false},...c.notifications]}:c));
      browserNotify("Carlos Mendez","Hallo, wann kann ich den Termin buchen?");
    },10000));
    /* 25s: AI processed photos */
    timers.push(setTimeout(()=>{
      setClinics(cs=>cs.map(c=>c.id===activeClinicId?{...c,notifications:[{id:`sim2_${Date.now()}`,type:"action",text:"🤖 Vision AI: Flugticket von Kenji Watanabe erkannt — ANA, 02.03.2026",time:new Date().toISOString(),read:false},...c.notifications]}:c));
    },25000));
    /* 45s: Payment received */
    timers.push(setTimeout(()=>{
      setClinics(cs=>cs.map(c=>c.id===activeClinicId?{...c,notifications:[{id:`sim3_${Date.now()}`,type:"action",text:"💰 Stripe: Anzahlung €700 von Hans Weber eingegangen (INV-2026-0004)",time:new Date().toISOString(),read:false},...c.notifications]}:c));
    },45000));
    return()=>timers.forEach(clearTimeout);
  },[user,isDemoMode,activeClinicId]);

  /* ═══ PAYMENT LINK SYSTEM (n8n-ready) ═══ */
  // TODO: Connect to n8n Webhook for Stripe Link Generation
  // Production: POST https://n8n.flowmatix.io/webhook/stripe-link {amount, leadId, clinicId}
  const sendPaymentLink=(amount,leadId,mode="auto")=>{
    const lead=leads.find(l=>l.id===leadId);if(!lead)return;
    /* ⚠️ DEMO: Not a real Stripe link — replace with actual Stripe Checkout in production */
    const link=`#DEMO-stripe-payment/cs_live_${genId().substring(0,8)}?amount=${amount}&currency=eur`;
    // TODO: In production, call n8n webhook: fetch('https://n8n.flowmatix.io/webhook/stripe-link', {method:'POST', body: JSON.stringify({amount,leadId,clinicId:activeClinicId,link})})
    const paymentCard={type:"payment_card",amount:parseInt(amount),currency:"EUR",status:"pending",link,created:new Date().toISOString(),id:genId()};
    /* Add payment card + bot message to chat */
    setMsgs(prev=>{
      const cm=[...(prev[activeClinicId]||[])];
      const idx=cm.findIndex(c=>c.leadId===leadId);
      if(idx>-1){
        cm[idx]={...cm[idx],msgs:[...cm[idx].msgs,
          {text:mode==="auto"?`🤖 AI: Analyse abgeschlossen. Anzahlungslink (€${amount}) wurde automatisch via WhatsApp gesendet.`:`👤 Mitarbeiter hat Zahlungslink über €${amount} generiert und zur Prüfung gesendet.`,time:new Date().toLocaleTimeString("de",{hour:"2-digit",minute:"2-digit"}),sender:"bot"},
          {text:JSON.stringify(paymentCard),time:new Date().toLocaleTimeString("de",{hour:"2-digit",minute:"2-digit"}),sender:"system",msgType:"payment_card"},
        ]};
      }
      return{...prev,[activeClinicId]:cm};
    });
    addTL(leadId,"system",`Payment link €${amount} sent (${mode})`);
    logAction("payment_link_sent",lead.name,`€${amount} via ${mode}`);
    navigator.clipboard?.writeText(link);
    showT(`Payment link €${amount} ${mode==="auto"?"auto-sent":"generated"} — copied!`);
  };

  const simulatePaymentReceived=(leadId,msgIdx)=>{
    const lead=leads.find(l=>l.id===leadId);if(!lead)return;
    /* Update payment card status in chat */
    setMsgs(prev=>{
      const cm=[...(prev[activeClinicId]||[])];
      const idx=cm.findIndex(c=>c.leadId===leadId);
      if(idx>-1){
        const chat={...cm[idx]};
        chat.msgs=chat.msgs.map(m=>{
          if(m.msgType==="payment_card"){try{const card=JSON.parse(m.text);return{...m,text:JSON.stringify({...card,status:"paid",paidAt:new Date().toISOString()})};}catch{return m;}}return m;
        });
        cm[idx]=chat;
      }
      return{...prev,[activeClinicId]:cm};
    });
    /* Update lead status + appointment */
    setConvStatus(leadId,"deposit_paid");
    setAppts(prev=>prev.map(a=>a.leadId===leadId&&a.status==="booked"?{...a,status:"confirmed"}:a));
    addTL(leadId,"system","💰 Deposit received — appointment confirmed");
    logAction("payment_received",lead.name,"Deposit confirmed via Stripe webhook");
    showT(`Payment received from ${lead.name} — appointment confirmed!`);
    setSuccessModal({lead,type:"deposit",revenue:lead.reviewData?.price||"",treatment:lead.treatment});
  };

  /* ═══ FLIGHT MISMATCH DETECTION (Vision AI → n8n Alert) ═══ */
  const flightAlerts = myLeads.filter(l=>{
    if(!l.flightConfirmed?.date || !l.booking?.date || l.flightConfirmed?.dismissed) return false;
    const fd=new Date(l.flightConfirmed.date);
    const bd=new Date(l.booking.date);
    /* Mismatch: flight AFTER appointment (patient arrives too late) OR more than 3 days before */
    const diffDays=Math.round((bd-fd)/(1000*60*60*24));
    return diffDays<0 || diffDays>3; /* too late or too early */
  }).map(l=>{
    const fd=new Date(l.flightConfirmed.date);
    const bd=new Date(l.booking.date);
    const diffDays=Math.round((bd-fd)/(1000*60*60*24));
    const type=diffDays<0?"arrives_after":"arrives_too_early";
    return{...l,flightDiff:diffDays,alertType:type,severity:diffDays<0?"critical":"warning"};
  });
  const flightMatches = myLeads.filter(l=>l.flightConfirmed?.date && l.booking?.date && !flightAlerts.find(a=>a.id===l.id));

  /* ═══ DATEV / CSV REVENUE EXPORT ═══ */
  const exportRevenue=(format)=>{
    const month=calDate.getMonth();const year=calDate.getFullYear();
    const monthStr=String(month+1).padStart(2,"0");
    const monthAppts=myAppts.filter(a=>a.status!=="cancelled"&&a.date?.startsWith(`${year}-${monthStr}`));
    if(format==="datev"){
      /* DATEV Buchungsstapel format (German accounting standard) */
      const header=`"Umsatz (ohne Soll/Haben-Kz)";"Soll/Haben-Kennzeichen";"WKZ Umsatz";"Kurs";"Basis-Umsatz";"WKZ Basis-Umsatz";"Konto";"Gegenkonto (ohne BU-Schlüssel)";"BU-Schlüssel";"Belegdatum";"Belegfeld 1";"Belegfeld 2";"Skonto";"Buchungstext"`;
      const rows=monthAppts.map((a,i)=>{
        const rev=estimateRevenue(a);const lead=myLeads.find(l=>l.id===a.leadId);
        const belegNr=`FM-${year}${monthStr}-${String(i+1).padStart(3,"0")}`;
        const datum=a.date.split("-").reverse().join("").substring(0,4); /* DDMM */
        return `${rev.toFixed(2).replace(".",",")};"S";"EUR";"";"";"";"10000";"8400";"";"${datum}";"${belegNr}";"";"";"\${a.patient} - ${a.treatment}"`;
      });
      const csv=[header,...rows].join("\n");
      const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
      const el=document.createElement("a");el.href=URL.createObjectURL(blob);
      el.download=`DATEV_Buchungen_${year}-${monthStr}_${clinic?.name?.replace(/\\s/g,"_")||"clinic"}.csv`;el.click();
      logAction("datev_export",clinic?.name||"","DATEV export: "+monthAppts.length+" bookings, "+MONTHS[month]+" "+year);
    } else {
      /* Simple CSV for tax advisor */
      const header="Date,Patient,Treatment,Doctor,Status,Revenue (EUR),Clinic,Invoice Nr";
      const rows=monthAppts.map((a,i)=>{
        const rev=estimateRevenue(a);
        const invNr=`FM-${year}${monthStr}-${String(i+1).padStart(3,"0")}`;
        return `"${a.date}","${a.patient}","${a.treatment}","${a.assigned||""}","${a.status}",${rev},"${clinic?.name||""}","${invNr}"`;
      });
      const total=monthAppts.reduce((s,a)=>s+estimateRevenue(a),0);
      rows.push(`"","","","","TOTAL",${total},"",""`);
      const csv=[header,...rows].join("\n");
      const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
      const el=document.createElement("a");el.href=URL.createObjectURL(blob);
      el.download=`Revenue_${year}-${monthStr}_${clinic?.name?.replace(/\\s/g,"_")||"clinic"}.csv`;el.click();
      logAction("revenue_export",clinic?.name||"","CSV export: "+monthAppts.length+" bookings, €"+total);
    }
    showT(`${format==="datev"?"DATEV":"CSV"} exported — ${monthAppts.length} bookings`);
  };

  /* Search results */
  const searchResults = searchQuery.length >= 2 ? [
    ...myLeads.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.treatment.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone.includes(searchQuery) || l.country?.toLowerCase().includes(searchQuery.toLowerCase()) || l.email?.toLowerCase().includes(searchQuery.toLowerCase()) || l.language?.toLowerCase().includes(searchQuery.toLowerCase())).map(l => {const cs=CONV_STATUS[l.convStatus];return{ type: "lead", id: l.id, label: l.name, sub: `${l.treatment} · ${l.country||""}`, icon: "👤", statusColor:cs?.color, statusLabel:cs?.icon };}),
    ...myAppts.filter(a => a.patient.toLowerCase().includes(searchQuery.toLowerCase()) || a.treatment.toLowerCase().includes(searchQuery.toLowerCase())).map(a => ({ type: "appt", id: a.id, label: a.patient, sub: `${a.treatment} — ${a.date}`, icon: "📅" })),
    ...allClinicMsgs.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).map(m => ({ type: "chat", id: m.id, label: m.name, sub: "Conversation", icon: "💬", data: m })),
  ] : [];

  const moveLead=(lid,ns)=>{const l=leads.find(x=>x.id===lid);if(!l||l.stage===ns)return;const st=getStageById(ns);setLeads(p=>p.map(x=>x.id===lid?{...x,stage:ns,timeline:[...x.timeline,{time:"now",type:"action",text:`→ ${st.label}`}]}:x));showT(`${l.name} → ${st.label}`);if(ns==="booked"||ns==="done")setSuccessModal({lead:l,type:ns==="booked"?"booking":"completed",revenue:l.reviewData?.price||"",treatment:l.treatment});};
  const addTL=(lid,tp,tx)=>{setLeads(p=>p.map(x=>x.id===lid?{...x,timeline:[...x.timeline,{time:"now",type:tp,text:tx}]}:x));};
  const setConvStatus=(lid,st)=>{
    const controlMap={ai_active:"ai",collecting_photos:"ai",human_takeover:"human",needs_medical_review:"paused",booking_pending:"human",waiting_for_clinic_reply:"human",deposit_paid:"ai",resolved:"closed",closed:"closed"};
    setLeads(p=>p.map(x=>x.id===lid?{...x,convStatus:st,controlMode:controlMap[st]||"ai",controlUpdatedAt:new Date().toISOString()}:x));
  };
  const handleDrop=st=>{if(dragItem){moveLead(dragItem,st);setDragItem(null);}};
  const updateAppt=(id,data)=>{setAppts(p=>p.map(a=>a.id===id?{...a,...data}:a));showT("Updated");};

  const sendTreatmentPlan=(lid)=>{
    const lead=getLeadById(lid);if(!lead)return;
    const planTime=new Date().toISOString();
    setLeads(p=>p.map(x=>x.id===lid?{...x,convStatus:"booking_pending",reviewData:{grafts:reviewGrafts,price:reviewPrice,notes:reviewNotes},reviewAssignedTo:null,lastAiInteraction:planTime,treatmentPlanSentAt:planTime,
      timeline:[...x.timeline,
        {time:"now",type:"review",text:`Treatment plan: ${reviewGrafts}, ${reviewPrice}`},
        {time:"now",type:"bot",text:`🤖 KI: Behandlungsplan über ${reviewGrafts} (${reviewPrice}) wurde als PDF an ${x.name} gesendet.`},
        {time:"now",type:"system",text:"Conversation → Booking Pending · Auto-follow-up in 48h"},
      ]}:x));
    /* Simulate system message in chat */
    setMsgs(prev=>{
      const clinicMsgs=[...(prev[activeClinicId]||[])];
      const idx=clinicMsgs.findIndex(c=>c.leadId===lid);
      if(idx>-1){
        const chat={...clinicMsgs[idx]};
        chat.msgs=[...chat.msgs,
          {text:`🤖 KI: Behandlungsplan über ${reviewGrafts} (${reviewPrice}) wurde als PDF an den Patienten gesendet.`,time:new Date().toLocaleTimeString("de",{hour:"2-digit",minute:"2-digit"}),sender:"bot"},
          {text:`📅 KI: "${lead.name}, Dr. ${lead.assigned||"Yilmaz"} hat deinen persönlichen Behandlungsplan fertiggestellt. Möchtest du den Termin direkt buchen?"`,time:new Date().toLocaleTimeString("de",{hour:"2-digit",minute:"2-digit"}),sender:"bot"},
        ];
        clinicMsgs[idx]=chat;
      }
      return{...prev,[activeClinicId]:clinicMsgs};
    });
    setReviewGrafts("");setReviewPrice("");setReviewNotes("");
    showT(`Treatment plan sent to ${lead.name}`);
    logAction("treatment_plan_sent",lead.name,`${reviewGrafts}, ${reviewPrice}`);
  };

  const addInternalNote=(lid)=>{
    if(!newNote.trim())return;
    setLeads(p=>p.map(x=>x.id===lid?{...x,internalNotes:[...(x.internalNotes||[]),{text:newNote,author:user.name,time:new Date().toISOString()}]}:x));
    setNewNote("");showT("Note added");
  };

  const markNotifsRead=()=>{
    setClinics(cs=>cs.map(c=>c.id===activeClinicId?{...c,notifications:c.notifications.map(n=>({...n,read:true}))}:c));
  };

  const toggleAutomation=(autId)=>{
    setClinics(cs=>cs.map(c=>c.id===activeClinicId?{...c,automations:c.automations.map(a=>a.id===autId?{...a,active:!a.active}:a)}:c));
    showT("Automation updated");
  };

  /* ═══ DRIVER / LOGISTICS HANDLERS ═══ */
  const assignDriver=(leadId,driverId)=>{
    const drv=(clinic?.drivers||[]).find(d=>d.id===driverId);
    if(!drv)return;
    setLeads(p=>p.map(x=>x.id===leadId?{...x,logistics:{driverId,driverName:drv.name,status:"pending"}}:x));
    addTL(leadId,"driver",`🚗 Driver ${drv.name} assigned for pickup`);
    logAction("assign_driver",getLeadById(leadId)?.name||"",`Driver: ${drv.name}`);
    showT(`${drv.name} assigned`);
  };

  const notifyDriver=(leadId)=>{
    const lead=leads.find(l=>l.id===leadId);if(!lead?.logistics)return;
    const drv=(clinic?.drivers||[]).find(d=>d.id===lead.logistics.driverId);
    setLeads(p=>p.map(x=>x.id===leadId?{...x,logistics:{...x.logistics,status:"notified",notifiedAt:new Date().toISOString()}}:x));
    addTL(leadId,"driver",`📱 WhatsApp sent to ${drv?.name||lead.logistics.driverName} for pickup`);
    setClinics(cs=>cs.map(c=>c.id===activeClinicId?{...c,notifications:[{id:`n_drv_${Date.now()}`,type:"driver",text:`🚗 Driver ${drv?.name||lead.logistics.driverName} notified for ${lead.name} pickup`,time:new Date().toISOString(),read:false},...c.notifications]}:c));
    logAction("notify_driver",lead.name,`Driver: ${drv?.name||lead.logistics.driverName}`);
    showT(`Driver notified via WhatsApp`);
  };

  const handleDriverResponse=(leadId,response)=>{
    const lead=leads.find(l=>l.id===leadId);if(!lead?.logistics)return;
    if(response==="confirm"){
      setLeads(p=>p.map(x=>x.id===leadId?{...x,logistics:{...x.logistics,status:"confirmed",confirmedAt:new Date().toISOString()}}:x));
      addTL(leadId,"driver",`✅ Driver ${lead.logistics.driverName} confirmed pickup`);
      setClinics(cs=>cs.map(c=>c.id===activeClinicId?{...c,notifications:[{id:`n_drv_${Date.now()}`,type:"driver",text:`✅ Driver ${lead.logistics.driverName} confirmed pickup for ${lead.name}`,time:new Date().toISOString(),read:false},...c.notifications]}:c));
      showT("Driver confirmed pickup");
    } else {
      setLeads(p=>p.map(x=>x.id===leadId?{...x,logistics:{...x.logistics,status:"declined"}}:x));
      addTL(leadId,"driver",`✕ Driver ${lead.logistics.driverName} declined pickup`);
      showT("Driver declined — escalate to backup");
      if(clinic?.logisticsConfig?.autoNotifyDriver){
        setTimeout(()=>escalateToBackup(leadId),500);
      }
    }
  };

  const escalateToBackup=(leadId)=>{
    const lead=leads.find(l=>l.id===leadId);if(!lead?.logistics)return;
    const backup=(clinic?.drivers||[]).find(d=>d.role==="backup"&&d.active&&d.id!==lead.logistics.driverId);
    if(!backup){showT("No backup driver available");return;}
    setLeads(p=>p.map(x=>x.id===leadId?{...x,logistics:{...x.logistics,status:"escalated",backupDriverId:backup.id,backupDriverName:backup.name,escalatedAt:new Date().toISOString()}}:x));
    addTL(leadId,"driver",`🔄 Escalated to backup driver ${backup.name}`);
    setClinics(cs=>cs.map(c=>c.id===activeClinicId?{...c,notifications:[{id:`n_drv_${Date.now()}`,type:"driver",text:`🔄 Pickup escalated to backup driver ${backup.name} for ${lead.name}`,time:new Date().toISOString(),read:false},...c.notifications]}:c));
    logAction("escalate_driver",lead.name,`Backup: ${backup.name}`);
    showT(`Escalated to ${backup.name}`);
  };

  const handleBackupDriverResponse=(leadId,response)=>{
    const lead=leads.find(l=>l.id===leadId);if(!lead?.logistics)return;
    const backupName=lead.logistics.backupDriverName||"Backup";
    if(response==="confirm"){
      setLeads(p=>p.map(x=>x.id===leadId?{...x,logistics:{...x.logistics,status:"backup_confirmed",backupConfirmedAt:new Date().toISOString()}}:x));
      addTL(leadId,"driver",`✅ Backup driver ${backupName} confirmed pickup`);
      setClinics(cs=>cs.map(c=>c.id===activeClinicId?{...c,notifications:[{id:`n_drv_${Date.now()}`,type:"driver",text:`✅ Backup driver ${backupName} confirmed pickup for ${lead.name}`,time:new Date().toISOString(),read:false},...c.notifications]}:c));
      showT("Backup driver confirmed");
    } else {
      setLeads(p=>p.map(x=>x.id===leadId?{...x,logistics:{...x.logistics,status:"backup_declined"}}:x));
      addTL(leadId,"driver",`❌ Backup driver ${backupName} also declined`);
      showT("Backup declined — manual assignment needed");
    }
  };

  /* Send message in chat */
  const sendMessage=(chatId)=>{
    if(!newMsg.trim()||!activeClinicId)return;
    const now=new Date();const timeStr=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    setMsgs(prev=>{
      const clinicMsgs=[...(prev[activeClinicId]||[])];
      const idx=clinicMsgs.findIndex(c=>c.id===chatId);
      if(idx===-1)return prev;
      const chat={...clinicMsgs[idx]};
      chat.msgs=[...chat.msgs,{text:newMsg.trim(),time:timeStr,sender:"staff"}];
      chat.unread=false;
      clinicMsgs[idx]=chat;
      return{...prev,[activeClinicId]:clinicMsgs};
    });
    /* Also add to lead timeline + auto-takeover on staff reply */
    const chat=(msgs[activeClinicId]||[]).find(c=>c.id===chatId);
    if(chat?.leadId){
      addTL(chat.leadId,"human",`Staff: ${newMsg.trim().substring(0,60)}`);
      /* Staff message → control_mode='human' (prevents AI from replying) */
      const lead=leads.find(l=>l.id===chat.leadId);
      if(lead&&lead.controlMode!=="human"&&lead.convStatus!=="resolved"&&lead.convStatus!=="closed"){
        setConvStatus(chat.leadId,"human_takeover");
      }
    }
    setNewMsg("");
    showT("Message sent");
    browserNotify("Message sent",`To: ${selChat?.name}`);
    logAction("message_sent",selChat?.name||"Unknown",`"${newMsg.trim().substring(0,80)}"`);
  };

  /* Mark conversation resolved — status lives on lead only */
  const markResolved=(chatId)=>{
    if(!activeClinicId)return;
    const chat=(msgs[activeClinicId]||[]).find(c=>c.id===chatId);
    if(chat?.leadId){setConvStatus(chat.leadId,"resolved");addTL(chat.leadId,"system","Conversation resolved");}
    /* Add system message to chat */
    setMsgs(prev=>{
      const clinicMsgs=[...(prev[activeClinicId]||[])];
      const idx=clinicMsgs.findIndex(c=>c.id===chatId);
      if(idx===-1)return prev;
      const c={...clinicMsgs[idx]};
      c.msgs=[...c.msgs,{text:"✓ Conversation marked as resolved",time:new Date().toLocaleTimeString("de",{hour:"2-digit",minute:"2-digit"}),sender:"system"}];
      clinicMsgs[idx]=c;
      return{...prev,[activeClinicId]:clinicMsgs};
    });
    showT(t("resolved"));
    logAction("conversation_resolved",chat?.name||"Unknown","Marked as resolved");
  };

  /* Reschedule appointment */
  const doReschedule=()=>{
    if(!rescheduleAppt||!rescheduleDate||!rescheduleTime)return;
    setAppts(p=>p.map(a=>a.id===rescheduleAppt?{...a,date:rescheduleDate,time:rescheduleTime}:a));
    showT(`Rescheduled to ${rescheduleDate} ${rescheduleTime}`);
    browserNotify("Appointment Rescheduled",`${rescheduleDate} at ${rescheduleTime}`);
    setRescheduleAppt(null);setRescheduleDate("");setRescheduleTime("");
  };

  /* Real password reset */
  const handlePasswordReset=async()=>{
    if(!resetEmail.trim()){showT("Enter email address");return;}
    try{
      const{error}=await supabase.auth.resetPasswordForEmail(resetEmail,{redirectTo:window.location.origin});
      if(error)showT(error.message);
      else{showT("Password reset email sent!");setShowResetForm(false);setResetEmail("");}
    }catch{showT("Password reset email sent!");setShowResetForm(false);setResetEmail("");}
  };

  /* Onboarding check */
  const needsOnboarding=clinic&&!onboardingDismissed&&(!clinic.clinicEmail||clinic.clinicEmail==="info@hairclinicturkiye.com"||!clinic.waName);
  const onboardingSteps=clinic?[
    {key:"clinic",label:t("ob_clinic"),done:!!clinic.clinicEmail&&!!clinic.address&&!!clinic.phone},
    {key:"wa",label:t("ob_whatsapp"),done:!!clinic.waName},
    {key:"ai",label:t("ob_ai"),done:!!clinic.aiConfig?.responseTone},
  ]:[];

  /* ═══ AUTH CALLBACK SCREENS ═══ */
  if(authCallbackMode==="processing")return(
    <div style={{minHeight:"100vh",background:AUTH_BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",color:"#e8eefc"}}>
      <div style={{textAlign:"center",maxWidth:400}}>
        <img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{width:56,height:56,borderRadius:16,objectFit:"cover",boxShadow:"0 4px 12px rgba(0,0,0,0.2)",marginBottom:20}}/>
        <h1 style={{fontSize:24,fontWeight:800,margin:"0 0 8px"}}>Signing you in…</h1>
        <p style={{fontSize:14,color:"rgba(167,177,195,0.6)",margin:0}}>Please wait while we verify your credentials.</p>
        <div style={{width:32,height:32,border:"3px solid rgba(76,201,255,0.2)",borderTopColor:"#4cc9ff",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"24px auto 0"}}/>
      </div>
    </div>
  );
  if(authCallbackMode==="recovery")return(
    <div style={{minHeight:"100vh",background:AUTH_BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",color:"#e8eefc"}}>
      <div style={{maxWidth:400,width:"90vw",textAlign:"center"}}>
        <img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{width:56,height:56,borderRadius:16,objectFit:"cover",boxShadow:"0 4px 12px rgba(0,0,0,0.2)",marginBottom:20}}/>
        <h1 style={{fontSize:24,fontWeight:800,margin:"0 0 8px"}}>Set new password</h1>
        <p style={{fontSize:14,color:"rgba(167,177,195,0.6)",margin:"0 0 24px"}}>Choose a strong password for your Flowmatix account.</p>
        {authCallbackErr&&<div style={{padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",marginBottom:16,color:"#ef4444",fontSize:13,fontWeight:600}}>{authCallbackErr}</div>}
        <div style={{textAlign:"left",marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(76,201,255,0.6)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>New Password</div>
          <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="At least 8 characters" style={{width:"100%",padding:"14px 16px",borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(76,201,255,0.15)",color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",boxSizing:"border-box"}} autoFocus/>
        </div>
        <div style={{textAlign:"left",marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(76,201,255,0.6)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Confirm Password</div>
          <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repeat password" onKeyDown={e=>{if(e.key==="Enter")handleSetPassword();}} style={{width:"100%",padding:"14px 16px",borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(76,201,255,0.15)",color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <button onClick={handleSetPassword} disabled={authLoading} style={{width:"100%",padding:16,borderRadius:14,background:"linear-gradient(135deg,#00B4D8,#0096c7)",border:"none",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(0,180,216,0.15)"}}>{authLoading?"Saving…":"Set password & continue"}</button>
      </div>
    </div>
  );
  if(authCallbackMode==="error")return(
    <div style={{minHeight:"100vh",background:AUTH_BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",color:"#e8eefc"}}>
      <div style={{maxWidth:400,width:"90vw",textAlign:"center"}}>
        <img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{width:56,height:56,borderRadius:16,objectFit:"cover",boxShadow:"0 4px 12px rgba(0,0,0,0.2)",marginBottom:20}}/>
        <h1 style={{fontSize:24,fontWeight:800,margin:"0 0 8px"}}>Authentication failed</h1>
        <div style={{padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",marginBottom:16,color:"#ef4444",fontSize:13,fontWeight:600}}>{authCallbackErr||"The link may have expired or already been used."}</div>
        <button onClick={()=>{window.history.replaceState(null,"","/");setAuthCallbackMode(null);}} style={{width:"100%",padding:16,borderRadius:14,background:"linear-gradient(135deg,#00B4D8,#0096c7)",border:"none",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(0,180,216,0.15)"}}>Back to login</button>
        <p style={{fontSize:12,color:"rgba(167,177,195,0.4)",marginTop:16}}>Need help? <a href="mailto:support@flowmatix.io" style={{color:"#4cc9ff"}}>support@flowmatix.io</a></p>
      </div>
    </div>
  );

  /* ======== LOGIN ======== */
  if(authLoading)return<div style={{minHeight:"100vh",background:AUTH_BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}><div style={{textAlign:"center"}}><img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{width:56,height:56,borderRadius:16,objectFit:"cover",marginBottom:16}}/><div style={{fontWeight:800,fontSize:22,letterSpacing:"0.12em",background:"linear-gradient(135deg,#fff,rgba(76,201,255,.7))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:16}}>FLOWMATIX</div><div style={{fontSize:14,color:"rgba(167,177,195,0.5)"}}>Loading...</div></div></div>;
  if(!user)return(
    <div style={{minHeight:"100vh",background:AUTH_BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",position:"relative"}}>
      {/* EnvSwitch top-left — so user can always switch Demo ↔ Live */}
      <div style={{position:"fixed",top:20,left:24,zIndex:10}}>
        <button onClick={()=>{const next=isDemoMode?"live":"demo";try{localStorage.setItem("fm_env",next);}catch{}setIsDemoMode(next!=="live");setUser(null);setLoginErr("");setLoginMode("magic");}} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${isDemoMode?"rgba(255,138,42,0.25)":"rgba(76,201,255,0.25)"}`,background:isDemoMode?"rgba(255,138,42,0.1)":"rgba(76,201,255,0.1)",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}>{isDemoMode?"🧪 Demo":"🚀 Live"}</button>
      </div>
      {/* Language flags top-right — all 7 languages */}
      <div style={{position:"fixed",top:20,right:24,display:"flex",gap:5,zIndex:10,flexWrap:"wrap",maxWidth:320,justifyContent:"flex-end"}}>
        {[{code:"en",flag:"🇬🇧"},{code:"de",flag:"🇩🇪"},{code:"tr",flag:"🇹🇷"},{code:"es",flag:"🇪🇸"},{code:"fr",flag:"🇫🇷"},{code:"it",flag:"🇮🇹"},{code:"pt",flag:"🇵🇹"}].map(l=>
          <button key={l.code} onClick={()=>setLoginLang(l.code)} style={{width:36,height:36,borderRadius:10,background:loginLang===l.code?"rgba(76,201,255,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${loginLang===l.code?"rgba(76,201,255,0.3)":"rgba(255,255,255,0.08)"}`,cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{l.flag}</button>
        )}
      </div>
      {/* Logo */}
      <div style={{textAlign:"center",marginBottom:36,position:"relative",zIndex:1}}>
        <img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{width:72,height:72,borderRadius:20,objectFit:"cover",boxShadow:"0 4px 12px rgba(0,0,0,0.2)",marginBottom:16}}/>
        <div style={{fontWeight:800,fontSize:28,letterSpacing:"0.1em"}}><span style={{background:"linear-gradient(135deg,#fff 30%,rgba(76,201,255,0.9) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>FLOWMATIX</span></div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.3em",color:"rgba(76,201,255,0.35)",marginTop:6}}>AUTOMATION</div>
      </div>
      {/* Card */}
      <div style={{width:420,padding:"36px 40px",borderRadius:20,background:"#162032",border:"1px solid rgba(255,255,255,0.08)",position:"relative",zIndex:1,boxShadow:"0 8px 24px rgba(0,0,0,0.3)"}}>

        {/* ═══ MODE: SENT — Check your email ═══ */}
        {loginMode==="sent"?<div style={{textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:12}}>📧</div>
          <div style={{fontWeight:800,fontSize:20,marginBottom:6,color:"#fff"}}>Check your email</div>
          <div style={{fontSize:14,color:"rgba(167,177,195,0.6)",marginBottom:20}}>We sent a login link to <strong style={{color:"#fff"}}>{loginEmail}</strong></div>
          <div style={{padding:14,borderRadius:12,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",marginBottom:14,fontSize:13,color:"rgba(167,177,195,0.6)"}}>Click the link in the email to access your dashboard.<br/>The link expires in 1 hour.</div>
          <div style={{padding:10,borderRadius:10,background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.12)",marginBottom:20,fontSize:12,color:"rgba(251,191,36,0.7)"}}>💡 Open the email on the device where you want to log in. The link works on the device you click it on.</div>
          {isDemoMode&&<button onClick={handleDemoMagicClick} style={{width:"100%",padding:14,borderRadius:12,background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(16,185,129,0.15)",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>✨ Simulate: Open magic link</button>}
          <button onClick={()=>{setLoginMode("magic");setLoginErr("");}} style={{background:"none",border:"none",color:"#4cc9ff",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:600}}>← Back to login</button>
          <div style={{marginTop:12,fontSize:12,color:"rgba(167,177,195,0.35)"}}>Didn't receive it? Check spam or <button onClick={handleMagicLink} style={{background:"none",border:"none",color:"#4cc9ff",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600,padding:0}}>resend</button></div>
        </div>:<>

        {/* ═══ HEADER ═══ */}
        <div style={{marginBottom:28}}>
          <div style={{fontWeight:800,fontSize:22,color:"#fff",marginBottom:6}}>{loginMode==="forgot"?"Reset password":(T[loginLang]||T.en).welcome_back||"Welcome back"}</div>
          <div style={{fontSize:14,color:"rgba(167,177,195,0.6)"}}>{loginMode==="forgot"?"Enter the email used for your Flowmatix account.":(T[loginLang]||T.en).access_dashboard}</div>
        </div>

        {/* Error */}
        {loginErr&&<div style={{padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",marginBottom:16,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:15}}>⚠</span><span style={{color:"#ef4444",fontSize:13,fontWeight:600}}>{loginErr}</span></div>}

        {/* Email (always shown) */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(76,201,255,0.6)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>{(T[loginLang]||T.en).email_address}</div>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"rgba(167,177,195,0.35)"}}>✉</span>
            <input id="loginEmail" name="loginEmail" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="you@clinic.com" onKeyDown={e=>{if(e.key==="Enter"){if(loginMode==="magic")handleMagicLink();else if(loginMode==="password")handleLogin();else if(loginMode==="forgot")handleForgotPw();}}} style={{width:"100%",padding:"14px 16px 14px 40px",borderRadius:12,background:"rgba(255,255,255,0.05)",border:`1px solid ${loginErr&&!loginEmail?"rgba(239,68,68,0.4)":"rgba(76,201,255,0.15)"}`,color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",boxSizing:"border-box",transition:"border .2s"}} autoFocus/>
          </div>
        </div>

        {/* Password (only in password mode) */}
        {loginMode==="password"&&<div style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(76,201,255,0.6)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{(T[loginLang]||T.en).password}</div>
            <button onClick={()=>{setLoginMode("forgot");setLoginErr("");}} style={{background:"none",border:"none",color:"rgba(167,177,195,0.5)",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600,padding:0}}>{(T[loginLang]||T.en).forgot}</button>
          </div>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"rgba(167,177,195,0.35)"}}>🔒</span>
            <input id="loginPass" name="loginPass" type={showPass?"text":"password"} value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{width:"100%",padding:"14px 44px 14px 40px",borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(76,201,255,0.15)",color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
            <button onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"rgba(167,177,195,0.4)",padding:4}}>{showPass?"🙈":"👁"}</button>
          </div>
        </div>}

        {/* ═══ PRIMARY ACTIONS ═══ */}
        {loginMode==="magic"&&<button onClick={handleMagicLink} disabled={authLoading} style={{width:"100%",padding:16,borderRadius:14,background:"linear-gradient(135deg,#00B4D8,#0096c7)",border:"none",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(0,180,216,0.15)",marginBottom:10}}>{authLoading?"Sending…":"Send magic link ✉"}</button>}
        {loginMode==="magic"&&isDemoMode&&<button onClick={()=>{setLoginMode("password");}} style={{width:"100%",padding:16,borderRadius:14,background:"linear-gradient(135deg,#00B4D8,#0096c7)",border:"none",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(0,180,216,0.15)",marginBottom:10}}>Continue →</button>}
        {loginMode==="password"&&<button onClick={handleLogin} disabled={authLoading} style={{width:"100%",padding:16,borderRadius:14,background:"linear-gradient(135deg,rgba(76,201,255,.18),rgba(45,168,255,.12))",border:"1px solid rgba(76,201,255,.3)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.background="linear-gradient(135deg,rgba(76,201,255,.28),rgba(45,168,255,.2))"} onMouseLeave={e=>e.currentTarget.style.background="linear-gradient(135deg,rgba(76,201,255,.18),rgba(45,168,255,.12))"}>{authLoading?"Signing in…":(T[loginLang]||T.en).sign_in} {!authLoading&&<span style={{fontSize:18}}>→</span>}</button>}
        {loginMode==="forgot"&&<button onClick={handleForgotPw} disabled={authLoading} style={{width:"100%",padding:16,borderRadius:14,background:"linear-gradient(135deg,#00B4D8,#0096c7)",border:"none",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(0,180,216,0.15)"}}>{authLoading?"Sending…":"Send reset link"}</button>}

        {/* ═══ MODE SWITCHER ═══ */}
        <div style={{textAlign:"center",marginTop:14}}>
          {loginMode==="magic"&&!isDemoMode&&<button onClick={()=>{setLoginMode("password");setLoginErr("");}} style={{background:"none",border:"none",color:"rgba(167,177,195,0.5)",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:600}}>Sign in with password instead</button>}
          {loginMode==="password"&&!isDemoMode&&<button onClick={()=>{setLoginMode("magic");setLoginErr("");}} style={{background:"none",border:"none",color:"rgba(167,177,195,0.5)",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:600}}>Sign in with magic link instead</button>}
          {loginMode==="forgot"&&<button onClick={()=>{setLoginMode("magic");setLoginErr("");}} style={{background:"none",border:"none",color:"#4cc9ff",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:600}}>← Back to login</button>}
        </div>

        {/* Demo mode hint */}
        {isDemoMode&&loginMode==="password"&&<div style={{marginTop:14,padding:12,borderRadius:10,background:"rgba(255,138,42,0.06)",border:"1px solid rgba(255,138,42,0.15)",textAlign:"center"}}>
          <div style={{fontSize:12,color:"rgba(255,138,42,0.7)",fontWeight:600}}>🧪 Demo Mode</div>
          <div style={{fontSize:11,color:"rgba(167,177,195,0.45)",marginTop:4}}>Use: <strong>mehmet@hairclinicturkiye.com</strong> / <strong>clinic</strong></div>
        </div>}

        </>}
      </div>
      {/* Trust badges */}
      <div style={{display:"flex",gap:16,marginTop:28,position:"relative",zIndex:1}}>
        {[{icon:"🔒",key:"trust_e2e"},{icon:"🛡",key:"trust_hipaa"},{icon:"⏱",key:"trust_uptime"}].map((b,i)=>
          <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",fontSize:12,color:"rgba(167,177,195,0.5)",fontWeight:600}}><span style={{fontSize:13}}>{b.icon}</span>{(T[loginLang]||T.en)[b.key]}</div>
        )}
      </div>
      {/* Footer */}
      <div style={{marginTop:24,display:"flex",gap:16,position:"relative",zIndex:1}}>
        {["Privacy","Terms","Imprint"].map((l,i)=>
          <span key={i} style={{fontSize:12,color:"rgba(167,177,195,0.35)",cursor:"pointer",fontWeight:500}} onMouseEnter={e=>e.currentTarget.style.color="rgba(167,177,195,0.6)"} onMouseLeave={e=>e.currentTarget.style.color="rgba(167,177,195,0.35)"}>{l}</span>
        )}
      </div>
      <div style={{marginTop:8,fontSize:11,color:"rgba(167,177,195,0.25)",position:"relative",zIndex:1}}>© 2026 Flowmatix GmbH</div>
      {/* No self-registration note */}
      {!isDemoMode&&<div style={{marginTop:12,fontSize:12,color:"rgba(167,177,195,0.2)",position:"relative",zIndex:1,textAlign:"center",maxWidth:400}}>Accounts are created when you purchase a plan. <a href="https://flowmatix.io" style={{color:"rgba(76,201,255,0.4)"}}>flowmatix.io</a></div>}
    </div>
  );


  /* ======== APPOINTMENT DRAWER ======== */
  const ApptDrawer=()=>{
    const a=appts.find(x=>x.id===selAppt);if(!a)return null;const ac=APPT_C[a.status]||APPT_C.booked;
    return<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex"}}><div onClick={()=>setSelAppt(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}}/>
      <div style={{position:"relative",marginLeft:"auto",width:"min(500px,90vw)",height:"100vh",background:"#131c2e",borderLeft:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",animation:"slI .25s ease",boxShadow:"-4px 0 12px rgba(0,0,0,0.2)"}}>
        <div style={{padding:"20px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",flexShrink:0}}><div><div style={{fontWeight:800,fontSize:20}}>{a.patient}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.7)",marginTop:2}}>{a.treatment}</div><div style={{display:"flex",gap:6,marginTop:8}}><span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:`${ac.c}18`,color:ac.c}}>{ac.l}</span></div></div><button onClick={()=>setSelAppt(null)} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"rgba(167,177,195,0.7)",width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          <Section title="Actions"><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{a.status!=="completed"&&a.status!=="cancelled"&&<Btn color="#4cc9ff" icon="📅" label={t("reschedule")} onClick={()=>{setRescheduleAppt(a.id);setRescheduleDate(a.date);setRescheduleTime(a.time);}}/>}{a.status!=="completed"&&<Btn color="#10b981" icon="✓" label={t("complete")} onClick={()=>{updateAppt(a.id,{status:"completed"});setSelAppt(null);}}/>}{a.status!=="cancelled"&&<Btn color="#ef4444" icon="✕" label={t("cancel")} onClick={()=>{updateAppt(a.id,{status:"cancelled"});setSelAppt(null);}}/>}{a.status==="booked"&&<Btn color="#a78bfa" icon="◈" label={t("confirm")} onClick={()=>updateAppt(a.id,{status:"confirmed"})}/>}</div></Section>
          {/* Reschedule Form */}
          {rescheduleAppt===a.id&&<Section title={`📅 ${t("reschedule")}`}>
            <div style={{padding:16,borderRadius:12,background:"rgba(76,201,255,0.05)",border:"1px solid rgba(76,201,255,0.15)"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:4}}>{t("new_date")}</div><input id="rescheduleDate" name="rescheduleDate" type="date" value={rescheduleDate} onChange={e=>setRescheduleDate(e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
                <div><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:4}}>{t("new_time")}</div><input id="rescheduleTime" name="rescheduleTime" type="time" value={rescheduleTime} onChange={e=>setRescheduleTime(e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
              </div>
              <div style={{display:"flex",gap:8}}><Btn color="#4cc9ff" icon="✓" label={t("save")} onClick={doReschedule}/><Btn color="rgba(167,177,195,0.5)" icon="✕" label={t("cancel")} secondary onClick={()=>{setRescheduleAppt(null);setRescheduleDate("");setRescheduleTime("");}}/></div>
            </div>
          </Section>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:22}}><IC label="Date" value={a.date}/><IC label="Time" value={`${a.time}–${a.endTime}`}/><IC label="Assigned" value={a.assigned}/><IC label="Source" value={a.source}/></div>
          {a.notes&&<Section title="Notes"><div style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",fontSize:14}}>{a.notes}</div></Section>}
        </div>
      </div>
    </div>;
  };

  /* ======== NAV ======== */
  const nav=isOperator?[
    {id:"operator",icon:"📊",l:"Overview"},
    {id:"op_clinics",icon:"🏥",l:"Clinics"},
    {id:"op_trials",icon:"🧪",l:"Trials",badge:pendingApps||null},
    "div",
    {id:"op_automations",icon:"⚡",l:"Automations"},
    {id:"op_analytics",icon:"📊",l:"Analytics"},
    {id:"op_monitoring",icon:"📡",l:"Monitoring"},
    {id:"op_incidents",icon:"🚨",l:"Incidents"},
    "div",
    {id:"op_logs",icon:"📋",l:"Logs"},
    {id:"op_billing",icon:"💳",l:"Billing"},
    {id:"op_settings",icon:"⚙️",l:"Settings"},
  ]:[
    {id:"dashboard",icon:"🏠",l:t("dashboard")},
    {id:"inbox",icon:"💬",l:t("inbox"),badge:unread||null},
    {id:"pipeline",icon:"📊",l:t("pipeline")},
    {id:"appointments",icon:"📅",l:t("appointments")},
    {id:"analytics",icon:"📈",l:t("analytics")},
    {id:"revenue",icon:"💰",l:t("revenue")},
    "div",
    {id:"ai_control",icon:"🤖",l:t("ai_control")},
    {id:"automations",icon:"⚡",l:t("automations")},
    {id:"files",icon:"📁",l:t("files")},
    "div",
    {id:"addons",icon:"✨",l:t("addons")},
    {id:"billing",icon:"💳",l:t("billing")},
    {id:"settings",icon:"⚙️",l:t("settings")},
    "div",
    {id:"audit_log",icon:"📋",l:"Audit Log"},
    {id:"support",icon:"❓",l:t("support")},
    ...(isAdmin?["div",{id:"operator",icon:"🔐",l:"Operator"}]:[]),
  ];

  /* ======== CALENDAR ======== */
  const CalMonth=()=>{const days=getMonthDays(calDate.getFullYear(),calDate.getMonth());return<div><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>{DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",padding:"8px 0"}}>{d}</div>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>{days.map((d,i)=>{const ds=fmtDate(d.date);const da=myAppts.filter(a=>a.date===ds);const td=isToday(d.date);const dayRev=da.filter(a=>a.status!=="cancelled").reduce((s,a)=>s+estimateRevenue(a),0);const isWeekday=d.date.getDay()>0&&d.date.getDay()<6;const isEmpty=da.length===0&&isWeekday&&d.current&&d.date>=new Date();return<div key={i} className={isEmpty&&showRevenue?"empty-day":""} style={{minHeight:100,padding:6,borderRadius:10,background:td?"rgba(76,201,255,0.06)":isEmpty&&showRevenue?"rgba(251,191,36,0.03)":"rgba(255,255,255,0.02)",border:`1px solid ${td?"rgba(76,201,255,0.2)":isEmpty&&showRevenue?"rgba(251,191,36,0.12)":"rgba(255,255,255,0.04)"}`,opacity:d.current?1:0.35,cursor:"pointer"}} onClick={()=>{setCalDate(d.date);setCalView("day");}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:12,fontWeight:td?800:600,color:td?"#4cc9ff":"rgba(232,238,252,0.7)"}}>{d.date.getDate()}</span>{showRevenue&&dayRev>0&&<span style={{fontSize:9,fontWeight:700,color:"#10b981",background:"rgba(16,185,129,0.1)",padding:"1px 5px",borderRadius:4}}>€{(dayRev/1000).toFixed(1)}k</span>}{isEmpty&&showRevenue&&<span style={{fontSize:8,color:"#fbbf24",fontWeight:700}}>open</span>}</div>{da.slice(0,2).map(a=>{const ac=APPT_C[a.status];return<div key={a.id} onClick={e=>{e.stopPropagation();setSelAppt(a.id);}} style={{padding:"2px 6px",borderRadius:5,background:`${ac.c}15`,borderLeft:`3px solid ${ac.c}`,marginBottom:2,fontSize:10,fontWeight:600,color:ac.c,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer"}}>{a.time} {a.patient}</div>;})}{da.length>2&&<div style={{fontSize:10,color:"rgba(167,177,195,0.4)"}}>+{da.length-2}</div>}</div>;})}</div></div>;};
  const CalDay=()=>{const ds=fmtDate(calDate);const da=myAppts.filter(a=>a.date===ds);const hours=Array.from({length:14},(_,i)=>i+7);return<div>{da.length===0&&<div style={{textAlign:"center",padding:40,color:"rgba(167,177,195,0.4)"}}>No appointments.</div>}{hours.map(h=>{const ha=da.filter(a=>parseInt(a.time)>=h&&parseInt(a.time)<h+1);return<div key={h} style={{display:"grid",gridTemplateColumns:"60px 1fr",gap:12,minHeight:60,borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div style={{fontSize:13,color:"rgba(167,177,195,0.3)",textAlign:"right",paddingTop:8,fontWeight:600}}>{String(h).padStart(2,"0")}:00</div><div style={{padding:"6px 0"}}>{ha.map(a=>{const ac=APPT_C[a.status];return<div key={a.id} onClick={()=>setSelAppt(a.id)} style={{padding:"12px 16px",borderRadius:12,background:`${ac.c}08`,border:`1px solid ${ac.c}20`,borderLeft:`4px solid ${ac.c}`,marginBottom:6,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:700,fontSize:15}}>{a.patient}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginTop:2}}>{a.treatment} · {a.time}–{a.endTime}</div></div><span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:`${ac.c}18`,color:ac.c}}>{ac.l}</span></div>;})}</div></div>;})}</div>;};

  /* ======== SYSTEM STATUS ======== */
  const SystemStatus=()=>{
    const items=[
      {label:"AI Bot",status:true,icon:"🤖"},
      {label:"WhatsApp",status:true,icon:"💬"},
      {label:"Calendar Sync",status:true,icon:"📅"},
      {label:"Automations",status:myAutomations.some(a=>a.active),icon:"⚡"},
    ];
    return<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{items.map((it,i)=><div key={i} style={{padding:"8px 14px",borderRadius:10,background:it.status?"rgba(16,185,129,0.06)":"rgba(239,68,68,0.06)",border:`1px solid ${it.status?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)"}`,display:"flex",alignItems:"center",gap:8,fontSize:12}}>
      <div style={{width:7,height:7,borderRadius:99,background:it.status?"#10b981":"#ef4444",boxShadow:it.status?"0 0 6px #10b981":"0 0 6px #ef4444"}}/><span style={{fontSize:13}}>{it.icon}</span><span style={{fontWeight:600,color:it.status?"rgba(232,238,252,0.8)":"#ef4444"}}>{it.label}</span>
    </div>)}</div>;
  };

  /* ======== CONTEXT VALUE ======== */
  const ctxValue = {
    // State
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
    dismissedRevSuggestion, setDismissedRevSuggestion, resetEmail, setResetEmail, showResetForm, setShowResetForm,
    inboxFilter, setInboxFilter, showPlanPicker, setShowPlanPicker,
    inviteOpen, setInviteOpen, inviteEmail, setInviteEmail, inviteRole, setInviteRole,
    auditLog, setAuditLog, showRevenue, setShowRevenue, msgPageSize, msgPage, setMsgPage,
    magicLinks, setMagicLinks, invoices, setInvoices,
    invoiceModal, setInvoiceModal, invAmount, setInvAmount, invItems, setInvItems, invVat, setInvVat, invDeposit, setInvDeposit,
    isDemoMode, setIsDemoMode, paymentModal, setPaymentModal, payAmount, setPayAmount, payCurrency, setPayCurrency,
    tourActive, setTourActive, tourStep, setTourStep, tourCompleted, setTourCompleted,
    templateModal, setTemplateModal, templateFilter, setTemplateFilter, successModal, setSuccessModal,
    // Computed
    isAdmin, isOperator, activeClinicId, clinic, myLeads, myAppts, allClinicMsgs, myMsgs, unread, opSubTab, setOpSubTab,
    myNotifs, unreadNotifs, myFiles, myAutomations, actionCounts, totalActions,
    usageMetrics, todayMetrics,
    searchResults, flightAlerts, flightMatches, needsOnboarding, onboardingSteps,
    chatEnd,
    // Helpers / Handlers
    t, getCS, getClinicById, getLeadById, getStageById, showT,
    logAction, getLeadScore, getSLA, getAiSuggestions,
    moveLead, addTL, setConvStatus, handleDrop, updateAppt,
    sendTreatmentPlan, addInternalNote, markNotifsRead, toggleAutomation,
    assignDriver, notifyDriver, handleDriverResponse, escalateToBackup, handleBackupDriverResponse,
    sendMessage, markResolved, doReschedule, openPatient, openPatientPhotos,
    resetAllData, generatePDF, generateMagicLink, generateInvoicePDF, generateStripeLink,
    generateDepositLink, markInvoicePaid, sendPaymentLink, sendTemplateMsg,
    simulatePaymentReceived, resolveTemplate, exportRevenue,
    browserNotify, estimateRevenue, getWeekRevenue, createInvoice,
    completeOnboarding, handleLogout, handleLogin, handleMagicLink, handleDemoMagicClick,
    handleForgotPw, handleSetPassword, handlePasswordReset,
    SystemStatus, CalMonth, CalDay, nav,
  };

  /* ======== RENDER ======== */
  return(
    <ErrorBoundary>
    <AppContext.Provider value={ctxValue}>
    <div style={{display:"flex",height:"100vh",background:"#0f1623",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",color:"rgba(232,238,252,0.96)",overflow:"hidden"}}>
      {toast&&<div style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"12px 24px",borderRadius:12,background:"#162032",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontWeight:700,fontSize:14,boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>✓ {toast}</div>}

      {/* ═══ 1️⃣ SETUP SCREEN — Done-for-you Activation ═══ */}
      {clinic&&clinic.setupStatus&&clinic.setupStatus!=="live"&&!isOperator&&<div style={{position:"fixed",inset:0,zIndex:2000,background:AUTH_BG,display:"flex",alignItems:"center",justifyContent:"center",overflowY:"auto",padding:"40px 0"}}>
        {/* Language switcher top-right */}
        <div style={{position:"fixed",top:20,right:24,display:"flex",gap:5,zIndex:2010,flexWrap:"wrap",maxWidth:320,justifyContent:"flex-end"}}>
          {[{code:"en",flag:"🇬🇧"},{code:"de",flag:"🇩🇪"},{code:"tr",flag:"🇹🇷"},{code:"es",flag:"🇪🇸"},{code:"fr",flag:"🇫🇷"},{code:"it",flag:"🇮🇹"},{code:"pt",flag:"🇵🇹"}].map(l=>
            <button key={l.code} onClick={()=>setLang(l.code)} style={{width:36,height:36,borderRadius:10,background:lang===l.code?"rgba(76,201,255,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${lang===l.code?"rgba(76,201,255,0.3)":"rgba(255,255,255,0.08)"}`,cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{l.flag}</button>
          )}
        </div>
        {/* Live support floating button */}
        <button onClick={()=>{window.open("https://wa.me/4915901431587?text=Hallo%2C%20ich%20brauche%20Hilfe%20beim%20Onboarding","_blank");}} style={{position:"fixed",bottom:24,right:24,zIndex:2010,padding:"12px 20px",borderRadius:50,background:"linear-gradient(135deg,#25D366,#128C7E)",border:"none",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(37,211,102,0.3)",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>💬</span>
          {{en:"Need help?",de:"Hilfe noetig?",tr:"Yardim mi lazim?",es:"Necesitas ayuda?",fr:"Besoin d'aide?",it:"Hai bisogno di aiuto?",pt:"Precisa de ajuda?"}[lang]||"Need help?"}
        </button>
        <div style={{maxWidth:560,width:"90vw",textAlign:"center"}}>
          {/* Logo */}
          <div style={{marginBottom:32}}>
            <img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{width:64,height:64,borderRadius:20,objectFit:"cover",boxShadow:"0 4px 12px rgba(0,0,0,0.2)",marginBottom:16}}/>
            <div style={{fontWeight:800,fontSize:28,letterSpacing:"0.08em",background:"linear-gradient(135deg,#fff 30%,rgba(76,201,255,.8) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>FLOWMATIX</div>
          </div>
          {/* Status: new — initial setup */}
          {(clinic.setupStatus==="new"||!clinic.setupStatus)&&<div style={{animation:"slI .3s ease"}}>
            <h1 style={{fontSize:32,fontWeight:800,margin:"0 0 8px"}}>Activate your clinic</h1>
            <p style={{fontSize:16,color:"rgba(167,177,195,0.7)",margin:"0 0 36px",lineHeight:1.6}}>We'll connect your WhatsApp assistant together in a guided setup.<br/>No technical work required from your team.</p>
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:32,textAlign:"left"}}>
              {[
                {num:"1️⃣",label:"Submit clinic details",desc:"Tell us about your clinic and booking preferences."},
                {num:"2️⃣",label:"Remote connection",desc:"We connect your WhatsApp Business account together in a short call."},
                {num:"3️⃣",label:"Verification",desc:"Flowmatix verifies messaging and automation."},
                {num:"4️⃣",label:"Go live",desc:"Your AI assistant starts handling patient inquiries automatically."},
              ].map((s,i)=><div key={i} style={{display:"flex",gap:14,alignItems:"center",padding:"14px 18px",borderRadius:14,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
                <span style={{fontSize:20,width:36,textAlign:"center"}}>{s.num}</span>
                <div><div style={{fontWeight:700,fontSize:15}}>{s.label}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.5)"}}>{s.desc}</div></div>
              </div>)}
            </div>
            <button onClick={()=>{window.open(`https://www.flowmatix.io/onboarding?id=${clinic.id}&plan=${clinic.plan||"starter"}`,"_blank");setClinics(cs=>cs.map(c=>c.id===clinic.id?{...c,setupStatus:"form_submitted"}:c));}} style={{width:"100%",padding:18,borderRadius:16,background:"linear-gradient(135deg,#00B4D8,#0096c7)",border:"none",color:"#fff",fontWeight:800,fontSize:18,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 8px 24px rgba(0,180,216,0.3)",transition:"all .2s"}}>Start setup →</button>
            <p style={{fontSize:13,color:"rgba(167,177,195,0.35)",marginTop:12}}>Setup usually takes about 15 minutes. We guide you through everything.</p>
          </div>}
          {/* Status: form_submitted — waiting for connection call */}
          {clinic.setupStatus==="form_submitted"&&<div style={{animation:"slI .3s ease"}}>
            <div style={{width:72,height:72,margin:"0 auto 20px",borderRadius:20,background:"rgba(16,185,129,0.1)",border:"2px solid rgba(16,185,129,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>✅</div>
            <h1 style={{fontSize:28,fontWeight:800,margin:"0 0 8px"}}>{{en:"Connect WhatsApp",de:"WhatsApp verbinden",tr:"WhatsApp Baglantisi",es:"Conectar WhatsApp",fr:"Connecter WhatsApp",it:"Collega WhatsApp",pt:"Conectar WhatsApp"}[lang]||"Connect WhatsApp"}</h1>
            <p style={{fontSize:16,color:"rgba(167,177,195,0.7)",margin:"0 0 24px",lineHeight:1.6}}>{{en:"Follow these steps to activate your WhatsApp Business channel.",de:"Folgen Sie diesen Schritten um Ihren WhatsApp Business Kanal zu aktivieren.",tr:"WhatsApp Business kanalinizi etkinlestirmek icin bu adimlari izleyin.",es:"Siga estos pasos para activar su canal de WhatsApp Business.",fr:"Suivez ces etapes pour activer votre canal WhatsApp Business.",it:"Segui questi passaggi per attivare il tuo canale WhatsApp Business.",pt:"Siga estes passos para ativar o seu canal WhatsApp Business."}[lang]||"Follow these steps to activate your WhatsApp Business channel."}</p>

            {/* Self-service WhatsApp Setup Steps */}
            {(()=>{
              const wp = clinic.waSetupProgress || {};
              const OB_T = {
                en: { s1:"Create Meta Business Account", d1:"Create an account on business.facebook.com", s2:"Verify your business", d2:"Upload business registration & proof of address (1-5 days)", s3:"Invite Flowmatix as partner", d3:"Settings → Partners → Enter Business ID", s4:"Register WhatsApp number", d4:"Enter SMS code to activate your clinic number", s5:"Test connection", d5:"Send a test message — AI responds automatically", done:"Done", open:"Open →", sms_title:"Enter SMS verification code", sms_hint:"We send the code via SMS to your clinic number. Best done in the evening.", verify:"Verify", partner_id:"Flowmatix Partner Business ID", copy:"Copy", phone_label:"Your clinic WhatsApp number", phone_hint:"Existing number recommended", help:"Get support", go_live:"Continue → Go Live", preview:"CRM Preview →", connected:"WhatsApp is connected!", steps_done:"completed" },
                de: { s1:"Meta Business Account erstellen", d1:"Erstellen Sie einen Account auf business.facebook.com", s2:"Unternehmen verifizieren", d2:"Gewerbeschein & Adressnachweis bei Meta hochladen (1-5 Tage)", s3:"Flowmatix als Partner einladen", d3:"Settings → Partners → Business ID eingeben", s4:"WhatsApp-Nummer registrieren", d4:"SMS-Code eingeben um Ihre Praxisnummer zu aktivieren", s5:"Verbindung testen", d5:"Testnachricht senden — AI antwortet automatisch", done:"Erledigt", open:"Oeffnen →", sms_title:"SMS-Verifizierungscode eingeben", sms_hint:"Wir senden den Code per SMS an Ihre Praxisnummer. Am besten abends machen.", verify:"Verifizieren", partner_id:"Flowmatix Partner Business ID", copy:"Kopieren", phone_label:"WhatsApp-Nummer Ihrer Praxis", phone_hint:"Vorhandene Nummer empfohlen", help:"Hilfe vom Support", go_live:"Weiter → Go Live", preview:"CRM Preview →", connected:"WhatsApp ist verbunden!", steps_done:"erledigt" },
                tr: { s1:"Meta Business Hesabi Olusturun", d1:"business.facebook.com'da hesap olusturun", s2:"Isletmenizi dogrulayin", d2:"Ticaret sicili ve adres belgesi yukleyin (1-5 gun)", s3:"Flowmatix'i partner olarak ekleyin", d3:"Ayarlar → Partnerler → Business ID girin", s4:"WhatsApp numarasini kaydedin", d4:"Klinik numaranizi etkinlestirmek icin SMS kodunu girin", s5:"Baglantiyi test edin", d5:"Test mesaji gonderin — AI otomatik yanit verir", done:"Tamamlandi", open:"Ac →", sms_title:"SMS dogrulama kodunu girin", sms_hint:"Kodu klinik numaraniza SMS ile gonderiyoruz. Aksam yapmak en iyisi.", verify:"Dogrula", partner_id:"Flowmatix Partner Business ID", copy:"Kopyala", phone_label:"Klinik WhatsApp numaraniz", phone_hint:"Mevcut numara onerilir", help:"Destek al", go_live:"Devam → Canli Yayina Gec", preview:"CRM Onizleme →", connected:"WhatsApp baglandi!", steps_done:"tamamlandi" },
                es: { s1:"Crear cuenta Meta Business", d1:"Cree una cuenta en business.facebook.com", s2:"Verificar empresa", d2:"Suba registro comercial y comprobante de domicilio (1-5 dias)", s3:"Invitar a Flowmatix como socio", d3:"Configuracion → Socios → Ingrese Business ID", s4:"Registrar numero de WhatsApp", d4:"Ingrese el codigo SMS para activar su numero", s5:"Probar conexion", d5:"Envie un mensaje de prueba — la IA responde automaticamente", done:"Listo", open:"Abrir →", sms_title:"Ingrese codigo de verificacion SMS", sms_hint:"Enviamos el codigo por SMS a su numero. Mejor hacerlo por la noche.", verify:"Verificar", partner_id:"Flowmatix Partner Business ID", copy:"Copiar", phone_label:"Numero de WhatsApp de su clinica", phone_hint:"Se recomienda numero existente", help:"Soporte", go_live:"Continuar → Activar", preview:"Vista previa CRM →", connected:"WhatsApp conectado!", steps_done:"completados" },
                fr: { s1:"Creer un compte Meta Business", d1:"Creez un compte sur business.facebook.com", s2:"Verifier votre entreprise", d2:"Telechargez extrait Kbis et justificatif d'adresse (1-5 jours)", s3:"Inviter Flowmatix comme partenaire", d3:"Parametres → Partenaires → Saisir Business ID", s4:"Enregistrer le numero WhatsApp", d4:"Saisissez le code SMS pour activer votre numero", s5:"Tester la connexion", d5:"Envoyez un message test — l'IA repond automatiquement", done:"Fait", open:"Ouvrir →", sms_title:"Saisir le code de verification SMS", sms_hint:"Nous envoyons le code par SMS a votre numero. Preferez le soir.", verify:"Verifier", partner_id:"Flowmatix Partner Business ID", copy:"Copier", phone_label:"Numero WhatsApp de votre cabinet", phone_hint:"Numero existant recommande", help:"Support", go_live:"Continuer → Mise en ligne", preview:"Apercu CRM →", connected:"WhatsApp est connecte!", steps_done:"termines" },
                it: { s1:"Creare account Meta Business", d1:"Create un account su business.facebook.com", s2:"Verificare l'azienda", d2:"Caricare visura camerale e prova di indirizzo (1-5 giorni)", s3:"Invitare Flowmatix come partner", d3:"Impostazioni → Partner → Inserire Business ID", s4:"Registrare numero WhatsApp", d4:"Inserire il codice SMS per attivare il numero", s5:"Testare la connessione", d5:"Inviare un messaggio di prova — l'IA risponde automaticamente", done:"Fatto", open:"Apri →", sms_title:"Inserire il codice di verifica SMS", sms_hint:"Inviamo il codice via SMS al vostro numero. Meglio farlo la sera.", verify:"Verifica", partner_id:"Flowmatix Partner Business ID", copy:"Copia", phone_label:"Numero WhatsApp del vostro studio", phone_hint:"Si consiglia il numero esistente", help:"Supporto", go_live:"Continua → Attiva", preview:"Anteprima CRM →", connected:"WhatsApp e connesso!", steps_done:"completati" },
                pt: { s1:"Criar conta Meta Business", d1:"Crie uma conta em business.facebook.com", s2:"Verificar empresa", d2:"Envie registo comercial e comprovativo de morada (1-5 dias)", s3:"Convidar Flowmatix como parceiro", d3:"Definicoes → Parceiros → Inserir Business ID", s4:"Registar numero WhatsApp", d4:"Insira o codigo SMS para ativar o seu numero", s5:"Testar conexao", d5:"Envie uma mensagem de teste — a IA responde automaticamente", done:"Feito", open:"Abrir →", sms_title:"Inserir codigo de verificacao SMS", sms_hint:"Enviamos o codigo por SMS para o seu numero. Melhor fazer a noite.", verify:"Verificar", partner_id:"Flowmatix Partner Business ID", copy:"Copiar", phone_label:"Numero WhatsApp da sua clinica", phone_hint:"Numero existente recomendado", help:"Suporte", go_live:"Continuar → Ativar", preview:"Pre-visualizacao CRM →", connected:"WhatsApp esta conectado!", steps_done:"concluidos" },
              };
              const ob = OB_T[lang] || OB_T.en;
              const steps = [
                { id: "meta_account", num: "1", title: ob.s1, desc: ob.d1, link: "https://business.facebook.com", check: wp.meta_account_created },
                { id: "meta_verify", num: "2", title: ob.s2, desc: ob.d2, check: wp.meta_verified },
                { id: "partner", num: "3", title: ob.s3, desc: ob.d3, check: wp.partner_invited },
                { id: "number", num: "4", title: ob.s4, desc: ob.d4, check: wp.number_registered },
                { id: "test", num: "5", title: ob.s5, desc: ob.d5, check: wp.connection_tested },
              ];
              const done = steps.filter(s => s.check).length;
              const pct = Math.round((done / steps.length) * 100);
              return <>
                {/* Progress */}
                <div style={{height:8,borderRadius:4,background:"rgba(255,255,255,0.06)",marginBottom:20}}>
                  <div style={{height:8,borderRadius:4,background:pct===100?"#10b981":"linear-gradient(90deg,#4cc9ff,#2da8ff)",width:`${pct}%`,transition:"width .5s ease"}}/>
                </div>
                <div style={{fontSize:12,color:"rgba(167,177,195,0.4)",marginBottom:16,textAlign:"right"}}>{done}/{steps.length} {ob.steps_done}</div>

                {/* Steps */}
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20,textAlign:"left"}}>
                  {steps.map((s,i)=>{
                    const isNext = !s.check && (i===0 || steps[i-1].check);
                    return <div key={s.id} style={{display:"flex",gap:12,alignItems:"center",padding:"12px 16px",borderRadius:12,background:s.check?"rgba(16,185,129,0.04)":isNext?"rgba(76,201,255,0.04)":"rgba(255,255,255,0.02)",border:`1px solid ${s.check?"rgba(16,185,129,0.15)":isNext?"rgba(76,201,255,0.15)":"rgba(255,255,255,0.06)"}`,opacity:(!s.check&&!isNext)?0.4:1}}>
                      <div style={{width:28,height:28,borderRadius:8,background:s.check?"#10b981":isNext?"#4cc9ff":"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:s.check||isNext?"#fff":"rgba(167,177,195,0.3)",flexShrink:0}}>
                        {s.check?"✓":s.num}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:14,color:s.check?"#10b981":"rgba(232,238,252,0.88)"}}>{s.title}</div>
                        <div style={{fontSize:12,color:"rgba(167,177,195,0.5)",marginTop:2}}>{s.desc}</div>
                      </div>
                      {isNext&&s.link&&<a href={s.link} target="_blank" rel="noopener noreferrer" style={{padding:"6px 14px",borderRadius:8,background:"rgba(76,201,255,0.1)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontSize:11,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>{ob.open}</a>}
                      {isNext&&!s.link&&<button onClick={()=>{setClinics(cs=>cs.map(c=>c.id===clinic.id?{...c,waSetupProgress:{...(c.waSetupProgress||{}),[ s.id==="meta_account"?"meta_account_created":s.id==="meta_verify"?"meta_verified":s.id==="partner"?"partner_invited":s.id==="number"?"number_registered":"connection_tested" ]:true}}:c));showT(ob.done+"!");}} style={{padding:"6px 14px",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>{ob.done} ✓</button>}
                    </div>;
                  })}
                </div>

                {/* Step 3 detail: Partner ID */}
                {!wp.partner_invited&&wp.meta_verified&&<div style={{padding:14,borderRadius:12,background:"rgba(76,201,255,0.03)",border:"1px solid rgba(76,201,255,0.1)",marginBottom:16,textAlign:"left"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:6}}>{ob.partner_id}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <code style={{flex:1,padding:"10px 14px",borderRadius:8,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.08)",color:"#4cc9ff",fontSize:14,fontFamily:"monospace",letterSpacing:1}}>YOUR_META_BUSINESS_ID</code>
                    <button onClick={()=>{navigator.clipboard.writeText("YOUR_META_BUSINESS_ID");showT(ob.copy+"!");}} style={{padding:"10px 16px",borderRadius:8,background:"rgba(76,201,255,0.1)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{ob.copy}</button>
                  </div>
                </div>}

                {/* Step 4 detail: SMS Code */}
                {!wp.number_registered&&wp.partner_invited&&<div style={{padding:14,borderRadius:12,background:"rgba(76,201,255,0.03)",border:"1px solid rgba(76,201,255,0.1)",marginBottom:16,textAlign:"left"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:8}}>{ob.sms_title}</div>
                  <div style={{display:"flex",gap:10}}>
                    <input id="ob_sms" placeholder="6-stelliger Code" maxLength={6} style={{width:160,padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"monospace",fontSize:20,letterSpacing:8,textAlign:"center",outline:"none"}} onChange={e=>{e.target.value=e.target.value.replace(/\D/g,"");}}/>
                    <button onClick={()=>{const code=document.getElementById("ob_sms")?.value;if(code?.length===6){setClinics(cs=>cs.map(c=>c.id===clinic.id?{...c,waSetupProgress:{...(c.waSetupProgress||{}),number_registered:true}}:c));showT(ob.done+"!");}else{showT("6-digit code required");}}} style={{padding:"10px 20px",borderRadius:10,background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{ob.verify}</button>
                  </div>
                  <div style={{fontSize:11,color:"rgba(167,177,195,0.4)",marginTop:8}}>{ob.sms_hint}</div>
                </div>}

                {/* All done → Go Live */}
                {pct===100&&<div style={{padding:16,borderRadius:14,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",textAlign:"center",marginBottom:16}}>
                  <span style={{fontSize:28}}>🎉</span>
                  <div style={{fontWeight:800,fontSize:16,color:"#10b981",marginTop:4}}>{ob.connected}</div>
                </div>}
              </>;
            })()}

            {/* Help & Navigation */}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{window.open("https://wa.me/4915901431587?text="+encodeURIComponent("Hallo, ich brauche Hilfe beim WhatsApp Setup"),"_blank");}} style={{flex:1,padding:14,borderRadius:14,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.6)",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span>💬</span> {ob.help}</button>
              {(clinic.waSetupProgress?.connection_tested)?
                <button onClick={()=>{setClinics(cs=>cs.map(c=>c.id===clinic.id?{...c,setupStatus:"connected"}:c));}} style={{flex:1,padding:14,borderRadius:14,background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>{ob.go_live}</button>
                :<button onClick={()=>{completeOnboarding(clinic.id);}} style={{flex:1,padding:14,borderRadius:14,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>{ob.preview}</button>
              }
            </div>
          </div>}
          {/* Status: connected — verification in progress */}
          {clinic.setupStatus==="connected"&&<div style={{animation:"slI .3s ease"}}>
            <div style={{width:72,height:72,margin:"0 auto 20px",borderRadius:20,background:"rgba(76,201,255,0.1)",border:"2px solid rgba(76,201,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>🔄</div>
            <h1 style={{fontSize:28,fontWeight:800,margin:"0 0 8px"}}>Verification in progress</h1>
            <p style={{fontSize:16,color:"rgba(167,177,195,0.7)",margin:"0 0 32px",lineHeight:1.6}}>WhatsApp is connected. We're running final checks on your messaging and automation setup.</p>
            <div style={{padding:16,borderRadius:14,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",marginBottom:24}}>
              {["WhatsApp connected ✓","Test messages verified ✓","Automation rules loading…"].map((s,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",fontSize:14}}><span style={{color:s.includes("✓")?"#10b981":"#4cc9ff",fontWeight:700}}>{s.includes("✓")?"✓":"⏳"}</span><span style={{color:s.includes("✓")?"#10b981":"rgba(232,238,252,0.7)"}}>{s.replace(" ✓","")}</span></div>)}
            </div>
            <button onClick={()=>{completeOnboarding(clinic.id,"Clinic activated!");}} style={{width:"100%",padding:18,borderRadius:16,background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",fontWeight:800,fontSize:18,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(16,185,129,0.15)"}}>✅ Activate & Go Live</button>
          </div>}
        </div>
      </div>}

      {/* ═══ 5️⃣ SUCCESS / DOPAMINE SCREEN ═══ */}
      {successModal&&<div style={{position:"fixed",inset:0,zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div onClick={()=>setSuccessModal(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}}/>
        <div style={{position:"relative",maxWidth:420,width:"90vw",borderRadius:20,background:"#162032",border:"1px solid rgba(16,185,129,0.15)",overflow:"hidden",animation:"slI .3s ease",textAlign:"center",boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
          {/* Confetti header */}
          <div style={{padding:"32px 28px 20px",background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(76,201,255,0.04))"}}>
            <div style={{fontSize:56,marginBottom:12}}>🎉</div>
            <h2 style={{fontSize:24,fontWeight:800,margin:"0 0 4px",color:"#10b981"}}>{successModal.type==="booking"?"Appointment Booked!":successModal.type==="deposit"?"Deposit Received!":"Treatment Completed!"}</h2>
            <p style={{fontSize:14,color:"rgba(167,177,195,0.6)",margin:0}}>via AI Assistant</p>
          </div>
          {/* Details */}
          <div style={{padding:"20px 28px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div style={{padding:12,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{fontSize:10,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase",marginBottom:4}}>Patient</div>
                <div style={{fontSize:15,fontWeight:800}}>{successModal.lead?.name||"—"}</div>
              </div>
              <div style={{padding:12,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{fontSize:10,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase",marginBottom:4}}>Treatment</div>
                <div style={{fontSize:15,fontWeight:800}}>{successModal.treatment||"—"}</div>
              </div>
            </div>
            {successModal.revenue&&<div style={{padding:16,borderRadius:14,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(16,185,129,0.6)",textTransform:"uppercase",marginBottom:4}}>Revenue</div>
              <div style={{fontSize:32,fontWeight:800,color:"#10b981"}}>{successModal.revenue}</div>
            </div>}
            {/* AI Stats */}
            <div style={{padding:12,borderRadius:12,background:"rgba(76,201,255,0.04)",border:"1px solid rgba(76,201,255,0.1)",marginBottom:20}}>
              <div style={{fontSize:12,color:"rgba(167,177,195,0.5)"}}>🤖 AI handled <span style={{color:"#4cc9ff",fontWeight:800}}>{clinic?.stats?.aiHandled||82}%</span> of conversations automatically this week</div>
            </div>
            <button onClick={()=>setSuccessModal(null)} style={{width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(16,185,129,0.25)"}}>Continue →</button>
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
      {selLead&&<PatientPanel/>}{selAppt&&ApptDrawer()}
      {/* ═══ INVOICE CREATION MODAL ═══ */}
      {invoiceModal&&(()=>{const lead=getLeadById(invoiceModal);if(!lead)return null;return<div style={{position:"fixed",inset:0,zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div onClick={()=>setInvoiceModal(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}}/>
        <div style={{position:"relative",width:"min(520px,90vw)",background:"#162032",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:28,animation:"slI .2s ease",boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div><div style={{fontSize:18,fontWeight:800}}>🧾 Create Invoice</div><div style={{fontSize:13,color:"rgba(167,177,195,0.5)",marginTop:2}}>for {lead.name} — {lead.treatment}</div></div>
            <button onClick={()=>setInvoiceModal(null)} style={{background:"none",border:"none",color:"rgba(167,177,195,0.5)",fontSize:20,cursor:"pointer"}}>✕</button>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:6}}>Line Items / Description</div>
            <textarea id="invItems" name="invItems" value={invItems} onChange={e=>setInvItems(e.target.value)} rows={3} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box",resize:"vertical"}} placeholder="FUE Hair Transplant 3000 grafts&#10;Hotel package (3 nights)&#10;Airport transfer"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:6}}>Net Amount (€)</div>
              <input id="invAmount" name="invAmount" type="number" value={invAmount} onChange={e=>setInvAmount(e.target.value)} placeholder="2800" style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:6}}>VAT %</div>
              <select id="invVat" name="invVat" value={invVat} onChange={e=>setInvVat(e.target.value)} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box",cursor:"pointer"}}>
                <option value="0">0% (International)</option>
                <option value="8">8% (Turkey)</option>
                <option value="19">19% (Germany)</option>
                <option value="20">20% (UK)</option>
              </select>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:6}}>Total (Gross)</div>
              <div style={{padding:"10px 14px",borderRadius:10,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",fontSize:16,fontWeight:800,color:"#10b981"}}>€{((parseInt(invAmount)||0)+(parseInt(invAmount)||0)*(parseInt(invVat)||0)/100).toLocaleString()}</div>
            </div>
          </div>
          {/* Deposit option */}
          <div style={{padding:12,borderRadius:10,background:"rgba(167,107,255,0.04)",border:"1px solid rgba(167,107,255,0.1)",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#a78bfa"}}>💳 Generate Stripe Deposit Link?</div>
              <div style={{display:"flex",gap:6}}>
                {[25,50].map(pct=><button key={pct} onClick={()=>setInvDeposit(String(Math.round((parseInt(invAmount)||0)*pct/100)))} style={{padding:"4px 10px",borderRadius:6,background:invDeposit===String(Math.round((parseInt(invAmount)||0)*pct/100))?"rgba(167,107,255,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${invDeposit===String(Math.round((parseInt(invAmount)||0)*pct/100))?"rgba(167,107,255,0.3)":"rgba(255,255,255,0.08)"}`,color:invDeposit===String(Math.round((parseInt(invAmount)||0)*pct/100))?"#a78bfa":"rgba(167,177,195,0.5)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{pct}% — €{Math.round((parseInt(invAmount)||0)*pct/100)}</button>)}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{
              const net=parseInt(invAmount)||0;if(!net){showT("Enter an amount");return;}
              const inv=createInvoice(lead.id,invItems,net,parseInt(invVat)||0);
              if(inv&&invDeposit){generateDepositLink(lead.id,parseInt(invDeposit));}
              if(inv)setInvoiceModal(null);
            }} style={{flex:1,padding:"12px 20px",borderRadius:12,background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>🧾 Create Invoice{invDeposit?" + Deposit Link":""}</button>
            <button onClick={()=>setInvoiceModal(null)} style={{padding:"12px 20px",borderRadius:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.6)",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          </div>
        </div>
      </div>;})()}

      {/* ═══ PAYMENT LINK MODAL (Manual Review) ═══ */}
      {paymentModal&&(()=>{const lead=getLeadById(paymentModal.leadId);if(!lead)return null;const amt=parseInt(payAmount)||0;return<div style={{position:"fixed",inset:0,zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div onClick={()=>setPaymentModal(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}}/>
        <div style={{position:"relative",width:"min(440px,90vw)",background:"#0d1220",border:"1px solid rgba(0,180,216,0.2)",borderRadius:20,padding:0,overflow:"hidden",animation:"slI .2s ease"}}>
          {/* Card header gradient */}
          <div style={{padding:"20px 24px",background:"linear-gradient(135deg,rgba(0,180,216,0.08),rgba(76,201,255,0.04))",borderBottom:"1px solid rgba(0,180,216,0.12)"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:30,borderRadius:8,background:"linear-gradient(135deg,#00B4D8,#4cc9ff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",fontWeight:800,boxShadow:"0 4px 12px rgba(0,180,216,0.3)"}}>💳</div>
              <div><div style={{fontSize:16,fontWeight:800}}>Generate Payment Link</div><div style={{fontSize:12,color:"rgba(167,177,195,0.5)",marginTop:1}}>for {lead.name} — {lead.treatment}</div></div>
            </div>
          </div>
          <div style={{padding:"20px 24px"}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:6}}>Amount</div>
                <input id="payAmount" name="payAmount" type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(0,180,216,0.15)",color:"#fff",fontFamily:"inherit",fontSize:18,fontWeight:800,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:6}}>Currency</div>
                <select id="payCurrency" name="payCurrency" value={payCurrency} onChange={e=>setPayCurrency(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:10,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(0,180,216,0.15)",color:"#fff",fontFamily:"inherit",fontSize:16,fontWeight:700,outline:"none",boxSizing:"border-box",cursor:"pointer"}}>
                  <option value="EUR">€ EUR</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option><option value="TRY">₺ TRY</option>
                </select>
              </div>
            </div>
            {/* Quick amount buttons */}
            <div style={{display:"flex",gap:6,marginBottom:16}}>
              {[250,500,1000].map(a=><button key={a} onClick={()=>setPayAmount(String(a))} style={{flex:1,padding:"8px 0",borderRadius:8,background:payAmount===String(a)?"rgba(0,180,216,0.12)":"rgba(255,255,255,0.03)",border:`1px solid ${payAmount===String(a)?"rgba(0,180,216,0.25)":"rgba(255,255,255,0.06)"}`,color:payAmount===String(a)?"#4cc9ff":"rgba(167,177,195,0.5)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>€{a}</button>)}
              {lead.reviewData?.price&&<button onClick={()=>{const p=parseInt(lead.reviewData.price.replace(/[^0-9]/g,""))||0;setPayAmount(String(Math.round(p*0.25)));}} style={{flex:1,padding:"8px 0",borderRadius:8,background:"rgba(167,107,255,0.08)",border:"1px solid rgba(167,107,255,0.15)",color:"#a78bfa",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>25%</button>}
            </div>
            {/* Preview card */}
            <div style={{padding:14,borderRadius:12,background:"rgba(0,180,216,0.04)",border:"1px solid rgba(0,180,216,0.1)",display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div style={{width:40,height:26,borderRadius:5,background:"linear-gradient(135deg,#00B4D8,#4cc9ff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:800}}>💳</div>
              <div style={{flex:1}}>
                <div style={{fontSize:20,fontWeight:800,color:"#4cc9ff"}}>{payCurrency==="EUR"?"€":payCurrency==="USD"?"$":payCurrency==="GBP"?"£":"₺"}{amt.toLocaleString()}</div>
                <div style={{fontSize:11,color:"rgba(167,177,195,0.4)"}}>Stripe Payment Link · ⏳ Pending</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{sendPaymentLink(amt,lead.id,"manual");setPaymentModal(null);}} style={{flex:1,padding:"12px 20px",borderRadius:12,background:"linear-gradient(135deg,#00B4D8,#0096c7)",border:"none",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(0,180,216,0.25)"}}>💳 Jetzt senden</button>
              <button onClick={()=>setPaymentModal(null)} style={{padding:"12px 20px",borderRadius:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.6)",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </div>
        </div>
      </div>;})()}

      {/* Sidebar */}
      <div style={{width:sidebar?260:68,minWidth:sidebar?260:68,background:"#131c2e",borderRight:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",transition:"all .3s cubic-bezier(.4,0,.2,1)",overflow:"hidden"}}>
        <div style={{padding:sidebar?"20px 18px 16px":"20px 14px 16px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setSidebar(!sidebar)} title={sidebar?"Collapse sidebar":"Expand sidebar"}>
            <img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{width:sidebar?36:32,height:sidebar?36:32,borderRadius:10,objectFit:"cover",flexShrink:0,transition:"all .3s cubic-bezier(.4,0,.2,1)"}}/>
            {sidebar&&<span style={{fontWeight:800,fontSize:16,letterSpacing:"0.06em",background:"linear-gradient(135deg,#fff 30%,rgba(76,201,255,0.85) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",cursor:"default"}}>FLOWMATIX</span>}
          </div>
          {sidebar&&isAdmin&&!isOperator&&<div style={{marginTop:12}}><select id="adminClinic" name="adminClinic" value={adminClinic} onChange={e=>{setAdminClinic(e.target.value);setSelChat(null);setAiConfigData(null);}} style={{width:"100%",padding:"8px 10px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",color:"#fff",fontFamily:"inherit",fontSize:12,outline:"none",cursor:"pointer",transition:"border-color .2s"}}>{clinics.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
        </div>
        {sidebar&&totalActions>0&&!isOperator&&<div onClick={()=>{setView("inbox");setInboxFilter("needs_action");}} style={{margin:"10px 10px 0",padding:"10px 14px",borderRadius:10,background:"rgba(255,138,42,0.06)",border:"1px solid rgba(255,138,42,0.12)",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .2s"}}>
          <div style={{width:24,height:24,borderRadius:8,background:"#ff8a2a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff"}}>{totalActions}</div>
          {sidebar&&<span style={{fontSize:12,fontWeight:700,color:"#ff8a2a"}}>Action Needed</span>}
        </div>}
        <nav style={{flex:1,padding:"8px 10px",overflowY:"auto"}}>{nav.map((it,idx)=>{if(it==="div")return<div key={idx} style={{height:1,background:"rgba(255,255,255,0.04)",margin:"10px 8px"}}/>;const isOpSub=it.id.startsWith("op_");const activeId=isOpSub?it.id:(view===it.id?it.id:null);const isActive=isOpSub?(view==="operator"&&opSubTab===it.id.replace("op_","")):(view===it.id);return<div key={it.id} data-tour={it.id} onClick={()=>{if(isOpSub){setView("operator");setOpSubTab(it.id.replace("op_",""));}else if(it.id==="operator"){setView("operator");setOpSubTab("dashboard");}else{setView(it.id);}setSelChat(null);if(it.id==="settings")setSettingsData(clinic?{...clinic}:null);if(it.id==="ai_control")setAiConfigData(clinic?.aiConfig?{...clinic.aiConfig}:null);}} style={{display:"flex",alignItems:"center",gap:12,padding:sidebar?"10px 14px":"10px 0",justifyContent:sidebar?"flex-start":"center",borderRadius:10,cursor:"pointer",marginBottom:3,background:isActive?"rgba(76,201,255,0.08)":"transparent",borderLeft:isActive?"3px solid #4cc9ff":"3px solid transparent",color:isActive?"#fff":"rgba(167,177,195,0.55)",fontWeight:isActive?700:500,fontSize:14,transition:"all .2s cubic-bezier(.4,0,.2,1)",letterSpacing:isActive?"0.01em":"0"}}><span style={{fontSize:16,flexShrink:0,opacity:isActive?1:0.7,transition:"opacity .2s"}}>{it.icon}</span>{sidebar&&<span>{it.l}</span>}{sidebar&&it.badge&&<span style={{marginLeft:"auto",background:"#ff8a2a",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:99,minWidth:16,textAlign:"center"}}>{it.badge}</span>}</div>;})}</nav>
        <div style={{padding:sidebar?"14px 16px":"14px 10px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>{sidebar?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:10,background:isAdmin?"rgba(76,201,255,0.1)":"rgba(16,185,129,0.1)",border:`1px solid ${isAdmin?"rgba(76,201,255,0.12)":"rgba(16,185,129,0.12)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:isAdmin?"#4cc9ff":"#10b981"}}>{user.name.charAt(0)}</div><div><div style={{fontWeight:600,color:"rgba(232,238,252,0.8)",fontSize:13}}>{user.name}</div><div style={{fontSize:10,color:"rgba(167,177,195,0.35)",fontWeight:500}}>{isAdmin?"Admin":clinic?.name}</div></div></div><button onClick={handleLogout} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(167,177,195,0.5)",cursor:"pointer",fontSize:13,width:28,height:28,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}} title="Logout">↗</button></div>:<div onClick={handleLogout} style={{cursor:"pointer",textAlign:"center",color:"rgba(167,177,195,0.4)",fontSize:13,width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>↗</div>}</div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* TOP BAR */}
        <div style={{height:56,minHeight:56,borderBottom:"1px solid rgba(255,255,255,0.06)",background:"#0f1623",display:"flex",alignItems:"center",padding:"0 28px",gap:14,flexShrink:0}}>
          <div style={{flex:1,position:"relative"}}>
            {isOperator&&<OperatorSearch setView={setView} setOpSubTab={setOpSubTab} />}
            {!isOperator&&<><input id="searchQuery" name="searchQuery" value={searchQuery} onChange={e=>{setSearchQuery(e.target.value);setSearchOpen(true);}} onFocus={()=>setSearchOpen(true)} onBlur={()=>setTimeout(()=>setSearchOpen(false),200)} placeholder={`Search patients, appointments… (${navigator.platform?.includes("Mac")?"⌘":"Ctrl"}+K)`} style={{width:"100%",maxWidth:420,padding:"9px 14px 9px 36px",borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",color:"#fff",fontFamily:"inherit",fontSize:13,outline:"none",boxSizing:"border-box",transition:"border-color .2s"}}/>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"rgba(167,177,195,0.3)"}}>🔍</span></>}
            {searchOpen&&searchResults.length>0&&<div style={{position:"absolute",top:"100%",left:0,width:"100%",maxWidth:420,maxHeight:320,overflowY:"auto",marginTop:6,borderRadius:12,background:"#162032",border:"1px solid rgba(255,255,255,0.08)",zIndex:100,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
              <div style={{padding:"8px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)"}}>{searchResults.length} results</span><span style={{fontSize:10,color:"rgba(167,177,195,0.3)"}}>ESC to close</span></div>
              {searchResults.map((r,i)=><div key={i} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",gap:10,alignItems:"center"}} onMouseDown={()=>{
                if(r.type==="lead")setSelLead(r.id);
                else if(r.type==="appt")setSelAppt(r.id);
                else if(r.type==="chat"){setView("inbox");setSelChat(r.data);}
                setSearchQuery("");setSearchOpen(false);
              }} onMouseEnter={e=>e.currentTarget.style.background="rgba(76,201,255,0.06)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:16}}>{r.icon}</span>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{r.label}</div><div style={{fontSize:11,color:"rgba(167,177,195,0.5)"}}>{r.sub}</div></div>
                {r.statusLabel&&<span style={{fontSize:12}} title={r.statusLabel}>{r.statusLabel}</span>}
              </div>)}
            </div>}
          </div>
          {/* Operator Status Pills */}
          {isOperator&&<OperatorHeaderPills setView={setView} setOpSubTab={setOpSubTab} totalActions={totalActions} />}
          {/* Daily Overview KPIs */}
          {!isOperator&&<div style={{display:"flex",gap:12,alignItems:"center",marginRight:4}}>
            {[
              {label:"Reviews",value:actionCounts.needs_medical_review,color:"#ff8a2a",icon:"⚕️"},
              {label:"Bookings",value:myLeads.filter(l=>l.stage==="booked").length,color:"#10b981",icon:"📅"},
              {label:"Leads",value:myLeads.length,color:"#4cc9ff",icon:"👤"},
            ].map((k,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:10,background:`${k.color}06`,border:`1px solid ${k.color}10`}}>
              <span style={{fontSize:11}}>{k.icon}</span>
              <span style={{fontSize:14,fontWeight:800,color:k.color}}>{k.value}</span>
              <span style={{fontSize:10,color:"rgba(167,177,195,0.35)",fontWeight:600}}>{k.label}</span>
            </div>)}
          </div>}
          {/* Flowmatix Status Badge */}
          {clinic&&!isOperator&&<div style={{padding:"5px 12px",borderRadius:8,background:clinic.setupStatus==="live"?"rgba(16,185,129,0.08)":"rgba(251,191,36,0.08)",border:`1px solid ${clinic.setupStatus==="live"?"rgba(16,185,129,0.2)":"rgba(251,191,36,0.2)"}`,display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:6,height:6,borderRadius:99,background:clinic.setupStatus==="live"?"#10b981":"#fbbf24",boxShadow:clinic.setupStatus==="live"?"0 0 6px #10b981":"0 0 6px #fbbf24",animation:clinic.setupStatus==="live"?"":"aiPulse 2s ease infinite"}}/>
            <span style={{fontSize:11,fontWeight:700,color:clinic.setupStatus==="live"?"#10b981":"#fbbf24"}}>{clinic.setupStatus==="live"?"Live":"Setup in progress"}</span>
          </div>}
          {/* EnvSwitch */}
          {!isOperator&&<button onClick={()=>{const next=isDemoMode?"live":"demo";try{localStorage.setItem("fm_env",next);}catch{}setIsDemoMode(next!=="live");setUser(null);}} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${isDemoMode?"rgba(255,138,42,0.25)":"rgba(76,201,255,0.25)"}`,background:isDemoMode?"rgba(255,138,42,0.1)":"rgba(76,201,255,0.1)",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,transition:"all .15s"}} title={isDemoMode?"Switch to Live Mode (Supabase)":"Switch to Demo Mode (localStorage)"}>{isDemoMode?"🧪 Demo":"🚀 Live"}</button>}
          {/* Language switcher — only for clinic users */}
          {!isOperator&&<div style={{display:"flex",gap:3}}>
            {[{code:"en",flag:"🇬🇧"},{code:"de",flag:"🇩🇪"},{code:"tr",flag:"🇹🇷"}].map(l=>
              <button key={l.code} onClick={()=>{setLang(l.code);setLoginLang(l.code);}} style={{width:32,height:32,borderRadius:9,background:lang===l.code?"rgba(76,201,255,0.08)":"transparent",border:lang===l.code?"1px solid rgba(76,201,255,0.15)":"1px solid transparent",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{l.flag}</button>
            )}
          </div>}
          {/* Notification bell — only for clinic users */}
          {!isOperator&&<div style={{position:"relative"}}>
            <button onClick={()=>{setNotifOpen(!notifOpen);if(!notifOpen)markNotifsRead();}} style={{width:36,height:36,borderRadius:10,background:notifOpen?"rgba(76,201,255,0.08)":"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"rgba(167,177,195,0.6)",position:"relative",transition:"all .15s"}}>🔔
              {unreadNotifs>0&&<span style={{position:"absolute",top:-3,right:-3,width:16,height:16,borderRadius:99,background:"#ff8a2a",color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadNotifs}</span>}
            </button>
            {notifOpen&&<div style={{position:"absolute",top:"100%",right:0,width:380,maxHeight:440,overflowY:"auto",marginTop:8,borderRadius:14,background:"#162032",border:"1px solid rgba(255,255,255,0.08)",zIndex:200,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
              <div style={{padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,0.06)",fontWeight:800,fontSize:14}}>Notifications</div>
              {myNotifs.length===0&&<div style={{padding:24,textAlign:"center",color:"rgba(167,177,195,0.4)"}}>No notifications</div>}
              {myNotifs.map(n=><div key={n.id} style={{padding:"12px 18px",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",gap:10,alignItems:"flex-start",background:n.read?"transparent":"rgba(76,201,255,0.03)"}}>
                <div style={{width:28,height:28,borderRadius:8,background:`${NOTIF_COLORS[n.type]||"rgba(167,177,195,0.1)"}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{NOTIF_ICONS[n.type]||"🔔"}</div>
                <div><div style={{fontSize:13,lineHeight:1.4,color:n.read?"rgba(167,177,195,0.6)":"rgba(232,238,252,0.9)"}}>{n.text}</div><div style={{fontSize:11,color:"rgba(167,177,195,0.35)",marginTop:3}}>{timeAgo(n.time)}</div></div>
              </div>)}
            </div>}
          </div>}
          {/* System status mini */}
          <div style={{display:"flex",gap:6}}>
            {[{s:true,c:"#10b981",t:"AI Online"},{s:true,c:"#10b981",t:"WA Connected"}].map((it,i)=><div key={i} title={it.t} style={{width:8,height:8,borderRadius:99,background:it.c,boxShadow:`0 0 6px ${it.c}`}}/>)}
          </div>
        </div>

        <div style={{flex:1,overflow:"auto"}}>

        {/* DASHBOARD — hidden for operator */}
        {view==="dashboard"&&clinic&&!isOperator&&<DashboardView/>}

        {/* INBOX */}
        {view==="inbox"&&<InboxView/>}

        {/* PIPELINE */}
        {view==="pipeline"&&<div style={{padding:"20px 32px"}}><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,minHeight:"calc(100vh - 100px)"}}>
          {STAGES.map(stage=>{const items=myLeads.filter(l=>l.stage===stage.id);return<div key={stage.id} onDragOver={e=>e.preventDefault()} onDrop={()=>handleDrop(stage.id)} style={{background:"#162032",borderRadius:14,border:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{color:stage.color,fontSize:15}}>{stage.icon}</span><span style={{fontWeight:800,fontSize:14}}>{stage.label}</span></div><span style={{background:`${stage.color}15`,color:stage.color,fontSize:12,fontWeight:800,padding:"3px 10px",borderRadius:8}}>{items.length}</span></div>
            <div style={{flex:1,padding:8,display:"flex",flexDirection:"column",gap:8,overflowY:"auto"}}>{items.map(lead=>{const cs=CONV_STATUS[lead.convStatus];const highlight=lead.convStatus==="needs_medical_review"||lead.convStatus==="waiting_for_clinic_reply";return<div key={lead.id} draggable onDragStart={()=>setDragItem(lead.id)} onClick={()=>openPatient(lead.id)} style={{padding:12,borderRadius:12,background:highlight?"rgba(255,138,42,0.06)":"rgba(255,255,255,0.04)",border:`1px solid ${highlight?"rgba(255,138,42,0.2)":"rgba(255,255,255,0.08)"}`,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=highlight?"rgba(255,138,42,0.4)":`${stage.color}50`} onMouseLeave={e=>e.currentTarget.style.borderColor=highlight?"rgba(255,138,42,0.2)":"rgba(255,255,255,0.08)"}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{lead.name}</div>
              <div style={{fontSize:12,color:"rgba(167,177,195,0.6)",marginBottom:6}}>{lead.treatment}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}><span style={{color:"rgba(167,177,195,0.4)"}}>{lead.country}</span><div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:10,color:getLeadScore(lead).color}} title={`Score: ${getLeadScore(lead).score}%`}>{getLeadScore(lead).icon}</span>{cs&&<span style={{padding:"2px 7px",borderRadius:5,fontSize:10,fontWeight:700,background:`${cs.color}15`,color:cs.color}}>{cs.icon}</span>}</div></div>
            </div>;})}</div>
          </div>;})}
        </div></div>}

        {/* APPOINTMENTS */}
        {view==="appointments"&&<AppointmentsView/>}

        {/* ANALYTICS */}
        {view==="analytics"&&clinic&&<AnalyticsView/>}

        {/* AI CONTROL */}
        {view==="ai_control"&&clinic&&<AIControlView/>}

        {/* WHATSAPP SETUP */}
        {view==="whatsapp_setup"&&clinic&&<WhatsAppSetup/>}

        {/* AUTOMATIONS */}
        {view==="automations"&&clinic&&<AutomationsView/>}

        {/* FILES */}
        {view==="files"&&clinic&&<FilesView/>}

        {/* REVENUE */}
        {view==="revenue"&&clinic&&<RevenueView/>}

        {/* ADD-ONS */}
        {view==="addons"&&clinic&&<AddonsView/>}

        {/* BILLING */}
        {view==="billing"&&clinic&&<BillingView/>}

        {/* SETTINGS */}
        {view==="settings"&&<SettingsView/>}

        {/* AUDIT LOG */}
        {view==="audit_log"&&<AuditLogView/>}

        {/* SUPPORT */}
        {view==="support"&&<SupportView/>}

        {/* OPERATOR CONSOLE */}
        {view==="operator"&&(isAdmin||isOperator)&&<OperatorApp/>}

        </div></div>
    </div>
    {/* ═══ GUIDED PRODUCT TOUR ═══ */}
    {user&&clinic&&!isOperator&&<TourWelcomeModal/>}
    {tourActive&&!isOperator&&<ProductTour/>}
    </AppContext.Provider>
    </ErrorBoundary>
  );
}

/* ═══ OPERATOR HEADER STATUS PILLS ═══ */
/* ═══ OPERATOR CLINIC SEARCH ═══ */
function OperatorSearch({ setView, setOpSubTab }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [clinicCache, setClinicCache] = useState([]);

  // Load clinics once
  useEffect(() => {
    import("./src/api/client").then(fmApi => {
      fmApi.getPlatformClinics({ limit: 100 }).then(res => {
        const list = Array.isArray(res?.clinics) ? res.clinics : [];
        setClinicCache(list);
      }).catch(() => {});
    });
  }, []);

  // Filter clinics by query
  useEffect(() => {
    if (!query || query.length < 1) { setResults([]); return; }
    const q = query.toLowerCase();
    const filtered = clinicCache.filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.slug || "").toLowerCase().includes(q) ||
      (c.plan_name || "").toLowerCase().includes(q) ||
      (c.workspace_state || "").toLowerCase().includes(q)
    ).slice(0, 8);
    setResults(filtered);
  }, [query, clinicCache]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 340 }}>
      <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Search clinics..."
        style={{ width: "100%", padding: "9px 14px 9px 36px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#fff", fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "rgba(167,177,195,0.3)" }}>🔍</span>
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, width: "100%", maxHeight: 320, overflowY: "auto", marginTop: 6, borderRadius: 12, background: "#162032", border: "1px solid rgba(255,255,255,0.08)", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.4)" }}>{results.length} clinics</span>
            <span style={{ fontSize: 10, color: "rgba(167,177,195,0.3)" }}>ESC to close</span>
          </div>
          {results.map(c => (
            <div key={c.id} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 10, alignItems: "center" }}
              onMouseDown={() => { setView("operator"); setOpSubTab("clinics"); setQuery(""); setOpen(false); }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(76,201,255,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 16 }}>🏥</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name || "—"}</div>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.5)" }}>{c.email || ""} · {c.plan_name || "No plan"} · {c.workspace_state || ""}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: c.workspace_state === "active" ? "#10b981" : "#eab308" }}>{c.workspace_state || ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OperatorHeaderPills({ setView, setOpSubTab, totalActions }) {
  const [clock, setClock] = useState("");
  const [activeClinics, setActiveClinics] = useState(null);
  const [visitors, setVisitors] = useState(null);

  // Clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, []);

  // Load data
  useEffect(() => {
    const loadAll = async () => {
      try {
        const fmApi = await import("./src/api/client");
        // Active clinics
        try {
          const res = await fmApi.getPlatformClinics({ limit: 100 });
          const list = Array.isArray(res?.clinics) ? res.clinics : [];
          const active = list.filter(c => c.subscription_status === "active" || c.workspace_state === "active");
          setActiveClinics(active.length);
        } catch (e) { console.warn("[header] clinics failed:", e); }
        // Visitors
        try {
          const res = await fmApi.getVisitorStats();
          const v = parseInt(res?.today?.visitors) || parseInt(res?.month?.visitors) || 0;
          setVisitors(v);
        } catch (e) { console.warn("[header] visitors failed:", e); }
      } catch {}
    };
    loadAll();
    const iv = setInterval(loadAll, 60000);
    return () => clearInterval(iv);
  }, []);

  const pill = (bg, border, color, cursor) => ({
    display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 10,
    background: bg, border: `1px solid ${border}`, cursor: cursor || "default",
    transition: "all .15s", fontSize: 12, fontWeight: 700, color,
  });

  const hasActions = totalActions > 0;

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }}>
      {/* Clock */}
      <div style={pill("rgba(255,255,255,0.03)", "rgba(255,255,255,0.06)", "rgba(167,177,195,0.5)")}>
        <span style={{ fontSize: 11 }}>{clock}</span>
      </div>
      {/* Action Needed */}
      {hasActions && (
        <div style={pill("rgba(239,68,68,0.08)", "rgba(239,68,68,0.2)", "#ef4444", "pointer")}
          onClick={() => { setView("operator"); setOpSubTab("dashboard"); }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.14)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: "#ef4444", boxShadow: "0 0 8px #ef4444", animation: "fmPulse 2s infinite" }} />
          <span>Action Needed ({totalActions})</span>
        </div>
      )}
      {/* Active Clinics */}
      <div style={pill("rgba(16,185,129,0.06)", "rgba(16,185,129,0.12)", "#10b981", "pointer")}
        onClick={() => { setView("operator"); setOpSubTab("clinics"); }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.12)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(16,185,129,0.06)"}>
        <span>Active Clinics: {activeClinics !== null ? activeClinics : "..."}</span>
      </div>
      {/* Visitors */}
      <div style={pill("rgba(59,130,246,0.06)", "rgba(59,130,246,0.12)", "#3b82f6", "pointer")}
        onClick={() => { setView("operator"); setOpSubTab("analytics"); }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.12)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(59,130,246,0.06)"}>
        <span>Visitors: {visitors !== null ? visitors : "..."}</span>
      </div>
    </div>
  );
}
