import { useApp } from "../../context/AppContext";
import { Section } from "../shared/index";

export default function AddonsView() {
  const { clinic, setClinics, showT } = useApp();
  if (!clinic) return null;

  return <div style={{padding:28,maxWidth:900}}><h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Add-ons</h1><p style={{fontSize:14,color:"rgba(167,177,195,0.6)",margin:"0 0 28px"}}>Scale when needed — cancel anytime.</p>
    <Section title="Patient Capacity">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {[{cap:"+250",desc:"Add 250 patients to your plan.",price:"€99/mo",val:250},{cap:"+500",desc:"Best value for growing clinics.",price:"€179/mo",val:500,popular:true},{cap:"+1.000",desc:"Max boost with bulk savings.",price:"€299/mo",val:1000}].map(p=>{
          const active=clinic.addons.extraPatients===p.val;
          return<div key={p.val} style={{padding:20,borderRadius:16,background:active?"rgba(16,185,129,0.06)":"rgba(255,255,255,0.03)",border:`1px solid ${active?"rgba(16,185,129,0.25)":p.popular?"rgba(76,201,255,0.2)":"rgba(255,255,255,0.08)"}`,textAlign:"center",position:"relative"}}>
            {p.popular&&!active&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",padding:"2px 12px",borderRadius:6,background:"rgba(76,201,255,0.15)",border:"1px solid rgba(76,201,255,0.3)",fontSize:10,fontWeight:800,color:"#4cc9ff",whiteSpace:"nowrap"}}>Popular</div>}
            <div style={{fontSize:28,marginBottom:8}}>👥</div>
            <div style={{fontWeight:800,fontSize:18,marginBottom:4}}>{p.cap} Patients</div>
            <div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginBottom:14}}>{p.desc}</div>
            <div style={{fontWeight:800,fontSize:18,marginBottom:14}}>{p.price}</div>
            {active?<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}><div style={{padding:"8px 16px",borderRadius:10,background:"rgba(16,185,129,0.12)",color:"#10b981",fontWeight:700,fontSize:13}}>✓ Active</div><button onClick={()=>{setClinics(cs=>cs.map(c=>c.id===clinic.id?{...c,addons:{...c.addons,extraPatients:0}}:c));showT("Add-on cancelled — active until billing period end.");}} style={{padding:"4px 12px",borderRadius:8,background:"none",border:"1px solid rgba(239,68,68,0.2)",color:"rgba(239,68,68,0.6)",fontWeight:600,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button></div>:<button onClick={()=>{setClinics(cs=>cs.map(c=>c.id===clinic.id?{...c,addons:{...c.addons,extraPatients:p.val}}:c));showT("Add-on activated! Billing adjusted.");}} style={{padding:"8px 16px",borderRadius:10,background:"rgba(76,201,255,0.1)",border:"1px solid rgba(76,201,255,0.25)",color:"#4cc9ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Add to plan</button>}
          </div>;
        })}
      </div>
    </Section>
    <Section title="Feature Upgrades">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {[
          {id:"lang1",icon:"🌍",name:"+1 Language",desc:"One extra language",price:"€29/mo",forPlans:"Starter & Pro",key:"extraLang",av:true},
          {id:"langAll",icon:"🌐",name:"All Languages",desc:"Every language supported",price:"€69/mo",forPlans:"Starter & Pro",key:"languages",av:"all"},
          {id:"voice",icon:"🎙️",name:"Voice Messages",desc:"AI voice transcription",price:"€49/mo",forPlans:"Starter only",key:"voiceAI",av:true},
          {id:"remind",icon:"🔔",name:"WA Reminders",desc:"Auto-reminders for no-shows",price:"€39/mo",forPlans:"Starter & Pro",key:"reminders",av:true},
        ].map(a=>{
          const active=a.key&&clinic.addons[a.key]===a.av;
          return<div key={a.id} style={{padding:20,borderRadius:16,background:active?"rgba(16,185,129,0.04)":"rgba(255,255,255,0.03)",border:`1px solid ${active?"rgba(16,185,129,0.2)":"rgba(255,255,255,0.08)"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:28}}>{a.icon}</span>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {active&&<span style={{padding:"2px 10px",borderRadius:8,fontSize:11,fontWeight:700,background:"rgba(16,185,129,0.12)",color:"#10b981"}}>Active</span>}
                <span style={{padding:"2px 10px",borderRadius:8,fontSize:10,fontWeight:600,background:"rgba(255,255,255,0.06)",color:"rgba(167,177,195,0.5)"}}>{a.forPlans}</span>
              </div>
            </div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{a.name}</div>
            <div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginBottom:14}}>{a.desc}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:800,fontSize:16}}>{a.price}</span>
              {active?<button onClick={()=>{if(a.key){setClinics(cs=>cs.map(c=>c.id===clinic.id?{...c,addons:{...c.addons,[a.key]:a.key==="languages"?null:false}}:c));}showT("Add-on cancelled — active until billing period end.");}} style={{padding:"5px 12px",borderRadius:8,background:"none",border:"1px solid rgba(239,68,68,0.2)",color:"rgba(239,68,68,0.6)",fontWeight:600,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              :<button onClick={()=>{if(a.key){setClinics(cs=>cs.map(c=>c.id===clinic.id?{...c,addons:{...c.addons,[a.key]:a.av}}:c));}showT("Add-on activated! Billing adjusted.");}} style={{padding:"7px 14px",borderRadius:9,background:"rgba(76,201,255,0.1)",border:"1px solid rgba(76,201,255,0.25)",color:"#4cc9ff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Add to plan</button>}
            </div>
          </div>;
        })}
      </div>
    </Section>
    <div style={{padding:14,borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",fontSize:12,color:"rgba(167,177,195,0.4)"}}>ℹ️ Cancelled add-ons remain active until billing period end ({clinic.billing?.nextDate || "next billing date"}). Billing is adjusted automatically.</div>
  </div>;
}
