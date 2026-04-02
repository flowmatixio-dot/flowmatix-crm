import React, { useState } from "react";

function tFb(t, key, fallback) {
  const val = t(key);
  return (val && val !== key) ? val : fallback;
}

export default function BlockDayModal({ doctors, blockedDays = [], onSave, onDelete, onClose, t }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reason, setReason] = useState("");
  const [doctorId, setDoctorId] = useState("");

  const handleDelete = async (id) => {
    await onDelete(id);
    setDateFrom("");
    setDateTo("");
    setReason("");
  };

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!dateFrom) { onClose(); return; }
    setSaving(true);
    try {
      // Generate all dates in range
      const start = new Date(dateFrom + "T00:00:00");
      const end = dateTo ? new Date(dateTo + "T00:00:00") : start;
      const current = new Date(start);
      while (current <= end) {
        const d = `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}-${String(current.getDate()).padStart(2,'0')}`;
        await onSave({ date: d, reason: reason || "Blocked", doctorId: doctorId || null });
        current.setDate(current.getDate() + 1);
      }
      setDateFrom("");
      setDateTo("");
      setReason("");
      setDoctorId("");
      onClose();
    } catch {}
    setSaving(false);
  };

  const sorted = [...blockedDays].sort((a, b) => (a.blocked_date || a.date || "").localeCompare(b.blocked_date || b.date || ""));

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998, backdropFilter: "blur(4px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#141820", borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", padding: "24px 28px", width: 420, zIndex: 9999, boxShadow: "0 24px 80px rgba(0,0,0,0.6)", maxHeight: "80vh", overflowY: "auto" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 20px" }}>
          {tFb(t, "cal_block_title", "Tage blockieren")}
        </h2>

        {/* Existing blocked days */}
        {sorted.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", marginBottom: 8 }}>
              {tFb(t, "cal_blocked_days", "Blockierte Tage")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sorted.map(bd => {
                const d = (bd.blocked_date || bd.date || "").slice(0, 10);
                const fmtDate = d ? new Date(d + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) : d;
                return (
                  <div key={bd.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{fmtDate}</span>
                      {bd.reason && bd.reason !== "Blocked" && (
                        <span style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginLeft: 8 }}>{bd.reason}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(bd.id)}
                      title={tFb(t, "cal_unblock", "Blockierung aufheben")}
                      style={{ background: "none", border: "none", color: "rgba(239,68,68,0.5)", fontSize: 16, cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}
                    >✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        {sorted.length > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />}

        {/* New block form */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", marginBottom: 8 }}>
          {tFb(t, "cal_block_new", "Neuen Tag blockieren")}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>{tFb(t, "cal_block_from", "Von")}</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); if (!dateTo) setDateTo(e.target.value); }} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{tFb(t, "cal_block_to", "Bis")}</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{tFb(t, "cal_block_reason", "Grund")}</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tFb(t, "holiday_placeholder", "z.B. Feiertag, Urlaub...")} style={inputStyle} />
        </div>

        {doctors && doctors.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{tFb(t, "doctor_optional", "Arzt (optional)")}</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">{tFb(t, "cal_all_doctors", "Alle")}</option>
              {doctors.map((doc) => <option key={doc.id} value={doc.id}>{doc.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.7)" }}>
            {tFb(t, "close", "Schließen")}
          </button>
          {dateFrom && (
            <button onClick={handleSave} disabled={saving} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", opacity: saving ? 0.5 : 1 }}>
              {saving ? "..." : tFb(t, "cal_block_save", "Blockieren")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "rgba(167,177,195,0.7)", marginBottom: 5,
};

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#e8eefc", fontFamily: "inherit", outline: "none",
  boxSizing: "border-box",
};
