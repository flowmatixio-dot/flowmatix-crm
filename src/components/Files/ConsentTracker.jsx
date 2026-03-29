import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { fmLocale } from "../../utils/helpers";
import { uploadToDrive } from "../../api/client";

const getConsentItems = (t) => [
  { key: "treatment_contract", label: t("treatment_contract") || "Behandlungsvertrag", icon: "📋", desc: t("treatment_contract_desc") || "Vertrag über die geplante Behandlung", required: true },
  { key: "medical_consent", label: t("medical_consent") || "Medizinische Einwilligung", icon: "⚕️", desc: t("medical_consent_desc") || "Einwilligung in den medizinischen Eingriff", required: true },
  { key: "data_privacy", label: t("data_privacy_label") || "Datenschutzerklärung", icon: "🔒", desc: t("data_privacy_desc") || "DSGVO-konforme Datenschutzeinwilligung", required: true },
  { key: "anesthesia_consent", label: t("anesthesia_consent") || "Anästhesie-Einwilligung", icon: "💉", desc: t("anesthesia_consent_desc") || "Einwilligung in die Lokalanästhesie", required: true },
  { key: "aftercare_agreement", label: t("aftercare_agreement") || "Nachsorge-Vereinbarung", icon: "💊", desc: t("aftercare_agreement_desc") || "Vereinbarung über Nachsorgepflichten", required: false },
];

export default function ConsentTracker({ patient, onUpdate, onRequestSignature, showT, hideHeader }) {
  const { t } = useApp();
  const [expandedKey, setExpandedKey] = useState(null);

  const rawConsents = patient?.consents || {};
  // Auto-map DSGVO/documents consent from patient or appointment data to data_privacy
  const consents = { ...rawConsents };
  if ((patient?.consent?.granted || patient?.documentsSigned) && !consents.data_privacy?.signed) {
    consents.data_privacy = { signed: true, signedAt: patient?.consent?.timestamp || patient?.consent?.grantedAt || null, method: patient?.consent?.method || "whatsapp" };
  }

  const stats = useMemo(() => {
    const required = getConsentItems(t).filter(c => c.required);
    const signed = required.filter(c => consents[c.key]?.signed);
    return {
      total: getConsentItems(t).length,
      requiredTotal: required.length,
      requiredSigned: signed.length,
      allRequiredDone: signed.length === required.length,
      pct: required.length > 0 ? Math.round((signed.length / required.length) * 100) : 0,
    };
  }, [consents]);

  const pctColor = stats.pct <= 40 ? "#ef4444" : stats.pct <= 80 ? "#f59e0b" : "#10b981";

  return (
    <div>
      {/* Progress header */}
      {!hideHeader && <div style={{
        padding: "14px 16px", borderRadius: 12, marginBottom: 16,
        background: `${pctColor}06`, border: `1px solid ${pctColor}15`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.5)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {t("consents_label") || "Einwilligungen"}
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: pctColor }}>
            {stats.requiredSigned}/{stats.requiredTotal} {t("required") || "erforderlich"}
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${stats.pct}%`, borderRadius: 3, background: pctColor, transition: "width 0.3s" }} />
        </div>
        {stats.allRequiredDone && (
          <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, marginTop: 6 }}>
            {t("all_consents_present") || "Alle erforderlichen Einwilligungen vorhanden"}
          </div>
        )}
      </div>}

      {/* Consent items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {getConsentItems(t).map(item => {
          const consent = consents[item.key] || {};
          const isSigned = !!consent.signed;
          const isExpanded = expandedKey === item.key;

          return (
            <div key={item.key} style={{
              borderRadius: 10, overflow: "hidden",
              background: isSigned ? "rgba(16,185,129,0.03)" : "rgba(255,255,255,0.015)",
              border: `1px solid ${isSigned ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)"}`,
            }}>
              {/* Row */}
              <div onClick={() => setExpandedKey(isExpanded ? null : item.key)} style={{
                display: "grid", gridTemplateColumns: "28px 1fr auto auto", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer",
              }}>
                {/* Status icon */}
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: isSigned ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isSigned ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, color: isSigned ? "#10b981" : "rgba(167,177,195,0.3)",
                }}>
                  {isSigned ? "✓" : item.icon}
                </div>

                {/* Label — single line with required dot */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isSigned ? "rgba(232,238,252,0.8)" : "rgba(167,177,195,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.label}
                    {item.required && !isSigned && <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#ef4444", marginLeft: 6, verticalAlign: "middle" }} />}
                  </div>
                </div>

                {/* Status badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, whiteSpace: "nowrap",
                  background: isSigned ? "rgba(16,185,129,0.08)" : "rgba(255,138,42,0.06)",
                  color: isSigned ? "#10b981" : "#ff8a2a",
                }}>
                  {isSigned ? `${t("signed") || "Unterschrieben"} ${consent.signedAt ? new Date(consent.signedAt).toLocaleDateString(fmLocale()) : ""}` : (t("pending") || "Ausstehend")}
                </span>

                <span style={{ fontSize: 10, color: "rgba(167,177,195,0.2)", transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0)" }}>▶</span>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div style={{ padding: "0 14px 12px", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                  <div style={{ padding: "10px 0", display: "flex", gap: 8 }}>
                    {!isSigned && (
                      <>
                        <button onClick={() => {
                          onUpdate?.(item.key, { signed: true, signedAt: new Date().toISOString(), method: "manual" });
                          showT?.(`${item.label} ${t("marked_signed") || "als unterschrieben markiert"}`);
                        }} style={{
                          padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                          background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)", color: "#10b981",
                        }}>{t("mark_as_signed") || "Als unterschrieben markieren"}</button>
                        {item.key === "data_privacy" ? (
                          <button onClick={() => {
                            onRequestSignature?.(item.key, item.label);
                            showT?.(`${t("consent_requested") || "Einwilligung angefordert"}: ${item.label}`);
                          }} style={{
                            padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                            background: "rgba(76,201,255,0.06)", border: "1px solid rgba(76,201,255,0.12)", color: "#4cc9ff",
                          }}>{t("request_via_whatsapp") || "Per WhatsApp anfordern"}</button>
                        ) : (
                          <label style={{
                            padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                            background: "rgba(76,201,255,0.06)", border: "1px solid rgba(76,201,255,0.12)", color: "#4cc9ff",
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}>
                            {"📄"} {t("upload") || "Upload"}
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                await uploadToDrive(file, patient?.patientId || patient?.id, "consent");
                                onUpdate?.(item.key, { signed: true, signedAt: new Date().toISOString(), method: "digital", fileName: file.name });
                                showT?.(`${item.label}: ${file.name} ${t("uploaded") || "hochgeladen"}`);
                              } catch (err) {
                                console.error("Upload failed:", err);
                                showT?.(t("upload_failed") || "Upload fehlgeschlagen");
                              }
                            }} />
                          </label>
                        )}
                      </>
                    )}
                    {isSigned && (
                      <button onClick={() => {
                        onUpdate?.(item.key, { signed: false, signedAt: null });
                      }} style={{
                        padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.5)",
                      }}>{t("reset_label_btn") || "Zurücksetzen"}</button>
                    )}
                  </div>
                  {consent.signedAt && (
                    <div style={{ fontSize: 10, color: "rgba(167,177,195,0.25)" }}>
                      {t("method") || "Methode"}: {consent.method === "whatsapp" ? "WhatsApp" : consent.method === "digital" ? "Digital" : (t("manual") || "Manuell")}
                      {consent.signedAt && ` · ${new Date(consent.signedAt).toLocaleString(fmLocale())}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
