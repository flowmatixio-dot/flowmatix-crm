import React, { useState, useMemo } from "react";
import { APPT_C } from "../../data/constants";

const TREAT_REVENUE = {
  "FUE": 3500, "DHI": 4500, "FUE Saphir": 4000,
  "Bart": 3000, "Augenbrauen": 2500, "PRP": 800, "Mesotherapie": 600,
};

const PROCEDURE_LABELS = {
  "FUE": "FUE Haartransplantation",
  "DHI": "DHI Haartransplantation",
  "FUE Saphir": "FUE Saphir Haartransplantation",
};

const STATUS_COLORS = {
  confirmed: "#10b981",
  reserved: "#f59e0b",
  booked: "#4cc9ff",
  cancelled: "#ef4444",
  no_show: "#6b7280",
  completed: "#10b981",
  pending: "#ff8a2a",
};

function tFb(t, key, fallback) {
  const val = t(key);
  return (val && val !== key) ? val : fallback;
}

export default function AppointmentDrawer({ appt, onClose, onConfirm, onComplete, onCancel, onReschedule, t }) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState(appt?.date || "");
  const [newTime, setNewTime] = useState(appt?.time || "");

  if (!appt) return null;

  const sc = APPT_C[appt.status] || APPT_C.booked;
  const statusColor = STATUS_COLORS[appt.status] || sc.c;

  // Compute duration display
  const durationHours = appt.durationMinutes ? Math.floor(appt.durationMinutes / 60) : null;
  const durationMins = appt.durationMinutes ? appt.durationMinutes % 60 : null;
  const durationLabel = durationHours !== null
    ? `${durationHours}h${durationMins > 0 ? ` ${durationMins}m` : ""}`
    : null;

  // Estimated revenue
  const estimatedRevenue = useMemo(() => {
    if (appt.price) return Number(appt.price);
    if (appt.grafts) return Math.round(Number(appt.grafts) * 2); // ~€2/graft estimate
    return TREAT_REVENUE[appt.treatment] || 0;
  }, [appt.price, appt.grafts, appt.treatment]);

  // Procedure label
  const procedureLabel = PROCEDURE_LABELS[appt.treatment] || appt.treatment || "—";

  // Time range with duration calculation
  const timeRange = useMemo(() => {
    if (!appt.time) return null;
    const startTime = appt.time;
    let endTime = appt.endTime;
    let durationStr = durationLabel;

    // Calculate end time from duration if not provided
    if (!endTime && appt.durationMinutes && appt.time) {
      const [h, m] = appt.time.split(":").map(Number);
      const totalMins = h * 60 + m + appt.durationMinutes;
      const endH = Math.floor(totalMins / 60) % 24;
      const endM = totalMins % 60;
      endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    }

    // Calculate duration from start/end if not provided
    if (!durationStr && startTime && endTime) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const diffMins = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMins > 0) {
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        durationStr = `${hrs}h${mins > 0 ? ` ${mins}m` : ""}`;
      }
    }

    return { startTime, endTime, durationStr };
  }, [appt.time, appt.endTime, appt.durationMinutes, durationLabel]);

  const handleReschedule = () => {
    if (newDate && newTime) {
      onReschedule(appt.id, newDate, newTime);
      setShowReschedule(false);
    }
  };

  // Patient status helpers
  const statusBadge = (ok, labelYes, labelNo) => ({
    label: ok ? labelYes : labelNo,
    bg: ok ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)",
    color: ok ? "#10b981" : "#ef4444",
  });

  const patientStatuses = appt.patientStatus ? [
    statusBadge(appt.patientStatus.deposit, tFb(t, "cal_deposit_paid", "Anzahlung"), tFb(t, "cal_deposit_missing", "Keine Anzahlung")),
    statusBadge(appt.patientStatus.documents, tFb(t, "cal_docs_ok", "Dokumente"), tFb(t, "cal_docs_missing", "Keine Dokumente")),
    statusBadge(appt.patientStatus.bloodTest, tFb(t, "cal_blood_ok", "Bluttest"), tFb(t, "cal_blood_missing", "Kein Bluttest")),
  ].map(s => ({
    ...s,
    bg: s.color === "#10b981" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
    border: s.color === "#10b981" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
  })) : null;

  // Treatment type color (use doctorColor as accent fallback)
  const treatmentColor = appt.doctorColor || "rgba(167,177,195,0.7)";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 9998, backdropFilter: "blur(3px)",
        }}
      />
      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, width: 420, height: "100vh",
        background: "#141820", borderLeft: "1px solid rgba(255,255,255,0.08)",
        zIndex: 9999, padding: "28px 24px", overflowY: "auto",
        boxShadow: "-10px 0 40px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            {tFb(t, "cal_details", "Details")}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none",
              color: "rgba(167,177,195,0.5)", fontSize: 20, cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Patient name — large, bold */}
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.02em" }}>
          {appt.patient || "—"}
        </div>

        {/* Status badge with correct colors */}
        <div style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 8,
          background: `${statusColor}18`, color: statusColor, fontWeight: 700, fontSize: 13,
          marginBottom: 20,
        }}>
          {sc.l}
        </div>

        {/* Procedure type */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", fontWeight: 600, marginBottom: 3 }}>
            {tFb(t, "cal_treatment", "Behandlung")}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              display: "inline-block", width: 4, height: 16, borderRadius: 2,
              background: treatmentColor, flexShrink: 0,
            }} />
            {procedureLabel}
          </div>
        </div>

        {/* Grafts + Revenue + Room hero row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16, marginBottom: 20,
          padding: "16px 18px", borderRadius: 14,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {appt.grafts != null && (
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#4cc9ff" }}>
                {Number(appt.grafts).toLocaleString()}
              </span>
              <span style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", marginLeft: 4 }}>
                Grafts
              </span>
            </div>
          )}
          {appt.grafts != null && estimatedRevenue > 0 && (
            <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)" }} />
          )}
          {estimatedRevenue > 0 && (
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>
                {"\u20AC"}{estimatedRevenue.toLocaleString()}
              </span>
              <span style={{ fontSize: 10, color: "rgba(167,177,195,0.4)", display: "block", marginTop: 2 }}>
                {tFb(t, "drawer_revenue", "Umsatz")}
              </span>
            </div>
          )}
          {appt.room && (
            <>
              <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)" }} />
              <div style={{
                fontSize: 14, fontWeight: 700, padding: "4px 12px", borderRadius: 8,
                background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.2)",
                color: "#4cc9ff",
              }}>
                {tFb(t, "cal_room", "Raum")} {appt.room}
              </div>
            </>
          )}
        </div>

        {/* Time range display */}
        {timeRange && timeRange.startTime && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
            padding: "12px 18px", borderRadius: 12,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{timeRange.startTime}</span>
            {timeRange.endTime && (
              <>
                <span style={{ fontSize: 12, color: "rgba(167,177,195,0.5)" }}>{"\u2192"}</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{timeRange.endTime}</span>
              </>
            )}
            {timeRange.durationStr && (
              <span style={{
                marginLeft: "auto", fontSize: 12, fontWeight: 700,
                padding: "3px 10px", borderRadius: 6,
                background: "rgba(167,139,250,0.10)", color: "#a78bfa",
              }}>
                {timeRange.durationStr}
              </span>
            )}
          </div>
        )}

        {/* Info rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Doctor with color dot */}
          <div>
            <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", fontWeight: 600, marginBottom: 3 }}>
              {tFb(t, "cal_doctor", "Arzt")}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              {appt.doctorColor && (
                <span style={{
                  display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                  background: appt.doctorColor, flexShrink: 0,
                }} />
              )}
              {appt.doctorName || "—"}
            </div>
          </div>

          {/* Operating room (standalone row if not in hero) */}
          {appt.room && (
            <InfoRow label={tFb(t, "cal_room", "OP-Raum")} value={`Raum ${appt.room}`} />
          )}

          {appt.notes && <InfoRow label={tFb(t, "cal_notes", "Notizen")} value={appt.notes} />}
        </div>

        {/* ── Vorbereitung Checklist ── */}
        <PrepChecklist appt={appt} t={t} />

        {/* Patient status indicators (legacy) */}
        {patientStatuses && (
          <div style={{
            marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8,
          }}>
            {patientStatuses.map((s, i) => (
              <span
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 6,
                  fontSize: 10, fontWeight: 600,
                  background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                }}
              >
                {s.color === "#10b981" ? "✓" : "✕"} {s.label}
              </span>
            ))}
          </div>
        )}

        {/* Reschedule form */}
        {showReschedule && (
          <div style={{
            marginTop: 20, padding: 16, borderRadius: 12,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              {tFb(t, "cal_reschedule", "Verschieben")}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                style={inputStyle}
              />
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleReschedule} style={{ ...actionBtnStyle, background: "rgba(76,201,255,0.12)", color: "#4cc9ff" }}>
                OK
              </button>
              <button onClick={() => setShowReschedule(false)} style={{ ...actionBtnStyle, background: "rgba(255,255,255,0.04)", color: "rgba(167,177,195,0.7)" }}>
                {tFb(t, "cal_block_cancel", "Abbrechen")}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          {appt.status === "booked" && (
            <button onClick={() => onConfirm(appt.id)} style={{ ...actionBtnStyle, background: "rgba(167,129,250,0.15)", border: "1px solid rgba(167,129,250,0.3)", color: "rgb(167,129,250)" }}>
              {tFb(t, "cal_confirm", "Bestätigen")}
            </button>
          )}
          {(appt.status === "booked" || appt.status === "confirmed") && (
            <>
              <button onClick={() => setShowReschedule(true)} style={{ ...actionBtnStyle, background: "rgba(76,201,255,0.15)", border: "1px solid rgba(76,201,255,0.3)", color: "#4cc9ff" }}>
                {tFb(t, "cal_reschedule", "Verschieben")}
              </button>
              <button onClick={() => onComplete(appt.id)} style={{ ...actionBtnStyle, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "rgb(16,185,129)" }}>
                {tFb(t, "cal_complete", "Abschließen")}
              </button>
              <button onClick={() => onCancel(appt.id)} style={{ ...actionBtnStyle, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "rgb(239,68,68)" }}>
                {tFb(t, "cal_cancel", "Absagen")}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function PrepChecklist({ appt, t }) {
  if (!appt) return null;
  const isSurgical = appt.grafts || appt.estimated_grafts ||
    ["FUE", "DHI", "FUE Saphir", "Bart", "Augenbrauen"].includes(appt.treatment);
  if (!isSurgical) return null;

  const items = [
    { label: tFb(t, "checklist_photos", "Photos"), done: !!appt.photos_complete || !!appt.photosComplete },
    { label: tFb(t, "checklist_blood_test", "Blood Test"), done: !!appt.blood_test || !!appt.bloodTest },
    { label: tFb(t, "checklist_consent", "Consent"), done: !!appt.documents_signed || !!appt.documentsSigned },
    { label: tFb(t, "checklist_medical_clearance", "Med. Clearance"), done: !!appt.medical_clearance || !!appt.medicalClearance },
  ];
  const doneCount = items.filter(i => i.done).length;
  const pctColor = doneCount === items.length ? "#10b981" : doneCount >= 2 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{
      marginTop: 20, padding: "14px 16px", borderRadius: 12,
      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.5)",
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          {tFb(t, "preparation", "Vorbereitung")}
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, color: pctColor }}>
          {doneCount}/{items.length}
        </span>
      </div>
      {/* Progress bar */}
      <div style={{
        height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)",
        overflow: "hidden", marginBottom: 12,
      }}>
        <div style={{
          height: "100%", borderRadius: 2, background: pctColor,
          width: `${(doneCount / items.length) * 100}%`,
          transition: "width 0.3s",
        }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
        {items.map(p => (
          <div key={p.label} style={{
            display: "flex", alignItems: "center", gap: 8, fontSize: 12,
            padding: "4px 0",
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: 5,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: p.done ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
              color: p.done ? "#10b981" : "#ef4444",
              fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>
              {p.done ? "\u2713" : "\u2717"}
            </span>
            <span style={{
              fontWeight: 600,
              color: p.done ? "rgba(232,238,252,0.75)" : "rgba(239,68,68,0.6)",
            }}>
              {p.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: "rgba(167,177,195,0.5)", fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{value || "—"}</div>
    </div>
  );
}

const inputStyle = {
  flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#e8eefc", fontFamily: "inherit", outline: "none",
};

const actionBtnStyle = {
  padding: "8px 16px", borderRadius: 10, fontSize: 12,
  fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  border: "none", textAlign: "center",
};
