import { useState } from 'react';

/**
 * KVKK Compliance Confirmation Modal
 *
 * Shown to Turkish clinics (country = 'TR') in the setup wizard.
 * Clinic admin must read and explicitly check the confirmation box
 * before they can proceed. Button stays disabled until checked.
 *
 * On confirm: calls POST /api/v1/clinic/kvkk/confirm → updates backend.
 * On success: calls onConfirmed() so parent can refresh clinic state.
 */

const LEGAL_TEXT = {
  tr: {
    title: "KVKK Uyumluluk Onayı",
    subtitle: "6698 Sayılı Kişisel Verilerin Korunması Kanunu",
    body: [
      {
        heading: "Veri Sorumlusu Olarak Kliniğinizin Yükümlülükleri",
        text: "Kliniğiniz, hastaların kişisel verilerini işleyen taraf olarak 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında Veri Sorumlusu sıfatını taşımaktadır. Flowmatix, bu verileri yalnızca kliniğinizin talimatları doğrultusunda işleyen bir Veri İşleyeni olarak hareket etmektedir.",
      },
      {
        heading: "VERBİS Kayıt Zorunluluğu",
        text: "Türkiye'de kişisel veri işleyen tüm veri sorumluları, Kişisel Verileri Koruma Kurumu'nun (KVKK) Veri Sorumluları Sicil Bilgi Sistemi'ne (VERBİS) kayıt yaptırmakla yükümlüdür. Kliniğinizin VERBİS'e kayıtlı olmaması halinde idari para cezasıyla karşılaşabilirsiniz. Kayıt için: verbis.kvkk.gov.tr",
      },
      {
        heading: "Hasta Açık Rızası",
        text: "KVKK Madde 6 uyarınca sağlık verisi özel nitelikli kişisel veri kapsamındadır. Hastaların sağlık verilerinin işlenmesi için açık rızaları alınmalıdır. Bu rızanın alınması kliniğinizin sorumluluğundadır. Flowmatix'in WhatsApp botu aracılığıyla rıza alınmakta olup bu süreç kliniğinizin denetiminde yürütülmektedir.",
      },
      {
        heading: "Flowmatix'in Rolü",
        text: "Flowmatix, 6698 sayılı KVKK ve AB Genel Veri Koruma Tüzüğü (GDPR) kapsamında bir Veri İşleyeni olarak hareket etmektedir. Veriler, AB-Türkiye standart sözleşme maddelerine uygun olarak Almanya'daki sunucularda işlenmektedir. Veri İşleme Sözleşmesi (DPA/AVV) platform kullanımına başlamadan önce taraflar arasında akdedilmiştir.",
      },
    ],
    checkboxLabel: "Kliniğimin, KVKK kapsamındaki tüm yükümlülüklerini okuduğumu ve anladığımı, kliniğimin Veri Sorumlusu sıfatıyla bu yükümlülükleri yerine getireceğini onaylıyorum.",
    confirmBtn: "Onayla ve Devam Et",
    confirmed: "KVKK uyumluluğu onaylandı",
  },
  en: {
    title: "KVKK Compliance Confirmation",
    subtitle: "Turkish Data Protection Law (Law No. 6698)",
    body: [
      {
        heading: "Your Clinic's Obligations as Data Controller",
        text: "Your clinic, as the entity processing patients' personal data, holds the role of Data Controller under the Turkish Personal Data Protection Law (KVKK No. 6698). Flowmatix acts solely as a Data Processor, processing data only under your clinic's instructions.",
      },
      {
        heading: "VERBİS Registration Obligation",
        text: "All data controllers processing personal data in Turkey are required to register with the Data Controllers' Registry Information System (VERBİS) maintained by the Personal Data Protection Authority (KVKK). Failure to register may result in administrative fines. Registration: verbis.kvkk.gov.tr",
      },
      {
        heading: "Patient Consent Obligation",
        text: "Under KVKK Article 6, health data is classified as sensitive personal data. Explicit patient consent must be obtained before processing health data. Your clinic is responsible for ensuring this consent is valid and documented. Flowmatix's bot collects consent on your behalf, but this process remains under your clinic's supervision.",
      },
      {
        heading: "Flowmatix's Role",
        text: "Flowmatix operates as a Data Processor under KVKK and the EU General Data Protection Regulation (GDPR). Data is processed on servers in Germany in accordance with EU-Turkey standard contractual clauses. A Data Processing Agreement (DPA) has been established between the parties prior to platform use.",
      },
    ],
    checkboxLabel: "I confirm that I have read and understood my clinic's obligations under KVKK, and that my clinic, as Data Controller, will fulfil these obligations.",
    confirmBtn: "Confirm & Continue",
    confirmed: "KVKK compliance confirmed",
  },
};

export default function KvkkConfirmModal({ t, lang = 'en', onConfirmed, onClose }) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Always show TR (primary — KVKK is Turkish law) then EN below
  const sections = [LEGAL_TEXT.tr, LEGAL_TEXT.en];

  async function handleConfirm() {
    if (!checked) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/clinic/kvkk/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmed: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Confirmation failed');
      }
      onConfirmed?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-card, #131c2e)',
        border: '1px solid rgba(76,201,255,0.2)',
        borderRadius: 16,
        width: '100%', maxWidth: 720,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(167,177,195,0.1)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>⚖️</span>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#e8eefc' }}>
                {t('kvkk_modal_title') || 'KVKK Compliance Confirmation'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#4cc9ff', fontWeight: 600, paddingLeft: 32 }}>
              {t('kvkk_modal_subtitle') || 'Required for Turkish clinics'}
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(167,177,195,0.6)', fontSize: 20, lineHeight: 1, padding: 4,
            }}>✕</button>
          )}
        </div>

        {/* Scrollable legal text — both TR and EN */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px' }}>
          {sections.map((section, si) => (
            <div key={si} style={{
              borderBottom: si < sections.length - 1 ? '1px solid rgba(167,177,195,0.08)' : 'none',
              paddingTop: 20, paddingBottom: 20,
            }}>
              {/* Language label */}
              <div style={{
                display: 'inline-block', marginBottom: 14,
                padding: '2px 10px', borderRadius: 20,
                background: si === 0 ? 'rgba(76,201,255,0.12)' : 'rgba(167,177,195,0.08)',
                color: si === 0 ? '#4cc9ff' : 'rgba(167,177,195,0.5)',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {si === 0 ? 'Türkçe' : 'English'}
              </div>

              <div style={{ fontSize: 14, fontWeight: 700, color: '#e8eefc', marginBottom: 12 }}>
                {section.title}
              </div>
              <div style={{ fontSize: 11, color: '#4cc9ff', fontWeight: 600, marginBottom: 16 }}>
                {section.subtitle}
              </div>

              {section.body.map((item, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#a7b1c3', marginBottom: 4 }}>
                    {item.heading}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(167,177,195,0.8)', lineHeight: 1.7 }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Confirmation checkbox + button */}
        <div style={{
          padding: '16px 24px 20px',
          borderTop: '1px solid rgba(167,177,195,0.1)',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '0 0 16px 16px',
        }}>
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            cursor: 'pointer', marginBottom: 16,
          }}>
            <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', margin: 0 }}
              />
              <div style={{
                width: 18, height: 18, borderRadius: 5,
                border: checked ? 'none' : '2px solid rgba(167,177,195,0.4)',
                background: checked ? 'linear-gradient(135deg,#4cc9ff,#2da8ff)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {checked && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</span>}
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#e8eefc', lineHeight: 1.6 }}>
              <div style={{ marginBottom: 4 }}>{LEGAL_TEXT.tr.checkboxLabel}</div>
              <div style={{ color: 'rgba(167,177,195,0.6)', fontSize: 11 }}>{LEGAL_TEXT.en.checkboxLabel}</div>
            </div>
          </label>

          {error && (
            <div style={{
              marginBottom: 12, padding: '8px 12px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171', fontSize: 12,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!checked || loading}
            style={{
              width: '100%', padding: '12px 24px',
              borderRadius: 10, border: 'none',
              background: checked
                ? 'linear-gradient(135deg,#4cc9ff,#2da8ff)'
                : 'rgba(167,177,195,0.1)',
              color: checked ? '#fff' : 'rgba(167,177,195,0.3)',
              fontWeight: 700, fontSize: 14,
              cursor: checked && !loading ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '...' : (t('kvkk_confirm_btn') || 'Confirm & Continue')}
          </button>

          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 10, color: 'rgba(167,177,195,0.35)' }}>
            Flowmatix · Data Processor · KVKK Art. 3(1)(ı) · Confirmation logged with IP + timestamp
          </div>
        </div>
      </div>
    </div>
  );
}
