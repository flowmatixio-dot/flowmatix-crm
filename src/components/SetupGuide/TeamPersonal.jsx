import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Field, SaveBtn, LockedBanner, TEAM_LIMITS } from "./setupShared";

// Staff/doctor management sub-component (Arzt-Zugaenge)
function StaffPanel() {
  const { clinic, activeClinicId, showT, t } = useApp();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [invitedEmails, setInvitedEmails] = useState(new Set());

  const loadStaff = async () => {
    try {
      const mod = await import("../../api/client");
      const res = await mod.getStaff();
      setStaff(res?.staff || []);
      // Load team users to check who already has an account
      try {
        const teamRes = await mod.getTeam();
        const emails = new Set((teamRes?.members || teamRes || []).map(u => u.email?.toLowerCase()).filter(Boolean));
        setInvitedEmails(emails);
      } catch {}
    } catch { setStaff([]); }
    setLoading(false);
  };
  useEffect(() => { loadStaff(); }, []);

  const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
  const DAY_LABELS = {mon:t("day_mon"),tue:t("day_tue"),wed:t("day_wed"),thu:t("day_thu"),fri:t("day_fri"),sat:t("day_sat"),sun:t("day_sun")};
  const ROLES = [{v:"doctor",l:t("role_doctor")},{v:"nurse",l:t("role_nurse")},{v:"coordinator",l:t("role_coordinator")},{v:"admin",l:t("role_admin")}];

  const saveStaff = async () => {
    const mod = await import("../../api/client");
    try {
      if (editing === "new") {
        await mod.createStaff(form);
        showT(t("staff_added"));
      } else {
        await mod.updateStaff(editing, form);
        showT(t("staff_updated"));
      }
      setEditing(null); setForm({});
      loadStaff();
    } catch (e) { showT(t("error") + ": " + e.message); }
  };

  const removeStaff = async (id) => {
    const mod = await import("../../api/client");
    await mod.deleteStaff(id);
    showT(t("staff_removed"));
    loadStaff();
  };

  if (loading) return <div style={{padding:20,color:"var(--text-muted)"}}>{t("loading")}</div>;

  if (editing) return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <h3 style={{margin:0,fontSize:16,fontWeight:800}}>{editing==="new"?(t("add_doctor")):(t("edit_doctor"))}</h3>
      <button onClick={()=>{setEditing(null);setForm({});}} style={{padding:"6px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border-strong)",color:"var(--text-muted)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t("cancel")}</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label={t("first_name")} value={form.first_name} onChange={v=>setForm(f=>({...f,first_name:v}))} placeholder="Dr. Mehmet" />
      <Field label={t("last_name")} value={form.last_name} onChange={v=>setForm(f=>({...f,last_name:v}))} placeholder="Yilmaz" />
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label={t("title")} value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="Dr. / Prof." />
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:4}}>{t("role")}</div>
        <select value={form.role||"doctor"} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:13,outline:"none"}}>
          {ROLES.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
      </div>
    </div>
    <Field label={t("specialty")} value={form.specialty} onChange={v=>setForm(f=>({...f,specialty:v}))} placeholder="FUE Specialist, PRP Expert..." />
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label={t("email")} value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} placeholder="arzt@klinik.com" />
      <div>
        <Field label={t("phone")} value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} placeholder="+90 555 ..." />
      </div>
    </div>
    {/* WhatsApp Benachrichtigungen */}
    {form.phone && (
      <div style={{padding:"10px 14px",borderRadius:10,background:"rgba(37,211,102,0.04)",border:"1px solid rgba(37,211,102,0.1)",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#25D366",display:"flex",alignItems:"center",gap:6}}>
              <span>💬</span> {t("whatsapp_notifications") || "WhatsApp-Benachrichtigungen"}
            </div>
            <div style={{fontSize:10,color:"rgba(167,177,195,0.75)",marginTop:2}}>
              {t("doctor_wa_notif_desc") || "Arzt wird per WhatsApp benachrichtigt bei: neuen Bewertungen, Terminen, Änderungen und Stornierungen"}
            </div>
          </div>
          <div onClick={()=>setForm(f=>({...f,whatsapp_notifications:!f.whatsapp_notifications}))} style={{
            width:36,height:20,borderRadius:10,cursor:"pointer",position:"relative",
            background:form.whatsapp_notifications!==false?"#25D366":"rgba(255,255,255,0.1)",transition:"background 0.2s",
          }}>
            <div style={{width:16,height:16,borderRadius:8,background:"white",position:"absolute",top:2,
              left:form.whatsapp_notifications!==false?18:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}} />
          </div>
        </div>
      </div>
    )}
    <div style={{marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:8}}>{t("working_hours")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
        {DAYS.map(d=>{const wh=(form.working_hours||{})[d];return<div key={d} style={{textAlign:"center"}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--text-faint)",marginBottom:4}}>{DAY_LABELS[d]}</div>
          <input type="checkbox" checked={!!wh} onChange={e=>{const whs={...(form.working_hours||{})};if(e.target.checked)whs[d]={start:"09:00",end:"18:00"};else delete whs[d];setForm(f=>({...f,working_hours:whs}));}} />
          {wh&&<><input value={wh.start} onChange={e=>{const whs={...(form.working_hours||{})};whs[d]={...whs[d],start:e.target.value};setForm(f=>({...f,working_hours:whs}));}} style={{width:"100%",padding:2,fontSize:10,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",borderRadius:4,color:"var(--text-primary)",textAlign:"center",marginTop:2}} /><input value={wh.end} onChange={e=>{const whs={...(form.working_hours||{})};whs[d]={...whs[d],end:e.target.value};setForm(f=>({...f,working_hours:whs}));}} style={{width:"100%",padding:2,fontSize:10,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",borderRadius:4,color:"var(--text-primary)",textAlign:"center",marginTop:2}} /></>}
        </div>;})}
      </div>
    </div>
    <SaveBtn onClick={saveStaff} t={t} />
  </div>;

  return <div>
    <p style={{fontSize:13,color:"var(--text-muted)",margin:"0 0 16px"}}>{t("staff_desc")}</p>
    <button onClick={()=>{setEditing("new");setForm({role:"doctor",working_hours:{mon:{start:"09:00",end:"18:00"},tue:{start:"09:00",end:"18:00"},wed:{start:"09:00",end:"18:00"},thu:{start:"09:00",end:"18:00"},fri:{start:"09:00",end:"18:00"}}});}} style={{marginBottom:16,padding:"10px 20px",borderRadius:10,background:"linear-gradient(135deg,#4cc9ff,#2da8ff)",border:"none",color:"var(--text-primary)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>+ {t("add_doctor")}</button>
    {staff.length===0?<div style={{padding:32,textAlign:"center",borderRadius:16,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
      <div style={{fontSize:40,marginBottom:12}}>{"\u{1F468}‍⚕️"}</div>
      <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{t("no_staff_yet")}</div>
      <div style={{fontSize:13,color:"var(--text-muted)"}}>{t("no_staff_hint")}</div>
    </div>:
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {staff.map(s=><div key={s.id} style={{padding:16,borderRadius:14,background:"var(--bg-card)",border:"1px solid var(--border-default)",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"var(--text-primary)",fontSize:16}}>{(s.first_name||"?")[0]}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:14}}>{s.title?s.title+" ":""}{s.first_name} {s.last_name}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",display:"flex",gap:8}}>
            <span>{ROLES.find(r=>r.v===s.role)?.l||s.role}</span>
            {s.specialty&&<span>{"·"} {s.specialty}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {s.email && <button onClick={async ()=>{
            try {
              const mod = await import("../../api/client");
              await mod.inviteTeamMember({ email: s.email, name: `${s.first_name||""} ${s.last_name||""}`.trim(), role: s.role === "doctor" ? "clinic_doctor" : "clinic_coordinator" });
              showT(`${t("invite_sent_to") || "Einladung an"} ${s.email} ${t("sent") || "gesendet"}`);
            } catch (e) { showT(e.message || (t("error_sending") || "Fehler beim Senden")); }
          }} style={{padding:"6px 12px",borderRadius:8,background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.15)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"📧 " + (invitedEmails.has(s.email?.toLowerCase()) ? (t("reinvite") || "Erneut einladen") : (t("invite") || "Einladen"))}</button>}
          <button onClick={()=>{setEditing(s.id);setForm({...s});}} style={{padding:"6px 12px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("edit") || "Bearbeiten"}</button>
          <button onClick={()=>removeStaff(s.id)} style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("archive") || "Archivieren"}</button>
        </div>
      </div>)}
    </div>}
  </div>;
}

// Team & Personal panel with plan-based slots and doctor access section
export default function TeamPersonal({ clinic, activeClinicId, updateClinic, showT, setView, t, teamEmails, setTeamEmails, wizardMode }) {
  const plan = clinic.plan || "core";
  const teamLimit = TEAM_LIMITS[plan] || 1;
  const locked = false; // team never locks
  const stored = (() => { try { return JSON.parse(localStorage.getItem("fm_teamSlots_" + activeClinicId) || "{}"); } catch { return {}; } })();
  const teamMap = { ...stored, ...(clinic.teamSlots || {}) };

  const addMember = (slotIdx) => {
    const email = (teamEmails[slotIdx] || "").trim();
    if (!email || !email.includes("@")) { showT(t("enter_valid_email")); return; }
    const member = { name: email.split("@")[0], email, role: "Member", lastLogin: "-", inviteStatus: "pending" };
    const updated = { ...teamMap, [slotIdx]: member };
    // Persist to localStorage so it survives API refreshes
    try { localStorage.setItem("fm_teamSlots_" + activeClinicId, JSON.stringify(updated)); } catch(e) {}
    updateClinic({ teamSlots: updated, team: Object.values(updated) });
    showT(t("invite_sent"));
    setTeamEmails(prev => ({ ...prev, [slotIdx]: "" }));
  };

  const planLabel = { core: "Core", pro: "Pro", operations: "Operations", enterprise: "Enterprise" }[plan] || "Core";

  // Wizard mode: only show doctor/staff management (StaffPanel)
  if (wizardMode) {
    return <div>
      <StaffPanel />
    </div>;
  }

  return <div>
    {/* Team slots section */}
    {locked && <LockedBanner t={t} />}
    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 8px" }}>{t("setup_team_desc")}</p>
    <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.08)", marginBottom: 16, fontSize: 12, color: "var(--text-muted)" }}>
      {planLabel} — {teamLimit >= 999 ? (t("unlimited")) : teamLimit} {t("team_slots")}
    </div>
    <div style={{ display: "grid", gap: 8 }}>
      {Array.from({ length: teamLimit }, (_, i) => i).map(i => { const member = teamMap[i] || null; return (
        <div key={i} style={{ padding: "12px 16px", borderRadius: 12, background: member ? "var(--bg-section)" : "var(--bg-section)", border: `1px solid ${member ? "var(--border-strong)" : "var(--border-subtle)"}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 6 }}>{t("slot")} {i + 1}</div>
          {member ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${["#4cc9ff","#a78bfa","#ff8a2a","#10b981","#ec4899","#06b6d4"][Math.abs([...(member.name || "")].reduce((a, c) => a + c.charCodeAt(0), 0)) % 6]}12`, border: `1px solid ${["#4cc9ff","#a78bfa","#ff8a2a","#10b981","#ec4899","#06b6d4"][Math.abs([...(member.name || "")].reduce((a, c) => a + c.charCodeAt(0), 0)) % 6]}25`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: ["#4cc9ff","#a78bfa","#ff8a2a","#10b981","#ec4899","#06b6d4"][Math.abs([...(member.name || "")].reduce((a, c) => a + c.charCodeAt(0), 0)) % 6], fontSize: 11 }}>{(member.name || "?").split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{member.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{member.email}</div>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: member.inviteStatus === "active" ? "rgba(16,185,129,0.12)" : "rgba(255,138,42,0.12)", color: member.inviteStatus === "active" ? "#10b981" : "#ff8a2a" }}>{member.inviteStatus === "active" ? (t("active") || "Aktiv") : (t("pending") || "Ausstehend")}</span>
              <button onClick={() => { const updated = { ...teamMap }; delete updated[i]; try { localStorage.setItem("fm_teamSlots_" + activeClinicId, JSON.stringify(updated)); } catch(e) {} updateClinic({ teamSlots: updated, team: Object.values(updated) }); showT(t("member_archived") || "Archiviert"); }} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t("archive") || "Archivieren"}</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, opacity: locked ? 0.4 : 1, pointerEvents: locked ? "none" : "auto" }}>
              <input value={teamEmails[i] || ""} onChange={e => setTeamEmails(prev => ({ ...prev, [i]: e.target.value }))} autoComplete="off" placeholder="email@clinic.com" onKeyDown={e => e.key === "Enter" && addMember(i)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
              <button onClick={() => addMember(i)} style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(76,201,255,0.12)", border: "1px solid rgba(76,201,255,0.25)", color: "#4cc9ff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>+ {t("invite")}</button>
            </div>
          )}
        </div>
      ); })}
    </div>
    {/* All slots filled message */}
    {Object.keys(teamMap).length >= teamLimit && teamLimit < 999 && <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,138,42,0.04)", border: "1px solid rgba(255,138,42,0.1)", marginTop: 8, fontSize: 12, color: "#ff8a2a", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 14 }}>{"⚠️"}</span>
      {t("all_crm_slots_used") || "Alle CRM-Zugaenge belegt"}
    </div>}
    {/* Batch invite all filled slots */}
    {Array.from({ length: teamLimit }, (_, i) => i).some(i => !teamMap[i] && (teamEmails[i] || "").trim().includes("@")) && <button onClick={() => {
      let invited = 0;
      Array.from({ length: teamLimit }, (_, i) => i).forEach(i => {
        if (teamMap[i]) return;
        const email = (teamEmails[i] || "").trim();
        if (!email || !email.includes("@")) return;
        const updated = { ...(clinic.teamSlots || {}), [i]: { name: email.split("@")[0], email, role: "Member", lastLogin: "-", inviteStatus: "pending" } };
        updateClinic({ teamSlots: updated, team: Object.values(updated) });
        setTeamEmails(prev => ({ ...prev, [i]: "" }));
        invited++;
      });
      if (invited > 0) showT(invited + " " + (t("invites_sent")));
    }} style={{ marginTop: 12, padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #4cc9ff, #2da8ff)", border: "none", color: "var(--text-primary)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>{t("invite_all")}</button>}
    {teamLimit < 999 && <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-faint)" }}>
      {t("need_more_slots")} <span onClick={() => { setView("subscription"); }} style={{ color: "#ff8a2a", cursor: "pointer", fontWeight: 600 }}>{t("addon")} {"→"}</span>
    </div>}

    {/* Doctor access section */}
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border-default)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{"\u{1F468}‍⚕️"}</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{t("sg_doctor_access") || "Arzt-Zugaenge"}</h3>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>{t("doctor_portal_desc") || "Aerzte erhalten Zugang ueber das Arzt-Portal, um Fotos zu bewerten und Behandlungsplaene zu erstellen."}</p>
      <StaffPanel/>
    </div>
  </div>;
}
