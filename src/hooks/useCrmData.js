import { useEffect, useMemo } from "react";
import * as fmApi from "../api/client";
import { usePatientStore } from "../stores/patientStore";
import { useAppointmentStore } from "../stores/appointmentStore";
import { useInboxStore } from "../stores/inboxStore";
import { useBillingStore } from "../stores/billingStore";
import { useClinicStore } from "../stores/clinicStore";
import { CONV_STATUS, PLAN_LIMITS, MSG_TEMPLATES } from "../data/constants";

const IS_CLIENT_MODE = window.location.hostname === "crm.flowmatix.io" || window.location.hostname === "localhost";

export function useCrmData({
  user, leads, setLeads, appts, msgs, invoices,
  clinic, activeClinicId, adminClinic, setAdminClinic,
  setClinics, myLeads, myAppts, allClinicMsgs, myAutomations,
  inboxFilter, getCS, showT, logAction, addTL, setConvStatus,
  openPatient, sendPaymentLink, moveLead,
  demoMode, setDemoMode, enrichDemoData, setSuccessModal,
  setLang, setLoginLang,
}) {

  /* ═══ API-FIRST DATA LOADING ═══ */
  useEffect(() => {
    if (!user) return;
    if (user.apiRole === "clinic_doctor") {
      // Doctor: only load appointments (for calendar)
      useAppointmentStore.getState().fetchAppointments();
      return;
    }
    const orgId = user.orgId || user.clinicId;
    Promise.all([
      usePatientStore.getState().fetchPatients(),
      useAppointmentStore.getState().fetchAppointments(),
      orgId ? useInboxStore.getState().fetchConversations(orgId) : Promise.resolve(),
      useBillingStore.getState().fetchInvoices(),
      useClinicStore.getState().fetchClinic().then(res => {
        if (res?.clinic && orgId) {
          const cd = res.clinic;
          const c = { ...cd, plan: cd.plan || "core", status: cd.status || "active", type: cd.type, setupStatus: (cd.onboarding_completed || cd.onboarded_at) ? "live" : (cd.setup_status || "new"), onboarded: cd.onboarded_at, lastLogin: new Date().toISOString(), stats: { leadsMonth: 0, bookingsMonth: 0, convRate: 0, aiHandled: 0, activeConvs: 0, avgResponse: "—" }, notifications: [], billing: cd.billing || null, cancelled_at: cd.cancelled_at || null, clinicEmail: cd.clinicEmail || cd.email };
          setClinics(prev => { const exists = prev.find(x => x.id === c.id); return exists ? prev.map(x => x.id === c.id ? { ...x, ...c } : x) : [...prev, c]; });
          if (!adminClinic) setAdminClinic(orgId);
          if (cd.locale && !localStorage.getItem("fm_lang")) { setLang(cd.locale); setLoginLang(cd.locale); }
          try {
            fmApi.getAutomations().then(aRes => {
              if (aRes?.automations?.length) {
                setClinics(prev => prev.map(cx => cx.id === orgId ? { ...cx, automations: aRes.automations.map(a => ({ id: a.id, name: a.name, type: a.type, trigger: a.trigger, action: a.action, active: a.active !== false, runs: a.runs || 0, lastRun: a.lastRun || null, locked: a.locked || false, min_plan: a.min_plan || "core", n8n_synced: a.n8n_synced || false, n8n_workflow_id: a.n8n_workflow_id || null })) } : cx));
              }
            });
          } catch (e) {}
        }
      }),
      useClinicStore.getState().fetchAnalyticsConfig(),
      IS_CLIENT_MODE && fmApi.getClinicMode().then(res => { if (res?.mode) { setDemoMode(res.mode === "demo"); if (res.mode === "demo") setTimeout(() => enrichDemoData(), 200); } }).catch(e => { console.error('[CRM] getClinicMode failed:', e.message || e); }),
    ]).catch(() => {});
  }, [user]);

  /* ═══ USAGE METRICS ═══ */
  const usageMetrics = useMemo(() => {
    if (!clinic) return null;
    const limits = PLAN_LIMITS[clinic.plan] || PLAN_LIMITS.core;
    const raw = [
      { key: "patients", label: "Patients", icon: "👥", color: "#4cc9ff", value: myLeads.length, limit: limits.patients },
    ];
    const metrics = raw.map(m => {
      const isUnlimited = m.limit === null;
      const pct = isUnlimited ? 0 : Math.round(m.value / m.limit * 100);
      return { ...m, pct, isUnlimited, isWarning: !isUnlimited && pct > 80, isUrgent: !isUnlimited && pct > 95 };
    });
    const anyWarning = metrics.some(m => m.isWarning);
    const anyUrgent = metrics.some(m => m.isUrgent);
    const planOrder = ["core", "pro", "operations", "enterprise"];
    const curIdx = planOrder.indexOf(clinic.plan);
    const suggestedPlan = curIdx < planOrder.length - 1 ? planOrder[curIdx + 1] : null;
    return { metrics, anyWarning, anyUrgent, suggestedPlan };
  }, [clinic, myLeads, allClinicMsgs, myAutomations, invoices, activeClinicId]);

  /* ═══ TODAY METRICS ═══ */
  const todayMetrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const newPatientsToday = myLeads.filter(l => l.lastAiInteraction && l.lastAiInteraction.startsWith(today)).length;
    const aiConvsToday = allClinicMsgs.filter(c => c.msgs && c.msgs.some(m => m.sender === "bot")).length;
    const apptsToday = (myAppts || []).filter(a => a.date === today && (a.status === "booked" || a.status === "confirmed")).length;
    const arrivalsToday = myLeads.filter(l => l.flightConfirmed && l.flightConfirmed.date === today).length;
    const driverPickupsToday = myLeads.filter(l => l.flightConfirmed && l.flightConfirmed.date === today && l.logistics && l.logistics.driverStatus === "confirmed").length;
    const paidToday = invoices.filter(i => i.paidDate && i.paidDate.startsWith(today) && (i.clinicId === activeClinicId || !i.clinicId));
    const paymentsToday = paidToday.length;
    const paymentAmountToday = paidToday.reduce((s, i) => s + (i.gross || 0), 0);
    const automationsToday = myAutomations.filter(a => a.lastRun && a.lastRun.startsWith(today)).length;
    return { newPatientsToday, aiConvsToday, apptsToday, arrivalsToday, driverPickupsToday, paymentsToday, paymentAmountToday, automationsToday };
  }, [myLeads, allClinicMsgs, myAppts, myAutomations, invoices, activeClinicId]);

  /* ═══ LEAD SCORE + SLA ═══ */
  const getLeadScore = (l) => {
    let score = 0;
    if (l.photos || l.photoUrls?.length > 0) score += 20;
    if (l.reviewData) score += 25;
    if (l.booking) score += 20;
    if (l.flightConfirmed?.date) score += 15;
    if (invoices.some(i => i.leadId === l.id && i.status === "paid")) score += 20;
    if (l.convStatus === "deposit_paid") score += 10;
    if (l.email) score += 5; if (l.phone) score += 5;
    if (l.lastAiInteraction) { const hrs = (Date.now() - new Date(l.lastAiInteraction).getTime()) / 3600000; if (hrs < 24) score += 10; else if (hrs < 72) score += 5; }
    const pct = Math.min(score, 100);
    return { score: pct, tier: pct >= 70 ? "hot" : pct >= 40 ? "warm" : "cold", color: pct >= 70 ? "#ef4444" : pct >= 40 ? "#fbbf24" : "#6b7280", icon: pct >= 70 ? "🔥" : pct >= 40 ? "🌡️" : "❄️", label: pct >= 70 ? "Hot" : pct >= 40 ? "Warm" : "Cold" };
  };

  const getSLA = (l) => {
    if (!l.lastAiInteraction || l.convStatus === "closed" || l.convStatus === "resolved") return null;
    const needsReply = ["needs_medical_review", "waiting_for_clinic_reply", "human_takeover", "booking_pending"];
    if (!needsReply.includes(l.convStatus)) return null;
    const hrs = Math.round((Date.now() - new Date(l.lastAiInteraction).getTime()) / 3600000);
    const threshold = l.convStatus === "needs_medical_review" ? 24 : l.convStatus === "human_takeover" ? 2 : 48;
    const pct = Math.min(Math.round(hrs / threshold * 100), 100);
    return { hrs, threshold, pct, overdue: hrs >= threshold, label: hrs >= threshold ? `⚠️ ${hrs}h overdue` : `${hrs}h / ${threshold}h`, color: pct >= 100 ? "#ef4444" : pct >= 75 ? "#fbbf24" : "#10b981" };
  };

  /* ═══ AI ACTION SUGGESTIONS ═══ */
  const getAiSuggestions = (l) => {
    const s = [];
    if (!l) return s;
    if (!l.photos && (!l.photoUrls || l.photoUrls.length === 0) && l.convStatus !== "closed") s.push({ id: "ask_photos", icon: "📸", label: "Ask for photos", desc: "Patient hasn't sent photos yet", action: () => { const tpl = MSG_TEMPLATES.find(t => t.id === "t3"); if (tpl) sendTemplateMsg(l.id, tpl); }, priority: 1 });
    if (l.convStatus === "needs_medical_review") s.push({ id: "do_review", icon: "⚕️", label: "Complete medical review", desc: `${l.photoUrls?.length || 0} photos waiting for evaluation`, action: () => openPatient(l.id), priority: 0 });
    if (l.reviewData && !invoices.some(i => i.leadId === l.id && i.status === "paid") && l.convStatus !== "deposit_paid") s.push({ id: "send_deposit", icon: "💳", label: "Send deposit link", desc: `${l.reviewData.price} — send 25% deposit request`, action: () => { const price = parseInt(String(l.reviewData.price || 0).replace(/[^0-9]/g, "")) || 0; sendPaymentLink(Math.max(Math.round(price * 0.25), 500), l.id, "auto"); }, priority: 1 });
    if (l.treatmentPlanSentAt) { const hrs = (Date.now() - new Date(l.treatmentPlanSentAt).getTime()) / 3600000; if (hrs >= 48 && l.convStatus === "booking_pending") s.push({ id: "followup", icon: "🔄", label: "Send follow-up", desc: `No reply for ${Math.round(hrs)}h — send reminder`, action: () => { const tpl = MSG_TEMPLATES.find(t => t.id === "t6"); if (tpl) sendTemplateMsg(l.id, tpl); }, priority: 0 }); }
    if (l.booking && !l.flightConfirmed?.date) s.push({ id: "ask_flight", icon: "✈️", label: "Request flight details", desc: "Appointment booked but no flight info yet", action: () => { const tpl = MSG_TEMPLATES.find(t => t.id === "t7"); if (tpl) sendTemplateMsg(l.id, tpl); }, priority: 2 });
    if (l.stage === "contacted" && l.reviewData) s.push({ id: "move_booked", icon: "📅", label: "Move to Booked", desc: "Treatment plan sent — ready to book?", action: () => moveLead(l.id, "booked"), priority: 2 });
    if (!l.consent) s.push({ id: "get_consent", icon: "📋", label: "Request data consent", desc: "DSGVO/GDPR consent not recorded", action: () => { setLeads(p => p.map(x => x.id === l.id ? { ...x, consent: { granted: true, timestamp: new Date().toISOString(), method: "verbal" } } : x)); fmApi.updatePatient(l.id, { consent_given: true }).catch(e => console.warn("consent save:", e)); addTL(l.id, "system", "Data consent recorded (verbal)"); fmApi.addTimelineEntry(l.id, { type: "note", source: "crm", content: "DSGVO consent recorded (verbal)" }).catch(() => {}); showT("Consent recorded"); }, priority: 3 });
    return s.sort((a, b) => a.priority - b.priority);
  };

  /* ═══ TEMPLATE RESOLVER ═══ */
  const resolveTemplate = (tpl, lead) => {
    if (!tpl || !lead) return tpl?.text || "";
    let text = tpl.text;
    // {time} = patient check-in time (OP start minus offset), not raw OP time
    const _rawTime = lead.booking?.time || "TBD";
    let _patientTime = _rawTime;
    if (_rawTime !== "TBD" && clinic?.checkinOffsetMinutes) {
      const [_h, _m] = _rawTime.split(":").map(Number);
      if (!isNaN(_h)) { const _tot = Math.max(0, _h * 60 + (_m||0) - (clinic.checkinOffsetMinutes || 60)); _patientTime = `${String(Math.floor(_tot/60)).padStart(2,"0")}:${String(_tot%60).padStart(2,"0")}`; }
    }
    const vars = { "{first_name}": lead.name?.split(" ")[0] || lead.name, "{name}": lead.name, "{treatment}": lead.treatment || "", "{doctor}": lead.assigned || "Dr. Yilmaz", "{date}": lead.booking?.date || "TBD", "{time}": _patientTime, "{price}": lead.reviewData?.price || "", "{payment_link}": "checkout.stripe.com/pay/...", "{clinic}": clinic?.name || "Flowmatix" };
    Object.entries(vars).forEach(([k, v]) => { text = text.replaceAll(k, v); });
    return text;
  };

  const sendTemplateMsg = (leadId, tpl) => {
    const lead = leads.find(l => l.id === leadId); if (!lead || !tpl) return;
    const resolved = resolveTemplate(tpl, lead);
    const cid = activeClinicId;
    useInboxStore.getState().setMsgs(prev => { const cm = [...(prev[cid] || [])]; const idx = cm.findIndex(c => c.leadId === leadId); if (idx > -1) { cm[idx] = { ...cm[idx], msgs: [...(cm[idx].msgs || []), { text: `🤖 Template "${tpl.name}": ${resolved}`, time: new Date().toLocaleTimeString("de", { hour: "2-digit", minute: "2-digit" }), sender: "bot" }] }; } return { ...prev, [cid]: cm }; });
    addTL(leadId, "bot", `Template sent: ${tpl.name}`);
    logAction("template_sent", lead.name, `${tpl.name}: ${resolved.substring(0, 80)}…`);
    showT(`Template "${tpl.name}" sent to ${lead.name}`);
  };

  /* ═══ FLIGHT MISMATCH DETECTION ═══ */
  const flightAlerts = myLeads.filter(l => {
    if (!l.flightConfirmed?.date || !l.booking?.date || l.flightConfirmed?.dismissed) return false;
    const fd = new Date(l.flightConfirmed.date);
    const bd = new Date(l.booking.date);
    const diffDays = Math.round((bd - fd) / (1000 * 60 * 60 * 24));
    return diffDays < 0 || diffDays > 3;
  }).map(l => {
    const fd = new Date(l.flightConfirmed.date);
    const bd = new Date(l.booking.date);
    const diffDays = Math.round((bd - fd) / (1000 * 60 * 60 * 24));
    const type = diffDays < 0 ? "arrives_after" : "arrives_too_early";
    return { ...l, flightDiff: diffDays, alertType: type, severity: diffDays < 0 ? "critical" : "warning" };
  });
  const flightMatches = myLeads.filter(l => l.flightConfirmed?.date && l.booking?.date && !flightAlerts.find(a => a.id === l.id));

  /* Search results */
  const searchResults = (searchQuery) => searchQuery.length >= 2 ? [
    ...myLeads.filter(l => (l.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || (l.treatment || "").toLowerCase().includes(searchQuery.toLowerCase()) || (l.phone || "").includes(searchQuery) || l.country?.toLowerCase().includes(searchQuery.toLowerCase()) || l.email?.toLowerCase().includes(searchQuery.toLowerCase()) || l.language?.toLowerCase().includes(searchQuery.toLowerCase())).map(l => { const cs = CONV_STATUS[l.convStatus]; return { type: "lead", id: l.id, label: l.name, sub: `${l.treatment} · ${l.country || ""}`, icon: "👤", statusColor: cs?.color, statusLabel: cs?.icon }; }),
    ...myAppts.filter(a => (a.patient || "").toLowerCase().includes(searchQuery.toLowerCase()) || (a.treatment || "").toLowerCase().includes(searchQuery.toLowerCase())).map(a => ({ type: "appt", id: a.id, label: a.patient, sub: `${a.treatment} — ${a.date}`, icon: "📅" })),
    ...allClinicMsgs.filter(m => (m.name || "").toLowerCase().includes(searchQuery.toLowerCase())).map(m => ({ type: "chat", id: m.id, label: m.name, sub: "Conversation", icon: "💬", data: m })),
  ] : [];

  return {
    usageMetrics, todayMetrics, getLeadScore, getSLA, getAiSuggestions,
    resolveTemplate, sendTemplateMsg, flightAlerts, flightMatches, searchResults,
  };
}
