import React, { useState, useEffect } from "react";
import * as api from "../../api/client";
import { timeAgo } from "../../utils/helpers";
import { computeHealthScore, healthLabel } from "./ClinicHealthBadge";

/**
 * SupportCenter — Operator support page.
 * Shows clinic support requests, bot issues, setup problems.
 * Allows opening the clinic CRM directly (impersonate).
 */

const S = {
  card: { background: '#23234a', borderRadius: 12, padding: 20, marginBottom: 16 },
  kpiLabel: { fontSize: 11, color: '#8888aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  accent: '#00B4D8',
  green: '#22c55e',
  yellow: '#ffcf40',
  red: '#ef4444',
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #333366', color: '#8888aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  td: { padding: '10px 12px', borderBottom: '1px solid #1e1e3e', color: '#ccc' },
};

const badge = (color, text) => (
  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + '22', color }}>{text}</span>
);

export default function SupportCenter() {
  const [clinics, setClinics] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState("all"); // all, critical, warning, setup
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [clinicRes, incidentRes] = await Promise.allSettled([
          api.getPlatformClinics({ limit: 100 }),
          api.getIncidents({ limit: 30, status: "active" }),
        ]);
        if (!cancelled) {
          setClinics(clinicRes.status === "fulfilled" ? (clinicRes.value?.clinics || []) : []);
          setIncidents(incidentRes.status === "fulfilled" ? (incidentRes.value?.incidents || incidentRes.value?.data || []) : []);
        }
      } catch {
        // silent
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleImpersonate = async (orgId, orgName) => {
    try {
      const reason = prompt(`Reason for opening ${orgName} CRM (min 5 chars):`);
      if (!reason || reason.length < 5) return;
      const res = await api.impersonateClinic(orgId, reason);
      setActionMsg({ type: "ok", text: `Impersonating ${res.impersonation?.targetUser || orgName} — expires in ${res.impersonation?.expiresIn || "30 min"}` });
    } catch (err) {
      setActionMsg({ type: "err", text: err.message });
    }
  };

  // Compute health and categorize clinics
  const clinicRows = clinics.map(c => ({
    ...c,
    healthScore: computeHealthScore(c),
    health: healthLabel(computeHealthScore(c)),
  }));

  const setupIncomplete = clinicRows.filter(c => c.provisioning_status !== "completed" && c.provisioning_status !== "active");
  const criticalClinics = clinicRows.filter(c => c.healthScore < 40);
  const warningClinics = clinicRows.filter(c => c.healthScore >= 40 && c.healthScore < 80);

  const filteredClinics = filter === "critical" ? criticalClinics
    : filter === "warning" ? warningClinics
    : filter === "setup" ? setupIncomplete
    : clinicRows;

  if (loading) return <div style={{ padding: 32, textAlign: "center", color: "#8888aa" }}>Loading...</div>;

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Support Center</h2>

      {actionMsg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${actionMsg.type === "ok" ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: actionMsg.type === "ok" ? S.green : S.red }}>{actionMsg.text}</div>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <div style={S.card} onClick={() => setFilter("all")} role="button" tabIndex={0}>
          <div style={S.kpiLabel}>Total Clinics</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>{clinicRows.length}</div>
        </div>
        <div style={{ ...S.card, cursor: "pointer" }} onClick={() => setFilter("critical")}>
          <div style={S.kpiLabel}>Critical</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: S.red }}>{criticalClinics.length}</div>
        </div>
        <div style={{ ...S.card, cursor: "pointer" }} onClick={() => setFilter("warning")}>
          <div style={S.kpiLabel}>Warnings</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: S.yellow }}>{warningClinics.length}</div>
        </div>
        <div style={{ ...S.card, cursor: "pointer" }} onClick={() => setFilter("setup")}>
          <div style={S.kpiLabel}>Setup Incomplete</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: S.accent }}>{setupIncomplete.length}</div>
        </div>
      </div>

      {/* Active incidents */}
      {incidents.length > 0 && (
        <div style={{ ...S.card, borderLeft: `3px solid ${S.red}` }}>
          <div style={S.kpiLabel}>Active Incidents</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {incidents.map(inc => (
              <div key={inc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <span style={{ fontSize: 14 }}>{"\u{1F6A8}"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: S.red }}>{inc.title || inc.message}</div>
                  {inc.affected_clinic && <div style={{ fontSize: 11, color: "#888" }}>{inc.affected_clinic}</div>}
                </div>
                <span style={{ fontSize: 11, color: "#666" }}>{inc.created_at ? timeAgo(inc.created_at) : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinic table */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={S.kpiLabel}>
            {filter === "all" ? "All Clinics" : filter === "critical" ? "Critical Clinics" : filter === "warning" ? "Warning Clinics" : "Setup Incomplete"}
            {" "}({filteredClinics.length})
          </div>
          {filter !== "all" && (
            <button onClick={() => setFilter("all")} style={{ background: "none", border: "none", color: S.accent, fontSize: 12, cursor: "pointer" }}>Show all</button>
          )}
        </div>
        {filteredClinics.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#666" }}>No clinics in this category</div>
        ) : (
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Clinic</th>
              <th style={S.th}>Health</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Provisioning</th>
              <th style={S.th}>Created</th>
              <th style={S.th}>Actions</th>
            </tr></thead>
            <tbody>
              {filteredClinics.map(c => (
                <tr key={c.id}>
                  <td style={S.td}>
                    <span style={{ color: "#fff", fontWeight: 600 }}>{c.name}</span>
                    {c.email && <><br /><span style={{ fontSize: 11, color: "#666" }}>{c.email}</span></>}
                  </td>
                  <td style={S.td}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: c.health.color + "22", color: c.health.color }}>
                      {c.health.emoji} {c.healthScore}
                    </span>
                  </td>
                  <td style={S.td}>{badge(c.is_active ? S.green : "#8899b0", c.is_active ? "active" : "inactive")}</td>
                  <td style={S.td}>{badge(c.provisioning_status === "completed" ? S.green : S.yellow, c.provisioning_status || "pending")}</td>
                  <td style={S.td}>{c.created_at ? timeAgo(c.created_at) : "-"}</td>
                  <td style={S.td}>
                    <button
                      onClick={() => handleImpersonate(c.id, c.name)}
                      style={{ padding: "4px 12px", borderRadius: 8, border: "none", background: S.accent + "22", color: S.accent, fontWeight: 600, fontSize: 11, cursor: "pointer" }}
                    >
                      Open CRM
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
