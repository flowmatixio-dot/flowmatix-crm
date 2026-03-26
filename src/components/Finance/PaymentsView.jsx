import { useState, useMemo, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { apiFetch } from "../../api/client";
import { fmLocale } from "../../utils/helpers";

const T = (en, de, tr) => ({ en, de, tr }[localStorage.getItem("fm_lang") || "de"] || de);

const DEPOSIT_STATUSES = {
  not_required: { label: T("Not required", "Nicht erforderlich", "Gerekli değil"), color: "#6b7280", icon: "—" },
  pending:      { label: T("Pending", "Ausstehend", "Bekliyor"),         color: "#f59e0b", icon: "⏳" },
  proof_uploaded:{ label: T("Proof uploaded", "Beleg hochgeladen", "Belge yüklendi"), color: "#4cc9ff", icon: "📎" },
  confirmed:    { label: T("Confirmed", "Bestätigt", "Onaylandı"),          color: "#10b981", icon: "✓" },
  failed:       { label: T("Failed", "Fehlgeschlagen", "Başarısız"),     color: "#ef4444", icon: "✕" },
  refunded:     { label: T("Refunded", "Erstattet", "İade edildi"),          color: "#a78bfa", icon: "↩" },
};

const FILTERS = [
  { id: "all", label: T("All", "Alle", "Tümü") },
  { id: "pending", label: T("Pending", "Ausstehend", "Bekliyor") },
  { id: "proof_uploaded", label: T("Proof available", "Beleg vorhanden", "Belge mevcut") },
  { id: "confirmed", label: T("Confirmed", "Bestätigt", "Onaylandı") },
  { id: "failed", label: T("Failed", "Fehlgeschlagen", "Başarısız") },
];

export default function PaymentsView() {
  const { myLeads, myAppts, clinic, activeClinicId, showT, t, userRole } = useApp();
  const isAdmin = userRole === "admin";
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(null);
  const [proofModal, setProofModal] = useState(null);

  // Build payment list from patients with financials or appointments
  const payments = useMemo(() => {
    const list = [];
    for (const lead of myLeads) {
      const fin = lead.financials || {};
      const appt = myAppts.find(a =>
        (a.patientName || a.patient || "").toLowerCase() === (lead.first_name || lead.name || "").toLowerCase()
      );
      const depositEnabled = clinic?.depositEnabled || clinic?.bookingFunnel !== "no_deposit";
      const depositStatus = fin.depositStatus || (depositEnabled ? "pending" : "not_required");
      const treatmentPrice = fin.treatmentPrice || lead.price || appt?.price || 0;
      const depositAmount = fin.depositAmount || (depositEnabled ? Math.round(treatmentPrice * (clinic?.depositPercentage || 25) / 100) : 0);

      list.push({
        id: lead.id,
        name: lead.first_name || lead.name || lead.full_name || "—",
        email: lead.email || "",
        treatment: lead.treatment || appt?.treatment || "—",
        treatmentPrice,
        depositAmount,
        depositStatus,
        currency: fin.currency || clinic?.depositCurrency || "EUR",
        paymentStatus: fin.paymentStatus || "pending",
        proofUrl: fin.proofFileUrl || lead.deposit_proof_url || null,
        proofUploadedAt: fin.proofUploadedAt || null,
        appointmentDate: appt?.date || lead.appointment_date || null,
        stage: lead.stage,
        createdAt: lead.created_at,
      });
    }
    return list.sort((a, b) => {
      const order = { pending: 0, proof_uploaded: 1, failed: 2, confirmed: 3, not_required: 4, refunded: 5 };
      return (order[a.depositStatus] ?? 9) - (order[b.depositStatus] ?? 9);
    });
  }, [myLeads, myAppts, clinic]);

  const filtered = useMemo(() => {
    let list = payments;
    if (filter !== "all") list = list.filter(p => p.depositStatus === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
    }
    return list;
  }, [payments, filter, search]);

  // KPIs
  const kpis = useMemo(() => {
    const withDeposit = payments.filter(p => p.depositStatus !== "not_required");
    return {
      total: payments.length,
      pending: withDeposit.filter(p => p.depositStatus === "pending").length,
      proofUploaded: withDeposit.filter(p => p.depositStatus === "proof_uploaded").length,
      confirmed: withDeposit.filter(p => p.depositStatus === "confirmed").length,
      failed: withDeposit.filter(p => p.depositStatus === "failed").length,
      totalDeposits: withDeposit.filter(p => p.depositStatus === "confirmed").reduce((s, p) => s + p.depositAmount, 0),
      pendingAmount: withDeposit.filter(p => p.depositStatus === "pending" || p.depositStatus === "proof_uploaded").reduce((s, p) => s + p.depositAmount, 0),
    };
  }, [payments]);

  const handleStatusChange = useCallback(async (patientId, newStatus) => {
    try {
      await apiFetch(`/api/v1/crm/patients/${patientId}/deposit-status`, {
        method: "PATCH",
        body: JSON.stringify({ depositStatus: newStatus }),
      });
      showT(T("Status updated", "Status aktualisiert", "Durum güncellendi"));
      // Refresh page to reflect new status
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      showT(e.message || t("error") || "Error");
    }
  }, [showT]);

  const handleProofUpload = useCallback(async (patientId, file) => {
    setUploading(patientId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "https://api.flowmatix.io"}/api/v1/crm/patients/${patientId}/deposit-proof`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${sessionStorage.getItem("fm_access_token")}` },
          body: formData,
        }
      );
      if (!res.ok) throw new Error(T("Upload failed", "Upload fehlgeschlagen", "Yükleme başarısız"));
      showT(T("Proof uploaded", "Beleg hochgeladen", "Belge yüklendi"));
      window.dispatchEvent(new CustomEvent("fm:refresh-patients"));
    } catch (e) {
      showT(e.message || T("Upload error", "Upload-Fehler", "Yükleme hatası"));
    }
    setUploading(null);
  }, [showT]);

  const fmt = (amount, currency = "EUR") => {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(amount);
  };

  const card = { borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "18px 20px" };

  return (
    <div style={{ padding: "28px 32px", }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>
          {T("Payments & Deposits", "Zahlungen & Anzahlungen", "Ödemeler & Depozitolar")}
        </h1>
        <p style={{ fontSize: 13, color: "rgba(167,177,195,0.45)", marginTop: 4 }}>
          {T("Track deposits and payment status", "Anzahlungen und Zahlungsstatus verfolgen", "Depozito ve ödeme durumunu takip edin")}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: T("Pending", "Ausstehend", "Bekliyor"), value: kpis.pending, color: "#f59e0b" },
          { label: T("Proof uploaded", "Beleg vorhanden", "Belge var"), value: kpis.proofUploaded, color: "#4cc9ff" },
          { label: T("Confirmed", "Bestätigt", "Onaylandı"), value: kpis.confirmed, color: "#10b981" },
          { label: T("Confirmed total", "Bestätigt gesamt", "Toplam onaylanan"), value: fmt(kpis.totalDeposits), color: "#10b981", large: true },
          { label: T("Pending amount", "Ausstehender Betrag", "Bekleyen tutar"), value: fmt(kpis.pendingAmount), color: "#f59e0b", large: true },
        ].map((k, i) => (
          <div key={i} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: k.large ? 20 : 28, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            background: filter === f.id ? "rgba(76,201,255,0.1)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${filter === f.id ? "rgba(76,201,255,0.2)" : "rgba(255,255,255,0.06)"}`,
            color: filter === f.id ? "#4cc9ff" : "rgba(167,177,195,0.5)",
          }}>{f.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={T("Search patient...", "Patient suchen...", "Hasta ara...")}
          style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#fff", fontFamily: "inherit", fontSize: 12, outline: "none", width: 200 }}
        />
      </div>

      {/* Payment List */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1.2fr 0.8fr 1.5fr", gap: 8, padding: "12px 18px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <div>{T("Patient", "Patient", "Hasta")}</div>
          <div>{T("Treatment", "Behandlung", "Tedavi")}</div>
          <div>{T("Deposit", "Anzahlung", "Depozito")}</div>
          <div>{T("Date", "Datum", "Tarih")}</div>
          <div>{T("Status", "Status", "Durum")}</div>
          <div>{T("Proof", "Beleg", "Belge")}</div>
          <div>{T("Actions", "Aktionen", "İşlemler")}</div>
        </div>

        {/* Rows */}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "rgba(167,177,195,0.3)", fontSize: 13 }}>
            {T("No payments found", "Keine Zahlungen gefunden", "Ödeme bulunamadı")}
          </div>
        )}
        {filtered.map(p => {
          const st = DEPOSIT_STATUSES[p.depositStatus] || DEPOSIT_STATUSES.pending;
          return (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1.2fr 0.8fr 1.5fr", gap: 8, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center", fontSize: 13 }}>
              {/* Patient */}
              <div>
                <div style={{ fontWeight: 600, color: "rgba(232,238,252,0.85)" }}>{p.name}</div>
                {p.email && <div style={{ fontSize: 11, color: "rgba(167,177,195,0.35)", marginTop: 1 }}>{p.email}</div>}
              </div>
              {/* Treatment */}
              <div style={{ color: "rgba(167,177,195,0.6)" }}>{p.treatment}</div>
              {/* Deposit */}
              <div style={{ fontWeight: 700, color: p.depositAmount > 0 ? "#fff" : "rgba(167,177,195,0.3)" }}>
                {p.depositAmount > 0 ? fmt(p.depositAmount, p.currency) : "—"}
              </div>
              {/* Date */}
              <div style={{ color: "rgba(167,177,195,0.5)", fontSize: 12 }}>
                {p.appointmentDate ? new Date(p.appointmentDate).toLocaleDateString(fmLocale(), { day: "2-digit", month: "2-digit" }) : "—"}
              </div>
              {/* Status */}
              <div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${st.color}15`, color: st.color, border: `1px solid ${st.color}25` }}>
                  {st.icon} {st.label}
                </span>
              </div>
              {/* Proof */}
              <div>
                {p.proofUrl ? (
                  <button onClick={() => setProofModal(p)} style={{ background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", color: "#4cc9ff", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>
                    📎 {T("View", "Ansehen", "Görüntüle")}
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: "rgba(167,177,195,0.25)" }}>—</span>
                )}
              </div>
              {/* Actions */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {/* Upload proof */}
                {!p.proofUrl && (p.depositStatus === "pending" || p.depositStatus === "proof_uploaded") && (
                  <label style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,238,252,0.7)", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>
                    {uploading === p.id ? "..." : T("Upload", "Hochladen", "Yükle")}
                    <input type="file" accept="image/*,.pdf" hidden onChange={e => { if (e.target.files[0]) handleProofUpload(p.id, e.target.files[0]); }} />
                  </label>
                )}
                {/* Confirm */}
                {(p.depositStatus === "pending" || p.depositStatus === "proof_uploaded") && (isAdmin || true) && (
                  <button onClick={() => handleStatusChange(p.id, "confirmed")} style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", color: "#10b981", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>
                    ✓ {T("Confirm", "Bestätigen", "Onayla")}
                  </button>
                )}
                {/* Mark failed */}
                {p.depositStatus === "pending" && (
                  <button onClick={() => handleStatusChange(p.id, "failed")} style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", color: "#ef4444", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>
                    ✕ {T("Failed", "Fehlgeschlagen", "Başarısız")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Count */}
      <div style={{ marginTop: 12, fontSize: 11, color: "rgba(167,177,195,0.3)" }}>
        {filtered.length} {T("of", "von", "/")} {payments.length} {T("payments", "Zahlungen", "ödeme")}
      </div>

      {/* Proof Modal */}
      {proofModal && (
        <div onClick={() => setProofModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#1a2332", borderRadius: 16, padding: 24, maxWidth: 600, width: "90%", maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>
                {T("Deposit proof", "Zahlungsbeleg", "Ödeme belgesi")} — {proofModal.name}
              </h3>
              <button onClick={() => setProofModal(null)} style={{ background: "none", border: "none", color: "rgba(167,177,195,0.5)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            {proofModal.proofUrl?.endsWith(".pdf") ? (
              <iframe src={proofModal.proofUrl} style={{ width: "100%", height: 400, border: "none", borderRadius: 8 }} />
            ) : (
              <img src={proofModal.proofUrl} alt="Proof" style={{ width: "100%", borderRadius: 8, objectFit: "contain" }} />
            )}
            {proofModal.proofUploadedAt && (
              <div style={{ marginTop: 12, fontSize: 11, color: "rgba(167,177,195,0.4)" }}>
                {T("Uploaded", "Hochgeladen", "Yüklendi")}: {new Date(proofModal.proofUploadedAt).toLocaleString(fmLocale())}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
