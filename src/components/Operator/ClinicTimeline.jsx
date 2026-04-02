import React, { useState, useEffect } from "react";
import * as api from "../../api/client";
import { timeAgo } from "../../utils/helpers";

/**
 * ClinicTimeline — Vertical timeline showing events for a specific clinic.
 * Events: clinic created, whatsapp connected, bot activated, patient created,
 * booking created, review request sent, automation run, etc.
 */

const EVENT_META = {
  clinic_created:       { icon: "\u{1F3E5}", color: "#00B4D8", label: "Clinic Created" },
  whatsapp_connected:   { icon: "\u{1F4AC}", color: "#25D366", label: "WhatsApp Connected" },
  bot_activated:        { icon: "\u{1F916}", color: "#22c55e", label: "Bot Activated" },
  patient_created:      { icon: "\u{1F464}", color: "#4cc9ff", label: "Patient Created" },
  booking_created:      { icon: "\u{1F4C5}", color: "#c4a6ff", label: "Booking Created" },
  review_request:       { icon: "⚕️", color: "#ff8a2a", label: "Review Requested" },
  automation_run:       { icon: "⚡", color: "#ffcf40", label: "Automation Run" },
  invoice_created:      { icon: "\u{1F4B0}", color: "#22c55e", label: "Invoice Created" },
  message_sent:         { icon: "\u{1F4E4}", color: "#8899b0", label: "Message Sent" },
  provisioning:         { icon: "\u{1F680}", color: "#00B4D8", label: "Provisioning" },
  subscription_change:  { icon: "\u{1F4B3}", color: "#c4a6ff", label: "Subscription Change" },
  appointment_cancelled_by_patient: { icon: "\u{274C}", color: "#ef4444", label: "Termin storniert" },
  appointment_booked_by_bot: { icon: "\u{1F4C5}", color: "#22c55e", label: "Termin gebucht" },
  default:              { icon: "⚙️", color: "#8899b0", label: "Event" },
};

function getEventMeta(type) {
  return EVENT_META[type] || EVENT_META.default;
}

export default function ClinicTimeline({ orgId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.getClinicEvents(orgId, { limit: 50 });
        const evts = res?.events || res?.data || (Array.isArray(res) ? res : []);
        if (!cancelled) setEvents(evts);
      } catch {
        if (!cancelled) setEvents([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: "#8888aa" }}>Loading timeline...</div>;
  if (events.length === 0) return <div style={{ padding: 24, textAlign: "center", color: "#666" }}>No events yet for this clinic.</div>;

  return (
    <div style={{ position: "relative", paddingLeft: 32 }}>
      {/* Vertical line */}
      <div style={{ position: "absolute", left: 13, top: 8, bottom: 8, width: 2, background: "var(--border-default)", borderRadius: 1 }} />

      {events.map((evt, i) => {
        const meta = getEventMeta(evt.type || evt.event_type);
        return (
          <div key={evt.id || i} style={{ position: "relative", marginBottom: 16, paddingLeft: 16 }}>
            {/* Dot */}
            <div style={{
              position: "absolute", left: -24, top: 4,
              width: 24, height: 24, borderRadius: 12,
              background: meta.color + "22",
              border: `2px solid ${meta.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, zIndex: 1,
            }}>
              {meta.icon}
            </div>
            {/* Content */}
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: "var(--bg-card-solid)", border: "1px solid var(--border-default)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                <span style={{ fontSize: 11, color: "#666" }}>{evt.created_at ? timeAgo(evt.created_at) : ""}</span>
              </div>
              {(evt.description || evt.details || evt.message) && (
                <div style={{ fontSize: 12, color: "#aaa" }}>{evt.description || evt.details || evt.message}</div>
              )}
              {evt.user_name && (
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>by {evt.user_name}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
