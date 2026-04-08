import { useApp } from "../../context/AppContext";
import { Section, Field, Btn } from "../shared/index";

export default function SupportView() {
  const { supportMsg, setSupportMsg, showT, t, lang, SystemStatus, setView } = useApp();

  return <div style={{padding:28,maxWidth:720}}>
    <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>{t("support")}</h1>
    <p style={{fontSize:14,color:"rgba(167,177,195,0.6)",margin:"0 0 28px"}}>{t("support_subtitle")}</p>
    {/* System Status */}
    <Section title={t("system_status")}>
      <SystemStatus/>
    </Section>
    <Section title={t("quick_links")}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {[{icon:"🤖",label:t("ai_support_title")||"KI-Support",desc:t("ai_support_desc")||"Nutze unseren KI-Assistenten unten rechts — die Kugel",action:"ai"},{icon:"📧",label:t("email_support"),desc:"support@flowmatix.io",url:"mailto:support@flowmatix.io"},{icon:"📱",label:t("whatsapp"),desc:"+49 176 64189746",url:"https://wa.me/4917664189746"},{icon:"📖",label:t("system_manual")||"System-Handbuch",desc:t("system_manual_desc")||"Komplette Dokumentation als PDF",action:"manual"}].map((l,i)=>
          l.action==="manual"?<div key={i} onClick={()=>setView("manual")} style={{textDecoration:"none",color:"inherit",padding:20,borderRadius:14,background:"rgba(76,201,255,0.04)",border:"1px solid rgba(76,201,255,0.15)",cursor:"pointer",display:"flex",gap:14,alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(76,201,255,0.3)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(76,201,255,0.15)"}>
            <span style={{fontSize:28}}>{l.icon}</span>
            <div><div style={{fontWeight:700,fontSize:15,color:"#4cc9ff"}}>{l.label}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginTop:2}}>{l.desc}</div></div>
          </div>
          :l.action==="ai"?<div key={i} onClick={()=>{const orb=document.querySelector(".fx-ai-support-orb,.ai-support-trigger,[class*=aiSupport]");if(orb)orb.click();else showT(t("ai_support_hint")||"Klicke auf die Kugel unten rechts");}} style={{textDecoration:"none",color:"inherit",padding:20,borderRadius:14,background:"rgba(76,201,255,0.04)",border:"1px solid rgba(76,201,255,0.15)",cursor:"pointer",display:"flex",gap:14,alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(76,201,255,0.3)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(76,201,255,0.15)"}>
            <span style={{fontSize:28}}>{l.icon}</span>
            <div><div style={{fontWeight:700,fontSize:15,color:"#4cc9ff"}}>{l.label}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginTop:2}}>{l.desc}</div></div>
          </div>
          :<a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",color:"inherit",padding:20,borderRadius:14,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",cursor:"pointer",display:"flex",gap:14,alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(76,201,255,0.2)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
            <span style={{fontSize:28}}>{l.icon}</span>
            <div><div style={{fontWeight:700,fontSize:15}}>{l.label}</div><div style={{fontSize:13,color:"rgba(167,177,195,0.6)",marginTop:2}}>{l.desc}</div></div>
          </a>
        )}
      </div>
    </Section>
    <Section title={t("report_issue")}>
      <Field label={t("describe_issue")} value={supportMsg} onChange={setSupportMsg} textarea placeholder={t("tell_what_happened")}/>
      <Btn color="#ff8a2a" icon="📨" label={t("submit")} onClick={async()=>{if(!supportMsg.trim())return;try{const{apiFetch}=await import("../../api/client");await apiFetch("/api/v1/clinic/support/report",{method:"POST",body:JSON.stringify({message:supportMsg})});showT(t("report_sent")||"Gesendet");setSupportMsg("");}catch(e){showT(t("error_generic")||"Fehler");}}}/>
    </Section>
    <Section title={({de:"Recht & Compliance",en:"Legal & Compliance",tr:"Hukuk & Uyum"}[lang]||"Legal & Compliance")}>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {[
          {label:({de:"Datenschutzerklärung",en:"Privacy Policy",tr:"Gizlilik Politikası"}[lang]||"Privacy Policy"),icon:"🔒",url:"https://www.flowmatix.io/privacy-policy"},
          {label:({de:"AGB",en:"Terms of Service",tr:"Kullanım Şartları"}[lang]||"Terms of Service"),icon:"📄",url:"https://www.flowmatix.io/terms"},
          {label:({de:"Impressum",en:"Imprint",tr:"Künye"}[lang]||"Imprint"),icon:"🏢",url:"https://www.flowmatix.io/imprint"},
          {label:({de:"AVV (Auftragsverarbeitungsvertrag)",en:"DPA (Data Processing Agreement)",tr:"DPA (Veri İşleme Sözleşmesi)"}[lang]||"DPA"),icon:"📋",url:{de:"/legal/AVV-Deutsch.pdf",en:"/legal/AVV-Englisch.pdf",tr:"/legal/DPA-Turkisch.pdf"}},
          {label:({de:"DPIA (Datenschutz-Folgenabschätzung)",en:"DPIA (Data Protection Impact Assessment)",tr:"DPIA (Veri Koruma Etki Değerlendirmesi)"}[lang]||"DPIA"),icon:"📊",url:{de:"/legal/DPIA-Deutsch.pdf",en:"/legal/DPIA-English.pdf",tr:"/legal/DPIA-Turkisch.pdf"}},
        ].map((l,i)=>{
          const href = typeof l.url === "object" ? (l.url[lang] || l.url.en) : l.url;
          return <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{padding:"8px 16px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.7)",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,textDecoration:"none"}}>{l.icon} {l.label}</a>;
        })}
      </div>
    </Section>
  </div>;
}
