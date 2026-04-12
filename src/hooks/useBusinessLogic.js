import * as fmApi from "../api/client";
import { escHtml, genId } from "../utils/helpers";
import { PRICE_MAP, MONTHS } from "../data/constants";
import { isDemoMode } from "../utils/demoTime";

export function useBusinessLogic({
  leads, setLeads, invoices, setInvoices, msgs, setMsgs, appts, setAppts,
  clinic, activeClinicId, user, magicLinks, setMagicLinks,
  myAppts, calDate, logAction, addTL, showT, setConvStatus, setSuccessModal,
  reviewGrafts, setReviewGrafts, reviewPrice, setReviewPrice, reviewNotes, setReviewNotes,
  getLeadById, newNote, setNewNote,
}) {

  /* ═══ PDF TREATMENT PLAN ═══ */
  const generatePDF = (lead) => {
    if (!lead?.reviewData) return;
    const c = clinic;
    const lang = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
    const method = lead.treatment?.includes("FUE") ? "FUE (Follicular Unit Extraction)" : lead.treatment?.includes("DHI") ? "DHI (Direct Hair Implantation)" : lead.treatment;
    const grafts = lead.reviewData.grafts || "3500 Grafts";
    const price = lead.reviewData.price || "€3,250";
    const pdfL = {
      treatmentPlan: { de: "Behandlungsplan", en: "Treatment Plan", tr: "Tedavi Planı" },
      personalized: { de: "Persönlicher Behandlungsplan", en: "Personalized Treatment Plan", tr: "Kişisel Tedavi Planı" },
      preparedOn: { de: "Erstellt am", en: "Prepared on", tr: "Hazırlanma tarihi" },
      by: { de: "von", en: "by", tr: "tarafından" },
      patient: { de: "Patient", en: "Patient", tr: "Hasta" },
      dob: { de: "Geburtsdatum", en: "Date of Birth", tr: "Doğum Tarihi" },
      country: { de: "Land", en: "Country", tr: "Ülke" },
      language: { de: "Sprache", en: "Language", tr: "Dil" },
      recommended: { de: "Empfohlene Behandlung", en: "Recommended Treatment", tr: "Önerilen Tedavi" },
      procedure: { de: "Verfahren", en: "Procedure", tr: "İşlem" },
      methodLbl: { de: "Methode", en: "Method", tr: "Yöntem" },
      estimatedCost: { de: "Geschätzte Kosten", en: "Estimated Cost", tr: "Tahmini Maliyet" },
      medicalNotes: { de: "Medizinische Notizen", en: "Medical Notes", tr: "Tıbbi Notlar" },
      nextSteps: { de: "Nächste Schritte", en: "Next Steps", tr: "Sonraki Adımlar" },
      step1: { de: "Überprüfen Sie diesen Plan und antworten Sie bei Fragen", en: "Review this plan and reply with any questions", tr: "Bu planı inceleyin ve sorularınızı iletin" },
      step2: { de: "Bestätigen Sie Ihren bevorzugten Termin", en: "Confirm your preferred appointment date", tr: "Tercih ettiğiniz randevu tarihini onaylayın" },
      step3: { de: "Leisten Sie die Anzahlung von 25% zur Buchungsbestätigung", en: "Complete the 25% deposit to secure your booking", tr: "Rezervasyonunuzu güvence altına almak için %25 depozito ödeyin" },
      step4: { de: "Buchen Sie Ihre Flüge — unser Team hilft bei der Hotelorganisation", en: "Book your flights — our team will assist with hotel arrangements", tr: "Uçuşlarınızı ayırtın — ekibimiz otel düzenlemelerinde yardımcı olacak" },
      legal: { de: "Dieser Behandlungsplan ist eine medizinische Empfehlung auf Basis der eingereichten Fotos und Krankengeschichte. Die endgültige Beurteilung erfolgt während der persönlichen Beratung. Preise können bei der Beratung bestätigt werden. Alle medizinischen Eingriffe entsprechen den geltenden Standards.", en: "This treatment plan is a medical recommendation based on evaluation of submitted photographs and patient history. Final assessment will be made during the in-person consultation. Prices are subject to confirmation during consultation. All medical procedures comply with local regulatory standards.", tr: "Bu tedavi planı, gönderilen fotoğraflar ve hasta geçmişinin değerlendirilmesine dayanan tıbbi bir öneridir. Nihai değerlendirme yüz yüze konsültasyon sırasında yapılacaktır. Fiyatlar konsültasyon sırasında onaylanacaktır. Tüm tıbbi prosedürler yerel düzenleyici standartlara uygundur." },
      medicalTeam: { de: "Ärzteteam", en: "Medical Team", tr: "Medikal Ekip" },
    };
    const p = (k) => pdfL[k]?.[lang] || pdfL[k]?.en || k;
    const dateFmt = lang === "de" ? "de-DE" : lang === "tr" ? "tr-TR" : "en";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:'Helvetica Neue',sans-serif;padding:0;color:#1a1a2e;max-width:760px;margin:0 auto}
      .top-bar{height:6px;background:linear-gradient(90deg,#00B4D8,#4cc9ff,#00B4D8);margin-bottom:32px}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:0 40px;margin-bottom:32px}
      .logo-box{display:flex;align-items:center;gap:12px}
      .logo-icon{width:42px;height:42px;border-radius:10px;object-fit:cover}
      .logo-text{font-size:22px;font-weight:800;color:#00B4D8;letter-spacing:2px}
      .logo-sub{font-size:11px;color:#888;letter-spacing:3px;text-transform:uppercase}
      .clinic-info{text-align:right;font-size:12px;color:#666;line-height:1.6}
      .content{padding:0 40px}
      .title{font-size:24px;font-weight:800;color:#1a1a2e;margin:0 0 4px}
      .subtitle{color:#888;font-size:14px;margin-bottom:28px}
      .grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-bottom:28px}
      .card{background:#f8f9fa;padding:16px;border-radius:12px;border-top:3px solid #00B4D8}
      .card-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
      .card-value{font-size:15px;font-weight:700}
      .plan-box{background:linear-gradient(135deg,#f0fbff,#e6f7ff);border:2px solid #00B4D8;border-radius:16px;padding:28px;margin:0 0 28px}
      .plan-title{font-size:20px;font-weight:800;color:#00B4D8;margin:0 0 20px;display:flex;align-items:center;gap:8px}
      .plan-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px}
      .plan-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px}
      .plan-value{font-size:16px;font-weight:700;margin-top:4px}
      .plan-price{font-size:32px;font-weight:900;color:#00B4D8;margin-top:4px}
      .notes-box{background:#fff;border:1px solid #e0e7ef;border-radius:10px;padding:16px;margin-top:20px;font-size:14px;line-height:1.7;color:#444}
      .next-steps{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0}
      .next-steps h3{color:#16a34a;margin:0 0 12px;font-size:15px}
      .next-steps ol{margin:0;padding-left:20px;color:#444;font-size:13px;line-height:2}
      .legal{font-size:12px;color:#888;line-height:1.7;margin:20px 0}
      .footer{padding:20px 40px;border-top:2px solid #00B4D8;display:flex;justify-content:space-between;align-items:center;margin-top:32px}
      .stamp{display:inline-block;border:2px solid #00B4D8;color:#00B4D8;padding:6px 16px;border-radius:8px;font-weight:800;font-size:13px;letter-spacing:1px}
      .ft-text{font-size:11px;color:#999;text-align:right}
    </style></head><body>
    <div class="top-bar"></div>
    <div class="hdr">
      <div class="logo-box"><img class="logo-icon" src="/Flowmatix-Logo.png" alt="Flowmatix"/><div><div class="logo-text">${escHtml(c?.name || "FLOWMATIX")}</div><div class="logo-sub">${escHtml(p("treatmentPlan"))}</div></div></div>
      <div class="clinic-info"><strong>${escHtml(c?.name || "")}</strong><br>${escHtml(c?.address || "")}<br>${escHtml(c?.phone || "")}<br>${escHtml(c?.clinicEmail || "")}</div>
    </div>
    <div class="content">
      <div class="title">${escHtml(p("personalized"))}</div>
      <div class="subtitle">${escHtml(p("preparedOn"))} ${new Date().toLocaleDateString(dateFmt, { year: "numeric", month: "long", day: "numeric" })} ${escHtml(p("by"))} ${escHtml(lead.assigned || p("medicalTeam"))}</div>
      <div class="grid4">
        <div class="card"><div class="card-label">${escHtml(p("patient"))}</div><div class="card-value">${escHtml(lead.name)}</div></div>
        <div class="card"><div class="card-label">${escHtml(p("dob"))}</div><div class="card-value">${escHtml(lead.dob || "—")}</div></div>
        <div class="card"><div class="card-label">${escHtml(p("country"))}</div><div class="card-value">${escHtml(lead.country || "—")}</div></div>
        <div class="card"><div class="card-label">${escHtml(p("language"))}</div><div class="card-value">${escHtml(lead.language || "—")}</div></div>
      </div>
      <div class="plan-box">
        <div class="plan-title">⚕️ ${escHtml(p("recommended"))}</div>
        <div class="plan-grid">
          <div><div class="plan-label">${escHtml(p("procedure"))}</div><div class="plan-value">${escHtml(grafts)}</div></div>
          <div><div class="plan-label">${escHtml(p("methodLbl"))}</div><div class="plan-value">${escHtml(method)}</div></div>
          <div><div class="plan-label">${escHtml(p("estimatedCost"))}</div><div class="plan-price">${escHtml(price)}</div></div>
        </div>
        ${lead.reviewData.notes ? `<div class="notes-box"><strong>${escHtml(p("medicalNotes"))}:</strong><br>${escHtml(lead.reviewData.notes)}</div>` : ""}
      </div>
      <div class="next-steps"><h3>✅ ${escHtml(p("nextSteps"))}</h3><ol><li>${escHtml(p("step1"))}</li><li>${escHtml(p("step2"))}</li><li>${escHtml(p("step3"))}</li><li>${escHtml(p("step4"))}</li></ol></div>
      <div class="legal">${escHtml(p("legal"))}</div>
    </div>
    <div class="footer"><div class="stamp">✦ ${escHtml((c?.name || "FLOWMATIX").toUpperCase())} CERTIFIED</div><div class="ft-text">${escHtml(c?.name || "Flowmatix")} · ${escHtml(c?.website || "flowmatix.io")}<br>Auto-generated by Flowmatix CRM · Plan ID: TP-${Date.now().toString(36).toUpperCase()}</div></div>
    </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
    logAction("pdf_generated", lead.name, `Treatment plan: ${grafts}, ${price}`);
    showT("PDF generated");
  };

  /* ═══ MAGIC LINK (Photo Upload) ═══ */
  const generateMagicLink = (leadId) => {
    const lead = leads.find(l => l.id === leadId); if (!lead) return;
    const token = genId();
    const link = `${window.location.origin}/upload/${token}`;
    setMagicLinks(prev => ({ ...prev, [leadId]: { token, link, created: new Date().toISOString(), status: "pending", views: [] } }));
    navigator.clipboard?.writeText(link).then(() => showT("Link copied!")).catch(() => showT("Link generated"));
    addTL(leadId, "system", `Photo upload link sent`);
    logAction("magic_link_created", lead.name, `Upload link: ${link}`);
  };

  /* ═══ REVENUE HELPERS ═══ */
  const estimateRevenue = (appt) => {
    const key = Object.keys(PRICE_MAP).find(k => appt.treatment?.toLowerCase().includes(k.toLowerCase()));
    return key ? PRICE_MAP[key] : 2000;
  };
  const getWeekRevenue = (weekStart) => {
    const end = new Date(weekStart); end.setDate(end.getDate() + 7);
    return myAppts.filter(a => { const d = new Date(a.date); return d >= weekStart && d < end && a.status !== "cancelled"; }).reduce((sum, a) => sum + estimateRevenue(a), 0);
  };

  /* ═══ PATIENT INVOICING ═══ */
  const nextInvoiceNr = () => {
    const yr = new Date().getFullYear();
    const existing = invoices.filter(i => i.nr?.startsWith(`INV-${yr}`));
    return `INV-${yr}-${String(existing.length + 1).padStart(4, "0")}`;
  };

  const createInvoice = (leadId, items, totalNet, vatPct) => {
    const lead = leads.find(l => l.id === leadId); if (!lead) return null;
    const c = clinic;
    const vatAmount = Math.round(totalNet * vatPct / 100);
    const totalGross = totalNet + vatAmount;
    const inv = {
      id: genId(), nr: nextInvoiceNr(), clinicId: activeClinicId,
      leadId, patientName: lead.name, patientEmail: lead.email,
      treatment: lead.treatment, items,
      net: totalNet, vatPct, vatAmount, gross: totalGross,
      currency: "EUR", status: "unpaid",
      created: new Date().toISOString(),
      clinicName: c?.name || "", clinicAddress: c?.address || "",
      clinicEmail: c?.clinicEmail || "", clinicPhone: c?.phone || "",
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      payments: []
    };
    setInvoices(prev => [inv, ...prev]);
    addTL(leadId, "system", `Invoice ${inv.nr} created — €${totalGross.toLocaleString()}`);
    logAction("invoice_created", lead.name, `${inv.nr}: €${totalGross} (net €${totalNet} + ${vatPct}% VAT)`);
    showT(`Invoice ${inv.nr} created`);
    if (!isDemoMode()) {
      fmApi.createCrmInvoice(inv).catch(err => { console.error("createCrmInvoice failed:", err); showT("Rechnung konnte nicht gespeichert werden"); });
    } else {
      // Demo mode — createCrmInvoice blocked
    }
    return inv;
  };

  const markInvoicePaid = (invId, method) => {
    const paidDate = new Date().toISOString();
    setInvoices(prev => prev.map(i => i.id === invId ? { ...i, status: "paid", paidDate, paidMethod: method || "cash", payments: [...i.payments, { amount: i.gross, date: paidDate, method: method || "cash" }] } : i));
    const inv = invoices.find(i => i.id === invId);
    if (inv) { addTL(inv.leadId, "system", `Invoice ${inv.nr} marked as paid (${method || "cash"})`); logAction("invoice_paid", inv.patientName, `${inv.nr}: €${inv.gross} via ${method || "cash"}`); }
    if (!isDemoMode()) {
      fmApi.updateInvoice(invId, { status: "paid", paidDate, paidMethod: method || "cash" }).catch(err => { console.error("updateInvoice failed:", err); showT("Zahlung konnte nicht gespeichert werden"); });
    } else {
      // Demo mode — updateInvoice blocked
    }
    showT("Marked as paid");
  };

  const generateInvoicePDF = (inv) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:'Helvetica Neue',sans-serif;padding:40px;color:#1a1a2e;max-width:720px;margin:0 auto;font-size:14px}
      .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #4cc9ff;padding-bottom:20px;margin-bottom:30px}
      .logo{font-size:22px;font-weight:800;color:#4cc9ff;letter-spacing:2px}
      .meta{text-align:right;font-size:12px;color:#666}
      .inv-nr{font-size:20px;font-weight:800;color:#1a1a2e;margin:0 0 4px}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}
      .box{background:#f8f9fa;padding:16px;border-radius:10px}
      .lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
      .val{font-size:14px;font-weight:600}
      table{width:100%;border-collapse:collapse;margin:24px 0}
      th{text-align:left;padding:10px 12px;background:#f1f5f9;font-size:11px;text-transform:uppercase;color:#666;letter-spacing:0.5px}
      td{padding:10px 12px;border-bottom:1px solid #e5e7eb}
      .total-row td{font-weight:700;border-top:2px solid #1a1a2e;font-size:15px}
      .paid{display:inline-block;background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:6px;font-weight:700;font-size:12px}
      .unpaid{display:inline-block;background:#fef2f2;color:#dc2626;padding:4px 12px;border-radius:6px;font-weight:700;font-size:12px}
      .bank{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;margin:20px 0;font-size:13px}
      .bank strong{color:#0369a1}
      .ft{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#999;text-align:center}
    </style></head><body>
    <div class="hdr"><div class="logo">${clinic?.logo ? '<img src="' + clinic.logo + '" style="max-height:50px;max-width:180px;object-fit:contain;margin-bottom:6px;display:block"/>' : ''}\n${escHtml(inv.clinicName || "FLOWMATIX")}${clinic?.taxId ? '<div style="font-size:11px;color:#888;font-weight:400;margin-top:2px">' + escHtml(clinic.taxId) + '</div>' : ''}</div><div class="meta">${escHtml(inv.clinicAddress || "")}<br>${escHtml(inv.clinicPhone || "")}<br>${escHtml(inv.clinicEmail || "")}</div></div>
    <div class="inv-nr">INVOICE ${escHtml(inv.nr)}</div>
    <div style="color:#666;margin-bottom:24px">Date: ${new Date(inv.created).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })} · Due: ${escHtml(inv.dueDate)} · <span class="${inv.status === "paid" ? "paid" : "unpaid"}">${escHtml(inv.status.toUpperCase())}</span></div>
    <div class="grid2">
      <div class="box"><div class="lbl">Bill to</div><div class="val">${escHtml(inv.patientName)}</div><div style="color:#666;font-size:13px;margin-top:4px">${escHtml(inv.patientEmail || "")}</div></div>
      <div class="box"><div class="lbl">Treatment</div><div class="val">${escHtml(inv.treatment)}</div></div>
    </div>
    <table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>
    ${(inv.items || inv.treatment).split("\n").map(item => `<tr><td>${escHtml(item)}</td><td style="text-align:right">—</td></tr>`).join("")}
    <tr><td style="text-align:right;color:#666">Subtotal (net)</td><td style="text-align:right">€${inv.net?.toLocaleString()}</td></tr>
    <tr><td style="text-align:right;color:#666">VAT ${inv.vatPct}%</td><td style="text-align:right">€${inv.vatAmount?.toLocaleString()}</td></tr>
    <tr class="total-row"><td style="text-align:right">Total</td><td style="text-align:right">€${inv.gross?.toLocaleString()}</td></tr>
    </tbody></table>
    <div class="bank"><strong>Payment Details</strong><br>Bank: ${escHtml(clinic?.bankName || "Deutsche Bank")} · IBAN: ${escHtml(clinic?.iban || "—")}<br>BIC: ${escHtml(clinic?.bic || "—")} · Ref: ${escHtml(inv.nr)}<br><br>Or pay online via the Stripe link sent to your WhatsApp.</div>
    ${inv.status === "paid" ? `<div style="text-align:center;margin:24px 0"><div class="paid" style="font-size:16px;padding:8px 24px">✓ PAID — ${inv.paidDate ? new Date(inv.paidDate).toLocaleDateString() : ""}${inv.paidMethod ? " via " + escHtml(inv.paidMethod) : ""}</div></div>` : ""}
    <div class="ft">${escHtml(inv.clinicName || "Flowmatix Clinic")}<br>Generated by Flowmatix CRM · Invoice ${escHtml(inv.nr)}</div>
    </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
    logAction("invoice_pdf", inv.patientName, `Invoice ${inv.nr} PDF generated`);
  };

  const generateStripeLink = async (inv) => {
    if (!inv) return;
    let link;
    if (isDemoMode()) {
      link = `#DEMO-stripe-link/${inv.id.substring(0, 8)}`;
      // Demo mode — createStripeCheckoutLink blocked
    } else {
      try {
        const res = await fmApi.createStripeCheckoutLink?.({ invoiceId: inv.id, amount: inv.gross, currency: 'eur', ref: inv.nr });
        link = res?.url;
      } catch { /* fallback below */ }
    }
    if (!link) link = `#PENDING-stripe-link/${inv.id.substring(0, 8)}`;
    navigator.clipboard?.writeText(link).then(() => showT("Stripe link copied — paste in WhatsApp!")).catch(() => showT("Stripe link generated"));
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, stripeLink: link, stripeLinkCreated: new Date().toISOString() } : i));
    setMsgs(prev => {
      const cm = [...(prev[activeClinicId] || [])];
      const idx = cm.findIndex(c => c.leadId === inv.leadId);
      if (idx > -1) { cm[idx] = { ...cm[idx], msgs: [...(cm[idx].msgs || []), { text: `🤖 KI: Stripe-Zahlungslink über €${inv.gross} (${inv.nr}) wurde an ${inv.patientName} gesendet.`, time: new Date().toLocaleTimeString("de", { hour: "2-digit", minute: "2-digit" }), sender: "bot" }] }; }
      return { ...prev, [activeClinicId]: cm };
    });
    addTL(inv.leadId, "system", `Stripe payment link sent for ${inv.nr}`);
    logAction("stripe_link", inv.patientName, `Payment link: €${inv.gross} for ${inv.nr}`);
  };

  const generateDepositLink = async (leadId, amount) => {
    const lead = leads.find(l => l.id === leadId); if (!lead) return;
    let link;
    if (isDemoMode()) {
      link = `#DEMO-stripe-deposit/${genId().substring(0, 8)}`;
      // Demo mode — createStripeCheckoutLink (deposit) blocked
    } else {
      try {
        const res = await fmApi.createStripeCheckoutLink?.({ leadId, amount, currency: 'eur', type: 'deposit', desc: `Deposit_${lead.name.replaceAll(/\s/g, "_")}` });
        link = res?.url;
      } catch { /* fallback below */ }
    }
    if (!link) link = `#PENDING-stripe-deposit/${genId().substring(0, 8)}`;
    navigator.clipboard?.writeText(link).then(() => showT(`Deposit link €${amount} copied!`)).catch(() => showT("Deposit link generated"));
    setMsgs(prev => {
      const cm = [...(prev[activeClinicId] || [])];
      const idx = cm.findIndex(c => c.leadId === leadId);
      if (idx > -1) { cm[idx] = { ...cm[idx], msgs: [...(cm[idx].msgs || []), { text: `🤖 KI: Stripe-Anzahlungslink über €${amount} wurde an ${lead.name} gesendet. "Hallo ${lead.name}, um deinen Termin zu sichern, überweise bitte die Anzahlung von €${amount} über diesen Link."`, time: new Date().toLocaleTimeString("de", { hour: "2-digit", minute: "2-digit" }), sender: "bot" }] }; }
      return { ...prev, [activeClinicId]: cm };
    });
    addTL(leadId, "system", `Deposit link €${amount} generated`);
    logAction("deposit_link", lead.name, `Deposit: €${amount}`);
  };

  /* ═══ PAYMENT LINK SYSTEM (n8n-ready) ═══ */
  const sendPaymentLink = async (amount, leadId, mode = "auto") => {
    const lead = leads.find(l => l.id === leadId); if (!lead) return;
    let link;
    if (isDemoMode()) {
      link = `#DEMO-stripe-payment/${genId().substring(0, 8)}`;
      // Demo mode — createStripeCheckoutLink (payment) blocked
    } else {
      try {
        const res = await fmApi.createStripeCheckoutLink?.({ leadId, amount, currency: 'eur', clinicId: activeClinicId });
        link = res?.url;
      } catch { /* fallback below */ }
    }
    if (!link) link = `#PENDING-stripe-payment/${genId().substring(0, 8)}`;
    const paymentCard = { type: "payment_card", amount: Number.parseInt(amount), currency: "EUR", status: "pending", link, created: new Date().toISOString(), id: genId() };
    setMsgs(prev => {
      const cm = [...(prev[activeClinicId] || [])];
      const idx = cm.findIndex(c => c.leadId === leadId);
      if (idx > -1) {
        cm[idx] = { ...cm[idx], msgs: [...(cm[idx].msgs || []),
          { text: mode === "auto" ? `🤖 AI: Analyse abgeschlossen. Anzahlungslink (€${amount}) wurde automatisch via WhatsApp gesendet.` : `👤 Mitarbeiter hat Zahlungslink über €${amount} generiert und zur Prüfung gesendet.`, time: new Date().toLocaleTimeString("de", { hour: "2-digit", minute: "2-digit" }), sender: "bot" },
          { text: JSON.stringify(paymentCard), time: new Date().toLocaleTimeString("de", { hour: "2-digit", minute: "2-digit" }), sender: "system", msgType: "payment_card" },
        ] };
      }
      return { ...prev, [activeClinicId]: cm };
    });
    addTL(leadId, "system", `Payment link €${amount} sent (${mode})`);
    logAction("payment_link_sent", lead.name, `€${amount} via ${mode}`);
    navigator.clipboard?.writeText(link);
    showT(`Payment link €${amount} ${mode === "auto" ? "auto-sent" : "generated"} — copied!`);
  };

  const simulatePaymentReceived = (leadId, msgIdx) => {
    const lead = leads.find(l => l.id === leadId); if (!lead) return;
    setMsgs(prev => {
      const cm = [...(prev[activeClinicId] || [])];
      const idx = cm.findIndex(c => c.leadId === leadId);
      if (idx > -1) {
        const chat = { ...cm[idx] };
        chat.msgs = (chat.msgs || []).map(m => {
          if (m.msgType === "payment_card") { try { const card = JSON.parse(m.text); return { ...m, text: JSON.stringify({ ...card, status: "paid", paidAt: new Date().toISOString() }) }; } catch { return m; } } return m;
        });
        cm[idx] = chat;
      }
      return { ...prev, [activeClinicId]: cm };
    });
    setConvStatus(leadId, "deposit_paid");
    setAppts(prev => prev.map(a => a.leadId === leadId && a.status === "booked" ? { ...a, status: "confirmed" } : a));
    addTL(leadId, "system", "💰 Deposit received — appointment confirmed");
    logAction("payment_received", lead.name, "Deposit confirmed via Stripe webhook");
    showT(`Payment received from ${lead.name} — appointment confirmed!`);
    setSuccessModal({ lead, type: "deposit", revenue: lead.reviewData?.price || "", treatment: lead.treatment });
  };

  /* ═══ DATEV / CSV REVENUE EXPORT ═══ */
  const exportRevenue = (format) => {
    const month = calDate.getMonth(); const year = calDate.getFullYear();
    const monthStr = String(month + 1).padStart(2, "0");
    const monthAppts = myAppts.filter(a => a.status !== "cancelled" && a.date?.startsWith(`${year}-${monthStr}`));
    if (format === "datev") {
      const header = `"Umsatz (ohne Soll/Haben-Kz)";"Soll/Haben-Kennzeichen";"WKZ Umsatz";"Kurs";"Basis-Umsatz";"WKZ Basis-Umsatz";"Konto";"Gegenkonto (ohne BU-Schlüssel)";"BU-Schlüssel";"Belegdatum";"Belegfeld 1";"Belegfeld 2";"Skonto";"Buchungstext"`;
      const rows = monthAppts.map((a, i) => {
        const rev = estimateRevenue(a); const lead = myAppts.find(l => l.id === a.leadId);
        const belegNr = `FM-${year}${monthStr}-${String(i + 1).padStart(3, "0")}`;
        const datum = a.date.split("-").reverse().join("").substring(0, 4);
        return `${rev.toFixed(2).replaceAll(".", ",")};"S";"EUR";"";"";"";"10000";"8400";"";"${datum}";"${belegNr}";"";"";"\${a.patient} - ${a.treatment}"`;
      });
      const csv = [header, ...rows].join("\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const el = document.createElement("a"); el.href = URL.createObjectURL(blob);
      el.download = `DATEV_Buchungen_${year}-${monthStr}_${clinic?.name?.replaceAll(/\\s/g, "_") || "clinic"}.csv`; el.click();
      logAction("datev_export", clinic?.name || "", "DATEV export: " + monthAppts.length + " bookings, " + MONTHS[month] + " " + year);
    } else {
      const header = "Date,Patient,Treatment,Doctor,Status,Revenue (EUR),Clinic,Invoice Nr";
      const rows = monthAppts.map((a, i) => {
        const rev = estimateRevenue(a);
        const invNr = `FM-${year}${monthStr}-${String(i + 1).padStart(3, "0")}`;
        return `"${a.date}","${a.patient}","${a.treatment}","${a.assigned || ""}","${a.status}",${rev},"${clinic?.name || ""}","${invNr}"`;
      });
      const total = monthAppts.reduce((s, a) => s + estimateRevenue(a), 0);
      rows.push(`"","","","","TOTAL",${total},"",""`);
      const csv = [header, ...rows].join("\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const el = document.createElement("a"); el.href = URL.createObjectURL(blob);
      el.download = `Revenue_${year}-${monthStr}_${clinic?.name?.replaceAll(/\\s/g, "_") || "clinic"}.csv`; el.click();
      logAction("revenue_export", clinic?.name || "", "CSV export: " + monthAppts.length + " bookings, €" + total);
    }
    showT(`${format === "datev" ? "DATEV" : "CSV"} exported — ${monthAppts.length} bookings`);
  };

  /* ═══ SEND TREATMENT PLAN ═══ */
  const sendTreatmentPlan = async (lid, depositAmount = 0) => {
    const lead = getLeadById(lid); if (!lead) return;
    const planTime = new Date().toISOString();
    const hasDeposit = depositAmount > 0;
    setLeads(p => p.map(x => x.id === lid ? { ...x, convStatus: "booking_pending", reviewData: { grafts: reviewGrafts, price: reviewPrice, notes: reviewNotes }, reviewAssignedTo: null, lastAiInteraction: planTime, treatmentPlanSentAt: planTime,
      timeline: [...(x.timeline || []),
        { time: "now", type: "review", text: `Treatment plan: ${reviewGrafts}, ${reviewPrice}` },
        hasDeposit ? { time: "now", type: "finance", text: `💳 Deposit request: €${depositAmount}` } : null,
        { time: "now", type: "bot", text: `🤖 KI: Behandlungsplan über ${reviewGrafts} (${reviewPrice})${hasDeposit ? ` + Anzahlung €${depositAmount}` : ""} wurde an ${x.name} gesendet.` },
        { time: "now", type: "system", text: "Conversation → Booking Pending · Auto-follow-up in 48h" },
      ].filter(Boolean) } : x));
    setMsgs(prev => {
      const clinicMsgs = [...(prev[activeClinicId] || [])];
      const idx = clinicMsgs.findIndex(c => c.leadId === lid);
      if (idx > -1) {
        const chat = { ...clinicMsgs[idx] };
        chat.msgs = [...(chat.msgs || []),
          { text: `🤖 KI: Behandlungsplan über ${reviewGrafts} (${reviewPrice})${hasDeposit ? ` + Anzahlungslink €${depositAmount}` : ""} wurde an den Patienten gesendet.`, time: new Date().toLocaleTimeString("de", { hour: "2-digit", minute: "2-digit" }), sender: "bot" },
          { text: `📅 KI: "${lead.name}, Dr. ${lead.assigned || "Yilmaz"} hat deinen persönlichen Behandlungsplan fertiggestellt. Möchtest du den Termin direkt buchen?"`, time: new Date().toLocaleTimeString("de", { hour: "2-digit", minute: "2-digit" }), sender: "bot" },
        ];
        clinicMsgs[idx] = chat;
      }
      return { ...prev, [activeClinicId]: clinicMsgs };
    });
    setReviewGrafts(""); setReviewPrice(""); setReviewNotes("");
    showT(`Treatment plan${hasDeposit ? " + deposit link" : ""} sent to ${lead.name}`);
    logAction("treatment_plan_sent", lead.name, `${reviewGrafts}, ${reviewPrice}${hasDeposit ? `, deposit €${depositAmount}` : ""}`);
    fmApi.updatePatient(lid, {
      reviewData: { grafts: reviewGrafts, price: reviewPrice, notes: reviewNotes },
      convStatus: "booking_pending",
    }).then(() => { fmApi.syncPatientCardToDrive(lid).catch(() => {}); }).catch(e => { console.error('[CRM] sendTreatmentPlan persist failed:', e); showT("Behandlungsplan konnte nicht gesendet werden"); });
    let depositLink = "";
    if (hasDeposit) {
      try {
        const res = await fmApi.createStripeCheckoutLink({ leadId: lid, amount: depositAmount, currency: "eur", type: "deposit", desc: `Deposit_${lead.name?.replaceAll(/\s/g, "_") || "patient"}` });
        depositLink = res?.url || "";
      } catch (e) { console.error("[CRM] Stripe deposit link failed:", e); showT("Zahlungslink konnte nicht erstellt werden"); }
    }
    const convChat = (msgs[activeClinicId] || []).find(c => c.leadId === lid || c.patientId === lid);
    if (convChat?.id) {
      let waText = `Vielen Dank für deine Geduld! Dein persönlicher Behandlungsplan ist fertig:\n\n⚕️ Behandlung: ${reviewGrafts}\n💰 Preis: ${reviewPrice}${reviewNotes ? '\n📋 Notizen: ' + reviewNotes : ''}\n\nMöchtest du einen Termin buchen? Antworte einfach mit "Ja" oder kontaktiere uns für weitere Fragen.`;
      if (hasDeposit && depositLink) {
        waText += `\n\n💳 Um deinen Termin zu sichern, überweise bitte die Anzahlung von €${depositAmount}:\n${depositLink}`;
      } else if (hasDeposit) {
        waText += `\n\n💳 Anzahlung: €${depositAmount} — Der Zahlungslink wird dir in Kürze zugesendet.`;
      }
      fmApi.sendCrmMessage(convChat.id, { text: waText }).catch(e => { console.error('[CRM] sendTreatmentPlan WA failed:', e); showT("WhatsApp-Nachricht konnte nicht gesendet werden"); });
    }
    if (lead.reviewAssignedTo) {
      try {
        const staffRes = await fmApi.getStaff();
        const staffMembers = staffRes?.staff || [];
        const doc = staffMembers.find(m => `${m.first_name} ${m.last_name}` === lead.reviewAssignedTo);
        if (doc?.id) {
          await fmApi.createTask({
            patientId: lead.id,
            assignedTo: doc.id,
            type: "graft_count",
            payload: { photos: lead.photoUrls || [] },
            notes: "Bitte Graft-Anzahl und Behandlungsplan bestimmen.",
          });
          addTL(lead.id, "system", `Task created for ${lead.reviewAssignedTo}: Graft count review`);
          // Task created successfully
        } else {
          console.warn("[CRM] Could not find doctor ID for:", lead.reviewAssignedTo);
        }
      } catch (e) {
        console.error("[CRM] Failed to create task:", e);
      }
    }
  };

  const addInternalNote = (lid) => {
    if (!newNote.trim()) return;
    setLeads(p => p.map(x => x.id === lid ? { ...x, internalNotes: [...(x.internalNotes || []), { text: newNote, author: user.name, time: new Date().toISOString() }] } : x));
    fmApi.addTimelineEntry(lid, { type: 'note', content: newNote, author: user.name }).catch(e => {
      console.error('[CRM] addInternalNote failed:', e.message || e);
    });
    setNewNote(""); showT("Note added");
  };

  return {
    generatePDF, generateMagicLink, estimateRevenue, getWeekRevenue,
    createInvoice, markInvoicePaid, generateInvoicePDF, generateStripeLink,
    generateDepositLink, sendPaymentLink, simulatePaymentReceived, exportRevenue,
    sendTreatmentPlan, addInternalNote,
  };
}
