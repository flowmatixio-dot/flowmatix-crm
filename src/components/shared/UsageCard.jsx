import { useState, useEffect } from "react";
import * as api from "../../api/client";

function _getStatusConfig() {
  const l = localStorage.getItem("fm_lang") || "de";
  const _t = (de, en, tr) => ({ de, en, tr }[l] || en);
  return {
    ok:        { color: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.15)", msg: _t("Sie sind innerhalb Ihrer Plan-Grenzen.", "You're within your plan limits.", "Plan limitiniz dahilindésiniz.") },
    warn:      { color: "#fbbf24", bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.2)",  msg: _t("Annäherung an Ihr monatliches Patientenlimit.", "Approaching your monthly patient limit.", "Aylık hasta limitinize yaklaşıyorsunuz.") },
    critical:  { color: "#ef4444", bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.2)",   msg: _t("Sehr nah an Ihrem monatlichen Limit.", "Very close to your monthly limit.", "Aylık limitinize çok yakınsınız.") },
    exceeded:  { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.3)",   msg: _t("Monatliches Limit erreicht. Neue Patienten pausiert.", "Monthly limit reached. New patients paused.", "Aylık limit doldu. Yeni hastalar duraklatıldı.") },
    unlimited: { color: "#10b981", bg: "rgba(16,185,129,0.04)", border: "rgba(16,185,129,0.1)",  msg: _t("Unbegrenzte Patienten in Ihrem Plan.", "Unlimited patients on your plan.", "Planınızda sınırsız hasta.") },
  };
}

export default function UsageCard({ onUpgrade, compact }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = () => api.getUsage().then(d => mounted && setData(d)).catch(() => mounted && setErr(true));
    load();
    const iv = setInterval(load, 60000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const _l = localStorage.getItem("fm_lang") || "de";
  if (err) return <div style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",fontSize:13,color:"rgba(167,177,195,0.7)"}}>
    {{ de: "Nutzung nicht verfügbar", en: "Usage unavailable", tr: "Kullanım bilgisi mevcut değil" }[_l] || "Usage unavailable"} <button onClick={()=>{setErr(false);api.getUsage().then(setData).catch(()=>setErr(true));}} style={{marginLeft:8,padding:"3px 10px",borderRadius:6,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{{ de: "Wiederholen", en: "Retry", tr: "Yeniden dene" }[_l] || "Retry"}</button>
  </div>;

  if (!data) return <div style={{padding:compact?12:18,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
    <div style={{height:14,width:120,borderRadius:4,background:"rgba(255,255,255,0.06)",marginBottom:10}} />
    <div style={{height:8,borderRadius:4,background:"rgba(255,255,255,0.04)",width:"100%"}} />
  </div>;

  const STATUS_CONFIG = _getStatusConfig();
  const s = STATUS_CONFIG[data.status] || STATUS_CONFIG.ok;
  const showCta = ["warn","critical","exceeded"].includes(data.status);
  const isUnlimited = data.status === "unlimited";

  return <div style={{padding:compact?14:18,borderRadius:14,background:s.bg,border:`1px solid ${s.border}`}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:compact?8:12}}>
      <div style={{fontSize:compact?12:13,fontWeight:700,color:"rgba(167,177,195,0.6)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{{ de: "Patienten diesen Monat", en: "Patients this month", tr: "Bu ay hastalar" }[_l] || "Patients this month"}</div>
      <div style={{fontSize:compact?14:16,fontWeight:800,color:s.color}}>
        {isUnlimited ? <span>{data.used} <span style={{fontSize:12,fontWeight:500}}>/ ∞</span></span>
          : <span>{data.used} <span style={{fontSize:12,fontWeight:500,color:"rgba(167,177,195,0.7)"}}>/ {data.limit}</span></span>}
      </div>
    </div>
    {!isUnlimited && <div style={{height:compact?6:8,borderRadius:4,background:"rgba(255,255,255,0.06)",marginBottom:compact?8:12,overflow:"hidden"}}>
      <div style={{height:"100%",borderRadius:4,background:s.color,width:`${Math.min(data.percent||0,100)}%`,transition:"width .6s ease"}} />
    </div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontSize:12,color:s.color,fontWeight:500}}>{s.msg}</div>
      {showCta && <button onClick={onUpgrade} style={{padding:"5px 14px",borderRadius:8,background:`${s.color}15`,border:`1px solid ${s.color}30`,color:s.color,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
        {data.status === "exceeded" ? ({ de: "Upgrade zum Fortfahren", en: "Upgrade to continue", tr: "Devam etmek için yükseltin" }[_l] || "Upgrade to continue") : ({ de: "Plan upgraden", en: "Upgrade plan", tr: "Planı yükselt" }[_l] || "Upgrade plan")}
      </button>}
    </div>
  </div>;
}
