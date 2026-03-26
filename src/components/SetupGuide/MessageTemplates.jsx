// Message templates redirect panel — redirects to settings view (Nachrichtenvorlagen)
export default function MessageTemplates({ setView, t }) {
  return (
    <div style={{ textAlign: "center", padding: 40 }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{t("setup_templates_redir")}</p>
      <button onClick={() => setView("settings")} style={{ padding: "10px 24px", borderRadius: 10, background: "rgba(76,201,255,0.12)", border: "1px solid rgba(76,201,255,0.25)", color: "#4cc9ff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t("open_settings")} {"→"}</button>
    </div>
  );
}
