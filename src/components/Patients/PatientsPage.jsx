import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useInboxStore } from "../../stores";
import { CONV_STATUS, STAGES, ROLES, ACTION_PERMS } from "../../data/constants";
import { Stat, getAvatarGradient, getInitials } from "../shared/index";
import ChannelBadge from "../Inbox/ChannelBadge";
import NewLeadModal from "./NewLeadModal";
import HardDeleteModal from "./HardDeleteModal";
import { translateValue, fmLocale } from "../../utils/helpers";

/* ═══════════════════════════════════════════════════════
   STATUS / LABELS / SOURCES
   ═══════════════════════════════════════════════════════ */
function getStatusMap(t) {
  return {
    new:       { label: t("new_request") || "Neue Anfrage",    color: "#4cc9ff" },
    contacted: { label: t("doctor_review") || "Arzt-Review",     color: "#ff8a2a" },
    booked:    { label: t("stage_booked") || "Gebucht",         color: "#a78bfa" },
    done:      { label: t("stage_done") || "Abgeschlossen",   color: "#10b981" },
    cancelled: { label: t("stage_cancelled") || "Storniert",       color: "#ef4444" },
  };
}

function getSourceMap(t) {
  return {
    whatsapp:  { label: t("channel_whatsapp") || "WhatsApp",  icon: "💬", color: "#25D366" },
    instagram: { label: t("channel_instagram") || "Instagram", icon: "📸", color: "#E1306C" },
    website:   { label: t("channel_website") || "Website",   icon: "🌐", color: "#4cc9ff" },
    referral:  { label: t("channel_referral") || "Empfehlung",icon: "🤝", color: "#a78bfa" },
    facebook:  { label: t("channel_facebook") || "Facebook",  icon: "📘", color: "#1877F2" },
    manual:    { label: t("channel_manual") || "Manuell",   icon: "✏️", color: "#6b7280" },
  };
}

function getConvLabels(t) {
  return {
    ai_active: t("conv_ai_active") || "KI aktiv",
    needs_medical_review: t("conv_medical_review") || "Arzt-Review",
    human_takeover: t("conv_human_takeover") || "Handover",
    booking_pending: t("conv_booking_pending") || "Buchung offen",
    deposit_paid: t("conv_deposit_paid") || "Bezahlt",
    waiting_for_clinic_reply: t("conv_waiting") || "Wartet",
    resolved: t("conv_resolved") || "Erledigt",
    closed: t("conv_closed") || "Geschlossen",
  };
}

const PAGE_SIZE = 50;

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */
function timeAgoShort(ts, t) {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return t?.("time_now") || "jetzt";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const d = Math.floor(diff / 86400);
  return d === 1 ? (t?.("time_yesterday") || "gestern") : `${d}d`;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

function getFinancials(lead) {
  const fin = lead.financials || {};
  const price = fin.treatmentPrice || parseInt(String(lead.reviewData?.price || "0").replace(/[^0-9]/g, "")) || 0;
  const deposit = fin.depositAmount || 0;
  const depositPaid = fin.depositStatus === "paid" || lead.convStatus === "deposit_paid";
  const remaining = fin.paymentStatus === "paid" ? 0 : price - deposit;
  return { price, deposit, depositPaid, remaining, paymentStatus: fin.paymentStatus || "pending", currency: fin.currency || "EUR" };
}

/* ═══════════════════════════════════════════════════════
   COLUMN DEFINITIONS
   ═══════════════════════════════════════════════════════ */
const ALL_COLUMNS_DEF = [
  { id: "name",        labelKey: "col_patient",         labelFb: "Patient",       default: true,  sortable: true,  width: "2fr" },
  { id: "phone",       labelKey: "col_phone",           labelFb: "Telefon",       default: true,  sortable: false, width: "1.1fr" },
  { id: "status",      labelKey: "col_status",          labelFb: "Status",        default: true,  sortable: true,  width: "0.8fr" },
  { id: "doctor",      labelKey: "col_doctor",          labelFb: "Arzt",          default: true,  sortable: true,  width: "1fr" },
  { id: "nextAppt",    labelKey: "col_next_appointment",labelFb: "Nächster Termin",default: true,  sortable: true,  width: "1.2fr" },
  { id: "grafts",      labelKey: "grafts_label",        labelFb: "Grafts",        default: true,  sortable: true,  width: "0.9fr" },
  { id: "treatment",   labelKey: "col_treatment",       labelFb: "Behandlung",    default: false, sortable: true,  width: "0.9fr" },
  { id: "country",     labelKey: "col_country",         labelFb: "Land",          default: false, sortable: true,  width: "0.7fr" },
  { id: "source",      labelKey: "col_source",          labelFb: "Quelle",        default: false, sortable: true,  width: "0.8fr" },
  { id: "revenue",     labelKey: "col_revenue",         labelFb: "Umsatz",        default: false, sortable: true,  width: "0.7fr" },
  { id: "deposit",     labelKey: "col_deposit",         labelFb: "Anzahlung",     default: false, sortable: true,  width: "0.7fr" },
  { id: "remaining",   labelKey: "col_remaining",       labelFb: "Restbetrag",    default: false, sortable: true,  width: "0.7fr" },
  { id: "photos",      labelKey: "col_photos",          labelFb: "Fotos",         default: false, sortable: false, width: "0.5fr" },
  { id: "lastContact", labelKey: "col_contact",         labelFb: "Kontakt",       default: true,  sortable: true,  width: "0.7fr" },
  { id: "actions",     labelKey: "",                    labelFb: "",              default: true,  sortable: false, width: "auto" },
];
function getAllColumns(t) {
  return ALL_COLUMNS_DEF.map(c => ({ ...c, label: (c.labelKey && t(c.labelKey)) || c.labelFb }));
}

/* ═══════════════════════════════════════════════════════
   FILTER DROPDOWN COMPONENT
   ═══════════════════════════════════════════════════════ */
function FilterDropdown({ label, icon, options, value, onChange, multi }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = multi ? (value || []).length > 0 : !!value;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        background: active ? "rgba(76,201,255,0.08)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${active ? "rgba(76,201,255,0.2)" : "rgba(255,255,255,0.05)"}`,
        color: active ? "#4cc9ff" : "rgba(167,177,195,0.65)",
        display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
      }}>
        {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
        {label}
        {active && <span style={{ fontSize: 9, background: "rgba(76,201,255,0.15)", padding: "1px 5px", borderRadius: 4, fontWeight: 800 }}>
          {multi ? (value || []).length : "1"}
        </span>}
        <span style={{ fontSize: 8, opacity: 0.5 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 4, minWidth: 180,
          background: "#1a2338", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 100, padding: 4, maxHeight: 260, overflowY: "auto",
        }}>
          {multi && (value || []).length > 0 && (
            <button onClick={() => { onChange([]); setOpen(false); }} style={{
              width: "100%", padding: "6px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: "transparent", border: "none", color: "#ef4444", textAlign: "left", fontFamily: "inherit",
            }}>{t("reset_filter") || "Filter zurücksetzen"}</button>
          )}
          {!multi && value && (
            <button onClick={() => { onChange(""); setOpen(false); }} style={{
              width: "100%", padding: "6px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: "transparent", border: "none", color: "#ef4444", textAlign: "left", fontFamily: "inherit",
            }}>{t("reset_filter") || "Filter zurücksetzen"}</button>
          )}
          {options.map(opt => {
            const val = typeof opt === "string" ? opt : opt.value;
            const lbl = typeof opt === "string" ? opt : opt.label;
            const selected = multi ? (value || []).includes(val) : value === val;
            return (
              <button key={val} onClick={() => {
                if (multi) {
                  const cur = value || [];
                  onChange(selected ? cur.filter(v => v !== val) : [...cur, val]);
                } else {
                  onChange(selected ? "" : val);
                  setOpen(false);
                }
              }} style={{
                width: "100%", padding: "6px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: selected ? "rgba(76,201,255,0.08)" : "transparent",
                border: "none", color: selected ? "#4cc9ff" : "rgba(232,238,252,0.9)", textAlign: "left", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {multi && <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${selected ? "#4cc9ff" : "rgba(255,255,255,0.15)"}`, background: selected ? "rgba(76,201,255,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#4cc9ff", flexShrink: 0 }}>
                  {selected && "✓"}
                </span>}
                {lbl}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   COLUMN CHOOSER
   ═══════════════════════════════════════════════════════ */
function ColumnChooser({ columns, visibleCols, setVisibleCols }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", color: "rgba(167,177,195,0.65)",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        <span style={{ fontSize: 10 }}>⚙️</span> {t("columns_label") || "Spalten"}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 4, minWidth: 200,
          background: "#1a2338", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 100, padding: 4,
        }}>
          {columns.filter(c => c.id !== "actions").map(col => {
            const active = visibleCols.includes(col.id);
            return (
              <button key={col.id} onClick={() => {
                setVisibleCols(prev => active ? prev.filter(c => c !== col.id) : [...prev, col.id]);
              }} style={{
                width: "100%", padding: "6px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: active ? "rgba(76,201,255,0.06)" : "transparent",
                border: "none", color: active ? "#4cc9ff" : "rgba(167,177,195,0.7)", textAlign: "left", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${active ? "#4cc9ff" : "rgba(255,255,255,0.12)"}`, background: active ? "rgba(76,201,255,0.12)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#4cc9ff", flexShrink: 0 }}>
                  {active && "✓"}
                </span>
                {col.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SHIMMER SKELETON ROWS
   ═══════════════════════════════════════════════════════ */
const shimmerKeyframes = `@keyframes fmShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`;

function ShimmerBlock({ w, h = 12, r = 4 }) {
  return <div style={{
    width: w, height: h, borderRadius: r,
    background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)",
    backgroundSize: "800px 100%", animation: "fmShimmer 1.5s infinite ease-in-out",
  }} />;
}

function SkeletonRows({ count = 8, colCount = 7 }) {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: `36px repeat(${colCount}, 1fr) auto`,
          gap: 8, padding: "12px 16px", alignItems: "center",
          borderTop: i > 0 ? "1px solid rgba(255,255,255,0.03)" : "none",
        }}>
          <ShimmerBlock w={14} h={14} r={3} />
          {/* Name col with avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShimmerBlock w={30} h={30} r={7} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <ShimmerBlock w={90 + Math.random() * 50} h={12} r={4} />
              <ShimmerBlock w={60 + Math.random() * 30} h={9} r={3} />
            </div>
          </div>
          {Array.from({ length: colCount - 1 }).map((_, j) => (
            <ShimmerBlock key={j} w={50 + Math.random() * 40} h={11} r={4} />
          ))}
          <ShimmerBlock w={28} h={22} r={5} />
        </div>
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   BULK ACTIONS BAR
   ═══════════════════════════════════════════════════════ */
function BulkBar({ count, onClear, onExport, onAssignDoctor, onArchive, onBulkDelete, doctors, isAdmin }) {
  const { t } = useApp();
  const ll = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
  const TR = (de, en, tr) => ({ de, en, tr }[ll] || de);
  const [showDocPicker, setShowDocPicker] = useState(false);
  return (
    <div style={{
      position: "sticky", bottom: 16, left: 0, right: 0, zIndex: 50,
      margin: "0 16px", padding: "10px 20px", borderRadius: 12,
      background: "linear-gradient(135deg, rgba(26,35,56,0.98), rgba(19,28,46,0.98))",
      border: "1px solid rgba(76,201,255,0.2)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", gap: 12, backdropFilter: "blur(12px)",
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#4cc9ff" }}>{count} {t("selected_count_label") || "ausgewählt"}</span>
      <div style={{ flex: 1 }} />
      <button onClick={onExport} style={bulkBtnStyle}>📥 Export</button>
      <div style={{ position: "relative", display: "none" }}>
        <button onClick={() => setShowDocPicker(!showDocPicker)} style={bulkBtnStyle}>🩺 {t("assign_doctor") || "Arzt zuweisen"}</button>
        {showDocPicker && (
          <div style={{
            position: "absolute", bottom: "100%", left: 0, marginBottom: 4, minWidth: 180,
            background: "#1a2338", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)", padding: 4,
          }}>
            {doctors.map(d => (
              <button key={d} onClick={() => { onAssignDoctor(d); setShowDocPicker(false); }} style={{
                width: "100%", padding: "6px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                background: "transparent", border: "none", color: "rgba(232,238,252,0.95)",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              }}>{d}</button>
            ))}
            {doctors.length === 0 && <div style={{ padding: 8, fontSize: 11, color: "rgba(167,177,195,0.6)" }}>{t("no_doctors_label") || "Keine Ärzte"}</div>}
          </div>
        )}
      </div>
      {isAdmin && onBulkDelete && (
        <button
          onClick={onBulkDelete}
          style={{
            ...bulkBtnStyle,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
          }}
        >
          🗑 {TR("Endgültig löschen", "Delete permanently", "Kalıcı olarak sil")}
        </button>
      )}
      <button onClick={onClear} style={{ ...bulkBtnStyle, color: "rgba(167,177,195,0.7)" }}>✕</button>
    </div>
  );
}

const bulkBtnStyle = {
  padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,238,252,0.95)",
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function PatientsPage() {
  const {
    myLeads, openPatient, myAppts, showT, t, user, clinic, invoices,
    setView, setSelLead, setLeads,
  } = useApp();

  const STATUS_MAP = getStatusMap(t);
  const SOURCE_MAP = getSourceMap(t);
  const CONV_LABELS = getConvLabels(t);

  // Show shimmer skeleton while initial data hasn't loaded yet
  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    if (myLeads.length > 0 || clinic) setInitialLoad(false);
    // Fallback: stop shimmer after 3s even if no data
    const timer = setTimeout(() => setInitialLoad(false), 3000);
    return () => clearTimeout(timer);
  }, [myLeads.length, clinic]);
  const isLoading = initialLoad && myLeads.length === 0;

  // Role-based access
  const role = (user?.apiRole || user?.role || "coordinator").toLowerCase().replace("clinic_", "");
  const canEdit = role === "admin" || role === "coordinator" || role === "platform_owner";
  const isDoctor = role === "doctor";

  // State
  const [showNewLead, setShowNewLead] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("lastContact");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterTreatment, setFilterTreatment] = useState("");
  const [filterCountry, setFilterCountry] = useState([]);
  const [filterSource, setFilterSource] = useState([]);
  const [filterPhotos, setFilterPhotos] = useState(""); // "with" | "without" | ""
  const [filterDeposit, setFilterDeposit] = useState(""); // "paid" | "pending" | ""
  const [filterApptToday, setFilterApptToday] = useState(false);
  const [filterApptWeek, setFilterApptWeek] = useState(false);

  // Visible columns
  const [visibleCols, setVisibleCols] = useState(() =>
    ALL_COLUMNS_DEF.filter(c => c.default).map(c => c.id)
  );

  // Derived data: unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const doctors = new Set();
    const treatments = new Set();
    const countries = new Set();
    const sources = new Set();
    myLeads.forEach(l => {
      if (l.assignedDoctor || l.reviewData?.doctor) doctors.add(l.assignedDoctor || l.reviewData?.doctor);
      if (l.treatment) treatments.add(l.treatment);
      if (l.country) countries.add(l.country);
      if (l.source) sources.add(l.source);
    });
    return {
      doctors: [...doctors].filter(Boolean).sort(),
      treatments: [...treatments].filter(Boolean).sort(),
      countries: [...countries].filter(Boolean).sort(),
      sources: [...sources].filter(Boolean),
    };
  }, [myLeads]);

  // Stats
  const stats = useMemo(() => ({
    total: myLeads.length,
    leads: myLeads.filter(l => l.stage === "new").length,
    contacted: myLeads.filter(l => l.stage === "contacted").length,
    booked: myLeads.filter(l => l.stage === "booked").length,
    done: myLeads.filter(l => l.stage === "done").length,
    cancelled: myLeads.filter(l => l.stage === "cancelled").length,
  }), [myLeads]);

  // Next appointment per patient
  const nextAppt = useMemo(() => {
    const map = {};
    const now = new Date().toISOString().slice(0, 10);
    myAppts.forEach(a => {
      const pid = a.patientId || a.patient_id || a.leadId;
      if (!pid || !a.date || a.date < now || a.status === "cancelled") return;
      if (!map[pid] || a.date < map[pid].date) map[pid] = a;
    });
    return map;
  }, [myAppts]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = myLeads;

    // Doctor role: only assigned patients
    if (isDoctor && user?.name) {
      list = list.filter(l => (l.assignedDoctor || l.reviewData?.doctor) === user.name);
    }

    // Stage
    if (stageFilter !== "all") list = list.filter(l => l.stage === stageFilter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(l =>
        (l.name || "").toLowerCase().includes(q) ||
        (l.phone || l.from || "").toLowerCase().includes(q) ||
        (l.treatment || "").toLowerCase().includes(q) ||
        (l.country || "").toLowerCase().includes(q) ||
        (l.assignedDoctor || "").toLowerCase().includes(q)
      );
    }

    // Advanced filters
    if (filterDoctor) list = list.filter(l => (l.assignedDoctor || l.reviewData?.doctor) === filterDoctor);
    if (filterTreatment) list = list.filter(l => l.treatment === filterTreatment);
    if (filterCountry.length) list = list.filter(l => filterCountry.includes(l.country));
    if (filterSource.length) list = list.filter(l => filterSource.includes(l.source));
    if (filterPhotos === "with") list = list.filter(l => (l.photoUrls || []).length > 0 || l.photos);
    if (filterPhotos === "without") list = list.filter(l => (l.photoUrls || []).length === 0 && !l.photos);
    if (filterDeposit === "paid") list = list.filter(l => l.convStatus === "deposit_paid" || l.financials?.depositStatus === "paid");
    if (filterDeposit === "pending") list = list.filter(l => l.convStatus !== "deposit_paid" && l.financials?.depositStatus !== "paid");
    if (filterApptToday) list = list.filter(l => { const a = nextAppt[l.id]; return a && isToday(a.date); });
    if (filterApptWeek) list = list.filter(l => { const a = nextAppt[l.id]; return a && isThisWeek(a.date); });

    // Sort
    list = [...list].sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case "name": va = a.name || ""; vb = b.name || ""; break;
        case "status":
        case "stage": va = a.stage || ""; vb = b.stage || ""; break;
        case "doctor": va = a.appointmentDoctor || a.reviewData?.doctorName || a.assignedDoctor || ""; vb = b.appointmentDoctor || b.reviewData?.doctorName || b.assignedDoctor || ""; break;
        case "treatment": va = a.treatment || ""; vb = b.treatment || ""; break;
        case "country": va = a.country || ""; vb = b.country || ""; break;
        case "source": va = a.source || ""; vb = b.source || ""; break;
        case "nextAppt": va = nextAppt[a.id]?.date || "9999"; vb = nextAppt[b.id]?.date || "9999"; break;
        case "grafts": {
          const ga = Number(a.grafts || a.reviewData?.grafts || 0);
          const gb = Number(b.grafts || b.reviewData?.grafts || 0);
          return sortDir === "asc" ? ga - gb : gb - ga;
        }
        case "revenue": {
          const ra = getFinancials(a).price;
          const rb = getFinancials(b).price;
          return sortDir === "asc" ? ra - rb : rb - ra;
        }
        case "deposit": {
          const da = getFinancials(a).deposit;
          const db = getFinancials(b).deposit;
          return sortDir === "asc" ? da - db : db - da;
        }
        case "remaining": {
          const ra = getFinancials(a).remaining;
          const rb = getFinancials(b).remaining;
          return sortDir === "asc" ? ra - rb : rb - ra;
        }
        case "lastContact":
        default:
          va = a.lastAiInteraction || a.createdAt || ""; vb = b.lastAiInteraction || b.createdAt || ""; break;
      }
      if (va === undefined) return 0;
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [myLeads, search, stageFilter, sortBy, sortDir, filterDoctor, filterTreatment, filterCountry, filterSource, filterPhotos, filterDeposit, filterApptToday, filterApptWeek, nextAppt, isDoctor, user]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [search, stageFilter, filterDoctor, filterTreatment, filterCountry, filterSource, filterPhotos, filterDeposit, filterApptToday, filterApptWeek]);

  // Active columns
  const activeCols = useMemo(() =>
    getAllColumns(t).filter(c => visibleCols.includes(c.id) || c.id === "actions"),
    [visibleCols, t]
  );

  const gridTemplate = activeCols.map(c => c.width).join(" ");

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span style={{ opacity: 0.2, fontSize: 10 }}>↕</span>;
    return <span style={{ fontSize: 10, color: "#4cc9ff" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  // Selection
  const toggleSelect = useCallback((id, e) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(l => l.id)));
  }, [paged, selected]);

  // Active filter count
  const activeFilterCount = [filterDoctor, filterTreatment, filterCountry.length > 0, filterSource.length > 0, filterPhotos, filterDeposit, filterApptToday, filterApptWeek].filter(Boolean).length;

  // Export
  const handleExport = (leads) => {
    const rows = leads || filtered;
    const csv = (t("csv_header") || "Name,Telefon,Status,Behandlung,Grafts,Land,Arzt,Quelle,Umsatz,Anzahlung,Letzter Kontakt") + "\n" +
      rows.map(l => {
        const fin = getFinancials(l);
        return [
          l.name, l.phone || l.from || "", STATUS_MAP[l.stage]?.label || l.stage,
          l.treatment || "", l.grafts || l.reviewData?.grafts || "",
          l.country || "", l.assignedDoctor || l.reviewData?.doctor || "",
          l.source || "", fin.price || "", fin.deposit || "",
          l.lastAiInteraction ? new Date(l.lastAiInteraction).toLocaleDateString(fmLocale()) : "",
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
      }).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `flowmatix-patienten-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    showT(t("export_started") || "Export gestartet");
  };

  // Bulk actions
  const handleBulkExport = () => {
    const rows = filtered.filter(l => selected.has(l.id));
    handleExport(rows);
    setSelected(new Set());
  };

  const handleBulkDeleteConfirm = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      const { apiFetch } = await import("../../api/client");
      const res = await apiFetch(`/api/v1/crm/patients/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ ids, confirm: "GDPR_DELETE" }),
      });
      if (res?.success) {
        const ll = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
        const tt = (de, en, tr) => ({ de, en, tr }[ll] || de);
        showT(`${res.deleted} ${tt("Patienten gelöscht", "patients deleted", "hasta silindi")}`);
        const deletedSet = selected; // capture before clearing
        setLeads(prev => prev.filter(l => !deletedSet.has(l.id)));
        // Wipe the deleted patients from the inbox store too — same
        // reason as in PatientPanel: inbox has its own state and would
        // otherwise still render rows for patients that no longer exist.
        try {
          useInboxStore.getState().setMsgs(prev => {
            const next = {};
            for (const [cid, list] of Object.entries(prev || {})) {
              next[cid] = (list || []).filter(c => !deletedSet.has(c.patientId) && !deletedSet.has(c.leadId));
            }
            return next;
          });
        } catch {}
        setSelected(new Set());
        setBulkDeleteOpen(false);
      } else {
        const ll = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
        const tt = (de, en, tr) => ({ de, en, tr }[ll] || de);
        showT(res?.error || tt("Fehler", "Error", "Hata"), "error");
      }
    } catch (e) {
      const ll = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
      const tt = (de, en, tr) => ({ de, en, tr }[ll] || de);
      showT(e?.message || tt("Fehler", "Error", "Hata"), "error");
      throw e;
    }
  };

  const handleBulkAssignDoctor = (doctor) => {
    selected.forEach(id => {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, assignedDoctor: doctor } : l));
      import("../../api/client").then(m => m.updatePatient(id, { assignedDoctor: doctor })).catch(() => {});
    });
    showT(`${selected.size} ${t("patients_count_plural") || "Patienten"} → ${doctor}`);
    setSelected(new Set());
  };

  const handleBulkArchive = () => {
    selected.forEach(id => {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, archived: true } : l));
      import("../../api/client").then(m => m.updatePatient(id, { archived: true })).catch(() => {});
    });
    showT(`${selected.size} ${t("patients_count_plural") || "Patienten"} ${t("archived_label") || "archiviert"}`);
    setSelected(new Set());
  };

  // Quick actions
  const openChat = (leadId, e) => {
    e.stopPropagation();
    const { msgs, setSelChat } = useInboxStore.getState();
    const clinicId = clinic?.id || myLeads[0]?.clinic || null;
    const chat = (msgs[clinicId] || []).find(m => m.leadId === leadId || m.patientId === leadId);
    if (chat) setSelChat(chat);
    else setSelChat({ leadId, patientId: leadId });
    setView("inbox");
  };

  return (
    <div style={{ padding: "24px 28px", position: "relative", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.03em", color: "rgba(232,238,252,0.95)" }}>{t("patients_title") || "Patienten"}</h1>
          <p style={{ fontSize: 12, color: "rgba(167,177,195,0.65)", margin: 0, fontWeight: 500 }}>
            {isDoctor ? (t("my_assigned_patients") || "Meine zugewiesenen Patienten") : (t("all_clinic_patients") || "Alle Klinik-Patienten und Datensätze")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ColumnChooser columns={getAllColumns(t)} visibleCols={visibleCols} setVisibleCols={setVisibleCols} />
          <button onClick={() => handleExport()} style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.7)",
          }}>📥 Export</button>
          {canEdit && (
            <button onClick={() => setShowNewLead(true)} style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              background: "#4cc9ff", border: "1px solid #4cc9ff", color: "#0a0e17",
              boxShadow: "0 2px 8px rgba(76,201,255,0.2)",
            }}>{t("new_patient_btn") || "+ Neuer Patient"}</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 20 }}>
        <Stat label={t("total_label") || "Gesamt"} value={stats.total} color="#4cc9ff" onClick={() => setStageFilter("all")} />
        <Stat label={t("new_request") || "Neue Anfrage"} value={stats.leads} color="#4cc9ff" onClick={() => setStageFilter("new")} />
        <Stat label={t("doctor_review") || "Arzt-Review"} value={stats.contacted} color="#ff8a2a" onClick={() => setStageFilter("contacted")} />
        <Stat label={t("stage_booked") || "Gebucht"} value={stats.booked} color="#a78bfa" onClick={() => setStageFilter("booked")} />
        <Stat label={t("stage_done") || "Abgeschlossen"} value={stats.done} color="#10b981" onClick={() => setStageFilter("done")} />
        <Stat label={t("stage_cancelled") || "Storniert"} value={stats.cancelled || 0} color="#ef4444" onClick={() => setStageFilter("cancelled")} />
      </div>

      {/* Search + Stage Filter + Advanced Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "0 0 280px" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "rgba(167,177,195,0.65)", pointerEvents: "none" }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("search_patients_placeholder") || "Name, Telefon, Behandlung..."}
            style={{
              width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(232,238,252,0.85)", fontSize: 12, fontWeight: 500, fontFamily: "inherit", outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(76,201,255,0.2)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.06)"}
          />
        </div>

        {/* Stage filter pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "all", label: t("all_label") || "Alle" },
            ...STAGES.map(s => ({ id: s.id, label: STATUS_MAP[s.id]?.label || s.label })),
          ].map(f => (
            <button key={f.id} onClick={() => setStageFilter(f.id)} style={{
              padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              background: stageFilter === f.id ? "rgba(76,201,255,0.1)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${stageFilter === f.id ? "rgba(76,201,255,0.2)" : "rgba(255,255,255,0.05)"}`,
              color: stageFilter === f.id ? "#4cc9ff" : "rgba(167,177,195,0.65)",
            }}>{f.label}</button>
          ))}
        </div>

        {/* Advanced filter toggle */}
        <button onClick={() => setShowFilters(!showFilters)} style={{
          padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          background: activeFilterCount > 0 ? "rgba(76,201,255,0.08)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${activeFilterCount > 0 ? "rgba(76,201,255,0.2)" : "rgba(255,255,255,0.05)"}`,
          color: activeFilterCount > 0 ? "#4cc9ff" : "rgba(167,177,195,0.65)",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          🎛️ Filter
          {activeFilterCount > 0 && (
            <span style={{ fontSize: 9, background: "rgba(76,201,255,0.2)", padding: "1px 5px", borderRadius: 4, fontWeight: 800, color: "#4cc9ff" }}>{activeFilterCount}</span>
          )}
        </button>

        <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(167,177,195,0.7)" }}>
          {filtered.length} {filtered.length === 1 ? (t("patients_count_single") || "Patient") : (t("patients_count_plural") || "Patienten")}
        </div>
      </div>

      {/* Advanced filter bar */}
      {showFilters && (
        <div style={{
          display: "flex", gap: 6, marginBottom: 12, padding: "10px 14px", borderRadius: 8,
          background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
          flexWrap: "wrap", alignItems: "center",
        }}>
          <FilterDropdown label={t("col_doctor") || "Arzt"} icon="🩺" options={filterOptions.doctors} value={filterDoctor} onChange={setFilterDoctor} />
          <FilterDropdown label={t("filter_treatment") || "Behandlung"} icon="💊" options={filterOptions.treatments} value={filterTreatment} onChange={setFilterTreatment} />
          <FilterDropdown label={t("col_country") || "Land"} icon="🌍" options={filterOptions.countries} value={filterCountry} onChange={setFilterCountry} multi />
          <FilterDropdown label={t("col_source") || "Quelle"} icon="📥" options={filterOptions.sources.map(s => ({ value: s, label: SOURCE_MAP[s]?.label || s }))} value={filterSource} onChange={setFilterSource} multi />
          <FilterDropdown label={t("col_photos") || "Fotos"} icon="📷" options={[{ value: "with", label: t("filter_with_photos") || "Mit Fotos" }, { value: "without", label: t("filter_without_photos") || "Ohne Fotos" }]} value={filterPhotos} onChange={setFilterPhotos} />
          <FilterDropdown label={t("filter_deposit") || "Anzahlung"} icon="💰" options={[{ value: "paid", label: t("filter_deposit_paid") || "Bezahlt" }, { value: "pending", label: t("filter_deposit_pending") || "Offen" }]} value={filterDeposit} onChange={setFilterDeposit} />

          {/* Quick toggles */}
          <button onClick={() => setFilterApptToday(!filterApptToday)} style={{
            padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            background: filterApptToday ? "rgba(76,201,255,0.08)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${filterApptToday ? "rgba(76,201,255,0.2)" : "rgba(255,255,255,0.05)"}`,
            color: filterApptToday ? "#4cc9ff" : "rgba(167,177,195,0.65)",
          }}>{"\uD83D\uDCC5"} {t("today_label") || "Heute"}</button>
          <button onClick={() => setFilterApptWeek(!filterApptWeek)} style={{
            padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            background: filterApptWeek ? "rgba(76,201,255,0.08)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${filterApptWeek ? "rgba(76,201,255,0.2)" : "rgba(255,255,255,0.05)"}`,
            color: filterApptWeek ? "#4cc9ff" : "rgba(167,177,195,0.65)",
          }}>{"\uD83D\uDCC5"} {t("this_week_label") || "Diese Woche"}</button>

          {activeFilterCount > 0 && (
            <button onClick={() => { setFilterDoctor(""); setFilterTreatment(""); setFilterCountry([]); setFilterSource([]); setFilterPhotos(""); setFilterDeposit(""); setFilterApptToday(false); setFilterApptWeek(false); }} style={{
              padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444",
              marginLeft: "auto",
            }}>✕ {t("reset_all_filters") || "Alle Filter zurücksetzen"}</button>
          )}
        </div>
      )}

      {/* Table */}
      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)" }}>
        {/* Table Header */}
        <div style={{
          display: "grid", gridTemplateColumns: `36px ${gridTemplate}`,
          gap: 8, padding: "8px 16px", background: "rgba(255,255,255,0.02)",
          fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.05em",
          alignItems: "center",
        }}>
          {/* Checkbox */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <input type="checkbox" checked={selected.size > 0 && selected.size === paged.length} onChange={toggleSelectAll}
              style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#4cc9ff" }} />
          </div>
          {activeCols.map(col => (
            <div key={col.id} onClick={col.sortable ? () => toggleSort(col.id === "status" ? "stage" : col.id) : undefined}
              style={{ cursor: col.sortable ? "pointer" : "default", display: "flex", alignItems: "center", gap: 4 }}>
              {col.label} {col.sortable && <SortIcon col={col.id === "status" ? "stage" : col.id} />}
            </div>
          ))}
        </div>

        {/* Rows */}
        {isLoading ? (
          <SkeletonRows count={8} colCount={activeCols.length - 1} />
        ) : paged.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(167,177,195,0.75)" }}>
              {search || activeFilterCount > 0 ? (t("no_results") || "Keine Ergebnisse") : (t("no_patients_yet") || "Noch keine Patienten")}
            </div>
            <div style={{ fontSize: 12, color: "rgba(167,177,195,0.6)", marginTop: 4 }}>
              {search ? (t("try_different_search") || "Versuche einen anderen Suchbegriff") : (t("patients_auto_created") || "Patienten werden automatisch angelegt wenn sie über WhatsApp schreiben")}
            </div>
          </div>
        ) : paged.map((lead) => {
          const sm = STATUS_MAP[lead.stage] || { label: lead.stage, color: "#6b7280" };
          const grafts = lead.grafts || lead.reviewData?.grafts;
          const appt = nextAppt[lead.id];
          const fin = getFinancials(lead);
          const photoCount = (lead.photoUrls || []).length;
          const src = SOURCE_MAP[lead.source] || { label: lead.source || "—", icon: "—", color: "#6b7280" };
          const initials = getInitials(lead.name);
          const isSelected = selected.has(lead.id);

          return (
            <div key={lead.id} onClick={() => openPatient(lead.id)} style={{
              display: "grid", gridTemplateColumns: `36px ${gridTemplate}`,
              gap: 8, padding: "10px 16px", alignItems: "center", fontSize: 12, cursor: "pointer",
              borderTop: "1px solid rgba(255,255,255,0.03)",
              background: isSelected ? "rgba(76,201,255,0.04)" : "transparent", transition: "background 0.1s",
            }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
            >
              {/* Checkbox */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => toggleSelect(lead.id, e)}>
                <input type="checkbox" checked={isSelected} readOnly
                  style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#4cc9ff" }} />
              </div>

              {/* Dynamic columns */}
              {activeCols.map(col => {
                switch (col.id) {
                  case "name":
                    return (
                      <div key={col.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {(lead.metadata?.avatar || lead.avatar) ? (
                          <img src={lead.metadata?.avatar || lead.avatar} alt={lead.name} style={{
                            width: 30, height: 30, borderRadius: 7, flexShrink: 0, objectFit: "cover",
                          }} />
                        ) : (
                          <div style={{
                            width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                            background: getAvatarGradient(lead.name),
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 800, fontSize: 10, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                          }}>{initials}</div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "rgba(232,238,252,0.9)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</div>
                          <div style={{ fontSize: 10, color: "rgba(167,177,195,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {lead.treatment || "—"}{lead.country ? ` · ${translateValue(lead.country)}` : ""}
                          </div>
                        </div>
                      </div>
                    );
                  case "phone":
                    return <div key={col.id} style={{ color: "rgba(167,177,195,0.7)", fontSize: 11 }}>{lead.phone || lead.from || "—"}</div>;
                  case "status":
                    return (
                      <div key={col.id}>
                        <span style={{
                          padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                          background: `${sm.color}15`, color: sm.color, border: `1px solid ${sm.color}25`,
                        }}>{sm.label}</span>
                      </div>
                    );
                  case "doctor":
                    return <div key={col.id} style={{ color: "rgba(167,177,195,0.7)", fontSize: 11 }}>{lead.appointmentDoctor || lead.reviewData?.doctorName || lead.assignedDoctor || "—"}</div>;
                  case "nextAppt":
                    return (
                      <div key={col.id} style={{ fontSize: 11 }}>
                        {appt ? (
                          <span style={{ color: isToday(appt.date) ? "#10b981" : "rgba(232,238,252,0.95)", fontWeight: isToday(appt.date) ? 700 : 400 }}>
                            {isToday(appt.date) ? (t("today_label") || "Heute") : new Date(appt.date).toLocaleDateString(fmLocale(), { day: "numeric", month: "short" })}
                            {appt.time ? ` · ${appt.time}` : ""}
                          </span>
                        ) : <span style={{ color: "rgba(167,177,195,0.6)" }}>—</span>}
                      </div>
                    );
                  case "grafts":
                    return <div key={col.id} style={{ fontSize: 11, color: grafts ? "#10b981" : "rgba(167,177,195,0.6)", fontWeight: grafts ? 700 : 400, textAlign: "left", paddingLeft: 0 }}>{grafts ? Number(grafts).toLocaleString("de-DE") : "—"}</div>;
                  case "treatment":
                    return <div key={col.id} style={{ fontSize: 11, color: "rgba(232,238,252,0.95)" }}>{lead.treatment || "—"}</div>;
                  case "country":
                    return <div key={col.id} style={{ fontSize: 11, color: "rgba(232,238,252,0.95)" }}>{translateValue(lead.country) || "—"}</div>;
                  case "source":
                    return (
                      <div key={col.id} style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
                        <ChannelBadge channel={lead.source || "whatsapp"} size="small" />
                      </div>
                    );
                  case "revenue":
                    return <div key={col.id} style={{ fontSize: 11, fontWeight: fin.price ? 700 : 400, color: fin.price ? "rgba(232,238,252,0.95)" : "rgba(167,177,195,0.6)" }}>{fin.price ? `€${fin.price.toLocaleString()}` : "—"}</div>;
                  case "deposit":
                    return (
                      <div key={col.id} style={{ fontSize: 11 }}>
                        {fin.deposit > 0 ? (
                          <span style={{ color: fin.depositPaid ? "#10b981" : "#fbbf24", fontWeight: 700 }}>
                            €{fin.deposit.toLocaleString()} {fin.depositPaid ? "✓" : ""}
                          </span>
                        ) : <span style={{ color: "rgba(167,177,195,0.6)" }}>—</span>}
                      </div>
                    );
                  case "remaining":
                    return <div key={col.id} style={{ fontSize: 11, fontWeight: 700, color: fin.remaining > 0 ? "#fbbf24" : fin.price > 0 ? "#10b981" : "rgba(167,177,195,0.6)" }}>{fin.price > 0 ? `€${fin.remaining.toLocaleString()}` : "—"}</div>;
                  case "photos":
                    return (
                      <div key={col.id} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                        {photoCount > 0 ? (
                          <span style={{ color: "#a78bfa", fontWeight: 700 }}>📷 {photoCount}</span>
                        ) : <span style={{ color: "rgba(167,177,195,0.6)" }}>—</span>}
                      </div>
                    );
                  case "lastContact":
                    return <div key={col.id} style={{ fontSize: 11, color: "rgba(167,177,195,0.6)" }}>{timeAgoShort(lead.lastAiInteraction || lead.createdAt, t)}</div>;
                  case "actions":
                    return (
                      <div key={col.id} style={{ display: "flex", gap: 3 }} onClick={e => e.stopPropagation()}>
                        <button onClick={(e) => openChat(lead.id, e)} title={t("chat_open_title") || "Chat öffnen"} style={actionBtnStyle("rgba(37,211,102,0.06)", "rgba(37,211,102,0.12)", "#25D366")}>💬</button>
                      </div>
                    );
                  default:
                    return <div key={col.id}>—</div>;
                }
              })}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 0" }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={pageBtnStyle(page === 0)}>← {t("back_nav") || "Zurück"}</button>
          <span style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", fontWeight: 600 }}>
            {t("page_label") || "Seite"} {page + 1} {t("of_label") || "von"} {totalPages}
          </span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={pageBtnStyle(page >= totalPages - 1)}>{t("next_page") || "Weiter →"}</button>
        </div>
      )}

      {/* Footer count */}
      {filtered.length > 0 && (
        <div style={{ padding: "4px 16px 16px", fontSize: 11, color: "rgba(167,177,195,0.6)" }}>
          {filtered.length} {t("patients_of_total") || "von"} {myLeads.length} {t("patients_count_plural") || "Patienten"}
          {totalPages > 1 && ` · ${t("page_label") || "Seite"} ${page + 1}/${totalPages} (${PAGE_SIZE} ${t("per_page") || "pro Seite"})`}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onExport={handleBulkExport}
          onAssignDoctor={handleBulkAssignDoctor}
          onArchive={handleBulkArchive}
          onBulkDelete={() => setBulkDeleteOpen(true)}
          isAdmin={user?.role === "admin" || user?.role === "clinic_admin" || user?.role === "platform_owner" || user?.apiRole === "clinic_admin" || user?.apiRole === "platform_owner"}
          doctors={filterOptions.doctors}
        />
      )}

      {/* Bulk Hard-Delete Modal — same DELETE-confirmation pattern as
          single-patient HardDeleteModal, but tells the user how many
          will be deleted at once */}
      <HardDeleteModal
        open={bulkDeleteOpen}
        lang={(localStorage.getItem("fm_lang") || "de").substring(0, 2)}
        patientName={`${selected.size} Patienten`}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
      />

      {/* New Lead Modal */}
      {showNewLead && (
        <NewLeadModal
          onClose={() => setShowNewLead(false)}
          onCreated={() => { setShowNewLead(false); }}
          showT={showT}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STYLE HELPERS
   ═══════════════════════════════════════════════════════ */
function actionBtnStyle(bg, border, color) {
  return {
    padding: "4px 7px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
    background: bg, border: `1px solid ${border}`, color, lineHeight: 1,
  };
}

function pageBtnStyle(disabled) {
  return {
    padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: disabled ? "default" : "pointer",
    fontFamily: "inherit", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    color: disabled ? "rgba(167,177,195,0.6)" : "rgba(232,238,252,0.9)", opacity: disabled ? 0.5 : 1,
  };
}
