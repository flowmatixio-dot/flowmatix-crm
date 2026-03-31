import { useState, useEffect } from "react";
import { getWaProfile, updateWaProfile, uploadWaProfilePhoto, saveWaProfileRequest } from "../../api/client";
import { Field } from "./setupShared";

// WhatsApp Bot Profile — AI engine, logo, banner, opening hours, preview
export default function BotProfile({ clinic, updateClinic, showT, t }) {
  const [waLogoPreview, setWaLogoPreview] = useState(null);
  const [waBannerPreview, setWaBannerPreview] = useState(null);
  const [waProfileSaving, setWaProfileSaving] = useState(false);
  const [waProfileLoaded, setWaProfileLoaded] = useState(false);
  const [waProfileError, setWaProfileError] = useState(null);

  // Load current WA profile from Meta API once
  const waIsConnected = clinic?.connection_status === "connected";
  useEffect(() => {
    if (waProfileLoaded || !waIsConnected) return;
    (async () => {
      try {
        const meta = await getWaProfile();
        if (meta) {
          const cur = clinic.waProfile || {};
          const merged = { ...cur };
          if (meta.about && !cur.infoText) merged.infoText = meta.about;
          if (meta.address && !cur.address) merged.address = meta.address;
          if (meta.email && !cur.email) merged.email = meta.email;
          if (meta.description && !cur.description) merged.description = meta.description;
          if (meta.vertical && !cur.category) merged.category = meta.vertical;
          if (meta.websites?.length && !cur.website) merged.website = meta.websites[0];
          if (meta.profile_picture_url && !cur.logoUrl) merged.logoUrl = meta.profile_picture_url;
          updateClinic({ waProfile: merged });
        }
      } catch { /* ignore if not connected yet */ }
      setWaProfileLoaded(true);
    })();
  }, [waIsConnected]);

  const profile = clinic.waProfile || {};
  const update = (key, val) => updateClinic({ waProfile: { ...profile, [key]: val } });
  const logoPreview = waLogoPreview || profile.logoUrl || null;
  const bannerPreview = waBannerPreview || profile.bannerUrl || null;
  const isConnected = waIsConnected;

  const handleImage = (type) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      if (type === "logo") {
        setWaLogoPreview(dataUrl);
        update("logoUrl", dataUrl);
      } else {
        setWaBannerPreview(dataUrl);
        update("bannerUrl", dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!isConnected) {
      showT(t("wa_not_connected"));
      return;
    }
    setWaProfileSaving(true);
    setWaProfileError(null);
    try {
      const hours = profile.hours || {};
      const businessHours = [];
      const dayMap = { weekdays: ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"], saturday: ["SATURDAY"], sunday: ["SUNDAY"] };
      for (const [key, days] of Object.entries(dayMap)) {
        if (!hours[key + "Closed"]) {
          for (const day of days) {
            businessHours.push({
              day_of_week: day,
              open_time: (hours[key + "Open"] || "09:00").replace(":", ""),
              close_time: (hours[key + "Close"] || "18:00").replace(":", ""),
            });
          }
        }
      }

      await saveWaProfileRequest({
        botName: profile.botName || clinic.name || "",
        about: profile.infoText || "",
        address: profile.address || "",
        email: profile.email || "",
        description: profile.infoText || "",
        vertical: profile.category || "HEALTH",
        websites: profile.website ? [profile.website] : [],
        businessHours: businessHours.length ? { business_hours: businessHours, timezone: "Europe/Berlin" } : undefined,
        logoUrl: profile.logoUrl || null,
        bannerUrl: profile.bannerUrl || null,
      });

      showT(t("wa_profile_saved") || "Profil gespeichert — wird von Flowmatix eingerichtet");
      setWaLogoPreview(null);
    } catch (err) {
      const msg = err?.body?.error || err?.message || t("error_saving");
      setWaProfileError(msg);
      showT(msg);
    } finally {
      setWaProfileSaving(false);
    }
  };

  return <div>
    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>{t("setup_wa_profile")}</p>

    {/* Logo + Banner side by side */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
      {/* Profile Photo */}
      <div style={{ padding: 16, borderRadius: 12, background: "var(--bg-section)", border: "1px solid var(--border-default)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("wa_profile_photo")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--bg-card-elevated)", border: "2px dashed var(--border-hover)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {logoPreview ? <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28, opacity: 0.3 }}>{"\u{1F4F7}"}</span>}
          </div>
          <div>
            <label style={{ display: "inline-block", padding: "6px 14px", borderRadius: 8, background: "rgba(76,201,255,0.1)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {t("wa_upload_logo")}
              <input type="file" accept="image/*" onChange={handleImage("logo")} style={{ display: "none" }} />
            </label>
            <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>{t("wa_profile_photo_hint")}</div>
          </div>
        </div>
      </div>

      {/* Banner Image */}
      <div style={{ padding: 16, borderRadius: 12, background: "var(--bg-section)", border: "1px solid var(--border-default)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("wa_banner_image")}</div>
        <div style={{ width: "100%", height: 72, borderRadius: 10, background: "var(--bg-card-elevated)", border: "2px dashed var(--border-hover)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 8 }}>
          {bannerPreview ? <img src={bannerPreview} alt="Banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28, opacity: 0.3 }}>{"\u{1F5BC}️"}</span>}
        </div>
        <label style={{ display: "inline-block", padding: "6px 14px", borderRadius: 8, background: "rgba(76,201,255,0.1)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          {t("wa_upload_banner")}
          <input type="file" accept="image/*" onChange={handleImage("banner")} style={{ display: "none" }} />
        </label>
        <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>{t("wa_banner_hint")}</div>
      </div>
    </div>

    {/* Bot Name */}
    <Field label={t("wa_bot_name")} value={profile.botName} onChange={v => update("botName", v)} placeholder={clinic.name || "Klinik Name"} />
    <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: -8, marginBottom: 12 }}>{t("wa_bot_name_hint")}</div>

    {/* Info / About */}
    <Field label={t("wa_bot_info")} value={profile.infoText} onChange={v => update("infoText", v.slice(0, 256))} placeholder={t("wa_bot_info_placeholder")} type="textarea" />
    <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: -8, marginBottom: 12 }}>{t("wa_bot_info_hint")} ({(profile.infoText || "").length}/256)</div>

    {/* Business Category */}
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{t("wa_category")}</div>
      <select value={profile.category || "HEALTH"} onChange={e => update("category", e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 13, outline: "none" }}>
        <option value="HEALTH" style={{ background: "#1a1d2e" }}>{t("wa_category_health")}</option>
        <option value="BEAUTY" style={{ background: "#1a1d2e" }}>{t("wa_category_beauty")}</option>
        <option value="MEDICAL" style={{ background: "#1a1d2e" }}>{t("wa_category_medical")}</option>
        <option value="OTHER" style={{ background: "#1a1d2e" }}>{t("wa_category_other")}</option>
      </select>
    </div>

    {/* Contact info */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Field label={t("wa_address")} value={profile.address || clinic.address} onChange={v => update("address", v)} placeholder="Musterstr. 1, 10115 Berlin" />
      <Field label={t("wa_email_profile")} value={profile.email || clinic.clinicEmail} onChange={v => update("email", v)} placeholder="info@klinik.de" />
    </div>
    <Field label={t("wa_website")} value={profile.website || clinic.website} onChange={v => update("website", v)} placeholder="https://www.klinik.de" />

    {/* Opening Hours */}
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("wa_opening_hours")}</div>
      <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 8 }}>{t("wa_opening_hours_hint")}</div>
      {[
        { key: "weekdays", label: t("hours_weekdays") },
        { key: "saturday", label: t("hours_saturday") },
        { key: "sunday", label: t("hours_sunday") },
      ].map(row => {
        const hours = profile.hours || {};
        return <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ width: 130, fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{row.label}</span>
          <input type="time" value={hours[row.key + "Open"] || "09:00"} onChange={e => update("hours", { ...hours, [row.key + "Open"]: e.target.value })} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12 }} />
          <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{"—"}</span>
          <input type="time" value={hours[row.key + "Close"] || "18:00"} onChange={e => update("hours", { ...hours, [row.key + "Close"]: e.target.value })} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-faint)", cursor: "pointer" }}>
            <input type="checkbox" checked={hours[row.key + "Closed"] || false} onChange={e => update("hours", { ...hours, [row.key + "Closed"]: e.target.checked })} />
            {t("hours_closed")}
          </label>
        </div>;
      })}
      <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.08)", fontSize: 11, color: "rgba(16,185,129,0.7)" }}>
        {"\u{1F4A1}"} {t("hours_open_24")}
      </div>
    </div>

    {/* WhatsApp Profile Preview */}
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("wa_preview")}</div>
      <div style={{ maxWidth: 320, borderRadius: 16, overflow: "hidden", background: "#0b141a", border: "1px solid var(--border-strong)" }}>
        {/* Banner */}
        <div style={{ height: 100, background: bannerPreview ? `url(${bannerPreview}) center/cover` : "linear-gradient(135deg, #075e54, #128c7e)", position: "relative" }}>
          {/* Profile pic overlay */}
          <div style={{ position: "absolute", bottom: -28, left: 16, width: 56, height: 56, borderRadius: "50%", background: "#1a2530", border: "3px solid #0b141a", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {logoPreview ? <img src={logoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22, opacity: 0.5 }}>{"\u{1F916}"}</span>}
          </div>
        </div>
        {/* Info area */}
        <div style={{ padding: "36px 16px 16px" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#e9edef" }}>{profile.botName || clinic.name || t("wa_bot_name_fallback")}</div>
          <div style={{ fontSize: 12, color: "#8696a0", marginTop: 2 }}>{profile.infoText || t("wa_bot_info_placeholder")}</div>
          <div style={{ marginTop: 10, borderTop: "1px solid var(--border-default)", paddingTop: 10 }}>
            {profile.address && <div style={{ fontSize: 11, color: "#8696a0", marginBottom: 4 }}>{"\u{1F4CD}"} {profile.address}</div>}
            {(profile.email || clinic.clinicEmail) && <div style={{ fontSize: 11, color: "#8696a0", marginBottom: 4 }}>{"✉️"} {profile.email || clinic.clinicEmail}</div>}
            {(profile.website || clinic.website) && <div style={{ fontSize: 11, color: "#8696a0" }}>{"\u{1F517}"} {profile.website || clinic.website}</div>}
          </div>
        </div>
      </div>
    </div>

    {!isConnected && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,138,42,0.06)", border: "1px solid rgba(255,138,42,0.15)", fontSize: 12, color: "#ff8a2a", marginBottom: 12 }}>
      {t("wa_connect_first")}
    </div>}

    {waProfileError && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", fontSize: 12, color: "#ef4444", marginBottom: 12 }}>
      {waProfileError}
    </div>}

    <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.1)", fontSize: 11, color: "rgba(167,177,195,0.7)", marginBottom: 12, lineHeight: 1.6 }}>
      {"ℹ️"} {t("wa_profile_setup_hint") || "Ihr WhatsApp-Profil wird von unserem Team eingerichtet. Nach dem Speichern kann die Aktivierung bis zu 24 Stunden dauern."}
    </div>

    <button
      onClick={saveProfile}
      disabled={waProfileSaving || !isConnected}
      style={{
        width: "100%", padding: "12px 0", borderRadius: 10, fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: waProfileSaving || !isConnected ? "not-allowed" : "pointer", border: "none",
        background: waProfileSaving || !isConnected ? "rgba(76,201,255,0.05)" : "linear-gradient(135deg, #4cc9ff 0%, #3b82f6 100%)",
        color: waProfileSaving || !isConnected ? "var(--text-faint)" : "#fff",
        opacity: waProfileSaving ? 0.7 : 1,
      }}
    >
      {waProfileSaving ? (t("saving")) : (t("wa_profile_save_btn") || "Profil speichern")}
    </button>
  </div>;
}
