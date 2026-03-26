import { useState, useMemo, useCallback } from "react";
import { useApp } from "../../context/AppContext";

// ─── CONSTANTS ───────────────────────────────────────────────────
function getTechniques(t) {
  return [
    { id: "fue", name: "FUE", price: 2.5, icon: "✂️", desc: t("tech_fue_desc") || "Follicular Unit Extraction — Klassische Methode mit Mikronadeln" },
    { id: "dhi", name: "DHI", price: 3.5, icon: "🖊️", desc: t("tech_dhi_desc") || "Direct Hair Implantation — Implantation mit Choi-Stift" },
    { id: "fue_saphir", name: "FUE Saphir", price: 3.0, icon: "💎", desc: t("tech_fue_saphir_desc") || "FUE mit Saphirklingen — Präzisere Kanäle, schnellere Heilung" },
  ];
}

function getAddons(t) {
  return [
    { id: "prp", label: t("addon_prp") || "PRP Behandlung", price: 300, icon: "🩸", desc: t("addon_prp_desc") || "Platelet Rich Plasma für besseres Wachstum" },
    { id: "meso", label: t("addon_meso") || "Mesotherapie", price: 200, icon: "💉", desc: t("addon_meso_desc") || "Vitamincocktail für die Kopfhaut" },
    { id: "hotel", label: t("addon_hotel") || "Hotel Paket (3 Nächte)", price: 450, icon: "🏨", desc: t("addon_hotel_desc") || "4-Sterne Hotel inkl. Frühstück" },
    { id: "transfer", label: t("addon_transfer") || "Flughafentransfer", price: 100, icon: "🚗", desc: t("addon_transfer_desc") || "VIP Transfer Flughafen ↔ Hotel ↔ Klinik" },
    { id: "meds", label: t("addon_meds") || "Medikamenten-Paket", price: 150, icon: "💊", desc: t("addon_meds_desc") || "Shampoo, Lotion, Finasterid, Biotin" },
  ];
}

function getPaymentMethods(t) {
  return [
    { id: "stripe", label: "Stripe", icon: "💳" },
    { id: "bank", label: t("payment_bank_transfer") || "Banküberweisung", icon: "🏦" },
    { id: "custom", label: t("payment_custom_link") || "Custom Link", icon: "🔗" },
  ];
}

const C = {
  bg: "#0f1623",
  card: "#161f32",
  cardBorder: "rgba(255,255,255,0.06)",
  cardHover: "rgba(255,255,255,0.08)",
  cyan: "#4cc9ff",
  cyanMuted: "rgba(76,201,255,0.12)",
  green: "#10b981",
  greenMuted: "rgba(16,185,129,0.12)",
  purple: "#a76bff",
  purpleMuted: "rgba(167,107,255,0.10)",
  orange: "#f59e0b",
  orangeMuted: "rgba(245,158,11,0.12)",
  red: "#ef4444",
  text: "#e2e8f0",
  muted: "#7a8ba7",
  faint: "#4a5568",
  input: "rgba(255,255,255,0.04)",
  inputBorder: "rgba(255,255,255,0.08)",
};

// ─── FORMAT ──────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const fmtNum = (n) => new Intl.NumberFormat("de-DE").format(n);

// ─── COMPONENT ───────────────────────────────────────────────────
export default function TreatmentPlanBuilder({ patient, doctorReview, clinic, onSave, onSend, onClose }) {
  const { t } = useApp();
  const TECHNIQUES = getTechniques(t);
  const ADDONS = getAddons(t);
  const PAYMENT_METHODS = getPaymentMethods(t);
  // Technique
  const defaultTechnique = doctorReview?.technique || "fue";
  const [technique, setTechnique] = useState(defaultTechnique);

  // Grafts
  const defaultGrafts = doctorReview?.grafts || 3000;
  const [grafts, setGrafts] = useState(defaultGrafts);

  // Zone distribution
  const [showZones, setShowZones] = useState(false);
  const [zones, setZones] = useState({ front: 50, crown: 30, temples: 20 });

  // Addons
  const [activeAddons, setActiveAddons] = useState({});

  // Discount
  const [discountType, setDiscountType] = useState("percent"); // "percent" | "fixed"
  const [discountValue, setDiscountValue] = useState(0);

  // VAT
  const defaultVat = clinic?.vatRate ?? 19;
  const [vatRate, setVatRate] = useState(defaultVat);

  // Deposit
  const [depositMode, setDepositMode] = useState("auto"); // "auto" | "custom"
  const [customDeposit, setCustomDeposit] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("stripe");

  // Notes
  const [notes, setNotes] = useState(doctorReview?.notes || "");

  // Preview
  const [preview, setPreview] = useState(false);

  // ── Calculations ───────────────────────────────────────────────
  const selectedTechnique = TECHNIQUES.find((t) => t.id === technique) || TECHNIQUES[0];
  const clinicPricing = clinic?.techniques?.[technique];
  const pricePerGraft = clinicPricing?.price ?? selectedTechnique.price;

  const calc = useMemo(() => {
    const base = grafts * pricePerGraft;
    const addonsTotal = Object.entries(activeAddons).reduce((sum, [id, on]) => {
      if (!on) return sum;
      const addon = ADDONS.find((a) => a.id === id);
      return sum + (addon?.price || 0);
    }, 0);
    const subtotal = base + addonsTotal;
    const discount = discountType === "percent" ? subtotal * (discountValue / 100) : Number(discountValue) || 0;
    const afterDiscount = Math.max(0, subtotal - discount);
    const vat = afterDiscount * (vatRate / 100);
    const total = afterDiscount + vat;
    // Use clinic deposit policy if available, otherwise default 25%
    const clinicDepositPct = clinic?.depositPolicy === "percentage" ? (Number(clinic.depositPercent) || 30) : 25;
    const clinicDepositFixed = clinic?.depositPolicy === "fixed" ? (Number(clinic.depositAmount) || 500) : 0;
    const autoDeposit = clinic?.depositPolicy === "fixed" ? clinicDepositFixed : Math.round(total * (clinicDepositPct / 100));
    const deposit = clinic?.depositPolicy === "none" ? 0 : depositMode === "auto" ? autoDeposit : Number(customDeposit) || 0;
    return { base, addonsTotal, subtotal, discount, afterDiscount, vat, total, deposit };
  }, [grafts, pricePerGraft, activeAddons, discountType, discountValue, vatRate, depositMode, customDeposit]);

  // ── Build plan data ────────────────────────────────────────────
  const buildPlanData = useCallback(() => {
    const plan = {
      patient: patient ? { id: patient.id, name: patient.name, phone: patient.phone, email: patient.email } : null,
      technique: { id: technique, name: selectedTechnique.name, pricePerGraft },
      grafts,
      zones: showZones ? zones : null,
      addons: ADDONS.filter((a) => activeAddons[a.id]).map((a) => ({ id: a.id, label: a.label, price: a.price })),
      pricing: calc,
      discount: { type: discountType, value: discountValue },
      vatRate,
      deposit: { amount: calc.deposit, method: paymentMethod },
      notes,
      createdAt: new Date().toISOString(),
    };
    // Persist to API (non-blocking)
    if (patient?.id) {
      import("../../api/client").then(api => {
        api.updatePatient(patient.id, {
          reviewData: { grafts, technique: selectedTechnique.name, price: calc.total, notes },
          treatment: selectedTechnique.name,
          financials: { treatmentPrice: calc.total, depositAmount: calc.deposit, depositStatus: "pending", paymentStatus: "pending" },
        }).catch(e => console.error("[TreatmentPlan] Persist failed:", e));
      });
    }
    return plan;
  }, [patient, technique, selectedTechnique, pricePerGraft, grafts, showZones, zones, activeAddons, calc, discountType, discountValue, vatRate, paymentMethod, notes]);

  // ── Zone update helper ─────────────────────────────────────────
  const updateZone = (key, val) => {
    const v = Math.max(0, Math.min(100, Number(val) || 0));
    setZones((prev) => ({ ...prev, [key]: v }));
  };

  // ── Graft helpers ──────────────────────────────────────────────
  const clampGrafts = (v) => Math.max(500, Math.min(8000, v));
  const stepGrafts = (delta) => setGrafts((g) => clampGrafts(g + delta));

  // ── Styles ─────────────────────────────────────────────────────
  const S = {
    overlay: { position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" },
    modal: { width: "min(1080px, 94vw)", maxHeight: "92vh", background: C.bg, borderRadius: 20, border: `1px solid ${C.cardBorder}`, boxShadow: "0 24px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", animation: "tpbIn .3s ease", overflow: "hidden" },
    header: { padding: "20px 28px", borderBottom: `1px solid ${C.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 },
    body: { flex: 1, overflowY: "auto", padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 28 },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 },
    card: { padding: 16, borderRadius: 14, background: C.card, border: `1px solid ${C.cardBorder}`, cursor: "pointer", transition: "all .2s" },
    footer: { padding: "16px 28px", borderTop: `1px solid ${C.cardBorder}`, display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0, flexWrap: "wrap" },
    btn: (color, primary) => ({
      padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      display: "flex", alignItems: "center", gap: 8, transition: "all .15s", border: primary ? "none" : `1px solid ${color}30`,
      background: primary ? color : `${color}10`, color: primary ? "#fff" : color,
    }),
    input: { width: "100%", padding: "10px 14px", borderRadius: 10, background: C.input, border: `1px solid ${C.inputBorder}`, color: C.text, fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" },
    label: { fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6, display: "block" },
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={S.overlay} onClick={onClose}>
      <style>{`
        @keyframes tpbIn{from{transform:scale(.96) translateY(12px);opacity:0}to{transform:none;opacity:1}}
        .tpb-scroll::-webkit-scrollbar{width:6px}
        .tpb-scroll::-webkit-scrollbar-track{background:transparent}
        .tpb-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px}
      `}</style>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>

        {/* ── HEADER ─────────────────────────────────── */}
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: C.cyanMuted, border: `1px solid ${C.cyan}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📋</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: C.text }}>{t("create_treatment_plan") || "Behandlungsplan erstellen"}</div>
              {patient && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{patient.name}{patient.phone ? ` · ${patient.phone}` : ""}</div>}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: C.input, border: `1px solid ${C.inputBorder}`, color: C.muted, fontSize: 18, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* ── BODY ───────────────────────────────────── */}
        <div className="tpb-scroll" style={S.body}>

          {/* ════ LEFT COLUMN ════ */}
          <div>

            {/* ── 1. TECHNIQUE SELECTION ────────── */}
            <div style={S.section}>
              <div style={S.sectionTitle}><span style={{ fontSize: 14 }}>💉</span> {t("select_technique") || "Technik auswählen"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {TECHNIQUES.map((tech) => {
                  const sel = technique === tech.id;
                  return (
                    <div key={tech.id} onClick={() => setTechnique(tech.id)} style={{
                      ...S.card,
                      border: sel ? `2px solid ${C.cyan}` : `1px solid ${C.cardBorder}`,
                      background: sel ? `linear-gradient(135deg, ${C.cyanMuted}, ${C.purpleMuted})` : C.card,
                      transform: sel ? "scale(1.02)" : "scale(1)",
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{tech.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: sel ? C.cyan : C.text, marginBottom: 4 }}>{tech.name}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: sel ? C.cyan : C.text, marginBottom: 8 }}>
                        {fmt(clinicPricing && tech.id === technique ? pricePerGraft : tech.price)}
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}> / {t("graft_unit") || "Graft"}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{tech.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 2. GRAFT CONFIGURATION ───────── */}
            <div style={S.section}>
              <div style={S.sectionTitle}><span style={{ fontSize: 14 }}>🔬</span> {t("graft_config") || "Graft-Konfiguration"}</div>
              <div style={{ ...S.card, cursor: "default" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                  <button onClick={() => stepGrafts(-100)} style={{
                    width: 40, height: 40, borderRadius: 10, background: C.input, border: `1px solid ${C.inputBorder}`,
                    color: C.text, fontSize: 20, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>−</button>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <input
                      type="number" value={grafts} min={500} max={8000}
                      onChange={(e) => setGrafts(clampGrafts(Number(e.target.value) || 500))}
                      style={{ ...S.input, textAlign: "center", fontSize: 32, fontWeight: 800, color: C.cyan, background: "transparent", border: "none", width: "100%" }}
                    />
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: -4 }}>{t("grafts_label_ui") || "Grafts"}</div>
                  </div>
                  <button onClick={() => stepGrafts(100)} style={{
                    width: 40, height: 40, borderRadius: 10, background: C.input, border: `1px solid ${C.inputBorder}`,
                    color: C.text, fontSize: 20, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>+</button>
                </div>
                {/* Slider */}
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <input
                    type="range" min={500} max={8000} step={100} value={grafts}
                    onChange={(e) => setGrafts(Number(e.target.value))}
                    style={{ width: "100%", accentColor: C.cyan, height: 6, cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.faint, marginTop: 4 }}>
                    <span>500</span><span>2000</span><span>4000</span><span>6000</span><span>8000</span>
                  </div>
                </div>
                {/* Auto base price */}
                <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: C.cyanMuted, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{fmtNum(grafts)} {t("grafts_label_ui") || "Grafts"} × {fmt(pricePerGraft)}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: C.cyan }}>{fmt(calc.base)}</span>
                </div>

                {/* Zone distribution */}
                <div style={{ marginTop: 16 }}>
                  <div onClick={() => setShowZones(!showZones)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: C.muted }}>
                    <span style={{ fontSize: 10, transition: "transform .2s", transform: showZones ? "rotate(90deg)" : "rotate(0)" }}>▶</span>
                    {t("zone_distribution_label") || "Zonenverteilung"} {showZones ? (t("hide_zones") || "ausblenden") : (t("show_zones") || "anzeigen")}
                  </div>
                  {showZones && (
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      {[{ key: "front", labelKey: "zone_front", label: "Front", icon: "👤" }, { key: "crown", labelKey: "zone_crown", label: "Krone", icon: "👑" }, { key: "temples", labelKey: "zone_temples", label: "Schläfen", icon: "📐" }].map(({ key, labelKey, label, icon }) => (
                        <div key={key}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>{icon} {t(labelKey) || label}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                              type="number" min={0} max={100} value={zones[key]}
                              onChange={(e) => updateZone(key, e.target.value)}
                              style={{ ...S.input, width: 60, padding: "6px 8px", textAlign: "center", fontSize: 14, fontWeight: 700 }}
                            />
                            <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>%</span>
                          </div>
                          <div style={{ fontSize: 10, color: C.faint, marginTop: 4 }}>{"\u2248"} {fmtNum(Math.round(grafts * zones[key] / 100))} {t("grafts_label_ui") || "Grafts"}</div>
                        </div>
                      ))}
                      {(zones.front + zones.crown + zones.temples) !== 100 && (
                        <div style={{ gridColumn: "1 / -1", fontSize: 11, color: C.orange, fontWeight: 600, padding: "6px 10px", borderRadius: 8, background: C.orangeMuted }}>
                          {"\u26A0\uFE0F"} {t("zone_sum_warning") || "Summe"}: {zones.front + zones.crown + zones.temples}% — {t("zone_should_be_100") || "sollte 100% ergeben"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 3. ADDITIONAL SERVICES ────────── */}
            <div style={S.section}>
              <div style={S.sectionTitle}><span style={{ fontSize: 14 }}>✨</span> {t("additional_services") || "Zusatzleistungen"}</div>
              <div style={{ display: "grid", gap: 8 }}>
                {ADDONS.map((addon) => {
                  const on = !!activeAddons[addon.id];
                  return (
                    <div key={addon.id} onClick={() => setActiveAddons((p) => ({ ...p, [addon.id]: !p[addon.id] }))} style={{
                      ...S.card, display: "flex", alignItems: "center", gap: 14,
                      border: on ? `1px solid ${C.green}40` : `1px solid ${C.cardBorder}`,
                      background: on ? `linear-gradient(135deg, ${C.greenMuted}, transparent)` : C.card,
                    }}>
                      <div style={{ fontSize: 22, width: 36, textAlign: "center", flexShrink: 0 }}>{addon.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: on ? C.green : C.text }}>{addon.label}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{addon.desc}</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: on ? C.green : C.muted, flexShrink: 0 }}>{fmt(addon.price)}</div>
                      {/* Toggle */}
                      <div style={{
                        width: 40, height: 22, borderRadius: 11, flexShrink: 0,
                        background: on ? C.greenMuted : C.input, border: `1px solid ${on ? C.green : C.inputBorder}`,
                        position: "relative", transition: "all .2s",
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: 8,
                          background: on ? C.green : C.faint,
                          position: "absolute", top: 2, left: on ? 21 : 2, transition: "all .2s",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── NOTES ──────────────────────────── */}
            <div style={S.section}>
              <div style={S.sectionTitle}><span style={{ fontSize: 14 }}>📝</span> {t("notes_section") || "Notizen"}</div>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder={t("internal_notes_placeholder") || "Interne Notizen oder Anmerkungen zum Behandlungsplan..."}
                rows={3}
                style={{ ...S.input, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>
          </div>

          {/* ════ RIGHT COLUMN — PRICING ════ */}
          <div>
            <div style={{ position: "sticky", top: 0 }}>

              {/* ── PRICING SUMMARY ──────────────── */}
              <div style={{ ...S.card, cursor: "default", marginBottom: 16, background: "linear-gradient(180deg, #1a2438 0%, #161f32 100%)", border: `1px solid ${C.cardBorder}` }}>
                <div style={S.sectionTitle}><span style={{ fontSize: 14 }}>💰</span> {t("price_overview") || "Preisübersicht"}</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Base */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: C.muted }}>{selectedTechnique.name} — {fmtNum(grafts)} {t("grafts_label_ui") || "Grafts"}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{fmt(calc.base)}</span>
                  </div>

                  {/* Addons */}
                  {ADDONS.filter((a) => activeAddons[a.id]).map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: C.muted }}>{a.icon} {a.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{fmt(a.price)}</span>
                    </div>
                  ))}

                  {calc.addonsTotal > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: `1px solid ${C.cardBorder}` }}>
                      <span style={{ fontSize: 13, color: C.muted }}>{t("additional_services") || "Zusatzleistungen"}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{fmt(calc.addonsTotal)}</span>
                    </div>
                  )}

                  {/* Subtotal */}
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: `1px solid ${C.cardBorder}` }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t("subtotal_label") || "Zwischensumme"}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{fmt(calc.subtotal)}</span>
                  </div>

                  {/* Discount */}
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: C.input }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>{t("discount_label") || "RABATT"}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} style={{ ...S.input, width: 70, padding: "6px 8px", fontSize: 12 }}>
                        <option value="percent">%</option>
                        <option value="fixed">€</option>
                      </select>
                      <input
                        type="number" min={0} value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                        style={{ ...S.input, flex: 1, padding: "6px 10px", fontSize: 14, fontWeight: 700 }}
                        placeholder="0"
                      />
                    </div>
                    {calc.discount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: C.green }}>{t("savings_label") || "Ersparnis"}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>−{fmt(calc.discount)}</span>
                      </div>
                    )}
                  </div>

                  {/* VAT */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: C.muted }}>{t("vat_label") || "MwSt."}</span>
                      <input
                        type="number" min={0} max={100} value={vatRate}
                        onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                        style={{ ...S.input, width: 50, padding: "4px 6px", textAlign: "center", fontSize: 12 }}
                      />
                      <span style={{ fontSize: 12, color: C.muted }}>%</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>{fmt(calc.vat)}</span>
                  </div>

                  {/* TOTAL */}
                  <div style={{
                    marginTop: 8, padding: "16px", borderRadius: 14,
                    background: "linear-gradient(135deg, rgba(76,201,255,0.08), rgba(167,107,255,0.08))",
                    border: `1px solid ${C.cyan}25`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{t("total_price") || "Gesamtpreis"}</span>
                    <span style={{ fontSize: 28, fontWeight: 900, color: C.cyan, letterSpacing: "-0.02em" }}>{fmt(calc.total)}</span>
                  </div>
                </div>
              </div>

              {/* ── DEPOSIT ──────────────────────── */}
              <div style={{ ...S.card, cursor: "default", marginBottom: 16 }}>
                <div style={S.sectionTitle}><span style={{ fontSize: 14 }}>🔐</span> {t("deposit_section") || "Anzahlung"}</div>

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {[{ id: "auto", label: "25% Auto" }, { id: "custom", label: t("custom_deposit") || "Benutzerdefiniert" }].map((m) => (
                    <button key={m.id} onClick={() => setDepositMode(m.id)} style={{
                      flex: 1, padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit", border: depositMode === m.id ? `1px solid ${C.cyan}40` : `1px solid ${C.inputBorder}`,
                      background: depositMode === m.id ? C.cyanMuted : C.input, color: depositMode === m.id ? C.cyan : C.muted,
                    }}>{m.label}</button>
                  ))}
                </div>

                {depositMode === "custom" && (
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="number" value={customDeposit} placeholder={t("deposit_amount_eur") || "Betrag in €"}
                      onChange={(e) => setCustomDeposit(e.target.value)}
                      style={{ ...S.input, fontSize: 16, fontWeight: 700 }}
                    />
                  </div>
                )}

                <div style={{ padding: "10px 14px", borderRadius: 10, background: C.purpleMuted, display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{t("treatment_deposit_label") || "Anzahlung"}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: C.purple }}>{fmt(calc.deposit)}</span>
                </div>

                {/* Payment method */}
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("payment_method_section") || "Zahlungsmethode"}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {PAYMENT_METHODS.map((pm) => (
                    <button key={pm.id} onClick={() => setPaymentMethod(pm.id)} style={{
                      flex: 1, padding: "10px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      border: paymentMethod === pm.id ? `1px solid ${C.cyan}40` : `1px solid ${C.inputBorder}`,
                      background: paymentMethod === pm.id ? C.cyanMuted : C.input,
                      color: paymentMethod === pm.id ? C.cyan : C.muted,
                    }}>
                      <span style={{ fontSize: 18 }}>{pm.icon}</span>
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── QUICK STATS ──────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ padding: 12, borderRadius: 10, background: C.card, border: `1px solid ${C.cardBorder}`, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.cyan }}>{fmt(pricePerGraft)}</div>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 2 }}>{t("per_graft") || "pro Graft"}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 10, background: C.card, border: `1px solid ${C.cardBorder}`, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.purple }}>{fmt(calc.total - calc.deposit)}</div>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 2 }}>{t("remaining_amount") || "Restbetrag"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────── */}
        <div style={S.footer}>
          <button onClick={() => setPreview(!preview)} style={S.btn(C.muted, false)}>
            <span>👁️</span> {t("preview_btn") || "Vorschau"}
          </button>
          <button onClick={() => {
            const data = buildPlanData();
            // Simple PDF trigger — in real app this would generate a PDF
            if (typeof window !== "undefined") {
              const w = window.open("", "_blank");
              if (w) {
                w.document.write(`<html><head><title>${t("treatment_plan_label") || "Behandlungsplan"} — ${patient?.name || (t("patient") || "Patient")}</title><style>body{font-family:system-ui;padding:40px;max-width:800px;margin:0 auto}table{width:100%;border-collapse:collapse}td,th{padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:left}th{font-size:12px;color:#6b7280;text-transform:uppercase}.total{font-size:24px;font-weight:800;color:#0f172a}</style></head><body>`);
                w.document.write(`<h1>${t("treatment_plan_label") || "Behandlungsplan"}</h1>`);
                w.document.write(`<p><strong>${t("patient") || "Patient"}:</strong> ${patient?.name || "—"}</p>`);
                w.document.write(`<p><strong>${t("pdf_method") || "Technik"}:</strong> ${selectedTechnique.name} · ${fmtNum(grafts)} ${t("grafts_label_ui") || "Grafts"}</p>`);
                w.document.write(`<table><tr><th>${t("pdf_position") || "Position"}</th><th style="text-align:right">${t("pdf_amount") || "Betrag"}</th></tr>`);
                w.document.write(`<tr><td>${selectedTechnique.name} — ${fmtNum(grafts)} ${t("grafts_label_ui") || "Grafts"} × ${fmt(pricePerGraft)}</td><td style="text-align:right">${fmt(calc.base)}</td></tr>`);
                ADDONS.filter(a => activeAddons[a.id]).forEach(a => {
                  w.document.write(`<tr><td>${a.label}</td><td style="text-align:right">${fmt(a.price)}</td></tr>`);
                });
                if (calc.discount > 0) w.document.write(`<tr><td>${t("discount_label") || "Rabatt"}</td><td style="text-align:right;color:#10b981">−${fmt(calc.discount)}</td></tr>`);
                w.document.write(`<tr><td>${t("vat_label") || "MwSt."} (${vatRate}%)</td><td style="text-align:right">${fmt(calc.vat)}</td></tr>`);
                w.document.write(`<tr><td><strong>${t("total_price") || "Gesamtpreis"}</strong></td><td style="text-align:right" class="total">${fmt(calc.total)}</td></tr>`);
                w.document.write(`<tr><td>${t("treatment_deposit_label") || "Anzahlung"}</td><td style="text-align:right;font-weight:700">${fmt(calc.deposit)}</td></tr>`);
                w.document.write(`</table>`);
                if (notes) w.document.write(`<p style="margin-top:24px;color:#6b7280"><strong>${t("notes_label") || "Notizen"}:</strong> ${notes}</p>`);
                w.document.write(`</body></html>`);
                w.document.close();
                w.print();
              }
            }
          }} style={S.btn(C.orange, false)}>
            <span>📄</span> {t("download_pdf") || "PDF herunterladen"}
          </button>
          <button onClick={() => { const data = buildPlanData(); onSend?.(data); }} style={S.btn(C.green, false)}>
            <span>💬</span> {t("send_via_wa") || "Per WhatsApp senden"}
          </button>
          <button onClick={() => { const data = buildPlanData(); onSave?.(data); }} style={S.btn(C.cyan, true)}>
            <span>✨</span> {t("create_offer") || "Angebot erstellen"}
          </button>
        </div>

        {/* ── PREVIEW MODAL ─────────────────────── */}
        {preview && (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setPreview(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(600px, 90vw)", maxHeight: "80vh", overflowY: "auto", background: "#fff", borderRadius: 16, padding: 32, color: "#0f172a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>{t("treatment_plan_label") || "Behandlungsplan"}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{patient?.name || (t("patient") || "Patient")}</div>
                </div>
                <button onClick={() => setPreview(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "#f1f5f9", border: "none", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>

              <div style={{ padding: 16, borderRadius: 12, background: "#f8fafc", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>{t("pdf_method") || "Technik"}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{selectedTechnique.icon} {selectedTechnique.name}</div>
                <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>{fmtNum(grafts)} {t("grafts_label_ui") || "Grafts"} · {fmt(pricePerGraft)} {t("per_graft") || "pro Graft"}</div>
              </div>

              {ADDONS.filter(a => activeAddons[a.id]).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>{t("additional_services") || "Zusatzleistungen"}</div>
                  {ADDONS.filter(a => activeAddons[a.id]).map(a => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>
                      <span>{a.icon} {a.label}</span>
                      <span style={{ fontWeight: 700 }}>{fmt(a.price)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ padding: 20, borderRadius: 12, background: "linear-gradient(135deg, #eff6ff, #faf5ff)", border: "1px solid #e0e7ff", textAlign: "center", marginTop: 20 }}>
                <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>{t("total_price") || "Gesamtpreis"}</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>{fmt(calc.total)}</div>
                {calc.discount > 0 && <div style={{ fontSize: 13, color: "#10b981", fontWeight: 600, marginTop: 4 }}>{t("you_save") || "Sie sparen"} {fmt(calc.discount)}</div>}
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>{t("treatment_deposit_label") || "Anzahlung"}: <strong>{fmt(calc.deposit)}</strong></div>
              </div>

              {notes && (
                <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "#f8fafc", fontSize: 13, color: "#6b7280" }}>
                  <strong>{t("remarks_label") || "Anmerkungen"}:</strong> {notes}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
