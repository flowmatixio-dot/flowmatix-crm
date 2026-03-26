import * as fmApi from "../api/client";
import { isDemoMode } from "../utils/demoTime";

export function useCrmHandlers({
  leads, setLeads, msgs, setMsgs, appts, setAppts,
  clinic, activeClinicId, user, selChat,
  newMsg, setNewMsg, rescheduleAppt, setRescheduleAppt,
  rescheduleDate, setRescheduleDate, rescheduleTime, setRescheduleTime,
  setClinics, logAction, addTL, setConvStatus, showT, browserNotify, t,
}) {

  /* ═══ DRIVER / LOGISTICS HANDLERS ═══ */
  const assignDriver = (leadId, driverId) => {
    const drv = (clinic?.drivers || []).find(d => d.id === driverId);
    if (!drv) return;
    const logistics = { driverId, driverName: drv.name, driverPhone: drv.phone || "", vehicle: drv.vehicle || "", plateNo: drv.plateNo || "", status: "pending", assignedAt: new Date().toISOString() };
    setLeads(p => p.map(x => x.id === leadId ? { ...x, logistics } : x));
    fmApi.updatePatient(leadId, { logistics }).catch(e => { console.error(e); showT("Fahrer konnte nicht gespeichert werden"); });
    addTL(leadId, "driver", `🚗 Driver ${drv.name} assigned for pickup`);
    const lead = leads.find(l => l.id === leadId);
    logAction("assign_driver", lead?.name || "", `Driver: ${drv.name}`);
    showT(`${drv.name} zugewiesen`);
  };

  const notifyDriver = async (leadId) => {
    const lead = leads.find(l => l.id === leadId); if (!lead?.logistics) return;
    const drv = (clinic?.drivers || []).find(d => d.id === lead.logistics.driverId);
    setLeads(p => p.map(x => x.id === leadId ? { ...x, logistics: { ...x.logistics, status: "notified", notifiedAt: new Date().toISOString() } } : x));
    fmApi.updatePatient(leadId, { logistics: { ...lead.logistics, status: "notified", notifiedAt: new Date().toISOString() } }).catch(e => { console.error(e); showT("Logistik konnte nicht gespeichert werden"); });
    addTL(leadId, "driver", `📱 WhatsApp sent to ${drv?.name || lead.logistics.driverName} for pickup`);
    setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, notifications: [{ id: `n_drv_${Date.now()}`, type: "driver", text: `🚗 Driver ${drv?.name || lead.logistics.driverName} notified for ${lead.name} pickup`, time: new Date().toISOString(), read: false }, ...(c.notifications || [])] } : c));
    logAction("notify_driver", lead.name, `Driver: ${drv?.name || lead.logistics.driverName}`);
    if (isDemoMode()) {
      console.log("[Demo] notifyDriverWhatsApp blocked");
      showT("WhatsApp an Fahrer gesendet! (Demo)");
    } else {
      fmApi.notifyDriverWhatsApp(leadId).then(() => showT("WhatsApp an Fahrer gesendet!")).catch(e => showT("Fehler beim Senden"));
    }
  };

  const handleDriverResponse = (leadId, response) => {
    const lead = leads.find(l => l.id === leadId); if (!lead?.logistics) return;
    if (response === "confirm") {
      setLeads(p => p.map(x => x.id === leadId ? { ...x, logistics: { ...x.logistics, status: "confirmed", confirmedAt: new Date().toISOString() } } : x));
      fmApi.updatePatient(leadId, { logistics: { ...lead.logistics, status: "confirmed", confirmedAt: new Date().toISOString() } }).catch(e => { console.error(e); showT("Logistik konnte nicht gespeichert werden"); });
      addTL(leadId, "driver", `✅ Driver ${lead.logistics.driverName} confirmed pickup`);
      setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, notifications: [{ id: `n_drv_${Date.now()}`, type: "driver", text: `✅ Driver ${lead.logistics.driverName} confirmed pickup for ${lead.name}`, time: new Date().toISOString(), read: false }, ...(c.notifications || [])] } : c));
      showT("Driver confirmed pickup");
    } else {
      setLeads(p => p.map(x => x.id === leadId ? { ...x, logistics: { ...x.logistics, status: "declined" } } : x));
      fmApi.updatePatient(leadId, { logistics: { ...lead.logistics, status: "declined" } }).catch(e => { console.error(e); showT("Logistik konnte nicht gespeichert werden"); });
      addTL(leadId, "driver", `✕ Driver ${lead.logistics.driverName} declined pickup`);
      showT("Driver declined — escalate to backup");
      if (clinic?.logisticsConfig?.autoNotifyDriver) {
        setTimeout(() => escalateToBackup(leadId), 500);
      }
    }
  };

  const escalateToBackup = (leadId) => {
    const lead = leads.find(l => l.id === leadId); if (!lead?.logistics) return;
    const backup = (clinic?.drivers || []).find(d => d.role === "backup" && d.active !== false && d.id !== lead.logistics.driverId);
    if (!backup) { showT("No backup driver available"); return; }
    setLeads(p => p.map(x => x.id === leadId ? { ...x, logistics: { ...x.logistics, status: "escalated", backupDriverId: backup.id, backupDriverName: backup.name, escalatedAt: new Date().toISOString() } } : x));
    fmApi.updatePatient(leadId, { logistics: { ...lead.logistics, status: "escalated", backupDriverId: backup.id, backupDriverName: backup.name, escalatedAt: new Date().toISOString() } }).catch(e => { console.error(e); showT("Logistik konnte nicht gespeichert werden"); });
    addTL(leadId, "driver", `🔄 Escalated to backup driver ${backup.name}`);
    setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, notifications: [{ id: `n_drv_${Date.now()}`, type: "driver", text: `🔄 Pickup escalated to backup driver ${backup.name} for ${lead.name}`, time: new Date().toISOString(), read: false }, ...(c.notifications || [])] } : c));
    logAction("escalate_driver", lead.name, `Backup: ${backup.name}`);
    showT(`Escalated to ${backup.name}`);
  };

  const handleBackupDriverResponse = (leadId, response) => {
    const lead = leads.find(l => l.id === leadId); if (!lead?.logistics) return;
    const backupName = lead.logistics.backupDriverName || "Backup";
    if (response === "confirm") {
      setLeads(p => p.map(x => x.id === leadId ? { ...x, logistics: { ...x.logistics, status: "backup_confirmed", backupConfirmedAt: new Date().toISOString() } } : x));
      fmApi.updatePatient(leadId, { logistics: { ...lead.logistics, status: "backup_confirmed", backupConfirmedAt: new Date().toISOString() } }).catch(e => { console.error(e); showT("Logistik konnte nicht gespeichert werden"); });
      addTL(leadId, "driver", `✅ Backup driver ${backupName} confirmed pickup`);
      setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, notifications: [{ id: `n_drv_${Date.now()}`, type: "driver", text: `✅ Backup driver ${backupName} confirmed pickup for ${lead.name}`, time: new Date().toISOString(), read: false }, ...(c.notifications || [])] } : c));
      showT("Backup driver confirmed");
    } else {
      setLeads(p => p.map(x => x.id === leadId ? { ...x, logistics: { ...x.logistics, status: "backup_declined" } } : x));
      fmApi.updatePatient(leadId, { logistics: { ...lead.logistics, status: "backup_declined" } }).catch(e => { console.error(e); showT("Logistik konnte nicht gespeichert werden"); });
      addTL(leadId, "driver", `❌ Backup driver ${backupName} also declined`);
      showT("Backup declined — manual assignment needed");
    }
  };

  /* Send message in chat */
  const sendMessage = (chatId) => {
    if (!newMsg.trim() || !activeClinicId) return;
    if (!isDemoMode() && clinic?.connection_status !== "connected") { showT(t("wa_not_connected") || "WhatsApp nicht verbunden"); return; }
    if (newMsg.length > 2000) { showT(t("msg_too_long") || "Message too long (max 2000 chars)"); return; }
    const now = new Date(); const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const chatBeforeUpdate = (msgs[activeClinicId] || []).find(c => c.id === chatId);
    const chatLid = chatBeforeUpdate?.leadId || chatBeforeUpdate?.patientId || chatBeforeUpdate?.id;
    setMsgs(prev => {
      const clinicMsgs = [...(prev[activeClinicId] || [])];
      const idx = clinicMsgs.findIndex(c => c.id === chatId);
      if (idx === -1) return prev;
      const chat = { ...clinicMsgs[idx] };
      const msgObj = { text: newMsg.trim(), time: timeStr, sender: "staff" };
      if (window.__fmTranslateOriginal) { msgObj._originalText = window.__fmTranslateOriginal; window.__fmTranslateOriginal = null; }
      chat.msgs = [...(chat.msgs || []), msgObj];
      chat.unread = false;
      clinicMsgs[idx] = chat;
      return { ...prev, [activeClinicId]: clinicMsgs };
    });
    if (chatLid) {
      addTL(chatLid, "human", `Staff: ${newMsg.trim().substring(0, 60)}`);
      const lead = leads.find(l => l.id === chatLid);
      if (lead && lead.controlMode !== "human" && lead.convStatus !== "resolved" && lead.convStatus !== "closed") {
        setConvStatus(chatLid, "human_takeover");
      }
    }
    const msgText = newMsg.trim();
    if (chatLid || chatId) {
      if (isDemoMode()) {
        console.log("[Demo] sendCrmMessage blocked — no real WhatsApp sent");
      } else {
        fmApi.sendCrmMessage(chatId, { text: msgText, sender: "staff" }).catch(err => { console.warn("sendCrmMessage failed:", err); showT(t("send_failed") || "Message could not be delivered — please retry"); });
      }
    }
    setNewMsg("");
    showT("Message sent");
    browserNotify("Message sent", `To: ${selChat?.name}`);
    logAction("message_sent", selChat?.name || "Unknown", `"${msgText.substring(0, 80)}"`);
  };

  /* Mark conversation resolved */
  const markResolved = (chatId) => {
    if (!activeClinicId) return;
    const chat = (msgs[activeClinicId] || []).find(c => c.id === chatId);
    const rLid = chat?.leadId || chat?.patientId || chat?.id;
    if (rLid) { setConvStatus(rLid, "resolved"); addTL(rLid, "system", "Conversation resolved"); }
    setMsgs(prev => {
      const clinicMsgs = [...(prev[activeClinicId] || [])];
      const idx = clinicMsgs.findIndex(c => c.id === chatId);
      if (idx === -1) return prev;
      const c = { ...clinicMsgs[idx] };
      c.msgs = [...(c.msgs || []), { text: "✓ Conversation marked as resolved", time: new Date().toLocaleTimeString("de", { hour: "2-digit", minute: "2-digit" }), sender: "system" }];
      clinicMsgs[idx] = c;
      return { ...prev, [activeClinicId]: clinicMsgs };
    });
    showT(t("resolved"));
    logAction("conversation_resolved", chat?.name || "Unknown", "Marked as resolved");
  };

  /* Reschedule appointment */
  const doReschedule = () => {
    if (!rescheduleAppt || !rescheduleDate || !rescheduleTime) return;
    setAppts(p => p.map(a => a.id === rescheduleAppt ? { ...a, date: rescheduleDate, time: rescheduleTime } : a));
    showT(`Rescheduled to ${rescheduleDate} ${rescheduleTime}`);
    browserNotify("Appointment Rescheduled", `${rescheduleDate} at ${rescheduleTime}`);
    setRescheduleAppt(null); setRescheduleDate(""); setRescheduleTime("");
  };

  return {
    assignDriver, notifyDriver, handleDriverResponse, escalateToBackup, handleBackupDriverResponse,
    sendMessage, markResolved, doReschedule,
  };
}
