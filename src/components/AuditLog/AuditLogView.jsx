import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { Stat } from "../shared/index";

/**
 * Audit Log Viewer — fetches the real audit_log entries from the
 * backend (GET /api/v1/crm/audit-log) with filters and pagination.
 *
 * Was previously a stub that read from in-memory `auditLog` state in
 * AppContext, which was empty on every refresh. Now it talks directly
 * to the backend so a clinic admin can actually see what happened in
 * their account — required for GDPR Art. 30 record-of-processing.
 *
 * Filters:
 *  - action       (dropdown, fetched from /audit-log/actions)
 *  - resourceType (text input — patient, integration, ...)
 *  - from / to    (date range)
 *
 * Pagination: 100 per page. CSV export of the filtered set.
 */
export default function AuditLogView() {
  const { showT } = useApp();
  const lang = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
  const TR = (de, en, tr) => ({ de, en, tr }[lang] || de);

  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [actions, setActions] = useState([]);

  // filters
  const [filterAction, setFilterAction] = useState("");
  const [filterResource, setFilterResource] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const PAGE_SIZE = 100;

  const buildQuery = useCallback((extra = {}) => {
    const q = new URLSearchParams();
    if (filterAction) q.set("action", filterAction);
    if (filterResource) q.set("resourceType", filterResource);
    if (filterFrom) q.set("from", filterFrom);
    if (filterTo) q.set("to", filterTo + "T23:59:59Z");
    Object.entries(extra).forEach(([k, v]) => q.set(k, String(v)));
    return q.toString();
  }, [filterAction, filterResource, filterFrom, filterTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { apiFetch } = await import("../../api/client");
      const qs = buildQuery({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      const data = await apiFetch(`/api/v1/crm/audit-log?${qs}`);
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e?.message || TR("Fehler beim Laden", "Failed to load", "Yükleme başarısız"));
    }
    setLoading(false);
  }, [buildQuery, page, lang]);

  useEffect(() => { load(); }, [load]);

  // Fetch distinct actions for the filter dropdown — only once per mount
  useEffect(() => {
    (async () => {
      try {
        const { apiFetch } = await import("../../api/client");
        const data = await apiFetch(`/api/v1/crm/audit-log/actions`);
        setActions(data.actions || []);
      } catch {}
    })();
  }, []);

  const handleExport = async () => {
    try {
      const { apiFetch } = await import("../../api/client");
      const qs = buildQuery();
      // We need raw text from this endpoint, not JSON. apiFetch json-parses
      // by default, so we use fetch directly with the same auth header.
      const token = (() => { try { return sessionStorage.getItem("fm_access_token"); } catch { return null; } })();
      const res = await fetch(`https://api.flowmatix.io/api/v1/crm/audit-log/export?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flowmatix-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showT(TR("Audit-Log exportiert", "Audit log exported", "Denetim günlüğü dışa aktarıldı"));
    } catch (e) {
      showT(e?.message || TR("Export fehlgeschlagen", "Export failed", "Dışa aktarma başarısız"), "error");
    }
  };

  const resetFilters = () => {
    setFilterAction(""); setFilterResource(""); setFilterFrom(""); setFilterTo(""); setPage(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Human-readable detail summary
  const renderDetails = (e) => {
    const det = e.details;
    if (!det || Object.keys(det).length === 0) return <span style={{ color: "rgba(167,177,195,0.4)" }}>—</span>;

    // Viewed actions — show what was accessed
    if (e.action === "photo_viewed") {
      return <span style={{ color: "rgba(167,177,195,0.7)" }}>
        {det.patient_id ? `Patient: …${det.patient_id.slice(-8)}` : "Foto-Zugriff"}
        {det.photo_key ? ` · ${det.photo_key.split("/").pop()}` : ""}
      </span>;
    }
    if (e.action === "conversation_viewed") {
      return <span style={{ color: "rgba(167,177,195,0.7)" }}>
        {det.patient_id ? `Patient: …${det.patient_id.slice(-8)}` : "Konversation geöffnet"}
      </span>;
    }
    if (e.action === "appointment_viewed") {
      const f = det.filters || {};
      const parts = [];
      if (f.patient_id) parts.push(`Patient: …${String(f.patient_id).slice(-8)}`);
      if (f.from || f.to) parts.push(`${f.from || "?"} – ${f.to || "?"}`);
      if (f.status) parts.push(`Status: ${f.status}`);
      if (f.doctor_id) parts.push("Arzt-Filter");
      if (f.location) parts.push(`Ort: ${f.location}`);
      return <span style={{ color: "rgba(167,177,195,0.7)" }}>{parts.length ? parts.join(" · ") : "Terminliste"}</span>;
    }
    if (e.action === "patient_viewed") {
      return <span style={{ color: "rgba(167,177,195,0.7)" }}>
        {det.patient_id ? `Patient: …${det.patient_id.slice(-8)}` : "Patientendetails"}
      </span>;
    }

    // Settings/integration changes — show field names
    if (e.action?.startsWith("settings") || e.action?.startsWith("integration")) {
      const keys = Object.keys(det);
      if (keys.length <= 3) return <span style={{ color: "rgba(167,177,195,0.7)" }}>{keys.join(", ")}</span>;
      return <span style={{ color: "rgba(167,177,195,0.7)" }}>{keys.slice(0, 3).join(", ")} +{keys.length - 3}</span>;
    }

    // Generic: try to extract a readable summary
    const summaryKeys = ["message", "reason", "name", "email", "phone", "template", "status"];
    for (const k of summaryKeys) {
      if (det[k] && typeof det[k] === "string") {
        const v = det[k];
        return <span style={{ color: "rgba(167,177,195,0.7)" }}>{k}: {v.length > 60 ? v.slice(0, 57) + "…" : v}</span>;
      }
    }

    // Fallback: compact JSON in expandable
    const json = JSON.stringify(det);
    if (json.length <= 80) return <code style={{ fontSize: 10, color: "rgba(167,177,195,0.6)" }}>{json}</code>;
    return (
      <details style={{ cursor: "pointer" }}>
        <summary style={{ outline: "none", color: "rgba(167,177,195,0.6)", fontSize: 10 }}>{Object.keys(det).length} Felder</summary>
        <pre style={{ marginTop: 4, padding: 6, background: "rgba(0,0,0,0.3)", borderRadius: 6, fontSize: 10, color: "rgba(167,177,195,0.8)", maxHeight: 160, overflow: "auto" }}>
          {JSON.stringify(det, null, 2)}
        </pre>
      </details>
    );
  };

  // Color map per action category
  const actionColor = (a) => {
    if (!a) return "#a7b1c3";
    if (a.startsWith("login") || a === "logout") return "#10b981";
    if (a.startsWith("patient")) return "#4cc9ff";
    if (a.startsWith("gdpr")) return "#ef4444";
    if (a.startsWith("whatsapp")) return "#fbbf24";
    if (a.startsWith("settings") || a.startsWith("integration")) return "#a78bfa";
    if (a.startsWith("billing")) return "#10b981";
    return "#a7b1c3";
  };

  const inp = { padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "inherit", fontSize: 12, outline: "none" };

  return <div style={{ padding: 28, maxWidth: 1200 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📋 {TR("Audit-Log", "Audit Log", "Denetim Günlüğü")}</h1>
        <p style={{ fontSize: 13, color: "rgba(167,177,195,0.6)", margin: "4px 0 0" }}>
          {TR("Vollständige Aufzeichnung aller Datenzugriffe und Änderungen (DSGVO Art. 30).", "Complete record of all data access and changes (GDPR Art. 30).", "Tüm veri erişimi ve değişikliklerinin tam kaydı (KVKK Madde 30).")}
        </p>
      </div>
      <button onClick={handleExport} style={{ padding: "8px 18px", borderRadius: 9, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
        📥 {TR("CSV Export", "CSV Export", "CSV Dışa Aktar")}
      </button>
    </div>

    {/* Stats */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
      <Stat label={TR("Gesamt-Events", "Total events", "Toplam olay")} value={total} color="#4cc9ff" />
      <Stat label={TR("Diese Seite", "This page", "Bu sayfa")} value={entries.length} color="#10b981" />
      <Stat label={TR("Logins", "Logins", "Girişler")} value={entries.filter((e) => e.action === "login").length} color="#a78bfa" />
      <Stat label={TR("Patient-Zugriffe", "Patient views", "Hasta görüntüleme")} value={entries.filter((e) => e.action === "patient_viewed").length} color="#ff8a2a" />
    </div>

    {/* Filters */}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(0); }} style={{ ...inp, minWidth: 180 }}>
        <option value="">{TR("Alle Aktionen", "All actions", "Tüm eylemler")}</option>
        {actions.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <input type="text" value={filterResource} onChange={(e) => { setFilterResource(e.target.value); setPage(0); }} placeholder={TR("Resource (z.B. patient)", "Resource (e.g. patient)", "Kaynak (örn. patient)")} style={{ ...inp, minWidth: 160 }} />
      <input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(0); }} style={inp} />
      <input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(0); }} style={inp} />
      <button onClick={resetFilters} style={{ ...inp, cursor: "pointer", color: "rgba(167,177,195,0.85)" }}>
        {TR("Filter zurücksetzen", "Reset filters", "Filtreleri sıfırla")}
      </button>
    </div>

    {error && (
      <div style={{ padding: 14, marginBottom: 14, borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 13 }}>
        {error}
      </div>
    )}

    {/* Log Table */}
    <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "150px 180px 130px 120px 140px 1fr", padding: "10px 16px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.7)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        <div>{TR("Zeit", "Time", "Zeit")}</div>
        <div>{TR("Aktion", "Action", "Eylem")}</div>
        <div>{TR("Resource", "Resource", "Kaynak")}</div>
        <div>{TR("Benutzer", "User", "Kullanıcı")}</div>
        <div>{TR("IP-Adresse", "IP", "IP")}</div>
        <div>{TR("Details / Änderungen", "Details / Changes", "Detaylar")}</div>
      </div>
      {loading && <div style={{ padding: 30, textAlign: "center", color: "rgba(167,177,195,0.7)" }}>⏳ {TR("Lade…", "Loading…", "Yükleniyor…")}</div>}
      {!loading && entries.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "rgba(167,177,195,0.7)" }}>
          {TR("Keine Audit-Einträge gefunden.", "No audit entries found.", "Denetim kaydı bulunamadı.")}
        </div>
      )}
      {!loading && entries.map((e) => {
        const ac = actionColor(e.action);
        const hasDiff = e.old_value || e.new_value;
        return <div key={e.id} style={{ display: "grid", gridTemplateColumns: "150px 180px 130px 120px 140px 1fr", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 12, alignItems: "start" }}>
          <div style={{ color: "rgba(167,177,195,0.75)", fontFamily: "monospace", fontSize: 11 }}>
            {new Date(e.created_at).toLocaleString(lang, { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div>
            <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, background: `${ac}15`, color: ac, whiteSpace: "nowrap" }}>
              {e.action?.replace(/_/g, " ")}
            </span>
          </div>
          <div style={{ color: "rgba(167,177,195,0.75)", fontSize: 11 }}>
            {e.resource_type ? <>{e.resource_type}<br /><span style={{ fontFamily: "monospace", fontSize: 9, opacity: 0.6 }}>{(e.resource_id || "").slice(0, 8)}</span></> : "—"}
          </div>
          <div style={{ fontWeight: 600, fontSize: 11 }}>
            {e.user_email ? e.user_email.split("@")[0] : <span style={{ color: "rgba(167,177,195,0.5)" }}>system</span>}
          </div>
          <div style={{ color: "rgba(167,177,195,0.55)", fontFamily: "monospace", fontSize: 10 }}>
            {e.ip_address || "—"}
          </div>
          <div style={{ color: "rgba(232,238,252,0.85)", fontSize: 11, lineHeight: 1.4 }}>
            {hasDiff ? (
              <details style={{ cursor: "pointer" }}>
                <summary style={{ outline: "none", color: "#4cc9ff" }}>
                  {Object.keys(e.new_value || {}).length || Object.keys(e.old_value || {}).length} {TR("Änderung(en)", "change(s)", "değişiklik")}
                </summary>
                <pre style={{ marginTop: 6, padding: 8, background: "rgba(0,0,0,0.3)", borderRadius: 6, fontSize: 10, color: "rgba(167,177,195,0.85)", maxHeight: 200, overflow: "auto" }}>
{JSON.stringify({ old: e.old_value, new: e.new_value }, null, 2)}
                </pre>
              </details>
            ) : renderDetails(e)}
          </div>
        </div>;
      })}
    </div>

    {/* Pagination */}
    {totalPages > 1 && (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
        <button disabled={page === 0} onClick={() => setPage(page - 1)} style={{ ...inp, cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.4 : 1 }}>
          ← {TR("Zurück", "Prev", "Önceki")}
        </button>
        <span style={{ fontSize: 12, color: "rgba(167,177,195,0.7)" }}>
          {TR("Seite", "Page", "Sayfa")} {page + 1} / {totalPages} · {total} {TR("Einträge", "entries", "kayıt")}
        </span>
        <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} style={{ ...inp, cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
          {TR("Weiter", "Next", "Sonraki")} →
        </button>
      </div>
    )}

    {/* RLS Note */}
    <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: "rgba(255,138,42,0.04)", border: "1px solid rgba(255,138,42,0.12)", fontSize: 12, color: "rgba(167,177,195,0.7)" }}>
      🔒 <strong style={{ color: "#ff8a2a" }}>{TR("Daten-Isolation", "Data isolation", "Veri izolasyonu")}:</strong>{" "}
      {TR(
        "Sie sehen ausschließlich die Audit-Einträge Ihrer eigenen Klinik. Audit-Logs sind unveränderlich (DSGVO Art. 32) — sie können nicht bearbeitet oder gelöscht werden.",
        "You only see audit entries for your own clinic. Audit logs are immutable (GDPR Art. 32) — they cannot be edited or deleted.",
        "Yalnızca kendi kliniğinizin denetim kayıtlarını görürsünüz. Denetim günlükleri değişmezdir (KVKK Madde 32) — düzenlenemez veya silinemez."
      )}
    </div>
  </div>;
}
