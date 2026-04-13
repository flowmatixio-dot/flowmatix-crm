import { useMemo, useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { getNow } from "../../utils/demoTime";
import { fmLocale } from "../../utils/helpers";
import HintBox from "../shared/HintBox.jsx";
import SetupCard from "../Onboarding/SetupCard.jsx";
import AdvancedSetupCard from "../Onboarding/AdvancedSetupCard.jsx";
import PerformanceIndicator from "../Onboarding/PerformanceIndicator.jsx";

/* ── Inline tri-language helper (matches production T()) ── */
const T = (en, de, tr) => ({ en, de, tr }[localStorage.getItem("fm_lang") || "de"] || de);

/* ── Local patient check (no flight/transfer needed) ── */
const isLoc = (p) => !!(p.metadata?.noTransferNeeded || p.metadata?.noFlightNeeded);

export default function DashboardView() {
  const {
    clinic, myLeads, myAppts, setView, setInboxFilter, t, openPatient,
    workspaceState, setShowPlanPicker, demoTourOpen, setDemoTourOpen,
    activeClinicId, testInfo,
  } = useApp();

  // Persist demo-tour-seen flag (used by PerformanceIndicator).
  useEffect(() => {
    if (demoTourOpen) {
      try { localStorage.setItem("fm_demo_tour_seen", "1"); } catch {}
    }
  }, [demoTourOpen]);

  const n = clinic;
  const o = myLeads || [];
  const i = myAppts || [];
  const lang = localStorage.getItem("fm_lang") || "de";

  /* ── Clinic name ── */
  const un = n?.name || n?.waName || "Team";

  /* ── Greeting ── */
  const gr = (() => {
    const h = getNow().getHours();
    if (h >= 5 && h < 12) return T("Good Morning", "Guten Morgen", "Günaydın");
    if (h >= 12 && h < 18) return T("Good Afternoon", "Guten Tag", "İyi Günler");
    if (h >= 18 && h < 22) return T("Good Evening", "Guten Abend", "İyi Akşamlar");
    return T("Good Night", "Gute Nacht", "İyi Geceler");
  })();

  /* ── Today's date string ── */
  const A = getNow().toISOString().split("T")[0];

  /* ── Action cards (critical + waiting) ── */
  const { crG, wtG, crT, wtT } = useMemo(() => {
    const cr = { takeover: [], driver: [], hotel: [] };
    const wt = { flight: [], driverWait: [], driverAuto: [] };

    o.forEach((p) => {
      if (p.convStatus === "human_takeover") cr.takeover.push(p);

      if ((p.stage === "booked" || p.stage === "done") && !isLoc(p)) {
        const hasF = p.flightConfirmed?.date;
        const hasDrv = p.logistics?.driverName;
        const ls = p.logistics?.status;

        if (hasF && !hasDrv) {
          if (ls === "all_declined" || ls === "failed_auto_assignment") cr.driver.push(p);
          else if (["declined", "escalated", "backup_declined", "retry_scheduled"].includes(ls)) wt.driverWait.push(p);
          else wt.driverAuto.push(p);
        }
        if (hasF && !(p.hotelInfo?.name || p.hotel?.name) && !p.hotelBooked) cr.hotel.push(p);
      }

      if (p.stage === "booked" && !p.flightConfirmed?.date && !isLoc(p)) wt.flight.push(p);
    });

    const crCards = [];
    if (cr.takeover.length) crCards.push({ type: "takeover", items: cr.takeover, icon: "💬", label: `${cr.takeover.length} ${T("conversations waiting for takeover", "Gespräche warten auf Übernahme", "konuşma devralma bekliyor")}`, btn: T("Take over", "Übernehmen", "Devral") });
    if (cr.driver.length) crCards.push({ type: "driver", items: cr.driver, icon: "🚗", label: `${cr.driver.length} ${T("Transfers: all drivers declined", "Transfers: Alle Fahrer haben abgelehnt", "Transferler: Tüm şoförler reddetti")}`, desc: T("System tried automatically — manual assignment needed", "System hat automatisch versucht — manuelle Zuweisung nötig", "Sistem otomatik denedi — manuel atama gerekli"), btn: T("Assign", "Zuweisen", "Ata") });
    if (cr.hotel.length) crCards.push({ type: "hotel", items: cr.hotel, icon: "🏨", label: `${cr.hotel.length} ${T("patients without hotel", "Patienten ohne Hotel", "otelsiz hasta")}`, btn: T("Assign", "Zuweisen", "Ata") });

    const wtCards = [];
    if (wt.flight.length) wtCards.push({ type: "flight", items: wt.flight, icon: "✈️", label: `${wt.flight.length} ${T("flight tickets pending", "Flugtickets ausstehend", "uçuş bileti bekliyor")}`, auto: T("Automatic reminders active", "Automatische Erinnerungen aktiv", "Otomatik hatırlatmalar aktif") });
    if (wt.driverWait.length) wtCards.push({ type: "driverWait", items: wt.driverWait, icon: "🚗", label: `${wt.driverWait.length} ${T("transfers waiting for driver confirmation", "Transfers warten auf Fahrerbestätigung", "transferler şoför onayı bekliyor")}`, auto: T("System retries automatically", "System versucht automatisch erneut", "Sistem otomatik yeniden deniyor") });

    return { crG: crCards, wtG: wtCards, crT: crCards.reduce((s, c) => s + c.items.length, 0), wtT: wtCards.reduce((s, c) => s + c.items.length, 0) };
  }, [o]);

  /* ── Dashboard state ── */
  const ds = crT > 0 ? "action" : wtT > 0 ? "waiting" : "automated";

  /* ── Additional counts ── */
  const rvC = o.filter((p) => p.convStatus === "needs_medical_review").length;
  const drAC = o.filter((p) => p.flightConfirmed?.date && !p.logistics?.driverName && !["all_declined", "failed_auto_assignment"].includes(p.logistics?.status) && (p.stage === "booked" || p.stage === "done") && !isLoc(p)).length;

  /* ── Stats ── */
  const mt = useMemo(() => {
    const tl = o.filter((p) => p.stage === "new").length;
    const tb = o.filter((p) => p.stage === "booked" && p.bookedAt && p.bookedAt.slice(0, 10) === A).length;
    const ac = o.filter((p) => p.convStatus && !["resolved", "closed", "done"].includes(p.convStatus)).length;
    const rv = o.reduce((s, p) => {
      if (p.stage !== "booked") return s;
      let v = p.financials?.treatmentPrice || p.reviewData?.price || p.budget || 0;
      if (typeof v === "string") v = parseInt(v.replace(/[^\d]/g, ""), 10) || 0;
      return s + (typeof v === "number" ? v : 0);
    }, 0);
    return { tl, tb, ac, rv };
  }, [o, A]);

  /* ── Daily schedule ── */
  const tl = useMemo(() => {
    const items = [];
    i.forEach((p) => {
      const d = (p.date || (p.scheduledAt ? p.scheduledAt.split("T")[0] : ""));
      if (d !== A || p.status === "cancelled" || p.status === "canceled") return;
      const dt = p.scheduledAt ? new Date(p.scheduledAt) : null;
      items.push({
        tm: dt ? dt.toLocaleTimeString(fmLocale(), { hour: "2-digit", minute: "2-digit" }) : "–",
        tp: p.treatmentType || "OP",
        nm: p.patientName || p.patient || "Patient",
        cl: "#4cc9ff",
        ic: "🔪",
        sk: dt ? dt.getHours() * 60 + dt.getMinutes() : 9999,
        pid: p.patientId || p.leadId,
      });
    });
    o.forEach((p) => {
      if (p.flightConfirmed?.date === A) {
        items.push({
          tm: p.flightConfirmed.arrivalTime || "–",
          tp: T("Arrival", "Ankunft", "Varış"),
          nm: p.name || "Patient",
          cl: "#10b981",
          ic: "✈️",
          sk: p.flightConfirmed.arrivalTime ? parseInt(p.flightConfirmed.arrivalTime.replace(":", ""), 10) || 9999 : 9999,
          pid: p.id,
        });
      }
    });
    items.sort((a, b) => a.sk - b.sk);
    return items;
  }, [i, o, A]);

  /* ── Upcoming OPs ── */
  const uo = useMemo(() => {
    return i
      .filter((p) => {
        const d = p.date || (p.scheduledAt ? p.scheduledAt.split("T")[0] : "");
        return d >= A && p.status !== "cancelled" && p.status !== "canceled";
      })
      .sort((a, b) => (a.date || a.scheduledAt || "").localeCompare(b.date || b.scheduledAt || ""))
      .slice(0, 5)
      .map((p) => {
        const dt = p.date || (p.scheduledAt ? p.scheduledAt.split("T")[0] : "");
        const dd = dt ? new Date(dt) : null;
        return {
          nm: p.patientName || p.patient || "Patient",
          dt: dd ? `${String(dd.getDate()).padStart(2, "0")}.${String(dd.getMonth() + 1).padStart(2, "0")}` : "–",
          tx: p.treatmentType || "HT",
          gf: p.grafts || "–",
          dc: p.doctorName || p.doctor || "–",
          st: p.status || "booked",
        };
      });
  }, [i, o, A]);

  /* ── Transfer widget ── */
  const ar = useMemo(() => {
    return o
      .filter((p) => p.flightConfirmed?.date && (p.stage === "booked" || p.stage === "done"))
      .sort((a, b) => (a.flightConfirmed.date || "").localeCompare(b.flightConfirmed.date || ""))
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        nm: (p.name || "Patient").split(" ")[0],
        ft: ((p.flightConfirmed.airline || "") + " " + (p.flightConfirmed.flightNo || "")).trim() || "–",
        dt: (() => {
          const d = new Date(p.flightConfirmed.date);
          return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
        })(),
        drv: p.logistics?.driverName || null,
        drvStatus: p.logistics?.status || null,
      }));
  }, [o]);

  /* ── WhatsApp connected ── */
  const wa = n?.connection_status === "connected";

  /* ── Automation systems ── */
  const hasAut = n?.automations?.some((a) => a.active);
  const hasGoogle = !!n?.google_connected;
  const systems = [
    { l: T("AI Bot", "KI-Bot", "Yapay Zeka Bot"), ok: wa },
    { l: T("Appointments", "Termine & Buchungen", "Randevular"), ok: hasAut },
    { l: T("Aftercare", "Nachsorge & Bewertungen", "Bakım Sonrası"), ok: hasAut },
    { l: T("Logistics", "Logistik", "Lojistik"), ok: hasAut },
    { l: "Google Drive", ok: hasGoogle },
    { l: T("Calendar Sync", "Kalender-Sync", "Takvim Senkr."), ok: hasGoogle },
  ];

  /* ── Styles ── */
  const card = { padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" };
  const statStyle = (c) => ({ padding: "16px 20px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" });

  return (
    <div style={{ padding: 28 }}>
      <style>{`@keyframes fmPulseGreen{0%{box-shadow:0 0 0 0 rgba(16,185,129,0.6)}70%{box-shadow:0 0 0 6px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}@keyframes fmDotPulse{0%,100%{opacity:1;box-shadow:0 0 4px rgba(239,68,68,0.6)}50%{opacity:0.4;box-shadow:0 0 8px rgba(239,68,68,0.3)}}`}</style>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 13, color: "rgba(167,177,195,0.6)", marginBottom: 4 }}>{gr}</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "#fff" }}>
            {(() => {
              const key = "fm_has_visited";
              const visited = localStorage.getItem(key);
              if (!visited) { localStorage.setItem(key, "1"); return `${t("welcome") || "Herzlich willkommen"}, ${clinic?.name || un}`; }
              return `${t("welcome_back") || "Willkommen zurück"}, ${un}`;
            })()}
          </h1>
        </div>
        {/* "Trial überspringen" pill removed — the global trial countdown
            banner above the dashboard already has that CTA, so a second
            instance was duplicate / pricing pressure. */}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PRIMARY HERO — Auto demo tour
          This is the FIRST thing a trial user sees. Large, high-contrast,
          accent-colored, single primary CTA. The setup checklist used to
          live above this; it has been moved below the live-test section
          to reduce perceived setup friction.
          ═══════════════════════════════════════════════════════════════ */}
      {!demoTourOpen && workspaceState !== 'active' && (
        <div style={{
          padding: "32px 36px", borderRadius: 20,
          background: "linear-gradient(135deg, rgba(168,85,247,0.14), rgba(76,201,255,0.06))",
          border: "1px solid rgba(168,85,247,0.32)",
          marginBottom: 20,
          boxShadow: "0 10px 40px rgba(168,85,247,0.15)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decorative glow */}
          <div style={{ position: "absolute", top: -80, right: -80, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.18), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 99, background: "rgba(168,85,247,0.16)", border: "1px solid rgba(168,85,247,0.3)", marginBottom: 14 }}>
                <span style={{ fontSize: 13 }}>🎬</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#c084fc", letterSpacing: "0.08em" }}>
                  {T("LIVE PRODUCT TOUR", "LIVE PRODUKT-TOUR", "CANLI ÜRÜN TURU")}
                </span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 10px", lineHeight: 1.2, letterSpacing: -0.4 }}>
                {T(
                  "From WhatsApp request to booked patient — automatically",
                  "Von WhatsApp-Anfrage zu gebuchtem Patienten – automatisch",
                  "WhatsApp talebinden rezerveli hastaya — otomatik olarak"
                )}
              </h2>
              <p style={{ fontSize: 14, color: "rgba(200,215,240,0.75)", margin: 0, lineHeight: 1.55, maxWidth: 560 }}>
                {T(
                  "See how requests, photos, review, booking, flight and driver all run automatically.",
                  "Erlebe, wie Anfragen, Fotos, Bewertung, Buchung, Flug und Fahrer automatisch ablaufen.",
                  "Talepler, fotoğraflar, değerlendirme, rezervasyon, uçuş ve sürücünün otomatik olarak nasıl çalıştığını izleyin."
                )}
              </p>
            </div>
            <button
              onClick={() => setDemoTourOpen(true)}
              style={{
                padding: "16px 32px", borderRadius: 12,
                background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                color: "#fff", fontWeight: 800, fontSize: 15,
                border: "none", cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 8px 28px rgba(168,85,247,0.45)",
                flexShrink: 0, whiteSpace: "nowrap",
                transition: "transform .15s, box-shadow .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(168,85,247,0.55)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 28px rgba(168,85,247,0.45)"; }}
            >
              {T("Start demo", "Demo starten", "Demoyu başlat")} →
            </button>
          </div>
        </div>
      )}
      {/* AutoDemoPlayer overlay is mounted globally in MainLayout so it
          survives view changes (the player calls setView() to walk through
          the CRM and would otherwise unmount itself). */}

      {/* ═══════════════════════════════════════════════════════════════
          SECONDARY — Live test (Bot live selbst testen)
          Was previously a global header banner above all main pages.
          Moved here as a secondary section below the demo hero so the
          primary action is unmistakably "play the demo".
          ═══════════════════════════════════════════════════════════════ */}
      {workspaceState === 'live_test' && (() => {
        const ti = testInfo;
        const phoneDisplay = ti?.testPhone || '+1 639 526 4925';
        const phoneClean = phoneDisplay.replace(/[\s\-\(\)]/g, '');
        const clinicCode = (activeClinicId || '').substring(0, 8).toUpperCase();
        const waLink = `https://wa.me/${phoneClean.replace('+', '')}?text=START-${clinicCode}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(waLink)}&bgcolor=0f1623&color=10b981`;
        const msgUsed = ti?.session?.messagesCount || 0;
        const msgLimit = ti?.limits?.maxMessages || ti?.session?.messageLimit || 50;
        const msgRemaining = Math.max(0, msgLimit - msgUsed);
        const pct = Math.min(100, Math.round((msgUsed / msgLimit) * 100));
        // Color shifts as the customer gets close to the limit
        const counterColor = msgRemaining <= 5 ? "#ef4444" : msgRemaining <= 15 ? "#fbbf24" : "#10b981";
        return (
          <div style={{
            padding: "20px 24px", borderRadius: 16,
            background: "linear-gradient(135deg, rgba(37,211,102,0.06), rgba(76,201,255,0.02))",
            border: "1px solid rgba(37,211,102,0.18)",
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 240 }}>
                <div style={{ width: 12, height: 12, borderRadius: 99, background: "#10b981", animation: "fmPulseGreen 2s infinite", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                      {T("Test the bot live yourself", "Bot live selbst testen", "Botu canlı kendiniz test edin")}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", letterSpacing: 0.5 }}>
                      {T("TEST MODE", "TESTMODUS", "TEST MODU")}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: `${counterColor}1a`, color: counterColor, border: `1px solid ${counterColor}40`, letterSpacing: 0.3 }}>
                      {msgUsed} / {msgLimit} {T("msgs", "Nachr.", "msj")}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(200,215,240,0.7)", marginTop: 3 }}>
                    {T(
                      "Send a WhatsApp message — your bot replies instantly. No setup required.",
                      "Schicke eine WhatsApp-Nachricht — dein Bot antwortet sofort. Keine Einrichtung nötig.",
                      "Bir WhatsApp mesajı gönderin — botunuz anında yanıtlar. Kurulum gerekmez."
                    )}
                  </div>
                  {/* Mini progress bar — gives a visual sense of remaining test budget */}
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, maxWidth: 360 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: counterColor, transition: "width 0.3s, background 0.3s" }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(200,215,240,0.55)", whiteSpace: "nowrap" }}>
                      {msgRemaining} {T("left", "übrig", "kaldı")}
                    </span>
                  </div>
                </div>
              </div>
              <a href={waLink} target="_blank" rel="noopener" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "11px 22px",
                background: "linear-gradient(135deg, #25D366, #128C7E)",
                color: "white", fontWeight: 700, fontSize: 13,
                border: "none", borderRadius: 10, textDecoration: "none", cursor: "pointer",
                boxShadow: "0 4px 18px rgba(37,211,102,0.25)",
                flexShrink: 0, whiteSpace: "nowrap",
              }}>
                {T("Send test message", "Testnachricht senden", "Test mesajı gönder")} →
              </a>
              <img src={qrUrl} alt="QR" style={{ width: 56, height: 56, borderRadius: 8, border: "1px solid rgba(37,211,102,0.2)", flexShrink: 0 }} />
            </div>
          </div>
        );
      })()}

      {/* ── 3-step onboarding stepper (live_test only) ── */}
      {workspaceState === 'live_test' && (() => {
        const demoSeen = (() => { try { return localStorage.getItem("fm_demo_tour_seen") === "1"; } catch { return false; } })();
        const botTested = (testInfo?.session?.messagesCount || 0) > 0;
        const activeStep = demoSeen ? (botTested ? 2 : 1) : 0;
        const STEPS = [
          { label: T("View demo", "Demo ansehen", "Demo izle"), done: demoSeen, onClick: () => setDemoTourOpen(true) },
          { label: T("Test bot live", "Bot live testen", "Canlı bot testi"), done: botTested },
          { label: T("Setup (optional)", "Einrichtung (optional)", "Kurulum (isteğe bağlı)"), done: false, onClick: () => setView("setup") },
        ];
        return (
          <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 8 }}>
            {STEPS.map((s, idx) => (
              <div
                key={idx}
                onClick={s.onClick}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  cursor: s.onClick ? "pointer" : "default",
                  opacity: !s.done && idx > activeStep ? 0.4 : 1,
                  padding: "4px 0",
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                  background: s.done ? "rgba(16,185,129,0.18)" : idx === activeStep ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)",
                  border: `2px solid ${s.done ? "#10b981" : idx === activeStep ? "#a855f7" : "rgba(255,255,255,0.1)"}`,
                  color: s.done ? "#10b981" : idx === activeStep ? "#c084fc" : "rgba(167,177,195,0.4)",
                }}>
                  {s.done ? "✓" : idx + 1}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 600, flex: 1,
                  color: s.done ? "rgba(167,177,195,0.6)" : idx === activeStep ? "rgba(232,238,252,0.9)" : "rgba(167,177,195,0.4)",
                  textDecoration: s.done ? "line-through" : "none",
                }}>
                  {s.label}
                </span>
                {!s.done && idx === activeStep && s.onClick && (
                  <span style={{ fontSize: 12, color: "#a855f7" }}>→</span>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Setup card (Einrichtung erforderlich) — above performance indicator ── */}
      <AdvancedSetupCard />

      {/* ── System performance indicator (Dein System läuft) ── */}
      <PerformanceIndicator />

      {/* ── First steps hint (combined) ── */}
      {o.filter(p => !p.is_demo).length === 0 && (
        <HintBox id="first_steps" style={{marginBottom:16}}>{t("hint_first_steps")}</HintBox>
      )}

      {/* ── Status Banner ── */}
      {ds === "automated" && hasGoogle && (
        <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: "#10b981", animation: "fmPulseGreen 2s infinite" }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#10b981" }}>{T("Everything runs automatically", "Alles läuft automatisch", "Her şey otomatik çalışıyor")}</div>
              <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginTop: 2 }}>{T("No action required", "Keine Aktion erforderlich", "İşlem gerekmiyor")}</div>
            </div>
          </div>
          <span style={{ padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, background: "rgba(16,185,129,0.15)", color: "#10b981", letterSpacing: "0.05em" }}>LIVE</span>
        </div>
      )}

      {/* Legacy "Get the full experience" yellow banner removed — duplicated AdvancedSetupCard
          and pushed users to generic /settings (spec: no generic navigation, no duplication). */}

      {ds === "action" && (
        <div style={{ borderRadius: 14, background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.1)", marginBottom: 20, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "rgba(232,238,252,0.9)" }}>{T("Just one more thing to optimize", "Noch eine Sache optimieren", "Optimize edilecek bir şey daha")}</span>
            <span style={{ color: "rgba(167,177,195,0.5)" }}>·</span>
            <span style={{ fontSize: 12, color: "rgba(167,177,195,0.65)" }}>{crT}</span>
          </div>
          {crG.map((c) => (
            <div key={c.type} style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.label}</div>
                  {c.desc && <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginTop: 2 }}>{c.desc}</div>}
                </div>
              </div>
              <span onClick={() => setView("action_needed")} style={{ color: "#4cc9ff", cursor: "pointer", fontSize: 16 }}>→</span>
            </div>
          ))}
          <div onClick={() => setView("action_needed")} style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.04)", textAlign: "center", fontSize: 12, color: "rgba(76,201,255,0.85)", cursor: "pointer", fontWeight: 600 }}>{T("Open tasks", "Zu den Aufgaben", "Görevlere git")} →</div>
        </div>
      )}

      {ds === "waiting" && (
        <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: "#fbbf24" }} />
            <div style={{ fontWeight: 700, fontSize: 14, color: "#fbbf24" }}>{wtT} {T("items in progress", "Punkte in Bearbeitung", "öğe işleniyor")}</div>
          </div>
          {wtG.map((c) => (
            <div key={c.type} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13 }}>
              <span>{c.icon}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{c.label}</div>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.75)", fontStyle: "italic", marginTop: 2 }}>{c.auto} →</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { v: mt.tl, l: T("OPEN LEADS", "OFFENE LEADS", "AÇIK LEADS"), c: "#4cc9ff" },
          { v: mt.tb, l: T("BOOKINGS TODAY", "BUCHUNGEN HEUTE", "BUGÜNKÜ REZ."), c: "#10b981" },
          { v: mt.ac, l: T("ACTIVE CHATS", "AKTIVE CHATS", "AKTİF SOHBET"), c: "#ff8a2a" },
          { v: mt.rv > 0 ? `€${Math.round(mt.rv / 1000)}k` : "€0k", l: "PIPELINE", c: "#10b981" },
        ].map((s, i) => (
          <div key={i} style={statStyle(s.c)}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.75)", letterSpacing: "0.05em", marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Medical Review + Auto Driver Info Bar ── */}
      {(rvC > 0 || drAC > 0) && (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.08)", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: "#4cc9ff", marginTop: 4, flexShrink: 0, animation: "fmPulseGreen 2s ease-in-out infinite", boxShadow: "0 0 6px rgba(76,201,255,0.5)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {rvC > 0 && <span>{rvC} {T("medical reviews in progress", "ärztliche Bewertungen werden durchgeführt", "tıbbi değerlendirme yapılıyor")}</span>}
              {drAC > 0 && <span>{drAC} {T("drivers being auto-assigned", "Fahrer werden automatisch zugewiesen", "şoförler otomatik atanıyor")}</span>}
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#4cc9ff", letterSpacing: "0.05em" }}>{T("IN BACKGROUND", "IM HINTERGRUND", "ARKA PLANDA")}</span>
        </div>
      )}

      {/* ── Automation Badges ── */}
      <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.65)", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>⚙️ {T("AUTOMATION", "AUTOMATISIERUNG", "OTOMASYON")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {systems.map((s, i) => (
            <div key={i} style={{ padding: "8px 16px", borderRadius: 10, background: s.ok ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)", border: `1px solid ${s.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)"}`, display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
              <div style={{ width: 6, height: 6, borderRadius: 99, background: s.ok ? "#10b981" : "#ef4444", ...(s.ok ? { animation: "fmPulseGreen 2s infinite" } : {}) }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: s.ok ? "rgba(232,238,252,0.9)" : "#ef4444" }}>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Google Drive hint moved to yellow banner above */}

      {/* ── Two-column: Today + Upcoming OPs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Today */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>📅 {T("TODAY", "HEUTE", "BUGÜN")}</div>
            <div onClick={() => setView("appointments")} style={{ fontSize: 11, color: "#4cc9ff", cursor: "pointer", fontWeight: 600 }}>{T("Calendar", "Kalender", "Takvim")} →</div>
          </div>
          {tl.length === 0 ? (
            <div style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", padding: "20px 0", textAlign: "center" }}>{T("No appointments today", "Keine Termine heute", "Bugün randevu yok")}</div>
          ) : (
            tl.map((ev, i) => (
              <div key={i} onClick={() => ev.pid && openPatient(ev.pid)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < tl.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: ev.pid ? "pointer" : "default" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: ev.cl, minWidth: 42 }}>{ev.tm}</div>
                <span style={{ fontSize: 13 }}>{ev.ic}</span>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.tp}</div>
                <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", marginLeft: "auto" }}>{ev.nm}</div>
              </div>
            ))
          )}
        </div>

        {/* Upcoming OPs */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>🏥 {T("UPCOMING OPS", "NÄCHSTE OPS", "YAKLAŞAN OP'LER")}</div>
          {uo.length === 0 ? (
            <div style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", padding: "20px 0", textAlign: "center" }}>{T("No upcoming operations", "Keine anstehenden OPs", "Yaklaşan operasyon yok")}</div>
          ) : (
            uo.map((op, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < uo.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: 99, background: "#10b981" }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)", minWidth: 38 }}>{op.dt}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{op.nm}</div>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginLeft: "auto" }}>{op.tx} · {op.gf}g · {op.dc}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Transfers & Arrivals ── */}
      {ar.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>🚐 {T("TRANSFERS & ARRIVALS", "TRANSFERS & ANKÜNFTE", "TRANSFERLER & VARIŞLAR")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {ar.map((p) => (
              <div key={p.id} onClick={() => openPatient(p.id)} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.nm}</div>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)" }}>{p.ft}</div>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)" }}>{p.dt}</div>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                  {p.drv ? (
                    <><span style={{ color: "#10b981" }}>✓</span> <span style={{ color: "rgba(167,177,195,0.7)" }}>{p.drv.split(" ")[0]}</span></>
                  ) : p.drvStatus === "all_declined" ? (
                    <span style={{ color: "#ef4444" }}>✕ {T("All declined", "Alle abgelehnt", "Tümü reddetti")}</span>
                  ) : (
                    <span style={{ color: "rgba(167,177,195,0.7)" }}>⏳ {T("Pending", "Ausstehend", "Beklemede")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
