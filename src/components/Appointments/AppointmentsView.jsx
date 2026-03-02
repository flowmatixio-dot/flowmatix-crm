import { useApp } from "../../context/AppContext";
import { Btn, Section } from "../shared/index";
import { APPT_C, MONTHS } from "../../data/constants";

export default function AppointmentsView() {
  const {
    clinic, myAppts, calView, setCalView, calDate, setCalDate,
    showRevenue, setShowRevenue, selAppt, setSelAppt, rescheduleAppt,
    setRescheduleAppt, rescheduleDate, setRescheduleDate,
    exportRevenue, estimateRevenue, CalMonth, CalDay,
    showT, t,
  } = useApp();

  return <div style={{padding:"28px 32px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><div><h1 style={{fontSize:24,fontWeight:800,margin:0,letterSpacing:"-0.02em"}}>Appointments</h1><p style={{fontSize:13,color:"rgba(167,177,195,0.5)",margin:"6px 0 0"}}>✓ Synced with clinic calendar</p></div><div style={{display:"flex",gap:8}}>
      <button onClick={()=>setShowRevenue(!showRevenue)} style={{padding:"7px 16px",borderRadius:9,background:showRevenue?"rgba(16,185,129,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${showRevenue?"rgba(16,185,129,0.25)":"rgba(255,255,255,0.08)"}`,color:showRevenue?"#10b981":"rgba(167,177,195,0.7)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>💰 Revenue</button>
      {["month","day"].map(v=><button key={v} onClick={()=>setCalView(v)} style={{padding:"7px 16px",borderRadius:9,background:calView===v?"rgba(76,201,255,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${calView===v?"rgba(76,201,255,0.25)":"rgba(255,255,255,0.08)"}`,color:calView===v?"#4cc9ff":"rgba(167,177,195,0.7)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{v}</button>)}</div></div>
    {/* Revenue Forecast Bar */}
    {showRevenue&&<div style={{padding:16,borderRadius:14,background:"rgba(16,185,129,0.04)",border:"1px solid rgba(16,185,129,0.12)",marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,fontWeight:700,color:"#10b981"}}>💰 Monthly Revenue Forecast</span>
        <span style={{fontSize:18,fontWeight:800,color:"#10b981"}}>€{(myAppts.filter(a=>a.status!=="cancelled"&&a.date?.startsWith(`${calDate.getFullYear()}-${String(calDate.getMonth()+1).padStart(2,"0")}`)).reduce((s,a)=>s+estimateRevenue(a),0)/1000).toFixed(1)}k</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {[0,1,2,3].map(w=>{const ws=new Date(calDate.getFullYear(),calDate.getMonth(),1+w*7);const we=new Date(ws);we.setDate(we.getDate()+7);const rev=myAppts.filter(a=>{if(a.status==="cancelled")return false;const d=new Date(a.date);return d>=ws&&d<we;}).reduce((s,a)=>s+estimateRevenue(a),0);const maxRev=15000;const pct=Math.min(rev/maxRev*100,100);const low=rev<3000;
          return<div key={w} style={{padding:10,borderRadius:10,background:low?"rgba(239,68,68,0.05)":"rgba(16,185,129,0.05)",border:`1px solid ${low?"rgba(239,68,68,0.15)":"rgba(16,185,129,0.1)"}`}}>
            <div style={{fontSize:11,color:"rgba(167,177,195,0.5)",marginBottom:4}}>Week {w+1}</div>
            <div style={{fontSize:15,fontWeight:800,color:low?"#ef4444":"#10b981",marginBottom:6}}>€{(rev/1000).toFixed(1)}k</div>
            <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.06)"}}>
              <div style={{height:4,borderRadius:2,background:low?"#ef4444":"#10b981",width:`${pct}%`,transition:"width .3s"}}/>
            </div>
            {low&&rev===0&&<div style={{fontSize:10,color:"#ef4444",fontWeight:600,marginTop:4}}>⚠ Empty — send offers!</div>}
          </div>;
        })}
      </div>
      {/* DATEV / CSV Export */}
      <div style={{display:"flex",gap:8,marginTop:12,paddingTop:12,borderTop:"1px solid rgba(16,185,129,0.1)"}}>
        <button onClick={()=>exportRevenue("datev")} style={{padding:"8px 16px",borderRadius:9,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
          📊 DATEV Export
        </button>
        <button onClick={()=>exportRevenue("csv")} style={{padding:"8px 16px",borderRadius:9,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
          📥 CSV für Steuerberater
        </button>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end",fontSize:11,color:"rgba(167,177,195,0.35)"}}>
          {MONTHS[calDate.getMonth()]} {calDate.getFullYear()} · {myAppts.filter(a=>a.status!=="cancelled"&&a.date?.startsWith(`${calDate.getFullYear()}-${String(calDate.getMonth()+1).padStart(2,"0")}`)).length} Buchungen
        </div>
      </div>
    </div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <button onClick={()=>{const d=new Date(calDate);if(calView==="month")d.setMonth(d.getMonth()-1);else d.setDate(d.getDate()-1);setCalDate(d);}} style={{padding:"6px 14px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.7)",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13}}>←</button>
      <div style={{fontSize:18,fontWeight:800}}>{calView==="day"?`${calDate.getDate()} ${MONTHS[calDate.getMonth()]} ${calDate.getFullYear()}`:`${MONTHS[calDate.getMonth()]} ${calDate.getFullYear()}`}</div>
      <button onClick={()=>{const d=new Date(calDate);if(calView==="month")d.setMonth(d.getMonth()+1);else d.setDate(d.getDate()+1);setCalDate(d);}} style={{padding:"6px 14px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.7)",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13}}>→</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>{Object.entries(APPT_C).map(([k,v])=>{const n=myAppts.filter(a=>a.status===k).length;return<div key={k} style={{padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:99,background:v.c}}/><span style={{fontSize:13,fontWeight:700,color:v.c}}>{n}</span><span style={{fontSize:12,color:"rgba(167,177,195,0.5)"}}>{v.l}</span></div>;})}</div>
    {calView==="month"&&<CalMonth/>}{calView==="day"&&<CalDay/>}
  </div>;
}
