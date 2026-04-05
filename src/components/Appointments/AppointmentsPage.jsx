import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { getNow, getDemoDate, isDemoMode } from "../../utils/demoTime";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";

import { useApp } from "../../context/AppContext";
import { APPT_C } from "../../data/constants";
import { useAppointmentStore } from "../../stores/appointmentStore";
import { mapAllEvents, getDayStats } from "./calendarMappers";
import { useCalendarFilters } from "./useCalendarFilters";
import DoctorFilter from "./DoctorFilter";
import CalendarToolbar from "./CalendarToolbar";
import AppointmentDrawer from "./AppointmentDrawer";
import BlockDayModal from "./BlockDayModal";
import DoctorSettingsModal from "./DoctorSettingsModal";
import * as fmApi from "../../api/client";
import RoomScheduler from "./RoomScheduler";
import HintBox from "../shared/HintBox.jsx";
import { fmLocale } from "../../utils/helpers";

const FC_VIEW_MAP = { month: "dayGridMonth", week: "timeGridWeek", day: "timeGridDay" };
const REVERSE_VIEW_MAP = { dayGridMonth: "month", timeGridWeek: "week", timeGridDay: "day" };

const TREAT_ABBR = {
  "FUE": "FUE", "DHI": "DHI", "FUE Saphir": "SAP", "PRP": "PRP",
  "Bart": "BRT", "Augenbrauen": "AUG", "Meso": "MSO",
  "Consultation": "BER", "Beratung": "BER",
  "FUE Hair Transplant": "FUE", "DHI Hair Transplant": "DHI",
  "FUE Saç Ekimi": "FUE", "DHI Saç Ekimi": "DHI",
  "FUE Haartransplantation": "FUE", "DHI Haartransplantation": "DHI",
  "Haartransplantation": "HT", "Hair Transplant": "HT",
};

const TREAT_COLORS = {
  "FUE": "#4cc9ff",
  "DHI": "#a78bfa",
  "FUE Saphir": "#06b6d4",
  "Bart": "#f59e0b",
  "Augenbrauen": "#ec4899",
  "PRP": "#10b981",
  "Consultation": "#94a3b8",
  "Beratung": "#94a3b8",
};

const TREAT_REVENUE = {
  "FUE": 3500, "DHI": 4500, "FUE Saphir": 4000,
  "Bart": 3000, "Augenbrauen": 2500, "PRP": 800,
};

function tFb(t, key, fallback) {
  const val = t(key);
  return (val && val !== key) ? val : fallback;
}

function GoogleCalBanner({ isDoctor, clinic, showT }) {
  const [gStatus, setGStatus] = useState(null);
  useEffect(() => { fmApi.apiFetch("/api/v1/auth/google/status?orgId=" + (clinic?.id || "")).then(r => setGStatus(r)).catch(() => {}); }, [clinic?.id]);
  const connected = gStatus?.hasCalendar;
  if (!isDoctor) return null;
  return (<>
    <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, background: connected ? "rgba(16,185,129,0.03)" : "rgba(76,201,255,0.03)", border: `1px solid ${connected ? "rgba(16,185,129,0.1)" : "rgba(76,201,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 16 }}>{connected ? "✅" : "📅"}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: connected ? "rgba(16,185,129,0.8)" : "rgba(232,238,252,0.95)" }}>{connected ? (t("gcal_connected_label") || "Google Calendar connected") : (t("gcal_label") || "Google Calendar")}</div>
          <div style={{ fontSize: 10, color: "rgba(167,177,195,0.7)" }}>{connected ? (t("gcal_sync_active") || "Calendar sync active") : (t("gcal_sync_inactive") || "Connect Google Calendar")}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {connected && <button onClick={async () => {
          if (!window.confirm(t("gcal_disconnect_confirm") || "Really disconnect Google Calendar?")) return;
          try { await fmApi.apiFetch("/api/v1/auth/google/disconnect", { method: "DELETE" }); showT(t("gcal_disconnected") || "Google Calendar disconnected"); setGStatus(null); } catch { showT(t("gcal_disconnect_failed") || "Disconnect failed"); }
        }} style={{ padding: "5px 10px", borderRadius: 7, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)", color: "rgba(239,68,68,0.5)", fontWeight: 600, fontSize: 10, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("gcal_disconnect_btn") || "Disconnect"}</button>}
        {!connected && <button onClick={async () => {
          try { const url = await fmApi.getGoogleConnectUrlSafe(clinic?.id); if (url) window.location.href = url; else showT(t("not_available") || "Not available"); } catch { showT(t("connection_failed") || "Connection failed"); }
        }} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", color: "#4cc9ff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("gcal_connect_btn") || "Connect Google"}</button>}
      </div>
    </div>
  </>);
}

export default function AppointmentsPage() {
  const {
    myAppts, myLeads, calView, setCalView, calDate, setCalDate,
    selAppt, setSelAppt, showT, t, updateAppt, openPatient,
    userRole, user, clinic,
  } = useApp();
  const isDoctor = userRole === "doctor";

  // Closed days from clinic working hours
  const [clinicHours, setClinicHours] = useState(null);
  useEffect(() => {
    fmApi.apiFetch('/api/v1/clinic/settings').then(res => {
      try {
        const raw = res?.hours || res?.clinic?.hours;
        const wh = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (wh && typeof wh === 'object') setClinicHours(wh);
      } catch {}
    }).catch(() => {});
  }, []);
  const closedDays = useMemo(() => {
    if (!clinicHours) return [0, 6]; // default SA+SO
    const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const closed = [];
    for (const [key, dow] of Object.entries(dayMap)) {
      if (!clinicHours[key]) closed.push(dow);
    }
    return closed;
  }, [clinicHours]);

  const calRef = useRef(null);
  const [doctors, setDoctors] = useState([]);
  const [blockedDays, setBlockedDays] = useState([]);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [drawerAppt, setDrawerAppt] = useState(null);
  const [settingsDoctor, setSettingsDoctor] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRoomScheduler, setShowRoomScheduler] = useState(false);
  const tooltipTimeout = useRef(null);

  useEffect(() => {
    fmApi.getDoctors().then((docs) => {
      setDoctors(docs.map((s) => ({
        ...s,
        id: s.id,
        name: s.name || `${s.title ? s.title + " " : ""}${s.first_name || ""} ${s.last_name || ""}`.trim(),
        color: s.color || "#4cc9ff",
        workingHours: s.working_hours || null,
        working_hours: s.working_hours || null,
        treatments: s.treatment_types_allowed || s.treatments || null,
        treatment_types_allowed: s.treatment_types_allowed || null,
        rooms: s.rooms || null,
        fixedWorkDays: s.work_days || s.fixed_work_days || null,
        work_days: s.work_days || null,
        autoReview: s.auto_review_enabled || s.auto_review || false,
        maxReviewsPerDay: s.max_reviews_per_day || 10,
        vacations: s.vacations || [],
        max_surgeries_per_day: s.max_surgeries_per_day || 5,
        max_grafts_per_day: s.max_grafts_per_day || 8000,
        max_large_ops_per_day: s.max_large_ops_per_day || 2,
      })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fmApi.getBlockedDays().then((data) => {
      const arr = Array.isArray(data) ? data : Array.isArray(data?.blockedDays) ? data.blockedDays : Array.isArray(data?.blocked_days) ? data.blocked_days : [];
      setBlockedDays(arr);
    }).catch(() => {});
  }, []);

  // Auto-refresh appointments every 15s as WebSocket fallback
  useEffect(() => {
    const { fetchAppointments } = useAppointmentStore.getState();
    fetchAppointments();
    const iv = setInterval(() => fetchAppointments(), 15000);
    return () => clearInterval(iv);
  }, []);

  // Enrich appointments with patient data from pipeline
  // For doctor role: identify which doctor matches the logged-in user
  const myDoctorName = useMemo(() => {
    if (!isDoctor || !user) return null;
    const uName = (user.name || "").toLowerCase();
    const uEmail = (user.email || "").toLowerCase();
    return { uName, uEmail };
  }, [isDoctor, user]);

  const enrichedAppts = useMemo(() => {
    const leadMap = {};
    myLeads.forEach(l => { leadMap[l.id] = l; });
    let appts = myAppts.map(a => {
        const lead = leadMap[a.patientId || a.patient_id] || {};
        return {
          ...a,
          grafts: a.grafts || lead.reviewData?.grafts || lead.grafts || null,
          consentGiven: a.documents_signed || a.documentsSigned || lead.consentGiven || false,
          photosComplete: a.photos_complete || a.photosComplete || (lead.photoUrls || []).length >= 3 || lead.photos || false,
          reviewDone: !!lead.reviewData,
          depositPaid: a.depositPaid || a.deposit_paid || lead.depositPaid || lead.convStatus === "deposit_paid",
          patientStage: lead.stage,
          patientCountry: lead.country,
          clinicCountry: clinic?.country || "",
        };
      });
    // Doctor: filter to own appointments + unassigned (e.g. Google imports)
    if (isDoctor && myDoctorName) {
      appts = appts.filter(a => {
        const dn = (a.doctorName || a.doctor_name || a.doctor || "").toLowerCase();
        if (!dn) return true; // No doctor assigned (Google import, etc.) → show
        return dn.includes(myDoctorName.uName) || myDoctorName.uName.includes(dn) || dn === myDoctorName.uEmail;
      });
    }
    return appts;
  }, [myAppts, myLeads, isDoctor, myDoctorName]);

  const ACTIVE_STATUSES = ['pending','confirmed','booked','reserved','awaiting_deposit'];
  const activeAppts = useMemo(() => enrichedAppts.filter(a => ACTIVE_STATUSES.includes(a.status)), [enrichedAppts]);

  const allEvents = useMemo(
    () => mapAllEvents(activeAppts, blockedDays, doctors),
    [activeAppts, blockedDays, doctors]
  );

  const {
    selectedDoctorIds, filteredEvents: rawFilteredEvents,
    toggleDoctor, selectAll,
  } = useCalendarFilters(allEvents, isDoctor && user ? doctors.find(d => (d.email || '').toLowerCase() === (user.email || '').toLowerCase())?.id : null);

  // Apply search filter on top of doctor filter
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return rawFilteredEvents;
    const q = searchQuery.toLowerCase().trim();
    return rawFilteredEvents.filter(ev => {
      const props = ev.extendedProps || {};
      const patient = (props.appt?.patient || ev.title || "").toLowerCase();
      const treat = (props.appt?.treatment || "").toLowerCase();
      const doc = (props.doctorName || "").toLowerCase();
      return patient.includes(q) || treat.includes(q) || doc.includes(q);
    });
  }, [rawFilteredEvents, searchQuery]);

  const dayStats = useMemo(() => getDayStats(activeAppts), [activeAppts]);

  const [currentView, setCurrentView] = useState(calView || "month");
  const [currentDate, setCurrentDate] = useState(isDemoMode() ? getDemoDate() : (calDate || (myAppts.length > 0 ? new Date(myAppts[0].scheduledAt || myAppts[0].date || getNow()) : getNow())));

  useEffect(() => {
    if (calView && calView !== currentView) setCurrentView(calView);
  }, [calView]);

  const handleViewChange = useCallback((view) => {
    setCurrentView(view);
    setCalView(view);
    const api = calRef.current?.getApi();
    if (api) api.changeView(FC_VIEW_MAP[view] || "dayGridMonth");
  }, [setCalView]);

  const handleDatesSet = useCallback((arg) => {
    const d = arg.view.currentStart;
    setCurrentDate(d);
    setCalDate(d);
    const mapped = REVERSE_VIEW_MAP[arg.view.type];
    if (mapped && mapped !== currentView) setCurrentView(mapped);
  }, [setCalDate, currentView]);

  const handleEventClick = useCallback((info) => {
    const props = info.event.extendedProps;
    if (props.type === "appointment" && props.appt) {
      setDrawerAppt({
        ...props.appt,
        doctorColor: props.doctorColor,
        doctorName: props.doctorName,
        endTime: props.endTime,
      });
    }
  }, []);

  const handleEventDrop = useCallback((info) => {
    console.log("[DRAG] eventDrop fired, type:", info.event.extendedProps?.type, "id:", info.event.extendedProps?.appt?.id);
    const props = info.event.extendedProps;
    if (props.type !== "appointment") { console.log("[DRAG] reverted: type is", props.type); info.revert(); return; }
    const newStart = info.event.start;
    if (!newStart) { console.log("[DRAG] reverted: no start"); info.revert(); return; }
    const date = newStart.toISOString().slice(0, 10);
    const time = `${String(newStart.getHours()).padStart(2, "0")}:${String(newStart.getMinutes()).padStart(2, "0")}`;
    console.log("[DRAG] calling updateAppt:", props.appt.id, date, time);
    updateAppt(props.appt.id, { date, time });
    showT(t("appt_updated") || "Updated");
  }, [updateAppt, showT]);

  const handleEventResize = useCallback((info) => {
    const props = info.event.extendedProps;
    if (props.type !== "appointment") { info.revert(); return; }
    const end = info.event.end;
    if (!end) return;
    const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
    updateAppt(props.appt.id, { endTime });
  }, [updateAppt]);

  const handleEventMouseEnter = useCallback((info) => {
    const props = info.event.extendedProps;
    if (props.type !== "appointment") return;
    const rect = info.el.getBoundingClientRect();
    clearTimeout(tooltipTimeout.current);
    tooltipTimeout.current = setTimeout(() => {
      setTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        appt: props.appt,
        doctorName: props.doctorName,
        doctorColor: props.doctorColor,
        treatmentColor: props.treatmentColor,
        grafts: props.grafts,
        room: props.room,
        time: props.time,
        endTime: props.endTime,
        status: props.status,
      });
    }, 300);
  }, []);

  const handleEventMouseLeave = useCallback(() => {
    clearTimeout(tooltipTimeout.current);
    tooltipTimeout.current = setTimeout(() => setTooltip(null), 300);
  }, []);

  const handleConfirm = useCallback((id) => {
    updateAppt(id, { status: "confirmed" });
    showT(t("appt_confirmed") || "Confirmed");
    setDrawerAppt(null);
  }, [updateAppt, showT]);

  const handleComplete = useCallback((id) => {
    updateAppt(id, { status: "completed" });
    showT(t("appt_completed") || "Completed");
    setDrawerAppt(null);
  }, [updateAppt, showT]);

  const handleCancel = useCallback(async (id) => {
    await updateAppt(id, { status: "canceled" });
    showT(t("appt_cancelled") || "Storniert");
    setDrawerAppt(null);
    useAppointmentStore.getState().fetchAppointments();
  }, [updateAppt, showT]);

  const handleReschedule = useCallback((id, date, time) => {
    updateAppt(id, { date, time });
    showT(`${t("appt_rescheduled_to") || "Rescheduled to"} ${date} ${time}`);
    setDrawerAppt(null);
  }, [updateAppt, showT]);

  const handleArchive = useCallback(async (id) => {
    try {
      await updateAppt(id, { archived: true });
      showT(tFb(t, "cal_archived", "Ins Archiv verschoben"));
      setDrawerAppt(null);
      useAppointmentStore.getState().fetchAppointments();
    } catch {
      showT("Fehler");
    }
  }, [showT, t, updateAppt]);

  const handleSaveAppt = useCallback(async (data) => {
    const res = await fmApi.createAppointment(data);
    if (res?.error) return res;
    showT(tFb(t, "cal_appt_created", "Termin erstellt"));
    setDrawerAppt(null);
    useAppointmentStore.getState().fetchAppointments();
    return res;
  }, [showT, t]);

  const reloadBlockedDays = useCallback(async () => {
    const fresh = await fmApi.getBlockedDays();
    const arr = Array.isArray(fresh) ? fresh : Array.isArray(fresh?.blockedDays) ? fresh.blockedDays : Array.isArray(fresh?.blocked_days) ? fresh.blocked_days : [];
    setBlockedDays(arr);
    return arr;
  }, []);

  const handleBlockDaySave = useCallback(async (data) => {
    try {
      await fmApi.createBlockedDay(data);
      await reloadBlockedDays();
      showT(tFb(t, "cal_blocked_day", "Tag wurde geblockt"));
    } catch (e) {
      showT((e?.message || t("error_block_day")) || "Fehler beim Blockieren");
    }
  }, [showT, t, reloadBlockedDays]);

  const handleBlockDayDelete = useCallback(async (id) => {
    try {
      await fmApi.deleteBlockedDay(id);
      await reloadBlockedDays();
      showT(tFb(t, "cal_unblocked", "Blockierung aufgehoben"));
    } catch (e) {
      showT("Fehler beim Aufheben");
    }
  }, [showT, t, reloadBlockedDays]);

  const handleDoctorSettingsSave = useCallback(async (settings) => {
    try {
      await fmApi.updateDoctorSettings(settings);
      // Reload doctors to reflect saved changes
      const docs = await fmApi.getDoctors();
      setDoctors(docs.map((s) => ({
        ...s,
        id: s.id,
        name: s.name || `${s.title ? s.title + " " : ""}${s.first_name || ""} ${s.last_name || ""}`.trim(),
        color: s.color || "#4cc9ff",
        workingHours: s.working_hours || null,
        capacity: s.capacity || null,
        treatments: s.treatment_types_allowed || s.treatments || null,
        rooms: s.rooms || null,
        fixedWorkDays: s.work_days || s.fixed_work_days || null,
        autoReview: s.auto_review_enabled || s.auto_review || false,
        maxReviewsPerDay: s.max_reviews_per_day || 10,
        vacations: s.vacations || [],
        max_surgeries_per_day: s.max_surgeries_per_day || 5,
        max_grafts_per_day: s.max_grafts_per_day || 8000,
        max_large_ops_per_day: s.max_large_ops_per_day || 2,
        working_hours: s.working_hours || null,
        work_days: s.work_days || null,
        treatment_types_allowed: s.treatment_types_allowed || null,
      })));
      showT(t("settings_saved") || "Einstellungen gespeichert");
    } catch (e) {
      showT(t("error_save_settings"));
    }
    setSettingsDoctor(null);
  }, [showT]);

  const handleNewAppt = useCallback(() => {
    const today = getNow().toISOString().slice(0, 10);
    setDrawerAppt({
      id: null, patient: "", date: today, time: "09:00",
      treatment: "", status: "booked", isNew: true,
    });
  }, []);

  // Monthly summary stats
  const monthlyStats = useMemo(() => {
    const viewDate = currentDate || getNow();
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const monthAppts = activeAppts.filter(a => {
      if (!a.date) return false;
      const d = new Date(a.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const totalCount = monthAppts.length;
    const totalGrafts = monthAppts.reduce((s, a) => s + (Number(a.grafts) || 0), 0);
    const totalRevenue = monthAppts.reduce((s, a) => {
      if (a.price) return s + Number(a.price);
      return s + (TREAT_REVENUE[a.treatment] || 3000);
    }, 0);
    const confirmed = monthAppts.filter(a => a.status === "confirmed").length;
    const pending = monthAppts.filter(a => a.status === "pending" || a.status === "reserved").length;
    return { totalCount, totalGrafts, totalRevenue, confirmed, pending };
  }, [activeAppts, currentDate]);

  // Revenue per day for month cells
  const dayRevenue = useMemo(() => {
    const map = {};
    activeAppts.forEach(a => {
      if (!a.date) return;
      const rev = a.price ? Number(a.price) : (TREAT_REVENUE[a.treatment] || 0);
      map[a.date] = (map[a.date] || 0) + rev;
    });
    return map;
  }, [activeAppts]);

  const dayCellDidMount = useCallback((arg) => {
    const dd = arg.date;
    const dateStr = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
    const stats = dayStats[dateStr];
    const el = arg.el;
    // Color weekend day numbers
    if (closedDays.includes(dd.getDay())) {
      const numEl = el.querySelector('.fc-daygrid-day-number');
      if (numEl) numEl.style.color = 'rgba(255,80,80,0.6)';
    }
    // Add OP badge
    if (stats && stats.ops > 0) {
      const top = el.querySelector('.fc-daygrid-day-top');
      if (top && !top.querySelector('.fm-op-badge')) {
        const isBusy = stats.ops >= 4;
        const badge = document.createElement('span');
        badge.className = 'fm-op-badge';
        badge.style.cssText = `font-size:9px;font-weight:700;letter-spacing:0.02em;border-radius:4px;padding:1px 5px;margin-left:auto;color:${isBusy ? '#ef4444' : stats.ops >= 3 ? '#f59e0b' : 'rgba(167,177,195,0.6)'};background:${isBusy ? 'rgba(239,68,68,0.1)' : stats.ops >= 3 ? 'rgba(245,158,11,0.08)' : 'transparent'}`;
        badge.textContent = `${stats.ops} OP`;
        top.appendChild(badge);
      }
    }
    // Today highlight
    const now = getNow();
    const isToday = dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (isToday) {
      const numEl = el.querySelector('.fc-daygrid-day-number');
      if (numEl) {
        numEl.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#4cc9ff;color:#0a0e17;font-weight:800;font-size:12px';
      }
    }
  }, [dayStats, closedDays]);

  return (
    <div style={{ padding: "24px 28px", }}>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.03em",
            color: "rgba(232,238,252,0.95)",
          }}>
            {isDoctor ? (tFb(t, "my_calendar", "Mein Kalender")) : tFb(t, "appointments", "Termine")}
          </h1>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: 6,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#10b981", display: "inline-block",
              boxShadow: "0 0 6px rgba(16,185,129,0.4)",
              animation: "fmPulse 2s infinite",
            }} />
            <span style={{ fontSize: 12, color: "rgba(167,177,195,0.65)", fontWeight: 500 }}>
              {tFb(t, "synced_calendar", "Mit Kalender synchronisiert")}
            </span>
          </div>
        </div>

        {/* ── KPI Pills ── */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <KpiPill label={t("appt_appointments") || "Termine"} value={monthlyStats.totalCount} color="#4cc9ff" />
          <KpiPill label={t("grafts_label_ui")} value={monthlyStats.totalGrafts > 0 ? `${(monthlyStats.totalGrafts / 1000).toFixed(1)}k` : "0"} color="#10b981" />
          {!isDoctor && <KpiPill label={t("appt_revenue") || "Umsatz"} value={`€${(monthlyStats.totalRevenue / 1000).toFixed(0)}k`} color="#a78bfa" />}
          <KpiPill label={t("confirmed_label") || "Bestätigt"} value={monthlyStats.confirmed} color="#10b981" />
          <KpiPill label={t("appt_open") || "Offen"} value={monthlyStats.pending} color="#ff8a2a" />
        </div>
      </div>

      {/* ── Search bar (hidden for doctor role) ── */}
      {!isDoctor && <div style={{ marginBottom: 14 }}>
        <div style={{ position: "relative", maxWidth: 260 }}>
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 14, color: "rgba(167,177,195,0.7)", pointerEvents: "none",
          }}>&#x1F50D;</span>
          <input
            type="text"
            placeholder={t("appt_search") || "Termin suchen..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(232,238,252,0.85)", fontSize: 12, fontWeight: 500,
              fontFamily: "inherit", outline: "none",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) => e.target.style.borderColor = "rgba(76,201,255,0.3)"}
            onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.06)"}
          />
        </div>
      </div>}

      {/* ── Google Calendar Banner (Doctor: personal info only) ── */}
      {isDoctor && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>📅</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(232,238,252,0.95)" }}>{t("doc_personal_calendar") || "Persönlicher Kalender"}</div>
            <div style={{ fontSize: 10, color: "rgba(167,177,195,0.7)" }}>{t("doc_personal_calendar_desc") || "Deine Termine und OP-Blöcke. Urlaub und Blocker werden vom Admin verwaltet."}</div>
          </div>
        </div>
      )}

      {/* ── Doctor Filter (hidden for doctor role) ── */}
      {!isDoctor && <DoctorFilter
        doctors={doctors}
        selectedDoctorIds={selectedDoctorIds}
        onToggle={toggleDoctor}
        onSelectAll={selectAll}
        onDoctorSettings={setSettingsDoctor}
        appointments={myAppts}
        t={t}
      />}

      {/* ── Calendar Toolbar ── */}
      <CalendarToolbar
        calendarRef={calRef}
        currentDate={currentDate}
        currentView={currentView}
        onViewChange={handleViewChange}
        onBlockDay={isDoctor ? null : () => setShowBlockModal(true)}
        onNewAppt={isDoctor ? null : handleNewAppt}
        t={t}
      />

      {/* ── Daily Summary Bar (day view) ── */}
      {currentView === "day" && (() => {
        const dateStr = (currentDate || getNow()).toISOString().slice(0, 10);
        const ds = dayStats[dateStr];
        if (!ds || ds.ops === 0) return null;
        const dateObj = new Date(dateStr + "T12:00:00");
        const dateLabel = dateObj.toLocaleDateString(fmLocale(), { weekday: "long", day: "numeric", month: "long" });
        return (
          <div style={{
            display: "flex", alignItems: "center", gap: 16, padding: "10px 16px",
            marginBottom: 12, borderRadius: 10,
            background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.08)",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(232,238,252,0.85)" }}>{dateLabel}</span>
            <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
            <DayStat label={t("appt_ops") || "OPs"} value={ds.ops} color="#4cc9ff" />
            {ds.grafts > 0 && <DayStat label={t("grafts_label_ui")} value={ds.grafts.toLocaleString()} color="#10b981" />}
            <DayStat label={ds.doctors.length === 1 ? (t("doctor_singular")||"Arzt") : (t("doctors_plural")||"Ärzte")} value={ds.doctors.length} color="#a78bfa" />
          </div>
        );
      })()}

      {/* ── Room Scheduler (day view only) ── */}
      {currentView === "day" && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setShowRoomScheduler(prev => !prev)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
            borderRadius: 8, background: showRoomScheduler ? "rgba(167,107,255,0.08)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${showRoomScheduler ? "rgba(167,107,255,0.2)" : "rgba(255,255,255,0.06)"}`,
            color: showRoomScheduler ? "#a78bfa" : "rgba(167,177,195,0.6)",
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.2s ease",
          }}>
            <span style={{ transform: showRoomScheduler ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: 10 }}>▶</span>
            {t("op_rooms_label") || "OP-Räume"}
          </button>
          {showRoomScheduler && (
            <div style={{ marginTop: 8, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", padding: 16 }}>
              <RoomScheduler appointments={myAppts} doctors={doctors} date={currentDate} onAssignRoom={(apptId, roomId) => updateAppt(apptId, { room: roomId })} showT={showT} />
            </div>
          )}
        </div>
      )}

      {/* ── Week Summary Bar ── */}
      {currentView === "week" && (() => {
        const start = currentDate || getNow();
        let weekOps = 0, weekGrafts = 0, weekRevenue = 0;
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          const ds = d.toISOString().slice(0, 10);
          const s = dayStats[ds];
          if (s) { weekOps += s.ops; weekGrafts += s.grafts; }
          weekRevenue += (dayRevenue[ds] || 0);
        }
        if (weekOps === 0) return null;
        return (
          <div style={{
            display: "flex", alignItems: "center", gap: 16, padding: "8px 16px",
            marginBottom: 12, borderRadius: 10,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)" }}>Woche</span>
            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.06)" }} />
            <DayStat label={t("appt_ops") || "OPs"} value={weekOps} color="#4cc9ff" />
            {weekGrafts > 0 && <DayStat label={t("grafts_label_ui")} value={weekGrafts.toLocaleString()} color="#10b981" />}
            {weekRevenue > 0 && <DayStat label="" value={`€${(weekRevenue / 1000).toFixed(0)}k`} color="#a78bfa" />}
          </div>
        );
      })()}

      {/* ── Empty state when no appointments ── */}
      {myAppts.length === 0 && (
        <HintBox id="appointments_empty">{t("hint_appointments_empty")}</HintBox>
      )}

      {/* ── Calendar ── */}
      <div className="fm-calendar-wrap" style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)" }}>
        <style>{calendarStyles}</style>
        <FullCalendar
          key={`cal-${blockedDays.length}-${activeAppts.length}`}
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={FC_VIEW_MAP[currentView] || "dayGridMonth"}
          initialDate={currentDate}
          headerToolbar={false}
          footerToolbar={false}
          events={filteredEvents}
          locale={fmLocale()}
          firstDay={1}
          weekends={true}
          height="auto"
          editable={true}
          droppable={true}
          eventStartEditable={true}
          eventDurationEditable={true}
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          slotDuration="00:30:00"
          allDaySlot={true}
          nowIndicator={true}
          now={isDemoMode() ? getDemoDate() : undefined}
          dayMaxEvents={3}
          businessHours={{ daysOfWeek: [0,1,2,3,4,5,6].filter(d => !closedDays.includes(d)), startTime: "08:00", endTime: "18:00" }}
          dayCellClassNames={(arg) => {
            const dow = arg.date.getDay();
            if (closedDays.includes(dow)) return ["fm-closed-day"];
            const dateStr = `${arg.date.getFullYear()}-${String(arg.date.getMonth()+1).padStart(2,"0")}-${String(arg.date.getDate()).padStart(2,"0")}`;
            const isBlocked = blockedDays.some(bd => (bd.date || bd.blocked_date || '').slice(0, 10) === dateStr);
            if (isBlocked) return ["fm-blocked-day"];
            const dayApptCount = activeAppts.filter(a => a.date === dateStr).length;
            if (dayApptCount === 0 && arg.date >= new Date(getNow().setHours(0,0,0,0))) return ["fm-free-day"];
            if (dayApptCount >= 4) return ["fm-full-day"];
            return [];
          }}
          moreLinkContent={(arg) => (
            <span style={{
              fontSize: 10, fontWeight: 700, color: "rgba(76,201,255,0.7)",
              padding: "2px 6px", borderRadius: 4,
              background: "rgba(76,201,255,0.06)",
            }}>
              +{arg.num} weitere
            </span>
          )}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventMouseEnter={handleEventMouseEnter}
          eventMouseLeave={handleEventMouseLeave}
          datesSet={handleDatesSet}
          eventContent={renderEventContent}
          dayCellDidMount={currentView === "month" ? dayCellDidMount : undefined}
        />
      </div>

      {/* ── Tooltip ── */}
      {tooltip && <EventTooltip {...tooltip} t={t} doctors={doctors} allAppts={enrichedAppts} clinic={clinic} updateAppt={updateAppt} tooltipTimeout={tooltipTimeout} setTooltip={setTooltip} />}

      {/* ── Drawer ── */}
      {drawerAppt && (
        <AppointmentDrawer
          appt={drawerAppt}
          onClose={() => setDrawerAppt(null)}
          onConfirm={handleConfirm}
          onComplete={handleComplete}
          onCancel={handleCancel}
          onReschedule={handleReschedule}
          onSave={handleSaveAppt}
          onArchive={handleArchive}
          doctors={doctors}
          patients={myLeads}
          t={t}
        />
      )}

      {showBlockModal && (
        <BlockDayModal
          doctors={doctors}
          blockedDays={blockedDays}
          onSave={handleBlockDaySave}
          onDelete={handleBlockDayDelete}
          onClose={() => setShowBlockModal(false)}
          t={t}
        />
      )}

      {settingsDoctor && (
        <DoctorSettingsModal
          doctor={settingsDoctor}
          onClose={() => setSettingsDoctor(null)}
          onSave={handleDoctorSettingsSave}
          t={t}
          todayBookings={(() => {
            const today = getNow().toISOString().slice(0, 10);
            const docId = settingsDoctor.id;
            const todayAppts = myAppts.filter(a => a.date === today && (a.doctorId === docId || a.doctor_id === docId || a.staffId === docId || a.staff_id === docId));
            return {
              ops: todayAppts.length,
              grafts: todayAppts.reduce((s, a) => s + (Number(a.grafts) || 0), 0),
            };
          })()}
        />
      )}

      {/* Pulse animation */}
      <style>{`@keyframes fmPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

/* ─── KPI Pill ─── */
function KpiPill({ label, value, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "5px 12px", borderRadius: 8,
      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(167,177,195,0.65)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: "-0.02em" }}>
        {value}
      </span>
    </div>
  );
}

/* ─── Day Stat (inline) ─── */
function DayStat({ label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 14, fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(167,177,195,0.7)" }}>{label}</span>
    </div>
  );
}

/* ─── Status Legend ─── */
function StatusLegend() {
  const items = [
    { label: APPT_C.reserved.l, color: APPT_C.reserved.c },
    { label: APPT_C.pending.l, color: APPT_C.pending.c },
    { label: APPT_C.confirmed.l, color: APPT_C.confirmed.c },
    { label: APPT_C.completed.l, color: APPT_C.completed.c },
    { label: APPT_C.cancelled.l, color: APPT_C.cancelled.c },
    { label: APPT_C.no_show.l, color: APPT_C.no_show.c },
  ];
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "default" }}>
          <span style={{
            display: "inline-block", width: 7, height: 7, borderRadius: "50%",
            background: item.color, opacity: 0.85,
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(167,177,195,0.7)", letterSpacing: "0.01em" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Event Content Renderer ─── */
function renderEventContent(eventInfo) {
  const { event, view } = eventInfo;
  const props = event.extendedProps;

  if (props.type === "blocked") return null;

  const isTimeGrid = view.type.startsWith("timeGrid");
  const treatColor = props.treatmentColor || "rgba(167,177,195,0.7)";
  const statusColor = APPT_C[props.status]?.c || "#4cc9ff";
  const abbr = TREAT_ABBR[(props.appt?.treatment || "")] || (props.appt?.treatment || "").slice(0, 3).toUpperCase();
  const revenue = props.appt?.price || TREAT_REVENUE[props.appt?.treatment] || null;

  if (isTimeGrid) {
    return (
      <div style={{
        padding: "5px 10px", fontSize: 11, fontWeight: 600,
        overflow: "hidden", lineHeight: 1.45, height: "100%",
        display: "flex", flexDirection: "column", gap: 2,
        borderLeft: `3px solid ${(props.status === 'canceled' || props.status === 'cancelled') ? '#ef4444' : (props.doctorColor || treatColor)}`,
        marginLeft: -1, background: "rgba(0,0,0,0.15)", borderRadius: "0 6px 6px 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 11, color: "rgba(232,238,252,0.9)" }}>{props.time}</span>
          {props.endTime && <span style={{ opacity: 0.35, fontSize: 10 }}>{props.endTime}</span>}
          <span style={{
            marginLeft: "auto", fontSize: 8, fontWeight: 700, color: statusColor,
            background: `${statusColor}15`, borderRadius: 3, padding: "1px 5px",
          }}>
            {APPT_C[props.status]?.l || props.status}
          </span>
        </div>
        <div style={{ fontWeight: 800, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "rgba(232,238,252,0.95)" }}>
          {event.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 9, fontWeight: 800, color: treatColor,
            background: `${treatColor}12`, borderRadius: 3, padding: "1px 5px",
            letterSpacing: 0.5, textTransform: "uppercase",
          }}>
            {abbr}
          </span>
          {props.grafts && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(167,177,195,0.75)" }}>
              {(Number(props.grafts) / 1000).toFixed(1)}k Grafts
            </span>
          )}
          {props.patientCountry && props.clinicCountry && props.patientCountry.toLowerCase() === props.clinicCountry.toLowerCase() && (
            <span style={{ fontSize: 8, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.12)", borderRadius: 3, padding: "1px 5px", border: "1px solid rgba(16,185,129,0.2)" }}>LOKAL</span>
          )}
          {props.room && (
            <span style={{
              fontSize: 8, fontWeight: 700, color: "rgba(167,177,195,0.6)",
              background: "rgba(167,177,195,0.08)", borderRadius: 3, padding: "1px 5px",
            }}>
              {props.room}
            </span>
          )}
        </div>
        {props.doctorName && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "auto" }}>
            <span style={{
              display: "inline-block", width: 5, height: 5, borderRadius: "50%",
              background: props.doctorColor || "#4cc9ff", flexShrink: 0,
            }} />
            <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(167,177,195,0.6)" }}>
              {props.doctorName}
            </span>
          </div>
        )}
      </div>
    );
  }

  // ── Month view: mini-card ──
  const isReserved = props.status === "reserved";
  const procColor = TREAT_COLORS[props.appt?.treatment] || treatColor;
  const graftStr = props.grafts ? `${(Number(props.grafts) / 1000).toFixed(1)}k` : null;
  const revenueStr = revenue ? (revenue >= 1000 ? `€${(revenue / 1000).toFixed(0)}k` : `€${revenue}`) : null;

  return (
    <div style={{
      padding: "3px 8px 3px 0", fontSize: 11, fontWeight: 600,
      overflow: "hidden", lineHeight: 1.35,
      display: "flex", alignItems: "stretch", gap: 0,
      borderRadius: 5, cursor: "pointer",
      opacity: isReserved ? 0.7 : 1,
      borderStyle: isReserved ? "dashed" : "none",
      borderWidth: isReserved ? 1 : 0,
      borderColor: isReserved ? "rgba(251,191,36,0.3)" : "transparent",
    }}>
      {/* Color stripe — amber for reserved, normal for confirmed */}
      <div style={{
        width: 3, minHeight: "100%", borderRadius: 2,
        background: (props.status === 'canceled' || props.status === 'cancelled') ? '#ef4444' : isReserved ? "#fbbf24" : (props.doctorColor || procColor), flexShrink: 0,
        marginRight: 6,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: Time + Patient */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          <span style={{ fontWeight: 700, fontSize: 10, color: "rgba(167,177,195,0.75)", flexShrink: 0 }}>{props.time}</span>
          <span style={{ fontWeight: 700, fontSize: 11, color: "rgba(232,238,252,0.9)", overflow: "hidden", textOverflow: "ellipsis" }}>
            {event.title}
          </span>
        </div>
        {/* Row 2: Treatment + Grafts + Revenue */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, color: procColor, letterSpacing: 0.3, flexShrink: 0,
          }}>
            {abbr}
          </span>
          {graftStr && (
            <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(167,177,195,0.75)" }}>
              {graftStr}
            </span>
          )}
          {props.durationMinutes && (
            <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(167,177,195,0.65)" }}>
              • {Math.floor(props.durationMinutes / 60)}h
            </span>
          )}
          {revenueStr && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: "rgba(167,139,250,0.55)",
              marginLeft: "auto", flexShrink: 0,
            }}>
              {revenueStr}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Premium Tooltip ─── */
function EventTooltip({ x, y, appt, doctorName, doctorColor, treatmentColor, grafts, room, time, endTime, status, t, doctors, allAppts, clinic, updateAppt, tooltipTimeout, setTooltip }) {
  const sc = APPT_C[status] || APPT_C.booked;
  const revenue = appt?.price || TREAT_REVENUE[appt?.treatment] || null;
  const procColor = TREAT_COLORS[appt?.treatment] || treatmentColor || "rgba(167,177,195,0.7)";

  // Preparation status — always show if appointment has any prep fields or grafts
  const prep = useMemo(() => {
    if (!appt) return null;
    // Show prep for surgical appointments (ones with grafts or treatment types)
    const isSurgical = appt.grafts || appt.estimated_grafts || ["FUE", "DHI", "FUE Saphir", "Bart", "Augenbrauen"].includes(appt.treatment);
    if (!isSurgical) return null;
    const depositActive = clinic?.booking_funnel !== 'no_deposit' && clinic?.deposit_enabled !== false && clinic?.depositEnabled !== false;
    const items = [
      { label: t("appt_dsgvo") || "DSGVO", done: !!appt.consentGiven, field: "documents_signed" },
      { label: t("op_photos") || "Fotos", done: !!appt.photos_complete || !!appt.photosComplete, field: "photos_complete" },
    ];
    if (depositActive) items.push({ label: t("op_deposit") || "Anzahlung", done: !!appt.deposit_paid || !!appt.depositPaid, field: "deposit_paid" });
    items.push(
      { label: t("appt_flight") || "Flug", done: !!appt.flight_received || !!appt.flightReceived, field: "flight_received" },
      { label: t("appt_driver_short") || "Fahrer", done: !!appt.driver_assigned || !!appt.driverAssigned, field: "driver_assigned" },
      { label: t("appt_hotel_short") || "Hotel", done: !!appt.hotel_booked || !!appt.hotelBooked, field: "hotel_booked" },
    );
    return items;
  }, [appt]);

  // Day breakdown
  const dayBreakdown = useMemo(() => {
    if (!appt?.date || !allAppts) return null;
    const dateStr = appt.date;
    const dayAppts = allAppts.filter(a => a.date === dateStr);
    const dayGrafts = dayAppts.reduce((s, a) => s + (Number(a.grafts) || 0), 0);
    const dayRevenue = dayAppts.reduce((s, a) => {
      if (a.price) return s + Number(a.price);
      return s + (TREAT_REVENUE[a.treatment] || 3000);
    }, 0);
    const docCounts = {};
    dayAppts.forEach(a => {
      const did = a.doctorId || a.doctor_id || a.staffId || a.staff_id;
      if (did) docCounts[did] = (docCounts[did] || 0) + 1;
    });
    const docLines = (doctors || []).filter(d => docCounts[d.id]).map(d => ({
      name: d.name, count: docCounts[d.id],
      capacity: d.max_surgeries_per_day || d.capacity || 5,
      color: d.color,
    }));
    return { dayGrafts, dayRevenue, docLines, totalOps: dayAppts.length };
  }, [appt?.date, allAppts, doctors]);

  // Position: ensure tooltip stays in viewport
  const adjustedY = y < 200 ? y + 60 : y;
  const transform = y < 200 ? "translate(-50%, 0)" : "translate(-50%, -100%)";

  const prepDone = prep ? prep.filter(p => p.done).length : 0;
  const prepTotal = prep ? prep.length : 0;
  const prepColor = !prep ? null : prepDone === prepTotal ? "#10b981" : prepDone >= prepTotal * 0.5 ? "#f59e0b" : "#ef4444";
  const graftFormatted = grafts ? Number(grafts).toLocaleString("de-DE") : null;

  return (
    <div onMouseEnter={() => clearTimeout(tooltipTimeout?.current)} onMouseLeave={() => { if (tooltipTimeout?.current !== undefined) { tooltipTimeout.current = setTimeout(() => setTooltip?.(null), 300); }}} style={{
      position: "fixed", left: x, top: adjustedY, transform,
      background: "#111827",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: 0, fontSize: 12, color: "#e8eefc",
      lineHeight: 1.5, zIndex: 10000,
      boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)",
      maxWidth: 300, minWidth: 240, pointerEvents: "auto", overflow: "hidden",
    }}>
      {/* ── Header: Patient + Status ── */}
      <div style={{
        padding: "14px 16px 12px",
        background: `linear-gradient(135deg, ${procColor}06, transparent)`,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {appt?.patient || "Patient"}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, color: sc.c, flexShrink: 0,
            background: `${sc.c}14`, borderRadius: 5, padding: "3px 8px",
            letterSpacing: "0.02em", textTransform: "uppercase",
          }}>
            {sc.l}
          </span>
        </div>
      </div>

      {/* ── Procedure ── */}
      {appt?.treatment && (
        <div style={{
          padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{
            width: 3, height: 16, borderRadius: 2, background: procColor,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: procColor }}>{appt.treatment}</span>
        </div>
      )}

      {/* ── Details grid ── */}
      <div style={{ padding: "10px 16px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
          {/* Time */}
          {time && (
            <DetailCell label={t("appt_time") || "Zeit"} value={`${time}${endTime ? ` \u2013 ${endTime}` : ""}`} />
          )}
          {/* Doctor */}
          {doctorName && (
            <DetailCell label={t("appt_doctor") || "Arzt"}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: doctorColor || "#4cc9ff", flexShrink: 0,
                }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(232,238,252,0.9)" }}>{doctorName}</span>
              </div>
            </DetailCell>
          )}
          {/* Grafts */}
          {graftFormatted && (
            <DetailCell label={t("grafts_label_ui")} value={graftFormatted} valueColor="#10b981" bold />
          )}
          {/* Room */}
          {room && (
            <DetailCell label={t("appt_room") || "Raum"} value={room} valueColor="#4cc9ff" />
          )}
        </div>
      </div>

      {/* ── Preparation Status ── */}
      {prep && (
        <div style={{
          padding: "10px 16px 12px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.01)",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 8,
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, color: "rgba(167,177,195,0.6)",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {t("preparation") || "Vorbereitung"}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 800, color: prepColor,
            }}>
              {prepDone}/{prepTotal}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>
            {prep.map(p => (
              <div key={p.label} onClick={(e) => { e.stopPropagation(); if (p.field && appt?.id) { updateAppt(appt.id, { [p.field]: !p.done }); } }} style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 11,
                padding: "3px 0", cursor: p.field ? "pointer" : "default",
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 4,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: p.done ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
                  color: p.done ? "#10b981" : "#ef4444",
                  fontSize: 10, fontWeight: 800, flexShrink: 0,
                }}>
                  {p.done ? "\u2713" : "\u2717"}
                </span>
                <span style={{
                  fontWeight: 600,
                  color: p.done ? "rgba(232,238,252,0.9)" : "rgba(239,68,68,0.6)",
                }}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Daily Doctor Overview ── */}
      {dayBreakdown && dayBreakdown.totalOps > 1 && (
        <div style={{
          padding: "10px 16px 12px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: "rgba(167,177,195,0.75)",
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
          }}>
            {t("day_overview_label") || "Tagesübersicht"}
          </div>
          {dayBreakdown.docLines.map(dl => (
            <div key={dl.name} style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 11,
              marginBottom: 3,
            }}>
              <span style={{
                display: "inline-block", width: 5, height: 5, borderRadius: "50%",
                background: dl.color, flexShrink: 0,
              }} />
              <span style={{ fontWeight: 600, flex: 1, color: "rgba(232,238,252,0.9)" }}>{dl.name}</span>
              <span style={{
                fontWeight: 700, fontSize: 10,
                color: dl.count >= dl.capacity ? "#ef4444" : dl.count >= dl.capacity * 0.8 ? "#f59e0b" : "rgba(167,177,195,0.65)",
              }}>
                {dl.count}/{dl.capacity}
              </span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10, fontWeight: 700 }}>
            {dayBreakdown.dayGrafts > 0 && <span style={{ color: "#10b981" }}>{dayBreakdown.dayGrafts.toLocaleString("de-DE")} Grafts</span>}
            <span style={{ color: "#a78bfa" }}>€{dayBreakdown.dayRevenue.toLocaleString("de-DE")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tooltip Detail Cell ─── */
function DetailCell({ label, value, valueColor, bold, children }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(167,177,195,0.75)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
        {label}
      </div>
      {children || (
        <div style={{ fontSize: 12, fontWeight: bold ? 700 : 600, color: valueColor || "rgba(232,238,252,0.9)" }}>
          {value}
        </div>
      )}
    </div>
  );
}

/* ─── Calendar CSS ─── */
const calendarStyles = `
.fm-closed-day { border: 1.5px solid rgba(255,80,80,0.2) !important; background: transparent !important; }
.fm-closed-day .fc-daygrid-day-number { color: rgba(255,80,80,0.5) !important; }
.fm-calendar-wrap .fc .fc-daygrid-day-top { flex-direction: row !important; justify-content: space-between !important; align-items: center; }
.fm-blocked-day { border: 2px solid rgba(239,68,68,0.4) !important; background: rgba(239,68,68,0.02) !important; }
.fm-blocked-day .fc-daygrid-day-number { color: rgba(239,68,68,0.5) !important; }
.fm-full-day { background: rgba(255,255,255,0.01) !important; opacity: 0.7; }
.fm-calendar-wrap {
  --fc-border-color: rgba(255,255,255,0.04);
  --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: rgba(255,255,255,0.015);
  --fc-non-business-color: transparent;
  --fc-list-event-hover-bg-color: rgba(255,255,255,0.03);
  --fc-today-bg-color: rgba(76,201,255,0.03);
  --fc-now-indicator-color: #4cc9ff;
  --fc-event-border-color: transparent;
}
.fm-calendar-wrap .fc {
  font-family: inherit;
  color: rgba(232,238,252,0.85);
}
.fm-calendar-wrap .fc .fc-col-header-cell {
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.fm-calendar-wrap .fc .fc-col-header-cell-cushion {
  color: rgba(167,177,195,0.65);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 10px 0;
  text-decoration: none;
}
.fm-calendar-wrap .fc .fc-daygrid-day {
  min-height: 110px;
  transition: background 0.15s ease;
}
.fm-calendar-wrap .fc .fc-daygrid-day:hover {
  background: rgba(255,255,255,0.02) !important;
}
.fm-calendar-wrap .fc .fc-daygrid-day-top {
  flex-direction: row-reverse;
  justify-content: space-between;
  align-items: center;
}
.fm-calendar-wrap .fc .fc-daygrid-day-number {
  color: rgba(232,238,252,0.9);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  padding: 6px 8px;
}
.fm-calendar-wrap .fc .fc-day-today .fc-daygrid-day-number {
  color: #4cc9ff;
  font-weight: 800;
}
.fm-calendar-wrap .fc .fc-day-today {
  background: rgba(76,201,255,0.03) !important;
  box-shadow: inset 0 0 0 1px rgba(76,201,255,0.08);
}
.fm-calendar-wrap .fc .fc-daygrid-day-frame {
  cursor: pointer;
}
.fm-calendar-wrap .fc .fc-event {
  border-radius: 5px;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.15s ease;
  margin-bottom: 1px;
  background: rgba(255,255,255,0.03);
}
.fm-calendar-wrap .fc .fc-event:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  background: rgba(255,255,255,0.05);
}
.fm-calendar-wrap .fc .fc-timegrid-slot {
  height: 48px;
}
.fm-calendar-wrap .fc .fc-timegrid-slot-label-cushion {
  color: rgba(167,177,195,0.65);
  font-size: 11px;
  font-weight: 600;
}
.fm-calendar-wrap .fc .fc-timegrid-event {
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.04);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.fm-calendar-wrap .fc .fc-timegrid-event:hover {
  background: rgba(255,255,255,0.06);
}
.fm-calendar-wrap .fc .fc-more-link {
  font-size: 10px;
  font-weight: 700;
}
.fm-calendar-wrap .fc .fc-daygrid-more-link {
  text-decoration: none;
}
.fm-calendar-wrap .fc .fc-day-other .fc-daygrid-day-number {
  opacity: 0.25;
}
.fm-calendar-wrap .fc .fc-scrollgrid {
  border: none;
}
.fm-calendar-wrap .fc .fc-scrollgrid td,
.fm-calendar-wrap .fc .fc-scrollgrid th {
  border-color: rgba(255,255,255,0.035);
}
.fm-calendar-wrap .fc .fc-timegrid-now-indicator-line {
  border-color: #4cc9ff;
  border-width: 2px;
}
.fm-calendar-wrap .fc .fc-timegrid-now-indicator-arrow {
  border-color: #4cc9ff;
  border-top-color: transparent;
  border-bottom-color: transparent;
}
.fm-calendar-wrap .fc .fc-daygrid-event-harness {
  margin: 0 2px 1px;
}
`;
