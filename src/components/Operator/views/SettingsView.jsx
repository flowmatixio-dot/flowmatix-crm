import React, { useState, useEffect, useCallback } from 'react';
import { safeStr, safeNum } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

export default function SettingsView() {
  const [settings, setSettings] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);

  const load = useCallback(() => {
    Promise.all([
      fmApi.getOperatorSettings().catch(() => ({})),
      fmApi.getApiKeys().catch(() => ({ apiKeys: [] })),
      fmApi.getSubscriptionPlans().catch(() => ({ plans: [] })),
      fmApi.getSessions().catch(() => ({ sessions: [] })),
    ]).then(([s, k, p, sess]) => {
      setSettings(s);
      setApiKeys(Array.isArray(k?.apiKeys) ? k.apiKeys : Array.isArray(k) ? k : []);
      setPlans(Array.isArray(p?.plans) ? p.plans : Array.isArray(p) ? p : []);
      setSessions(Array.isArray(sess?.sessions) ? sess.sessions : Array.isArray(sess) ? sess : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (text, type = 'ok') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

  const saveSettings = async () => {
    try {
      await fmApi.saveOperatorSettings(settings);
      flash('Settings saved');
    } catch { flash('Save failed', 'err'); }
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await fmApi.createApiKey({ name: newKeyName.trim() });
      if (res?.key) setCreatedKey(res.key);
      setNewKeyName('');
      load();
      flash('API key created');
    } catch { flash('Failed to create key', 'err'); }
  };

  const revokeKey = async (id) => {
    if (!confirm('Revoke this API key?')) return;
    try {
      await fmApi.revokeApiKey(id);
      setApiKeys(prev => prev.filter(k => k.id !== id));
      flash('Key revoked');
    } catch { flash('Revoke failed', 'err'); }
  };

  const revokeSession = async (id) => {
    try {
      await fmApi.revokeSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      flash('Session revoked');
    } catch { flash('Revoke failed', 'err'); }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  const card = { background: 'var(--bg-card)', borderRadius: 10, padding: 20, marginBottom: 20 };
  const labelStyle = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', marginBottom: 6, display: 'block' };
  const inputStyle = { background: 'var(--bg-input, rgba(255,255,255,0.06))', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', color: 'var(--text-primary)', fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box' };

  // Extract editable settings
  const editableSettings = settings && typeof settings === 'object' ? Object.entries(settings).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)) : [];

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {plans.map((p, i) => (
            <div key={p.id || i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16, borderTop: `3px solid ${planColor(p.slug || p.name)}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{safeStr(p.name)}</div>
              <div style={{ fontSize: 14, color: '#10b981', fontWeight: 700, marginTop: 6 }}>
                EUR {((safeNum(p.price_monthly) || 0) / 100).toLocaleString('de-DE')}/mo
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
                <div>Patients: {safeNum(p.patient_limit) || 'Unlimited'}</div>
                <div>Languages: {safeNum(p.max_languages) || 1}</div>
                <div>Doctors: {safeNum(p.max_doctors) || 1}</div>
                <div>Users: {safeNum(p.max_users) || 1}</div>
                {p.features && typeof p.features === 'string' && <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>{p.features}</div>}
              </div>
            </div>
          ))}
          {plans.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No plans configured</div>}
        </div>
      </div>

      {/* API Keys */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>API Keys</h2>

        {/* Create new key */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="Key name..."
            onKeyDown={e => e.key === 'Enter' && createKey()}
            style={{ ...inputStyle, width: 240 }}
          />
          <button onClick={createKey} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Create Key
          </button>
        </div>

        {/* Show newly created key */}
        {createdKey && (
          <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 12, background: '#10b98115', border: '1px solid #10b98140' }}>
            <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginBottom: 4 }}>New key created -- copy it now (shown only once):</div>
            <code style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{createdKey}</code>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No API keys configured</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {apiKeys.map((k, i) => (
              <div key={k.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{safeStr(k.name)}</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{safeStr(k.key_preview, '***')}</span>
                <span style={{ fontSize: 11, color: k.revoked_at ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                  {k.revoked_at ? 'Revoked' : 'Active'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {k.created_at ? new Date(k.created_at).toLocaleDateString('de-DE') : ''}
                </span>
                {!k.revoked_at && (
                  <button onClick={() => revokeKey(k.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Active Sessions</h2>
        {sessions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active sessions</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map((s, i) => (
              <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                  {safeStr(s.user_email || s.email, 'Unknown')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{safeStr(s.ip_address || s.ip, '---')}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{safeStr(s.user_agent, '---').slice(0, 40)}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {s.last_active ? new Date(s.last_active).toLocaleString('de-DE') : s.created_at ? new Date(s.created_at).toLocaleString('de-DE') : '---'}
                </span>
                <button onClick={() => revokeSession(s.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Configuration */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>System Configuration</h2>
        {editableSettings.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            No editable settings available. Platform settings are managed via the API.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {editableSettings.map(([key, value]) => (
              <div key={key}>
                <label style={labelStyle}>{key.replace(/_/g, ' ')}</label>
                {typeof value === 'boolean' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={e => handleSettingChange(key, e.target.checked)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{value ? 'Enabled' : 'Disabled'}</span>
                  </label>
                ) : typeof value === 'number' ? (
                  <input
                    type="number"
                    value={value}
                    onChange={e => handleSettingChange(key, Number(e.target.value))}
                    style={inputStyle}
                  />
                ) : typeof value === 'string' ? (
                  <input
                    type="text"
                    value={value}
                    onChange={e => handleSettingChange(key, e.target.value)}
                    style={inputStyle}
                  />
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{JSON.stringify(value)}</div>
                )}
              </div>
            ))}
          </div>
        )}
        <button onClick={saveSettings} style={{ marginTop: 16, background: '#ff8a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Save Settings
        </button>
      </div>

      {/* Alert Rules Placeholder */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>Alert Rules</h2>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 16, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
          Alert rules configuration coming soon. Currently managed via n8n workflows.
        </div>
      </div>
    </div>
  );
}

function planColor(slug) {
  if (typeof slug !== 'string') return '#3b82f6';
  const s = slug.toLowerCase();
  if (s.includes('enterprise')) return '#a78bfa';
  if (s.includes('operations') || s.includes('ops')) return '#f97316';
  if (s.includes('pro')) return '#3b82f6';
  return '#10b981';
}
