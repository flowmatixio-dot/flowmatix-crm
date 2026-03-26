import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Field } from "./setupShared";

// FAQ knowledge base panel (FAQ Wissensdatenbank)
export default function FAQKnowledgeBase() {
  const { clinic, showT, t } = useApp();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({question:"",answer:""});

  const loadConfig = async () => {
    try {
      const res = await import("../../api/client").then(m => m.getBotConfig());
      const c = res?.config || {};
      setConfig(c);
      setFaqs(c.faq_entries || []);
    } catch { setConfig({}); setFaqs([]); }
    setLoading(false);
  };
  useEffect(() => { loadConfig(); }, []);

  const saveFaqs = async (newFaqs) => {
    const mod = await import("../../api/client");
    try {
      await mod.updateBotConfig({ faq_entries: newFaqs });
      setFaqs(newFaqs);
      showT(t("faq_saved"));
    } catch (e) { showT(t("error") + ": " + e.message); }
  };

  const addFaq = () => {
    if (!form.question.trim() || !form.answer.trim()) return showT(t("enter_qa"));
    const newFaqs = [...faqs, { question: form.question.trim(), answer: form.answer.trim() }];
    saveFaqs(newFaqs);
    setForm({question:"",answer:""});
    setEditing(null);
  };

  const removeFaq = (idx) => {
    const newFaqs = faqs.filter((_, i) => i !== idx);
    saveFaqs(newFaqs);
  };

  const updateFaq = (idx) => {
    if (!form.question.trim() || !form.answer.trim()) return;
    const newFaqs = [...faqs];
    newFaqs[idx] = { question: form.question.trim(), answer: form.answer.trim() };
    saveFaqs(newFaqs);
    setEditing(null);
    setForm({question:"",answer:""});
  };

  if (loading) return <div style={{padding:20,color:"var(--text-muted)"}}>{t("loading")}</div>;

  return <div>
    <p style={{fontSize:13,color:"var(--text-muted)",margin:"0 0 16px"}}>{t("faq_desc")}</p>

    <div style={{marginBottom:20,padding:16,borderRadius:14,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
      <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",marginBottom:8,textTransform:"uppercase"}}>{editing!==null&&editing!=="new"?(t("edit_faq")):(t("add_faq"))}</div>
      <Field label={t("question")} value={form.question} onChange={v=>setForm(f=>({...f,question:v}))} placeholder="Was kostet eine Haartransplantation?" />
      <Field label={t("answer")} value={form.answer} onChange={v=>setForm(f=>({...f,answer:v}))} placeholder="Die Kosten variieren je nach Methode..." type="textarea" />
      <div style={{display:"flex",gap:8}}>
        {editing!==null&&editing!=="new"?<>
          <button onClick={()=>updateFaq(editing)} style={{padding:"8px 16px",borderRadius:8,background:"linear-gradient(135deg,#4cc9ff,#2da8ff)",border:"none",color:"var(--text-primary)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{t("save")}</button>
          <button onClick={()=>{setEditing(null);setForm({question:"",answer:""});}} style={{padding:"8px 16px",borderRadius:8,background:"var(--bg-input)",border:"1px solid var(--border-strong)",color:"var(--text-muted)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t("cancel")}</button>
        </>:<button onClick={addFaq} style={{padding:"8px 16px",borderRadius:8,background:"linear-gradient(135deg,#4cc9ff,#2da8ff)",border:"none",color:"var(--text-primary)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>+ {t("add")}</button>}
      </div>
    </div>

    {faqs.length===0?<div style={{padding:32,textAlign:"center",borderRadius:16,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
      <div style={{fontSize:40,marginBottom:12}}>{"❓"}</div>
      <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{t("no_faqs")}</div>
      <div style={{fontSize:13,color:"var(--text-muted)"}}>{t("no_faqs_hint")}</div>
    </div>:
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {faqs.map((faq,i)=><div key={i} style={{padding:14,borderRadius:14,background:"var(--bg-card)",border:"1px solid var(--border-default)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <div style={{fontWeight:700,fontSize:14,color:"#4cc9ff"}}>{"❓"} {faq.question}</div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={()=>{setEditing(i);setForm({question:faq.question,answer:faq.answer});}} style={{padding:"4px 10px",borderRadius:6,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("edit")}</button>
            <button onClick={()=>removeFaq(i)} style={{padding:"4px 10px",borderRadius:6,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{"✕"}</button>
          </div>
        </div>
        <div style={{fontSize:13,color:"var(--text-muted)",lineHeight:1.5}}>{faq.answer}</div>
      </div>)}
    </div>}
  </div>;
}
