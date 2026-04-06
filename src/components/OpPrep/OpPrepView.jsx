import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";
import { getNow } from "../../utils/demoTime";
import { fmLocale } from "../../utils/helpers";
import ConsentTracker from "../Files/ConsentTracker";
import HintBox from "../shared/HintBox.jsx";

/* ─── Shared helpers ─── */

function getReadiness(a, opts = {}) {
  const _t = opts.t || (k => null);
  const medical = [
    opts.depositEnabled !== false && { key: "depositPaid", label: _t("op_deposit") || "Anzahlung" },
    { key: "documentsSigned", label: _t("op_documents") || "Dokumente" },
    { key: "bloodTest", label: _t("op_blood_test") || "Bluttest" },
    { key: "medicalClearance", label: _t("op_med_clearance") || "Med. Freigabe" },
    { key: "photosComplete", label: _t("op_photos") || "Fotos" },
  ].filter(Boolean);
  const logistics = [
    { key: "flightReceived", label: _t("op_flight_data") || "Flugdaten" },
    { key: "driverAssigned", label: _t("op_driver") || "Fahrer" },
    { key: "hotelBooked", label: _t("op_hotel") || "Hotel" },
    { key: "transferConfirmed", label: _t("op_transfer") || "Transfer" },
  ];
  const items = medical.concat(logistics);
  let done = 0;
  const missing = [];
  let medDone = 0;
  let logDone = 0;
  medical.forEach(it => { if (a[it.key]) { done++; medDone++; } else missing.push(it.label); });
  logistics.forEach(it => { if (a[it.key]) { done++; logDone++; } else missing.push(it.label); });
  const pct = Math.round((done / items.length) * 100);
  return { pct, done, total: items.length, missing, medDone, medTotal: medical.length, logDone, logTotal: logistics.length };
}

function fmTimeAgo(ts, lang) {
  if (!ts) return "-";
  const diff = Math.floor((new Date() - new Date(ts)) / 1000);
  const l = lang || localStorage.getItem("fm_lang") || "de";
  if (diff < 60) return { de: "gerade eben", en: "just now", tr: "az önce" }[l] || "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "min";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  const d = Math.floor(diff / 86400);
  const yesterday = { de: "gestern", en: "yesterday", tr: "dün" }[l] || "yesterday";
  const daysWord = { de: "Tage", en: "days", tr: "gün" }[l] || "days";
  return d === 1 ? yesterday : d + " " + daysWord;
}

function getPatientName(a) {
  let pName = a.patientName || a.patient_name || a.title || "";
  if (typeof a.patient === "object") pName = ((a.patient.firstName || "") + " " + (a.patient.lastName || "")).trim();
  if (pName.indexOf(" - ") > -1) pName = pName.split(" - ").pop().trim();
  return pName;
}

const TREAT_COLORS = {
  "FUE": "#4cc9ff", "DHI": "#a78bfa", "FUE Saphir": "#06b6d4",
  "Bart": "#f59e0b", "Augenbrauen": "#ec4899", "PRP": "#10b981",
};

/* ─── ProgressBar ─── */
function ProgressBar({ done, total, size = "normal" }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = pct <= 40 ? "rgba(245,158,11,0.7)" : pct <= 80 ? "#f59e0b" : "#10b981";
  const h = size === "small" ? 4 : 6;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: h, borderRadius: h / 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", minWidth: 40 }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: h / 2, background: color, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, whiteSpace: "nowrap", minWidth: 28 }}>{done}/{total}</span>
    </div>
  );
}

/* ─── ToggleSwitch ─── */
function ToggleSwitch({ checked }) {
  return (
    <div style={{
      width: 34, height: 18, borderRadius: 9,
      background: checked ? "#10b981" : "rgba(255,255,255,0.08)",
      position: "relative", transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: 7, background: "white",
        position: "absolute", top: 2, left: checked ? 18 : 2,
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </div>
  );
}

/* ─── Missing Items Hover Card ─── */
function MissingHover({ missing, x, y }) {
  if (!missing || missing.length === 0) return null;
  return (
    <div style={{
      position: "fixed", left: x, top: y, transform: "translate(-50%, -100%)",
      background: "#141820", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10, padding: "10px 14px", fontSize: 11, color: "#e8eefc",
      zIndex: 10000, boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      pointerEvents: "none", minWidth: 160,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
        {{ de: "Noch offen", en: "Still open", tr: "Hala açık" }[localStorage.getItem("fm_lang") || "de"] || "Noch offen"}
      </div>
      {missing.map(m => (
        <div key={m} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ color: "#ef4444", fontSize: 10, fontWeight: 700 }}>{"\u2717"}</span>
          <span style={{ fontWeight: 600 }}>{m}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OpPrepDetail — slide-in drawer
   ═══════════════════════════════════════════════════════════ */
function OpPrepDetail({ appt, onClose, onUpdate }) {
  const { t, clinic, showT } = useApp();
  const [localAppt, setLocalAppt] = useState({ ...appt });
  const [files, setFiles] = useState(null);
  const [filesLoading, setFilesLoading] = useState(true);
  const [reqStates, setReqStates] = useState({});
  const [uploadStates, setUploadStates] = useState({});
  const [medicalOpen, setMedicalOpen] = useState(true);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [consentsOpen, setConsentsOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const syncTimer = useRef(null);
  const queueDriveSync = useCallback(() => {
    if (!localAppt.patientId) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => { fmApi.syncPatientCardToDrive(localAppt.patientId).catch(() => {}); }, 5000);
  }, [localAppt.patientId]);

  const depositEnabled = clinic?.depositPolicy && clinic.depositPolicy !== "none";
  const pName = getPatientName(localAppt);
  const treat = localAppt.treatment || localAppt.treatmentType || localAppt.treatment_type || "";
  const treatColor = TREAT_COLORS[treat] || "#4cc9ff";
  const dt = new Date(localAppt.scheduledAt || localAppt.scheduled_at || localAppt.date);
  const dateStr = dt.toLocaleDateString(fmLocale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = localAppt.time || dt.toLocaleTimeString(fmLocale(), { hour: "2-digit", minute: "2-digit" });
  const doctor = localAppt.doctorName || localAppt.doctor || (t("op_not_assigned") || "Nicht zugewiesen");
  const r = getReadiness(localAppt, { depositEnabled, t });
  const pctColor = r.pct <= 40 ? "rgba(245,158,11,0.8)" : r.pct <= 80 ? "#f59e0b" : "#10b981";
  const _dtD = new Date(dt); _dtD.setHours(0,0,0,0); const _nD = new Date(); _nD.setHours(0,0,0,0); const daysUntil = Math.round((_dtD - _nD) / 86400000);

  useEffect(() => {
    if (!localAppt.patientId) { setFilesLoading(false); return; }
    // Load patient metadata for logistics sync
    fmApi.getPatient(localAppt.patientId).then(res => {
      const p = res?.patient || res;
      if (!p) return;
      const fc = p.flightConfirmed || p.metadata?.flightConfirmed || {};
      const lg = p.logistics || p.metadata?.logistics || {};
      const hi = p.hotelInfo || p.metadata?.hotelInfo || p.metadata?.hotel || {};
      const photoUrls = p.photoUrls || p.metadata?.photoUrls || [];
      setLocalAppt(prev => ({
        ...prev,
        flightNumber: prev.flightNumber || fc.flightNo || fc.flight_number || '',
        flightDate: prev.flightDate || fc.date || fc.arrival_date || '',
        flightAirline: prev.flightAirline || fc.airline || '',
        flightArrival: prev.flightArrival || fc.arrivalTime || fc.arrival_time || fc.time || '',
        driverName: prev.driverName || lg.driverName || '',
        driverPhone: prev.driverPhone || lg.driverPhone || '',
        hotelName: prev.hotelName || hi.name || '',
        hotelCheckin: prev.hotelCheckin || hi.checkIn || hi.checkin || '',
        hotelCheckout: prev.hotelCheckout || hi.checkOut || hi.checkout || '',
        consents: prev.consents || p.consents || p.metadata?.consents || {},
        _photoUrls: photoUrls,
        _intake: prev._intake || p.intake || p.extractedFields || p.intake_data || p.metadata?.intake || {},
      }));
    }).catch(() => {});
    fmApi.getDriveFiles({ patientId: localAppt.patientId }).then(d => {
      setFiles(d.files || []);
      setFilesLoading(false);
    }).catch(() => setFilesLoading(false));
  }, [localAppt.patientId]);

  const toggleField = useCallback(async (key, dbKey) => {
    const newVal = !localAppt[key];
    const updated = { ...localAppt, [key]: newVal };
    setLocalAppt(updated);
    try {
      await fmApi.updateAppointment(localAppt.id, { [dbKey]: newVal });
      if (onUpdate) onUpdate();
      queueDriveSync();
    } catch (e) { console.error("Toggle failed:", e); }
  }, [localAppt, onUpdate, queueDriveSync]);

  const requestItem = useCallback(async (key, msg) => {
    if (!localAppt.patientId) {
      setReqStates(s => ({ ...s, [key]: "no_patient" }));
      return;
    }
    setReqStates(s => ({ ...s, [key]: "sending" }));
    try {
      await fmApi.sendCrmMessage(localAppt.patientId, { text: msg, source: "crm", templateHint: key });
      setReqStates(s => ({ ...s, [key]: "sent" }));
      const actText = "Erinnerung gesendet: " + key;
      await fmApi.updateAppointment(localAppt.id, { last_activity_text: actText });
      setLocalAppt(prev => ({ ...prev, lastActivityText: actText, lastActivityAt: new Date().toISOString() }));
      if (onUpdate) onUpdate();
    } catch {
      setReqStates(s => ({ ...s, [key]: "error" }));
    }
  }, [localAppt, onUpdate]);

  const handleUpload = useCallback(async (key, dbKey, category, file) => {
    if (!file) return;
    setUploadStates(s => ({ ...s, [key]: "uploading" }));
    let uploaded = false;
    try {
      const d = await fmApi.uploadToDrive(file, localAppt.patientId || "", category);
      if (d.success || d.file) uploaded = true;
    } catch (e) {
      console.warn("[op-prep] Upload error:", e.message);
    }
    // Always mark checklist item as done
    setUploadStates(s => ({ ...s, [key]: uploaded ? "uploaded" : "error" }));
    const updated = { ...localAppt, [key]: true };
    setLocalAppt(updated);
    await fmApi.updateAppointment(localAppt.id, { [dbKey]: true }).catch(() => {});
    // Always reload files list
    if (localAppt.patientId) {
      try { const fd = await fmApi.getDriveFiles({ patientId: localAppt.patientId }); setFiles(fd.files || []); } catch {}
    }
    if (uploaded) {
      if (showT) showT(t("file_uploaded") || "Datei hochgeladen");
    } else {
      if (showT) showT(t("upload_failed_hint") || "Upload fehlgeschlagen — bitte erneut versuchen");
    }
    if (onUpdate) onUpdate();
    queueDriveSync();
  }, [localAppt, onUpdate, queueDriveSync]);

  const saveLogisticsField = useCallback(async (field, value) => {
    try {
      await fmApi.updateAppointment(localAppt.id, { [field]: value || null });
      if (onUpdate) onUpdate();
    } catch (e) { console.error("Save failed:", e); }
  }, [localAppt.id, onUpdate]);

  const medItems = [
    depositEnabled && { key: "depositPaid", dbKey: "deposit_paid", label: t("deposit_paid_label") || "Anzahlung bezahlt", reqMsg: t("deposit_paid_req") || "Bitte überweise die Anzahlung.", upload: null },
    { key: "documentsSigned", dbKey: "documents_signed", label: t("op_documents_signed") || "Dokumente unterschrieben", reqMsg: t("documents_request_msg") || "Bitte sende uns die unterschriebenen Dokumente zu.", upload: "document" },
    { key: "bloodTest", dbKey: "blood_test", label: t("op_blood_test_available") || "Bluttest vorhanden", reqMsg: t("blood_test_request_msg") || "Bitte sende uns deinen aktuellen Bluttest-Befund.", upload: "blood_test" },
    { key: "medicalClearance", dbKey: "medical_clearance", label: t("op_med_clearance") || "Med. Freigabe", reqMsg: t("documents_request_msg") || "Bitte sende uns die unterschriebenen Dokumente zu.", upload: "document" },
    { key: "photosComplete", dbKey: "photos_complete", label: t("photos_complete_label") || "Fotos vollständig", reqMsg: t("photos_complete_req") || "Bitte sende uns aktuelle Fotos (Vorne, Oben, Links, Rechts).", upload: "photo" },
  ].filter(Boolean);

  const renderToggleRow = (item) => {
    const checked = !!localAppt[item.key];
    const reqState = reqStates[item.key];
    const upState = uploadStates[item.key];

    return (
      <div key={item.key} onClick={() => toggleField(item.key, item.dbKey)} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
        background: checked ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.015)",
        border: `1px solid ${checked ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)"}`,
        transition: "all 0.15s",
      }}>
        <ToggleSwitch checked={checked} />
        <span style={{ fontSize: 12, fontWeight: 600, color: checked ? "rgba(16,185,129,0.9)" : "rgba(167,177,195,0.6)", flex: 1 }}>
          {item.label}
        </span>
        {!checked && item.upload && (
          <label onClick={e => e.stopPropagation()} style={{
            padding: "3px 8px", borderRadius: 5, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
            color: "#f59e0b", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}>
            {upState === "uploading" ? t("loading") : upState === "uploaded" ? "\u2713" : "Upload"}
            <input type="file" style={{ display: "none" }} accept="image/*,.pdf,.doc,.docx" onChange={e => {
              if (e.target.files?.[0]) handleUpload(item.key, item.dbKey, item.upload, e.target.files[0]);
            }} />
          </label>
        )}
        {checked && <span style={{ color: "rgba(16,185,129,0.4)", fontSize: 13, fontWeight: 700 }}>{"\u2713"}</span>}
      </div>
    );
  };

  const renderLogisticsToggle = (key, dbKey, label, checked) => {
    const reqState = reqStates[key];
    return (
      <div onClick={() => toggleField(key, dbKey)} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
        background: checked ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.015)",
        border: `1px solid ${checked ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)"}`,
        transition: "all 0.15s",
      }}>
        <ToggleSwitch checked={checked} />
        <span style={{ fontSize: 12, fontWeight: 600, color: checked ? "rgba(16,185,129,0.9)" : "rgba(167,177,195,0.6)", flex: 1 }}>{label}</span>
        {checked && <span style={{ color: "rgba(16,185,129,0.4)", fontSize: 13, fontWeight: 700 }}>{"\u2713"}</span>}
      </div>
    );
  };

  const inputStyle = {
    padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)", color: "rgba(232,238,252,0.85)", fontSize: 11, fontFamily: "inherit",
    outline: "none", width: "100%",
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 9999,
        background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)",
      }} />
      <div style={{
        position: "fixed", top: 0, right: 0, width: 460, height: "100vh", background: "#0f1420",
        borderLeft: "1px solid rgba(255,255,255,0.06)", zIndex: 10000, overflowY: "auto",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.5)", animation: "fm-slide-in 0.2s ease",
      }}>
        <style>{`@keyframes fm-slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Lightbox */}
        {lightbox && <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}><img src={lightbox} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} alt="" /></div>}

        {/* ── Colored header bar ── */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: `linear-gradient(135deg, ${treatColor}08, transparent)`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(232,238,252,0.95)", letterSpacing: "-0.03em" }}>{pName}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <span style={{
                  display: "inline-block", width: 3, height: 14, borderRadius: 2, background: treatColor,
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: treatColor }}>{treat}</span>
                {daysUntil <= 3 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                    background: daysUntil <= 1 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.1)",
                    color: daysUntil <= 1 ? "#ef4444" : "#f59e0b",
                  }}>
                    {daysUntil === 0 ? (t("op_today") || "OP HEUTE") : daysUntil === 1 ? (t("op_tomorrow") || "OP MORGEN") : `${daysUntil} ${t("op_days") || "Tage"}`}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(167,177,195,0.7)", fontSize: 16, cursor: "pointer", padding: "4px 8px",
              borderRadius: 6, lineHeight: 1, transition: "all 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            >{"\u2715"}</button>
          </div>
        </div>

        <div style={{ padding: "16px 24px 24px" }}>
          {/* ── Info cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            {[
              { label: t("op_date") || "Datum", value: dt.toLocaleDateString(fmLocale(), { day: "numeric", month: "short" }), sub: timeStr },
              { label: t("role_doctor"), value: doctor, sub: localAppt.opRoom || localAppt.room ? `Raum ${localAppt.opRoom || localAppt.room}` : "" },
              { label: t("grafts_label_ui"), value: localAppt.estimatedGrafts || localAppt.grafts || "-", sub: "" },
            ].map(c => (
              <div key={c.label} style={{
                padding: "10px 12px", borderRadius: 8,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{ fontSize: 9, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{c.label}</div>
                <div style={{ fontSize: 13, color: "rgba(232,238,252,0.9)", fontWeight: 700, marginTop: 3 }}>{c.value}</div>
                {c.sub && <div style={{ fontSize: 10, color: "rgba(167,177,195,0.6)", marginTop: 1 }}>{c.sub}</div>}
              </div>
            ))}
          </div>

          {/* ── Medical Details (from patient intake) ── */}
          {localAppt._intake && Object.keys(localAppt._intake).length > 0 && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{"🩺"} {t("medical_details") || "Medizinische Details"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                {[
                  { k: "treatment", l: t("treatment") || "Behandlung" },
                  { k: "concern", l: t("concern") || "Anliegen" },
                  { k: "age", l: t("age") || "Alter" },
                  { k: "country", l: t("country") || "Land" },
                  { k: "hair_loss_type", l: t("hair_loss") || "Haarausfall" },
                  { k: "medications", l: t("medications") || "Medikamente" },
                  { k: "allergies", l: t("allergies") || "Allergien" },
                  { k: "previous_treatments", l: t("prev_treatments") || "Vorbehandlungen" },
                  { k: "medical_conditions", l: t("medical_conditions") || "Vorerkrankungen" },
                  { k: "smoker", l: t("smoker") || "Raucher" },
                  { k: "blood_thinners", l: t("blood_thinners") || "Blutverdünner" },
                ].map(f => {
                  const v = localAppt._intake[f.k] || localAppt._intake[f.k.replace(/_/g, '')] || '';
                  if (!v || v === '—') return null;
                  return <div key={f.k} style={{ fontSize: 11 }}>
                    <span style={{ color: "rgba(167,177,195,0.6)" }}>{f.l}: </span>
                    <span style={{ color: "rgba(232,238,252,0.85)", fontWeight: 600 }}>{v}</span>
                  </div>;
                })}
              </div>
            </div>
          )}

          {/* ── Readiness progress ── */}
          <div style={{
            padding: "12px 14px", borderRadius: 8, marginBottom: 20,
            background: `${pctColor}06`, border: `1px solid ${pctColor}15`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("op_readiness")}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: pctColor }}>{r.done} / {r.total}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${r.pct}%`, borderRadius: 3, background: pctColor, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(167,177,195,0.6)" }}>
                {t("medical_tab")} <span style={{ color: r.medDone === r.medTotal ? "#10b981" : "rgba(232,238,252,0.9)", fontWeight: 800 }}>{r.medDone}/{r.medTotal}</span>
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(167,177,195,0.6)" }}>
                {t("logistics_tab")} <span style={{ color: r.logDone === r.logTotal ? "#10b981" : "rgba(232,238,252,0.9)", fontWeight: 800 }}>{r.logDone}/{r.logTotal}</span>
              </span>
            </div>
          </div>

          {/* ── Medical section (collapsible) ── */}
          <div onClick={() => setMedicalOpen(o => !o)} style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
            <span style={{ fontSize: 9, color: "rgba(167,177,195,0.7)", transition: "transform 0.2s", transform: medicalOpen ? "rotate(90deg)" : "rotate(0)", display: "inline-block" }}>▶</span>
            <span>{t("medical_tab")}</span>
            <span style={{ color: r.medDone === r.medTotal ? "#10b981" : "rgba(167,177,195,0.7)" }}>{r.medDone}/{r.medTotal}</span>
          </div>
          {medicalOpen && medItems.map(it => renderToggleRow(it))}

          {/* ── Logistics section (collapsible) ── */}
          <div onClick={() => setLogisticsOpen(o => !o)} style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "16px 0 6px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
            <span style={{ fontSize: 9, color: "rgba(167,177,195,0.7)", transition: "transform 0.2s", transform: logisticsOpen ? "rotate(90deg)" : "rotate(0)", display: "inline-block" }}>▶</span>
            <span>{t("logistics_tab")}</span>
            <span style={{ color: r.logDone === r.logTotal ? "#10b981" : "rgba(167,177,195,0.7)" }}>{r.logDone}/{r.logTotal}</span>
          </div>

          {logisticsOpen && <>
          {renderLogisticsToggle("flightReceived", "flight_received", t("op_flight_data") || "Flugdaten", !!localAppt.flightReceived)}
          {localAppt.flightReceived && (localAppt.flightNumber || localAppt.flightAirline) ? (
            <div style={{ margin: "0 0 6px 46px", padding: "6px 10px", borderRadius: 6, background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.08)", fontSize: 11, color: "rgba(203,213,225,0.8)" }}>
              {localAppt.flightAirline && <span style={{ color: "#10b981", fontWeight: 700 }}>{localAppt.flightAirline}</span>}
              {localAppt.flightAirline && " · "}
              {localAppt.flightNumber && <>{localAppt.flightNumber} · </>}
              {localAppt.flightArrival && <>{t("arrival_label") || "Ankunft:"} {localAppt.flightArrival}</>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "0 0 6px 46px" }}>
              <input defaultValue={localAppt.flightNumber || ""} placeholder={t("flight_number_placeholder")} style={inputStyle}
                onClick={e => e.stopPropagation()} onBlur={e => saveLogisticsField("flight_number", e.target.value)} />
              <input type="date" defaultValue={localAppt.flightArrival || ""} style={inputStyle}
                onClick={e => e.stopPropagation()} onBlur={e => saveLogisticsField("flight_arrival", e.target.value)} />
            </div>
          )}

          {renderLogisticsToggle("driverAssigned", "driver_assigned", t("op_driver_assigned") || "Fahrer zugewiesen", !!localAppt.driverAssigned)}
          {localAppt.driverAssigned && localAppt.driverName ? (
            <div style={{ margin: "0 0 6px 46px", padding: "6px 10px", borderRadius: 6, background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.08)", fontSize: 11, color: "rgba(203,213,225,0.8)" }}>
              <span style={{ color: "#10b981", fontWeight: 700 }}>{localAppt.driverName}</span>
              {localAppt.driverPhone && <> · <a href={`tel:${localAppt.driverPhone}`} style={{ color: "#4cc9ff", textDecoration: "none" }}>{localAppt.driverPhone}</a></>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "0 0 6px 46px" }}>
              <input defaultValue={localAppt.driverName || ""} placeholder={t("driver_name_placeholder")} style={inputStyle}
                onClick={e => e.stopPropagation()} onBlur={e => saveLogisticsField("driver_name", e.target.value)} />
              <input defaultValue={localAppt.driverPhone || ""} placeholder={t("phone_placeholder")} style={inputStyle}
                onClick={e => e.stopPropagation()} onBlur={e => saveLogisticsField("driver_phone", e.target.value)} />
            </div>
          )}

          {renderLogisticsToggle("hotelBooked", "hotel_booked", t("op_hotel_booked") || "Hotel gebucht", !!localAppt.hotelBooked)}
          {localAppt.hotelBooked && localAppt.hotelName ? (
            <div style={{ margin: "0 0 6px 46px", padding: "6px 10px", borderRadius: 6, background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.08)", fontSize: 11, color: "rgba(203,213,225,0.8)" }}>
              <span style={{ color: "#10b981", fontWeight: 700 }}>{localAppt.hotelName}</span>
              {localAppt.hotelCheckin && <> · {localAppt.hotelCheckin}</>}
              {localAppt.hotelCheckout && <> → {localAppt.hotelCheckout}</>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, margin: "0 0 6px 46px" }}>
              <input defaultValue={localAppt.hotelName || ""} placeholder={t("hotel_name_placeholder")} style={inputStyle}
                onClick={e => e.stopPropagation()} onBlur={e => saveLogisticsField("hotel_name", e.target.value)} />
              <input type="date" defaultValue={localAppt.hotelCheckin || ""} title="Check-in" style={inputStyle}
                onClick={e => e.stopPropagation()} onBlur={e => saveLogisticsField("hotel_checkin", e.target.value)} />
              <input type="date" defaultValue={localAppt.hotelCheckout || ""} title="Check-out" style={inputStyle}
                onClick={e => e.stopPropagation()} onBlur={e => saveLogisticsField("hotel_checkout", e.target.value)} />
            </div>
          )}

          {renderLogisticsToggle("transferConfirmed", "transfer_confirmed", t("transfer_confirmed_label") || "Transfer bestätigt", !!localAppt.transferConfirmed)}
          </>}

          {/* ── Patient Photos ── */}
          {(localAppt._photoUrls || []).length > 0 && <>
            <div onClick={() => setPhotosOpen?.(o => !o)} style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "16px 0 6px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
              <span style={{ fontSize: 9, color: "rgba(167,177,195,0.7)", transition: "transform 0.2s", transform: photosOpen ? "rotate(90deg)" : "rotate(0)", display: "inline-block" }}>▶</span>
              <span>{"📸"} {t("patient_photos") || "Patientenfotos"}</span>
              <span style={{ color: "#10b981" }}>{localAppt._photoUrls.length}</span>
            </div>
            {photosOpen && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
                {localAppt._photoUrls.map((p, i) => {
                  const url = typeof p === 'string' ? p : p?.url;
                  if (!url) return null;
                  const authUrl = fmApi.authPhotoUrl(url);
                  return <div key={i} onClick={() => setLightbox(authUrl)} style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", cursor: "pointer", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <img src={authUrl} alt={`Foto ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>;
                })}
              </div>
            )}
          </>}

          {/* ── Consent Tracker (collapsible) ── */}
          <div onClick={() => setConsentsOpen(o => !o)} style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "16px 0 6px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
            <span style={{ fontSize: 9, color: "rgba(167,177,195,0.7)", transition: "transform 0.2s", transform: consentsOpen ? "rotate(90deg)" : "rotate(0)", display: "inline-block" }}>▶</span>
            <span>{t("consents_label") || "Einwilligungen"}</span>
          </div>
          {consentsOpen && <div style={{ marginTop: 4 }}>
            <ConsentTracker patient={{ ...localAppt, consents: localAppt.consents || localAppt.metadata?.consents || {} }} onUpdate={async (key, data) => {
              try {
                const prev = localAppt.consents || localAppt.metadata?.consents || {};
                const consents = { ...prev, [key]: data };
                await fmApi.apiFetch(`/api/v1/crm/patients/${localAppt.patientId}`, { method: "PATCH", body: JSON.stringify({ consents }) });
                setLocalAppt(p => ({ ...p, consents, metadata: { ...(p.metadata || {}), consents } }));
                if (onUpdate) onUpdate();
              } catch (e) { console.error("Consent update failed:", e); }
            }} onRequestSignature={(key, label) => { if (typeof requestItem === "function") requestItem(key, `Bitte sende uns die unterschriebene ${label}.`); }} showT={(msg) => { const el = document.getElementById("fm-toast-global"); if (el) { el.textContent = msg; el.style.display = "block"; setTimeout(() => el.style.display = "none", 3000); } }} hideHeader />
          </div>}

          {/* ── Last activity ── */}
          <div style={{ marginTop: 20, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 9, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5, fontWeight: 700 }}>{t("last_activity_label") || "Letzte Aktivität"}</div>
            {localAppt.lastActivityText ? (
              <>
                <div style={{ fontSize: 12, color: "rgba(232,238,252,0.9)", fontWeight: 600 }}>{localAppt.lastActivityText}</div>
                <div style={{ fontSize: 10, color: "rgba(167,177,195,0.7)", marginTop: 2 }}>{fmTimeAgo(localAppt.lastActivityAt || localAppt.updatedAt)}</div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)" }}>{t("no_activity_label") || "Keine Aktivität"}</div>
            )}
          </div>

          {/* ── Files ── */}
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 9, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, fontWeight: 700 }}>{t("op_prep_files") || "Dateien"}</div>
            {filesLoading ? (
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)" }}>{t("loading")}</div>
            ) : !files || files.length === 0 ? (
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)" }}>{t("op_prep_no_files") || "Keine Dateien"}</div>
            ) : (
              files.map((f, i) => (
                <div key={f.id || i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: i < files.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                  <span style={{ flex: 1, color: "rgba(232,238,252,0.9)", fontSize: 11, fontWeight: 500 }}>{f.file_name}</span>
                  <span style={{ fontSize: 10, color: "rgba(167,177,195,0.7)" }}>{f.file_size ? (Math.round(f.file_size / 1024) + "KB") : ""}</span>
                  {f.google_drive_link && (
                    <a href={f.google_drive_link} target="_blank" rel="noopener noreferrer" style={{
                      color: "#4cc9ff", textDecoration: "none", fontSize: 10, fontWeight: 600,
                    }}>{t("open_action") || "Öffnen"}</a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   OpPrepView — main view
   ═══════════════════════════════════════════════════════════ */
export default function OpPrepView() {
  const { myLeads, myAppts, t, openPatient, clinic } = useApp();
  const [filter, setFilter] = useState("all");
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [apiAppts, setApiAppts] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [missingHover, setMissingHover] = useState(null);

  const loadApiData = useCallback(() => {
    const today = getNow();
    const fromStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    const toDate = new Date(today.getTime() + 60 * 86400000);
    const toStr = toDate.getFullYear() + "-" + String(toDate.getMonth() + 1).padStart(2, "0") + "-" + String(toDate.getDate()).padStart(2, "0");
    fmApi.getAppointments({ from: fromStr, to: toStr }).then(d => {
      let appts = d.appointments || d.data || d || [];
      if (!Array.isArray(appts)) appts = [];
      const now = getNow();
      appts = appts.filter(a => {
        const dt = new Date(a.scheduledAt || a.scheduled_at || a.date);
        const st = a.status || "";
        return dt > now && st !== "canceled" && st !== "cancelled" && st !== "completed" && st !== "rescheduled" && st !== "no_show";
      }).sort((a, b) => new Date(a.scheduledAt || a.scheduled_at || a.date) - new Date(b.scheduledAt || b.scheduled_at || b.date));
      setApiAppts(appts);
    }).catch(e => { console.error("[op-prep] fetch failed:", e.message); setApiError(true); });
  }, []);

  useEffect(() => { loadApiData(); }, [loadApiData]);

  const useApiData = apiAppts !== null && apiAppts.length > 0;

  const localPrepData = useMemo(() => {
    const now = getNow();
    const items = [];
    myLeads.forEach(lead => {
      if (lead.stage !== "booked" && lead.stage !== "done") return;
      const appt = myAppts.find(a =>
        (a.leadId === lead.id || a.patientId === lead.id || a.patient === lead.name) &&
        new Date(a.date) >= new Date(now.toDateString()) && a.status !== "cancelled" && a.status !== "canceled" && a.status !== "rescheduled" && a.status !== "no_show"
      );
      if (!appt && lead.stage !== "booked") return;
      const opDate = appt ? new Date(appt.date) : null;
      const daysUntil = opDate ? Math.ceil((opDate - now) / (1000 * 60 * 60 * 24)) : null;
      const checklist = [
        { key: "photos", done: !!(lead.photoUrls?.length >= 3) },
        { key: "review", done: lead.convStatus !== "needs_medical_review" && !!lead.reviewData },
        { key: "consent", done: !!(lead.consentGiven || (lead.consent && lead.consent.granted)) },
        { key: "deposit", done: lead.convStatus === "deposit_paid" || !!lead.depositPaid },
        { key: "flight", done: !!(lead.flightConfirmed?.date) || !!(lead.metadata?.noFlightNeeded) },
        { key: "hotel", done: !!(lead.hotelInfo?.name || lead.hotel?.name || lead.logistics?.hotelName) },
        { key: "driver", done: !!(lead.logistics?.driverName) },
        { key: "bloodwork", done: !!lead.bloodworkDone },
        { key: "aftercare", done: !!lead.aftercarePrepped },
      ];
      const totalSteps = checklist.length;
      const doneSteps = checklist.filter(c => c.done).length;
      const missing = totalSteps - doneSteps;
      const isReady = missing === 0;
      items.push({
        id: lead.id, name: lead.name, treatment: lead.treatment || "FUE Haar",
        grafts: lead.reviewData?.grafts || lead.grafts || "-",
        doctor: lead.assignedDoctor || lead.reviewData?.doctor || "-",
        opDate, daysUntil, missing, isReady, doneSteps, totalSteps,
        isUrgent: daysUntil !== null && daysUntil <= 3 && !isReady,
        isThisWeek: daysUntil !== null && daysUntil <= 7,
        missingLabels: checklist.filter(c => !c.done).map(c => c.key),
      });
    });
    items.sort((a, b) => { if (!a.opDate) return 1; if (!b.opDate) return -1; return a.opDate - b.opDate; });
    return items;
  }, [myLeads, myAppts]);

  const apiPrepData = useMemo(() => {
    if (!apiAppts) return [];
    const now = getNow();
    return apiAppts.map(a => {
      const dt = new Date(a.scheduledAt || a.scheduled_at || a.date);
      const todayStr = now.toISOString().split('T')[0];
      const apptStr = dt.toISOString().split('T')[0];
      const daysUntil = Math.round((new Date(apptStr) - new Date(todayStr)) / 86400000);
      const r = getReadiness(a, { depositEnabled: clinic?.depositPolicy && clinic.depositPolicy !== "none" && clinic?.booking_funnel !== "no_deposit", t });
      let pName = getPatientName(a);
      let treat = a.treatment || a.treatmentType || a.treatment_type || "";
      treat = treat.replace(/hair\s*transplant(ation)?/gi, "").replace(/haartransplantation/gi, "").replace(/saç\s*ekimi/gi, "").replace(/transplant(ation)?/gi, "").trim();
      if (!treat) treat = "OP";
      if (treat.length > 12) treat = treat.substring(0, 10) + "\u2026";
      let doctor = a.doctorName || a.doctor || "-";
      if (doctor.length > 18) doctor = doctor.substring(0, 16) + "\u2026";
      const grafts = a.estimatedGrafts || a.grafts || a.metadata?.grafts || "-";
      return {
        id: a.id, name: pName, treatment: treat, grafts: String(grafts), doctor,
        opDate: dt, daysUntil, missing: r.missing.length, isReady: r.pct === 100,
        doneSteps: r.done, totalSteps: r.total,
        isUrgent: daysUntil <= 3 && r.pct < 100,
        isThisWeek: daysUntil <= 7,
        missingLabels: r.missing,
        _apiAppt: a,
      };
    });
  }, [apiAppts]);

  const prepData = useApiData ? apiPrepData : localPrepData;

  const filtered = useMemo(() => {
    switch (filter) {
      case "urgent": return prepData.filter(p => p.isUrgent);
      case "this_week": return prepData.filter(p => p.isThisWeek);
      case "not_ready": return prepData.filter(p => !p.isReady);
      case "ready": return prepData.filter(p => p.isReady);
      default: return prepData;
    }
  }, [prepData, filter]);

  const readyCount = prepData.filter(p => p.isReady).length;
  const urgentCount = prepData.filter(p => p.isUrgent).length;

  const filterTabs = [
    { id: "all", label: t("op_all") || "Alle", count: prepData.length },
    { id: "urgent", label: t("op_urgent") || "Dringend", count: urgentCount, color: "#ef4444" },
    { id: "this_week", label: t("op_this_week") || "Diese Woche", count: prepData.filter(p => p.isThisWeek).length },
    { id: "not_ready", label: t("op_not_ready") || "Nicht Ready", count: prepData.filter(p => !p.isReady).length },
    { id: "ready", label: t("op_ready") || "Ready", count: readyCount, color: "#10b981" },
  ];

  const criticals = prepData.filter(p => p.daysUntil !== null && p.daysUntil <= 1 && !p.isReady);

  const COLS = "2fr 1fr 0.7fr 1.2fr 1fr 0.6fr 1fr 1fr";

  const handleRowClick = (item) => {
    if (item._apiAppt) {
      setSelectedAppt(item._apiAppt);
    } else {
      openPatient(item.id);
    }
  };

  const handleMissingEnter = (e, item) => {
    if (item.isReady || !item.missingLabels || item.missingLabels.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMissingHover({
      missing: item.missingLabels,
      x: rect.left + rect.width / 2,
      y: rect.top - 4,
    });
  };

  const handleMissingLeave = () => setMissingHover(null);

  return (
    <div style={{ padding: "24px 28px", }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "rgba(232,238,252,0.95)", margin: 0, letterSpacing: "-0.03em" }}>
            {t("op_preparation") || "OP-Vorbereitung"}
          </h1>
          <p style={{ fontSize: 12, color: "rgba(167,177,195,0.75)", margin: "5px 0 0", fontWeight: 500 }}>
            {t("op_prep_subtitle") || "Statusübersicht für anstehende Termine — wird automatisch vom System verfolgt"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <SummaryCard label={t("op_prep_appointments") || "Termine"} value={prepData.length} color="#4cc9ff" />
          <SummaryCard label={t("op_ready") || "Bereit"} value={readyCount} color="#10b981" accent />
          {urgentCount > 0 && <SummaryCard label={t("op_urgent") || "Dringend"} value={urgentCount} color="#ef4444" accent />}
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {filterTabs.map(tab => {
          const isActive = filter === tab.id;
          const accentColor = tab.color || (isActive ? "#4cc9ff" : "rgba(167,177,195,0.7)");
          return (
            <button key={tab.id} onClick={() => setFilter(tab.id)} style={{
              padding: "6px 14px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: isActive ? `${accentColor}12` : "rgba(255,255,255,0.02)",
              border: `1px solid ${isActive ? `${accentColor}30` : "rgba(255,255,255,0.05)"}`,
              color: isActive ? accentColor : "rgba(167,177,195,0.7)",
              transition: "all 0.15s",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <span>{tab.label}</span>
              <span style={{
                fontSize: 10, fontWeight: 800,
                background: isActive ? `${accentColor}18` : "rgba(255,255,255,0.04)",
                color: isActive ? accentColor : "rgba(167,177,195,0.75)",
                padding: "1px 6px", borderRadius: 4, minWidth: 18, textAlign: "center",
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Critical banner ── */}
      {criticals.length > 0 && (
        <div style={{
          marginBottom: 14, borderRadius: 10, padding: "12px 16px",
          background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)",
          borderLeft: "3px solid #ef4444",
        }}>
          {criticals.map(item => (
            <div key={item.id} onClick={() => handleRowClick(item)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "6px 0", cursor: "pointer",
            }}>
              <span style={{
                fontSize: 10, fontWeight: 800, color: "#ef4444",
                background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap",
              }}>
                {item.daysUntil === 0 ? (t("op_today") || "OP HEUTE") : (t("op_tomorrow") || "OP MORGEN")}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(232,238,252,0.9)" }}>{item.name}</span>
              <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
                {item.missingLabels?.slice(0, 3).join(", ")}{item.missingLabels?.length > 3 ? ` +${item.missingLabels.length - 3}` : ""} {t("op_still_open") || "noch offen"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Error / Loading ── */}
      {apiError && (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 18 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(232,238,252,0.95)" }}>{t("op_load_error")||"Could not load surgery data"}</div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", marginTop: 6 }}>{t("try_again_later")||"Please try again later"}</div>
          <button onClick={() => { setApiError(null); setApiAppts(null); loadApiData(); }} style={{ marginTop: 14, padding: "8px 18px", borderRadius: 8, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", color: "#4cc9ff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("try_again")||"Try again"}</button>
        </div>
      )}
      {apiAppts === null && !apiError && (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(167,177,195,0.6)", fontSize: 13 }}>{t("loading_op") || "Wird geladen..."}</div>
      )}

      {/* ── Table ── */}
      {apiAppts !== null && filtered.length === 0 ? (
        <div>
          <HintBox id="opprep_empty" style={{marginBottom:16}}>{t("hint_opprep_empty")}</HintBox>
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(232,238,252,0.9)", marginBottom: 6 }}>{t("no_upcoming_ops")}</div>
            <div style={{ fontSize: 13, color: "rgba(167,177,195,0.6)" }}>{t("all_patients_prepared") || "Alle Patienten sind vorbereitet oder es stehen keine Termine an."}</div>
          </div>
        </div>
      ) : apiAppts !== null && (
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)" }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: COLS, gap: 0,
            padding: "10px 16px",
            background: "rgba(255,255,255,0.02)",
            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(167,177,195,0.6)",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            <div>{t("op_prep_patient") || "Patient"}</div>
            <div>{t("op_prep_treatment") || t("pdf_treatment")}</div>
            <div>{t("grafts_label_ui")}</div>
            <div>{t("role_doctor")}</div>
            <div>{t("op_date") || "OP-Datum"}</div>
            <div>{t("op_days") || "Tage"}</div>
            <div>{t("op_open") || "Offen"}</div>
            <div>{t("op_progress") || "Fortschritt"}</div>
          </div>

          {/* Rows */}
          {filtered.map((item, idx) => {
            const daysColor = (item.daysUntil <= 1 && !item.isReady) ? "#ef4444" : item.daysUntil <= 3 ? "#f59e0b" : item.daysUntil <= 14 ? "rgba(167,177,195,0.6)" : "rgba(167,177,195,0.6)";
            const isUrgentRow = item.isUrgent && item.daysUntil <= 5;
            const daysStr = item.daysUntil === 0 ? (t("op_today") || "Heute") : item.daysUntil === 1 ? (t("op_tomorrow") || "Morgen") : item.daysUntil + "d";
            const treatColor = TREAT_COLORS[item.treatment] || "rgba(167,177,195,0.7)";

            return (
              <div key={item.id} onClick={() => handleRowClick(item)} style={{
                display: "grid", gridTemplateColumns: COLS, gap: 0,
                padding: "11px 16px",
                borderBottom: idx < filtered.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                borderLeft: isUrgentRow ? "3px solid rgba(239,68,68,0.5)" : "3px solid transparent",
                background: isUrgentRow ? "rgba(239,68,68,0.02)" : "transparent",
                cursor: "pointer", transition: "background 0.12s",
                alignItems: "center", fontSize: 12, color: "rgba(203,213,225,0.8)",
              }}
                onMouseEnter={e => e.currentTarget.style.background = isUrgentRow ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)"}
                onMouseLeave={e => e.currentTarget.style.background = isUrgentRow ? "rgba(239,68,68,0.02)" : "transparent"}
              >
                {/* Patient */}
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700, color: "rgba(232,238,252,0.9)", fontSize: 13 }}>
                  {item.name}
                </div>
                {/* Treatment */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 3, height: 12, borderRadius: 1.5, background: treatColor, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{item.treatment}</span>
                </div>
                {/* Grafts */}
                <div style={{ fontWeight: 600 }}>{item.grafts}</div>
                {/* Doctor */}
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{item.doctor}</div>
                {/* OP Date */}
                <div style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                  {item.opDate ? item.opDate.toLocaleDateString(fmLocale(), { day: "numeric", month: "short" }) : "-"}
                </div>
                {/* Days */}
                <div style={{
                  whiteSpace: "nowrap", fontWeight: 800, fontSize: 12, color: daysColor,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {item.daysUntil <= 2 && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />}
                  {daysStr}
                </div>
                {/* Missing */}
                <div
                  onMouseEnter={(e) => handleMissingEnter(e, item)}
                  onMouseLeave={handleMissingLeave}
                  style={{ whiteSpace: "nowrap", cursor: item.isReady ? "default" : "help" }}
                >
                  {item.isReady ? (
                    <span style={{
                      color: "#10b981", fontSize: 11, fontWeight: 700,
                      background: "rgba(16,185,129,0.08)", padding: "2px 8px", borderRadius: 4,
                    }}>{t("op_ready") || "Bereit"}</span>
                  ) : (
                    <span style={{
                      color: (item.daysUntil <= 1 && item.missing >= 3) ? "#ef4444" : item.missing >= 5 ? "#f59e0b" : "rgba(167,177,195,0.7)",
                      fontSize: 11, fontWeight: 600,
                      background: (item.daysUntil <= 1 && item.missing >= 3) ? "rgba(239,68,68,0.06)" : "transparent",
                      padding: "2px 8px", borderRadius: 4,
                    }}>
                      {item.missing} {t("op_open") || "offen"}
                    </span>
                  )}
                </div>
                {/* Progress */}
                <div style={{ minWidth: 80 }}>
                  <ProgressBar done={item.doneSteps} total={item.totalSteps} size="small" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Missing items hover card */}
      {missingHover && <MissingHover {...missingHover} />}

      {/* Detail drawer */}
      {selectedAppt && (
        <OpPrepDetail
          appt={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onUpdate={loadApiData}
        />
      )}
    </div>
  );
}

/* ─── Summary Card ─── */
function SummaryCard({ label, value, color, accent }) {
  return (
    <div style={{
      padding: "8px 16px", borderRadius: 8, textAlign: "center", minWidth: 80,
      background: accent ? `${color}08` : "rgba(255,255,255,0.02)",
      border: `1px solid ${accent ? `${color}18` : "rgba(255,255,255,0.05)"}`,
    }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 10, color: "rgba(167,177,195,0.65)", fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}
