import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Stat, Toggle } from "../shared/index";
import { updateClinicSettings, submitWhatsAppTemplates, apiFetch } from "../../api/client";
import HintBox from "../shared/HintBox.jsx";

export default function AutomationsView() {
  const { myAutomations, toggleAutomation, clinic, setClinics, showT, t } = useApp();
  const [openGroup, setOpenGroup] = useState(null);
  const [reviewLink, setReviewLink] = useState(clinic?.googleMapsLink || "");
  const [tplStatuses, setTplStatuses] = useState({});

  // Load template statuses
  useEffect(() => {
    apiFetch('/api/v1/clinic/whatsapp/templates/status').then(res => {
      const map = {};
      (res?.templates || []).forEach(t => { map[`${t.template_name}_${t.language}`] = t.status; });
      setTplStatuses(map);
    }).catch(() => {});
  }, []);

  const saveSetting = (key, value) => {
    setClinics(cs => cs.map(cl => cl.id === clinic?.id ? { ...cl, [key]: value } : cl));
    updateClinicSettings({ [key]: value, orgId: clinic?.id }).then(() => showT(t("auto_saved") || "Saved")).catch(() => showT(t("auto_error") || "Error"));
  };

  const sel = (value, onChange, options) => (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "inherit", fontSize: 12, outline: "none", cursor: "pointer", minWidth: 120 }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  const GROUPS = [
    {
      id: "bookings", icon: "📅", label: t("auto_group_bookings") || "Terminerinnerungen & Buchungen",
      desc: t("auto_group_bookings_desc") || "Buchungsbestätigungen und Erinnerungen",
      types: ["booking_confirm", "appt_reminder"],
      locked: true,
    },
    {
      id: "aftercare", icon: "💊", label: t("auto_group_aftercare") || "Nachsorge",
      desc: t("auto_group_aftercare_desc") || "Nachsorge-Nachrichten nach der Behandlung",
      types: ["aftercare"],
    },
    {
      id: "reviews", icon: "⭐", label: t("auto_group_reviews") || "Bewertungen",
      desc: t("auto_group_reviews_desc") || "Google Maps Bewertungsanfrage",
      types: ["review_request"],
      alwaysOpen: true,
    },
    {
      id: "logistics", icon: "✈️", label: t("auto_group_logistics") || "Logistik",
      desc: t("auto_group_logistics_desc") || "Flug-Tracking, Fahrer-Benachrichtigung",
      types: ["driver_notify"],
    },
  ];

  const visibleTypes = GROUPS.flatMap(g => g.types);
  const activeCount = myAutomations.filter(a => a.active && !a.locked && visibleTypes.includes(a.type)).length;
  const totalRuns = myAutomations.filter(a => visibleTypes.includes(a.type)).reduce((s, a) => s + (a.runs || 0), 0);

  return (
    <div style={{ padding: 28, maxWidth: 800 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>{t("automations") || "Automatisierungen"}</h1>
      <p style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", margin: "0 0 20px" }}>{t("auto_subtitle") || "Wiederkehrende Aufgaben automatisieren"}</p>

      {/* Automation Groups — hidden, managed via WhatsApp Templates below */}
      {false && GROUPS.map(group => {
        const items = myAutomations.filter(a => group.types.includes(a.type));
        if (items.length === 0) return null;
        const anyActive = items.some(a => a.active && !a.locked);
        const isOpen = openGroup === group.id || group.alwaysOpen;

        return (
          <div key={group.id} style={{ marginBottom: 12, borderRadius: 14, background: "rgba(255,255,255,0.015)", border: `1px solid ${anyActive ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)"}`, overflow: "hidden" }}>
            {/* Group Header */}
            <div
              onClick={() => setOpenGroup(isOpen ? null : group.id)}
              style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{group.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{group.label}</span>
                {anyActive && <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "rgba(16,185,129,0.12)", color: "#10b981" }}>{t("auto_aktiv") || "aktiv"}</span>}
                {!group.alwaysOpen && <span style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {group.locked ? <span style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,background:"rgba(16,185,129,0.12)",color:"#10b981"}}>{t("always_active")}</span> : <Toggle value={anyActive} onChange={(e) => { e?.stopPropagation?.(); items.forEach(a => { if (a.active === anyActive && !a.locked) toggleAutomation(a.id); }); }} />}
              </div>
            </div>

            {/* Expanded Content */}
            {isOpen && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                {items.map(aut => (
                  <div key={aut.id} style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "rgba(232,238,252,0.85)", marginBottom: 4 }}>{aut.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(167,177,195,0.65)" }}>{aut.trigger}</div>

                    {/* Inline settings per type */}
                    {aut.type === "booking_confirm" && (
                      <div style={{ fontSize: 11, color: "rgba(167,177,195,0.75)", marginTop: 6 }}>
                        ℹ️ {t("auto_booking_confirm_desc") || "Patient automatically receives booking confirmation with appointment, address and preparation instructions."}
                      </div>
                    )}

                    {aut.type === "appt_reminder" && (<>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: "rgba(167,177,195,0.6)" }}>{t("auto_reminder_times") || "Reminder times"}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(232,238,252,0.9)", padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>{t("auto_reminder_3days") || "3 days before"}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(167,177,195,0.75)", marginTop: 6 }}>
                        ℹ️ {t("auto_reminder_combined") || "Combined message: appointment reminder + hotel info + flight ticket request — all in one message."}
                      </div>
                    </>)}

                    {aut.type === "aftercare" && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: "rgba(167,177,195,0.6)" }}>{t("auto_aftercare_label") || "Aftercare"}</span>
                        <span style={{ fontSize: 11, color: "rgba(167,177,195,0.75)" }}>
                          ℹ️ {t("auto_aftercare_lang_note") || "Message is automatically sent in the patient's language"}
                        </span>
                        {sel(clinic?.aftercareDelayHours || 4, v => saveSetting("aftercareDelayHours", parseInt(v)), [
                          ["2", t("auto_aftercare_2h") || "2h after surgery"], ["4", t("auto_aftercare_4h") || "4h after surgery"], ["6", t("auto_aftercare_6h") || "6h after surgery"], ["12", t("auto_aftercare_12h") || "12h after surgery"], ["24", t("auto_aftercare_24h") || "24h after surgery"]
                        ])}
                      </div>
                    )}

                    {aut.type === "review_request" && (
                      <div style={{ marginTop: 8 }}>
                        <HintBox id="review_timing" style={{marginBottom:10}}>{t("hint_review_timing") || "Wird automatisch einige Stunden nach der Nachsorge-Nachricht an den Patienten gesendet. Der Patient erhaelt einen direkten Link zu deinem Google Maps Profil."}</HintBox>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 6 }}>Google Maps Link</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input value={reviewLink} onChange={e => setReviewLink(e.target.value)} placeholder="https://g.page/r/..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
                          <button onClick={() => saveSetting("googleMapsLink", reviewLink)} style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(76,201,255,0.1)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("save") || "Speichern"}</button>
                        </div>
                        {!reviewLink && <div style={{fontSize:10,color:"rgba(251,191,36,0.6)",marginTop:6}}>{"⚠️"} {t("hint_review_no_link") || "Kein Link hinterlegt — Bewertungsanfrage wird ohne Link gesendet."}</div>}
                      </div>
                    )}

                    {aut.type === "driver_notify" && (
                      <div style={{ fontSize: 11, color: "rgba(167,177,195,0.75)", marginTop: 6 }}>
                        ℹ️ {t("auto_driver_desc") || "1 day before arrival, the patient receives a message with driver name, vehicle and pickup details. Driver is notified via Telegram."}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* WhatsApp Templates */}
      <div style={{ marginTop: 20, borderRadius: 14, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(76,201,255,0.12)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>📋</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>WhatsApp Templates</span>
            </div>
            <span style={{ fontSize: 11, color: "rgba(167,177,195,0.6)" }}>{t("auto_lang_auto_detect") || "Language is automatically detected"}</span>
          </div>
          <HintBox id="templates" style={{marginBottom:14}}>{t("hint_templates")}</HintBox>
        </div>
        <div style={{ padding: "0 12px" }}>
          {[
            { name: t("tpl_treatment_plan") || "Behandlungsplan", desc: t("tpl_treatment_plan_desc") || "Nach Arzt-Bewertung — Methode, Grafts, Preis", icon: "🩺", cat: "medical", tplKey: "fm_treatment_plan" },
            { name: t("tpl_deposit_confirmed") || "Anzahlung bestätigt", desc: t("tpl_deposit_confirmed_desc") || "Nach Zahlungseingang — Terminbuchung anbieten", icon: "💰", cat: "payment", tplKey: "fm_deposit_confirmed" },
            { name: t("tpl_booking") || "Terminbestätigung", desc: t("tpl_booking_desc") || "Nach OP-Terminbuchung", icon: "✅", cat: "booking", tplKey: "fm_booking_confirmation" },
            { name: t("tpl_reminder") || "Erinnerung + Flugdaten", desc: t("tpl_reminder_desc") || "3 Tage vor OP — Erinnerung + Flugticket anfordern", icon: "📅", cat: "booking", tplKey: "fm_appointment_reminder_flight" },
            { name: t("tpl_driver_pickup") || "Fahrer-Info", desc: t("tpl_driver_pickup_desc") || "1 Tag vor Flug — Fahrer, Auto, Kennzeichen", icon: "🚗", cat: "logistics", tplKey: "fm_driver_pickup_info" },
            { name: t("tpl_aftercare") || "Nachsorge", desc: t("tpl_aftercare_desc") || "Nach Behandlung — Pflegeanweisungen", icon: "💊", cat: "aftercare", tplKey: "fm_aftercare_followup" },
            { name: t("tpl_review_request") || "Bewertungsanfrage", desc: t("tpl_review_request_desc") || "Nach Nachsorge — Google Maps Bewertung", icon: "⭐", cat: "aftercare", tplKey: "fm_review_request" },
            { name: t("tpl_reactivation") || "Reaktivierung", desc: t("tpl_reactivation_desc") || "24h-Fenster abgelaufen — Gespräch fortsetzen", icon: "📨", cat: "reactivation", tplKey: "fm_reactivation_v2" },
            { name: t("tpl_appointment_rescheduled") || "Termin verschoben", desc: t("tpl_appointment_rescheduled_desc") || "Nach Terminverschiebung — alter und neuer Termin", icon: "🔄", cat: "booking", tplKey: "fm_appointment_rescheduled" },
            { name: t("tpl_short_notice_change") || "Kurzfristige Änderung", desc: t("tpl_short_notice_change_desc") || "Terminänderung < 48h — Klinik muss bestätigen", icon: "⚠️", cat: "booking", tplKey: "fm_short_notice_change" },
          ].map(tpl => (
            <div key={tpl.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                <span style={{ fontSize: 14 }}>{tpl.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,238,252,0.85)" }}>{tpl.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)" }}>{tpl.desc}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {["de", "en", "tr"].map(l => {
                  const st = tplStatuses[`${tpl.tplKey}_${l}`] || 'draft';
                  const colors = { approved: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", color: "#10b981" }, pending: { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", color: "#fbbf24" }, rejected: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#ef4444" }, error: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", color: "#ef4444" }, draft: { bg: "rgba(167,177,195,0.06)", border: "rgba(167,177,195,0.15)", color: "rgba(167,177,195,0.7)" } };
                  const c = colors[st] || colors.draft;
                  return <span key={l} title={st} style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>{l.toUpperCase()}</span>;
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "14px 20px" }}>
          <button
            onClick={async () => {
              showT(t("auto_templates_submitting") || "Templates are being submitted…");
              try {
                const res = await submitWhatsAppTemplates();
                if (res.success) {
                  showT(`✓ ${res.submitted} ${t("auto_templates_submitted") || "submitted"}, ${res.already_exists} ${t("auto_templates_already") || "already existing"}`);
                } else {
                  showT(`${res.submitted} ${t("auto_templates_submitted") || "submitted"}, ${res.errors} ${t("auto_templates_errors") || "errors"}`);
                }
              } catch (e) {
                showT((t("auto_save_error_prefix") || "Error: ") + (e.message || (t("auto_submission_failed") || "Submission failed")));
              }
            }}
            style={{ width: "100%", padding: "11px", borderRadius: 10, background: "linear-gradient(135deg, #4cc9ff, #2b7cff)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            {t("auto_submit_all_templates") || "Alle Templates bei 360dialog einreichen"}
          </button>
          <button
            onClick={async () => {
              showT("Status wird aktualisiert...");
              try {
                const res = await apiFetch('/api/v1/clinic/whatsapp/templates/refresh', { method: 'POST' });
                if (res.success) {
                  showT(`✅ ${res.updated} Templates aktualisiert`);
                  const statusRes = await apiFetch('/api/v1/clinic/whatsapp/templates/status');
                  const map = {};
                  (statusRes?.templates || []).forEach(t => { map[`${t.template_name}_${t.language}`] = t.status; });
                  setTplStatuses(map);
                } else showT("Fehler beim Aktualisieren");
              } catch (e) { showT("Fehler: " + e.message); }
            }}
            style={{ width: "100%", padding: "11px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(167,177,195,0.7)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginTop: 8 }}
          >
            🔄 {t("auto_refresh_status") || "Status aktualisieren"}
          </button>
        </div>
      </div>

    </div>
  );
}
