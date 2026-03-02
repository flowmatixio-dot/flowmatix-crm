import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Btn, Stat, IC, Field, Section, Toggle } from "../shared/index";
import { timeAgo } from "../../utils/helpers";
import { CONV_STATUS, APPT_C, TL, MSG_TEMPLATES, DRIVER_STATUS } from "../../data/constants";

export default function PatientPanel() {
  const {
    selLead, setSelLead, patientTab, setPatientTab, leads, setLeads, appts,
    clinic, activeClinicId, invoices, magicLinks, msgs, setMsgs,
    reviewGrafts, setReviewGrafts, reviewPrice, setReviewPrice, reviewNotes, setReviewNotes,
    newNote, setNewNote, user, lang,
    getLeadById, getStageById, getClinicById, getLeadScore, getSLA, getAiSuggestions,
    flightAlerts, showT, logAction, addTL, moveLead, setConvStatus, openPatient, openPatientPhotos,
    sendTreatmentPlan, generatePDF, generateMagicLink, generateInvoicePDF, generateStripeLink,
    generateDepositLink, markInvoicePaid, sendPaymentLink, sendTemplateMsg, addInternalNote,
    setInvoiceModal, setInvAmount, setInvItems, setInvVat, setInvDeposit,
    setPayAmount, setPayCurrency, setPaymentModal, simulatePaymentReceived,
    assignDriver, notifyDriver, handleDriverResponse, escalateToBackup, handleBackupDriverResponse,
  } = useApp();
  const [selDriverId, setSelDriverId] = useState("");

  const lead=getLeadById(selLead);if(!lead)return null;const stage=getStageById(lead.stage);const cs=CONV_STATUS[lead.convStatus];
  const needsReview=lead.convStatus==="needs_medical_review";
  const tabs=[{id:"timeline",label:"Timeline"},{id:"invoices",label:"Invoices"},{id:"appointments",label:"Appts"},{id:"photos",label:"Photos"},{id:"notes",label:"Notes"}];
  const leadAppts=appts.filter(a=>a.leadId===lead.id);

  return<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex"}}><div onClick={()=>{setSelLead(null);setPatientTab("timeline");}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}}/>
    <div style={{position:"relative",marginLeft:"auto",width:"min(700px,90vw)",height:"100vh",background:"#131c2e",borderLeft:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",animation:"slI .25s ease",boxShadow:"-4px 0 12px rgba(0,0,0,0.2)"}}><style>{`@keyframes slI{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}`}</style>
      <div style={{padding:"20px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",gap:14}}><div style={{width:48,height:48,borderRadius:14,background:`${stage.color}15`,border:`1px solid ${stage.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:stage.color}}>{lead.name.charAt(0)}</div>
          <div><div style={{fontWeight:800,fontSize:20}}>{lead.name}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.7)",marginTop:2}}>{lead.treatment}</div>
            <div style={{display:"flex",gap:6,marginTop:8}}><span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:`${stage.color}18`,color:stage.color}}>{stage.icon} {stage.label}</span><span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:`${cs.color}18`,color:cs.color}}>{cs.icon} {cs.label}</span>
              {lead.language&&lead.language!=="English"&&lead.language!=="German"&&<span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:"rgba(167,107,255,0.12)",color:"#a78bfa",display:"flex",alignItems:"center",gap:4}}>🌐 {lead.language} <span style={{fontSize:9,opacity:0.7}}>→ auto-translate</span></span>}
              <span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:600,background:"rgba(255,255,255,0.05)",color:"rgba(167,177,195,0.7)"}}>{getClinicById(lead.clinic)?.name}</span></div></div></div>
        <button onClick={()=>{setSelLead(null);setPatientTab("timeline");}} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"rgba(167,177,195,0.7)",width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div>
      {/* ═══ PATIENT JOURNEY PROGRESS BAR ═══ */}
      {(()=>{
        const steps=[
          {id:"inquiry",icon:"✉️",label:"Inquiry",done:true},
          {id:"photos",icon:"📸",label:"Photos",done:lead.photos||lead.photoUrls?.length>0},
          {id:"review",icon:"🩺",label:"Review",done:!!lead.reviewData},
          {id:"deposit",icon:"💰",label:"Deposit",done:invoices.filter(i=>i.leadId===lead.id&&i.status==="paid").length>0||lead.convStatus==="deposit_paid"},
          {id:"flight",icon:"✈️",label:"Flight",done:!!lead.flightConfirmed?.date},
          {id:"booking",icon:"✅",label:"Booked",done:lead.stage==="booked"||lead.stage==="done"},
        ];
        const doneCount=steps.filter(s=>s.done).length;
        const pct=Math.round(doneCount/steps.length*100);
        return<div style={{padding:"12px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Patient Journey</span>
            <span style={{fontSize:11,fontWeight:700,color:pct===100?"#10b981":"#4cc9ff"}}>{pct}%</span>
          </div>
          {/* Progress bar */}
          <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.06)",marginBottom:10,overflow:"hidden"}}>
            <div style={{height:3,borderRadius:2,background:pct===100?"#10b981":"linear-gradient(90deg,#4cc9ff,#00b4d8)",width:`${pct}%`,transition:"width .5s ease"}}/>
          </div>
          {/* Steps */}
          <div style={{display:"flex",justifyContent:"space-between"}}>
            {steps.map((s,i)=><div key={s.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
              <div style={{width:28,height:28,borderRadius:8,background:s.done?"rgba(16,185,129,0.12)":"rgba(255,255,255,0.04)",border:`1.5px solid ${s.done?"rgba(16,185,129,0.4)":"rgba(255,255,255,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,transition:"all .3s"}}>{s.done?<span style={{color:"#10b981"}}>✓</span>:<span style={{opacity:0.4}}>{s.icon}</span>}</div>
              <span style={{fontSize:9,fontWeight:700,color:s.done?"#10b981":"rgba(167,177,195,0.35)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.label}</span>
              {i<steps.length-1&&<div style={{position:"absolute",top:14,left:"calc(100% + 2px)",width:20,height:1.5,background:steps[i+1]?.done?"rgba(16,185,129,0.3)":"rgba(255,255,255,0.06)"}}/>}
            </div>)}
          </div>
        </div>;
      })()}
      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
        {tabs.map(tb=><button key={tb.id} onClick={()=>setPatientTab(tb.id)} style={{flex:1,padding:"12px 0",background:"transparent",border:"none",borderBottom:patientTab===tb.id?`2px solid #4cc9ff`:"2px solid transparent",color:patientTab===tb.id?"#4cc9ff":"rgba(167,177,195,0.5)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{tb.label}</button>)}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
        {/* Medical Review Panel */}
        {needsReview&&patientTab==="timeline"&&<div style={{marginBottom:22,padding:20,borderRadius:16,background:"rgba(255,138,42,0.06)",border:"1px solid rgba(255,138,42,0.2)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:20}}>⚕️</span><div><div style={{fontWeight:800,fontSize:16,color:"#ff8a2a"}}>Treatment Review Required</div><div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginTop:2}}>AI is paused. Evaluate photos and send treatment plan.</div></div></div>
          {/* Review assignment + wait time */}
          <div style={{display:"flex",gap:12,marginBottom:16,alignItems:"center"}}>
            <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",marginBottom:4}}>ASSIGNED TO</div>
              <select id="reviewAssigned" name="reviewAssigned" value={lead.reviewAssignedTo||""} onChange={e=>{setLeads(p=>p.map(x=>x.id===lead.id?{...x,reviewAssignedTo:e.target.value||null}:x));}} style={{width:"100%",padding:"7px 10px",borderRadius:8,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:13,outline:"none",cursor:"pointer"}}>
                <option value="">Unassigned</option>
                {(clinic?.team||[]).filter(m=>m.role==="Doctor"||m.role==="Owner").map(m=><option key={m.name} value={m.name}>{m.name}</option>)}
                <option value="Dr. Yilmaz">Dr. Yilmaz</option>
                <option value="Dr. Kaya">Dr. Kaya</option>
                <option value="Dr. Williams">Dr. Williams</option>
              </select>
            </div>
            {lead.lastAiInteraction&&<div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",marginBottom:4}}>WAITING SINCE</div><div style={{fontSize:13,fontWeight:600,color:"#ff8a2a"}}>{timeAgo(lead.lastAiInteraction)}</div></div>}
          </div>
          {lead.photoUrls.length>0&&<div style={{display:"flex",gap:8,marginBottom:16}}>{lead.photoUrls.map((_,i)=><div key={i} style={{width:72,height:72,borderRadius:10,background:"rgba(167,177,195,0.08)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📷</div>)}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}><Field label="Grafts / Treatment" value={reviewGrafts} onChange={setReviewGrafts} placeholder="e.g. 3000 grafts"/><Field label="Price" value={reviewPrice} onChange={setReviewPrice} placeholder="e.g. €2,800"/></div>
          <Field label="Medical Notes" value={reviewNotes} onChange={setReviewNotes} textarea placeholder="Evaluation notes for the patient..."/>
          <button onClick={()=>sendTreatmentPlan(lead.id)} disabled={!reviewGrafts||!reviewPrice} style={{padding:"12px 24px",borderRadius:12,background:reviewGrafts&&reviewPrice?"linear-gradient(135deg,#ff8a2a,#ff6b00)":"rgba(255,255,255,0.06)",border:"none",color:reviewGrafts&&reviewPrice?"#fff":"rgba(167,177,195,0.4)",fontWeight:700,fontSize:14,cursor:reviewGrafts&&reviewPrice?"pointer":"default",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>⚕️ Send Treatment Plan</button>
        </div>}
        {lead.reviewData&&!needsReview&&patientTab==="timeline"&&<Section title="Treatment Plan" right={<button onClick={()=>generatePDF(lead)} style={{padding:"5px 12px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>📄 PDF</button>}><div style={{padding:16,borderRadius:14,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",display:"grid",gridTemplateColumns:"1fr 1fr 2fr",gap:12,fontSize:14}}><div><span style={{color:"rgba(167,177,195,0.5)",fontSize:12}}>Treatment</span><div style={{fontWeight:700,marginTop:2}}>{lead.reviewData.grafts}</div></div><div><span style={{color:"rgba(167,177,195,0.5)",fontSize:12}}>Price</span><div style={{fontWeight:700,color:"#10b981",marginTop:2}}>{lead.reviewData.price}</div></div><div><span style={{color:"rgba(167,177,195,0.5)",fontSize:12}}>Notes</span><div style={{marginTop:2,color:"rgba(232,238,252,0.7)"}}>{lead.reviewData.notes}</div></div></div></Section>}
        {/* ═══ PATIENT FINANCIALS CARD ═══ */}
        {patientTab==="timeline"&&lead.reviewData&&(()=>{
          const fin=lead.financials||{treatmentPrice:parseInt(lead.reviewData.price?.replace(/[^0-9]/g,"")||0),currency:"EUR",depositAmount:0,depositStatus:"pending",paymentStatus:"pending"};
          const remaining=fin.paymentStatus==="paid"?0:fin.treatmentPrice-(fin.depositAmount||0);
          const psc=fin.paymentStatus==="paid"?"#10b981":fin.paymentStatus==="partial"?"#fbbf24":"rgba(167,177,195,0.5)";
          const leadInvs=invoices.filter(i=>i.leadId===lead.id);
          const latestInv=leadInvs[leadInvs.length-1];
          return<Section title="💰 Financials">
            <div style={{padding:16,borderRadius:14,background:"rgba(16,185,129,0.04)",border:"1px solid rgba(16,185,129,0.12)"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:14}}>
                <div><div style={{fontSize:10,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase"}}>Price</div><div style={{fontSize:18,fontWeight:800,color:"#fff",marginTop:2}}>€{fin.treatmentPrice.toLocaleString()}</div></div>
                <div><div style={{fontSize:10,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase"}}>Deposit</div><div style={{fontSize:18,fontWeight:800,marginTop:2}}>{fin.depositAmount>0?<span style={{color:"#10b981"}}>€{fin.depositAmount.toLocaleString()}</span>:<span style={{color:"rgba(167,177,195,0.3)"}}>—</span>}</div>{fin.depositStatus==="paid"&&<span style={{fontSize:9,fontWeight:700,color:"#10b981"}}>✓ PAID</span>}</div>
                <div><div style={{fontSize:10,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase"}}>Remaining</div><div style={{fontSize:18,fontWeight:800,color:remaining>0?"#fbbf24":"#10b981",marginTop:2}}>€{remaining.toLocaleString()}</div></div>
                <div><div style={{fontSize:10,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase"}}>Status</div><div style={{marginTop:4}}><span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:`${psc}18`,color:psc}}>{fin.paymentStatus==="paid"?"✓ Paid":fin.paymentStatus==="partial"?"◐ Partial":"○ Pending"}</span></div></div>
              </div>
              {latestInv&&<div style={{padding:10,borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:12}}><span style={{fontWeight:700}}>{latestInv.nr}</span><span style={{color:"rgba(167,177,195,0.4)",marginLeft:8}}>€{(latestInv.gross||0).toLocaleString()}</span></div>
                <span style={{padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700,background:latestInv.status==="paid"?"rgba(16,185,129,0.12)":"rgba(251,191,36,0.12)",color:latestInv.status==="paid"?"#10b981":"#fbbf24"}}>{latestInv.status}</span>
              </div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button onClick={()=>{setInvoiceModal(lead.id);setInvAmount(String(fin.treatmentPrice));setInvItems(lead.treatment);setInvVat("8");setInvDeposit("");}} style={{padding:"6px 12px",borderRadius:8,background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.15)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🧾 Create Invoice</button>
                {fin.paymentStatus!=="paid"&&<button onClick={()=>{setLeads(p=>p.map(x=>x.id===lead.id?{...x,financials:{...fin,paymentStatus:"paid",depositStatus:"paid",depositAmount:fin.treatmentPrice}}:x));addTL(lead.id,"finance",`💰 Full payment €${fin.treatmentPrice.toLocaleString()} received`);logAction("payment_received",lead.name,`€${fin.treatmentPrice}`);showT("Marked as paid");}} style={{padding:"6px 12px",borderRadius:8,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ Mark Paid</button>}
                {fin.paymentStatus!=="paid"&&fin.depositStatus!=="paid"&&<button onClick={()=>{const dep=Math.round(fin.treatmentPrice*0.25);setLeads(p=>p.map(x=>x.id===lead.id?{...x,financials:{...fin,depositAmount:dep,depositStatus:"paid",paymentStatus:"partial"}}:x));addTL(lead.id,"finance",`💰 Deposit €${dep.toLocaleString()} received`);logAction("deposit_received",lead.name,`€${dep}`);showT("Deposit recorded");}} style={{padding:"6px 12px",borderRadius:8,background:"rgba(167,107,255,0.08)",border:"1px solid rgba(167,107,255,0.15)",color:"#a78bfa",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>💰 Record Deposit (25%)</button>}
                <button onClick={()=>generatePDF(lead)} style={{padding:"6px 12px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.6)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📄 PDF</button>
              </div>
            </div>
          </Section>;
        })()}

        {patientTab==="timeline"&&<>
          {/* ═══ SMART FOLLOW-UP (48h no reply) ═══ */}
          {lead.treatmentPlanSentAt&&lead.convStatus==="booking_pending"&&(()=>{
            const hrs=Math.round((Date.now()-new Date(lead.treatmentPlanSentAt).getTime())/3600000);
            const overdue=hrs>=48;
            return<div style={{marginBottom:14,padding:14,borderRadius:14,background:overdue?"rgba(251,191,36,0.06)":"rgba(76,201,255,0.04)",border:`1px solid ${overdue?"rgba(251,191,36,0.2)":"rgba(76,201,255,0.1)"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{overdue?"⏰":"🔄"}</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:overdue?"#fbbf24":"#4cc9ff"}}>{overdue?"Follow-Up Required — No reply for "+hrs+"h":"Plan sent "+hrs+"h ago"}</div>
                    <div style={{fontSize:11,color:"rgba(167,177,195,0.5)",marginTop:1}}>{overdue?"Auto-reminder would fire now via n8n":"Auto-follow-up triggers at 48h"}</div>
                  </div>
                </div>
                <button onClick={()=>{
                  const msg=lang==="de"?`Hey ${lead.name}, Dr. ${lead.assigned||"Yilmaz"} hat gefragt, ob du noch Fragen zum Plan hast oder ob wir den Termin für dich reservieren sollen?`:`Hey ${lead.name}, Dr. ${lead.assigned||"Yilmaz"} wanted to check if you have any questions about your treatment plan, or shall we book your appointment?`;
                  setMsgs(prev=>{const cm=[...(prev[activeClinicId]||[])];const idx=cm.findIndex(c=>c.leadId===lead.id);if(idx>-1){cm[idx]={...cm[idx],msgs:[...cm[idx].msgs,{text:`🤖 Smart Follow-Up: "${msg}"`,time:new Date().toLocaleTimeString("de",{hour:"2-digit",minute:"2-digit"}),sender:"bot"}]};}return{...prev,[activeClinicId]:cm};});
                  addTL(lead.id,"bot",`Smart Follow-Up sent: "${msg.substring(0,60)}…"`);
                  logAction("smart_followup",lead.name,"48h follow-up triggered");
                  showT("Follow-up sent to "+lead.name);
                }} style={{padding:"6px 14px",borderRadius:8,background:overdue?"rgba(251,191,36,0.12)":"rgba(76,201,255,0.08)",border:`1px solid ${overdue?"rgba(251,191,36,0.25)":"rgba(76,201,255,0.15)"}`,color:overdue?"#fbbf24":"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{overdue?"🚀 Send Now":"Preview"}</button>
              </div>
            </div>;
          })()}
          {/* Flight & Driver Logistics */}
          {lead.flightConfirmed?.date&&(()=>{
            const isMismatch=!!flightAlerts.find(a=>a.id===lead.id);
            const daysUntil=Math.round((new Date(lead.flightConfirmed.date)-new Date())/(1000*60*60*24));
            const hasFlight=true;const hasHotel=lead.notes?.toLowerCase().includes("hotel");
            const lg=lead.logistics;const ds=lg?DRIVER_STATUS[lg.status]:null;
            const pickupDone=lg&&(lg.status==="confirmed"||lg.status==="backup_confirmed");
            const logisticsSteps=[{done:hasFlight,label:"Flight"},{done:hasHotel,label:"Hotel"},{done:pickupDone,label:"Pickup"},{done:false,label:"Done"}];
            const logPct=Math.round(logisticsSteps.filter(s=>s.done).length/logisticsSteps.length*100);
            const flags={"Saudi Arabia":"🇸🇦","Japan":"🇯🇵","Germany":"🇩🇪","Egypt":"🇪🇬","Spain":"🇪🇸","France":"🇫🇷","Sweden":"🇸🇪","UK":"🇬🇧","Italy":"🇮🇹","Russia":"🇷🇺","UAE":"🇦🇪","Brazil":"🇧🇷","Turkey":"🇹🇷","USA":"🇺🇸"};
            const flag=flags[lead.country]||"🌍";
            const clinicDrivers=(clinic?.drivers||[]).filter(d=>d.active);
            return<div style={{marginBottom:14,padding:0,borderRadius:16,background:isMismatch?"rgba(239,68,68,0.04)":"linear-gradient(135deg,rgba(76,201,255,0.04),rgba(99,102,241,0.03))",border:`1.5px solid ${isMismatch?"rgba(239,68,68,0.2)":"rgba(76,201,255,0.15)"}`,overflow:"hidden"}}>
              {/* Header */}
              <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${isMismatch?"rgba(239,68,68,0.1)":"rgba(76,201,255,0.08)"}`}}>
                <span style={{fontSize:11,fontWeight:700,color:isMismatch?"#ef4444":"#4cc9ff",textTransform:"uppercase",letterSpacing:"0.5px",display:"flex",alignItems:"center",gap:6}}>✈️ {isMismatch?"Flight Mismatch":"Arrival Logistics"}</span>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:"rgba(167,177,195,0.4)"}}>Detected {timeAgo(lead.flightConfirmed.detected)}</span>
                  {!isMismatch&&<span style={{width:6,height:6,borderRadius:99,background:"#10b981",boxShadow:"0 0 6px #10b981",animation:"aiPulse 2s ease infinite"}}/>}
                </div>
              </div>
              {/* Zone 1: Airline + Flag */}
              <div style={{padding:"14px 16px",display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{padding:10,borderRadius:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",fontSize:24,lineHeight:1}}>{flag}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:15}}>{lead.flightConfirmed.airline}</div>
                  <div style={{fontSize:12,color:"rgba(167,177,195,0.5)",fontFamily:"monospace",marginTop:2}}>Arrival: <span style={{color:isMismatch?"#ef4444":"#10b981",fontWeight:700}}>{lead.flightConfirmed.date}</span>{daysUntil>0&&<span style={{marginLeft:6}}>({daysUntil} days)</span>}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:"rgba(167,177,195,0.4)",fontWeight:700}}>APPOINTMENT</div>
                  <div style={{fontSize:13,fontWeight:700,marginTop:2}}>{lead.booking?.date||"Not booked"}</div>
                </div>
              </div>
              {/* Zone 2: Driver Assignment & Status */}
              <div style={{padding:"0 16px 12px"}}>
                {!lg&&clinicDrivers.length>0&&<div style={{padding:12,borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase",marginBottom:8}}>🚗 Assign Driver</div>
                  <div style={{display:"flex",gap:8}}>
                    <select value={selDriverId} onChange={e=>setSelDriverId(e.target.value)} style={{flex:1,padding:"7px 10px",borderRadius:8,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:13,outline:"none",cursor:"pointer"}}>
                      <option value="">Select driver…</option>
                      {clinicDrivers.map(d=><option key={d.id} value={d.id}>{d.name} ({d.role}) — {d.vehicle}</option>)}
                    </select>
                    <button disabled={!selDriverId} onClick={()=>{assignDriver(lead.id,selDriverId);setSelDriverId("");}} style={{padding:"7px 14px",borderRadius:8,background:selDriverId?"rgba(0,180,216,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${selDriverId?"rgba(0,180,216,0.25)":"rgba(255,255,255,0.08)"}`,color:selDriverId?"#00B4D8":"rgba(167,177,195,0.4)",fontWeight:700,fontSize:12,cursor:selDriverId?"pointer":"default",fontFamily:"inherit"}}>Assign</button>
                  </div>
                </div>}
                {!lg&&clinicDrivers.length===0&&<div style={{padding:10,borderRadius:10,background:"rgba(251,191,36,0.04)",border:"1px solid rgba(251,191,36,0.15)",fontSize:12,color:"rgba(251,191,36,0.8)"}}>⚠️ No drivers configured. Add drivers in Settings → Logistics.</div>}
                {lg&&<div style={{padding:12,borderRadius:10,background:`${ds?.color||"#4cc9ff"}08`,border:`1px solid ${ds?.color||"#4cc9ff"}20`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase"}}>🚗 Driver {lg.status==="escalated"||lg.status==="backup_confirmed"||lg.status==="backup_declined"?"(Backup)":"(Primary)"}</div>
                    <span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:`${ds?.color||"#4cc9ff"}18`,color:ds?.color||"#4cc9ff"}}>{ds?.icon} {ds?.label}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:13}}>
                    <div><span style={{color:"rgba(167,177,195,0.5)",fontSize:11}}>Name</span><div style={{fontWeight:700,marginTop:1}}>{lg.status==="escalated"||lg.status==="backup_confirmed"||lg.status==="backup_declined"?lg.backupDriverName:lg.driverName}</div></div>
                    {(()=>{const drvId=lg.status==="escalated"||lg.status==="backup_confirmed"||lg.status==="backup_declined"?lg.backupDriverId:lg.driverId;const drv=(clinic?.drivers||[]).find(d=>d.id===drvId);return drv?<><div><span style={{color:"rgba(167,177,195,0.5)",fontSize:11}}>Vehicle</span><div style={{marginTop:1}}>{drv.vehicle}</div></div><div><span style={{color:"rgba(167,177,195,0.5)",fontSize:11}}>Plate</span><div style={{marginTop:1,fontFamily:"monospace"}}>{drv.plateNo}</div></div><div><span style={{color:"rgba(167,177,195,0.5)",fontSize:11}}>Phone</span><div style={{marginTop:1,fontFamily:"monospace",fontSize:12}}>{drv.phone}</div></div></>:null;})()}
                  </div>
                  {/* Zone 3: Action Buttons */}
                  <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                    {lg.status==="pending"&&<button onClick={()=>notifyDriver(lead.id)} style={{padding:"6px 14px",borderRadius:8,background:"rgba(0,180,216,0.12)",border:"1px solid rgba(0,180,216,0.25)",color:"#00B4D8",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📱 Notify via WhatsApp</button>}
                    {lg.status==="notified"&&<>
                      <span style={{padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:700,color:"#4cc9ff",background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:99,background:"#4cc9ff",animation:"aiPulse 2s ease infinite"}}/>Awaiting response…</span>
                      <button onClick={()=>handleDriverResponse(lead.id,"confirm")} style={{padding:"6px 12px",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ Sim CONFIRM</button>
                      <button onClick={()=>handleDriverResponse(lead.id,"decline")} style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✕ Sim DECLINE</button>
                    </>}
                    {(lg.status==="confirmed"||lg.status==="backup_confirmed")&&<div style={{padding:"6px 14px",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",fontSize:12,fontWeight:700,color:"#10b981",display:"flex",alignItems:"center",gap:6}}>✅ Pickup confirmed</div>}
                    {lg.status==="declined"&&<button onClick={()=>escalateToBackup(lead.id)} style={{padding:"6px 14px",borderRadius:8,background:"rgba(255,138,42,0.12)",border:"1px solid rgba(255,138,42,0.25)",color:"#ff8a2a",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🔄 Escalate to Backup</button>}
                    {lg.status==="escalated"&&<>
                      <span style={{padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:700,color:"#ff8a2a",background:"rgba(255,138,42,0.08)",border:"1px solid rgba(255,138,42,0.15)",display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:99,background:"#ff8a2a",animation:"aiPulse 2s ease infinite"}}/>Backup notified…</span>
                      <button onClick={()=>handleBackupDriverResponse(lead.id,"confirm")} style={{padding:"6px 12px",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ Sim CONFIRM</button>
                      <button onClick={()=>handleBackupDriverResponse(lead.id,"decline")} style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✕ Sim DECLINE</button>
                    </>}
                    {lg.status==="backup_declined"&&<div style={{display:"flex",flexDirection:"column",gap:6,width:"100%"}}>
                      <div style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",fontSize:12,fontWeight:700,color:"#ef4444"}}>❌ Both drivers declined — manual assignment needed</div>
                      <div style={{display:"flex",gap:8}}>
                        <select value={selDriverId} onChange={e=>setSelDriverId(e.target.value)} style={{flex:1,padding:"7px 10px",borderRadius:8,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:12,outline:"none",cursor:"pointer"}}>
                          <option value="">Reassign driver…</option>
                          {clinicDrivers.map(d=><option key={d.id} value={d.id}>{d.name} ({d.role})</option>)}
                        </select>
                        <button disabled={!selDriverId} onClick={()=>{assignDriver(lead.id,selDriverId);setSelDriverId("");}} style={{padding:"6px 12px",borderRadius:8,background:selDriverId?"rgba(0,180,216,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${selDriverId?"rgba(0,180,216,0.25)":"rgba(255,255,255,0.08)"}`,color:selDriverId?"#00B4D8":"rgba(167,177,195,0.4)",fontWeight:700,fontSize:11,cursor:selDriverId?"pointer":"default",fontFamily:"inherit"}}>Assign</button>
                      </div>
                    </div>}
                  </div>
                </div>}
              </div>
              {/* Logistics Progress */}
              {!isMismatch&&<div style={{padding:"0 16px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:10,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase",letterSpacing:"0.5px"}}>VIP Logistics</span>
                  <span style={{fontSize:10,fontWeight:700,color:logPct===100?"#10b981":"#4cc9ff"}}>{logPct}%</span>
                </div>
                <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden",marginBottom:8}}>
                  <div style={{height:4,borderRadius:2,background:logPct===100?"#10b981":"linear-gradient(90deg,#4cc9ff,#6366f1)",width:`${logPct}%`,transition:"width .5s",boxShadow:"0 0 8px rgba(76,201,255,0.3)"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  {logisticsSteps.map((s,i)=><span key={i} style={{fontSize:9,fontWeight:700,color:s.done?"#10b981":"rgba(167,177,195,0.3)"}}>{s.done?"✓":""} {s.label}</span>)}
                </div>
              </div>}
            </div>;
          })()}
          {/* ═══ C1: AI ACTION SUGGESTIONS ═══ */}
          {(()=>{const suggestions=getAiSuggestions(lead);const score=getLeadScore(lead);const sla=getSLA(lead);return<>
            {/* Lead Score + SLA Bar */}
            <div style={{display:"flex",gap:10,marginBottom:14}}>
              <div style={{flex:1,padding:12,borderRadius:12,background:`${score.color}08`,border:`1px solid ${score.color}20`,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{score.icon}</span>
                <div><div style={{fontSize:11,fontWeight:700,color:score.color,textTransform:"uppercase",letterSpacing:"0.5px"}}>{score.label} Lead</div><div style={{fontSize:10,color:"rgba(167,177,195,0.4)",marginTop:1}}>Score: {score.score}%</div></div>
                <div style={{marginLeft:"auto",width:40,height:40,borderRadius:10,background:`${score.color}12`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color:score.color}}>{score.score}</div>
              </div>
              {sla&&<div style={{padding:12,borderRadius:12,background:`${sla.color}08`,border:`1px solid ${sla.color}20`,display:"flex",alignItems:"center",gap:8,minWidth:120}}>
                <span style={{fontSize:14}}>{sla.overdue?"⚠️":"⏱️"}</span>
                <div><div style={{fontSize:11,fontWeight:700,color:sla.color}}>{sla.overdue?"SLA Overdue":"SLA OK"}</div><div style={{fontSize:10,color:"rgba(167,177,195,0.4)",marginTop:1}}>{sla.label}</div></div>
              </div>}
            </div>
            {/* AI Suggestions */}
            {suggestions.length>0&&<div style={{marginBottom:14,padding:14,borderRadius:14,background:"linear-gradient(135deg,rgba(76,201,255,0.03),rgba(99,102,241,0.03))",border:"1px solid rgba(76,201,255,0.12)"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><span style={{fontSize:13}}>🧠</span><span style={{fontSize:11,fontWeight:700,color:"#4cc9ff",textTransform:"uppercase",letterSpacing:"0.5px"}}>AI Suggested Actions</span></div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {suggestions.slice(0,4).map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",cursor:"pointer",transition:"all .15s"}} onClick={s.action} onMouseEnter={e=>{e.currentTarget.style.background="rgba(76,201,255,0.06)";e.currentTarget.style.borderColor="rgba(76,201,255,0.15)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.02)";e.currentTarget.style.borderColor="rgba(255,255,255,0.05)";}}>
                  <span style={{fontSize:16,width:28,textAlign:"center"}}>{s.icon}</span>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{s.label}</div><div style={{fontSize:11,color:"rgba(167,177,195,0.5)"}}>{s.desc}</div></div>
                  <span style={{fontSize:11,color:"#4cc9ff",fontWeight:700,padding:"4px 10px",borderRadius:6,background:"rgba(76,201,255,0.08)",whiteSpace:"nowrap"}}>1-Click →</span>
                </div>)}
              </div>
            </div>}
          </>;})()}
          <Section title="Quick Actions"><div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {lead.stage==="new"&&<Btn color="#fbbf24" icon="◉" label="Mark Contacted" onClick={()=>moveLead(lead.id,"contacted")}/>}
            {lead.stage==="contacted"&&<Btn color="#a78bfa" icon="📅" label="Book" onClick={()=>moveLead(lead.id,"booked")}/>}
            {lead.stage==="booked"&&<Btn color="#10b981" icon="✓" label="Done" onClick={()=>moveLead(lead.id,"done")}/>}
            {lead.convStatus!=="ai_active"&&lead.convStatus!=="closed"&&<Btn color="#10b981" icon="🤖" label="Resume AI" onClick={()=>{setConvStatus(lead.id,"ai_active");addTL(lead.id,"system","Conversation → AI Active");showT("AI resumed");}}/>}
            {lead.convStatus==="ai_active"&&<Btn color="#ef4444" icon="👤" label="Take Over" onClick={()=>{setConvStatus(lead.id,"human_takeover");addTL(lead.id,"handover","Manual takeover");showT("Human takeover");}}/>}
            {/* ═══ PAYMENT BUTTONS (Two-Way) ═══ */}
            {lead.reviewData&&lead.convStatus!=="closed"&&lead.convStatus!=="deposit_paid"&&<>
              <Btn color="#00B4D8" icon="🤖" label="Auto-Send Deposit" onClick={()=>{const price=parseInt(lead.reviewData.price?.replace(/[^0-9]/g,""))||0;const dep=Math.max(Math.round(price*0.25),500);sendPaymentLink(dep,lead.id,"auto");}}/>
              <Btn color="#a78bfa" icon="👤" label="Custom Payment Link" onClick={()=>{const price=parseInt(lead.reviewData.price?.replace(/[^0-9]/g,""))||0;setPayAmount(String(Math.max(Math.round(price*0.25),500)));setPayCurrency("EUR");setPaymentModal({leadId:lead.id});}}/>
            </>}
            {lead.convStatus==="deposit_paid"&&<div style={{padding:"6px 14px",borderRadius:8,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",fontSize:12,fontWeight:700,color:"#10b981",display:"flex",alignItems:"center",gap:6}}>💰 Deposit received</div>}
          </div></Section>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:22}}><IC label="Phone" value={lead.phone}/><IC label="Email" value={lead.email}/><IC label="Country" value={lead.country}/><IC label="Language" value={lead.language}/><IC label="DOB" value={lead.dob}/><IC label="Assigned" value={lead.assigned||"—"} muted={!lead.assigned}/></div>
          {/* ═══ C7: CONSENT & DSGVO ═══ */}
          <div style={{padding:12,borderRadius:12,background:lead.consent?"rgba(16,185,129,0.04)":"rgba(251,191,36,0.04)",border:`1px solid ${lead.consent?"rgba(16,185,129,0.15)":"rgba(251,191,36,0.15)"}`,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14}}>{lead.consent?"✅":"⚠️"}</span>
              <div><div style={{fontSize:12,fontWeight:700,color:lead.consent?"#10b981":"#fbbf24"}}>{lead.consent?"DSGVO Consent Granted":"No Consent Recorded"}</div>
                {lead.consent&&<div style={{fontSize:10,color:"rgba(167,177,195,0.4)",marginTop:1}}>{lead.consent.method} · {new Date(lead.consent.timestamp).toLocaleDateString()}</div>}
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              {!lead.consent&&<button onClick={()=>{setLeads(p=>p.map(x=>x.id===lead.id?{...x,consent:{granted:true,timestamp:new Date().toISOString(),method:"verbal"}}:x));addTL(lead.id,"system","DSGVO consent recorded (verbal)");logAction("consent_granted",lead.name,"Verbal consent");showT("Consent recorded");}} style={{padding:"4px 10px",borderRadius:6,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ Verbal</button>}
              {!lead.consent&&<button onClick={()=>{setLeads(p=>p.map(x=>x.id===lead.id?{...x,consent:{granted:true,timestamp:new Date().toISOString(),method:"written"}}:x));addTL(lead.id,"system","DSGVO consent recorded (written)");logAction("consent_granted",lead.name,"Written consent");showT("Consent recorded");}} style={{padding:"4px 10px",borderRadius:6,background:"rgba(76,201,255,0.1)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📋 Written</button>}
              {lead.consent&&<button onClick={()=>{const data=JSON.stringify(lead,null,2);const blob=new Blob([data],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`patient_data_${lead.name.replace(/\s/g,"_")}.json`;a.click();URL.revokeObjectURL(url);logAction("data_export",lead.name,"Patient data exported (DSGVO)");showT("Patient data exported");}} style={{padding:"4px 10px",borderRadius:6,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.5)",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📥 Export</button>}
            </div>
          </div>
          {lead.booking&&<Section title="Booking"><div style={{padding:16,borderRadius:14,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:13}}><div><span style={{color:"rgba(167,177,195,0.5)"}}>Date:</span> <span style={{fontWeight:700,color:"#10b981"}}>{lead.booking.date}</span></div><div><span style={{color:"rgba(167,177,195,0.5)"}}>Time:</span> <span style={{fontWeight:700}}>{lead.booking.time}</span></div></div></Section>}
          {lead.notes&&<Section title="Notes"><div style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",fontSize:14}}>{lead.notes}</div></Section>}
          <Section title="Activity Timeline"><div style={{position:"relative",paddingLeft:28}}><div style={{position:"absolute",left:9,top:4,bottom:4,width:2,background:"rgba(255,255,255,0.06)"}}/>
            {lead.timeline.map((ev,i)=>{const m=TL[ev.type]||TL.system;return<div key={i} style={{display:"flex",gap:14,marginBottom:12,position:"relative"}}><div style={{position:"absolute",left:-23,top:2,width:20,height:20,borderRadius:6,background:`${m.c}15`,border:`1.5px solid ${m.c}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>{m.i}</div><div><div style={{display:"flex",gap:8,marginBottom:2}}><span style={{fontSize:11,fontWeight:700,color:m.c}}>{m.l}</span><span style={{fontSize:11,color:"rgba(167,177,195,0.35)"}}>{ev.time}</span></div><div style={{fontSize:13,color:"rgba(232,238,252,0.75)"}}>{ev.text}</div></div></div>;})}
          </div></Section>
        </>}

        {/* APPOINTMENTS TAB */}
        {patientTab==="appointments"&&<div>
          {leadAppts.length===0&&<div style={{textAlign:"center",padding:40,color:"rgba(167,177,195,0.4)"}}>No appointments yet.</div>}
          {leadAppts.map(a=>{const ac=APPT_C[a.status]||APPT_C.booked;return<div key={a.id} style={{padding:16,borderRadius:14,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:700,fontSize:15}}>{a.treatment}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginTop:4}}>{a.date} · {a.time}–{a.endTime} · {a.assigned}</div></div>
            <span style={{padding:"4px 12px",borderRadius:8,fontSize:12,fontWeight:700,background:`${ac.c}18`,color:ac.c}}>{ac.l}</span>
          </div>;})}
          {lead.booking&&!leadAppts.length&&<div style={{padding:16,borderRadius:14,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",fontSize:14}}>Booking: <strong style={{color:"#10b981"}}>{lead.booking.date}</strong> at {lead.booking.time} — {lead.booking.type}</div>}
        </div>}

        {/* INVOICES TAB */}
        {patientTab==="invoices"&&<div>
          {/* Create Invoice Button */}
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <button onClick={()=>{setInvoiceModal(lead.id);setInvAmount(lead.reviewData?.price?.replace(/[^0-9]/g,"")||"");setInvItems(lead.treatment);setInvVat("19");setInvDeposit("");}} style={{padding:"10px 18px",borderRadius:10,background:"linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.08))",border:"1px solid rgba(16,185,129,0.25)",color:"#10b981",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>🧾 Create Invoice</button>
            {lead.reviewData&&<button onClick={()=>{const amt=parseInt(lead.reviewData.price?.replace(/[^0-9]/g,""))||0;if(amt>0){const dep=Math.round(amt*0.25);generateDepositLink(lead.id,dep);}else showT("No price set");}} style={{padding:"10px 18px",borderRadius:10,background:"rgba(167,107,255,0.08)",border:"1px solid rgba(167,107,255,0.2)",color:"#a78bfa",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>💳 25% Deposit Link</button>}
          </div>

          {/* Invoice List */}
          {(()=>{const li=invoices.filter(i=>i.leadId===lead.id);
            if(li.length===0)return<div style={{textAlign:"center",padding:30,color:"rgba(167,177,195,0.4)"}}>
              <div style={{fontSize:32,marginBottom:8}}>🧾</div>
              <div style={{fontWeight:600,marginBottom:4}}>No invoices yet</div>
              <div style={{fontSize:13}}>Create an invoice after the treatment plan is approved</div>
            </div>;
            return<div>{li.map(inv=>{
              const isPaid=inv.status==="paid";
              return<div key={inv.id} style={{padding:16,borderRadius:14,background:isPaid?"rgba(16,185,129,0.04)":"rgba(255,255,255,0.03)",border:`1px solid ${isPaid?"rgba(16,185,129,0.15)":"rgba(255,255,255,0.08)"}`,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8}}>
                      {inv.nr}
                      <span style={{padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:isPaid?"rgba(16,185,129,0.12)":"rgba(251,191,36,0.12)",color:isPaid?"#10b981":"#fbbf24"}}>{isPaid?"PAID":"UNPAID"}</span>
                    </div>
                    <div style={{fontSize:12,color:"rgba(167,177,195,0.5)",marginTop:2}}>Created {new Date(inv.created).toLocaleDateString()} · Due {inv.dueDate}</div>
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:isPaid?"#10b981":"rgba(232,238,252,0.9)"}}>€{inv.gross?.toLocaleString()}</div>
                </div>
                {/* Breakdown */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10,padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.02)"}}>
                  <div><div style={{fontSize:10,color:"rgba(167,177,195,0.4)",fontWeight:700}}>NET</div><div style={{fontSize:13,fontWeight:600}}>€{inv.net?.toLocaleString()}</div></div>
                  <div><div style={{fontSize:10,color:"rgba(167,177,195,0.4)",fontWeight:700}}>VAT {inv.vatPct}%</div><div style={{fontSize:13,fontWeight:600}}>€{inv.vatAmount?.toLocaleString()}</div></div>
                  <div><div style={{fontSize:10,color:"rgba(167,177,195,0.4)",fontWeight:700}}>GROSS</div><div style={{fontSize:13,fontWeight:700,color:"#10b981"}}>€{inv.gross?.toLocaleString()}</div></div>
                </div>
                {/* Actions */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <button onClick={()=>generateInvoicePDF(inv)} style={{padding:"5px 12px",borderRadius:7,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📄 PDF</button>
                  {!isPaid&&<button onClick={()=>generateStripeLink(inv)} style={{padding:"5px 12px",borderRadius:7,background:"rgba(167,107,255,0.08)",border:"1px solid rgba(167,107,255,0.15)",color:"#a78bfa",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>💳 Stripe Link</button>}
                  {!isPaid&&<button onClick={()=>markInvoicePaid(inv.id,"cash")} style={{padding:"5px 12px",borderRadius:7,background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.15)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ Mark Paid (Cash)</button>}
                  {!isPaid&&<button onClick={()=>markInvoicePaid(inv.id,"card")} style={{padding:"5px 12px",borderRadius:7,background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.15)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ Mark Paid (Card)</button>}
                  {inv.stripeLink&&<div style={{fontSize:11,color:"rgba(167,177,195,0.4)",display:"flex",alignItems:"center",gap:4}}>🔗 <button onClick={()=>{navigator.clipboard?.writeText(inv.stripeLink);showT("Link copied");}} style={{background:"none",border:"none",color:"#a78bfa",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Copy payment link</button></div>}
                </div>
                {isPaid&&<div style={{marginTop:8,fontSize:12,color:"#10b981",fontWeight:600}}>✓ Paid {inv.paidDate?new Date(inv.paidDate).toLocaleDateString():""} via {inv.paidMethod}</div>}
              </div>;
            })}</div>;
          })()}
        </div>}

        {/* PHOTOS TAB */}
        {patientTab==="photos"&&<div>
          {/* Magic Link Upload Button */}
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <button onClick={()=>generateMagicLink(lead.id)} style={{padding:"10px 18px",borderRadius:10,background:"linear-gradient(135deg,rgba(76,201,255,0.15),rgba(45,168,255,0.1))",border:"1px solid rgba(76,201,255,0.25)",color:"#4cc9ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>🔗 Generate Photo Upload Link</button>
            {magicLinks[lead.id]&&<div style={{flex:1,padding:"8px 12px",borderRadius:10,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",fontSize:12,display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:"#10b981",fontWeight:700}}>✓ Link active</span>
              <span style={{color:"rgba(167,177,195,0.4)",fontSize:11}}>{magicLinks[lead.id].status}</span>
              <button onClick={()=>{navigator.clipboard?.writeText(magicLinks[lead.id].link);showT("Copied!");}} style={{marginLeft:"auto",padding:"3px 10px",borderRadius:6,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Copy</button>
            </div>}
          </div>
          {/* Photo upload frame guide */}
          {lead.photoUrls.length===0&&<div style={{textAlign:"center",padding:30,color:"rgba(167,177,195,0.4)"}}>
            <div style={{fontSize:32,marginBottom:8}}>📸</div>
            <div style={{fontWeight:600,marginBottom:4}}>No photos yet</div>
            <div style={{fontSize:13}}>Send a Magic Link to the patient for guided photo upload</div>
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {["Front","Left Side","Right Side","Top/Back"].map((angle,i)=>{
              const photo=lead.photoUrls[i];
              return<div key={i} onClick={()=>{if(photo)openPatientPhotos(lead.id);}} style={{aspectRatio:"0.75",borderRadius:14,background:photo?"rgba(167,177,195,0.06)":"rgba(255,255,255,0.02)",border:`2px dashed ${photo?"rgba(76,201,255,0.25)":"rgba(255,255,255,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6,cursor:photo?"pointer":"default"}}>
                <span style={{fontSize:28}}>{photo?"📷":"⬜"}</span>
                <span style={{fontSize:10,color:photo?"rgba(76,201,255,0.6)":"rgba(167,177,195,0.3)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{angle}</span>
                {photo&&<span style={{fontSize:10,color:"rgba(167,177,195,0.4)"}}>{photo}</span>}
              </div>;
            })}
          </div>
        </div>}

        {/* NOTES TAB */}
        {patientTab==="notes"&&<div>
          <div style={{marginBottom:16}}>
            <textarea id="newNote" name="newNote" value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Add internal note…" rows={3} style={{width:"100%",padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box",resize:"vertical"}}/>
            <button onClick={()=>addInternalNote(lead.id)} disabled={!newNote.trim()} style={{marginTop:8,padding:"8px 18px",borderRadius:10,background:newNote.trim()?"rgba(76,201,255,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${newNote.trim()?"rgba(76,201,255,0.25)":"rgba(255,255,255,0.08)"}`,color:newNote.trim()?"#4cc9ff":"rgba(167,177,195,0.4)",fontWeight:700,fontSize:13,cursor:newNote.trim()?"pointer":"default",fontFamily:"inherit"}}>Add Note</button>
          </div>
          {(lead.internalNotes||[]).length===0&&<div style={{textAlign:"center",padding:30,color:"rgba(167,177,195,0.4)"}}>No internal notes yet.</div>}
          {(lead.internalNotes||[]).slice().reverse().map((n,i)=><div key={i} style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",marginBottom:8}}>
            <div style={{fontSize:14,lineHeight:1.5,marginBottom:6}}>{n.text}</div>
            <div style={{fontSize:11,color:"rgba(167,177,195,0.4)"}}>by <span style={{fontWeight:600,color:"rgba(167,177,195,0.6)"}}>{n.author}</span> · {timeAgo(n.time)}</div>
          </div>)}
        </div>}
      </div>
    </div>
  </div>;
}
