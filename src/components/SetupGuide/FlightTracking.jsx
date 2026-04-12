import { useState } from "react";
import { Field } from "./setupShared";

// Drivers sub-panel — manages driver list for airport transfers
function DriversPanel({ clinic, updateClinic, showT, t }) {
  const [newDriver, setNewDriver] = useState({ name: "", phone: "", vehicle: "", plate: "" });
  const drivers = clinic.drivers || [];

  const addDriver = () => {
    if (!newDriver.name || !newDriver.phone) { showT(t("name_phone_required")); return; }
    const role = drivers.length === 0 ? "primary" : "backup";
    updateClinic({ drivers: [...drivers, { ...newDriver, role }] });
    showT(t("driver_added"));
    setNewDriver({ name: "", phone: "", vehicle: "", plate: "" });
  };

  const removeDriver = (idx) => {
    const updated = drivers.filter((_, i) => i !== idx);
    if (updated.length > 0 && !updated.some(d => d.role === "primary")) {
      updated[0].role = "primary";
    }
    updateClinic({ drivers: updated });
    showT(t("driver_removed"));
  };

  const setPrimary = (idx) => {
    const updated = drivers.map((d, i) => ({ ...d, role: i === idx ? "primary" : "backup" }));
    updateClinic({ drivers: updated });
    showT(t("saved"));
  };

  return <div>
    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>{t("setup_drivers_desc")}</p>

    {drivers.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>{drivers.length} {t("drivers_registered")}</div>}

    {drivers.map((d, i) => (
      <div key={i} style={{ padding: "14px 16px", borderRadius: 12, background: "var(--bg-section)", border: "1px solid var(--border-default)", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 18 }}>{"\u{1F697}"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {"\u{1F4F1}"} {d.phone}{d.vehicle ? ` · \u{1F699} ${d.vehicle}` : ""}{d.plate ? ` · \u{1F522} ${d.plate}` : ""}
          </div>
        </div>
        {d.role !== "primary" && <button onClick={() => setPrimary(i)} title="Als Hauptfahrer setzen" style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", color: "#4cc9ff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{"⭐"}</button>}
        <span style={{ fontSize: 11, fontWeight: 700, color: d.role === "primary" ? "#4cc9ff" : "var(--text-muted)", padding: "3px 10px", borderRadius: 7, background: d.role === "primary" ? "rgba(76,201,255,0.08)" : "var(--bg-card)" }}>
          {d.role === "primary" ? (t("primary_driver")) : (t("backup_driver"))}
        </span>
        <button onClick={() => removeDriver(i)} style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"✕"}</button>
      </div>
    ))}

    {/* Always show add form */}
    <div style={{ padding: 16, borderRadius: 12, background: "rgba(76,201,255,0.02)", border: "1px dashed rgba(76,201,255,0.12)", marginTop: drivers.length > 0 ? 12 : 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>+ {t("add_driver")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input value={newDriver.name} onChange={e => setNewDriver(p => ({ ...p, name: e.target.value }))} placeholder={t("driver_name")} style={{ padding: "9px 12px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
        <input value={newDriver.phone} onChange={e => setNewDriver(p => ({ ...p, phone: e.target.value }))} placeholder={(t("driver_phone")) + " (+49...)"} style={{ padding: "9px 12px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <input value={newDriver.vehicle} onChange={e => setNewDriver(p => ({ ...p, vehicle: e.target.value }))} placeholder={t("vehicle")} style={{ padding: "9px 12px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
        <input value={newDriver.plate} onChange={e => setNewDriver(p => ({ ...p, plate: e.target.value }))} placeholder={t("license_plate")} style={{ padding: "9px 12px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
      </div>
      <button onClick={addDriver} style={{ padding: "8px 18px", borderRadius: 8, background: "rgba(76,201,255,0.12)", border: "1px solid rgba(76,201,255,0.25)", color: "#4cc9ff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ {t("add_driver")}</button>
    </div>
  </div>;
}

// Flight tracking panel — auto-detection toggle, how it works, notification timing
function FlightsPanel({ clinic, updateClinic, t }) {
  const config = clinic.logisticsConfig || {};
  const isEnabled = config.autoNotifyDriver === true;

  return <div>
    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>{t("setup_flights_desc")}</p>
    <div style={{ padding: 16, borderRadius: 12, background: isEnabled ? "rgba(16,185,129,0.04)" : "var(--bg-section)", border: `1px solid ${isEnabled ? "rgba(16,185,129,0.12)" : "var(--border-default)"}`, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>{"✈️"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t("auto_flight_detection")}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{isEnabled ? "✅ " + (t("active")) : (t("not_active"))}</div>
        </div>
        <button onClick={() => updateClinic({ logisticsConfig: { ...config, autoNotifyDriver: !isEnabled } })} style={{ padding: "8px 16px", borderRadius: 8, background: isEnabled ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${isEnabled ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`, color: isEnabled ? "#ef4444" : "#10b981", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{isEnabled ? (t("deactivate")) : (t("activate"))}</button>
      </div>
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("how_it_works") || "So funktioniert es"}</div>
    <div style={{ display: "grid", gap: 6, marginBottom: 20 }}>
      {[
        { icon: "\u{1F4F1}", text: t("flight_step1") || "Patient sendet Flugticket per WhatsApp" },
        { icon: "\u{1F916}", text: t("flight_step2") || "KI erkennt automatisch Flugnummer, Datum und Ankunftszeit" },
        { icon: "\u{1F697}", text: t("flight_step3") || "Fahrer wird automatisch per WhatsApp benachrichtigt" },
        { icon: "✅", text: t("flight_step4") || "Patient erhaelt Bestaetigung mit Fahrer-Details" },
      ].map((step, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "var(--bg-section)", fontSize: 12, color: "var(--text-muted)" }}>
          <span style={{ fontSize: 16 }}>{step.icon}</span>
          <span>{step.text}</span>
        </div>
      ))}
    </div>

    {/* WhatsApp notification timing */}
    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("wa_notification_timing") || "WhatsApp-Benachrichtigung"}</div>
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{t("escalation_timeout") || "Eskalation nach (Minuten)"}</div>
      <input type="number" value={config.escalationTimeoutMin || 30} onChange={e => updateClinic({ logisticsConfig: { ...config, escalationTimeoutMin: Number.parseInt(e.target.value) || 30 } })} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
      <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>{t("escalation_timeout_desc") || "Nach dieser Zeit wird der naechste Fahrer benachrichtigt, falls keine Bestaetigung erfolgt."}</div>
    </div>
  </div>;
}

// Combined flight tracking page — drivers section + flight detection section
export default function FlightTracking({ clinic, updateClinic, showT, t }) {
  return <div>
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 18 }}>{"\u{1F697}"}</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{t("sg_drivers") || "Fahrer & Transport"}</h3>
      </div>
      <DriversPanel clinic={clinic} updateClinic={updateClinic} showT={showT} t={t} />
    </div>
    <div style={{ paddingTop: 24, borderTop: "1px solid var(--border-default)" }}>
      <FlightsPanel clinic={clinic} updateClinic={updateClinic} t={t} />
    </div>
  </div>;
}
