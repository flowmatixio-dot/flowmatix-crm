import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { TOUR_STEPS } from "../../data/constants";

export default function ProductTour() {
  const { tourActive, setTourActive, tourStep, setTourStep, setTourCompleted, setView, t } = useApp();
  const [rect, setRect] = useState(null);

  const step = TOUR_STEPS[tourStep];

  const updateRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      setRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!tourActive) return;
    // Navigate to the right view for each step
    const viewMap = { dashboard: "dashboard", inbox: "inbox", pipeline: "pipeline", automations: "automations", revenue: "revenue" };
    if (viewMap[step?.id]) setView(viewMap[step.id]);
    // Small delay for DOM to update
    const timer = setTimeout(updateRect, 300);
    window.addEventListener("resize", updateRect);
    return () => { clearTimeout(timer); window.removeEventListener("resize", updateRect); };
  }, [tourActive, tourStep, step, updateRect, setView]);

  if (!tourActive) return null;

  const goNext = () => {
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(tourStep + 1);
    } else {
      finish();
    }
  };
  const goBack = () => { if (tourStep > 0) setTourStep(tourStep - 1); };
  const finish = () => {
    setTourActive(false);
    setTourStep(0);
    setTourCompleted(true);
    try { localStorage.setItem("fm_tour_done", "1"); } catch {}
  };

  const pad = 8;
  const spotTop = rect ? rect.top - pad : 0;
  const spotLeft = rect ? rect.left - pad : 0;
  const spotW = rect ? rect.width + pad * 2 : 0;
  const spotH = rect ? rect.height + pad * 2 : 0;

  // Position tooltip near the highlighted element
  const tipStyle = {};
  if (rect) {
    if (step.position === "right") {
      tipStyle.top = Math.max(20, rect.top);
      tipStyle.left = rect.left + rect.width + 20;
    } else {
      tipStyle.top = Math.max(20, rect.top);
      tipStyle.right = window.innerWidth - rect.left + 20;
    }
  } else {
    tipStyle.top = "50%";
    tipStyle.left = "50%";
    tipStyle.transform = "translate(-50%,-50%)";
  }

  return <>
    {/* Overlay with spotlight cutout using clip-path */}
    <div style={{ position: "fixed", inset: 0, zIndex: 9990, pointerEvents: "none" }}>
      <div style={{
        position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)",
        clipPath: rect
          ? `polygon(0% 0%, 0% 100%, ${spotLeft}px 100%, ${spotLeft}px ${spotTop}px, ${spotLeft + spotW}px ${spotTop}px, ${spotLeft + spotW}px ${spotTop + spotH}px, ${spotLeft}px ${spotTop + spotH}px, ${spotLeft}px 100%, 100% 100%, 100% 0%)`
          : "none",
        transition: "clip-path .3s ease"
      }} />
      {rect && <div style={{
        position: "absolute", top: spotTop, left: spotLeft, width: spotW, height: spotH,
        borderRadius: 12, border: "2px solid rgba(76,201,255,0.5)", boxShadow: "0 0 20px rgba(76,201,255,0.15)",
        pointerEvents: "none", transition: "all .3s ease"
      }} />}
    </div>

    {/* Click blocker (except spotlight area) */}
    <div onClick={e => e.stopPropagation()} style={{ position: "fixed", inset: 0, zIndex: 9991, cursor: "default" }} />

    {/* Tooltip card */}
    <div style={{
      position: "fixed", zIndex: 9992, ...tipStyle,
      width: 320, padding: 24, borderRadius: 16,
      background: "linear-gradient(135deg, #15243a, #131c2e)",
      border: "1px solid rgba(76,201,255,0.2)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      animation: "slI .25s ease"
    }}>
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {TOUR_STEPS.map((_, i) => <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i <= tourStep ? "#4cc9ff" : "rgba(255,255,255,0.08)",
          transition: "background .3s"
        }} />)}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: "#4cc9ff", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>
        {t("step_x_of_y").replace("{x}",tourStep + 1).replace("{y}",TOUR_STEPS.length)}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{step?.title}</div>
      <div style={{ fontSize: 14, color: "rgba(167,177,195,0.7)", lineHeight: 1.5, marginBottom: 20 }}>{step?.desc}</div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={finish} style={{
          padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.7)",
          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
        }}>{t("tour_skip")}</button>
        <div style={{ display: "flex", gap: 8 }}>
          {tourStep > 0 && <button onClick={goBack} style={{
            padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)", color: "rgba(232,238,252,0.9)",
            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
          }}>{t("tour_back")}</button>}
          <button onClick={goNext} style={{
            padding: "8px 20px", borderRadius: 8,
            background: tourStep === TOUR_STEPS.length - 1 ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#4cc9ff,#2da8ff)",
            border: "none", color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
          }}>{tourStep === TOUR_STEPS.length - 1 ? t("tour_finish") : t("tour_next")}</button>
        </div>
      </div>
    </div>
  </>;
}

/* Welcome modal shown on first login */
export function TourWelcomeModal() {
  const { tourCompleted, setTourActive, setTourStep, t } = useApp();
  const [show, setShow] = useState(false);
  const [reminded, setReminded] = useState(false);

  useEffect(() => {
    if (!tourCompleted && !reminded) {
      try {
        const done = localStorage.getItem("fm_tour_done");
        const later = sessionStorage.getItem("fm_tour_later");
        if (!done && !later) setShow(true);
      } catch { setShow(true); }
    }
  }, [tourCompleted, reminded]);

  if (!show) return null;

  return <div style={{ position: "fixed", inset: 0, zIndex: 9980, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div onClick={() => setShow(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
    <div style={{
      position: "relative", width: 440, padding: 36, borderRadius: 20,
      background: "linear-gradient(135deg, #15243a, #131c2e)",
      border: "1px solid rgba(76,201,255,0.2)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      textAlign: "center", animation: "slI .3s ease"
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{t("tour_welcome")}</div>
      <div style={{ fontSize: 15, color: "rgba(167,177,195,0.7)", lineHeight: 1.5, marginBottom: 24 }}>
        {t("tour_welcome_desc")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => { setShow(false); setTourStep(0); setTourActive(true); }} style={{
          padding: "14px 32px", borderRadius: 14, background: "linear-gradient(135deg,#4cc9ff,#2da8ff)",
          border: "none", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 4px 12px rgba(76,201,255,0.3)"
        }}>✨ {t("tour_start")}</button>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => { setShow(false); setReminded(true); try { sessionStorage.setItem("fm_tour_later", "1"); } catch {} }} style={{
            padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.6)",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
          }}>{t("tour_remind")}</button>
          <button onClick={() => { setShow(false); try { localStorage.setItem("fm_tour_done", "1"); } catch {} }} style={{
            padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.6)",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
          }}>{t("tour_skip")}</button>
        </div>
      </div>
    </div>
  </div>;
}
