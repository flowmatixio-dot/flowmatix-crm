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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* Check if date is today */
export function isToday(d) {
  return fmtDate(d) === fmtDate(new Date());
}
