import { useState, useEffect, useCallback, useRef } from "react";

// Rejection reason options
const getRejectionReasons = (t) => [
  { value: "insufficient_donor", label: t?.("reject_insufficient_donor") || "Spenderbereich unzureichend" },
  { value: "medical_condition", label: t?.("reject_medical_contraindication") || "Medizinische Kontraindikation" },
  { value: "too_young", label: t?.("reject_too_young") || "Patient zu jung" },
  { value: "unrealistic_expectations", label: t?.("reject_unrealistic_expectations") || "Unrealistische Erwartungen" },
  { value: "need_consultation", label: t?.("personal_consultation_needed") || "Persönliche Konsultation nötig" },
  { value: "other", label: t?.("reject_other") || "Anderer Grund" },
];

// Parse numeric value from string like "€3,200" or "3200"
function parseNumeric(val) {
  if (!val) return "";
  return String(val).replaceAll(/[^0-9]/g, "");
}

// Calculate age from DOB string
function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth)) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}

// Build photo URL — handles both full URLs and relative paths
function resolvePhotoUrl(url, api) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return url;
  // Relative path — try to resolve via API base
  return url;
}

const ANIM_DURATION = 320;

export default function DoctorReviewMode({ patients = [], onApprove, onReject, onRequestPhotos, onClose, t, api }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [grafts, setGrafts] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [animClass, setAnimClass] = useState("slideIn");
  const [showRejectDropdown, setShowRejectDropdown] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [zoomedPhoto, setZoomedPhoto] = useState(null);
  const containerRef = useRef(null);

  const patient = patients[currentIndex] || null;
  const total = patients.length;

  // Extract medical fields from patient
  const intake = patient?.intake || patient?.extractedFields || {};
  const fields = { ...(patient?.extractedFields || {}), ...(patient?.intake || {}) };

  // AI recommendation
  const aiGrafts = patient?.reviewData?.grafts || patient?.grafts || fields.grafts || "";
  const aiPrice = patient?.reviewData?.price || "";

  // Pre-fill form when patient changes
  useEffect(() => {
    if (!patient) return;
    setGrafts(parseNumeric(aiGrafts) || "");
    setPrice(parseNumeric(aiPrice) || "");
    setNotes(patient?.reviewData?.notes || "");
    setShowRejectDropdown(false);
    setRejectReason("");
    setAnimClass("slideIn");
  }, [currentIndex, patient?.id]);

  // Advance to next patient with animation
  const advanceTo = useCallback((direction, nextIdx) => {
    setAnimClass(direction === "right" ? "slideRight" : "slideLeft");
    setTimeout(() => {
      if (nextIdx >= total) {
        onClose();
      } else {
        setCurrentIndex(nextIdx);
      }
    }, ANIM_DURATION);
  }, [total, onClose]);

  // Action handlers
  const handleApprove = useCallback(() => {
    if (!patient) return;
    onApprove(patient.id, {
      grafts: grafts || aiGrafts,
      price: price ? `€${price}` : aiPrice,
      notes,
    });
    advanceTo("right", currentIndex + 1);
  }, [patient, grafts, price, notes, aiGrafts, aiPrice, currentIndex, onApprove, advanceTo]);

  const handleReject = useCallback((reason) => {
    if (!patient) return;
    onReject(patient.id, { reason: reason || rejectReason });
    setShowRejectDropdown(false);
    advanceTo("left", currentIndex + 1);
  }, [patient, rejectReason, currentIndex, onReject, advanceTo]);

  const handleRequestPhotos = useCallback(() => {
    if (!patient) return;
    onRequestPhotos(patient.id);
    advanceTo("right", currentIndex + 1);
  }, [patient, currentIndex, onRequestPhotos, advanceTo]);

  // Navigate without action
  const goTo = useCallback((idx) => {
    if (idx < 0 || idx >= total) return;
    setAnimClass(idx > currentIndex ? "slideIn" : "slideInReverse");
    setTimeout(() => setCurrentIndex(idx), 50);
  }, [currentIndex, total]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Don't capture if typing in input
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case "a":
        case "A":
          e.preventDefault();
          handleApprove();
          break;
        case "r":
        case "R":
          e.preventDefault();
          setShowRejectDropdown((v) => !v);
          break;
        case "m":
        case "M":
          e.preventDefault();
          handleRequestPhotos();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (currentIndex < total - 1) goTo(currentIndex + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (currentIndex > 0) goTo(currentIndex - 1);
          break;
        case "Escape":
          e.preventDefault();
          if (zoomedPhoto) setZoomedPhoto(null);
          else if (showRejectDropdown) setShowRejectDropdown(false);
          else onClose();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleApprove, handleRequestPhotos, currentIndex, total, goTo, onClose, zoomedPhoto, showRejectDropdown]);

  if (!patient || total === 0) return null;

  const photoUrls = patient.photoUrls || [];
  const photoLabels = ["FRONT", "TOP", "LEFT", "RIGHT", "DONOR", "DETAIL"];
  const age = fields.age || calcAge(patient.dob || fields.dob);
  const allergies = fields.allergies;
  const hasAllergies = allergies && !["no", "none", "nein", "keine", "-"].includes(String(allergies).toLowerCase());
  const medications = fields.medications;

  return (
    <div style={styles.overlay} ref={containerRef}>
      {/* CSS animations */}
      <style>{`
        @keyframes drm-slideRight { from { transform: translateX(0); opacity: 1 } to { transform: translateX(100px); opacity: 0 } }
        @keyframes drm-slideLeft { from { transform: translateX(0); opacity: 1 } to { transform: translateX(-100px); opacity: 0 } }
        @keyframes drm-slideIn { from { transform: translateX(50px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @keyframes drm-slideInReverse { from { transform: translateX(-50px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @keyframes drm-fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes drm-pulseGreen { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4) } 70% { box-shadow: 0 0 0 20px rgba(16,185,129,0) } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0) } }
        @keyframes drm-pulseRed { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4) } 70% { box-shadow: 0 0 0 20px rgba(239,68,68,0) } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0) } }
        .drm-photo:hover { transform: scale(1.03); border-color: rgba(76,201,255,0.4) !important; }
        .drm-btn:hover { filter: brightness(1.2); }
        .drm-input:focus { border-color: rgba(76,201,255,0.4) !important; outline: none; }
        .drm-reject-option:hover { background: rgba(239,68,68,0.15) !important; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>🩺</span>
          <span style={styles.headerTitle}>{t?.("doctor_review") || "Arzt-Review"}</span>
          <span style={styles.headerCounter}>{currentIndex + 1} / {total}</span>
        </div>
        <button
          onClick={onClose}
          style={styles.closeBtn}
          className="drm-btn"
          title={t?.("close_esc") || "Schließen (Esc)"}
        >
          ✕
        </button>
      </div>

      {/* Main content — animated card */}
      <div
        style={{
          ...styles.content,
          animation: `drm-${animClass} ${ANIM_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
          ...(animClass === "slideRight" ? { boxShadow: "20px 0 60px rgba(16,185,129,0.15)" } : {}),
          ...(animClass === "slideLeft" ? { boxShadow: "-20px 0 60px rgba(239,68,68,0.15)" } : {}),
        }}
        key={patient.id + "_" + currentIndex}
      >
        {/* Photo Grid */}
        <div style={styles.photoGrid}>
          {photoUrls.length > 0 ? photoUrls.slice(0, 4).map((url, i) => (
            <div
              key={i}
              className="drm-photo"
              style={styles.photoCard}
              onClick={() => setZoomedPhoto(resolvePhotoUrl(url, api))}
            >
              <img
                src={resolvePhotoUrl(url, api)}
                alt={photoLabels[i] || `Photo ${i + 1}`}
                style={styles.photoImg}
                onError={(e) => { e.target.style.display = "none"; e.target.parentElement.querySelector(".drm-placeholder") && (e.target.parentElement.querySelector(".drm-placeholder").style.display = "flex"); }}
              />
              <div className="drm-placeholder" style={{ ...styles.photoPlaceholder, display: "none" }}>📷</div>
              <div style={styles.photoLabel}>{photoLabels[i] || `#${i + 1}`}</div>
            </div>
          )) : (
            <div style={styles.noPhotos}>
              <span style={{ fontSize: 32, marginBottom: 8 }}>📷</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{t?.("no_photos_available") || "Keine Fotos vorhanden"}</span>
            </div>
          )}
        </div>

        {/* Patient Info */}
        <div style={styles.infoSection}>
          <div style={styles.patientName}>{patient.name || "Unbekannt"}</div>
          <div style={styles.infoGrid}>
            {(patient.treatment || fields.treatment) && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>{t?.("treatment") || "Behandlung"}</span>
                <span style={styles.infoValue}>{patient.treatment || fields.treatment}</span>
              </div>
            )}
            {age && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>{t?.("age_label") || "Alter"}</span>
                <span style={styles.infoValue}>{age}</span>
              </div>
            )}
            {fields.norwood_scale && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>{t?.("norwood_label") || "Norwood"}</span>
                <span style={styles.infoValue}>{fields.norwood_scale}</span>
              </div>
            )}
            {fields.concern && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>{t?.("area_label") || "Bereich"}</span>
                <span style={styles.infoValue}>{fields.concern}</span>
              </div>
            )}
            {fields.hair_loss_duration && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>{t?.("hair_loss_since") || "Haarausfall seit"}</span>
                <span style={styles.infoValue}>{fields.hair_loss_duration}</span>
              </div>
            )}
            {medications && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>💊 {t?.("medications") || "Medikamente"}</span>
                <span style={styles.infoValue}>{medications}</span>
              </div>
            )}
            {fields.previous_treatments && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>{t?.("previous_treatments") || "Vorbehandlungen"}</span>
                <span style={styles.infoValue}>{fields.previous_treatments}</span>
              </div>
            )}
            {fields.medical_conditions && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>{t?.("pre_conditions") || "Vorerkrankungen"}</span>
                <span style={styles.infoValue}>{fields.medical_conditions}</span>
              </div>
            )}
            {fields.diabetes && !["no", "none", "nein"].includes(String(fields.diabetes).toLowerCase()) && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>🩸 Diabetes</span>
                <span style={{ ...styles.infoValue, color: "#ef4444", fontWeight: 700 }}>{fields.diabetes}</span>
              </div>
            )}
            {fields.blood_thinners && !["no", "none", "nein"].includes(String(fields.blood_thinners).toLowerCase()) && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>💉 {t?.("blood_thinners") || "Blutverdünner"}</span>
                <span style={{ ...styles.infoValue, color: "#ef4444", fontWeight: 700 }}>{fields.blood_thinners}</span>
              </div>
            )}
          </div>

          {/* Allergies — prominent warning */}
          {hasAllergies && (
            <div style={styles.allergyBanner}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div>
                <div style={styles.allergyTitle}>{t?.("allergies_label") || "Allergien"}</div>
                <div style={styles.allergyValue}>{allergies}</div>
              </div>
            </div>
          )}
        </div>

        {/* AI Recommendation Card */}
        {(aiGrafts || aiPrice) && (
          <div style={styles.aiCard}>
            <div style={styles.aiHeader}>
              <span style={{ fontSize: 14 }}>🤖</span>
              <span style={styles.aiTitle}>{t?.("ai_recommendation") || "KI-Empfehlung"}</span>
            </div>
            <div style={styles.aiContent}>
              {aiGrafts && <span style={styles.aiChip}>{aiGrafts}</span>}
              {aiPrice && <span style={styles.aiChip}>{t?.("recommended_price") || "Empfohlener Preis"}: {aiPrice}</span>}
            </div>
          </div>
        )}

        {/* Input Fields */}
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>{t?.("grafts_label_ui") || "Grafts"}</label>
            <input
              type="number"
              className="drm-input"
              style={styles.formInput}
              value={grafts}
              onChange={(e) => setGrafts(e.target.value)}
              placeholder="z.B. 2500"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>{t?.("price_eur_label") || "Preis (\u20AC)"}</label>
            <input
              type="number"
              className="drm-input"
              style={styles.formInput}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="z.B. 3200"
            />
          </div>
        </div>
        <div style={{ ...styles.formGroup, marginBottom: 24 }}>
          <label style={styles.formLabel}>{t?.("notes_label") || "Notizen"}</label>
          <textarea
            className="drm-input"
            style={styles.formTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t?.("medical_notes_placeholder") || "Medizinische Anmerkungen, Technik-Empfehlung..."}
            rows={2}
          />
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <div style={{ position: "relative" }}>
            <button
              className="drm-btn"
              style={styles.btnReject}
              onClick={() => setShowRejectDropdown((v) => !v)}
            >
              ← {t?.("reject_btn") || "Ablehnen"}
              <span style={styles.shortcutHint}>R</span>
            </button>
            {/* Rejection reason dropdown */}
            {showRejectDropdown && (
              <div style={styles.rejectDropdown}>
                {getRejectionReasons(t).map((r) => (
                  <button
                    key={r.value}
                    className="drm-reject-option"
                    style={styles.rejectOption}
                    onClick={() => handleReject(r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="drm-btn"
            style={styles.btnPhotos}
            onClick={handleRequestPhotos}
          >
            {t?.("more_photos_btn") || "Mehr Fotos"}
            <span style={styles.shortcutHint}>M</span>
          </button>

          <button
            className="drm-btn"
            style={styles.btnApprove}
            onClick={handleApprove}
          >
            {t?.("approve_btn") || "Genehmigen"} →
            <span style={styles.shortcutHint}>A</span>
          </button>
        </div>

        {/* Progress Dots */}
        <div style={styles.progressDots}>
          {patients.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                ...styles.dot,
                background: i === currentIndex ? "#4cc9ff" : "rgba(255,255,255,0.2)",
                transform: i === currentIndex ? "scale(1.3)" : "scale(1)",
                cursor: "pointer",
                border: "none",
                padding: 0,
              }}
              title={`Patient ${i + 1}`}
            />
          ))}
        </div>

        {/* Keyboard hint */}
        <div style={styles.keyboardHint}>
          <span>←→ {t?.("nav_navigate") || "Navigieren"}</span>
          <span>A {t?.("approve_btn") || "Genehmigen"}</span>
          <span>R {t?.("reject_btn") || "Ablehnen"}</span>
          <span>M {t?.("more_photos_btn") || "Mehr Fotos"}</span>
          <span>Esc {t?.("close_label") || "Schlie\u00DFen"}</span>
        </div>
      </div>

      {/* Photo Zoom Lightbox */}
      {zoomedPhoto && (
        <div
          style={styles.lightbox}
          onClick={() => setZoomedPhoto(null)}
        >
          <img
            src={zoomedPhoto}
            alt="Zoomed photo"
            style={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            style={styles.lightboxClose}
            onClick={() => setZoomedPhoto(null)}
            className="drm-btn"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    background: "rgba(0,0,0,0.95)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    overflowY: "auto",
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  },
  header: {
    width: "100%",
    maxWidth: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px 12px",
    boxSizing: "border-box",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#f1f5f9",
    letterSpacing: "-0.02em",
  },
  headerCounter: {
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(255,255,255,0.4)",
    background: "rgba(255,255,255,0.06)",
    padding: "4px 12px",
    borderRadius: 8,
    marginLeft: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.5)",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    fontFamily: "inherit",
  },
  content: {
    width: "100%",
    maxWidth: 900,
    padding: "0 24px 40px",
    boxSizing: "border-box",
  },
  // Photo grid
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: 24,
    minHeight: 200,
  },
  photoCard: {
    position: "relative",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    overflow: "hidden",
    background: "rgba(255,255,255,0.03)",
    cursor: "pointer",
    transition: "all 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
    aspectRatio: "3/4",
  },
  photoImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 40,
    color: "rgba(255,255,255,0.15)",
  },
  photoLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "6px 10px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  noPhotos: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    borderRadius: 12,
    border: "1px dashed rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.02)",
  },
  // Patient info
  infoSection: {
    marginBottom: 20,
  },
  patientName: {
    fontSize: 22,
    fontWeight: 800,
    color: "#f1f5f9",
    letterSpacing: "-0.02em",
    marginBottom: 12,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px 20px",
    marginBottom: 12,
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 600,
    color: "#e2e8f0",
  },
  // Allergy banner
  allergyBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 10,
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    marginTop: 8,
  },
  allergyTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#ef4444",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  allergyValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#ef4444",
  },
  // AI card
  aiCard: {
    padding: "14px 18px",
    borderRadius: 12,
    background: "rgba(76,201,255,0.06)",
    border: "1px solid rgba(76,201,255,0.15)",
    marginBottom: 20,
  },
  aiHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  aiTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#4cc9ff",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  aiContent: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  aiChip: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e2e8f0",
    background: "rgba(76,201,255,0.1)",
    padding: "4px 12px",
    borderRadius: 8,
  },
  // Form
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 14,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  formInput: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
    outline: "none",
  },
  formTextarea: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "#f1f5f9",
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: 56,
    transition: "border-color 0.2s",
    outline: "none",
  },
  // Actions
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
    marginBottom: 24,
  },
  btnReject: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1.5px solid #ef4444",
    background: "transparent",
    color: "#ef4444",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    position: "relative",
  },
  btnPhotos: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1.5px solid #f59e0b",
    background: "transparent",
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnApprove: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "none",
    background: "#10b981",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  shortcutHint: {
    fontSize: 10,
    fontWeight: 600,
    color: "rgba(255,255,255,0.3)",
    background: "rgba(255,255,255,0.08)",
    padding: "2px 6px",
    borderRadius: 4,
    marginLeft: 4,
  },
  // Reject dropdown
  rejectDropdown: {
    position: "absolute",
    bottom: "calc(100% + 8px)",
    left: 0,
    right: 0,
    background: "#1a1a2e",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 12,
    padding: 6,
    zIndex: 10,
    boxShadow: "0 -12px 40px rgba(0,0,0,0.5)",
  },
  rejectOption: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: "#f1f5f9",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    transition: "background 0.15s",
  },
  // Progress dots
  progressDots: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
  },
  // Keyboard hint
  keyboardHint: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    fontSize: 11,
    color: "rgba(255,255,255,0.2)",
    fontWeight: 500,
  },
  // Lightbox
  lightbox: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    background: "rgba(0,0,0,0.92)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "zoom-out",
    animation: "drm-fadeIn 0.2s ease",
  },
  lightboxImg: {
    maxWidth: "90vw",
    maxHeight: "90vh",
    objectFit: "contain",
    borderRadius: 8,
    cursor: "default",
  },
  lightboxClose: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontSize: 20,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
  },
};
