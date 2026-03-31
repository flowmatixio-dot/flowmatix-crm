import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { Section, HBar } from "../shared/index";
import { INVOICE_STATUS } from "../../data/constants";
import { timeAgo, fmLocale } from "../../utils/helpers";
import { exportPatientsToSheets, exportRevenueToSheets, isAuthenticated } from "../../api/client";

const TREAT_PRICES = { "FUE": 3500, "DHI": 4500, "FUE Saphir": 4000, "Bart": 3000, "Augenbrauen": 2500, "PRP": 800 };
const TREAT_COLORS = { "FUE": "#4cc9ff", "DHI": "#a78bfa", "FUE Saphir": "#06b6d4", "Bart": "#f59e0b", "Augenbrauen": "#ec4899", "PRP": "#10b981" };


const TABS = [
  { id: "overview", icon: "📊", label: "overview_tab", fallback: "Übersicht" },
  { id: "invoices", icon: "🧾", label: "invoices_tab", fallback: "Rechnungen" },
  { id: "exports", icon: "📤", label: "exports_tab", fallback: "Exporte" },
];

export default function RevenueView() {
  const {
    invoices, myLeads, myAppts, clinic, activeClinicId, openPatient, showT,
    markInvoicePaid, generateInvoicePDF, generateStripeLink, createInvoice,
    exportRevenue, t,
  } = useApp();

  const plan = clinic?.plan || "core";
  const isCorePlan = plan === "core";
  const [tab, setTab] = useState("overview");
  const [filter, setFilter] = useState("all");
  const [newInvOpen, setNewInvOpen] = useState(false);
  const [newInvLead, setNewInvLead] = useState("");
  const [newInvItems, setNewInvItems] = useState("");
  const [newInvNet, setNewInvNet] = useState("");
  const [newInvVat, setNewInvVat] = useState("8");
  const [exportMonth, setExportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const clinicInvoices = invoices.filter(i => (i.clinicId === activeClinicId || !i.clinicId) && (i.gross > 0 || i.patient));
  const patientsWithFinancials = myLeads.filter(l => l.financials);

  // KPIs
  const kpis = useMemo(() => {
    const invRevenue = clinicInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.gross || 0), 0);
    const patRevenue = patientsWithFinancials.filter(l => l.financials.paymentStatus === "paid").reduce((s, l) => s + l.financials.treatmentPrice, 0);
    const invDeposits = clinicInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.depositAmount || 0), 0);
    const patDeposits = patientsWithFinancials.reduce((s, l) => s + (l.financials.depositAmount || 0), 0);
    const invPending = clinicInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + (i.gross || 0), 0);
    const patPending = patientsWithFinancials.filter(l => l.financials.paymentStatus !== "paid").reduce((s, l) => {
      const rem = l.financials.treatmentPrice - (l.financials.depositAmount || 0);
      return s + (rem > 0 ? rem : 0);
    }, 0);
    const overdueCount = clinicInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled" && new Date(i.dueDate) < new Date()).length;
    const completedTreatments = myLeads.filter(l => l.stage === "done").length;
    const paidInvCount = clinicInvoices.filter(i => i.status === "paid").length + patientsWithFinancials.filter(l => l.financials.paymentStatus === "paid").length;
    const avgTicket = paidInvCount > 0 ? Math.round((invRevenue + patRevenue) / paidInvCount) : 0;
    const totalLeads = myLeads.length;
    const conversionRate = totalLeads > 0 ? Math.round((completedTreatments / totalLeads) * 100) : 0;
    return { revenue: invRevenue + patRevenue, deposits: invDeposits + patDeposits, pending: invPending + patPending, overdueCount, completedTreatments, paidInvCount, avgTicket, depositsReceived: patientsWithFinancials.filter(l => l.financials.depositStatus === "paid").length, patientsPending: patientsWithFinancials.filter(l => l.financials.paymentStatus !== "paid").length, conversionRate };
  }, [clinicInvoices, patientsWithFinancials, myLeads]);

  // Revenue by month (last 6 months)
  const monthlyRevenue = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString(fmLocale(), { month: "short" });
      const inv = clinicInvoices.filter(iv => iv.status === "paid" && iv.paidDate?.startsWith(key)).reduce((s, iv) => s + (iv.gross || 0), 0);
      const pat = patientsWithFinancials.filter(l => l.financials.paymentStatus === "paid").reduce((s, l) => {
        const hasPaidThisMonth = l.timeline?.some(te => te.type === "finance" && te.time?.startsWith(d.toLocaleDateString(fmLocale(), { month: "short" })));
        return hasPaidThisMonth ? s + l.financials.treatmentPrice : s;
      }, 0);
      months.push({ key, label, total: inv + pat });
    }
    return months;
  }, [clinicInvoices, patientsWithFinancials]);
  const maxMonthRev = Math.max(...monthlyRevenue.map(m => m.total), 1);

  // Invoice filtering
  const filtered = filter === "all" ? clinicInvoices
    : filter === "paid" ? clinicInvoices.filter(i => i.status === "paid")
    : filter === "pending" ? clinicInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled")
    : clinicInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled" && new Date(i.dueDate) < new Date());

  const filterBtns = [
    { id: "all", label: t("all"), count: clinicInvoices.length },
    { id: "paid", label: t("paid"), count: clinicInvoices.filter(i => i.status === "paid").length },
    { id: "pending", label: t("pending"), count: clinicInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled").length },
    { id: "overdue", label: t("overdue"), count: clinicInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled" && new Date(i.dueDate) < new Date()).length },
  ];

  // Payment method breakdown
  const paymentMethods = useMemo(() => {
    const methods = {};
    clinicInvoices.filter(i => i.status === "paid").forEach(i => {
      const m = i.paidMethod || "unknown";
      methods[m] = (methods[m] || 0) + (i.gross || 0);
    });
    patientsWithFinancials.filter(l => l.financials.paymentStatus === "paid").forEach(l => {
      const lastPayment = l.timeline?.findLast(te => te.type === "finance" && te.text?.includes("received"));
      const m = lastPayment?.text?.includes("card") ? "card" : lastPayment?.text?.includes("cash") ? "cash" : lastPayment?.text?.includes("Stripe") ? "stripe" : "other";
      methods[m] = (methods[m] || 0) + l.financials.treatmentPrice;
    });
    return Object.entries(methods).map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount);
  }, [clinicInvoices, patientsWithFinancials]);
  const totalMethodAmount = paymentMethods.reduce((s, m) => s + m.amount, 0) || 1;
  const methodColors = { card: "#4cc9ff", cash: "#10b981", stripe: "#a78bfa", manual: "#fbbf24", other: "#ff8a2a", unknown: "#6b7280" };

  const handleCreateInvoice = () => {
    if (!newInvLead || !newInvNet) { showT(t("select_patient_amount")); return; }
    const net = parseFloat(newInvNet);
    if (isNaN(net) || net <= 0) { showT(t("enter_valid_amount")); return; }
    createInvoice(newInvLead, newInvItems || "Treatment", net, parseInt(newInvVat) || 0);
    setNewInvOpen(false); setNewInvLead(""); setNewInvItems(""); setNewInvNet(""); setNewInvVat("8");
  };

  const inp = { width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" };

  return <div style={{ padding: 28, }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{t("revenue")||"Umsatz"}</h1>
      {tab === "invoices" && <button onClick={() => setNewInvOpen(!newInvOpen)} style={{ padding: "8px 18px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>+ {t("create_invoice")}</button>}
    </div>
    <p style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", margin: "0 0 20px" }}>{t("revenue_subtitle")||"Zahlungen, Anzahlungen und Rechnungen verfolgen"}</p>

    {/* Sub-tab navigation */}
    <div style={{ display: "flex", gap: 4, marginBottom: 24, padding: 4, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", width: "fit-content" }}>
      {TABS.map(tb => <button key={tb.id} onClick={() => setTab(tb.id)} style={{
        padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        background: tab === tb.id ? "rgba(76,201,255,0.1)" : "transparent",
        border: tab === tb.id ? "1px solid rgba(76,201,255,0.2)" : "1px solid transparent",
        color: tab === tb.id ? "#4cc9ff" : "rgba(167,177,195,0.7)", transition: "all .15s",
        display: "flex", alignItems: "center", gap: 6,
      }}>{tb.icon} {t(tb.label)||tb.fallback}</button>)}
    </div>

    {/* ═══ OVERVIEW TAB ═══ */}
    {tab === "overview" && <>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 28 }}>
        <div style={{ padding: 18, borderRadius: 16, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(16,185,129,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{t("revenue_label")||"UMSATZ"}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#10b981", fontFamily: "'Plus Jakarta Sans',monospace" }}>€{kpis.revenue.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginTop: 4 }}>{kpis.paidInvCount} {t("completed")||"abgeschlossen"}</div>
        </div>
        <div style={{ padding: 18, borderRadius: 16, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.15)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(76,201,255,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{t("deposits")||"Deposits"}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#4cc9ff", fontFamily: "'Plus Jakarta Sans',monospace" }}>€{kpis.deposits.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginTop: 4 }}>{kpis.depositsReceived} {t("deposits_received")||"erhalten"}</div>
        </div>
        <div style={{ padding: 18, borderRadius: 16, background: "rgba(255,138,42,0.04)", border: "1px solid rgba(255,138,42,0.15)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,138,42,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{t("outstanding_payments_title")||"Outstanding"}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#ff8a2a", fontFamily: "'Plus Jakarta Sans',monospace" }}>€{kpis.pending.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginTop: 4 }}>{kpis.patientsPending} {t("patients_pending")||"ausstehend"}</div>
        </div>
        <div style={{ padding: 18, borderRadius: 16, background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(251,191,36,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{t("stat_avg_price") || "Ø OP-PREIS"}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fbbf24", fontFamily: "'Plus Jakarta Sans',monospace" }}>€{kpis.avgTicket.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginTop: 4 }}>{kpis.completedTreatments} {t("treatments_done")||"Behandlungen"}</div>
        </div>
        <div style={{ padding: 18, borderRadius: 16, background: "rgba(167,107,255,0.04)", border: "1px solid rgba(167,107,255,0.15)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,107,255,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>CONVERSION</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#a78bfa", fontFamily: "'Plus Jakarta Sans',monospace" }}>{kpis.conversionRate}%</div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginTop: 4 }}>{kpis.completedTreatments}/{myLeads.length} {t("leads")||"Leads"}</div>
        </div>
      </div>

      {/* Revenue Chart + Payment Methods */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* Monthly Revenue Bar Chart */}
        <div style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>{t("monthly_revenue_6mo")||"REVENUE · LAST 6 MONTHS"}</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
            {monthlyRevenue.map((m, i) => {
              const h = Math.max(4, (m.total / maxMonthRev) * 120);
              return <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: m.total > 0 ? "#10b981" : "rgba(167,177,195,0.7)" }}>
                  {m.total > 0 ? `€${(m.total / 1000).toFixed(1)}k` : "—"}
                </div>
                <div style={{ width: "100%", maxWidth: 40, height: h, borderRadius: 6, background: m.total > 0 ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${m.total > 0 ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.06)"}`, transition: "height .3s" }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(167,177,195,0.6)" }}>{m.label}</div>
              </div>;
            })}
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>{t("payment_methods")||"PAYMENT METHODS"}</div>
          {paymentMethods.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "rgba(167,177,195,0.7)", fontSize: 13 }}>{t("no_payments_yet")}</div>}
          {paymentMethods.map(pm => {
            const pct = Math.round((pm.amount / totalMethodAmount) * 100);
            const color = methodColors[pm.method] || methodColors.other;
            return <div key={pm.method} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "rgba(232,238,252,0.95)", textTransform: "capitalize" }}>{pm.method}</span>
                <span style={{ fontWeight: 700, color }}>€{pm.amount.toLocaleString()} ({pct}%)</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: 5, borderRadius: 3, background: color, width: `${pct}%`, transition: "width .5s" }} />
              </div>
            </div>;
          })}
        </div>
      </div>

      {/* Quick Overdue Alert */}
      {/* Outstanding payments alert */}
      {kpis.pending > 0 && <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,138,42,0.04)", border: "1px solid rgba(255,138,42,0.15)", marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#ff8a2a" }}>{t("outstanding_payments_title")||"Ausstehende Zahlungen"}</div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", marginTop: 2 }}>€{kpis.pending.toLocaleString()} {t("outstanding_amount_desc")||"offen"}</div>
        </div>
        <button onClick={() => { setTab("invoices"); setFilter("pending"); }} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, background: "rgba(255,138,42,0.08)", border: "1px solid rgba(255,138,42,0.2)", color: "#ff8a2a", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("show_details")||"Details anzeigen"}</button>
      </div>}

      {/* Patient Payment Status */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{t("rev_patient_payment_status")||"Patient Payment Status"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
        <div style={{ padding: 18, borderRadius: 16, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)", textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(16,185,129,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{t("rev_paid_patients")||"Paid Patients"}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#10b981" }}>{patientsWithFinancials.filter(l => l.financials.paymentStatus === "paid").length}</div>
        </div>
        <div style={{ padding: 18, borderRadius: 16, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.15)", textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(76,201,255,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{t("rev_deposit_patients")||"Deposit Patients"}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#4cc9ff" }}>{patientsWithFinancials.filter(l => l.financials.depositStatus === "paid").length}</div>
        </div>
        <div style={{ padding: 18, borderRadius: 16, background: "rgba(255,138,42,0.04)", border: "1px solid rgba(255,138,42,0.15)", textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,138,42,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{t("rev_outstanding_patients")||"Outstanding Patients"}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#ff8a2a" }}>{patientsWithFinancials.filter(l => l.financials.paymentStatus !== "paid").length}</div>
        </div>
      </div>

      {/* Recent Payments Quick List */}
      <Section title={t("recent_payments")||"RECENT PAYMENTS"}>
        {clinicInvoices.filter(i => i.status === "paid").slice(0, 5).map(inv => (
          <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 6, fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>💰</span>
              <div>
                <div style={{ fontWeight: 600 }}>{inv.patientName}</div>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)" }}>{inv.treatment} · {inv.paidDate ? timeAgo(inv.paidDate) : "—"}</div>
              </div>
            </div>
            <div style={{ fontWeight: 800, color: "#10b981" }}>€{(inv.gross || 0).toLocaleString()}</div>
          </div>
        ))}
        {clinicInvoices.filter(i => i.status === "paid").length === 0 && <div style={{ textAlign: "center", padding: 30, color: "rgba(167,177,195,0.6)" }}>{t("no_payments_received_yet")}</div>}
      </Section>

      {/* ── Revenue Forecast ── */}
      <RevenueInsights myLeads={myLeads} myAppts={myAppts} invoices={clinicInvoices} patientsWithFinancials={patientsWithFinancials} />
    </>}

    {/* ═══ INVOICES TAB ═══ */}
    {tab === "invoices" && <>
      {/* Create Invoice Form */}
      {newInvOpen && <div style={{ marginBottom: 20, padding: 20, borderRadius: 14, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>{t("new_invoice")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 4 }}>{t("patient")}</div>
            <select value={newInvLead} onChange={e => setNewInvLead(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              <option value="">{t("select_patient_placeholder")}</option>
              {myLeads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.treatment}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 4 }}>{t("net_amount_eur")}</div>
            <input value={newInvNet} onChange={e => setNewInvNet(e.target.value)} placeholder="2400" type="number" style={inp} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 4 }}>{t("items_description")}</div>
            <textarea value={newInvItems} onChange={e => setNewInvItems(e.target.value)} rows={2} placeholder="FUE Hair Transplant 3000 grafts&#10;Hotel Package" style={{ ...inp, resize: "vertical" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 4 }}>{t("vat_percent")}</div>
            <select value={newInvVat} onChange={e => setNewInvVat(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              <option value="0">0%</option>
              <option value="7">7%</option>
              <option value="8">8%</option>
              <option value="19">19%</option>
              <option value="20">20%</option>
            </select>
            {newInvNet && <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginTop: 6 }}>
              {t("gross")}: €{(parseFloat(newInvNet || 0) * (1 + parseInt(newInvVat || 0) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleCreateInvoice} style={{ padding: "8px 18px", borderRadius: 8, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("create_invoice")}</button>
          <button onClick={() => setNewInvOpen(false)} style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.7)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("cancel")}</button>
        </div>
      </div>}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {filterBtns.map(fb => <button key={fb.id} onClick={() => setFilter(fb.id)} style={{ padding: "6px 14px", borderRadius: 8, background: filter === fb.id ? "rgba(76,201,255,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${filter === fb.id ? "rgba(76,201,255,0.25)" : "rgba(255,255,255,0.08)"}`, color: filter === fb.id ? "#4cc9ff" : "rgba(167,177,195,0.6)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          {fb.label} <span style={{ fontSize: 10, opacity: 0.7 }}>({fb.count})</span>
        </button>)}
      </div>

      {/* Invoice table header */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr 0.8fr 0.8fr auto", gap: 8, marginBottom: 8, fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", padding: "0 12px" }}>
        <div>{t("patient")}</div><div>{t("invoice")}</div><div>{t("amount")}</div><div>{t("status")}</div><div>{t("date")}</div><div>{t("actions")}</div>
      </div>

      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "rgba(167,177,195,0.6)" }}>{t("no_invoices_match_filter")}</div>}
      {filtered.map(inv => {
        const is = INVOICE_STATUS[inv.status] || INVOICE_STATUS.sent;
        const isOverdue = inv.status !== "paid" && inv.status !== "cancelled" && new Date(inv.dueDate) < new Date();
        const statusToUse = isOverdue ? INVOICE_STATUS.overdue : is;
        return <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr 0.8fr 0.8fr auto", gap: 8, padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 6, alignItems: "center", fontSize: 13 }}>
          <div>
            <div style={{ fontWeight: 600 }}>{inv.patientName}</div>
            <div style={{ fontSize: 11, color: "rgba(167,177,195,0.7)" }}>{inv.treatment}</div>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(167,177,195,0.7)" }}>{inv.nr}</div>
          <div style={{ fontWeight: 700 }}>€{(inv.gross || 0).toLocaleString()}</div>
          <span style={{ padding: "3px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: `${statusToUse.color}18`, color: statusToUse.color, justifySelf: "start" }}>{statusToUse.icon} {statusToUse.label}</span>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)" }}>{new Date(inv.created).toLocaleDateString()}</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => generateInvoicePDF(inv)} title="PDF" style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", color: "#4cc9ff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📄</button>
            {inv.status !== "paid" && <button onClick={() => generateStripeLink(inv)} title="Payment Link" style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(167,107,255,0.08)", border: "1px solid rgba(167,107,255,0.15)", color: "#a78bfa", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>💳</button>}
            {inv.status !== "paid" && <button onClick={() => markInvoicePaid(inv.id, "manual")} title="Mark Paid" style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", color: "#10b981", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✓</button>}
            {inv.leadId && <button onClick={() => openPatient(inv.leadId)} title="Patient" style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.6)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>👤</button>}
          </div>
        </div>;
      })}

      {/* Invoice Summary */}
      {clinicInvoices.length > 0 && <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: "rgba(167,177,195,0.7)" }}>{clinicInvoices.length} {clinicInvoices.length !== 1 ? t("invoices_total") : t("invoice_total")}</span>
        <div style={{ display: "flex", gap: 20 }}>
          <span style={{ color: "#10b981", fontWeight: 700 }}>{t("paid")}: €{clinicInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.gross || 0), 0).toLocaleString()}</span>
          <span style={{ color: "#fbbf24", fontWeight: 700 }}>{t("open")}: €{clinicInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + (i.gross || 0), 0).toLocaleString()}</span>
        </div>
      </div>}
    </>}

    {/* ═══ EXPORTS TAB ═══ */}
    {tab === "exports" && <>
      {/* Google Sheets Export */}
      {isAuthenticated() && <div style={{ padding: 24, borderRadius: 16, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 20, position: "relative", opacity: isCorePlan ? 0.45 : 1, pointerEvents: isCorePlan ? "none" : "auto" }}>
        {isCorePlan && <div style={{ position: "absolute", top: 10, right: 14, background: "rgba(255,138,42,0.12)", border: "1px solid rgba(255,138,42,0.25)", borderRadius: 8, padding: "3px 10px", fontSize: 10, fontWeight: 800, color: "#ff8a2a", letterSpacing: "0.05em", zIndex: 2 }}>PRO</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>{"📊"}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{t("google_sheets_export")}</div>
            <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)" }}>{t("google_sheets_export_desc")}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={async () => {
            try {
              showT(t("creating_spreadsheet"));
              const res = await exportPatientsToSheets();
              if (res.url) window.open(res.url, "_blank");
              showT(`${t("patient_list_exported")} (${res.patientCount} ${t("patients")})`);
            } catch (e) { showT(e.message || t("export_failed")); }
          }} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            {"👥"} {t("export_patients")}
          </button>
          <button onClick={async () => {
            try {
              showT(t("creating_spreadsheet"));
              const res = await exportRevenueToSheets(exportMonth);
              if (res.url) window.open(res.url, "_blank");
              showT(`${t("revenue_exported")} (${res.appointmentCount} ${t("appointments")}, €${res.totalRevenue})`);
            } catch (e) { showT(e.message || t("export_failed")); }
          }} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            {"💰"} {t("export_revenue")}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "rgba(167,177,195,0.75)", marginTop: 10 }}>{t("requires_google_sheets_connection")}</div>
      </div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* DATEV Export */}
        <div style={{ padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>🇩🇪</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{t("datev_export")}</div>
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)" }}>{t("datev_export_desc")}</div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 4 }}>{t("month")}</div>
            <input type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)} style={{ ...inp, width: 200, cursor: "pointer" }} />
          </div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.6)", marginBottom: 12 }}>
            {t("datev_export_detail")}
          </div>
          <button onClick={() => exportRevenue("datev")} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t("export_datev_csv")}</button>
        </div>

        {/* Standard CSV Export */}
        <div style={{ padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>📊</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{t("csv_export")}</div>
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)" }}>{t("csv_export_desc")}</div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 4 }}>{t("month")}</div>
            <input type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)} style={{ ...inp, width: 200, cursor: "pointer" }} />
          </div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.6)", marginBottom: 12 }}>
            {t("csv_export_detail")}
          </div>
          <button onClick={() => exportRevenue("csv")} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t("export_csv_btn")}</button>
        </div>
      </div>

      {/* Invoice PDF Export */}
      <Section title={t("invoice_pdfs")}>
        <div style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", marginBottom: 14 }}>{t("generate_pdf_invoices_desc")}</div>
        {clinicInvoices.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "rgba(167,177,195,0.6)" }}>{t("no_invoices_to_export")}</div>}
        {clinicInvoices.map(inv => (
          <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 6, fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(167,177,195,0.6)" }}>{inv.nr}</span>
              <span style={{ fontWeight: 600 }}>{inv.patientName}</span>
              <span style={{ color: "rgba(167,177,195,0.6)" }}>€{(inv.gross || 0).toLocaleString()}</span>
            </div>
            <button onClick={() => generateInvoicePDF(inv)} style={{ padding: "5px 12px", borderRadius: 7, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", color: "#4cc9ff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>📄 PDF</button>
          </div>
        ))}
      </Section>

      {/* Export Info */}
      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", fontSize: 12, color: "rgba(167,177,195,0.75)" }}>
        💡 {t("export_info_text")}
      </div>
    </>}
  </div>;
}

/* ─── Revenue Insights Sub-Component ─── */
function RevenueInsights({ myLeads, myAppts, invoices, patientsWithFinancials }) {
  const { t } = useApp();
  const fmtEur = (n) => `€${n.toLocaleString("de-DE")}`;

  // Revenue Forecast from booked surgeries
  const forecast = useMemo(() => {
    const booked = myLeads.filter(l => l.stage === "booked");
    const bookedValue = booked.reduce((s, l) => {
      const p = l.financials?.treatmentPrice || l.budget || TREAT_PRICES[(l.treatment || "").split(" ")[0]] || 3000;
      return s + (typeof p === "number" ? p : parseInt(String(p).replace(/[^\d]/g, ""), 10) || 3000);
    }, 0);
    const depositsReceived = patientsWithFinancials.reduce((s, l) => s + (l.financials?.depositAmount || 0), 0);
    const outstanding = bookedValue - depositsReceived;
    const pipelineAll = myLeads.filter(l => l.stage !== "done").reduce((s, l) => {
      const p = l.financials?.treatmentPrice || l.budget || TREAT_PRICES[(l.treatment || "").split(" ")[0]] || 3000;
      return s + (typeof p === "number" ? p : parseInt(String(p).replace(/[^\d]/g, ""), 10) || 3000);
    }, 0);
    return { bookedValue, depositsReceived, outstanding: Math.max(0, outstanding), pipelineTotal: pipelineAll };
  }, [myLeads, patientsWithFinancials]);

  // Revenue per Doctor
  const doctorRevenue = useMemo(() => {
    const map = {};
    myAppts.forEach(a => {
      const doc = a.doctorName || a.doctor_name || a.doctor;
      if (!doc) return;
      const price = a.price ? Number(a.price) : (TREAT_PRICES[a.treatment] || 3000);
      if (!map[doc]) map[doc] = { revenue: 0, ops: 0 };
      map[doc].revenue += price;
      map[doc].ops += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [myAppts]);
  const maxDocRev = doctorRevenue.length > 0 ? doctorRevenue[0][1].revenue : 1;

  // Revenue per Treatment
  const treatmentRevenue = useMemo(() => {
    const map = {};
    [...myAppts, ...myLeads.filter(l => l.stage === "booked" || l.stage === "done")].forEach(item => {
      const _tr = item.treatment || item.treatmentType || (t("rev_other") || "Sonstige");
      const key = _tr.split(" ")[0] || (t("rev_other") || "Sonstige"); // Normalize to first word
      const price = item.price ? Number(item.price) : (item.financials?.treatmentPrice || TREAT_PRICES[key] || 3000);
      if (!map[key]) map[key] = { revenue: 0, count: 0 };
      map[key].revenue += typeof price === "number" ? price : 3000;
      map[key].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [myAppts, myLeads]);
  const maxTreatRev = treatmentRevenue.length > 0 ? treatmentRevenue[0][1].revenue : 1;

  // Revenue by Country
  const countryRevenue = useMemo(() => {
    const map = {};
    myLeads.forEach(l => {
      const country = l.country || l.nationality || (t("rev_unknown") || "Unbekannt");
      const price = l.financials?.treatmentPrice || l.budget || TREAT_PRICES[(l.treatment || "").split(" ")[0]] || 3000;
      const p = typeof price === "number" ? price : parseInt(String(price).replace(/[^\d]/g, ""), 10) || 3000;
      if (!map[country]) map[country] = { revenue: 0, count: 0 };
      map[country].revenue += p;
      map[country].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8);
  }, [myLeads]);
  const maxCountryRev = countryRevenue.length > 0 ? countryRevenue[0][1].revenue : 1;

  const cardStyle = { padding: 18, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" };
  const labelStyle = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 };

  return (
    <>
      {/* ── Revenue Forecast ── */}
      <Section title={t("rev_forecast") || "UMSATZPROGNOSE"}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <div style={{ ...cardStyle, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <div style={{ ...labelStyle, color: "rgba(16,185,129,0.6)" }}>{t("rev_booked_ops")||"Booked Ops"}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>{fmtEur(forecast.bookedValue)}</div>
          </div>
          <div style={{ ...cardStyle, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.15)" }}>
            <div style={{ ...labelStyle, color: "rgba(76,201,255,0.6)" }}>{t("deposits")||"Deposits"}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#4cc9ff" }}>{fmtEur(forecast.depositsReceived)}</div>
          </div>
          <div style={{ ...cardStyle, background: "rgba(255,138,42,0.04)", border: "1px solid rgba(255,138,42,0.15)" }}>
            <div style={{ ...labelStyle, color: "rgba(255,138,42,0.6)" }}>{t("rev_outstanding")||"Outstanding"}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#ff8a2a" }}>{fmtEur(forecast.outstanding)}</div>
          </div>
          <div style={{ ...cardStyle, background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.15)" }}>
            <div style={{ ...labelStyle, color: "rgba(167,139,250,0.6)" }}>{t("rev_pipeline_total")||"Pipeline Total"}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>{fmtEur(forecast.pipelineTotal)}</div>
          </div>
        </div>
      </Section>

      {/* ── Revenue per Doctor + Treatment ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* Per Doctor */}
        <div style={cardStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>{t("revenue_per_doctor")||"Revenue per Doctor"}</div>
          {doctorRevenue.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "rgba(167,177,195,0.7)", fontSize: 12 }}>{t("no_data_yet")||"No data yet"}</div>}
          {doctorRevenue.map(([doc, data]) => (
            <div key={doc} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "rgba(232,238,252,0.95)" }}>{doc}</span>
                <span style={{ fontWeight: 700, color: "#10b981" }}>{fmtEur(data.revenue)} <span style={{ color: "rgba(167,177,195,0.75)", fontWeight: 500 }}>({data.ops} OPs)</span></span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: 5, borderRadius: 3, background: "#10b981", width: `${Math.round((data.revenue / maxDocRev) * 100)}%`, transition: "width .5s" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Per Treatment */}
        <div style={cardStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>{t("revenue_per_treatment")||"Revenue per Treatment"}</div>
          {treatmentRevenue.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "rgba(167,177,195,0.7)", fontSize: 12 }}>{t("no_data_yet")||"No data yet"}</div>}
          {treatmentRevenue.map(([treat, data]) => {
            const color = TREAT_COLORS[treat] || "#4cc9ff";
            return (
              <div key={treat} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 3, height: 12, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: "rgba(232,238,252,0.95)" }}>{treat}</span>
                  </div>
                  <span style={{ fontWeight: 700, color }}>{fmtEur(data.revenue)} <span style={{ color: "rgba(167,177,195,0.75)", fontWeight: 500 }}>({data.count}x)</span></span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                  <div style={{ height: 5, borderRadius: 3, background: color, width: `${Math.round((data.revenue / maxTreatRev) * 100)}%`, transition: "width .5s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Revenue by Country ── */}
      {countryRevenue.length > 0 && (
        <Section title={t("rev_by_country") || "UMSATZ NACH LAND"}>
          <div style={cardStyle}>
            {countryRevenue.map(([country, data]) => (
              <div key={country} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: "rgba(232,238,252,0.95)" }}>{country} <span style={{ color: "rgba(167,177,195,0.75)", fontWeight: 500 }}>({data.count} Leads)</span></span>
                  <span style={{ fontWeight: 700, color: "#a78bfa" }}>{fmtEur(data.revenue)}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                  <div style={{ height: 5, borderRadius: 3, background: "#a78bfa", width: `${Math.round((data.revenue / maxCountryRev) * 100)}%`, transition: "width .5s" }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
