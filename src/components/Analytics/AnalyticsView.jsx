import { useMemo, useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Stat } from "../shared/index";
import * as fmApi from "../../api/client";

const TREAT_PRICES = {
  "FUE": 3500, "DHI": 4500, "FUE Saphir": 4000,
  "Bart": 3000, "Augenbrauen": 2500, "PRP": 800,
};
const TREAT_COLORS = {
  "FUE": "#4cc9ff", "DHI": "#a78bfa", "FUE Saphir": "#06b6d4",
  "Bart": "#f59e0b", "Augenbrauen": "#ec4899", "PRP": "#10b981",
};

function estimatePrice(lead) {
  if (lead.budget) return Number(lead.budget) || 0;
  if (lead.reviewData?.price) return Number(lead.reviewData.price) || 0;
  const t = (lead.treatment || "").toLowerCase();
  for (const [k, v] of Object.entries(TREAT_PRICES)) {
    if (t.includes(k.toLowerCase())) return v;
  }
  return 3000;
}

function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

/* ─── Section Header ─── */
function SectionBlock({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.6)",
        textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14,
        paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/* ─── Hero Stat (larger, emphasized) ─── */
function HeroStat({ label, value, color, sub }) {
  return (
    <div style={{
      padding: "20px 22px", borderRadius: 14,
      background: `${color}06`, border: `1px solid ${color}15`,
    }}>
      <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", fontWeight: 600, marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(167,177,195,0.7)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ─── Bar Chart Row ─── */
function BarRow({ label, value, pct, color, suffix }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: "rgba(232,238,252,0.75)" }}>{label}</span>
        <span style={{ fontWeight: 700, color, display: "flex", alignItems: "center", gap: 6 }}>
          {value}{suffix && <span style={{ fontSize: 10, color: "rgba(167,177,195,0.75)", fontWeight: 500 }}>{suffix}</span>}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.05)" }}>
        <div style={{ height: 5, borderRadius: 3, background: color, width: `${pct}%`, transition: "width .5s ease", minWidth: pct > 0 ? 4 : 0 }} />
      </div>
    </div>
  );
}

/* ─── Empty Hint ─── */
function EmptyHint({ text }) {
  return <div style={{ fontSize: 12, color: "rgba(167,177,195,0.65)", padding: "16px 0", textAlign: "center", fontStyle: "italic" }}>{text}</div>;
}

export default function AnalyticsView() {
  const { clinic, myLeads, myAppts, invoices, t } = useApp();
  if (!clinic) return null;

  const fmtEur = (n) => `€${n.toLocaleString("de-DE")}`;

  // ── Lead Performance ──
  const leadStats = useMemo(() => {
    const thisWeek = myLeads.filter(l => isThisWeek(l.createdAt));
    const thisMonth = myLeads.filter(l => isThisMonth(l.createdAt));
    const reviewsPending = myLeads.filter(l => l.convStatus === "needs_medical_review").length;
    const booked = myLeads.filter(l => l.stage === "booked" || l.stage === "done").length;
    const convRate = myLeads.length > 0 ? Math.round((booked / myLeads.length) * 100) : 0;
    return { thisWeek: thisWeek.length, thisMonth: thisMonth.length, reviewsPending, convRate, total: myLeads.length };
  }, [myLeads]);

  // ── Surgery Performance ──
  const surgeryStats = useMemo(() => {
    const surgeries = myAppts.filter(a => {
      const t = (a.treatment || a.treatmentType || "").toLowerCase();
      return ["fue", "dhi", "saphir", "bart", "augenbrauen"].some(k => t.includes(k));
    });
    const thisWeek = surgeries.filter(a => isThisWeek(a.date || a.scheduledAt));
    const thisMonth = surgeries.filter(a => isThisMonth(a.date || a.scheduledAt));
    const grafts = surgeries.filter(a => a.grafts).map(a => Number(a.grafts));
    const avgGrafts = grafts.length > 0 ? Math.round(grafts.reduce((s, g) => s + g, 0) / grafts.length) : 0;

    const docCounts = {};
    surgeries.forEach(a => {
      const doc = a.doctorName || a.doctor_name || a.doctor;
      if (doc) docCounts[doc] = (docCounts[doc] || 0) + 1;
    });
    const topDoc = Object.entries(docCounts).sort((a, b) => b[1] - a[1])[0];

    return { thisWeek: thisWeek.length, thisMonth: thisMonth.length, avgGrafts, topDoctor: topDoc ? topDoc[0] : null, topDocOps: topDoc ? topDoc[1] : 0 };
  }, [myAppts]);

  // ── Financial Performance ──
  const revenueStats = useMemo(() => {
    const monthAppts = myAppts.filter(a => isThisMonth(a.date || a.scheduledAt));
    const monthRevenue = monthAppts.reduce((s, a) => {
      const p = a.price ? Number(a.price) : (TREAT_PRICES[a.treatment] || 3000);
      return s + p;
    }, 0);
    const prices = myAppts.filter(a => a.price || a.treatment).map(a => a.price ? Number(a.price) : (TREAT_PRICES[a.treatment] || 3000));
    const avgPrice = prices.length > 0 ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0;

    const paidInvoices = (invoices || []).filter(i => i.status === "paid" && isThisMonth(i.date || i.paidAt));
    const depositsReceived = paidInvoices.reduce((s, i) => s + (Number(i.gross) || 0), 0);
    const unpaidInvoices = (invoices || []).filter(i => i.status !== "paid" && Number(i.gross) > 0);
    const outstanding = unpaidInvoices.reduce((s, i) => s + (Number(i.gross) || 0), 0);

    return { monthRevenue, avgPrice, depositsReceived, outstanding };
  }, [myAppts, invoices]);

  // ── Marketing Insights ──
  const marketingStats = useMemo(() => {
    // Countries with percentages
    const countryCounts = {};
    myLeads.forEach(l => {
      const c = l.country || l.nationality || "Unbekannt";
      countryCounts[c] = (countryCounts[c] || 0) + 1;
    });
    const totalLeads = myLeads.length || 1;
    const countryEntries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, count, pct: Math.round((count / totalLeads) * 100) }));
    // "Other" if more than 5
    const top5Total = countryEntries.reduce((s, e) => s + e.count, 0);
    const otherCount = myLeads.length - top5Total;
    if (otherCount > 0 && Object.keys(countryCounts).length > 5) {
      countryEntries.push({ country: t("rev_other") || "Sonstige", count: otherCount, pct: Math.round((otherCount / totalLeads) * 100) });
    }

    // Lead sources
    const sourceCounts = { WhatsApp: 0, Website: 0, Referral: 0, Ads: 0, Sonstige: 0 };
    myLeads.forEach(l => {
      const src = (l.source || l.channel || "").toLowerCase();
      if (src.includes("whatsapp") || l.from?.includes("@")) sourceCounts.WhatsApp++;
      else if (src.includes("web") || src.includes("site")) sourceCounts.Website++;
      else if (src.includes("refer") || src.includes("empfehlung")) sourceCounts.Referral++;
      else if (src.includes("ad") || src.includes("meta") || src.includes("google") || src.includes("facebook")) sourceCounts.Ads++;
      else sourceCounts.Sonstige++;
    });
    const sourceEntries = Object.entries(sourceCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([src, count]) => ({ src, count, pct: Math.round((count / totalLeads) * 100) }));

    // Treatment breakdown
    const treatCounts = {};
    myLeads.forEach(l => {
      const t = l.treatment;
      if (t) treatCounts[t] = (treatCounts[t] || 0) + 1;
    });
    const treatEntries = Object.entries(treatCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([treat, count]) => ({ treat, count, pct: Math.round((count / totalLeads) * 100) }));

    return { countryEntries, sourceEntries, treatEntries };
  }, [myLeads]);

  // ── Pipeline Health ──
  const pipelineStats = useMemo(() => {
    const activePipeline = myLeads.filter(l => l.stage !== "done");
    const totalValue = activePipeline.reduce((s, l) => s + estimatePrice(l), 0);
    const bookingsPending = myLeads.filter(l => l.convStatus === "booking_pending" || l.stage === "booked").length;
    const evalsPending = myLeads.filter(l => l.convStatus === "needs_medical_review").length;
    return { totalValue, bookingsPending, evalsPending, activeLeads: activePipeline.length };
  }, [myLeads]);

  const [recentVisitors, setRecentVisitors] = useState([]);
  useEffect(() => {
    fmApi.getRecentVisitors().then(rv => {
      setRecentVisitors(Array.isArray(rv) ? rv : []);
    }).catch(() => {});
  }, []);

  const SOURCE_COLORS = { WhatsApp: "#25D366", Website: "#4cc9ff", Referral: "#a78bfa", Ads: "#f59e0b", Sonstige: "rgba(167,177,195,0.6)" };
  const cardStyle = { padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" };

  return (
    <div style={{ padding: "24px 28px", }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.03em", color: "rgba(232,238,252,0.95)" }}>
        {t("analytics_title") || "Statistiken"}
      </h1>
      <p style={{ fontSize: 12, color: "rgba(167,177,195,0.6)", margin: "0 0 28px", fontWeight: 500 }}>
        {clinic.name} — {t("clinic_analytics_subtitle") || "Operative Klinik-Analytik"}
      </p>

      {/* ═══ BLOCK 1: PERFORMANCE ═══ */}
      <SectionBlock title={t("section_performance") || "Performance"}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          <HeroStat label={t("stat_lead_conversion") || "Lead → OP Konversion"} value={`${leadStats.convRate}%`} color="#a78bfa" sub={`${myLeads.filter(l => l.stage === "booked" || l.stage === "done").length} von ${leadStats.total} Leads`} />
          <Stat label={t("stat_leads_week") || "Leads diese Woche"} value={leadStats.thisWeek} color="#4cc9ff" />
          <Stat label={t("stat_leads_month") || "Leads diesen Monat"} value={leadStats.thisMonth} color="#4cc9ff" />
          <Stat label={t("reviews_open_label") || "Bewertungen offen"} value={leadStats.reviewsPending} color={leadStats.reviewsPending > 0 ? "#f59e0b" : "#10b981"} sub={leadStats.reviewsPending > 0 ? (t("doctor_action_needed") || "Arzt-Aktion nötig") : (t("all_reviewed") || "Alle bewertet")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <Stat label={t("stat_ops_week") || "OPs diese Woche"} value={surgeryStats.thisWeek} color="#10b981" />
          <Stat label={t("stat_ops_month") || "OPs diesen Monat"} value={surgeryStats.thisMonth} color="#10b981" />
          <Stat label={t("stat_avg_grafts") || "Ø Grafts pro OP"} value={surgeryStats.avgGrafts > 0 ? surgeryStats.avgGrafts.toLocaleString("de-DE") : "—"} color="#4cc9ff" sub={surgeryStats.avgGrafts === 0 ? (t("no_data_yet") || "Noch keine OP-Daten") : undefined} />
          <Stat label={t("stat_top_doctor") || "Top Arzt"} value={surgeryStats.topDoctor || "—"} color="#a78bfa" sub={surgeryStats.topDoctor ? `${surgeryStats.topDocOps} OPs` : (t("no_data_yet") || "Noch keine Zuweisungen")} />
        </div>
      </SectionBlock>

      {/* ═══ BLOCK 2: FINANCIAL ═══ */}
      <SectionBlock title={t("section_finances") || "Finanzen"}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 12 }}>
          <HeroStat label={t("analytics_revenue_month") || "Umsatz diesen Monat"} value={fmtEur(revenueStats.monthRevenue)} color="#10b981" />
          <Stat label={t("stat_avg_price") || "Ø OP-Preis"} value={revenueStats.avgPrice > 0 ? fmtEur(revenueStats.avgPrice) : "—"} color="#4cc9ff" sub={revenueStats.avgPrice === 0 ? (t("no_data_yet") || "Noch keine Preisdaten") : undefined} />
          <Stat label={t("stat_deposits") || "Anzahlungen erhalten"} value={fmtEur(revenueStats.depositsReceived)} color="#a78bfa" />
          <Stat label={t("outstanding_label") || "Ausstehend"} value={revenueStats.outstanding > 0 ? fmtEur(revenueStats.outstanding) : "€0"} color={revenueStats.outstanding > 0 ? "#ef4444" : "#10b981"} sub={revenueStats.outstanding > 0 ? (t("payments_open") || "Zahlungen offen") : (t("no_outstanding") || "Keine Außenstände")} />
        </div>
      </SectionBlock>

      {/* ═══ BLOCK 3: INSIGHTS ═══ */}
      <SectionBlock title={t("section_insights") || "Insights"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {/* Leads by Country */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t("stat_leads_by_country") || "Leads nach Land"}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.65)" }}>
                {myLeads.length} {t("total_label") || "gesamt"}
              </span>
            </div>
            {marketingStats.countryEntries.length > 0 ? (
              marketingStats.countryEntries.map(e => (
                <BarRow key={e.country} label={e.country} value={`${e.pct}%`} pct={e.pct} color="#4cc9ff" suffix={`(${e.count})`} />
              ))
            ) : (
              <EmptyHint text={t("no_country_data") || "Noch keine Länderdaten vorhanden"} />
            )}
          </div>

          {/* Treatment Breakdown */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.65)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
              {t("analytics_treatment_types") || "Behandlungstypen"}
            </div>
            {marketingStats.treatEntries.length > 0 ? (
              marketingStats.treatEntries.slice(0, 5).map(e => (
                <BarRow key={e.treat} label={e.treat} value={`${e.pct}%`} pct={e.pct} color={TREAT_COLORS[e.treat] || "#4cc9ff"} suffix={`(${e.count})`} />
              ))
            ) : (
              <EmptyHint text={t("no_treatment_trends") || "Noch keine Behandlungstrends erkannt"} />
            )}
          </div>

          {/* Lead Sources */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.65)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
              {t("stat_lead_sources") || "Lead-Quellen"}
            </div>
            {marketingStats.sourceEntries.length > 0 ? (
              marketingStats.sourceEntries.map(e => (
                <BarRow key={e.src} label={e.src} value={`${e.pct}%`} pct={e.pct} color={SOURCE_COLORS[e.src] || "#4cc9ff"} suffix={`(${e.count})`} />
              ))
            ) : (
              <EmptyHint text={t("no_source_data") || "Noch keine Quellendaten verfügbar"} />
            )}
          </div>
        </div>
        {/* Pipeline Health */}
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 12 }}>
          <HeroStat label={t("stat_pipeline_value") || "Pipeline-Gesamtwert"} value={fmtEur(pipelineStats.totalValue)} color="#10b981" sub={`${pipelineStats.activeLeads} ${t("stat_active_leads") || "aktive Leads"}`} />
          <Stat label={t("stat_active_leads") || "Aktive Leads"} value={pipelineStats.activeLeads} color="#4cc9ff" />
          <Stat label={t("stat_bookings_pending") || "Buchungen ausstehend"} value={pipelineStats.bookingsPending} color="#a78bfa" sub={pipelineStats.bookingsPending === 0 ? (t("no_data_yet") || "Keine offenen Buchungen") : undefined} />
          <Stat label={t("doctor_reviews_open") || "Arzt-Bewertungen offen"} value={pipelineStats.evalsPending} color={pipelineStats.evalsPending > 0 ? "#f59e0b" : "#10b981"} sub={pipelineStats.evalsPending === 0 ? (t("all_reviewed") || "Alle bewertet") : (t("action_needed_short") || "Aktion nötig")} />
        </div>
      </SectionBlock>

      {/* ═══ BLOCK 4: WEBSITE BESUCHER ═══ */}
      <SectionBlock title="Website Besucher">
        {recentVisitors.length === 0 ? (
          <EmptyHint text="Keine Besucherdaten vorhanden" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Zeit", "Ort", "Seite", "Gerät", "Dauer"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentVisitors.map((v, i) => {
                  const cc = (v.country_code || "").toUpperCase();
                  const flag = cc.length === 2 ? String.fromCodePoint(...[...cc].map(c => 0x1F1E6 - 65 + c.charCodeAt(0))) : "🌐";
                  const loc = [flag, v.city, cc].filter(Boolean).join(" ");
                  const page = v.pathname || "/";
                  const isMobile = /mobile|android|iphone|ipad/i.test(v.user_agent || "");
                  const dur = v.duration_seconds ? (v.duration_seconds >= 60 ? `${Math.floor(v.duration_seconds / 60)}m ${v.duration_seconds % 60}s` : `${v.duration_seconds}s`) : "—";
                  const time = v.created_at ? new Date(v.created_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "8px 10px", color: "rgba(167,177,195,0.75)" }}>{time}</td>
                      <td style={{ padding: "8px 10px", color: "rgba(232,238,252,0.85)" }}>{loc || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "rgba(167,177,195,0.75)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page}</td>
                      <td style={{ padding: "8px 10px", fontSize: 16 }}>{isMobile ? "📱" : "🖥️"}</td>
                      <td style={{ padding: "8px 10px", color: "rgba(167,177,195,0.75)" }}>{dur}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>
    </div>
  );
}
