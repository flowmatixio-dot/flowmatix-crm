import React, { useState, useEffect } from "react";
import * as api from "../../api/client";
import PlatformAlerts from "./PlatformAlerts";
import PlatformActivityFeed from "./PlatformActivityFeed";

/**
 * PlatformDashboard — Global operator dashboard widget.
 * Shows: MRR, Active Clinics, Leads Today, Bookings Today, Automation Success Rate.
 * Embeds PlatformAlerts and PlatformActivityFeed.
 */

const S = {
  card: { background: '#23234a', borderRadius: 12, padding: 20, marginBottom: 16 },
  kpi: { fontSize: 28, fontWeight: 800, color: '#fff' },
  kpiLabel: { fontSize: 11, color: '#8888aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  green: '#22c55e',
  yellow: '#ffcf40',
  red: '#ef4444',
  accent: '#00B4D8',
};

const fmtEur = (cents) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);

export default function PlatformDashboard({ operatorData }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getPlatformStats();
        if (!cancelled) setStats(res);
      } catch {
        // Fallback to what OperatorPanel already loaded
        if (!cancelled) setStats(null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Merge data from operatorData (already loaded by OperatorPanel) and fresh stats
  const ov = operatorData?.overview || {};
  const st = stats || operatorData?.platformStats || {};

  const mrr = ov.totalMrr || ov.mrr || st.mrr || 0;
  const activeClinics = ov.activeClinics ?? ov.clinicCount ?? st.activeClinics ?? 0;
  const leadsToday = st.leadsToday ?? st.patientsToday ?? 0;
  const bookingsToday = st.bookingsToday ?? st.appointmentsToday ?? 0;
  const autoRate = st.automationSuccessRate ?? 100;

  return (
    <div>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={S.card}>
          <div style={S.kpiLabel}>MRR</div>
          <div style={S.kpi}>{fmtEur(mrr)}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Active Clinics</div>
          <div style={S.kpi}>{activeClinics}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Leads Today</div>
          <div style={S.kpi}>{leadsToday}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Bookings Today</div>
          <div style={S.kpi}>{bookingsToday}</div>
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Automation Rate</div>
          <div style={{ ...S.kpi, color: autoRate >= 95 ? S.green : autoRate >= 80 ? S.yellow : S.red }}>
            {autoRate}%
          </div>
        </div>
      </div>

      {/* Two-column: Alerts + Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={S.card}>
          <div style={{ ...S.kpiLabel, marginBottom: 12 }}>Alert Center</div>
          <PlatformAlerts maxAlerts={10} />
        </div>
        <div style={S.card}>
          <div style={{ ...S.kpiLabel, marginBottom: 12 }}>Live Activity</div>
          <PlatformActivityFeed limit={15} />
        </div>
      </div>
    </div>
  );
}
