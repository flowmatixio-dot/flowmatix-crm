import { useState } from "react";

const KEY_PREFIX = "fm_hint_dismissed_";

export default function HintBox({ id, children, style }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(KEY_PREFIX + id) === "1"; } catch { return false; }
  });

  if (dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem(KEY_PREFIX + id, "1"); } catch {}
    setDismissed(true);
  };

  return (
    <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.1)", color: "rgba(167,177,195,0.75)", fontSize: 11, display: "flex", alignItems: "center", gap: 8, marginBottom: 12, lineHeight: 1.6, ...style }}>
      <span style={{ flex: 1 }}>{"ℹ️"} {children}</span>
      <span onClick={dismiss} style={{ cursor: "pointer", opacity: 0.5, fontSize: 14, flexShrink: 0, padding: "0 2px" }} title="Schließen">✕</span>
    </div>
  );
}
