import { useState, useEffect, useRef } from "react";

/**
 * GDPR Art. 17 — Hard delete confirmation modal.
 *
 * Two-step confirmation pattern:
 * 1. User clicks the danger button → modal opens
 * 2. User must type the literal string "DELETE" before the confirm
 *    button enables
 *
 * Accessibility:
 * - Focus trap (input → confirm → cancel → input)
 * - Escape key cancels
 * - Enter key on confirm triggers (when enabled)
 * - aria-modal + role=dialog
 *
 * No external dependencies — uses inline styles to match the rest
 * of the patient panel and avoid pulling in a UI library.
 */
export default function HardDeleteModal({ open, onClose, onConfirm, lang = "de", patientName = "" }) {
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  // i18n via inline TR helper — t() is unreliable for missing keys
  const TR = (de, en, tr) => ({ de, en, tr }[lang] || de);

  // Reset state when modal opens / closes
  useEffect(() => {
    if (open) {
      setInput("");
      setShake(false);
      setBusy(false);
      // focus the input after a tick so the modal animation doesn't steal it
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ESC + focus trap
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) {
        onClose?.();
        return;
      }
      if (e.key === "Tab") {
        // Focus trap: cycle between input → confirm → cancel
        const focusables = [inputRef.current, confirmRef.current, cancelRef.current].filter(Boolean);
        const idx = focusables.indexOf(document.activeElement);
        if (idx === -1) return;
        e.preventDefault();
        const next = e.shiftKey ? (idx - 1 + focusables.length) % focusables.length : (idx + 1) % focusables.length;
        focusables[next]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const isValid = input === "DELETE";

  const handleConfirm = async () => {
    if (!isValid || busy) {
      // Wrong input → shake the input field for feedback
      setShake(true);
      setTimeout(() => setShake(false), 500);
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await onConfirm?.();
    } finally {
      // Caller closes the modal on success; on failure we stay open
      // so the user sees the error toast
      setBusy(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fmHardDeleteShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fmHardDeleteFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div
        onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose?.(); }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fm-hard-delete-title"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 11000,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            width: "min(440px, 100%)",
            background: "#131c2e",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 16,
            padding: 28,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,68,68,0.1)",
            animation: "fmHardDeleteFadeIn 0.18s ease-out",
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}
        >
          {/* Icon + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              ⚠️
            </div>
            <div>
              <h2
                id="fm-hard-delete-title"
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1.3,
                }}
              >
                {TR("Patient endgültig löschen?", "Delete patient permanently?", "Hastayı kalıcı olarak sil?")}
              </h2>
              {patientName && (
                <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", marginTop: 2 }}>
                  {patientName}
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              marginBottom: 18,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.55,
                color: "rgba(254,202,202,0.95)",
              }}
            >
              <strong style={{ color: "#fca5a5" }}>
                {TR("Diese Aktion kann nicht rückgängig gemacht werden.", "This action cannot be undone.", "Bu işlem geri alınamaz.")}
              </strong>{" "}
              {TR(
                "Alle Patientendaten werden dauerhaft gelöscht: Nachrichten, Fotos, Termine, Dateien, Audit-Einträge.",
                "All patient data will be permanently deleted: messages, photos, appointments, files, audit entries.",
                "Tüm hasta verileri kalıcı olarak silinecektir: mesajlar, fotoğraflar, randevular, dosyalar, denetim kayıtları."
              )}
            </p>
          </div>

          {/* Confirmation input */}
          <label
            htmlFor="fm-hard-delete-input"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              color: "rgba(167,177,195,0.85)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {TR("Tippen Sie", "Type", "Yazın")}{" "}
            <code
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                background: "rgba(239,68,68,0.15)",
                color: "#fca5a5",
                fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
                fontWeight: 800,
                letterSpacing: "0.08em",
              }}
            >
              DELETE
            </code>{" "}
            {TR("zur Bestätigung:", "to confirm:", "onaylamak için:")}
          </label>
          <input
            ref={inputRef}
            id="fm-hard-delete-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid && !busy) handleConfirm();
            }}
            placeholder="DELETE"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            title={TR("Bitte 'DELETE' eingeben, um fortzufahren", "Please type 'DELETE' to continue", "Devam etmek için 'DELETE' yazın")}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: `1.5px solid ${isValid ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.25)"}`,
              color: "#fff",
              fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.1em",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 18,
              transition: "border-color 0.2s",
              animation: shake ? "fmHardDeleteShake 0.45s ease" : "none",
            }}
          />

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              ref={cancelRef}
              onClick={() => !busy && onClose?.()}
              disabled={busy}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(167,177,195,0.85)",
                fontWeight: 700,
                fontSize: 13,
                cursor: busy ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: busy ? 0.5 : 1,
                transition: "all 0.15s",
              }}
            >
              {TR("Abbrechen", "Cancel", "İptal")}
            </button>
            <button
              ref={confirmRef}
              onClick={handleConfirm}
              disabled={!isValid || busy}
              title={!isValid ? TR("Bitte 'DELETE' eingeben, um fortzufahren", "Please type 'DELETE' to continue", "Devam etmek için 'DELETE' yazın") : ""}
              style={{
                padding: "10px 22px",
                borderRadius: 10,
                background: isValid && !busy ? "linear-gradient(135deg,#ef4444,#dc2626)" : "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: isValid && !busy ? "#fff" : "rgba(252,165,165,0.5)",
                fontWeight: 800,
                fontSize: 13,
                cursor: isValid && !busy ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                boxShadow: isValid && !busy ? "0 4px 12px rgba(239,68,68,0.3)" : "none",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {busy ? (
                <>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  {TR("Lösche…", "Deleting…", "Siliniyor…")}
                </>
              ) : (
                TR("Endgültig löschen", "Delete permanently", "Kalıcı olarak sil")
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
