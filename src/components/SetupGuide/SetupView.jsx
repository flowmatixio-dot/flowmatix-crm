import { updateClinicSettings, getWaProfile, updateWaProfile, uploadWaProfilePhoto } from "../../api/client";
import { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import WhatsAppSetup from "../SetupGuide/WhatsAppSetup";

const SETUP_CATS = [
  { id: "overview", icon: "📋", key: "setup_overview" },
  { id: "profile", icon: "🏥", key: "sg_profile", desc: "Stammdaten Ihrer Klinik hinterlegen", time: "2 Min.", tier: "required" },
  { id: "treatments", icon: "💉", key: "sg_treatments", desc: "Definieren Sie Ihre angebotenen Behandlungen", time: "3 Min.", tier: "required" },
  { id: "team", icon: "👥", key: "sg_team", desc: "Fügen Sie Ihre Ärzte und Mitarbeiter hinzu", time: "2 Min.", tier: "required" },
  { id: "calendar", icon: "📅", key: "sg_calendar", desc: "Verbinden Sie Ihren Kalender und definieren Sie Verfügbarkeiten", time: "2 Min.", tier: "required" },
  { id: "whatsapp", icon: "💬", key: "setup_whatsapp", desc: "Verbinden Sie Ihre offizielle WhatsApp Business Nummer", time: "5 Min.", tier: "required" },
  { id: "wa_profile", icon: "🤖", key: "sg_wa_profile", desc: "Definieren Sie Name und Persönlichkeit Ihres AI Assistants", time: "3 Min.", tier: "recommended" },
  { id: "bot_config", icon: "⚙️", key: "sg_bot_config", desc: "Konfigurieren Sie den Intake-Flow und Terminlogik", time: "5 Min.", tier: "required" },
  { id: "languages", icon: "🌐", key: "sg_languages", desc: "Aktivieren Sie weitere Sprachen für internationale Patienten", time: "1 Min.", tier: "optional" },
  { id: "templates", icon: "📝", key: "sg_templates", desc: "Bestätigungen und Reminder Nachrichten einrichten", time: "2 Min.", tier: "recommended" },
  { id: "automations", icon: "⚙️", key: "sg_automations", desc: "Follow-ups und automatische Workflows aktivieren", time: "2 Min.", tier: "recommended" },
  { id: "flights", icon: "✈️", key: "sg_flights", desc: "Optional für internationale Patienten mit Flughafentransfer", time: "1 Min.", tier: "optional" },
  { id: "invoicing", icon: "🧾", key: "sg_rechnung", desc: "Rechnungsdaten und Zahlungseinstellungen", time: "2 Min.", tier: "recommended" },
];

const TEAM_LIMITS = { core: 1, pro: 3, operations: 5, enterprise: 999 };

const CHECKS = {
  profile: c => !!(c.name && c.address && c.phone && c.clinicEmail),
  treatments: c => (c.aiConfig?.services?.length || 0) >= 1,
  team: c => (c.team?.length || 0) >= 1,
  calendar: c => !!(c.aiConfig?.bookingRules),
  whatsapp: c => !!(c.waSetupProgress?.connection_tested),
  wa_profile: c => !!(c.waProfile?.botName && c.waProfile?.infoText),
  bot_config: c => !!(c.aiConfig?.clinicDesc),
  languages: c => (c.aiConfig?.allowedLangs?.length || 0) >= 3,
  templates: c => !!(c.logisticsConfig?.pickupTemplateEn),
  automations: c => (c.automations?.filter(a => a.active)?.length || 0) >= 2,
  flights: c => c.logisticsConfig?.autoNotifyDriver === true,
  invoicing: c => !!(c.bankName && c.iban),
};

const LockedBanner = ({ t }) => (
  <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
    <span style={{ fontSize: 16 }}>🔒</span>
    <div>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#10b981" }}>{t("setup_locked")}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("setup_locked_desc")}</div>
    </div>
  </div>
);

const Field = ({ label, value, onChange, placeholder, type = "text", disabled }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
    {type === "textarea"
      ? <textarea value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: disabled ? "var(--bg-section)" : "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: disabled ? "var(--text-faint)" : "#fff", fontFamily: "inherit", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
      : <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: disabled ? "var(--bg-section)" : "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: disabled ? "var(--text-faint)" : "#fff", fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" }} />}
  </div>
);

const SaveBtn = ({ onClick, t }) => (
  <button onClick={onClick} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #4cc9ff, #2da8ff)", border: "none", color: "var(--text-primary)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t("save_changes")}</button>
);

const TIMEZONES = ["Europe/Berlin","Europe/Istanbul","Europe/London","Europe/Paris","Europe/Rome","Europe/Madrid","Europe/Lisbon","Europe/Amsterdam","Europe/Vienna","Europe/Zurich","Europe/Brussels","Europe/Warsaw","Europe/Prague","Europe/Budapest","Europe/Athens","Europe/Helsinki","Europe/Stockholm","Europe/Oslo","Europe/Copenhagen","America/New_York","America/Chicago","America/Los_Angeles","America/Sao_Paulo","Asia/Dubai","Asia/Riyadh","Asia/Tehran","Asia/Kolkata","Asia/Bangkok","Asia/Tokyo","Asia/Seoul","Australia/Sydney","Africa/Cairo","Africa/Johannesburg"];

export default function SetupView() {

// ── STAFF / ÄRZTE MANAGEMENT ──
function StaffPanel() {
  const { clinic, activeClinicId, showT, t } = useApp();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const loadStaff = async () => {
    try {
      const res = await import("../../api/client").then(m => m.getStaff());
      setStaff(res?.staff || []);
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
      <Field label={t("phone")} value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} placeholder="+90 555 ..." />
    </div>
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
      <div style={{fontSize:40,marginBottom:12}}>👨‍⚕️</div>
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
            {s.specialty&&<span>· {s.specialty}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>{setEditing(s.id);setForm({...s});}} style={{padding:"6px 12px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("edit")}</button>
          <button onClick={()=>removeStaff(s.id)} style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("remove")}</button>
        </div>
      </div>)}
    </div>}
  </div>;
}

// ── TREATMENT TYPES ──
function TreatmentsPanel() {
  const { clinic, showT, t } = useApp();
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const loadTreatments = async () => {
    try {
      const res = await import("../../api/client").then(m => m.getTreatments());
      setTreatments(res?.treatments || []);
    } catch { setTreatments([]); }
    setLoading(false);
  };
  useEffect(() => { loadTreatments(); }, []);

  const saveTreatment = async () => {
    const mod = await import("../../api/client");
    try {
      if (editing === "new") {
        await mod.createTreatment(form);
        showT(t("treatment_added"));
      } else {
        await mod.updateTreatment(editing, form);
        showT(t("treatment_updated"));
      }
      setEditing(null); setForm({});
      loadTreatments();
    } catch (e) { showT(t("error") + ": " + e.message); }
  };

  const removeTreatment = async (id) => {
    const mod = await import("../../api/client");
    await mod.deleteTreatment(id);
    showT(t("treatment_removed"));
    loadTreatments();
  };

  if (loading) return <div style={{padding:20,color:"var(--text-muted)"}}>{t("loading")}</div>;

  if (editing) return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <h3 style={{margin:0,fontSize:16,fontWeight:800}}>{editing==="new"?(t("add_treatment")):(t("edit_treatment"))}</h3>
      <button onClick={()=>{setEditing(null);setForm({});}} style={{padding:"6px 14px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border-strong)",color:"var(--text-muted)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t("cancel")}</button>
    </div>
    <Field label={t("treatment_name")} value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="FUE Hair Transplant" />
    <Field label={t("description")} value={form.description} onChange={v=>setForm(f=>({...f,description:v}))} placeholder="Beschreibung der Behandlung..." type="textarea" />
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
      <Field label={t("duration_min")} value={form.duration_minutes} onChange={v=>setForm(f=>({...f,duration_minutes:parseInt(v)||60}))} placeholder="60" type="number" />
      <Field label={t("buffer_min")} value={form.buffer_minutes} onChange={v=>setForm(f=>({...f,buffer_minutes:parseInt(v)||0}))} placeholder="0" type="number" />
      <Field label={t("currency")} value={form.currency} onChange={v=>setForm(f=>({...f,currency:v}))} placeholder="EUR" />
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label={t("price_from")} value={form.price_from} onChange={v=>setForm(f=>({...f,price_from:v}))} placeholder="2500" type="number" />
      <Field label={t("price_to")} value={form.price_to} onChange={v=>setForm(f=>({...f,price_to:v}))} placeholder="6000" type="number" />
    </div>
    <div style={{display:"flex",gap:20,marginBottom:12}}>
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"var(--text-muted)",cursor:"pointer"}}>
        <input type="checkbox" checked={form.requires_consultation!==false} onChange={e=>setForm(f=>({...f,requires_consultation:e.target.checked}))} />
        {t("requires_consultation")}
      </label>
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"var(--text-muted)",cursor:"pointer"}}>
        <input type="checkbox" checked={form.requires_photos!==false} onChange={e=>setForm(f=>({...f,requires_photos:e.target.checked}))} />
        {t("requires_photos")}
      </label>
    </div>
    <SaveBtn onClick={saveTreatment} t={t} />
  </div>;

  return <div>
    <p style={{fontSize:13,color:"var(--text-muted)",margin:"0 0 16px"}}>{t("treatments_desc")}</p>
    <button onClick={()=>{setEditing("new");setForm({duration_minutes:60,buffer_minutes:0,currency:"EUR",requires_consultation:true,requires_photos:true});}} style={{marginBottom:16,padding:"10px 20px",borderRadius:10,background:"linear-gradient(135deg,#4cc9ff,#2da8ff)",border:"none",color:"var(--text-primary)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>+ {t("add_treatment")}</button>
    {treatments.length===0?<div style={{padding:32,textAlign:"center",borderRadius:16,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
      <div style={{fontSize:40,marginBottom:12}}>💉</div>
      <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{t("no_treatments")}</div>
      <div style={{fontSize:13,color:"var(--text-muted)"}}>{t("no_treatments_hint")}</div>
    </div>:
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {treatments.map(tr=><div key={tr.id} style={{padding:16,borderRadius:14,background:"var(--bg-card)",border:"1px solid var(--border-default)",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#8b5cf6,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"var(--text-primary)",fontSize:16}}>💉</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:14}}>{tr.name}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",display:"flex",gap:8,flexWrap:"wrap"}}>
            <span>⏱ {tr.duration_minutes} {t("minutes_short")}</span>
            {tr.price_from&&<span>💰 {tr.price_from}{tr.price_to?"-"+tr.price_to:""} {tr.currency||"EUR"}</span>}
            {tr.requires_photos&&<span>📷</span>}
            {tr.requires_consultation&&<span>🩺</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>{setEditing(tr.id);setForm({...tr});}} style={{padding:"6px 12px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("edit")}</button>
          <button onClick={()=>removeTreatment(tr.id)} style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("remove")}</button>
        </div>
      </div>)}
    </div>}
  </div>;
}

// ── BOT CONFIGURATION ──
function BotConfigPanel() {
  const { clinic, showT, t } = useApp();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});

  const loadConfig = async () => {
    try {
      const res = await import("../../api/client").then(m => m.getBotConfig());
      const c = res?.config || {};
      setConfig(c); setForm(c);
    } catch { setConfig({}); setForm({}); }
    setLoading(false);
  };
  useEffect(() => { loadConfig(); }, []);

  const saveConfig = async () => {
    const mod = await import("../../api/client");
    try {
      await mod.updateBotConfig(form);
      showT(t("bot_config_saved"));
      loadConfig();
    } catch (e) { showT(t("error") + ": " + e.message); }
  };

  const FORMALITIES = [{v:"formal",l:t("formality_formal")},{v:"informal",l:t("formality_informal")}];
  const GREETINGS = [{v:"warm",l:t("greeting_warm")},{v:"professional",l:t("greeting_professional")},{v:"casual",l:t("greeting_casual")}];
  const TONALITIES = [{v:"concierge",l:t("tonality_concierge")},{v:"medical",l:t("tonality_medical")},{v:"friendly",l:t("tonality_friendly")},{v:"formal",l:t("tonality_formal")}];

  if (loading) return <div style={{padding:20,color:"var(--text-muted)"}}>{t("loading")}</div>;

  return <div>
    <p style={{fontSize:13,color:"var(--text-muted)",margin:"0 0 16px"}}>{t("bot_config_desc")}</p>

    <div style={{padding:16,borderRadius:14,background:"rgba(76,201,255,0.04)",border:"1px solid rgba(76,201,255,0.1)",marginBottom:20}}>
      <div style={{fontSize:11,fontWeight:700,color:"#4cc9ff",marginBottom:8,textTransform:"uppercase"}}>🤖 AI Engine</div>
      <div style={{fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{t("claude_anthropic")}</div>
      <div style={{fontSize:12,color:"var(--text-muted)"}}>{t("haiku_desc")}</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label={t("bot_name")} value={form.bot_name} onChange={v=>setForm(f=>({...f,bot_name:v}))} placeholder={clinic?.name||"Klinik Assistent"} />
      <Field label={t("clinic_name")} value={form.clinic_name} onChange={v=>setForm(f=>({...f,clinic_name:v}))} placeholder="Hair of Istanbul" />
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:4}}>{t("formality")}</div>
        <select value={form.formality||"formal"} onChange={e=>setForm(f=>({...f,formality:e.target.value}))} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:13,outline:"none"}}>
          {FORMALITIES.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:4}}>{t("greeting_style")}</div>
        <select value={form.greeting_style||"warm"} onChange={e=>setForm(f=>({...f,greeting_style:e.target.value}))} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:13,outline:"none"}}>
          {GREETINGS.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:4}}>{t("tonality")}</div>
        <select value={form.tonality||"concierge"} onChange={e=>setForm(f=>({...f,tonality:e.target.value}))} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:13,outline:"none"}}>
          {TONALITIES.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
      </div>
    </div>

    <Field label={t("welcome_message")} value={form.welcome_message} onChange={v=>setForm(f=>({...f,welcome_message:v}))} placeholder="Willkommen bei unserer Klinik! Wie können wir Ihnen helfen?" type="textarea" />
    <Field label={t("photo_instructions")} value={form.photo_instructions} onChange={v=>setForm(f=>({...f,photo_instructions:v}))} placeholder="Bitte senden Sie Fotos von vorne, oben und hinten..." type="textarea" />
    <Field label={t("after_hours_msg")} value={form.after_hours_message} onChange={v=>setForm(f=>({...f,after_hours_message:v}))} placeholder="Vielen Dank für Ihre Nachricht. Wir melden uns..." type="textarea" />
    <Field label={t("gdpr_text")} value={form.auto_gdpr_text} onChange={v=>setForm(f=>({...f,auto_gdpr_text:v}))} placeholder="Mit dem Fortfahren stimmen Sie unserer Datenschutzrichtlinie zu..." type="textarea" />
    <Field label={t("custom_instructions")} value={form.custom_instructions} onChange={v=>setForm(f=>({...f,custom_instructions:v}))} placeholder="Immer auf PRP hinweisen, wenn Patient nach Haarausfall fragt..." type="textarea" />
    <Field label={t("max_msg_length")} value={form.max_message_length} onChange={v=>setForm(f=>({...f,max_message_length:parseInt(v)||400}))} placeholder="400" type="number" />

    <div style={{marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:6}}>{t("never_say")}</div>
      <div style={{fontSize:10,color:"var(--text-faint)",marginBottom:6}}>{t("blocked_terms_hint")}</div>
      <textarea value={(form.never_say||[]).join("\n")} onChange={e=>setForm(f=>({...f,never_say:e.target.value.split("\n").filter(x=>x.trim())}))} rows={3} placeholder="Garantie\nSchmerzfrei\n100%" style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}} />
    </div>

    <SaveBtn onClick={saveConfig} t={t} />
  </div>;
}

// ── FAQ KNOWLEDGE BASE ──
function FaqPanel() {
  const { clinic, showT, t } = useApp();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({question:"",answer:""});

  const loadConfig = async () => {
    try {
      const res = await import("../../api/client").then(m => m.getBotConfig());
      const c = res?.config || {};
      setConfig(c);
      setFaqs(c.faq_entries || []);
    } catch { setConfig({}); setFaqs([]); }
    setLoading(false);
  };
  useEffect(() => { loadConfig(); }, []);

  const saveFaqs = async (newFaqs) => {
    const mod = await import("../../api/client");
    try {
      await mod.updateBotConfig({ faq_entries: newFaqs });
      setFaqs(newFaqs);
      showT(t("faq_saved"));
    } catch (e) { showT(t("error") + ": " + e.message); }
  };

  const addFaq = () => {
    if (!form.question.trim() || !form.answer.trim()) return showT(t("enter_qa"));
    const newFaqs = [...faqs, { question: form.question.trim(), answer: form.answer.trim() }];
    saveFaqs(newFaqs);
    setForm({question:"",answer:""});
    setEditing(null);
  };

  const removeFaq = (idx) => {
    const newFaqs = faqs.filter((_, i) => i !== idx);
    saveFaqs(newFaqs);
  };

  const updateFaq = (idx) => {
    if (!form.question.trim() || !form.answer.trim()) return;
    const newFaqs = [...faqs];
    newFaqs[idx] = { question: form.question.trim(), answer: form.answer.trim() };
    saveFaqs(newFaqs);
    setEditing(null);
    setForm({question:"",answer:""});
  };

  if (loading) return <div style={{padding:20,color:"var(--text-muted)"}}>{t("loading")}</div>;

  return <div>
    <p style={{fontSize:13,color:"var(--text-muted)",margin:"0 0 16px"}}>{t("faq_desc")}</p>

    <div style={{marginBottom:20,padding:16,borderRadius:14,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
      <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:8,textTransform:"uppercase"}}>{editing!==null&&editing!=="new"?(t("edit_faq")):(t("add_faq"))}</div>
      <Field label={t("question")} value={form.question} onChange={v=>setForm(f=>({...f,question:v}))} placeholder="Was kostet eine Haartransplantation?" />
      <Field label={t("answer")} value={form.answer} onChange={v=>setForm(f=>({...f,answer:v}))} placeholder="Die Kosten variieren je nach Methode..." type="textarea" />
      <div style={{display:"flex",gap:8}}>
        {editing!==null&&editing!=="new"?<>
          <button onClick={()=>updateFaq(editing)} style={{padding:"8px 16px",borderRadius:8,background:"linear-gradient(135deg,#4cc9ff,#2da8ff)",border:"none",color:"var(--text-primary)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{t("save")}</button>
          <button onClick={()=>{setEditing(null);setForm({question:"",answer:""});}} style={{padding:"8px 16px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border-strong)",color:"var(--text-muted)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t("cancel")}</button>
        </>:<button onClick={addFaq} style={{padding:"8px 16px",borderRadius:8,background:"linear-gradient(135deg,#4cc9ff,#2da8ff)",border:"none",color:"var(--text-primary)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>+ {t("add")}</button>}
      </div>
    </div>

    {faqs.length===0?<div style={{padding:32,textAlign:"center",borderRadius:16,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
      <div style={{fontSize:40,marginBottom:12}}>❓</div>
      <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{t("no_faqs")}</div>
      <div style={{fontSize:13,color:"var(--text-muted)"}}>{t("no_faqs_hint")}</div>
    </div>:
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {faqs.map((faq,i)=><div key={i} style={{padding:14,borderRadius:14,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <div style={{fontWeight:700,fontSize:14,color:"#4cc9ff"}}>❓ {faq.question}</div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={()=>{setEditing(i);setForm({question:faq.question,answer:faq.answer});}} style={{padding:"4px 10px",borderRadius:6,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("edit")}</button>
            <button onClick={()=>removeFaq(i)} style={{padding:"4px 10px",borderRadius:6,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
          </div>
        </div>
        <div style={{fontSize:13,color:"var(--text-muted)",lineHeight:1.5}}>{faq.answer}</div>
      </div>)}
    </div>}
  </div>;
}
  const { clinic, activeClinicId, setClinics, showT, setView, t } = useApp();
  const [tab, setTab] = useState("overview");
  const [localData, setLocalData] = useState({});
  const [teamEmails, setTeamEmails] = useState({});

  const progress = useMemo(() => {
    if (!clinic) return { done: 0, total: 0, pct: 0 };
    const total = Object.keys(CHECKS).length;
    const done = Object.values(CHECKS).filter(fn => fn(clinic)).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [clinic]);

  if (!clinic) return null;

  const plan = clinic.plan || "core";
  const teamLimit = TEAM_LIMITS[plan] || 1;
  const isDone = (id) => CHECKS[id] ? CHECKS[id](clinic) : false;

  let _saveTimer = null;
  const updateClinic = (patch) => {
    setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, ...patch } : c));
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => { updateClinicSettings(patch).catch(() => {}); }, 800);
  };

  /* --- Overview --- */
  const TIER_META = {
    required: { label: t("sg_required") || "Erforderlich", color: "#4cc9ff", bg: "rgba(76,201,255,0.06)", border: "rgba(76,201,255,0.15)" },
    recommended: { label: t("sg_recommended") || "Empfohlen", color: "#ff8a2a", bg: "rgba(255,138,42,0.04)", border: "rgba(255,138,42,0.1)" },
    optional: { label: t("sg_optional_label") || "Optional", color: "rgba(167,177,195,0.5)", bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.06)" },
  };
  const stepsRemaining = progress.total - progress.done;
  const OverviewPanel = () => (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: "var(--text-primary)" }}>{t("setup_overview_title") || "Einrichtung"}</h2>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px", lineHeight: 1.5 }}>
        {progress.pct === 100
          ? (t("sg_setup_complete_desc") || "Ihre Klinik ist vollständig eingerichtet.")
          : (t("setup_overview_desc_new") || "Schließen Sie die folgenden Schritte ab, um Ihre Klinik betriebsbereit zu machen.")}
      </p>

      {/* Progress section */}
      <div style={{ padding: 20, borderRadius: 16, background: progress.pct === 100 ? "rgba(16,185,129,0.04)" : "rgba(76,201,255,0.03)", border: `1px solid ${progress.pct === 100 ? "rgba(16,185,129,0.12)" : "rgba(76,201,255,0.08)"}`, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>{progress.done} {t("sg_of") || "von"} {progress.total} {t("sg_steps_completed") || "Schritten abgeschlossen"}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              {progress.pct === 100
                ? (t("sg_ai_live") || "Ihr AI Assistant ist bereit.")
                : stepsRemaining <= 3
                  ? (t("sg_almost_done") || "Fast geschafft! Noch " + stepsRemaining + " Schritte bis Ihr AI Assistant live ist.")
                  : (t("sg_steps_remaining_prefix") || "Noch ") + stepsRemaining + (t("sg_steps_remaining_suffix") || " Schritte bis Ihr AI Assistant live ist")}
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: progress.pct === 100 ? "#10b981" : "#4cc9ff", lineHeight: 1 }}>{progress.pct}%</div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
          <div style={{ height: 8, borderRadius: 4, background: progress.pct === 100 ? "#10b981" : "linear-gradient(90deg, #4cc9ff, #2da8ff)", width: `${progress.pct}%`, transition: "width .6s ease" }} />
        </div>
      </div>

      {/* Step cards */}
      <div style={{ display: "grid", gap: 10 }}>
        {SETUP_CATS.filter(c => c.id !== "overview").map((cat, idx) => {
          const done = isDone(cat.id);
          const tierMeta = TIER_META[cat.tier] || TIER_META.recommended;
          return <div key={cat.id} onClick={() => setTab(cat.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 14, background: done ? "rgba(16,185,129,0.03)" : "var(--bg-section)", border: `1px solid ${done ? "rgba(16,185,129,0.12)" : "var(--border-default)"}`, cursor: "pointer", transition: "all .15s" }} onMouseEnter={e => { if (!done) { e.currentTarget.style.borderColor = tierMeta.border; e.currentTarget.style.background = tierMeta.bg; } }} onMouseLeave={e => { if (!done) { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.background = "var(--bg-section)"; } }}>
            {/* Step number / check */}
            <div style={{ width: 36, height: 36, borderRadius: 10, background: done ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: done ? 16 : 18, fontWeight: 800, color: done ? "#10b981" : "var(--text-faint)", flexShrink: 0 }}>
              {done ? "✓" : cat.icon}
            </div>
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: done ? "#10b981" : "var(--text-primary)" }}>{t(cat.key) || cat.id}</span>
                {cat.tier === "optional" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-faint)" }}>{t("sg_optional_label") || "Optional"}</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{cat.desc}</div>
            </div>
            {/* Right side: status + time */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              {done
                ? <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", padding: "3px 10px", borderRadius: 7, background: "rgba(16,185,129,0.08)" }}>{t("done") || "Fertig"}</span>
                : <span style={{ fontSize: 11, fontWeight: 700, color: tierMeta.color, padding: "3px 10px", borderRadius: 7, background: tierMeta.bg }}>{t("sg_open") || "Offen"}</span>}
              {!done && cat.time && <span style={{ fontSize: 10, color: "var(--text-faint)" }}>ca. {cat.time}</span>}
            </div>
          </div>;
        })}
      </div>

      {progress.pct === 100 && <div style={{ padding: 20, borderRadius: 16, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", textAlign: "center", marginTop: 20 }}>
        <span style={{ fontSize: 32 }}>🎉</span>
        <div style={{ fontWeight: 800, fontSize: 17, color: "#10b981", marginTop: 6 }}>{t("sg_all_set") || "Alles eingerichtet!"}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{t("sg_ai_ready") || "Ihr AI Assistant ist jetzt live und bereit, Patienten zu betreuen."}</div>
      </div>}
    </div>
  );

  /* --- Profile --- */
  const ProfilePanel = () => {
    const locked = isDone("profile");
    const d = { name: clinic.name || "", address: clinic.address || "", phone: clinic.phone || "", clinicEmail: clinic.clinicEmail || "", timezone: clinic.timezone || "Europe/Berlin", ...localData.profile };
    const set = (k, v) => setLocalData(prev => ({ ...prev, profile: { ...prev.profile, [k]: v } }));
    return <div>
      {locked && <LockedBanner t={t} />}
      <div style={{ opacity: locked ? 0.5 : 1, pointerEvents: locked ? "none" : "auto" }}>
        <Field label={t("clinic_name")} value={d.name} onChange={v => set("name", v)} placeholder="Istanbul Hair Clinic" disabled={locked} />
        <Field label={t("address")} value={d.address} onChange={v => set("address", v)} placeholder="Musterstrasse 1, 26135 Oldenburg" disabled={locked} />
        <Field label={t("phone")} value={d.phone} onChange={v => set("phone", v)} placeholder="+49 441 123456" disabled={locked} />
        <Field label={t("email")} value={d.clinicEmail} onChange={v => set("clinicEmail", v)} placeholder="info@clinic.com" disabled={locked} />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{t("timezone")}</div>
          <select value={d.timezone} onChange={e => set("timezone", e.target.value)} disabled={locked} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer" }}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <SaveBtn onClick={() => { updateClinic(d); setLocalData(p => ({ ...p, profile: {} })); showT(t("saved")); }} t={t} />
      </div>
    </div>;
  };

  /* --- Calendar --- */
  const CalendarPanel = () => {
    const rules = clinic.aiConfig?.bookingRules || {};
    return <div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>{t("setup_calendar_desc")}</p>
      <div style={{ padding: 16, borderRadius: 12, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.12)", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>📅</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Google Calendar</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{clinic.googleCalendarId ? "✅ " + (t("connected")) : (t("not_connected"))}</div>
        </div>
        <button onClick={() => showT(t("google_oauth_coming_soon"))} style={{ padding: "8px 16px", borderRadius: 8, background: clinic.googleCalendarId ? "rgba(239,68,68,0.08)" : "rgba(76,201,255,0.12)", border: `1px solid ${clinic.googleCalendarId ? "rgba(239,68,68,0.2)" : "rgba(76,201,255,0.25)"}`, color: clinic.googleCalendarId ? "#ef4444" : "#4cc9ff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{clinic.googleCalendarId ? (t("disconnect_google")) : (t("connect_google"))}</button>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("booking_rules")}</div>
      <Field label={t("min_notice")} value={rules.minNoticeHours || 24} onChange={v => updateClinic({ aiConfig: { ...clinic.aiConfig, bookingRules: { ...rules, minNoticeHours: parseInt(v) || 24 } } })} type="number" />
      <Field label={t("slot_duration")} value={rules.slotDuration || 60} onChange={v => updateClinic({ aiConfig: { ...clinic.aiConfig, bookingRules: { ...rules, slotDuration: parseInt(v) || 60 } } })} type="number" />
    </div>;
  };

  /* --- Team (plan-based slots, each invite independent) --- */
  const TeamPanel = () => {
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

    return <div>
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
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(76,201,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#4cc9ff", fontSize: 13 }}>{member.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{member.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{member.email}</div>
                </div>
                <span style={{ padding: "3px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: member.inviteStatus === "active" ? "rgba(16,185,129,0.12)" : "rgba(255,138,42,0.12)", color: member.inviteStatus === "active" ? "#10b981" : "#ff8a2a" }}>{member.inviteStatus === "active" ? t("active") : t("pending")}</span>
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
      {/* Batch invite all filled slots */}
      {Array.from({ length: teamLimit }, (_, i) => i).some(i => !teamMap[i] && (teamEmails[i] || "").trim().includes("@")) && <button onClick={() => {
        let invited = 0;
        Array.from({ length: teamLimit }, (_, i) => i).forEach(i => {
          if (teamMap[i]) return; // already invited
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
        {t("need_more_slots")} <span onClick={() => { setView("subscription"); }} style={{ color: "#ff8a2a", cursor: "pointer", fontWeight: 600 }}>{t("addon")} →</span>
      </div>}
    </div>;
  };

  /* --- Rechnung (Invoice) + Logo Upload --- */
  const InvoicePanel = () => {
    const locked = isDone("invoicing");
    const d = { bankName: clinic.bankName || "", iban: clinic.iban || "", bic: clinic.bic || "", taxId: clinic.taxId || "", vatId: clinic.vatId || "", ...localData.invoice };
    const set = (k, v) => setLocalData(prev => ({ ...prev, invoice: { ...prev.invoice, [k]: v } }));

    const handleLogo = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 200 * 1024) { showT(t("logo_too_large")); return; }
      const reader = new FileReader();
      reader.onload = () => {
        updateClinic({ logo: reader.result });
        showT(t("saved"));
      };
      reader.readAsDataURL(file);
    };

    return <div>
      {locked && <LockedBanner t={t} />}
      <div style={{ opacity: locked ? 0.5 : 1, pointerEvents: locked ? "none" : "auto" }}>
        <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: "var(--bg-section)", border: "1px solid var(--border-default)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("clinic_logo")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {clinic.logo ? (
              <div style={{ position: "relative" }}>
                <img src={clinic.logo} alt="Logo" style={{ width: 64, height: 64, borderRadius: 10, objectFit: "contain", background: "var(--bg-card-elevated)" }} />
                <button onClick={() => updateClinic({ logo: null })} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 99, background: "#ef4444", border: "none", color: "var(--text-primary)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 10, background: "var(--border-subtle)", border: "2px dashed var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "var(--text-faint)" }}>🖼</div>
            )}
            <div>
              <label style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(76,201,255,0.12)", border: "1px solid rgba(76,201,255,0.25)", color: "#4cc9ff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                {t("upload_logo")}
                <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleLogo} style={{ display: "none" }} />
              </label>
              <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 6 }}>PNG/JPG, max 200KB</div>
            </div>
          </div>
        </div>

        <Field label={t("bank_name")} value={d.bankName} onChange={v => set("bankName", v)} placeholder="Deutsche Bank" disabled={locked} />
        <Field label="IBAN" value={d.iban} onChange={v => set("iban", v)} placeholder="DE89 3704 0044 0532 0130 00" disabled={locked} />
        <Field label="BIC/SWIFT" value={d.bic} onChange={v => set("bic", v)} placeholder="COBADEFFXXX" disabled={locked} />
        <Field label={t("tax_id")} value={d.taxId} onChange={v => set("taxId", v)} placeholder="DE123456789" disabled={locked} />
        <Field label={t("vat_id")} value={d.vatId} onChange={v => set("vatId", v)} placeholder="USt-IdNr." disabled={locked} />
        <SaveBtn onClick={() => { updateClinic(d); setLocalData(p => ({ ...p, invoice: {} })); showT(t("saved")); }} t={t} />

        {/* Deposit / Anzahlung Settings */}
        <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: "rgba(167,107,255,0.04)", border: "1px solid rgba(167,107,255,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>💳</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#a78bfa" }}>{t("deposit_settings")}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{t("deposit_desc")}</div>
              </div>
            </div>
            <button onClick={() => updateClinic({ depositEnabled: !clinic.depositEnabled })} style={{ width: 44, height: 24, borderRadius: 12, background: clinic.depositEnabled ? "#a78bfa" : "rgba(255,255,255,0.1)", border: "none", cursor: locked ? "default" : "pointer", position: "relative", transition: "background 0.2s" }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 3, left: clinic.depositEnabled ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
            </button>
          </div>
          {clinic.depositEnabled && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label={t("deposit_percentage")} value={String(clinic.depositPercentage || 25)} onChange={v => updateClinic({ depositPercentage: parseInt(v) || 25 })} placeholder="25" />
            <Field label={t("deposit_min")} value={String(clinic.depositMinAmount || 500)} onChange={v => updateClinic({ depositMinAmount: parseInt(v) || 500 })} placeholder="500" />
          </div>}
        </div>
      </div>
    </div>;
  };

  /* --- Drivers (NO lock, unlimited, always show add form) --- */
  const [newDriver, setNewDriver] = useState({ name: "", phone: "", vehicle: "", plate: "" });
  const DriversPanel = () => {
    const drivers = clinic.drivers || [];

    const addDriver = () => {
      if (!newDriver.name || !newDriver.phone) { showT(t("name_phone_required")); return; }
      const role = drivers.length === 0 ? "primary" : "backup";
      updateClinic({ drivers: [...drivers, { ...newDriver, role }] });
      showT(t("driver_added"));
      setNewDriver({ name: "", phone: "", vehicle: "", plate: "" });
    };

    const removeDriver = (idx) => {
      const updated = drivers.filter((_, i) => i !== idx);
      if (updated.length > 0 && !updated.some(d => d.role === "primary")) {
        updated[0].role = "primary";
      }
      updateClinic({ drivers: updated });
      showT(t("driver_removed"));
    };

    const setPrimary = (idx) => {
      const updated = drivers.map((d, i) => ({ ...d, role: i === idx ? "primary" : "backup" }));
      updateClinic({ drivers: updated });
      showT(t("saved"));
    };

    return <div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>{t("setup_drivers_desc")}</p>

      {drivers.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>{drivers.length} {t("drivers_registered")}</div>}

      {drivers.map((d, i) => (
        <div key={i} style={{ padding: "14px 16px", borderRadius: 12, background: "var(--bg-section)", border: "1px solid var(--border-default)", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>🚗</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              📱 {d.phone}{d.vehicle ? ` · 🚙 ${d.vehicle}` : ""}{d.plate ? ` · 🔢 ${d.plate}` : ""}
            </div>
          </div>
          {d.role !== "primary" && <button onClick={() => setPrimary(i)} title="Als Hauptfahrer setzen" style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", color: "#4cc9ff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>⭐</button>}
          <span style={{ fontSize: 11, fontWeight: 700, color: d.role === "primary" ? "#4cc9ff" : "var(--text-muted)", padding: "3px 10px", borderRadius: 7, background: d.role === "primary" ? "rgba(76,201,255,0.08)" : "var(--bg-card)" }}>
            {d.role === "primary" ? (t("primary_driver")) : (t("backup_driver"))}
          </span>
          <button onClick={() => removeDriver(i)} style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      ))}

      {/* Always show add form */}
      <div style={{ padding: 16, borderRadius: 12, background: "rgba(76,201,255,0.02)", border: "1px dashed rgba(76,201,255,0.12)", marginTop: drivers.length > 0 ? 12 : 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>+ {t("add_driver")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input value={newDriver.name} onChange={e => setNewDriver(p => ({ ...p, name: e.target.value }))} placeholder={t("driver_name")} style={{ padding: "9px 12px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
          <input value={newDriver.phone} onChange={e => setNewDriver(p => ({ ...p, phone: e.target.value }))} placeholder={(t("driver_phone")) + " (+49...)"} style={{ padding: "9px 12px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <input value={newDriver.vehicle} onChange={e => setNewDriver(p => ({ ...p, vehicle: e.target.value }))} placeholder={t("vehicle")} style={{ padding: "9px 12px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
          <input value={newDriver.plate} onChange={e => setNewDriver(p => ({ ...p, plate: e.target.value }))} placeholder={t("license_plate")} style={{ padding: "9px 12px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
        </div>
        <button onClick={addDriver} style={{ padding: "8px 18px", borderRadius: 8, background: "rgba(76,201,255,0.12)", border: "1px solid rgba(76,201,255,0.25)", color: "#4cc9ff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ {t("add_driver")}</button>
      </div>
    </div>;
  };

  /* --- Languages (plan-based) --- */
  const LANG_LIMITS = { core: 1, pro: 3, operations: 999, enterprise: 999 };
  const CORE_LANGS = [
    { code: "de", label: "Deutsch", flag: "🇩🇪" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "tr", label: "Turkce", flag: "🇹🇷" },
    { code: "es", label: "Espanol", flag: "🇪🇸" },
    { code: "fr", label: "Francais", flag: "🇫🇷" },
    { code: "it", label: "Italiano", flag: "🇮🇹" },
    { code: "pt", label: "Portugues", flag: "🇵🇹" },
    { code: "ar", label: "العربية", flag: "🇸🇦" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
  ];
  const EXTRA_LANGS = [
    { code: "pl", label: "Polski", flag: "🇵🇱" },
    { code: "nl", label: "Nederlands", flag: "🇳🇱" },
    { code: "uk", label: "Українська", flag: "🇺🇦" },
    { code: "ro", label: "Romana", flag: "🇷🇴" },
    { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
    { code: "cs", label: "Cestina", flag: "🇨🇿" },
    { code: "sv", label: "Svenska", flag: "🇸🇪" },
    { code: "da", label: "Dansk", flag: "🇩🇰" },
    { code: "fi", label: "Suomi", flag: "🇫🇮" },
    { code: "no", label: "Norsk", flag: "🇳🇴" },
    { code: "hu", label: "Magyar", flag: "🇭🇺" },
    { code: "bg", label: "Български", flag: "🇧🇬" },
    { code: "hr", label: "Hrvatski", flag: "🇭🇷" },
    { code: "sr", label: "Srpski", flag: "🇷🇸" },
    { code: "sk", label: "Slovencina", flag: "🇸🇰" },
    { code: "sl", label: "Slovenscina", flag: "🇸🇮" },
    { code: "lt", label: "Lietuviu", flag: "🇱🇹" },
    { code: "lv", label: "Latviesu", flag: "🇱🇻" },
    { code: "et", label: "Eesti", flag: "🇪🇪" },
    { code: "sq", label: "Shqip", flag: "🇦🇱" },
    { code: "bs", label: "Bosanski", flag: "🇧🇦" },
    { code: "mk", label: "Македонски", flag: "🇲🇰" },
    { code: "ka", label: "ქართული", flag: "🇬🇪" },
    { code: "hy", label: "Հայերեն", flag: "🇦🇲" },
    { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
    { code: "bn", label: "বাংলা", flag: "🇧🇩" },
    { code: "ur", label: "اردو", flag: "🇵🇰" },
    { code: "fa", label: "فارسی", flag: "🇮🇷" },
    { code: "he", label: "עברית", flag: "🇮🇱" },
    { code: "ja", label: "日本語", flag: "🇯🇵" },
    { code: "ko", label: "한국어", flag: "🇰🇷" },
    { code: "th", label: "ไทย", flag: "🇹🇭" },
    { code: "vi", label: "Tieng Viet", flag: "🇻🇳" },
    { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
    { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
    { code: "tl", label: "Filipino", flag: "🇵🇭" },
    { code: "sw", label: "Kiswahili", flag: "🇰🇪" },
    { code: "az", label: "Azerbaycanca", flag: "🇦🇿" },
    { code: "kk", label: "Қазақша", flag: "🇰🇿" },
    { code: "uz", label: "O'zbek", flag: "🇺🇿" },
    { code: "ku", label: "Kurdi", flag: "🏳️" },
    { code: "am", label: "አማርኛ", flag: "🇪🇹" },
    { code: "my", label: "မြန်မာ", flag: "🇲🇲" },
    { code: "ta", label: "தமிழ்", flag: "🇱🇰" },
    { code: "te", label: "తెలుగు", flag: "🇮🇳" },
    { code: "mr", label: "मराठी", flag: "🇮🇳" },
    { code: "gu", label: "ગુજરાતી", flag: "🇮🇳" },
    { code: "pa", label: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
    { code: "ne", label: "नेपाली", flag: "🇳🇵" },
    { code: "si", label: "සිංහල", flag: "🇱🇰" },
  ];
  const ALL_LANG_MAP = Object.fromEntries([...CORE_LANGS, ...EXTRA_LANGS].map(l => [l.code, l]));
  const ALL_LANGS = CORE_LANGS;
  const LanguagesPanel = () => {
    const langLimit = LANG_LIMITS[plan] || 1;
    const selected = clinic.aiConfig?.allowedLangs || [];
    const isLocked = clinic.languagesLocked === true;
    const toggle = (code) => {
      if (isLocked) return;
      const current = [...selected];
      if (current.includes(code)) {
        updateClinic({ aiConfig: { ...clinic.aiConfig, allowedLangs: current.filter(c => c !== code) } });
      } else {
        if (current.length >= langLimit && langLimit < 999) {
          showT(t("lang_limit_reached"));
          return;
        }
        updateClinic({ aiConfig: { ...clinic.aiConfig, allowedLangs: [...current, code] } });
      }
    };
    const finalizeLangs = () => {
      if (selected.length === 0) { showT(t("select_at_least_one")); return; }
      updateClinic({ languagesLocked: true });
      showT(t("languages_saved"));
    };
    const planLabel = { core: "Core", pro: "Pro", operations: "Operations", enterprise: "Enterprise" }[plan] || "Core";
    return <div>
      {isLocked && <LockedBanner t={t} />}
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 8px" }}>{t("setup_languages_redir")}</p>
      <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.08)", marginBottom: 8, fontSize: 12, color: "var(--text-muted)" }}>
        {planLabel} — {langLimit >= 999 ? (t("all_languages")) : langLimit + " " + (t("languages_included"))}
      </div>
      {!isLocked && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,138,42,0.04)", border: "1px solid rgba(255,138,42,0.1)", marginBottom: 16, fontSize: 11, color: "#ff8a2a", fontWeight: 600 }}>
        ⚠️ {t("languages_one_time")}
      </div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, opacity: isLocked ? 0.5 : 1, pointerEvents: isLocked ? "none" : "auto" }}>
        {[...ALL_LANGS, ...EXTRA_LANGS.filter(el => selected.includes(el.code))].map(lang => {
          const isOn = selected.includes(lang.code);
          const canToggle = !isLocked && (isOn || selected.length < langLimit || langLimit >= 999);
          return <div key={lang.code} onClick={() => canToggle && toggle(lang.code)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: isOn ? "rgba(16,185,129,0.06)" : "var(--bg-section)", border: `1px solid ${isOn ? "rgba(16,185,129,0.2)" : "var(--border-default)"}`, cursor: canToggle ? "pointer" : "not-allowed", opacity: canToggle ? 1 : 0.4, transition: "all .15s" }}>
            <span style={{ fontSize: 18 }}>{lang.flag}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: isOn ? 600 : 400, color: isOn ? "#10b981" : "var(--text-secondary)" }}>{lang.label}</span>
            {isOn && <span style={{ fontSize: 14, color: "#10b981" }}>✓</span>}
          </div>;
        })}
      </div>
      {!isLocked && selected.length > 0 && <button onClick={finalizeLangs} style={{ marginTop: 16, padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #ff8a2a, #ff6b00)", border: "none", color: "var(--text-primary)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t("finalize_languages")} 🔒</button>}
      {/* Dropdown to add more languages */}
      {!isLocked && (() => {
        const usedCodes = selected;
        const available = EXTRA_LANGS.filter(l => !usedCodes.includes(l.code));
        if (available.length === 0) return null;
        return <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "var(--bg-section)", border: "1px dashed var(--border-strong)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 6 }}>{t("custom_language")}</div>
          <select
            value=""
            onChange={(e) => {
              const code = e.target.value;
              if (!code) return;
              if (selected.length >= langLimit && langLimit < 999) { showT(t("lang_limit_reached")); return; }
              updateClinic({ aiConfig: { ...clinic.aiConfig, allowedLangs: [...selected, code] } });
              const lang = ALL_LANG_MAP[code];
              showT((lang?.label || code) + " " + (t("added")));
            }}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer", appearance: "auto" }}
          >
            <option value="" style={{ background: "#1a1d2e" }}>{t("select_language")}</option>
            {available.map(l => <option key={l.code} value={l.code} style={{ background: "#1a1d2e" }}>{l.flag} {l.label}</option>)}
          </select>
        </div>;
      })()}
      {langLimit < 999 && <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-faint)" }}>
        {t("need_more_languages")}{" "}
        <span onClick={() => setView("subscription")} style={{ color: "#ff8a2a", cursor: "pointer", fontWeight: 600 }}>{t("upgrade_or_addon")} →</span>
      </div>}
    </div>;
  };


  /* --- WhatsApp Bot Profile --- */
  const [waLogoPreview, setWaLogoPreview] = useState(null);
  const [waBannerPreview, setWaBannerPreview] = useState(null);
  const [waProfileSaving, setWaProfileSaving] = useState(false);
  const [waProfileLoaded, setWaProfileLoaded] = useState(false);
  const [waProfileError, setWaProfileError] = useState(null);

  // Load current WA profile from Meta API once
  const waIsConnected = clinic?.connection_status === "connected";
  useEffect(() => {
    if (waProfileLoaded || !waIsConnected) return;
    (async () => {
      try {
        const meta = await getWaProfile();
        if (meta) {
          const cur = clinic.waProfile || {};
          const merged = { ...cur };
          if (meta.about && !cur.infoText) merged.infoText = meta.about;
          if (meta.address && !cur.address) merged.address = meta.address;
          if (meta.email && !cur.email) merged.email = meta.email;
          if (meta.description && !cur.description) merged.description = meta.description;
          if (meta.vertical && !cur.category) merged.category = meta.vertical;
          if (meta.websites?.length && !cur.website) merged.website = meta.websites[0];
          if (meta.profile_picture_url && !cur.logoUrl) merged.logoUrl = meta.profile_picture_url;
          updateClinic({ waProfile: merged });
        }
      } catch { /* ignore if not connected yet */ }
      setWaProfileLoaded(true);
    })();
  }, [waIsConnected]);

  const WaProfilePanel = () => {
    const profile = clinic.waProfile || {};
    const update = (key, val) => updateClinic({ waProfile: { ...profile, [key]: val } });
    const logoPreview = waLogoPreview || profile.logoUrl || null;
    const bannerPreview = waBannerPreview || profile.bannerUrl || null;
    const isConnected = waIsConnected;

    const handleImage = (type) => (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        if (type === "logo") {
          setWaLogoPreview(dataUrl);
          update("logoUrl", dataUrl);
        } else {
          setWaBannerPreview(dataUrl);
          update("bannerUrl", dataUrl);
        }
      };
      reader.readAsDataURL(file);
    };

    const saveProfile = async () => {
      if (!isConnected) {
        showT(t("wa_not_connected"));
        return;
      }
      setWaProfileSaving(true);
      setWaProfileError(null);
      try {
        // 1. Upload profile photo if changed (base64 data URL = new upload)
        if (waLogoPreview && waLogoPreview.startsWith("data:")) {
          await uploadWaProfilePhoto(waLogoPreview);
        }

        // 2. Sync profile fields to Meta API
        const hours = profile.hours || {};
        const businessHours = [];
        const dayMap = { weekdays: ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"], saturday: ["SATURDAY"], sunday: ["SUNDAY"] };
        for (const [key, days] of Object.entries(dayMap)) {
          if (!hours[key + "Closed"]) {
            for (const day of days) {
              businessHours.push({
                day_of_week: day,
                open_time: (hours[key + "Open"] || "09:00").replace(":", ""),
                close_time: (hours[key + "Close"] || "18:00").replace(":", ""),
              });
            }
          }
        }

        await updateWaProfile({
          about: profile.infoText || "",
          address: profile.address || "",
          email: profile.email || "",
          description: profile.infoText || "",
          vertical: profile.category || "HEALTH",
          websites: profile.website ? [profile.website] : [],
          businessHours: businessHours.length ? { business_hours: businessHours, timezone: "Europe/Berlin" } : undefined,
        });

        showT(t("wa_profile_synced"));
        setWaLogoPreview(null); // clear dirty flag
      } catch (err) {
        const msg = err?.body?.error || err?.message || t("error_saving");
        setWaProfileError(msg);
        showT(msg);
      } finally {
        setWaProfileSaving(false);
      }
    };

    return <div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>{t("setup_wa_profile")}</p>

      {/* Logo + Banner side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Profile Photo */}
        <div style={{ padding: 16, borderRadius: 12, background: "var(--bg-section)", border: "1px solid var(--border-default)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("wa_profile_photo")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--bg-card-elevated)", border: "2px dashed var(--border-hover)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {logoPreview ? <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28, opacity: 0.3 }}>📷</span>}
            </div>
            <div>
              <label style={{ display: "inline-block", padding: "6px 14px", borderRadius: 8, background: "rgba(76,201,255,0.1)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                {t("wa_upload_logo")}
                <input type="file" accept="image/*" onChange={handleImage("logo")} style={{ display: "none" }} />
              </label>
              <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>{t("wa_profile_photo_hint")}</div>
            </div>
          </div>
        </div>

        {/* Banner Image */}
        <div style={{ padding: 16, borderRadius: 12, background: "var(--bg-section)", border: "1px solid var(--border-default)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("wa_banner_image")}</div>
          <div style={{ width: "100%", height: 72, borderRadius: 10, background: "var(--bg-card-elevated)", border: "2px dashed var(--border-hover)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 8 }}>
            {bannerPreview ? <img src={bannerPreview} alt="Banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28, opacity: 0.3 }}>🖼️</span>}
          </div>
          <label style={{ display: "inline-block", padding: "6px 14px", borderRadius: 8, background: "rgba(76,201,255,0.1)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            {t("wa_upload_banner")}
            <input type="file" accept="image/*" onChange={handleImage("banner")} style={{ display: "none" }} />
          </label>
          <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>{t("wa_banner_hint")}</div>
        </div>
      </div>

      {/* Bot Name */}
      <Field label={t("wa_bot_name")} value={profile.botName} onChange={v => update("botName", v)} placeholder={clinic.name || "Klinik Name"} />
      <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: -8, marginBottom: 12 }}>{t("wa_bot_name_hint")}</div>

      {/* Info / About */}
      <Field label={t("wa_bot_info")} value={profile.infoText} onChange={v => update("infoText", v.slice(0, 256))} placeholder={t("wa_bot_info_placeholder")} type="textarea" />
      <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: -8, marginBottom: 12 }}>{t("wa_bot_info_hint")} ({(profile.infoText || "").length}/256)</div>

      {/* Business Category */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{t("wa_category")}</div>
        <select value={profile.category || "HEALTH"} onChange={e => update("category", e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 13, outline: "none" }}>
          <option value="HEALTH" style={{ background: "#1a1d2e" }}>{t("wa_category_health")}</option>
          <option value="BEAUTY" style={{ background: "#1a1d2e" }}>{t("wa_category_beauty")}</option>
          <option value="MEDICAL" style={{ background: "#1a1d2e" }}>{t("wa_category_medical")}</option>
          <option value="OTHER" style={{ background: "#1a1d2e" }}>{t("wa_category_other")}</option>
        </select>
      </div>

      {/* Contact info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("wa_address")} value={profile.address || clinic.address} onChange={v => update("address", v)} placeholder="Musterstr. 1, 10115 Berlin" />
        <Field label={t("wa_email_profile")} value={profile.email || clinic.clinicEmail} onChange={v => update("email", v)} placeholder="info@klinik.de" />
      </div>
      <Field label={t("wa_website")} value={profile.website || clinic.website} onChange={v => update("website", v)} placeholder="https://www.klinik.de" />

      {/* Opening Hours */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("wa_opening_hours")}</div>
        <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 8 }}>{t("wa_opening_hours_hint")}</div>
        {[
          { key: "weekdays", label: t("hours_weekdays") },
          { key: "saturday", label: t("hours_saturday") },
          { key: "sunday", label: t("hours_sunday") },
        ].map(row => {
          const hours = profile.hours || {};
          return <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ width: 130, fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{row.label}</span>
            <input type="time" value={hours[row.key + "Open"] || "09:00"} onChange={e => update("hours", { ...hours, [row.key + "Open"]: e.target.value })} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12 }} />
            <span style={{ color: "var(--text-faint)", fontSize: 12 }}>—</span>
            <input type="time" value={hours[row.key + "Close"] || "18:00"} onChange={e => update("hours", { ...hours, [row.key + "Close"]: e.target.value })} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12 }} />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-faint)", cursor: "pointer" }}>
              <input type="checkbox" checked={hours[row.key + "Closed"] || false} onChange={e => update("hours", { ...hours, [row.key + "Closed"]: e.target.checked })} />
              {t("hours_closed")}
            </label>
          </div>;
        })}
        <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.08)", fontSize: 11, color: "rgba(16,185,129,0.7)" }}>
          💡 {t("hours_open_24")}
        </div>
      </div>

      {/* WhatsApp Profile Preview */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("wa_preview")}</div>
        <div style={{ maxWidth: 320, borderRadius: 16, overflow: "hidden", background: "#0b141a", border: "1px solid var(--border-strong)" }}>
          {/* Banner */}
          <div style={{ height: 100, background: bannerPreview ? `url(${bannerPreview}) center/cover` : "linear-gradient(135deg, #075e54, #128c7e)", position: "relative" }}>
            {/* Profile pic overlay */}
            <div style={{ position: "absolute", bottom: -28, left: 16, width: 56, height: 56, borderRadius: "50%", background: "#1a2530", border: "3px solid #0b141a", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {logoPreview ? <img src={logoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22, opacity: 0.5 }}>🤖</span>}
            </div>
          </div>
          {/* Info area */}
          <div style={{ padding: "36px 16px 16px" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#e9edef" }}>{profile.botName || clinic.name || t("wa_bot_name_fallback")}</div>
            <div style={{ fontSize: 12, color: "#8696a0", marginTop: 2 }}>{profile.infoText || t("wa_bot_info_placeholder")}</div>
            <div style={{ marginTop: 10, borderTop: "1px solid var(--border-default)", paddingTop: 10 }}>
              {profile.address && <div style={{ fontSize: 11, color: "#8696a0", marginBottom: 4 }}>📍 {profile.address}</div>}
              {(profile.email || clinic.clinicEmail) && <div style={{ fontSize: 11, color: "#8696a0", marginBottom: 4 }}>✉️ {profile.email || clinic.clinicEmail}</div>}
              {(profile.website || clinic.website) && <div style={{ fontSize: 11, color: "#8696a0" }}>🔗 {profile.website || clinic.website}</div>}
            </div>
          </div>
        </div>
      </div>

      {!isConnected && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,138,42,0.06)", border: "1px solid rgba(255,138,42,0.15)", fontSize: 12, color: "#ff8a2a", marginBottom: 12 }}>
        {t("wa_connect_first")}
      </div>}

      {waProfileError && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", fontSize: 12, color: "#ef4444", marginBottom: 12 }}>
        {waProfileError}
      </div>}

      <button
        onClick={saveProfile}
        disabled={waProfileSaving || !isConnected}
        style={{
          width: "100%", padding: "12px 0", borderRadius: 10, fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: waProfileSaving || !isConnected ? "not-allowed" : "pointer", border: "none",
          background: waProfileSaving || !isConnected ? "rgba(76,201,255,0.05)" : "linear-gradient(135deg, #4cc9ff 0%, #3b82f6 100%)",
          color: waProfileSaving || !isConnected ? "var(--text-faint)" : "#fff",
          opacity: waProfileSaving ? 0.7 : 1,
        }}
      >
        {waProfileSaving ? (t("saving")) : (t("wa_sync_to_meta"))}
      </button>
    </div>;
  };

  /* --- Flight Tracking --- */
  const FlightsPanel = () => {
    const config = clinic.logisticsConfig || {};
    const isEnabled = config.autoNotifyDriver === true;
    return <div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>{t("setup_flights_desc")}</p>
      <div style={{ padding: 16, borderRadius: 12, background: isEnabled ? "rgba(16,185,129,0.04)" : "var(--bg-section)", border: `1px solid ${isEnabled ? "rgba(16,185,129,0.12)" : "var(--border-default)"}`, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>✈️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{t("auto_flight_detection")}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{isEnabled ? "✅ " + (t("active")) : (t("not_active"))}</div>
          </div>
          <button onClick={() => updateClinic({ logisticsConfig: { ...config, autoNotifyDriver: !isEnabled } })} style={{ padding: "8px 16px", borderRadius: 8, background: isEnabled ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${isEnabled ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`, color: isEnabled ? "#ef4444" : "#10b981", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{isEnabled ? (t("deactivate")) : (t("activate"))}</button>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t("how_it_works")}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {[
          { icon: "📱", text: t("flight_step1") },
          { icon: "🤖", text: t("flight_step2") },
          { icon: "🚗", text: t("flight_step3") },
          { icon: "✅", text: t("flight_step4") },
        ].map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "var(--bg-section)", fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ fontSize: 16 }}>{step.icon}</span>
            <span>{step.text}</span>
          </div>
        ))}
      </div>
    </div>;
  };

  /* --- Redirect panels --- */
  const RedirectPanel = ({ target, descKey }) => (
    <div style={{ textAlign: "center", padding: 40 }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{t(descKey)}</p>
      <button onClick={() => setView(target)} style={{ padding: "10px 24px", borderRadius: 10, background: "rgba(76,201,255,0.12)", border: "1px solid rgba(76,201,255,0.25)", color: "#4cc9ff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t("open_settings")} →</button>
    </div>
  );

  /* --- Tab router --- */
  const renderTab = () => {
    switch (tab) {
      case "overview": return OverviewPanel();
      case "profile": return ProfilePanel();
      case "treatments": return <TreatmentsPanel/>;
      case "team": return <div>
        <TeamPanel/>
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border-default)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>👨‍⚕️</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{t("sg_staff") || "Ärzte & Fachpersonal"}</h3>
          </div>
          <StaffPanel/>
        </div>
      </div>;
      case "calendar": return CalendarPanel();
      case "whatsapp": return <WhatsAppSetup />;
      case "wa_profile": return WaProfilePanel();
      case "bot_config": return <div>
        <BotConfigPanel/>
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border-default)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>❓</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{t("sg_faq") || "FAQ & Wissensdatenbank"}</h3>
          </div>
          <FaqPanel/>
        </div>
      </div>;
      case "languages": return LanguagesPanel();
      case "templates": return <RedirectPanel target="settings" descKey="setup_templates_redir" />;
      case "automations": return <RedirectPanel target="automations" descKey="setup_automations_redir" />;
      case "flights": return <div>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>🚗</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{t("sg_drivers") || "Fahrer & Transport"}</h3>
          </div>
          <DriversPanel/>
        </div>
        <div style={{ paddingTop: 24, borderTop: "1px solid var(--border-default)" }}>
          {FlightsPanel()}
        </div>
      </div>;
      case "invoicing": return InvoicePanel();
      default: return OverviewPanel();
    }
  };

  const activeCat = SETUP_CATS.find(c => c.id === tab);

  return <div style={{ display: "flex", height: "100%", minHeight: "calc(100vh - 60px)" }}>
    {/* Sidebar */}
    <div style={{ width: 240, borderRight: "1px solid var(--border-default)", padding: "16px 0", overflowY: "auto", flexShrink: 0 }}>
      {/* Sidebar header with progress */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>{t("setup_sidebar_title") || "Einrichtung"}</div>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginBottom: 4 }}>
          <div style={{ height: 4, borderRadius: 2, background: progress.pct === 100 ? "#10b981" : "linear-gradient(90deg, #4cc9ff, #2da8ff)", width: `${progress.pct}%`, transition: "width .5s ease" }} />
        </div>
        <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{progress.done}/{progress.total} {t("sg_complete") || "abgeschlossen"}</div>
      </div>
      {SETUP_CATS.map(cat => {
        const isActive = tab === cat.id;
        const done = cat.id !== "overview" && isDone(cat.id);
        const isOptional = cat.tier === "optional";
        return <div key={cat.id} onClick={() => setTab(cat.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", background: isActive ? "rgba(76,201,255,0.08)" : "transparent", borderLeft: isActive ? "3px solid #4cc9ff" : "3px solid transparent", color: isActive ? "#fff" : "var(--text-muted)", fontWeight: isActive ? 700 : 500, fontSize: 13, transition: "all .15s" }}>
          <span style={{ fontSize: 14, opacity: isActive ? 1 : 0.7, width: 20, textAlign: "center" }}>{done ? "✓" : cat.icon}</span>
          <span style={{ flex: 1, color: done ? "#10b981" : isActive ? "#fff" : "var(--text-muted)" }}>{t(cat.key) || cat.id}</span>
          {done && <span style={{ width: 6, height: 6, borderRadius: 3, background: "#10b981", flexShrink: 0 }} />}
          {!done && isOptional && <span style={{ fontSize: 9, color: "var(--text-faint)", fontWeight: 600 }}>{t("sg_optional_short") || "Optional"}</span>}
        </div>;
      })}
    </div>
    {/* Main content */}
    <div style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>
      {tab !== "overview" && tab !== "whatsapp" && (() => {
        const tierMeta = TIER_META[activeCat?.tier] || {};
        return <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{activeCat?.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{t(activeCat?.key) || activeCat?.id}</h2>
              {isDone(tab) && <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", padding: "3px 10px", borderRadius: 7, background: "rgba(16,185,129,0.08)" }}>{t("done") || "Fertig"}</span>}
              {!isDone(tab) && activeCat?.tier === "optional" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-faint)" }}>{t("sg_optional_label") || "Optional"}</span>}
            </div>
            {activeCat?.desc && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{activeCat.desc}</div>}
            {!isDone(tab) && activeCat?.time && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>⏱ ca. {activeCat.time}</div>}
          </div>
        </div>;
      })()}
      {renderTab()}
    </div>
  </div>;
}
