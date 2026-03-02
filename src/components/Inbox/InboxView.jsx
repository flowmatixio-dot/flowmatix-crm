import { useApp } from "../../context/AppContext";
import { CONV_STATUS, MSG_TEMPLATES } from "../../data/constants";

export default function InboxView() {
  const {
    clinic, activeClinicId, myMsgs, msgs, leads, selChat, setSelChat,
    inboxFilter, setInboxFilter, newMsg, setNewMsg, msgPage, setMsgPage,
    templateModal, setTemplateModal, templateFilter, setTemplateFilter,
    chatEnd, getCS, getLeadScore, getSLA, getLeadById, openPatient,
    setConvStatus, addTL, markResolved, sendMessage, sendTemplateMsg,
    resolveTemplate, simulatePaymentReceived, showT, t,
  } = useApp();

  const msgPageSize = 30;

  return <div style={{display:"flex",height:"100%"}}>
    <div style={{width:320,minWidth:320,borderRight:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",background:"#131c2e"}}>
      {/* Inbox filter tabs */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.04)",flexShrink:0}}>
        {[{id:"open",l:"Open"},{id:"needs_action",l:"⚡ Action"},{id:"ai_handling",l:"🤖 AI"},{id:"resolved",l:"✓ Done"},{id:"all",l:"All"}].map(f=>
          <button key={f.id} onClick={()=>setInboxFilter(f.id)} style={{flex:1,padding:"11px 0",background:inboxFilter===f.id?"rgba(76,201,255,0.06)":"transparent",border:"none",borderBottom:inboxFilter===f.id?"2px solid #4cc9ff":"2px solid transparent",color:inboxFilter===f.id?"#4cc9ff":"rgba(167,177,195,0.4)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{f.l}</button>
        )}
      </div>
      <div style={{flex:1,overflowY:"auto"}}>{myMsgs.map(ch=>{const cs=CONV_STATUS[getCS(ch)];const lead=ch.leadId?leads.find(l=>l.id===ch.leadId):null;const score=lead?getLeadScore(lead):null;const sla=lead?getSLA(lead):null;return<div key={ch.id} onClick={()=>setSelChat(ch)} style={{padding:"14px 18px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.04)",background:selChat?.id===ch.id?"rgba(76,201,255,0.08)":"transparent",borderLeft:sla?.overdue?"3px solid #ef4444":"3px solid transparent"}} onMouseEnter={e=>{if(selChat?.id!==ch.id)e.currentTarget.style.background="rgba(255,255,255,0.03)";}} onMouseLeave={e=>{if(selChat?.id!==ch.id)e.currentTarget.style.background="transparent";}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:700,fontSize:14}}>{ch.name}{ch.unread&&<span style={{display:"inline-block",width:7,height:7,borderRadius:99,background:"#ff8a2a",marginLeft:6}}/>}{score&&<span style={{marginLeft:6,fontSize:10,fontWeight:700,color:score.color}} title={`Lead Score: ${score.score}%`}>{score.icon}</span>}</span><span style={{fontSize:11,color:"rgba(167,177,195,0.4)"}}>{ch.msgs[ch.msgs.length-1]?.time}</span></div>
      <div style={{fontSize:13,color:"rgba(167,177,195,0.6)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:4}}>{ch.msgs[ch.msgs.length-1]?.text.substring(0,50)}</div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        {cs&&<span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:`${cs.color}15`,color:cs.color}}>{cs.icon} {cs.label}</span>}
        {sla&&<span style={{padding:"2px 6px",borderRadius:5,fontSize:9,fontWeight:700,background:`${sla.color}15`,color:sla.color}}>{sla.overdue?"⚠️":"⏱️"} {sla.hrs}h</span>}
      </div>
    </div>;})}{myMsgs.length===0&&<div style={{padding:40,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:12}}>💬</div>
      <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>No patient conversations yet</div>
      <p style={{fontSize:13,color:"rgba(167,177,195,0.5)",margin:"0 0 20px",lineHeight:1.6}}>Start with a quick test to see the AI in action:</p>
      <div style={{textAlign:"left",maxWidth:280,margin:"0 auto 20px",padding:16,borderRadius:14,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
        {["Send a test WhatsApp message","See the AI reply instantly","Confirm your clinic is ready"].map((s,i)=><div key={i} style={{display:"flex",gap:8,padding:"5px 0",fontSize:13,color:"rgba(167,177,195,0.5)"}}><span style={{color:"#4cc9ff"}}>•</span>{s}</div>)}
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
        <button onClick={()=>{showT("Test patient simulation started");}} style={{padding:"10px 18px",borderRadius:12,background:"linear-gradient(135deg,#00B4D8,#0096c7)",border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(0,180,216,0.15)"}}>See the patient experience live →</button>
      </div>
    </div>}</div></div>
    <div style={{flex:1,display:"flex",flexDirection:"column"}}>{!selChat?<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(167,177,195,0.4)"}}>{t("select_conv")}</div>:(()=>{const chatCS=getCS(selChat);const chatCSObj=CONV_STATUS[chatCS];return<>
      {/* Chat Status Banners */}
      {(chatCS==="ai_active"||chatCS==="collecting_photos")&&<div style={{padding:"10px 22px",background:"rgba(16,185,129,0.06)",borderBottom:"1px solid rgba(16,185,129,0.15)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>🤖</span><span style={{fontSize:13,fontWeight:700,color:"#10b981"}}>{chatCS==="collecting_photos"?"AI is collecting patient photos…":"AI is handling this conversation"}</span></div>
        <button onClick={()=>{if(selChat.leadId){setConvStatus(selChat.leadId,"human_takeover");addTL(selChat.leadId,"handover","Manual takeover from chat");showT(t("human_takeover"));}}} style={{padding:"5px 14px",borderRadius:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.3px",textTransform:"uppercase"}}>Stop AI & Take Over</button>
      </div>}
      {chatCS==="needs_medical_review"&&<div style={{padding:"10px 22px",background:"rgba(255,138,42,0.06)",borderBottom:"1px solid rgba(255,138,42,0.15)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>⚕️</span><span style={{fontSize:13,fontWeight:700,color:"#ff8a2a"}}>Waiting for Medical Review</span><span style={{fontSize:12,color:"rgba(167,177,195,0.5)"}}>— AI paused until you send a treatment plan</span></div>
        <button onClick={()=>{if(selChat.leadId)openPatient(selChat.leadId);}} style={{padding:"5px 14px",borderRadius:8,background:"rgba(255,138,42,0.1)",border:"1px solid rgba(255,138,42,0.25)",color:"#ff8a2a",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>⚕️ Open Review</button>
      </div>}
      {chatCS==="human_takeover"&&<div style={{padding:"10px 22px",background:"rgba(239,68,68,0.06)",borderBottom:"1px solid rgba(239,68,68,0.15)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>👤</span><span style={{fontSize:13,fontWeight:700,color:"#ef4444"}}>You are in control</span><span style={{fontSize:12,color:"rgba(167,177,195,0.5)"}}>— AI is paused</span></div>
        <button onClick={()=>{if(selChat.leadId){setConvStatus(selChat.leadId,"ai_active");addTL(selChat.leadId,"system","AI resumed from chat");showT("AI resumed");}}} style={{padding:"5px 14px",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🤖 Resume AI</button>
      </div>}
      {chatCS==="booking_pending"&&<div style={{padding:"10px 22px",background:"rgba(76,201,255,0.06)",borderBottom:"1px solid rgba(76,201,255,0.15)",display:"flex",alignItems:"center",gap:8,flexShrink:0}}><span style={{fontSize:14}}>📅</span><span style={{fontSize:13,fontWeight:700,color:"#4cc9ff"}}>Treatment plan sent — awaiting booking confirmation</span></div>}
      {chatCS==="deposit_paid"&&<div style={{padding:"10px 22px",background:"rgba(16,185,129,0.06)",borderBottom:"1px solid rgba(16,185,129,0.15)",display:"flex",alignItems:"center",gap:8,flexShrink:0}}><span style={{fontSize:14}}>💰</span><span style={{fontSize:13,fontWeight:700,color:"#10b981"}}>Deposit received — appointment confirmed</span></div>}
      {chatCS==="waiting_for_clinic_reply"&&<div style={{padding:"10px 22px",background:"rgba(251,191,36,0.06)",borderBottom:"1px solid rgba(251,191,36,0.15)",display:"flex",alignItems:"center",gap:8,flexShrink:0}}><span style={{fontSize:14}}>⏳</span><span style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>Patient is waiting for your reply</span></div>}
      {(chatCS==="resolved"||chatCS==="closed")&&<div style={{padding:"10px 22px",background:"rgba(107,114,128,0.08)",borderBottom:"1px solid rgba(107,114,128,0.15)",display:"flex",alignItems:"center",gap:8,flexShrink:0}}><span>✓</span><span style={{fontSize:13,fontWeight:700,color:"#6b7280"}}>{t("resolved")}</span></div>}
      <div style={{padding:"14px 22px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:12,flexShrink:0}}><div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:14}}>{selChat.name.charAt(0)}</div><div><div style={{fontWeight:700}}>{selChat.name}</div><div style={{fontSize:12,color:"rgba(167,177,195,0.5)"}}>{selChat.from}</div></div><div style={{marginLeft:"auto",display:"flex",gap:8}}>
        {selChat.leadId&&<button onClick={()=>openPatient(selChat.leadId)} style={{padding:"6px 14px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("patient")}</button>}
        {chatCS!=="resolved"&&chatCS!=="closed"&&<>
          <button onClick={()=>markResolved(selChat.id)} style={{padding:"6px 14px",borderRadius:8,background:"rgba(107,114,128,0.12)",border:"1px solid rgba(107,114,128,0.3)",color:"#6b7280",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("resolve")}</button>
          <button onClick={()=>{if(selChat.leadId){setConvStatus(selChat.leadId,"human_takeover");addTL(selChat.leadId,"handover","Manual takeover");showT(t("human_takeover"));}}} style={{padding:"6px 14px",borderRadius:8,background:"rgba(255,138,42,0.12)",border:"1px solid rgba(255,138,42,0.3)",color:"#ff8a2a",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("take_over")}</button>
        </>}
      </div></div>
      <div style={{flex:1,overflowY:"auto",padding:"20px 22px",display:"flex",flexDirection:"column",gap:10}}>{(()=>{const allMsgs=(msgs[activeClinicId]||[]).find(c=>c.id===selChat.id)?.msgs||selChat.msgs;const pageKey=selChat.id;const visibleCount=msgPage[pageKey]||msgPageSize;const startIdx=Math.max(0,allMsgs.length-visibleCount);const visible=allMsgs.slice(startIdx);return<>{startIdx>0&&<button onClick={()=>setMsgPage(p=>({...p,[pageKey]:(p[pageKey]||msgPageSize)+msgPageSize}))} style={{alignSelf:"center",padding:"6px 16px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>↑ Load {Math.min(startIdx,msgPageSize)} older messages</button>}{visible.map((msg,i)=><div key={i} style={{display:"flex",justifyContent:msg.sender==="patient"?"flex-start":msg.sender==="system"?"center":"flex-end"}}>
          {msg.msgType==="payment_card"?(()=>{try{const card=JSON.parse(msg.text);const isPaid=card.status==="paid";return<div style={{maxWidth:"75%",padding:0,borderRadius:16,background:isPaid?"rgba(16,185,129,0.06)":"rgba(76,201,255,0.06)",border:`1.5px solid ${isPaid?"rgba(16,185,129,0.25)":"rgba(76,201,255,0.2)"}`,overflow:"hidden"}}>
            <div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:30,borderRadius:6,background:isPaid?"linear-gradient(135deg,#10b981,#059669)":"linear-gradient(135deg,#00B4D8,#4cc9ff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff",fontWeight:800,boxShadow:isPaid?"0 2px 8px rgba(16,185,129,0.3)":"0 2px 8px rgba(0,180,216,0.3)"}}>💳</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:800,fontSize:18,color:isPaid?"#10b981":"#4cc9ff"}}>€{card.amount}</span>
                  <span style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,background:isPaid?"rgba(16,185,129,0.15)":"rgba(251,191,36,0.12)",color:isPaid?"#10b981":"#fbbf24",letterSpacing:"0.5px"}}>{isPaid?"✅ PAID":"⏳ PENDING"}</span>
                </div>
                <div style={{fontSize:11,color:"rgba(167,177,195,0.5)",marginTop:2}}>Stripe Payment Link · {card.currency||"EUR"} · <span style={{fontFamily:"monospace",fontSize:10,opacity:0.6}}>ID: {card.id?.substring(0,12)||"—"}</span></div>
              </div>
            </div>
            {!isPaid&&selChat?.leadId&&<div style={{padding:"8px 18px 12px",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
              <button onClick={()=>simulatePaymentReceived(selChat.leadId)} style={{width:"100%",padding:"6px 12px",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ Simulate Payment Received</button>
            </div>}
            {isPaid&&<div style={{padding:"6px 18px 10px",borderTop:"1px solid rgba(16,185,129,0.1)",fontSize:11,color:"#10b981",fontWeight:600}}>✓ Paid {card.paidAt?new Date(card.paidAt).toLocaleTimeString("de",{hour:"2-digit",minute:"2-digit"}):""}</div>}
          </div>;}catch{return<div style={{fontSize:12,color:"rgba(167,177,195,0.4)"}}>Payment card</div>;}})()
          :msg.sender==="system"?<div style={{padding:"6px 14px",borderRadius:8,background:"rgba(255,138,42,0.1)",border:"1px solid rgba(255,138,42,0.2)",fontSize:12,color:"#ff8a2a",fontWeight:600}}>{msg.text}</div>:<div style={{maxWidth:"70%",padding:"12px 16px",borderRadius:14,background:msg.sender==="patient"?"rgba(255,255,255,0.06)":msg.sender==="staff"?"rgba(255,138,42,0.1)":"rgba(76,201,255,0.1)",border:`1px solid ${msg.sender==="patient"?"rgba(255,255,255,0.08)":msg.sender==="staff"?"rgba(255,138,42,0.15)":"rgba(76,201,255,0.15)"}`,borderBottomLeftRadius:msg.sender==="patient"?4:14,borderBottomRightRadius:msg.sender!=="patient"?4:14}}><div style={{fontSize:14,lineHeight:1.5}}>{msg.text}</div><div style={{fontSize:11,color:"rgba(167,177,195,0.4)",marginTop:4,textAlign:msg.sender==="patient"?"left":"right"}}>{msg.time}{msg.sender==="bot"&&" 🤖"}{msg.sender==="staff"&&" 👤"}</div></div>}</div>)}</>;})()}
        {/* AI Thinking Animation */}
        {selChat&&getCS(selChat)==="ai_active"&&<div style={{display:"flex",justifyContent:"flex-end"}}><div style={{padding:"12px 18px",borderRadius:14,borderBottomRightRadius:4,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.12)",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:"#4cc9ff",fontWeight:600,marginRight:4}}>🧠 KI analysiert</span><div className="ai-dot"/><div className="ai-dot"/><div className="ai-dot"/></div></div>}
        <div ref={chatEnd}/></div>
      {/* Chat Input */}
      {(()=>{
        const isAiLocked=chatCS==="ai_active"||chatCS==="collecting_photos";
        const isReviewWait=chatCS==="needs_medical_review";
        const isClosed=chatCS==="resolved"||chatCS==="closed";
        if(isClosed)return<div style={{padding:"14px 22px",borderTop:"1px solid rgba(255,255,255,0.06)",textAlign:"center",color:"rgba(167,177,195,0.4)",fontSize:13}}>Conversation {chatCS}. <span onClick={()=>{if(selChat.leadId){setConvStatus(selChat.leadId,"ai_active");showT("Reopened");}}} style={{color:"#4cc9ff",cursor:"pointer",fontWeight:700}}>Reopen</span></div>;
        if(isAiLocked)return<div style={{padding:"14px 22px",borderTop:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderRadius:14,background:"rgba(76,201,255,0.04)",border:"1px solid rgba(76,201,255,0.12)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div className="ai-dot" style={{width:8,height:8}}/>
              <span style={{fontSize:13,color:"rgba(76,201,255,0.7)",fontWeight:600}}>🤖 AI is currently leading the conversation…</span>
            </div>
            <button onClick={()=>{if(selChat.leadId){setConvStatus(selChat.leadId,"human_takeover");addTL(selChat.leadId,"handover","Manual takeover from chat input");showT(t("human_takeover"));}}} style={{padding:"6px 16px",borderRadius:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:"0.5px"}}>Stop AI & Take Over</button>
          </div>
        </div>;
        if(isReviewWait)return<div style={{padding:"14px 22px",borderTop:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderRadius:14,background:"rgba(255,138,42,0.04)",border:"1px solid rgba(255,138,42,0.12)"}}>
            <span style={{fontSize:13,color:"rgba(255,138,42,0.7)",fontWeight:600}}>⚕️ AI paused — complete the Medical Review to continue</span>
            <button onClick={()=>{if(selChat.leadId)openPatient(selChat.leadId);}} style={{padding:"6px 16px",borderRadius:8,background:"rgba(255,138,42,0.1)",border:"1px solid rgba(255,138,42,0.25)",color:"#ff8a2a",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Open Review</button>
          </div>
        </div>;
        return<div style={{padding:"14px 22px",borderTop:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
          {/* Template Picker */}
          {templateModal&&selChat?.leadId&&<div style={{marginBottom:10,borderRadius:14,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(76,201,255,0.12)",maxHeight:240,overflowY:"auto"}}>
            <div style={{padding:"8px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,fontWeight:700,color:"#4cc9ff"}}>📋 Templates</span>
              <div style={{display:"flex",gap:4}}>
                {["all","billing","intake","booking","followup","logistics"].map(cat=><button key={cat} onClick={()=>setTemplateFilter(cat)} style={{padding:"2px 8px",borderRadius:5,fontSize:9,fontWeight:700,background:templateFilter===cat?"rgba(76,201,255,0.12)":"transparent",border:`1px solid ${templateFilter===cat?"rgba(76,201,255,0.2)":"transparent"}`,color:templateFilter===cat?"#4cc9ff":"rgba(167,177,195,0.4)",cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{cat}</button>)}
              </div>
            </div>
            {MSG_TEMPLATES.filter(t=>templateFilter==="all"||t.category===templateFilter).map(tpl=>{const lead=getLeadById(selChat.leadId);const preview=resolveTemplate(tpl,lead);return<div key={tpl.id} onClick={()=>{sendTemplateMsg(selChat.leadId,tpl);setTemplateModal(false);}} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.03)",display:"flex",gap:10,alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(76,201,255,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700}}>{tpl.name} <span style={{fontSize:9,color:"rgba(167,177,195,0.3)",textTransform:"uppercase"}}>{tpl.lang}</span></div><div style={{fontSize:11,color:"rgba(167,177,195,0.5)",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:350}}>{preview}</div></div>
              <span style={{fontSize:10,color:"#4cc9ff",fontWeight:700}}>Send →</span>
            </div>;})}
          </div>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setTemplateModal(!templateModal)} style={{padding:"12px",borderRadius:12,background:templateModal?"rgba(76,201,255,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${templateModal?"rgba(76,201,255,0.25)":"rgba(255,255,255,0.08)"}`,color:templateModal?"#4cc9ff":"rgba(167,177,195,0.5)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}} title="Templates">📋</button>
            <input id="chatMsg" name="chatMsg" value={newMsg} onChange={e=>setNewMsg(e.target.value)} placeholder={t("type_message")} style={{flex:1,padding:"12px 16px",borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none"}} onKeyDown={e=>{if(e.key==="Enter"&&newMsg.trim())sendMessage(selChat.id);}}/>
            <button onClick={()=>sendMessage(selChat.id)} style={{padding:"12px 20px",borderRadius:12,background:"linear-gradient(135deg,#ff8a2a,#ff6b00)",border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("send")}</button>
            {chatCS==="human_takeover"&&<button onClick={()=>{if(selChat.leadId){setConvStatus(selChat.leadId,"ai_active");addTL(selChat.leadId,"system","AI resumed from chat");showT("AI resumed");}}} style={{padding:"12px 16px",borderRadius:12,background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13,whiteSpace:"nowrap"}}>🤖 Resume AI</button>}
          </div>
        </div>;
      })()}
    </>;})()}</div>
  </div>;
}
