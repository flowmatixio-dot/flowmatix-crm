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

// Base level — every signed-up clinic gets this for free. Reframes
// the indicator from "you have a lot to do" to "your system is
// already running, optimization adds bonus performance". Clamps to
// 100 so the bar never overflows even when all capabilities are on.
const BASE = 50;

// Each capability adds +10 when its flag is true. With BASE=50, the
// user starts at 50% on day one and a single optimization bumps them
// straight to 60%. All 7 enabled = 120 → clamped to 100.
const CAPABILITY_WEIGHT = 10;
const CAPABILITIES = [
  "bot_responding",  // clinic_agent_config exists — always true after signup
  "demo_executed",   // localStorage flag set when player first opens
  "booking_rules",
  "automations",
  "integrations",
  "drivers",
  "team",
];

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

  // Capability map: backend flags + local flag for "demo executed".
  // bot_responding is implicit: every signed-up org has a
  // clinic_agent_config row, so the bot is responding from day 1.
  const advancedSteps = (status.advanced && status.advanced.steps) || {};
  let demoExecuted = false;
  try { demoExecuted = localStorage.getItem("fm_demo_tour_seen") === "1"; } catch {}

  const flags = {
    bot_responding:  true,  // always — clinic_agent_config seeded at signup
    demo_executed:   demoExecuted,
    booking_rules:   !!advancedSteps.booking_rules,
    automations:     !!advancedSteps.automations,
    integrations:    !!advancedSteps.integrations,
    drivers:         !!advancedSteps.drivers,
    team:            !!advancedSteps.team,
  };

  let earned = 0;
  for (const key of CAPABILITIES) {
    if (flags[key]) earned += CAPABILITY_WEIGHT;
  }
  const pct = Math.min(100, BASE + earned);

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
            `Your system is running – ${pct}% optimized`,
            `Dein System läuft – ${pct}% optimiert`,
            `Sisteminiz çalışıyor – %${pct} optimize`
          )}
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
