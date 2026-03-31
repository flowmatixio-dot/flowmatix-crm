import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { streamFetch } from "../../api/client";

const SUGGESTIONS_DE = [
  "Wie teste ich mein System jetzt?",
  "Wie bekomme ich meine erste WhatsApp Anfrage?",
  "Was passiert, wenn ein Patient schreibt?",
  "Wie läuft alles automatisch ab?",
  "Warum werden meine WhatsApp Nachrichten nicht gesendet?",
  "Wo sehe ich meine Patienten?",
  "Wie viele Patienten kann ich mit meinem Plan haben?",
  "Was passiert nach der OP mit dem Patienten?",
  "Wie funktioniert die Arzt-Bewertung?",
  "Was ist die 24h WhatsApp Regel?",
];
const SUGGESTIONS_EN = [
  "How do I test my system now?",
  "How do I get my first WhatsApp lead?",
  "What happens when a patient messages me?",
  "How does everything run automatically?",
  "Why are my WhatsApp messages not being sent?",
  "Where can I see my patients?",
  "How many patients can I have on my plan?",
  "What happens after the surgery?",
  "How does the doctor review work?",
  "What is the 24h WhatsApp rule?",
];
const SUGGESTIONS_TR = [
  "Sistemi şimdi nasıl test ederim?",
  "İlk WhatsApp hastamı nasıl alırım?",
  "Hasta yazdığında ne olur?",
  "Her şey otomatik nasıl çalışıyor?",
  "WhatsApp mesajlarım neden gönderilmiyor?",
  "Hastalarımı nerede görebilirim?",
  "Planımla kaç hastam olabilir?",
  "Ameliyattan sonra ne olur?",
  "Doktor değerlendirmesi nasıl çalışır?",
  "24 saat WhatsApp kuralı nedir?",
];

/* ═══ ANIMATED FLOWMATIX ORB ═══ */
function FlowmatixOrb({ size = 36, active = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", position: "relative", flexShrink: 0,
      background: "radial-gradient(circle at 30% 30%, #4cc9ff, #0a2540)",
      boxShadow: active
        ? "0 0 20px rgba(76,201,255,0.6), 0 0 40px rgba(76,201,255,0.2)"
        : "0 0 12px rgba(76,201,255,0.4)",
      animation: "fmOrbPulse 2.5s infinite ease-in-out",
    }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.2)",
      }} />
      <div style={{
        position: "absolute", inset: 3, borderRadius: "50%",
        border: "1px solid rgba(76,201,255,0.15)",
        animation: "fmOrbRing 3s infinite ease-in-out",
      }} />
      <style>{`
        @keyframes fmOrbPulse{0%{transform:scale(1)}50%{transform:scale(1.06)}100%{transform:scale(1)}}
        @keyframes fmOrbRing{0%{opacity:.3;transform:scale(1)}50%{opacity:.7;transform:scale(1.05)}100%{opacity:.3;transform:scale(1)}}
        @keyframes fmTypeDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}
      `}</style>
    </div>
  );
}

/* ═══ TYPING INDICATOR ═══ */
function AITypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 2px", height: 20 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#4cc9ff",
          animation: `fmTypeDot 1.4s ease-in-out ${i * 0.16}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ═══ SIMPLE MARKDOWN RENDERER ═══ */
function renderMd(text, onNav) {
  if (!text) return text;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Headings
    if (line.match(/^#{1,3}\s/)) {
      const clean = line.replace(/^#{1,3}\s+/, "");
      return <div key={i} style={{ fontWeight: 700, fontSize: 14, marginTop: 8, marginBottom: 4, color: "rgba(232,238,252,0.95)" }}>{renderInline(clean, onNav)}</div>;
    }
    // Bullet points
    if (line.match(/^[\u2022\-]\s/) || (line.match(/^\*\s/) && !line.startsWith("**"))) {
      const clean = line.replace(/^[\u2022\-*]\s+/, "");
      return <div key={i} style={{ display: "flex", gap: 6, marginBottom: 2 }}><span style={{ color: "rgba(76,201,255,0.5)", flexShrink: 0 }}>{"\u2022"}</span><span>{renderInline(clean, onNav)}</span></div>;
    }
    // Empty line
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
    // Normal text
    return <div key={i} style={{ marginBottom: 2 }}>{renderInline(line, onNav)}</div>;
  });
}
function renderInline(text, onNav) {
  if (!text) return text;
  // Step 1: Parse links FIRST (before bold, so bold-wrapped links work)
  const linkParts = [];
  let ll = 0;
  const linkRe = /\[([^\]]+)\]\(view:([^)]+)\)/g;
  let lm;
  while ((lm = linkRe.exec(text)) !== null) {
    if (lm.index > ll) linkParts.push(text.slice(ll, lm.index));
    const target = lm[2];
    const label = lm[1];
    linkParts.push(
      <span key={"l" + lm.index} onClick={() => onNav && onNav(target)}
        style={{ color: "#4FC3F7", cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}>{label}</span>
    );
    ll = lm.index + lm[0].length;
  }
  if (ll < text.length) linkParts.push(text.slice(ll));
  if (linkParts.length === 0) linkParts.push(text);
  // Step 2: Parse bold in remaining string segments
  const result = [];
  for (let i = 0; i < linkParts.length; i++) {
    const p = linkParts[i];
    if (typeof p !== "string") { result.push(p); continue; }
    const boldRe = /\*\*([^*]+)\*\*/g;
    let bm, bl = 0;
    while ((bm = boldRe.exec(p)) !== null) {
      if (bm.index > bl) result.push(p.slice(bl, bm.index));
      result.push(<strong key={"b" + i + "-" + bm.index} style={{ fontWeight: 700, color: "rgba(232,238,252,0.95)" }}>{bm[1]}</strong>);
      bl = bm.index + bm[0].length;
    }
    if (bl === 0) result.push(p);
    else if (bl < p.length) result.push(p.slice(bl));
  }
  return result.length === 1 ? result[0] : result;
}

/* ═══ MESSAGE BUBBLE ═══ */
function MessageBubble({ msg, isStreaming, onNav }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      alignItems: "flex-start",
      marginBottom: 12, animation: "fmMsgIn .25s ease-out",
    }}>
      {!isUser && (
        <div style={{ marginRight: 6, marginTop: 2, flexShrink: 0 }}>
          <FlowmatixOrb size={24} active={isStreaming} />
        </div>
      )}
      <div style={{
        maxWidth: isUser ? "80%" : "100%", padding: "11px 15px", flex: isUser ? "none" : 1,
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isUser ? "#1f2c3a" : "#0f1b2a",
        border: `1px solid ${isUser ? "rgba(76,201,255,0.12)" : "rgba(255,255,255,0.06)"}`,
        color: isUser ? "rgba(255,255,255,0.92)" : "rgba(232,238,252,0.88)",
        fontSize: 13, lineHeight: 1.65, fontFamily: "inherit",
        wordBreak: "break-word",
      }}>
        {isUser ? msg.content : renderMd(msg.content, onNav)}
        {isStreaming && <span style={{
          display: "inline-block", width: 2, height: 14, background: "#4cc9ff",
          marginLeft: 2, verticalAlign: "text-bottom",
          animation: "fmCursorBlink 1s step-end infinite",
        }} />}
      </div>
      <style>{`
        @keyframes fmMsgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fmCursorBlink{0%,100%{opacity:1}50%{opacity:0}}
      `}</style>
    </div>
  );
}

/* ═══ MAIN WIDGET ═══ */
export default function AISupportWidget() {
  const {
    clinic, t, lang, setView, leads, appts, invoices, myAutomations, demoMode,
    workspaceState, userRole, usageMetrics, todayMetrics, flightAlerts, allClinicMsgs,
    activeClinicId,
  } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [actions, setActions] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);
  const suggestions = lang === "de" ? SUGGESTIONS_DE : lang === "tr" ? SUGGESTIONS_TR : SUGGESTIONS_EN;

  /* Auto-scroll disabled — user scrolls manually */

  /* Focus textarea on open */
  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 200);
  }, [isOpen]);

  /* Build FULL clinic context for AI support */
  const buildContext = useCallback(() => {
    if (!clinic) return {};
    const wa = clinic.waSetupProgress || {};
    const ai = clinic.aiConfig || {};
    const checks = {
      profile: !!(clinic.name && clinic.address && clinic.phone && clinic.clinicEmail),
      treatments: (clinic.treatments?.length || 0) > 0,
      calendar: !!ai.bookingRules,
      whatsapp: !!wa.connection_tested,
      wa_profile: !!(clinic.waProfile?.botName && clinic.waProfile?.infoText),
      bot_config: !!(ai.formality || ai.greetingStyle),
      templates: !!clinic.logisticsConfig?.pickupTemplateEn,
      team: (clinic.team?.length || 0) >= 1,
      languages: true,
      automations: (clinic.automations?.filter(a => a.active)?.length || 0) >= 2,
      invoicing: !!(clinic.bankName && clinic.iban),
      drivers: (clinic.drivers?.length || 0) >= 1,
      flights: clinic.logisticsConfig?.autoNotifyDriver === true,
      faq: (ai.faq?.length || 0) >= 2,
    };
    const completedSteps = Object.keys(checks).filter(k => checks[k]);
    const missingSteps = Object.keys(checks).filter(k => !checks[k]);

    // Patient stats
    const allLeads = leads || [];
    const byStage = { new: 0, contacted: 0, booked: 0, done: 0, cancelled: 0 };
    allLeads.forEach(l => { if (byStage[l.stage] !== undefined) byStage[l.stage]++; });
    const byConvStatus = {};
    allLeads.forEach(l => { const s = l.convStatus || "unknown"; byConvStatus[s] = (byConvStatus[s] || 0) + 1; });

    // Appointment stats
    const allAppts = appts || [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const apptsToday = allAppts.filter(a => (a.date || a.scheduledAt || "").slice(0, 10) === todayStr);
    const apptsFuture = allAppts.filter(a => new Date(a.date || a.scheduledAt) > now && a.status !== "cancelled" && a.status !== "canceled");

    // Invoice stats
    const allInvoices = invoices || [];
    const unpaidInvoices = allInvoices.filter(i => i.status === "unpaid" || i.status === "sent" || i.status === "overdue");
    const paidInvoices = allInvoices.filter(i => i.status === "paid");
    const totalRevenue = paidInvoices.reduce((s, i) => s + (i.gross || i.net || 0), 0);

    // Automation details
    const auts = (clinic.automations || myAutomations || []);
    const automationDetails = auts.map(a => ({
      name: a.name || a.type,
      type: a.type,
      active: !!a.active,
      runs: a.runs || 0,
      lastRun: a.lastRun || null,
    }));

    // Conversation stats
    const convs = allClinicMsgs || [];
    const openConvs = convs.filter(c => !["resolved", "closed"].includes(c.convStatus));
    const needsAction = convs.filter(c => ["human_takeover", "needs_medical_review", "waiting_for_clinic_reply"].includes(c.convStatus));

    // Plan limits
    const planLimits = { core: { patients: 250, team: 1 }, pro: { patients: 500, team: 3 }, operations: { patients: 1000, team: 5 }, enterprise: { patients: "unlimited", team: "unlimited" } };
    const currentPlan = clinic.plan || "core";
    const limits = planLimits[currentPlan] || planLimits.core;

    // Team details
    const team = (clinic.team || []).map(m => ({
      name: [m.first_name, m.last_name].filter(Boolean).join(" ") || m.name || m.email,
      role: m.role,
      active: m.active !== false,
    }));

    // Treatment types
    const treatments = (clinic.treatments || []).map(t => ({
      name: t.name,
      price: t.price,
      duration: t.duration,
    }));

    return {
      // Clinic basics
      clinicName: clinic.name || "",
      plan: currentPlan,
      planPrice: { core: "€690/mo", pro: "€990/mo", operations: "€1,490/mo", enterprise: "€2,500+/mo" }[currentPlan],
      planLimits: limits,
      setupCompleted: completedSteps.length,
      totalSetupSteps: Object.keys(checks).length,
      completedSteps,
      missingSteps,

      // Mode & state
      demoMode: !!demoMode,
      workspaceState: workspaceState || "demo",
      userRole: userRole || "admin",

      // WhatsApp
      whatsappConnected: checks.whatsapp,
      whatsappProfileSet: checks.wa_profile,
      whatsappTemplatesReady: checks.templates,

      // Bot
      botActive: !!ai.active,
      botConfigured: checks.bot_config,
      botGreeting: ai.greetingStyle ? "set" : "missing",
      botDescription: ai.formality ? "set" : "missing",
      faqCount: (ai.faq?.length || 0),

      // Calendar
      calendarConfigured: checks.calendar,
      bookingRules: ai.bookingRules ? { minNotice: ai.bookingRules.minNoticeHours + "h", slotDuration: ai.bookingRules.slotDurationMinutes + "min" } : null,

      // Team
      teamSize: team.length,
      teamMembers: team,
      teamLimit: limits.team,

      // Treatments
      treatments,
      treatmentCount: treatments.length,

      // Patients
      totalPatients: allLeads.length,
      patientLimit: limits.patients,
      patientsByStage: byStage,
      patientsByConvStatus: byConvStatus,
      patientsNeedingAction: needsAction.length,

      // Appointments
      appointmentsToday: apptsToday.length,
      appointmentsFuture: apptsFuture.length,
      totalAppointments: allAppts.length,

      // Invoices & Revenue
      totalInvoices: allInvoices.length,
      unpaidInvoices: unpaidInvoices.length,
      totalRevenue: totalRevenue,
      hasInvoicing: checks.invoicing,

      // Automations
      automationsActive: auts.filter(a => a.active).length,
      automationsTotal: auts.length,
      automationDetails,

      // Conversations
      openConversations: openConvs.length,
      conversationsNeedingAction: needsAction.length,

      // Logistics
      hasDrivers: checks.drivers,
      driverCount: (clinic.drivers?.length || 0),
      flightAlerts: (flightAlerts || []).length,

      // Usage (if available)
      usageMetrics: usageMetrics || null,
      todayMetrics: todayMetrics || null,
    };
  }, [clinic, leads, appts, invoices, myAutomations, demoMode, workspaceState, userRole, allClinicMsgs, usageMetrics, todayMetrics, flightAlerts]);

  /* Send with streaming */
  const sendMessage = useCallback(async (text) => {
    const content = (text || draft).trim();
    if (!content || isLoading || isStreaming) return;
    setDraft("");
    setError(null);
    setActions(null);

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg = { role: "user", content, createdAt: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    const history = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await streamFetch("/api/v1/clinic/ai-support/stream", {
        messages: history, context: buildContext(), lang,
      });

      setIsLoading(false);
      setIsStreaming(true);

      // Add empty assistant message
      const assistantMsg = { role: "assistant", content: "", createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, assistantMsg]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.done && parsed.suggestedActions) {
              setActions(parsed.suggestedActions);
            } else if (parsed.text) {
              fullText += parsed.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText };
                return updated;
              });
              /* scroll disabled — user controls scroll */
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(lang === "de" ? "Verbindungsfehler. Bitte versuche es erneut." : lang === "tr" ? "Bağlantı hatası. Lütfen tekrar deneyin." : "Connection error. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [draft, isLoading, isStreaming, messages, buildContext, lang]);

  /* Textarea auto-resize */
  const handleInput = (e) => {
    setDraft(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 100) + "px";
  };

  /* Keyboard */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const busy = isLoading || isStreaming;

  return (
    <>
      {/* ═══ BACKDROP (click outside to close) ═══ */}
      {isOpen && <div onClick={() => { if (Date.now() - (window.__fmBotOpenedAt || 0) < 2000) return; setIsOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 9999 }} />}

      {/* ═══ CHAT PANEL ═══ */}
      <div style={{
        position: "fixed", bottom: 80, right: 20, zIndex: 10000,
        width: 380, height: isOpen ? 520 : 0,
        borderRadius: 16,
        background: "#0b1420",
        border: "1px solid rgba(76,201,255,0.12)",
        boxShadow: "0 10px 50px rgba(0,0,0,0.7), 0 0 20px rgba(76,201,255,0.15)",
        display: "flex", flexDirection: "column",
        transform: isOpen ? "translateY(0) scale(1)" : "translateY(20px) scale(0.92)",
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? "auto" : "none",
        transition: "all .3s cubic-bezier(.4,0,.2,1)",
        fontFamily: "inherit",
        overflow: "hidden",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "14px 16px 12px",
          background: "linear-gradient(180deg, rgba(76,201,255,0.06) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FlowmatixOrb size={34} active={busy} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", letterSpacing: "-0.01em" }}>
                  Flowmatix AI Support
                </div>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.65)", marginTop: 1 }}>
                  {lang === "de" ? "Setup · WhatsApp · CRM Hilfe" : lang === "tr" ? "Kurulum · WhatsApp · CRM Yardım" : "Setup · WhatsApp · CRM Help"}
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{
              width: 28, height: 28, borderRadius: 7,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(167,177,195,0.6)", fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "inherit", transition: "all .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            >✕</button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "14px 14px 6px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(76,201,255,0.15) transparent",
        }}>
          {messages.length === 0 && !busy ? (
            <div style={{ paddingTop: 24 }}>
              <div style={{ textAlign: "center", marginBottom: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "rgba(232,238,252,0.85)", marginBottom: 5 }}>
                  {lang === "de" ? "Wie kann ich helfen?" : lang === "tr" ? "Nasil yardimci olabilirim?" : "How can I help?"}
                </div>
                <div style={{ fontSize: 12, color: "rgba(167,177,195,0.6)", lineHeight: 1.5 }}>
                  {lang === "de"
                    ? "Fragen zu Setup, WhatsApp, Bot oder CRM-Funktionen."
                    : lang === "tr"
                    ? "Kurulum, WhatsApp, bot veya CRM hakkında sorular."
                    : "Questions about setup, WhatsApp, bot config, or CRM."}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} style={{
                    padding: "10px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(232,238,252,0.65)", fontSize: 12.5,
                    textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                    transition: "all .2s", lineHeight: 1.4,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(76,201,255,0.06)"; e.currentTarget.style.borderColor = "rgba(76,201,255,0.2)"; e.currentTarget.style.color = "rgba(232,238,252,0.85)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(232,238,252,0.65)"; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  msg={msg}
                  isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                  onNav={setView}
                />
              ))}
              {isLoading && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
                  <FlowmatixOrb size={28} active />
                  <div style={{
                    padding: "11px 15px", borderRadius: "16px 16px 16px 4px",
                    background: "#0f1b2a", border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <AITypingDots />
                  </div>
                </div>
              )}
            </>
          )}
          {actions && actions.length > 0 && !busy && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, animation: "fmMsgIn .25s ease-out" }}>
              {actions.map((a, i) => (
                <button key={i} onClick={() => {
                  if (setView) {
                    setView(a.target || "settings");
                    setIsOpen(false);
                  }
                }} style={{
                  padding: "6px 12px", borderRadius: 8,
                  background: "rgba(76,201,255,0.08)",
                  border: "1px solid rgba(76,201,255,0.2)",
                  color: "#4cc9ff", fontSize: 11.5, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(76,201,255,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(76,201,255,0.08)"; }}
                >{a.label}</button>
              ))}
            </div>
          )}
          {error && (
            <div style={{
              padding: "8px 12px", borderRadius: 8, marginBottom: 8,
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)",
              color: "rgba(239,68,68,0.75)", fontSize: 12,
            }}>{error}</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ── */}
        <div style={{
          padding: "8px 12px 12px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 8,
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "5px 5px 5px 14px",
            transition: "border-color .15s",
          }}>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={lang === "de" ? "Frage stellen..." : lang === "tr" ? "Soru sorun..." : "Ask a question..."}
              rows={1}
              style={{
                flex: 1, resize: "none", border: "none", outline: "none",
                background: "transparent", color: "#fff", fontFamily: "inherit",
                fontSize: 13, lineHeight: 1.5, padding: "7px 0",
                maxHeight: 100,
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!draft.trim() || busy}
              style={{
                width: 34, height: 34, borderRadius: 9, border: "none",
                background: draft.trim() && !busy
                  ? "linear-gradient(135deg, #4cc9ff, #2b7cff)"
                  : "rgba(255,255,255,0.05)",
                color: draft.trim() && !busy ? "#fff" : "rgba(167,177,195,0.65)",
                fontSize: 16, cursor: draft.trim() && !busy ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all .2s",
                fontFamily: "inherit",
                boxShadow: draft.trim() && !busy ? "0 2px 12px rgba(76,201,255,0.25)" : "none",
              }}
            >↑</button>
          </div>
          <div style={{ textAlign: "center", marginTop: 5, fontSize: 9.5, color: "rgba(167,177,195,0.6)", letterSpacing: "0.02em" }}>
            Powered by Flowmatix AI
          </div>
        </div>
      </div>

      {/* ═══ FLOATING LAUNCHER ═══ */}
      <button
        id="fm-support-launcher"
        onClick={() => { setIsOpen(prev => { if (!prev) window.__fmBotOpenedAt = Date.now(); return !prev; }); }}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 10001,
          height: 44, width: isOpen ? 44 : "auto",
          borderRadius: isOpen ? 12 : 22,
          border: isOpen ? "none" : "1px solid rgba(76,201,255,0.18)",
          background: isOpen
            ? "rgba(255,255,255,0.06)"
            : "linear-gradient(135deg, rgba(15,22,35,0.95), rgba(11,20,32,0.95))",
          color: "#fff",
          padding: isOpen ? 0 : "0 16px 0 6px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: isOpen
            ? "0 2px 10px rgba(0,0,0,0.3)"
            : "0 4px 20px rgba(0,0,0,0.4), 0 0 15px rgba(76,201,255,0.1)",
          transition: "all .3s cubic-bezier(.4,0,.2,1)",
          fontSize: 13, fontWeight: 600,
        }}
      >
        {isOpen ? (
          <span style={{ fontSize: 16, lineHeight: 1, color: "rgba(167,177,195,0.7)" }}>✕</span>
        ) : (
          <>
            <FlowmatixOrb size={32} />
            <span style={{ color: "rgba(232,238,252,0.9)", letterSpacing: "0.01em" }}>{t("help_label") || "Help"}</span>
          </>
        )}
      </button>
    </>
  );
}
