import { updateClinicSettings } from "../../api/client";
import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { SETUP_CATS, CHECKS } from "./setupShared";

// Sub-page imports
import SetupOverview from "./SetupOverview";
import ClinicProfile from "./ClinicProfile";
import TreatmentTypes from "./TreatmentTypes";
import TeamPersonal from "./TeamPersonal";
import CalendarSettings from "./CalendarSettings";
import WhatsAppSetup from "./WhatsAppSetup";
import BotProfile from "./BotProfile";
import MultiLanguageAI from "./MultiLanguageAI";
import InvoiceSettings from "./InvoiceSettings";
import FlightTracking from "./FlightTracking";
import AutomationSetup from "./AutomationSetup";
import MessageTemplates from "./MessageTemplates";
import FAQKnowledgeBase from "./FAQKnowledgeBase";
import PaymentSetup from "./PaymentSetup";
import DoctorAssignment from "./DoctorAssignment";

const TIER_LABELS = {
  required:    { de: "Erforderlich",  en: "Required",    tr: "Gerekli" },
  recommended: { de: "Empfohlen",     en: "Recommended", tr: "Önerilen" },
  optional:    { de: "Optional",      en: "Optional",    tr: "İsteğe bağlı" },
};
const TIER_COLORS = {
  required:    "#4cc9ff",
  recommended: "#ff8a2a",
  optional:    "rgba(167,177,195,0.7)",
};

export default function SetupView() {
  const { clinic, activeClinicId, setClinics, showT, setView, t, lang } = useApp();
  const [tab, setTab] = useState("overview");
  const [localData, setLocalData] = useState({});
  const [teamEmails, setTeamEmails] = useState({});

  const progress = useMemo(() => {
    if (!clinic) return { done: 0, total: 0, pct: 0 };
    const total = Object.keys(CHECKS).length;
    const done = Object.values(CHECKS).filter(fn => fn(clinic)).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [clinic]);

  if (!clinic) return null;

  const plan = clinic.plan || "core";
  const isDone = (id) => CHECKS[id] ? CHECKS[id](clinic) : false;

  let _saveTimer = null;
  const updateClinic = (patch) => {
    setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, ...patch } : c));
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => { updateClinicSettings(patch).catch(() => {}); }, 800);
  };

  const TIER_META = {
    required:    { label: t("sg_required") || "Erforderlich",       color: "#4cc9ff",                bg: "rgba(76,201,255,0.06)", border: "rgba(76,201,255,0.15)" },
    recommended: { label: t("sg_recommended") || "Empfohlen",       color: "#ff8a2a",                bg: "rgba(255,138,42,0.04)", border: "rgba(255,138,42,0.1)" },
    optional:    { label: t("sg_optional_label") || "Optional",      color: "rgba(167,177,195,0.7)", bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.06)" },
  };

  const renderTab = () => {
    const shared = { clinic, isDone, updateClinic, showT, setView, t };
    switch (tab) {
      case "overview":    return <SetupOverview clinic={clinic} progress={progress} isDone={isDone} setTab={setTab} t={t} lang={lang} />;
      case "profile":     return <ClinicProfile {...shared} localData={localData} setLocalData={setLocalData} />;
      case "treatments":  return <TreatmentTypes />;
      case "team":        return <TeamPersonal {...shared} activeClinicId={activeClinicId} teamEmails={teamEmails} setTeamEmails={setTeamEmails} />;
      case "calendar":    return <CalendarSettings {...shared} />;
      /* whatsapp is a separate sidebar item, not part of setup */
      case "bot_config":  return <BotProfile {...shared} />;
      case "wa_profile":  return <BotProfile {...shared} />;
      case "templates":   return <MessageTemplates />;
      case "automations": return <AutomationSetup />;
      case "invoicing":   return <InvoiceSettings {...shared} />;
      case "languages":   return <MultiLanguageAI />;
      case "flights":     return <FlightTracking />;
      default:            return <SetupOverview clinic={clinic} progress={progress} isDone={isDone} setTab={setTab} t={t} lang={lang} />;
    }
  };

  const activeCat = SETUP_CATS.find(c => c.id === tab);
  const steps = SETUP_CATS.filter(c => c.id !== "overview");
  const tiers = ["required", "recommended", "optional"];
  const l = lang || "de";

  return <div style={{ display: "flex", height: "100%", minHeight: "calc(100vh - 60px)" }}>
    {/* ── Sidebar ── */}
    <div style={{ width: 250, borderRight: "1px solid var(--border-default)", padding: "16px 0", overflowY: "auto", flexShrink: 0 }}>
      {/* Progress header */}
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("setup_sidebar_title") || "Einrichtung"}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: progress.pct === 100 ? "#10b981" : "#4cc9ff" }}>{progress.done}/{progress.total}</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
          <div style={{ height: 4, borderRadius: 2, background: progress.pct === 100 ? "#10b981" : "linear-gradient(90deg, #4cc9ff, #2da8ff)", width: `${progress.pct}%`, transition: "width .5s ease" }} />
        </div>
      </div>

      {/* Overview link */}
      <div onClick={() => setTab("overview")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", background: tab === "overview" ? "rgba(76,201,255,0.08)" : "transparent", borderLeft: tab === "overview" ? "3px solid #4cc9ff" : "3px solid transparent", fontWeight: tab === "overview" ? 700 : 500, fontSize: 13, color: tab === "overview" ? "#fff" : "var(--text-muted)", transition: "all .15s", marginBottom: 6 }}>
        <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>📋</span>
        <span>{t("setup_overview") || "Übersicht"}</span>
      </div>

      {/* Tier-grouped steps */}
      {tiers.map(tier => {
        const tierSteps = steps.filter(s => s.tier === tier);
        if (tierSteps.length === 0) return null;
        const tierColor = TIER_COLORS[tier];
        const tierDone = tierSteps.filter(s => isDone(s.id)).length;
        return <div key={tier} style={{ marginBottom: 4 }}>
          {/* Tier header */}
          <div style={{ padding: "10px 16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px", color: tierColor }}>{TIER_LABELS[tier][l] || TIER_LABELS[tier].de}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: tierDone === tierSteps.length ? "#10b981" : "var(--text-faint)" }}>{tierDone}/{tierSteps.length}</span>
          </div>
          {/* Steps */}
          {tierSteps.map(cat => {
            const isActive = tab === cat.id;
            const done = isDone(cat.id);
            return <div key={cat.id} onClick={() => setTab(cat.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", cursor: "pointer", background: isActive ? `${tierColor}14` : "transparent", borderLeft: isActive ? `3px solid ${tierColor}` : "3px solid transparent", color: isActive ? "#fff" : "var(--text-muted)", fontWeight: isActive ? 700 : 500, fontSize: 13, transition: "all .15s" }}>
              <span style={{ fontSize: 13, width: 20, textAlign: "center", opacity: isActive ? 1 : 0.7 }}>{done ? "✓" : cat.icon}</span>
              <span style={{ flex: 1, color: done ? "#10b981" : isActive ? "#fff" : "var(--text-muted)", fontSize: 12.5 }}>{t(cat.key) || cat.id}</span>
              {done && <span style={{ width: 6, height: 6, borderRadius: 3, background: "#10b981", flexShrink: 0 }} />}
            </div>;
          })}
        </div>;
      })}
    </div>

    {/* ── Main content ── */}
    <div style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>
      {tab !== "overview" && tab !== "whatsapp" && (() => {
        const tierMeta = TIER_META[activeCat?.tier] || {};
        return <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${tierMeta.color || "#4cc9ff"}10`, border: `1px solid ${tierMeta.border || "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{activeCat?.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{t(activeCat?.key) || activeCat?.id}</h2>
              {isDone(tab) && <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", padding: "3px 10px", borderRadius: 7, background: "rgba(16,185,129,0.08)" }}>{t("done") || "Fertig"}</span>}
              {!isDone(tab) && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${tierMeta.color || "#4cc9ff"}12`, color: tierMeta.color }}>{tierMeta.label}</span>}
            </div>
            {(activeCat?.descKey || activeCat?.desc) && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{activeCat.descKey ? (t(activeCat.descKey) || activeCat.desc || "") : activeCat.desc}</div>}
            {!isDone(tab) && activeCat?.time && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>⏱ ca. {activeCat.time}</div>}
          </div>
        </div>;
      })()}
      {renderTab()}
    </div>
  </div>;
}
