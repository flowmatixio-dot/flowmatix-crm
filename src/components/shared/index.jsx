import { useState } from "react";

/* ======== AVATAR HELPERS ======== */
const AVATAR_GRADIENTS = [
  "#5b7bb4",
  "#6b9e8a",
  "#9683a8",
  "#b08d6e",
  "#7b97ab",
  "#a87e7e",
  "#6da3a3",
  "#8e8e6e",
];
export function getAvatarGradient(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}
export function getInitials(name) {
  return (name || "?").split(" ").map(n => n.charAt(0).toUpperCase()).join("").slice(0, 2);
}

/* ======== HELPERS ======== */
export function Btn({ color, icon, label, onClick, secondary, full, small }) {
  return <button onClick={e=>{e.stopPropagation();onClick?.();}} style={{padding:small?"6px 14px":"9px 18px",borderRadius:10,fontSize:small?12:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7,transition:"all .15s",width:full?"100%":"auto",background:secondary?"var(--bg-input)":`${color}10`,border:`1px solid ${secondary?"var(--border-default)":color+"20"}`,color:secondary?"var(--text-muted)":color}}><span>{icon}</span> {label}</button>;
}
export function Stat({ label, value, color, sub, onClick }) {
  return <div onClick={onClick} style={{padding:18,borderRadius:12,background:"var(--bg-card-solid)",border:"1px solid var(--border-default)",cursor:onClick?"pointer":"default",transition:"border-color .15s"}} onMouseEnter={e=>{if(onClick)e.currentTarget.style.borderColor="var(--border-hover)";}} onMouseLeave={e=>{if(onClick)e.currentTarget.style.borderColor="var(--border-default)";}}><div style={{fontSize:28,fontWeight:800,color:color||"#fff",letterSpacing:"-0.02em"}}>{value}</div><div style={{fontSize:12,color:"var(--text-muted)",fontWeight:600,marginTop:4}}>{label}</div>{sub&&<div style={{fontSize:11,color:"var(--text-faint)",marginTop:2}}>{sub}</div>}</div>;
}
export function IC({ label, value, muted }) {
  return <div style={{padding:"12px 14px",borderRadius:10,background:"var(--bg-card-solid)",border:"1px solid var(--border-default)"}}><div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div><div style={{fontSize:14,fontWeight:600,color:muted?"var(--text-faint)":"var(--text-primary)"}}>{value}</div></div>;
}
export function Field({ label, value, onChange, options, textarea, placeholder }) {
  const st = {width:"100%",padding:"10px 14px",borderRadius:10,background:"var(--bg-input)",border:"1px solid var(--border-input)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color .15s"};
  const fid = (label||"field").toLowerCase().replace(/[^a-z0-9]/g,"_");
  return <div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:6}}>{label}</div>{options?<select id={fid} name={fid} value={value} onChange={e=>onChange(e.target.value)} style={{...st,cursor:"pointer"}}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>:textarea?<textarea id={fid} name={fid} value={value} onChange={e=>onChange(e.target.value)} rows={3} style={{...st,resize:"vertical"}} placeholder={placeholder}/>:<input id={fid} name={fid} value={value} onChange={e=>onChange(e.target.value)} style={st} placeholder={placeholder} autoComplete="off"/>}</div>;
}
export function Section({ title, right, children }) {
  return <div style={{marginBottom:28}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}>{title}</div>{right}</div>{children}</div>;
}
export function Toggle({ value, onChange, label }) {
  return <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>onChange(!value)}>
    <div style={{width:40,height:22,borderRadius:11,background:value?"var(--success-muted)":"var(--bg-active)",border:`1px solid ${value?"var(--success)":"var(--border-strong)"}`,position:"relative",transition:"all .2s"}}>
      <div style={{width:16,height:16,borderRadius:8,background:value?"var(--success)":"var(--text-faint)",position:"absolute",top:2,left:value?21:2,transition:"all .2s"}}/>
    </div>
    {label&&<span style={{fontSize:14,fontWeight:600,color:value?"var(--text-primary)":"var(--text-muted)"}}>{label}</span>}
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
        <text x={i * 60 + 28} y={height + 18} textAnchor="middle" fill="var(--chart-label)" fontSize={10} fontWeight={600}>{d.m}</text>
      </g>;
    })}
  </svg>;
}
/* Horizontal bar for countries */
export function HBar({ label, pct, color }) {
  return <div style={{marginBottom:8}}>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
      <span style={{fontWeight:600,color:"var(--text-secondary)"}}>{label}</span>
      <span style={{fontWeight:700,color}}>{pct}%</span>
    </div>
    <div style={{height:5,borderRadius:3,background:"var(--progress-track)"}}>
      <div style={{height:5,borderRadius:3,background:color,width:`${pct}%`,transition:"width .5s ease"}}/>
    </div>
  </div>;
}
