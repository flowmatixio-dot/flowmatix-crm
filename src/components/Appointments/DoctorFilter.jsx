import React, { useMemo } from "react";

const MAX_SURGERIES_PER_DOC = 5;
const DOCTOR_COLORS = ["#4cc9ff", "#f59e0b", "#a78bfa", "#10b981", "#ec4899", "#06b6d4", "#fbbf24", "#84cc16"];
function getDoctorColor(doc, index) {
  return doc.color || doc.calendarColor || DOCTOR_COLORS[index % DOCTOR_COLORS.length];
}

function tFb(t, key, fallback) {
  if (!t) return fallback;
  const val = t(key);
  return (val && val !== key) ? val : fallback;
}

export default function DoctorFilter({ doctors, selectedDoctorIds, onToggle, onSelectAll, onDoctorSettings, appointments, t }) {
  if (!doctors || doctors.length === 0) return null;

  const allSelected = !selectedDoctorIds;

  const doctorStats = useMemo(() => {
    const stats = {};
    doctors.forEach((doc) => { stats[doc.id] = { count: 0, grafts: 0 }; });
    if (!appointments || appointments.length === 0) return stats;
    const todayStr = new Date().toISOString().slice(0, 10);
    appointments.forEach((appt) => {
      if (!appt.date) return;
      const docId = appt.doctorId || appt.doctor_id || appt.staffId || appt.staff_id;
      if (!docId || !stats[docId]) return;
      if (appt.date === todayStr) {
        stats[docId].count++;
        stats[docId].grafts += Number(appt.grafts) || 0;
      }
    });
    return stats;
  }, [appointments, doctors]);

  const handleChipClick = (e, docId) => {
    e.preventDefault();
    onToggle(docId);
  };

  const handleChipRightClick = (e, doc) => {
    e.preventDefault();
    if (onDoctorSettings) onDoctorSettings(doc);
  };

  return (
    <div style={{
      display: "flex", gap: 5, margin: "0 0 12px", flexWrap: "wrap", alignItems: "center",
    }}>
      {/* "Alle" chip */}
      <button
        onClick={onSelectAll}
        style={{
          padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit", outline: "none",
          border: `1px solid ${allSelected ? "rgba(167,177,195,0.65)" : "rgba(167,177,195,0.1)"}`,
          background: allSelected ? "rgba(167,177,195,0.08)" : "transparent",
          color: `rgba(167,177,195,${allSelected ? "0.8" : "0.35"})`,
          transition: "all 0.15s ease",
        }}
      >
        {tFb(t, "cal_all_doctors", "Alle")}
      </button>

      {doctors.map((doc, idx) => {
        const docColor = getDoctorColor(doc, idx);
        const active = selectedDoctorIds?.includes(doc.id);
        const maxCap = doc.max_surgeries_per_day || doc.capacity || MAX_SURGERIES_PER_DOC;
        const ds = doctorStats[doc.id] || { count: 0, grafts: 0 };
        const count = ds.count;
        const grafts = ds.grafts;
        const ratio = maxCap > 0 ? count / maxCap : 0;

        const todayStr = new Date().toISOString().slice(0, 10);
        const isOnVacation = doc.vacations?.some(v => {
          if (!v.start) return false;
          const start = v.start.slice(0, 10);
          const end = (v.end || v.start).slice(0, 10);
          return todayStr >= start && todayStr <= end;
        }) || doc.absentDays?.includes(todayStr) || doc.blockedDays?.includes(todayStr);

        const atCapacity = ratio >= 1;
        const nearCapacity = ratio >= 0.8 && !atCapacity;

        // Subtle capacity bar color
        const capColor = isOnVacation ? "#ef4444" : atCapacity ? "#ef4444" : nearCapacity ? "#f59e0b" : "#10b981";

        return (
          <div key={doc.id} style={{ display: "inline-flex", alignItems: "center", gap: 0 }}>
            <button
              onClick={(e) => handleChipClick(e, doc.id)}
              onContextMenu={(e) => handleChipRightClick(e, doc)}
              style={{
                padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", outline: "none",
                border: `1px solid ${active ? docColor : "rgba(255,255,255,0.06)"}`,
                background: active ? `${docColor}18` : "rgba(255,255,255,0.02)",
                color: active ? docColor : "rgba(232,238,252,0.95)",
                transition: "all .15s",
                display: "inline-flex", alignItems: "center", gap: 6,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Color dot */}
              <span style={{
                display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                background: docColor, flexShrink: 0,
              }} />
              {/* Name */}
              <span>{doc.name}</span>
              {/* Capacity indicator */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 10, fontWeight: 700,
                color: active ? "rgba(232,238,252,0.95)" : "rgba(167,177,195,0.6)",
                borderLeft: "1px solid rgba(255,255,255,0.06)",
                paddingLeft: 6, marginLeft: 2,
              }}>
                <span style={{ color: capColor, fontWeight: 800 }}>{count}</span>
                <span style={{ opacity: 0.5 }}>/</span>
                <span style={{ opacity: 0.5 }}>{maxCap}</span>
              </span>
              {/* Micro capacity bar */}
              {count > 0 && (
                <span style={{
                  position: "absolute", bottom: 0, left: 0,
                  height: 2, borderRadius: "0 0 6px 6px",
                  width: `${Math.min(100, ratio * 100)}%`,
                  background: capColor, opacity: 0.5,
                  transition: "width 0.3s ease",
                }} />
              )}
            </button>
            {/* Settings gear */}
            {onDoctorSettings && (
              <button
                onClick={(e) => { e.stopPropagation(); onDoctorSettings(doc); }}
                title={`${doc.name} Settings`}
                style={{
                  padding: "2px 4px", border: "none", background: "transparent",
                  color: "rgba(167,177,195,0.65)", fontSize: 13, cursor: "pointer",
                  transition: "color .15s", marginLeft: -1, lineHeight: 1,
                }}
                onMouseEnter={e => e.currentTarget.style.color = docColor}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(167,177,195,0.65)"}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
