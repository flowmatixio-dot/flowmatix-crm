import { useState } from "react";

/* ======== HELPERS ======== */
export function Btn({ color, icon, label, onClick, secondary, full, small }) {
  return <button onClick={e=>{e.stopPropagation();onClick?.();}} style={{padding:small?"6px 14px":"9px 18px",borderRadius:10,fontSize:small?12:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7,transition:"all .15s",width:full?"100%":"auto",background:secondary?"rgba(255,255,255,0.04)":`${color}10`,border:`1px solid ${secondary?"rgba(255,255,255,0.06)":color+"20"}`,color:secondary?"rgba(167,177,195,0.6)":color}}><span>{icon}</span> {label}</button>;
}
export function Stat({ label, value, color, sub, onClick }) {
  return <div onClick={onClick} style={{padding:18,borderRadius:12,background:"#162032",border:"1px solid rgba(255,255,255,0.06)",cursor:onClick?"pointer":"default",transition:"border-color .15s"}} onMouseEnter={e=>{if(onClick)e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";}} onMouseLeave={e=>{if(onClick)e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";}}><div style={{fontSize:28,fontWeight:800,color:color||"#fff",letterSpacing:"-0.02em"}}>{value}</div><div style={{fontSize:12,color:"rgba(167,177,195,0.5)",fontWeight:600,marginTop:4}}>{label}</div>{sub&&<div style={{fontSize:11,color:"rgba(167,177,195,0.3)",marginTop:2}}>{sub}</div>}</div>;
}
export function IC({ label, value, muted }) {
  return <div style={{padding:"12px 14px",borderRadius:10,background:"#162032",border:"1px solid rgba(255,255,255,0.06)"}}><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div><div style={{fontSize:14,fontWeight:600,color:muted?"rgba(167,177,195,0.4)":"rgba(232,238,252,0.88)"}}>{value}</div></div>;
}
export function Field({ label, value, onChange, options, textarea, placeholder }) {
  const st = {width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color .15s"};
  const fid = (label||"field").toLowerCase().replace(/[^a-z0-9]/g,"_");
  return <div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:6}}>{label}</div>{options?<select id={fid} name={fid} value={value} onChange={e=>onChange(e.target.value)} style={{...st,cursor:"pointer"}}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>:textarea?<textarea id={fid} name={fid} value={value} onChange={e=>onChange(e.target.value)} rows={3} style={{...st,resize:"vertical"}} placeholder={placeholder}/>:<input id={fid} name={fid} value={value} onChange={e=>onChange(e.target.value)} style={st} placeholder={placeholder}/>}</div>;
}
export function Section({ title, right, children }) {
  return <div style={{marginBottom:28}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase",letterSpacing:"0.1em"}}>{title}</div>{right}</div>{children}</div>;
}
export function Toggle({ value, onChange, label }) {
  return <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>onChange(!value)}>
    <div style={{width:40,height:22,borderRadius:11,background:value?"rgba(16,185,129,0.25)":"rgba(255,255,255,0.08)",border:`1px solid ${value?"rgba(16,185,129,0.3)":"rgba(255,255,255,0.1)"}`,position:"relative",transition:"all .2s"}}>
      <div style={{width:16,height:16,borderRadius:8,background:value?"#10b981":"rgba(167,177,195,0.35)",position:"absolute",top:2,left:value?21:2,transition:"all .2s"}}/>
    </div>
    {label&&<span style={{fontSize:14,fontWeight:600,color:value?"rgba(232,238,252,0.9)":"rgba(167,177,195,0.5)"}}>{label}</span>}
  </div>;
}
/* Simple SVG bar chart */
export function MiniBarChart({ data, color, height = 120 }) {
  const max = Math.max(...data.map(d => d.v), 1);
  const w = 100 / data.length;
  return <svg viewBox={`0 0 ${data.length * 60} ${height + 30}`} style={{width:"100%",height:height+30}}>
    {data.map((d, i) => {
      const bh = (d.v / max) * height;
      return <g key={i}>
        <rect x={i * 60 + 8} y={height - bh} width={40} height={bh} rx={6} fill={`${color}20`} stroke={`${color}35`} strokeWidth={1}/>
        <text x={i * 60 + 28} y={height - bh - 6} textAnchor="middle" fill={color} fontSize={11} fontWeight={700}>{d.v}</text>
        <text x={i * 60 + 28} y={height + 18} textAnchor="middle" fill="rgba(167,177,195,0.4)" fontSize={10} fontWeight={600}>{d.m}</text>
      </g>;
    })}
  </svg>;
}
/* Horizontal bar for countries */
export function HBar({ label, pct, color }) {
  return <div style={{marginBottom:8}}>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
      <span style={{fontWeight:600,color:"rgba(232,238,252,0.8)"}}>{label}</span>
      <span style={{fontWeight:700,color}}>{pct}%</span>
    </div>
    <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,0.06)"}}>
      <div style={{height:5,borderRadius:3,background:color,width:`${pct}%`,transition:"width .5s ease"}}/>
    </div>
  </div>;
}
