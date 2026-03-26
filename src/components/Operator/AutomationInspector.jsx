import React from "react";
import { timeAgo } from "../../utils/helpers";

/**
 * AutomationInspector — Extends the operator Automations tab.
 * Shows: last run, success rate, failures, queue length per queue.
 * Does NOT modify existing automations logic.
 * Rendered inside TabAutomations as an additional section.
 */

const S = {
  card: { background: '#23234a', borderRadius: 12, padding: 20, marginBottom: 16 },
  kpiLabel: { fontSize: 11, color: '#8888aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  accent: '#00B4D8',
};

const badge = (color, text) => (
  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + '22', color }}>{text}</span>
);

export default function AutomationInspector({ queueStats, recentJobs }) {
  const queues = queueStats?.queues || [];
  const jobs = recentJobs?.jobs || [];

  if (queues.length === 0 && jobs.length === 0) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={S.card}>
        <div style={S.kpiLabel}>Automation Inspector</div>

        {/* Per-queue stats */}
        {queues.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
            {queues.map(q => {
              const total = (q.completed || 0) + (q.failed || 0) + (q.dead_letter || 0);
              const successRate = total > 0 ? ((q.completed || 0) / total * 100).toFixed(1) : 100;
              const rateColor = successRate >= 95 ? S.green : successRate >= 80 ? S.yellow : S.red;

              return (
                <div key={q.queue_name} style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{q.queue_name}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#666" }}>Success Rate</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: rateColor }}>{successRate}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#666" }}>Queue Length</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: (q.pending || 0) > 20 ? S.yellow : "#fff" }}>{q.pending || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#666" }}>Failures</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: (q.failed || 0) > 0 ? S.red : S.green }}>{q.failed || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#666" }}>Completed</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: S.green }}>{q.completed || 0}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent job timeline */}
        {jobs.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ ...S.kpiLabel, marginBottom: 8 }}>Recent Runs</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {jobs.slice(0, 10).map(j => {
                const statusColor = j.status === "completed" ? S.green
                  : j.status === "failed" || j.status === "dead_letter" ? S.red
                  : j.status === "running" ? S.accent
                  : S.yellow;

                return (
                  <div key={j.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.02)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: statusColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#ccc", flex: 1 }}>{j.job_type || j.queue_name}</span>
                    <span style={{ fontSize: 11, color: "#888" }}>{j.org_name || ""}</span>
                    {badge(statusColor, j.status)}
                    <span style={{ fontSize: 10, color: "#555" }}>{j.created_at ? timeAgo(j.created_at) : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
