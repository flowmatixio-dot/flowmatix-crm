import React, { useState, useEffect } from "react";
import * as api from "../../api/client";
import { timeAgo } from "../../utils/helpers";

/**
 * PlatformAlerts — Operator alert center widget.
 * Shows: webhook failures, automation errors, queue backlog,
 * clinics with incomplete onboarding.
 */

const SEVERITY_STYLE = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", icon: "\u{1F6A8}" },
  warning:  { color: "#ffcf40", bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.2)",  icon: "⚠️" },
  info:     { color: "#00B4D8", bg: "rgba(0,180,216,0.08)",   border: "rgba(0,180,216,0.2)",   icon: "ℹ️" },
};

function getSeverityStyle(severity) {
  return SEVERITY_STYLE[severity] || SEVERITY_STYLE.info;
}

export default function PlatformAlerts({ maxAlerts = 20 }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Fetch from multiple sources in parallel
        const [alertsRes, queueRes, webhookRes, onboardingRes] = await Promise.allSettled([
          api.getAlerts({ limit: maxAlerts, status: "active" }),
          api.getQueueStats(),
          api.getWebhookStats(),
          api.getOnboarding(),
        ]);

        const combined = [];

        // Real alerts from API
        const apiAlerts = alertsRes.status === "fulfilled"
          ? (alertsRes.value?.alerts || alertsRes.value?.data || [])
          : [];
        apiAlerts.forEach(a => {
          combined.push({
            id: a.id,
            type: a.type || "alert",
            severity: a.severity || "warning",
            title: a.title || a.message || "Alert",
            detail: a.detail || a.description || "",
            ts: a.created_at || a.timestamp,
            source: "alerts",
          });
        });

        // Queue backlog alerts
        if (queueRes.status === "fulfilled" && queueRes.value?.queues) {
          queueRes.value.queues.forEach(q => {
            if (q.failed > 0 || q.dead_letter > 0) {
              combined.push({
                id: `queue-${q.queue_name}`,
                type: "queue_error",
                severity: q.dead_letter > 0 ? "critical" : "warning",
                title: `Queue "${q.queue_name}" has failures`,
                detail: `${q.failed || 0} failed, ${q.dead_letter || 0} dead letter`,
                ts: new Date().toISOString(),
                source: "queues",
              });
            }
            if ((q.pending || 0) > 50) {
              combined.push({
                id: `queue-backlog-${q.queue_name}`,
                type: "queue_backlog",
                severity: "warning",
                title: `Queue "${q.queue_name}" backlog`,
                detail: `${q.pending} pending jobs`,
                ts: new Date().toISOString(),
                source: "queues",
              });
            }
          });
        }

        // Webhook failure alerts
        if (webhookRes.status === "fulfilled") {
          const ws = webhookRes.value;
          const failRate = ws?.failureRate ?? ws?.errorRate ?? 0;
          if (failRate > 5) {
            combined.push({
              id: "webhook-errors",
              type: "webhook_failure",
              severity: failRate > 20 ? "critical" : "warning",
              title: "Elevated webhook failure rate",
              detail: `${failRate.toFixed(1)}% failure rate (24h)`,
              ts: new Date().toISOString(),
              source: "webhooks",
            });
          }
        }

        // Incomplete onboarding alerts
        if (onboardingRes.status === "fulfilled") {
          const orgs = onboardingRes.value?.organizations || onboardingRes.value?.data || [];
          const incomplete = orgs.filter(o =>
            o.provisioning_status !== "completed" && o.provisioning_status !== "active"
          );
          if (incomplete.length > 0) {
            combined.push({
              id: "onboarding-incomplete",
              type: "onboarding",
              severity: "info",
              title: `${incomplete.length} clinic(s) with incomplete onboarding`,
              detail: incomplete.slice(0, 3).map(o => o.name || o.org_name).join(", ") + (incomplete.length > 3 ? "..." : ""),
              ts: new Date().toISOString(),
              source: "onboarding",
            });
          }
        }

        // Sort: critical first, then by time
        combined.sort((a, b) => {
          const sev = { critical: 0, warning: 1, info: 2 };
          const diff = (sev[a.severity] ?? 3) - (sev[b.severity] ?? 3);
          if (diff !== 0) return diff;
          return new Date(b.ts) - new Date(a.ts);
        });

        if (!cancelled) setAlerts(combined.slice(0, maxAlerts));
      } catch {
        if (!cancelled) setAlerts([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [maxAlerts]);

  if (loading) return <div style={{ padding: 16, textAlign: "center", color: "#8888aa", fontSize: 13 }}>Loading alerts...</div>;

  if (alerts.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#22c55e", fontSize: 13, background: "rgba(34,197,94,0.05)", borderRadius: 10, border: "1px solid rgba(34,197,94,0.15)" }}>
        ✓ No active alerts — all systems healthy
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {alerts.map(a => {
        const s = getSeverityStyle(a.severity);
        return (
          <div key={a.id} style={{ padding: "10px 14px", borderRadius: 10, background: s.bg, border: `1px solid ${s.border}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{a.title}</div>
              {a.detail && <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{a.detail}</div>}
            </div>
            <span style={{ fontSize: 11, color: "#666", whiteSpace: "nowrap", flexShrink: 0 }}>{a.ts ? timeAgo(a.ts) : ""}</span>
          </div>
        );
      })}
    </div>
  );
}
