import React, { useState } from 'react';
import { safeStr } from './safe.js';
import * as fmApi from '../../../api/client.js';

const STEPS = [
  { id: 'start', label: 'Start Setup', desc: 'Initialize WhatsApp connection for this clinic' },
  { id: 'number', label: 'Enter Number', desc: 'Customer enters their phone number in CRM' },
  { id: 'otp', label: 'Verify OTP', desc: 'Customer receives OTP, operator verifies in 360dialog' },
  { id: 'activate', label: 'Activate', desc: 'WhatsApp connected — activate clinic' },
];

export default function WaOnboardingModal({ clinic, onClose, onComplete }) {
  const [step, setStep] = useState(deriveStep(clinic));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const orgId = clinic?.id;
  const name = safeStr(clinic?.name, 'Unknown Clinic');
  const waStatus = safeStr(clinic?.wa_setup_status, 'not_started');

  async function handleAction(action) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (action === 'start') {
        await fmApi.waStart(orgId);
        await fmApi.updateWaSetupStatus(orgId, 'link_sent');
        setSuccess('WhatsApp setup initiated — link sent');
        setStep('number');
      } else if (action === 'otp_pending') {
        await fmApi.updateWaSetupStatus(orgId, 'otp_pending');
        setSuccess('Status updated — waiting for OTP');
        setStep('otp');
      } else if (action === 'verify') {
        await fmApi.waForceConnect(orgId);
        await fmApi.updateWaSetupStatus(orgId, 'verified');
        setSuccess('WhatsApp verified and connected');
        setStep('activate');
      } else if (action === 'activate') {
        await fmApi.activateClinic(orgId);
        setSuccess('Clinic activated! WhatsApp is live.');
        setTimeout(() => { onComplete?.(); onClose?.(); }, 1500);
      } else if (action === 'retry') {
        await fmApi.waRetry(orgId);
        await fmApi.updateWaSetupStatus(orgId, 'link_sent');
        setSuccess('Retrying WhatsApp setup');
        setStep('number');
      } else if (action === 'reset') {
        await fmApi.waReset(orgId);
        await fmApi.updateWaSetupStatus(orgId, 'not_started');
        setSuccess('WhatsApp config reset');
        setStep('start');
      }
    } catch (err) {
      setError(err?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  const currentStepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card, #1a2235)', borderRadius: 16, padding: 32, width: 520, maxHeight: '90vh', overflow: 'auto', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>WhatsApp Onboarding</h2>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {STEPS.map((s, i) => {
            const isActive = s.id === step;
            const isDone = i < currentStepIdx;
            const color = isDone ? '#10b981' : isActive ? '#ff8a2a' : 'rgba(255,255,255,0.1)';
            return (
              <div key={s.id} style={{ flex: 1 }}>
                <div style={{ height: 4, borderRadius: 2, background: color, transition: 'background 0.3s' }} />
                <div style={{ fontSize: 10, color: isActive ? '#ff8a2a' : isDone ? '#10b981' : 'var(--text-muted)', marginTop: 6, fontWeight: isActive ? 700 : 500 }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Messages */}
        {error && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#ef444420', color: '#ef4444', fontSize: 13, fontWeight: 600 }}>{error}</div>}
        {success && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#10b98120', color: '#10b981', fontSize: 13, fontWeight: 600 }}>{success}</div>}

        {/* Step Content */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          {step === 'start' && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Start WhatsApp Setup</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>
                This will initialize the WhatsApp connection for <strong>{name}</strong>. The customer will receive setup instructions via email.
              </p>
              <button onClick={() => handleAction('start')} disabled={loading}
                style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Starting...' : 'Start WhatsApp Setup'}
              </button>
            </>
          )}

          {step === 'number' && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Waiting for Phone Number</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.6 }}>
                The customer needs to enter their WhatsApp business phone number in their CRM settings. Once they do, click below to proceed to OTP verification.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleAction('otp_pending')} disabled={loading}
                  style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Updating...' : 'Number Received → Send OTP'}
                </button>
                <button onClick={() => handleAction('retry')} disabled={loading}
                  style={btnSecondary}>Retry Setup</button>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Verify OTP</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.6 }}>
                The customer should receive an OTP code within ~15 minutes. Once they provide it, verify in the 360dialog partner portal and click below.
              </p>
              <div style={{ padding: 12, background: 'rgba(255,138,42,0.08)', borderRadius: 8, border: '1px solid rgba(255,138,42,0.2)', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ff8a2a', marginBottom: 4 }}>360dialog Partner Portal</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Verify the OTP in your 360dialog account, then confirm below.</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleAction('verify')} disabled={loading}
                  style={{ ...btnPrimary, background: '#10b981', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Verifying...' : 'OTP Verified → Connect WhatsApp'}
                </button>
                <button onClick={() => handleAction('retry')} disabled={loading}
                  style={btnSecondary}>Retry</button>
              </div>
            </>
          )}

          {step === 'activate' && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#10b981', margin: '0 0 8px' }}>WhatsApp Connected!</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>
                WhatsApp is verified and connected. Click below to activate the clinic and make it fully live.
              </p>
              <button onClick={() => handleAction('activate')} disabled={loading}
                style={{ ...btnPrimary, background: '#10b981', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Activating...' : 'Activate Clinic → Go Live'}
              </button>
            </>
          )}
        </div>

        {/* Reset option */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Current WA status: <strong>{waStatus}</strong>
          </span>
          <button onClick={() => handleAction('reset')} disabled={loading}
            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
            Reset WA Config
          </button>
        </div>
      </div>
    </div>
  );
}

function deriveStep(clinic) {
  const wa = clinic?.wa_setup_status || 'not_started';
  if (wa === 'verified') return 'activate';
  if (wa === 'otp_pending') return 'otp';
  if (wa === 'link_sent') return 'number';
  return 'start';
}

const btnPrimary = { background: '#ff8a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnSecondary = { background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
