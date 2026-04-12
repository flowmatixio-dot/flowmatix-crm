import { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { PLAN_C, PLAN_PRICE, PLAN_LIMITS, ADDONS } from "../../data/constants";
import { updateClinicSettings, addAddon, removeAddon, openBillingPortal, getStripeInvoices } from "../../api/client";
import { fmLocale } from "../../utils/helpers";

const PLAN_ORDER = ["core", "pro", "operations", "enterprise"];
const PLAN_LABELS = { core: "Core", pro: "Pro", operations: "Operations", enterprise: "Enterprise" };

// Top 5 features per plan (concise) — i18n keys resolved at render time
function getPlanFeatures(t) {
  return {
    core: [t("plan_feat_patients_250")||"Up to 250 patients / month", t("plan_feat_all_features")||"All features included", t("plan_feat_all_languages")||"All languages", t("plan_feat_unlimited_team")||"Unlimited team members", t("plan_feat_ai_wa")||"AI WhatsApp 24/7"],
    pro: [t("plan_feat_patients_500")||"Up to 500 patients / month", t("plan_feat_all_features")||"All features included", t("plan_feat_all_languages")||"All languages", t("plan_feat_unlimited_team")||"Unlimited team members", t("plan_feat_ai_wa")||"AI WhatsApp 24/7"],
    operations: [t("plan_feat_patients_1000")||"Up to 1,000 patients / month", t("plan_feat_all_features")||"All features included", t("plan_feat_all_languages")||"All languages", t("plan_feat_unlimited_team")||"Unlimited team members", t("plan_feat_ai_wa")||"AI WhatsApp 24/7"],
    enterprise: [t("plan_feat_unlimited")||"Unlimited patients", t("plan_feat_all_features")||"All features included", t("plan_feat_all_languages")||"All languages", t("plan_feat_account_manager")||"Dedicated Account Manager", t("plan_feat_sla")||"SLA & Priority Support"],
  };
}

export default function SubscriptionView() {
  const { clinic, setClinics, showT, t, myLeads } = useApp();
  const PLAN_FEATURES = getPlanFeatures(t);
  const [subTab, setSubTab] = useState("plan");
  const [activeAddons, setActiveAddons] = useState(clinic?.addons || []);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  useEffect(() => { if (clinic?.addons) setActiveAddons(clinic.addons); }, [clinic?.addons?.length]);
  useEffect(() => {
    if (subTab === "billing") {
      setInvoicesLoading(true);
      getStripeInvoices().then(res => { setInvoices(res?.invoices || []); setInvoicesLoading(false); }).catch(() => setInvoicesLoading(false));
    }
  }, [subTab]);

  const c = clinic;
  if (!c) return null;
  const currentPlan = c.plan || "core";
  const currentPlanIdx = PLAN_ORDER.indexOf(currentPlan);

  const addonTotal = useMemo(() =>
    ADDONS.filter(a => activeAddons.includes(a.id)).reduce((s, a) => s + a.price, 0)
  , [activeAddons]);

  const planPrice = useMemo(() => {
    const raw = PLAN_PRICE[currentPlan];
    if (!raw) return 0;
    const num = Number.parseInt(String(raw).replaceAll(/[^\d]/g, ""), 10);
    return Number.isNaN(num) ? 0 : num;
  }, [currentPlan]);

  const toggleAddon = async (addonId, addonName, isActive) => {
    if (isActive) {
      if (!window.confirm(`${addonName} ${t("addon_confirm_remove") || "entfernen?"}`)) return;
      try {
        await removeAddon(addonId);
        setActiveAddons(prev => prev.filter(a => a !== addonId));
        const deltaR = addonId.startsWith('patients_') ? Number.parseInt(addonId.split('_')[1]) || 0 : 0;
        if (deltaR > 0) setClinics(cs => cs.map(cl => cl.id === c.id ? { ...cl, patient_limit: Math.max(0, (cl.patient_limit || 0) - deltaR) } : cl));
        showT(`${addonName} ${t("addon_removed_toast") || "entfernt"}`);
      } catch(e) { showT(e.message || t("error_generic") || 'Fehler'); }
    } else {
      if (!window.confirm(`${addonName} ${t("addon_confirm_activate") || "aktivieren?"}\n\n${t("addon_monthly_cost") || "Monatliche Kosten: EUR"} ${ADDONS.find(a => a.id === addonId)?.price || '?'}/${t("monthly") || "Monat"}`)) return;
      try {
        await addAddon(addonId);
        setActiveAddons(prev => [...prev, addonId]);
        const delta = addonId.startsWith('patients_') ? Number.parseInt(addonId.split('_')[1]) || 0 : 0;
        if (delta > 0) setClinics(cs => cs.map(cl => cl.id === c.id ? { ...cl, patient_limit: (cl.patient_limit || 0) + delta } : cl));
        showT(`${addonName} ${t("addon_activated_toast") || "aktiviert"}`);
      } catch(e) { showT(e.message || t("error_generic") || 'Fehler'); }
    }
  };

  const openPortal = async () => {
    try {
      const res = await openBillingPortal();
      if (res.url) window.open(res.url, '_blank');
      else showT(t("billing_portal_error") || 'Billing Portal konnte nicht geöffnet werden');
    } catch(e) { showT(e.message || t("error_generic") || 'Fehler'); }
  };

  const handlePlanChange = (targetPlan) => {
    const targetLimit = PLAN_LIMITS[targetPlan]?.patients;
    if (targetLimit !== null && targetLimit !== undefined) {
      const currentCount = (myLeads || []).length;
      if (currentCount > targetLimit) {
        showT(t("downgrade_blocked") || `Downgrade nicht möglich: Du hast ${currentCount} Patienten, aber der ${PLAN_LABELS[targetPlan]}-Plan erlaubt nur ${targetLimit}.`);
        return;
      }
    }
    openPortal();
  };

  const tabStyle = (id) => ({
    padding: "10px 20px", background: "transparent", border: "none",
    borderBottom: subTab === id ? "2px solid #4cc9ff" : "2px solid transparent",
    color: subTab === id ? "#fff" : "rgba(167,177,195,0.65)",
    fontWeight: subTab === id ? 700 : 500, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, transition: "all .2s",
  });

  return <div style={{ padding: 28, maxWidth: 960 }}>
    <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.03em" }}>{t("sub_title") || "Abonnement"}</h1>
    <p style={{ fontSize: 12, color: "rgba(167,177,195,0.65)", margin: "0 0 16px", fontWeight: 500 }}>{t("sub_desc") || "Plan, Add-ons und Rechnungen verwalten"}</p>

    {/* Tabs */}
    <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <button onClick={() => setSubTab("plan")} style={tabStyle("plan")}>{t("plan_tab_label") || "Tarif"}</button>
      <button onClick={() => setSubTab("addons")} style={tabStyle("addons")}>
        Add-ons
        {activeAddons.length > 0 && <span style={{ background: "#10b981", color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 99 }}>{activeAddons.length}</span>}
      </button>
      <button onClick={() => setSubTab("billing")} style={tabStyle("billing")}>{t("invoices_tab_label") || "Rechnungen"}</button>
    </div>

    {/* ═══ TAB: TARIF ═══ */}
    {subTab === "plan" && <>

      {/* ── Current Plan Card ── */}
      <div style={{
        padding: "22px 24px", borderRadius: 14, marginBottom: 28,
        background: `${PLAN_C[currentPlan]}06`, border: `1px solid ${PLAN_C[currentPlan]}18`,
        display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{t("current_plan_label") || "Aktueller Plan"}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: PLAN_C[currentPlan], textTransform: "capitalize" }}>{PLAN_LABELS[currentPlan]}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(232,238,252,0.95)" }}>{PLAN_PRICE[currentPlan]}<span style={{ fontSize: 11, fontWeight: 500, color: "rgba(167,177,195,0.75)" }}>/mo</span></span>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "rgba(167,177,195,0.6)" }}>
            {c.billing?.interval && <span>{t("billing_interval_label") || "Intervall:"} <span style={{ color: "rgba(232,238,252,0.95)", fontWeight: 600 }}>{c.billing.interval === "yearly" ? (t("billing_yearly") || "Jährlich") : (t("billing_monthly_label") || "Monatlich")}</span></span>}
            {c.billing?.nextDate && <span>{t("next_billing_label") || "Nächste Abrechnung:"} <span style={{ color: "rgba(232,238,252,0.95)", fontWeight: 600 }}>{c.billing.nextDate}</span></span>}
            {c.billing?.method && <span>{t("payment_label") || "Zahlung:"} <span style={{ color: "rgba(232,238,252,0.95)", fontWeight: 600 }}>{c.billing.method}</span></span>}
          </div>
          {c.cancelled_at && <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginTop: 6 }}>{t("sub_cancelled_label") || "Abo gekündigt"}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={openPortal} style={{
            padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", color: "#4cc9ff", whiteSpace: "nowrap",
          }}>{t("manage_billing_btn") || "Abrechnung verwalten"}</button>
          <button onClick={openPortal} style={{
            padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.45)", whiteSpace: "nowrap",
          }}>{t("cancel_sub_btn") || "Abo kündigen"}</button>
        </div>
      </div>

      {/* ── Plan Upgrade Cards ── */}
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        {t("available_plans") || "Verfügbare Pläne"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {PLAN_ORDER.map((pk, idx) => {
          const isCurrent = currentPlan === pk;
          const isUpgrade = idx > currentPlanIdx;
          const isDowngrade = idx < currentPlanIdx;
          const color = PLAN_C[pk];
          const features = PLAN_FEATURES[pk] || [];

          return <div key={pk} style={{
            padding: 18, borderRadius: 14,
            background: isCurrent ? `${color}08` : "rgba(255,255,255,0.015)",
            border: `1px solid ${isCurrent ? `${color}25` : "rgba(255,255,255,0.04)"}`,
            position: "relative", display: "flex", flexDirection: "column",
          }}>
            {isCurrent && <div style={{ position: "absolute", top: 10, right: 10, padding: "2px 8px", borderRadius: 5, fontSize: 9, fontWeight: 800, background: `${color}18`, color }}>{t("plan_active_badge") || "ACTIVE"}</div>}
            <div style={{ fontWeight: 800, fontSize: 14, color, textTransform: "capitalize", marginBottom: 4 }}>{PLAN_LABELS[pk]}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(232,238,252,0.9)", marginBottom: 12 }}>{PLAN_PRICE[pk]}<span style={{ fontSize: 11, fontWeight: 500, color: "rgba(167,177,195,0.75)" }}>/mo</span></div>
            <div style={{ flex: 1 }}>
              {features.map((f, i) => (
                <div key={i} style={{ fontSize: 11, color: "rgba(167,177,195,0.7)", padding: "3px 0", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color, fontSize: 10 }}>✓</span>{f}
                </div>
              ))}
            </div>
            {isCurrent ? (
              <div style={{ marginTop: 14, padding: "8px 0", borderRadius: 8, textAlign: "center", fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                {t("current_plan_label") || "Aktueller Plan"}
              </div>
            ) : pk === "enterprise" ? (
              <button onClick={() => window.open(`https://mail.google.com/mail/?view=cm&to=info@flowmatix.io&su=${encodeURIComponent(t("enterprise_inquiry_subject") || 'Enterprise Anfrage')}&body=${encodeURIComponent((t("enterprise_inquiry_body") || 'Wir interessieren uns für den Enterprise Plan.') + `\n\n${t("clinic_label") || "Klinik"}: ${clinic?.name || ''}`)}`, '_blank')} style={{ marginTop: 14, width: "100%", padding: "8px 0", borderRadius: 8, background: `${color}10`, border: `1px solid ${color}20`, color, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                {t("enterprise_contact") || "Kontakt aufnehmen"}
              </button>
            ) : (
              <button onClick={() => isDowngrade ? handlePlanChange(pk) : openPortal()} style={{ marginTop: 14, width: "100%", padding: "8px 0", borderRadius: 8, background: `${color}10`, border: `1px solid ${color}20`, color, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                {isUpgrade ? (t("plan_upgrade") || "Upgrade") : (t("plan_downgrade") || "Downgrade")}
              </button>
            )}
          </div>;
        })}
      </div>
    </>}

    {/* ═══ TAB: ADDONS ═══ */}
    {subTab === "addons" && <>

      {/* Active addons summary */}
      {activeAddons.length > 0 && <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>{activeAddons.length} {t("active_addon_count") || "aktive Add-ons"}</div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginTop: 2 }}>+€{addonTotal}/Monat</div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>€{addonTotal}<span style={{ fontSize: 10, fontWeight: 500, color: "rgba(167,177,195,0.75)" }}>/mo</span></div>
      </div>}

      {/* ── Capacity Upgrades ── */}
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        {t("capacity_upgrades") || "Kapazitäts-Upgrades"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {ADDONS.filter(a => a.category === "capacity").map(addon => {
          const isActive = activeAddons.includes(addon.id);
          return <div key={addon.id} style={{ padding: 18, borderRadius: 12, background: isActive ? "rgba(16,185,129,0.03)" : "rgba(255,255,255,0.015)", border: `1px solid ${isActive ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)"}`, position: "relative" }}>
            {addon.popular && <div style={{ position: "absolute", top: 10, right: 10, padding: "2px 8px", borderRadius: 5, fontSize: 9, fontWeight: 800, background: "rgba(76,201,255,0.1)", color: "#4cc9ff" }}>{t("popular") || "Beliebt"}</div>}
            <div style={{ fontSize: 16, marginBottom: 10 }}>{addon.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{addon.nameKey ? (t(addon.nameKey) || addon.name) : addon.name}</div>
            <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginBottom: 10, lineHeight: 1.4 }}>{addon.descKey ? (t(addon.descKey) || addon.desc) : addon.desc}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>€{addon.price}<span style={{ fontSize: 10, fontWeight: 500, color: "rgba(167,177,195,0.75)" }}>/mo</span></span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                background: isActive ? "rgba(16,185,129,0.1)" : "rgba(167,177,195,0.06)",
                color: isActive ? "#10b981" : "rgba(167,177,195,0.75)",
              }}>{isActive ? (t("active_badge") || "Aktiv") : (t("addon_available") || "Verfügbar")}</span>
            </div>
            <button onClick={() => toggleAddon(addon.id, addon.name, isActive)} style={{ marginTop: 12, width: "100%", padding: "7px 0", borderRadius: 8, background: isActive ? "rgba(239,68,68,0.06)" : "rgba(76,201,255,0.06)", border: `1px solid ${isActive ? "rgba(239,68,68,0.12)" : "rgba(76,201,255,0.12)"}`, color: isActive ? "#ef4444" : "#4cc9ff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{isActive ? (t("addon_remove") || "Entfernen") : (t("activate") || "Aktivieren")}</button>
          </div>;
        })}
      </div>

      {/* Feature Upgrades removed — all included in plan */}

      {/* ── Billing Summary ── */}
      <div style={{
        padding: "16px 20px", borderRadius: 12,
        background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.1)",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{t("monthly_costs") || "Monatliche Kosten"}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(167,177,195,0.7)", padding: "4px 0" }}>
          <span>{PLAN_LABELS[currentPlan]} Plan</span>
          <span style={{ fontWeight: 600, color: "rgba(232,238,252,0.9)" }}>{PLAN_PRICE[currentPlan]}</span>
        </div>
        {addonTotal > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(167,177,195,0.7)", padding: "4px 0" }}>
            <span>{activeAddons.length} Add-on{activeAddons.length !== 1 ? "s" : ""}</span>
            <span style={{ fontWeight: 600, color: "rgba(232,238,252,0.9)" }}>+€{addonTotal}</span>
          </div>
        )}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(232,238,252,0.95)" }}>{t("total_label") || "Gesamt"}</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#4cc9ff" }}>€{planPrice + addonTotal}<span style={{ fontSize: 11, fontWeight: 500, color: "rgba(167,177,195,0.75)" }}>/mo</span></span>
        </div>
      </div>
    </>}

    {/* ═══ TAB: RECHNUNGEN ═══ */}
    {subTab === "billing" && <>
      {invoicesLoading ? (
        <div style={{ padding: 60, textAlign: "center", color: "rgba(167,177,195,0.75)", fontSize: 13 }}>{t("loading_invoices") || "Lade Rechnungen..."}</div>
      ) : invoices.length > 0 ? (
        <>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.8fr 0.6fr auto", gap: 8, padding: "0 18px", marginBottom: 8, fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.7)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <div>{t("invoice_col") || "Rechnung"}</div><div>{t("date_col") || "Datum"}</div><div>{t("amount_col") || "Betrag"}</div><div>{t("status_col") || "Status"}</div><div></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {invoices.map(inv => (
              <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.8fr 0.6fr auto", gap: 8, padding: "11px 18px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", alignItems: "center", fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{inv.number || "Flowmatix"}</div>
                  {inv.description && <div style={{ fontSize: 10, color: "rgba(167,177,195,0.7)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.description}</div>}
                </div>
                <div style={{ fontSize: 12, color: "rgba(167,177,195,0.65)" }}>{inv.date ? new Date(inv.date).toLocaleDateString(fmLocale()) : "—"}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{inv.currency} {(inv.amount / 100).toFixed(2)}</div>
                <span style={{
                  padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, justifySelf: "start",
                  background: inv.status === "paid" ? "rgba(16,185,129,0.1)" : inv.status === "open" ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.04)",
                  color: inv.status === "paid" ? "#10b981" : inv.status === "open" ? "#fbbf24" : "rgba(167,177,195,0.6)",
                }}>{inv.status === "paid" ? (t("invoice_paid") || "Bezahlt") : inv.status === "open" ? (t("invoice_open") || "Offen") : inv.status}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {inv.pdf_url && <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" style={{ padding: "4px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "rgba(76,201,255,0.06)", border: "1px solid rgba(76,201,255,0.1)", color: "#4cc9ff", textDecoration: "none" }}>PDF</a>}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 14, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>🧾</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "rgba(167,177,195,0.6)" }}>{t("no_invoices_label") || "Noch keine Rechnungen"}</div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.65)", marginTop: 6 }}>{t("no_invoices_desc") || "Rechnungen erscheinen hier nach der ersten Zahlung."}</div>
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <button onClick={openPortal} style={{ padding: "8px 18px", borderRadius: 8, background: "rgba(76,201,255,0.06)", border: "1px solid rgba(76,201,255,0.12)", color: "#4cc9ff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Stripe Portal</button>
        <button onClick={() => {
          if (!invoices.length) { showT(t("no_invoices_toast") || "Keine Rechnungen"); return; }
          const csv = "Nr,Datum,Betrag,Status\n" + invoices.map(inv => [inv.number || "", inv.date ? new Date(inv.date).toLocaleDateString() : "", `${(inv.amount / 100).toFixed(2)} ${inv.currency}`, inv.status].join(",")).join("\n");
          const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "flowmatix-rechnungen.csv"; a.click();
        }} style={{ padding: "8px 18px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "rgba(167,177,195,0.7)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>CSV Export</button>
      </div>
    </>}
  </div>;
}
