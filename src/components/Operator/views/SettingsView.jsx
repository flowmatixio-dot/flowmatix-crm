import React, { useState, useEffect } from 'react';
import * as fmApi from '../../../api/client.js';

export default function SettingsView() {
  const [settings, setSettings] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    Promise.all([
      fmApi.getOperatorSettings?.().catch(() => ({})),
      fmApi.getApiKeys?.().catch(() => ({ apiKeys: [] })),
      fmApi.getSubscriptionPlans?.().catch(() => ({ plans: [] })),
    ]).then(([s, k, p]) => { setSettings(s); setApiKeys(k?.apiKeys || []); setPlans(p?.plans || []); setLoading(false); });
  }, []);

  const saveSettings = async () => {
    try {
      await fmApi.saveOperatorSettings?.(settings);
      setMsg({ type: 'ok', text: 'Settings saved' });
    } catch { setMsg({ type: 'err', text: 'Save failed' }); }
    setTimeout(() => setMsg(null), 3000);
  };

  const revokeKey = async (id) => {
    try { await fmApi.revokeApiKey?.(id); setApiKeys(prev => prev.filter(k => k.id !== id)); } catch {}
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  const card = { background: 'var(--bg-card)', borderRadius: 10, padding: 20, marginBottom: 20 };
  const label = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', marginBottom: 6 };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 20px' }}>Settings</h1>

      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: msg.type === 'ok' ? '#10b98120' : '#ef444420', color: msg.type === 'ok' ? '#10b981' : '#ef4444', fontSize: 13, fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      {/* Plan Limits */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Subscription Plans</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200, 1fr))', gap: 12 }}>
          {plans.map(p => (
            <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>€{((p.price_monthly || 0) / 100).toLocaleString('de-DE')}/mo</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {p.patient_limit ? `${p.patient_limit} patients` : 'Unlimited'} · {p.max_languages || 1} lang
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>API Keys</h2>
        {apiKeys.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No API keys configured</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {apiKeys.map(k => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{k.name}</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{k.key_preview || '***'}</span>
                <span style={{ fontSize: 11, color: k.revoked_at ? '#ef4444' : '#10b981' }}>{k.revoked_at ? 'Revoked' : 'Active'}</span>
                {!k.revoked_at && (
                  <button onClick={() => revokeKey(k.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Revoke</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Config */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>System Configuration</h2>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Platform settings are managed via the API. Use the operator API endpoints to configure system behavior.
        </div>
        <button onClick={saveSettings} style={{ marginTop: 16, background: '#ff8a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Save Settings
        </button>
      </div>
    </div>
  );
}
