import React from "react";

/**
 * ClinicHealthBadge — Computed health score for a clinic.
 *
 * Score formula:
 *   100
 *   -20 if WhatsApp disconnected
 *   -20 if calendar missing
 *   -20 if AI bot paused
 *   -20 if queue errors
 *   -20 if webhook failures
 *
 * Display: 🟢 Healthy (80-100), 🟡 Warning (40-79), 🔴 Critical (0-39)
 */

export function computeHealthScore(clinic) {
  let score = 100;

  // WhatsApp connected?
  const waConnected = clinic.whatsapp_connected
    ?? clinic.wa_connected
    ?? (clinic.provisioning_status === 'completed');
  if (!waConnected) score -= 20;

  // Calendar connected?
  const calConnected = clinic.calendar_connected
    ?? clinic.google_connected
    ?? false;
  if (!calConnected) score -= 20;

  // AI bot running?
  const botRunning = clinic.bot_active
    ?? clinic.ai_active
    ?? (clinic.provisioning_status === 'completed');
  if (!botRunning) score -= 20;

  // Queue health (errors > 0)
  const queueErrors = clinic.queue_errors ?? clinic.failed_jobs ?? 0;
  if (queueErrors > 0) score -= 20;

  // Webhook failures
  const webhookErrors = clinic.webhook_failures ?? clinic.webhook_errors ?? 0;
  if (webhookErrors > 0) score -= 20;

  return Math.max(0, score);
}

export function healthLabel(score) {
  if (score >= 80) return { emoji: "\u{1F7E2}", text: "Healthy", color: "#22c55e" };
  if (score >= 40) return { emoji: "\u{1F7E1}", text: "Warning", color: "#eab308" };
  return { emoji: "\u{1F534}", text: "Critical", color: "#ef4444" };
}

export default function ClinicHealthBadge({ clinic }) {
  const score = computeHealthScore(clinic);
  const { emoji, text, color } = healthLabel(score);

  return (
    <span
      title={`Health: ${score}/100 — ${text}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        background: color + "22",
        color,
        whiteSpace: "nowrap",
      }}
    >
      {emoji} {score}
    </span>
  );
}
