import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Btn, Stat, Field, Section, Toggle } from "../shared/index";
import { getAgentConfig, updateAgentConfig } from "../../api/client";

export default function AIControlView() {
  const {
    clinic, activeClinicId, setClinics, aiConfigData, setAiConfigData,
    newFaqQ, setNewFaqQ, newFaqA, setNewFaqA,
    showT,
  } = useApp();

  const [dbConfig, setDbConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);

  // Load agent config from DB on mount
  useEffect(() => {
    if (!activeClinicId) return;
    setLoading(true);
    getAgentConfig(activeClinicId)
      .then(data => {
        setDbConfig(data);
        // Merge DB config into local state
        if (data) {
          setAiConfigData(prev => ({
            ...(prev || clinic.aiConfig),
            // Map DB fields to CRM fields
            responseTone: data.tonality || prev?.responseTone || 'professional',
            clinicDesc: data.custom_instructions || prev?.clinicDesc || '',
            services: data.treatments || prev?.services || [],
            allowedLangs: data.languages || prev?.allowedLangs || ['German'],
            photosRequired: data.photos_required ?? true,
            minPhotos: data.min_photos || 1,
            maxMessageLength: data.max_message_length || 500,
            neverSay: data.never_say || [],
            workingHours: data.working_hours || null,
            outOfHoursReply: data.out_of_hours_reply || '',
            greetingTemplate: data.greeting_template || '',
            consentText: data.consent_text || '',
            systemPrompt: data.system_prompt || '',
            // Keep existing local fields
            bookingRules: prev?.bookingRules || '',
            faq: prev?.faq || [],
            autoCollectPhotos: prev?.autoCollectPhotos ?? true,
            autoQualify: prev?.autoQualify ?? true,
            maxWaitBeforeHandover: prev?.maxWaitBeforeHandover || 10,
          }));
          setSynced(true);
        }
      })
      .catch(() => { /* API not available yet, use local data */ })
      .finally(() => setLoading(false));
  }, [activeClinicId]);

  const ac = aiConfigData || clinic.aiConfig;
  if (!ac) return null;
  if (!aiConfigData) setAiConfigData({...clinic.aiConfig});
  const upAi = (k, v) => setAiConfigData(p => ({...p, [k]: v}));

  const saveAi = async () => {
    // Save locally
    setClinics(cs => cs.map(c => c.id === activeClinicId ? {...c, aiConfig: {...aiConfigData}} : c));
    // Also save to DB via API
    try {
      await updateAgentConfig(activeClinicId, {
        tonality: ac.responseTone,
        custom_instructions: ac.clinicDesc,
        treatments: ac.services,
        languages: ac.allowedLangs,
        photos_required: ac.autoCollectPhotos,
        max_message_length: ac.maxMessageLength || 500,
        never_say: ac.neverSay || [],
        greeting_template: ac.greetingTemplate || null,
        consent_text: ac.consentText || null,
        working_hours: ac.workingHours || null,
        out_of_hours_reply: ac.outOfHoursReply || null,
      });
      setSynced(true);
      showT("AI config saved & synced to agent");
    } catch {
      showT("AI config saved locally (API sync pending)");
    }
  };

  return <div style={{padding:"28px 32px",maxWidth:800}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
      <h1 style={{fontSize:24,fontWeight:800,margin:0,letterSpacing:"-0.02em"}}>AI Control</h1>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {loading && <span style={{fontSize:12,color:"rgba(167,177,195,0.5)"}}>Loading...</span>}
        {synced && !loading && <span style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:"rgba(16,185,129,0.1)",color:"#10b981"}}>Synced with Agent DB</span>}
        {!synced && !loading && <span style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:"rgba(255,138,42,0.1)",color:"#ff8a2a"}}>Local only</span>}
      </div>
    </div>
    <p style={{fontSize:14,color:"rgba(167,177,195,0.5)",margin:"0 0 28px"}}>Configure how your AI assistant behaves. Changes sync to the agent in real-time.</p>
    {/* AI Metrics */}
    <Section title="🤖 AI Metrics">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        <Stat label="Automation Rate" value={`${clinic.stats.aiHandled}%`} color="#10b981"/>
        <Stat label="Human Interventions" value={`${100-clinic.stats.aiHandled}%`} color="#ff8a2a"/>
        <Stat label="Conversations" value={clinic.stats.activeConvs} color="#4cc9ff" sub="active now"/>
        <Stat label="Booking Success" value={`${Math.round(clinic.stats.bookingsMonth/clinic.stats.leadsMonth*100)}%`} color="#a78bfa"/>
      </div>
    </Section>
    <Section title="Response Settings">
      <Field label="Response Tone" value={ac.responseTone} onChange={v=>upAi("responseTone",v)} options={["professional","friendly","concierge","efficient"]}/>
      <Field label="Clinic Description (shown to AI)" value={ac.clinicDesc} onChange={v=>upAi("clinicDesc",v)} textarea placeholder="Describe your clinic for the AI…"/>
      <Field label="Booking Rules" value={ac.bookingRules} onChange={v=>upAi("bookingRules",v)} textarea placeholder="e.g. Only book after medical review"/>
    </Section>
    <Section title="Services">
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
        {(ac.services||[]).map((s,i)=><div key={i} style={{padding:"6px 14px",borderRadius:10,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",fontSize:13,fontWeight:600,color:"#4cc9ff",display:"flex",alignItems:"center",gap:6}}>
          {s}
          <span onClick={()=>upAi("services",ac.services.filter((_,j)=>j!==i))} style={{cursor:"pointer",color:"rgba(167,177,195,0.4)",fontSize:16,lineHeight:1}}>×</span>
        </div>)}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input id="newService" name="newService" placeholder="Add service…" style={{flex:1,padding:"8px 14px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:13,outline:"none"}} onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){upAi("services",[...ac.services,e.target.value.trim()]);e.target.value="";}}}/>
      </div>
    </Section>
    <Section title="FAQ Knowledge">
      {(ac.faq||[]).map((f,i)=><div key={i} style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",marginBottom:8}}>
        <div style={{fontWeight:700,fontSize:14,color:"#4cc9ff",marginBottom:4}}>Q: {f.q}</div>
        <div style={{fontSize:13,color:"rgba(232,238,252,0.7)"}}>A: {f.a}</div>
        <button onClick={()=>upAi("faq",ac.faq.filter((_,j)=>j!==i))} style={{marginTop:6,padding:"3px 10px",borderRadius:6,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Remove</button>
      </div>)}
      <div style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.1)"}}>
        <Field label="New Question" value={newFaqQ} onChange={setNewFaqQ} placeholder="e.g. What is the recovery time?"/>
        <Field label="Answer" value={newFaqA} onChange={setNewFaqA} textarea placeholder="AI will use this answer…"/>
        <Btn color="#10b981" icon="+" label="Add FAQ" onClick={()=>{if(newFaqQ&&newFaqA){upAi("faq",[...(ac.faq||[]),{q:newFaqQ,a:newFaqA}]);setNewFaqQ("");setNewFaqA("");}}}/>
      </div>
    </Section>
    <Section title="Allowed Languages">
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {["English","Turkish","Arabic","French","German","Spanish","Japanese","Italian","Portuguese","Swedish","Dutch","Russian","Chinese"].map(l=>{
          const active=(ac.allowedLangs||[]).includes(l);
          return<button key={l} onClick={()=>upAi("allowedLangs",active?ac.allowedLangs.filter(x=>x!==l):[...(ac.allowedLangs||[]),l])} style={{padding:"6px 14px",borderRadius:10,background:active?"rgba(16,185,129,0.1)":"rgba(255,255,255,0.03)",border:`1px solid ${active?"rgba(16,185,129,0.25)":"rgba(255,255,255,0.08)"}`,color:active?"#10b981":"rgba(167,177,195,0.5)",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{active?"✓ ":""}{l}</button>;
        })}
      </div>
    </Section>
    <Section title="Behavior">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Toggle value={ac.autoCollectPhotos} onChange={v=>upAi("autoCollectPhotos",v)} label="Auto-collect photos from patients"/>
        <Toggle value={ac.autoQualify} onChange={v=>upAi("autoQualify",v)} label="Auto-qualify leads with AI"/>
        <div><div style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:6}}>Max wait before human handover (minutes)</div>
          <input id="maxWait" name="maxWait" type="number" value={ac.maxWaitBeforeHandover} onChange={e=>upAi("maxWaitBeforeHandover",parseInt(e.target.value)||5)} style={{width:80,padding:"8px 12px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none"}}/></div>
      </div>
    </Section>
    {/* Webhook Controller */}
    <Section title="🔌 Webhook Controller" right={<span style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,background:"rgba(16,185,129,0.12)",color:"#10b981"}}>● Connected</span>}>
      <div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginBottom:14}}>Central server that receives WhatsApp/Meta webhooks, triggers Vision AI, and powers the auto-responder.</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",marginBottom:4}}>WEBHOOK ENDPOINT</div>
          <div style={{fontFamily:"monospace",fontSize:12,color:"#4cc9ff",wordBreak:"break-all"}}>https://api.flowmatix.io/webhook/wa/{activeClinicId}</div>
        </div>
        <div style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",marginBottom:4}}>VERIFY TOKEN</div>
          <div style={{fontFamily:"monospace",fontSize:12,color:"rgba(232,238,252,0.6)"}}>fm_{activeClinicId}_verify_2026</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[{icon:"📩",label:"Incoming Messages",desc:"Auto-parsed & routed to AI",status:true},{icon:"🖼",label:"Vision AI",desc:"Flight tickets → flight_confirmed",status:true},{icon:"🌙",label:"24/7 Auto-Responder",desc:`Max wait: ${ac.maxWaitBeforeHandover}min`,status:true}].map((w,i)=>
          <div key={i} style={{padding:12,borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><span>{w.icon}</span><span style={{fontWeight:700,fontSize:13}}>{w.label}</span></div>
            <div style={{fontSize:12,color:"rgba(167,177,195,0.5)",marginBottom:6}}>{w.desc}</div>
            <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:99,background:w.status?"#10b981":"#ef4444"}}/><span style={{fontSize:11,fontWeight:600,color:w.status?"#10b981":"#ef4444"}}>{w.status?"Active":"Inactive"}</span></div>
          </div>
        )}
      </div>
      <div style={{padding:12,borderRadius:10,background:"rgba(255,138,42,0.04)",border:"1px solid rgba(255,138,42,0.1)",fontSize:12,color:"rgba(167,177,195,0.5)"}}>
        <strong style={{color:"#ff8a2a"}}>Vision AI Pipeline:</strong> When a patient sends an image → Meta Webhook → our Edge Function runs Claude Vision → detects flight ticket → extracts date → writes <code style={{background:"rgba(255,255,255,0.06)",padding:"1px 4px",borderRadius:3}}>flight_confirmed: "2026-03-12"</code> to lead record → triggers "Flight Confirmed" automation.
      </div>
    </Section>
    {/* AI Voice Fallback */}
    <Section title="🎙 AI Voice Fallback" right={<span style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,background:"rgba(167,177,195,0.08)",color:"rgba(167,177,195,0.5)"}}>Add-on</span>}>
      <div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginBottom:14}}>Patients call your clinic number → AI answers, recognizes them by phone, and handles booking/questions with full CRM context.</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",marginBottom:6}}>VOICE PROVIDER</div>
          <div style={{display:"flex",gap:6}}>{["Vapi","Retell AI","ElevenLabs"].map(p=><button key={p} onClick={()=>showT(`${p} selected — configure in Settings`)} style={{padding:"6px 12px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.6)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{p}</button>)}</div>
        </div>
        <div style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",marginBottom:6}}>SCENARIO PREVIEW</div>
          <div style={{fontSize:12,color:"rgba(167,177,195,0.6)",lineHeight:1.6,fontStyle:"italic"}}>"Hallo Carlos, ich sehe Dr. Yilmaz hat deinen Plan fertig. Möchtest du den Termin am 12. März fest buchen?"</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[{icon:"📞",label:"Inbound Calls",desc:"AI answers, identifies caller"},{icon:"🗣",label:"CRM Context",desc:"Reads patient stage + history"},{icon:"📅",label:"Live Booking",desc:"Books directly in calendar"}].map((f,i)=>
          <div key={i} style={{padding:10,borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",fontSize:12}}>
            <span style={{fontSize:18}}>{f.icon}</span>
            <div style={{fontWeight:700,marginTop:4}}>{f.label}</div>
            <div style={{color:"rgba(167,177,195,0.5)",marginTop:2}}>{f.desc}</div>
          </div>
        )}
      </div>
    </Section>
    {/* Agent-specific settings from DB */}
    <Section title="Agent Boundaries">
      <Field label="Greeting Template" value={ac.greetingTemplate||''} onChange={v=>upAi("greetingTemplate",v)} textarea placeholder="Custom welcome message (leave empty for default)"/>
      <Field label="GDPR Consent Text" value={ac.consentText||''} onChange={v=>upAi("consentText",v)} textarea placeholder="Custom DSGVO consent text (leave empty for default)"/>
      <Field label="Out-of-Hours Reply" value={ac.outOfHoursReply||''} onChange={v=>upAi("outOfHoursReply",v)} textarea placeholder="Auto-reply when clinic is closed"/>
      <div style={{marginTop:12}}>
        <div style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.5)",marginBottom:6}}>Never Say (topics the AI must avoid)</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
          {(ac.neverSay||[]).map((w,i)=><span key={i} style={{padding:"4px 10px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",fontSize:12,fontWeight:600,color:"#ef4444",display:"flex",alignItems:"center",gap:4}}>
            {w} <span onClick={()=>upAi("neverSay",(ac.neverSay||[]).filter((_,j)=>j!==i))} style={{cursor:"pointer",fontSize:14,lineHeight:1}}>x</span>
          </span>)}
        </div>
        <input placeholder="Add forbidden topic..." style={{width:"100%",padding:"8px 14px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:13,outline:"none"}} onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){upAi("neverSay",[...(ac.neverSay||[]),e.target.value.trim()]);e.target.value="";}}}/>
      </div>
    </Section>
    {/* System Prompt Preview */}
    {ac.systemPrompt && <Section title="Generated System Prompt" right={<span style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,background:"rgba(76,201,255,0.08)",color:"#4cc9ff"}}>Auto-generated</span>}>
      <div style={{padding:14,borderRadius:12,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.06)",maxHeight:200,overflowY:"auto"}}>
        <pre style={{margin:0,fontSize:12,color:"rgba(232,238,252,0.6)",whiteSpace:"pre-wrap",fontFamily:"monospace",lineHeight:1.5}}>{ac.systemPrompt}</pre>
      </div>
      <div style={{fontSize:11,color:"rgba(167,177,195,0.4)",marginTop:8}}>This prompt is auto-generated from your settings above. It updates when you save.</div>
    </Section>}
    <button onClick={saveAi} style={{padding:"14px 32px",borderRadius:14,background:"linear-gradient(135deg,#ff8a2a,#ff6b00)",border:"none",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>{loading ? "Saving..." : "Save AI Config"}</button>
  </div>;
}
