import { useApp } from "../../context/AppContext";
import { Stat } from "../shared/index";
import { fmtDate } from "../../utils/helpers";

export default function AuditLogView() {
  const { auditLog, showT, t } = useApp();

  return <div style={{padding:28,maxWidth:960}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
      <div><h1 style={{fontSize:22,fontWeight:800,margin:0}}>📋 {t("audit_log")}</h1><p style={{fontSize:13,color:"rgba(167,177,195,0.6)",margin:"4px 0 0"}}>{t("audit_log_desc")}</p></div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>{const csv=["Timestamp,User,Role,Action,Target,Details",...auditLog.map(e=>`"${e.time}","${e.user}","${e.role}","${e.action}","${e.target}","${e.details}"`)].join("\n");const blob=new Blob([csv],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`audit_log_${new Date().toISOString().slice(0,10)}.csv`;a.click();showT(t("audit_log_exported"));}} style={{padding:"7px 16px",borderRadius:9,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>📥 {t("export_csv")}</button>
      </div>
    </div>
    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
      <Stat label={t("total_events")} value={auditLog.length} color="#4cc9ff"/>
      <Stat label={t("today")} value={auditLog.filter(e=>e.time?.startsWith(fmtDate(new Date()))).length} color="#10b981"/>
      <Stat label={t("photo_views")} value={auditLog.filter(e=>e.action==="photos_viewed").length} color="#ff8a2a"/>
      <Stat label={t("logins")} value={auditLog.filter(e=>e.action==="login").length} color="#a78bfa"/>
    </div>
    {/* Log Table */}
    <div style={{borderRadius:14,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)"}}>
      <div style={{display:"grid",gridTemplateColumns:"160px 120px 80px 140px 1fr",padding:"10px 16px",background:"rgba(255,255,255,0.04)",borderBottom:"1px solid rgba(255,255,255,0.06)",fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.7)",textTransform:"uppercase",letterSpacing:"0.05em"}}>
        <div>{t("timestamp")}</div><div>{t("user")}</div><div>{t("role")}</div><div>{t("action")}</div><div>{t("details")}</div>
      </div>
      {auditLog.length===0&&<div style={{padding:40,textAlign:"center",color:"rgba(167,177,195,0.7)"}}>{t("no_audit_events")}</div>}
      {auditLog.slice(0,100).map((e,i)=>{
        const actionColors={login:"#10b981",message_sent:"#4cc9ff",photos_viewed:"#ff8a2a",patient_opened:"#a78bfa",treatment_plan_sent:"#fbbf24",conversation_resolved:"#6b7280",pdf_generated:"#10b981",magic_link_created:"#4cc9ff"};
        const ac=actionColors[e.action]||"rgba(167,177,195,0.7)";
        return<div key={e.id||i} style={{display:"grid",gridTemplateColumns:"160px 120px 80px 140px 1fr",padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.03)",fontSize:13,alignItems:"center"}}>
          <div style={{color:"rgba(167,177,195,0.7)",fontSize:12,fontFamily:"monospace"}}>{new Date(e.time).toLocaleString("de",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>
          <div style={{fontWeight:600}}>{e.user}</div>
          <div><span style={{padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700,background:"rgba(167,177,195,0.08)",color:"rgba(167,177,195,0.6)"}}>{e.role}</span></div>
          <div><span style={{padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:`${ac}15`,color:ac}}>{e.action?.replaceAll(/_/g," ")}</span></div>
          <div style={{color:"rgba(232,238,252,0.95)",fontSize:12}}><strong>{e.target}</strong> {e.details&&`— ${e.details}`}</div>
        </div>;
      })}
    </div>
    {auditLog.length>100&&<div style={{padding:12,textAlign:"center",fontSize:12,color:"rgba(167,177,195,0.6)"}}>{t("showing_latest_100_of")} {auditLog.length} {t("events_export_csv")}</div>}
    {/* RLS Note */}
    <div style={{marginTop:16,padding:14,borderRadius:10,background:"rgba(255,138,42,0.04)",border:"1px solid rgba(255,138,42,0.12)",fontSize:12,color:"rgba(167,177,195,0.7)"}}>
      🔒 <strong style={{color:"#ff8a2a"}}>{t("data_isolation")}:</strong> {t("data_isolation_desc")}
    </div>
  </div>;
}
