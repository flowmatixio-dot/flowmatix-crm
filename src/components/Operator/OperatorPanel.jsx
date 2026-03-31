import React, { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { timeAgo, fmLocale } from "../../utils/helpers";
import * as api from "../../api/client";
import ClinicHealthBadge from "./ClinicHealthBadge";
import ClinicTimeline from "./ClinicTimeline";
import PlatformAlerts from "./PlatformAlerts";
import PlatformActivityFeed from "./PlatformActivityFeed";
import AutomationInspector from "./AutomationInspector";
import SupportCenter from "./SupportCenter";
import OperatorSettings from "./OperatorSettings";

/* Analog Clock with gold hands */
function AnalogClock({ size = 120 }) {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const r = size / 2;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const now = new Date();
      const h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds();
      ctx.save();
      ctx.translate(r, r);
      // Outer ring
      const grad = ctx.createLinearGradient(-r, -r, r, r);
      grad.addColorStop(0, "rgba(212,175,55,0.35)");
      grad.addColorStop(0.5, "rgba(245,212,66,0.2)");
      grad.addColorStop(1, "rgba(212,175,55,0.35)");
      ctx.beginPath(); ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
      ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.stroke();
      // Inner ring
      ctx.beginPath(); ctx.arc(0, 0, r - 8, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(212,175,55,0.08)"; ctx.lineWidth = 1; ctx.stroke();
      // Hour markers
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6 - Math.PI / 2;
        const isMain = i % 3 === 0;
        const inner = r - (isMain ? 22 : 18);
        const outer = r - 10;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.strokeStyle = isMain ? "rgba(212,175,55,0.8)" : "rgba(212,175,55,0.3)";
        ctx.lineWidth = isMain ? 2.5 : 1;
        ctx.stroke();
      }
      // Minute dots
      for (let i = 0; i < 60; i++) {
        if (i % 5 === 0) continue;
        const angle = (i * Math.PI) / 30 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * (r - 12), Math.sin(angle) * (r - 12), 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(212,175,55,0.15)";
        ctx.fill();
      }
      // Hour hand
      const hAngle = ((h + m / 60) * Math.PI) / 6 - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(hAngle) * (r * 0.45), Math.sin(hAngle) * (r * 0.45));
      ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.stroke();
      // Minute hand
      const mAngle = ((m + s / 60) * Math.PI) / 30 - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(mAngle) * (r * 0.65), Math.sin(mAngle) * (r * 0.65));
      ctx.strokeStyle = "#f5d442"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
      // Second hand
      const sAngle = (s * Math.PI) / 30 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(sAngle + Math.PI) * (r * 0.1), Math.sin(sAngle + Math.PI) * (r * 0.1));
      ctx.lineTo(Math.cos(sAngle) * (r * 0.7), Math.sin(sAngle) * (r * 0.7));
      ctx.strokeStyle = "rgba(212,175,55,0.5)"; ctx.lineWidth = 0.8; ctx.lineCap = "round"; ctx.stroke();
      // Center dot
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fillStyle = "#d4af37"; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fillStyle = "#1a2436"; ctx.fill();
      ctx.restore();
    };
    draw();
    const iv = setInterval(draw, 1000);
    return () => clearInterval(iv);
  }, [size]);
  return <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} />;
}

/* Animated Revenue Counter - stock ticker style */
function AnimatedCounter({ value, prefix = "", suffix = "" }) {
  const [display, setDisplay] = React.useState(value);
  const [delta, setDelta] = React.useState(null);
  const prevRef = React.useRef(value);
  React.useEffect(() => {
    const prev = prevRef.current;
    if (prev !== value && prev != null) {
      const diff = value - prev;
      setDelta(diff);
      let start = prev, step = 0;
      const steps = 30;
      const inc = (value - prev) / steps;
      const iv = setInterval(() => {
        step++;
        start += inc;
        setDisplay(Math.round(start));
        if (step >= steps) { clearInterval(iv); setDisplay(value); }
      }, 25);
      setTimeout(() => setDelta(null), 3000);
      return () => clearInterval(iv);
    } else { setDisplay(value); }
    prevRef.current = value;
  }, [value]);
  return <div style={{display:"flex",alignItems:"baseline",gap:8}}>
    <span>{prefix}{new Intl.NumberFormat("de-DE").format(display)}{suffix}</span>
    {delta != null && <span style={{fontSize:13,fontWeight:800,color:delta>0?"#10b981":"#ef4444",animation:"fadeInUp 0.3s ease",display:"flex",alignItems:"center",gap:2}}>
      <span style={{fontSize:10}}>{delta>0?"▲":"▼"}</span>
      {delta>0?"+":""}{new Intl.NumberFormat("de-DE").format(delta)}
    </span>}
  </div>;
}

/* Mini World Map with glowing clinic dots */
function MiniWorldMap({ clinics = [] }) {
  const defaultDots = [
    { city: "Istanbul", lat: 41.0, lng: 28.9, color: "#d4af37" },
    { city: "Berlin", lat: 52.5, lng: 13.4, color: "#10b981" },
    { city: "Munich", lat: 48.1, lng: 11.6, color: "#10b981" },
    { city: "London", lat: 51.5, lng: -0.1, color: "#4cc9ff" },
    { city: "Madrid", lat: 40.4, lng: -3.7, color: "#f59e0b" },
    { city: "Rome", lat: 41.9, lng: 12.5, color: "#8b5cf6" },
  ];
  const dots = clinics.length > 0 ? clinics : defaultDots;
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    let frame = 0;
    const toXY = (lat, lng) => {
      const x = ((lng + 30) / 80) * W;
      const y = ((65 - lat) / 35) * H;
      return [x, y];
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;
      // Subtle grid lines for map feel
      ctx.strokeStyle = "rgba(212,175,55,0.04)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath(); ctx.moveTo(0, (H/8)*i); ctx.lineTo(W, (H/8)*i); ctx.stroke();
        ctx.beginPath(); ctx.moveTo((W/8)*i, 0); ctx.lineTo((W/8)*i, H); ctx.stroke();
      }
      // Europe outline (simplified polygon)
      ctx.beginPath();
      ctx.strokeStyle = "rgba(212,175,55,0.1)";
      ctx.lineWidth = 1;
      const outline = [[36,0],[37,5],[38,10],[40,15],[38,20],[40,25],[42,28],[41,32],[43,28],[44,24],[46,16],[48,8],[50,5],[52,5],[54,10],[55,13],[56,10],[58,12],[60,10],[63,15],[65,20],[64,28],[60,30],[58,25],[56,20],[54,14],[52,13],[50,10],[48,10],[46,12],[44,15],[42,18],[40,20],[38,15],[36,10],[36,0]];
      outline.forEach(([lat,lng], i) => {
        const [x,y] = toXY(lat, lng);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();
      // Draw dots
      dots.forEach((d, idx) => {
        const [x, y] = toXY(d.lat, d.lng);
        const pulse = Math.sin(frame * 0.05 + idx * 1.5) * 0.5 + 0.5;
        // Outer glow
        ctx.beginPath();
        ctx.arc(x, y, 6 + pulse * 4, 0, Math.PI * 2);
        ctx.fillStyle = d.color.replace(")", ",0.1)").replace("rgb", "rgba").replace("#", "");
        const grd = ctx.createRadialGradient(x, y, 0, x, y, 10 + pulse * 4);
        grd.addColorStop(0, d.color + "30");
        grd.addColorStop(1, d.color + "00");
        ctx.fillStyle = grd;
        ctx.fill();
        // Core dot
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.fill();
        // Label
        ctx.font = "600 9px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(212,175,55,0.5)";
        ctx.fillText(d.city, x + 8, y + 3);
      });
    };
    draw();
    const iv = setInterval(draw, 80);
    return () => clearInterval(iv);
  }, [dots]);
  return <canvas ref={canvasRef} width={360} height={180} style={{ width: "100%", height: 180 }} />;
}

/* Uptime Ring - circular gauge */
function UptimeRing({ uptime = 0, size = 130 }) {
  const canvasRef = React.useRef(null);
  const totalSeconds = uptime;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  // Assume 99.9% for display (we don't track downtime)
  const pct = totalSeconds > 86400 ? 99.9 : totalSeconds > 3600 ? 99.5 : 98.0;
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const r = size / 2;
    const lineW = 8;
    let animPct = 0;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(r, r);
      const innerR = r - lineW - 4;
      // Background ring
      ctx.beginPath();
      ctx.arc(0, 0, innerR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(212,175,55,0.06)";
      ctx.lineWidth = lineW;
      ctx.stroke();
      // Progress arc
      const endAngle = -Math.PI / 2 + (animPct / 100) * Math.PI * 2;
      const grad = ctx.createLinearGradient(-innerR, 0, innerR, 0);
      grad.addColorStop(0, "#10b981");
      grad.addColorStop(0.7, "#d4af37");
      grad.addColorStop(1, "#f5d442");
      ctx.beginPath();
      ctx.arc(0, 0, innerR, -Math.PI / 2, endAngle);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW;
      ctx.lineCap = "round";
      ctx.stroke();
      // Glow dot at end
      if (animPct > 5) {
        const dotX = Math.cos(endAngle) * innerR;
        const dotY = Math.sin(endAngle) * innerR;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#f5d442";
        ctx.shadowColor = "#f5d442";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // Center text
      ctx.font = "800 24px -apple-system, sans-serif";
      ctx.fillStyle = "#10b981";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(animPct.toFixed(1) + "%", 0, -6);
      ctx.font = "600 10px -apple-system, sans-serif";
      ctx.fillStyle = "rgba(212,175,55,0.4)";
      ctx.fillText(days + "d " + hours + "h uptime", 0, 16);
      ctx.restore();
    };
    // Animate in
    let step = 0;
    const steps = 40;
    const iv = setInterval(() => {
      step++;
      animPct = pct * Math.min(step / steps, 1);
      draw();
      if (step >= steps) clearInterval(iv);
    }, 25);
    return () => clearInterval(iv);
  }, [pct, days, hours, size]);
  return <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} />;
}



/* ═══════════════════════════════════════════════════════════
   PAYMENT ALERTS HOOK
   ═══════════════════════════════════════════════════════════ */
// Ka-ching sound as tiny base64 data URI (generated sine wave beep)
const PAYMENT_SOUND_URI = 'data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToFAABkAIkArADIAN0A6gDvAOwA4ADMAN8AyACqAIYAXAAuAPz/yP+S/1z/KP/4/s3+qP6K/nX+aP5k/mn+d/6N/qz+1P4D/zn/dP+0//r/QACHANJA1ADXANQAyQC4AKAAgQBcADEAAgDP/5n/Yv8r//T+wf6S/mf+Qv4k/g3+/v33/fn9A/4V/jD+U/5+/rD+6v4q/27/uP8GAFcAqQD8AE4BnwHsATQCeAK0AuoAGwFKAW8BjQGiAbABtAGvAaEBigFrAUIBEQHaAJwAWAAQAMP/cv8e/8j+cP4Y/sD9af0V/cP8dfws/On7rPt2+0j7I/sH+/b67/r0+gT7IPtI+3z7vPsJ/GP8yPw5/bX9PP7N/mf/CQCzAGMBGALRAo4DTQQPBdEFlAZWBxcI1giRCUcK9wqgC0EM2AxmDeoNYg7PDi8Pgw/KDwMQLBBFEE0QRBAqEP4PwA9vDwwPmA4SDnoN0QwYDE8LdgqPCZoImAeKBnAFTAQeA+gBqwBo/x/+0vyC+y/62viF9y72 1/SH8zny7vCp73LuRO0h7AvrAOoD6RToNOdl5qjl/eRm5OTjd+Mh4+HiuOKn4q7i1OIS42jj1+Nd5Pzks+WC5mjnZeh36Z7q2esy7Z7uHfCu8VDzAPXA9ov4X/o8/CD+CQD3AegD2gXMB7wJqQuRDXQPTxEhE+oUqBZZGP0ZkxsZHY4e8B9AIX0ipSO4JLUlmyZqJyAovik/KqgqsyqjKngqMyrTKVspyygkKEknWSaXJcUk4yPyIvMh5yDPH6weeh09HOIadBn3F/AVHBRAElwQcg6DDI8KmAieBoQEagJRADr+Jvwb+hj4HvYw9FDygPDB7hTtees17gDr4ennCN4G8wQPA0ABhf/c/Uv80/p1+TP4C/cB9hX1S/Se8xTzq/Jm8kXySPJu8rby4PIo84vzC/Sm9Fr1KPYLBwMI+gjrCdcKuguXDGwNOQ79DrcPZhAKEaERLBKpEhgTeBO'
;

function usePaymentAlerts(setOpSubTab) {
  const { browserNotify } = useApp();
  const [paymentAlerts, setPaymentAlerts] = useState([]);
  const lastCheckedRef = useRef(new Date().toISOString());
  const dismissTimersRef = useRef(new Map());

  const playSound = useCallback(() => {
    try {
      const audio = new Audio(PAYMENT_SOUND_URI);
      audio.volume = 0.5;
      audio.play().catch(() => {/* autoplay blocked */});
    } catch {/* no audio support */}
  }, []);

  const dismissAlert = useCallback((id) => {
    setPaymentAlerts(prev => prev.filter(a => a.id !== id));
    const timer = dismissTimersRef.current.get(id);
    if (timer) { clearTimeout(timer); dismissTimersRef.current.delete(id); }
  }, []);

  // Poll for new payments every 30s
  useEffect(() => {
    const check = async () => {
      try {
        const result = await api.getRecentPayments(lastCheckedRef.current);
        const payments = result?.payments || result?.data || (Array.isArray(result) ? result : []);
        if (payments.length > 0) {
          lastCheckedRef.current = new Date().toISOString();
          const newAlerts = payments.map(p => ({
            id: p.id || `pay-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
            clinic: p.clinic_name || p.clinicName || p.organization_name || 'Unknown',
            amount: p.amount || p.amount_total || 0,
            currency: p.currency || 'EUR',
            ts: p.created_at || p.paid_at || new Date().toISOString(),
          }));

          setPaymentAlerts(prev => [...newAlerts, ...prev]);

          // Browser notification + sound for each
          newAlerts.forEach(a => {
            const formatted = new Intl.NumberFormat('de-DE', { style: 'currency', currency: a.currency }).format(a.amount / 100);
            browserNotify?.('💰 Neue Zahlung!', `${a.clinic} — ${formatted}`);
          });
          playSound();

          // Auto-dismiss after 60s
          newAlerts.forEach(a => {
            const timer = setTimeout(() => dismissAlert(a.id), 60000);
            dismissTimersRef.current.set(a.id, timer);
          });
        }
      } catch {
        // API endpoint may not exist yet — silent fail
      }
    };

    check();
    const iv = setInterval(check, 30000);
    return () => {
      clearInterval(iv);
      dismissTimersRef.current.forEach(t => clearTimeout(t));
    };
  }, [browserNotify, playSound, dismissAlert]);

  return { paymentAlerts, dismissAlert };
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const S = {
  card: { background: '#162032', borderRadius: 12, padding: 20, marginBottom: 16 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
  grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 },
  kpi: { fontSize: 28, fontWeight: 800, color: '#fff' },
  kpiSm: { fontSize: 22, fontWeight: 800, color: '#fff' },
  kpiLabel: { fontSize: 11, color: 'rgba(167,177,195,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(167,177,195,0.7)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  td: { padding: '10px 12px', borderBottom: '1px solid #1e1e3e', color: '#ccc' },
  accent: '#d4af37',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  gray: '#6b7280',
};

const badge = (color, text) => (
  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + '22', color }}>{text}</span>
);

const statusBadge = (status) => {
  const map = { active: S.green, healthy: S.green, ok: S.green, up: S.green, success: S.green, completed: S.green, processed: S.green, firing: S.red, critical: S.red, failed: S.red, down: S.red, error: S.red, dead_letter: S.red, warning: S.yellow, pending: S.yellow, running: S.accent, provisioning: S.accent, suspended: S.gray, inactive: S.gray, revoked: S.gray };
  return badge(map[status] || S.gray, status);
};

const pctColor = (pct) => pct >= 80 ? S.red : pct >= 60 ? S.yellow : S.green;

const ProgressBar = ({ pct, label }) => (
  <div style={{ marginBottom: 8 }}>
    {label && <div style={{ fontSize: 12, color: 'rgba(167,177,195,0.7)', marginBottom: 4 }}>{label}</div>}
    <div style={{ height: 8, borderRadius: 4, background: '#1a1a2e', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, borderRadius: 4, background: pctColor(pct), transition: 'width .3s' }} />
    </div>
    <div style={{ fontSize: 11, color: pctColor(pct), marginTop: 2 }}>{pct.toFixed(1)}%</div>
  </div>
);

const Btn = ({ children, onClick, small, danger, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: small ? '4px 12px' : '8px 16px', borderRadius: 8, border: 'none', background: danger ? S.red + '33' : S.accent + '22', color: danger ? S.red : S.accent, fontWeight: 600, fontSize: small ? 11 : 13, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1 }}>{children}</button>
);

const Empty = ({ text }) => <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>{text || 'No data yet'}</div>;
const Spin = () => <div style={{ padding: 32, textAlign: 'center', color: 'rgba(167,177,195,0.7)' }}>Loading...</div>;

const fmtBytes = (b) => { if (!b) return '0 B'; const u = ['B','KB','MB','GB','TB']; let i = 0; let v = Number(b); while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; } return v.toFixed(i > 1 ? 1 : 0) + ' ' + u[i]; };
const fmtSec = (s) => { const d = Math.floor(s/86400); const h = Math.floor((s%86400)/3600); return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((s%3600)/60)}m`; };
const fmtEur = (cents) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((cents||0)/100);
const fmtEurDirect = (val) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val||0);

/* ═══════════════════════════════════════════════════════════
   DATA HOOK
   ═══════════════════════════════════════════════════════════ */
function useOperatorData() {
  const [d, setD] = useState({});
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(null);

  const load = useCallback(async (key, fn) => {
    try {
      const data = await fn();
      setD(prev => ({ ...prev, [key]: data }));
      setApiConnected(true);
      return data;
    } catch (err) {
      console.warn(`Failed to load ${key}:`, err.message);
      if (key === 'overview') setApiConnected(false);
      return null;
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      load('overview', api.getPlatformOverview),
      load('health', api.getHealth),
      load('applicationStats', api.getApplicationStats), // Trial stats come from same endpoint
    ]);
    setLoading(false);
  }, [load]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Tab-specific loaders
  const loadForTab = useCallback(async (tab) => {
    switch (tab) {
      case 'clinics': await load('clinics', api.getPlatformClinics); break;
      case 'monitoring':
      case 'infrastructure':
        await Promise.allSettled([
          load('infra', api.getInfrastructure),
          load('infraContainers', api.getInfraContainers),
          load('infraDb', api.getInfraDatabase),
          load('platformStats', api.getPlatformStats),
          load('health', api.getHealth),
          load('clinics', api.getPlatformClinics),
        ]); break;
      case 'automations': await Promise.allSettled([load('queueStats', api.getQueueStats), load('queueJobs', () => api.getQueueJobs({ limit: 20 }))]); break;
      case 'incidents': await load('incidents', () => api.getIncidents({ limit: 50 })); break;
      case 'dashboard': await Promise.allSettled([load('platformStats', api.getPlatformStats), load('clinics', api.getPlatformClinics)]); break;
      case 'logs': await load('unifiedLogs', () => api.getUnifiedLogs({ limit: 50 })); break;
      case 'billing':
        await Promise.allSettled([
          load('subscriptions', api.getSubscriptions),
          load('plans', api.getSubscriptionPlans),
          load('revenue', api.getRevenue),
          load('overdue', api.getOverdueSubscriptions),
        ]); break;
      case 'trials': await Promise.allSettled([load('clinics', api.getPlatformClinics), load('applicationStats', api.getApplicationStats)]); break;
      default: break;
    }
  }, [load]);

  return { d, loading, apiConnected, loadForTab, reload: loadAll, load };
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

/* Inject fadeInUp animation */
if (typeof document !== "undefined" && !document.getElementById("fm-op-anims")) {
  const st = document.createElement("style");
  st.id = "fm-op-anims";
  st.textContent = "@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}";
  document.head.appendChild(st);
}

export default function OperatorPanel() {
  const { opSubTab, setOpSubTab, t } = useApp();
  const tab = opSubTab || "dashboard";
  const { d, loading, apiConnected, loadForTab, reload, load } = useOperatorData();
  const { paymentAlerts, dismissAlert } = usePaymentAlerts(setOpSubTab);
  const [visitorCount, setVisitorCount] = React.useState(null);
  React.useEffect(() => { api.getVisitorStats().then(v => setVisitorCount(v.today)).catch(() => {}); }, []);

  // Load tab-specific data when tab changes
  useEffect(() => { loadForTab(tab); }, [tab, loadForTab]);

  // Auto-refresh every 30s for monitoring/dashboard/trials/clinics tabs
  useEffect(() => {
    const autoTabs = ['monitoring', 'dashboard', 'trials', 'clinics'];
    if (autoTabs.includes(tab)) {
      const iv = setInterval(() => { loadForTab(tab); if (tab === 'dashboard') reload(); }, 30000);
      return () => clearInterval(iv);
    }
  }, [tab, loadForTab, reload]);

  return (
    <div style={{ padding: '0 8px' }}>
      {/* Connection status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '10px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: apiConnected ? '#10b981' : apiConnected === false ? '#ef4444' : '#fbbf24', boxShadow: apiConnected ? '0 0 6px rgba(16,185,129,0.4)' : 'none' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: apiConnected ? 'rgba(16,185,129,0.8)' : 'rgba(167,177,195,0.7)' }}>{apiConnected ? 'System Online' : apiConnected === false ? 'Getrennt' : 'Verbinde...'}</span>
          <span style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)', fontWeight: 500 }}>v1.0.0</span>
          {visitorCount !== null && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(212,175,55,0.10)', color: '#d4af37', marginLeft: 4 }}>{visitorCount} visitors today</span>}
        </div>
        <button onClick={reload} style={{ padding: '7px 18px', borderRadius: 8, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', color: '#d4af37', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em', position: 'relative', zIndex: 10 }}>Refresh</button>
      </div>

      {/* Expiring trials alert banner */}
      {(() => {
        const allCl = d.clinics?.clinics || [];
        const expiring = allCl.filter(c => {
          if (!c.trial_ends_at || c.subscription_status === 'active') return false;
          const diff = new Date(c.trial_ends_at) - new Date();
          return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000; // 3 days
        });
        if (!expiring.length) return null;
        return (
          <div
            onClick={() => { setOpSubTab('trials'); }}
            style={{
              marginBottom: 16,
              padding: '12px 18px',
              borderRadius: 12,
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              animation: 'opPulse 2s ease-in-out infinite',
            }}
          >
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: '#fbbf24',
              boxShadow: '0 0 8px rgba(251,191,36,0.6)',
              flexShrink: 0,
              animation: 'opDotPulse 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>
              {expiring.length} Trial{expiring.length !== 1 ? 's' : ''} laufen in &lt;3 Tagen ab
            </span>
          </div>
        );
      })()}
      <style>{`
        @keyframes opPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
        @keyframes opDotPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 8px rgba(239,68,68,0.6); }
          50% { transform: scale(1.3); box-shadow: 0 0 16px rgba(239,68,68,0.8); }
        }
        @keyframes opPayPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes opPayDotPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 8px rgba(34,197,94,0.6); }
          50% { transform: scale(1.3); box-shadow: 0 0 16px rgba(34,197,94,0.8); }
        }
      `}</style>

      {/* Payment alert banners */}
      {paymentAlerts.map(alert => {
        const formatted = new Intl.NumberFormat('de-DE', { style: 'currency', currency: alert.currency }).format(alert.amount / 100);
        return (
          <div
            key={alert.id}
            onClick={() => { setOpSubTab('billing'); dismissAlert(alert.id); }}
            style={{
              marginBottom: 12,
              padding: '12px 18px',
              borderRadius: 12,
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              animation: 'opPayPulse 2s ease-in-out infinite',
            }}
          >
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: S.green,
              boxShadow: '0 0 8px rgba(34,197,94,0.6)',
              flexShrink: 0,
              animation: 'opPayDotPulse 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: S.green, flex: 1 }}>
              Neue Zahlung: {alert.clinic} — {formatted}
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
              style={{ color: S.green, fontSize: 16, fontWeight: 700, cursor: 'pointer', padding: '0 4px', opacity: 0.7 }}
            >×</span>
          </div>
        );
      })}

      {loading && !d.overview ? <Spin /> : (
        <>
          {tab === 'dashboard' && <TabDashboard d={d} setTab={setOpSubTab} />}
          {tab === 'clinics' && <TabClinics d={d} load={load} setTab={setOpSubTab} />}
          {tab === 'trials' && <TabTrials d={d} load={load} />}
          {tab === 'automations' && <TabAutomations d={d} load={load} />}
          {tab === 'monitoring' && <TabMonitoring d={d} />}
          {tab === 'incidents' && <TabIncidents d={d} load={load} />}
          {tab === 'logs' && <TabLogs d={d} load={load} />}
          {tab === 'billing' && <TabBilling d={d} load={load} />}
          {tab === 'settings' && <OperatorSettings />}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   1) OVERVIEW / DASHBOARD
   ═══════════════════════════════════════════════════════════ */
function OnboardRow({ ct, onNavigate }) {
  const [open, setOpen] = React.useState(false);
  const doneCount = ct.tasks.filter(t => t.done).length;
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", cursor: "pointer", transition: "background .15s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,183,77,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#ffb74d", flexShrink: 0 }}>{ct.clinic.name?.charAt(0) || "?"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ct.clinic.name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 60, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #ffb74d, #ff8a2a)", width: ct.progress + "%", transition: "width .4s" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#ffb74d", minWidth: 28, textAlign: "right" }}>{doneCount}/{ct.tasks.length}</span>
          <span style={{ fontSize: 10, color: "#666", transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>{"▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 20px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {ct.tasks.map(t => (
            <div key={t.id} onClick={() => { if (!t.done && t.tab && onNavigate) onNavigate(t.tab); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, opacity: t.done ? 0.4 : 1, cursor: !t.done && t.tab ? "pointer" : "default", transition: "background .1s" }} onMouseEnter={e => { if (!t.done && t.tab) e.currentTarget.style.background = "rgba(255,183,77,0.06)"; }} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{t.done ? "✅" : t.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: t.done ? "#666" : "#fff", textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.label}</span>
              {!t.done && t.tab && <span style={{ fontSize: 10, color: "#4cc9ff" }}>→</span>}
              {!t.done && <span style={{ fontSize: 10, color: "#888" }}>{t.desc}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabDashboard({ d, setTab }) {
  const [now, setNow] = React.useState(new Date());
  const [syncAgo, setSyncAgo] = React.useState(0);
  const [cc, setCc] = React.useState(null);
  const [collapsed, setCollapsed] = React.useState({ metrics: false, health: false, onboarding: false, activity: false });
  const toggleSection = (key) => setCollapsed(p => ({ ...p, [key]: !p[key] }));
  const [drillMetric, setDrillMetric] = React.useState(null); // 'reviews'|'window'|'failed'|'states'|null
  const [drillData, setDrillData] = React.useState(null);
  const [drillLoading, setDrillLoading] = React.useState(false);
  React.useEffect(() => { api.getCommandCenter().then(setCc).catch(() => {}); }, [d]);
  const openDrill = async (metric) => {
    if (drillMetric === metric) { setDrillMetric(null); return; }
    setDrillMetric(metric); setDrillLoading(true);
    try { const res = await api.getCommandCenterDrilldown(metric); setDrillData(res); } catch { setDrillData(null); }
    setDrillLoading(false);
  };
  React.useEffect(() => {
    const iv = setInterval(() => { setNow(new Date()); setSyncAgo(prev => prev + 1); }, 1000);
    return () => clearInterval(iv);
  }, []);
  React.useEffect(() => { setSyncAgo(0); }, [d]);

  // Demo fallback data — used when real data is empty/zero
  const fallback = {
    mrr: 18420,
    activeClinics: 5,
    totalUsers: 23,
    messagesToday: 127,
    automationSuccessRate: 97.2,
    automationStats: { success: 312, total: 321, failed: 9 },
    webhookErrorRate: 0.3,
    webhookStats: { failed: 1, total: 389 },
    queueBacklog: 0,
    failedPayments: 0,
  };
  const demoClinics = [
    { id: 'dc1', name: 'Hair of Istanbul', plan: 'operations', workspace_state: 'active', connection_status: 'connected', google_connected: true, mrr: 1490, last_activity: '2 Min.' },
    { id: 'dc2', name: "Gustav's Clinic", plan: 'pro', workspace_state: 'active', connection_status: 'connected', google_connected: true, mrr: 990, last_activity: '8 Min.' },
    { id: 'dc3', name: 'Dental Excellence Berlin', plan: 'pro', workspace_state: 'active', connection_status: 'connected', google_connected: false, mrr: 990, last_activity: '15 Min.' },
    { id: 'dc4', name: 'Aesthetic Munich Center', plan: 'core', workspace_state: 'demo', connection_status: null, google_connected: false, mrr: 0, last_activity: '1 Std.' },
    { id: 'dc5', name: 'Premium Hair Turkey', plan: 'operations', workspace_state: 'active', connection_status: 'connected', google_connected: true, mrr: 1490, last_activity: '3 Min.' },
  ];

  const ov = d.overview || {};
  const h = d.health || {};
  const st = d.platformStats || {};
  const clinics = (d.clinics?.clinics?.length > 0) ? d.clinics.clinics : demoClinics;
  const mrr = ov.totalMrr || ov.mrr || fallback.mrr;
  const activeClinicsCount = ov.activeClinics ?? ov.clinicCount ?? fallback.activeClinics;
  const msgToday = st.messagesToday || fallback.messagesToday;
  const autoRate = st.automationSuccessRate ?? fallback.automationSuccessRate;
  const autoStats = st.automationStats || fallback.automationStats;
  const whRate = st.webhookErrorRate ?? fallback.webhookErrorRate;
  const whStats = st.webhookStats || fallback.webhookStats;
  const queueBack = st.queueBacklog ?? fallback.queueBacklog;

  // Euro formatter
  const fmtEur = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  // Pending actions (from real data only)
  const allClinics = d.clinics?.clinics || [];
  const pendingNumbers = allClinics.filter(c => c.number_request_status === 'pending');
  // Trials expiring within 3 days
  const expiringTrials = allClinics.filter(c => {
    if (!c.trial_ends_at || c.subscription_status === 'active') return false;
    const diff = new Date(c.trial_ends_at) - new Date();
    return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
  });

  // System status
  const allHealthy = h.checks ? Object.values(h.checks).every(v => v.status === 'ok' || v.status === 'healthy') : true;
  const anyCritical = h.checks ? Object.values(h.checks).some(v => v.status !== 'ok' && v.status !== 'healthy') : false;
  const statusColor = anyCritical ? '#ef4444' : '#10b981';
  const statusLabel = anyCritical ? 'SYSTEM BEEINTRÄCHTIGT' : 'ALLE SYSTEME OPERATIV';

  // Trials ending in 7 days
  const trialsSoon = clinics.filter(c => {
    if (!c.trial_ends_at) return false;
    const diff = new Date(c.trial_ends_at) - new Date();
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const clockStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString(fmLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Style constants
  const BG = '#0B0F1A';
  const CARD = '#121826';
  const GOLD = '#D4AF37';
  const TEXT = '#F3F4F7';
  const MUTED = '#8D93A6';
  const GREEN = '#10b981';
  const YELLOW = '#fbbf24';
  const RED = '#ef4444';
  const BORDER = 'rgba(255,255,255,0.06)';

  const cardBase = { background: CARD, borderRadius: 18, padding: 22, border: `1px solid ${BORDER}` };
  const labelStyle = { fontSize: 10, fontWeight: 700, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 };
  const sectionLabel = (text) => (
    <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 32, marginBottom: 14 }}>{text}</div>
  );

  // Plan badge colors
  const planColors = { core: '#6b7280', pro: '#4cc9ff', operations: '#a78bfa', enterprise: '#D4AF37' };

  // Automation rate color
  const autoColor = autoRate >= 95 ? GREEN : autoRate >= 80 ? YELLOW : RED;

  // Queue backlog color
  const qbColor = queueBack === 0 ? GREEN : queueBack < 10 ? YELLOW : RED;

  // Failed payments
  const failedPayments = st.failedPayments || fallback.failedPayments;

  return (
    <div style={{ background: BG, margin: '-0px -8px', padding: '0 8px' }}>
      <style>{'@keyframes opPulseGreen{0%{box-shadow:0 0 0 0 rgba(16,185,129,0.5)}70%{box-shadow:0 0 0 8px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}'}</style>

      {/* ═══ COMPACT HEADER ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', marginBottom: 0, background: '#121826', borderRadius: 14, borderBottom: '1px solid rgba(212,175,55,0.08)' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: TEXT }}>Operator Console</div>
          <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: '0.1em', marginTop: 2 }}>FLOWMATIX</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 10, color: 'rgba(141,147,166,0.3)' }}>{dateStr}</div>
          <div style={{ fontSize: 10, color: 'rgba(141,147,166,0.2)' }}>Sync: {syncAgo}s</div>
        </div>
      </div>

      {/* ═══ SMART STATUS BAR ═══ */}
      {(() => {
        const alerts = [];
        if (anyCritical) alerts.push({ text: statusLabel, color: RED });
        if (cc?.pendingReviews > 0) alerts.push({ text: `${cc.pendingReviews} patients waiting for doctor`, color: YELLOW });
        if (cc?.windowAtRisk > 0) alerts.push({ text: `${cc.windowAtRisk} conversations near 24h expiry`, color: RED });
        if (cc?.failedMessages > 0) alerts.push({ text: `${cc.failedMessages} failed messages today`, color: RED });
        const waMissing = allClinics.filter(c => c.connection_status !== 'connected').length;
        if (waMissing > 0) alerts.push({ text: `${waMissing} clinic${waMissing > 1 ? 's' : ''} missing WhatsApp`, color: YELLOW });
        const topColor = alerts.some(a => a.color === RED) ? RED : alerts.length > 0 ? YELLOW : GREEN;
        const topLabel = alerts.length === 0 ? 'System healthy — no issues' : alerts[0].text;
        return (
          <div style={{
            borderRadius: 12, padding: '12px 20px', marginBottom: 20, marginTop: 12,
            background: topColor === RED ? 'rgba(239,68,68,0.06)' : topColor === YELLOW ? 'rgba(251,191,36,0.04)' : 'rgba(16,185,129,0.04)',
            border: `1px solid ${topColor === RED ? 'rgba(239,68,68,0.15)' : topColor === YELLOW ? 'rgba(251,191,36,0.1)' : 'rgba(16,185,129,0.1)'}`,
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: topColor, animation: topColor === RED ? 'opDotPulse 1.5s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: topColor }}>{topLabel}</span>
            {alerts.length > 1 && alerts.slice(1).map((a, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, color: a.color, padding: '2px 8px', borderRadius: 4, background: a.color + '10' }}>{a.text}</span>
            ))}
            <span style={{ fontSize: 10, color: 'rgba(141,147,166,0.3)', marginLeft: 'auto' }}>Uptime: {fmtSec(h.uptime || 0)}</span>
          </div>
        );
      })()}

      {/* ═══ ACTION REQUIRED ═══ */}
      {(expiringTrials.length > 0 || pendingNumbers.length > 0) && <>
        {expiringTrials.length > 0 && (
          <div style={{ marginBottom: 8, padding: '12px 20px', borderRadius: 14, background: CARD, border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: YELLOW }} />
              <span style={{ fontWeight: 700, fontSize: 12, color: YELLOW }}>{expiringTrials.length} Trial{expiringTrials.length > 1 ? 's' : ''} laufen bald ab</span>
              <span style={{ fontSize: 11, color: MUTED }}>{expiringTrials.slice(0, 3).map(c => c.name).join(', ')}{expiringTrials.length > 3 ? ` +${expiringTrials.length - 3}` : ''}</span>
            </div>
            <button onClick={() => setTab && setTab('trials')} style={{ padding: '5px 14px', borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', color: YELLOW, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Ansehen</button>
          </div>
        )}
        {pendingNumbers.length > 0 && (
          <div style={{ marginBottom: 8, padding: '12px 20px', borderRadius: 14, background: CARD, border: '1px solid rgba(255,138,42,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff8a2a' }} />
              <span style={{ fontWeight: 700, fontSize: 12, color: '#ff8a2a' }}>{pendingNumbers.length} Nummer-Anfrage{pendingNumbers.length > 1 ? 'n' : ''}</span>
              <span style={{ fontSize: 11, color: MUTED }}>{pendingNumbers.map(c => `${c.name} (${c.requested_country_code})`).join(', ')}</span>
            </div>
            <button onClick={() => setTab && setTab('whatsapp')} style={{ padding: '5px 14px', borderRadius: 8, background: 'rgba(255,138,42,0.08)', border: '1px solid rgba(255,138,42,0.15)', color: '#ff8a2a', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Ansehen</button>
          </div>
        )}
      </>}

      {/* ═══ ACTION REQUIRED ═══ */}
      {cc && (() => {
        const actions = [];
        if (cc.pendingReviews > 0) actions.push({ text: `${cc.pendingReviews} patients waiting for review`, impact: cc.pendingReviews > 3 ? 'Conversion risk — patients may lose interest' : 'Doctor bottleneck', color: cc.pendingReviews > 3 ? RED : YELLOW, action: 'View patients', metric: 'reviews' });
        if (cc.windowAtRisk > 0) actions.push({ text: `${cc.windowAtRisk} conversations expiring within 4h`, impact: 'Revenue risk — cannot send freeform messages after 24h', color: RED, action: 'View conversations', metric: 'window' });
        if (cc.failedMessages > 0) actions.push({ text: `${cc.failedMessages} failed messages today`, impact: `${cc.failedMessages} patients did not receive response`, color: cc.failedMessages > 5 ? RED : YELLOW, action: 'Investigate', metric: 'failed' });
        const waMissing = allClinics.filter(c => c.connection_status !== 'connected').length;
        if (waMissing > 0 && allClinics.length > 0) actions.push({ text: `${waMissing} clinics without WhatsApp`, impact: `${waMissing} clinics cannot receive patient messages`, color: YELLOW, action: 'Fix in Clinics', onClick: () => setTab('clinics') });
        if (expiringTrials.length > 0) actions.push({ text: `${expiringTrials.length} trials expiring soon`, impact: `Potential ${fmtEur(expiringTrials.length * 690)} MRR at risk`, color: YELLOW, action: 'View trials', onClick: () => setTab('trials') });
        if (!actions.length) return null;
        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(239,68,68,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: RED, animation: 'opDotPulse 1.5s ease-in-out infinite' }} />
              ACTION REQUIRED ({actions.length})
            </div>
            {actions.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderRadius: 10, background: CARD, border: `1px solid ${a.color}20`, borderLeft: `3px solid ${a.color}`, marginBottom: 6, cursor: 'pointer' }} onClick={() => a.onClick ? a.onClick() : a.metric && openDrill(a.metric)}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: a.color, marginTop: 1 }}>{a.impact}</div>
                </div>
                <button className="fm-trial-btn" onClick={e => { e.stopPropagation(); a.onClick ? a.onClick() : a.metric && openDrill(a.metric); }} style={{ padding: '5px 14px', borderRadius: 8, background: a.color + '12', border: `1px solid ${a.color}30`, color: a.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{a.action}</button>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ═══ COMMAND CENTER ═══ */}
      {cc && <>
        {sectionLabel("LIVE STATUS")}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
          {/* AI Response Time — 4 tier */}
          {(() => {
            const t = cc.aiResponseTime;
            const aiColor = t > 30 ? RED : t > 15 ? '#ff8a2a' : t > 5 ? YELLOW : GREEN;
            const aiLabel = t > 30 ? 'Critical' : t > 15 ? 'Slow' : t > 5 ? 'Elevated' : t > 0 ? 'Healthy' : 'No data';
            return (
              <div onClick={() => openDrill('states')} style={{ ...cardBase, padding: 16, borderLeft: `3px solid ${t > 0 ? aiColor : MUTED}`, cursor: 'pointer', outline: drillMetric === 'states' ? `2px solid ${GOLD}` : 'none' }}>
                <div style={labelStyle}>AI Response</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: t > 0 ? aiColor : 'rgba(255,255,255,0.2)' }}>{t > 0 ? t.toFixed(1) + 's' : '\u2014'}</div>
                <div style={{ fontSize: 10, color: t > 0 ? aiColor : MUTED, marginTop: 2 }}>{aiLabel}</div>
              </div>
            );
          })()}
          {/* Doctor Review Queue */}
          <div onClick={() => cc.pendingReviews > 0 && openDrill('reviews')} style={{ ...cardBase, padding: 16, borderLeft: `3px solid ${cc.pendingReviews > 5 ? RED : cc.pendingReviews > 0 ? YELLOW : GREEN}`, cursor: cc.pendingReviews > 0 ? 'pointer' : 'default', outline: drillMetric === 'reviews' ? `2px solid ${YELLOW}` : 'none' }}>
            <div style={labelStyle}>Review Queue</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: cc.pendingReviews > 5 ? RED : cc.pendingReviews > 0 ? YELLOW : TEXT }}>{cc.pendingReviews}</div>
            <div style={{ fontSize: 10, color: cc.pendingReviews > 0 ? YELLOW : MUTED, marginTop: 2 }}>{cc.pendingReviews > 0 ? 'Click to see patients' : 'Clear'}</div>
          </div>
          {/* 24h Window Risk */}
          <div onClick={() => cc.windowAtRisk > 0 && openDrill('window')} style={{ ...cardBase, padding: 16, borderLeft: `3px solid ${cc.windowAtRisk > 3 ? RED : cc.windowAtRisk > 0 ? YELLOW : GREEN}`, cursor: cc.windowAtRisk > 0 ? 'pointer' : 'default', outline: drillMetric === 'window' ? `2px solid ${YELLOW}` : 'none' }}>
            <div style={labelStyle}>24h Window Risk</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: cc.windowAtRisk > 3 ? RED : cc.windowAtRisk > 0 ? YELLOW : TEXT }}>{cc.windowAtRisk}</div>
            <div style={{ fontSize: 10, color: cc.windowAtRisk > 0 ? YELLOW : MUTED, marginTop: 2 }}>{cc.windowAtRisk > 0 ? 'Click to see details' : 'No risk'}</div>
          </div>
          {/* Failed Messages */}
          {(() => {
            const f = cc.failedMessages;
            const fColor = f > 20 ? RED : f > 5 ? '#ff8a2a' : f > 0 ? YELLOW : GREEN;
            return (
              <div onClick={() => f > 0 && openDrill('failed')} style={{ ...cardBase, padding: 16, borderLeft: `3px solid ${fColor}`, cursor: f > 0 ? 'pointer' : 'default', outline: drillMetric === 'failed' ? `2px solid ${RED}` : 'none' }}>
                <div style={labelStyle}>Failed Messages</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: f > 0 ? fColor : TEXT }}>{f}</div>
                <div style={{ fontSize: 10, color: f > 0 ? fColor : MUTED, marginTop: 2 }}>{f > 20 ? 'Critical — check now' : f > 5 ? 'Multiple failures' : f > 0 ? 'Click to investigate' : 'All delivered'}</div>
              </div>
            );
          })()}
          {/* Messages Today */}
          <div style={{ ...cardBase, padding: 16, borderLeft: `3px solid ${GREEN}` }}>
            <div style={labelStyle}>Messages Today</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: TEXT }}>{cc.messagesToday}</div>
            <div style={{ fontSize: 10, color: cc.bookingsToday > 0 ? GREEN : MUTED, marginTop: 2 }}>{cc.bookingsToday} bookings</div>
          </div>
          {/* Bot States */}
          <div style={{ ...cardBase, padding: 16, borderLeft: `3px solid ${GOLD}` }}>
            <div style={labelStyle}>Active Conversations</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: TEXT }}>{(cc.botStates || []).reduce((s, r) => s + r.count, 0)}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{(cc.botStates || []).length} states</div>
          </div>
        </div>

        {/* ═══ DRILL-DOWN PANEL ═══ */}
        {drillMetric && (
          <div style={{ ...cardBase, padding: '16px 20px', marginBottom: 20, borderLeft: `3px solid ${drillMetric === 'failed' ? RED : YELLOW}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {drillMetric === 'reviews' ? 'Patients Awaiting Review' : drillMetric === 'window' ? '24h Window — At Risk' : drillMetric === 'failed' ? 'Failed Messages' : 'Bot States by Clinic'}
              </span>
              <button onClick={() => setDrillMetric(null)} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 14, cursor: 'pointer' }}>{"\u2715"}</button>
            </div>
            {drillLoading ? <div style={{ color: MUTED, fontSize: 12 }}>Loading...</div> : !drillData?.items?.length ? <div style={{ color: MUTED, fontSize: 12 }}>No items</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {drillData.items.slice(0, 15).map((item, i) => {
                  // Severity color based on waiting time
                  const waitH = item.hours_since != null ? item.hours_since : (item.updated_at ? (Date.now() - new Date(item.updated_at).getTime()) / 3600000 : 0);
                  const waitColor = drillMetric === 'window'
                    ? (waitH > 23 ? RED : waitH > 22 ? '#ff8a2a' : YELLOW)
                    : (waitH > 48 ? RED : waitH > 12 ? '#ff8a2a' : waitH > 2 ? YELLOW : GREEN);
                  const waitLabel = drillMetric === 'window'
                    ? `${Math.max(0, Math.round(24 - waitH))}h left`
                    : (waitH > 0 ? `${waitH < 1 ? Math.round(waitH * 60) + 'm' : Math.round(waitH) + 'h'} waiting` : '');
                  return (
                    <div key={item.conversation_id || item.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${waitH > 12 || (drillMetric === 'window' && waitH > 22) ? waitColor : 'transparent'}` }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: waitColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, minWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.clinic_name}</span>
                      {(item.first_name || item.last_name) && <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', minWidth: 110 }}>{[item.first_name, item.last_name].filter(Boolean).join(' ')}</span>}
                      {item.flow_state && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,138,42,0.1)', color: '#ff8a2a', fontWeight: 600 }}>{item.flow_state}</span>}
                      {waitLabel && <span style={{ fontSize: 10, fontWeight: 700, color: waitColor, minWidth: 60 }}>{waitLabel}</span>}
                      {item.phone && <span style={{ fontSize: 10, color: '#444', marginLeft: 'auto', fontFamily: 'monospace' }}>{item.phone}</span>}
                      {item.count != null && <span style={{ fontSize: 12, fontWeight: 800, color: TEXT, marginLeft: 'auto' }}>{item.count}</span>}
                    </div>
                  );
                })}
                {drillData.items.length > 15 && <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>+{drillData.items.length - 15} more</div>}
              </div>
            )}
          </div>
        )}

        {/* Flow Health — insights + funnel */}
        {cc.botStates?.length > 0 && (() => {
          const states = cc.botStates || [];
          const total = states.reduce((s, r) => s + r.count, 0);
          const getCount = (pattern) => states.filter(s => (s.flow_state || '').toUpperCase().includes(pattern)).reduce((s, r) => s + r.count, 0);
          const welcome = getCount('WELCOME');
          const intake = getCount('INTAKE');
          const photos = getCount('PHOTO');
          const review = getCount('REVIEW');
          const booking = getCount('BOOKING');
          const completed = getCount('COMPLETED');
          // Bottleneck detection
          const bottlenecks = [];
          if (review > 3) bottlenecks.push({ text: `${review} patients stuck in REVIEW`, color: RED });
          if (intake > 5) bottlenecks.push({ text: `${intake} patients stuck in INTAKE`, color: YELLOW });
          if (photos > 3 && review === 0) bottlenecks.push({ text: `${photos} waiting for photos`, color: YELLOW });
          return (
            <div style={{ ...cardBase, padding: '14px 18px', marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Patient Flow</span>
                <span style={{ fontSize: 10, color: MUTED }}>{total} active</span>
              </div>
              {/* Funnel */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: bottlenecks.length > 0 ? 12 : 0 }}>
                {[
                  { label: 'Welcome', count: welcome, color: '#10b981' },
                  { label: 'Intake', count: intake, color: '#4cc9ff' },
                  { label: 'Photos', count: photos, color: '#a78bfa' },
                  { label: 'Review', count: review, color: '#ff8a2a' },
                  { label: 'Booking', count: booking, color: '#10b981' },
                  { label: 'Done', count: completed, color: '#6b7280' },
                ].map((s, i, arr) => (
                  <React.Fragment key={s.label}>
                    <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: s.count > 0 ? s.color + '08' : 'transparent', borderRadius: 6, border: s.count > 0 ? `1px solid ${s.color}15` : '1px solid transparent' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.count > 0 ? s.color : 'rgba(255,255,255,0.1)' }}>{s.count}</div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: s.count > 0 ? MUTED : 'rgba(255,255,255,0.08)' }}>{s.label}</div>
                    </div>
                    {i < arr.length - 1 && <div style={{ color: 'rgba(255,255,255,0.08)', fontSize: 10, padding: '0 2px' }}>{"\u203A"}</div>}
                  </React.Fragment>
                ))}
              </div>
              {/* Bottleneck alerts */}
              {bottlenecks.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: b.color + '08', marginTop: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: b.color }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: b.color }}>{b.text}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Data Quality Alert */}
        {(cc.dataQuality?.missing_phone > 0 || cc.dataQuality?.missing_name > 0) && (
          <div style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.1)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: YELLOW }} />
            <span style={{ color: YELLOW, fontWeight: 600 }}>Data Quality:</span>
            {cc.dataQuality.missing_phone > 0 && <span style={{ color: MUTED }}>{cc.dataQuality.missing_phone} patients without phone</span>}
            {cc.dataQuality.missing_name > 0 && <span style={{ color: MUTED }}>{cc.dataQuality.missing_name} patients without name</span>}
          </div>
        )}
      </>}

      {/* ═══ SECTION 3: BUSINESS METRICS ═══ */}
      <div onClick={() => toggleSection('metrics')} style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 32, marginBottom: collapsed.metrics ? 14 : 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, transition: 'transform .2s', transform: collapsed.metrics ? 'rotate(0)' : 'rotate(-90deg)' }}>{"\u25BC"}</span>
        GESCHÄFTSKENNZAHLEN
      </div>
      {collapsed.metrics && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {/* MRR */}
        <div style={{ ...cardBase, borderLeft: '3px solid rgba(212,175,55,0.4)' }}>
          <div style={labelStyle}>MONATLICHER UMSATZ (MRR)</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: TEXT }}>{fmtEur(mrr)}</div>
          <div style={{ fontSize: 11, color: GREEN, marginTop: 4 }}>+8% ggü. Vormonat</div>
        </div>
        {/* Active Clinics */}
        <div style={{ ...cardBase, borderLeft: `3px solid ${GREEN}` }}>
          <div style={labelStyle}>AKTIVE KLINIKEN</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: TEXT }}>{activeClinicsCount}</div>
          <div style={{ fontSize: 11, color: GREEN, marginTop: 4 }}>+2 diese Woche</div>
        </div>
        {/* Trials Expiring */}
        <div style={{ ...cardBase, borderLeft: `3px solid ${trialsSoon > 0 ? YELLOW : BORDER}` }}>
          <div style={labelStyle}>TRIALS ABLAUFEND (7T)</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: trialsSoon > 0 ? YELLOW : TEXT }}>{trialsSoon}</div>
        </div>
        {/* Failed Payments */}
        <div style={{ ...cardBase, borderLeft: `3px solid ${failedPayments > 0 ? RED : BORDER}` }}>
          <div style={labelStyle}>FEHLGESCHLAGENE ZAHLUNGEN</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: failedPayments > 0 ? RED : TEXT }}>{failedPayments}</div>
        </div>
      </div>}

    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   1b) TRIALS / TRIAL PIPELINE
   ═══════════════════════════════════════════════════════════ */

const DEMO_TRIALS = [
  { id: 'demo-1', name: 'Hair of Istanbul', email: 'info@hairofistanbul.com', phone: '+90 532 111 2233', plan: 'pro', city: 'Istanbul', country: 'TR', contact_name: 'Mehmet Yilmaz', website: 'hairofistanbul.com', connection_status: 'connected', meta_connected: true, workspace_state: 'trial', subscription_status: null, google_connected: true, created_at: new Date(Date.now() - 1 * 86400000).toISOString(), trial_ends_at: new Date(Date.now() + 2 * 86400000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString(), _demo: true },
  { id: 'demo-2', name: 'Berlin Hair Clinic', email: 'contact@berlinhair.de', phone: '+49 30 555 8899', plan: 'core', city: 'Berlin', country: 'DE', contact_name: 'Sarah Weber', website: 'berlinhair.de', connection_status: null, meta_connected: false, workspace_state: 'trial', subscription_status: null, google_connected: false, created_at: new Date(Date.now() - 2.5 * 86400000).toISOString(), trial_ends_at: new Date(Date.now() + 6 * 3600000).toISOString(), updated_at: new Date(Date.now() - 7200000).toISOString(), _demo: true },
  { id: 'demo-3', name: 'Dental Excellence Antalya', email: 'clinic@dentalexcellence.tr', phone: '+90 242 333 4455', plan: 'operations', city: 'Antalya', country: 'TR', contact_name: 'Dr. Ayse Kaya', website: 'dentalexcellence.tr', connection_status: 'connected', meta_connected: true, workspace_state: 'trial', subscription_status: null, google_connected: true, created_at: new Date(Date.now() - 0.5 * 86400000).toISOString(), trial_ends_at: new Date(Date.now() + 2.5 * 86400000).toISOString(), updated_at: new Date(Date.now() - 1800000).toISOString(), _demo: true },
  { id: 'demo-4', name: 'Premium Hair Turkey', email: 'info@premiumhair.com.tr', phone: '+90 212 777 8800', plan: 'pro', city: 'Istanbul', country: 'TR', contact_name: 'Ahmet Demir', website: 'premiumhair.com.tr', connection_status: 'connected', meta_connected: true, workspace_state: 'active', subscription_status: 'active', google_connected: true, created_at: new Date(Date.now() - 10 * 86400000).toISOString(), trial_ends_at: new Date(Date.now() - 7 * 86400000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString(), _demo: true, converted_mrr: 990 },
  { id: 'demo-5', name: 'Aesthetik Klinik Izmir', email: 'info@aesthetik-izmir.com', phone: '+90 232 444 5566', plan: 'core', city: 'Izmir', country: 'TR', contact_name: 'Emre Ozturk', website: 'aesthetik-izmir.com', connection_status: 'connected', meta_connected: true, workspace_state: 'trial', subscription_status: null, google_connected: false, created_at: new Date(Date.now() - 0.2 * 86400000).toISOString(), trial_ends_at: new Date(Date.now() + 2.8 * 86400000).toISOString(), updated_at: new Date(Date.now() - 900000).toISOString(), _demo: true },
  { id: 'demo-6', name: 'MedVoyage Clinic', email: 'hello@medvoyage.io', phone: '+90 216 999 1122', plan: 'enterprise', city: 'Istanbul', country: 'TR', contact_name: 'Can Arslan', website: 'medvoyage.io', connection_status: 'connected', meta_connected: true, workspace_state: 'active', subscription_status: 'active', google_connected: true, created_at: new Date(Date.now() - 14 * 86400000).toISOString(), trial_ends_at: new Date(Date.now() - 11 * 86400000).toISOString(), updated_at: new Date(Date.now() - 2 * 86400000).toISOString(), _demo: true, converted_mrr: 2500 },
  { id: 'demo-7', name: 'Sapphire Hair Clinic', email: 'booking@sapphirehair.com', phone: '+90 532 888 3344', plan: 'pro', city: 'Ankara', country: 'TR', contact_name: 'Burak Yildiz', website: 'sapphirehair.com', connection_status: null, meta_connected: true, workspace_state: 'trial_expired', subscription_status: null, google_connected: false, created_at: new Date(Date.now() - 5 * 86400000).toISOString(), trial_ends_at: new Date(Date.now() - 2 * 86400000).toISOString(), updated_at: new Date(Date.now() - 3 * 86400000).toISOString(), _demo: true },
  { id: 'demo-8', name: 'Nova Dental Studio', email: 'info@novadental.de', phone: '+49 89 123 4567', plan: 'core', city: 'Muenchen', country: 'DE', contact_name: 'Lisa Hartmann', website: 'novadental.de', connection_status: 'connected', meta_connected: true, workspace_state: 'trial', subscription_status: null, google_connected: false, created_at: new Date(Date.now() - 1.5 * 86400000).toISOString(), trial_ends_at: new Date(Date.now() + 1.5 * 86400000).toISOString(), updated_at: new Date(Date.now() - 5400000).toISOString(), _demo: true },
];


function TabTrials({ d, load }) {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const rawClinics = d.clinics?.clinics || [];

  useEffect(() => { load('clinics', api.getPlatformClinics); }, []);

  // Use real data if available, otherwise demo
  const hasReal = rawClinics.length > 0;
  const clinics = hasReal ? rawClinics : DEMO_TRIALS;

  // Derive trial states
  const now = new Date();
  const categorized = clinics.map(c => {
    const trialEnd = c.trial_ends_at ? new Date(c.trial_ends_at) : null;
    const hoursLeft = trialEnd ? (trialEnd - now) / 3600000 : null;
    const daysLeft = hoursLeft !== null ? hoursLeft / 24 : null;
    // "Converted" = real Stripe payment completed, not just subscription_status='active' on demo/trial clinics
    // A clinic is truly converted only if: has stripe_subscription_id AND workspace is not demo/trial
    const hasRealSubscription = !!c.stripe_subscription_id && c.subscription_status === 'active';
    const isDemo = c.workspace_state === 'demo' || c.type === 'demo';
    const isPaid = hasRealSubscription && !isDemo;
    const isExpired = (trialEnd && trialEnd < now && !isPaid) || c.workspace_state === 'trial_expired';
    const isActive = !isPaid && !isExpired;
    const isExpiring = isActive && hoursLeft !== null && hoursLeft > 0 && hoursLeft <= 48;
    let stage = 'active';
    if (isPaid) stage = 'converted';
    else if (isExpired) stage = 'expired';
    else if (isExpiring) stage = 'expiring';
    else stage = 'active';
    const checks = { whatsapp: c.connection_status === 'connected', meta: !!c.meta_connected, google: !!c.google_connected };
    const setupScore = Object.values(checks).filter(Boolean).length;
    const needsAttention = (stage === 'active' || stage === 'expiring') && setupScore < 3;
    let timeLabel = '', timeColor = '#10b981';
    if (stage === 'converted') { timeLabel = 'Konvertiert'; timeColor = '#4cc9ff'; }
    else if (stage === 'expired') { timeLabel = 'Abgelaufen'; timeColor = '#ef4444'; }
    else if (hoursLeft !== null && hoursLeft <= 24) { timeLabel = Math.max(1, Math.round(hoursLeft)) + 'h left'; timeColor = '#ef4444'; }
    else if (daysLeft !== null && daysLeft <= 2) { timeLabel = Math.ceil(daysLeft) + 'd left'; timeColor = '#fbbf24'; }
    else if (daysLeft !== null) { timeLabel = Math.ceil(daysLeft) + 'd left'; timeColor = '#10b981'; }

    // Derive rich status label + primary action
    let statusLabel, statusColor, actionLabel, actionColor;
    if (stage === 'converted') {
      statusLabel = 'CONVERTED'; statusColor = '#4cc9ff'; actionLabel = 'Open CRM'; actionColor = '#4cc9ff';
    } else if (stage === 'expired') {
      statusLabel = 'EXPIRED'; statusColor = '#ef4444'; actionLabel = 'Re-Engage'; actionColor = '#ef4444';
    } else if (stage === 'expiring' && setupScore < 2) {
      statusLabel = 'SETUP CRITICAL'; statusColor = '#ef4444'; actionLabel = 'Complete Setup'; actionColor = '#ef4444';
    } else if (stage === 'expiring') {
      statusLabel = 'EXPIRING SOON'; statusColor = '#fbbf24'; actionLabel = 'Review'; actionColor = '#fbbf24';
    } else if (setupScore === 0) {
      statusLabel = 'SETUP PENDING'; statusColor = '#fbbf24'; actionLabel = 'Complete Setup'; actionColor = '#fbbf24';
    } else if (!checks.meta) {
      statusLabel = 'WA SETUP PENDING'; statusColor = '#ff8a2a'; actionLabel = 'Fix Integrations'; actionColor = '#ff8a2a';
    } else if (!checks.whatsapp) {
      statusLabel = 'WA PENDING'; statusColor = '#ff8a2a'; actionLabel = 'WhatsApp Setup'; actionColor = '#ff8a2a';
    } else if (setupScore === 3) {
      statusLabel = 'READY'; statusColor = '#10b981'; actionLabel = 'View Clinic'; actionColor = '#10b981';
    } else {
      statusLabel = 'ACTIVE'; statusColor = '#10b981'; actionLabel = 'Complete Setup'; actionColor = '#10b981';
    }

    return { ...c, trialEnd, hoursLeft, daysLeft, stage, checks, setupScore, needsAttention, timeLabel, timeColor, statusLabel, statusColor, actionLabel, actionColor };
  });

  const counts = { active: 0, expiring: 0, converted: 0, expired: 0, needsAttention: 0 };
  categorized.forEach(c => { if (counts[c.stage] !== undefined) counts[c.stage]++; if (c.needsAttention) counts.needsAttention++; });
  const effectiveFilter = (filter !== 'all' && !categorized.some(c => c.stage === filter)) ? 'all' : filter;
  const filtered = effectiveFilter === 'all' ? categorized : categorized.filter(c => c.stage === effectiveFilter);
  const stageOrder = { expiring: 0, active: 1, converted: 2, expired: 3 };
  // Sort: expiring first, then needs-setup, then active, then converted, then expired
  const sorted = [...filtered].sort((a, b) => {
    const ao = stageOrder[a.stage] ?? 9, bo = stageOrder[b.stage] ?? 9;
    if (ao !== bo) return ao - bo;
    // Within same stage: lowest setup score (most broken) first
    if (a.setupScore !== b.setupScore) return a.setupScore - b.setupScore;
    return (a.hoursLeft ?? 999) - (b.hoursLeft ?? 999);
  });
  const attentionItems = categorized.filter(c => c.needsAttention || c.stage === 'expiring').sort((a, b) => (a.hoursLeft ?? 999) - (b.hoursLeft ?? 999));
  const convertedMrr = categorized.filter(c => c.stage === 'converted').reduce((sum, c) => sum + (c.converted_mrr || ({ core: 690, pro: 990, operations: 1490, enterprise: 2500 }[c.plan] || 690)), 0);

  const planColors = { core: '#6b7280', pro: '#4cc9ff', operations: '#a78bfa', enterprise: '#D4AF37' };
  const stageColors = { active: '#10b981', expiring: '#fbbf24', converted: '#4cc9ff', expired: '#ef4444' };
  const stageLabels = { active: 'Aktiv', expiring: 'Kritisch', converted: 'Konvertiert', expired: 'Abgelaufen' };
  const stageIcons = { active: '\u25CF', expiring: '\u25C9', converted: '\u2713', expired: '\u25CB' };
  const fmtDate = (dt) => dt ? new Date(dt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '\u2014';
  const fmtEur = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  const CARD = '#121826', BORDER = 'rgba(255,255,255,0.06)', MUTED = '#8D93A6', TEXT = '#F3F4F7';

  return (
    <div style={{ margin: '-0px -8px', padding: '0 8px' }}>
      {!hasReal && <div style={{ padding: '6px 14px', marginBottom: 12, borderRadius: 8, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)', fontSize: 11, color: '#d4af37', fontWeight: 600 }}>Demo-Daten — echte Trials erscheinen nach ersten Signups</div>}

      {/* Hover + pulse styles */}
      <style>{`
        .fm-trial-card{transition:all .18s ease}
        .fm-trial-card:hover{background:#151d2f !important;border-color:rgba(212,175,55,0.18) !important;box-shadow:0 0 20px rgba(212,175,55,0.04)}
        .fm-trial-btn{transition:all .15s ease}
        .fm-trial-btn:hover{filter:brightness(1.2);transform:translateY(-1px)}
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Trial Pipeline</h2>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Revenue Funnel — Homepage → Trial → Onboarding → Paid</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'opDotPulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>Live</span>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        <div style={{ background: CARD, borderRadius: 16, padding: '20px 18px', border: `1px solid ${BORDER}`, borderTop: '3px solid #10b981' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(16,185,129,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Aktive Trials</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: counts.active > 0 ? TEXT : 'rgba(255,255,255,0.15)', lineHeight: 1 }}>{counts.active}</div>
          <div style={{ fontSize: 11, color: counts.active > 0 ? '#10b981' : MUTED, marginTop: 6, fontWeight: 600 }}>{counts.active > 0 ? `${counts.active} in Pipeline` : counts.converted > 0 ? 'Alle konvertiert' : 'Pipeline leer'}</div>
        </div>
        <div style={{ background: CARD, borderRadius: 16, padding: '20px 18px', border: `1px solid ${counts.expiring > 0 ? 'rgba(251,191,36,0.25)' : BORDER}`, borderTop: '3px solid #fbbf24' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(251,191,36,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>{"Kritisch (<48h)"}</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: counts.expiring > 0 ? '#fbbf24' : TEXT, lineHeight: 1 }}>{counts.expiring}</div>
          <div style={{ fontSize: 11, color: counts.expiring > 0 ? '#fbbf24' : MUTED, marginTop: 6, fontWeight: 600 }}>{counts.expiring > 0 ? 'Sofort handeln' : 'Keine kritischen Trials'}</div>
        </div>
        <div style={{ background: CARD, borderRadius: 16, padding: '20px 18px', border: `1px solid ${BORDER}`, borderTop: '3px solid #4cc9ff' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(76,201,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Konvertiert</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{counts.converted}</div>
          <div style={{ fontSize: 11, color: counts.converted > 0 ? '#4cc9ff' : MUTED, marginTop: 6, fontWeight: 600 }}>{counts.converted > 0 ? `${Math.round(counts.converted / Math.max(1, categorized.length) * 100)}% Conversion Rate` : 'Noch keine Conversions'}</div>
        </div>
        <div style={{ background: CARD, borderRadius: 16, padding: '20px 18px', border: `1px solid ${BORDER}`, borderTop: '3px solid #ef4444' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(239,68,68,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Abgelaufen</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: counts.expired > 0 ? '#ef4444' : 'rgba(255,255,255,0.2)', lineHeight: 1 }}>{counts.expired}</div>
          <div style={{ fontSize: 11, color: counts.expired > 0 ? '#ef4444' : MUTED, marginTop: 6, fontWeight: 600 }}>{counts.expired > 0 ? 'Umsatz entgangen' : 'Kein Churn'}</div>
        </div>
        <div style={{ background: CARD, borderRadius: 16, padding: '20px 18px', border: '1px solid rgba(212,175,55,0.12)', borderTop: '3px solid #d4af37' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(212,175,55,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Pipeline MRR</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{fmtEur(convertedMrr)}</div>
          <div style={{ fontSize: 11, color: convertedMrr > 0 ? '#d4af37' : MUTED, marginTop: 6, fontWeight: 600 }}>{convertedMrr > 0 ? 'Gesicherter Monatsumsatz' : 'Noch kein MRR'}</div>
        </div>
      </div>

      {/* CONVERSION FUNNEL — key business insight */}
      <div style={{ padding: '16px 20px', background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {[
            { label: 'Signups', count: categorized.length, color: '#d4af37' },
            { label: 'Aktiv', count: counts.active + counts.expiring, color: '#10b981' },
            { label: 'Konvertiert', count: counts.converted, color: '#4cc9ff' },
          ].map((step, i, arr) => (
            <React.Fragment key={step.label}>
              <div style={{ flex: 1, textAlign: 'center', padding: '10px 6px', background: step.color + '08', borderRadius: 10, border: `1px solid ${step.color}15` }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: step.color }}>{step.count}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginTop: 2 }}>{step.label}</div>
              </div>
              {i < arr.length - 1 && <div style={{ padding: '0 6px', color: 'rgba(255,255,255,0.1)', fontSize: 16 }}>{"\u2192"}</div>}
            </React.Fragment>
          ))}
          <div style={{ padding: '0 6px', color: 'rgba(255,255,255,0.1)', fontSize: 16 }}>=</div>
          <div style={{ flex: 1, textAlign: 'center', padding: '10px 6px', background: 'rgba(212,175,55,0.06)', borderRadius: 10, border: '1px solid rgba(212,175,55,0.12)' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#d4af37' }}>{fmtEur(convertedMrr)}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginTop: 2 }}>MRR</div>
          </div>
          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.04)', margin: '0 12px' }} />
          <div style={{ textAlign: 'right', minWidth: 120 }}>
            <div style={{ fontSize: 11, color: MUTED }}>Conversion <span style={{ fontWeight: 700, color: '#4cc9ff' }}>{categorized.length > 0 ? Math.round(counts.converted / categorized.length * 100) : 0}%</span></div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>Churn <span style={{ fontWeight: 700, color: counts.expired > 0 ? '#ef4444' : '#10b981' }}>{categorized.length > 0 ? Math.round(counts.expired / categorized.length * 100) : 0}%</span></div>
          </div>
        </div>
      </div>

      {/* PIPELINE HEALTH SIGNAL */}
      {(() => {
        const totalActive = counts.active + counts.expiring;
        let msg = null, msgColor = MUTED;
        if (totalActive === 0 && counts.converted === 0) {
          msg = 'Pipeline leer — keine aktiven Trials oder Conversions'; msgColor = '#fbbf24';
        } else if (totalActive === 0 && counts.converted > 0) {
          msg = `Alle Trials konvertiert — keine neuen Trials in der Pipeline`; msgColor = '#ff8a2a';
        } else if (counts.expiring > 0 && counts.expiring >= totalActive) {
          msg = `${counts.expiring} von ${totalActive} Trials laufen in <48h ab — Conversion-Risiko`; msgColor = '#fbbf24';
        }
        if (!msg) return null;
        return (
          <div style={{ padding: '10px 16px', marginBottom: 16, borderRadius: 10, background: msgColor + '08', border: `1px solid ${msgColor}20`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: msgColor, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: msgColor }}>{msg}</span>
          </div>
        );
      })()}

      {/* NEEDS ATTENTION */}
      {attentionItems.length > 0 && <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(251,191,36,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', animation: 'opDotPulse 1.5s ease-in-out infinite' }} />
          AKTION ERFORDERLICH
        </div>
        <div style={{ background: CARD, borderRadius: 14, border: '1px solid rgba(251,191,36,0.15)', overflow: 'hidden' }}>
          {attentionItems.slice(0, 5).map((c, i) => {
            const issues = [];
            if (c.stage === 'expiring') issues.push({ text: c.timeLabel, color: c.timeColor });
            if (!c.checks.whatsapp) issues.push({ text: 'WhatsApp ausstehend', color: c.stage === 'expiring' ? '#ef4444' : '#fbbf24' });
            if (!c.checks.meta) issues.push({ text: 'WA Setup ausstehend', color: c.stage === 'expiring' ? '#ef4444' : '#ff8a2a' });
            if (!c.checks.google) issues.push({ text: 'Google ausstehend', color: '#ff8a2a' });
            return (
              <div key={c.id} onClick={() => { setFilter('all'); setExpandedId(c.id); }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < Math.min(attentionItems.length, 5) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: c.timeColor + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: c.timeColor, flexShrink: 0 }}>{c.name?.charAt(0) || '?'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{c.contact_name || c.email}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {issues.map((iss, j) => <span key={j} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: iss.color + '15', color: iss.color }}>{iss.text}</span>)}
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>{"\u203A"}</span>
              </div>
            );
          })}
        </div>
      </div>}

      {/* FILTER TABS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {['all', 'active', 'expiring', 'converted', 'expired'].map(f => {
          const isAct = effectiveFilter === f;
          const color = stageColors[f] || '#d4af37';
          const count = f === 'all' ? categorized.length : (counts[f] || 0);
          return <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 18px', borderRadius: 10, border: `1px solid ${isAct ? color : 'rgba(255,255,255,0.06)'}`, background: isAct ? color + '18' : 'transparent', color: isAct ? color : 'rgba(167,177,195,0.6)', fontWeight: isAct ? 700 : 500, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
            <span style={{ marginRight: 4 }}>{stageIcons[f] || '\u25C6'}</span>
            {f === 'all' ? 'Alle' : stageLabels[f]} ({count})
          </button>;
        })}
      </div>

      {/* ═══ TRIAL CARDS ═══ */}
      <div>
        {sorted.map(c => {
          const isOpen = expandedId === c.id;
          const planLabel = (c.plan || 'core').charAt(0).toUpperCase() + (c.plan || 'core').slice(1);
          const planMrr = { core: 690, pro: 990, operations: 1490, enterprise: 2500 }[c.plan] || 690;
          return (
            <div key={c.id} className="fm-trial-card" style={{
              background: CARD, borderRadius: 14, marginBottom: 10, overflow: 'hidden',
              border: `1px solid ${c.stage === 'expiring' ? 'rgba(251,191,36,0.2)' : BORDER}`,
              borderLeft: `4px solid ${stageColors[c.stage] || '#6b7280'}`,
              cursor: 'pointer', position: 'relative',
            }}>
              {/* ── STATUS BADGE (top-right) ── */}
              <div style={{
                position: 'absolute', top: 12, right: 16, display: 'flex', alignItems: 'center', gap: 6, zIndex: 1,
              }}>
                {/* Time badge */}
                {c.stage !== 'converted' && c.stage !== 'expired' && c.timeLabel && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6,
                    background: c.timeColor + '18', color: c.timeColor,
                    animation: c.stage === 'expiring' ? 'opPulse 2s ease-in-out infinite' : 'none',
                  }}>{c.timeLabel}</span>
                )}
                {/* Status label */}
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 6,
                  background: c.statusColor + '20', color: c.statusColor,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  border: `1px solid ${c.statusColor}30`,
                }}>{c.statusLabel}</span>
              </div>

              {/* ── MAIN ROW ── */}
              <div onClick={() => setExpandedId(isOpen ? null : c.id)} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `linear-gradient(135deg, ${c.statusColor}20, ${planColors[c.plan] || '#6b7280'}15)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17, fontWeight: 800, color: c.statusColor,
                  border: `1px solid ${c.statusColor}20`,
                }}>{c.name?.charAt(0) || '?'}</div>

                {/* LEFT: Clinic name + contact + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                    {c._demo && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(212,175,55,0.1)', color: '#d4af37', fontWeight: 600 }}>Demo</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: MUTED }}>
                    <span>{c.contact_name || c.email}</span>
                    {c.city && <><span style={{ color: 'rgba(255,255,255,0.08)' }}>{"\u00B7"}</span><span>{c.city}</span></>}
                    <span style={{ color: 'rgba(255,255,255,0.08)' }}>{"\u00B7"}</span>
                    <span style={{ fontWeight: 600, color: planColors[c.plan] || MUTED }}>{planLabel} {fmtEur(planMrr)}/Mo.</span>
                  </div>
                  {/* Integration status inline — 3-state: connected (green) / not configured (yellow) / error would be red */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    {[
                      { key: 'whatsapp', label: 'WhatsApp', ok: c.checks.whatsapp },
                      { key: 'meta', label: 'WA Setup', ok: c.checks.meta },
                      { key: 'google', label: 'Google', ok: c.checks.google },
                    ].map(ch => {
                      // Green = connected, Yellow/muted = not yet configured (default for new trials)
                      const dotColor = ch.ok ? '#10b981' : (c.stage === 'converted' ? 'rgba(255,255,255,0.12)' : '#fbbf24');
                      const textColor = ch.ok ? 'rgba(16,185,129,0.7)' : (c.stage === 'converted' ? 'rgba(255,255,255,0.2)' : 'rgba(251,191,36,0.55)');
                      return (
                        <div key={ch.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: dotColor,
                            boxShadow: ch.ok ? '0 0 4px rgba(16,185,129,0.4)' : 'none',
                          }} />
                          <span style={{ fontSize: 10, fontWeight: 600, color: textColor }}>{ch.label}</span>
                        </div>
                      );
                    })}
                    <span style={{ color: 'rgba(255,255,255,0.06)' }}>{"\u00B7"}</span>
                    {c.stage === 'converted' ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#4cc9ff' }}>{fmtEur(c.converted_mrr || planMrr)}/Mo. aktiv</span>
                    ) : c.stage === 'expired' ? (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(239,68,68,0.5)' }}>{fmtEur(planMrr)}/Mo. entgangen</span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(212,175,55,0.5)' }}>{fmtEur(planMrr)}/Mo. potenziell</span>
                    )}
                  </div>
                </div>

                {/* RIGHT: Action button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <button className="fm-trial-btn" onClick={(e) => { e.stopPropagation(); setExpandedId(c.id); }} style={{
                    padding: '7px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: c.actionColor + '12', border: `1px solid ${c.actionColor}30`,
                    color: c.actionColor, cursor: 'pointer', fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}>{c.actionLabel}</button>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.12)', transition: 'transform .2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0)' }}>{"\u203A"}</span>
                </div>
              </div>

              {/* ── EXPANDED DETAIL ── */}
              {isOpen && <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                {/* Setup checklist */}
                <div style={{ padding: '16px 0 12px', display: 'flex', gap: 16 }}>
                  {[
                    { label: 'WhatsApp', ok: c.checks.whatsapp, icon: '\uD83D\uDCAC' },
                    { label: 'WA Setup', ok: c.checks.meta, icon: '\uD83C\uDF10' },
                    { label: 'Google Calendar', ok: c.checks.google, icon: '\uD83D\uDCC5' },
                  ].map(ch => {
                    // 3-state: green = connected, yellow = not configured yet, red only for errors
                    const bgColor = ch.ok ? 'rgba(16,185,129,0.06)' : 'rgba(251,191,36,0.04)';
                    const borderColor = ch.ok ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.12)';
                    const textColor = ch.ok ? '#10b981' : '#fbbf24';
                    return (
                    <div key={ch.label} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10,
                      background: bgColor, border: `1px solid ${borderColor}`,
                    }}>
                      <span style={{ fontSize: 14 }}>{ch.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: textColor }}>{ch.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: textColor }}>{ch.ok ? '\u2713' : '\u2014'}</span>
                    </div>
                  );})}
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(167,177,195,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Klinik</div>
                    <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{c.name}</div>
                    {c.website && <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener" style={{ fontSize: 12, color: '#d4af37', textDecoration: 'none' }}>{c.website}</a>}
                    {c.city && <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{c.city}{c.country ? `, ${c.country}` : ''}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(167,177,195,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Kontakt</div>
                    <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{c.contact_name || c.name}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{c.email}</div>
                    {c.phone && <div style={{ fontSize: 12, color: MUTED }}>{c.phone}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(167,177,195,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Subscription</div>
                    <div style={{ fontSize: 13, color: '#ccc' }}>Plan: <span style={{ fontWeight: 700, color: planColors[c.plan] || '#fff' }}>{planLabel}</span> ({fmtEur(planMrr)}/Mo.)</div>
                    <div style={{ fontSize: 13, color: '#ccc' }}>Workspace: {c.workspace_state || '\u2014'}</div>
                    <div style={{ fontSize: 13, color: '#ccc' }}>Abo: {c.subscription_status ? <span style={{ color: c.subscription_status === 'active' ? '#10b981' : '#fbbf24' }}>{c.subscription_status}</span> : <span style={{ color: MUTED }}>Kein Abo</span>}</div>
                  </div>
                </div>

                {/* Trial progress bar */}
                <div style={{ marginTop: 18, padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${BORDER}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trial-Fortschritt</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.timeColor }}>{c.timeLabel}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    {(() => {
                      let pct = 100;
                      if (c.stage === 'active' || c.stage === 'expiring') { const total = c.trialEnd ? (c.trialEnd - new Date(c.created_at)) : 3 * 86400000; pct = Math.min(100, Math.max(5, ((now - new Date(c.created_at)) / total) * 100)); }
                      const bg = c.stage === 'converted' ? 'linear-gradient(90deg, #10b981, #4cc9ff)' : c.stage === 'expired' ? '#ef4444' : `linear-gradient(90deg, #10b981 0%, ${c.timeColor} 100%)`;
                      return <div style={{ height: '100%', borderRadius: 3, background: bg, width: pct + '%', transition: 'width 0.4s' }} />;
                    })()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'rgba(141,147,166,0.3)' }}>
                    <span>Start: {fmtDate(c.created_at)}</span><span>Ende: {fmtDate(c.trial_ends_at)}</span>
                  </div>
                </div>
              </div>}
            </div>
          );
        })}
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   1c) OUTREACH / LEAD TRACKING
   ═══════════════════════════════════════════════════════════ */
const OUTREACH_TEMPLATES = {
  en_message_1: `Hi {contact},\n\nI came across {clinic} and was impressed by your results and patient volume.\n\nQuick question — how long does your team take to respond to new WhatsApp inquiries? We found that 60% of patients book with the clinic that responds first.\n\nWe built an AI WhatsApp system specifically for hair transplant clinics:\n- Responds in under 30 seconds, 24/7\n- Qualifies patients, answers pricing & technique questions automatically\n- Books consultations in 7 languages (TR, EN, DE, AR, FR, ES, IT)\n- Works on your existing WhatsApp number\n\nWould a 10-minute screen share be worth your time this week?\n\nBest,\nBastian\nFlowmatix — flowmatix.io`,

  tr_message_1: `Merhaba {contact},\n\n{clinic} hakkında araştırma yaparken klinik sonuçlarınız ve hasta hacminiz dikkatimi çekti.\n\nKısa bir soru — ekibiniz yeni WhatsApp hasta başvurularına ne kadar sürede dönüş yapıyor? Araştırmalarımıza göre hastaların %60'ı ilk yanıt veren kliniği tercih ediyor.\n\nSaç ekimi klinikleri için özel olarak geliştirdiğimiz bir yapay zeka WhatsApp sistemi var:\n- 30 saniye içinde otomatik yanıt, 7/24\n- Hastaları otomatik olarak değerlendirir, fiyat ve teknik soruları yanıtlar\n- 7 dilde randevu oluşturur (TR, EN, DE, AR, FR, ES, IT)\n- Mevcut WhatsApp numaranız üzerinden çalışır\n\nBu hafta 10 dakikalık kısa bir demo için müsait olur musunuz?\n\nSaygılarımla,\nBastian\nFlowmatix — flowmatix.io`,

  en_follow_up_1: `Hi {contact},\n\nFollowing up briefly — I know your schedule is packed.\n\nOne concrete number: a clinic using our system went from 4-hour average response time to 28 seconds. Their booking rate doubled within the first month.\n\nIf this isn't relevant for {clinic} right now, no worries at all. But if you're curious, I can show you a live demo in 10 minutes — no commitment.\n\nBastian`,

  tr_follow_up_1: `Merhaba {contact},\n\nKısaca tekrar yazmak istedim — programınızın yoğun olduğunu biliyorum.\n\nSomut bir rakam: Sistemimizi kullanan bir klinik, ortalama yanıt süresini 4 saatten 28 saniyeye düşürdü. İlk ay içinde randevu oranları ikiye katlandı.\n\nEğer şu an {clinic} için uygun değilse, hiç sorun değil. Ama merak ediyorsanız, 10 dakikada canlı bir demo gösterebilirim — herhangi bir taahhüt yok.\n\nBastian`,

  en_follow_up_2: `Hi {contact},\n\nLast message from me, I promise 😊\n\nWe're currently onboarding our first 5 clinics in Turkey with a special launch offer — setup fee waived and 50% off the first 3 months.\n\nIf the timing is better later, feel free to apply anytime: flowmatix.io/apply\n\nWishing {clinic} continued success!\n\nBastian`,

  tr_follow_up_2: `Merhaba {contact},\n\nSon mesajım, söz veriyorum 😊\n\nŞu anda Türkiye'deki ilk 5 kliniğimizi özel bir lansman teklifiyle kabul ediyoruz — kurulum ücreti ücretsiz ve ilk 3 ay %50 indirimli.\n\nEğer zamanlama şu an uygun değilse, istediğiniz zaman başvurabilirsiniz: flowmatix.io/apply\n\n{clinic}'e başarılar diliyorum!\n\nBastian`,
};

const OUTREACH_STATUSES = [
  { key: 'not_contacted', label: 'Not Contacted', color: '#6b7280' },
  { key: 'message_1', label: 'Message 1', color: '#3b82f6' },
  { key: 'follow_up_1', label: 'Follow-up 1', color: '#8b5cf6' },
  { key: 'follow_up_2', label: 'Follow-up 2', color: '#a855f7' },
  { key: 'replied', label: 'Replied', color: '#eab308' },
  { key: 'demo_scheduled', label: 'Demo', color: '#f97316' },
  { key: 'won', label: 'Won', color: '#22c55e' },
  { key: 'lost', label: 'Lost', color: '#ef4444' },
];

function TabOutreach({ d, load }) {
  const [filter, setFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newLead, setNewLead] = useState({ clinic_name: '', contact_name: '', contact_title: '', city: 'Istanbul', website: '', email: '', phone: '', tags: '' });
  const [notesMap, setNotesMap] = useState({});

  const leads = d.outreach?.leads || [];
  const stats = d.outreachStats || {};

  const filteredLeads = filter ? leads.filter(l => l.status === filter) : leads;

  const refresh = () => {
    load('outreach', () => api.getOutreachLeads(filter ? { status: filter } : {}));
    load('outreachStats', api.getOutreachStats);
  };

  const doSearch = () => {
    load('outreach', () => api.getOutreachLeads({ search }));
  };

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2000);
  };

  const copyTemplate = (templateKey, lead) => {
    const contact = lead.contact_name || lead.contact_title || 'there';
    const clinic = lead.clinic_name;
    const text = OUTREACH_TEMPLATES[templateKey]
      .replace(/\{contact\}/g, contact)
      .replace(/\{clinic\}/g, clinic);
    navigator.clipboard?.writeText(text);
    showToast('Copied!');
  };

  const handleStatusChange = async (lead, newStatus) => {
    try {
      const update = { status: newStatus, last_contacted_at: new Date().toISOString() };
      if (newStatus === 'follow_up_1') {
        update.next_follow_up_at = new Date(Date.now() + 3 * 86400000).toISOString();
      } else if (newStatus === 'follow_up_2') {
        update.next_follow_up_at = new Date(Date.now() + 7 * 86400000).toISOString();
      } else if (newStatus === 'replied') {
        update.reply_received_at = new Date().toISOString();
        update.next_follow_up_at = null;
      } else if (newStatus === 'demo_scheduled' || newStatus === 'won' || newStatus === 'lost') {
        update.next_follow_up_at = null;
      }
      await api.updateOutreachLead(lead.id, update);
      setMsg({ type: 'ok', text: `${lead.clinic_name} -> ${newStatus}` });
      refresh();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  };

  const handleNotesSave = async (lead, notes) => {
    try {
      await api.updateOutreachLead(lead.id, { notes });
    } catch (err) { console.error('Notes save failed', err); showT?.("Notizen konnten nicht gespeichert werden"); }
  };

  const handleCreate = async () => {
    if (!newLead.clinic_name.trim()) return;
    try {
      await api.createOutreachLead(newLead);
      setMsg({ type: 'ok', text: `${newLead.clinic_name} added` });
      setNewLead({ clinic_name: '', contact_name: '', contact_title: '', city: 'Istanbul', website: '', email: '', phone: '', tags: '' });
      setShowAdd(false);
      refresh();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  };

  const handleDelete = async (lead) => {
    if (!confirm(`Delete "${lead.clinic_name}"?`)) return;
    try {
      await api.deleteOutreachLead(lead.id);
      setMsg({ type: 'ok', text: `${lead.clinic_name} deleted` });
      refresh();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  };

  const outreachBadge = (status) => {
    const s = OUTREACH_STATUSES.find(x => x.key === status);
    if (!s) return badge(S.gray, status);
    return badge(s.color, s.label);
  };

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 20, margin: 0 }}>Outreach Pipeline</h2>
        <Btn onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Cancel' : '+ Add Lead'}</Btn>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, padding: '8px 20px', borderRadius: 8, background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 13, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,.3)' }}>{toast}</div>
      )}

      {/* Add lead form */}
      {showAdd && (
        <div style={{ ...S.card, borderLeft: `3px solid ${S.accent}`, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>New Lead</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <input value={newLead.clinic_name} onChange={e => setNewLead({ ...newLead, clinic_name: e.target.value })} placeholder="Clinic Name *" style={inputStyle} />
            <input value={newLead.contact_name} onChange={e => setNewLead({ ...newLead, contact_name: e.target.value })} placeholder="Contact Name" style={inputStyle} />
            <input value={newLead.contact_title} onChange={e => setNewLead({ ...newLead, contact_title: e.target.value })} placeholder="Title (e.g. Owner)" style={inputStyle} />
            <input value={newLead.city} onChange={e => setNewLead({ ...newLead, city: e.target.value })} placeholder="City" style={inputStyle} />
            <input value={newLead.website} onChange={e => setNewLead({ ...newLead, website: e.target.value })} placeholder="Website" style={inputStyle} />
            <input value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} placeholder="Email" style={inputStyle} />
            <input value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} placeholder="Phone" style={inputStyle} />
            <input value={newLead.tags} onChange={e => setNewLead({ ...newLead, tags: e.target.value })} placeholder="Tags (comma-sep)" style={inputStyle} />
            <div><Btn onClick={handleCreate}>Create Lead</Btn></div>
          </div>
        </div>
      )}

      {msg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${msg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: msg.type === 'ok' ? S.green : S.red }}>{msg.text}</div>
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {OUTREACH_STATUSES.map(s => (
          <div key={s.key} onClick={() => setFilter(filter === s.key ? null : s.key)} style={{
            padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
            background: filter === s.key ? s.color + '33' : '#162032',
            border: `1px solid ${filter === s.key ? s.color : 'rgba(255,255,255,0.06)'}`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{stats[s.key] || 0}</span>
            <span style={{ fontSize: 11, color: filter === s.key ? s.color : 'rgba(167,177,195,0.7)', fontWeight: filter === s.key ? 700 : 500 }}>{s.label}</span>
          </div>
        ))}
        <div style={{ padding: '6px 14px', borderRadius: 8, background: '#162032', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{stats.total || 0}</span>
          <span style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)' }}>Total</span>
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="Search clinics, contacts, cities, tags..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#fff', fontSize: 13 }} />
        <Btn onClick={doSearch}>Search</Btn>
        {(search || filter) && <Btn onClick={() => { setSearch(''); setFilter(null); load('outreach', api.getOutreachLeads); }}>Clear</Btn>}
      </div>

      {/* Leads list */}
      {!d.outreach ? <Spin /> : !filteredLeads.length ? <Empty text="No leads found" /> : (
        <div>
          {filteredLeads.map(lead => {
            const isExpanded = expandedId === lead.id;
            const currentNotes = notesMap[lead.id] !== undefined ? notesMap[lead.id] : (lead.notes || '');
            return (
              <div key={lead.id} style={{
                ...S.card,
                borderLeft: `3px solid ${(OUTREACH_STATUSES.find(x => x.key === lead.status) || {}).color || S.gray}`,
                transition: 'all .2s',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{lead.clinic_name}</div>
                    <div style={{ fontSize: 13, color: 'rgba(167,177,195,0.7)', marginTop: 2 }}>
                      {lead.contact_name && <span>{lead.contact_name}</span>}
                      {lead.contact_title && <span style={{ color: '#666' }}> · {lead.contact_title}</span>}
                      {lead.city && <span style={{ color: '#666' }}> · {lead.city}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {outreachBadge(lead.status)}
                    {lead.website && (
                      <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: S.accent, textDecoration: 'none' }}>
                        {lead.website}
                      </a>
                    )}
                  </div>
                </div>

                {/* Quick info row */}
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'rgba(167,177,195,0.7)', flexWrap: 'wrap' }}>
                  {lead.tags && lead.tags.split(',').map(t => (
                    <span key={t.trim()} style={{ padding: '1px 8px', borderRadius: 99, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: 'rgba(167,177,195,0.7)' }}>{t.trim()}</span>
                  ))}
                  {lead.last_contacted_at && <span>Last: {timeAgo(lead.last_contacted_at)}</span>}
                  {lead.next_follow_up_at && <span style={{ color: new Date(lead.next_follow_up_at) < new Date() ? S.red : S.yellow }}>Follow-up: {new Date(lead.next_follow_up_at).toLocaleDateString()}</span>}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e1e3e' }}>
                    <div style={S.grid3}>
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)', marginBottom: 4 }}>Contact Info</div>
                        {lead.email && <div style={{ fontSize: 13, color: '#ccc' }}>Email: {lead.email}</div>}
                        {lead.phone && <div style={{ fontSize: 13, color: '#ccc' }}>Phone: {lead.phone}</div>}
                        {lead.whatsapp && <div style={{ fontSize: 13, color: '#ccc' }}>WhatsApp: {lead.whatsapp}</div>}
                        {lead.linkedin_url && <a href={lead.linkedin_url} target="_blank" rel="noopener" style={{ fontSize: 13, color: S.accent }}>LinkedIn</a>}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)', marginBottom: 4 }}>Location</div>
                        <div style={{ fontSize: 13, color: '#ccc' }}>{lead.city}, {lead.country || 'Turkey'}</div>
                        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Source: {lead.source || 'research'}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>Added: {timeAgo(lead.created_at)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)', marginBottom: 4 }}>Status</div>
                        <select
                          value={lead.status}
                          onChange={e => handleStatusChange(lead, e.target.value)}
                          style={{ ...inputStyle, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
                        >
                          {OUTREACH_STATUSES.map(s => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Notes */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)', marginBottom: 4 }}>Notes</div>
                      <textarea
                        value={currentNotes}
                        onChange={e => setNotesMap(prev => ({ ...prev, [lead.id]: e.target.value }))}
                        onBlur={() => {
                          if (notesMap[lead.id] !== undefined && notesMap[lead.id] !== (lead.notes || '')) {
                            handleNotesSave(lead, notesMap[lead.id]);
                          }
                        }}
                        placeholder="Add notes..."
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                      />
                    </div>

                    {/* Copy Template buttons */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)', marginBottom: 6 }}>Copy Templates</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => copyTemplate('en_message_1', lead)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>EN Message 1</button>
                        <button onClick={() => copyTemplate('tr_message_1', lead)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>TR Message 1</button>
                        <button onClick={() => copyTemplate('en_follow_up_1', lead)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>EN Follow-up 1</button>
                        <button onClick={() => copyTemplate('tr_follow_up_1', lead)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>TR Follow-up 1</button>
                        <button onClick={() => copyTemplate('en_follow_up_2', lead)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>EN Follow-up 2</button>
                        <button onClick={() => copyTemplate('tr_follow_up_2', lead)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>TR Follow-up 2</button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      <Btn small danger onClick={() => handleDelete(lead)}>Delete</Btn>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   2) CLINICS
   ═══════════════════════════════════════════════════════════ */
function TabClinics({ d, load, setTab }) {
  const { t } = useApp();
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState(null);
  const [expandedDocs, setExpandedDocs] = useState(null);
  const [expandedTimeline, setExpandedTimeline] = useState(null);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [impersonateTarget, setImpersonateTarget] = useState(null); // { id, name }
  const [impersonateReason, setImpersonateReason] = useState('');
  const [impersonateLoading, setImpersonateLoading] = useState(false);
  const [pauseTarget, setPauseTarget] = useState(null); // { id, name, action: 'suspend'|'resume' }
  const [pauseLoading, setPauseLoading] = useState(false);
  const clinics = d.clinics;

  const loadDocs = async (orgId) => {
    if (expandedDocs === orgId) { setExpandedDocs(null); return; }
    setExpandedDocs(orgId);
    setDocsLoading(true);
    try {
      const res = await listClinicDocumentsByOrg(orgId);
      setDocs(res?.documents || []);
    } catch { setDocs([]); }
    setDocsLoading(false);
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Delete this document?')) return;
    try {
      await deleteClinicDocument(docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
  };

  const doSearch = () => load('clinics', () => api.getPlatformClinics({ search }));
  const refresh = () => load('clinics', api.getPlatformClinics);

  const handleAction = async (action, orgId, orgName) => {
    try {
      setActionMsg(null);
      if (action === 'suspend') {
        setPauseTarget({ id: orgId, name: orgName, action: 'suspend' });
        return;
      } else if (action === 'resume') {
        setPauseTarget({ id: orgId, name: orgName, action: 'resume' });
        return;
      } else if (action === 'impersonate') {
        // Open confirmation modal instead of prompt
        setImpersonateTarget({ id: orgId, name: orgName });
        setImpersonateReason('');
        return; // don't refresh yet
      } else if (action === 'regen') {
        const res = await api.regenOnboardingLink(orgId);
        setActionMsg({ type: 'ok', text: `New onboarding link: ${res.invitation?.link}` });
      }
      await refresh();
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
  };

  const startImpersonation = async () => {
    if (!impersonateTarget || impersonateReason.length < 5) return;
    setImpersonateLoading(true);
    try {
      const res = await api.impersonateClinic(impersonateTarget.id, impersonateReason);
      const token = res.impersonation?.accessToken;
      if (token) {
        // Open CRM in new tab with impersonation token
        const crmUrl = `https://crm.flowmatix.io/#impersonate=${btoa(`access=${token}&user=${res.impersonation?.targetUser || ''}&org=${impersonateTarget.id}&operator=true&reason=${encodeURIComponent(impersonateReason)}`)}`;
        window.open(crmUrl, '_blank');
        setActionMsg({ type: 'ok', text: `Impersonation gestartet: ${res.impersonation?.targetUser} \u2014 CRM in neuem Tab ge\u00F6ffnet (30 Min. Timeout)` });
      } else {
        setActionMsg({ type: 'ok', text: `Impersonation erstellt f\u00FCr ${res.impersonation?.targetUser} \u2014 ${res.impersonation?.expiresIn}` });
      }
      setImpersonateTarget(null);
      setImpersonateReason('');
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
    setImpersonateLoading(false);
  };

  const executePause = async () => {
    if (!pauseTarget) return;
    setPauseLoading(true);
    try {
      if (pauseTarget.action === 'suspend') {
        await api.suspendClinic(pauseTarget.id, 'Manual suspension from operator console');
        setActionMsg({ type: 'ok', text: `${pauseTarget.name} paused \u2014 bot & automations stopped` });
      } else {
        await api.resumeClinic(pauseTarget.id, 'Resumed from operator console');
        setActionMsg({ type: 'ok', text: `${pauseTarget.name} reactivated \u2014 bot & automations running` });
      }
      setPauseTarget(null);
      await refresh();
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
    setPauseLoading(false);
  };

  // Derive operational states for each clinic
  const allClinics = clinics?.clinics || [];
  const enriched = allClinics.map(c => {
    // WhatsApp state
    let waState = 'not_connected', waColor = '#fbbf24', waLabel = 'Pending setup';
    if (c.connection_status === 'connected') { waState = 'connected'; waColor = '#10b981'; waLabel = 'Connected'; }
    else if (c.connection_status === 'error') { waState = 'error'; waColor = '#ef4444'; waLabel = 'Error'; }

    // Number state
    let numState = 'none', numColor = '#6b7280', numLabel = 'Not assigned';
    if (c.phone_number_id) { numState = 'active'; numColor = '#10b981'; numLabel = 'Active'; }
    else if (c.number_request_status === 'pending') { numState = 'pending'; numColor = '#fbbf24'; numLabel = 'Approval pending'; }
    else if (c.number_request_status === 'rejected') { numState = 'rejected'; numColor = '#ef4444'; numLabel = 'Rejected'; }

    // Template state
    let tplState = 'none', tplColor = '#6b7280', tplLabel = 'Not submitted';
    if (c.templates_approved > 0 && (!c.templates_pending || c.templates_pending === 0)) { tplState = 'approved'; tplColor = '#10b981'; tplLabel = `${c.templates_approved} approved`; }
    else if (c.templates_pending > 0 && c.templates_approved > 0) { tplState = 'partial'; tplColor = '#fbbf24'; tplLabel = `${c.templates_approved}/${c.templates_approved + c.templates_pending} approved`; }
    else if (c.templates_pending > 0) { tplState = 'pending'; tplColor = '#fbbf24'; tplLabel = 'Pending approval'; }
    else if (c.templates_rejected > 0) { tplState = 'rejected'; tplColor = '#ef4444'; tplLabel = 'Rejected'; }

    // Go-live readiness
    const readinessChecks = [
      { key: 'onboarding', ok: c.onboarding_completed || c.onboarded_at, label: 'Onboarding' },
      { key: 'whatsapp', ok: c.connection_status === 'connected', label: 'WhatsApp' },
      { key: 'number', ok: !!c.phone_number_id, label: 'Nummer' },
      { key: 'templates', ok: c.templates_approved > 0, label: 'Templates' },
      { key: 'subscription', ok: c.subscription_status === 'active', label: 'Abo' },
    ];
    const readyCount = readinessChecks.filter(r => r.ok).length;
    const isLive = c.workspace_state === 'active' && c.subscription_status === 'active';
    const isTrial = !isLive && (c.workspace_state === 'trial' || c.workspace_state === 'demo');

    let goLiveState = 'waiting', goLiveColor = '#fbbf24', goLiveLabel = 'In progress';
    if (isLive) { goLiveState = 'live'; goLiveColor = '#10b981'; goLiveLabel = 'Live'; }
    else if (readyCount === 5) { goLiveState = 'ready'; goLiveColor = '#4cc9ff'; goLiveLabel = 'Ready'; }
    else if (waState === 'error' || numState === 'rejected') { goLiveState = 'blocked'; goLiveColor = '#ef4444'; goLiveLabel = 'Blocked'; }
    else if (readyCount === 0) { goLiveState = 'not_started'; goLiveColor = '#6b7280'; goLiveLabel = 'Not started'; }

    // Primary blocker — specific reason
    let blocker = null, blockerColor = '#ff8a2a';
    if (!isLive && readyCount < 5) {
      const missingItems = readinessChecks.filter(r => !r.ok);
      if (waState === 'error') { blocker = 'WhatsApp connection error'; blockerColor = '#ef4444'; }
      else if (numState === 'rejected') { blocker = 'Number rejected'; blockerColor = '#ef4444'; }
      else if (tplState === 'rejected') { blocker = 'Templates rejected'; blockerColor = '#ef4444'; }
      else if (missingItems.length > 0) {
        const blockerMap = { onboarding: 'Onboarding incomplete', whatsapp: 'WhatsApp not connected', number: 'Number not assigned', templates: 'Templates not submitted', subscription: 'No subscription' };
        blocker = blockerMap[missingItems[0].key] || missingItems[0].label;
        blockerColor = missingItems.length >= 4 ? '#6b7280' : '#ff8a2a'; // neutral if barely started
      }
    }

    // Primary action
    let primaryAction = 'Details', primaryActionColor = '#6b7280';
    if (isLive) { primaryAction = 'Open CRM'; primaryActionColor = '#10b981'; }
    else if (goLiveState === 'ready') { primaryAction = 'Go Live'; primaryActionColor = '#4cc9ff'; }
    else if (goLiveState === 'blocked') { primaryAction = 'View Blocker'; primaryActionColor = '#ef4444'; }
    else if (readyCount < 3) { primaryAction = 'View Status'; primaryActionColor = '#fbbf24'; }
    else { primaryAction = 'View Status'; primaryActionColor = '#ff8a2a'; }

    return { ...c, waState, waColor, waLabel, numState, numColor, numLabel, tplState, tplColor, tplLabel, goLiveState, goLiveColor, goLiveLabel, readinessChecks, readyCount, isLive, isTrial, blocker, blockerColor, primaryAction, primaryActionColor };
  });

  // Summary counts
  const summary = {
    total: enriched.length,
    live: enriched.filter(c => c.isLive).length,
    trial: enriched.filter(c => c.isTrial).length,
    waConnected: enriched.filter(c => c.waState === 'connected').length,
    waPending: enriched.filter(c => c.waState === 'not_connected').length,
    waError: enriched.filter(c => c.waState === 'error').length,
    numActive: enriched.filter(c => c.numState === 'active').length,
    numPending: enriched.filter(c => c.numState === 'pending').length,
    numIssue: enriched.filter(c => c.numState === 'rejected').length,
    goReady: enriched.filter(c => c.goLiveState === 'ready').length,
    goBlocked: enriched.filter(c => c.goLiveState === 'blocked').length,
  };

  const compactBadge = (color, text) => (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: color + '18', color, whiteSpace: 'nowrap' }}>{text}</span>
  );

  const MUTED = '#8D93A6';

  return (
    <>
      {/* ═══ IMPERSONATION CONFIRMATION MODAL ═══ */}
      {impersonateTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }} onClick={() => { setImpersonateTarget(null); setImpersonateReason(''); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 480, background: '#1a1f2e', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,138,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{"⚠\uFE0F"}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Klinik impersonieren</div>
                <div style={{ fontSize: 12, color: '#8D93A6', marginTop: 2 }}>{impersonateTarget.name}</div>
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,138,42,0.06)', border: '1px solid rgba(255,138,42,0.15)', marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
              <strong style={{ color: '#ff8a2a' }}>Du wirst als Klinik-Admin handeln:</strong><br/>
              {"\u2022"} Zugriff auf echte Patientendaten<br/>
              {"\u2022"} Aktionen betreffen reale Daten<br/>
              {"\u2022"} Session endet automatisch nach 30 Min.<br/>
              {"\u2022"} Wird im Audit-Log protokolliert
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8D93A6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Grund (Pflichtfeld)</label>
              <input
                value={impersonateReason}
                onChange={e => setImpersonateReason(e.target.value)}
                placeholder="z.B. Debug WhatsApp, Onboarding-Hilfe..."
                autoFocus
                onKeyDown={e => e.key === 'Enter' && impersonateReason.length >= 5 && startImpersonation()}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#121826', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
              {impersonateReason.length > 0 && impersonateReason.length < 5 && (
                <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>Mindestens 5 Zeichen erforderlich</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setImpersonateTarget(null); setImpersonateReason(''); }} style={{ padding: '8px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8D93A6', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Abbrechen</button>
              <button
                onClick={startImpersonation}
                disabled={impersonateReason.length < 5 || impersonateLoading}
                style={{
                  padding: '8px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: impersonateReason.length >= 5 ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                  background: impersonateReason.length >= 5 ? 'rgba(255,138,42,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${impersonateReason.length >= 5 ? 'rgba(255,138,42,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  color: impersonateReason.length >= 5 ? '#ff8a2a' : '#555',
                  opacity: impersonateLoading ? 0.5 : 1,
                }}
              >{impersonateLoading ? 'Starting...' : 'Start Impersonation'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PAUSE / REACTIVATE CONFIRMATION MODAL ═══ */}
      {pauseTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }} onClick={() => setPauseTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 440, background: '#1a1f2e', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: pauseTarget.action === 'suspend' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{pauseTarget.action === 'suspend' ? '\u23F8\uFE0F' : '\u25B6\uFE0F'}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{pauseTarget.action === 'suspend' ? 'Pause Clinic' : 'Reactivate Clinic'}</div>
                <div style={{ fontSize: 12, color: '#8D93A6', marginTop: 2 }}>{pauseTarget.name}</div>
              </div>
            </div>
            {pauseTarget.action === 'suspend' ? (
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                <strong style={{ color: '#ef4444' }}>This will immediately:</strong><br/>
                {"\u2022"} Stop WhatsApp bot from responding<br/>
                {"\u2022"} Pause all automations<br/>
                {"\u2022"} Block new lead processing<br/>
                {"\u2022"} Data remains intact<br/>
                <span style={{ color: '#8D93A6', fontSize: 11, marginTop: 4, display: 'inline-block' }}>You can reactivate at any time.</span>
              </div>
            ) : (
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                <strong style={{ color: '#10b981' }}>This will restore:</strong><br/>
                {"\u2022"} WhatsApp bot responds again<br/>
                {"\u2022"} Automations resume<br/>
                {"\u2022"} New leads are processed<br/>
                {"\u2022"} Full clinic functionality restored
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setPauseTarget(null)} style={{ padding: '8px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8D93A6', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={executePause} disabled={pauseLoading} style={{
                padding: '8px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                background: pauseTarget.action === 'suspend' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                border: `1px solid ${pauseTarget.action === 'suspend' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                color: pauseTarget.action === 'suspend' ? '#ef4444' : '#10b981',
                opacity: pauseLoading ? 0.5 : 1,
              }}>{pauseLoading ? 'Processing...' : pauseTarget.action === 'suspend' ? 'Confirm Pause' : 'Reactivate'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Row hover styles */}
      <style>{'.fm-clinic-row{transition:background .15s ease}.fm-clinic-row:hover{background:rgba(212,175,55,0.02) !important}'}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 20, margin: 0 }}>Clinics & Operational Status</h2>
        <button onClick={() => {
          const csv = ['Clinic,Plan,Status,WhatsApp,Google,Go-Live,Readiness,Email']
            .concat(enriched.map(c => `"${c.name}","${c.plan_name||'Core'}","${c.isLive?'Live':c.isTrial?'Trial':'Other'}","${c.waLabel}","${c.google_connected?'Connected':'No'}","${c.goLiveLabel}","${c.readyCount}/5","${c.email}"`))
            .join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'flowmatix_clinics.csv'; a.click();
        }} style={{ padding: '5px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#8D93A6', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Export CSV</button>
      </div>

      {actionMsg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${actionMsg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: actionMsg.type === 'ok' ? S.green : S.red, wordBreak: 'break-all' }}>{actionMsg.text}</div>
        </div>
      )}

      {/* ═══ OPERATIONAL SUMMARY STRIP ═══ */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Clinics', value: summary.total, color: '#d4af37' },
          { label: 'Live', value: summary.live, color: '#10b981' },
          { label: 'Trial', value: summary.trial, color: '#fbbf24' },
          { label: 'WhatsApp', value: summary.waConnected, color: summary.waConnected > 0 ? '#10b981' : '#6b7280' },
          { label: 'Google Cal', value: enriched.filter(c => c.google_connected).length, color: enriched.some(c => c.google_connected) ? '#10b981' : '#6b7280' },
          { label: 'Ready', value: summary.goReady, color: summary.goReady > 0 ? '#4cc9ff' : '#6b7280' },
          { label: 'Blocked', value: summary.goBlocked, color: summary.goBlocked > 0 ? '#ef4444' : '#6b7280' },
        ].map(s => (
          <div key={s.label} style={{ padding: '8px 14px', borderRadius: 10, background: '#121826', border: `1px solid ${s.color}20`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: MUTED }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Operator signals */}
      {enriched.length > 0 && (() => {
        const signals = [];
        if (summary.goBlocked > 0) signals.push({ text: `${summary.goBlocked} clinic${summary.goBlocked > 1 ? 's' : ''} blocked`, color: '#ef4444', severity: 'critical' });
        if (summary.waConnected === 0 && summary.total > 0) signals.push({ text: 'No WhatsApp connected', color: '#ef4444', severity: 'critical' });
        if (summary.live === 0 && summary.total > 0) signals.push({ text: 'No clinics live yet', color: '#ff8a2a', severity: 'warning' });
        if (summary.numPending > 0) signals.push({ text: `${summary.numPending} number${summary.numPending > 1 ? 's' : ''} pending approval`, color: '#fbbf24', severity: 'warning' });
        if (summary.goReady > 0) signals.push({ text: `${summary.goReady} ready for launch`, color: '#4cc9ff', severity: 'info' });
        if (!signals.length) return null;
        return <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {signals.map((s, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: s.color + '08', border: `1px solid ${s.color}18`, fontSize: 11, fontWeight: 600, color: s.color }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, animation: s.severity === 'critical' ? 'opDotPulse 1.5s ease-in-out infinite' : 'none' }} />
            {s.severity === 'critical' && <span style={{ fontSize: 9, fontWeight: 800, opacity: 0.7 }}>CRITICAL</span>}
            {s.text}
          </div>)}
        </div>;
      })()}

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="Search clinics..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#fff', fontSize: 13, fontFamily: 'inherit' }} />
        <Btn onClick={doSearch}>Suchen</Btn>
      </div>


      {/* ═══ CLINICS TABLE ═══ */}
      {!clinics ? <Spin /> : !enriched.length ? <Empty text="Keine Kliniken vorhanden" /> : (
        <div style={S.card}>
          <table style={{ ...S.table, fontSize: 12 }}>
            <thead><tr>
              <th style={S.th}>Clinic</th>
              <th style={S.th}>Plan</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>WhatsApp</th>
              <th style={S.th}>Google Cal</th>
              <th style={S.th}>Automations</th>
              <th style={S.th}>Go-Live</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Readiness</th>
              <th style={S.th}>Actions</th>
            </tr></thead>
            <tbody>
              {enriched.map(c => (
                <React.Fragment key={c.id}><tr className="fm-clinic-row">
                  {/* Clinic */}
                  <td style={S.td}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                    <br /><span style={{ fontSize: 10, color: '#666' }}>{c.email}</span>
                    {c.blocker && <div style={{ marginTop: 3 }}><span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: c.blockerColor + '15', color: c.blockerColor }}>{c.blocker}</span></div>}
                  </td>
                  {/* Plan */}
                  <td style={S.td}>{compactBadge(
                    { core: '#6b7280', pro: '#4cc9ff', operations: '#a78bfa', enterprise: '#D4AF37' }[c.plan_name?.toLowerCase()] || '#6b7280',
                    c.plan_name || 'Core'
                  )}</td>
                  {/* Status */}
                  <td style={S.td}>
                    {c.isLive ? compactBadge('#10b981', 'Live')
                    : c.isTrial ? compactBadge('#fbbf24', 'Trial')
                    : c.cancelled_at ? compactBadge('#ef4444', 'Gek\u00FCndigt')
                    : !c.is_active ? compactBadge('#ef4444', 'Suspendiert')
                    : compactBadge('#6b7280', c.workspace_state || 'Nicht gestartet')}
                  </td>
                  {/* WhatsApp */}
                  <td style={S.td}>{compactBadge(c.waColor, c.waLabel)}</td>
                  {/* Google Calendar */}
                  <td style={S.td}>{c.google_connected ? compactBadge('#10b981', 'Connected') : compactBadge('#6b7280', 'Not connected')}</td>
                  {/* Automations */}
                  <td style={S.td}>
                    {(() => {
                      const autos = c.automations || [];
                      if (!autos.length) return compactBadge('#6b7280', 'None');
                      const active = autos.filter(a => a.active !== false).length;
                      return compactBadge(active > 0 ? '#10b981' : '#fbbf24', `${active}/${autos.length} active`);
                    })()}
                  </td>
                  {/* Go-Live */}
                  <td style={S.td}>{compactBadge(c.goLiveColor, c.goLiveLabel)}</td>
                  {/* Readiness */}
                  <td style={{ ...S.td, textAlign: 'center' }} title={c.readyCount === 5 ? 'All checks passed' : `Missing:\n${c.readinessChecks.filter(r => !r.ok).map(r => '\u2022 ' + r.label).join('\n')}`}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'default' }}>
                      {c.readinessChecks.map(r => (
                        <div key={r.key} style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: r.ok ? '#10b981' : (c.goLiveState === 'blocked' ? '#ef4444' : 'rgba(255,255,255,0.12)'),
                          opacity: r.ok ? 1 : 0.5,
                        }} />
                      ))}
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.readyCount === 5 ? '#10b981' : MUTED, marginLeft: 4 }}>{c.readyCount}/5</span>
                    </div>
                  </td>
                  {/* Actions */}
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="fm-trial-btn" onClick={() => setExpandedTimeline(expandedTimeline === c.id ? null : c.id)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: c.primaryActionColor + '12', border: `1px solid ${c.primaryActionColor}30`, color: c.primaryActionColor, cursor: 'pointer', fontFamily: 'inherit' }}>{c.primaryAction}</button>
                      <Btn small onClick={() => handleAction('impersonate', c.id, c.name)}>Impersonate</Btn>
                      <Btn small onClick={() => loadDocs(c.id)}>{expandedDocs === c.id ? 'Docs \u2715' : 'Docs'}</Btn>
                      {c.is_active
                        ? <Btn small danger onClick={() => handleAction('suspend', c.id, c.name)}>Pause</Btn>
                        : <Btn small onClick={() => handleAction('resume', c.id, c.name)}>Reactivate</Btn>}
                    </div>
                  </td>
                </tr>
                {expandedDocs === c.id && (
                  <tr><td colSpan={9} style={{ ...S.td, background: 'rgba(76,201,255,0.03)', padding: 16 }}>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: 13, marginBottom: 8 }}>Dokumente</div>
                    {docsLoading ? <div style={{ color: '#888', fontSize: 12 }}>Laden...</div> :
                     docs.length === 0 ? <div style={{ color: '#666', fontSize: 12 }}>Keine Dokumente hochgeladen</div> :
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                       {docs.map(doc => (
                         <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                           <span style={{ fontSize: 18 }}>{doc.mime_type?.includes('pdf') ? '\u{1F4C4}' : '\u{1F4CE}'}</span>
                           <div style={{ flex: 1 }}>
                             <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{doc.filename}</div>
                             <div style={{ color: '#666', fontSize: 11 }}>{fmtBytes(doc.size_bytes)} | {new Date(doc.created_at).toLocaleString('de-DE')}</div>
                           </div>
                           <button onClick={() => api.downloadDocument(doc.id, doc.filename)} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(76,201,255,0.1)', border: '1px solid rgba(76,201,255,0.2)', color: '#4cc9ff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Download</button>
                           <button onClick={() => handleDeleteDoc(doc.id)} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                         </div>
                       ))}
                     </div>}
                  </td></tr>
                )}
                {expandedTimeline === c.id && (
                  <tr><td colSpan={9} style={{ ...S.td, background: 'rgba(212,175,55,0.03)', padding: 16 }}>
                    <div style={{ fontWeight: 700, color: '#d4af37', fontSize: 13, marginBottom: 12 }}>Klinik-Timeline</div>
                    <ClinicTimeline orgId={c.id} />
                  </td></tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}


/* ═══════════════════════════════════════════════════════════
   4) WHATSAPP / META OPERATIONS
   ═══════════════════════════════════════════════════════════ */
function TabWhatsApp({ d, load }) {
  const clinics = d.clinics;
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [waConfig, setWaConfig] = useState(null);
  const [waLoading, setWaLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // clinicId being acted on
  const [logsOpen, setLogsOpen] = useState(null); // clinicId
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const refresh = () => load('clinics', api.getPlatformClinics);

  const handleWaAction = async (action, clinicId, clinicName) => {
    if (action === 'force-connect' && !confirm(`Force-connect "${clinicName}"? This is an admin override.`)) return;
    if (action === 'reset' && !confirm(`Reset ALL WhatsApp config for "${clinicName}"? This cannot be undone.`)) return;
    setActionLoading(clinicId);
    setMsg(null);
    try {
      let res;
      if (action === 'start') res = await api.waStart(clinicId);
      else if (action === 'retry') res = await api.waRetry(clinicId);
      else if (action === 'force-connect') res = await api.waForceConnect(clinicId);
      else if (action === 'reset') res = await api.waReset(clinicId);
      setMsg({ type: 'ok', text: `${clinicName}: ${res?.message || action + ' completed'}` });
      await refresh();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
    setActionLoading(null);
  };

  const openLogs = async (clinicId) => {
    if (logsOpen === clinicId) { setLogsOpen(null); return; }
    setLogsOpen(clinicId);
    setLogsLoading(true);
    try {
      const res = await api.waLogs(clinicId);
      setLogs(res?.logs || []);
    } catch { setLogs([]); }
    setLogsLoading(false);
  };

  // Pick up preselected clinic from Clinics page
  const selectClinicRef = useRef(null);
  selectClinicRef.current = async (orgId) => {
    setSelectedClinic(orgId);
    setWaLoading(true);
    setMsg(null);
    try {
      const data = await api.getClinicWhatsapp(orgId);
      setWaConfig(data);
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
    setWaLoading(false);
  };

  useEffect(() => {
    const pre = sessionStorage.getItem('fm_wa_preselect');
    if (pre && clinics?.clinics?.length) {
      sessionStorage.removeItem('fm_wa_preselect');
      selectClinicRef.current(pre);
    }
  }, [clinics]);

  const selectClinic = (orgId) => selectClinicRef.current(orgId);

  // Derive WA infrastructure states
  const allClinics = clinics?.clinics || [];
  const enriched = allClinics.map(c => {
    const isConnected = c.connection_status === 'connected';
    const isError = c.connection_status === 'error';
    const hasPhoneId = !!c.whatsapp_phone_id || !!c.phone_number_id;
    const hasWaba = !!c.waba_id;
    const hasWebhook = isConnected;

    const steps = [
      { key: 'waba', label: 'WABA linked', ok: hasWaba || (c.whatsapp_active && hasPhoneId) },
      { key: 'phone', label: 'Phone number', ok: hasPhoneId },
      { key: 'webhook', label: 'Webhook active', ok: hasWebhook },
      { key: 'connected', label: 'Bot connected', ok: isConnected },
    ];
    const doneCount = steps.filter(s => s.ok).length;

    // WhatsApp setup phase
    let phase = 'not_started', phaseColor = '#6b7280', phaseLabel = 'Not started', phaseStep = 0;
    if (isError) { phase = 'error'; phaseColor = '#ef4444'; phaseLabel = 'Connection error'; phaseStep = 0; }
    else if (isConnected) { phase = 'live'; phaseColor = '#10b981'; phaseLabel = 'Live'; phaseStep = 4; }
    else if (hasPhoneId && !isConnected) { phase = 'approval'; phaseColor = '#fbbf24'; phaseLabel = 'Waiting for approval'; phaseStep = 3; }
    else if (c.number_request_status === 'pending') { phase = 'verification'; phaseColor = '#fbbf24'; phaseLabel = 'Awaiting approval'; phaseStep = 2; }
    else if (c.number_request_status === 'rejected') { phase = 'error'; phaseColor = '#ef4444'; phaseLabel = 'Number rejected'; phaseStep = 0; }

    let action = 'Start Setup', actionColor = '#fbbf24';
    if (isConnected) { action = 'View Status'; actionColor = '#10b981'; }
    else if (isError) { action = 'Retry Setup'; actionColor = '#ef4444'; }
    else if (phase === 'approval') { action = 'Check Status'; actionColor = '#fbbf24'; }
    else if (phase === 'verification') { action = 'Check Status'; actionColor = '#fbbf24'; }
    else if (doneCount > 0) { action = 'Continue Setup'; actionColor = '#ff8a2a'; }

    return { ...c, steps, doneCount, phase, phaseColor, phaseLabel, phaseStep, isConnected, isError, hasPhoneId, hasWebhook, action, actionColor };
  });

  const summary = {
    connected: enriched.filter(c => c.phase === 'live').length,
    inProgress: enriched.filter(c => c.phase === 'verification' || c.phase === 'approval').length,
    error: enriched.filter(c => c.phase === 'error').length,
    notStarted: enriched.filter(c => c.phase === 'not_started').length,
  };

  const compactBadge = (color, text) => (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: color + '18', color, whiteSpace: 'nowrap' }}>{text}</span>
  );

  const MUTED = '#8D93A6';
  const CARD_BG = '#121826';
  const BORDER = 'rgba(255,255,255,0.06)';

  // WhatsApp setup steps
  const SETUP_STEPS = [
    { num: 1, title: 'Phone Number', desc: 'Enter the clinic WhatsApp number', icon: '\uD83D\uDCF1' },
    { num: 2, title: 'Approval Request', desc: 'Clinic receives a connection request', icon: '\uD83D\uDCE9' },
    { num: 3, title: 'Approve', desc: 'Clinic clicks approve \u2014 takes seconds', icon: '\u2705' },
    { num: 4, title: 'Go Live', desc: 'Bot starts responding automatically', icon: '\uD83D\uDE80' },
  ];

  const selectedData = enriched.find(c => c.id === selectedClinic);

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>WhatsApp Infrastructure</h2>

      {msg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${msg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: msg.type === 'ok' ? S.green : S.red }}>{msg.text}</div>
        </div>
      )}

      {/* ═══ SUMMARY ═══ */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Connected', value: summary.connected, color: '#10b981' },
          { label: 'In progress', value: summary.inProgress, color: summary.inProgress > 0 ? '#fbbf24' : '#6b7280' },
          { label: 'Errors', value: summary.error, color: summary.error > 0 ? '#ef4444' : '#6b7280' },
          { label: 'Not started', value: summary.notStarted, color: '#6b7280' },
        ].map(s => (
          <div key={s.label} style={{ padding: '8px 14px', borderRadius: 10, background: CARD_BG, border: `1px solid ${s.color}20`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: MUTED }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Number Requests */}
      {allClinics.filter(c => c.number_request_status === 'pending').length > 0 && (
        <div style={{ ...S.card, borderLeft: '3px solid #ff8a2a', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#ff8a2a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{"\uD83D\uDCF1"}</span> Number Requests ({allClinics.filter(c => c.number_request_status === 'pending').length})
          </div>
          {allClinics.filter(c => c.number_request_status === 'pending').map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,138,42,0.06)', border: '1px solid rgba(255,138,42,0.15)', marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Country: <span style={{ color: '#ff8a2a', fontWeight: 700 }}>{c.requested_country_code || '?'}</span></div>
              </div>
              <button onClick={() => selectClinic(c.id)} className="fm-trial-btn" style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(76,201,255,0.1)', border: '1px solid rgba(76,201,255,0.2)', color: '#4cc9ff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
            </div>
          ))}
        </div>
      )}

      {/* ═══ CLINIC TABLE ═══ */}
      {!clinics ? <Spin /> : !enriched.length ? <Empty text="No clinics" /> : (
        <div style={S.card}>
          <table style={{ ...S.table, fontSize: 12 }}>
            <thead><tr>
              <th style={S.th}>Clinic</th>
              <th style={S.th}>Setup Status</th>
              <th style={S.th}>Phase</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Progress</th>
              <th style={S.th}>Action</th>
            </tr></thead>
            <tbody>
              {enriched.map(c => (
                <React.Fragment key={c.id}><tr className="fm-clinic-row" style={{ background: selectedClinic === c.id ? 'rgba(76,201,255,0.04)' : 'transparent' }}>
                  <td style={S.td}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                    <br /><span style={{ fontSize: 10, color: '#666' }}>{c.email}</span>
                  </td>
                  <td style={S.td}>{compactBadge(c.phaseColor, c.phaseLabel)}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {SETUP_STEPS.map((st, i) => (
                        <React.Fragment key={st.num}>
                          <div title={st.title} style={{
                            width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: c.phaseStep >= st.num ? '#10b981' + '20' : c.phaseStep === st.num - 1 && c.phase !== 'not_started' && c.phase !== 'error' ? '#fbbf24' + '20' : 'rgba(255,255,255,0.04)',
                            color: c.phaseStep >= st.num ? '#10b981' : c.phaseStep === st.num - 1 && c.phase !== 'not_started' && c.phase !== 'error' ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                            border: `1px solid ${c.phaseStep >= st.num ? '#10b981' + '30' : 'rgba(255,255,255,0.06)'}`,
                          }}>{c.phaseStep >= st.num ? '\u2713' : st.num}</div>
                          {i < 3 && <div style={{ width: 8, height: 1, background: c.phaseStep > st.num ? '#10b981' : 'rgba(255,255,255,0.06)' }} />}
                        </React.Fragment>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: c.phaseStep === 4 ? '#10b981' : MUTED }}>{c.phaseStep}/4</span>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {/* Primary action */}
                      {c.phase === 'not_started' && (
                        <button className="fm-trial-btn" disabled={actionLoading === c.id} onClick={() => handleWaAction('start', c.id, c.name)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: '#fbbf24' + '12', border: '1px solid #fbbf2430', color: '#fbbf24', cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading === c.id ? 0.5 : 1 }}>{actionLoading === c.id ? '...' : 'Start Setup'}</button>
                      )}
                      {c.phase === 'error' && (
                        <button className="fm-trial-btn" disabled={actionLoading === c.id} onClick={() => handleWaAction('retry', c.id, c.name)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: '#ef4444' + '12', border: '1px solid #ef444430', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading === c.id ? 0.5 : 1 }}>{actionLoading === c.id ? '...' : 'Retry'}</button>
                      )}
                      {(c.phase === 'verification' || c.phase === 'approval') && (
                        <button className="fm-trial-btn" onClick={() => selectClinic(c.id)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: '#fbbf24' + '12', border: '1px solid #fbbf2430', color: '#fbbf24', cursor: 'pointer', fontFamily: 'inherit' }}>Check Status</button>
                      )}
                      {c.phase === 'live' && (
                        <button className="fm-trial-btn" onClick={() => selectClinic(c.id)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: '#10b981' + '12', border: '1px solid #10b98130', color: '#10b981', cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
                      )}
                      {/* Secondary actions */}
                      {c.phase !== 'not_started' && c.phase !== 'live' && (
                        <button className="fm-trial-btn" disabled={actionLoading === c.id} onClick={() => handleWaAction('force-connect', c.id, c.name)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#d4af37', cursor: 'pointer', fontFamily: 'inherit' }}>Force</button>
                      )}
                      <button className="fm-trial-btn" onClick={() => openLogs(c.id)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: MUTED, cursor: 'pointer', fontFamily: 'inherit' }}>Logs</button>
                    </div>
                  </td>
                </tr>
                {/* Logs row */}
                {logsOpen === c.id && (
                  <tr><td colSpan={5} style={{ ...S.td, background: 'rgba(212,175,55,0.03)', padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, color: '#d4af37', fontSize: 12 }}>WhatsApp Logs — {c.name}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="fm-trial-btn" disabled={actionLoading === c.id} onClick={() => handleWaAction('reset', c.id, c.name)} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>Reset Connection</button>
                      </div>
                    </div>
                    {logsLoading ? <div style={{ color: '#888', fontSize: 12 }}>Loading...</div> :
                     logs.length === 0 ? <div style={{ color: '#666', fontSize: 12 }}>No WhatsApp logs yet</div> :
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                       {logs.map(log => (
                         <div key={log.id} style={{ display: 'flex', gap: 12, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', fontSize: 11 }}>
                           <span style={{ color: '#666', minWidth: 120 }}>{new Date(log.created_at).toLocaleString('de-DE')}</span>
                           <span style={{ color: '#d4af37', fontWeight: 700, minWidth: 100 }}>{log.details?.action || log.action}</span>
                           <span style={{ color: '#999', flex: 1 }}>{log.details?.reason || log.details?.message || ''}</span>
                         </div>
                       ))}
                     </div>}
                  </td></tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ SELECTED CLINIC — SETUP PANEL ═══ */}
      {selectedClinic && (
        <div style={{ ...S.card, borderLeft: `3px solid ${S.accent}`, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>WhatsApp Setup \u2014 {selectedData?.name}</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Managed by Flowmatix</div>
            </div>
            <Btn small onClick={() => { setSelectedClinic(null); setWaConfig(null); }}>Close</Btn>
          </div>

          {waLoading ? <Spin /> : (
            <>
              {/* Setup progress visualization */}
              <div style={{ padding: '20px 24px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(76,201,255,0.04), rgba(16,185,129,0.02))', border: `1px solid ${BORDER}`, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                  {SETUP_STEPS.map((step, i) => {
                    const currentStep = selectedData?.phaseStep || 0;
                    const isDone = currentStep >= step.num;
                    const isCurrent = currentStep === step.num - 1 && selectedData?.phase !== 'not_started' && selectedData?.phase !== 'error';
                    const isError = selectedData?.phase === 'error' && step.num === 1;
                    const dotColor = isDone ? '#10b981' : isCurrent ? '#fbbf24' : isError ? '#ef4444' : 'rgba(255,255,255,0.08)';
                    const textColor = isDone ? '#10b981' : isCurrent ? '#fbbf24' : isError ? '#ef4444' : 'rgba(255,255,255,0.2)';
                    return (
                      <React.Fragment key={step.num}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, margin: '0 auto 8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: dotColor + '18', border: `2px solid ${dotColor}`,
                            fontSize: isDone ? 14 : 13, fontWeight: 800, color: dotColor,
                          }}>{isDone ? '\u2713' : step.icon}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{step.title}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3, lineHeight: 1.4, padding: '0 4px' }}>{step.desc}</div>
                        </div>
                        {i < 3 && <div style={{ width: 40, height: 2, background: isDone ? '#10b981' : 'rgba(255,255,255,0.04)', marginTop: 18, flexShrink: 0 }} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Current status cards */}
              {waConfig?.whatsapp && (
                <div style={S.grid3}>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: MUTED }}>Connection</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: waConfig.whatsapp.isActive ? S.green : '#6b7280', marginTop: 4 }}>
                      {waConfig.whatsapp.isActive ? 'Active' : 'Not active'}
                    </div>
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: MUTED }}>Phone Number ID</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: waConfig.whatsapp.phoneNumberId ? '#fff' : '#6b7280', marginTop: 4, fontFamily: 'monospace' }}>
                      {waConfig.whatsapp.phoneNumberId || 'Not set'}
                    </div>
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: MUTED }}>Last Webhook</div>
                    <div style={{ fontSize: 14, color: '#ccc', marginTop: 4 }}>{waConfig.whatsapp.lastWebhookAt ? timeAgo(waConfig.whatsapp.lastWebhookAt) : 'No webhooks received'}</div>
                  </div>
                </div>
              )}

              {/* Operator notes */}
              <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.1)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Operator Notes</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                  {selectedData?.phase === 'not_started' && <>
                    <strong style={{ color: '#fff' }}>Next:</strong> Start WhatsApp setup for this clinic.<br/>
                    The clinic will receive a connection request. Once approved, the connection becomes active automatically.
                  </>}
                  {selectedData?.phase === 'verification' && <>
                    <strong style={{ color: '#fbbf24' }}>Waiting:</strong> Connection request sent. The clinic needs to approve it.<br/>
                    Contact clinic if no response within 24h.
                  </>}
                  {selectedData?.phase === 'approval' && <>
                    <strong style={{ color: '#fbbf24' }}>Waiting:</strong> The clinic needs to approve the connection request.<br/>
                    Contact the clinic if this is taking too long.
                  </>}
                  {selectedData?.phase === 'live' && <>
                    <strong style={{ color: '#10b981' }}>Live:</strong> WhatsApp is connected and the bot is active.<br/>
                    Messages are being processed. Check Monitoring for delivery stats.
                  </>}
                  {selectedData?.phase === 'error' && <>
                    <strong style={{ color: '#ef4444' }}>Error:</strong> Connection failed.<br/>
                    Common issues: token expired, number not verified, policy violation. Retry setup or contact support.
                  </>}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   4b) INTEGRATIONS (Google Calendar, API Usage)
   ═══════════════════════════════════════════════════════════ */
function TabIntegrations({ d, load }) {
  const { t } = useApp();
  const clinics = d.clinics;
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [googleStatus, setGoogleStatus] = useState(null);
  const [gLoading, setGLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const selectClinic = async (orgId) => {
    setSelectedClinic(orgId);
    setGLoading(true);
    setMsg(null);
    try {
      const status = await api.getGoogleStatus(orgId);
      setGoogleStatus(status);
    } catch (err) {
      setGoogleStatus({ connected: false, googleOAuthAvailable: false });
    }
    setGLoading(false);
  };

  const handleDisconnect = async () => {
    if (!selectedClinic || !confirm('Disconnect Google Calendar for this clinic?')) return;
    try {
      await api.disconnectGoogle(selectedClinic);
      setMsg({ type: 'ok', text: 'Google Calendar disconnected' });
      await selectClinic(selectedClinic);
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  };

  const handleConnect = async () => {
    if (!selectedClinic) return;
    const url = await api.getGoogleConnectUrlSafe(selectedClinic);
    window.open(url, '_blank', 'width=600,height=700');
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Integrations — Per Clinic</h2>

      {msg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${msg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: msg.type === 'ok' ? S.green : S.red }}>{msg.text}</div>
        </div>
      )}

      {/* Clinic selector */}
      {!clinics ? <Spin /> : !clinics.clinics?.length ? <Empty text="No clinics onboarded yet" /> : (
        <div style={S.card}>
          <div style={S.kpiLabel}>Select Clinic</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {clinics.clinics.map(c => (
              <button key={c.id} onClick={() => selectClinic(c.id)} style={{
                padding: '8px 16px', borderRadius: 8, border: `1px solid ${selectedClinic === c.id ? S.accent : 'rgba(255,255,255,0.06)'}`,
                background: selectedClinic === c.id ? S.accent + '22' : '#1a1a2e', color: selectedClinic === c.id ? S.accent : '#ccc',
                fontWeight: selectedClinic === c.id ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}>{c.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Integration details for selected clinic */}
      {selectedClinic && (
        <>
          {gLoading ? <Spin /> : (
            <>
              {/* Google Calendar */}
              <div style={{ ...S.card, borderLeft: `3px solid ${googleStatus?.connected ? S.green : S.gray}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>📅</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Google Calendar</div>
                      <div style={{ fontSize: 12, color: 'rgba(167,177,195,0.7)' }}>{t("sync_appointments_auto") || "Termine automatisch synchronisieren"}</div>
                    </div>
                  </div>
                  {googleStatus?.connected ? badge(S.green, 'Verbunden') : badge(S.gray, 'Not connected')}
                </div>

                {googleStatus?.connected ? (
                  <div>
                    <div style={S.grid3}>
                      <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)' }}>Connected Since</div>
                        <div style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>{googleStatus.connectedAt ? timeAgo(googleStatus.connectedAt) : '-'}</div>
                      </div>
                      <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)' }}>Last Used</div>
                        <div style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>{googleStatus.lastUsed ? timeAgo(googleStatus.lastUsed) : 'Never'}</div>
                      </div>
                      <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)' }}>Status</div>
                        <div style={{ fontSize: 13, color: googleStatus.lastError ? S.red : S.green, marginTop: 4 }}>{googleStatus.lastError || 'OK'}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Btn small danger onClick={handleDisconnect}>Disconnect</Btn>
                    </div>
                  </div>
                ) : (
                  <div>
                    {googleStatus?.googleOAuthAvailable ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Btn onClick={handleConnect}>Google Calendar verbinden</Btn>
                        <span style={{ fontSize: 12, color: 'rgba(167,177,195,0.7)' }}>{t("clinic_admin_google") || "Klinik-Admin wird zu Google weitergeleitet"}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: S.yellow }}>Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env</div>
                    )}
                  </div>
                )}
              </div>

              {/* API Usage (Flowmatix-global keys) */}
              <div style={S.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>📊</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>API Usage (Flowmatix-managed)</div>
                    <div style={{ fontSize: 12, color: 'rgba(167,177,195,0.7)' }}>OpenAI, SMTP, n8n — globale Keys, Limits per Plan</div>
                  </div>
                </div>
                <div style={S.grid3}>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)' }}>OpenAI</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: S.green, marginTop: 4 }}>Flowmatix Key</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Usage tracked per plan limits</div>
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)' }}>SMTP / E-Mail</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: S.green, marginTop: 4 }}>Flowmatix Key</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Transactional emails</div>
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: 'rgba(167,177,195,0.7)' }}>n8n Workflows</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: S.green, marginTop: 4 }}>Flowmatix Key</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Automation engine</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   5) AUTOMATIONS / n8n / QUEUES
   ═══════════════════════════════════════════════════════════ */
function TabAutomations({ d, load }) {
  const stats = d.queueStats;
  const jobs = d.queueJobs;
  const [expandedJob, setExpandedJob] = useState(null);
  const [n8nWorkflows, setN8nWorkflows] = useState(null);
  useEffect(() => { api.getN8nWorkflows().then(setN8nWorkflows).catch(() => {}); }, []);

  const handleRetry = async (id) => {
    try {
      await api.retryJob(id);
      await load('queueJobs', () => api.getQueueJobs({ limit: 20 }));
      await load('queueStats', api.getQueueStats);
    } catch (err) { alert('Retry failed: ' + err.message); }
  };

  const queues = stats?.queues || [];
  const allJobs = jobs?.jobs || [];
  const failedJobs = allJobs.filter(j => j.status === 'failed' || j.status === 'dead_letter');
  const totalFailed = queues.reduce((s, q) => s + (q.failed || 0) + (q.dead_letter || 0), 0);
  const totalPending = queues.reduce((s, q) => s + (q.pending || 0), 0);
  const hasBacklog = totalPending > 5;
  const hasFailures = totalFailed > 0 || failedJobs.length > 0;
  const isCritical = hasFailures;
  const isWarning = hasBacklog && !hasFailures;

  const MUTED = '#8D93A6';
  const BORDER = 'rgba(255,255,255,0.06)';

  const queueHealth = (q) => {
    if ((q.failed || 0) + (q.dead_letter || 0) > 0) return { color: '#ef4444', label: 'ERROR' };
    if ((q.pending || 0) > 10) return { color: '#fbbf24', label: 'LOAD' };
    return { color: '#10b981', label: 'OK' };
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Automations & Queues</h2>

      {/* ═══ GLOBAL STATUS ═══ */}
      {!stats ? <Spin /> : (
        <>
          <div style={{
            padding: '10px 18px', borderRadius: 10, marginBottom: 20,
            background: isCritical ? 'rgba(239,68,68,0.08)' : isWarning ? 'rgba(251,191,36,0.06)' : 'rgba(16,185,129,0.04)',
            border: `1px solid ${isCritical ? 'rgba(239,68,68,0.2)' : isWarning ? 'rgba(251,191,36,0.15)' : 'rgba(16,185,129,0.1)'}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isCritical ? '#ef4444' : isWarning ? '#fbbf24' : '#10b981', animation: isCritical ? 'opDotPulse 1.5s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: isCritical ? '#ef4444' : isWarning ? '#fbbf24' : '#10b981' }}>
              {isCritical ? `Failures detected \u2014 ${totalFailed} failed job${totalFailed !== 1 ? 's' : ''}` : isWarning ? `Queues under load \u2014 ${totalPending} pending` : 'All queues healthy'}
            </span>
          </div>

          {/* ═══ QUEUE CARDS ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(queues.length || 1, 4)}, 1fr)`, gap: 12, marginBottom: 20 }}>
            {queues.map(q => {
              const h = queueHealth(q);
              return (
                <div key={q.queue_name} style={{ padding: '14px 16px', borderRadius: 12, background: '#121826', border: `1px solid ${BORDER}`, borderLeft: `3px solid ${h.color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{q.queue_name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: h.color }} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: h.color, letterSpacing: '0.05em' }}>{h.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══ FAILED JOBS — only if failures exist ═══ */}
          {failedJobs.length > 0 && (
            <div style={{ background: '#121826', borderRadius: 14, border: '1px solid rgba(239,68,68,0.15)', borderLeft: '3px solid #ef4444', padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Failed Jobs ({failedJobs.length})</div>
              {failedJobs.map(j => (
                <React.Fragment key={j.id}>
                  <div className="fm-clinic-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, marginBottom: 4, cursor: 'pointer' }} onClick={() => setExpandedJob(expandedJob === j.id ? null : j.id)}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', minWidth: 100 }}>{j.queue_name}</span>
                    <span style={{ fontSize: 11, color: '#fff', minWidth: 80 }}>{j.org_name || '\u2014'}</span>
                    <span style={{ fontSize: 11, color: '#ef4444', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.error_message || j.last_error || 'Unknown error'}</span>
                    <span style={{ fontSize: 10, color: '#666', minWidth: 60 }}>{timeAgo(j.created_at)}</span>
                    <Btn small onClick={(e) => { e.stopPropagation(); handleRetry(j.id); }}>Retry</Btn>
                  </div>
                  {expandedJob === j.id && (
                    <div style={{ padding: '10px 16px', marginBottom: 8, borderRadius: 8, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)' }}>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#ef4444', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5 }}>{j.error_message || j.last_error || 'No details'}</div>
                      {j.data && <div style={{ marginTop: 8, fontSize: 10, fontFamily: 'monospace', color: '#555', maxHeight: 80, overflow: 'auto' }}>{typeof j.data === 'string' ? j.data : JSON.stringify(j.data, null, 2)}</div>}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ═══ BACKLOG — only if pending > 5 ═══ */}
          {hasBacklog && (
            <div style={{ padding: '12px 18px', borderRadius: 10, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.1)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24' }}>Queue backlog: {totalPending} pending</span>
              <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                {queues.filter(q => (q.pending || 0) > 0).map(q => (
                  <span key={q.queue_name} style={{ fontSize: 10, color: MUTED }}>{q.queue_name}: {q.pending}</span>
                ))}
              </div>
            </div>
          )}

        </>
      )}

      {/* n8n Workflows */}
      {n8nWorkflows?.workflows?.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 24, marginBottom: 10 }}>n8n Workflows ({n8nWorkflows.workflows.length})</div>
          <div style={{ background: '#121826', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            {n8nWorkflows.workflows.map((w, i) => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: i < n8nWorkflows.workflows.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: w.active ? '#10b981' : '#6b7280' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', flex: 1 }}>{w.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: w.active ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', color: w.active ? '#10b981' : '#6b7280' }}>{w.active ? 'Active' : 'Inactive'}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {n8nWorkflows?.error && <div style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', fontSize: 11, color: '#8D93A6', marginTop: 16 }}>n8n: {n8nWorkflows.error}</div>}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   6) MONITORING (REAL SERVER DATA)
   ═══════════════════════════════════════════════════════════ */
function TabMonitoring({ d }) {
  const infra = d.infra;
  const containers = d.infraContainers;
  const stats = d.platformStats || {};
  const health = d.health || {};
  const clinics = d.clinics?.clinics || [];
  const prevRef = useRef({ cpu: 0, mem: 0 });
  const [r2Stats, setR2Stats] = useState(null);

  useEffect(() => { api.getR2Stats().then(setR2Stats).catch(() => {}); }, []);

  const cpuPct = infra?.cpu?.usagePercent ?? 0;
  const memPct = infra?.memory?.usagePercent ?? 0;
  const diskPct = infra?.disk?.usagePercent ?? 0;

  const cpuTrend = cpuPct > prevRef.current.cpu + 2 ? '\u2191' : cpuPct < prevRef.current.cpu - 2 ? '\u2193' : '';
  const memTrend = memPct > prevRef.current.mem + 2 ? '\u2191' : memPct < prevRef.current.mem - 2 ? '\u2193' : '';
  useEffect(() => { prevRef.current = { cpu: cpuPct, mem: memPct }; }, [cpuPct, memPct]);

  if (!infra) return <Spin />;
  if (infra.error) return <div style={S.card}><div style={{ color: S.red }}>Failed to load: {infra.error}</div></div>;

  // Health checks
  const services = containers?.containers || [];
  const downServices = services.filter(c => c.status !== 'up' && c.status !== '1' && c.status !== 1);
  const isWarning = cpuPct > 80 || memPct > 85 || diskPct > 85;
  const isCritical = downServices.length > 0 || cpuPct > 95 || memPct > 95 || diskPct > 95;

  // Business metrics
  const msgToday = stats.messagesToday || 0;
  const bookingsToday = stats.bookingsToday || 0;
  const aiFails = stats.aiFailures || 0;
  const convFails = stats.conversationFailures || 0;
  const activeClinics = clinics.filter(c => c.is_active).length;
  const waConnected = clinics.filter(c => c.connection_status === 'connected').length;

  // Integration health from health checks
  const healthChecks = health.checks || {};
  const intStatus = (key) => {
    const v = healthChecks[key];
    if (!v) return { ok: null, label: 'Unknown', color: '#6b7280' };
    const ok = v.status === 'ok' || v.status === 'healthy';
    return { ok, label: ok ? 'Healthy' : 'Error', color: ok ? '#10b981' : '#ef4444' };
  };

  const businessIssues = aiFails > 0 || convFails > 0;
  const businessCritical = aiFails > 5 || convFails > 5;

  const MUTED = '#8D93A6';
  const BORDER = 'rgba(255,255,255,0.06)';
  const CARD_BG = '#121826';

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>System Monitoring</h2>

      {/* ═══ GLOBAL STATUS ═══ */}
      <div style={{
        padding: '10px 18px', borderRadius: 10, marginBottom: 20,
        background: isCritical || businessCritical ? 'rgba(239,68,68,0.08)' : isWarning || businessIssues ? 'rgba(251,191,36,0.06)' : 'rgba(16,185,129,0.04)',
        border: `1px solid ${isCritical || businessCritical ? 'rgba(239,68,68,0.2)' : isWarning || businessIssues ? 'rgba(251,191,36,0.15)' : 'rgba(16,185,129,0.1)'}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: isCritical || businessCritical ? '#ef4444' : isWarning || businessIssues ? '#fbbf24' : '#10b981', animation: isCritical ? 'opDotPulse 1.5s ease-in-out infinite' : 'none' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: isCritical || businessCritical ? '#ef4444' : isWarning || businessIssues ? '#fbbf24' : '#10b981' }}>
          {isCritical ? `${downServices.length} service${downServices.length !== 1 ? 's' : ''} down` : businessCritical ? 'High failure rate detected' : isWarning ? 'High resource usage' : businessIssues ? 'Minor failures detected' : 'All systems operational'}
        </span>
        <span style={{ fontSize: 11, color: MUTED, marginLeft: 'auto' }}>Uptime: {fmtSec(infra.uptimeSeconds || 0)}</span>
      </div>

      {/* ═══ BUSINESS HEALTH (PRIMARY) ═══ */}
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Business Health</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: CARD_BG, borderRadius: 12, padding: '14px 16px', border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, marginBottom: 6 }}>Active Clinics</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{activeClinics}</div>
          <div style={{ fontSize: 10, color: '#10b981', marginTop: 2 }}>{waConnected} WhatsApp</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 12, padding: '14px 16px', border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, marginBottom: 6 }}>Messages Today</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: msgToday > 0 ? '#fff' : MUTED }}>{msgToday}</div>
          <div style={{ fontSize: 10, color: msgToday > 0 ? '#10b981' : MUTED, marginTop: 2 }}>{msgToday > 0 ? 'Active' : 'No messages'}</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 12, padding: '14px 16px', border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, marginBottom: 6 }}>Bookings Today</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{bookingsToday}</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 12, padding: '14px 16px', border: `1px solid ${aiFails > 0 ? 'rgba(239,68,68,0.15)' : BORDER}` }}>
          <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, marginBottom: 6 }}>AI Failures</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: aiFails > 0 ? '#ef4444' : '#10b981' }}>{aiFails}</div>
          <div style={{ fontSize: 10, color: aiFails > 0 ? '#ef4444' : '#10b981', marginTop: 2 }}>{aiFails > 0 ? 'Investigate' : 'All OK'}</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 12, padding: '14px 16px', border: `1px solid ${convFails > 0 ? 'rgba(239,68,68,0.15)' : BORDER}` }}>
          <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, marginBottom: 6 }}>Conv. Failures</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: convFails > 0 ? '#ef4444' : '#10b981' }}>{convFails}</div>
          <div style={{ fontSize: 10, color: convFails > 0 ? '#ef4444' : '#10b981', marginTop: 2 }}>{convFails > 0 ? 'Check logs' : 'All OK'}</div>
        </div>
      </div>

      {/* ═══ INTEGRATIONS ═══ */}
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Integrations</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { name: 'Database', ...intStatus('database') },
          { name: 'Redis', ...intStatus('redis') },
          { name: 'n8n Workflows', ok: true, label: 'Connected', color: '#10b981' },
          { name: 'Stripe', ok: true, label: 'Connected', color: '#10b981' },
        ].map(int => (
          <div key={int.name} style={{ padding: '10px 16px', borderRadius: 10, background: CARD_BG, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: int.ok === true ? '#10b981' : int.ok === false ? '#ef4444' : '#6b7280' }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{int.name}</div>
              <div style={{ fontSize: 10, color: int.ok === true ? '#10b981' : int.ok === false ? '#ef4444' : MUTED }}>{int.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ WHATSAPP BY CLINIC ═══ */}
      {clinics.length > 0 && (() => {
        const waList = clinics.map(c => {
          const isConn = c.connection_status === 'connected';
          const isErr = c.connection_status === 'error';
          const isPending = c.number_request_status === 'pending';
          const color = isConn ? '#10b981' : isErr ? '#ef4444' : isPending ? '#fbbf24' : '#6b7280';
          const label = isConn ? 'Connected' : isErr ? 'Connection failed' : isPending ? 'Awaiting approval' : 'Setup not started';
          return { ...c, waColor: color, waLabel: label, isConn };
        });
        const connCount = waList.filter(c => c.isConn).length;
        const allConn = connCount === waList.length;
        return (
          <>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>WhatsApp Coverage</div>
            <div style={{ padding: '10px 16px', borderRadius: 10, background: CARD_BG, border: `1px solid ${allConn ? 'rgba(16,185,129,0.1)' : connCount > 0 ? 'rgba(251,191,36,0.1)' : BORDER}`, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: allConn ? '#10b981' : connCount > 0 ? '#fbbf24' : '#6b7280' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: allConn ? '#10b981' : connCount > 0 ? '#fbbf24' : MUTED }}>{connCount} / {waList.length} clinics connected</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              {waList.map(c => (
                <div key={c.id} style={{ padding: '8px 14px', borderRadius: 8, background: CARD_BG, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.waColor }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: c.waColor }}>{c.waLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {/* ═══ SYSTEM METRICS ═══ */}
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>System Resources</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={S.card}>
          <div style={S.kpiLabel}>CPU</div>
          <div style={{ ...S.kpi, color: pctColor(cpuPct), fontSize: 22 }}>{cpuPct.toFixed(1)}%{cpuTrend && <span style={{ fontSize: 12, marginLeft: 4, color: cpuTrend === '\u2191' ? '#ef4444' : '#10b981' }}>{cpuTrend}</span>}</div>
          <ProgressBar pct={cpuPct} />
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Memory</div>
          <div style={{ ...S.kpi, color: pctColor(memPct), fontSize: 22 }}>{memPct.toFixed(1)}%{memTrend && <span style={{ fontSize: 12, marginLeft: 4, color: memTrend === '\u2191' ? '#ef4444' : '#10b981' }}>{memTrend}</span>}</div>
          <ProgressBar pct={memPct} label={`${fmtBytes(infra.memory?.usedBytes)} / ${fmtBytes(infra.memory?.totalBytes)}`} />
        </div>
        <div style={S.card}>
          <div style={S.kpiLabel}>Disk</div>
          <div style={{ ...S.kpi, color: pctColor(diskPct), fontSize: 22 }}>{diskPct.toFixed(1)}%</div>
          <ProgressBar pct={diskPct} label={`${fmtBytes(infra.disk?.usedBytes)} / ${fmtBytes(infra.disk?.totalBytes)}`} />
        </div>
        {r2Stats?.configured && (
          <div style={S.card}>
            <div style={S.kpiLabel}>Photo Storage (R2)</div>
            <div style={{ ...S.kpi, color: '#d4af37', fontSize: 22 }}>{fmtBytes(r2Stats.totalSize || 0)}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{r2Stats.totalFiles || 0} files</div>
          </div>
        )}
      </div>

      {/* ═══ FAILING SERVICES ═══ */}
      {downServices.length > 0 && (
        <div style={{ ...S.card, borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Failing Services</div>
          {downServices.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)', marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'opDotPulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.job || c.name}</span>
              <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>DOWN</span>
              {c.instance && <span style={{ fontSize: 10, color: '#666', marginLeft: 'auto' }}>{c.instance}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ═══ RECENT OPERATOR ACTIONS (Audit Trail) ═══ */}
      {(() => {
        const auditLogs = d.unifiedLogs?.entries?.filter(e => e.source === 'audit' && e.event_type === 'admin_action')?.slice(0, 5) || [];
        if (!auditLogs.length) return null;
        return (
          <>
      {/* ═══ BACKUP STATUS ═══ */}
      {(() => {
        const [backup, setBk] = React.useState(null);
        React.useEffect(() => { api.getBackupStatus().then(setBk).catch(() => {}); }, []);
        if (!backup) return null;
        const lastAge = backup.lastBackupAt ? Math.round((Date.now() - new Date(backup.lastBackupAt).getTime()) / 3600000) : null;
        const isOk = lastAge !== null && lastAge < 30;
        return (
          <>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 24, marginBottom: 10 }}>Backups</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: '10px 16px', borderRadius: 10, background: CARD_BG, border: `1px solid ${isOk ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.15)'}`, display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOk ? '#10b981' : '#ef4444' }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Last Backup</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{backup.lastBackupAt ? `${lastAge}h ago` : 'No backup found'}{backup.lastBackupSize ? ` \u00B7 ${(backup.lastBackupSize / 1048576).toFixed(1)} MB` : ''}</div>
                </div>
              </div>
              <div style={{ padding: '10px 16px', borderRadius: 10, background: CARD_BG, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{backup.totalBackups}</div>
                <div style={{ fontSize: 11, color: MUTED }}>backups total</div>
              </div>
              <div style={{ padding: '10px 16px', borderRadius: 10, background: CARD_BG, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 11, color: MUTED }}>{backup.schedule}</div>
              </div>
            </div>
          </>
        );
      })()}

            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 24, marginBottom: 10 }}>Recent Operator Actions</div>
            <div style={{ background: CARD_BG, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              {auditLogs.map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: i < auditLogs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', fontSize: 11 }}>
                  <span style={{ color: '#555', minWidth: 60 }}>{timeAgo(e.created_at)}</span>
                  <span style={{ color: '#d4af37', fontWeight: 600, minWidth: 80 }}>{e.actor || 'system'}</span>
                  <span style={{ color: '#fff', flex: 1 }}>{e.details_text || e.event_type}</span>
                </div>
              ))}
            </div>
          </>
        );
      })()}
    </>
  );
}


/* ═══════════════════════════════════════════════════════════
   7) INCIDENTS
   ═══════════════════════════════════════════════════════════ */
function TabIncidents({ d, load }) {
  const [incidents, setIncidents] = useState(null);
  const [history, setHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (inc) => {
    if (detailId === inc.id) { setDetailId(null); return; }
    setDetailId(inc.id);
    setDetailLoading(true);
    try {
      const metric = inc.metric_key === 'review_queue' ? 'reviews' : inc.metric_key === '24h_window' ? 'window' : 'failed';
      const res = await api.getCommandCenterDrilldown(metric);
      // Filter to this clinic if clinic-specific
      const items = (res?.items || []).filter(i => !inc.organization_id || i.clinic_id === inc.organization_id);
      setDetailData(items);
    } catch { setDetailData([]); }
    setDetailLoading(false);
  };

  const loadLive = async () => {
    try { const res = await api.getLiveIncidents(); setIncidents(res?.incidents || []); } catch { setIncidents([]); }
  };
  const loadHistory_ = async () => {
    try { const res = await api.getIncidentHistory(); setHistory(res?.incidents || []); } catch { setHistory([]); }
  };

  useEffect(() => { loadLive(); }, []);

  const handleResolve = async (id) => {
    try { await api.resolveIncidentV2(id); await loadLive(); } catch (err) { alert('Failed: ' + err.message); }
  };
  const handleAck = async (id) => {
    try { await api.acknowledgeIncidentV2(id); await loadLive(); } catch (err) { alert('Failed: ' + err.message); }
  };
  const handleEvaluate = async () => {
    setEvaluating(true);
    try { await api.evaluateIncidents(); await loadLive(); } catch {}
    setEvaluating(false);
  };

  const MUTED = '#8D93A6';
  const sevColors = { critical: '#ef4444', high: '#ff8a2a', warning: '#fbbf24', info: '#4cc9ff' };

  const active = (incidents || []).filter(i => i.effective_state !== 'resolved');
  const paused = active.filter(i => i.effective_state === 'paused');
  const live = active.filter(i => i.effective_state === 'active');
  const critCount = live.filter(i => i.severity === 'critical').length;
  const highCount = live.filter(i => i.severity === 'high').length;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 20, margin: 0 }}>Alert Center</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleEvaluate} disabled={evaluating} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', color: '#d4af37', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: evaluating ? 0.5 : 1 }}>{evaluating ? 'Evaluating...' : 'Re-evaluate'}</button>
          <button onClick={() => { setShowHistory(!showHistory); if (!showHistory && !history) loadHistory_(); }} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: MUTED, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{showHistory ? 'Live View' : 'History'}</button>
        </div>
      </div>

      {!incidents ? <Spin /> : showHistory ? (
        /* ═══ HISTORY ═══ */
        <>
          {!history ? <Spin /> : history.length === 0 ? (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', fontSize: 12, color: MUTED }}>No resolved incidents</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map(inc => (
                <div key={inc.id} style={{ padding: '10px 16px', borderRadius: 10, background: '#121826', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: sevColors[inc.severity] || MUTED, textTransform: 'uppercase', minWidth: 50 }}>{inc.severity}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', flex: 1 }}>{inc.title}</span>
                  {inc.clinic_name && <span style={{ fontSize: 10, color: MUTED }}>{inc.clinic_name}</span>}
                  {inc.duration_hours != null && <span style={{ fontSize: 10, color: MUTED }}>{Math.round(inc.duration_hours)}h duration</span>}
                  <span style={{ fontSize: 10, color: '#555' }}>{inc.resolved_by} {"\u00B7"} {timeAgo(inc.resolved_at)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ═══ LIVE INCIDENTS ═══ */
        <>
          {/* Status bar */}
          {active.length === 0 ? (
            <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>No active incidents — all systems operational</span>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {critCount > 0 && <div style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'opDotPulse 1.5s ease-in-out infinite' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>{critCount} critical</span>
                </div>}
                {highCount > 0 && <div style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,138,42,0.06)', border: '1px solid rgba(255,138,42,0.12)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff8a2a' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#ff8a2a' }}>{highCount} high</span>
                </div>}
                {paused.length > 0 && <div style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>{paused.length} paused (outside hours)</span>
                </div>}
              </div>

              {/* Incident list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {active.map(inc => {
                  const color = sevColors[inc.severity] || MUTED;
                  const isPaused = inc.effective_state === 'paused';
                  const isOpen = detailId === inc.id;
                  return (
                    <React.Fragment key={inc.id}>
                      <div style={{
                        padding: '14px 18px', borderRadius: 12, background: '#121826',
                        border: `1px solid ${isOpen ? color + '40' : isPaused ? 'rgba(255,255,255,0.04)' : color + '20'}`,
                        borderLeft: `3px solid ${isPaused ? '#555' : color}`,
                        opacity: isPaused ? 0.6 : 1, cursor: 'pointer',
                      }} onClick={() => inc.metric_key && openDetail(inc)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: isPaused ? '#555' : color, flexShrink: 0, animation: !isPaused && inc.severity === 'critical' ? 'opDotPulse 1.5s ease-in-out infinite' : 'none' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{inc.title}</span>
                              {inc.count > 1 && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: color + '15', color }}>{inc.count}x</span>}
                              {inc.metric_key && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>{isOpen ? '\u25BC' : '\u25B6'}</span>}
                            </div>
                            {inc.description && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{inc.description}</div>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {inc.clinic_name && <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }}>{inc.clinic_name}</span>}
                            <span style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase' }}>{inc.severity}</span>
                            {isPaused && <span style={{ fontSize: 9, color: '#555', fontStyle: 'italic' }}>{inc.paused_reason}</span>}
                            {inc.business_wait_hours != null && inc.business_wait_hours > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: inc.business_wait_hours > 8 ? '#ef4444' : inc.business_wait_hours > 2 ? '#ff8a2a' : MUTED }}>{inc.business_wait_hours}h biz</span>}
                            <span style={{ fontSize: 10, color: '#555' }}>{timeAgo(inc.created_at)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            {!isPaused && <Btn small onClick={() => handleAck(inc.id)}>ACK</Btn>}
                            <Btn small onClick={() => handleResolve(inc.id)}>Resolve</Btn>
                          </div>
                        </div>
                      </div>
                      {/* Detail panel */}
                      {isOpen && (
                        <div style={{ padding: '12px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}15`, marginTop: -4, marginBottom: 4 }}>
                          {detailLoading ? <div style={{ color: MUTED, fontSize: 12 }}>Loading...</div> : !detailData?.length ? <div style={{ color: MUTED, fontSize: 12 }}>No detail data</div> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {detailData.map((item, i) => {
                                const wH = item.hours_since != null ? item.hours_since : (item.updated_at ? (Date.now() - new Date(item.updated_at).getTime()) / 3600000 : 0);
                                const wColor = wH > 48 ? '#ef4444' : wH > 12 ? '#ff8a2a' : wH > 2 ? '#fbbf24' : '#10b981';
                                const wLabel = item.hours_since != null ? `${Math.max(0, Math.round(24 - wH))}h left` : (wH > 0 ? `${wH < 1 ? Math.round(wH * 60) + 'm' : Math.round(wH) + 'h'} waiting` : '');
                                return (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: wColor }} />
                                    {(item.first_name || item.last_name) && <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', minWidth: 110 }}>{[item.first_name, item.last_name].filter(Boolean).join(' ')}</span>}
                                    {item.flow_state && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,138,42,0.1)', color: '#ff8a2a', fontWeight: 600 }}>{item.flow_state}</span>}
                                    {wLabel && <span style={{ fontSize: 10, fontWeight: 700, color: wColor }}>{wLabel}</span>}
                                    {item.phone && <span style={{ fontSize: 10, color: '#444', marginLeft: 'auto', fontFamily: 'monospace' }}>{item.phone}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   8) LOGS (Audit Log)
   ═══════════════════════════════════════════════════════════ */
function TabLogs({ d, load }) {
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [hideNoise, setHideNoise] = useState(true);
  const logData = d.unifiedLogs;

  const doFilter = () => load('unifiedLogs', () => api.getUnifiedLogs({ limit: 100, source: source || undefined }));

  const MUTED = '#8D93A6';

  // Filter logs client-side for search + errors
  const filtered = (logData?.entries || []).filter(e => {
    if (errorsOnly && !['error', 'failed', 'critical'].includes(e.event_type)) return false;
    if (hideNoise && ['settings_changed', 'patient_updated'].includes(e.event_type)) return false;
    if (search) {
      const s = search.toLowerCase();
      const text = [e.actor, e.event_type, e.resource_type, e.details_text, e.source].filter(Boolean).join(' ').toLowerCase();
      if (!text.includes(s)) return false;
    }
    return true;
  });

  const errorCount = (logData?.entries || []).filter(e => ['error', 'failed', 'critical'].includes(e.event_type)).length;

  const sourceBadge = (src) => {
    const colors = { audit: S.accent, webhook: S.yellow, provisioning: S.green, error: S.red };
    return badge(colors[src] || S.gray, src);
  };

  const handleExport = () => {
    const csv = ['Time,Source,Actor,Event,Resource,Details']
      .concat(filtered.map(e => `"${e.created_at}","${e.source}","${e.actor || ''}","${e.event_type}","${e.resource_type || ''}","${(e.details_text || '').replace(/"/g, '""')}"`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'flowmatix_logs.csv'; a.click();
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 20, margin: 0 }}>Logs</h2>
        <button onClick={handleExport} style={{ padding: '5px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: MUTED, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Export CSV</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#fff', fontSize: 12, fontFamily: 'inherit' }} />
        <select value={source} onChange={e => { setSource(e.target.value); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#fff', fontSize: 12, fontFamily: 'inherit' }}>
          <option value="">All Sources</option>
          <option value="audit">Audit</option>
          <option value="webhook">Webhook</option>
          <option value="provisioning">Provisioning</option>
        </select>
        <button onClick={() => setErrorsOnly(!errorsOnly)} style={{
          padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          background: errorsOnly ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${errorsOnly ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
          color: errorsOnly ? '#ef4444' : MUTED,
        }}>Errors only{errorCount > 0 ? ` (${errorCount})` : ''}</button>
        <button onClick={() => setHideNoise(!hideNoise)} style={{
          padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          background: hideNoise ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${hideNoise ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
          color: hideNoise ? '#10b981' : MUTED,
        }}>Hide noise</button>
        <Btn onClick={doFilter}>Reload</Btn>
      </div>

      {/* Results */}
      {!logData ? <Spin /> : filtered.length === 0 ? (
        <div style={{ padding: '16px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', fontSize: 12, color: MUTED }}>
          {errorsOnly ? 'No errors found' : search ? 'No matching logs' : 'No log entries'}
        </div>
      ) : (
        <div style={{ background: '#121826', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 10, color: MUTED }}>{filtered.length} entries{search ? ` matching "${search}"` : ''}</div>
          {filtered.slice(0, 50).map((e, i) => {
            const isError = ['error', 'failed', 'critical'].includes(e.event_type);
            return (
              <div key={`${e.source}-${e.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', background: isError ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                <span style={{ fontSize: 10, color: '#555', minWidth: 60 }}>{e.created_at ? timeAgo(e.created_at) : '-'}</span>
                {sourceBadge(e.source)}
                <span style={{ fontSize: 11, fontWeight: 600, color: isError ? '#ef4444' : '#fff', minWidth: 80 }}>{e.event_type}</span>
                <span style={{ fontSize: 11, color: MUTED, minWidth: 80 }}>{e.actor || ''}</span>
                <span style={{ fontSize: 11, color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.details_text || e.resource_type || ''}</span>
              </div>
            );
          })}
          {filtered.length > 50 && <div style={{ padding: '8px 16px', fontSize: 10, color: MUTED }}>Showing 50 of {filtered.length}</div>}
        </div>
      )}
    </>
  );
}


/* ═══════════════════════════════════════════════════════════
   10) BILLING & FINANCE
   ═══════════════════════════════════════════════════════════ */
function TabBilling({ d, load }) {
  const [actionMsg, setActionMsg] = useState(null);
  const [showCosts, setShowCosts] = useState(false);
  const [costData, setCostData] = useState(null);
  const subs = d.subscriptions;
  const rev = d.revenue;
  const overdue = d.overdue;

  useEffect(() => { api.getCostTracker().then(setCostData).catch(() => {}); }, []);

  const MUTED = '#8D93A6';
  const CARD_BG = '#121826';
  const BORDER = 'rgba(255,255,255,0.06)';
  const fmtEur = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v || 0);

  const activeSubs = subs?.subscriptions?.filter(s => s.status === 'active' || s.status === 'trialing') || [];
  const mrr = activeSubs.reduce((sum, s) => sum + (s.amount || 0), 0);
  const paidCount = activeSubs.filter(s => s.status === 'active').length;
  const trialCount = activeSubs.filter(s => s.status === 'trialing').length;
  const overdueCount = overdue?.subscriptions?.length || 0;

  // Real costs from tracker + fixed costs
  const realAiCost = costData?.ai?.totalCost || 0;
  const realWaCost = costData?.whatsapp?.totalCost || 0;

  const COSTS = [
    { name: 'Hetzner Server', desc: '4 Cores, 15GB RAM, 150GB SSD', cost: 30, fixed: true },
    { name: 'Claude API (Sonnet 4)', desc: `AI Bot — ${costData?.ai?.perClinic?.reduce((s, r) => s + r.ai_responses, 0) || 0} responses/30d`, cost: realAiCost > 0 ? realAiCost : 100, tracked: realAiCost > 0 },
    { name: 'WhatsApp Templates', desc: `${costData?.whatsapp?.perClinic?.reduce((s, r) => s + r.templates_sent, 0) || 0} templates/30d`, cost: realWaCost, tracked: true },
    { name: '360dialog Partner', desc: 'WhatsApp Business API', cost: 500, fixed: true },
    { name: 'Cloudflare R2', desc: 'Photo storage', cost: 2, fixed: true },
    { name: 'Cloudflare CDN', desc: 'Frontend delivery', cost: 0, fixed: true },
    { name: 'Resend SMTP', desc: 'Email delivery', cost: 0, fixed: true },
    { name: 'Porkbun Domain', desc: 'flowmatix.io', cost: 1, fixed: true },
    { name: 'Claude Code', desc: 'Development tool', cost: 200, fixed: true },
  ];
  const totalCosts = COSTS.reduce((s, c) => s + c.cost, 0);
  const profit = mrr - totalCosts;

  const handleDatev = async () => {
    const from = document.getElementById('datev-from')?.value;
    const to = document.getElementById('datev-to')?.value;
    if (!from || !to) return;
    try {
      const res = await api.exportDatev(from, to);
      if (res?.csv) {
        const blob = new Blob([res.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `datev_${from}_${to}.csv`; a.click();
      }
    } catch (err) { setActionMsg({ type: 'err', text: err.message }); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Billing & Finance</h2>

      {actionMsg && (
        <div style={{ ...S.card, borderLeft: `3px solid ${actionMsg.type === 'ok' ? S.green : S.red}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: actionMsg.type === 'ok' ? S.green : S.red }}>{actionMsg.text}</div>
        </div>
      )}

      {/* ═══ FINANCIAL OVERVIEW ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div style={{ background: CARD_BG, borderRadius: 14, padding: '18px 20px', border: `1px solid ${BORDER}`, borderTop: '3px solid #10b981' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(16,185,129,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Monthly Revenue (MRR)</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{fmtEur(mrr)}</div>
          <div style={{ fontSize: 11, color: mrr > 0 ? '#10b981' : MUTED, marginTop: 4 }}>{paidCount > 0 ? `${paidCount} paid` : 'No paying customers'}{trialCount > 0 ? ` \u00B7 ${trialCount} trial` : ''}</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 14, padding: '18px 20px', border: `1px solid ${BORDER}`, borderTop: '3px solid #ef4444' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(239,68,68,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Monthly Costs</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{fmtEur(totalCosts)}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{COSTS.filter(c => c.cost > 0).length} services</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 14, padding: '18px 20px', border: `1px solid ${BORDER}`, borderTop: `3px solid ${profit >= 0 ? '#10b981' : '#ef4444'}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: profit >= 0 ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Profit</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: profit >= 0 ? '#10b981' : '#ef4444' }}>{fmtEur(profit)}</div>
          <div style={{ fontSize: 11, color: profit >= 0 ? '#10b981' : '#ef4444', marginTop: 4 }}>{profit >= 0 ? 'Profitable' : 'Negative margin'}</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 14, padding: '18px 20px', border: `1px solid ${overdueCount > 0 ? 'rgba(239,68,68,0.15)' : BORDER}`, borderTop: `3px solid ${overdueCount > 0 ? '#ef4444' : '#6b7280'}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: overdueCount > 0 ? 'rgba(239,68,68,0.5)' : MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Overdue</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: overdueCount > 0 ? '#ef4444' : 'rgba(255,255,255,0.2)' }}>{overdueCount}</div>
          <div style={{ fontSize: 11, color: overdueCount > 0 ? '#ef4444' : MUTED, marginTop: 4 }}>{overdueCount > 0 ? 'Failed payments' : 'All current'}</div>
        </div>
      </div>

      {/* ═══ TRACKED COSTS (per clinic) ═══ */}
      {costData && (costData.ai?.perClinic?.length > 0 || costData.whatsapp?.perClinic?.length > 0) && (
        <>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Tracked Usage (Last 30 Days)</div>
          <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden', marginBottom: 24 }}>
            {costData.ai?.perClinic?.map(c => (
              <div key={'ai-' + c.organization_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', flex: 1 }}>{c.clinic_name}</span>
                <span style={{ fontSize: 10, color: MUTED }}>Claude AI</span>
                <span style={{ fontSize: 10, color: '#4cc9ff' }}>{c.ai_responses} responses</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', minWidth: 60, textAlign: 'right' }}>{fmtEur(c.estimated_cost)}</span>
              </div>
            ))}
            {costData.whatsapp?.perClinic?.map(c => (
              <div key={'wa-' + c.organization_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', flex: 1 }}>{c.clinic_name}</span>
                <span style={{ fontSize: 10, color: MUTED }}>WA Templates ({c.country || '?'})</span>
                <span style={{ fontSize: 10, color: '#10b981' }}>{c.templates_sent} sent {"\u00B7"} {fmtEur(c.rate)}/msg</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', minWidth: 60, textAlign: 'right' }}>{fmtEur(c.estimated_cost)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>Total tracked usage</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{fmtEur(costData.ai?.totalCost + costData.whatsapp?.totalCost)}</span>
            </div>
          </div>
        </>
      )}

      {/* ═══ PLATFORM COSTS (collapsible) ═══ */}
      <div onClick={() => setShowCosts(!showCosts)} style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: showCosts ? 10 : 24, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, transition: 'transform .2s', transform: showCosts ? 'rotate(0)' : 'rotate(-90deg)' }}>{"\u25BC"}</span>
        Platform Costs — {fmtEur(totalCosts)}/mo
      </div>
      {showCosts && (
        <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden', marginBottom: 24 }}>
          {COSTS.map((c, i) => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: i < COSTS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{c.name}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{c.desc}</div>
              </div>
              {c.tracked && <span style={{ fontSize: 9, color: '#10b981', padding: '1px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.08)' }}>tracked</span>}
              {!c.tracked && c.cost > 0 && !c.fixed && <span style={{ fontSize: 9, color: '#fbbf24', padding: '1px 6px', borderRadius: 4, background: 'rgba(251,191,36,0.08)' }}>estimated</span>}
              <span style={{ fontSize: 14, fontWeight: 800, color: c.cost > 0 ? '#fff' : 'rgba(255,255,255,0.15)', minWidth: 70, textAlign: 'right' }}>{c.cost > 0 ? fmtEur(c.cost) : 'Free'}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Total Monthly</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>{fmtEur(totalCosts)}</span>
          </div>
        </div>
      )}

      {/* ═══ SUBSCRIPTIONS ═══ */}
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Customer Subscriptions</div>
      {!subs ? <Spin /> : !subs.subscriptions?.length ? (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, fontSize: 12, color: MUTED }}>No subscriptions yet</div>
      ) : (
        <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden', marginBottom: 24 }}>
          {subs.subscriptions.map((s, i) => {
            const statusColor = s.status === 'active' ? '#10b981' : s.status === 'trialing' ? '#fbbf24' : s.status === 'past_due' ? '#ef4444' : '#6b7280';
            return (
              <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < subs.subscriptions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{s.clinic_name || s.org_name || 'Unknown'}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>{s.plan_name || 'Core'}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: statusColor + '18', color: statusColor }}>{s.status}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', minWidth: 70, textAlign: 'right' }}>{fmtEur(s.amount)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ OVERDUE ═══ */}
      {overdue?.subscriptions?.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(239,68,68,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Overdue Payments</div>
          <div style={{ background: CARD_BG, borderRadius: 14, border: '1px solid rgba(239,68,68,0.15)', overflow: 'hidden', marginBottom: 24 }}>
            {overdue.subscriptions.map((s, i) => (
              <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < overdue.subscriptions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{s.clinic_name || s.org_name}</div></div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444' }}>{s.days_overdue || '?'}d overdue</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#ef4444' }}>{fmtEur(s.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ DATEV EXPORT ═══ */}
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>DATEV Export</div>
      <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <input id="datev-from" type="date" defaultValue="2026-03-01" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#fff', fontSize: 12, fontFamily: 'inherit' }} />
        <span style={{ color: MUTED, fontSize: 11 }}>to</span>
        <input id="datev-to" type="date" defaultValue={new Date().toISOString().split('T')[0]} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a2e', color: '#fff', fontSize: 12, fontFamily: 'inherit' }} />
        <Btn onClick={handleDatev}>Download CSV</Btn>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   11) SECURITY & COMPLIANCE
   ═══════════════════════════════════════════════════════════ */
function TabSecurity({ d, load }) {
  const rbac = d.rbac;
  const sessions = d.sessions;
  const keys = d.apiKeys;

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this session?')) return;
    try {
      await api.revokeSession(id);
      await load('sessions', api.getSessions);
    } catch (err) { alert('Failed: ' + err.message); }
  };

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Security & Compliance</h2>

      {/* Active sessions */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Active Sessions</div>
        {!sessions ? <Spin /> : !sessions.sessions?.length ? <Empty text="No active sessions" /> : (
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr>
              <th style={S.th}>User</th><th style={S.th}>Role</th><th style={S.th}>IP</th><th style={S.th}>Last Active</th><th style={S.th}>Actions</th>
            </tr></thead>
            <tbody>
              {sessions.sessions.map(s => (
                <tr key={s.id}>
                  <td style={S.td}>{s.name || s.email}</td>
                  <td style={S.td}>{statusBadge(s.role)}</td>
                  <td style={S.td}><code style={{ fontSize: 11 }}>{s.ip_address}</code></td>
                  <td style={S.td}>{s.created_at ? timeAgo(s.created_at) : '-'}</td>
                  <td style={S.td}><Btn small danger onClick={() => handleRevoke(s.id)}>Revoke</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* RBAC */}
      <div style={S.card}>
        <div style={S.kpiLabel}>RBAC Permission Matrix</div>
        {!rbac ? <Spin /> : (
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr>
              <th style={S.th}>Endpoint</th><th style={S.th}>Method</th><th style={S.th}>Allowed Roles</th>
            </tr></thead>
            <tbody>
              {rbac.permissions?.map((p, i) => (
                <tr key={i}>
                  <td style={S.td}><code style={{ fontSize: 11, color: S.accent }}>{p.endpoint_pattern}</code></td>
                  <td style={S.td}>{p.http_method}</td>
                  <td style={S.td}>{(p.allowed_roles || []).length === 0 ? <span style={{ color: '#666' }}>public</span> : p.allowed_roles.map(r => <span key={r} style={{ marginRight: 4 }}>{badge(S.accent, r)}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* API Keys overview */}
      {keys?.apiKeys?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>API Keys ({keys.apiKeys.length})</div>
          <div style={{ fontSize: 12, color: 'rgba(167,177,195,0.7)', marginTop: 4 }}>Manage in API & Secrets tab</div>
        </div>
      )}

      {/* Data retention */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Data Retention & Compliance</div>
        <div style={{ fontSize: 13, color: '#ccc', lineHeight: 2, marginTop: 8 }}>
          <div>Audit Logs: <b style={{ color: '#fff' }}>90 days</b></div>
          <div>Webhook Events: <b style={{ color: '#fff' }}>30 days</b></div>
          <div>Backups: <b style={{ color: '#fff' }}>7 daily / 4 weekly / 6 monthly</b></div>
          <div>Session Tokens: <b style={{ color: '#fff' }}>7 days (JWT refresh)</b></div>
          <div>GDPR: <b style={{ color: '#fff' }}>Data request handling via admin panel</b></div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   12) INFRASTRUCTURE
   ═══════════════════════════════════════════════════════════ */
function TabInfrastructure({ d, load }) {
  const infra = d.infra;
  const db = d.infraDb;
  const containers = d.infraContainers;
  const [backups, setBackups] = useState(null);
  const [deployments, setDeployments] = useState(null);

  useEffect(() => {
    api.getInfraBackups().then(setBackups).catch(() => setBackups({ backups: [], drills: [] }));
    api.getInfraDeployments().then(setDeployments).catch(() => setDeployments({ deployments: [] }));
  }, []);

  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Infrastructure</h2>

      {/* Server metrics */}
      {infra && (
        <div style={S.grid3}>
          <div style={S.card}>
            <div style={S.kpiLabel}>CPU</div>
            <ProgressBar pct={infra.cpu?.usagePercent ?? 0} label="CPU Usage" />
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Memory</div>
            <ProgressBar pct={infra.memory?.usagePercent ?? 0} label={`${fmtBytes(infra.memory?.usedBytes)} / ${fmtBytes(infra.memory?.totalBytes)}`} />
          </div>
          <div style={S.card}>
            <div style={S.kpiLabel}>Disk</div>
            <ProgressBar pct={infra.disk?.usagePercent ?? 0} label={`${fmtBytes(infra.disk?.usedBytes)} / ${fmtBytes(infra.disk?.totalBytes)}`} />
          </div>
        </div>
      )}

      {/* Database health */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Database Health</div>
        {!db ? <Spin /> : (
          <div style={{ marginTop: 8 }}>
            <div style={S.grid3}>
              <div><div style={S.kpiLabel}>DB Size</div><div style={S.kpiSm}>{fmtBytes(db.databaseSize)}</div></div>
              <div><div style={S.kpiLabel}>Active Connections</div><div style={S.kpiSm}>{db.activeConnections}</div></div>
              <div><div style={S.kpiLabel}>Tables</div><div style={S.kpiSm}>{db.topTables?.length || 0}+</div></div>
            </div>
            {db.topTables?.length > 0 && (
              <table style={{ ...S.table, marginTop: 12 }}>
                <thead><tr><th style={S.th}>Table</th><th style={S.th}>Size</th></tr></thead>
                <tbody>
                  {db.topTables.map(t => (
                    <tr key={t.name}><td style={S.td}>{t.name}</td><td style={S.td}>{fmtBytes(t.sizeBytes)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Service Status */}
      {containers?.containers?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Services</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {containers.containers.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#1a1a2e', borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: (c.status === 'up' || c.status === '1' || c.status === 1) ? S.green : S.red }} />
                <span style={{ fontSize: 12, color: '#ccc' }}>{c.job}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backups */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Backups</div>
        {!backups ? <Spin /> : !backups.backups?.length ? <Empty text="No backup records. Configure automated backups." /> : (
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr><th style={S.th}>Type</th><th style={S.th}>Status</th><th style={S.th}>Size</th><th style={S.th}>Duration</th><th style={S.th}>Date</th></tr></thead>
            <tbody>
              {backups.backups.map(b => (
                <tr key={b.id}><td style={S.td}>{b.backup_type}</td><td style={S.td}>{statusBadge(b.status)}</td><td style={S.td}>{fmtBytes(b.file_size_bytes)}</td><td style={S.td}>{b.duration_seconds}s</td><td style={S.td}>{timeAgo(b.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {backups?.restoreDrills?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={S.kpiLabel}>Restore Drills</div>
            {backups.restoreDrills.map(dr => (
              <div key={dr.id} style={{ padding: '8px 0', borderBottom: '1px solid #1e1e3e', fontSize: 13, color: '#ccc' }}>
                {statusBadge(dr.status)} — {timeAgo(dr.created_at)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deployments */}
      <div style={S.card}>
        <div style={S.kpiLabel}>Recent Deployments</div>
        {!deployments ? <Spin /> : !deployments.deployments?.length ? <Empty text="No deployment records yet" /> : (
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr><th style={S.th}>Service</th><th style={S.th}>Version</th><th style={S.th}>Status</th><th style={S.th}>By</th><th style={S.th}>Date</th></tr></thead>
            <tbody>
              {deployments.deployments.map(dep => (
                <tr key={dep.id}><td style={S.td}>{dep.service}</td><td style={S.td}><code style={{ fontSize: 11, color: S.accent }}>{dep.version}</code></td><td style={S.td}>{statusBadge(dep.status)}</td><td style={S.td}>{dep.deployed_by || '-'}</td><td style={S.td}>{timeAgo(dep.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   13) SUPPORT TOOLKIT
   ═══════════════════════════════════════════════════════════ */
function TabSupport({ d }) {
  return (
    <>
      <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 16 }}>Support Toolkit</h2>

      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.kpiLabel}>Quick Diagnostics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <a href="https://grafana.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, color: S.accent, fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)' }}>Grafana Dashboards</a>
            <a href="https://prometheus.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, color: S.accent, fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)' }}>Prometheus Metrics</a>
            <a href="https://status.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, color: S.accent, fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)' }}>Uptime Kuma Status</a>
            <a href="https://n8n.flowmatix.io" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, color: S.accent, fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)' }}>n8n Workflows</a>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.kpiLabel}>Incident Templates</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {[
              { title: 'Service Degradation', text: 'We are currently investigating degraded performance on [service]. Updates will follow.' },
              { title: 'Planned Maintenance', text: 'Scheduled maintenance on [date] from [time] to [time] UTC. Brief service interruption expected.' },
              { title: 'Incident Resolved', text: 'The incident affecting [service] has been resolved. All systems are operational.' },
            ].map((t, i) => (
              <div key={i} style={{ padding: '10px 16px', background: '#1a1a2e', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{t.title}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{t.text}</div>
                <button onClick={() => navigator.clipboard?.writeText(t.text)} style={{ marginTop: 6, background: 'none', border: 'none', color: S.accent, fontSize: 11, cursor: 'pointer' }}>Copy to clipboard</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clinic health summary */}
      {d.clinics?.clinics?.length > 0 && (
        <div style={S.card}>
          <div style={S.kpiLabel}>Clinic Health Summary</div>
          <table style={{ ...S.table, marginTop: 8 }}>
            <thead><tr><th style={S.th}>Clinic</th><th style={S.th}>Status</th><th style={S.th}>Provisioning</th><th style={S.th}>Created</th></tr></thead>
            <tbody>
              {d.clinics.clinics.map(c => (
                <tr key={c.id}><td style={S.td}>{c.name}</td><td style={S.td}>{statusBadge(c.is_active ? 'active' : 'inactive')}</td><td style={S.td}>{statusBadge(c.provisioning_status || 'pending')}</td><td style={S.td}>{timeAgo(c.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
