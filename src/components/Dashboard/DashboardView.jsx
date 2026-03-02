import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Btn, Stat, Section, MiniBarChart, HBar } from "../shared/index";
import { PLAN_C, PLAN_PRICE, APPT_C, NOTIF_ICONS } from "../../data/constants";
import { LEAD_CHART } from "../../data/demoData";
import { timeAgo } from "../../utils/helpers";
import SetupGuide from "../SetupGuide/SetupGuide";

export default function DashboardView() {
  const {
    clinic, clinics, isAdmin, activeClinicId, myLeads, myAppts, myNotifs, myAutomations,
    allClinicMsgs, msgs, invoices, actionCounts, totalActions,
    needsOnboarding, onboardingSteps, flightAlerts, flightMatches,
    usageMetrics, todayMetrics,
    dismissedUsageWarnings, setDismissedUsageWarnings,
    dismissedRevSuggestion, setDismissedRevSuggestion,
    setView, setOnboardingDismissed, setSelAppt, setLeads,
    openPatient, showT, logAction, getCS, SystemStatus, t,
  } = useApp();

  const [autoLimitDismissed] = useState(()=>localStorage.getItem("fm_auto_limit_dismissed")==="true");

  if (!clinic) return null;

  const warningMetrics = usageMetrics?.metrics?.filter(m=>m.isWarning && !dismissedUsageWarnings[m.key]) || [];
  const showUsageWarning = warningMetrics.length > 0;
  const isUrgent = warningMetrics.some(m=>m.isUrgent);

  return <div style={{padding:"28px 32px"}}>
    <div style={{marginBottom:28}}><h1 style={{fontSize:26,fontWeight:800,margin:0,letterSpacing:"-0.02em"}}>{t("welcome_back")} 👋</h1><p style={{fontSize:15,color:"rgba(167,177,195,0.6)",margin:"8px 0 0"}}>{t("your_wa")}</p></div>
    {/* Onboarding Gate */}
    {needsOnboarding&&<div style={{padding:20,borderRadius:16,background:"#162032",border:"1px solid rgba(76,201,255,0.1)",marginBottom:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontWeight:800,fontSize:16,color:"#4cc9ff"}}>🚀 {t("onboarding")}</div><button onClick={()=>{setOnboardingDismissed(true);localStorage.setItem("fm_ob_dismissed","true");}} style={{padding:"4px 12px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.5)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t("ob_skip")}</button></div>
      <div style={{display:"flex",gap:12}}>{onboardingSteps.map((s,i)=><div key={i} onClick={()=>setView(s.key==="clinic"?"settings":s.key==="wa"?"settings":"ai_control")} style={{flex:1,padding:14,borderRadius:12,background:s.done?"rgba(16,185,129,0.06)":"rgba(255,255,255,0.03)",border:`1px solid ${s.done?"rgba(16,185,129,0.2)":"rgba(255,255,255,0.08)"}`,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:20,marginBottom:6}}>{s.done?"✅":"⬜"}</div><div style={{fontSize:13,fontWeight:600,color:s.done?"#10b981":"rgba(232,238,252,0.7)"}}>{s.label}</div></div>)}</div>
    </div>}
    {/* System Status */}
    <div style={{marginBottom:20}}><SystemStatus/></div>
    <div style={{display:"flex",gap:12,marginBottom:28}}>
      <div style={{padding:"12px 20px",borderRadius:12,background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",display:"flex",alignItems:"center",gap:10}}><div style={{width:10,height:10,borderRadius:99,background:"#10b981",boxShadow:"0 0 4px #10b981"}}/><span style={{fontWeight:700,color:"#10b981",fontSize:14}}>Bot Active</span></div>
      <div style={{padding:"12px 20px",borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",fontSize:13,color:"rgba(167,177,195,0.6)"}}>Plan: <span style={{fontWeight:700,color:PLAN_C[clinic.plan]}}>{clinic.plan.toUpperCase()}</span></div>
    </div>
    {/* Today at your clinic */}
    {todayMetrics&&<div style={{marginBottom:22}}>
      <div style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.5)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>📋 Today at your clinic</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>
        <Stat label="New Patients" value={todayMetrics.newPatientsToday} color="#4cc9ff" sub="today"/>
        <Stat label="AI Conversations" value={todayMetrics.aiConvsToday} color="#a78bfa" sub="active"/>
        <Stat label="Appointments" value={todayMetrics.apptsToday} color="#10b981" sub="confirmed"/>
        <Stat label="Arrivals" value={todayMetrics.arrivalsToday} color="#ff8a2a" sub="flights today"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:12}}>
        <Stat label="Driver Pickups" value={todayMetrics.driverPickupsToday} color="#00B4D8" sub="confirmed"/>
        <Stat label="Payments" value={todayMetrics.paymentsToday} color="#10b981" sub={todayMetrics.paymentAmountToday>0?`€${todayMetrics.paymentAmountToday.toLocaleString()}`:"today"}/>
        <Stat label="Automations" value={todayMetrics.automationsToday} color="#fbbf24" sub="ran today"/>
      </div>
      <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",borderRadius:8,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)"}}>
        <div style={{width:7,height:7,borderRadius:99,background:"#10b981",boxShadow:"0 0 4px #10b981"}}/><span style={{fontSize:12,fontWeight:600,color:"#10b981"}}>All systems operational</span>
      </div>
    </div>}
    {/* Usage Warning */}
    {showUsageWarning&&<div style={{padding:18,borderRadius:16,background:isUrgent?"rgba(239,68,68,0.04)":"rgba(251,191,36,0.04)",border:`1px solid ${isUrgent?"rgba(239,68,68,0.2)":"rgba(251,191,36,0.2)"}`,marginBottom:22}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>{isUrgent?"🚨":"⚠️"}</span>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:isUrgent?"#ef4444":"#fbbf24"}}>{isUrgent?"Plan limit almost reached":"Approaching plan limits"}</div>
            <div style={{fontSize:12,color:"rgba(167,177,195,0.5)",marginTop:2}}>Some resources are above 80% of your {clinic.plan} plan</div>
          </div>
        </div>
        <button onClick={()=>{const d={...dismissedUsageWarnings};warningMetrics.forEach(m=>{d[m.key]=true;});setDismissedUsageWarnings(d);}} style={{padding:"4px 12px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.5)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Dismiss</button>
      </div>
      {warningMetrics.map(m=><div key={m.key} style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <span style={{fontSize:13,fontWeight:600,color:"rgba(232,238,252,0.8)"}}>{m.icon} {m.label}</span>
          <span style={{fontSize:12,fontWeight:700,color:m.isUrgent?"#ef4444":"#fbbf24"}}>{m.value} / {m.limit}</span>
        </div>
        <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.06)"}}>
          <div style={{height:6,borderRadius:3,background:m.isUrgent?"#ef4444":"#fbbf24",width:`${Math.min(m.pct,100)}%`,transition:"width .5s ease"}}/>
        </div>
      </div>)}
      {usageMetrics?.suggestedPlan&&<button onClick={()=>setView("billing")} style={{marginTop:8,padding:"8px 18px",borderRadius:10,background:isUrgent?"rgba(239,68,68,0.12)":"rgba(251,191,36,0.12)",border:`1px solid ${isUrgent?"rgba(239,68,68,0.25)":"rgba(251,191,36,0.25)"}`,color:isUrgent?"#ef4444":"#fbbf24",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Upgrade to {usageMetrics.suggestedPlan.charAt(0).toUpperCase()+usageMetrics.suggestedPlan.slice(1)} →</button>}
    </div>}
    {/* Setup Guide */}
    <SetupGuide/>
    {/* What happens next */}
    {myLeads.length<=2&&<div style={{padding:20,borderRadius:14,background:"#162032",border:"1px solid rgba(255,255,255,0.06)",marginBottom:22}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{fontSize:18}}>🎯</span>
        <div><div style={{fontWeight:800,fontSize:16}}>Your clinic is ready. Next: run a test patient.</div><div style={{fontSize:13,color:"rgba(167,177,195,0.5)",marginTop:2}}>See how your AI assistant handles a real patient inquiry from start to finish.</div></div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>{showT("Test simulation started — check inbox in 10s");}} style={{padding:"10px 18px",borderRadius:12,background:"linear-gradient(135deg,#00B4D8,#0096c7)",border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(0,180,216,0.15)"}}>See the patient experience live →</button>
        <button onClick={()=>setView("settings")} style={{padding:"10px 18px",borderRadius:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.6)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Open settings</button>
      </div>
    </div>}
    {/* Proof of Life */}
    {myLeads.length<=2&&<div style={{padding:16,borderRadius:14,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",marginBottom:22}}>
      <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>📡 System Activity</div>
      {[
        {icon:"✅",text:"Clinic created",time:clinic.onboarded,color:"#10b981"},
        {icon:"📋",text:"Onboarding details received",time:clinic.onboarded,color:"#4cc9ff"},
        {icon:"📱",text:"WhatsApp connected",time:clinic.setupStatus==="live"?clinic.onboarded:null,color:"#10b981"},
        {icon:"🤖",text:"AI assistant activated",time:clinic.setupStatus==="live"?clinic.onboarded:null,color:"#10b981"},
        {icon:"🔔",text:`Last login: ${clinic.lastLogin?new Date(clinic.lastLogin).toLocaleDateString():"—"}`,time:clinic.lastLogin,color:"rgba(167,177,195,0.5)"},
      ].filter(e=>e.time).map((e,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderBottom:i<4?"1px solid rgba(255,255,255,0.03)":"none"}}>
        <span style={{fontSize:13}}>{e.icon}</span>
        <span style={{fontSize:13,color:e.color,flex:1}}>{e.text}</span>
        <span style={{fontSize:11,color:"rgba(167,177,195,0.3)"}}>{e.time?new Date(e.time).toLocaleDateString():""}</span>
      </div>)}
    </div>}
    {totalActions>0&&<Section title={`⚡ ${t("action_today")}`}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <Stat label={t("medical_review")} value={actionCounts.needs_medical_review} color="#ff8a2a" sub="photos ready" onClick={()=>setView("pipeline")}/>
        <Stat label={t("waiting_reply")} value={actionCounts.waiting_for_clinic_reply} color="#fbbf24" sub="patient asked" onClick={()=>setView("inbox")}/>
        <Stat label={t("booking_pending")} value={actionCounts.booking_pending} color="#4cc9ff" sub="plan sent" onClick={()=>setView("pipeline")}/>
        <Stat label={t("human_takeover")} value={actionCounts.human_takeover} color="#ef4444" sub="AI paused" onClick={()=>setView("inbox")}/>
      </div>
    </Section>}
    {/* Operations CTA */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:22}}>
      {[
        {icon:"⚕️",label:"Review Patients",desc:`${actionCounts.needs_medical_review} waiting`,color:"#ff8a2a",view:"pipeline",show:actionCounts.needs_medical_review>0},
        {icon:"💬",label:"Open Inbox",desc:`${actionCounts.waiting_for_clinic_reply+actionCounts.human_takeover} need reply`,color:"#4cc9ff",view:"inbox",show:true},
        {icon:"📅",label:"View Bookings",desc:`${myAppts.filter(a=>a.status==="booked").length} upcoming`,color:"#a78bfa",view:"appointments",show:true},
      ].filter(c=>c.show).map((c,i)=><button key={i} onClick={()=>setView(c.view)} style={{padding:18,borderRadius:16,background:`${c.color}06`,border:`1.5px solid ${c.color}20`,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=`${c.color}50`;e.currentTarget.style.background=`${c.color}10`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=`${c.color}20`;e.currentTarget.style.background=`${c.color}06`;}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:22}}>{c.icon}</span><span style={{fontWeight:800,fontSize:15,color:c.color}}>{c.label}</span></div>
        <div style={{fontSize:12,color:"rgba(167,177,195,0.5)"}}>{c.desc}</div>
        <div style={{marginTop:10,fontSize:11,fontWeight:700,color:c.color}}>Go → </div>
      </button>)}
    </div>
    {/* AI Handled */}
    {(()=>{const aiChats=(msgs[activeClinicId]||[]).filter(m=>{const cs=getCS(m);return cs==="ai_active"||cs==="collecting_photos";}).length;return aiChats>0?<div style={{padding:14,borderRadius:14,background:"rgba(16,185,129,0.04)",border:"1px solid rgba(16,185,129,0.1)",marginBottom:22,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:20}}>✅</span>
      <div><span style={{fontWeight:700,color:"#10b981"}}>{aiChats} conversations</span><span style={{color:"rgba(167,177,195,0.5)"}}> handled automatically by AI right now</span></div>
    </div>:null;})()}
    {/* Flight Mismatch Alerts */}
    {flightAlerts.length>0&&<Section title="🚨 Flight Date Mismatch" right={<span style={{padding:"3px 10px",borderRadius:8,fontSize:12,fontWeight:700,background:"rgba(239,68,68,0.12)",color:"#ef4444"}}>{flightAlerts.length} alert{flightAlerts.length>1?"s":""}</span>}>
      {flightAlerts.map(l=><div key={l.id} onClick={()=>openPatient(l.id)} style={{padding:"14px 18px",borderRadius:14,background:l.severity==="critical"?"rgba(239,68,68,0.06)":"rgba(251,191,36,0.06)",border:`1px solid ${l.severity==="critical"?"rgba(239,68,68,0.2)":"rgba(251,191,36,0.2)"}`,marginBottom:8,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=l.severity==="critical"?"rgba(239,68,68,0.4)":"rgba(251,191,36,0.4)"} onMouseLeave={e=>e.currentTarget.style.borderColor=l.severity==="critical"?"rgba(239,68,68,0.2)":"rgba(251,191,36,0.2)"}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>{l.severity==="critical"?"🚨":"⚠️"}</span>
            <div><div style={{fontWeight:700,fontSize:14}}>{l.name}</div><div style={{fontSize:12,color:"rgba(167,177,195,0.6)",marginTop:1}}>{l.treatment} · {l.flightConfirmed?.airline||"Unknown airline"}</div></div>
          </div>
          <span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:l.severity==="critical"?"rgba(239,68,68,0.15)":"rgba(251,191,36,0.15)",color:l.severity==="critical"?"#ef4444":"#fbbf24"}}>{l.alertType==="arrives_after"?"ARRIVES AFTER OP":"TOO EARLY"}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.03)"}}>
          <div><div style={{fontSize:10,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase"}}>Flight Date</div><div style={{fontSize:14,fontWeight:700,color:l.severity==="critical"?"#ef4444":"#fbbf24",marginTop:2}}>{l.flightConfirmed?.date}</div></div>
          <div><div style={{fontSize:10,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase"}}>Appointment</div><div style={{fontSize:14,fontWeight:700,marginTop:2}}>{l.booking?.date}</div></div>
          <div><div style={{fontSize:10,fontWeight:700,color:"rgba(167,177,195,0.4)",textTransform:"uppercase"}}>Difference</div><div style={{fontSize:14,fontWeight:700,color:l.severity==="critical"?"#ef4444":"#fbbf24",marginTop:2}}>{l.flightDiff<0?`${Math.abs(l.flightDiff)}d LATE`:`${l.flightDiff}d early`}</div></div>
        </div>
        <div style={{marginTop:8,display:"flex",gap:6}}>
          <button onClick={e=>{e.stopPropagation();setView("appointments");showT(`Reschedule ${l.name} to match flight`);}} style={{padding:"5px 12px",borderRadius:7,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📅 Reschedule</button>
          <button onClick={e=>{e.stopPropagation();showT(`WhatsApp sent to ${l.name} about flight mismatch`);logAction("flight_alert_contact",l.name,`Mismatch: flight ${l.flightConfirmed?.date} vs appt ${l.booking?.date}`);}} style={{padding:"5px 12px",borderRadius:7,background:"rgba(255,138,42,0.08)",border:"1px solid rgba(255,138,42,0.15)",color:"#ff8a2a",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>💬 Contact Patient</button>
          <button onClick={e=>{e.stopPropagation();setLeads(p=>p.map(x=>x.id===l.id?{...x,flightConfirmed:{...x.flightConfirmed,dismissed:true}}:x));showT("Alert dismissed");}} style={{padding:"5px 12px",borderRadius:7,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.5)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✕ Dismiss</button>
        </div>
      </div>)}
      <div style={{padding:10,borderRadius:8,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",fontSize:11,color:"rgba(167,177,195,0.4)"}}>
        🔗 <strong>n8n Webhook:</strong> Vision AI detects flight ticket → compares date with appointment → triggers this alert if mismatch &gt;0 days late or &gt;3 days early. Auto-WhatsApp can be enabled in Automations.
      </div>
    </Section>}
    {/* Flight Status */}
    {(flightMatches.length>0||flightAlerts.length>0)&&<Section title="✈️ Flight Status" right={<span style={{fontSize:12,color:"rgba(167,177,195,0.4)"}}>{flightMatches.length+flightAlerts.length} tracked</span>}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        <Stat label="Flights Detected" value={flightMatches.length+flightAlerts.length} color="#4cc9ff" sub="via Vision AI"/>
        <Stat label="Matching" value={flightMatches.length} color="#10b981" sub="date OK"/>
        <Stat label="Mismatch" value={flightAlerts.length} color="#ef4444" sub="needs action"/>
      </div>
    </Section>}
    {/* KPIs */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:14}}><Stat label={t("leads_month")} value={clinic.stats.leadsMonth} color="#4cc9ff"/><Stat label={t("bookings")} value={clinic.stats.bookingsMonth} color="#a78bfa"/><Stat label={t("conversion")} value={`${clinic.stats.convRate}%`} color="#fbbf24"/></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:28}}><Stat label="AI handled" value={`${clinic.stats.aiHandled}%`} color="#10b981"/><Stat label="Active Conversations" value={clinic.stats.activeConvs} color="#4cc9ff"/><Stat label="Avg Response" value={clinic.stats.avgResponse} sub="first reply"/></div>
    {/* Revenue Overview */}
    {(()=>{
      const confirmedRev=invoices.filter(inv=>inv.status==="paid"&&(inv.clinicId===activeClinicId||!inv.clinicId)).reduce((s,inv)=>s+(inv.gross||0),0);
      const pipelineLeads=myLeads.filter(l=>(l.convStatus==="booking_pending"||l.convStatus==="deposit_paid")&&l.reviewData?.price);
      const pipelineRev=pipelineLeads.reduce((s,l)=>s+parseInt(l.reviewData.price.replace(/[^0-9]/g,"")||0),0);
      const allPotential=myLeads.filter(l=>l.reviewData?.price).reduce((s,l)=>s+parseInt(l.reviewData.price.replace(/[^0-9]/g,"")||0),0);
      return<div style={{marginBottom:22}}>
        <div style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.5)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>💰 Revenue Overview</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          <div style={{padding:18,borderRadius:16,background:"rgba(16,185,129,0.04)",border:"1px solid rgba(16,185,129,0.15)"}}><div style={{fontSize:10,fontWeight:700,color:"rgba(16,185,129,0.6)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Confirmed Revenue</div><div style={{fontSize:26,fontWeight:800,color:"#10b981",fontFamily:"'Plus Jakarta Sans',monospace"}}>€{confirmedRev.toLocaleString()}</div><div style={{fontSize:11,color:"rgba(167,177,195,0.4)",marginTop:4}}>{invoices.filter(i=>i.status==="paid").length} paid invoices</div></div>
          <div style={{padding:18,borderRadius:16,background:"rgba(76,201,255,0.04)",border:"1px solid rgba(76,201,255,0.15)"}}><div style={{fontSize:10,fontWeight:700,color:"rgba(76,201,255,0.6)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>In Pipeline</div><div style={{fontSize:26,fontWeight:800,color:"#4cc9ff",fontFamily:"'Plus Jakarta Sans',monospace"}}>€{pipelineRev.toLocaleString()}</div><div style={{fontSize:11,color:"rgba(167,177,195,0.4)",marginTop:4}}>{pipelineLeads.length} leads awaiting booking</div></div>
          <div style={{padding:18,borderRadius:16,background:"rgba(255,138,42,0.04)",border:"1px solid rgba(255,138,42,0.15)"}}><div style={{fontSize:10,fontWeight:700,color:"rgba(255,138,42,0.6)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Pending Reviews</div><div style={{fontSize:26,fontWeight:800,color:"#ff8a2a",fontFamily:"'Plus Jakarta Sans',monospace"}}>{actionCounts.needs_medical_review}</div><div style={{fontSize:11,color:"rgba(167,177,195,0.4)",marginTop:4}}>€{(allPotential-confirmedRev-pipelineRev).toLocaleString()} est. value</div></div>
        </div>
      </div>;
    })()}
    {/* Revenue Upgrade Suggestion */}
    {usageMetrics?.revenueExceedsThreshold&&!dismissedRevSuggestion&&usageMetrics.suggestedPlan&&<div style={{padding:16,borderRadius:14,background:"linear-gradient(135deg,rgba(16,185,129,0.04),rgba(76,201,255,0.04))",border:"1px solid rgba(16,185,129,0.12)",marginBottom:22}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>📈</span>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:"#10b981"}}>Your revenue is growing fast</div>
            <div style={{fontSize:12,color:"rgba(167,177,195,0.5)",marginTop:2}}>€{(usageMetrics.confirmedRev||0).toLocaleString()} confirmed — consider {usageMetrics.suggestedPlan.charAt(0).toUpperCase()+usageMetrics.suggestedPlan.slice(1)} ({PLAN_PRICE[usageMetrics.suggestedPlan]}/mo) for higher limits</div>
          </div>
        </div>
        <button onClick={()=>setDismissedRevSuggestion(true)} style={{padding:"4px 12px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.5)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Dismiss</button>
      </div>
      <button onClick={()=>setView("billing")} style={{padding:"8px 18px",borderRadius:10,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Explore {usageMetrics.suggestedPlan.charAt(0).toUpperCase()+usageMetrics.suggestedPlan.slice(1)} plan →</button>
    </div>}
    {/* Saved Staff Hours */}
    {(()=>{
      const aiMsgs=allClinicMsgs.reduce((s,c)=>s+c.msgs.filter(m=>m.sender==="bot").length,0);
      const savedMins=Math.round(aiMsgs*5);
      const savedHrs=Math.round(savedMins/60*10)/10;
      const savedEur=Math.round(savedHrs*20);
      return<div style={{padding:16,borderRadius:14,background:"linear-gradient(135deg,rgba(16,185,129,0.04),rgba(76,201,255,0.04))",border:"1px solid rgba(16,185,129,0.12)",marginBottom:22}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:700,color:"rgba(167,177,195,0.5)",textTransform:"uppercase",letterSpacing:"0.1em"}}>💡 Saved Staff Hours this Month</span>
          <span style={{fontSize:11,color:"rgba(167,177,195,0.35)"}}>@€20/hr avg</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:800,color:"#4cc9ff"}}>{aiMsgs}</div><div style={{fontSize:11,color:"rgba(167,177,195,0.5)",marginTop:2}}>AI Messages</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:800,color:"#10b981"}}>{savedHrs}h</div><div style={{fontSize:11,color:"rgba(167,177,195,0.5)",marginTop:2}}>Staff Hours Saved</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:800,color:"#fbbf24"}}>€{savedEur}</div><div style={{fontSize:11,color:"rgba(167,177,195,0.5)",marginTop:2}}>Cost Saved</div></div>
        </div>
      </div>;
    })()}
    {/* Leads Chart */}
    {LEAD_CHART[activeClinicId]&&<Section title="📈 Leads per Month">
      <div style={{padding:16,borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
        <MiniBarChart data={LEAD_CHART[activeClinicId]} color="#4cc9ff" height={100}/>
      </div>
    </Section>}
    {/* Medical Review Queue */}
    {actionCounts.needs_medical_review>0&&<Section title="⚕️ Medical Review Queue" right={<span style={{padding:"3px 10px",borderRadius:8,fontSize:12,fontWeight:700,background:"rgba(255,138,42,0.12)",color:"#ff8a2a"}}>{actionCounts.needs_medical_review} pending</span>}>
      {myLeads.filter(l=>l.convStatus==="needs_medical_review").map(l=><div key={l.id} onClick={()=>openPatient(l.id)} style={{padding:"14px 18px",borderRadius:14,background:"rgba(255,138,42,0.04)",border:"1px solid rgba(255,138,42,0.15)",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,138,42,0.35)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,138,42,0.15)"}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}><div style={{width:40,height:40,borderRadius:10,background:"rgba(255,138,42,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#ff8a2a"}}>{l.name.charAt(0)}</div><div><div style={{fontWeight:700,fontSize:14}}>{l.name}</div><div style={{fontSize:12,color:"rgba(167,177,195,0.6)"}}>{l.treatment} · {l.photoUrls.length} photos</div></div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:12,color:"rgba(167,177,195,0.5)"}}>{l.country}</span><span style={{padding:"4px 12px",borderRadius:8,fontSize:12,fontWeight:700,background:"rgba(255,138,42,0.12)",color:"#ff8a2a"}}>Review →</span></div>
      </div>)}
    </Section>}
    {/* Upcoming Appointments */}
    <Section title="📅 Upcoming Appointments" right={<Btn color="#4cc9ff" icon="→" label="View All" onClick={()=>setView("appointments")} small/>}>
      {myAppts.filter(a=>a.status!=="completed"&&a.status!=="cancelled").slice(0,3).map(a=>{const ac=APPT_C[a.status];return<div key={a.id} onClick={()=>setSelAppt(a.id)} style={{padding:"12px 16px",borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(76,201,255,0.2)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
        <div><div style={{fontWeight:700,fontSize:14}}>{a.patient}</div><div style={{fontSize:12,color:"rgba(167,177,195,0.6)",marginTop:2}}>{a.treatment} · {a.date} · {a.time}</div></div>
        <span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:`${ac.c}18`,color:ac.c}}>{ac.l}</span>
      </div>;})}
    </Section>
    {/* AI Activity Feed */}
    <Section title="🤖 AI Activity Feed">
      {myNotifs.slice(0,5).map(n=><div key={n.id} style={{padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",marginBottom:6,display:"flex",gap:10,alignItems:"center",fontSize:13}}>
        <span>{NOTIF_ICONS[n.type]||"🔔"}</span>
        <span style={{flex:1,color:"rgba(232,238,252,0.75)"}}>{n.text}</span>
        <span style={{fontSize:11,color:"rgba(167,177,195,0.35)",whiteSpace:"nowrap"}}>{timeAgo(n.time)}</span>
      </div>)}
    </Section>
    {isAdmin&&<Section title="Recent Client Activity">{clinics.map(c=><div key={c.id} style={{padding:"12px 16px",borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:8,height:8,borderRadius:99,background:c.status==="active"?"#10b981":"#6b7280"}}/><span style={{fontWeight:700,fontSize:14}}>{c.name}</span></div><div style={{fontSize:12,color:"rgba(167,177,195,0.5)"}}>Last login: <span style={{color:"rgba(232,238,252,0.7)",fontWeight:600}}>{timeAgo(c.lastLogin)}</span></div></div>)}</Section>}
  </div>;
}
