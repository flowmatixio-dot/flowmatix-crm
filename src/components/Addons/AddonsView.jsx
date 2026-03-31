import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { Section } from "../shared/index";
import * as api from "../../api/client";

// Stripe price IDs — must match /api/v1/billing/checkout.ts ADDON_PRICES
const ADDON_CATALOG = {
  patients: [
    { id: "patients_250", cap: "+250", descKey: "addon_patients_250_desc", price: 149, stripePriceId: "price_1T6ZhERpHOKThWF4V6DmzaZe" },
    { id: "patients_500", cap: "+500", descKey: "addon_patients_500_desc", price: 249, stripePriceId: "price_1T6ZhFRpHOKThWF4ega0yG5t", popular: true },
    { id: "patients_1000", cap: "+1.000", descKey: "addon_patients_1000_desc", price: 399, stripePriceId: "price_1T6ZhFRpHOKThWF4UgzXPA0e" },
  ],
  features: [
    { id: "plus_1_language", icon: "🌍", nameKey: "addon_plus_1_language", descKey: "addon_plus_1_language_desc", price: 99, forPlansKey: "addon_plans_core_pro", stripePriceId: "price_1T6ZhGRpHOKThWF4web89iST" },
    { id: "all_languages", icon: "🌐", nameKey: "addon_all_languages", descKey: "addon_all_languages_desc", price: 249, forPlansKey: "addon_plans_core_pro", stripePriceId: "price_1T6ZhGRpHOKThWF4Y3yfY2CF" },
    { id: "voice_messages", icon: "🎤", nameKey: "addon_voice_messages", descKey: "addon_voice_messages_desc", price: 149, forPlansKey: "addon_plans_core_only", stripePriceId: "price_1T6ZhHRpHOKThWF4bmtUQt0h" },
    { id: "wa_reminders", icon: "🔔", nameKey: "addon_wa_reminders", descKey: "addon_wa_reminders_desc", price: 119, forPlansKey: "addon_plans_core_pro", stripePriceId: "price_1T6ZhIRpHOKThWF4YElsAxnG" },
  ],
};

export default function AddonsView() {
  const { clinic, showT, t } = useApp();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // which addon id is currently being activated/removed

  const fetchSub = useCallback(async () => {
    try {
      const res = await api.getMySubscription();
      setSub(res.subscription);
    } catch {
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSub(); }, [fetchSub]);

  if (!clinic) return null;

  // Find active addon by Stripe price ID
  const activeItems = sub?.stripe?.items || [];
  const findActive = (stripePriceId) => activeItems.find(i => i.price_id === stripePriceId);

  const handleAdd = async (addon) => {
    setBusy(addon.id);
    try {
      await api.addAddon(addon.stripePriceId);
      showT(`${t(addon.nameKey) || addon.cap + " " + t("patients")} ${t("activated")}!`);
      await fetchSub();
    } catch (err) {
      showT(err.message || t("failed_to_add_addon"));
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (addon) => {
    const item = findActive(addon.stripePriceId);
    if (!item) return;
    setBusy(addon.id);
    try {
      await api.removeAddon(item.id);
      showT(`${t(addon.nameKey) || addon.cap + " " + t("patients")} ${t("removed")}.`);
      await fetchSub();
    } catch (err) {
      showT(err.message || t("failed_to_remove_addon"));
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "rgba(167,177,195,0.7)" }}>{t("loading_subscription")}</div>;

  if (!sub?.stripe) return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{t("no_active_subscription")}</div>
      <p style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", margin: 0 }}>
        {t("need_subscription_for_addons")}
      </p>
    </div>
  );

  return (
    <div style={{ padding: 28, maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>{t("addons")}</h1>
      <p style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", margin: "0 0 28px" }}>{t("addons_desc")}</p>

      <Section title={t("patient_capacity")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {ADDON_CATALOG.patients.map(p => {
            const active = findActive(p.stripePriceId);
            const isBusy = busy === p.id;
            return (
              <div key={p.id} style={{ padding: 20, borderRadius: 16, background: active ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${active ? "rgba(16,185,129,0.25)" : p.popular ? "rgba(76,201,255,0.2)" : "rgba(255,255,255,0.08)"}`, textAlign: "center", position: "relative" }}>
                {p.popular && !active && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: 6, background: "rgba(76,201,255,0.15)", border: "1px solid rgba(76,201,255,0.3)", fontSize: 10, fontWeight: 800, color: "#4cc9ff", whiteSpace: "nowrap" }}>{t("popular")}</div>}
                <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{p.cap} {t("patients")}</div>
                <div style={{ fontSize: 13, color: "rgba(167,177,195,0.6)", marginBottom: 14 }}>{t(p.descKey)}</div>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>EUR {p.price} <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(167,177,195,0.7)" }}>/{t("mth")}</span></div>
                {active ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 700, fontSize: 13 }}>✓ {t("active")}</div>
                    <button disabled={isBusy} onClick={() => handleRemove(p)} style={{ padding: "4px 12px", borderRadius: 8, background: "none", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.6)", fontWeight: 600, fontSize: 11, cursor: isBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: isBusy ? 0.5 : 1 }}>{isBusy ? t("removing") : t("remove")}</button>
                  </div>
                ) : (
                  <button disabled={isBusy} onClick={() => handleAdd(p)} style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(76,201,255,0.1)", border: "1px solid rgba(76,201,255,0.25)", color: "#4cc9ff", fontWeight: 700, fontSize: 13, cursor: isBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: isBusy ? 0.5 : 1 }}>{isBusy ? t("activating") : t("activate")}</button>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={t("feature_upgrades")}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {ADDON_CATALOG.features.map(a => {
            const active = findActive(a.stripePriceId);
            const isBusy = busy === a.id;
            return (
              <div key={a.id} style={{ padding: 20, borderRadius: 16, background: active ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.03)", border: `1px solid ${active ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>{a.icon}</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {active && <span style={{ padding: "2px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(16,185,129,0.12)", color: "#10b981" }}>{t("active")}</span>}
                    <span style={{ padding: "2px 10px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.7)" }}>{t(a.forPlansKey)}</span>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{t(a.nameKey)}</div>
                <div style={{ fontSize: 13, color: "rgba(167,177,195,0.6)", marginBottom: 14 }}>{t(a.descKey)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>EUR {a.price} <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(167,177,195,0.7)" }}>/{t("mth")}</span></span>
                  {active ? (
                    <button disabled={isBusy} onClick={() => handleRemove(a)} style={{ padding: "5px 12px", borderRadius: 8, background: "none", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.6)", fontWeight: 600, fontSize: 11, cursor: isBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: isBusy ? 0.5 : 1 }}>{isBusy ? t("removing") : t("remove")}</button>
                  ) : (
                    <button disabled={isBusy} onClick={() => handleAdd(a)} style={{ padding: "7px 14px", borderRadius: 9, background: "rgba(76,201,255,0.1)", border: "1px solid rgba(76,201,255,0.25)", color: "#4cc9ff", fontWeight: 700, fontSize: 12, cursor: isBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: isBusy ? 0.5 : 1 }}>{isBusy ? t("activating") : t("activate")}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "rgba(167,177,195,0.6)" }}>
        ℹ️ {t("addons_billing_info")}
      </div>
    </div>
  );
}
