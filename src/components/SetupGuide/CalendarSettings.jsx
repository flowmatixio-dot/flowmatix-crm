import { Field } from "./setupShared";
import { getGoogleConnectUrlSafe } from "../../api/client";

// Calendar & appointments settings — Google integrations, booking rules
export default function CalendarSettings({ clinic, updateClinic, showT, t, wizardMode }) {
  const orgId = clinic?.orgId || clinic?.id;
  const handleGoogleConnect = async () => {
    try { window.location.href = await getGoogleConnectUrlSafe(orgId); }
    catch { showT(t("google_connect_error") || "Google-Verbindung fehlgeschlagen"); }
  };
  const rules = clinic.aiConfig?.bookingRules || {};

  return <div>
    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>{t("setup_calendar_desc")}</p>

    {/* Doctor portal info */}
    {!wizardMode && <div style={{ padding: 14, borderRadius: 12, background: "rgba(167,107,255,0.04)", border: "1px solid rgba(167,107,255,0.12)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 18 }}>{"\u{1F468}‍⚕️"}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#a78bfa" }}>{t("doctor_portal") || "Arzt-Portal"}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t("doctor_portal_calendar_desc") || "Aerzte sehen ihre Termine im Arzt-Portal und koennen Verfuegbarkeiten verwalten."}</div>
      </div>
    </div>}

    {/* Google integrations */}
    {wizardMode ? (
      <div onClick={() => handleGoogleConnect()} style={{ padding: 16, borderRadius: 12, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.12)", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(76,201,255,0.08)"; e.currentTarget.style.borderColor = "rgba(76,201,255,0.25)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(76,201,255,0.04)"; e.currentTarget.style.borderColor = "rgba(76,201,255,0.12)"; }}>
        <span style={{ fontSize: 28 }}>G</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Google Workspace</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Drive, Sheets & Calendar</div>
        </div>
        <span style={{ padding: "4px 12px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: "rgba(16,185,129,0.12)", color: "#10b981" }}>{t("connected") || "Verbunden"}</span>
      </div>
    ) : (<>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 16, borderRadius: 12, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.12)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{"\u{1F4C1}"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Google Drive</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("gdrive_desc") || "Dokumente & Fotos"}</div>
          </div>
          <span style={{ padding: "3px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: "rgba(16,185,129,0.12)", color: "#10b981" }}>{t("connected") || "Verbunden"}</span>
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.12)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{"\u{1F4DD}"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Google Sheets</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("gsheets_desc") || "Datenexport"}</div>
          </div>
          <span style={{ padding: "3px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: "rgba(16,185,129,0.12)", color: "#10b981" }}>{t("connected") || "Verbunden"}</span>
        </div>
      </div>
      <div style={{ padding: 16, borderRadius: 12, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.12)", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>{"\u{1F4C5}"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Google Calendar</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{clinic.googleCalendarId ? "✅ " + (t("connected") || "Verbunden") : (t("not_connected") || "Nicht verbunden")}</div>
        </div>
        <button onClick={() => handleGoogleConnect()} style={{ padding: "8px 16px", borderRadius: 8, background: clinic.googleCalendarId ? "rgba(239,68,68,0.08)" : "rgba(76,201,255,0.12)", border: `1px solid ${clinic.googleCalendarId ? "rgba(239,68,68,0.2)" : "rgba(76,201,255,0.25)"}`, color: clinic.googleCalendarId ? "#ef4444" : "#4cc9ff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{clinic.googleCalendarId ? (t("disconnect_google") || "Trennen") : (t("connect_google") || "Verbinden")}</button>
      </div>
    </>)}

    {/* Booking rules */}
    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{t("booking_rules") || "Buchungsregeln"}</div>
    {wizardMode && <div style={{ fontSize: 12, color: "rgba(167,177,195,0.65)", marginBottom: 12, lineHeight: 1.5 }}>
      {{ de: "Der KI-Bot nutzt diese Regeln um Patienten nur passende Termine vorzuschlagen. Mindestvorlauf = wie viele Stunden vorher ein Termin frühestens gebucht werden kann. Zeitfenster = Dauer pro Termin-Slot.", en: "The AI bot uses these rules to suggest suitable appointments to patients. Minimum notice = how many hours in advance an appointment can be booked. Slot duration = length per appointment slot.", tr: "Yapay zeka botu bu kuralları kullanarak hastalara uygun randevular önerir. Minimum önceden bildirim = randevunun en erken kaç saat önce alınabileceği. Zaman aralığı = randevu başına süre." }[localStorage.getItem("fm_lang") || "de"] || "The AI bot uses these rules to suggest suitable appointments to patients."}
    </div>}
    <Field label={t("min_notice") || "Mindestvorlauf (Stunden)"} value={rules.minNoticeHours || 24} onChange={v => updateClinic({ aiConfig: { ...clinic.aiConfig, bookingRules: { ...rules, minNoticeHours: Number.parseInt(v) || 24 } } })} type="number" />
    <Field label={t("slot_duration") || "Zeitfenster (Minuten)"} value={rules.slotDuration || 60} onChange={v => updateClinic({ aiConfig: { ...clinic.aiConfig, bookingRules: { ...rules, slotDuration: Number.parseInt(v) || 60 } } })} type="number" />
  </div>;
}
