import { updateClinicSettings } from "../../api/client";

const getModes = (t) => [
  { val: "automatic", label: t("automatic_assignment") || "Automatische Zuweisung", desc: t("automatic_assignment_desc") || "System weist den besten verfügbaren Arzt zu", icon: "🤖" },
  { val: "assistant_choice", label: t("assistant_choice_label") || "Assistenz wählt Arzt", desc: t("assistant_choice_desc") || "Assistenz weist den Arzt manuell zu", icon: "👤" },
];

const getAlgorithms = (t) => [
  { val: "earliest", label: t("earliest_available_doctor") || "Frühester verfügbarer Arzt", desc: t("earliest_desc") || "Nächster freier Termin wird priorisiert" },
  { val: "least_booked", label: t("least_booked_label") || "Am wenigsten ausgelastet", desc: t("least_booked_desc") || "Gleichmäßige Verteilung der Arbeitslast" },
  { val: "random", label: t("random_distribution") || "Zufällige Verteilung", desc: t("random_distribution_desc") || "Faire Rotation unter allen Ärzten" },
];

export default function DoctorAssignment({ clinic, updateClinic, showT, t }) {
  const c = clinic || {};
  const mode = c.doctorAssignment || "automatic";
  const algo = c.assignAlgorithm || "earliest";

  const up = (key, val) => updateClinic({ [key]: val });

  const MODES = getModes(t);
  const ALGORITHMS = getAlgorithms(t);

  const save = () => {
    updateClinicSettings({
      doctorAssignment: c.doctorAssignment, assignAlgorithm: c.assignAlgorithm,
    }).then(() => showT(t("saved_toast") || "Gespeichert")).catch(() => showT(t("error_toast") || "Fehler"));
  };

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Assignment Mode */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{t("assignment_mode") || "Zuweisungsmodus"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {MODES.map(m => (
            <div key={m.val} onClick={() => up("doctorAssignment", m.val)} style={{
              padding: "20px 18px", borderRadius: 14, cursor: "pointer", textAlign: "center",
              background: mode === m.val ? "rgba(76,201,255,0.06)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${mode === m.val ? "rgba(76,201,255,0.2)" : "rgba(255,255,255,0.06)"}`,
              transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: mode === m.val ? "#4cc9ff" : "rgba(232,238,252,0.7)" }}>{m.label}</div>
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.4)", marginTop: 4, lineHeight: 1.4 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Algorithm (only for automatic) */}
      {mode === "automatic" && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{t("algorithm_heading") || "Algorithmus"}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {ALGORITHMS.map(a => (
              <div key={a.val} onClick={() => up("assignAlgorithm", a.val)} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                background: algo === a.val ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.015)",
                border: `1px solid ${algo === a.val ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)"}`,
                transition: "all 0.15s",
              }}>
                {/* Radio indicator */}
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${algo === a.val ? "#10b981" : "rgba(255,255,255,0.1)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {algo === a.val && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: algo === a.val ? "#10b981" : "rgba(232,238,252,0.7)" }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(167,177,195,0.35)", marginTop: 2 }}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={save} style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #4cc9ff, #2da8ff)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
        {t("save") || "Speichern"}
      </button>
    </div>
  );
}
