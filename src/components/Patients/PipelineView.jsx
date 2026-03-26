import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useInboxStore } from "../../stores";
import { CONV_STATUS } from "../../data/constants";
import { getNowMs, isDemoMode } from "../../utils/demoTime";
import { LOGISTICS_COLORS } from "../../data/badgeColors";
import { getAvatarGradient, getInitials } from "../shared/index";
import { translateValue } from "../../utils/helpers";

/**
 * Pipeline Kanban Board — 4-column layout, neutral Notion/Linear style.
 * Columns: Neue Anfrage | Kontaktiert | Gebucht | Abgeschlossen
 * Sub-status dots: Photos, Review, DSGVO, Deposit, Flight, Hotel, Driver
 */

const PIPELINE_COLUMNS = [
  { id: "new", labelKey: "stage_new_inquiry", label: "Neue Anfrage", accent: "#4cc9ff" },
  { id: "contacted", labelKey: "stage_doctor_review", label: "Arzt-Review", accent: "#ff8a2a" },
  { id: "booked", labelKey: "stage_booked", label: "Gebucht", accent: "#a78bfa" },
  { id: "done", labelKey: "stage_completed", label: "Abgeschlossen", accent: "#10b981" },
];

function getSubStatusDots(lead, invoices) {
  return [
    { key: "photos", ok: (lead.photoUrls?.length > 0 || lead.photos) },
    { key: "review", ok: !!lead.reviewData },
    { key: "dsgvo", ok: !!lead.consent?.granted },
    { key: "deposit", ok: lead.convStatus === "deposit_paid" || lead.financials?.depositStatus === "paid" || invoices?.some(i => i.leadId === lead.id && i.status === "paid") },
    { key: "flight", ok: !!(lead.flightConfirmed?.date) || !!lead.noFlightNeeded },
    { key: "hotel", ok: !!(lead.hotelInfo?.name) },
    { key: "driver", ok: !!(lead.logistics?.driverName) },
  ];
}

/* Inject blink animation for handover dots */
if (!document.getElementById("fm-pipe-css")) {
  const ss = document.createElement("style");
  ss.id = "fm-pipe-css";
  ss.textContent = `@keyframes fmDotBlink{0%,49%{background:#ef4444}50%,100%{background:#ff8a2a}}`;
  document.head.appendChild(ss);
}

export default function PipelineView() {
  const {
    myLeads, openPatient, dragItem, setDragItem, moveLead, handleDrop,
    getLeadScore, t, invoices, clinic, setView, activeClinicId,
  } = useApp();
  const { msgs, setSelChat } = useInboxStore();
  const depositRequired = clinic?.deposit_required !== false && clinic?.deposit_required !== "false";
  const depositBeforeAppt = clinic?.deposit_before_appointment !== false;
  const [showCancelled, setShowCancelled] = useState(false);
  const [pipeTab, setPipeTab] = useState("active");

  const goToChat = (leadId) => {
    const clinicId = activeClinicId || myLeads[0]?.clinic || null;
    const chat = (msgs[clinicId] || []).find(m => m.leadId === leadId || m.patientId === leadId);
    if (chat) setSelChat(chat);
    else setSelChat({ leadId, patientId: leadId });
    setView("inbox");
  };

  // Cancelled patients (separate from columns)
  const cancelledLeads = myLeads.filter(l => l.stage === "cancelled");

  // Archive: only cancelled/storniert patients
  const archivedLeads = myLeads.filter(l => l.stage === "cancelled" || l.metadata?.cancelled);

  return (
    <div style={{ padding: "20px 32px", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { id: "active", label: t("tab_active") || "Active" },
          { id: "archive", label: t("tab_archive") || "Archive" },
          { id: "files", label: t("tab_files") || "Files" },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setPipeTab(tab.id); window.dispatchEvent(new Event("fm:scroll-top")); }} style={{
            padding: "10px 20px", background: "transparent", border: "none",
            borderBottom: pipeTab === tab.id ? "2px solid #4cc9ff" : "2px solid transparent",
            color: pipeTab === tab.id ? "#4cc9ff" : "rgba(167,177,195,0.5)",
            fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            transition: "all .15s",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ═══ AKTIV TAB ═══ */}
      {pipeTab === "active" && <>
      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginBottom: 10 }}>
        {[
          { color: "#10b981", label: t("legend_ok") || "OK" },
          { color: "#ff8a2a", label: t("legend_process") || "Prozess" },
          { color: "#ef4444", label: t("legend_missing") || "Fehlt" },
          { color: "rgba(167,177,195,0.3)", label: t("legend_open") || "Offen" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
            <span style={{ fontSize: 10, color: "rgba(167,177,195,0.4)", fontWeight: 600 }}>{l.label}</span>
          </div>
        ))}
      </div>
      {/* Pipeline empty hint — live mode only */}
      {myLeads.filter(l => l.stage !== "cancelled").length === 0 && !isDemoMode() && (
        <div style={{padding:"8px 12px",borderRadius:10,background:"rgba(76,201,255,0.04)",border:"1px solid rgba(76,201,255,0.1)",color:"rgba(167,177,195,0.55)",fontSize:11,display:"flex",alignItems:"center",gap:8,marginBottom:12}}>{"ℹ️"} {t("hint_pipeline_empty_live")}</div>
      )}
      {/* 4-Column Kanban */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, flex: 1, minHeight: "calc(100vh - 140px)" }}>
        {PIPELINE_COLUMNS.map(col => {
          // Auto-promote: booked leads whose booking date is before today → show in "done"
          const effectiveStage = (l) => {
            if (l.stage === "booked") {
              const bd = l.booking?.date || l.metadata?.booking?.date || l.appointmentDate;
              if (bd && new Date(bd) < new Date(new Date().toISOString().slice(0, 10))) return "done";
            }
            return l.stage;
          };
          const items = myLeads.filter(l => effectiveStage(l) === col.id)
            .sort((a, b) => {
              // Handover patients always on top (most urgent)
              const aHO = a.convStatus === "human_takeover" ? 1 : 0;
              const bHO = b.convStatus === "human_takeover" ? 1 : 0;
              if (aHO !== bHO) return bHO - aHO;
              const tA = new Date(a.stageChangedAt || a.updatedAt || a.createdAt || 0).getTime();
              const tB = new Date(b.stageChangedAt || b.updatedAt || b.createdAt || 0).getTime();
              // Contacted: oldest first (waiting longest on top). Others: newest first
              return col.id === "contacted" ? tA - tB : tB - tA;
            });
          return (
            <div
              key={col.id}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
              style={{
                background: "rgba(255,255,255,0.02)",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.06)",
                borderTop: `3px solid ${col.accent}`,
                display: "flex", flexDirection: "column",
              }}
            >
              {/* Column header */}
              <div style={{
                padding: "14px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>
                  {t(col.labelKey) || t("stage_" + col.id) || col.label}
                </span>
                <span style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(167,177,195,0.7)",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 8,
                }}>{items.length}</span>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
                {items.length === 0 && (
                  <div style={{ padding: "24px 12px", textAlign: "center", color: "rgba(167,177,195,0.3)", fontSize: 12 }}>
                    {t("no_patients") || "Keine Patienten"}
                  </div>
                )}
                {items.map(lead => (
                  <PipelineCard
                    key={lead.id}
                    lead={lead}
                    col={col}
                    openPatient={openPatient}
                    setDragItem={setDragItem}
                    invoices={invoices}
                    getLeadScore={getLeadScore}
                    depositRequired={depositRequired}
                    depositBeforeAppt={depositBeforeAppt}
                    goToChat={goToChat}
                    t={t}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      </>}

      {/* ═══ ARCHIV TAB ═══ */}
      {pipeTab === "archive" && (
        <div>
          {archivedLeads.length === 0 ? (
            <div style={{ padding: "60px 40px", textAlign: "center", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>📋</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(232,238,252,0.6)", marginBottom: 6 }}>{t("archive_empty_title")}</div>
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.35)" }}>{t("archive_empty_desc")}</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {archivedLeads.map(lead => (
                <div key={lead.id} onClick={() => openPatient(lead.id)} style={{
                  padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  background: lead.stage === "done" ? "rgba(16,185,129,0.03)" : "rgba(239,68,68,0.03)",
                  border: `1px solid ${lead.stage === "done" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: lead.stage === "done" ? "#10b981" : "#ef4444" }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(232,238,252,0.85)" }}>{lead.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)" }}>{lead.treatment || "—"}</div>
                  <div style={{ fontSize: 10, color: "rgba(167,177,195,0.25)", marginTop: 4 }}>
                    {lead.stage === "done" ? ("✓ " + (t("stage_completed") || "Completed")) : ("✕ " + (t("badge_cancelled") || "Cancelled"))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ DATEIEN TAB ═══ */}
      {pipeTab === "files" && (
        <div style={{ padding: "60px 40px", textAlign: "center", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>📁</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(232,238,252,0.6)", marginBottom: 6 }}>{t("files_empty_title")}</div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.35)" }}>{t("files_empty_desc")}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual patient card inside a pipeline column.
 * Neutral design with revenue display.
 */
function PipelineCard({ lead, col, openPatient, setDragItem, invoices, getLeadScore, t, depositRequired, depositBeforeAppt, goToChat }) {
  // Conversation status badge map (computed but used for reference)
  const _convMap = {
    ai_active: { color: "rgba(167,177,195,0.5)", icon: "BOT" },
    human_takeover: { color: "#ef4444", icon: "!" },
    needs_medical_review: { color: "#f59e0b", icon: "MR" },
    waiting_for_clinic_reply: { color: "#f59e0b", icon: "..." },
    deposit_paid: { color: "#10b981", icon: "$" },
  };

  // Lead score
  const scoreData = typeof getLeadScore === 'function' ? getLeadScore(lead) : null;

  // Revenue from lead data
  const revenue = lead.financials?.totalPrice || lead.revenue || lead.price || null;

  // Hot lead indicator
  const isHotLead = (typeof revenue === "number" && revenue > 4000) ||
    (scoreData && scoreData.score > 80);

  // Aging indicator — how long in current stage
  const agingDate = lead.stageChangedAt || lead.updatedAt || lead.createdAt;
  const agingText = (() => {
    if (!agingDate) return null;
    const diff = getNowMs() - new Date(agingDate).getTime();
    const hrs = diff / 3600000;
    if (hrs < 1) return "< 1h";
    if (hrs < 24) return `${Math.floor(hrs)}h`;
    const days = hrs / 24;
    if (days < 7) return `${Math.floor(days)}d`;
    return `${Math.floor(days / 7)}w`;
  })();

  const agingColor = (() => {
    if (!agingDate) return "rgba(167,177,195,0.3)";
    const diff = getNowMs() - new Date(agingDate).getTime();
    const days = diff / 86400000;
    if (days > 7) return "#ef4444";
    if (days > 3) return "#ff8a2a";
    return "rgba(167,177,195,0.3)";
  })();

  // Local patient — no transfer needed
  const isLocal = !!(lead.metadata?.noTransferNeeded || lead.metadata?.noFlightNeeded);

  // Operational status badges — multiple can show
  const bs = {
    red: { background: "rgba(239,68,68,0.12)", color: "#ef4444" },
    orange: { background: "rgba(245,158,11,0.12)", color: "#f59e0b" },
    purple: { background: "rgba(167,139,250,0.12)", color: "#a78bfa" },
    pink: { background: "rgba(236,72,153,0.12)", color: "#ec4899" },
    blue: { background: "rgba(76,201,255,0.12)", color: "#4cc9ff" },
    green: { background: "rgba(16,185,129,0.12)", color: "#10b981" },
  };
  const opBadges = [];
  if (lead.convStatus === "human_takeover")
    opBadges.push({ label: t("help_needed"), ...bs.red });
  if (lead.convStatus === "needs_medical_review" || lead.convStatus === "waiting_for_clinic_reply")
    opBadges.push({ label: t("review_label"), ...bs.orange });
  if (isLocal)
    opBadges.push({ label: t("local_patient"), ...bs.green });
  if ((lead.stage === "booked" || lead.stage === "done") && !isLocal && !(lead.flightConfirmed && lead.flightConfirmed.date))
    opBadges.push({ label: t("flight_missing_badge") || "Flug fehlt", background: LOGISTICS_COLORS.flight_missing.bg, color: LOGISTICS_COLORS.flight_missing.color });
  if ((lead.stage === "booked" || lead.stage === "done") && !isLocal && !(lead.logistics && lead.logistics.driverName))
    opBadges.push({ label: t("driver_missing") || "Fahrer fehlt", background: LOGISTICS_COLORS.driver_missing.bg, color: LOGISTICS_COLORS.driver_missing.color });
  if ((lead.stage === "booked" || lead.stage === "done") && !isLocal && !(lead.hotelInfo?.name || lead.hotel?.name))
    opBadges.push({ label: t("hotel_missing") || "Hotel fehlt", background: LOGISTICS_COLORS.hotel_missing.bg, color: LOGISTICS_COLORS.hotel_missing.color });
  if (lead.metadata?.depositPending)
    opBadges.push({ label: t("step_deposit") || "Anzahlung", background: "rgba(234,179,8,0.12)", color: "#eab308" });
  else if (opBadges.length === 0 && (lead.convStatus === "deposit_paid" || (lead.financials && lead.financials.depositStatus === "paid")))
    opBadges.push({ label: t("paid_label"), ...bs.green });
  if (opBadges.length === 0 && lead.convStatus === "collecting_photos")
    opBadges.push({ label: t("collecting_photos") || "Collecting photos", background: "rgba(76,201,255,0.12)", color: "#4cc9ff" });
  if (opBadges.length === 0 && lead._hasFutureAppt && lead.stage === "contacted")
    opBadges.push({ label: t("appt_reserved") || "Appointment reserved", background: "rgba(76,201,255,0.12)", color: "#4cc9ff" });
  if (opBadges.length === 0 && lead.stage === "contacted" && (lead.photoUrls||[]).length > 0 && !lead.reviewData)
    opBadges.push({ label: t("photos_received_badge"), background: "rgba(76,201,255,0.12)", color: "#4cc9ff" });
  if (opBadges.length === 0 && lead.stage === "new")
    opBadges.push({ label: t("ai_active_label") || "KI Aktiv", ...bs.blue });
  if (opBadges.length === 0 && lead.convStatus === "ai_active" && lead.stage === "contacted")
    opBadges.push({ label: t("in_progress_badge"), background: "rgba(76,201,255,0.12)", color: "#4cc9ff" });
  const opBadge = opBadges[0] || null;

  // Grafts info
  const grafts = lead.grafts || lead.graftCount || null;

  return (
    <div
      data-patient-id={lead.id}
      draggable
      onDragStart={() => setDragItem(lead.id)}
      onClick={() => openPatient(lead.id)}
      style={{
        padding: 12,
        borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      {/* Top row: Avatar + Name + Revenue + Hot indicator */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 4,
      }}>
        {lead.metadata?.avatar ? (
          <img src={lead.metadata.avatar} alt={lead.name} style={{width:22,height:22,borderRadius:6,objectFit:"cover",flexShrink:0}} />
        ) : (
          <div style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            background: getAvatarGradient(lead.name),
            color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 8, fontWeight: 800, letterSpacing: -0.5,
          }}>
            {getInitials(lead.name)}
          </div>
        )}
        <span style={{ fontWeight: 700, fontSize: 13, color: "#fff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead.name}
        </span>
        {scoreData && (
          <span style={{ fontSize: 10, flexShrink: 0 }} title={`Lead Score: ${scoreData.score}%`}>
            {scoreData.icon}
          </span>
        )}
        {lead.convStatus === "human_takeover" && (
          <span
            title={t("open_chat") || "Chat öffnen"}
            onClick={e => { e.stopPropagation(); goToChat(lead.id); }}
            style={{
              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
              background: "rgba(239,68,68,0.12)", color: "#ef4444",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, cursor: "pointer",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
          >
            {"\u{1F4AC}"}
          </span>
        )}
      </div>

      {/* Second row: Treatment + Grafts (only if reviewed) */}
      {lead.reviewData && (
        <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginBottom: 2, paddingLeft: 30 }}>
          {lead.treatment}{grafts ? ` · ${grafts} ${t("grafts_label")}` : ""}
        </div>
      )}

      {/* Third row: Country */}
      <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginBottom: 6, paddingLeft: 30 }}>
        {translateValue(lead.country) || ""}
      </div>

      {/* Op badge (left) + Aging (right) */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingLeft: 30,
      }}>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {opBadges.map((b, bi) => (
            <span key={bi} style={{
              fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
              background: b.background, color: b.color,
            }}>
              {b.label}
            </span>
          ))}
        </div>
        {agingText && (
          <span style={{ fontSize: 10, fontWeight: 600, color: agingColor }}>
            {agingText}
          </span>
        )}
      </div>

      {/* Patient journey dots — progressive green, local patients skip transfer steps */}
      <div style={{ display: "flex", gap: 3, paddingLeft: 30, marginTop: 4 }}>
        {(() => {
          const baseSteps = [
            { done: true, t: t("step_inquiry") || "Anfrage" },
            { done: (lead.photoUrls || []).length >= 3 || lead.photos, t: t("step_photos") || "Fotos" },
            { done: !!lead.reviewData, t: t("step_review") || "Bewertung" },
          ];
          if (depositRequired && depositBeforeAppt) {
            baseSteps.push({ done: (lead.convStatus === "deposit_paid" || !!lead.depositPaid || lead.stage === "booked" || lead.stage === "done") && !lead.metadata?.depositPending, t: t("step_deposit") || "Anzahlung" });
          }
          baseSteps.push({ done: lead.stage === "booked" || lead.stage === "done", t: t("step_booked") || "Gebucht" });
          if (depositRequired && !depositBeforeAppt) {
            baseSteps.push({ done: (lead.convStatus === "deposit_paid" || !!lead.depositPaid || lead.stage === "done") && !lead.metadata?.depositPending, t: t("step_deposit") || "Anzahlung" });
          }
          // Transfer steps — skip for local patients
          if (!isLocal) {
            baseSteps.push(
              { done: !!(lead.flightConfirmed && lead.flightConfirmed.date) || !!(lead.metadata && lead.metadata.noFlightNeeded), t: t("step_flight") || "Flug" },
              { done: !!(lead.logistics?.driverName), t: t("driver") || "Fahrer" },
              { done: !!(lead.hotelInfo?.name || lead.hotel?.name), t: t("hotel") || "Hotel" },
            );
          }
          const steps = baseSteps;
          const allDone = lead.stage === "done";
          const firstNotDone = allDone ? -1 : steps.findIndex(s => !s.done);
          // Find the furthest completed step index
          let furthestDone = -1;
          for (let i = steps.length - 1; i >= 0; i--) { if (steps[i].done) { furthestDone = i; break; } }
          const isHandover = lead.convStatus === "human_takeover";
          return steps.map((s, i) => {
            let color;
            const isReviewStep = s.t.includes("Bewertung") || s.t.includes("Review") || s.t.includes("İnceleme");
            // Blink red↔orange when handover active on the current step the patient is stuck at
            const shouldBlink = isHandover && !s.done && i === firstNotDone;
            if (allDone) {
              color = "#10b981";
            } else if (s.done) {
              color = "#10b981";
            } else if (i <= furthestDone) {
              color = isHandover ? "#ef4444" : "#ff8a2a";
            } else if (i === firstNotDone) {
              color = isHandover ? "#ef4444" : "#ff8a2a";
            } else {
              color = "rgba(167,177,195,0.2)";
            }
            return (
              <div key={i} title={s.t} style={{
                width: 7, height: 7, borderRadius: 99, flexShrink: 0,
                background: color,
                ...(shouldBlink ? { animation: "fmDotBlink 1.2s ease-in-out infinite" } : {}),
              }} />
            );
          });
        })()}
      </div>
    </div>
  );
}
