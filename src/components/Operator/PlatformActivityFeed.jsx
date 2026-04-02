import React, { useState, useEffect, useCallback } from "react";
import * as api from "../../api/client";
import { timeAgo } from "../../utils/helpers";

/**
 * PlatformActivityFeed — Live activity feed showing recent platform events.
 * Shows: new patients, bookings, review requests, automation runs, messages.
 * Limit: last 50 events. Auto-refreshes every 30s.
 */

const ACTIVITY_META = {
  patient_created:     { icon: "\u{1F464}", color: "#4cc9ff", label: "New Patient" },
  booking_created:     { icon: "\u{1F4C5}", color: "#c4a6ff", label: "Booking Created" },
  review_request:      { icon: "⚕️", color: "#ff8a2a", label: "Review Request" },
  automation_run:      { icon: "⚡",       color: "#ffcf40", label: "Automation" },
  message_received:    { icon: "\u{1F4AC}", color: "#25D366", label: "Message" },
  message_sent:        { icon: "\u{1F4E4}", color: "#8899b0", label: "Outbound" },
  invoice_created:     { icon: "\u{1F4B0}", color: "#22c55e", label: "Invoice" },
  payment_received:    { icon: "\u{1F4B3}", color: "#22c55e", label: "Payment" },
  bot_handover:        { icon: "\u{1F514}", color: "#ff8a2a", label: "Bot Handover" },
  clinic_created:      { icon: "\u{1F3E5}", color: "#00B4D8", label: "New Clinic" },
  whatsapp_connected:  { icon: "\u{1F4AC}", color: "#25D366", label: "WhatsApp Connected" },
  user_login:          { icon: "\u{1F511}", color: "#8899b0", label: "Login" },
  default:             { icon: "⚙️", color: "#8899b0", label: "Event" },
};

function getMeta(type) {
  return ACTIVITY_META[type] || ACTIVITY_META.default;
}

export default function PlatformActivityFeed({ limit = 50 }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      // Use unified logs as primary event source
      const res = await api.getUnifiedLogs({ limit });
      const logs = res?.logs || res?.data || (Array.isArray(res) ? res : []);
      setEvents(logs.slice(0, limit));
    } catch {
      setEvents([]);
    }
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchEvents();
    const iv = setInterval(fetchEvents, 30000);
    return () => clearInterval(iv);
  }, [fetchEvents]);

  if (loading) return <div style={{ padding: 16, textAlign: "center", color: "#8888aa", fontSize: 13 }}>Loading activity...</div>;

  if (events.length === 0) {
    return <div style={{ padding: 20, textAlign: "center", color: "#666", fontSize: 13 }}>No recent activity</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {events.map((evt, i) => {
        const meta = getMeta(evt.event_type || evt.type || evt.action);
        const clinic = evt.organization_name || evt.clinic_name || evt.org_name || "";
        const desc = evt.description || evt.message || evt.details || evt.action || "";

        return (
          <div
            key={evt.id || i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 8,
              background: "var(--bg-section)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: meta.color + "15",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14,
            }}>
              {meta.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {desc || meta.label}
              </div>
              {clinic && <span style={{ fontSize: 11, color: "#666" }}>{clinic}</span>}
            </div>
            <span style={{ fontSize: 10, color: "#555", whiteSpace: "nowrap", flexShrink: 0 }}>
              {evt.created_at ? timeAgo(evt.created_at) : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
