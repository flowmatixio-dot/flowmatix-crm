import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { fmLocale } from "../../utils/helpers";

const DEFAULT_ROOMS = [
  { id: "op1", name: "OP-Raum 1", capacity: 5000, equipment: ["FUE", "DHI", "Saphir"], color: "#4cc9ff" },
  { id: "op2", name: "OP-Raum 2", capacity: 5000, equipment: ["FUE", "DHI"], color: "#a78bfa" },
  { id: "op3", name: "OP-Raum 3", capacity: 4000, equipment: ["FUE", "Saphir"], color: "#10b981" },
  { id: "op4", name: "OP-Raum 4", capacity: 3000, equipment: ["PRP", "Mesotherapie"], color: "#f59e0b" },
];

export default function RoomScheduler({ appointments, doctors, date, rooms, onAssignRoom, showT }) {
  const { t } = useApp();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const opRooms = rooms && rooms.length > 0 ? rooms : DEFAULT_ROOMS;
  const dateStr = date instanceof Date ? date.toISOString().slice(0, 10) : date;

  // Appointments for this date
  const dayAppts = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter(a => {
      const ad = a.date || (a.scheduledAt ? new Date(a.scheduledAt).toISOString().slice(0, 10) : null);
      return ad === dateStr && a.status !== "cancelled";
    });
  }, [appointments, dateStr]);

  // Room utilization
  const roomUtil = useMemo(() => {
    const map = {};
    opRooms.forEach(r => {
      const roomAppts = dayAppts.filter(a => a.room === r.id || a.opRoom === r.id || a.op_room === r.id);
      const totalGrafts = roomAppts.reduce((s, a) => s + (Number(a.grafts || a.estimatedGrafts || a.estimated_grafts) || 0), 0);
      const totalHours = roomAppts.reduce((s, a) => s + ((a.durationMinutes || a.duration_minutes || 300) / 60), 0);
      map[r.id] = {
        appointments: roomAppts,
        totalGrafts,
        totalHours,
        utilizationPct: r.capacity > 0 ? Math.round((totalGrafts / r.capacity) * 100) : 0,
        available: totalHours < 10, // Max 10h per room per day
      };
    });
    return map;
  }, [opRooms, dayAppts]);

  // Unassigned appointments
  const unassigned = dayAppts.filter(a => !a.room && !a.opRoom && !a.op_room);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(232,238,252,0.85)" }}>
            {t("room_occupancy") || "OP-Raum Belegung"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.35)", marginTop: 2 }}>
            {dateStr ? new Date(dateStr + "T12:00:00").toLocaleDateString(fmLocale(), { weekday: "long", day: "numeric", month: "long" }) : "—"}
          </div>
        </div>
        {unassigned.length > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 5,
            background: "rgba(255,138,42,0.08)", color: "#ff8a2a",
          }}>
            {unassigned.length} {t("room_without_assignment") || "ohne Raum"}
          </span>
        )}
      </div>

      {/* Room cards */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(opRooms.length, 4)}, 1fr)`, gap: 10, marginBottom: 16 }}>
        {opRooms.map(room => {
          const util = roomUtil[room.id] || { appointments: [], totalGrafts: 0, totalHours: 0, utilizationPct: 0, available: true };
          const isSelected = selectedRoom === room.id;
          const isFull = util.utilizationPct >= 100 || !util.available;

          return (
            <div key={room.id} onClick={() => setSelectedRoom(isSelected ? null : room.id)} style={{
              padding: 14, borderRadius: 10, cursor: "pointer",
              background: isSelected ? `${room.color}08` : "rgba(255,255,255,0.015)",
              border: `1px solid ${isSelected ? `${room.color}25` : "rgba(255,255,255,0.04)"}`,
              transition: "all 0.15s",
            }}>
              {/* Room name */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: room.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(232,238,252,0.85)" }}>{room.name}</span>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                  background: isFull ? "rgba(239,68,68,0.08)" : util.utilizationPct > 70 ? "rgba(245,158,11,0.06)" : "rgba(16,185,129,0.06)",
                  color: isFull ? "#ef4444" : util.utilizationPct > 70 ? "#f59e0b" : "#10b981",
                }}>
                  {isFull ? (t("room_full") || "VOLL") : `${util.utilizationPct}%`}
                </span>
              </div>

              {/* Capacity bar */}
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", marginBottom: 8 }}>
                <div style={{
                  height: 4, borderRadius: 2, width: `${Math.min(100, util.utilizationPct)}%`,
                  background: isFull ? "#ef4444" : util.utilizationPct > 70 ? "#f59e0b" : room.color,
                  transition: "width 0.3s",
                }} />
              </div>

              {/* Stats */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                <span style={{ color: "rgba(167,177,195,0.4)" }}>{util.appointments.length} {t("surgeries_short") || "OPs"}</span>
                <span style={{ color: "rgba(167,177,195,0.4)" }}>{util.totalGrafts.toLocaleString(fmLocale())} / {room.capacity.toLocaleString(fmLocale())} {t("grafts_label_ui")}</span>
              </div>

              {/* Equipment tags */}
              <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
                {room.equipment.map(eq => (
                  <span key={eq} style={{
                    fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                    background: "rgba(255,255,255,0.03)", color: "rgba(167,177,195,0.3)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}>{eq}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Room detail: appointments in selected room */}
      {selectedRoom && (
        <div style={{
          padding: 14, borderRadius: 10,
          background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            {opRooms.find(r => r.id === selectedRoom)?.name || selectedRoom}
          </div>
          {(roomUtil[selectedRoom]?.appointments || []).length === 0 ? (
            <div style={{ fontSize: 12, color: "rgba(167,177,195,0.25)", padding: "8px 0" }}>{t("no_appointments_room") || "Keine Termine in diesem Raum"}</div>
          ) : (
            (roomUtil[selectedRoom]?.appointments || []).map(a => (
              <div key={a.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 10px", borderRadius: 6, marginBottom: 4,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)",
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(232,238,252,0.8)" }}>{a.patient || a.title || "Patient"}</div>
                  <div style={{ fontSize: 10, color: "rgba(167,177,195,0.35)" }}>
                    {a.time || "—"} · {a.treatment || "—"} · {a.grafts || a.estimatedGrafts || "—"} {t("grafts_label_ui")}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Assign unassigned to this room */}
          {unassigned.length > 0 && (
            <div style={{ marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#ff8a2a", marginBottom: 6 }}>{t("room_unassigned_label") || "Ohne Raum-Zuweisung:"}</div>
              {unassigned.map(a => (
                <div key={a.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 10px", borderRadius: 6, marginBottom: 3,
                  background: "rgba(255,138,42,0.03)", border: "1px solid rgba(255,138,42,0.08)",
                }}>
                  <span style={{ fontSize: 11, color: "rgba(232,238,252,0.7)" }}>{a.patient || a.title} · {a.grafts || "—"} {t("grafts_label_ui")}</span>
                  <button onClick={() => {
                    onAssignRoom?.(a.id, selectedRoom);
                    showT?.(`${a.patient || "Termin"} → ${opRooms.find(r => r.id === selectedRoom)?.name}`);
                  }} style={{
                    padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    background: "rgba(76,201,255,0.06)", border: "1px solid rgba(76,201,255,0.12)", color: "#4cc9ff",
                  }}>{t("doc_assign") || "Zuweisen"}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
