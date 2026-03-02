import { useApp } from "../../context/AppContext";
import { Section, Stat, MiniBarChart, HBar } from "../shared/index";
import { LEAD_CHART, COUNTRY_DATA } from "../../data/demoData";

export default function AnalyticsView() {
  const { clinic, activeClinicId } = useApp();
  if (!clinic) return null;

  return <div style={{padding:28,maxWidth:900}}><h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Analytics</h1><p style={{fontSize:14,color:"rgba(167,177,195,0.6)",margin:"0 0 28px"}}>{clinic.name}</p>
    <Section title="This Month"><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}><Stat label="Total Inquiries" value={clinic.stats.leadsMonth} color="#4cc9ff"/><Stat label="Booked" value={clinic.stats.bookingsMonth} color="#a78bfa"/><Stat label="Conversion" value={`${clinic.stats.convRate}%`} color="#fbbf24"/></div></Section>
    <Section title="AI Performance"><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}><Stat label="AI Handled" value={`${clinic.stats.aiHandled}%`} color="#10b981" sub="no human"/><Stat label="Avg Response" value={clinic.stats.avgResponse} sub="first reply"/><Stat label="Human Takeover" value={`${100-clinic.stats.aiHandled}%`} color="#ff8a2a"/></div></Section>
    {/* Charts */}
    {LEAD_CHART[activeClinicId]&&<Section title="Leads Over Time">
      <div style={{padding:20,borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
        <MiniBarChart data={LEAD_CHART[activeClinicId]} color="#4cc9ff" height={120}/>
      </div>
    </Section>}
    {COUNTRY_DATA[activeClinicId]&&<Section title="Leads by Country">
      <div style={{padding:20,borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
        {COUNTRY_DATA[activeClinicId].map((c,i)=><HBar key={i} label={c.country} pct={c.pct} color={["#4cc9ff","#a78bfa","#ff8a2a","#10b981","#fbbf24","#ef4444","#6b7280"][i%7]}/>)}
      </div>
    </Section>}
    <Section title="Language Distribution">
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {(clinic.aiConfig?.allowedLangs||[]).map((l,i)=><div key={i} style={{padding:"8px 16px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",fontSize:13,fontWeight:600}}>{l}</div>)}
      </div>
    </Section>
    <Section title="All Time"><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}><Stat label="Total Leads" value={clinic.stats.leadsTotal} color="#4cc9ff"/><Stat label="Total Bookings" value={clinic.stats.bookingsTotal} color="#a78bfa"/><Stat label="Revenue" value={clinic.stats.revenueTotal} color="#10b981"/></div></Section>
  </div>;
}
