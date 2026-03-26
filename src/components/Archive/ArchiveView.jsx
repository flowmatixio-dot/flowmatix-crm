import { useState, useMemo, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { getAvatarGradient, getInitials } from "../shared/index";
import { translateValue, fmLocale } from "../../utils/helpers";

export default function ArchiveView() {
  const { myLeads, openPatient, moveLead, showT, t } = useApp();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const archived = useMemo(() => {
    const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
    return myLeads.filter(lead => {
      const lastActive = new Date(lead.lastAiInteraction || lead.updatedAt || lead.createdAt || 0).getTime();
      return (lead.stage === "cancelled" || lead.metadata?.cancelled || lead.archived) && lastActive < sixMonthsAgo;
    }).sort((a, b) => {
      const tA = new Date(a.lastAiInteraction || a.createdAt || 0).getTime();
      const tB = new Date(b.lastAiInteraction || b.createdAt || 0).getTime();
      return tB - tA;
    });
  }, [myLeads]);

  const filtered = useMemo(() => {
    if (!search.trim()) return archived;
    const q = search.toLowerCase();
    return archived.filter(l =>
      l.name?.toLowerCase().includes(q) ||
      l.treatment?.toLowerCase().includes(q) ||
      l.country?.toLowerCase().includes(q)
    );
  }, [archived, search]);

  const handleRestore = useCallback((e, lead) => {
    e.stopPropagation();
    setRestoringId(lead.id);
    try {
      moveLead?.(lead.id, "new");
      showT?.(`${lead.name} ${t("archive_restored") || "wiederhergestellt"}`);
    } catch {
      showT?.(t("archive_restore_error") || "Fehler beim Wiederherstellen");
    }
    setTimeout(() => setRestoringId(null), 1000);
  }, [moveLead, showT]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(fmLocale(), { day: "numeric", month: "short", year: "numeric" });
  };

  const getMonthsAgo = (dateStr) => {
    if (!dateStr) return null;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30));
  };

  return (
    <div style={{ padding: 28, maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.03em", color: "rgba(232,238,252,0.95)" }}>
            {t("archive_title") || "Archiv"}
          </h1>
          <p style={{ fontSize: 12, color: "rgba(167,177,195,0.45)", margin: 0, fontWeight: 500 }}>
            {t("archive_inactive_desc") || "Patienten die seit über 6 Monaten inaktiv sind"}
          </p>
        </div>
        {archived.length > 0 && (
          <div style={{
            padding: "6px 14px", borderRadius: 8,
            background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(167,177,195,0.4)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{t("archived") || "Archiviert"}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "rgba(167,177,195,0.6)" }}>{archived.length}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <input
          id="archiveSearch"
          name="archiveSearch"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("archive_search") || "Patient suchen..."}
          style={{
            width: "100%", padding: "9px 14px 9px 36px", borderRadius: 10,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
            color: "rgba(232,238,252,0.85)", fontFamily: "inherit", fontSize: 12, fontWeight: 500,
            outline: "none", boxSizing: "border-box", transition: "border-color .2s",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(76,201,255,0.2)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.05)"}
        />
        <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "rgba(167,177,195,0.25)" }}>🔍</span>
      </div>

      {/* Table header (only when there are results) */}
      {filtered.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto",
          gap: 8, padding: "0 18px", marginBottom: 8,
          fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.3)",
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          <div>{t("patient") || "Patient"}</div>
          <div>{t("last_activity_col") || "Letzte Aktivität"}</div>
          <div>Status</div>
          <div></div>
        </div>
      )}

      {/* Patient list */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "rgba(167,177,195,0.4)", fontSize: 13 }}>{t("loading") || "Lade..."}</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 14, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>📦</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "rgba(167,177,195,0.45)" }}>
            {search ? (t("archive_no_patient") || "Kein Patient gefunden") : (t("archive_no_archived") || "Noch keine archivierten Patienten")}
          </div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.25)", marginTop: 6, maxWidth: 340, margin: "6px auto 0", lineHeight: 1.5 }}>
            {search
              ? `${t("no_results_for") || "Keine Ergebnisse für"} "${search}"`
              : (t("archive_auto_desc") || "Patienten werden automatisch archiviert wenn sie über 6 Monate inaktiv sind. Archivierte Patienten können jederzeit wiederhergestellt werden.")
            }
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map(lead => {
            const initials = getInitials(lead.name);
            const lastActive = lead.lastAiInteraction || lead.updatedAt || lead.createdAt;
            const monthsAgo = getMonthsAgo(lastActive);
            const isRestoring = restoringId === lead.id;

            return (
              <div key={lead.id} onClick={() => openPatient(lead.id)} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto",
                gap: 8, padding: "12px 18px", borderRadius: 10,
                background: isRestoring ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.015)",
                border: `1px solid ${isRestoring ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)"}`,
                cursor: "pointer", alignItems: "center", transition: "all .12s",
              }}
                onMouseEnter={e => { if (!isRestoring) { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}}
                onMouseLeave={e => { if (!isRestoring) { e.currentTarget.style.background = "rgba(255,255,255,0.015)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}}
              >
                {/* Patient */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: getAvatarGradient(lead.name),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 11, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)", flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "rgba(232,238,252,0.85)" }}>{lead.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(167,177,195,0.35)", marginTop: 1 }}>
                      {lead.treatment || "—"}{lead.country ? ` · ${translateValue(lead.country)}` : ""}
                    </div>
                  </div>
                </div>

                {/* Last Activity */}
                <div>
                  <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)" }}>{formatDate(lastActive)}</div>
                  {monthsAgo !== null && (
                    <div style={{ fontSize: 10, color: "rgba(167,177,195,0.25)", marginTop: 1 }}>
                      {monthsAgo} {monthsAgo !== 1 ? (t("months_ago_many") || "Monaten her") : (t("months_ago_one") || "Monat her")}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                    background: lead.stage === "done" ? "rgba(16,185,129,0.08)" : "rgba(167,177,195,0.06)",
                    color: lead.stage === "done" ? "rgba(16,185,129,0.6)" : "rgba(167,177,195,0.35)",
                  }}>
                    {lead.stage === "done" ? (t("archive_completed") || "Abgeschlossen") : (t("archived") || "Archiviert")}
                  </span>
                </div>

                {/* Restore */}
                <div onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleRestore(e, lead)}
                    disabled={isRestoring}
                    style={{
                      padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      cursor: isRestoring ? "default" : "pointer", fontFamily: "inherit",
                      background: isRestoring ? "rgba(16,185,129,0.08)" : "rgba(76,201,255,0.06)",
                      border: `1px solid ${isRestoring ? "rgba(16,185,129,0.15)" : "rgba(76,201,255,0.12)"}`,
                      color: isRestoring ? "#10b981" : "#4cc9ff",
                      transition: "all 0.15s", whiteSpace: "nowrap",
                    }}
                  >
                    {isRestoring ? (t("archive_restored") || "✓ Hergestellt") : (t("archive_restore") || "Wiederherstellen")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer info */}
      {archived.length > 0 && (
        <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.01)", fontSize: 11, color: "rgba(167,177,195,0.2)" }}>
          {t("archive_footer_desc") || "Patienten werden nach 6 Monaten Inaktivität automatisch archiviert. Wiederhergestellte Patienten erscheinen als neue Anfrage in der Pipeline."}
        </div>
      )}
    </div>
  );
}
