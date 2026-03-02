import { useApp } from "../../context/AppContext";
import { Section } from "../shared/index";
import { PLAN_C, PLAN_PRICE } from "../../data/constants";

export default function BillingView() {
  const { clinic, setClinics, showT, showPlanPicker, setShowPlanPicker, cancelConfirm, setCancelConfirm, browserNotify, t } = useApp();
  if (!clinic) return null;

  return <div style={{padding:28,maxWidth:780}}><h1 style={{fontSize:22,fontWeight:800,margin:"0 0 28px"}}>Billing & Plan</h1><div style={{padding:22,borderRadius:16,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",marginBottom:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div><div style={{fontSize:13,color:"rgba(167,177,195,0.5)"}}>{t("current_plan")}</div><div style={{fontSize:22,fontWeight:800,color:PLAN_C[clinic.plan],marginTop:4}}>{clinic.plan.toUpperCase()} <span style={{fontSize:16,color:"rgba(232,238,252,0.7)"}}>— {PLAN_PRICE[clinic.plan]}/mo</span></div></div><button onClick={()=>setShowPlanPicker(!showPlanPicker)} style={{padding:"8px 18px",borderRadius:10,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Change Plan</button></div><div style={{display:"flex",gap:20,fontSize:13}}><div>Next: <span style={{fontWeight:600}}>{clinic.billing.nextDate}</span></div><div>Method: <span style={{fontWeight:600}}>{clinic.billing.method}</span></div></div></div>
    {/* Plan Picker */}
    {showPlanPicker&&<Section title="Select New Plan">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>
        {[{id:"starter",name:"Starter",price:"€199",patients:"150"},{id:"pro",name:"Pro",price:"€399",patients:"400"},{id:"premium",name:"Premium",price:"€699",patients:"800"},{id:"enterprise",name:"Enterprise",price:"€1,199",patients:"Unlimited"}].map(p=>{
          const isCurrent=clinic.plan===p.id;
          return<div key={p.id} style={{padding:16,borderRadius:14,background:isCurrent?"rgba(76,201,255,0.06)":"rgba(255,255,255,0.03)",border:`1px solid ${isCurrent?"rgba(76,201,255,0.25)":"rgba(255,255,255,0.08)"}`,textAlign:"center",cursor:isCurrent?"default":"pointer"}} onClick={()=>{
            if(isCurrent)return;
            setClinics(cs=>cs.map(c=>c.id===clinic.id?{...c,plan:p.id}:c));
            showT(`Plan changed to ${p.name}. Billing adjusted from next period.`);
            setShowPlanPicker(false);
            browserNotify("Plan Changed",`Now on ${p.name} — ${p.price}/mo`);
          }}>
            <div style={{fontWeight:800,fontSize:16,color:PLAN_C[p.id],marginBottom:4}}>{p.name}</div>
            <div style={{fontWeight:800,fontSize:20,marginBottom:4}}>{p.price}<span style={{fontSize:12,fontWeight:500,color:"rgba(167,177,195,0.5)"}}>/mo</span></div>
            <div style={{fontSize:12,color:"rgba(167,177,195,0.5)",marginBottom:10}}>{p.patients} patients/mo</div>
            {isCurrent?<div style={{padding:"6px 14px",borderRadius:8,background:"rgba(76,201,255,0.1)",color:"#4cc9ff",fontWeight:700,fontSize:12}}>Current</div>:<div style={{padding:"6px 14px",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontWeight:700,fontSize:12}}>Select</div>}
          </div>;
        })}
      </div>
      <div style={{fontSize:12,color:"rgba(167,177,195,0.4)"}}>ℹ️ Plan change takes effect on next billing date ({clinic.billing?.nextDate}). Billing is adjusted automatically.</div>
    </Section>}
    <Section title="Compare Plans">
      <div style={{borderRadius:14,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)",marginBottom:0}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",background:"rgba(255,255,255,0.04)",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.5)",textTransform:"uppercase"}}>
          <div>Feature</div><div style={{textAlign:"center"}}>Starter</div><div style={{textAlign:"center",color:"#4cc9ff"}}>Pro</div><div style={{textAlign:"center",color:"#a78bfa"}}>Premium</div><div style={{textAlign:"center",color:"#ff8a2a"}}>Enterprise</div>
        </div>
        {[{f:"Price",v:["€199","€399","€699","€1,199"]},{f:"Patients/month",v:["150","400","800","Unlimited"]},{f:"Languages",v:["1","3","All","All"]},{f:"WhatsApp AI 24/7",v:["✓","✓","✓","✓"]},{f:"Voice Messages",v:["—","✓","✓","✓"]},{f:"CRM Portal",v:["—","✓","✓","✓"]},{f:"WA Reminders",v:["—","—","✓","✓"]},{f:"Custom Flows",v:["—","—","—","✓"]},{f:"Account Manager",v:["—","—","—","✓"]},{f:"Clinic Launch",v:["€2,500","€2,500","€2,500","€4,999"]}].map((row,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:13}}>
          <div style={{fontWeight:600,color:"rgba(232,238,252,0.8)"}}>{row.f}</div>
          {row.v.map((v,j)=>{const highlight=["starter","pro","premium","enterprise"][j]===clinic.plan;return<div key={j} style={{textAlign:"center",color:v==="✓"?"#10b981":v==="—"?"rgba(167,177,195,0.25)":"rgba(232,238,252,0.7)",fontWeight:v==="✓"||highlight?700:500,background:highlight?"rgba(76,201,255,0.04)":"transparent",borderRadius:4,padding:"2px 0"}}>{v}</div>;})}
        </div>)}
      </div>
    </Section>
    <Section title="Invoices">{clinic.billing.invoices.map((inv,i)=><div key={i} style={{padding:"12px 16px",borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,fontSize:14}}><div><span style={{fontWeight:600}}>{inv.date}</span><span style={{color:"rgba(167,177,195,0.5)",marginLeft:10}}>{inv.desc}</span></div><div style={{display:"flex",gap:12,alignItems:"center"}}><span style={{fontWeight:700}}>{inv.amount}</span><span style={{padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:"rgba(16,185,129,0.12)",color:"#10b981"}}>{inv.status}</span><button onClick={()=>showT("Downloading…")} style={{padding:"3px 10px",borderRadius:6,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.5)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>↓ PDF</button></div></div>)}</Section>
    <div style={{padding:20,borderRadius:14,border:"1px solid rgba(239,68,68,0.15)",background:"rgba(239,68,68,0.04)"}}>{!cancelConfirm?<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:700,fontSize:14,color:"rgba(239,68,68,0.8)"}}>Cancel Subscription</div><div style={{fontSize:13,color:"rgba(167,177,195,0.5)",marginTop:4}}>Active until billing period end.</div></div><button onClick={()=>setCancelConfirm(true)} style={{padding:"8px 18px",borderRadius:10,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#ef4444",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button></div>:<div><div style={{fontWeight:700,color:"#ef4444",marginBottom:8}}>Sure?</div><div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginBottom:14}}>Active until <strong>{clinic.billing.nextDate}</strong>.</div><div style={{display:"flex",gap:10}}><button onClick={()=>{showT("Cancelled");setCancelConfirm(false);}} style={{padding:"8px 18px",borderRadius:10,background:"#ef4444",border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Yes</button><button onClick={()=>setCancelConfirm(false)} style={{padding:"8px 18px",borderRadius:10,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(232,238,252,0.7)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Keep</button></div></div>}</div></div>;
}
