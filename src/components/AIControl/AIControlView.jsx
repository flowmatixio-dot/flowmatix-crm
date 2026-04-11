import { API_URL } from "../../api/client";
import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Btn, Stat, Field, Section, Toggle } from "../shared/index";
import { getAgentConfig, updateAgentConfig } from "../../api/client";

export default function AIControlView() {
  const {
    clinic, activeClinicId, setClinics, aiConfigData, setAiConfigData,
    newFaqQ, setNewFaqQ, newFaqA, setNewFaqA,
    showT, t,
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
            requiredPhotos: data.required_photos || 3,
            requiredPhotoTypes: data.required_photo_types || ["front","top","donor"],
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
      .catch(() => {
        /* API not available — initialize from local clinic data */
        if (!aiConfigData && clinic?.aiConfig) setAiConfigData({...clinic.aiConfig});
      })
      .finally(() => setLoading(false));
  }, [activeClinicId]);

  const ac = clinic?.aiConfig ? {...clinic.aiConfig, ...(aiConfigData || {})} : aiConfigData;
  useEffect(() => { if(clinic?.aiConfig) setAiConfigData({...clinic.aiConfig}); }, [clinic?.id]);
  if (!ac) return null;
  const upAi = (k, v) => setAiConfigData(p => ({...(p || clinic?.aiConfig || {}), [k]: v}));

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
        required_photos: ac.requiredPhotos || 3,
        required_photo_types: ac.requiredPhotoTypes || ["front","top","donor"],
        max_message_length: ac.maxMessageLength || 500,
        never_say: ac.neverSay || [],
        greeting_template: ac.greetingTemplate || null,
        consent_text: ac.consentText || null,
        working_hours: ac.workingHours || null,
        out_of_hours_reply: ac.outOfHoursReply || null,
      });
      setSynced(true);
      showT(t("ai_config_saved_synced"));
    } catch {
      showT(t("ai_config_saved_local"));
    }
  };

  return <div style={{padding:"28px 32px",maxWidth:800}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
      <h1 style={{fontSize:24,fontWeight:800,margin:0,letterSpacing:"-0.02em"}}>{t("ai_control_title")}</h1>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {loading && <span style={{fontSize:12,color:"var(--text-muted)"}}>{t("loading")}</span>}
        {synced && !loading && <span style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:"rgba(16,185,129,0.1)",color:"#10b981"}}>{t("synced_with_agent_db")}</span>}
        {!synced && !loading && <span style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:"rgba(255,138,42,0.1)",color:"#ff8a2a"}}>{t("local_only")}</span>}
      </div>
    </div>
    <p style={{fontSize:14,color:"var(--text-muted)",margin:"0 0 28px"}}>{t("ai_control_subtitle")}</p>
    {/* AI Metrics */}
    <Section title={`🤖 ${t("ai_metrics")}`}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        <Stat label={t("automation_rate")} value={`${clinic.stats.aiHandled}%`} color="#10b981"/>
        <Stat label={t("human_interventions")} value={`${100-clinic.stats.aiHandled}%`} color="#ff8a2a"/>
        <Stat label={t("conversations")} value={clinic.stats.activeConvs} color="#4cc9ff" sub={t("active_now")}/>
        <Stat label={t("booking_success")} value={`${Math.round(clinic.stats.bookingsMonth/clinic.stats.leadsMonth*100)}%`} color="#a78bfa"/>
      </div>
    </Section>
    <Section title={t("response_settings")}>
      <Field label={t("response_tone")} value={ac.responseTone} onChange={v=>upAi("responseTone",v)} options={["professional","friendly","concierge","efficient"]}/>
      <Field label={t("clinic_desc_label")} value={ac.clinicDesc} onChange={v=>upAi("clinicDesc",v)} textarea placeholder={t("clinic_desc_placeholder")}/>
      <Field label={t("booking_rules")} value={ac.bookingRules} onChange={v=>upAi("bookingRules",v)} textarea placeholder={t("booking_rules_placeholder")}/>
    </Section>
    <Section title={t("services")}>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
        {(ac.services||[]).map((s,i)=><div key={i} style={{padding:"6px 14px",borderRadius:10,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",fontSize:13,fontWeight:600,color:"#4cc9ff",display:"flex",alignItems:"center",gap:6}}>
          {s}
          <span onClick={()=>upAi("services",ac.services.filter((_,j)=>j!==i))} style={{cursor:"pointer",color:"var(--text-faint)",fontSize:16,lineHeight:1}}>×</span>
        </div>)}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input id="newService" name="newService" placeholder={t("add_service")} style={{flex:1,padding:"8px 14px",borderRadius:10,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:13,outline:"none"}} onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){upAi("services",[...ac.services,e.target.value.trim()]);e.target.value="";}}}/>
      </div>
    </Section>
    <Section title={t("faq_knowledge")}>
      {(ac.faq||[]).map((f,i)=><div key={i} style={{padding:14,borderRadius:12,background:"var(--bg-card)",border:"1px solid var(--border-default)",marginBottom:8}}>
        <div style={{fontWeight:700,fontSize:14,color:"#4cc9ff",marginBottom:4}}>Q: {f.q}</div>
        <div style={{fontSize:13,color:"var(--text-secondary)"}}>A: {f.a}</div>
        <button onClick={()=>upAi("faq",ac.faq.filter((_,j)=>j!==i))} style={{marginTop:6,padding:"3px 10px",borderRadius:6,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("remove")}</button>
      </div>)}
      <div style={{padding:14,borderRadius:12,background:"var(--bg-card)",border:"1px dashed rgba(255,255,255,0.1)"}}>
        <Field label={t("new_question")} value={newFaqQ} onChange={setNewFaqQ} placeholder={t("new_question_placeholder")}/>
        <Field label={t("answer")} value={newFaqA} onChange={setNewFaqA} textarea placeholder={t("faq_answer_placeholder")}/>
        <Btn color="#10b981" icon="+" label={t("add_faq")} onClick={()=>{if(newFaqQ&&newFaqA){upAi("faq",[...(ac.faq||[]),{q:newFaqQ,a:newFaqA}]);setNewFaqQ("");setNewFaqA("");}}}/>
      </div>
    </Section>
    <Section title={t("behavior")}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Toggle value={ac.autoCollectPhotos} onChange={v=>upAi("autoCollectPhotos",v)} label={t("auto_collect_photos")}/>
        {ac.autoCollectPhotos && (<>
          <div><div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:6}}>{t("required_photos_count") || "Anzahl benötigter Fotos"}</div>
            <input type="number" min="1" max="10" value={ac.requiredPhotos||3} onChange={e=>upAi("requiredPhotos",parseInt(e.target.value)||3)} style={{width:80,padding:"8px 12px",borderRadius:10,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:14,outline:"none"}}/></div>
          <div><div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:8}}>{t("required_photo_types") || "Welche Fotos benötigt?"}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[{id:"front",label:t("photo_front")||"Front view"},{id:"top",label:t("photo_top")||"Top view"},{id:"left",label:t("photo_left_side")||"Left side"},{id:"right",label:t("photo_right_side")||"Right side"},{id:"donor",label:t("photo_donor_area")||"Donor area"},{id:"close_up",label:t("photo_close_up")||"Close-up"},{id:"hairline",label:t("photo_hairline")||"Hairline"}].map(pt=>{
                const types=ac.requiredPhotoTypes||["front","top","donor"];
                const active=types.includes(pt.id);
                return<button key={pt.id} onClick={()=>upAi("requiredPhotoTypes",active?types.filter(x=>x!==pt.id):[...types,pt.id])} style={{padding:"6px 14px",borderRadius:10,background:active?"rgba(76,201,255,0.1)":"var(--bg-card)",border:`1px solid ${active?"rgba(76,201,255,0.25)":"var(--border-strong)"}`,color:active?"#4cc9ff":"var(--text-muted)",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{active?"✓ ":""}{pt.label}</button>;
              })}
            </div>
          </div>
        </>)}
        <Toggle value={ac.autoQualify} onChange={v=>upAi("autoQualify",v)} label={t("auto_qualify_leads")}/>
        <div><div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:6}}>{t("max_wait_handover")}</div>
          <input id="maxWait" name="maxWait" type="number" value={ac.maxWaitBeforeHandover} onChange={e=>upAi("maxWaitBeforeHandover",parseInt(e.target.value)||5)} style={{width:80,padding:"8px 12px",borderRadius:10,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:14,outline:"none"}}/></div>
      </div>
    </Section>
    {/* Webhook Controller */}
    <Section title={`🔌 ${t("webhook_controller")}`} right={<span style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,background:"rgba(16,185,129,0.12)",color:"#10b981"}}>{`● ${t("connected")}`}</span>}>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:14}}>{t("webhook_description")}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div style={{padding:14,borderRadius:12,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text-faint)",marginBottom:4}}>{t("webhook_endpoint")}</div>
          <div style={{fontFamily:"monospace",fontSize:12,color:"#4cc9ff",wordBreak:"break-all"}}>{`${API_URL}/webhook/wa/${activeClinicId}`}</div>
        </div>
        <div style={{padding:14,borderRadius:12,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text-faint)",marginBottom:4}}>{t("verify_token")}</div>
          <div style={{fontFamily:"monospace",fontSize:12,color:"rgba(232,238,252,0.95)"}}>fm_{activeClinicId}_verify_2026</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[{icon:"📩",label:t("incoming_messages"),desc:t("incoming_messages_desc"),status:true},{icon:"🎙",label:t("voice_messages") || "Sprachnachrichten",desc:t("voice_messages_desc") || "Automatische Transkription",status:true},{icon:"🌙",label:t("auto_responder_247"),desc:`${t("max_wait")}: ${ac.maxWaitBeforeHandover}min`,status:true}].map((w,i)=>
          <div key={i} style={{padding:12,borderRadius:10,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><span>{w.icon}</span><span style={{fontWeight:700,fontSize:13}}>{w.label}</span></div>
            <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:6}}>{w.desc}</div>
            <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:99,background:w.status?"#10b981":"#ef4444"}}/><span style={{fontSize:11,fontWeight:600,color:w.status?"#10b981":"#ef4444"}}>{w.status?t("active"):t("inactive")}</span></div>
          </div>
        )}
      </div>
      <div style={{padding:12,borderRadius:10,background:"rgba(255,138,42,0.04)",border:"1px solid rgba(255,138,42,0.1)",fontSize:12,color:"var(--text-muted)"}}>
        <strong style={{color:"#ff8a2a"}}>{t("ai_workflow") || "KI-Workflow"}:</strong> {t("ai_workflow_desc") || "Automatischer Intake → Fotos → Arzt-Bewertung → Behandlungsplan → Terminvergabe"}
      </div>
    </Section>
    {/* AI Voice Fallback */}
    <Section title={`🎙 ${t("ai_voice_fallback")}`} right={<span style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,background:"rgba(167,177,195,0.08)",color:"var(--text-muted)"}}>{t("add_on")}</span>}>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:14}}>{t("voice_fallback_desc")}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div style={{padding:14,borderRadius:12,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text-faint)",marginBottom:6}}>{t("voice_provider")}</div>
          <div style={{display:"flex",gap:6}}>{["Vapi","Retell AI","ElevenLabs"].map(p=><button key={p} onClick={()=>showT(`${p} ${t("selected_configure_settings")}`)} style={{padding:"6px 12px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border-strong)",color:"var(--text-muted)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{p}</button>)}</div>
        </div>
        <div style={{padding:14,borderRadius:12,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text-faint)",marginBottom:6}}>{t("scenario_preview")}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.6,fontStyle:"italic"}}>"Hallo Carlos, ich sehe Dr. Yilmaz hat deinen Plan fertig. Möchtest du den Termin am 12. März fest buchen?"</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[{icon:"📞",label:t("inbound_calls"),desc:t("inbound_calls_desc")},{icon:"🗣",label:t("crm_context"),desc:t("crm_context_desc")},{icon:"📅",label:t("live_booking"),desc:t("live_booking_desc")}].map((f,i)=>
          <div key={i} style={{padding:10,borderRadius:10,background:"var(--bg-card)",border:"1px solid var(--border-default)",fontSize:12}}>
            <span style={{fontSize:18}}>{f.icon}</span>
            <div style={{fontWeight:700,marginTop:4}}>{f.label}</div>
            <div style={{color:"var(--text-muted)",marginTop:2}}>{f.desc}</div>
          </div>
        )}
      </div>
    </Section>
    {/* Agent-specific settings from DB */}
    <Section title={t("agent_boundaries")}>
      <Field label={t("greeting_template")} value={ac.greetingTemplate||''} onChange={v=>upAi("greetingTemplate",v)} textarea placeholder={t("greeting_template_placeholder")}/>
      <Field label={t("gdpr_consent_text")} value={ac.consentText||''} onChange={v=>upAi("consentText",v)} textarea placeholder={t("gdpr_consent_placeholder")}/>
      <Field label={t("out_of_hours_reply")} value={ac.outOfHoursReply||''} onChange={v=>upAi("outOfHoursReply",v)} textarea placeholder={t("out_of_hours_placeholder")}/>
      <div style={{marginTop:12}}>
        <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:6}}>{t("never_say_label")}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
          {(ac.neverSay||[]).map((w,i)=><span key={i} style={{padding:"4px 10px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",fontSize:12,fontWeight:600,color:"#ef4444",display:"flex",alignItems:"center",gap:4}}>
            {w} <span onClick={()=>upAi("neverSay",(ac.neverSay||[]).filter((_,j)=>j!==i))} style={{cursor:"pointer",fontSize:14,lineHeight:1}}>x</span>
          </span>)}
        </div>
        <input placeholder={t("add_forbidden_topic")} style={{width:"100%",padding:"8px 14px",borderRadius:10,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:13,outline:"none"}} onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){upAi("neverSay",[...(ac.neverSay||[]),e.target.value.trim()]);e.target.value="";}}}/>
      </div>
    </Section>
    {/* System Prompt Preview */}
    {ac.systemPrompt && <Section title={t("generated_system_prompt")} right={<span style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,background:"rgba(76,201,255,0.08)",color:"#4cc9ff"}}>{t("auto_generated")}</span>}>
      <div style={{padding:14,borderRadius:12,background:"rgba(0,0,0,0.3)",border:"1px solid var(--border-default)",maxHeight:200,overflowY:"auto"}}>
        <pre style={{margin:0,fontSize:12,color:"rgba(232,238,252,0.95)",whiteSpace:"pre-wrap",fontFamily:"monospace",lineHeight:1.5}}>{ac.systemPrompt}</pre>
      </div>
      <div style={{fontSize:11,color:"var(--text-faint)",marginTop:8}}>{t("system_prompt_hint")}</div>
    </Section>}
    <button onClick={saveAi} style={{padding:"14px 32px",borderRadius:14,background:"linear-gradient(135deg,#ff8a2a,#ff6b00)",border:"none",color:"var(--text-primary)",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>{loading ? t("saving") : t("save_ai_config")}</button>
  </div>;
}
