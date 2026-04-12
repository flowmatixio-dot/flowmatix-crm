import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Field, SaveBtn } from "./setupShared";

// Treatment types list with add/edit functionality (Behandlungsarten)
export default function TreatmentTypes() {
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
      <Field label={t("duration_min")} value={form.duration_minutes} onChange={v=>setForm(f=>({...f,duration_minutes:Number.parseInt(v)||60}))} placeholder="60" type="number" />
      <Field label={t("buffer_min")} value={form.buffer_minutes} onChange={v=>setForm(f=>({...f,buffer_minutes:Number.parseInt(v)||0}))} placeholder="0" type="number" />
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
    <button onClick={()=>{setEditing("new");setForm({duration_minutes:60,buffer_minutes:0,currency:"EUR",requires_consultation:true,requires_photos:true});}} style={{marginBottom:16,padding:"12px 24px",borderRadius:12,background:"rgba(76,201,255,0.06)",border:"1px dashed rgba(76,201,255,0.3)",color:"#4cc9ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(76,201,255,0.1)";e.currentTarget.style.borderColor="rgba(76,201,255,0.5)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(76,201,255,0.06)";e.currentTarget.style.borderColor="rgba(76,201,255,0.3)";}}>+ {t("add_treatment")}</button>
    {treatments.length===0?<div style={{padding:32,textAlign:"center",borderRadius:16,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
      <div style={{fontSize:40,marginBottom:12}}>{"\u{1F489}"}</div>
      <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{t("no_treatments")}</div>
      <div style={{fontSize:13,color:"var(--text-muted)"}}>{t("no_treatments_hint")}</div>
    </div>:
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {treatments.map(tr=><div key={tr.id} style={{padding:16,borderRadius:14,background:"var(--bg-card)",border:"1px solid var(--border-default)",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#8b5cf6,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"var(--text-primary)",fontSize:16}}>{"\u{1F489}"}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:14}}>{tr.name}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",display:"flex",gap:8,flexWrap:"wrap"}}>
            <span>{"⏱"} {tr.duration_minutes} {t("minutes_short")}</span>
            {tr.price_from&&<span>{"\u{1F4B0}"} {tr.price_from}{tr.price_to?"-"+tr.price_to:""} {tr.currency||"EUR"}</span>}
            {tr.requires_photos&&<span>{"\u{1F4F7}"}</span>}
            {tr.requires_consultation&&<span>{"\u{1FA7A}"}</span>}
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
