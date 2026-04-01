import React, { useState, useMemo, useEffect } from "react";
import { APPT_C } from "../../data/constants";
import * as fmApi from "../../api/client";

function tFb(t, key, fallback) {
  const val = t(key);
  return (val && val !== key) ? val : fallback;
}

export default function AppointmentDrawer({ appt, onClose, onConfirm, onComplete, onCancel, onReschedule, onSave, doctors, patients, t }) {
  // Create/Edit form state
  const [form, setForm] = useState({
    patientId: appt?.patientId || appt?.patient_id || "",
    patientName: appt?.patient || "",
    date: appt?.date || new Date().toISOString().slice(0, 10),
    time: appt?.time || "09:00",
    treatment: appt?.treatment || appt?.treatment_type || "",
    grafts: appt?.grafts || appt?.estimated_grafts || "",
    price: appt?.price || appt?.price_estimate || "",
    doctorId: appt?.staffMemberId || appt?.staff_member_id || "",
    notes: appt?.notes || "",
    durationMinutes: appt?.durationMinutes || appt?.duration_minutes || 480,
    room: appt?.room || "",
  });
  const [showReschedule, setShowReschedule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [treatments, setTreatments] = useState([]);
  const [patientSearch, setPatientSearch] = useState(appt?.patient || "");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  useEffect(() => {
    fmApi.getTreatments().then(res => {
      const arr = Array.isArray(res) ? res : res?.treatments || [];
      setTreatments(arr);
    }).catch(() => {});
  }, []);

  const filteredPatients = useMemo(() => {
    if (!patients?.length || !patientSearch) return patients || [];
    const q = patientSearch.toLowerCase();
    return patients.filter(p => {
      const name = `${p.first_name || ""} ${p.last_name || ""} ${p.phone || ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [patients, patientSearch]);

  if (!appt) return null;

  const isNew = !!appt.isNew;
  const isEditable = isNew || appt.status === "booked" || appt.status === "pending";
  const sc = APPT_C[appt.status] || APPT_C.pending;

  const updateField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.date || !form.time) return;
    setError("");
    setSaving(true);
    try {
      const res = await onSave({
        patientId: form.patientId || null,
        title: form.patientName || form.treatment || "",
        scheduledAt: `${form.date}T${form.time}:00`,
        treatment: form.treatment,
        estimatedGrafts: form.grafts ? Number(form.grafts) : null,
        price: form.price ? Number(form.price) : null,
        doctorId: form.doctorId || null,
        notes: form.notes,
        durationMinutes: Number(form.durationMinutes) || 480,
        room: form.room,
        status: "booked",
      });
      if (res?.error) {
        setError(res.error === "day_blocked" ? `Tag blockiert: ${res.reason || ""}` : res.message || res.error);
      }
    } catch (e) {
      setError(e?.message || "Fehler");
    }
    setSaving(false);
  };

  const handleReschedule = () => {
    if (form.date && form.time) {
      onReschedule(appt.id, form.date, form.time);
      setShowReschedule(false);
    }
  };

  // Time range for display mode
  const endTime = useMemo(() => {
    if (!appt.time || !appt.durationMinutes) return appt.endTime || null;
    const [h, m] = appt.time.split(":").map(Number);
    const total = h * 60 + m + (appt.durationMinutes || 60);
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }, [appt.time, appt.durationMinutes, appt.endTime]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, width: 440, height: "100vh", background: "#141820", borderLeft: "1px solid rgba(255,255,255,0.08)", zIndex: 9999, padding: "28px 24px", overflowY: "auto", boxShadow: "-10px 0 40px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            {isNew ? tFb(t, "cal_new_appt", "Neuer Termin") : tFb(t, "cal_details", "Details")}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(167,177,195,0.7)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* ═══ CREATE / EDIT MODE ═══ */}
        {(isNew || showReschedule) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Patient — searchable dropdown + free text */}
            {isNew && (
              <Field label={tFb(t, "cal_patient", "Patient")}>
                <div style={{ position: "relative" }}>
                  <input
                    value={patientSearch}
                    onChange={e => { setPatientSearch(e.target.value); updateField("patientName", e.target.value); updateField("patientId", ""); setShowPatientDropdown(true); }}
                    onFocus={() => setShowPatientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                    placeholder={tFb(t, "cal_patient_placeholder", "Name eingeben oder auswählen...")}
                    style={inputStyle}
                  />
                  {showPatientDropdown && filteredPatients.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: 180, overflowY: "auto", background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, zIndex: 10, marginTop: 2 }}>
                      {filteredPatients.slice(0, 10).map(p => (
                        <div key={p.id} onMouseDown={() => { updateField("patientId", p.id); updateField("patientName", `${p.first_name || ""} ${p.last_name || ""}`.trim()); setPatientSearch(`${p.first_name || ""} ${p.last_name || ""}`.trim()); setShowPatientDropdown(false); }}
                          style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#e8eefc", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(76,201,255,0.08)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          {p.first_name} {p.last_name || ""} {p.phone ? <span style={{ color: "rgba(167,177,195,0.5)", marginLeft: 6, fontSize: 11 }}>{p.phone}</span> : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            )}

            {/* Date + Time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label={tFb(t, "cal_date", "Datum")}>
                <input type="date" value={form.date} onChange={e => updateField("date", e.target.value)} style={inputStyle} />
              </Field>
              <Field label={tFb(t, "cal_time", "Uhrzeit")}>
                <input type="time" value={form.time} onChange={e => updateField("time", e.target.value)} style={inputStyle} />
              </Field>
            </div>

            {/* Treatment — from clinic settings */}
            {isNew && (
              <Field label={tFb(t, "cal_treatment", "Behandlung")}>
                <select value={form.treatment} onChange={e => updateField("treatment", e.target.value)} style={selectStyle}>
                  <option value="">{tFb(t, "cal_select_treatment", "Behandlung wählen...")}</option>
                  {treatments.map(tr => <option key={tr.id || tr.name} value={tr.name}>{tr.name}</option>)}
                </select>
              </Field>
            )}

            {/* Grafts + Price */}
            {isNew && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Grafts">
                  <input type="number" value={form.grafts} onChange={e => updateField("grafts", e.target.value)} placeholder="z.B. 3000" style={inputStyle} />
                </Field>
                <Field label={tFb(t, "cal_price", "Preis (€)")}>
                  <input type="number" value={form.price} onChange={e => updateField("price", e.target.value)} placeholder="z.B. 3500" style={inputStyle} />
                </Field>
              </div>
            )}

            {/* Doctor */}
            {isNew && doctors?.length > 0 && (
              <Field label={tFb(t, "cal_doctor", "Arzt")}>
                <select value={form.doctorId} onChange={e => updateField("doctorId", e.target.value)} style={selectStyle}>
                  <option value="">{tFb(t, "cal_auto_assign", "Automatisch zuweisen")}</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            )}

            {/* Duration */}
            {isNew && (
              <Field label={tFb(t, "cal_duration", "Dauer (Minuten)")}>
                <select value={form.durationMinutes} onChange={e => updateField("durationMinutes", e.target.value)} style={selectStyle}>
                  <option value={60}>1h — Beratung</option>
                  <option value={120}>2h — PRP / Meso</option>
                  <option value={300}>5h — Kleine OP</option>
                  <option value={480}>8h — Standard OP</option>
                  <option value={600}>10h — Große OP</option>
                </select>
              </Field>
            )}

            {/* Room */}
            {isNew && (
              <Field label={tFb(t, "cal_room", "OP-Raum")}>
                <input value={form.room} onChange={e => updateField("room", e.target.value)} placeholder="z.B. 1, 2, A..." style={inputStyle} />
              </Field>
            )}

            {/* Notes */}
            <Field label={tFb(t, "cal_notes", "Notizen")}>
              <textarea value={form.notes} onChange={e => updateField("notes", e.target.value)} rows={2} placeholder="Interne Notizen..." style={{ ...inputStyle, resize: "vertical", minHeight: 50 }} />
            </Field>

            {/* Error message */}
            {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 12, fontWeight: 600 }}>{error}</div>}

            {/* Save / Cancel buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={isNew ? handleSave : handleReschedule} disabled={saving || !form.date || !form.time} style={{ ...btnStyle, flex: 1, background: "linear-gradient(135deg,#4cc9ff,#2b7cff)", color: "#fff", opacity: saving ? 0.6 : 1 }}>
                {saving ? "..." : isNew ? tFb(t, "cal_create", "Termin erstellen") : tFb(t, "cal_reschedule_confirm", "Verschieben")}
              </button>
              <button onClick={isNew ? onClose : () => setShowReschedule(false)} style={{ ...btnStyle, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.7)" }}>
                {tFb(t, "cancel", "Abbrechen")}
              </button>
            </div>
          </div>
        ) : (
          /* ═══ VIEW MODE ═══ */
          <>
            {/* Patient name */}
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{appt.patient || "—"}</div>

            {/* Status badge */}
            <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 8, background: `${sc.c}18`, color: sc.c, fontWeight: 700, fontSize: 13, marginBottom: 20 }}>
              {sc.l}
            </div>

            {/* Treatment */}
            <InfoRow label={tFb(t, "cal_treatment", "Behandlung")} value={appt.treatment || appt.treatment_type || "—"} />

            {/* Grafts + Price + Room hero */}
            {(appt.grafts || appt.price || appt.room) && (
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {appt.grafts != null && <div style={{ textAlign: "center" }}><span style={{ fontSize: 22, fontWeight: 800, color: "#4cc9ff" }}>{Number(appt.grafts).toLocaleString()}</span><span style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", marginLeft: 4 }}>Grafts</span></div>}
                {appt.grafts != null && appt.price && <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)" }} />}
                {appt.price && <div style={{ textAlign: "center" }}><span style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>€{Number(appt.price).toLocaleString()}</span></div>}
                {appt.room && <><div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)" }} /><div style={{ fontSize: 14, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff" }}>Raum {appt.room}</div></>}
              </div>
            )}

            {/* Date + Time */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "12px 18px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{appt.date}</span>
              <span style={{ fontSize: 12, color: "rgba(167,177,195,0.5)" }}>•</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{appt.time || "—"}</span>
              {endTime && <><span style={{ fontSize: 12, color: "rgba(167,177,195,0.5)" }}>→</span><span style={{ fontSize: 15, fontWeight: 700 }}>{endTime}</span></>}
            </div>

            {/* Doctor */}
            <InfoRow label={tFb(t, "cal_doctor", "Arzt")} value={appt.doctorName || "—"} />

            {/* Rescheduled from */}
            {appt.rescheduled_from && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.1)", fontSize: 11, color: "rgba(167,177,195,0.6)", marginBottom: 16 }}>
                🔄 {tFb(t, "cal_rescheduled_from", "Verschoben von einem früheren Termin")}
              </div>
            )}

            {/* Notes */}
            {appt.notes && <InfoRow label={tFb(t, "cal_notes", "Notizen")} value={appt.notes} />}

            {/* Prep Checklist */}
            <PrepChecklist appt={appt} t={t} />

            {/* Actions */}
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
              {appt.status === "booked" && (
                <button onClick={() => onConfirm(appt.id)} style={{ ...btnStyle, background: "rgba(167,129,250,0.15)", border: "1px solid rgba(167,129,250,0.3)", color: "rgb(167,129,250)" }}>
                  {tFb(t, "cal_confirm", "Bestätigen")}
                </button>
              )}
              {(appt.status === "booked" || appt.status === "confirmed") && (
                <>
                  <button onClick={() => setShowReschedule(true)} style={{ ...btnStyle, background: "rgba(76,201,255,0.15)", border: "1px solid rgba(76,201,255,0.3)", color: "#4cc9ff" }}>
                    {tFb(t, "cal_reschedule", "Umbuchen")}
                  </button>
                  <button onClick={() => onComplete(appt.id)} style={{ ...btnStyle, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
                    {tFb(t, "cal_complete", "Abschließen")}
                  </button>
                  <button onClick={() => onCancel(appt.id)} style={{ ...btnStyle, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
                    {tFb(t, "cal_cancel", "Abbrechen")}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function PrepChecklist({ appt, t }) {
  if (!appt) return null;
  const isSurgical = appt.grafts || appt.estimated_grafts || ["FUE", "DHI", "FUE Saphir", "Bart", "Augenbrauen"].some(k => (appt.treatment || "").includes(k));
  if (!isSurgical) return null;

  const items = [
    { label: tFb(t, "checklist_photos", "Photos"), done: !!appt.photos_complete || !!appt.photosComplete },
    { label: tFb(t, "checklist_blood_test", "Bluttest"), done: !!appt.blood_test || !!appt.bloodTest },
    { label: tFb(t, "checklist_consent", "Einwilligung"), done: !!appt.documents_signed || !!appt.documentsSigned },
    { label: tFb(t, "checklist_medical_clearance", "Med. Freigabe"), done: !!appt.medical_clearance || !!appt.medicalClearance },
  ];
  const doneCount = items.filter(i => i.done).length;
  const pctColor = doneCount === items.length ? "#10b981" : doneCount >= 2 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{tFb(t, "preparation", "Vorbereitung")}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: pctColor }}>{doneCount}/{items.length}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 12 }}>
        <div style={{ height: "100%", borderRadius: 2, background: pctColor, width: `${(doneCount / items.length) * 100}%`, transition: "width 0.3s" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
        {items.map(p => (
          <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "4px 0" }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: p.done ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)", color: p.done ? "#10b981" : "#ef4444", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{p.done ? "✓" : "✗"}</span>
            <span style={{ fontWeight: 600, color: p.done ? "rgba(232,238,252,0.75)" : "rgba(239,68,68,0.6)" }}>{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "rgba(167,177,195,0.7)", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{value || "—"}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#e8eefc", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

const selectStyle = {
  ...inputStyle, cursor: "pointer", appearance: "none",
};

const btnStyle = {
  padding: "11px 16px", borderRadius: 10, fontSize: 13,
  fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  border: "none", textAlign: "center",
};
