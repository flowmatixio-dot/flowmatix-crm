import { useState } from 'react';

const CATEGORIES = [
  { value: 'support', label: 'Support' },
  { value: 'debugging', label: 'Debugging' },
  { value: 'billing', label: 'Billing' },
  { value: 'incident', label: 'Incident' },
  { value: 'onboarding', label: 'Onboarding' },
];

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 9999,
};

const box = {
  background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, padding: 24, width: 420, maxWidth: '90vw',
  display: 'flex', flexDirection: 'column', gap: 16,
};

const label = { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 4, display: 'block' };

const input = {
  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};

const btnRow = { display: 'flex', gap: 8, justifyContent: 'flex-end' };

export default function ImpersonationDialog({ clinicName, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reasonOk = reason.trim().length >= 10;
  const categoryOk = !!category;
  const canSubmit = reasonOk && categoryOk && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await onConfirm({ reason: reason.trim(), category });
    } catch (e) {
      setError(e.message || 'Fehler');
      setLoading(false);
    }
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={box}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
          Klinik impersonieren{clinicName ? `: ${clinicName}` : ''}
        </div>

        <div>
          <label style={label}>Kategorie *</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ ...input, cursor: 'pointer' }}
          >
            <option value="">— bitte wählen —</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label style={label}>
            Begründung * <span style={{ color: reason.trim().length >= 10 ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
              ({reason.trim().length}/10 min)
            </span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Warum wird diese Klinik impersoniert? (mind. 10 Zeichen)"
            rows={3}
            style={{ ...input, resize: 'vertical' }}
          />
        </div>

        {error && <div style={{ color: '#ef4444', fontSize: 12 }}>{error}</div>}

        <div style={btnRow}>
          <button onClick={onCancel} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: canSubmit ? '#c4a6ff' : 'rgba(196,166,255,0.3)', color: canSubmit ? '#1a1a2e' : 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >
            {loading ? 'Wird geöffnet...' : 'Impersonieren'}
          </button>
        </div>
      </div>
    </div>
  );
}
