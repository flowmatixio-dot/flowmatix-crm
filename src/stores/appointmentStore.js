import { create } from 'zustand';
import * as fmApi from '../api/client';

/**
 * Appointment Store — appointments, selection, CRUD.
 * Fetches from API, no localStorage.
 */
export const useAppointmentStore = create((set, get) => ({
  // ── State ──
  appts: [],
  selAppt: null,
  rescheduleAppt: null,
  rescheduleDate: '',
  rescheduleTime: '',
  cancelConfirm: false,
  loading: false,
  error: null,

  // ── Actions ──
  setAppts: (appts) => set(typeof appts === 'function' ? (s) => ({ appts: appts(s.appts) }) : { appts }),
  setSelAppt: (selAppt) => set({ selAppt }),
  setRescheduleAppt: (rescheduleAppt) => set({ rescheduleAppt }),
  setRescheduleDate: (rescheduleDate) => set({ rescheduleDate }),
  setRescheduleTime: (rescheduleTime) => set({ rescheduleTime }),
  setCancelConfirm: (cancelConfirm) => set({ cancelConfirm }),

  /**
   * Fetch appointments from API.
   */
  fetchAppointments: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await fmApi.getAppointments(params);
      // Ensure each appointment has date/time extracted from scheduled_at if missing
      const raw = data.appointments || data;
      const appts = Array.isArray(raw) ? raw.map(a => {
        if (a.scheduledAt && !a.date) {
          const dt = new Date(a.scheduledAt);
          a.date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        }
        if (a.scheduledAt && !a.time) {
          const dt = new Date(a.scheduledAt);
          a.time = dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        if (!a.patient) a.patient = a.patientName || a.patient_name || a.title || '';
        return a;
      }) : raw;
      set({ appts, loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  /**
   * Create appointment via API (optimistic).
   */
  create: async (data) => {
    try {
      const appt = await fmApi.createAppointment(data);
      set((s) => ({ appts: [...s.appts, appt] }));
      // Sync: move patient to "booked" ONLY if appointment is confirmed (not reserved)
      const effectiveStatus = appt?.status || data.status;
      if ((effectiveStatus === "confirmed" || effectiveStatus === "booked") && (data.leadId || data.patientId)) {
        try {
          const { usePatientStore } = require('./index');
          const leads = usePatientStore.getState().leads;
          const lid = data.leadId || data.patientId;
          const lead = leads.find(l => l.id === lid);
          if (lead && lead.stage !== "booked" && lead.stage !== "done") {
            usePatientStore.getState().moveLead(lid, "booked");
          }
        } catch (e) { /* patient sync optional */ }
      }
      // Reserved appointments: patient stays in current stage (kontaktiert)
      return appt;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  /**
   * Update appointment (optimistic + API).
   */
  updateAppt: (id, data) => {
    const prev = get().appts.find(a => a.id === id);
    set((s) => ({ appts: s.appts.map((a) => (a.id === id ? { ...a, ...data } : a)) }));
    fmApi.updateAppointment(id, data).catch(e => {
      console.error("[store] API sync failed, rolling back:", e.message || e);
      if (prev) set((s) => ({ appts: s.appts.map((a) => (a.id === id ? prev : a)) }));
      window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Speichern fehlgeschlagen", type: "error" } }));
    });
  },

  /**
   * Confirm a reserved appointment → moves patient to "booked".
   */
  confirmReservation: (id) => {
    const appt = get().appts.find(a => a.id === id);
    if (!appt) return;
    get().updateAppt(id, { status: "confirmed" });
    // Move patient to booked
    const lid = appt.leadId || appt.patientId || appt.patient_id;
    if (lid) {
      try {
        const { usePatientStore } = require('./index');
        const lead = usePatientStore.getState().leads.find(l => l.id === lid);
        if (lead && lead.stage !== "booked" && lead.stage !== "done") {
          usePatientStore.getState().moveLead(lid, "booked");
        }
      } catch (e) { /* optional */ }
    }
  },

  /**
   * Cancel appointment.
   */
  cancel: (id) => {
    const prev = get().appts.find(a => a.id === id);
    set((s) => ({ appts: s.appts.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)) }));
    fmApi.updateAppointment(id, { status: 'cancelled' }).catch(e => {
      console.error("[store] cancel failed, rolling back:", e.message || e);
      if (prev) set((s) => ({ appts: s.appts.map((a) => (a.id === id ? prev : a)) }));
      window.dispatchEvent(new CustomEvent("fm:toast", { detail: { msg: "Stornierung fehlgeschlagen", type: "error" } }));
    });
  },

  /**
   * Reschedule appointment.
   */
  doReschedule: () => {
    const { rescheduleAppt, rescheduleDate, rescheduleTime } = get();
    if (!rescheduleAppt || !rescheduleDate || !rescheduleTime) return null;
    const updated = { date: rescheduleDate, time: rescheduleTime };
    set((s) => ({
      appts: s.appts.map((a) => (a.id === rescheduleAppt.id ? { ...a, ...updated } : a)),
      rescheduleAppt: null,
      rescheduleDate: '',
      rescheduleTime: '',
    }));
    fmApi.updateAppointment(rescheduleAppt.id, updated).catch(e => { console.error("[store] API sync failed:", e.message || e); });
    return updated;
  },

  // ── Computed ──
  getMyAppts: (clinicId) => get().appts.filter((a) => a.clinic === clinicId),
}));
