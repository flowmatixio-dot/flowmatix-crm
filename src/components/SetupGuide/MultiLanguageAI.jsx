import { LockedBanner } from "./setupShared";

// Language data arrays
const CORE_LANGS = [
  { code: "de", label: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "en", label: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "tr", label: "Turkce", flag: "\u{1F1F9}\u{1F1F7}" },
  { code: "es", label: "Espanol", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "fr", label: "Francais", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "it", label: "Italiano", flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "pt", label: "Portugues", flag: "\u{1F1F5}\u{1F1F9}" },
  { code: "ar", label: "العربية", flag: "\u{1F1F8}\u{1F1E6}" },
  { code: "ru", label: "Русский", flag: "\u{1F1F7}\u{1F1FA}" },
  { code: "zh", label: "中文", flag: "\u{1F1E8}\u{1F1F3}" },
];

const EXTRA_LANGS = [
  { code: "pl", label: "Polski", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "nl", label: "Nederlands", flag: "\u{1F1F3}\u{1F1F1}" },
  { code: "uk", label: "Українська", flag: "\u{1F1FA}\u{1F1E6}" },
  { code: "ro", label: "Romana", flag: "\u{1F1F7}\u{1F1F4}" },
  { code: "el", label: "Ελληνικά", flag: "\u{1F1EC}\u{1F1F7}" },
  { code: "cs", label: "Cestina", flag: "\u{1F1E8}\u{1F1FF}" },
  { code: "sv", label: "Svenska", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "da", label: "Dansk", flag: "\u{1F1E9}\u{1F1F0}" },
  { code: "fi", label: "Suomi", flag: "\u{1F1EB}\u{1F1EE}" },
  { code: "no", label: "Norsk", flag: "\u{1F1F3}\u{1F1F4}" },
  { code: "hu", label: "Magyar", flag: "\u{1F1ED}\u{1F1FA}" },
  { code: "bg", label: "Български", flag: "\u{1F1E7}\u{1F1EC}" },
  { code: "hr", label: "Hrvatski", flag: "\u{1F1ED}\u{1F1F7}" },
  { code: "sr", label: "Srpski", flag: "\u{1F1F7}\u{1F1F8}" },
  { code: "sk", label: "Slovencina", flag: "\u{1F1F8}\u{1F1F0}" },
  { code: "sl", label: "Slovenscina", flag: "\u{1F1F8}\u{1F1EE}" },
  { code: "lt", label: "Lietuviu", flag: "\u{1F1F1}\u{1F1F9}" },
  { code: "lv", label: "Latviesu", flag: "\u{1F1F1}\u{1F1FB}" },
  { code: "et", label: "Eesti", flag: "\u{1F1EA}\u{1F1EA}" },
  { code: "sq", label: "Shqip", flag: "\u{1F1E6}\u{1F1F1}" },
  { code: "bs", label: "Bosanski", flag: "\u{1F1E7}\u{1F1E6}" },
  { code: "mk", label: "Македонски", flag: "\u{1F1F2}\u{1F1F0}" },
  { code: "ka", label: "ქართული", flag: "\u{1F1EC}\u{1F1EA}" },
  { code: "hy", label: "Հայերեն", flag: "\u{1F1E6}\u{1F1F2}" },
  { code: "hi", label: "हिन्दी", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "bn", label: "বাংলা", flag: "\u{1F1E7}\u{1F1E9}" },
  { code: "ur", label: "اردو", flag: "\u{1F1F5}\u{1F1F0}" },
  { code: "fa", label: "فارسی", flag: "\u{1F1EE}\u{1F1F7}" },
  { code: "he", label: "עברית", flag: "\u{1F1EE}\u{1F1F1}" },
  { code: "ja", label: "日本語", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "ko", label: "한국어", flag: "\u{1F1F0}\u{1F1F7}" },
  { code: "th", label: "ไทย", flag: "\u{1F1F9}\u{1F1ED}" },
  { code: "vi", label: "Tieng Viet", flag: "\u{1F1FB}\u{1F1F3}" },
  { code: "id", label: "Bahasa Indonesia", flag: "\u{1F1EE}\u{1F1E9}" },
  { code: "ms", label: "Bahasa Melayu", flag: "\u{1F1F2}\u{1F1FE}" },
  { code: "tl", label: "Filipino", flag: "\u{1F1F5}\u{1F1ED}" },
  { code: "sw", label: "Kiswahili", flag: "\u{1F1F0}\u{1F1EA}" },
  { code: "az", label: "Azerbaycanca", flag: "\u{1F1E6}\u{1F1FF}" },
  { code: "kk", label: "Қазақша", flag: "\u{1F1F0}\u{1F1FF}" },
  { code: "uz", label: "O‘zbek", flag: "\u{1F1FA}\u{1F1FF}" },
  { code: "ku", label: "Kurdi", flag: "\u{1F3F3}️" },
  { code: "am", label: "አማርኛ", flag: "\u{1F1EA}\u{1F1F9}" },
  { code: "my", label: "မြန်မာ", flag: "\u{1F1F2}\u{1F1F2}" },
  { code: "ta", label: "தமிழ்", flag: "\u{1F1F1}\u{1F1F0}" },
  { code: "te", label: "తెలుగు", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "mr", label: "मराठी", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "gu", label: "ગુજરાતી", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "pa", label: "ਪੰਜਾਬੀ", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "ne", label: "नेपाली", flag: "\u{1F1F3}\u{1F1F5}" },
  { code: "si", label: "සිංහල", flag: "\u{1F1F1}\u{1F1F0}" },
];

const ALL_LANG_MAP = Object.fromEntries([...CORE_LANGS, ...EXTRA_LANGS].map(l => [l.code, l]));
const ALL_LANGS = CORE_LANGS;
const LANG_LIMITS = { core: 1, pro: 3, operations: 999, enterprise: 999 };

// Multilingual AI settings (Mehrsprachige KI)
export default function MultiLanguageAI({ clinic, updateClinic, showT, setView, t }) {
  const plan = clinic.plan || "core";
  const langLimit = LANG_LIMITS[plan] || 1;
  const selected = clinic.aiConfig?.allowedLangs || [];
  const isLocked = clinic.languagesLocked === true;

  const toggle = (code) => {
    if (isLocked) return;
    const current = [...selected];
    if (current.includes(code)) {
      updateClinic({ aiConfig: { ...clinic.aiConfig, allowedLangs: current.filter(c => c !== code) } });
    } else {
      if (current.length >= langLimit && langLimit < 999) {
        showT(t("lang_limit_reached"));
        return;
      }
      updateClinic({ aiConfig: { ...clinic.aiConfig, allowedLangs: [...current, code] } });
    }
  };

  const finalizeLangs = () => {
    if (selected.length === 0) { showT(t("select_at_least_one")); return; }
    updateClinic({ languagesLocked: true });
    showT(t("languages_saved"));
  };

  const planLabel = { core: "Core", pro: "Pro", operations: "Operations", enterprise: "Enterprise" }[plan] || "Core";

  return <div>
    {isLocked && <LockedBanner t={t} />}
    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 8px" }}>{t("setup_languages_redir")}</p>
    <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.08)", marginBottom: 8, fontSize: 12, color: "var(--text-muted)" }}>
      {planLabel} — {langLimit >= 999 ? (t("all_languages") || "Alle Sprachen") : langLimit + " " + (t("languages_included") || "Sprachen inklusive")}
    </div>
    {!isLocked && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,138,42,0.04)", border: "1px solid rgba(255,138,42,0.1)", marginBottom: 16, fontSize: 11, color: "#ff8a2a", fontWeight: 600 }}>
      {"⚠️"} {t("languages_one_time")}
    </div>}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, opacity: isLocked ? 0.5 : 1, pointerEvents: isLocked ? "none" : "auto" }}>
      {[...ALL_LANGS, ...EXTRA_LANGS.filter(el => selected.includes(el.code))].map(lang => {
        const isOn = selected.includes(lang.code);
        const canToggle = !isLocked && (isOn || selected.length < langLimit || langLimit >= 999);
        return <div key={lang.code} onClick={() => canToggle && toggle(lang.code)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: isOn ? "rgba(16,185,129,0.06)" : "var(--bg-section)", border: `1px solid ${isOn ? "rgba(16,185,129,0.2)" : "var(--border-default)"}`, cursor: canToggle ? "pointer" : "not-allowed", opacity: canToggle ? 1 : 0.4, transition: "all .15s" }}>
          <span style={{ fontSize: 18 }}>{lang.flag}</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: isOn ? 600 : 400, color: isOn ? "#10b981" : "var(--text-secondary)" }}>{lang.label}</span>
          {isOn && <span style={{ fontSize: 14, color: "#10b981" }}>{"✓"}</span>}
        </div>;
      })}
    </div>
    {!isLocked && selected.length > 0 && <button onClick={finalizeLangs} style={{ marginTop: 16, padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #ff8a2a, #ff6b00)", border: "none", color: "var(--text-primary)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t("finalize_languages")} {"\u{1F512}"}</button>}
    {/* Dropdown to add more languages */}
    {!isLocked && (() => {
      const usedCodes = selected;
      const available = EXTRA_LANGS.filter(l => !usedCodes.includes(l.code));
      if (available.length === 0) return null;
      return <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "var(--bg-section)", border: "1px dashed var(--border-strong)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 6 }}>{t("custom_language")}</div>
        <select
          value=""
          onChange={(e) => {
            const code = e.target.value;
            if (!code) return;
            if (selected.length >= langLimit && langLimit < 999) { showT(t("lang_limit_reached")); return; }
            updateClinic({ aiConfig: { ...clinic.aiConfig, allowedLangs: [...selected, code] } });
            const lang = ALL_LANG_MAP[code];
            showT((lang?.label || code) + " " + (t("added")));
          }}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer", appearance: "auto" }}
        >
          <option value="" style={{ background: "#1a1d2e" }}>{t("select_language")}</option>
          {available.map(l => <option key={l.code} value={l.code} style={{ background: "#1a1d2e" }}>{l.flag} {l.label}</option>)}
        </select>
      </div>;
    })()}
    {langLimit < 999 && <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-faint)" }}>
      {t("need_more_languages")}{" "}
      <span onClick={() => setView("subscription")} style={{ color: "#ff8a2a", cursor: "pointer", fontWeight: 600 }}>{t("upgrade_or_addon")} {"→"}</span>
    </div>}
  </div>;
}
