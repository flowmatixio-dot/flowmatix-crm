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
//
// Tuning rationale:
//   BASE 40  → fresh signup feels active, not "almost done"
//   +5 each  → 12 capabilities × 5 = 60 → max BASE+60 = 100% only
//             when literally everything is configured. Realistic
//             trial users land at 50–70% which leaves room to grow.
const BASE = 40;
const CAPABILITY_WEIGHT = 5;
const CAPABILITIES = [
  "bot_responding",   // clinic_agent_config exists — always true after signup
  "demo_executed",    // localStorage flag set when player first opens
  "general",          // clinic stamm-data complete
  "treatments",       // ≥1 treatment
  "doctor",           // ≥1 doctor
  "booking_rules",
  "team",
  "drivers",
  "payments",
  "two_factor",
  "automations",
  "integrations",
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

  // Capability map. Seed-default backend flags are ignored on purpose
  // (the user wants the system to feel like THEY built it up, not like
  // it was already done by signup defaults). Each capability is only
  // counted when the user explicitly clicked through it via
  // AdvancedSetupCard, which writes localStorage `fm_setup_done_<key>`.
  // bot_responding is the only "free" baseline (the bot really IS
  // responding from day 1) and demo_executed is set when the player
  // first opens.
  let demoExecuted = false;
  try { demoExecuted = localStorage.getItem("fm_demo_tour_seen") === "1"; } catch {}
  const userMarked = (key) => {
    try { return localStorage.getItem(`fm_setup_done_${key}`) === "1"; } catch { return false; }
  };

  const flags = {
    bot_responding:  true,
    demo_executed:   demoExecuted,
    general:         userMarked("general"),
    treatments:      userMarked("treatments"),
    doctor:          userMarked("doctor_assignment"),
    booking_rules:   userMarked("booking_rules"),
    team:            userMarked("team"),
    drivers:         userMarked("drivers"),
    payments:        userMarked("payments"),
    two_factor:      userMarked("two_factor"),
    automations:     userMarked("automations"),
    integrations:    false,
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
      <div style={{ marginTop: 10, fontSize: 11, color: "rgba(167,177,195,0.6)", lineHeight: 1.5, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: "#10b981", flexShrink: 0, animation: "fmPulseGreen 2s infinite" }} />
        {T(
          "Your system is already responding to requests automatically.",
          "Dein System beantwortet bereits Anfragen automatisch.",
          "Sisteminiz talepleri zaten otomatik olarak yanıtlıyor."
        )}
      </div>
    </div>
  );
}
