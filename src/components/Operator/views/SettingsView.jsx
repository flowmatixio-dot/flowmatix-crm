import React, { useState, useEffect, useCallback } from 'react';
import { safeStr, safeNum } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

const ALERT_RULES = [
  { key: 'wa_disconnected', label: 'WhatsApp disconnected', desc: 'Alert when active clinic loses WA connection' },
  { key: 'message_failures', label: 'Message failures', desc: 'Alert on >5 failed messages in 5 min' },
  { key: 'queue_stuck', label: 'Queue stuck', desc: 'Alert on >100 pending or >5 failed jobs' },
  { key: 'disk_usage', label: 'Disk usage', desc: 'Alert when disk >85%' },
  { key: 'ai_failures', label: 'AI failures', desc: 'Alert on >=3 AI errors in 1 hour' },
  { key: 'backup_overdue', label: 'Backup overdue', desc: 'Alert when no backup in 25 hours' },
];

export default function SettingsView() {
  const [apiKeys, setApiKeys] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [alertToggles, setAlertToggles] = useState(() => {
    const saved = {}; ALERT_RULES.forEach(r => saved[r.key] = true); return saved;
  });

  const load = useCallback(() => {
    Promise.all([
      fmApi.getApiKeys().catch(() => ({ apiKeys: [] })),
      fmApi.getSessions().catch(() => ({ sessions: [] })),
      fmApi.getOperatorSettings().catch(() => null),
    ]).then(([k, sess, s]) => {
      setApiKeys(Array.isArray(k?.apiKeys) ? k.apiKeys : Array.isArray(k) ? k : []);
      setSessions(Array.isArray(sess?.sessions) ? sess.sessions : Array.isArray(sess) ? sess : []);
      if (s && typeof s === 'object') {
        setSettings(s);
        if (s.alert_rules) try { setAlertToggles(prev => ({ ...prev, ...s.alert_rules })); } catch {}
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (text, type = 'ok') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await fmApi.createApiKey({ name: newKeyName.trim() });
      if (res?.key) setCreatedKey(res.key);
      setNewKeyName(''); load(); flash('API key created');
    } catch { flash('Failed to create key', 'err'); }
  };

  const revokeKey = async (id) => {
    if (!confirm('Revoke this API key?')) return;
    try { await fmApi.revokeApiKey(id); setApiKeys(prev => prev.filter(k => k.id !== id)); flash('Key revoked'); } catch { flash('Failed', 'err'); }
  };

  const revokeSession = async (id) => {
    try { await fmApi.revokeSession(id); setSessions(prev => prev.filter(s => s.id !== id)); flash('Session revoked'); } catch { flash('Failed', 'err'); }
  };

  const saveAlertRules = async () => {
    try {
      await fmApi.saveOperatorSettings({ ...settings, alert_rules: alertToggles });
      flash('Alert rules saved');
    } catch { flash('Save failed', 'err'); }
  };

  const savePlatformConfig = async () => {
    try { await fmApi.saveOperatorSettings(settings); flash('Settings saved'); } catch { flash('Save failed', 'err'); }
  };

  const handleSettingChange = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  const editableSettings = settings && typeof settings === 'object'
    ? Object.entries(settings).filter(([k]) => !['id', 'created_at', 'updated_at', 'alert_rules'].includes(k))
    : [];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 24px' }}>Settings</h1>
      {msg && <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: msg.type === 'ok' ? '#22c55e20' : '#ef444420', color: msg.type === 'ok' ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: 600 }}>{msg.text}</div>}

      {/* ═══ 1. SECURITY — Sessions ═══ */}
      <SectionTitle>Security</SectionTitle>
      <div style={card}>
        <h3 style={subH}>Active Sessions</h3>
        {sessions.length === 0 ? <Muted>No active sessions</Muted> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sessions.map((s, i) => (
              <div key={s.id || i} style={row}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{safeStr(s.user_email || s.email, 'Unknown')}</span>
                <span style={meta}>{safeStr(s.ip_address || s.ip, '—')}</span>
                <span style={meta}>{(safeStr(s.user_agent, '')).slice(0, 30) || '—'}</span>
                <span style={meta}>{s.last_active ? new Date(s.last_active).toLocaleString('de-DE') : '—'}</span>
                <button onClick={() => revokeSession(s.id)} style={dangerBtn}>Revoke</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ 2. API KEYS ═══ */}
      <SectionTitle>API & Integrations</SectionTitle>
      <div style={card}>
        <h3 style={subH}>API Keys</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name..." onKeyDown={e => e.key === 'Enter' && createKey()} style={{ ...inputStyle, width: 240 }} />
          <button onClick={createKey} style={primaryBtn}>Create Key</button>
        </div>
        {createdKey && (
          <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 12, background: '#22c55e15', border: '1px solid #22c55e40' }}>
            <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginBottom: 4 }}>Copy now (shown only once):</div>
            <code style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{createdKey}</code>
          </div>
        )}
        {apiKeys.length === 0 ? <Muted>No API keys</Muted> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {apiKeys.map((k, i) => (
              <div key={k.id || i} style={row}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{safeStr(k.name)}</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{safeStr(k.key_preview, '***')}</span>
                <span style={{ fontSize: 11, color: k.revoked_at ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{k.revoked_at ? 'Revoked' : 'Active'}</span>
                <span style={meta}>{k.created_at ? new Date(k.created_at).toLocaleDateString('de-DE') : ''}</span>
                {!k.revoked_at && <button onClick={() => revokeKey(k.id)} style={dangerBtn}>Revoke</button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ 3. ALERT RULES ═══ */}
      <SectionTitle>Monitoring & Alerts</SectionTitle>
      <div style={card}>
        <h3 style={subH}>Alert Rules</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {ALERT_RULES.map(rule => (
            <div key={rule.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                <input type="checkbox" checked={alertToggles[rule.key] !== false} onChange={e => setAlertToggles(prev => ({ ...prev, [rule.key]: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{rule.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rule.desc}</div>
                </div>
              </label>
            </div>
          ))}
        </div>
        <button onClick={saveAlertRules} style={primaryBtn}>Save Alert Rules</button>
      </div>

      {/* ═══ 4. AI SYSTEM ═══ */}
      <SectionTitle>AI System</SectionTitle>
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Model</label>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>claude-sonnet-4-20250514</div>
          </div>
          <div>
            <label style={labelStyle}>Max Tokens</label>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>512</div>
          </div>
          <div>
            <label style={labelStyle}>Retry on Failure</label>
            <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>Enabled (via circuit breaker)</div>
          </div>
          <div>
            <label style={labelStyle}>Cost per Response</label>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>~$0.007</div>
          </div>
        </div>
      </div>

      {/* ═══ 5. PLATFORM CONFIG ═══ */}
      <SectionTitle>Platform Config</SectionTitle>
      <div style={card}>
        {editableSettings.length === 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { key: 'default_trial_days', label: 'Trial Duration (days)', value: 3 },
              { key: 'max_test_messages', label: 'Max Test Messages', value: 20 },
              { key: 'data_retention_days', label: 'Data Retention (days)', value: 90 },
            ].map(cfg => (
              <div key={cfg.key}>
                <label style={labelStyle}>{cfg.label}</label>
                <input type="number" value={settings?.[cfg.key] ?? cfg.value} onChange={e => handleSettingChange(cfg.key, Number(e.target.value))} style={inputStyle} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {editableSettings.map(([key, value]) => (
              <div key={key}>
                <label style={labelStyle}>{key.replace(/_/g, ' ')}</label>
                {typeof value === 'boolean' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={value} onChange={e => handleSettingChange(key, e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--brand)' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{value ? 'Enabled' : 'Disabled'}</span>
                  </label>
                ) : typeof value === 'number' ? (
                  <input type="number" value={value} onChange={e => handleSettingChange(key, Number(e.target.value))} style={inputStyle} />
                ) : typeof value === 'string' ? (
                  <input type="text" value={value} onChange={e => handleSettingChange(key, e.target.value)} style={inputStyle} />
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{JSON.stringify(value)}</div>
                )}
              </div>
            ))}
          </div>
        )}
        <button onClick={savePlatformConfig} style={{ ...primaryBtn, marginTop: 16 }}>Save Config</button>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)', margin: '28px 0 12px', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>{children}</h2>;
}
function Muted({ children }) { return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{children}</div>; }

const card = { background: 'var(--bg-card)', borderRadius: 14, padding: '22px 24px', marginBottom: 14, border: '1px solid var(--border-subtle)' };
const subH = { fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' };
const row = { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 8 };
const meta = { fontSize: 11, color: 'var(--text-muted)' };
const labelStyle = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', marginBottom: 6, display: 'block' };
const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '9px 16px', color: 'var(--text-primary)', fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const primaryBtn = { background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' };
const dangerBtn = { background: 'var(--error-subtle)', color: 'var(--error)', border: '1px solid var(--error-muted)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' };
