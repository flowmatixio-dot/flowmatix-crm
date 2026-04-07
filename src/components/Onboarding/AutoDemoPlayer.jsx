/**
 * AutoDemoPlayer — guided product tour with real demo data.
 *
 * Triggered from Dashboard "🎬 Komplette Demo abspielen" button.
 *
 * Lifecycle:
 *   idle → preparing → running ↔ paused → completed → cleaning → idle
 *                              ↘ failed
 *
 * 1. User clicks Trigger button somewhere on the dashboard
 * 2. Player calls POST /api/v1/clinic/mode/demo/run-tour
 *    Backend acquires Redis lock + creates 1 demo patient with full
 *    journey (events, photos, review, booking, flight, driver, opprep)
 * 3. Player walks through 9 views with timed setView() calls and
 *    a floating overlay showing step + label + controls
 * 4. User can pause / resume / replay / exit at any time
 * 5. On exit (or completion + auto-cleanup), the player calls
 *    POST /api/v1/clinic/mode/demo/cleanup-tour which wipes ONLY
 *    the demo_tour-tagged rows
 *
 * SAFETY:
 *  - All data is_demo=true and tagged demo_tour
 *  - Demo phone is +99999... (test range, can't collide with real WA)
 *  - Cleanup is row-tag-filtered, never touches real data
 *  - Redis lock prevents two parallel tours in the same org
 *  - No external messaging triggered (events are written, not sent)
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";
import { useInboxStore } from "../../stores/inboxStore";

const T = (en, de, tr) => ({ en, de, tr }[localStorage.getItem("fm_lang") || "de"] || de);

// Local demo photo URLs — real patient sample photos served by the CRM
// nginx (same origin), so they load instantly with zero external
// dependency. Used for the photo step of the auto demo tour.
const DEMO_PHOTO_URLS = {
  front: "/demo-photo-front.jpg",
  top:   "/demo-photo-top.jpg",
  side:  "/demo-photo-side.jpg",
};

// 9-step playback sequence — each step navigates to the right view +
// shows a polished title + sublabel in the bottom overlay. Durations
// are tuned to feel "quick but readable". Copy is intentionally short,
// outcome-focused, and free of engineering language.
const STEPS = [
  {
    id: "inbox_message",
    view: "inbox",
    title:    { de: "Neue Anfrage", en: "New request", tr: "Yeni talep" },
    sublabel: {
      de: "Der Bot reagiert sofort auf eine neue WhatsApp-Anfrage.",
      en: "The bot instantly responds to every new WhatsApp request.",
      tr: "Bot, yeni bir WhatsApp talebine anında yanıt verir.",
    },
    duration: 5000,
  },
  {
    id: "inbox_photos",
    view: "inbox",
    title:    { de: "Patient sendet Fotos", en: "Patient sends photos", tr: "Hasta fotoğraf gönderiyor" },
    sublabel: {
      de: "Fotos werden automatisch dem Patienten zugeordnet.",
      en: "Photos are automatically linked to the patient record.",
      tr: "Fotoğraflar otomatik olarak hasta kaydına eklenir.",
    },
    // 3 photos × 500ms gap = ~1500ms + buffer to read the last one
    duration: 4000,
    onEnter: "addPhotosSequentially",
  },
  {
    id: "review",
    view: "inbox",
    title:    { de: "Ärztliche Bewertung", en: "Medical review", tr: "Tıbbi değerlendirme" },
    sublabel: {
      de: "Die medizinische Einschätzung wird direkt im System erfasst.",
      en: "The medical assessment is captured directly in the system.",
      tr: "Tıbbi değerlendirme doğrudan sistemde kaydedilir.",
    },
    duration: 7000,
    onEnter: "openReviewPopup",
  },
  {
    id: "booking",
    view: "inbox",
    title:    { de: "Termin bestätigt", en: "Appointment confirmed", tr: "Randevu onaylandı" },
    sublabel: {
      de: "Der Patient bestätigt den vorgeschlagenen Termin direkt im Chat.",
      en: "The patient confirms the proposed appointment right in the chat.",
      tr: "Hasta önerilen randevuyu doğrudan sohbette onaylar.",
    },
    duration: 5000,
    onEnter: "confirmBooking",
  },
  {
    id: "calendar",
    view: "appointments",
    title:    { de: "Termin im Kalender", en: "Appointment in the calendar", tr: "Randevu takvimde" },
    sublabel: {
      de: "Der bestätigte Termin erscheint sofort im Kalender.",
      en: "The confirmed appointment appears in the calendar instantly.",
      tr: "Onaylanan randevu takvimde anında görünür.",
    },
    duration: 6000,
    onEnter: "openAppointmentDetail",
  },
  {
    id: "pipeline",
    view: "pipeline",
    title:    { de: "Patient in der Pipeline", en: "Patient in the pipeline", tr: "Hattaki hasta" },
    sublabel: {
      de: "Der Fall wechselt automatisch in die richtige Phase.",
      en: "The case automatically moves to the right stage.",
      tr: "Vaka otomatik olarak doğru aşamaya geçer.",
    },
    duration: 5000,
  },
  {
    id: "hotel_assignment",
    view: "action_needed",
    title:    { de: "Hotel muss zugewiesen werden", en: "Hotel needs to be assigned", tr: "Otel atanmalı" },
    sublabel: {
      de: "Das System erstellt automatisch die nächste Aufgabe für das Team.",
      en: "The system automatically creates the next task for the team.",
      tr: "Sistem ekip için bir sonraki görevi otomatik olarak oluşturur.",
    },
    duration: 7000,
    onEnter: "openHotelAssign",
  },
  {
    id: "op_prep",
    view: "op_prep",
    title:    { de: "OP-Vorbereitung", en: "Pre-op preparation", tr: "Ameliyat öncesi hazırlık" },
    sublabel: {
      de: "Medizinische und organisatorische Schritte werden zentral vorbereitet.",
      en: "Medical and logistical steps are prepared centrally.",
      tr: "Tıbbi ve organizasyonel adımlar merkezi olarak hazırlanır.",
    },
    duration: 7000,
    onEnter: "openOpPrepDetail",
  },
  {
    id: "patient_record",
    view: "inbox",
    title:    { de: "Komplette Patientenakte", en: "Full patient record", tr: "Tam hasta dosyası" },
    sublabel: {
      de: "Vom ersten Kontakt bis zur vollständigen Patientenakte – alles automatisch.",
      en: "From first contact to a complete patient record — fully automatic.",
      tr: "İlk temastan tam hasta dosyasına kadar — tamamen otomatik.",
    },
    duration: 6000,
    onEnter: "openPatientRecord",
  },
];

// Final payoff line shown briefly at the very end of the tour.
const FINAL_LINE = {
  de: "Alles automatisch. 24/7.",
  en: "Fully automatic. 24/7.",
  tr: "Tamamen otomatik. 7/24.",
};

export default function AutoDemoPlayer({ onClose }) {
  const { setView, setSelAppt, setLeads, setSelLead } = useApp();
  const lang = localStorage.getItem("fm_lang") || "de";

  // State machine: idle → preparing → running ↔ paused → completed → cleaning → idle
  //                                                ↘ failed
  const [state, setState] = useState("preparing");
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState(null);
  const [tourMeta, setTourMeta] = useState(null);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);

  // ── Stable refs for functions used INSIDE the playback effect ──
  // The playback effect only depends on [state, stepIdx]; everything
  // else is reached through these refs so the effect doesn't re-fire
  // on every parent re-render (which would cause an infinite loop:
  // setView → MainLayout re-render → new onClose ref → effect re-run
  // → setView → …, React error #185).
  const setViewRef = useRef(setView);
  useEffect(() => { setViewRef.current = setView; });
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });
  const setSelApptRef = useRef(setSelAppt);
  useEffect(() => { setSelApptRef.current = setSelAppt; });
  const setLeadsRef = useRef(setLeads);
  useEffect(() => { setLeadsRef.current = setLeads; });
  const setSelLeadRef = useRef(setSelLead);
  useEffect(() => { setSelLeadRef.current = setSelLead; });

  // Centralized DOM cleanup — closes any popup/panel the player might
  // have opened. Called from every code path that ends/restarts a tour
  // (cleanup-tour, replay, exit, unmount). Idempotent.
  const closeOpenedUi = useCallback(() => {
    try { window.dispatchEvent(new CustomEvent("fm-close-review")); } catch {}
    try { document.getElementById("fm-hotel-assign")?.remove(); } catch {}
    try { setSelApptRef.current && setSelApptRef.current(null); } catch {}
    try { window.dispatchEvent(new CustomEvent("fm-close-op-prep")); } catch {}
    try { setSelLeadRef.current && setSelLeadRef.current(null); } catch {}
  }, []);

  const cleanup = useCallback(async () => {
    closeOpenedUi();
    try {
      await fmApi.apiFetch("/api/v1/clinic/mode/demo/cleanup-tour", { method: "POST" });
    } catch (e) {
      // non-fatal
    }
  }, [closeOpenedUi]);
  const cleanupRef = useRef(cleanup);
  useEffect(() => { cleanupRef.current = cleanup; });

  // Start the tour: ask backend to create the demo data, then advance
  // through STEPS one at a time. Runs once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fmApi.apiFetch("/api/v1/clinic/mode/demo/run-tour", { method: "POST" });
        if (cancelled) return;
        if (!res?.ok) throw new Error(res?.error || "tour_failed");
        setTourMeta(res);
        // Tell the app to drop its caches and re-fetch conversations +
        // patients NOW so the demo patient shows up in the inbox before
        // the playback advances past step 1 (otherwise the user has to
        // wait for the next 30s polling tick).
        try { window.dispatchEvent(new CustomEvent("fm:demo-tour-ready", { detail: { patientId: res.patientId } })); } catch {}
        setState("running");
        setStepIdx(0);
        startedAtRef.current = Date.now();
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Unknown error");
          setState("failed");
        }
      }
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      // Player is unmounting (or about to remount). Make sure no popup
      // or panel that we opened is left dangling on the screen.
      try { window.dispatchEvent(new CustomEvent("fm-close-review")); } catch {}
      try { document.getElementById("fm-hotel-assign")?.remove(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Playback effect — only depends on state + stepIdx. Functions are
  // accessed via refs above so this effect runs ONLY when the playback
  // actually advances, never on unrelated parent re-renders.
  useEffect(() => {
    if (state !== "running") return;
    const step = STEPS[stepIdx];
    if (!step) {
      setState("completed");
      setTimeout(() => {
        cleanupRef.current().finally(() => {
          if (onCloseRef.current) onCloseRef.current();
        });
      }, 1500);
      return;
    }
    setViewRef.current(step.view);

    // Optional per-step onEnter hook. Used by the photos step to drop
    // 3 photos into the case overview one by one — purely OPTIMISTIC:
    // the player patches selChat.photoUrls locally so the thumbnails
    // appear with zero network latency. Backend writes happen in the
    // background (fire-and-forget) so cleanup-tour can still find them.
    let cancelledHook = false;
    if (step.onEnter === "openReviewPopup") {
      // Fire the existing fm-open-review event so MainLayout opens the
      // real DoctorTasksView popup with our demo task pre-loaded.
      try { window.dispatchEvent(new CustomEvent("fm-open-review")); } catch {}
      // After the popup mounts, smoothly scroll the popup body all the
      // way down so the user sees photos + intake fields without having
      // to scroll manually. Two phases: scroll to bottom, then back up.
      setTimeout(() => {
        if (cancelledHook) return;
        const el = document.getElementById("fm-trial-review-scroll");
        if (!el) return;
        const max = el.scrollHeight - el.clientHeight;
        if (max <= 0) return;
        try { el.scrollTo({ top: max, behavior: "smooth" }); } catch { el.scrollTop = max; }
        setTimeout(() => {
          if (cancelledHook) return;
          try { el.scrollTo({ top: 0, behavior: "smooth" }); } catch { el.scrollTop = 0; }
        }, 3500);
      }, 1000);
    }
    if (step.onEnter === "confirmBooking") {
      // Backend: flip the demo patient into "booked" with flight info
      // and a backdated bookedAt so ActionNeededView's hotel-assign
      // escalation kicks in for the hotel step a few seconds later.
      // The endpoint also writes 3 chat messages (proposal +
      // confirmation + welcome) so the inbox shows the booking flow.
      fmApi.apiFetch("/api/v1/clinic/mode/demo/tour-confirm-booking", {
        method: "POST",
        body: "{}",
      }).then(() => {
        try { window.dispatchEvent(new CustomEvent("fm:demo-tour-refresh")); } catch {}
        // Trigger a chat message reload so the new booking messages
        // appear in the inbox right away. The InboxView polls every
        // 10s normally; this short-circuits that wait.
        try { window.dispatchEvent(new CustomEvent("fm-reload-chat-messages")); } catch {}
      }).catch(() => {});
    }
    if (step.onEnter === "openAppointmentDetail") {
      // Auto-open the appointment drawer for the demo tour appointment.
      // selAppt is just the appointment id; the drawer fetches the rest
      // from the appts store. The id was returned by run-tour as
      // tourMeta.appointmentId. Slight delay so the calendar view has
      // time to mount + render the cell first.
      const apptId = (tourMeta && tourMeta.appointmentId) || null;
      if (apptId) {
        setTimeout(() => {
          if (cancelledHook) return;
          try { setSelApptRef.current && setSelApptRef.current(apptId); } catch {}
        }, 800);
      }
    }
    if (step.onEnter === "openOpPrepDetail") {
      // Auto-open the OP-Prep detail drawer (right slide-in) for the
      // demo tour appointment. OpPrepView listens for fm-open-op-prep
      // and falls back to the first appt if no id is given.
      const apptId = (tourMeta && tourMeta.appointmentId) || null;
      setTimeout(() => {
        if (cancelledHook) return;
        try {
          window.dispatchEvent(new CustomEvent("fm-open-op-prep", {
            detail: { appointmentId: apptId },
          }));
        } catch {}
      }, 800);
    }
    if (step.onEnter === "openPatientRecord") {
      // Open the patient detail panel (slide-in) for the demo patient.
      // PatientPanel reads from leads via selLead id. Background view
      // is "inbox" so we don't trigger the FullCalendar render path
      // that fails on demo data (TypeError: t is not a function in
      // vendor-calendar bundle).
      const tourPatientId = (tourMeta && tourMeta.patientId) || null;
      if (tourPatientId) {
        setTimeout(() => {
          if (cancelledHook) return;
          try { setSelLeadRef.current && setSelLeadRef.current(tourPatientId); } catch {}
        }, 600);
      }
    }
    if (step.onEnter === "openHotelAssign") {
      // Open the real "Hotel zuweisen" panel from ActionNeededView for
      // the demo tour patient. Step:
      //  1. Force a fresh patient pull so the lead in myLeads has the
      //     post-confirmBooking state (stage='booked', flightConfirmed,
      //     bookedAt 2d ago) — without this the hotel-assign card never
      //     renders and there is nothing to trigger.
      //  2. Wait a beat for the action_needed view to mount + render.
      //  3. Dispatch fm-trigger-action so ActionNeededView fires the
      //     matching item.action() callback.
      const tourPatientId = (tourMeta && tourMeta.patientId) || null;
      try { window.dispatchEvent(new CustomEvent("fm:demo-tour-refresh")); } catch {}
      setTimeout(() => {
        if (cancelledHook) return;
        try {
          window.dispatchEvent(new CustomEvent("fm-trigger-action", {
            detail: { type: "hotel", patientId: tourPatientId },
          }));
        } catch {}
      }, 1500);
    }
    if (step.onEnter === "addPhotosSequentially") {
      const types = ["front", "top", "side"];
      const stagger = 450; // ms between thumbnails
      types.forEach((type, i) => {
        setTimeout(() => {
          if (cancelledHook) return;
          // Optimistic local update: append the photo URL to BOTH the
          // inbox store's selChat AND the leads array. Reason: the
          // Fallübersicht panel reads photos from leads (via overviewLead),
          // not from selChat — updating selChat alone wouldn't make the
          // thumbnails appear in the right panel during step 2.
          //
          // We use the ABSOLUTE URL (window.location.origin + path) so the
          // CaseOverviewPanel + PatientPanel "isReal" filter (startsWith
          // 'https://' || 'http://') treats them as real images instead
          // of falling back to a 📷 placeholder icon.
          let newPhotoUrls = null;
          let tourPatientId = null;
          const absoluteUrl = window.location.origin + DEMO_PHOTO_URLS[type];
          try {
            const store = useInboxStore.getState();
            const sc = store.selChat;
            if (sc) {
              const existing = Array.isArray(sc.photoUrls) ? sc.photoUrls : [];
              newPhotoUrls = [...existing, absoluteUrl];
              store.setSelChat({ ...sc, photoUrls: newPhotoUrls });
              tourPatientId = sc.patientId || sc.id;
            }
          } catch {}
          if (newPhotoUrls && tourPatientId && setLeadsRef.current) {
            try {
              setLeadsRef.current((prev) =>
                prev.map((l) =>
                  l.id === tourPatientId
                    ? { ...l, photoUrls: newPhotoUrls, photosReceived: newPhotoUrls.length, photos: true }
                    : l
                )
              );
            } catch {}
          }
          // Background DB write — non-blocking, ignored on failure.
          // Pass the same absolute URL so a later refresh stays consistent.
          fmApi
            .apiFetch("/api/v1/clinic/mode/demo/tour-add-photo", {
              method: "POST",
              body: JSON.stringify({
                photo_type: type,
                url: absoluteUrl,
              }),
            })
            .catch(() => {});
        }, i * stagger);
      });
    }

    timerRef.current = setTimeout(() => {
      setStepIdx((i) => i + 1);
    }, step.duration);
    return () => {
      cancelledHook = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      // If this step opened the review popup, close it as we leave so
      // the next step's view isn't covered.
      if (step.onEnter === "openReviewPopup") {
        try { window.dispatchEvent(new CustomEvent("fm-close-review")); } catch {}
      }
      // Same idea for the hotel-assign DOM panel: remove it on the way out.
      if (step.onEnter === "openHotelAssign") {
        try { document.getElementById("fm-hotel-assign")?.remove(); } catch {}
      }
      // Close the appointment drawer on the way out so the next view
      // (pipeline) isn't covered.
      if (step.onEnter === "openAppointmentDetail") {
        try { setSelApptRef.current && setSelApptRef.current(null); } catch {}
      }
      // Close the OP-Prep drawer on the way out — same reason.
      if (step.onEnter === "openOpPrepDetail") {
        try { window.dispatchEvent(new CustomEvent("fm-close-op-prep")); } catch {}
      }
      // Close the patient panel on the way out.
      if (step.onEnter === "openPatientRecord") {
        try { setSelLeadRef.current && setSelLeadRef.current(null); } catch {}
      }
    };
  }, [state, stepIdx]);

  const handlePause = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("paused");
  }, []);

  const handleResume = useCallback(() => {
    setState("running");
  }, []);

  const handleReplay = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("cleaning");
    await cleanup();
    // Restart by triggering a fresh run-tour. Easiest way: bounce mount.
    setStepIdx(0);
    setState("preparing");
    try {
      const res = await fmApi.apiFetch("/api/v1/clinic/mode/demo/run-tour", { method: "POST" });
      if (!res?.ok) throw new Error(res?.error || "tour_failed");
      setTourMeta(res);
      setState("running");
      startedAtRef.current = Date.now();
    } catch (e) {
      setError(e.message);
      setState("failed");
    }
  }, [cleanup]);

  const handleExit = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    try { window.dispatchEvent(new CustomEvent("fm-close-review")); } catch {}
    try { document.getElementById("fm-hotel-assign")?.remove(); } catch {}
    setState("cleaning");
    await cleanup();
    if (onClose) onClose();
  }, [cleanup, onClose]);

  const currentStep = STEPS[stepIdx] || STEPS[STEPS.length - 1];
  const progressPct = Math.round(((stepIdx + (state === "completed" ? 1 : 0)) / STEPS.length) * 100);
  const showOverlay = ["preparing", "running", "paused", "completed", "failed", "cleaning"].includes(state);

  if (!showOverlay) return null;

  // Resolve current step copy with language fallback
  const stepTitle = currentStep.title?.[lang] || currentStep.title?.de || "";
  const stepSub = currentStep.sublabel?.[lang] || currentStep.sublabel?.de || "";
  const counterLabel = T(
    `Step ${stepIdx + 1} of ${STEPS.length}`,
    `Schritt ${stepIdx + 1} von ${STEPS.length}`,
    `Adım ${stepIdx + 1} / ${STEPS.length}`
  );

  return (
    <>
      {/* Inline keyframes for the per-step entry animation. Subtle: fade
          + 6px translate + 0.985 scale. ~220ms ease-out. */}
      <style>{`
        @keyframes fmDemoStepIn {
          from { opacity: 0; transform: translateY(6px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fmDemoOverlayIn {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 999990,
          width: "min(680px, calc(100vw - 32px))",
          // Premium glass background — slightly stronger blur, deeper
          // gradient, soft multi-layer shadow + accent border glow.
          background: "linear-gradient(180deg, rgba(15,22,35,0.92), rgba(19,29,46,0.92))",
          backdropFilter: "blur(18px) saturate(140%)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
          border: "1px solid rgba(76,201,255,0.22)",
          borderRadius: 18,
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(76,201,255,0.05), 0 0 60px rgba(76,201,255,0.08)",
          padding: "20px 24px 18px",
          fontFamily: "inherit",
          color: "white",
          animation: "fmDemoOverlayIn .35s cubic-bezier(.2,.7,.2,1) both",
        }}
      >
        {/* ── Top label row: LIVE-DEMO-TOUR + counter + close ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "3px 9px", borderRadius: 99,
              background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.22)",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 99, background: "#c084fc", boxShadow: "0 0 6px rgba(192,132,252,0.8)" }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: "#c084fc", letterSpacing: "0.1em" }}>
                {T("LIVE DEMO TOUR", "LIVE-DEMO-TOUR", "CANLI DEMO TURU")}
              </span>
            </span>
            <span style={{ fontSize: 10.5, color: "rgba(167,177,195,0.55)", fontWeight: 600 }}>
              {state === "preparing"
                ? T("Preparing…", "Wird vorbereitet…", "Hazırlanıyor…")
                : state === "paused"
                ? T("Paused", "Pausiert", "Duraklatıldı")
                : state === "completed"
                ? T("Finished", "Beendet", "Tamamlandı")
                : state === "cleaning"
                ? T("Cleaning up…", "Wird aufgeräumt…", "Temizleniyor…")
                : state === "failed"
                ? T("Failed", "Fehlgeschlagen", "Başarısız")
                : counterLabel}
            </span>
          </div>
          <button
            onClick={handleExit}
            title={T("Exit demo", "Demo beenden", "Demoyu kapat")}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(200,215,240,0.55)",
              fontSize: 14,
              padding: "3px 9px",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(232,238,252,0.95)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(200,215,240,0.55)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            ×
          </button>
        </div>

        {/* ── Title + sublabel (the main focus) ── */}
        {state === "failed" ? (
          <div
            style={{
              fontSize: 13,
              color: "rgba(232,238,252,0.85)",
              background: "rgba(76,201,255,0.04)",
              border: "1px solid rgba(76,201,255,0.12)",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 14,
            }}
          >
            {error === "tour_already_running"
              ? T("A demo tour is already running. Try again in a minute.",
                  "Eine Demo-Tour läuft bereits. Versuch's in einer Minute nochmal.",
                  "Bir demo turu zaten çalışıyor. Bir dakika sonra tekrar deneyin.")
              : T(`Could not start demo: ${error}`, `Demo konnte nicht gestartet werden: ${error}`, `Demo başlatılamadı: ${error}`)}
          </div>
        ) : (
          <div
            // key on stepIdx so React re-mounts the block on every step
            // change → the entry keyframe re-plays automatically.
            key={`step-${stepIdx}-${state}`}
            style={{
              marginBottom: 14,
              animation: "fmDemoStepIn .22s cubic-bezier(.2,.7,.2,1) both",
            }}
          >
            <div
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: "rgba(245,248,255,0.96)",
                letterSpacing: -0.3,
                lineHeight: 1.25,
                marginBottom: 4,
              }}
            >
              {state === "preparing"
                ? T("Loading demo journey…", "Demo-Patient wird erstellt…", "Demo hastası oluşturuluyor…")
                : state === "completed"
                ? T("Full patient record", "Komplette Patientenakte", "Tam hasta dosyası")
                : stepTitle}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: "rgba(167,177,195,0.7)",
                lineHeight: 1.55,
                fontWeight: 500,
              }}
            >
              {state === "preparing"
                ? T("Setting up your demo patient and conversation…", "Dein Demo-Patient und die Konversation werden eingerichtet…", "Demo hastanız ve konuşmanız hazırlanıyor…")
                : state === "completed"
                ? (FINAL_LINE[lang] || FINAL_LINE.de)
                : stepSub}
            </div>
          </div>
        )}

        {/* ── Progress bar — refined gradient + soft glow ── */}
        <div style={{
          height: 4,
          borderRadius: 99,
          background: "rgba(255,255,255,0.05)",
          overflow: "hidden",
          marginBottom: 14,
          position: "relative",
        }}>
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              borderRadius: 99,
              background:
                state === "failed"
                  ? "linear-gradient(90deg, rgba(76,201,255,0.6), rgba(124,58,237,0.6))"
                  : state === "completed"
                  ? "linear-gradient(90deg, #10b981, #34d399)"
                  : "linear-gradient(90deg, #4cc9ff, #a855f7)",
              boxShadow: state === "completed"
                ? "0 0 12px rgba(16,185,129,0.4)"
                : "0 0 10px rgba(168,85,247,0.35)",
              transition: "width .55s cubic-bezier(.2,.7,.2,1)",
            }}
          />
        </div>

        {/* ── Controls — minimal + secondary styling ── */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {state === "running" && (
            <button onClick={handlePause} style={btnGhost}>
              {T("Pause", "Pause", "Duraklat")}
            </button>
          )}
          {state === "paused" && (
            <button onClick={handleResume} style={btnPrimary}>
              ▶ {T("Continue", "Weiter", "Devam et")}
            </button>
          )}
          {(state === "completed" || state === "failed") && (
            <button onClick={handleReplay} style={btnGhost}>
              ↻ {T("Replay", "Nochmal", "Tekrar oynat")}
            </button>
          )}
          <button onClick={handleExit} style={btnGhost}>
            {T("Exit", "Beenden", "Çıkış")}
          </button>
        </div>
      </div>
    </>
  );
}

const btnGhost = {
  padding: "7px 14px",
  background: "transparent",
  color: "rgba(200,215,240,0.7)",
  fontWeight: 600,
  fontSize: 11.5,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  letterSpacing: 0.1,
  transition: "all .15s",
};

const btnPrimary = {
  padding: "8px 16px",
  background: "linear-gradient(135deg, #4cc9ff, #2892d7)",
  color: "white",
  fontWeight: 700,
  fontSize: 12,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnSecondary = {
  padding: "8px 16px",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(232,238,252,0.85)",
  fontWeight: 700,
  fontSize: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
};
