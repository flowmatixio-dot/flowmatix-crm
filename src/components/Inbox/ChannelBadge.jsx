/**
 * ChannelBadge — Shows the source channel of a conversation/lead.
 * Used in Inbox conversation list and patient profile.
 */

const _l = () => (localStorage.getItem("fm_lang") || "de").substring(0, 2);
const CHANNELS = {
  whatsapp:  { label: "WhatsApp",  icon: "💬", color: "#25D366", bg: "rgba(37,211,102,0.08)" },
  instagram: { label: "Instagram", icon: "📸", color: "#E1306C", bg: "rgba(225,48,108,0.08)" },
  facebook:  { label: "Facebook",  icon: "📘", color: "#1877F2", bg: "rgba(24,119,242,0.08)" },
  website:   { label: "Website",   icon: "🌐", color: "#4cc9ff", bg: "rgba(76,201,255,0.08)" },
  email:     { label: "E-Mail",    icon: "📧", color: "#a78bfa", bg: "rgba(167,139,250,0.08)" },
  phone:     { get label() { return { de: "Telefon", en: "Phone", tr: "Telefon" }[_l()] || "Phone"; },   icon: "📞", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  referral:  { get label() { return { de: "Empfehlung", en: "Referral", tr: "Tavsiye" }[_l()] || "Referral"; },icon: "🤝", color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  manual:    { get label() { return { de: "Manuell", en: "Manual", tr: "Manuel" }[_l()] || "Manual"; },   icon: "✏️", color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
};

export default function ChannelBadge({ channel, size = "small" }) {
  const ch = CHANNELS[channel] || CHANNELS.whatsapp;
  const isSmall = size === "small";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: isSmall ? 3 : 5,
      padding: isSmall ? "1px 6px" : "3px 10px",
      borderRadius: isSmall ? 4 : 6,
      fontSize: isSmall ? 9 : 11,
      fontWeight: 700,
      background: ch.bg,
      color: ch.color,
      border: `1px solid ${ch.color}20`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: isSmall ? 9 : 12 }}>{ch.icon}</span>
      {ch.label}
    </span>
  );
}

export function ChannelIcon({ channel, size = 16 }) {
  const ch = CHANNELS[channel] || CHANNELS.whatsapp;
  return (
    <span title={ch.label} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, fontSize: size * 0.7,
    }}>
      {ch.icon}
    </span>
  );
}

export { CHANNELS };
