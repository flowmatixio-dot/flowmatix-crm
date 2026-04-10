import { create } from 'zustand';
import * as fmApi from '../api/client';
import { CONV_STATUS, STAGES } from '../data/constants';
import { genId } from '../utils/helpers';

/**
 * Patient Store — patients/leads, selection, search, stage management.
 * Fetches from API, no localStorage for patient data.
 */
export const usePatientStore = create((set, get) => ({
  // ── State ──
  leads: [],
  selLead: null,
  dragItem: null,
  searchQuery: '',
  reviewGrafts: '',
  reviewPrice: '',
  reviewNotes: '',
  newNote: '',
  loading: false,
  error: null,

  // ── Actions ──
  setLeads: (leads) => set(typeof leads === 'function' ? (s) => ({ leads: leads(s.leads) }) : { leads }),
  setSelLead: (selLead) => set({ selLead }),
  setDragItem: (dragItem) => set({ dragItem }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setReviewGrafts: (reviewGrafts) => set({ reviewGrafts }),
  setReviewPrice: (reviewPrice) => set({ reviewPrice }),
  setReviewNotes: (reviewNotes) => set({ reviewNotes }),
  setNewNote: (newNote) => set({ newNote }),

  /**
   * Fetch patients from API.
   */
  fetchPatients: async (params = {}) => {
    set({ loading: true, error: null });
    const normalize = (raw) => (Array.isArray(raw) ? raw : []).map(p => ({
      ...p,
      intake: p.intake_data || p.intake || {},
      name: p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.phone || 'Unknown',
      treatment: p.treatment || p.intake_data?.treatment || p.metadata?.treatment || '',
      stage: (() => {
        const s = p.metadata?.stage || p.case_status || p.caseStatus || 'new';
        const cs = p.convStatus || p.conversation_state || 'ai_active';
        const hasPhotos = (p.photoUrls || p.photo_urls || []).length > 0 || p.photos;
        const hasReview = !!p.reviewData;
        const needsReview = cs === 'needs_medical_review';
        const isHandover = cs === 'human_takeover';
        const isCollecting = cs === 'collecting_photos';
        // Handover: patient stays in current stage — do NOT move
        if (isHandover) return s === 'new' ? 'new' : s;
        // Review done → Gebucht (caseStatus or convStatus signal)
        if (cs === 'booking_pending' || p.caseStatus === 'arzt_review_done') return 'booked';
        // new → contacted (Arzt-Review): patient has photos, review, or needs attention
        if (s === 'new' && (hasPhotos || hasReview || needsReview || isCollecting)) return 'contacted';
        // termin stages always = booked (even with deposit_paid)
        if (['termin_bestaetigt', 'termin_reserviert', 'termin_gebucht'].includes(s)) return 'booked';
        // deposit_paid WITHOUT termin = still waiting, not booked yet
        if (cs === 'deposit_paid') return 'contacted';
        if (s === 'angebot_gesendet' && cs !== 'deposit_paid' && cs !== 'needs_medical_review') return 'booked';
        if (s === 'abgeschlossen') return 'done';
        if (s === 'storniert') return 'cancelled';
        if (['neue_anfrage', 'anfrage_neu', 'new_inquiry'].includes(s)) return 'new';
        if (['contacted', 'arzt_zugewiesen', 'review_broadcast', 'fotos_erhalten', 'bewertung_ausstehend'].includes(s)) return 'contacted';
        return s;
      })(),
      convStatus: p.convStatus || p.conversation_state || 'ai_active',
      timeline: p.timeline || [],
      photoUrls: p.photoUrls || p.photo_urls || [],
      internalNotes: p.internalNotes || p.internal_notes || [],
      extractedFields: p.extractedFields || p.extracted_fields || null,
      consent: p.consent || (p.consent_given ? { granted: true } : null),
      consentGiven: !!(p.consentGiven || p.consent_given || (p.consent && p.consent.granted)),
      flightConfirmed: p.flightConfirmed || null,
      hotelInfo: p.hotelInfo || null,
      hotel: p.hotel || null,
      logistics: p.logistics || null,
      reviewData: p.reviewData || null,
      reviewedBy: p.reviewedBy || p.reviewed_by || null,
      reviewAssignedTo: p.reviewAssignedTo || p.review_assigned_to || null,
      appointmentDoctor: p.appointmentDoctor || p.appt_doctor_name || null,
      appointmentDate: p.appointmentDate || p.appt_date || null,
      depositPaid: p.depositPaid || p.convStatus === 'deposit_paid',
      metadata: p.metadata || {},
      createdAt: p.createdAt || p.created_at,
      lastAiInteraction: p.lastAiInteraction || p.last_contact_at,
      lastUserMessageAt: p.lastUserMessageAt || p.last_user_message_at || null,
      lang: p.lang || p.locale || '',
      source: p.source || 'whatsapp',
    }));
    try {
      // Fast initial load: first 200 patients
      const data = await fmApi.getPatients({ limit: 200, ...params });
      const raw = data.patients || data;
      const normalized = normalize(raw);
      set({ leads: normalized, loading: false });

      // Background load: if there are more, fetch ALL without limit
      const total = data.total || data.count || normalized.length;
      if (total > 200 || normalized.length >= 200) {
        // Fetch remaining in background after 500ms (non-blocking)
        // IMPORTANT: Only ADD new patients — never overwrite existing ones.
        // Overwriting would cause a race condition: if the user made local
        // changes (drag-drop, stage change, edits) during the 500ms window,
        // those changes would be lost. Full state syncs on next explicit refresh.
        setTimeout(async () => {
          try {
            const allData = await fmApi.getPatients({ limit: 10000, ...params });
            const allRaw = allData.patients || allData;
            const allNormalized = normalize(allRaw);
            set((state) => {
              const existingIds = new Set(state.leads.map(l => l.id));
              const newLeads = allNormalized.filter(l => !existingIds.has(l.id));
              if (newLeads.length === 0) return state; // no change needed
              return { leads: [...state.leads, ...newLeads] };
            });
          } catch (bgErr) {
            console.error('[patientStore] background load failed:', bgErr.message || bgErr);
            window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Failed to load all patients", type: "error" } }));
          }
        }, 500);
      }
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Failed to load patients", type: "error" } }));
      return null;
    }
  },

  /**
   * Create a new patient via API.
   */
  createPatient: async (data) => {
    try {
      const patient = await fmApi.createPatient(data);
      set((s) => ({ leads: [patient, ...s.leads] }));
      return patient;
    } catch (err) {
      set({ error: err.message });
      window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Failed to create patient", type: "error" } }));
      return null;
    }
  },

  /**
   * Update patient via API (optimistic).
   */
  updatePatient: async (id, data) => {
    const prev = get().leads.find(l => l.id === id);
    set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...data } : l)) }));
    try {
      await fmApi.updatePatient(id, data);
    } catch (err) {
      // Rollback on failure
      if (prev) set((s) => ({ leads: s.leads.map((l) => (l.id === id ? prev : l)) }));
      set({ error: err.message });
      window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Save failed", type: "error" } }));
    }
  },

  /**
   * Move patient to a different stage (local + API).
   */
  moveLead: (lid, newStage) => {
    const lead = get().leads.find((l) => l.id === lid);
    if (!lead || lead.stage === newStage) return;
    const prevStage = lead.stage;
    const st = STAGES.find((s) => s.id === newStage);
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === lid
          ? { ...l, stage: newStage, timeline: [...l.timeline, { time: 'now', type: 'action', text: `→ ${st.label}` }] }
          : l
      ),
    }));
    fmApi.updatePatient(lid, { stage: newStage }).then(() => {
      // Auto-create appointment when moving to "booked" (if none exists)
      if (newStage === "booked") {
        try {
          const { useAppointmentStore } = require('./index');
          const appts = useAppointmentStore.getState().appts || [];
          const hasAppt = appts.some(a => a.leadId === lid || a.patientId === lid);
          if (!hasAppt) {
            const bookingDate = lead.booking?.date || lead.preferredDate || lead.metadata?.preferredDate;
            useAppointmentStore.getState().create({
              patientId: lid,
              leadId: lid,
              patient: lead.name,
              treatment: lead.treatment || lead.reviewData?.treatment || "",
              date: bookingDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
              time: lead.booking?.time || "09:00",
              status: "confirmed",
              doctor: lead.reviewAssignedTo || "",
            });
          }
        } catch (e) { console.warn("[patientStore] auto-appointment failed:", e.message); }
      }
    }).catch(e => {
      console.error('[patientStore] moveLead failed, rolling back:', e.message || e);
      set((s) => ({
        leads: s.leads.map((l) => l.id === lid ? { ...l, stage: prevStage } : l),
      }));
      window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Move failed", type: "error" } }));
    });
    return { lead, stage: st };
  },

  /**
   * Add timeline entry to a patient.
   */
  addTL: (lid, type, text) => {
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === lid ? { ...l, timeline: [...l.timeline, { time: 'now', type, text }] } : l
      ),
    }));
    // API call (non-blocking)
    fmApi.addTimelineEntry(lid, { type, text }).catch(e => {
      console.error('[patientStore] addTL failed:', e.message || e);
      window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Failed to save timeline entry", type: "error" } }));
    });
  },

  /**
   * Set conversation status on a patient.
   */
  setConvStatus: (lid, status) => {
    const controlMap = {
      ai_active: 'ai', collecting_photos: 'ai', human_takeover: 'human',
      needs_medical_review: 'paused', booking_pending: 'human',
      waiting_for_clinic_reply: 'human', deposit_paid: 'ai',
      awaiting_reactivation: 'paused',
      resolved: 'closed', closed: 'closed',
    };
    set((s) => ({
      leads: s.leads.map((l) => {
        if (l.id !== lid) return l;
        const updated = { ...l, convStatus: status, controlMode: controlMap[status] || 'ai', controlUpdatedAt: new Date().toISOString() };
        // Recalculate stage immediately to prevent flickering
        if (status === 'deposit_paid' || status === 'booking_pending') updated.stage = 'contacted';
        if (status === 'resolved' || status === 'closed') updated.stage = 'done';
        return updated;
      }),
    }));
    fmApi.updatePatient(lid, { convStatus: status }).catch(e => {
      console.error('[patientStore] setConvStatus failed:', e.message || e);
      window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Failed to update status", type: "error" } }));
    });
  },

  /**
   * Handle drag-drop to stage.
   */
  handleDrop: (stage) => {
    const { dragItem, moveLead } = get();
    if (dragItem) {
      moveLead(dragItem, stage);
      set({ dragItem: null });
    }
  },

  /**
   * Add internal note to a patient.
   */
  addInternalNote: (lid, text, authorName) => {
    if (!text.trim()) return;
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === lid
          ? { ...l, internalNotes: [...(l.internalNotes || []), { text, author: authorName, time: new Date().toISOString() }] }
          : l
      ),
      newNote: '',
    }));
    // Persist note via API
    fmApi.addTimelineEntry(lid, { type: 'note', content: text, author: authorName }).catch(e => {
      console.error('[patientStore] addInternalNote failed:', e.message || e);
      window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Failed to save note", type: "error" } }));
    });
  },

  // ── Computed helpers (call as functions) ──

  getMyLeads: (clinicId) => get().leads.filter((l) => l.clinic === clinicId),

  getLeadById: (id) => get().leads.find((l) => l.id === id),

  getActionCounts: (clinicId) => {
    const myLeads = get().leads.filter((l) => l.clinic === clinicId);
    return {
      needs_medical_review: myLeads.filter((l) => l.convStatus === 'needs_medical_review').length,
      waiting_for_clinic_reply: myLeads.filter((l) => l.convStatus === 'waiting_for_clinic_reply').length,
      booking_pending: myLeads.filter((l) => l.convStatus === 'booking_pending').length,
      human_takeover: myLeads.filter((l) => l.convStatus === 'human_takeover').length,
    };
  },
}));
