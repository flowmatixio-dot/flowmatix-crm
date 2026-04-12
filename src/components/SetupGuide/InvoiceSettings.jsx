import { LockedBanner, Field, SaveBtn } from "./setupShared";

// Invoice settings — bank details, logo upload, payment flow, deposit settings (Rechnung)
export default function InvoiceSettings({ clinic, isDone, localData, setLocalData, updateClinic, showT, t }) {
  const locked = isDone("invoicing");
  const d = { bankName: clinic.bankName || "", iban: clinic.iban || "", bic: clinic.bic || "", taxId: clinic.taxId || "", vatId: clinic.vatId || "", ...localData.invoice };
  const set = (k, v) => setLocalData(prev => ({ ...prev, invoice: { ...prev.invoice, [k]: v } }));

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) { showT(t("logo_too_large")); return; }
    const reader = new FileReader();
    reader.onload = () => {
      updateClinic({ logo: reader.result });
      showT(t("saved"));
    };
    reader.readAsDataURL(file);
  };

  return <div>
    {locked && <LockedBanner t={t} />}
    <div style={{ opacity: locked ? 0.5 : 1, pointerEvents: locked ? "none" : "auto" }}>
      <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: "var(--bg-section)", border: "1px solid var(--border-default)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("clinic_logo")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {clinic.logo ? (
            <div style={{ position: "relative" }}>
              <img src={clinic.logo} alt="Logo" style={{ width: 64, height: 64, borderRadius: 10, objectFit: "contain", background: "var(--bg-card-elevated)" }} />
              <button onClick={() => updateClinic({ logo: null })} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 99, background: "#ef4444", border: "none", color: "var(--text-primary)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"✕"}</button>
            </div>
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 10, background: "var(--border-subtle)", border: "2px dashed var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "var(--text-faint)" }}>{"\u{1F5BC}"}</div>
          )}
          <div>
            <label style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(76,201,255,0.12)", border: "1px solid rgba(76,201,255,0.25)", color: "#4cc9ff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              {t("upload_logo")}
              <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleLogo} style={{ display: "none" }} />
            </label>
            <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 6 }}>PNG/JPG, max 200KB</div>
          </div>
        </div>
      </div>

      <Field label={t("bank_name")} value={d.bankName} onChange={v => set("bankName", v)} placeholder="Deutsche Bank" disabled={locked} />
      <Field label="IBAN" value={d.iban} onChange={v => set("iban", v)} placeholder="DE89 3704 0044 0532 0130 00" disabled={locked} />
      <Field label="BIC/SWIFT" value={d.bic} onChange={v => set("bic", v)} placeholder="COBADEFFXXX" disabled={locked} />
      <Field label={t("tax_id") || "Steuer-ID"} value={d.taxId} onChange={v => set("taxId", v)} placeholder="DE123456789" disabled={locked} />
      <Field label={t("vat_id") || "USt-IdNr."} value={d.vatId} onChange={v => set("vatId", v)} placeholder="USt-IdNr." disabled={locked} />

      {/* Custom invoice template toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--border-subtle)", marginTop: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{t("custom_invoice_template") || "Eigene Rechnungsvorlage"}</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{t("custom_invoice_template_desc") || "Verwenden Sie eine eigene Rechnungsvorlage statt der Standard-Vorlage."}</div>
        </div>
        <button onClick={() => updateClinic({ custom_invoice_template: !clinic.custom_invoice_template })} style={{ width: 44, height: 24, borderRadius: 12, background: clinic.custom_invoice_template ? "#4cc9ff" : "rgba(255,255,255,0.1)", border: "none", cursor: locked ? "default" : "pointer", position: "relative", transition: "background 0.2s" }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 3, left: clinic.custom_invoice_template ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
        </button>
      </div>

      {/* Payment & booking flow */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{t("payment_booking_flow") || "Zahlungs- & Buchungsflow"}</div>
        <select value={clinic.paymentFlow || "deposit_then_rest"} onChange={e => updateClinic({ paymentFlow: e.target.value })} disabled={locked} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer" }}>
          <option value="deposit_then_rest">{t("flow_deposit_then_rest") || "Anzahlung, dann Restzahlung"}</option>
          <option value="full_upfront">{t("flow_full_upfront") || "Volle Zahlung im Voraus"}</option>
          <option value="pay_on_arrival">{t("flow_pay_on_arrival") || "Zahlung vor Ort"}</option>
        </select>
      </div>

      {/* Payment method */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{t("payment_method") || "Zahlungsmethode"}</div>
        <select value={clinic.paymentMethod || "payment_bank_transfer"} onChange={e => updateClinic({ paymentMethod: e.target.value })} disabled={locked} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer" }}>
          <option value="payment_bank_transfer">{t("payment_bank_transfer") || "Bankueberweisung"}</option>
          <option value="payment_custom_link">{t("payment_custom_link") || "Eigener Zahlungslink"}</option>
          <option value="stripe">{t("payment_stripe") || "Stripe"}</option>
        </select>
      </div>

      <SaveBtn onClick={() => { updateClinic(d); setLocalData(p => ({ ...p, invoice: {} })); showT(t("saved")); }} t={t} />

      {/* Deposit / Anzahlung Settings */}
      <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: "rgba(167,107,255,0.04)", border: "1px solid rgba(167,107,255,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{"\u{1F4B3}"}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#a78bfa" }}>{t("deposit_settings")}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{t("deposit_desc")}</div>
            </div>
          </div>
          <button onClick={() => updateClinic({ depositEnabled: !clinic.depositEnabled })} style={{ width: 44, height: 24, borderRadius: 12, background: clinic.depositEnabled ? "#a78bfa" : "rgba(255,255,255,0.1)", border: "none", cursor: locked ? "default" : "pointer", position: "relative", transition: "background 0.2s" }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 3, left: clinic.depositEnabled ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </button>
        </div>
        {clinic.depositEnabled && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label={t("deposit_percentage")} value={String(clinic.depositPercentage || 25)} onChange={v => updateClinic({ depositPercentage: Number.parseInt(v) || 25 })} placeholder="25" />
          <Field label={t("deposit_min")} value={String(clinic.depositMinAmount || 500)} onChange={v => updateClinic({ depositMinAmount: Number.parseInt(v) || 500 })} placeholder="500" />
        </div>}
      </div>
    </div>
  </div>;
}
