import { LockedBanner, Field, SaveBtn, TIMEZONES } from "./setupShared";

// Clinic profile form (Klinikprofil) — name, address, phone, email, timezone
export default function ClinicProfile({ clinic, isDone, localData, setLocalData, updateClinic, showT, t, autoSave }) {
  const locked = isDone("profile");
  const d = { name: clinic.name || "", address: clinic.address || "", postal_code: clinic.postal_code || "", city: clinic.city || "", country: clinic.country || "", phone: clinic.phone || "", clinicEmail: clinic.clinicEmail || "", timezone: clinic.timezone || "Europe/Berlin", ...localData.profile };
  const set = (k, v) => {
    const updated = { ...d, [k]: v };
    setLocalData(prev => ({ ...prev, profile: { ...prev.profile, [k]: v } }));
    if (autoSave) updateClinic(updated);
  };

  return <div>
    {locked && <LockedBanner t={t} />}
    <div style={{ opacity: locked ? 0.5 : 1, pointerEvents: locked ? "none" : "auto" }}>
      <Field label={t("clinic_name") || "Klinikname"} value={d.name} onChange={v => set("name", v)} placeholder="Istanbul Hair Clinic" disabled={locked} />
      <Field label={t("address") || "Adresse"} value={d.address} onChange={v => set("address", v)} placeholder="Musterstrasse 1" disabled={locked} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("postal_code") || "PLZ"} value={d.postal_code} onChange={v => set("postal_code", v)} placeholder="26135" disabled={locked} />
        <Field label={t("city") || "Stadt"} value={d.city} onChange={v => set("city", v)} placeholder="Oldenburg" disabled={locked} />
      </div>
      <Field label={t("country") || "Land"} value={d.country} onChange={v => set("country", v)} placeholder="Deutschland" disabled={locked} />
      <Field label={t("phone") || "Telefon"} value={d.phone} onChange={v => set("phone", v)} placeholder="+49 441 123456" disabled={locked} />
      <Field label={t("email") || "E-Mail"} value={d.clinicEmail} onChange={v => set("clinicEmail", v)} placeholder="info@clinic.com" disabled={locked} />
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{t("timezone") || "Zeitzone"}</div>
        <select value={d.timezone} onChange={e => set("timezone", e.target.value)} disabled={locked} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer" }}>
          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replaceAll(/_/g, " ")}</option>)}
        </select>
      </div>
      {!autoSave && <SaveBtn onClick={() => { updateClinic(d); setLocalData(p => ({ ...p, profile: {} })); showT(t("saved")); }} t={t} />}
    </div>
  </div>;
}
