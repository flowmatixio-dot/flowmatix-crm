import { useApp } from "../../context/AppContext";
import { Section, Field, Btn } from "../shared/index";

export default function SupportView() {
  const { supportMsg, setSupportMsg, showT, t, SystemStatus } = useApp();

  return <div style={{padding:28,maxWidth:720}}>
    <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Support</h1>
    <p style={{fontSize:14,color:"rgba(167,177,195,0.6)",margin:"0 0 28px"}}>We're here to help.</p>
    {/* System Status */}
    <Section title="System Status">
      <SystemStatus/>
    </Section>
    <Section title={t("quick_links")}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {[{icon:"📖",label:"Help Center",desc:"Browse docs & guides",url:"https://www.flowmatix.io/product"},{icon:"💬",label:"Live Chat",desc:"Chat with our team",url:"https://wa.me/4915216420001?text=Hi%2C%20I%20need%20support"},{icon:"📧",label:"Email Support",desc:"support@flowmatix.io",url:"mailto:support@flowmatix.io"},{icon:"📱",label:"WhatsApp",desc:"+49 152 164 20001",url:"https://wa.me/4915216420001"}].map((l,i)=>
          <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",color:"inherit",padding:20,borderRadius:14,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",cursor:"pointer",display:"flex",gap:14,alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(76,201,255,0.2)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
            <span style={{fontSize:28}}>{l.icon}</span>
            <div><div style={{fontWeight:700,fontSize:15}}>{l.label}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginTop:2}}>{l.desc}</div></div>
          </a>
        )}
      </div>
    </Section>
    <Section title="Report an Issue">
      <Field label="Describe your issue" value={supportMsg} onChange={setSupportMsg} textarea placeholder="Tell us what happened…"/>
      <Btn color="#ff8a2a" icon="📨" label="Submit Report" onClick={()=>{if(supportMsg.trim()){showT("Report submitted");setSupportMsg("");}}}/>
    </Section>
    <Section title={t("legal")}>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {[{label:"Privacy Policy",icon:"🔒",url:"https://www.flowmatix.io/privacy-policy"},{label:"Terms of Service",icon:"📄",url:"https://www.flowmatix.io/terms"},{label:"Imprint",icon:"🏢",url:"https://www.flowmatix.io/imprint"},{label:t("export_data"),icon:"📦",url:null},{label:t("delete_data"),icon:"🗑️",url:null},{label:"Consent Tracking",icon:"✅",url:null}].map((l,i)=>
          l.url?<a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{padding:"8px 16px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.7)",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,textDecoration:"none"}}>{l.icon} {l.label}</a>
          :<button key={i} onClick={()=>showT(`${l.label} — request submitted`)} style={{padding:"8px 16px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.7)",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>{l.icon} {l.label}</button>
        )}
      </div>
    </Section>
  </div>;
}
