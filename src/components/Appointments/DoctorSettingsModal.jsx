import React, { useState, useEffect } from "react";
import { apiFetch } from "../../api/client";
import { fmLocale } from "../../utils/helpers";

const DAYS_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_I18N = ["cal_monday","cal_tuesday","cal_wednesday","cal_thursday","cal_friday","cal_saturday","cal_sunday"];
const DAYS_FALLBACK = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const TREATMENT_TYPES = ["FUE", "DHI", "FUE Saphir", "Bart", "Augenbrauen", "PRP", "Mesotherapie"];
const OP_ROOMS = ["OP1", "OP2", "OP3", "OP4"];

export default function DoctorSettingsModal({ doctor, onClose, onSave, t, todayBookings }) {
  // Support both camelCase (legacy) and snake_case (API) field names
  const docWorkingHours = doctor.workingHours || doctor.working_hours;
  const docWorkDays = doctor.fixedWorkDays || doctor.work_days;
  const docTreatments = doctor.treatments || doctor.treatment_types_allowed;
  const docMaxOps = doctor.capacity?.maxOpsPerDay ?? doctor.max_surgeries_per_day ?? 5;
  const docMaxGrafts = doctor.capacity?.maxGraftsPerDay ?? doctor.max_grafts_per_day ?? 8000;
  const docMaxLargeOps = doctor.capacity?.maxLargeOps ?? doctor.max_large_ops_per_day ?? 2;
  const docAutoReview = doctor.autoReview ?? doctor.auto_review_enabled ?? false;
  const docMaxReviews = doctor.maxReviewsPerDay ?? doctor.max_reviews_per_day ?? 10;

  const [workingHours, setWorkingHours] = useState(() => {
    const hours = {};
    DAYS_KEYS.forEach((d) => {
      const existing = docWorkingHours?.[d];
      if (existing) {
        hours[d] = { start: existing.start || existing.from || "09:00", end: existing.end || existing.to || "18:00", enabled: true };
      } else {
        // If work_days array exists, use it to determine enabled days
        const enabledByWorkDays = Array.isArray(docWorkDays) ? docWorkDays.includes(d) : (d !== "sat" && d !== "sun");
        hours[d] = { start: "09:00", end: "18:00", enabled: enabledByWorkDays };
      }
    });
    return hours;
  });

  const [capacity, setCapacity] = useState({
    maxOpsPerDay: docMaxOps,
    maxGraftsPerDay: docMaxGrafts,
    maxLargeOps: docMaxLargeOps,
  });

  const [treatments, setTreatments] = useState(
    docTreatments || ["FUE", "DHI", "FUE Saphir"]
  );

  const [rooms, setRooms] = useState(doctor.rooms || ["OP1", "OP2"]);

  const [opDurations, setOpDurations] = useState({
    duration_1500: doctor.duration_1500 || 4,
    duration_3000: doctor.duration_3000 || 6,
    duration_4500: doctor.duration_4500 || 8,
    duration_4500_plus: doctor.duration_4500_plus || 10,
  });

  const [fixedDays, setFixedDays] = useState(
    (Array.isArray(docWorkDays) ? docWorkDays : null) || ["mon", "tue", "wed", "thu", "fri"]
  );

  const [autoReview, setAutoReview] = useState(docAutoReview);
  const [maxReviewsPerDay, setMaxReviewsPerDay] = useState(docMaxReviews);

  const [vacations, setVacations] = useState(doctor.vacations || []);
  // Load vacations from API on mount
  useEffect(() => {
    apiFetch(`/api/v1/crm/doctors/${doctor.id}/unavailability`).then(res => {
      const list = res?.unavailability || [];
      if (list.length) setVacations(list.map(v => ({ start: v.startDate || v.start_date, end: v.endDate || v.end_date })));
    }).catch(() => {});
  }, [doctor.id]);
  const [newVacStart, setNewVacStart] = useState("");
  const [newVacEnd, setNewVacEnd] = useState("");

  const toggleTreatment = (tr) => {
    setTreatments((prev) =>
      prev.includes(tr) ? prev.filter((x) => x !== tr) : [...prev, tr]
    );
  };

  const toggleRoom = (room) => {
    setRooms((prev) =>
      prev.includes(room) ? prev.filter((x) => x !== room) : [...prev, room]
    );
  };

  const toggleFixedDay = (day) => {
    setFixedDays((prev) =>
      prev.includes(day) ? prev.filter((x) => x !== day) : [...prev, day]
    );
  };

  const addVacation = () => {
    if (newVacStart && newVacEnd) {
      setVacations((prev) => [...prev, { start: newVacStart, end: newVacEnd }]);
      setNewVacStart("");
      setNewVacEnd("");
    }
  };

  const removeVacation = (idx) => {
    setVacations((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave({
      doctorId: doctor.id,
      workingHours,
      capacity,
      treatments,
      rooms,
      fixedWorkDays: fixedDays,
      autoReview,
      maxReviewsPerDay,
      vacations,
      ...opDurations,
    });
  };

  const updateHour = (day, field, value) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          zIndex: 9998, backdropFilter: "blur(4px)",
        }}
      />
      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 560, maxHeight: "85vh",
        background: "#141820",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 18, zIndex: 9999,
        padding: 0,
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              display: "inline-block", width: 12, height: 12, borderRadius: "50%",
              background: doctor.color,
            }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{doctor.name}</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none",
              color: "rgba(167,177,195,0.7)", fontSize: 20, cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "20px 28px", overflowY: "auto", flex: 1 }}>

        {/* Working Hours */}
        <SectionTitle>{t("doc_working_hours") || "Arbeitszeiten"}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {DAYS_KEYS.map((day, i) => (
            <div key={day} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, width: 120, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={workingHours[day]?.enabled}
                  onChange={() => updateHour(day, "enabled", !workingHours[day]?.enabled)}
                  style={{ accentColor: "#4cc9ff" }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, opacity: workingHours[day]?.enabled ? 1 : 0.4 }}>
                  {t(DAY_I18N[i]) || DAYS_FALLBACK[i]}
                </span>
              </label>
              {workingHours[day]?.enabled && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="time"
                    value={workingHours[day]?.start || "09:00"}
                    onChange={(e) => updateHour(day, "start", e.target.value)}
                    style={timeInputStyle}
                  />
                  <span style={{ fontSize: 11, opacity: 0.4 }}>—</span>
                  <input
                    type="time"
                    value={workingHours[day]?.end || "18:00"}
                    onChange={(e) => updateHour(day, "end", e.target.value)}
                    style={timeInputStyle}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Capacity */}
        <SectionTitle>{t("capacity_heading") || "Kapazität"}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <CapacityInput label={t("doc_max_ops_day") || "Max OPs pro Tag"} value={capacity.maxOpsPerDay} onChange={(v) => setCapacity((p) => ({ ...p, maxOpsPerDay: v }))} />
          <CapacityInput label={t("doc_max_grafts_day") || "Max Grafts pro Tag"} value={capacity.maxGraftsPerDay} onChange={(v) => setCapacity((p) => ({ ...p, maxGraftsPerDay: v }))} />
          <CapacityInput label={t("max_large_ops") || "Max große OPs (>3000 Grafts)"} value={capacity.maxLargeOps} onChange={(v) => setCapacity((p) => ({ ...p, maxLargeOps: v }))} />
        </div>

        {/* Capacity validation warning */}
        {(() => {
          const currentOps = todayBookings?.ops ?? 0;
          const currentGrafts = todayBookings?.grafts ?? 0;
          const opsExceeded = currentOps > capacity.maxOpsPerDay;
          const graftsExceeded = currentGrafts > capacity.maxGraftsPerDay;
          if (!opsExceeded && !graftsExceeded) return null;
          return (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 16,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>{"\u26A0\uFE0F"}</span>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
                {opsExceeded && <div>Kapazit{"\u00E4"}t {"\u00FC"}berschritten: {currentOps}/{capacity.maxOpsPerDay} OPs heute</div>}
                {graftsExceeded && <div>{t("grafts_exceeded")} {currentGrafts.toLocaleString()}/{capacity.maxGraftsPerDay.toLocaleString()} {t("grafts_today")}</div>}
              </div>
            </div>
          );
        })()}

        {/* OP Duration by Grafts */}
        <SectionTitle>OP-Dauer (nach Grafts)</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { key: "duration_1500", label: "≤ 1.500", def: 4 },
            { key: "duration_3000", label: "≤ 3.000", def: 6 },
            { key: "duration_4500", label: "≤ 4.500", def: 8 },
            { key: "duration_4500_plus", label: "> 4.500", def: 10 },
          ].map(d => (
            <div key={d.key} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "rgba(167,177,195,0.6)", marginBottom: 4 }}>{d.label}</div>
              <select value={opDurations[d.key]} onChange={e => setOpDurations(p => ({ ...p, [d.key]: parseInt(e.target.value) }))} style={{
                width: "100%", padding: "8px 4px", borderRadius: 8,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                textAlign: "center", outline: "none", cursor: "pointer",
              }}>
                {[3,4,5,6,7,8,9,10,11,12].map(h => <option key={h} value={h}>{h}h</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "rgba(167,177,195,0.7)", marginBottom: 20, marginTop: -8 }}>ℹ️ Der Kalender berechnet die OP-Dauer automatisch anhand der Graft-Anzahl aus der Arzt-Bewertung.</div>

        {/* Treatment types */}
        <SectionTitle>{t("treatment_types")}</SectionTitle>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {TREATMENT_TYPES.map((tr) => {
            const active = treatments.includes(tr);
            return (
              <button
                key={tr}
                onClick={() => toggleTreatment(tr)}
                style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", outline: "none",
                  border: `1px solid ${active ? "#4cc9ff" : "rgba(255,255,255,0.1)"}`,
                  background: active ? "rgba(76,201,255,0.12)" : "rgba(255,255,255,0.03)",
                  color: active ? "#4cc9ff" : "rgba(167,177,195,0.7)",
                  transition: "all 0.15s ease",
                }}
              >
                {tr}
              </button>
            );
          })}
        </div>

        {/* OP Rooms */}
        <SectionTitle>{t("or_rooms_heading") || "OP-Räume"}</SectionTitle>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {OP_ROOMS.map((room) => {
            const active = rooms.includes(room);
            return (
              <button
                key={room}
                onClick={() => toggleRoom(room)}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", outline: "none",
                  border: `1px solid ${active ? "rgba(76,201,255,0.3)" : "rgba(255,255,255,0.06)"}`,
                  background: active ? "rgba(76,201,255,0.12)" : "rgba(255,255,255,0.02)",
                  color: active ? "#4cc9ff" : "rgba(167,177,195,0.7)",
                  transition: "all .15s",
                }}
              >
                {room}
              </button>
            );
          })}
        </div>

        {/* Fixed work days */}
        <SectionTitle>{t("doc_fixed_workdays") || "Feste Arbeitstage"}</SectionTitle>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {DAYS_KEYS.map((day, i) => {
            const active = fixedDays.includes(day);
            return (
              <button
                key={day}
                onClick={() => toggleFixedDay(day)}
                style={{
                  width: 40, height: 36, borderRadius: 8, fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", outline: "none",
                  border: `1px solid ${active ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)"}`,
                  background: active ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.02)",
                  color: active ? "#10b981" : "rgba(167,177,195,0.7)",
                  transition: "all .15s",
                }}
              >
                {(t(DAY_I18N[i]) || DAYS_FALLBACK[i]).slice(0, 2)}
              </button>
            );
          })}
        </div>

        {/* Auto-Review toggle */}
        <SectionTitle>{(t && t("auto_review")) || "Auto-Bewertung"}</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div
              onClick={() => setAutoReview(!autoReview)}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: autoReview ? "#10b981" : "rgba(255,255,255,0.1)",
                position: "relative", cursor: "pointer",
                transition: "background 0.2s ease",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 9,
                background: "#fff", position: "absolute", top: 2,
                left: autoReview ? 20 : 2,
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                transition: "left 0.2s ease",
              }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {autoReview ? (t("member_active") || "Active") : (t("member_inactive") || "Inactive")}
            </span>
          </label>
        </div>
        {autoReview && (
          <div style={{ marginBottom: 20 }}>
            <CapacityInput label={t("doc_max_reviews_day") || "Max Bewertungen/Tag"} value={maxReviewsPerDay} onChange={setMaxReviewsPerDay} />
          </div>
        )}

        {/* Vacation / Absence */}
        <SectionTitle>{t("doc_vacation") || "Urlaub / Abwesenheit"}</SectionTitle>
        <div style={{ marginBottom: 20 }}>
          {vacations.map((v, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{new Date(v.start).toLocaleDateString(fmLocale(), { day: "2-digit", month: "2-digit", year: "numeric" })} — {new Date(v.end).toLocaleDateString(fmLocale(), { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
              <button
                onClick={() => removeVacation(i)}
                style={{
                  background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 6,
                  color: "#ef4444", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", padding: "3px 8px", fontFamily: "inherit",
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
            <input
              type="date"
              value={newVacStart}
              onChange={(e) => setNewVacStart(e.target.value)}
              style={timeInputStyle}
            />
            <span style={{ fontSize: 11, opacity: 0.4 }}>bis</span>
            <input
              type="date"
              value={newVacEnd}
              onChange={(e) => setNewVacEnd(e.target.value)}
              style={timeInputStyle}
            />
            <button
              onClick={addVacation}
              style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                background: "rgba(76,201,255,0.12)", border: "1px solid rgba(76,201,255,0.2)",
                color: "#4cc9ff",
              }}
            >
              +
            </button>
          </div>
        </div>

        </div>{/* end body */}
        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px", borderRadius: 10, fontSize: 13,
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(167,177,195,0.7)",
            }}
          >
            {(t && t("cancel")) || "Abbrechen"}
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "10px 24px", borderRadius: 10, fontSize: 13,
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              background: "rgba(76,201,255,0.15)", border: "1px solid rgba(76,201,255,0.3)",
              color: "#4cc9ff",
            }}
          >
            {(t && t("save")) || "Speichern"}
          </button>
        </div>
      </div>
    </>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, marginBottom: 12,
      color: "rgba(232,238,252,0.9)",
    }}>
      {children}
    </div>
  );
}

function CapacityInput({ label, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(167,177,195,0.7)", marginBottom: 4 }}>
        {label}
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: 80, padding: "6px 10px", borderRadius: 8, fontSize: 13,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          color: "#e8eefc", fontFamily: "inherit", outline: "none",
          textAlign: "center",
        }}
      />
    </div>
  );
}

const timeInputStyle = {
  padding: "5px 8px", borderRadius: 6, fontSize: 12,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#e8eefc", fontFamily: "inherit", outline: "none",
};
