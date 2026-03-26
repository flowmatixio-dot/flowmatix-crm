import { useState } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";
import { PLAN_LIMITS } from "../../data/constants";

function getSources(t) {
  return [
    { id: "whatsapp", label: t("channel_whatsapp") || "WhatsApp", icon: "💬", color: "#25D366" },
    { id: "instagram", label: t("channel_instagram") || "Instagram", icon: "📸", color: "#E1306C" },
    { id: "facebook", label: t("channel_facebook") || "Facebook", icon: "📘", color: "#1877F2" },
    { id: "website", label: t("channel_website") || "Website", icon: "🌐", color: "#4cc9ff" },
    { id: "email", label: t("channel_email") || "E-Mail", icon: "📧", color: "#a78bfa" },
    { id: "phone", label: t("channel_phone") || "Telefon", icon: "📞", color: "#f59e0b" },
    { id: "referral", label: t("channel_referral") || "Empfehlung", icon: "🤝", color: "#10b981" },
    { id: "manual", label: t("channel_manual") || "Manuell", icon: "✏️", color: "#6b7280" },
  ];
}

function getTreatments() {
  const l = localStorage.getItem("fm_lang") || "de";
  return [
    { de: "FUE Haartransplantation", en: "FUE Hair Transplant", tr: "FUE Saç Ekimi" },
    { de: "DHI Haartransplantation", en: "DHI Hair Transplant", tr: "DHI Saç Ekimi" },
    { de: "FUE Saphir Haartransplantation", en: "FUE Sapphire Hair Transplant", tr: "FUE Safir Saç Ekimi" },
    { de: "Bart-Transplantation", en: "Beard Transplant", tr: "Sakal Ekimi" },
    { de: "Augenbrauen-Transplantation", en: "Eyebrow Transplant", tr: "Kaş Ekimi" },
    { de: "PRP Therapie", en: "PRP Therapy", tr: "PRP Tedavisi" },
    { de: "Beratung", en: "Consultation", tr: "Danışma" },
  ].map(t => t[l] || t.de);
}

export default function NewLeadModal({ onClose, onCreated, showT }) {
  const { t, clinic, leads } = useApp();
  const SOURCES = getSources(t);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("whatsapp");
  const [treatment, setTreatment] = useState("");
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");
  const [startWhatsApp, setStartWhatsApp] = useState(true);
  const [sending, setSending] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { showT?.(t("enter_name") || "Name eingeben"); return; }
    const limit = clinic?.patient_limit || (PLAN_LIMITS[clinic?.plan] || PLAN_LIMITS.core).patients || 1000;
    const currentCount = (leads || []).filter(l => !l.is_demo && !l.deleted_at).length;
    if (limit && currentCount >= limit) { showT?.(t("patient_limit_reached") || "Patientenlimit erreicht"); return; }
    setSending(true);
    try {
      const data = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        source,
        treatment: treatment || undefined,
        country: country.trim() || undefined,
        notes: notes.trim() || undefined,
        startWhatsApp: startWhatsApp && !!phone.trim(),
      };
      // Try the new intake endpoint first, fallback to createPatient
      let result;
      try {
        result = await fmApi.apiFetch("/api/v1/crm/leads/intake", {
          method: "POST",
          body: JSON.stringify(data),
        });
      } catch {
        result = await fmApi.createPatient(data);
      }
      showT?.(`${name} ${t("lead_created_msg") || "als Lead angelegt"}`);
      onCreated?.(result);
      onClose();
    } catch (e) {
      showT?.(e.message || t("create_error") || "Fehler beim Erstellen");
    }
    setSending(false);
  };

  const inp = {
    width: "100%", padding: "9px 12px", borderRadius: 8, boxSizing: "border-box",
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    color: "rgba(232,238,252,0.85)", fontSize: 12, fontWeight: 500, fontFamily: "inherit", outline: "none",
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)",
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: 520, maxHeight: "85vh", overflowY: "auto", zIndex: 10000,
        background: "#111827", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(232,238,252,0.95)" }}>{t("new_lead_title") || "Neuer Lead"}</div>
            <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 2 }}>{t("create_patient_manual") || "Patient manuell anlegen"}</div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(167,177,195,0.5)", fontSize: 14, cursor: "pointer", padding: "4px 8px",
            borderRadius: 6, lineHeight: 1,
          }}>✕</button>
        </div>

        <div style={{ padding: "16px 22px 20px" }}>
          {/* Source Selection */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{t("source_label") || "Quelle"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SOURCES.map(s => (
                <button key={s.id} onClick={() => setSource(s.id)} style={{
                  padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  background: source === s.id ? `${s.color}12` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${source === s.id ? `${s.color}30` : "rgba(255,255,255,0.05)"}`,
                  color: source === s.id ? s.color : "rgba(167,177,195,0.45)",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span style={{ fontSize: 10 }}>{s.icon}</span> {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name + Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", marginBottom: 4 }}>{t("name") || "Name"} *</div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={t("name_placeholder") || "Max Mustermann"} style={inp} autoFocus />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", marginBottom: 4 }}>{t("phone") || "Telefon"}</div>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 171 1234567" style={inp} />
            </div>
          </div>

          {/* Email + Country */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", marginBottom: 4 }}>{t("channel_email") || "E-Mail"}</div>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="max@example.com" type="email" style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", marginBottom: 4 }}>{t("country") || "Land"}</div>
              <input value={country} onChange={e => setCountry(e.target.value)} placeholder={t("country_placeholder") || "Deutschland"} style={inp} />
            </div>
          </div>

          {/* Treatment */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", marginBottom: 4 }}>{t("treatment") || "Behandlung"}</div>
            <select value={treatment} onChange={e => setTreatment(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              <option value="">{t("select_placeholder") || "— Wählen —"}</option>
              {getTreatments().map(tr => <option key={tr} value={tr}>{tr}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", marginBottom: 4 }}>{t("notes_label") || "Notizen"}</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("additional_info_placeholder") || "Zusätzliche Informationen..."} rows={2} style={{ ...inp, resize: "vertical" }} />
          </div>

          {/* WhatsApp toggle */}
          {phone && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 16,
              background: startWhatsApp ? "rgba(37,211,102,0.04)" : "rgba(255,255,255,0.015)",
              border: `1px solid ${startWhatsApp ? "rgba(37,211,102,0.12)" : "rgba(255,255,255,0.04)"}`,
              display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
            }} onClick={() => setStartWhatsApp(!startWhatsApp)}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: startWhatsApp ? "#25D366" : "rgba(167,177,195,0.5)" }}>
                  💬 {t("start_wa_conversation") || "WhatsApp-Gespräch starten"}
                </div>
                <div style={{ fontSize: 10, color: "rgba(167,177,195,0.3)", marginTop: 1 }}>
                  {t("ai_bot_starts_conversation") || "KI-Bot beginnt automatisch die Konversation"}
                </div>
              </div>
              <div style={{
                width: 34, height: 18, borderRadius: 9, position: "relative",
                background: startWhatsApp ? "#25D366" : "rgba(255,255,255,0.08)", transition: "background 0.2s",
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 7, background: "white", position: "absolute",
                  top: 2, left: startWhatsApp ? 18 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.5)",
            }}>{t("cancel") || "Abbrechen"}</button>
            <button onClick={handleCreate} disabled={sending} style={{
              padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              background: "#4cc9ff", border: "1px solid #4cc9ff", color: "#0a0e17",
              boxShadow: "0 2px 8px rgba(76,201,255,0.2)", opacity: sending ? 0.6 : 1,
            }}>
              {sending ? (t("creating") || "Erstelle...") : (t("create_lead") || "Lead anlegen")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
