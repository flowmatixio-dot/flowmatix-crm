import React from "react";
import { MONTHS } from "../../data/constants";
import { fmLocale } from "../../utils/helpers";

const VIEW_LABELS_FALLBACK = { day: "Day", week: "Week", month: "Month" };
const VIEW_KEYS = { day: "cal_day", week: "cal_week", month: "cal_month" };

function tFb(t, key, fallback) {
  const val = t(key);
  return (val && val !== key) ? val : fallback;
}

export default function CalendarToolbar({
  calendarRef,
  currentDate,
  currentView,
  onViewChange,
  onBlockDay,
  onNewAppt,
  t,
}) {
  const goPrev = () => {
    const api = calendarRef.current?.getApi();
    if (api) api.prev();
  };
  const goNext = () => {
    const api = calendarRef.current?.getApi();
    if (api) api.next();
  };
  const goToday = () => {
    const api = calendarRef.current?.getApi();
    if (api) api.today();
  };

  const d = currentDate instanceof Date ? currentDate : new Date(currentDate);
  const monthName = tFb(t, MONTHS[d.getMonth()], d.toLocaleDateString(fmLocale(), { month: "long" }));
  const title =
    currentView === "day"
      ? `${d.getDate()}. ${monthName} ${d.getFullYear()}`
      : `${monthName} ${d.getFullYear()}`;

  const isToday = new Date().toISOString().slice(0, 10) === d.toISOString().slice(0, 10);

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: 14, flexWrap: "wrap", gap: 10,
      padding: "8px 0",
    }}>
      {/* Left: month nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={goPrev} style={navBtnStyle} aria-label="Previous">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button onClick={goNext} style={navBtnStyle} aria-label="Next">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <span style={{
          fontSize: 16, fontWeight: 700, color: "rgba(232,238,252,0.9)",
          marginLeft: 6, letterSpacing: "-0.02em",
        }}>
          {title}
        </span>
        {!isToday && (
          <button onClick={goToday} style={{
            ...navBtnStyle, fontSize: 11, fontWeight: 600, padding: "4px 10px",
            color: "rgba(76,201,255,0.7)", marginLeft: 4,
          }}>
            {t("cal_today") || "Today"}
          </button>
        )}
      </div>

      {/* Right: actions + view toggles */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {onBlockDay && <button
          onClick={onBlockDay}
          style={{
            padding: "6px 14px", borderRadius: 8,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(232,238,252,0.6)", fontWeight: 600, fontSize: 12,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            e.currentTarget.style.color = "rgba(232,238,252,0.85)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "rgba(232,238,252,0.6)";
          }}
        >
          {tFb(t, "cal_block_days", "Tage blocken")}
        </button>}

        {onNewAppt && <button
          onClick={onNewAppt}
          style={{
            padding: "6px 14px", borderRadius: 8,
            background: "#4cc9ff",
            border: "1px solid #4cc9ff",
            color: "#0a0e17", fontWeight: 700, fontSize: 12,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s ease",
            boxShadow: "0 2px 8px rgba(76,201,255,0.2)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#5dd3ff";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(76,201,255,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#4cc9ff";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(76,201,255,0.2)";
          }}
        >
          {tFb(t, "new_appointment_btn", "+ Termin")}
        </button>}

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)", margin: "0 2px" }} />

        <div style={{
          display: "flex", borderRadius: 8, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}>
          {["day", "week", "month"].map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              style={{
                padding: "6px 14px",
                background: currentView === v ? "rgba(76,201,255,0.1)" : "transparent",
                border: "none",
                borderRight: v !== "month" ? "1px solid rgba(255,255,255,0.06)" : "none",
                color: currentView === v ? "#4cc9ff" : "rgba(167,177,195,0.5)",
                fontWeight: currentView === v ? 700 : 600,
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s ease",
                position: "relative",
              }}
            >
              {t(VIEW_KEYS[v]) || VIEW_LABELS_FALLBACK[v]}
              {currentView === v && (
                <span style={{
                  position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                  width: 16, height: 2, borderRadius: 1,
                  background: "#4cc9ff",
                }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const navBtnStyle = {
  padding: "5px 8px", borderRadius: 6,
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
  color: "rgba(232,238,252,0.6)", cursor: "pointer", fontFamily: "inherit",
  fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center",
  transition: "all 0.15s ease",
};
