import { APPT_C } from "../../data/constants";

/* ── Treatment colour map ─────────────────────────────────────────── */
const TREAT_COLORS = {
  fue: "#4cc9ff",
  dhi: "#a78bfa",
  "fue saphir": "#06b6d4",
  prp: "#10b981",
  bart: "#f59e0b",
  augenbrauen: "#ec4899",
  meso: "#06b6d4",
  consultation: "#94a3b8",
  beratung: "#94a3b8",
};

/* ── OP Duration by Graft Count ────────────────────────────────────── */

const DEFAULT_DURATIONS = { duration_1500: 4, duration_3000: 6, duration_4500: 8, duration_4500_plus: 10 };

/**
 * Get operation duration in hours based on graft count and doctor settings.
 * @param {number} grafts
 * @param {Object} [doctorSettings] – { duration_1500, duration_3000, duration_4500, duration_4500_plus }
 * @returns {number} hours
 */
export function getOpDuration(grafts, doctorSettings) {
  const ds = { ...DEFAULT_DURATIONS, ...doctorSettings };
  if (!grafts || grafts <= 0) return 6; // fallback
  if (grafts <= 1500) return ds.duration_1500;
  if (grafts <= 3000) return ds.duration_3000;
  if (grafts <= 4500) return ds.duration_4500;
  return ds.duration_4500_plus;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

/**
 * Compute an end-time string (HH:MM) by adding `durationMinutes` to `startTime`.
 * @param {string} startTime  – "HH:MM" (24 h)
 * @param {number} durationMinutes
 * @returns {string} "HH:MM"
 */
export function computeEndTime(startTime, durationMinutes) {
  if (!startTime || !durationMinutes) return null;
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const endM = String(total % 60).padStart(2, "0");
  return `${endH}:${endM}`;
}

/**
 * Return per-date stats from an appointments array.
 * @param {Array} appointments
 * @returns {Object} { [date]: { ops, grafts, consults, doctors } }
 */
export function getDayStats(appointments) {
  const stats = {};

  for (const appt of appointments) {
    const d = appt.date;
    if (!d) continue;

    if (!stats[d]) {
      stats[d] = { ops: 0, grafts: 0, consults: 0, doctors: new Set() };
    }

    const entry = stats[d];
    const treat = (appt.treatment || "").toLowerCase();

    if (treat === "consultation" || treat === "beratung") {
      entry.consults += 1;
    } else {
      entry.ops += 1;
    }

    if (appt.grafts) entry.grafts += Number(appt.grafts) || 0;

    const docId =
      appt.doctorId || appt.doctor_id || appt.staffId || appt.staff_id;
    if (docId) entry.doctors.add(docId);
  }

  // Convert doctor Sets to arrays for easier consumption
  for (const d of Object.keys(stats)) {
    stats[d].doctors = [...stats[d].doctors];
  }

  return stats;
}

/* ── Internal: resolve doctor colour ──────────────────────────────── */

const DOC_COLORS = ["#4cc9ff", "#f59e0b", "#a78bfa", "#10b981", "#ec4899", "#06b6d4", "#fbbf24", "#84cc16"];

function findDoctorColor(appt, doctors) {
  if (!doctors || !doctors.length) return null;
  const docId =
    appt.doctorId || appt.doctor_id || appt.staffId || appt.staff_id;
  const docName = (appt.doctorName || appt.doctor_name || appt.assigned || "").toLowerCase();

  // Try matching by ID first
  let idx = -1;
  if (docId) {
    idx = doctors.findIndex(
      (d) => d.id === docId || d._id === docId || d.staffId === docId || String(d.id) === String(docId),
    );
  }
  // Fallback: match by name
  if (idx === -1 && docName) {
    idx = doctors.findIndex(
      (d) => (d.name || "").toLowerCase().includes(docName) || docName.includes((d.name || "").toLowerCase()),
    );
  }
  if (idx === -1) return DOC_COLORS[0]; // default color instead of null
  const doc = doctors[idx];
  return doc.color || doc.calendarColor || DOC_COLORS[idx % DOC_COLORS.length];
}

/* ── Internal: resolve treatment colour ───────────────────────────── */

function getTreatmentColor(treatment) {
  if (!treatment) return null;
  const key = treatment.toLowerCase().trim();
  return TREAT_COLORS[key] || null;
}

/* ── Event mappers ────────────────────────────────────────────────── */

/**
 * Map an appointment object to a FullCalendar event.
 * @param {Object} appt
 * @param {Array}  [doctors] – optional doctors list for colour lookup
 */
export function apptToEvent(appt, doctors) {
  const sc = APPT_C[appt.status] || APPT_C.booked;
  // Ensure date/time from scheduledAt if missing
  if (!appt.date && (appt.scheduledAt || appt.scheduled_at)) {
    const dt = new Date(appt.scheduledAt || appt.scheduled_at);
    appt.date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    if (!appt.time) appt.time = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
    if (!appt.patient) appt.patient = appt.title || "Termin";
  }
  if (!appt.date) return null; // Skip invalid
  if (!appt.patient && appt.title) appt.patient = appt.title;
  const start = `${appt.date}T${appt.time || "09:00"}`;

  // Calculate duration from grafts if not explicitly set
  let effectiveDuration = appt.durationMinutes;
  if (!effectiveDuration && appt.grafts) {
    const docId = appt.doctorId || appt.doctor_id || appt.staffId || appt.staff_id;
    const doc = docId && doctors ? doctors.find(d => d.id === docId || d._id === docId || d.staffId === docId) : null;
    const hours = getOpDuration(Number(appt.grafts), doc);
    effectiveDuration = hours * 60;
  }
  if (!effectiveDuration) effectiveDuration = 360; // 6h fallback

  // Determine end time: explicit endTime > computed from duration
  const resolvedEndTime =
    appt.endTime || computeEndTime(appt.time || "09:00", effectiveDuration);
  const end = resolvedEndTime ? `${appt.date}T${resolvedEndTime}` : undefined;

  const doctorId =
    appt.doctorId || appt.doctor_id || appt.staffId || appt.staff_id || null;
  const doctorColor = findDoctorColor(appt, doctors);
  const treatmentColor = getTreatmentColor(appt.treatment);

  return {
    id: appt.id,
    title: `${appt.patient || "Patient"}`,
    start,
    end,
    backgroundColor: (appt.status === 'canceled' || appt.status === 'cancelled') ? `${sc.c}18` : doctorColor ? `${doctorColor}18` : `${sc.c}18`,
    borderColor: (appt.status === 'canceled' || appt.status === 'cancelled') ? sc.c : doctorColor || sc.c,
    textColor: (appt.status === 'canceled' || appt.status === 'cancelled') ? sc.c : doctorColor || sc.c,
    extendedProps: {
      type: "appointment",
      appt,
      status: appt.status,
      treatment: appt.treatment,
      treatmentColor,
      doctorId,
      doctorName: appt.doctorName || appt.doctor_name || "",
      doctorColor,
      time: appt.time,
      endTime: resolvedEndTime || appt.endTime,
      durationMinutes: effectiveDuration || null,
      grafts: appt.grafts || null,
      room: appt.room || null,
      patientStatus: appt.patientStatus || appt.patient_status || null,
      photosComplete: appt.photosComplete || false,
      reviewDone: appt.reviewDone || false,
      depositPaid: appt.depositPaid || false,
      patientStage: appt.patientStage || null,
      patientCountry: appt.patientCountry || null,
    },
  };
}

/**
 * Map a blocked-day object to a FullCalendar event.
 */
export function blockedDayToEvent(bd) {
  return {
    id: `blocked_${bd.id}`,
    title: bd.reason || "Blocked",
    start: bd.date,
    end: bd.date,
    allDay: true,
    display: "background",
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "transparent",
    extendedProps: {
      type: "blocked",
      blockedDay: bd,
      doctorId: bd.doctorId,
    },
  };
}

/**
 * Map all appointments + blocked days to FullCalendar events.
 * @param {Array}  appointments
 * @param {Array}  [blockedDays]
 * @param {Array}  [doctors] – optional doctors list for colour lookup
 */
export function mapAllEvents(appointments, blockedDays = [], doctors = []) {
  const apptEvents = appointments.map((a) => apptToEvent(a, doctors)).filter(Boolean);
  const blockedEvents = blockedDays.map(blockedDayToEvent);
  return [...apptEvents, ...blockedEvents];
}
