import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Stat, Toggle } from "../shared/index";
import { timeAgo } from "../../utils/helpers";

export default function AutomationsView() {
  const { myAutomations, toggleAutomation, usageMetrics, setView } = useApp();
  const [limitDismissed, setLimitDismissed] = useState(()=>localStorage.getItem("fm_auto_limit_dismissed")==="true");

  const autoMetric = usageMetrics?.metrics?.find(m=>m.key==="automations");
  const showLimitNotice = autoMetric?.isWarning && !limitDismissed;

  return <div style={{padding:28,maxWidth:800}}>
    <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Automations</h1>
    <p style={{fontSize:14,color:"rgba(167,177,195,0.6)",margin:"0 0 28px"}}>Manage automated workflows for patient engagement.</p>
    {showLimitNotice&&<div style={{padding:"10px 16px",borderRadius:10,background:autoMetric.isUrgent?"rgba(239,68,68,0.06)":"rgba(251,191,36,0.06)",border:`1px solid ${autoMetric.isUrgent?"rgba(239,68,68,0.15)":"rgba(251,191,36,0.15)"}`,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:13,color:autoMetric.isUrgent?"#ef4444":"#fbbf24",fontWeight:600}}>{autoMetric.icon} {autoMetric.value}/{autoMetric.limit} automations active — <span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setView("billing")}>upgrade for more</span></span>
      <button onClick={()=>{setLimitDismissed(true);localStorage.setItem("fm_auto_limit_dismissed","true");}} style={{padding:"3px 10px",borderRadius:6,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.5)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14,marginBottom:28}}>
      <Stat label="Active Automations" value={myAutomations.filter(a=>a.active).length} color="#10b981"/>
      <Stat label="Total Runs" value={myAutomations.reduce((s,a)=>s+a.runs,0)} color="#4cc9ff"/>
    </div>
    {myAutomations.map(aut=><div key={aut.id} style={{padding:20,borderRadius:16,background:aut.active?"rgba(16,185,129,0.04)":"rgba(255,255,255,0.02)",border:`1px solid ${aut.active?"rgba(16,185,129,0.15)":"rgba(255,255,255,0.06)"}`,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:18}}>⚡</span>
          <div style={{fontWeight:700,fontSize:16}}>{aut.name}</div>
          {aut.active&&<span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:"rgba(16,185,129,0.12)",color:"#10b981"}}>Active</span>}
        </div>
        <div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginBottom:4}}>Trigger: <span style={{color:"rgba(232,238,252,0.7)"}}>{aut.trigger}</span></div>
        <div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginBottom:4}}>Action: <span style={{color:"rgba(232,238,252,0.7)"}}>{aut.action}</span></div>
        <div style={{fontSize:12,color:"rgba(167,177,195,0.4)"}}>{aut.runs} runs · Last: {aut.lastRun?timeAgo(aut.lastRun):"Never"}</div>
      </div>
      <Toggle value={aut.active} onChange={()=>toggleAutomation(aut.id)}/>
    </div>)}
  </div>;
}
