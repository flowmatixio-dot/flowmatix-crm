import React, { useMemo, useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useInboxStore, usePatientStore } from "../../stores";
import { apiFetch } from "../../api/client";
import { getNowMs } from "../../utils/demoTime";
import { TASK_COLORS, getTaskGroups, getTimeBadgeColor } from "../../data/badgeColors";
import { getAvatarGradient, getInitials } from "../shared/index";

function tFb(t, key, fallback) { const val = t(key); return (val && val !== key) ? val : fallback; }

/* ── HTML escape for safe innerHTML ── */
function escHtml(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ── Time formatter (matches v71 Or()) ── */
function formatWaiting(t) {
  if (!t) return "—";
  const mins = Math.floor((getNowMs() - new Date(t).getTime()) / 60000);
  if (mins < 60) return `\u23F1 ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `\u23F1 ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `\u23F1 ${days}d`;
  const weeks = Math.floor(days / 7);
  return `\u23F1 ${weeks}w`;
}

export default function ActionNeededView() {
  /* Inject CSS for show-all toggle (matches v71 data-fi approach) */
  if (!document.getElementById("fm-an-css")) {
    const ss = document.createElement("style");
    ss.id = "fm-an-css";
    ss.textContent =
      "body:not([data-fmx]) [data-fi]{display:none!important}" +
      "body:not([data-fmx]) [data-fi=\"0\"],body:not([data-fmx]) [data-fi=\"1\"]," +
      "body:not([data-fmx]) [data-fi=\"2\"],body:not([data-fmx]) [data-fi=\"3\"]," +
      "body:not([data-fmx]) [data-fi=\"4\"],body:not([data-fmx]) [data-fi=\"5\"]," +
      "body:not([data-fmx]) [data-fi=\"6\"],body:not([data-fmx]) [data-fi=\"7\"]," +
      "body:not([data-fmx]) [data-fi=\"8\"],body:not([data-fmx]) [data-fi=\"9\"]" +
      "{display:flex!important}";
    document.head.appendChild(ss);
  }

  const [collapsed, setCollapsed] = useState({});
  const { myLeads, myAppts, openPatient, setView, showT, t, activeClinicId, clinic } = useApp();
  const { msgs, setSelChat } = useInboxStore();

  const clinicId = activeClinicId || myLeads[0]?.clinic || null;

  /* Navigate to inbox chat for a patient */
  const goToChat = (leadId) => {
    const chat = (msgs[clinicId] || []).find(m => m.leadId === leadId || m.patientId === leadId);
    if (chat) setSelChat(chat);
    else setSelChat({ leadId, patientId: leadId });
    setView("inbox");
  };

  /* ── Build task list (exactly 5 types from v71) ── */
  const tasks = useMemo(() => {
    const items = [];

    myLeads.forEach(p => {
      const lg = p.logistics || {};
      const isLocal = !!(p.metadata?.noTransferNeeded || p.metadata?.noFlightNeeded);

      /* 0. Cancellation — patient cancelled recently */
      if (p.stage === "cancelled" && p.updatedAt) {
        const daysSince = (getNowMs() - new Date(p.updatedAt).getTime()) / 86400000;
        if (daysSince <= 7) {
          items.push({
            id: "cancel_" + p.id,
            type: "cancel",
            icon: "\u274C",
            color: "#ef4444",
            title: t("action_cancelled") || "Termin storniert",
            desc: (p.name || "Patient") + " " + (t("action_cancelled_desc") || "hat den Termin storniert"),
            patient: p.name, patientId: p.id,
            time: p.updatedAt,
            action: () => openPatient(p.id),
            actionLabel: t("action_open_patient") || "Patient öffnen",
          });
        }
      }

      /* 1. Chat takeover */
      if (p.convStatus === "human_takeover") {
        items.push({
          id: "chat_" + p.id,
          type: "chat",
          icon: "\u{1F4AC}",
          color: "#ef4444",
          title: t("chat_takeover_required") || "Chat-Übernahme erforderlich",
          desc: "\u26A0 " + (t("chat_takeover_desc") || "KI-Automatik gestoppt — Patient wartet auf menschliche Antwort"),
          patient: p.name, patientId: p.id,
          time: p.updatedAt || p.lastAiInteraction || p.createdAt,
          action: () => goToChat(p.id),
          actionLabel: t("open_chat") || "Chat öffnen",
        });
      }

      /* 2. DSGVO consent — immediate task if photos exist without consent */
      const consentRefused = p.metadata?.gdpr_consent === 'refused' || p.consent?.refused;
      if (consentRefused && !p.consentGiven) {
        items.push({
          id: "dsgvo_" + p.id,
          type: "dsgvo",
          icon: "\u{1F4CB}",
          color: "rgba(167,177,195,0.75)",
          title: t("action_dsgvo_missing") || "DSGVO Zustimmung fehlt",
          desc: t("action_dsgvo_desc") || "Patient hat Fotos gesendet — Einwilligung muss eingeholt werden",
          subtle: true,
          patient: p.name, patientId: p.id,
          time: p.lastAiInteraction || p.createdAt,
          action: () => {
            apiFetch(`/api/v1/crm/patients/${p.id}`, { method: "PATCH", body: JSON.stringify({ consent_given: true }) }).then(() => {
              usePatientStore.getState().fetchPatients();
              showT("DSGVO manuell erteilt");
            }).catch(() => showT("Fehler"));
          },
          actionLabel: "Manuell erteilen",
          dismissable: true,
          onDismiss: () => {
            apiFetch(`/api/v1/crm/patients/${p.id}`, { method: "PATCH", body: JSON.stringify({ consent_given: true }) }).then(() => {
              usePatientStore.getState().fetchPatients();
            }).catch(() => {});
          },
        });
      }

      /* 3. Driver — ONLY after automation failed (retryCount ≥ 2 or failed_auto_assignment) */
      if (!isLocal && (p.stage === "booked" || p.stage === "done") && !lg.driverName && (lg.status === "all_declined" || lg.status === "failed_auto_assignment" || (lg.retryCount || 0) >= 2)) {
        items.push({
          id: "driver_" + p.id,
          type: "driver",
          icon: "\u{1F697}",
          color: "#ef4444",
          title: t("driver_assign_manual") || "Fahrer manuell zuweisen",
          desc: "\u26A0 " + (t("driver_all_declined_desc") || "Alle Fahrer haben abgelehnt — bitte manuell einen Fahrer zuweisen"),
          patient: p.name, patientId: p.id,
          time: p.flightConfirmed?.detected || p.lastAiInteraction || p.createdAt,
          flightDate: p.flightConfirmed?.date || null,
          action: () => {
            /* Toggle driver assignment panel (matches v71 inline panel) */
            const existing = document.getElementById("fm-drv-assign");
            if (existing) { existing.remove(); return; }

            const token = sessionStorage.getItem("fm_access_token");
            if (!token) return;

            const xhr = new XMLHttpRequest();
            xhr.open("GET", "https://api.flowmatix.io/api/v1/clinic/settings");
            xhr.setRequestHeader("Authorization", "Bearer " + token);
            xhr.onload = function () {
              if (xhr.status !== 200) return;
              try {
                const data = JSON.parse(xhr.responseText);
                const drivers = (data.clinic && data.clinic.drivers) || data.drivers || [];
                const pLg = p.logistics || {};
                const requestedDrivers = pLg.requestedDrivers || [];

                const panel = document.createElement("div");
                panel.id = "fm-drv-assign";
                panel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1f2e;border:1px solid rgba(76,201,255,0.2);border-radius:16px;padding:24px;z-index:99999;width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.5)";

                let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
                  '<h3 style="font-size:16px;font-weight:800;color:#fff;margin:0">' + (t("assign_driver") || "Fahrer zuweisen") + '</h3>' +
                  '<button onclick="document.getElementById(\'fm-drv-assign\').remove()" style="background:none;border:none;color:#666;font-size:18px;cursor:pointer">\u2715</button></div>';

                html += '<div style="font-size:12px;color:rgba(167,177,195,0.7);margin-bottom:16px">' + (t("patient") || "Patient") + ': <strong style="color:#fff">' + escHtml(p.name) + '</strong></div>';

                for (let di = 0; di < drivers.length; di++) {
                  const dr = drivers[di];
                  const declined = requestedDrivers.find(r => r.name === dr.name && r.status === "declined");
                  const isPrimary = dr.role === "primary";

                  html += '<div style="padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.02);border:1px solid ' +
                    (declined ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)") +
                    ';margin-bottom:8px;display:flex;align-items:center;gap:12px">';

                  html += '<div style="width:36px;height:36px;border-radius:10px;background:' +
                    (declined ? "rgba(239,68,68,0.08)" : "rgba(76,201,255,0.08)") +
                    ';display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:' +
                    (declined ? "#ef4444" : "#4cc9ff") + ';flex-shrink:0">' +
                    (dr.name ? escHtml(dr.name[0].toUpperCase()) : "?") + '</div>';

                  html += '<div style="flex:1"><div style="font-weight:700;font-size:13px;color:rgba(232,238,252,0.9)">' + escHtml(dr.name || "") + '</div>';
                  html += '<div style="font-size:11px;color:rgba(167,177,195,0.6);margin-top:2px"><a href="tel:' +
                    encodeURI((dr.phone || "").replace(/\s/g, "")) + '" style="color:#4cc9ff;text-decoration:none">' + escHtml(dr.phone || "") + '</a></div></div>';

                  if (declined) {
                    html += '<span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;color:#ef4444;background:rgba(239,68,68,0.08)">' + (t("declined") || "ABGELEHNT") + '</span>';
                  } else {
                    html += '<span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;color:#4cc9ff;background:rgba(76,201,255,0.08)">' +
                      (isPrimary ? (t("primary_driver") || "HAUPTFAHRER") : (t("backup_driver") || "ERSATZ")) + '</span>';
                  }

                  html += '<button data-drv-name="' + escHtml(dr.name || "") + '" data-drv-phone="' + escHtml(dr.phone || "") +
                    '" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);color:#10b981;margin-left:8px">' +
                    (t("assign") || "Zuweisen") + '</button>';

                  html += '</div>';
                }

                html += '<div style="font-size:11px;color:rgba(167,177,195,0.7);margin-top:12px;text-align:center">' +
                  (t("click_assign_driver") || "Klicke Zuweisen um den Fahrer manuell zuzuteilen") + '</div>';

                panel.innerHTML = html;

                panel.addEventListener("click", function (ev) {
                  const btn = ev.target.closest("[data-drv-name]");
                  if (!btn) return;
                  const dName = btn.getAttribute("data-drv-name");
                  const dPhone = btn.getAttribute("data-drv-phone");

                  apiFetch("/api/v1/crm/patients/" + p.id, {
                    method: "PATCH",
                    body: JSON.stringify({
                      metadata: Object.assign({}, p.metadata || {}, {
                        logistics: { status: "confirmed", driverName: dName, driverPhone: dPhone }
                      })
                    })
                  }).then(() => {
                    showT((t("driver_assigned_msg") || "Fahrer {name} zugewiesen").replace("{name}", dName) + " \u2705");
                    panel.remove();
                    window.dispatchEvent(new Event("resize"));
                  }).catch(() => {
                    showT(t("error_assigning") || "Fehler beim Zuweisen");
                  });
                });

                document.body.appendChild(panel);
              } catch (e) { /* ignore */ }
            };
            xhr.send();
          },
          actionLabel: t("assign_driver") || "Fahrer zuweisen",
        });
      }

      /* 4. Hotel assignment — delayed: only after 24h since booking OR <48h before appointment */
      const hotelBookedAt = p.bookedAt || p.metadata?.bookedAt || p.updatedAt;
      const hotelApptDate = p.appointmentDate || p.booking?.date;
      const hoursSinceBooking = hotelBookedAt ? (getNowMs() - new Date(hotelBookedAt).getTime()) / 3600000 : 999;
      const hoursUntilAppt = hotelApptDate ? (new Date(hotelApptDate).getTime() - getNowMs()) / 3600000 : 999;
      const hotelEscalated = hoursSinceBooking > 24 || hoursUntilAppt < 48;
      const hasFlightConfirmed = !!(p.flightConfirmed && p.flightConfirmed.date);
      if (!isLocal && hasFlightConfirmed && (p.stage === "booked" || p.stage === "done") && !(p.hotelInfo && p.hotelInfo.name) && !(p.hotel && p.hotel.name) && hotelEscalated) {
        items.push({
          id: "hotel_" + p.id,
          type: "hotel",
          icon: "\u{1F3E8}",
          color: "#f59e0b",
          title: t("hotel_assign_title") || "Hotel zuweisen",
          desc: "\u26A0 " + (t("hotel_missing_desc") || "Kein Hotel zugewiesen — Hotel muss manuell zugewiesen werden"),
          patient: p.name, patientId: p.id,
          time: p.lastAiInteraction || p.updatedAt || p.createdAt,
          action: () => {
            const existing = document.getElementById("fm-hotel-assign");
            if (existing) { existing.remove(); return; }

            const panel = document.createElement("div");
            panel.id = "fm-hotel-assign";
            panel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1f2e;border:1px solid rgba(167,139,250,0.2);border-radius:16px;padding:24px;z-index:99999;width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.5)";

            const iStyle = "width:100%;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:#fff;font-family:inherit;font-size:13px;outline:none;box-sizing:border-box;margin-bottom:8px";

            panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
              '<h3 style="font-size:16px;font-weight:800;color:#fff;margin:0">\u{1F3E8} ' + (t("assign_hotel") || "Hotel zuweisen") + '</h3>' +
              '<button onclick="document.getElementById(\'fm-hotel-assign\').remove()" style="background:none;border:none;color:#666;font-size:18px;cursor:pointer">\u2715</button></div>' +
              '<div style="font-size:12px;color:rgba(167,177,195,0.7);margin-bottom:12px">' + (t("patient") || "Patient") + ': <strong style="color:#fff">' + escHtml(p.name) + '</strong></div>' +
              '<input id="fm-hotel-name" placeholder="' + (t("hotel_name") || "Hotelname") + '" style="' + iStyle + '">' +
              '<input id="fm-hotel-link" placeholder="' + (t("booking_link") || "Buchungslink (optional)") + '" style="' + iStyle + '">' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
              '<div><label style="font-size:10px;font-weight:700;color:rgba(167,177,195,0.6);text-transform:uppercase">' + (t("check_in") || "Check-in") + '</label><input id="fm-hotel-checkin" type="date" style="' + iStyle + 'margin-top:4px"></div>' +
              '<div><label style="font-size:10px;font-weight:700;color:rgba(167,177,195,0.6);text-transform:uppercase">' + (t("check_out") || "Check-out") + '</label><input id="fm-hotel-checkout" type="date" style="' + iStyle + 'margin-top:4px"></div></div>' +
              '<div style="padding:8px 12px;border-radius:8px;background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.12);color:rgba(167,177,195,0.7);font-size:11px;margin-bottom:12px;display:flex;align-items:center;gap:6px">\u{1F4EC} ' + (t("hotel_auto_hint") || "Hotel-Info wird automatisch 3 Tage vor Termin an Patient gesendet (inkl. Terminerinnerung & Flugticket-Anfrage)") + '</div>' +
              '<button id="fm-hotel-save" style="width:100%;padding:10px;border-radius:10px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#a78bfa;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">' + (t("assign_hotel") || "Hotel zuweisen") + '</button>';

            document.body.appendChild(panel);

            document.getElementById("fm-hotel-save").addEventListener("click", () => {
              const name = document.getElementById("fm-hotel-name").value.trim();
              if (!name) return;
              const link = document.getElementById("fm-hotel-link").value.trim();
              const checkin = document.getElementById("fm-hotel-checkin").value;
              const checkout = document.getElementById("fm-hotel-checkout").value;

              apiFetch("/api/v1/crm/patients/" + p.id, {
                method: "PATCH",
                body: JSON.stringify({
                  hotelInfo: { name, link: link || null, checkIn: checkin || null, checkOut: checkout || null }
                })
              }).then(() => {
                showT((t("hotel_assigned_msg") || "Hotel {name} zugewiesen").replace("{name}", name) + " \u2705");
                panel.remove();
                window.dispatchEvent(new Event("resize"));
              }).catch(() => showT(t("error") || "Fehler"));
            });
          },
          actionLabel: t("assign_hotel") || "Hotel zuweisen",
        });
      }

      /* 5. Flight data — ONLY escalation (< 48h before appt + reminder sent + no response) */
      const apptDate = p.appointmentDate || p.booking?.date;
      const flightReminderSent = p.metadata?.flightReminderSent;
      const hoursToAppt = apptDate ? (new Date(apptDate).getTime() - getNowMs()) / 3600000 : 999;
      if (!isLocal && p.stage === "booked" && !(p.flightConfirmed && p.flightConfirmed.date) && flightReminderSent && hoursToAppt < 48) {
        items.push({
          id: "flight_" + p.id,
          type: "flight",
          icon: "\u2708\uFE0F",
          color: "#ef4444",
          title: t("action_flight_missing") || "Flugdaten fehlen — bitte prüfen",
          desc: t("action_flight_missing_desc") || "Erinnerung gesendet, keine Antwort — Termin in weniger als 48h",
          patient: p.name, patientId: p.id,
          time: p.lastAiInteraction || p.updatedAt || p.createdAt,
          action: () => {
            const existing = document.getElementById("fm-flight-assign");
            if (existing) { existing.remove(); return; }

            const panel = document.createElement("div");
            panel.id = "fm-flight-assign";
            panel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1f2e;border:1px solid rgba(251,191,36,0.2);border-radius:16px;padding:24px;z-index:99999;width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.5)";

            const iStyle = "width:100%;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:#fff;font-family:inherit;font-size:13px;outline:none;box-sizing:border-box;margin-bottom:8px";

            panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
              '<h3 style="font-size:16px;font-weight:800;color:#fff;margin:0">\u2708\uFE0F ' + (t("add_flight") || "Flug eintragen") + '</h3>' +
              '<button onclick="document.getElementById(\'fm-flight-assign\').remove()" style="background:none;border:none;color:#666;font-size:18px;cursor:pointer">\u2715</button></div>' +
              '<div style="font-size:12px;color:rgba(167,177,195,0.7);margin-bottom:12px">' + (t("patient") || "Patient") + ': <strong style="color:#fff">' + escHtml(p.name) + '</strong></div>' +
              '<input id="fm-flight-airline" placeholder="' + (t("airline") || "Airline (z.B. Turkish Airlines)") + '" style="' + iStyle + '">' +
              '<input id="fm-flight-nr" placeholder="' + (t("flight_number") || "Flugnummer (z.B. TK1834)") + '" style="' + iStyle + '">' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
              '<div><label style="font-size:10px;font-weight:700;color:rgba(167,177,195,0.6);text-transform:uppercase">' + (t("arrival_date") || "Ankunft Datum") + '</label><input id="fm-flight-date" type="date" style="' + iStyle + 'margin-top:4px"></div>' +
              '<div><label style="font-size:10px;font-weight:700;color:rgba(167,177,195,0.6);text-transform:uppercase">' + (t("arrival_time") || "Ankunft Uhrzeit") + '</label><input id="fm-flight-time" type="time" style="' + iStyle + 'margin-top:4px"></div></div>' +
              '<button id="fm-flight-save" style="width:100%;padding:10px;border-radius:10px;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);color:#fbbf24;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:8px">' + (t("save_flight") || "Flug speichern") + '</button>' +
              '<button id="fm-flight-local" style="width:100%;padding:8px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);color:rgba(167,177,195,0.6);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">' + (t("no_flight_needed") || "Kein Flug nötig — Patient ist vor Ort") + '</button>';

            document.body.appendChild(panel);

            document.getElementById("fm-flight-save").addEventListener("click", () => {
              const airline = document.getElementById("fm-flight-airline").value.trim();
              const flightNo = document.getElementById("fm-flight-nr").value.trim();
              const date = document.getElementById("fm-flight-date").value;
              const time = document.getElementById("fm-flight-time").value;
              if (!date) return;

              apiFetch("/api/v1/crm/patients/" + p.id, {
                method: "PATCH",
                body: JSON.stringify({
                  metadata: { flightConfirmed: { airline: airline || null, flightNo: flightNo || null, date, arrivalTime: time || null, detected: new Date().toISOString() } }
                })
              }).then(() => {
                showT((t("flight_saved") || "Flugdaten gespeichert") + " \u2705");
                panel.remove();
                window.dispatchEvent(new Event("resize"));
              }).catch(() => showT(t("error") || "Fehler"));
            });

            document.getElementById("fm-flight-local").addEventListener("click", () => {
              apiFetch("/api/v1/crm/patients/" + p.id, {
                method: "PATCH",
                body: JSON.stringify({ metadata: { noFlightNeeded: true } })
              }).then(() => {
                showT((t("marked_local") || "Patient ist vor Ort") + " \u2705");
                panel.remove();
                window.dispatchEvent(new Event("resize"));
              }).catch(() => showT(t("error") || "Fehler"));
            });
          },
          actionLabel: t("add_flight") || "Flug eintragen",
        });
      }
      /* 6. Follow-up needed */
      if (p.metadata?.followup_needed && !p.metadata?.followup_completed) {
        items.push({
          id: "followup_" + p.id,
          type: "followup",
          icon: "📞",
          color: "#fbbf24",
          title: t("action_recontact") || "Patient erneut kontaktieren",
          desc: p.metadata?.noshow ? (t("action_noshow_desc") || "Patient ist nicht erschienen — Follow-up nötig") : (t("action_followup_required") || "Follow-up erforderlich"),
          patient: p.name, patientId: p.id,
          time: p.metadata?.noshow_date || p.lastAiInteraction || p.createdAt,
          action: () => goToChat(p.id),
          actionLabel: t("action_contact") || "Kontaktieren",
        });
      }

      /* 7. Deposit pending — waiting for payment confirmation */
      const hasApptDepositPaid = myAppts?.some(a => (a.patientId === p.id || a.patient_id === p.id || a.leadId === p.id) && (a.deposit_paid || a.depositPaid));
      if (p.reviewData && p.convStatus !== 'deposit_paid' && p.convStatus !== 'appointment_booked' && p.convStatus !== 'resolved' && p.convStatus !== 'closed' && !p.depositPaid && !p.metadata?.deposit_paid && !hasApptDepositPaid) {
        const cli = clinic || {};
        if (cli.depositPolicy && cli.depositPolicy !== 'none') {
          const depAmt = cli.depositAmount || '';
          items.push({
            id: "deposit_" + p.id,
            type: "deposit",
            icon: "💳",
            color: "#fbbf24",
            title: tFb(t, "action_deposit_pending", "Anzahlung ausstehend"),
            desc: (depAmt ? `€${depAmt} — ` : '') + tFb(t, "action_deposit_pending_desc", "Anzahlung noch nicht eingegangen — als bezahlt markieren wenn Geld eingegangen"),
            patient: p.name, patientId: p.id,
            time: p.reviewedAt || p.lastAiInteraction || p.updatedAt || p.createdAt,
            action: () => {
              usePatientStore.getState().setConvStatus(p.id, 'deposit_paid');
              showT("Anzahlung als bezahlt markiert ✅");
            },
            actionLabel: tFb(t, "mark_paid", "Bezahlt ✓"),
          });
        }
      }

      /* 8. Waiting for flight data — info task for booked patients without flight */
      if ((p.stage === 'booked' || p.stage === 'done') && !isLocal && !(p.flightConfirmed && p.flightConfirmed.date) && p.convStatus !== 'resolved' && p.convStatus !== 'closed') {
        items.push({
          id: "flight_wait_" + p.id,
          type: "flight_wait",
          icon: "⏳",
          color: "rgba(167,177,195,0.7)",
          title: tFb(t, "action_waiting_flight", "Warte auf Flugdaten"),
          desc: tFb(t, "action_waiting_flight_desc", "3 Tage vor dem OP-Termin wird automatisch eine Erinnerung gesendet"),
          patient: p.name, patientId: p.id,
          time: p.appointmentDate || p.booking?.date || p.updatedAt || p.createdAt,
          action: () => openPatient(p.id),
          actionLabel: tFb(t, "action_open_patient", "Patient öffnen"),
        });
      }
    });

    return items;
  }, [myLeads]);

  /* ── Load DB tasks (followup etc.) and merge into action items ── */
  const [dbTasks, setDbTasks] = useState([]);
  useEffect(() => {
    apiFetch("/api/v1/tasks").then(res => {
      setDbTasks((res.tasks || []).filter(tk => tk.status === "pending" && tk.type === "followup"));
    }).catch(() => {});
    const iv = setInterval(() => {
      apiFetch("/api/v1/tasks").then(res => {
        setDbTasks((res.tasks || []).filter(tk => tk.status === "pending" && tk.type === "followup"));
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const allActionItems = useMemo(() => {
    const dbItems = dbTasks.map(tk => {
      const payload = tk.payload || {};
      const pName = tk.patient?.firstName ? `${tk.patient.firstName} ${tk.patient.lastName || ""}`.trim() : "Patient";
      const pid = tk.patientId || tk.patient_id || tk.patient?.id;
      const isReschedule = payload.action === "notify_rescheduled";
      const isCancel = payload.action === "notify_canceled";
      const title = isReschedule
        ? (t("task_notify_reschedule") || `${pName} über Terminverschiebung informieren`)
        : isCancel
        ? (t("task_notify_cancel") || `${pName} über Terminstornierung informieren`)
        : tk.notes?.split("\n")[0] || (t("task_notify_patient") || "Patient benachrichtigen");
      const desc = isReschedule && payload.newDate
        ? `${t("task_new_date") || "Neuer Termin"}: ${payload.newDate}`
        : isCancel && payload.oldDate
        ? `${t("task_cancelled_date") || "Stornierter Termin"}: ${payload.oldDate}`
        : "";
      return {
        id: "dbtask_" + tk.id,
        _dbTaskId: tk.id,
        type: "followup",
        icon: "📋",
        color: "#f59e0b",
        title,
        desc,
        patient: pName,
        patientId: pid,
        time: tk.createdAt || tk.created_at,
        action: () => { if (pid) goToChat(pid); },
        actionLabel: t("open_chat") || "Chat öffnen",
        dismissable: true,
        onDismiss: () => {
          apiFetch(`/api/v1/tasks/${tk.id}`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) })
            .then(() => {
              setDbTasks(prev => prev.filter(x => x.id !== tk.id));
              window.dispatchEvent(new CustomEvent("fm:task-dismissed"));
            })
            .catch(() => {});
        },
      };
    });
    return [...dbItems, ...tasks];
  }, [tasks, dbTasks]);

  /* Time-based grouping: Überfällig (>24h) vs Später */
  function formatWaitLabel(task) {
    // Driver: show flight date (future-based)
    if (task.type === "driver" && task.flightDate) {
      const ms = new Date(task.flightDate).getTime() - getNowMs();
      if (ms < 0) return t("action_flight_missed") || "Flug verpasst — Fahrer prüfen";
      const days = Math.ceil(ms / 86400000);
      if (days === 0) return t("action_flight_today") || "Flug heute";
      if (days === 1) return t("action_flight_tomorrow") || "Flug morgen";
      return `${t("action_flight_in") || "Flug in"} ${days} ${t("action_days") || "Tagen"}`;
    }
    if (task.type === "driver") return t("action_driver_needed") || "Fahrer erforderlich";
    // Chat + others: show past waiting time
    if (!task.time) return "—";
    const ms = getNowMs() - new Date(task.time).getTime();
    if (ms < 0) { const _t = new Date(task.time), _n = new Date(); _t.setHours(0,0,0,0); _n.setHours(0,0,0,0); const d = Math.round((_t - _n) / 86400000); return `${t("action_in") || "in"} ${d} ${t("action_days") || "Tagen"}`; }
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${t("patient_waiting_since") || "Patient wartet seit"} ${mins} ${t("time_min") || "Min."}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${t("patient_waiting_since") || "Patient wartet seit"} ${hrs} ${t("time_hours") || "Std."}`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${t("patient_waiting_since") || "Patient wartet seit"} ${days} ${t("action_days") || "Tagen"}`;
    return `${t("patient_waiting_since") || "Patient wartet seit"} ${Math.floor(days / 7)} ${t("action_weeks") || "Wochen"}`;
  }
  // Group by task type (category-based)
  const categories = getTaskGroups(t).map(g => {
    const tc = TASK_COLORS[g.key] || TASK_COLORS.followup;
    return { ...g, items: allActionItems.filter(t => t.type === g.key), color: tc.color, dotColor: tc.dot, bg: tc.bg, border: tc.border };
  }).filter(c => c.items.length > 0);

  return (
    <div style={{ padding: "32px 40px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.03em", color: "rgba(232,238,252,0.95)" }}>
        {t("action_needed") || "Aktion Erforderlich"}
      </h1>

      {/* Summary bar */}
      {tasks.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "14px 20px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{tasks.length}</div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", lineHeight: 1.4 }}>{t("tasks_open")}</div>
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.06)", margin: "0 4px" }} />
          {categories.filter(c => c.items.length > 0).map(c => (
            <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: `${c.color}10` }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.items.length} {c.label}</span>
            </div>
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <div style={{ padding: "80px 40px", textAlign: "center", borderRadius: 20, background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.08)" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>{"\u2713"}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981", marginBottom: 8 }}>
            {tFb(t, "all_running_auto", "Alles läuft automatisch")}
          </div>
          <div style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", lineHeight: 1.6 }}>
            {tFb(t, "no_manual_actions", "Derzeit sind keine manuellen Aktionen erforderlich.")}
          </div>
        </div>
      )}

      {/* Grouped by urgency: Überfällig / Später */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {categories.map(cat => {
          if (cat.items.length === 0) return null;
          const isOpen = !collapsed[cat.key];
          return (
            <div key={cat.key}>
              {/* Section header — clickable to collapse */}
              <div onClick={() => setCollapsed(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isOpen ? 10 : 0, cursor: "pointer", userSelect: "none" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: cat.dotColor }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: cat.color }}>{cat.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${cat.color}15`, color: cat.color }}>{cat.items.length}</span>
                <span style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", marginLeft: 4, transition: "transform 0.2s", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}>▼</span>
              </div>
              {isOpen && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cat.items.map((task, fi) => {
          const waitStr = formatWaiting(task.time);
          const waitDays = task.time ? (getNowMs() - new Date(task.time).getTime()) / 86400000 : 0;
          const waitColor = waitDays > 7 ? "#ef4444" : waitDays > 3 ? "#ff8a2a" : "rgba(167,177,195,0.75)";
          const initials = getInitials(task.patient);

          return (
            <div
              key={task.id}
              data-fi={fi}
              style={{
                padding: "14px 18px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderLeft: `3px solid ${cat.color}`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                transition: "background 0.15s",
                opacity: task.subtle ? 0.5 : 1,
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.035)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
            >
              {/* Patient avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: getAvatarGradient(task.patient),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 12, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}>
                {initials}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <span onClick={(e) => { e.stopPropagation(); openPatient(task.patientId); }} style={{ fontSize: 14, fontWeight: 700, color: "rgba(232,238,252,0.9)", cursor: "pointer", borderBottom: "1px dashed rgba(255,255,255,0.15)" }} onMouseEnter={e => e.currentTarget.style.color = "#4cc9ff"} onMouseLeave={e => e.currentTarget.style.color = "rgba(232,238,252,0.9)"}>
                  {task.patient}
                </span>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.75)", marginTop: 2 }}>
                  {task.desc}
                </div>
              </div>

              {/* Waiting time */}
              {(() => { const days = task.time ? (getNowMs() - new Date(task.time).getTime()) / 86400000 : 0; const tb = getTimeBadgeColor(Math.abs(days)); return (
              <span style={{ fontSize: 11, fontWeight: 600, color: tb.color, flexShrink: 0, padding: "4px 10px", borderRadius: 6, background: tb.bg }}>
                {formatWaitLabel(task)}
              </span>); })()}

              {/* Action button */}
              <button
                onClick={task.action}
                style={{
                  padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.2)",
                  color: "#4cc9ff", transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${cat.color}20`}
                onMouseLeave={e => e.currentTarget.style.background = `${cat.color}10`}
              >
                {task.actionLabel}
              </button>

              {/* Dismiss button for DB tasks */}
              {task.dismissable && task.onDismiss && (
                <button
                  onClick={(e) => { e.stopPropagation(); task.onDismiss(); }}
                  title="Erledigt"
                  style={{
                    width: 28, height: 28, borderRadius: 6, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", marginLeft: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                    color: "rgba(239,68,68,0.7)",
                  }}
                >✕</button>
              )}

              {/* Secondary action (flight: "Kein Flug nötig") */}
              {task.secondAction && (
                <button
                  onClick={task.secondAction}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.12)",
                    color: "#fbbf24", marginLeft: 8,
                  }}
                >
                  {task.secondLabel || ""}
                </button>
              )}
            </div>
          );
        })}
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
