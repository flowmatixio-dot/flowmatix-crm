/**
 * Global Badge Color System
 * Single source of truth for all badge/status colors across the CRM.
 */

// Status colors
export const STATUS_COLORS = {
  // Confirmed / Paid / Completed
  confirmed: { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.25)" },
  paid: { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.25)" },
  completed: { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.25)" },

  // In Progress / Evaluation
  in_progress: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "rgba(251,191,36,0.25)" },
  evaluation: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "rgba(251,191,36,0.25)" },
  needs_review: { bg: "rgba(255,138,42,0.12)", color: "#ff8a2a", border: "rgba(255,138,42,0.25)" },

  // Critical / Needs Action
  critical: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", border: "rgba(239,68,68,0.25)" },
  human_takeover: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", border: "rgba(239,68,68,0.25)" },

  // AI Active
  ai_active: { bg: "rgba(76,201,255,0.12)", color: "#4cc9ff", border: "rgba(76,201,255,0.25)" },
  collecting: { bg: "rgba(76,201,255,0.12)", color: "#4cc9ff", border: "rgba(76,201,255,0.25)" },

  // Neutral
  neutral: { bg: "rgba(167,177,195,0.08)", color: "rgba(167,177,195,0.5)", border: "rgba(167,177,195,0.15)" },
};

// Task type colors
export const TASK_COLORS = {
  chat: { bg: "rgba(239,68,68,0.08)", color: "#ef4444", border: "rgba(239,68,68,0.15)", dot: "#ef4444" },
  hotel: { bg: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "rgba(251,191,36,0.15)", dot: "#fbbf24" },
  driver: { bg: "rgba(59,130,246,0.08)", color: "#3b82f6", border: "rgba(59,130,246,0.15)", dot: "#3b82f6" },
  dsgvo: { bg: "rgba(167,139,250,0.08)", color: "#a78bfa", border: "rgba(167,139,250,0.15)", dot: "#a78bfa" },
  followup: { bg: "rgba(167,177,195,0.06)", color: "rgba(167,177,195,0.5)", border: "rgba(167,177,195,0.1)", dot: "rgba(167,177,195,0.4)" },
  flight: { bg: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "rgba(251,191,36,0.15)", dot: "#fbbf24" },
  cancel: { bg: "rgba(239,68,68,0.08)", color: "#ef4444", border: "rgba(239,68,68,0.15)", dot: "#ef4444" },
  deposit: { bg: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "rgba(251,191,36,0.15)", dot: "#fbbf24" },
  flight_wait: { bg: "rgba(167,177,195,0.06)", color: "rgba(167,177,195,0.5)", border: "rgba(167,177,195,0.1)", dot: "rgba(167,177,195,0.4)" },
};

// Logistics badge colors (NOT red)
export const LOGISTICS_COLORS = {
  driver_missing: { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
  hotel_missing: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
  flight_missing: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
};

// Time badge colors (for waiting time display)
export function getTimeBadgeColor(days) {
  if (days <= 1) return { bg: "rgba(167,177,195,0.08)", color: "rgba(167,177,195,0.5)" };
  if (days <= 7) return { bg: "rgba(251,191,36,0.08)", color: "#fbbf24" };
  return { bg: "rgba(239,68,68,0.08)", color: "#ef4444" };
}

// Task group definitions
export const TASK_GROUPS = [
  { key: "chat", label: "Chat übernehmen", icon: "💬" },
  { key: "hotel", label: "Hotel zuweisen", icon: "🏨" },
  { key: "driver", label: "Fahrer zuweisen", icon: "🚗" },
  { key: "dsgvo", label: "DSGVO Zustimmung", icon: "📋" },
  { key: "followup", label: "Follow-up", icon: "📞" },
  { key: "flight", label: "Flugdaten", icon: "✈️" },
  { key: "cancel", label: "Stornierung", icon: "❌" },
  { key: "deposit", label: "Anzahlung", icon: "💳" },
  { key: "flight_wait", label: "Warte auf Flugdaten", icon: "⏳" },
];
