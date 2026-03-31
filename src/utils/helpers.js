/* ═══ HTML ESCAPE — prevents XSS in generated HTML (PDFs, invoices) ═══ */
export const escHtml = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

/* UUID generator for new entities */
export const genId = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2,9)}`;

/* Time ago formatter */
export function timeAgo(iso) {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const m = Math.floor((now - d) / 60000);
  if (m < 0) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

/* Calendar month day generator */
export function getMonthDays(y, m) {
  const f = new Date(y, m, 1);
  const l = new Date(y, m + 1, 0);
  let s = f.getDay() === 0 ? 6 : f.getDay() - 1;
  const d = [];
  for (let i = s - 1; i >= 0; i--) {
    d.push({ date: new Date(y, m, -i), current: false });
  }
  for (let i = 1; i <= l.getDate(); i++) {
    d.push({ date: new Date(y, m, i), current: true });
  }
  while (d.length < 42) {
    d.push({ date: new Date(y, m + 1, d.length - l.getDate() - s + 1), current: false });
  }
  return d;
}

/* Format date as YYYY-MM-DD */
export function fmtDate(d) {
  if (!d || typeof d.getFullYear !== "function") d = new Date(d || 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* Check if date is today */
export function isToday(d) {
  return fmtDate(d) === fmtDate(new Date());
}

/* ═══ Waiting-time helpers for Action Required ═══ */

/* German relative waiting-time label */
export function waitingSince(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const mins = Math.floor((now - d) / 60000);
  if (mins < 0) return "gerade eben";
  if (mins < 1) return "seit < 1 min";
  if (mins < 60) return `seit ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `seit ${hrs}h`;
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (fmtDate(d) === fmtDate(yesterday)) {
    return `seit gestern ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }
  const days = Math.floor(mins / 1440);
  return `seit ${days} ${days === 1 ? "Tag" : "Tagen"}`;
}

/* Minutes since a timestamp */
export function waitingMins(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

/* Urgency level based on waiting time and task type */
const URGENCY_THRESHOLDS = {
  medical:       { warn: 120, crit: 360 },
  communication: { warn: 15,  crit: 45 },
  aftercare:     { warn: 720, crit: 1440 },
  logistics:     { warn: 1440, crit: 4320 },
  billing:       { warn: 1440, crit: 4320 },
  booking:       { warn: 720, crit: 2880 },
  _default:      { warn: 120, crit: 720 },
};

export function waitingUrgency(mins, category) {
  const t = URGENCY_THRESHOLDS[category] || URGENCY_THRESHOLDS._default;
  if (mins >= t.crit) return "critical";
  if (mins >= t.warn) return "warning";
  return "normal";
}

export const WAITING_COLORS = {
  critical: "#ef4444",
  warning: "#fbbf24",
  normal: "rgba(167,177,195,0.65)",
};

/* ═══ Locale for date formatting (DE/EN/TR) ═══ */
const DATE_LOCALES = { de: "de-DE", en: "en-US", tr: "tr-TR" };
export function fmLocale() { return DATE_LOCALES[(localStorage.getItem("fm_lang") || "de").substring(0, 2)] || "de-DE"; }

/* ═══ Translate country names + common values (DE/EN/TR) ═══ */
const TRANSLATE_MAP = {
  "keine": { en: "none", de: "keine", tr: "yok" },
  "none": { en: "none", de: "keine", tr: "yok" },
  "no": { en: "no", de: "nein", tr: "hayır" },
  "yes": { en: "yes", de: "ja", tr: "evet" },
  "ja": { en: "yes", de: "ja", tr: "evet" },
  "nein": { en: "no", de: "nein", tr: "hayır" },
  "frontal": { en: "frontal", de: "frontal", tr: "ön bölge" },
  "frontal hairline": { en: "frontal hairline", de: "Frontaler Haaransatz", tr: "ön saç çizgisi" },
  "frontal hair thinning": { en: "frontal hair thinning", de: "frontaler Haarausfall", tr: "ön saç incelmesi" },
  "diffuse thinning": { en: "diffuse thinning", de: "diffuser Haarausfall", tr: "yaygın incelme" },
  "diffuser haarausfall": { en: "diffuse hair loss", de: "diffuser Haarausfall", tr: "yaygın saç dökülmesi" },
  "crown": { en: "crown", de: "Scheitel", tr: "tepe bölgesi" },
  "vertex": { en: "vertex", de: "Scheitelbereich", tr: "tepe bölgesi" },
  "temporal": { en: "temporal", de: "Schläfenbereich", tr: "şakak bölgesi" },
  "androgenetic": { en: "androgenetic", de: "androgenetisch", tr: "androgenetik" },
  "alopecia": { en: "alopecia", de: "Alopezie", tr: "alopesi" },
  "dsgvo": { en: "GDPR", de: "DSGVO", tr: "KVKK" },
  "gdpr": { en: "GDPR", de: "DSGVO", tr: "KVKK" },
  // Medical conditions
  "leichter bluthochdruck": { en: "mild hypertension", de: "leichter Bluthochdruck", tr: "hafif hipertansiyon" },
  "bluthochdruck": { en: "hypertension", de: "Bluthochdruck", tr: "hipertansiyon" },
  "hypertension": { en: "hypertension", de: "Bluthochdruck", tr: "hipertansiyon" },
  "mild hypertension": { en: "mild hypertension", de: "leichter Bluthochdruck", tr: "hafif hipertansiyon" },
  "diabetes typ 2": { en: "diabetes type 2", de: "Diabetes Typ 2", tr: "tip 2 diyabet" },
  "diabetes type 2": { en: "diabetes type 2", de: "Diabetes Typ 2", tr: "tip 2 diyabet" },
  "diabetes": { en: "diabetes", de: "Diabetes", tr: "diyabet" },
  "asthma": { en: "asthma", de: "Asthma", tr: "astım" },
  "schilddrüse": { en: "thyroid", de: "Schilddrüse", tr: "tiroid" },
  "thyroid": { en: "thyroid", de: "Schilddrüse", tr: "tiroid" },
  "herzprobleme": { en: "heart problems", de: "Herzprobleme", tr: "kalp sorunları" },
  "heart problems": { en: "heart problems", de: "Herzprobleme", tr: "kalp sorunları" },
  "keine allergien": { en: "no allergies", de: "keine Allergien", tr: "alerji yok" },
  "no allergies": { en: "no allergies", de: "keine Allergien", tr: "alerji yok" },
  "nichtraucher": { en: "non-smoker", de: "Nichtraucher", tr: "sigara içmiyor" },
  "non-smoker": { en: "non-smoker", de: "Nichtraucher", tr: "sigara içmiyor" },
  "raucher": { en: "smoker", de: "Raucher", tr: "sigara içiyor" },
  "smoker": { en: "smoker", de: "Raucher", tr: "sigara içiyor" },
  "normal": { en: "normal", de: "normal", tr: "normal" },
  "hoch": { en: "high", de: "hoch", tr: "yüksek" },
  "high": { en: "high", de: "hoch", tr: "yüksek" },
  "niedrig": { en: "low", de: "niedrig", tr: "düşük" },
  "low": { en: "low", de: "niedrig", tr: "düşük" },
  // Countries — DE/EN/TR
  "deutschland": { en: "Germany", de: "Deutschland", tr: "Almanya" },
  "germany": { en: "Germany", de: "Deutschland", tr: "Almanya" },
  "almanya": { en: "Germany", de: "Deutschland", tr: "Almanya" },
  "türkei": { en: "Turkey", de: "Türkei", tr: "Türkiye" },
  "turkey": { en: "Turkey", de: "Türkei", tr: "Türkiye" },
  "türkiye": { en: "Turkey", de: "Türkei", tr: "Türkiye" },
  "united kingdom": { en: "United Kingdom", de: "Großbritannien", tr: "Birleşik Krallık" },
  "großbritannien": { en: "United Kingdom", de: "Großbritannien", tr: "Birleşik Krallık" },
  "uk": { en: "UK", de: "Großbritannien", tr: "Birleşik Krallık" },
  "usa": { en: "USA", de: "USA", tr: "ABD" },
  "abd": { en: "USA", de: "USA", tr: "ABD" },
  "spanien": { en: "Spain", de: "Spanien", tr: "İspanya" },
  "spain": { en: "Spain", de: "Spanien", tr: "İspanya" },
  "ispanya": { en: "Spain", de: "Spanien", tr: "İspanya" },
  "frankreich": { en: "France", de: "Frankreich", tr: "Fransa" },
  "france": { en: "France", de: "Frankreich", tr: "Fransa" },
  "fransa": { en: "France", de: "Frankreich", tr: "Fransa" },
  "italien": { en: "Italy", de: "Italien", tr: "İtalya" },
  "italy": { en: "Italy", de: "Italien", tr: "İtalya" },
  "österreich": { en: "Austria", de: "Österreich", tr: "Avusturya" },
  "austria": { en: "Austria", de: "Österreich", tr: "Avusturya" },
  "schweiz": { en: "Switzerland", de: "Schweiz", tr: "İsviçre" },
  "switzerland": { en: "Switzerland", de: "Schweiz", tr: "İsviçre" },
  "russland": { en: "Russia", de: "Russland", tr: "Rusya" },
  "russia": { en: "Russia", de: "Russland", tr: "Rusya" },
  "japan": { en: "Japan", de: "Japan", tr: "Japonya" },
  "japonya": { en: "Japan", de: "Japan", tr: "Japonya" },
  "ukraine": { en: "Ukraine", de: "Ukraine", tr: "Ukrayna" },
  "vae": { en: "UAE", de: "VAE", tr: "BAE" },
  "uae": { en: "UAE", de: "VAE", tr: "BAE" },
  "bae": { en: "UAE", de: "VAE", tr: "BAE" },
  "saudi-arabien": { en: "Saudi Arabia", de: "Saudi-Arabien", tr: "Suudi Arabistan" },
  "saudi arabia": { en: "Saudi Arabia", de: "Saudi-Arabien", tr: "Suudi Arabistan" },
  "griechenland": { en: "Greece", de: "Griechenland", tr: "Yunanistan" },
  "greece": { en: "Greece", de: "Griechenland", tr: "Yunanistan" },
  "polen": { en: "Poland", de: "Polen", tr: "Polonya" },
  "poland": { en: "Poland", de: "Polen", tr: "Polonya" },
  "brasilien": { en: "Brazil", de: "Brasilien", tr: "Brezilya" },
  "brazil": { en: "Brazil", de: "Brasilien", tr: "Brezilya" },
  // New countries
  "china": { en: "China", de: "China", tr: "Çin" },
  "çin": { en: "China", de: "China", tr: "Çin" },
  "südkorea": { en: "South Korea", de: "Südkorea", tr: "Güney Kore" },
  "suedkorea": { en: "South Korea", de: "Südkorea", tr: "Güney Kore" },
  "south korea": { en: "South Korea", de: "Südkorea", tr: "Güney Kore" },
  "korea": { en: "South Korea", de: "Südkorea", tr: "Güney Kore" },
  "indien": { en: "India", de: "Indien", tr: "Hindistan" },
  "india": { en: "India", de: "Indien", tr: "Hindistan" },
  "niederlande": { en: "Netherlands", de: "Niederlande", tr: "Hollanda" },
  "netherlands": { en: "Netherlands", de: "Niederlande", tr: "Hollanda" },
  "holland": { en: "Netherlands", de: "Niederlande", tr: "Hollanda" },
  "schweden": { en: "Sweden", de: "Schweden", tr: "İsveç" },
  "sweden": { en: "Sweden", de: "Schweden", tr: "İsveç" },
  "norwegen": { en: "Norway", de: "Norwegen", tr: "Norveç" },
  "norway": { en: "Norway", de: "Norwegen", tr: "Norveç" },
  "dänemark": { en: "Denmark", de: "Dänemark", tr: "Danimarka" },
  "denmark": { en: "Denmark", de: "Dänemark", tr: "Danimarka" },
  "belgien": { en: "Belgium", de: "Belgien", tr: "Belçika" },
  "belgium": { en: "Belgium", de: "Belgien", tr: "Belçika" },
  "israel": { en: "Israel", de: "Israel", tr: "İsrail" },
  "ägypten": { en: "Egypt", de: "Ägypten", tr: "Mısır" },
  "egypt": { en: "Egypt", de: "Ägypten", tr: "Mısır" },
  "irak": { en: "Iraq", de: "Irak", tr: "Irak" },
  "iraq": { en: "Iraq", de: "Irak", tr: "Irak" },
  "iran": { en: "Iran", de: "Iran", tr: "İran" },
  "mexiko": { en: "Mexico", de: "Mexiko", tr: "Meksika" },
  "mexico": { en: "Mexico", de: "Mexiko", tr: "Meksika" },
  "kanada": { en: "Canada", de: "Kanada", tr: "Kanada" },
  "canada": { en: "Canada", de: "Kanada", tr: "Kanada" },
  "australien": { en: "Australia", de: "Australien", tr: "Avustralya" },
  "australia": { en: "Australia", de: "Australien", tr: "Avustralya" },
  "portugal": { en: "Portugal", de: "Portugal", tr: "Portekiz" },
  "rumänien": { en: "Romania", de: "Rumänien", tr: "Romanya" },
  "romania": { en: "Romania", de: "Rumänien", tr: "Romanya" },
  "ungarn": { en: "Hungary", de: "Ungarn", tr: "Macaristan" },
  "hungary": { en: "Hungary", de: "Ungarn", tr: "Macaristan" },
  "tschechien": { en: "Czech Republic", de: "Tschechien", tr: "Çekya" },
  "czech republic": { en: "Czech Republic", de: "Tschechien", tr: "Çekya" },
  "bulgarien": { en: "Bulgaria", de: "Bulgarien", tr: "Bulgaristan" },
  "bulgaria": { en: "Bulgaria", de: "Bulgarien", tr: "Bulgaristan" },
  "serbien": { en: "Serbia", de: "Serbien", tr: "Sırbistan" },
  "serbia": { en: "Serbia", de: "Serbien", tr: "Sırbistan" },
  "kroatien": { en: "Croatia", de: "Kroatien", tr: "Hırvatistan" },
  "croatia": { en: "Croatia", de: "Kroatien", tr: "Hırvatistan" },
  "albanien": { en: "Albania", de: "Albanien", tr: "Arnavutluk" },
  "albania": { en: "Albania", de: "Albanien", tr: "Arnavutluk" },
  "marokko": { en: "Morocco", de: "Marokko", tr: "Fas" },
  "morocco": { en: "Morocco", de: "Marokko", tr: "Fas" },
  "tunesien": { en: "Tunisia", de: "Tunesien", tr: "Tunus" },
  "tunisia": { en: "Tunisia", de: "Tunesien", tr: "Tunus" },
  "libyen": { en: "Libya", de: "Libyen", tr: "Libya" },
  "libya": { en: "Libya", de: "Libyen", tr: "Libya" },
  "kuwait": { en: "Kuwait", de: "Kuwait", tr: "Kuveyt" },
  "katar": { en: "Qatar", de: "Katar", tr: "Katar" },
  "qatar": { en: "Qatar", de: "Katar", tr: "Katar" },
  "bahrain": { en: "Bahrain", de: "Bahrain", tr: "Bahreyn" },
  "oman": { en: "Oman", de: "Oman", tr: "Umman" },
  "pakistan": { en: "Pakistan", de: "Pakistan", tr: "Pakistan" },
  "bangladesch": { en: "Bangladesh", de: "Bangladesch", tr: "Bangladeş" },
  "bangladesh": { en: "Bangladesh", de: "Bangladesch", tr: "Bangladeş" },
  "finnland": { en: "Finland", de: "Finnland", tr: "Finlandiya" },
  "finland": { en: "Finland", de: "Finnland", tr: "Finlandiya" },
  "irland": { en: "Ireland", de: "Irland", tr: "İrlanda" },
  "ireland": { en: "Ireland", de: "Irland", tr: "İrlanda" },
  "schottland": { en: "Scotland", de: "Schottland", tr: "İskoçya" },
  "scotland": { en: "Scotland", de: "Schottland", tr: "İskoçya" },
};

/* Word/phrase dictionary for dynamic free-text translation */
const WORD_MAP = {
  // Hair / medical terms
  "frontal": { en: "frontal", de: "frontal", tr: "ön" },
  "hair": { en: "hair", de: "Haar", tr: "saç" },
  "thinning": { en: "thinning", de: "Ausdünnung", tr: "incelme" },
  "loss": { en: "loss", de: "Ausfall", tr: "dökülme" },
  "hairline": { en: "hairline", de: "Haaransatz", tr: "saç çizgisi" },
  "receding": { en: "receding", de: "zurückweichend", tr: "gerileyen" },
  "crown": { en: "crown", de: "Scheitel", tr: "tepe" },
  "vertex": { en: "vertex", de: "Scheitelbereich", tr: "tepe bölgesi" },
  "temple": { en: "temple", de: "Schläfe", tr: "şakak" },
  "temples": { en: "temples", de: "Schläfen", tr: "şakaklar" },
  "diffuse": { en: "diffuse", de: "diffus", tr: "yaygın" },
  "severe": { en: "severe", de: "schwer", tr: "şiddetli" },
  "mild": { en: "mild", de: "leicht", tr: "hafif" },
  "moderate": { en: "moderate", de: "mäßig", tr: "orta" },
  "advanced": { en: "advanced", de: "fortgeschritten", tr: "ileri" },
  "early": { en: "early", de: "früh", tr: "erken" },
  "stage": { en: "stage", de: "Stadium", tr: "evre" },
  "pattern": { en: "pattern", de: "Muster", tr: "tip" },
  "baldness": { en: "baldness", de: "Kahlheit", tr: "kellik" },
  "bald": { en: "bald", de: "kahl", tr: "kel" },
  "spot": { en: "spot", de: "Stelle", tr: "bölge" },
  "spots": { en: "spots", de: "Stellen", tr: "bölgeler" },
  "area": { en: "area", de: "Bereich", tr: "bölge" },
  "areas": { en: "areas", de: "Bereiche", tr: "bölgeler" },
  "top": { en: "top", de: "Oberkopf", tr: "üst" },
  "back": { en: "back", de: "Hinterkopf", tr: "arka" },
  "sides": { en: "sides", de: "Seiten", tr: "yanlar" },
  "donor": { en: "donor", de: "Spender", tr: "donör" },
  "transplant": { en: "transplant", de: "Transplantation", tr: "nakil" },
  "grafts": { en: "grafts", de: "Grafts", tr: "greft" },
  "scar": { en: "scar", de: "Narbe", tr: "yara izi" },
  "scars": { en: "scars", de: "Narben", tr: "yara izleri" },
  // Medical
  "blood": { en: "blood", de: "Blut", tr: "kan" },
  "pressure": { en: "pressure", de: "druck", tr: "basınç" },
  "high": { en: "high", de: "hoch", tr: "yüksek" },
  "low": { en: "low", de: "niedrig", tr: "düşük" },
  "allergy": { en: "allergy", de: "Allergie", tr: "alerji" },
  "allergies": { en: "allergies", de: "Allergien", tr: "alerjiler" },
  "medication": { en: "medication", de: "Medikament", tr: "ilaç" },
  "medications": { en: "medications", de: "Medikamente", tr: "ilaçlar" },
  "surgery": { en: "surgery", de: "Operation", tr: "ameliyat" },
  "previous": { en: "previous", de: "vorherige", tr: "önceki" },
  "condition": { en: "condition", de: "Erkrankung", tr: "durum" },
  "conditions": { en: "conditions", de: "Erkrankungen", tr: "durumlar" },
  "medical": { en: "medical", de: "medizinisch", tr: "tıbbi" },
  "history": { en: "history", de: "Historie", tr: "geçmiş" },
  "treatment": { en: "treatment", de: "Behandlung", tr: "tedavi" },
  "complaint": { en: "complaint", de: "Beschwerde", tr: "şikayet" },
  // German medical words → EN/TR
  "leichter": { en: "mild", de: "leichter", tr: "hafif" },
  "leichte": { en: "mild", de: "leichte", tr: "hafif" },
  "starker": { en: "severe", de: "starker", tr: "şiddetli" },
  "haarausfall": { en: "hair loss", de: "Haarausfall", tr: "saç dökülmesi" },
  "haaransatz": { en: "hairline", de: "Haaransatz", tr: "saç çizgisi" },
  "geheimratsecken": { en: "receding temples", de: "Geheimratsecken", tr: "gerileyen şakaklar" },
  "ausdünnung": { en: "thinning", de: "Ausdünnung", tr: "incelme" },
  "oberkopf": { en: "top of head", de: "Oberkopf", tr: "tepe" },
  "scheitel": { en: "crown", de: "Scheitel", tr: "tepe" },
  "stirn": { en: "forehead", de: "Stirn", tr: "alın" },
  "narbe": { en: "scar", de: "Narbe", tr: "yara izi" },
  "bluthochdruck": { en: "hypertension", de: "Bluthochdruck", tr: "hipertansiyon" },
  "blutverdünner": { en: "blood thinners", de: "Blutverdünner", tr: "kan sulandırıcı" },
  "allergie": { en: "allergy", de: "Allergie", tr: "alerji" },
  "keine": { en: "none", de: "keine", tr: "yok" },
  // Turkish medical words → EN/DE
  "saç": { en: "hair", de: "Haar", tr: "saç" },
  "dökülme": { en: "loss", de: "Ausfall", tr: "dökülme" },
  "incelme": { en: "thinning", de: "Ausdünnung", tr: "incelme" },
  "ön": { en: "frontal", de: "frontal", tr: "ön" },
  "tepe": { en: "crown", de: "Scheitel", tr: "tepe" },
  "şakak": { en: "temple", de: "Schläfe", tr: "şakak" },
};

function translateFreeText(val, lang) {
  // Try multi-word phrases first (longest match)
  let text = String(val).trim();
  const lower = text.toLowerCase();

  // Try exact match in main map
  if (TRANSLATE_MAP[lower]?.[lang]) return TRANSLATE_MAP[lower][lang];

  // Word-by-word translation
  const words = text.split(/\s+/);
  let translated = false;
  const result = words.map(w => {
    const wl = w.toLowerCase();
    if (WORD_MAP[wl]?.[lang] && WORD_MAP[wl][lang].toLowerCase() !== wl) {
      translated = true;
      // Preserve capitalization of first letter if original was capitalized
      const t = WORD_MAP[wl][lang];
      return w[0] === w[0].toUpperCase() ? t.charAt(0).toUpperCase() + t.slice(1) : t;
    }
    return w;
  });
  return translated ? result.join(" ") : val;
}

export function translateValue(val) {
  if (!val || val === "—") return val;
  const l = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
  const v = String(val).trim().toLowerCase();
  // Exact match first
  if (TRANSLATE_MAP[v]?.[l]) return TRANSLATE_MAP[v][l];
  // Dynamic word-by-word for free text
  return translateFreeText(val, l);
}
