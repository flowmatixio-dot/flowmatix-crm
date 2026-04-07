/**
 * PerformanceIndicator — small "Systemleistung: XX%" tile.
 *
 * NOT a setup progress bar. Reframes the same /onboarding-status data
 * as system capability/performance instead of mandatory setup steps.
 * Goal: subtly reward optimization without creating setup pressure.
 *
 * Reads /api/v1/clinic/onboarding-status (minimal + advanced) and
 * computes a weighted score from capabilities the system actually has.
 *
 * Position: below the demo hero / live test, above SetupCard.
 * Tone: low-emphasis, no warnings, no "noch X Schritte".
 */

import { useEffect, useState, useCallback } from "react";
import * as fmApi from "../../api/client";

const T = (en, de, tr) => ({ en, de, tr }[localStorage.getItem("fm_lang") || "de"] || de);

// Capability weights — sum should land near 100. Each capability
// contributes its weight when the corresponding flag is true.
const WEIGHTS = {
  // Required setup (counts but is not the full score)
  clinic:           8,
  treatment:        7,
  doctor:           7,
  // Demo seen — set in localStorage when the player first opens
  demo_executed:   10,
  // Advanced (optimization) capabilities
  booking_rules:   12,
  doctor_assignment: 8,
  payments:         8,
  team:             7,
  automations:     12,
  integrations:     7,
  google_drive:     7,
  drivers:          7,
};

export default function PerformanceIndicator() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fmApi.apiFetch("/api/v1/clinic/onboarding-status");
      setStatus(res || null);
    } catch (e) {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const onFocus = () => fetchStatus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchStatus]);

  if (loading || !status) return null;

  // Capability map: backend flags + local flag for "demo executed"
  const minimalSteps = (status.minimal && status.minimal.steps) || {};
  const advancedSteps = (status.advanced && status.advanced.steps) || {};
  let demoExecuted = false;
  try { demoExecuted = localStorage.getItem("fm_demo_tour_seen") === "1"; } catch {}

  const flags = {
    clinic:           !!minimalSteps.clinic,
    treatment:        !!minimalSteps.treatment,
    doctor:           !!minimalSteps.doctor,
    demo_executed:    demoExecuted,
    booking_rules:    !!advancedSteps.booking_rules,
    doctor_assignment:!!advancedSteps.doctor_assignment,
    payments:         !!advancedSteps.payments,
    team:             !!advancedSteps.team,
    automations:      !!advancedSteps.automations,
    integrations:     !!advancedSteps.integrations,
    google_drive:     !!advancedSteps.google_drive,
    drivers:          !!advancedSteps.drivers,
  };

  let earned = 0;
  let total = 0;
  for (const key of Object.keys(WEIGHTS)) {
    total += WEIGHTS[key];
    if (flags[key]) earned += WEIGHTS[key];
  }
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <div
      style={{
        padding: "14px 18px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>⚡</span>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(232,238,252,0.85)", letterSpacing: -0.1, flex: 1 }}>
          {T(
            `System performance: ${pct}%`,
            `Systemleistung: ${pct}%`,
            `Sistem performansı: %${pct}`
          )}
        </div>
        <div style={{ fontSize: 11, color: "rgba(167,177,195,0.55)", fontWeight: 500 }}>
          {T("Optimized", "Optimiert", "Optimize")}
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, #4cc9ff, #7c3aed)",
            transition: "width .3s",
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}
