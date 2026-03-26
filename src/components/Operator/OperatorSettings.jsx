import React, { useState, useEffect, useCallback } from "react";
import * as api from "../../api/client";

/* ═══════════════════════════════════════════════════════════
   STYLES — matches existing Operator Panel dark theme
   ═══════════════════════════════════════════════════════════ */
const accent = "#d4af37";
const green = "#22c55e";
const red = "#ef4444";

const S = {
  wrapper: { display: "flex", gap: 0, minHeight: "calc(100vh - 140px)" },
  sidebar: {
    width: 220, flexShrink: 0, background: "rgba(255,255,255,0.02)",
    borderRadius: "12px 0 0 12px", border: "1px solid rgba(255,255,255,0.04)",
    padding: "16px 0", position: "sticky", top: 80, alignSelf: "flex-start",
  },
  sidebarLabel: {
    fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.35)",
    textTransform: "uppercase", letterSpacing: 1.2, padding: "12px 20px 6px",
  },
  sidebarItem: (active) => ({
    padding: "10px 20px", fontSize: 13, fontWeight: active ? 700 : 500,
    color: active ? "#fff" : "rgba(167,177,195,0.6)", cursor: "pointer",
    background: active ? "rgba(212,175,55,0.08)" : "transparent",
    borderLeft: active ? `3px solid ${accent}` : "3px solid transparent",
    transition: "all .2s", display: "flex", alignItems: "center", gap: 10,
  }),
  content: {
    flex: 1, padding: "0 32px", maxWidth: 800,
  },
  sectionTitle: {
    fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13, color: "rgba(167,177,195,0.5)", marginBottom: 24,
  },
  card: {
    background: "#162032", borderRadius: 12, padding: 24, marginBottom: 16,
    border: "1px solid rgba(255,255,255,0.04)",
  },
  cardTitle: {
    fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 16,
  },
  fieldRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: "rgba(232,238,252,0.85)" },
  fieldDesc: { fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 2 },
  input: {
    width: 280, padding: "9px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#fff", fontFamily: "inherit", fontSize: 13, outline: "none",
    transition: "border-color .2s",
  },
  select: {
    width: 280, padding: "9px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#fff", fontFamily: "inherit", fontSize: 13, outline: "none",
    cursor: "pointer", appearance: "none",
  },
  btn: (primary) => ({
    padding: "10px 24px", borderRadius: 10, border: "none",
    background: primary ? accent : "rgba(255,255,255,0.06)",
    color: primary ? "#0f1623" : "rgba(167,177,195,0.7)",
    fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    transition: "all .2s",
  }),
  btnDanger: {
    padding: "10px 24px", borderRadius: 10, border: "none",
    background: "rgba(239,68,68,0.12)", color: red,
    fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  },
  saved: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 12, fontWeight: 600, color: green, marginLeft: 12,
  },
};

/* ═══════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function SettingsInput({ label, desc, value, onChange, type = "text", placeholder }) {
  return (
    <div style={S.fieldRow}>
      <div>
        <div style={S.fieldLabel}>{label}</div>
        {desc && <div style={S.fieldDesc}>{desc}</div>}
      </div>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={S.input}
      />
    </div>
  );
}

function SettingsDropdown({ label, desc, value, onChange, options }) {
  return (
    <div style={S.fieldRow}>
      <div>
        <div style={S.fieldLabel}>{label}</div>
        {desc && <div style={S.fieldDesc}>{desc}</div>}
      </div>
      <div style={{ position: "relative" }}>
        <select value={value || ""} onChange={(e) => onChange(e.target.value)} style={S.select}>
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: "#162032" }}>
              {o.label}
            </option>
          ))}
        </select>
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(167,177,195,0.4)", fontSize: 10, pointerEvents: "none" }}>▼</span>
      </div>
    </div>
  );
}

function SettingsToggle({ label, desc, value, onChange }) {
  return (
    <div style={S.fieldRow}>
      <div>
        <div style={S.fieldLabel}>{label}</div>
        {desc && <div style={S.fieldDesc}>{desc}</div>}
      </div>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: "pointer",
          background: value ? accent : "rgba(255,255,255,0.08)",
          transition: "background .2s", position: "relative", flexShrink: 0,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 9, background: "#fff",
          position: "absolute", top: 3, left: value ? 23 : 3,
          transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }} />
      </div>
    </div>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div style={S.card}>
      {title && <div style={S.cardTitle}>{title}</div>}
      {children}
    </div>
  );
}

function SaveBar({ dirty, saving, onSave, onReset, saved }) {
  if (!dirty && !saved) return null;
  return (
    <div style={{
      position: "sticky", bottom: 0, padding: "16px 0", marginTop: 8,
      background: "linear-gradient(transparent, #0f1623 30%)",
      display: "flex", alignItems: "center", gap: 12, zIndex: 10,
    }}>
      {dirty && (
        <>
          <button style={S.btn(true)} onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button style={S.btn(false)} onClick={onReset}>Discard</button>
        </>
      )}
      {saved && <span style={S.saved}>✓ Saved successfully</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NAV CATEGORIES
   ═══════════════════════════════════════════════════════════ */
const categories = [
  { group: "General", items: [
    { id: "account", icon: "👤", label: "Account" },
    { id: "notifications", icon: "🔔", label: "Notifications" },
    { id: "platform", icon: "🏢", label: "Platform" },
  ]},
  { group: "Configuration", items: [
    { id: "ai", icon: "🤖", label: "AI Configuration" },
    { id: "automation", icon: "⚡", label: "Automation Defaults" },
    { id: "whatsapp", icon: "💬", label: "WhatsApp System" },
    { id: "storage", icon: "💾", label: "Storage" },
  ]},
  { group: "Security & API", items: [
    { id: "security", icon: "🛡️", label: "Security" },
    { id: "api", icon: "🔑", label: "API Settings" },
  ]},
];

/* ═══════════════════════════════════════════════════════════
   SECTION PANELS
   ═══════════════════════════════════════════════════════════ */

function AccountPanel({ state, set }) {
  return (
    <>
      <div style={S.sectionTitle}>Account</div>
      <div style={S.sectionDesc}>Manage your personal account information and credentials.</div>

      <SettingsSection title="Profile">
        <SettingsInput label="Full Name" value={state.name} onChange={(v) => set("name", v)} placeholder="Your name" />
        <SettingsInput label="Email" desc="Used for login and notifications" value={state.email} onChange={(v) => set("email", v)} type="email" placeholder="you@example.com" />
        <SettingsInput label="Phone" desc="Optional, for 2FA recovery" value={state.phone} onChange={(v) => set("phone", v)} type="tel" placeholder="+49..." />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsDropdown label="Timezone" value={state.timezone} onChange={(v) => set("timezone", v)} options={[
          { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
          { value: "Europe/Istanbul", label: "Europe/Istanbul (TRT)" },
          { value: "Europe/London", label: "Europe/London (GMT)" },
          { value: "America/New_York", label: "America/New York (EST)" },
          { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
        ]} />
        <SettingsDropdown label="Language" value={state.language} onChange={(v) => set("language", v)} options={[
          { value: "en", label: "English" },
          { value: "de", label: "Deutsch" },
          { value: "tr", label: "Türkçe" },
          { value: "es", label: "Español" },
          { value: "fr", label: "Français" },
          { value: "it", label: "Italiano" },
          { value: "pt", label: "Português" },
        ]} />
      </SettingsSection>

      <SettingsSection title="Password">
        <SettingsInput label="New Password" type="password" value={state.newPassword} onChange={(v) => set("newPassword", v)} placeholder="Enter new password" />
        <SettingsInput label="Confirm Password" type="password" value={state.confirmPassword} onChange={(v) => set("confirmPassword", v)} placeholder="Confirm new password" />
      </SettingsSection>
    </>
  );
}

function NotificationsPanel({ state, set }) {
  return (
    <>
      <div style={S.sectionTitle}>Notifications</div>
      <div style={S.sectionDesc}>Control how and when you receive alerts.</div>

      <SettingsSection title="Channels">
        <SettingsToggle label="Email Notifications" desc="Receive alerts via email for critical events" value={state.emailNotifications} onChange={(v) => set("emailNotifications", v)} />
        <SettingsToggle label="Browser Push Notifications" desc="Desktop notifications for real-time events" value={state.browserPush} onChange={(v) => set("browserPush", v)} />
        <SettingsToggle label="Sound Alerts" desc="Play sound for new payments and messages" value={state.soundAlerts} onChange={(v) => set("soundAlerts", v)} />
      </SettingsSection>

      <SettingsSection title="Event Types">
        <SettingsToggle label="New Applications" desc="When a clinic submits an application" value={state.notifyApplications} onChange={(v) => set("notifyApplications", v)} />
        <SettingsToggle label="Payments" desc="When a payment is received" value={state.notifyPayments} onChange={(v) => set("notifyPayments", v)} />
        <SettingsToggle label="Incidents" desc="When a system incident is detected" value={state.notifyIncidents} onChange={(v) => set("notifyIncidents", v)} />
        <SettingsToggle label="Onboarding Stuck" desc="When a clinic is stuck in onboarding for >48h" value={state.notifyOnboardingStuck} onChange={(v) => set("notifyOnboardingStuck", v)} />
      </SettingsSection>
    </>
  );
}

function PlatformPanel({ state, set }) {
  return (
    <>
      <div style={S.sectionTitle}>Platform Settings</div>
      <div style={S.sectionDesc}>Global configuration for the Flowmatix platform.</div>

      <SettingsSection title="Branding">
        <SettingsInput label="Platform Name" desc="Displayed in emails and UI" value={state.platformName} onChange={(v) => set("platformName", v)} placeholder="Flowmatix" />
        <SettingsInput label="Support Email" desc="Shown to clinics for support" value={state.supportEmail} onChange={(v) => set("supportEmail", v)} type="email" placeholder="info@flowmatix.io" />
      </SettingsSection>

      <SettingsSection title="Defaults">
        <SettingsDropdown label="Default Timezone" desc="Applied to new clinics" value={state.defaultTimezone} onChange={(v) => set("defaultTimezone", v)} options={[
          { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
          { value: "Europe/Istanbul", label: "Europe/Istanbul (TRT)" },
          { value: "Europe/London", label: "Europe/London (GMT)" },
          { value: "America/New_York", label: "America/New York (EST)" },
        ]} />
        <SettingsDropdown label="Default Language" desc="Default language for new clinics" value={state.defaultLanguage} onChange={(v) => set("defaultLanguage", v)} options={[
          { value: "en", label: "English" },
          { value: "de", label: "Deutsch" },
          { value: "tr", label: "Türkçe" },
        ]} />
      </SettingsSection>
    </>
  );
}

function AIPanel({ state, set }) {
  return (
    <>
      <div style={S.sectionTitle}>AI Configuration</div>
      <div style={S.sectionDesc}>Global AI defaults applied to clinic automations.</div>

      <SettingsSection title="Model">
        <SettingsDropdown label="Default AI Model" desc="Primary model for conversation handling" value={state.aiModel} onChange={(v) => set("aiModel", v)} options={[
          { value: "gpt-4o", label: "GPT-4o (Recommended)" },
          { value: "gpt-4o-mini", label: "GPT-4o Mini (Faster)" },
          { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
          { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 (Fast)" },
        ]} />
        <SettingsDropdown label="Fallback Model" desc="Used when primary model is unavailable" value={state.aiFallback} onChange={(v) => set("aiFallback", v)} options={[
          { value: "gpt-4o-mini", label: "GPT-4o Mini" },
          { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
        ]} />
      </SettingsSection>

      <SettingsSection title="Behavior">
        <SettingsDropdown label="Response Length" desc="Controls verbosity of AI responses" value={state.aiResponseLength} onChange={(v) => set("aiResponseLength", v)} options={[
          { value: "concise", label: "Concise" },
          { value: "balanced", label: "Balanced (Recommended)" },
          { value: "detailed", label: "Detailed" },
        ]} />
        <SettingsInput label="Temperature" desc="0.0 = deterministic, 1.0 = creative" value={state.aiTemperature} onChange={(v) => set("aiTemperature", v)} type="number" placeholder="0.7" />
        <SettingsInput label="Max Conversation Length" desc="Maximum messages per conversation before escalation" value={state.aiMaxConversation} onChange={(v) => set("aiMaxConversation", v)} type="number" placeholder="50" />
      </SettingsSection>
    </>
  );
}

function AutomationPanel({ state, set }) {
  return (
    <>
      <div style={S.sectionTitle}>Automation Defaults</div>
      <div style={S.sectionDesc}>Default timing rules applied to clinic automations.</div>

      <SettingsSection title="Lead Management">
        <SettingsInput label="Lead Timeout" desc="Hours before a lead is marked inactive" value={state.leadTimeout} onChange={(v) => set("leadTimeout", v)} type="number" placeholder="48" />
        <SettingsInput label="Auto Reply Delay" desc="Seconds before AI sends first response" value={state.autoReplyDelay} onChange={(v) => set("autoReplyDelay", v)} type="number" placeholder="3" />
      </SettingsSection>

      <SettingsSection title="Conversations">
        <SettingsInput label="Conversation Close Timer" desc="Hours of inactivity before auto-closing" value={state.conversationCloseTimer} onChange={(v) => set("conversationCloseTimer", v)} type="number" placeholder="72" />
        <SettingsInput label="Follow-up Reminder" desc="Hours after last message to send reminder" value={state.reminderTiming} onChange={(v) => set("reminderTiming", v)} type="number" placeholder="24" />
      </SettingsSection>

      <SettingsSection title="Photo Collection">
        <SettingsInput label="Photo Reminder Delay" desc="Hours before reminding patient for photos" value={state.photoReminderDelay} onChange={(v) => set("photoReminderDelay", v)} type="number" placeholder="12" />
        <SettingsInput label="Max Photo Reminders" desc="Maximum number of photo reminder messages" value={state.maxPhotoReminders} onChange={(v) => set("maxPhotoReminders", v)} type="number" placeholder="3" />
      </SettingsSection>
    </>
  );
}

function WhatsAppPanel({ state, set }) {
  return (
    <>
      <div style={S.sectionTitle}>WhatsApp System</div>
      <div style={S.sectionDesc}>Global WhatsApp configuration for the platform.</div>

      <SettingsSection title="Provider">
        <SettingsDropdown label="WhatsApp Provider" value={state.waProvider} onChange={(v) => set("waProvider", v)} options={[
          { value: "meta_cloud", label: "Meta Cloud API (Official)" },
          { value: "360dialog", label: "360dialog" },
          { value: "twilio", label: "Twilio" },
        ]} />
        <SettingsInput label="Webhook Endpoint" desc="URL where Meta sends webhook events" value={state.waWebhookUrl} onChange={(v) => set("waWebhookUrl", v)} placeholder="https://api.flowmatix.io/webhooks/whatsapp" />
      </SettingsSection>

      <SettingsSection title="Limits">
        <SettingsInput label="Media Upload Limit" desc="Max file size in MB per upload" value={state.waMediaLimit} onChange={(v) => set("waMediaLimit", v)} type="number" placeholder="16" />
        <SettingsInput label="Max Images per Case" desc="Maximum images a patient can send per case" value={state.waMaxImages} onChange={(v) => set("waMaxImages", v)} type="number" placeholder="10" />
        <SettingsInput label="Message Rate Limit" desc="Max messages per minute per clinic" value={state.waRateLimit} onChange={(v) => set("waRateLimit", v)} type="number" placeholder="60" />
      </SettingsSection>
    </>
  );
}

function StoragePanel({ state, set }) {
  return (
    <>
      <div style={S.sectionTitle}>Storage Settings</div>
      <div style={S.sectionDesc}>Configure file storage and retention policies.</div>

      <SettingsSection title="Provider">
        <SettingsDropdown label="Storage Provider" value={state.storageProvider} onChange={(v) => set("storageProvider", v)} options={[
          { value: "supabase", label: "Supabase Storage (Default)" },
          { value: "s3", label: "Amazon S3" },
          { value: "r2", label: "Cloudflare R2" },
        ]} />
        <SettingsInput label="Backup Location" desc="Path or bucket for backup storage" value={state.backupLocation} onChange={(v) => set("backupLocation", v)} placeholder="/opt/flowmatix/backups" />
      </SettingsSection>

      <SettingsSection title="Retention">
        <SettingsDropdown label="Retention Policy" value={state.retentionPolicy} onChange={(v) => set("retentionPolicy", v)} options={[
          { value: "forever", label: "Keep Forever" },
          { value: "1year", label: "1 Year" },
          { value: "6months", label: "6 Months" },
          { value: "90days", label: "90 Days" },
        ]} />
        <SettingsInput label="Auto-Delete After (days)" desc="Automatically delete files older than X days. Set 0 to disable." value={state.autoDeleteDays} onChange={(v) => set("autoDeleteDays", v)} type="number" placeholder="0" />
        <SettingsToggle label="Auto-Delete Temp Files" desc="Remove temporary upload files after processing" value={state.autoDeleteTemp} onChange={(v) => set("autoDeleteTemp", v)} />
      </SettingsSection>
    </>
  );
}

function SecurityPanel({ state, set }) {
  return (
    <>
      <div style={S.sectionTitle}>Security</div>
      <div style={S.sectionDesc}>Platform security and access controls.</div>

      <SettingsSection title="Authentication">
        <SettingsToggle label="Two-Factor Authentication" desc="Require 2FA for all admin accounts" value={state.twoFactor} onChange={(v) => set("twoFactor", v)} />
        <SettingsInput label="Session Timeout" desc="Minutes of inactivity before auto-logout" value={state.sessionTimeout} onChange={(v) => set("sessionTimeout", v)} type="number" placeholder="60" />
        <SettingsDropdown label="Password Policy" desc="Minimum password strength requirements" value={state.passwordPolicy} onChange={(v) => set("passwordPolicy", v)} options={[
          { value: "standard", label: "Standard (8+ chars)" },
          { value: "strong", label: "Strong (12+ chars, mixed)" },
          { value: "enterprise", label: "Enterprise (16+ chars, symbols)" },
        ]} />
      </SettingsSection>

      <SettingsSection title="Access">
        <SettingsToggle label="IP Whitelisting" desc="Restrict API access to specific IP addresses" value={state.ipWhitelist} onChange={(v) => set("ipWhitelist", v)} />
        <SettingsToggle label="Login History" desc="Track and display login history for all users" value={state.loginHistory} onChange={(v) => set("loginHistory", v)} />
        <SettingsDropdown label="API Access Permissions" desc="Default API access level for new keys" value={state.apiAccessLevel} onChange={(v) => set("apiAccessLevel", v)} options={[
          { value: "read_only", label: "Read Only" },
          { value: "read_write", label: "Read & Write" },
          { value: "full", label: "Full Access" },
        ]} />
      </SettingsSection>
    </>
  );
}

function APIPanel({ state, set }) {
  return (
    <>
      <div style={S.sectionTitle}>API Settings</div>
      <div style={S.sectionDesc}>Developer access and rate limiting configuration.</div>

      <SettingsSection title="Rate Limiting">
        <SettingsInput label="Requests per Minute" desc="Global rate limit per API key" value={state.apiRateLimit} onChange={(v) => set("apiRateLimit", v)} type="number" placeholder="120" />
        <SettingsInput label="Requests per Day" desc="Daily limit per API key" value={state.apiDailyLimit} onChange={(v) => set("apiDailyLimit", v)} type="number" placeholder="50000" />
      </SettingsSection>

      <SettingsSection title="Webhooks">
        <SettingsInput label="Max Retry Attempts" desc="Retries before marking webhook as failed" value={state.webhookRetries} onChange={(v) => set("webhookRetries", v)} type="number" placeholder="5" />
        <SettingsInput label="Retry Delay (seconds)" desc="Wait time between retry attempts" value={state.webhookRetryDelay} onChange={(v) => set("webhookRetryDelay", v)} type="number" placeholder="30" />
      </SettingsSection>

      <SettingsSection title="Tokens">
        <SettingsInput label="Token Expiration (days)" desc="API tokens expire after this many days. 0 = never." value={state.tokenExpiration} onChange={(v) => set("tokenExpiration", v)} type="number" placeholder="90" />
        <SettingsToggle label="Allow Long-Lived Tokens" desc="Permit tokens with no expiration" value={state.allowLongLivedTokens} onChange={(v) => set("allowLongLivedTokens", v)} />
      </SettingsSection>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
const PANELS = {
  account: AccountPanel,
  notifications: NotificationsPanel,
  platform: PlatformPanel,
  ai: AIPanel,
  automation: AutomationPanel,
  whatsapp: WhatsAppPanel,
  storage: StoragePanel,
  security: SecurityPanel,
  api: APIPanel,
};

const DEFAULT_STATE = {
  // Account
  name: "", email: "", phone: "", timezone: "Europe/Berlin", language: "en",
  newPassword: "", confirmPassword: "",
  // Notifications
  emailNotifications: true, browserPush: true, soundAlerts: true,
  notifyApplications: true, notifyPayments: true, notifyIncidents: true, notifyOnboardingStuck: true,
  // Platform
  platformName: "Flowmatix", supportEmail: "info@flowmatix.io",
  defaultTimezone: "Europe/Berlin", defaultLanguage: "en",
  // AI
  aiModel: "gpt-4o", aiFallback: "gpt-4o-mini", aiResponseLength: "balanced",
  aiTemperature: "0.7", aiMaxConversation: "50",
  // Automation
  leadTimeout: "48", autoReplyDelay: "3", conversationCloseTimer: "72",
  reminderTiming: "24", photoReminderDelay: "12", maxPhotoReminders: "3",
  // WhatsApp
  waProvider: "meta_cloud", waWebhookUrl: "", waMediaLimit: "16",
  waMaxImages: "10", waRateLimit: "60",
  // Storage
  storageProvider: "supabase", backupLocation: "/opt/flowmatix/backups",
  retentionPolicy: "forever", autoDeleteDays: "0", autoDeleteTemp: true,
  // Security
  twoFactor: false, sessionTimeout: "60", passwordPolicy: "strong",
  ipWhitelist: false, loginHistory: true, apiAccessLevel: "read_only",
  // API
  apiRateLimit: "120", apiDailyLimit: "50000", webhookRetries: "5",
  webhookRetryDelay: "30", tokenExpiration: "90", allowLongLivedTokens: false,
};

export default function OperatorSettings() {
  const [activePanel, setActivePanel] = useState("account");
  const [state, setState] = useState({ ...DEFAULT_STATE });
  const [savedState, setSavedState] = useState({ ...DEFAULT_STATE });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load settings from API on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getClinicSettings?.();
        if (!cancelled && res) {
          const merged = { ...DEFAULT_STATE, ...res };
          setState(merged);
          setSavedState(merged);
        }
      } catch {
        // Settings endpoint may not exist yet — use defaults
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const set = useCallback((key, val) => {
    setState((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }, []);

  const dirty = JSON.stringify(state) !== JSON.stringify(savedState);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateClinicSettings?.(state);
      setSavedState({ ...state });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Handle error
    }
    setSaving(false);
  };

  const handleReset = () => {
    setState({ ...savedState });
    setSaved(false);
  };

  const Panel = PANELS[activePanel];

  return (
    <div style={S.wrapper}>
      {/* Sidebar Nav */}
      <div style={S.sidebar}>
        {categories.map((cat) => (
          <div key={cat.group}>
            <div style={S.sidebarLabel}>{cat.group}</div>
            {cat.items.map((item) => (
              <div
                key={item.id}
                style={S.sidebarItem(activePanel === item.id)}
                onClick={() => setActivePanel(item.id)}
              >
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={S.content}>
        <Panel state={state} set={set} />
        <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onReset={handleReset} saved={saved} />
      </div>
    </div>
  );
}
