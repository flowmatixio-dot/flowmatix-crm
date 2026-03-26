import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { updateClinicSettings } from "../../api/client";

const getMethods = (t) => [
  { key: "payStripe", label: "Stripe", desc: t("pay_stripe_desc") || "Online card payment", icon: "💳" },
  { key: "payCustomLink", label: t("pay_custom_link_label") || "Custom payment link", desc: t("pay_custom_link_desc") || "Individual payment link", icon: "🔗" },
  { key: "payBankTransfer", label: t("bank_transfer_label") || "Bank Transfer", desc: t("bank_transfer_desc") || "IBAN / SEPA Transfer", icon: "🏦" },
  { key: "payOnArrival", label: t("pay_on_site_label") || "Payment on site", desc: t("pay_on_site_desc") || "Cash or card at the clinic", icon: "🏥" },
];

export default function PaymentSetup({ clinic, updateClinic, showT, t }) {
  const c = clinic || {};

  const up = (key, val) => updateClinic({ [key]: val });

  const save = () => {
    updateClinicSettings({
      depositPolicy: c.depositPolicy, depositAmount: c.depositAmount, depositPercent: c.depositPercent,
      paymentTiming: c.paymentTiming, payStripe: c.payStripe, payCustomLink: c.payCustomLink,
      payBankTransfer: c.payBankTransfer, payOnArrival: c.payOnArrival,
    }).then(() => showT(t("saved_toast") || "Gespeichert")).catch(() => showT(t("error_toast") || "Fehler"));
  };

  const sel = { width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "#fff", fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer", boxSizing: "border-box" };
  const inp = { ...sel, cursor: "text" };

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Deposit Policy */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{t("deposit_heading") || "Anzahlung"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
          {[
            { val: "none", label: t("deposit_none_label") || "Keine", desc: t("deposit_none_desc") || "Keine Anzahlung nötig" },
            { val: "fixed", label: t("settings_fixed_amount") || "Fixed amount", desc: t("pay_fixed_example") || "e.g. €500" },
            { val: "percentage", label: t("settings_percentage") || "Percentage", desc: t("pay_percent_example") || "e.g. 30%" },
          ].map(opt => (
            <div key={opt.val} onClick={() => up("depositPolicy", opt.val)} style={{
              padding: "14px 16px", borderRadius: 12, cursor: "pointer", textAlign: "center",
              background: (c.depositPolicy || "none") === opt.val ? "rgba(76,201,255,0.06)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${(c.depositPolicy || "none") === opt.val ? "rgba(76,201,255,0.2)" : "rgba(255,255,255,0.06)"}`,
              transition: "all 0.15s",
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: (c.depositPolicy || "none") === opt.val ? "#4cc9ff" : "rgba(232,238,252,0.7)" }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 3 }}>{opt.desc}</div>
            </div>
          ))}
        </div>
        {c.depositPolicy === "fixed" && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{t("pay_amount_label") || "Amount (€)"}</div>
            <input value={c.depositAmount || ""} onChange={e => up("depositAmount", e.target.value)} placeholder="500" type="number" style={inp} />
          </div>
        )}
        {c.depositPolicy === "percentage" && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{t("pay_percent_label") || "Percentage"}</div>
            <select value={c.depositPercent || "30"} onChange={e => up("depositPercent", e.target.value)} style={sel}>
              {["10", "20", "25", "30", "40", "50"].map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Payment Timing */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{t("payment_timing_label") || "Zahlungszeitpunkt"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[
            { val: "on_booking", label: t("on_booking_label") || "Bei Buchung", desc: t("on_booking_desc") || "Sofort bei Terminbuchung" },
            { val: "after_confirmation", label: t("after_confirmation_label") || "Nach Bestätigung", desc: t("after_confirmation_desc") || "Nach ärztlicher Freigabe" },
            { val: "before_treatment", label: t("before_treatment_label") || "Vor Behandlung", desc: t("before_treatment_desc") || "X Tage vor dem Termin" },
          ].map(opt => (
            <div key={opt.val} onClick={() => up("paymentTiming", opt.val)} style={{
              padding: "14px 16px", borderRadius: 12, cursor: "pointer", textAlign: "center",
              background: (c.paymentTiming || "on_booking") === opt.val ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${(c.paymentTiming || "on_booking") === opt.val ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)"}`,
              transition: "all 0.15s",
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: (c.paymentTiming || "on_booking") === opt.val ? "#10b981" : "rgba(232,238,252,0.6)" }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 3 }}>{opt.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{t("payment_methods_label") || "Zahlungsmethoden"}</div>
        <div style={{ display: "grid", gap: 8 }}>
          {getMethods(t).map(pm => {
            const active = c[pm.key] !== false;
            return (
              <div key={pm.key} onClick={() => up(pm.key, !active)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                background: active ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.015)",
                border: `1px solid ${active ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)"}`,
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 18 }}>{pm.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: active ? "rgba(232,238,252,0.85)" : "rgba(167,177,195,0.5)" }}>{pm.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(167,177,195,0.35)", marginTop: 1 }}>{pm.desc}</div>
                </div>
                <div style={{
                  width: 34, height: 18, borderRadius: 9, position: "relative",
                  background: active ? "#10b981" : "rgba(255,255,255,0.08)", transition: "background 0.2s",
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 7, background: "white", position: "absolute",
                    top: 2, left: active ? 18 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={save} style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #4cc9ff, #2da8ff)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
        {t("save") || "Speichern"}
      </button>
    </div>
  );
}
