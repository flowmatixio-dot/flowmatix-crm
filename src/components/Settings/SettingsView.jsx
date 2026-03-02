import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Section, Field, Toggle } from "../shared/index";
import { ROLE_PERMISSIONS, PERM_LABELS } from "../../data/constants";

export default function SettingsView() {
  const { clinic, setClinics, settingsData, setSettingsData, showT, resetAllData, inviteOpen, setInviteOpen, inviteEmail, setInviteEmail, inviteRole, setInviteRole, setTourActive, setTourStep, setTourCompleted, t } = useApp();
  const [drvForm, setDrvForm] = useState(false);
  const [drvName, setDrvName] = useState("");
  const [drvPhone, setDrvPhone] = useState("");
  const [drvRole, setDrvRole] = useState("primary");
  const [drvVehicle, setDrvVehicle] = useState("");
  const [drvPlate, setDrvPlate] = useState("");

  const c=settingsData||(clinic?{...clinic}:null);if(!c)return null;
  const up=(k,v)=>setSettingsData(p=>({...p,[k]:v}));
  const save=()=>{setClinics(cs=>cs.map(cl=>cl.id===c.id?{...cl,...settingsData}:cl));showT("Saved");};
  if(!settingsData&&clinic)setSettingsData({...clinic});

  const drivers=c.drivers||[];
  const lc=c.logisticsConfig||{autoNotifyDriver:false,escalationTimeoutMin:30,pickupTemplateEn:"",pickupTemplateDe:""};
  const upLogistics=(k,v)=>up("logisticsConfig",{...lc,[k]:v});
  const addDriver=()=>{
    if(!drvName.trim()||!drvPhone.trim()){showT("Name and phone required");return;}
    const nd={id:`drv_${Date.now()}`,name:drvName,phone:drvPhone,role:drvRole,vehicle:drvVehicle,plateNo:drvPlate,active:true,totalPickups:0,lastPickup:null};
    up("drivers",[...drivers,nd]);
    setDrvForm(false);setDrvName("");setDrvPhone("");setDrvRole("primary");setDrvVehicle("");setDrvPlate("");
    showT("Driver added");
  };
  const removeDriver=(id)=>{up("drivers",drivers.filter(d=>d.id!==id));showT("Driver removed");};

  const inp={width:"100%",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:13,outline:"none",boxSizing:"border-box"};

  return <div style={{padding:28,maxWidth:720}}><h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Settings</h1><p style={{fontSize:14,color:"rgba(167,177,195,0.6)",margin:"0 0 28px"}}>{c.name}</p><Section title="Clinic Info"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}><Field label="Name" value={c.name} onChange={v=>up("name",v)}/><Field label="Type" value={c.type} onChange={v=>up("type",v)}/><Field label="Email" value={c.clinicEmail} onChange={v=>up("clinicEmail",v)}/><Field label="Phone" value={c.phone} onChange={v=>up("phone",v)}/></div><Field label="Address" value={c.address} onChange={v=>up("address",v)}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}><Field label="Timezone" value={c.timezone} onChange={v=>up("timezone",v)}/><Field label="Website" value={c.website} onChange={v=>up("website",v)}/></div></Section><Section title="Bot Config"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}><Field label="WhatsApp Name" value={c.waName} onChange={v=>up("waName",v)}/><Field label="Tone" value={c.tone} onChange={v=>up("tone",v)} options={["professional","friendly","concierge","efficient"]}/></div><Field label="Welcome Message" value={c.welcomeMsg} onChange={v=>up("welcomeMsg",v)} textarea/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}><Field label="Hours" value={c.hours} onChange={v=>up("hours",v)}/><Field label="After-hours" value={c.afterHours} onChange={v=>up("afterHours",v)} options={["24_7","collect","transfer"]}/></div></Section>
    {/* ═══ INVOICE / BILLING SETTINGS ═══ */}
    <Section title="🧾 Invoice Settings">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <Field label="Bank Name" value={c.bankName||""} onChange={v=>up("bankName",v)} placeholder="Deutsche Bank"/>
        <Field label="IBAN" value={c.iban||""} onChange={v=>up("iban",v)} placeholder="DE89 3704 0044 0532 0130 00"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <Field label="BIC / SWIFT" value={c.bic||""} onChange={v=>up("bic",v)} placeholder="DEUTDEDB"/>
        <Field label="Default VAT %" value={String(c.defaultVat||8)} onChange={v=>up("defaultVat",parseInt(v)||0)} placeholder="8"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <Field label="Tax ID / USt-IdNr." value={c.taxId||""} onChange={v=>up("taxId",v)} placeholder="DE123456789"/>
        <Field label="Invoice Currency" value={c.invoiceCurrency||"EUR"} onChange={v=>up("invoiceCurrency",v)} options={["EUR","USD","GBP","TRY"]}/>
      </div>
      <Field label="Invoice Footer Text" value={c.invoiceFooter||""} onChange={v=>up("invoiceFooter",v)} textarea placeholder="Thank you for choosing our clinic. Payment terms: 14 days."/>
      <div style={{fontSize:11,color:"rgba(167,177,195,0.35)",marginTop:4}}>Bank details appear on generated PDF invoices. Tax ID is shown in the invoice header.</div>
    </Section>
    {/* Integrations Status */}
    <Section title="Integrations">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {[{name:"WhatsApp",status:true,icon:"💬"},{name:"Google Calendar",status:true,icon:"📅"},{name:"Stripe Payments",status:false,icon:"💳"},{name:"Zapier",status:false,icon:"⚡"}].map((int,i)=>
          <div key={i} style={{padding:14,borderRadius:12,background:int.status?"rgba(16,185,129,0.04)":"rgba(255,255,255,0.02)",border:`1px solid ${int.status?"rgba(16,185,129,0.15)":"rgba(255,255,255,0.06)"}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:18}}>{int.icon}</span><span style={{fontWeight:600,fontSize:14}}>{int.name}</span></div>
            <span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:int.status?"rgba(16,185,129,0.12)":"rgba(255,255,255,0.06)",color:int.status?"#10b981":"rgba(167,177,195,0.5)"}}>{int.status?"Connected":"Not connected"}</span>
          </div>
        )}
      </div>
    </Section>
    {/* ═══ LOGISTICS / DRIVER MANAGEMENT ═══ */}
    <Section title="🚗 Logistics">
      {/* Auto-notify toggle */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",marginBottom:14}}>
        <div><div style={{fontWeight:700,fontSize:14}}>{t("auto_notify")}</div><div style={{fontSize:12,color:"rgba(167,177,195,0.5)",marginTop:2}}>Automatically notify primary driver when a flight is detected</div></div>
        <Toggle checked={lc.autoNotifyDriver} onChange={v=>upLogistics("autoNotifyDriver",v)}/>
      </div>
      {/* Escalation timeout */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px",marginBottom:14}}>
        <Field label="Escalation Timeout (min)" value={String(lc.escalationTimeoutMin||30)} onChange={v=>upLogistics("escalationTimeoutMin",parseInt(v)||30)}/>
      </div>
      {/* Driver table */}
      <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase",marginBottom:8,letterSpacing:"0.5px"}}>{t("drivers")}</div>
      {drivers.length===0&&<div style={{padding:20,textAlign:"center",color:"rgba(167,177,195,0.4)",fontSize:13,borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",marginBottom:12}}>No drivers configured. Add a driver to enable pickup notifications.</div>}
      {drivers.length>0&&<div style={{marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1.5fr auto",gap:8,marginBottom:6,fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase"}}><div>Name</div><div>WhatsApp</div><div>Role</div><div>Vehicle</div><div></div></div>
        {drivers.map(d=><div key={d.id} style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1.5fr auto",gap:8,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:13,alignItems:"center"}}>
          <div><div style={{fontWeight:600}}>{d.name}</div>{d.totalPickups>0&&<div style={{fontSize:11,color:"rgba(167,177,195,0.4)"}}>{d.totalPickups} pickups</div>}</div>
          <div style={{color:"rgba(167,177,195,0.6)",fontSize:12,fontFamily:"monospace"}}>{d.phone}</div>
          <span style={{padding:"3px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:d.role==="primary"?"rgba(0,180,216,0.12)":"rgba(255,138,42,0.12)",color:d.role==="primary"?"#00B4D8":"#ff8a2a",justifySelf:"start"}}>{d.role}</span>
          <div style={{fontSize:12,color:"rgba(167,177,195,0.6)"}}>{d.vehicle}{d.plateNo?` · ${d.plateNo}`:""}</div>
          <button onClick={()=>removeDriver(d.id)} style={{padding:"4px 10px",borderRadius:6,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
        </div>)}
      </div>}
      {/* Add driver button / form */}
      {!drvForm&&<button onClick={()=>setDrvForm(true)} style={{marginBottom:14,padding:"8px 16px",borderRadius:10,background:"rgba(0,180,216,0.08)",border:"1px solid rgba(0,180,216,0.2)",color:"#00B4D8",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>+ {t("add_driver")}</button>}
      {drvForm&&<div style={{marginBottom:14,padding:16,borderRadius:12,background:"rgba(0,180,216,0.04)",border:"1px solid rgba(0,180,216,0.12)"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:4}}>{t("driver_name")}</div><input value={drvName} onChange={e=>setDrvName(e.target.value)} placeholder="Ahmet Kaya" style={inp}/></div>
          <div><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:4}}>{t("driver_phone")}</div><input value={drvPhone} onChange={e=>setDrvPhone(e.target.value)} placeholder="+90 532 ..." style={inp}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
          <div><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:4}}>Role</div><select value={drvRole} onChange={e=>setDrvRole(e.target.value)} style={{...inp,cursor:"pointer"}}><option value="primary">Primary</option><option value="backup">Backup</option></select></div>
          <div><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:4}}>{t("vehicle")}</div><input value={drvVehicle} onChange={e=>setDrvVehicle(e.target.value)} placeholder="Mercedes Vito" style={inp}/></div>
          <div><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:4}}>Plate No.</div><input value={drvPlate} onChange={e=>setDrvPlate(e.target.value)} placeholder="34 ABC 123" style={inp}/></div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={addDriver} style={{padding:"7px 16px",borderRadius:8,background:"rgba(0,180,216,0.12)",border:"1px solid rgba(0,180,216,0.25)",color:"#00B4D8",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{t("add_driver")}</button>
          <button onClick={()=>{setDrvForm(false);setDrvName("");setDrvPhone("");}} style={{padding:"7px 14px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.5)",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{t("cancel")}</button>
        </div>
      </div>}
      {/* Pickup templates */}
      <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase",marginBottom:8,marginTop:4,letterSpacing:"0.5px"}}>Pickup WhatsApp Templates</div>
      <Field label="English Template" value={lc.pickupTemplateEn||""} onChange={v=>upLogistics("pickupTemplateEn",v)} textarea/>
      <Field label="German Template" value={lc.pickupTemplateDe||""} onChange={v=>upLogistics("pickupTemplateDe",v)} textarea/>
      <div style={{fontSize:11,color:"rgba(167,177,195,0.35)",marginTop:4}}>Variables: {"{driver_name}"}, {"{first_name}"}, {"{date}"}, {"{arrival_time}"}, {"{flight_no}"}, {"{airline}"}, {"{vehicle}"}</div>
    </Section>
    {clinic?.team&&<Section title="Team Members"><div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:8,marginBottom:8,fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase"}}><div>Name</div><div>Role</div><div>Last Login</div><div>Status</div></div>{clinic.team.map((m,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:8,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:14,alignItems:"center"}}><div><div style={{fontWeight:600}}>{m.name}</div><div style={{fontSize:12,color:"rgba(167,177,195,0.5)"}}>{m.email}</div></div><div style={{fontSize:13,color:"rgba(167,177,195,0.6)"}}>{m.role}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.6)"}}>{m.lastLogin}</div><span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:m.inviteStatus==="active"?"rgba(16,185,129,0.12)":"rgba(255,138,42,0.12)",color:m.inviteStatus==="active"?"#10b981":"#ff8a2a",justifySelf:"start"}}>{m.inviteStatus}</span></div>)}<button onClick={()=>setInviteOpen(!inviteOpen)} style={{marginTop:12,padding:"8px 16px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(167,177,195,0.7)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>+ Invite</button>
      {inviteOpen&&<div style={{marginTop:12,padding:16,borderRadius:12,background:"rgba(76,201,255,0.04)",border:"1px solid rgba(76,201,255,0.12)"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:10}}>
          <div><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:4}}>Email</div><input id="inviteEmail" name="inviteEmail" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="team@clinic.com" style={{width:"100%",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
          <div><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:4}}>Role</div><select id="inviteRole" name="inviteRole" value={inviteRole} onChange={e=>setInviteRole(e.target.value)} style={{width:"100%",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:13,outline:"none",cursor:"pointer"}}><option value="Receptionist">Receptionist</option><option value="Doctor">Doctor</option><option value="Manager">Manager</option><option value="Admin">Admin</option></select></div>
        </div>
        <div style={{display:"flex",gap:8}}><button onClick={()=>{if(!inviteEmail.trim()||!inviteEmail.includes("@")){showT("Enter a valid email");return;}setClinics(cs=>cs.map(c2=>c2.id===clinic.id?{...c2,team:[...c2.team,{name:inviteEmail.split("@")[0],role:inviteRole,email:inviteEmail,lastLogin:"Never",inviteStatus:"pending"}]}:c2));showT(`Invite sent to ${inviteEmail}`);setInviteEmail("");setInviteOpen(false);}} style={{padding:"7px 16px",borderRadius:8,background:"rgba(76,201,255,0.12)",border:"1px solid rgba(76,201,255,0.25)",color:"#4cc9ff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Send Invite</button><button onClick={()=>{setInviteOpen(false);setInviteEmail("");}} style={{padding:"7px 14px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.5)",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{t("cancel")}</button></div>
      </div>}</Section>}
    {/* ═══ C8: ROLE PERMISSIONS MATRIX ═══ */}
    <Section title="🔐 Role Permissions"><div style={{overflowX:"auto"}}>
      <div style={{display:"grid",gridTemplateColumns:`180px repeat(${Object.keys(ROLE_PERMISSIONS).length},1fr)`,gap:0,fontSize:12}}>
        {/* Header row */}
        <div style={{padding:"10px 12px",fontWeight:700,color:"rgba(167,177,195,0.5)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}></div>
        {Object.keys(ROLE_PERMISSIONS).map(role=><div key={role} style={{padding:"10px 8px",fontWeight:800,fontSize:12,color:"#4cc9ff",borderBottom:"1px solid rgba(255,255,255,0.06)",textAlign:"center"}}>{role}</div>)}
        {/* Permission rows */}
        {Object.entries(PERM_LABELS).map(([perm,label])=><div key={perm} style={{display:"contents"}}>
          <div style={{padding:"8px 12px",fontSize:12,color:"rgba(232,238,252,0.7)",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>{label}</div>
          {Object.entries(ROLE_PERMISSIONS).map(([role,perms])=><div key={role} style={{padding:"8px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
            <span style={{fontSize:14,color:perms[perm]?"#10b981":"rgba(239,68,68,0.4)"}}>{perms[perm]?"✓":"✕"}</span>
          </div>)}
        </div>)}
      </div>
      <div style={{marginTop:10,fontSize:11,color:"rgba(167,177,195,0.35)"}}>Permissions are enforced via Supabase RLS in production. Contact support to customize roles.</div>
    </div></Section>
    {/* ═══ HELP ═══ */}
    <Section title="❓ Help">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0"}}>
        <div><div style={{fontWeight:700,fontSize:14}}>Product Tour</div><div style={{fontSize:12,color:"rgba(167,177,195,0.5)",marginTop:2}}>Walk through the main features of Flowmatix step by step.</div></div>
        <button onClick={()=>{try{localStorage.removeItem("fm_tour_done");}catch{}setTourCompleted(false);setTourStep(0);setTourActive(true);}} style={{padding:"8px 18px",borderRadius:10,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🚀 {t("tour_start")}</button>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
        <div><div style={{fontWeight:700,fontSize:14}}>View Onboarding</div><div style={{fontSize:12,color:"rgba(167,177,195,0.5)",marginTop:2}}>Re-open the clinic activation / setup screen.</div></div>
        <button onClick={()=>{setClinics(cs=>cs.map(cl=>cl.id===c.id?{...cl,setupStatus:"new"}:cl));showT("Onboarding screen activated");}} style={{padding:"8px 18px",borderRadius:10,background:"rgba(255,138,42,0.08)",border:"1px solid rgba(255,138,42,0.2)",color:"#ff8a2a",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>📋 Show Onboarding</button>
      </div>
    </Section>
    <div style={{display:"flex",gap:12,alignItems:"center"}}>
      <button onClick={save} style={{padding:"14px 32px",borderRadius:14,background:"linear-gradient(135deg,#ff8a2a,#ff6b00)",border:"none",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>{t("save_changes")}</button>
      <button onClick={resetAllData} style={{padding:"14px 20px",borderRadius:14,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🔄 Reset Demo Data</button>
    </div>
    <div style={{marginTop:12,fontSize:12,color:"rgba(167,177,195,0.35)"}}>💾 All changes are saved in your browser (localStorage). Reset to restore original demo data.</div>
  </div>;
}
