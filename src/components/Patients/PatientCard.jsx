import { fmLocale } from "../../utils/helpers";

/**
 * PatientCard — Shows extracted medical data from AI conversation.
 * Combines intake_data + extracted_fields into a unified patient card.
 * Always visible — fields fill in as data becomes available.
 */
export default function PatientCard({ lead, t }) {
  const intake = lead.intake || {};
  const extracted = lead.extractedFields || {};
  const fields = { ...extracted, ...intake };
  const hasFields = fields && Object.keys(fields).length > 0;

  // Keys to suppress from extra display (shown elsewhere: header, Behandlungsplan)
  const suppressKeys = new Set([
    "name", "first_name", "last_name", "fullName", "full_name",
    "treatment", "grafts", "graft_count", "graftCount",
    "price", "technique", "country", "language", "locale",
    "email", "source", "consent", "gdpr",
    "dob", "date_of_birth", "birthday", "geburtsdatum",
    "medical_history", "gender", "desired_result", "budget", "preferred_date",
  ]);

  // Known field keys in logical display order
  const knownKeys = [
    // Identity
    { key: "name", label: t("name") || "Name", icon: "👤", value: lead.name },
    { key: "phone", label: t("phone") || "Telefon", icon: "📞", value: lead.phone || null },
    { key: "age", label: t("age") || "Alter", icon: "🎂" },
    { key: "concern", label: t("concern") || "Anliegen", icon: "💬" },
    // Hair analysis
    { key: "hair_loss_type", label: t("hair_loss_type") || "Art des Haarausfalls", icon: "📊" },
    { key: "norwood_scale", label: t("norwood_label") || "Norwood", icon: "📏" },
    { key: "hair_loss_duration", label: t("hair_loss_since") || "Haarausfall seit", icon: "📅" },
    // Medical history
    { key: "previous_treatments", label: t("previous_treatments") || "Vorh. Behandlung", icon: "🔄" },
    { key: "medications", label: t("medications") || "Medikamente", icon: "💊" },
    { key: "allergies", label: t("allergies") || "Allergien", icon: "⚠️" },
    { key: "medical_conditions", label: t("medical_conditions") || "Med. Historie", icon: "🏥" },
    { key: "diabetes", label: t("diabetes") || "Diabetes", icon: "🩸" },
    { key: "blood_pressure", label: t("blood_pressure") || "Blutdruck", icon: "❤️" },
    { key: "smoker", label: t("smoker") || "Raucher", icon: "🚬", format: v => v === true ? (t("yes_val") || "Yes") : v === false ? (t("no_val") || "No") : v },
    { key: "blood_thinners", label: t("blood_thinners") || "Blutverdünner", icon: "💉", format: v => v === true ? (t("yes_val") || "Yes") : v === false ? (t("no_val") || "No") : v },
  ];

  const knownKeySet = new Set(knownKeys.map(k => k.key));
  // Extra keys: not in known list AND not suppressed
  const extraKeys = Object.keys(fields).filter(k => !knownKeySet.has(k) && !suppressKeys.has(k) && fields[k]);

  const s = {
    card: {
      marginBottom: 16, padding: 16, borderRadius: 14,
      background: "linear-gradient(135deg, rgba(167,107,255,0.04), rgba(76,201,255,0.04))",
      border: "1px solid rgba(167,107,255,0.15)",
    },
    header: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 },
    title: { fontWeight: 800, fontSize: 14, color: "#a78bfa" },
    subtitle: { fontSize: 11, color: "rgba(167,177,195,0.5)", marginTop: 2 },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" },
    fieldLabel: {
      fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)",
      textTransform: "uppercase", marginBottom: 2, display: "flex", alignItems: "center", gap: 4,
    },
    fieldValue: { fontSize: 13, color: "#e2e8f0", fontWeight: 500 },
    flagRed: { fontSize: 13, color: "#ef4444", fontWeight: 600 },
    badge: {
      display: "inline-block", padding: "2px 8px", borderRadius: 6,
      fontSize: 10, fontWeight: 700, background: "rgba(167,107,255,0.1)", color: "#a78bfa", marginLeft: 6,
    },
  };

  const isFlagged = (key, val) => {
    const v = String(val).toLowerCase();
    if (key === "diabetes" && v !== "no" && v !== "none" && v !== "nein" && v !== "false") return true;
    if (key === "blood_thinners" && v !== "no" && v !== "none" && v !== "nein" && v !== "false") return true;
    if (key === "allergies" && v !== "no" && v !== "none" && v !== "nein" && v !== "keine") return true;
    if (key === "medical_conditions" && v !== "no" && v !== "none" && v !== "nein" && v !== "keine") return true;
    return false;
  };

  return (
    <div style={s.card}>
      <div style={s.header}>
        <span style={{ fontSize: 18 }}>🏥</span>
        <div style={{ flex: 1 }}>
          <div style={s.title}>{t("patient_card")}</div>
          <div style={s.subtitle}>{t("patient_card_desc")}</div>
        </div>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            e.preventDefault();
            try {
              const { getAccessToken } = await import("../../api/client");
              const token = getAccessToken() || sessionStorage.getItem("fm_access_token");
              if (!token) { alert(t("not_logged_in") || "Nicht eingeloggt"); return; }
              const base = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://api.flowmatix.io";
              const resp = await fetch(`${base}/api/v1/crm/pdf/patient-card/${lead.id}`, {
                headers: { "Authorization": `Bearer ${token}` },
              });
              if (!resp.ok) { alert((t("pdf_error") || "PDF Fehler") + ": " + resp.status); return; }
              const blob = await resp.blob();
              const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
              const a = document.createElement("a");
              a.style.display = "none";
              a.href = url;
              a.download = `Patientenkarte-${(lead.name || "Patient").replace(/\s/g, "-")}.pdf`;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
            } catch (err) { alert(t("pdf_download_failed") || "PDF Download fehlgeschlagen"); console.error(err); }
          }}
          style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(167,107,255,0.08)", border: "1px solid rgba(167,107,255,0.15)", color: "#a78bfa", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
        >📄 PDF</button>
        {(fields.diabetes || fields.allergies || fields.blood_thinners || fields.medical_conditions) && (
          <span style={{ ...s.badge, background: "rgba(239,68,68,0.1)", color: "#ef4444", marginLeft: "auto" }}>
            {t("medical_flags")}
          </span>
        )}
      </div>

      {/* Known fields grid */}
      <div style={s.grid}>
        {knownKeys.map(({ key, label, icon, value: override, format }) => {
          let val = override !== undefined ? override : fields[key];
          // Alias fallbacks
          if (!val && key === "medical_conditions") val = fields.medical_history;
          if (!val && key === "norwood_scale") val = fields.norwood;
          if (format && val != null) val = format(val);
          const display = val != null && val !== "" ? String(val) : "—";
          const flagged = val ? isFlagged(key, val) : false;
          const muted = !val;
          return (
            <div key={key}>
              <div style={s.fieldLabel}><span style={{ fontSize: 10 }}>{icon}</span> {label}</div>
              <div style={flagged ? s.flagRed : muted ? { ...s.fieldValue, color: "rgba(167,177,195,0.25)" } : s.fieldValue}>{String(display)}</div>
            </div>
          );
        })}
        {extraKeys.map(key => (
          <div key={key}>
            <div style={s.fieldLabel}>{String(key).replace(/_/g, " ")}</div>
            <div style={s.fieldValue}>{String(fields[key])}</div>
          </div>
        ))}
      </div>

      {/* Review / Behandlungsplan — shown when doctor has reviewed */}
      {lead.reviewData && (() => {
        const rd = lead.reviewData;
        return <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>📋</span>
            <span style={{ fontWeight: 800, fontSize: 13, color: "#10b981" }}>{t("treatment_plan_title") || "Behandlungsplan"}</span>
          </div>
          <div style={s.grid}>
            <div>
              <div style={s.fieldLabel}>💉 {t("technique") || "Technik"}</div>
              <div style={s.fieldValue}>{rd.technique || lead.treatment || "—"}</div>
            </div>
            <div>
              <div style={s.fieldLabel}>✂️ {t("grafts_label_ui") || "Grafts"}</div>
              <div style={s.fieldValue}>{rd.grafts || "—"}</div>
            </div>
            <div>
              <div style={s.fieldLabel}>💰 {t("price_label") || "Preis"}</div>
              <div style={{ ...s.fieldValue, color: "#10b981", fontWeight: 700 }}>{rd.price || "—"}</div>
            </div>
            <div>
              <div style={s.fieldLabel}>👨‍⚕️ {t("reviewed_by") || "Bewertet von"}</div>
              <div style={{ ...s.fieldValue, color: "#ff8a2a" }}>{rd.doctorName || rd.reviewedBy || lead.reviewedBy || lead.reviewAssignedTo || "—"}</div>
            </div>
            <div>
              <div style={s.fieldLabel}>🔬 {t("op_doctor") || "OP-Arzt"}</div>
              <div style={{ ...s.fieldValue, color: "#a78bfa" }}>{rd.operatingDoctor || lead.appointmentDoctor || "—"}</div>
            </div>
            <div>
              <div style={s.fieldLabel}>📅 {t("op_date") || "OP-Termin"}</div>
              <div style={s.fieldValue}>{(()=>{
                const b = lead.booking;
                const a = lead.appointmentDate || lead.appointment?.scheduled_at;
                if (b && b.date) return `${new Date(b.date).toLocaleDateString(fmLocale(),{day:"2-digit",month:"2-digit",year:"numeric"})}${b.time ? " · " + b.time : ""}`;
                if (a) { const d = new Date(a); return d.toLocaleDateString(fmLocale(),{day:"2-digit",month:"2-digit",year:"numeric"}) + " · " + d.toLocaleTimeString(fmLocale(),{hour:"2-digit",minute:"2-digit"}); }
                return "—";
              })()}</div>
            </div>
            {rd.notes && <div style={{ gridColumn: "1 / -1" }}>
              <div style={s.fieldLabel}>📝 {t("notes_label") || "Notizen"}</div>
              <div style={{ ...s.fieldValue, color: "rgba(232,238,252,0.7)" }}>{rd.notes}</div>
            </div>}
          </div>
        </div>;
      })()}
    </div>
  );
}
