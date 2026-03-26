import { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";
import { translateValue } from "../../utils/helpers";

const _tRb = (k) => ({ de: { urgent: "Dringend", normal: "Normal", scheduled: "Geplant" }, en: { urgent: "Urgent", normal: "Normal", scheduled: "Scheduled" }, tr: { urgent: "Acil", normal: "Normal", scheduled: "Planlanmış" } }[localStorage.getItem("fm_lang") || "de"]?.[k] || k);
const URGENCY = {
  high: { label: _tRb("urgent"), color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  normal: { label: _tRb("normal"), color: "#f59e0b", bg: "rgba(245,158,11,0.06)" },
  low: { label: _tRb("scheduled"), color: "#4cc9ff", bg: "rgba(76,201,255,0.04)" },
};

function timeWaiting(ts) {
  if (!ts) return "—";
  const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000);
  if (h < 1) return "< 1h";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function getUrgency(lead) {
  const hours = lead.lastAiInteraction ? (Date.now() - new Date(lead.lastAiInteraction).getTime()) / 3600000 : 0;
  if (hours > 48) return "high";
  if (hours > 12) return "normal";
  return "low";
}

export default function ReviewBoard() {
  const { myLeads, openPatient, showT, clinic, setLeads, user, t } = useApp();
  const [doctors, setDoctors] = useState([]);
  const [claimedCases, setClaimedCases] = useState({});
  const [sortBy, setSortBy] = useState("waiting"); // waiting | urgency | newest
  const [filterTechnique, setFilterTechnique] = useState("all");

  // Load doctors
  useEffect(() => {
    fmApi.getDoctors().then(d => setDoctors(d || [])).catch(() => {});
  }, []);

  // Current doctor (if logged in as doctor)
  const currentDoctor = useMemo(() => {
    if (!user) return null;
    return doctors.find(d =>
      d.email === user.email || d.name === user.name ||
      `${d.first_name} ${d.last_name}`.trim() === user.name
    );
  }, [doctors, user]);

  // Cases needing review — filter by doctor's allowed treatments
  const reviewCases = useMemo(() => {
    let cases = myLeads.filter(l => l.convStatus === "needs_medical_review");

    // Route by technique: only show cases matching doctor's specialization
    if (currentDoctor && currentDoctor.treatment_types_allowed && currentDoctor.treatment_types_allowed.length > 0) {
      cases = cases.filter(l => {
        const patTreat = (l.treatment || "").toLowerCase();
        // Show if doctor's allowed types include patient's treatment, or if no treatment specified
        if (!patTreat) return true;
        return currentDoctor.treatment_types_allowed.some(t => patTreat.includes(t.toLowerCase()));
      });
    }

    // Filter by technique UI
    if (filterTechnique !== "all") {
      cases = cases.filter(l => (l.treatment || "").toLowerCase().includes(filterTechnique.toLowerCase()));
    }

    // Sort
    cases.sort((a, b) => {
      if (sortBy === "urgency") {
        const ua = getUrgency(a), ub = getUrgency(b);
        const order = { high: 0, normal: 1, low: 2 };
        return (order[ua] || 2) - (order[ub] || 2);
      }
      if (sortBy === "newest") {
        return new Date(b.lastAiInteraction || b.createdAt || 0) - new Date(a.lastAiInteraction || a.createdAt || 0);
      }
      // Default: longest waiting first
      return new Date(a.lastAiInteraction || a.createdAt || 0) - new Date(b.lastAiInteraction || b.createdAt || 0);
    });

    return cases;
  }, [myLeads, currentDoctor, filterTechnique, sortBy]);

  // Claim a case (5 min lock)
  const claimCase = useCallback(async (leadId) => {
    // Check if already claimed by someone else
    if (claimedCases[leadId] && claimedCases[leadId].by !== user?.name && Date.now() - claimedCases[leadId].at < 300000) {
      showT(`${t("case_in_progress_by") || "Fall wird gerade bearbeitet von"} ${claimedCases[leadId].by}`);
      return;
    }
    // Claim it
    setClaimedCases(prev => ({ ...prev, [leadId]: { by: user?.name || (t("doctor") || "Arzt"), at: Date.now() } }));
    // Auto-assign to this doctor
    const docName = currentDoctor ? `${currentDoctor.first_name} ${currentDoctor.last_name}`.trim() : user?.name;
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, reviewAssignedTo: docName } : l));
    fmApi.updatePatient(leadId, { reviewAssignedTo: docName }).catch(() => {});
    showT(t("case_claimed_toast") || "Fall übernommen — Bewertung starten");
    // Open patient profile
    openPatient(leadId);
  }, [claimedCases, user, currentDoctor, setLeads, openPatient, showT]);

  // Unique techniques from cases
  const techniques = useMemo(() => {
    const set = new Set();
    reviewCases.forEach(l => { if (l.treatment) set.add(l.treatment); });
    return [...set].sort();
  }, [reviewCases]);

  return (
    <div style={{ padding: "24px 28px", }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.03em", color: "rgba(232,238,252,0.95)" }}>
            {t("medical_review_board") || "Medical Review Board"}
          </h1>
          <p style={{ fontSize: 12, color: "rgba(167,177,195,0.45)", margin: 0 }}>
            {reviewCases.length} {reviewCases.length === 1 ? (t("case_singular")||"Fall") : (t("cases_plural")||"Fälle")} {t("cases_awaiting_review") || "warten auf ärztliche Bewertung"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
            padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.6)",
          }}>
            <option value="waiting">{t("longest_wait") || "Längste Wartezeit"}</option>
            <option value="urgency">{t("urgency_sort") || "Dringlichkeit"}</option>
            <option value="newest">{t("newest_first") || "Neueste zuerst"}</option>
          </select>
          {/* Technique filter */}
          {techniques.length > 1 && (
            <select value={filterTechnique} onChange={e => setFilterTechnique(e.target.value)} style={{
              padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.6)",
            }}>
              <option value="all">{t("all_treatments_filter") || "Alle Behandlungen"}</option>
              {techniques.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {Object.entries(URGENCY).map(([key, u]) => {
          const count = reviewCases.filter(l => getUrgency(l) === key).length;
          return (
            <div key={key} style={{
              padding: "8px 16px", borderRadius: 8, flex: 1,
              background: u.bg, border: `1px solid ${u.color}15`,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: u.color }}>{count}</span>
              <span style={{ fontSize: 11, color: "rgba(167,177,195,0.45)", fontWeight: 600 }}>{u.label}</span>
            </div>
          );
        })}
      </div>

      {/* Case cards */}
      {reviewCases.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 14, background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.08)" }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#10b981" }}>{t("no_open_reviews") || "Keine offenen Bewertungen"}</div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.35)", marginTop: 4 }}>{t("all_cases_reviewed") || "Alle Fälle wurden bewertet"}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {reviewCases.map(lead => {
            const urgency = getUrgency(lead);
            const u = URGENCY[urgency];
            const claimed = claimedCases[lead.id];
            const isClaimedByOther = claimed && claimed.by !== user?.name && Date.now() - claimed.at < 300000;
            const isClaimedByMe = claimed && claimed.by === user?.name;
            const photos = lead.photoUrls || [];

            return (
              <div key={lead.id} style={{
                padding: 16, borderRadius: 12,
                background: isClaimedByMe ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${isClaimedByMe ? "rgba(16,185,129,0.15)" : isClaimedByOther ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)"}`,
                opacity: isClaimedByOther ? 0.5 : 1,
              }}>
                {/* Header: urgency + waiting time */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                    background: u.bg, color: u.color, border: `1px solid ${u.color}20`,
                  }}>{u.label}</span>
                  <span style={{ fontSize: 10, color: "rgba(167,177,195,0.35)", fontWeight: 600 }}>
                    {t("review_waiting") || "Wartet"}: {timeWaiting(lead.lastAiInteraction || lead.createdAt)}
                  </span>
                </div>

                {/* Patient info */}
                <div style={{ fontWeight: 700, fontSize: 15, color: "rgba(232,238,252,0.9)", marginBottom: 2 }}>{lead.name}</div>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.45)", marginBottom: 8 }}>
                  {lead.treatment || "—"}{lead.country ? ` · ${translateValue(lead.country)}` : ""}{lead.intake?.age ? ` · ${lead.intake.age} ${t("age_years") || "Jahre"}` : ""}
                </div>

                {/* Photos preview */}
                {photos.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                    {photos.slice(0, 4).map((p, i) => {
                      const url = typeof p === "string" ? p : p?.url;
                      return (
                        <div key={i} style={{
                          width: 52, height: 52, borderRadius: 6, overflow: "hidden",
                          background: "rgba(167,177,195,0.08)", border: "1px solid rgba(255,255,255,0.06)",
                        }}>
                          {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> :
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📷</div>}
                        </div>
                      );
                    })}
                    {photos.length > 4 && <span style={{ fontSize: 10, color: "rgba(167,177,195,0.3)", alignSelf: "center" }}>+{photos.length - 4}</span>}
                  </div>
                )}

                {/* Claimed status */}
                {isClaimedByOther && (
                  <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 600, marginBottom: 8 }}>
                    {t("being_worked_by") || "Wird bearbeitet von"} {claimed.by}
                  </div>
                )}
                {lead.reviewAssignedTo && !isClaimedByMe && (
                  <div style={{ fontSize: 10, color: "#10b981", fontWeight: 600, marginBottom: 8 }}>
                    {t("assigned_to_prefix") || "Zugewiesen:"} {lead.reviewAssignedTo}
                  </div>
                )}

                {/* Action button */}
                <button onClick={() => claimCase(lead.id)} disabled={isClaimedByOther} style={{
                  width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: isClaimedByOther ? "default" : "pointer", fontFamily: "inherit",
                  background: isClaimedByOther ? "rgba(255,255,255,0.02)" : isClaimedByMe ? "rgba(16,185,129,0.08)" : "rgba(76,201,255,0.06)",
                  border: `1px solid ${isClaimedByOther ? "rgba(255,255,255,0.04)" : isClaimedByMe ? "rgba(16,185,129,0.15)" : "rgba(76,201,255,0.12)"}`,
                  color: isClaimedByOther ? "rgba(167,177,195,0.3)" : isClaimedByMe ? "#10b981" : "#4cc9ff",
                }}>
                  {isClaimedByMe ? (t("review_continue") || "✓ Bewertung fortsetzen") : isClaimedByOther ? (t("review_locked") || "Gesperrt") : (t("review_start") || "Bewertung starten")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
