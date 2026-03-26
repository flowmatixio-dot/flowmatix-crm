import React, { useState } from "react";

function tFb(t, key, fallback) {
  const val = t(key);
  return (val && val !== key) ? val : fallback;
}

export default function BlockDayModal({ doctors, onSave, onClose, t }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [doctorId, setDoctorId] = useState("");

  const handleSave = () => {
    if (!date) return;
    onSave({
      date,
      reason: reason || "Blocked",
      doctorId: doctorId || null,
    });
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
        background: "#141820", borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.1)",
        padding: "24px 28px", width: 400, zIndex: 9999,
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 20px" }}>
          {tFb(t, "cal_block_title", "Tage blocken")}
        </h2>

        {/* Date */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{tFb(t, "cal_block_date", "Datum")}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Reason */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{tFb(t, "cal_block_reason", "Grund")}</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={tFb(t, "holiday_placeholder", "z.B. Feiertag, Urlaub...")}
            style={inputStyle}
          />
        </div>

        {/* Doctor (optional) */}
        {doctors && doctors.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{tFb(t, "doctor_optional", "Arzt (optional)")}</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">{tFb(t, "cal_all_doctors", "Alle")}</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px", borderRadius: 10, fontSize: 13,
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(167,177,195,0.7)",
            }}
          >
            {tFb(t, "cal_block_cancel", "Abbrechen")}
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "10px 20px", borderRadius: 10, fontSize: 13,
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444",
            }}
          >
            {tFb(t, "cal_block_save", "Speichern")}
          </button>
        </div>
      </div>
    </>
  );
}

const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "rgba(167,177,195,0.5)", marginBottom: 5,
};

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#e8eefc", fontFamily: "inherit", outline: "none",
  boxSizing: "border-box",
};
