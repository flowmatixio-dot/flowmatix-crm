import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { Stat, Section } from "../shared/index";
import { INVOICE_STATUS } from "../../data/constants";
import { timeAgo } from "../../utils/helpers";

const TABS = [
  { id: "overview", icon: "📊", label: "Overview" },
  { id: "invoices", icon: "🧾", label: "Invoices" },
  { id: "payments", icon: "💰", label: "Payments" },
  { id: "exports", icon: "📤", label: "Exports" },
];

export default function RevenueView() {
  const {
    invoices, myLeads, leads, clinic, activeClinicId, openPatient, showT,
    markInvoicePaid, generateInvoicePDF, generateStripeLink, createInvoice,
    exportRevenue, estimateRevenue, myAppts, calDate, t,
  } = useApp();

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

  const clinicInvoices = invoices.filter(i => i.clinicId === activeClinicId || !i.clinicId);
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
    return { revenue: invRevenue + patRevenue, deposits: invDeposits + patDeposits, pending: invPending + patPending, overdueCount, completedTreatments, paidInvCount, avgTicket, depositsReceived: patientsWithFinancials.filter(l => l.financials.depositStatus === "paid").length, patientsPending: patientsWithFinancials.filter(l => l.financials.paymentStatus !== "paid").length };
  }, [clinicInvoices, patientsWithFinancials, myLeads]);

  // Revenue by month (last 6 months)
  const monthlyRevenue = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en", { month: "short" });
      const inv = clinicInvoices.filter(iv => iv.status === "paid" && iv.paidDate?.startsWith(key)).reduce((s, iv) => s + (iv.gross || 0), 0);
      const pat = patientsWithFinancials.filter(l => l.financials.paymentStatus === "paid").reduce((s, l) => {
        const hasPaidThisMonth = l.timeline?.some(te => te.type === "finance" && te.time?.startsWith(d.toLocaleDateString("en", { month: "short" })));
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
    { id: "all", label: "All", count: clinicInvoices.length },
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
    if (!newInvLead || !newInvNet) { showT("Select patient and enter amount"); return; }
    const net = parseFloat(newInvNet);
    if (isNaN(net) || net <= 0) { showT("Enter a valid amount"); return; }
    createInvoice(newInvLead, newInvItems || "Treatment", net, parseInt(newInvVat) || 0);
    setNewInvOpen(false); setNewInvLead(""); setNewInvItems(""); setNewInvNet(""); setNewInvVat("8");
  };

  const inp = { width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" };

  return <div style={{ padding: 28, maxWidth: 1000 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{t("revenue")}</h1>
      {tab === "invoices" && <button onClick={() => setNewInvOpen(!newInvOpen)} style={{ padding: "8px 18px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>+ {t("create_invoice")}</button>}
    </div>
    <p style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", margin: "0 0 20px" }}>Patient billing, invoices & payment tracking</p>

    {/* Sub-tab navigation */}
    <div style={{ display: "flex", gap: 4, marginBottom: 24, padding: 4, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", width: "fit-content" }}>
      {TABS.map(tb => <button key={tb.id} onClick={() => setTab(tb.id)} style={{
        padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        background: tab === tb.id ? "rgba(76,201,255,0.1)" : "transparent",
        border: tab === tb.id ? "1px solid rgba(76,201,255,0.2)" : "1px solid transparent",
        color: tab === tb.id ? "#4cc9ff" : "rgba(167,177,195,0.5)", transition: "all .15s",
        display: "flex", alignItems: "center", gap: 6,
      }}>{tb.icon} {tb.label}</button>)}
    </div>

    {/* ═══ OVERVIEW TAB ═══ */}
    {tab === "overview" && <>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        <div style={{ padding: 18, borderRadius: 16, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(16,185,129,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{t("revenue_month")}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#10b981", fontFamily: "'Plus Jakarta Sans',monospace" }}>€{kpis.revenue.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 4 }}>{kpis.paidInvCount} completed</div>
        </div>
        <div style={{ padding: 18, borderRadius: 16, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.15)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(76,201,255,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{t("deposits_collected")}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#4cc9ff", fontFamily: "'Plus Jakarta Sans',monospace" }}>€{kpis.deposits.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 4 }}>{kpis.depositsReceived} deposits received</div>
        </div>
        <div style={{ padding: 18, borderRadius: 16, background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(251,191,36,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{t("pending_payments")}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fbbf24", fontFamily: "'Plus Jakarta Sans',monospace" }}>€{kpis.pending.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 4 }}>{kpis.patientsPending} patients pending</div>
        </div>
        <div style={{ padding: 18, borderRadius: 16, background: "rgba(167,107,255,0.04)", border: "1px solid rgba(167,107,255,0.15)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,107,255,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Avg. Ticket</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#a78bfa", fontFamily: "'Plus Jakarta Sans',monospace" }}>€{kpis.avgTicket.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 4 }}>{kpis.completedTreatments} treatments done</div>
        </div>
      </div>

      {/* Revenue Chart + Payment Methods */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* Monthly Revenue Bar Chart */}
        <div style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Monthly Revenue (6 mo)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
            {monthlyRevenue.map((m, i) => {
              const h = Math.max(4, (m.total / maxMonthRev) * 120);
              return <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: m.total > 0 ? "#10b981" : "rgba(167,177,195,0.3)" }}>
                  {m.total > 0 ? `€${(m.total / 1000).toFixed(1)}k` : "—"}
                </div>
                <div style={{ width: "100%", maxWidth: 40, height: h, borderRadius: 6, background: m.total > 0 ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${m.total > 0 ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.06)"}`, transition: "height .3s" }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(167,177,195,0.4)" }}>{m.label}</div>
              </div>;
            })}
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Payment Methods</div>
          {paymentMethods.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "rgba(167,177,195,0.3)", fontSize: 13 }}>No payments yet</div>}
          {paymentMethods.map(pm => {
            const pct = Math.round((pm.amount / totalMethodAmount) * 100);
            const color = methodColors[pm.method] || methodColors.other;
            return <div key={pm.method} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "rgba(232,238,252,0.8)", textTransform: "capitalize" }}>{pm.method}</span>
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
      {kpis.overdueCount > 0 && <div style={{ padding: 16, borderRadius: 14, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#ef4444" }}>{kpis.overdueCount} Overdue Invoice{kpis.overdueCount > 1 ? "s" : ""}</div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", marginTop: 2 }}>Review and follow up on overdue payments</div>
        </div>
        <button onClick={() => { setTab("invoices"); setFilter("overdue"); }} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>View</button>
      </div>}

      {/* Recent Payments Quick List */}
      <Section title="Recent Payments">
        {clinicInvoices.filter(i => i.status === "paid").slice(0, 5).map(inv => (
          <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 6, fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>💰</span>
              <div>
                <div style={{ fontWeight: 600 }}>{inv.patientName}</div>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)" }}>{inv.treatment} · {inv.paidDate ? timeAgo(inv.paidDate) : "—"}</div>
              </div>
            </div>
            <div style={{ fontWeight: 800, color: "#10b981" }}>€{(inv.gross || 0).toLocaleString()}</div>
          </div>
        ))}
        {clinicInvoices.filter(i => i.status === "paid").length === 0 && <div style={{ textAlign: "center", padding: 30, color: "rgba(167,177,195,0.4)" }}>No payments received yet.</div>}
      </Section>
    </>}

    {/* ═══ INVOICES TAB ═══ */}
    {tab === "invoices" && <>
      {/* Create Invoice Form */}
      {newInvOpen && <div style={{ marginBottom: 20, padding: 20, borderRadius: 14, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>New Invoice</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.5)", marginBottom: 4 }}>Patient</div>
            <select value={newInvLead} onChange={e => setNewInvLead(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              <option value="">Select patient...</option>
              {myLeads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.treatment}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.5)", marginBottom: 4 }}>Net Amount (€)</div>
            <input value={newInvNet} onChange={e => setNewInvNet(e.target.value)} placeholder="2400" type="number" style={inp} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.5)", marginBottom: 4 }}>Items / Description</div>
            <textarea value={newInvItems} onChange={e => setNewInvItems(e.target.value)} rows={2} placeholder="FUE Hair Transplant 3000 grafts&#10;Hotel Package" style={{ ...inp, resize: "vertical" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.5)", marginBottom: 4 }}>VAT %</div>
            <select value={newInvVat} onChange={e => setNewInvVat(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              <option value="0">0%</option>
              <option value="7">7%</option>
              <option value="8">8%</option>
              <option value="19">19%</option>
              <option value="20">20%</option>
            </select>
            {newInvNet && <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 6 }}>
              Gross: €{(parseFloat(newInvNet || 0) * (1 + parseInt(newInvVat || 0) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleCreateInvoice} style={{ padding: "8px 18px", borderRadius: 8, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("create_invoice")}</button>
          <button onClick={() => setNewInvOpen(false)} style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.5)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("cancel")}</button>
        </div>
      </div>}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {filterBtns.map(fb => <button key={fb.id} onClick={() => setFilter(fb.id)} style={{ padding: "6px 14px", borderRadius: 8, background: filter === fb.id ? "rgba(76,201,255,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${filter === fb.id ? "rgba(76,201,255,0.25)" : "rgba(255,255,255,0.08)"}`, color: filter === fb.id ? "#4cc9ff" : "rgba(167,177,195,0.6)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          {fb.label} <span style={{ fontSize: 10, opacity: 0.7 }}>({fb.count})</span>
        </button>)}
      </div>

      {/* Invoice table header */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr 0.8fr 0.8fr auto", gap: 8, marginBottom: 8, fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", padding: "0 12px" }}>
        <div>Patient</div><div>Invoice</div><div>Amount</div><div>Status</div><div>Date</div><div>Actions</div>
      </div>

      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "rgba(167,177,195,0.4)" }}>No invoices match this filter.</div>}
      {filtered.map(inv => {
        const is = INVOICE_STATUS[inv.status] || INVOICE_STATUS.sent;
        const isOverdue = inv.status !== "paid" && inv.status !== "cancelled" && new Date(inv.dueDate) < new Date();
        const statusToUse = isOverdue ? INVOICE_STATUS.overdue : is;
        return <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr 0.8fr 0.8fr auto", gap: 8, padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 6, alignItems: "center", fontSize: 13 }}>
          <div>
            <div style={{ fontWeight: 600 }}>{inv.patientName}</div>
            <div style={{ fontSize: 11, color: "rgba(167,177,195,0.5)" }}>{inv.treatment}</div>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(167,177,195,0.7)" }}>{inv.nr}</div>
          <div style={{ fontWeight: 700 }}>€{(inv.gross || 0).toLocaleString()}</div>
          <span style={{ padding: "3px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: `${statusToUse.color}18`, color: statusToUse.color, justifySelf: "start" }}>{statusToUse.icon} {statusToUse.label}</span>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)" }}>{new Date(inv.created).toLocaleDateString()}</div>
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
        <span style={{ color: "rgba(167,177,195,0.5)" }}>{clinicInvoices.length} invoice{clinicInvoices.length !== 1 ? "s" : ""} total</span>
        <div style={{ display: "flex", gap: 20 }}>
          <span style={{ color: "#10b981", fontWeight: 700 }}>Paid: €{clinicInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.gross || 0), 0).toLocaleString()}</span>
          <span style={{ color: "#fbbf24", fontWeight: 700 }}>Open: €{clinicInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + (i.gross || 0), 0).toLocaleString()}</span>
        </div>
      </div>}
    </>}

    {/* ═══ PAYMENTS TAB ═══ */}
    {tab === "payments" && <>
      {/* Patient Payment Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        <Stat label={t("paid")} value={`€${patientsWithFinancials.filter(l => l.financials.paymentStatus === "paid").reduce((s, l) => s + l.financials.treatmentPrice, 0).toLocaleString()}`} color="#10b981" sub={`${patientsWithFinancials.filter(l => l.financials.paymentStatus === "paid").length} patients`} />
        <Stat label="Deposits" value={`€${patientsWithFinancials.reduce((s, l) => s + (l.financials.depositAmount || 0), 0).toLocaleString()}`} color="#4cc9ff" sub={`${patientsWithFinancials.filter(l => l.financials.depositStatus === "paid").length} received`} />
        <Stat label={t("pending")} value={`€${patientsWithFinancials.filter(l => l.financials.paymentStatus !== "paid").reduce((s, l) => { const r = l.financials.treatmentPrice - (l.financials.depositAmount || 0); return s + (r > 0 ? r : 0); }, 0).toLocaleString()}`} color="#fbbf24" sub={`${patientsWithFinancials.filter(l => l.financials.paymentStatus !== "paid").length} patients`} />
      </div>

      {/* Patient Payment Table */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", padding: "0 12px" }}>
        <div>Patient</div><div>Treatment</div><div>Deposit</div><div>Remaining</div><div>Status</div>
      </div>
      {patientsWithFinancials.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "rgba(167,177,195,0.4)" }}>No patient financials yet.</div>}
      {patientsWithFinancials.map(l => {
        const f = l.financials;
        const rem = f.treatmentPrice - (f.depositAmount || 0);
        const sc = f.paymentStatus === "paid" ? "#10b981" : f.paymentStatus === "partial" ? "#fbbf24" : "rgba(167,177,195,0.5)";
        return <div key={l.id} onClick={() => openPatient(l.id)} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 6, alignItems: "center", fontSize: 13, cursor: "pointer", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(76,201,255,0.04)"; e.currentTarget.style.borderColor = "rgba(76,201,255,0.12)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
          <div><div style={{ fontWeight: 700 }}>{l.name}</div><div style={{ fontSize: 11, color: "rgba(167,177,195,0.5)" }}>{l.treatment}</div></div>
          <div style={{ fontWeight: 600 }}>€{f.treatmentPrice.toLocaleString()}</div>
          <div>{f.depositAmount > 0 ? <span style={{ color: "#10b981", fontWeight: 600 }}>€{f.depositAmount.toLocaleString()}</span> : <span style={{ color: "rgba(167,177,195,0.3)" }}>—</span>}</div>
          <div style={{ fontWeight: 600, color: rem > 0 && f.paymentStatus !== "paid" ? "#fbbf24" : "#10b981" }}>€{f.paymentStatus === "paid" ? 0 : rem.toLocaleString()}</div>
          <span style={{ padding: "3px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: `${sc}18`, color: sc, justifySelf: "start" }}>{f.paymentStatus === "paid" ? "✓ Paid" : f.paymentStatus === "partial" ? "◐ Partial" : "○ Pending"}</span>
        </div>;
      })}

      {/* Payment Timeline */}
      {patientsWithFinancials.length > 0 && <Section title="Payment Activity">
        {patientsWithFinancials.flatMap(l => (l.timeline || []).filter(te => te.type === "finance").map(te => ({ ...te, patientName: l.name, leadId: l.id }))).sort((a, b) => (b.time || "").localeCompare(a.time || "")).slice(0, 10).map((ev, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", marginBottom: 4, fontSize: 13 }}>
            <span style={{ fontSize: 14 }}>💰</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{ev.patientName}</span>
              <span style={{ color: "rgba(167,177,195,0.5)", marginLeft: 8 }}>{ev.text}</span>
            </div>
            <span style={{ fontSize: 11, color: "rgba(167,177,195,0.3)" }}>{ev.time}</span>
          </div>
        ))}
      </Section>}
    </>}

    {/* ═══ EXPORTS TAB ═══ */}
    {tab === "exports" && <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* DATEV Export */}
        <div style={{ padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>🇩🇪</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>DATEV Export</div>
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)" }}>Buchungsstapel format for German accountants</div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.5)", marginBottom: 4 }}>Month</div>
            <input type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)} style={{ ...inp, width: 200, cursor: "pointer" }} />
          </div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.4)", marginBottom: 12 }}>
            Exports appointments for selected month with estimated revenue, account numbers (10000/8400), and booking text.
          </div>
          <button onClick={() => exportRevenue("datev")} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>📥 Export DATEV CSV</button>
        </div>

        {/* Standard CSV Export */}
        <div style={{ padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>📊</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>CSV Export</div>
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)" }}>Standard spreadsheet format</div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.5)", marginBottom: 4 }}>Month</div>
            <input type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)} style={{ ...inp, width: 200, cursor: "pointer" }} />
          </div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.4)", marginBottom: 12 }}>
            Patient name, treatment, doctor, status, revenue, and invoice number. Compatible with Excel, Google Sheets.
          </div>
          <button onClick={() => exportRevenue("csv")} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>📥 Export CSV</button>
        </div>
      </div>

      {/* Invoice PDF Export */}
      <Section title="Invoice PDFs">
        <div style={{ fontSize: 13, color: "rgba(167,177,195,0.5)", marginBottom: 14 }}>Generate and print PDF invoices with your clinic branding.</div>
        {clinicInvoices.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "rgba(167,177,195,0.4)" }}>No invoices to export.</div>}
        {clinicInvoices.map(inv => (
          <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 6, fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(167,177,195,0.6)" }}>{inv.nr}</span>
              <span style={{ fontWeight: 600 }}>{inv.patientName}</span>
              <span style={{ color: "rgba(167,177,195,0.4)" }}>€{(inv.gross || 0).toLocaleString()}</span>
            </div>
            <button onClick={() => generateInvoicePDF(inv)} style={{ padding: "5px 12px", borderRadius: 7, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", color: "#4cc9ff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>📄 PDF</button>
          </div>
        ))}
      </Section>

      {/* Export Info */}
      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", fontSize: 12, color: "rgba(167,177,195,0.35)" }}>
        💡 DATEV exports follow the Buchungsstapel specification for seamless import into DATEV Unternehmen Online, Lexware, or SevDesk. CSV exports are compatible with any spreadsheet application.
      </div>
    </>}
  </div>;
}
