import { useState, useCallback, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Btn, Stat, IC, Field, Section, Toggle, getAvatarGradient, getInitials } from "../shared/index";
import { timeAgo, translateValue, fmLocale } from "../../utils/helpers";
import { CONV_STATUS, APPT_C, TL, MSG_TEMPLATES, DRIVER_STATUS } from "../../data/constants";
import TreatmentPlanBuilder from "./TreatmentPlanBuilder";
import { useInboxStore } from "../../stores";
import { authPhotoUrl } from "../../api/client";

function PhotoLightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx || 0);
  const photo = photos[idx];
  if (!photo) return null;
  const url = typeof photo === 'string' ? photo : photo.url;
  if (!url) return null;
  return <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
    <img src={authPhotoUrl(url)} alt="Patient photo" style={{maxWidth:"90vw",maxHeight:"90vh",borderRadius:12,boxShadow:"0 8px 40px rgba(0,0,0,0.5)"}} onClick={e=>e.stopPropagation()}/>
    {photos.length>1&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",bottom:30,display:"flex",gap:12,alignItems:"center"}}>
      <button onClick={()=>setIdx(p=>(p-1+photos.length)%photos.length)} style={{width:40,height:40,borderRadius:20,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",fontSize:18,cursor:"pointer",fontFamily:"inherit"}}>&#8592;</button>
      <span style={{color:"#fff",fontSize:14,fontWeight:600}}>{idx+1} / {photos.length}</span>
      <button onClick={()=>setIdx(p=>(p+1)%photos.length)} style={{width:40,height:40,borderRadius:20,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",fontSize:18,cursor:"pointer",fontFamily:"inherit"}}>&#8594;</button>
    </div>}
    <button onClick={onClose} style={{position:"absolute",top:20,right:20,width:40,height:40,borderRadius:20,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",fontSize:20,cursor:"pointer",fontFamily:"inherit"}}>&#10005;</button>
  </div>;
}

/* ── Accordion Section Component ── */
function Accordion({ icon, title, defaultOpen = false, children, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 10, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", transition: "all .2s ease" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "14px 16px", background: "transparent", border: "none",
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "inherit",
          color: "#e2e8f0", transition: "background .15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 800, flex: 1, textAlign: "left" }}>{title}</span>
        {badge && badge}
        <span style={{ fontSize: 12, color: "rgba(167,177,195,0.6)", transition: "transform .2s", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>&#9662;</span>
      </button>
      <div style={{
        maxHeight: open ? 2000 : 0,
        overflow: "hidden",
        transition: "max-height .3s ease",
      }}>
        <div style={{ padding: "0 16px 16px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Field display helpers ── */
const fieldLabelStyle = { fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", marginBottom: 2 };
const fieldValueStyle = { fontSize: 13, color: "#e2e8f0", fontWeight: 500 };
const mutedValueStyle = { fontSize: 13, color: "rgba(167,177,195,0.65)", fontWeight: 500 };
const flaggedValueStyle = { fontSize: 13, color: "#ef4444", fontWeight: 600 };

function DataField({ label, value, flagged }) {
  const hasValue = value != null && value !== "" && value !== undefined;
  const display = hasValue ? String(value) : "—";
  return (
    <div>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={flagged ? flaggedValueStyle : hasValue ? fieldValueStyle : mutedValueStyle}>{display}</div>
    </div>
  );
}

function isFlagged(key, val) {
  if (val == null || val === "") return false;
  const v = String(val).toLowerCase();
  if (key === "diabetes" && v !== "no" && v !== "none" && v !== "nein" && v !== "false") return true;
  if (key === "blood_thinners" && v !== "no" && v !== "none" && v !== "nein" && v !== "false") return true;
  if (key === "allergies" && v !== "no" && v !== "none" && v !== "nein" && v !== "keine") return true;
  if (key === "medical_conditions" && v !== "no" && v !== "none" && v !== "nein" && v !== "keine") return true;
  return false;
}

function formatBool(v) {
  const l = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
  if (v === true) return { de: "Ja", en: "Yes", tr: "Evet" }[l] || "Yes";
  if (v === false) return { de: "Nein", en: "No", tr: "Hayır" }[l] || "No";
  return v;
}

// Translate known timeline event texts to CRM display language
function translateTimeline(text) {
  if (!text) return text;
  const l = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
  const map = {
    "Neue Anfrage ueber WhatsApp erhalten": { en: "New inquiry received via WhatsApp", tr: "WhatsApp üzerinden yeni talep alındı" },
    "Neue Anfrage über WhatsApp erhalten": { en: "New inquiry received via WhatsApp", tr: "WhatsApp üzerinden yeni talep alındı" },
    "KI-Bot hat Gespraech gestartet": { en: "AI bot started conversation", tr: "AI bot görüşmeyi başlattı" },
    "KI-Bot hat Gespräch gestartet": { en: "AI bot started conversation", tr: "AI bot görüşmeyi başlattı" },
    "Alter und Land erfasst": { en: "Age and country recorded", tr: "Yaş ve ülke kaydedildi" },
    "Behandlungsinteresse erfasst": { en: "Treatment interest recorded", tr: "Tedavi ilgisi kaydedildi" },
    "Intake abgeschlossen": { en: "Intake completed", tr: "Kayıt tamamlandı" },
    "DSGVO-Einwilligung erteilt": { en: "GDPR consent granted", tr: "KVKK onayı verildi" },
    "Fotos angefordert": { en: "Photos requested", tr: "Fotoğraflar istendi" },
    "3 Fotos per WhatsApp erhalten": { en: "3 photos received via WhatsApp", tr: "WhatsApp ile 3 fotoğraf alındı" },
    "4 Fotos per WhatsApp erhalten": { en: "4 photos received via WhatsApp", tr: "WhatsApp ile 4 fotoğraf alındı" },
    "Fotos bestaetigt — Danke gesendet": { en: "Photos confirmed — thank you sent", tr: "Fotoğraflar onaylandı — teşekkür gönderildi" },
    "Fotos bestätigt — Danke gesendet": { en: "Photos confirmed — thank you sent", tr: "Fotoğraflar onaylandı — teşekkür gönderildi" },
    "Wartet auf aerztliche Bewertung": { en: "Waiting for medical review", tr: "Tıbbi değerlendirme bekleniyor" },
    "Wartet auf ärztliche Bewertung": { en: "Waiting for medical review", tr: "Tıbbi değerlendirme bekleniyor" },
    "Ärztliche Bewertung abgeschlossen": { en: "Medical review completed", tr: "Tıbbi değerlendirme tamamlandı" },
    "Aerztliche Bewertung abgeschlossen": { en: "Medical review completed", tr: "Tıbbi değerlendirme tamamlandı" },
    "Behandlungsplan gesendet": { en: "Treatment plan sent", tr: "Tedavi planı gönderildi" },
    "Angebot gesendet": { en: "Offer sent", tr: "Teklif gönderildi" },
    "Termin gebucht": { en: "Appointment booked", tr: "Randevu rezerve edildi" },
    "Anzahlung erhalten": { en: "Deposit received", tr: "Depozito alındı" },
    "Anzahlung bezahlt": { en: "Deposit paid", tr: "Depozito ödendi" },
    "Flugdaten erhalten": { en: "Flight data received", tr: "Uçuş bilgileri alındı" },
    "Flugticket erkannt": { en: "Flight ticket detected", tr: "Uçuş bileti algılandı" },
    "Fahrer zugewiesen": { en: "Driver assigned", tr: "Şoför atandı" },
    "Hotel gebucht": { en: "Hotel booked", tr: "Otel rezerve edildi" },
    "Behandlung abgeschlossen": { en: "Treatment completed", tr: "Tedavi tamamlandı" },
    "Nachsorge gesendet": { en: "Aftercare sent", tr: "Bakım bilgileri gönderildi" },
    "Bewertung angefordert": { en: "Review requested", tr: "Değerlendirme istendi" },
    "Patient hat geantwortet": { en: "Patient replied", tr: "Hasta yanıtladı" },
    "KI übernimmt": { en: "AI takes over", tr: "AI devraldı" },
    "Manuell übernommen": { en: "Manually taken over", tr: "Manuel olarak devralındı" },
    "KI fortgesetzt": { en: "AI resumed", tr: "AI devam etti" },
    "Konversation geschlossen": { en: "Conversation closed", tr: "Görüşme kapatıldı" },
    "booking_pending": { de: "Buchung ausstehend", en: "Booking pending", tr: "Rezervasyon bekliyor" },
    "AWAITING_DEPOSIT": { de: "Warten auf Anzahlung", en: "Awaiting deposit", tr: "Depozito bekleniyor" },
    "ai_active": { de: "KI aktiv", en: "AI active", tr: "AI aktif" },
    "WELCOME_SENT": { de: "Begrüßung gesendet", en: "Welcome sent", tr: "Hoş geldin gönderildi" },
    "WELCOME": { de: "Willkommen", en: "Welcome", tr: "Hoş geldin" },
    "GDPR_REQUESTED": { de: "DSGVO-Einwilligung angefragt", en: "GDPR consent requested", tr: "KVKK onayı istendi" },
    "INTAKE_STARTED": { de: "Aufnahme gestartet", en: "Intake started", tr: "Kayıt başladı" },
    "INTAKE_COMPLETE": { de: "Aufnahme abgeschlossen", en: "Intake complete", tr: "Kayıt tamamlandı" },
    "PHOTOS_REQUESTED": { de: "Fotos angefordert", en: "Photos requested", tr: "Fotoğraflar istendi" },
    "PHOTOS_RECEIVED": { de: "Fotos erhalten", en: "Photos received", tr: "Fotoğraflar alındı" },
    "REVIEW_PENDING": { de: "Wartet auf ärztliche Bewertung", en: "Waiting for medical review", tr: "Tıbbi değerlendirme bekleniyor" },
    "QUOTE_READY": { de: "Angebot bereit", en: "Quote ready", tr: "Teklif hazır" },
    "OFFER_SENT": { de: "Angebot gesendet", en: "Offer sent", tr: "Teklif gönderildi" },
    "BOOKING_REQUESTED": { de: "Terminbuchung angefragt", en: "Booking requested", tr: "Rezervasyon talep edildi" },
    "BOOKING_CONFIRMED": { de: "Termin bestätigt", en: "Booking confirmed", tr: "Randevu onaylandı" },
    "BOOKING_COLLECT_DATE": { de: "Terminwunsch wird erfasst", en: "Collecting preferred date", tr: "Tercih edilen tarih alınıyor" },
    "needs_medical_review": { de: "Wartet auf ärztliche Bewertung", en: "Waiting for medical review", tr: "Tıbbi değerlendirme bekleniyor" },
    "deposit_paid": { de: "Anzahlung bezahlt", en: "Deposit paid", tr: "Depozito ödendi" },
    "human_takeover": { de: "Manuell übernommen", en: "Manual takeover", tr: "Manuel devralma" },
    "resolved": { de: "Abgeschlossen", en: "Resolved", tr: "Çözüldü" },
    "Flugdaten empfangen": { en: "Flight data received", tr: "Uçuş bilgileri alındı" },
    "Konversation wieder geöffnet": { en: "Conversation reopened", tr: "Görüşme yeniden açıldı" },
    "Uebergabe an Mitarbeiter": { en: "Handover to staff", tr: "Personele devredildi" },
    "Übergabe an Mitarbeiter": { en: "Handover to staff", tr: "Personele devredildi" },
    "Mitarbeiter hat Chat uebernommen": { en: "Staff took over chat", tr: "Personel sohbeti devraldı" },
    "Mitarbeiter hat Chat übernommen": { en: "Staff took over chat", tr: "Personel sohbeti devraldı" },
    "KI-Bot hat Gespraech gestartet (Willkommen)": { en: "AI bot started conversation (Welcome)", tr: "AI bot görüşmeyi başlattı (Hoş geldiniz)" },
    "Patient hat WhatsApp-Nachricht gesendet": { en: "Patient sent WhatsApp message", tr: "Hasta WhatsApp mesajı gönderdi" },
    "Foto erhalten": { en: "Photo received", tr: "Fotoğraf alındı" },
    "Alle Fotos erhalten": { en: "All photos received", tr: "Tüm fotoğraflar alındı" },
    "Bewertung gestartet": { en: "Review started", tr: "Değerlendirme başladı" },
    "Termin bestätigt": { en: "Appointment confirmed", tr: "Randevu onaylandı" },
    "Termin storniert": { en: "Appointment cancelled", tr: "Randevu iptal edildi" },
    "Follow-up gesendet": { en: "Follow-up sent", tr: "Takip mesajı gönderildi" },
    "Zahlung erhalten": { en: "Payment received", tr: "Ödeme alındı" },
    "Hotel zugewiesen": { en: "Hotel assigned", tr: "Otel atandı" },
    "Behandlungsplan erstellt und gesendet": { en: "Treatment plan created and sent", tr: "Tedavi planı oluşturuldu ve gönderildi" },
    "Kostenvoranschlag": { en: "Cost estimate", tr: "Maliyet tahmini" },
    "Anzahlung EUR": { en: "Deposit EUR", tr: "Depozito EUR" },
    "OP-Termin gebucht": { en: "Surgery appointment booked", tr: "Ameliyat randevusu rezerve edildi" },
    "Flug bestaetigt": { en: "Flight confirmed", tr: "Uçuş onaylandı" },
    "Flug bestätigt": { en: "Flight confirmed", tr: "Uçuş onaylandı" },
    "Hotel zugewiesen": { en: "Hotel assigned", tr: "Otel atandı" },
    "Transfer organisiert": { en: "Transfer organized", tr: "Transfer organize edildi" },
    "OP abgeschlossen": { en: "Surgery completed", tr: "Ameliyat tamamlandı" },
    "Nachsorge Tag 1 gesendet": { en: "Aftercare day 1 sent", tr: "1. gün bakım bilgisi gönderildi" },
    "Bewertungsanfrage gesendet": { en: "Review request sent", tr: "Değerlendirme talebi gönderildi" },
    "Patient hat Bewertung abgegeben": { en: "Patient submitted review", tr: "Hasta değerlendirme yaptı" },
    "Foto hochgeladen": { en: "Photo uploaded", tr: "Fotoğraf yüklendi" },
    "Dokumente hochgeladen": { en: "Documents uploaded", tr: "Belgeler yüklendi" },
    "Bluttest hochgeladen": { en: "Blood test uploaded", tr: "Kan testi yüklendi" },
    "Med. Freigabe erteilt": { en: "Medical clearance granted", tr: "Tıbbi onay verildi" },
    "Einwilligung erteilt": { en: "Consent granted", tr: "Onay verildi" },
    "Template gesendet": { en: "Template sent", tr: "Şablon gönderildi" },
    "Reactivation template sent": { en: "Reactivation template sent", tr: "Yeniden etkinleştirme şablonu gönderildi" },
  };
  // Internal state names → translate even for DE
  if (map[text]?.de) { if (l === "de") return map[text].de; return map[text][l] || map[text].de || text; }
  if (l === "de") return text;
  // Exact match
  if (map[text]) return map[text][l] || text;
  // Partial match for patterns with dynamic suffixes
  for (const [de, translations] of Object.entries(map)) {
    if (text.startsWith(de)) {
      const suffix = text.slice(de.length);
      return (translations[l] || de) + suffix;
    }
  }
  // Dynamic patterns with numbers: "Anzahlung EUR 800 eingegangen"
  const dynPatterns = [
    { re: /^Anzahlung (EUR|€)\s*([\d.,]+)\s*eingegangen$/, en: (m) => `Deposit ${m[1]} ${m[2]} received`, tr: (m) => `Depozito ${m[1]} ${m[2]} alındı` },
    { re: /^Kostenvoranschlag:\s*(.+)$/, en: (m) => `Cost estimate: ${m[1]}`, tr: (m) => `Maliyet tahmini: ${m[1]}` },
    { re: /^(\d+) Fotos? per WhatsApp erhalten$/, en: (m) => `${m[1]} photos received via WhatsApp`, tr: (m) => `WhatsApp ile ${m[1]} fotoğraf alındı` },
    { re: /^Fahrer (.+) zugewiesen$/, en: (m) => `Driver ${m[1]} assigned`, tr: (m) => `Şoför ${m[1]} atandı` },
    { re: /^Template sent: (.+)$/, en: (m) => `Template sent: ${m[1]}`, tr: (m) => `Şablon gönderildi: ${m[1]}` },
    { re: /^Reactivation template sent \((.+)\)$/, en: (m) => `Reactivation template sent (${m[1]})`, tr: (m) => `Yeniden etkinleştirme şablonu gönderildi (${m[1]})` },
    { re: /^Fotos angefordert \((.+)\)$/, en: (m) => `Photos requested (${m[1]})`, tr: (m) => `Fotoğraflar istendi (${m[1]})` },
  ];
  for (const p of dynPatterns) {
    const m = text.match(p.re);
    if (m && p[l]) return p[l](m);
  }
  return text;
}


export default function PatientPanel() {
  const {
    selLead, setSelLead, patientTab, setPatientTab, leads, setLeads, appts,
    clinic, activeClinicId, invoices, magicLinks, msgs, setMsgs, setView,
    reviewGrafts, setReviewGrafts, reviewPrice, setReviewPrice, reviewNotes, setReviewNotes,
    newNote, setNewNote, user, lang, t,
    getLeadById, getStageById, getClinicById, getLeadScore, getSLA, getAiSuggestions,
    flightAlerts, showT, logAction, addTL, moveLead, setConvStatus, openPatient, openPatientPhotos,
    sendTreatmentPlan, generatePDF, generateMagicLink, generateInvoicePDF, generateStripeLink,
    generateDepositLink, markInvoicePaid, sendPaymentLink, sendTemplateMsg, addInternalNote,
    setInvoiceModal, setInvAmount, setInvItems, setInvVat, setInvDeposit,
    setPayAmount, setPayCurrency, setPaymentModal, simulatePaymentReceived,
    assignDriver, notifyDriver, handleDriverResponse, escalateToBackup, handleBackupDriverResponse,
  } = useApp();
  const [selDriverId, setSelDriverId] = useState("");
  const [flightForm, setFlightForm] = useState(false);
  const [flightAirline, setFlightAirline] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [aftercareText, setAftercareText] = useState("");
  const [aftercareInit, setAftercareInit] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [depositWithPlan, setDepositWithPlan] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [selDoctorForReview, setSelDoctorForReview] = useState("");
  const [togglingBot, setTogglingBot] = useState(false);
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [detailTimeline, setDetailTimeline] = useState([]);
  const [detailNotes, setDetailNotes] = useState(null);
  const [gdprConfirm, setGdprConfirm] = useState(false);
  const [gdprDeleting, setGdprDeleting] = useState(false);
  useEffect(() => { import("../../api/client").then(m => m.getStaff()).then(r => setStaffList(r?.staff || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!selLead) return;
    import("../../api/client").then(m => m.getPatient(selLead)).then(r => {
      if (r?.timeline) {
        const MILESTONE_TYPES = ['state_changed', 'flow_state_changed', 'handover', 'appointment_booked_by_bot', 'appointment_cancelled_by_patient', 'automation:booking_confirm', 'automation:treatment_plan_sent', 'automation:flight_ticket_reminder', 'automation:appt_reminder', 'automation:aftercare', 'automation:review_request', 'flight_data_received', 'review_completed'];
        setDetailTimeline(r.timeline.filter(e => MILESTONE_TYPES.includes(e.type)).map(e => {
          let label = e.type;
          const d = e.details || {};
          const EVT = {
            state_changed: (to) => ({ appointment_booked: { icon: '\u{1F4C5}', label: t("tl_appointment_booked"), color: '#10b981' }, human_takeover: { icon: '\u{1F6A8}', label: t("tl_human_takeover"), color: '#ef4444' }, cancelled: { icon: '\u274C', label: t("tl_cancelled"), color: '#ef4444' }, booked: { icon: '\u{1F4C5}', label: t("tl_booked"), color: '#a78bfa' }, contacted: { icon: '\u{1F4AC}', label: t("tl_contacted"), color: '#fbbf24' }, done: { icon: '\u2705', label: t("tl_completed"), color: '#10b981' }, new: { icon: '\u2728', label: t("tl_new_lead"), color: '#4cc9ff' } })[to] || { icon: '\u26A1', label: to || '', color: '#6b7280' },
            flow_state_changed: (to) => ({ BOOKING_CONFIRMED: { icon: '\u2705', label: t("tl_booking_confirmed"), color: '#10b981' }, INTAKE: { icon: '\u{1F4CB}', label: t("tl_intake"), color: '#4cc9ff' }, PHOTOS: { icon: '\u{1F4F7}', label: t("tl_photos_received"), color: '#a78bfa' }, REVIEW: { icon: '\u2695\uFE0F', label: t("tl_review"), color: '#ff8a2a' }, BOOKED: { icon: '\u{1F4C5}', label: t("tl_booked"), color: '#a78bfa' }, CANCELLED: { icon: '\u274C', label: t("tl_cancelled"), color: '#ef4444' } })[to] || { icon: '\u26A1', label: to || '', color: '#6b7280' },
          };
          let icon = '\u2699\uFE0F', color = '#6b7280';
          if (e.type === 'state_changed') { const m = EVT.state_changed(d.to); label = m.label; icon = m.icon; color = m.color; }
          else if (e.type === 'flow_state_changed') { const m = EVT.flow_state_changed(d.to); label = m.label; icon = m.icon; color = m.color; }
          else if (e.type === 'handover') { label = t("tl_human_takeover"); icon = '\u{1F6A8}'; color = '#ef4444'; }
          else if (e.type === 'appointment_booked_by_bot') { label = t("tl_appointment_booked") + (d.date ? ' \u2014 ' + d.date : ''); icon = '\u{1F4C5}'; color = '#10b981'; }
          else if (e.type === 'appointment_cancelled_by_patient') { label = t("tl_appointment_cancelled"); icon = '\u274C'; color = '#ef4444'; }
          else if (e.type === 'automation:booking_confirm') { label = t("tl_booking_confirm_sent"); icon = '\u{1F4E8}'; color = '#10b981'; }
          else if (e.type === 'automation:treatment_plan_sent') { label = t("tl_treatment_plan_sent"); icon = '\u{1F4C4}'; color = '#a78bfa'; }
          else if (e.type === 'automation:flight_ticket_reminder') { label = t("tl_flight_ticket_reminder"); icon = '\u2708\uFE0F'; color = '#fbbf24'; }
          else if (e.type === 'automation:appt_reminder') { label = t("tl_appt_reminder"); icon = '\u{1F514}'; color = '#4cc9ff'; }
          else if (e.type === 'flight_data_received') { label = t("tl_flight_data_received"); icon = '\u2708\uFE0F'; color = '#10b981'; }
          else if (e.type === 'review_completed') { label = t("tl_review_completed"); icon = '\u2695\uFE0F'; color = '#10b981'; }
          else if (e.type === 'automation:aftercare') { label = t("tl_aftercare_sent"); icon = '\u{1FA79}'; color = '#10b981'; }
          else if (e.type === 'automation:review_request') { label = t("tl_review_requested"); icon = '\u2695\uFE0F'; color = '#ff8a2a'; }
          return { type: 'custom', text: label, time: e.createdAt, icon, color };
        }));
      }
      if (r?.internalNotes) setDetailNotes(r.internalNotes);
    }).catch(() => {});
  }, [selLead]);

  const lead=getLeadById(selLead);if(!lead)return null;const stage=getStageById(lead.stage)||{id:"unknown",label:"Unknown",color:"#6b7280",icon:"?"};const cs=CONV_STATUS[lead.convStatus]||(!lead.convStatus||lead.convStatus==="open"?null:{label:"Unknown",color:"#6b7280",icon:"?"});
  const needsReview=lead.convStatus==="needs_medical_review";
  // Pre-fill aftercare based on treatment type
  if(lead.stage==="done"&&!aftercareInit){
    setAftercareInit(true);
    if(lead.aftercareSent){setAftercareText(lead.aftercareText||"");}
    else{
      const trt=lead.treatment?.toLowerCase()||"";
      if(trt.includes("fue")||trt.includes("hair")||trt.includes("graft"))setAftercareText(t("aftercare_hair_transplant"));
      else if(trt.includes("beard"))setAftercareText(t("aftercare_beard_transplant"));
      else setAftercareText(t("aftercare_general"));
    }
  }
  const photoCount = (lead.photoUrls||[]).filter(u => { const url = typeof u === 'string' ? u : u?.url; return url && (url.startsWith('https://') || url.startsWith('http://')); }).length;
  const tabs=[{id:"timeline",label:t("tab_timeline")},{id:"invoices",label:t("tab_invoices")},{id:"appointments",label:t("tab_appointments")},{id:"photos",label:photoCount > 0 ? `${t("tab_photos")} (${photoCount})` : t("tab_photos")},{id:"notes",label:t("tab_notes")}];
  const leadAppts=appts.filter(a=>(a.leadId||a.patientId||a.patient_id)===lead.id);

  // Shared data
  const intake = lead.intake || {};
  const extracted = lead.extractedFields || {};
  const fields = { ...extracted, ...intake };
  const rd = lead.reviewData;
  const hotel = lead.hotelInfo || lead.hotel || {};
  const isBookedOrDone = lead.stage === "booked" || lead.stage === "done";
  const noFlightNeeded = lead.metadata?.noFlightNeeded;
  const noTransferNeeded = lead.metadata?.noTransferNeeded;
  const showTravel = isBookedOrDone && !noFlightNeeded && !noTransferNeeded;

  return<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex"}}><div onClick={()=>{setSelLead(null);setPatientTab("timeline");}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}}/>
    <div style={{position:"relative",marginLeft:"auto",width:"min(700px,90vw)",height:"100vh",background:"#131c2e",borderLeft:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",animation:"slI .25s ease",boxShadow:"-4px 0 12px rgba(0,0,0,0.2)"}}><style>{`@keyframes slI{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}`}</style>
      <div style={{padding:"20px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",gap:14}}>{lead.metadata?.avatar?<img src={lead.metadata.avatar} alt={lead.name} style={{width:48,height:48,borderRadius:14,objectFit:"cover",flexShrink:0}}/>:<div style={{width:48,height:48,borderRadius:14,background:getAvatarGradient(lead.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:800,color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,0.3)"}}>{getInitials(lead.name)}</div>}
          <div><div style={{fontWeight:800,fontSize:20}}>{lead.name}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.7)",marginTop:2}}>{lead.treatment}{lead.reviewData?.grafts?" · "+lead.reviewData.grafts:""}</div>
            <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
              <span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:`${stage.color}18`,color:stage.color}}>{t("stage_"+stage.id)||stage.label}</span>
              {(lead.convStatus==="deposit_paid"||invoices.filter(i=>i.leadId===lead.id&&i.status==="paid").length>0)?<span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:"rgba(16,185,129,0.12)",color:"#10b981"}}>✅ {t("deposit_received")||"Anzahlung erhalten"}</span>:(clinic?.depositPolicy&&clinic.depositPolicy!=="none"&&lead.reviewData&&lead.convStatus!=="resolved")?<button onClick={()=>{setConvStatus(lead.id,"deposit_paid");showT("Anzahlung als bezahlt markiert ✅");}} style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:"rgba(251,191,36,0.12)",color:"#fbbf24",cursor:"pointer",animation:"fmDepPulse 2s infinite",border:"1px solid rgba(251,191,36,0.3)",fontFamily:"inherit"}}>💳 {t("deposit_received")||"Anzahlung"} bestätigen</button>:null}
              <style>{`@keyframes fmDepPulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
              {lead.contacted&&<span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:"rgba(76,201,255,0.12)",color:"#4cc9ff"}}>{t("contacted_badge") || "Kontaktiert"}</span>}
              {lead.convStatus==="human_takeover"&&<span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:"rgba(239,68,68,0.12)",color:"#ef4444"}}>{t("human_takeover_badge_pp") || "Menschliche \u00DCbernahme"}</span>}
              {cs && cs.label !== "conv_medical_review" && lead.convStatus !== "deposit_paid" && <span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:`${cs.color}18`,color:cs.color}}>{cs.icon} {t(cs.label) || cs.label}</span>}
              {lead.locale&&lead.locale!=="en"&&<span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:"rgba(167,107,255,0.12)",color:"#a78bfa"}}>{lead.locale.toUpperCase()} {"\u2192"} {t("auto_translate") || "Auto-\u00DCbersetzung"}</span>}
              <span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:600,background:"rgba(255,255,255,0.05)",color:"rgba(167,177,195,0.7)"}}>{getClinicById(lead.clinic)?.name}</span></div></div></div>
        <button onClick={()=>{setSelLead(null);setPatientTab("timeline");}} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"rgba(167,177,195,0.7)",width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>&#10005;</button></div>

      {/* Patient Journey Progress Bar */}
      {(()=>{
        const isLocal=!!(lead.metadata?.noTransferNeeded||lead.metadata?.noFlightNeeded);
        const depositEnabled=clinic?.depositPolicy&&clinic.depositPolicy!=="none";
        const depositBefore=clinic?.deposit_before_appointment!==false;
        const steps=[
          {id:"inquiry",icon:"\u2709\uFE0F",label:t("step_inquiry"),done:true},
          {id:"photos",icon:"\uD83D\uDCF8",label:t("step_photos"),done:lead.photos||lead.photoUrls?.length>0},
          {id:"review",icon:"\uD83E\uDE7A",label:t("step_review"),done:!!lead.reviewData},
          ...(depositEnabled&&depositBefore?[{id:"deposit",icon:"💰",label:t("step_deposit"),done:(invoices.filter(i=>i.leadId===lead.id&&i.status==="paid").length>0||lead.convStatus==="deposit_paid"||lead.stage==="booked"||lead.stage==="done")&&!lead.metadata?.depositPending}]:[]),
          {id:"booking",icon:"\u2705",label:t("step_booked"),done:lead.stage==="booked"||lead.stage==="done"},
          ...(depositEnabled&&!depositBefore?[{id:"deposit",icon:"💰",label:t("step_deposit"),done:(invoices.filter(i=>i.leadId===lead.id&&i.status==="paid").length>0||lead.convStatus==="deposit_paid"||lead.stage==="done")&&!lead.metadata?.depositPending}]:[]),
          ...(!isLocal?[
            {id:"flight",icon:"✈️",label:t("step_flight"),done:!!lead.flightConfirmed?.date||!!(lead.metadata?.noFlightNeeded)},
            {id:"driver",icon:"\uD83D\uDE97",label:t("driver")||"Fahrer",done:!!lead.logistics?.driverName},
            {id:"hotel",icon:"\uD83C\uDFE8",label:t("hotel")||"Hotel",done:!!(lead.hotelInfo?.name||lead.hotel?.name)},
          ]:[]),
        ];
        const doneCount=steps.filter(s=>s.done).length;
        const pct=Math.round(doneCount/steps.length*100);
        return<div style={{padding:"12px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.6)",textTransform:"uppercase",letterSpacing:"0.1em"}}>{t("patient_journey")}</span>
            <span style={{fontSize:11,fontWeight:700,color:pct===100?"#10b981":"#4cc9ff"}}>{pct}%</span>
          </div>
          <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.06)",marginBottom:10,overflow:"hidden"}}>
            <div style={{height:3,borderRadius:2,background:pct===100?"#10b981":"linear-gradient(90deg,#4cc9ff,#00b4d8)",width:`${pct}%`,transition:"width .5s ease"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            {steps.map((s,i)=>{const pending=s.id==="deposit"&&!s.done&&lead.reviewData&&lead.convStatus!=="resolved";return<div key={s.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
              <div style={{width:28,height:28,borderRadius:8,background:s.done?"rgba(16,185,129,0.12)":pending?"rgba(251,191,36,0.12)":"rgba(255,255,255,0.04)",border:`1.5px solid ${s.done?"rgba(16,185,129,0.4)":pending?"rgba(251,191,36,0.5)":"rgba(255,255,255,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,transition:"all .3s",animation:pending?"fmDepPulse 2s infinite":"none"}}>{s.done?<span style={{color:"#10b981"}}>✓</span>:pending?<span style={{color:"#fbbf24"}}>💳</span>:<span style={{opacity:0.4}}>{s.icon}</span>}</div>
              <span style={{fontSize:9,fontWeight:700,color:s.done?"#10b981":pending?"#fbbf24":"rgba(167,177,195,0.75)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.label}</span>
              {i<steps.length-1&&<div style={{position:"absolute",top:14,left:"calc(100% + 2px)",width:20,height:1.5,background:steps[i+1]?.done?"rgba(16,185,129,0.3)":"rgba(255,255,255,0.06)"}}/>}
            </div>})}
          </div>
        </div>;
      })()}

      {/* Bot Control Banners */}
      {lead.controlMode==="human"&&lead.convStatus!=="resolved"&&lead.convStatus!=="closed"&&lead.convStatus!=="needs_medical_review"&&<div style={{padding:"10px 24px",background:"rgba(239,68,68,0.08)",borderBottom:"1px solid rgba(239,68,68,0.2)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>{"🤖"}</span><span style={{fontSize:13,fontWeight:700,color:"#ef4444"}}>{t("bot_paused")}</span><span style={{fontSize:12,color:"rgba(167,177,195,0.6)"}}>— {t("staff_took_over_conversation")}</span></div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{const {msgs:inboxMsgs,setSelChat}=useInboxStore.getState();const cId=activeClinicId||lead.clinic;const chat=(inboxMsgs[cId]||[]).find(m=>m.leadId===lead.id||m.patientId===lead.id);if(chat)setSelChat(chat);else setSelChat({leadId:lead.id,patientId:lead.id});setSelLead(null);setView("inbox");}} style={{padding:"5px 14px",borderRadius:8,background:"rgba(76,201,255,0.15)",border:"1px solid rgba(76,201,255,0.3)",color:"#4cc9ff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("open_chat") || "Chat öffnen"}</button>
          <button disabled={togglingBot} onClick={async()=>{setTogglingBot(true);try{const m=await import("../../api/client");await m.toggleBotControl(lead.id,"bot");setLeads(p=>p.map(x=>x.id===lead.id?{...x,controlMode:"bot"}:x));showT(t("bot_reactivated"));}catch(e){console.error(e);}finally{setTogglingBot(false);}}} style={{padding:"5px 14px",borderRadius:8,background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.3)",color:"#10b981",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:togglingBot?0.5:1}}>{togglingBot?"...":t("activate_bot")}</button>
        </div>
      </div>}

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
        {tabs.map(tb=><button key={tb.id} onClick={()=>setPatientTab(tb.id)} style={{flex:1,padding:"12px 0",background:"transparent",border:"none",borderBottom:patientTab===tb.id?`2px solid #4cc9ff`:"2px solid transparent",color:patientTab===tb.id?"#4cc9ff":"rgba(167,177,195,0.7)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{tb.label}</button>)}
      </div>

      {/* ═══════════════════════ TAB CONTENT ═══════════════════════ */}
      <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>

        {/* ═══ TIMELINE TAB — Accordion Redesign ═══ */}
        {patientTab==="timeline"&&<>

          {/* Review pending banner */}
          {needsReview&&<div style={{marginBottom:14,padding:"12px 16px",borderRadius:10,background:"rgba(255,138,42,0.04)",border:"1px solid rgba(255,138,42,0.1)",display:"flex",alignItems:"center",gap:10}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:lead.reviewAssignedTo?"#10b981":"#f59e0b",animation:lead.reviewAssignedTo?"none":"fmPulse 2s infinite"}} />
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"#ff8a2a"}}>{t("review_pending") || "Bewertung ausstehend"}</div>
              <div style={{fontSize:11,color:"rgba(167,177,195,0.6)"}}>
                {lead.reviewAssignedTo ? `${t("assigned_to") || "Zugewiesen an"} ${lead.reviewAssignedToName || "Arzt"}` : (t("auto_assigned") || "Wird automatisch zugewiesen")}
                {lead.lastAiInteraction ? ` · ${t("waiting_since") || "Wartet seit"} ${timeAgo(lead.lastAiInteraction)}` : ""}
              </div>
            </div>
          </div>}

          {/* ── SECTION 1: Patient Overview ── */}
          <Accordion icon={"👤"} title={t("patient_overview") || "Patientenübersicht"} defaultOpen={true}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 16px"}}>
              <DataField label={t("name") || "Name"} value={lead.name} />
              <DataField label={t("phone") || "Telefon"} value={lead.phone} />
              <DataField label={t("age") || "Alter"} value={fields.age} />
              <DataField label={t("country") || "Land"} value={translateValue(lead.country)} />
              <DataField label={t("language") || "Sprache"} value={lead.language} />
              <DataField label={t("concern") || "Anliegen"} value={translateValue(fields.concern)} />
              <DataField label={t("hair_loss_type") || "Haarausfall-Art"} value={translateValue(fields.hair_loss_type)} />
              <DataField label={t("norwood_label") || "Norwood"} value={fields.norwood_scale || fields.norwood} />
              <DataField label={translateValue("DSGVO")} value={lead.consentGiven || lead.consent?.timestamp || lead.consents?.data_privacy?.signed ? ("\u2705 " + (lead.consents?.data_privacy?.method || "WhatsApp") + (lead.consents?.data_privacy?.signedAt ? " · " + new Date(lead.consents.data_privacy.signedAt).toLocaleDateString(fmLocale()) : "")) : ("\u26A0\uFE0F " + (t("gdpr_not_granted") || "Not granted"))} />
            </div>
          </Accordion>

          {/* ── SECTION 2: Medical Data ── */}
          <Accordion
            icon={"🏥"}
            title={t("medical_data") || "Medizinische Daten"}
            defaultOpen={true}
            badge={
              (fields.diabetes || fields.allergies || fields.blood_thinners || fields.medical_conditions) ?
                <span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:"rgba(239,68,68,0.1)",color:"#ef4444"}}>{t("medical_flags") || "Flags"}</span>
                : null
            }
          >
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 16px"}}>
              <DataField label={t("previous_treatments") || "Vorh. Behandlung"} value={translateValue(fields.previous_treatments)} />
              <DataField label={t("medications") || "Medikamente"} value={translateValue(fields.medications)} />
              <DataField label={t("allergies") || "Allergien"} value={translateValue(fields.allergies)} flagged={isFlagged("allergies", fields.allergies)} />
              <DataField label={t("medical_conditions") || "Med. Historie"} value={translateValue(fields.medical_conditions || fields.medical_history)} flagged={isFlagged("medical_conditions", fields.medical_conditions || fields.medical_history)} />
              <DataField label={t("smoker") || "Raucher"} value={formatBool(fields.smoker)} />
              <DataField label={t("blood_thinners") || "Blutverdünner"} value={formatBool(fields.blood_thinners)} flagged={isFlagged("blood_thinners", fields.blood_thinners)} />
              <DataField label={t("blood_pressure") || "Blutdruck"} value={translateValue(fields.blood_pressure)} />
              <DataField label={t("diabetes") || "Diabetes"} value={translateValue(fields.diabetes)} flagged={isFlagged("diabetes", fields.diabetes)} />
            </div>
            {/* Patient photo thumbnails */}
            {(lead.photoUrls||[]).length > 0 && (
              <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{fontSize:10,fontWeight:700,color:"rgba(167,177,195,0.6)",textTransform:"uppercase",marginBottom:8}}>{t("patient_photos") || "Patientenfotos"}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {(lead.photoUrls||[]).slice(0,6).map((p,pi) => {
                    const photoUrl = typeof p === 'string' ? p : p?.url;
                    const authUrl = photoUrl ? authPhotoUrl(photoUrl) : null;
                    const isReal = !!authUrl && (authUrl.startsWith('https://') || authUrl.startsWith('http://'));
                    const labels = [t("photo_front")||"Vorne",t("photo_top")||"Oben",t("photo_left")||"Links",t("photo_right")||"Rechts",t("photo_back")||"Hinten","Extra"];
                    return (
                      <div key={pi} style={{
                        width:52,height:52,borderRadius:10,overflow:"hidden",
                        background: isReal ? "rgba(0,0,0,0.2)" : "rgba(76,201,255,0.06)",
                        border: isReal ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(76,201,255,0.12)",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        flexDirection:"column",gap:1,cursor:"pointer",
                      }} onClick={() => {
                        if(isReal) { setLightbox({photos:lead.photoUrls.map(u=>typeof u==='string'?u:u?.url).filter(u=>u&&(u.startsWith('https://')||u.startsWith('http://'))),idx:pi}); }
                        else { const ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;cursor:pointer';ov.onclick=()=>ov.remove();ov.innerHTML='<div style="font-size:80px">\uD83D\uDCF7</div><div style="color:rgba(255,255,255,0.5);font-size:16px;font-weight:600">'+labels[pi]+' — Foto '+(pi+1)+'/'+Math.min(lead.photoUrls.length,6)+'</div>';document.body.appendChild(ov); }
                      }}>
                        {isReal ? <img src={authUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} /> : <><span style={{fontSize:16}}>{"\uD83D\uDCF7"}</span><span style={{fontSize:7,color:"rgba(76,201,255,0.5)",fontWeight:600}}>{labels[pi]||""}</span></>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Accordion>

          {/* ── SECTION 3: Treatment Plan ── */}
          {rd && !needsReview && <Accordion icon={"📋"} title={t("treatment_plan_title") || "Behandlungsplan"} defaultOpen={false}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 16px"}}>
              <DataField label={t("technique") || "Technik"} value={rd.technique || lead.treatment} />
              <DataField label={t("grafts_label") || "Grafts"} value={rd.grafts} />
              <DataField label={t("price_label") || "Preis"} value={rd.price} />
              <DataField label={t("reviewed_by") || "Bewertet von"} value={rd.doctor || rd.doctorName || lead.reviewAssignedToName || "—"} />
              <DataField label={t("operating_doctor") || "OP-Arzt"} value={rd.operatingDoctor || lead.appointmentDoctor} />
              <DataField label={t("op_date") || "OP-Termin"} value={(()=>{
                const b = lead.booking;
                const a = lead.appointmentDate || lead.appointment?.scheduled_at;
                if (b && b.date) return `${new Date(b.date).toLocaleDateString(fmLocale(),{day:"2-digit",month:"2-digit",year:"numeric"})}${b.time ? " · " + b.time : ""}`;
                if (a) { const d = new Date(a); return d.toLocaleDateString(fmLocale(),{day:"2-digit",month:"2-digit",year:"numeric"}) + " · " + d.toLocaleTimeString(fmLocale(),{hour:"2-digit",minute:"2-digit"}); }
                return null;
              })()} />
              {rd.notes && <div style={{gridColumn:"1 / -1"}}>
                <DataField label={t("notes") || "Notizen"} value={rd.notes} />
              </div>}
            </div>
            {/* PDF Download Button */}
            <div style={{marginTop:12,display:"flex",justifyContent:"flex-end"}}>
              <button onClick={async(e)=>{
                e.stopPropagation();
                e.preventDefault();
                try {
                  const { getAccessToken } = await import("../../api/client");
                  const token = getAccessToken() || sessionStorage.getItem("fm_access_token");
                  if (!token) { alert(t("not_logged_in") || "Nicht eingeloggt"); return; }
                  const base = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://api.flowmatix.io";
                  const resp = await fetch(`${base}/api/v1/crm/pdf/patient-card/${lead.id}`, {
                    headers: { "Authorization": `Bearer ${token}` },
                  });
                  if (!resp.ok) { alert((t("pdf_error") || "PDF Fehler") + ": " + resp.status); return; }
                  const blob = await resp.blob();
                  const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
                  const a = document.createElement("a");
                  a.style.display = "none";
                  a.href = url;
                  a.download = `${t("patient_card_filename") || "Patientenkarte"}-${(lead.name || (t("patient") || "Patient")).replace(/\s/g, "-")}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
                } catch (err) { alert(t("pdf_download_failed") || "PDF Download fehlgeschlagen"); console.error(err); }
              }} style={{padding:"6px 14px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>{"\uD83D\uDCC4"} {t("download_pdf") || "PDF"}</button>
            </div>
          </Accordion>}

          {/* ── SECTION 4: Finance ── */}
          {rd && <Accordion icon={"💰"} title={t("finances_label") || "Finanzen"} defaultOpen={false}>
            {(()=>{
              const fin=lead.financials||{treatmentPrice:parseInt(String(rd.price||"0").replace(/[^0-9]/g,"")||0),currency:"EUR",depositAmount:0,depositStatus:"pending",paymentStatus:"pending"};
              const remaining=fin.paymentStatus==="paid"?0:fin.treatmentPrice-(fin.depositAmount||0);
              const psc=fin.paymentStatus==="paid"?"#10b981":fin.paymentStatus==="partial"?"#fbbf24":"rgba(167,177,195,0.7)";
              const leadInvs=invoices.filter(i=>i.leadId===lead.id);
              const latestInv=leadInvs[leadInvs.length-1];
              return <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  <div>
                    <div style={fieldLabelStyle}>{t("price_label") || "Preis"}</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#fff",marginTop:2}}>€{fin.treatmentPrice.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={fieldLabelStyle}>{t("deposit") || "Anzahlung"}</div>
                    <div style={{fontSize:18,fontWeight:800,marginTop:2}}>{fin.depositAmount>0?<span style={{color:"#10b981"}}>€{fin.depositAmount.toLocaleString()}</span>:<span style={{color:"rgba(167,177,195,0.7)"}}>—</span>}</div>
                    {fin.depositStatus==="paid"&&<span style={{fontSize:9,fontWeight:700,color:"#10b981"}}>✓ PAID</span>}
                  </div>
                  <div>
                    <div style={fieldLabelStyle}>{t("remaining") || "Restbetrag"}</div>
                    <div style={{fontSize:18,fontWeight:800,color:remaining>0?"#fbbf24":"#10b981",marginTop:2}}>€{remaining.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={fieldLabelStyle}>{t("status") || "Status"}</div>
                    <div style={{marginTop:4}}><span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:`${psc}18`,color:psc}}>{fin.paymentStatus==="paid"?"✓ "+t("paid"):fin.paymentStatus==="partial"?"\u25D0 "+t("partial"):"\u25CB "+t("pending")}</span></div>
                  </div>
                </div>
                {latestInv&&<div style={{padding:10,borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:12}}><span style={{fontWeight:700}}>{latestInv.nr}</span><span style={{color:"rgba(167,177,195,0.6)",marginLeft:8}}>€{(latestInv.gross||0).toLocaleString()}</span></div>
                  <span style={{padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700,background:latestInv.status==="paid"?"rgba(16,185,129,0.12)":"rgba(251,191,36,0.12)",color:latestInv.status==="paid"?"#10b981":"#fbbf24"}}>{latestInv.status}</span>
                </div>}
                {!clinic?.stripeConnected && fin.depositStatus!=="paid" && fin.paymentStatus!=="paid" && <div style={{padding:"8px 12px",borderRadius:10,background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.12)",color:"rgba(251,191,36,0.7)",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:6,marginBottom:10}}>{"ℹ️"} {t("payment_manual_hint") || "Keine Zahlungsmethode verbunden — Zahlungen manuell als bezahlt markieren wenn eingegangen."}</div>}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <button onClick={()=>{setInvoiceModal(lead.id);setInvAmount(String(fin.treatmentPrice));setInvItems(lead.treatment);setInvVat("8");setInvDeposit("");}} style={{padding:"6px 12px",borderRadius:8,background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.15)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"\uD83E\uDDFE"} {t("create_invoice")}</button>
                  {fin.paymentStatus!=="paid"&&<button onClick={()=>{setLeads(p=>p.map(x=>x.id===lead.id?{...x,financials:{...fin,paymentStatus:"paid",depositStatus:"paid",depositAmount:fin.treatmentPrice}}:x));addTL(lead.id,"finance",`\uD83D\uDCB0 Full payment €${fin.treatmentPrice.toLocaleString()} received`);logAction("payment_received",lead.name,`€${fin.treatmentPrice}`);showT(t("marked_paid"));}} style={{padding:"6px 12px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"✓"} {t("mark_paid")}</button>}
                  {fin.paymentStatus!=="paid"&&fin.depositStatus!=="paid"&&<button onClick={()=>{const dep=Math.round(fin.treatmentPrice*0.25);setLeads(p=>p.map(x=>x.id===lead.id?{...x,financials:{...fin,depositAmount:dep,depositStatus:"paid",paymentStatus:"partial"}}:x));addTL(lead.id,"finance",`\uD83D\uDCB0 Deposit €${dep.toLocaleString()} received`);logAction("deposit_received",lead.name,`€${dep}`);showT(t("deposit_recorded"));}} style={{padding:"6px 12px",borderRadius:8,background:"rgba(167,107,255,0.08)",border:"1px solid rgba(167,107,255,0.15)",color:"#a78bfa",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"💰"} {t("record_deposit_25")}</button>}
                  <button onClick={()=>generatePDF(lead)} style={{padding:"6px 12px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.6)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"\uD83D\uDCC4"} PDF</button>
                </div>
              </>;
            })()}
          </Accordion>}

          {/* ── SECTION 5: Travel & Logistics ── */}
          {showTravel && <Accordion icon={"✈️"} title={t("arrival_logistics") || "Anreise & Logistik"} defaultOpen={false}>
            {/* Flight Section */}
            {!lead.flightConfirmed?.date && (
              <div style={{marginBottom:14,padding:14,borderRadius:12,background:"rgba(76,201,255,0.03)",border:"1px dashed rgba(76,201,255,0.15)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.7)"}}>{t("flight_tracking")}</span>
                  {!flightForm&&<button onClick={()=>setFlightForm(true)} style={{padding:"6px 14px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ {t("add_flight")}</button>}
                </div>
                {!flightForm&&<div style={{fontSize:12,color:"rgba(167,177,195,0.75)",marginTop:6}}>{t("no_flight_details")}</div>}
                {flightForm&&<div style={{marginTop:10,display:"grid",gap:8}}>
                  <input value={flightAirline} onChange={e=>setFlightAirline(e.target.value)} placeholder={t("airline_flight_placeholder")} style={{width:"100%",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  <input type="date" value={flightDate} onChange={e=>setFlightDate(e.target.value)} style={{width:"100%",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{if(!flightAirline.trim()||!flightDate){showT(t("enter_airline_date"));return;}setLeads(prev=>prev.map(l=>l.id===lead.id?{...l,flightConfirmed:{date:flightDate,airline:flightAirline,detected:new Date().toISOString()}}:l));addTL(lead.id,"system","Flight added: "+flightAirline+" on "+flightDate);showT(t("flight_saved"));setFlightForm(false);setFlightAirline("");setFlightDate("");}} style={{padding:"7px 14px",borderRadius:8,background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.25)",color:"#10b981",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("save")}</button>
                    <button onClick={()=>{setFlightForm(false);setFlightAirline("");setFlightDate("");}} style={{padding:"7px 14px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.7)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t("cancel")}</button>
                  </div>
                </div>}
              </div>
            )}

            {/* Flight confirmed — full info */}
            {lead.flightConfirmed?.date&&(()=>{
              const isMismatch=!!flightAlerts.find(a=>a.id===lead.id);
              const daysUntil=Math.round((new Date(lead.flightConfirmed.date)-new Date())/(1000*60*60*24));
              const lg=lead.logistics;const ds=lg?DRIVER_STATUS[lg.status]:null;
              const clinicDrivers=(clinic?.drivers||[]).filter(d=>d.active);
              const flags={"Saudi Arabia":"\uD83C\uDDF8\uD83C\uDDE6","Japan":"\uD83C\uDDEF\uD83C\uDDF5","Germany":"\uD83C\uDDE9\uD83C\uDDEA","Egypt":"\uD83C\uDDEA\uD83C\uDDEC","Spain":"\uD83C\uDDEA\uD83C\uDDF8","France":"\uD83C\uDDEB\uD83C\uDDF7","Sweden":"\uD83C\uDDF8\uD83C\uDDEA","UK":"\uD83C\uDDEC\uD83C\uDDE7","Italy":"\uD83C\uDDEE\uD83C\uDDF9","Russia":"\uD83C\uDDF7\uD83C\uDDFA","UAE":"\uD83C\uDDE6\uD83C\uDDEA","Brazil":"\uD83C\uDDE7\uD83C\uDDF7","Turkey":"\uD83C\uDDF9\uD83C\uDDF7","USA":"\uD83C\uDDFA\uD83C\uDDF8"};
              const flag=flags[lead.country]||"\uD83C\uDF0D";
              return <>
                {/* Flight Info Card */}
                <div style={{marginBottom:14,padding:14,borderRadius:12,background:isMismatch?"rgba(239,68,68,0.04)":"rgba(76,201,255,0.04)",border:`1px solid ${isMismatch?"rgba(239,68,68,0.2)":"rgba(76,201,255,0.15)"}`}}>
                  <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                    <div style={{padding:10,borderRadius:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",fontSize:24,lineHeight:1}}>{flag}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,fontSize:15}}>{lead.flightConfirmed.airline}</div>
                      <div style={{fontSize:12,color:"rgba(167,177,195,0.7)",fontFamily:"monospace",marginTop:2}}>{t("arrival")}: <span style={{color:isMismatch?"#ef4444":"#10b981",fontWeight:700}}>{lead.flightConfirmed.date}</span>{daysUntil>0&&<span style={{marginLeft:6}}>({daysUntil} {t("days")})</span>}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,color:"rgba(167,177,195,0.6)",fontWeight:700}}>{t("appointment")}</div>
                      <div style={{fontSize:13,fontWeight:700,marginTop:2}}>{lead.booking?.date||t("not_booked")}</div>
                    </div>
                  </div>
                  {isMismatch && <div style={{marginTop:8,padding:"6px 10px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",fontSize:11,fontWeight:700,color:"#ef4444"}}>{"⚠\uFE0F"} {t("flight_mismatch")}</div>}
                </div>

                {/* Driver Assignment */}
                <div style={{marginBottom:14}}>
                  {!lg&&clinicDrivers.length>0&&<div style={{padding:12,borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.6)",textTransform:"uppercase",marginBottom:8}}>{"\uD83D\uDE97"} {t("assign_driver")}</div>
                    <div style={{display:"flex",gap:8}}>
                      <select value={selDriverId} onChange={e=>setSelDriverId(e.target.value)} style={{flex:1,padding:"7px 10px",borderRadius:8,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:13,outline:"none",cursor:"pointer"}}>
                        <option value="">{t("select_driver")}</option>
                        {clinicDrivers.map(d=><option key={d.id} value={d.id}>{d.name} ({d.role}) — {d.vehicle}</option>)}
                      </select>
                      <button disabled={!selDriverId} onClick={()=>{assignDriver(lead.id,selDriverId);setSelDriverId("");}} style={{padding:"7px 14px",borderRadius:8,background:selDriverId?"rgba(0,180,216,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${selDriverId?"rgba(0,180,216,0.25)":"rgba(255,255,255,0.08)"}`,color:selDriverId?"#00B4D8":"rgba(167,177,195,0.6)",fontWeight:700,fontSize:12,cursor:selDriverId?"pointer":"default",fontFamily:"inherit"}}>{t("assign")}</button>
                    </div>
                  </div>}
                  {!lg&&clinicDrivers.length===0&&<div style={{padding:10,borderRadius:10,background:"rgba(251,191,36,0.04)",border:"1px solid rgba(251,191,36,0.15)",fontSize:12,color:"rgba(251,191,36,0.8)"}}>{"⚠\uFE0F"} {t("no_drivers_configured")}</div>}
                  {lg&&<div style={{padding:12,borderRadius:10,background:`${ds?.color||"#4cc9ff"}08`,border:`1px solid ${ds?.color||"#4cc9ff"}20`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.6)",textTransform:"uppercase"}}>{"\uD83D\uDE97"} {t("driver")} {lg.status==="escalated"||lg.status==="backup_confirmed"||lg.status==="backup_declined"?"("+t("backup")+")":"("+t("primary")+")"}</div>
                      <span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:`${ds?.color||"#4cc9ff"}18`,color:ds?.color||"#4cc9ff"}}>{ds?.icon} {ds?.label}</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:13}}>
                      <div><span style={{color:"rgba(167,177,195,0.7)",fontSize:11}}>{t("name")}</span><div style={{fontWeight:700,marginTop:1}}>{lg.status==="escalated"||lg.status==="backup_confirmed"||lg.status==="backup_declined"?lg.backupDriverName:lg.driverName}</div></div>
                      {(()=>{const drvId=lg.status==="escalated"||lg.status==="backup_confirmed"||lg.status==="backup_declined"?lg.backupDriverId:lg.driverId;const drv=(clinic?.drivers||[]).find(d=>d.id===drvId);return drv?<><div><span style={{color:"rgba(167,177,195,0.7)",fontSize:11}}>{t("vehicle")}</span><div style={{marginTop:1}}>{drv.vehicle}</div></div><div><span style={{color:"rgba(167,177,195,0.7)",fontSize:11}}>{t("plate")}</span><div style={{marginTop:1,fontFamily:"monospace"}}>{drv.plateNo}</div></div><div><span style={{color:"rgba(167,177,195,0.7)",fontSize:11}}>{t("phone")}</span><div style={{marginTop:1,fontFamily:"monospace",fontSize:12}}>{drv.phone}</div></div></>:null;})()}
                    </div>
                    {/* Driver Action Buttons */}
                    <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                      {lg.status==="pending"&&<button onClick={()=>notifyDriver(lead.id)} style={{padding:"6px 14px",borderRadius:8,background:"rgba(0,180,216,0.12)",border:"1px solid rgba(0,180,216,0.25)",color:"#00B4D8",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"\uD83D\uDCF1"} {t("notify_via_whatsapp")}</button>}
                      {lg.status==="notified"&&<>
                        <span style={{padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:700,color:"#4cc9ff",background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:99,background:"#4cc9ff",animation:"aiPulse 2s ease infinite"}}/>{t("awaiting_response")}</span>
                        <button onClick={()=>handleDriverResponse(lead.id,"confirm")} style={{padding:"6px 12px",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"✓"} Sim CONFIRM</button>
                        <button onClick={()=>handleDriverResponse(lead.id,"decline")} style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"✕"} Sim DECLINE</button>
                      </>}
                      {(lg.status==="confirmed"||lg.status==="backup_confirmed")&&<div style={{padding:"6px 14px",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",fontSize:12,fontWeight:700,color:"#10b981",display:"flex",alignItems:"center",gap:6}}>{"\u2705"} {t("pickup_confirmed")}</div>}
                      {lg.status==="declined"&&<button onClick={()=>escalateToBackup(lead.id)} style={{padding:"6px 14px",borderRadius:8,background:"rgba(255,138,42,0.12)",border:"1px solid rgba(255,138,42,0.25)",color:"#ff8a2a",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"\uD83D\uDD04"} {t("escalate_to_backup")}</button>}
                      {lg.status==="escalated"&&<>
                        <span style={{padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:700,color:"#ff8a2a",background:"rgba(255,138,42,0.08)",border:"1px solid rgba(255,138,42,0.15)",display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:99,background:"#ff8a2a",animation:"aiPulse 2s ease infinite"}}/>{t("backup_notified")}</span>
                        <button onClick={()=>handleBackupDriverResponse(lead.id,"confirm")} style={{padding:"6px 12px",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"✓"} Sim CONFIRM</button>
                        <button onClick={()=>handleBackupDriverResponse(lead.id,"decline")} style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"✕"} Sim DECLINE</button>
                      </>}
                      {lg.status==="backup_declined"&&<div style={{display:"flex",flexDirection:"column",gap:6,width:"100%"}}>
                        <div style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",fontSize:12,fontWeight:700,color:"#ef4444"}}>{"\u274C"} {t("both_drivers_declined")}</div>
                        <div style={{display:"flex",gap:8}}>
                          <select value={selDriverId} onChange={e=>setSelDriverId(e.target.value)} style={{flex:1,padding:"7px 10px",borderRadius:8,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:12,outline:"none",cursor:"pointer"}}>
                            <option value="">{t("reassign_driver")}</option>
                            {clinicDrivers.map(d=><option key={d.id} value={d.id}>{d.name} ({d.role})</option>)}
                          </select>
                          <button disabled={!selDriverId} onClick={()=>{assignDriver(lead.id,selDriverId);setSelDriverId("");}} style={{padding:"6px 12px",borderRadius:8,background:selDriverId?"rgba(0,180,216,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${selDriverId?"rgba(0,180,216,0.25)":"rgba(255,255,255,0.08)"}`,color:selDriverId?"#00B4D8":"rgba(167,177,195,0.6)",fontWeight:700,fontSize:11,cursor:selDriverId?"pointer":"default",fontFamily:"inherit"}}>{t("assign")}</button>
                        </div>
                      </div>}
                    </div>
                  </div>}
                </div>

                {/* Hotel Section */}
                {(()=>{
                  const h = lead.hotelInfo || lead.hotel || {};
                  const hasHotel = !!(h.name || lead.notes?.toLowerCase().includes("hotel"));
                  return <div style={{padding:14,borderRadius:12,background:"rgba(167,107,255,0.04)",border:"1px solid rgba(167,107,255,0.15)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#a78bfa",textTransform:"uppercase",letterSpacing:"0.5px",display:"flex",alignItems:"center",gap:6}}>{"\uD83C\uDFE8"} HOTEL</span>
                      {hasHotel&&<span style={{fontSize:10,fontWeight:700,color:"#10b981"}}>{"✓"} {t("hotel_confirmed") || "Bestätigt"}</span>}
                    </div>
                    {hasHotel?<>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                        <div><div style={fieldLabelStyle}>{t("hotel_label") || "Hotel"}</div><div style={{fontSize:14,fontWeight:700}}>{h.name||"Hotel Istanbul"}</div></div>
                        <div><div style={fieldLabelStyle}>{t("room_label") || "Zimmer"}</div><div style={{fontSize:14,fontWeight:600}}>{h.room||"Standard"}</div></div>
                        <div><div style={fieldLabelStyle}>{t("check_in") || "Check-in"}</div><div style={{fontSize:13,fontWeight:600,color:"#4cc9ff"}}>{h.checkIn||lead.flightConfirmed?.date||"—"}</div></div>
                        <div><div style={fieldLabelStyle}>{t("check_out") || "Check-out"}</div><div style={{fontSize:13,fontWeight:600}}>{h.checkOut||(lead.booking?.date?(() => { const d = new Date(lead.booking.date); d.setDate(d.getDate() + 2); return d.toISOString().slice(0,10); })():"—")}</div></div>
                      </div>
                      <div style={{padding:"8px 12px",borderRadius:10,background:"rgba(167,107,255,0.06)",border:"1px solid rgba(167,107,255,0.12)",color:"rgba(167,177,195,0.7)",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>{"📬"} {t("hotel_auto_hint") || "Wird automatisch 3 Tage vor Termin an Patient gesendet (inkl. Termin & Flugticket-Anfrage)"}</div>
                    </>:<>
                    <div style={{textAlign:"center",padding:"12px 0",color:"rgba(167,177,195,0.6)",fontSize:12}}>
                      {t("no_hotel") || "No hotel assigned"}
                    </div>
                    <div style={{padding:"8px 12px",borderRadius:10,background:"rgba(167,107,255,0.06)",border:"1px solid rgba(167,107,255,0.12)",color:"rgba(167,177,195,0.7)",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:6,marginTop:8}}>{"📬"} {t("hotel_auto_hint") || "Wird automatisch 3 Tage vor Termin an Patient gesendet (inkl. Termin & Flugticket-Anfrage)"}</div>
                    </>}
                  </div>;
                })()}
              </>;
            })()}
          </Accordion>}

          {/* ── Cancel Button ── */}
          {lead.stage!=="cancelled"&&<div style={{marginBottom:14}}>
            <button onClick={()=>{if(window.confirm(t("cancel_patient_confirm")||"Patient wirklich stornieren?")){moveLead(lead.id,"cancelled");setConvStatus(lead.id,"closed");addTL(lead.id,"system","Patient cancelled");showT(t("patient_cancelled")||"Patient storniert");}}} style={{width:"100%",padding:"8px 0",borderRadius:8,background:"rgba(239,68,68,0.04)",border:"1px solid rgba(239,68,68,0.1)",color:"rgba(239,68,68,0.5)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,0.08)";e.currentTarget.style.color="#ef4444";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(239,68,68,0.04)";e.currentTarget.style.color="rgba(239,68,68,0.5)";}}>{t("cancel_patient") || "Stornieren"}</button>
          </div>}

          {/* DSGVO consent shown in patient overview above — removed duplicate here */}

          {/* ── Activity Timeline ── */}
          {lead.notes&&<Section title={t("notes")}><div style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",fontSize:14}}>{lead.notes}</div></Section>}
          <Section title={t("activity_timeline")}><div style={{position:"relative",paddingLeft:28}}><div style={{position:"absolute",left:9,top:4,bottom:4,width:2,background:"rgba(255,255,255,0.06)"}}/>
            {(lead.timeline?.length ? lead.timeline : detailTimeline).map((ev,i)=>{const m=ev.icon?{i:ev.icon,c:ev.color||"#6b7280"}:(TL[ev.type]||TL.system);const evLabel=ev.icon?translateTimeline(ev.text):(translateTimeline(ev.text)||"");return<div key={i} style={{display:"flex",gap:14,marginBottom:12,position:"relative"}}><div style={{position:"absolute",left:-23,top:2,width:20,height:20,borderRadius:6,background:`${m.c}15`,border:`1.5px solid ${m.c}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>{m.i}</div><div><div style={{display:"flex",gap:8,marginBottom:2}}><span style={{fontSize:13,fontWeight:700,color:"rgba(232,238,252,0.85)"}}>{evLabel}</span></div><div style={{fontSize:11,color:"rgba(167,177,195,0.6)"}}>{ev.time?new Date(ev.time).toLocaleString((localStorage.getItem("fm_lang")||"de")==="tr"?"tr-TR":(localStorage.getItem("fm_lang")||"de")==="en"?"en-GB":"de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):""}</div></div></div>;})}
          </div></Section>
        </>}

        {/* ═══ APPOINTMENTS TAB ═══ */}
        {patientTab==="appointments"&&<div>
          {leadAppts.length===0&&<div style={{textAlign:"center",padding:40,color:"rgba(167,177,195,0.6)"}}>{t("no_appointments_yet")}</div>}
          {leadAppts.map(a=>{const ac=APPT_C[a.status]||APPT_C.booked;return<div key={a.id} style={{padding:16,borderRadius:14,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:700,fontSize:15}}>{a.treatment||a.title||t("appointment")||"Appointment"}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginTop:4}}>{a.date} · {a.time}{a.endTime?`–${a.endTime}`:""}{(a.assigned||a.doctorName)?` · ${a.assigned||a.doctorName}`:""}</div></div>
            <span style={{padding:"4px 12px",borderRadius:8,fontSize:12,fontWeight:700,background:`${ac.c}18`,color:ac.c}}>{ac.l}</span>
          </div>;})}
          {lead.booking&&!leadAppts.length&&<div style={{padding:16,borderRadius:14,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",fontSize:14}}>{t("booking")}: <strong style={{color:"#10b981"}}>{lead.booking.date}</strong>{lead.booking.time?` · OP-Start: ${lead.booking.time}`:""} — {lead.booking.type}</div>}
        </div>}

        {/* ═══ INVOICES TAB ═══ */}
        {patientTab==="invoices"&&<div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <button onClick={()=>{setInvoiceModal(lead.id);setInvAmount(String(lead.reviewData?.price||"").replace(/[^0-9]/g,"")||"");setInvItems(lead.treatment);setInvVat("19");setInvDeposit("");}} style={{padding:"10px 18px",borderRadius:10,background:"linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.08))",border:"1px solid rgba(16,185,129,0.25)",color:"#10b981",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>{"\uD83E\uDDFE"} {t("create_invoice")}</button>
            {lead.reviewData&&<button onClick={()=>{const amt=parseInt(lead.reviewData.price?.replace(/[^0-9]/g,""))||0;if(amt>0){const dep=Math.round(amt*0.25);generateDepositLink(lead.id,dep);}else showT(t("no_price_set"));}} style={{padding:"10px 18px",borderRadius:10,background:"rgba(167,107,255,0.08)",border:"1px solid rgba(167,107,255,0.2)",color:"#a78bfa",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>{"\uD83D\uDCB3"} {t("deposit_link_25")}</button>}
          </div>
          {(()=>{const li=invoices.filter(i=>i.leadId===lead.id);
            if(li.length===0)return<div style={{textAlign:"center",padding:30,color:"rgba(167,177,195,0.6)"}}>
              <div style={{fontSize:32,marginBottom:8}}>{"\uD83E\uDDFE"}</div>
              <div style={{fontWeight:600,marginBottom:4}}>{t("no_invoices_yet")}</div>
              <div style={{fontSize:13}}>{t("create_invoice_after_plan")}</div>
            </div>;
            return<div>{li.map(inv=>{
              const isPaid=inv.status==="paid";
              return<div key={inv.id} style={{padding:16,borderRadius:14,background:isPaid?"rgba(16,185,129,0.04)":"rgba(255,255,255,0.03)",border:`1px solid ${isPaid?"rgba(16,185,129,0.15)":"rgba(255,255,255,0.08)"}`,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8}}>
                      {inv.nr}
                      <span style={{padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:isPaid?"rgba(16,185,129,0.12)":"rgba(251,191,36,0.12)",color:isPaid?"#10b981":"#fbbf24"}}>{isPaid?t("paid_upper"):t("unpaid")}</span>
                    </div>
                    <div style={{fontSize:12,color:"rgba(167,177,195,0.7)",marginTop:2}}>{t("created")} {new Date(inv.created).toLocaleDateString()} · {t("due")} {inv.dueDate}</div>
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:isPaid?"#10b981":"rgba(232,238,252,0.9)"}}>€{inv.gross?.toLocaleString()}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10,padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.02)"}}>
                  <div><div style={{fontSize:10,color:"rgba(167,177,195,0.6)",fontWeight:700}}>NET</div><div style={{fontSize:13,fontWeight:600}}>€{inv.net?.toLocaleString()}</div></div>
                  <div><div style={{fontSize:10,color:"rgba(167,177,195,0.6)",fontWeight:700}}>VAT {inv.vatPct}%</div><div style={{fontSize:13,fontWeight:600}}>€{inv.vatAmount?.toLocaleString()}</div></div>
                  <div><div style={{fontSize:10,color:"rgba(167,177,195,0.6)",fontWeight:700}}>GROSS</div><div style={{fontSize:13,fontWeight:700,color:"#10b981"}}>€{inv.gross?.toLocaleString()}</div></div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <button onClick={()=>generateInvoicePDF(inv)} style={{padding:"5px 12px",borderRadius:7,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"\uD83D\uDCC4"} PDF</button>
                  {!isPaid&&<button onClick={()=>generateStripeLink(inv)} style={{padding:"5px 12px",borderRadius:7,background:"rgba(167,107,255,0.08)",border:"1px solid rgba(167,107,255,0.15)",color:"#a78bfa",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"\uD83D\uDCB3"} {t("stripe_link")}</button>}
                  {!isPaid&&<button onClick={()=>markInvoicePaid(inv.id,"cash")} style={{padding:"5px 12px",borderRadius:7,background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.15)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"✓"} {t("mark_paid_cash")}</button>}
                  {!isPaid&&<button onClick={()=>markInvoicePaid(inv.id,"card")} style={{padding:"5px 12px",borderRadius:7,background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.15)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"✓"} {t("mark_paid_card")}</button>}
                  {inv.stripeLink&&<div style={{fontSize:11,color:"rgba(167,177,195,0.6)",display:"flex",alignItems:"center",gap:4}}>{"\uD83D\uDD17"} <button onClick={()=>{navigator.clipboard?.writeText(inv.stripeLink);showT(t("link_copied"));}} style={{background:"none",border:"none",color:"#a78bfa",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>{t("copy_payment_link")}</button></div>}
                </div>
                {isPaid&&<div style={{marginTop:8,fontSize:12,color:"#10b981",fontWeight:600}}>{"✓"} {t("paid")} {inv.paidDate?new Date(inv.paidDate).toLocaleDateString():""} {t("via")} {inv.paidMethod}</div>}
              </div>;
            })}</div>;
          })()}
        </div>}

        {/* ═══ PHOTOS TAB ═══ */}
        {patientTab==="photos"&&<div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <button onClick={()=>generateMagicLink(lead.id)} style={{padding:"10px 18px",borderRadius:10,background:"linear-gradient(135deg,rgba(76,201,255,0.15),rgba(45,168,255,0.1))",border:"1px solid rgba(76,201,255,0.25)",color:"#4cc9ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>{"\uD83D\uDD17"} {t("generate_photo_upload_link")}</button>
            {magicLinks[lead.id]&&<div style={{flex:1,padding:"8px 12px",borderRadius:10,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",fontSize:12,display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:"#10b981",fontWeight:700}}>{"✓"} {t("link_active")}</span>
              <span style={{color:"rgba(167,177,195,0.6)",fontSize:11}}>{magicLinks[lead.id].status}</span>
              <button onClick={()=>{navigator.clipboard?.writeText(magicLinks[lead.id].link);showT(t("copied"));}} style={{marginLeft:"auto",padding:"3px 10px",borderRadius:6,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t("copy")}</button>
            </div>}
          </div>
          {(lead.photoUrls||[]).length===0&&<div style={{textAlign:"center",padding:30,color:"rgba(167,177,195,0.6)"}}>
            <div style={{fontSize:32,marginBottom:8}}>{"\uD83D\uDCF8"}</div>
            <div style={{fontWeight:600,marginBottom:4}}>{t("no_photos_yet")}</div>
            <div style={{fontSize:13}}>{t("send_magic_link_for_photos")}</div>
          </div>}
          {(lead.photoUrls||[]).length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
            {(lead.photoUrls||[]).map((p,i)=>{const url=typeof p==='string'?p:p?.url;const mime=typeof p==='object'?p?.mimeType:'';const created=typeof p==='object'&&p?.createdAt?new Date(p.createdAt).toLocaleString(fmLocale(),{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';return<div key={i} onClick={()=>url&&setLightbox({photos:lead.photoUrls,idx:i})} style={{aspectRatio:"1",borderRadius:14,background:"rgba(167,177,195,0.06)",border:"2px solid rgba(76,201,255,0.25)",overflow:"hidden",cursor:url?"pointer":"default",position:"relative"}}>
              {url?<img src={authPhotoUrl(url)} alt={`Photo ${i+1}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>{"\uD83D\uDCF7"}</div>}
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"4px 8px",background:"rgba(0,0,0,0.6)",fontSize:10,color:"#fff",fontWeight:600}}>{created||`Photo ${i+1}`}</div>
            </div>;})}
          </div>}
          {(lead.photoUrls||[]).length===0&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {[t("photo_front"),t("photo_left"),t("photo_right"),t("photo_top_back")].map((angle,i)=>
              <div key={i} style={{aspectRatio:"0.75",borderRadius:14,background:"rgba(255,255,255,0.02)",border:"2px dashed rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6}}>
                <span style={{fontSize:28}}>{"\u2B1C"}</span>
                <span style={{fontSize:10,color:"rgba(167,177,195,0.7)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{angle}</span>
              </div>
            )}
          </div>}
        </div>}

        {/* ═══ NOTES TAB ═══ */}
        {patientTab==="notes"&&<div>
          <div style={{marginBottom:16}}>
            <textarea id="newNote" name="newNote" value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder={t("add_internal_note_placeholder")} rows={3} style={{width:"100%",padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box",resize:"vertical"}}/>
            <button onClick={()=>addInternalNote(lead.id)} disabled={!newNote.trim()} style={{marginTop:8,padding:"8px 18px",borderRadius:10,background:newNote.trim()?"rgba(76,201,255,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${newNote.trim()?"rgba(76,201,255,0.25)":"rgba(255,255,255,0.08)"}`,color:newNote.trim()?"#4cc9ff":"rgba(167,177,195,0.6)",fontWeight:700,fontSize:13,cursor:newNote.trim()?"pointer":"default",fontFamily:"inherit"}}>{t("add_note")}</button>
          </div>
          {(detailNotes||lead.internalNotes||[]).length===0&&<div style={{textAlign:"center",padding:30,color:"rgba(167,177,195,0.6)"}}>{t("no_internal_notes_yet")}</div>}
          {(detailNotes||lead.internalNotes||[]).slice().reverse().map((n,i)=><div key={i} style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",marginBottom:8}}>
            <div style={{fontSize:14,lineHeight:1.5,marginBottom:6}}>{n.text}</div>
            <div style={{fontSize:11,color:"rgba(167,177,195,0.6)"}}>by <span style={{fontWeight:600,color:"rgba(167,177,195,0.6)"}}>{n.author}</span> · {timeAgo(n.time)}</div>
          </div>)}
        </div>}
      </div>
      {/* ═══ GDPR DELETE — only admin ═══ */}
      {user?.role === "admin" && <div style={{marginTop:24,padding:16,borderRadius:12,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)"}}>
        <div style={{fontSize:13,fontWeight:800,color:"#ef4444",marginBottom:8}}>{t("gdpr_danger_zone") || "Danger Zone"}</div>
        {!gdprConfirm ? (
          <button onClick={()=>setGdprConfirm(true)} style={{padding:"8px 16px",borderRadius:10,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{t("gdpr_delete_btn") || "Patientendaten endgültig löschen (DSGVO Art. 17)"}</button>
        ) : (
          <div>
            <div style={{fontSize:12,color:"rgba(239,68,68,0.8)",marginBottom:10,lineHeight:1.5}}>{t("gdpr_delete_warning") || "Alle Daten dieses Patienten werden unwiderruflich gelöscht: Nachrichten, Fotos, Termine, Dateien. Diese Aktion kann nicht rückgängig gemacht werden."}</div>
            <div style={{display:"flex",gap:8}}>
              <button disabled={gdprDeleting} onClick={async()=>{
                setGdprDeleting(true);
                try {
                  const { apiCall } = await import("../../api/client");
                  const res = await apiCall(`/crm/patients/${lead.id}/gdpr`, { method: "DELETE", body: JSON.stringify({ confirm: "GDPR_DELETE" }) });
                  if (res?.success) {
                    showT(t("gdpr_deleted_success") || "Patientendaten gelöscht");
                    setSelLead(null);
                    setLeads(prev => prev.filter(l => l.id !== lead.id));
                  } else { showT(res?.error || "Fehler", "error"); }
                } catch(e) { showT(e.message || "Fehler", "error"); }
                setGdprDeleting(false); setGdprConfirm(false);
              }} style={{padding:"8px 16px",borderRadius:10,background:"#ef4444",border:"none",color:"#fff",fontWeight:700,fontSize:12,cursor:gdprDeleting?"wait":"pointer",fontFamily:"inherit",opacity:gdprDeleting?0.6:1}}>{gdprDeleting ? "..." : (t("gdpr_confirm_delete") || "Endgültig löschen")}</button>
              <button onClick={()=>setGdprConfirm(false)} style={{padding:"8px 16px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#a7b1c3",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{t("cancel") || "Abbrechen"}</button>
            </div>
          </div>
        )}
      </div>}
    </div>
    {lightbox&&<PhotoLightbox photos={lightbox.photos} startIdx={lightbox.idx} onClose={()=>setLightbox(null)}/>}
    {showPlanBuilder&&<div style={{position:"fixed",inset:0,zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}}>
      <div style={{width:"90vw",maxWidth:960,maxHeight:"90vh",overflow:"auto",borderRadius:16,background:"#0f1623",border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        <TreatmentPlanBuilder patient={lead} doctorReview={lead.reviewData} clinic={clinic} onSave={(plan)=>{showT(t("offer_saved") || "Angebot gespeichert");setShowPlanBuilder(false);}} onSend={(plan)=>{sendTreatmentPlan(lead.id,0);showT(t("offer_sent") || "Angebot gesendet");setShowPlanBuilder(false);}} onClose={()=>setShowPlanBuilder(false)} />
      </div>
    </div>}
  </div>;
}
