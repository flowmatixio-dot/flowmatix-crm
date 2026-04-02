import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StatCard from '../shared/StatCard.jsx';
import DataTable from '../shared/DataTable.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

// Workflow classification + production metadata
function classifyWorkflow(name, isActive) {
  const n = (name || '').toLowerCase();

  // ── CRITICAL PRODUCTION (must always be active) ──
  if (n.includes('whatsapp flow') || n.includes('send router') || n.includes('inbound bridge'))
    return { type: 'core', label: 'CRITICAL CORE', color: '#ef4444', priority: 'high', critical: true, requiredForProd: true, trigger: 'automatic', hint: 'Critical production workflow — must be active' };
  if (n.includes('zahlung erhalten') || n.includes('zahlung fehlgeschlagen'))
    return { type: 'revenue', label: 'CRITICAL REVENUE', color: '#ef4444', priority: 'high', critical: true, requiredForProd: true, trigger: 'event-based', hint: 'Processes Stripe payment webhooks' };
  if (n.includes('subscription') || n.includes('expiry'))
    return { type: 'revenue', label: 'CRITICAL REVENUE', color: '#ef4444', priority: 'high', critical: true, requiredForProd: true, trigger: 'scheduled', hint: 'Daily subscription expiry check' };
  if (n.includes('overdue'))
    return { type: 'revenue', label: 'CRITICAL REVENUE', color: '#ef4444', priority: 'high', critical: true, requiredForProd: true, trigger: 'scheduled', hint: 'Daily payment overdue check' };

  // ── CORE (should be active in production) ──
  if (n.includes('provisioning'))
    return { type: 'core', label: 'CORE FLOW', color: '#3b82f6', priority: 'high', critical: false, requiredForProd: true, trigger: 'event-based', hint: 'Provisions new clinics after signup' };
  if (n.includes('error handler') || n.includes('global error'))
    return { type: 'core', label: 'CORE FLOW', color: '#3b82f6', priority: 'high', critical: false, requiredForProd: true, trigger: 'automatic', hint: 'Catches and alerts on system errors' };
  if (n.includes('metrics') || n.includes('platform'))
    return { type: 'core', label: 'CORE FLOW', color: '#3b82f6', priority: 'high', critical: false, requiredForProd: true, trigger: 'scheduled', hint: 'Platform health metrics every 5min' };

  // ── OPS (optional, activate per plan) ──
  if (n.includes('reminder') || n.includes('no-show'))
    return { type: 'ops', label: 'OPS', color: '#f97316', priority: 'medium', critical: false, requiredForProd: false, trigger: 'scheduled', hint: 'Standby — activates per clinic plan (Ops+)' };
  if (n.includes('aftercare'))
    return { type: 'ops', label: 'OPS', color: '#f97316', priority: 'medium', critical: false, requiredForProd: false, trigger: 'event-based', hint: 'Runs only after treatment completion' };
  if (n.includes('follow') || n.includes('nachverfolgung') || n.includes('stale'))
    return { type: 'ops', label: 'OPS', color: '#f97316', priority: 'medium', critical: false, requiredForProd: false, trigger: 'scheduled', hint: 'Standby — follow-up for inactive conversations' };
  if (n.includes('flight'))
    return { type: 'ops', label: 'OPS', color: '#f97316', priority: 'medium', critical: false, requiredForProd: false, trigger: 'event-based', hint: 'Flight ticket processing (Ops+)' };
  if (n.includes('driver'))
    return { type: 'ops', label: 'OPS', color: '#f97316', priority: 'medium', critical: false, requiredForProd: false, trigger: 'event-based', hint: 'Driver pickup notifications (Ops+)' };
  if (n.includes('review'))
    return { type: 'ops', label: 'OPS', color: '#f97316', priority: 'medium', critical: false, requiredForProd: false, trigger: 'event-based', hint: 'Post-treatment patient reviews' };
  if (n.includes('staff') || n.includes('willkommen'))
    return { type: 'ops', label: 'OPS', color: '#f97316', priority: 'medium', critical: false, requiredForProd: false, trigger: 'event-based', hint: 'Staff/patient notification flows' };

  // ── TEST / DRAFT (never production) ──
  if (n.includes('telegram') && n.includes('test'))
    return { type: 'test', label: 'DRAFT', color: '#6b7280', priority: 'low', critical: false, requiredForProd: false, trigger: 'manual', hint: 'E2E test flow — not for production' };
  if (n.includes('demo'))
    return { type: 'test', label: 'DRAFT', color: '#6b7280', priority: 'low', critical: false, requiredForProd: false, trigger: 'manual', hint: 'Demo/testing only' };
  if (n.includes('[partner]'))
    return { type: 'test', label: 'ARCHIVED', color: '#6b7280', priority: 'low', critical: false, requiredForProd: false, trigger: 'automatic', hint: 'Partner template — archived' };
  if (n.includes('telegram'))
    return { type: 'ops', label: 'OPS', color: '#f97316', priority: 'medium', critical: false, requiredForProd: true, trigger: 'automatic', hint: 'Telegram bridge for notifications' };

  return { type: 'other', label: 'OTHER', color: '#6b7280', priority: 'low', critical: false, requiredForProd: false, trigger: 'unknown', hint: '' };
}

// Derive semantic status from n8n active flag + classification
function deriveStatus(w) {
  if (w.active === true) return 'active';
  if (w.type === 'test' && w.label === 'ARCHIVED') return 'archived';
  if (w.type === 'test') return 'draft';
  if (w.requiredForProd) return 'broken';
  if (w.priority === 'medium') return 'standby';
  return 'disabled';
}

const STATUS_CONFIG = {
  active:   { label: 'Active',   color: '#10b981', dot: '#10b981' },
  standby:  { label: 'Standby',  color: '#eab308', dot: '#eab308' },
  disabled: { label: 'Disabled', color: '#6b7280', dot: '#6b7280' },
  draft:    { label: 'Draft',    color: '#a78bfa', dot: '#a78bfa' },
  broken:   { label: 'Broken',   color: '#ef4444', dot: '#ef4444' },
  archived: { label: 'Archived', color: '#4b5563', dot: '#4b5563' },
};

const TRIGGER_ICONS = { automatic: '⚡', scheduled: '⏱', 'event-based': '📡', manual: '👆', unknown: '—' };
const TYPE_ORDER = { core: 0, revenue: 1, ops: 2, test: 4, other: 5 };
const FILTERS = ['all', 'active', 'broken', 'standby', 'high', 'revenue', 'core'];

export default function AutomationsView() {
  const [queueStats, setQueueStats] = useState(null);
  const [n8n, setN8n] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showProduction, setShowProduction] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      fmApi.getQueueStats().catch(() => null),
      fmApi.getN8nWorkflows().catch(() => null),
      fmApi.getQueueJobs({ status: 'failed', limit: 20 }).catch(() => null),
    ]).then(([qs, n, j]) => { setQueueStats(qs); setN8n(n); setJobs(Array.isArray(j?.jobs) ? j.jobs : []); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const queues = Array.isArray(queueStats?.queues) ? queueStats.queues : [];
  const totalFailed = queues.reduce((s, q) => s + safeNum(q.failed), 0);
  const totalPending = queues.reduce((s, q) => s + safeNum(q.pending), 0);
  const rawWorkflows = Array.isArray(n8n?.workflows) ? n8n.workflows : [];

  const workflows = useMemo(() =>
    rawWorkflows.map(w => {
      const cls = classifyWorkflow(w.name, w.active);
      return { ...w, ...cls, status: deriveStatus({ ...w, ...cls }) };
    }).sort((a, b) => (a.active === b.active ? 0 : a.active ? -1 : 1) || (TYPE_ORDER[a.type] || 5) - (TYPE_ORDER[b.type] || 5)),
  [rawWorkflows]);

  const activeWf = workflows.filter(w => w.status === 'active');
  const brokenWf = workflows.filter(w => w.status === 'broken');
  const standbyWf = workflows.filter(w => w.status === 'standby');
  // Alert only for broken (requiredForProd but not active)
  const criticalInactive = workflows.filter(w => w.critical && w.status === 'broken');

  const displayed = useMemo(() => {
    let list = showProduction ? workflows.filter(w => w.type !== 'test') : workflows;
    if (filter === 'active') list = list.filter(w => w.status === 'active');
    else if (filter === 'broken') list = list.filter(w => w.status === 'broken');
    else if (filter === 'standby') list = list.filter(w => w.status === 'standby' || w.status === 'disabled');
    else if (filter === 'high') list = list.filter(w => w.priority === 'high');
    else if (filter === 'revenue') list = list.filter(w => w.type === 'revenue');
    else if (filter === 'core') list = list.filter(w => w.type === 'core');
    return list;
  }, [workflows, filter, showProduction]);

  const retryJob = async (id) => { try { await fmApi.retryJob(id); setJobs(prev => prev.filter(j => j.id !== id)); } catch {} };

  const jobColumns = [
    { key: 'queue_name', label: 'Queue', render: v => <span style={{ fontSize: 12 }}>{safeStr(v)}</span> },
    { key: 'job_name', label: 'Job', render: v => safeStr(v) },
    { key: 'error_message', label: 'Error', render: v => <span style={{ fontSize: 11, color: '#ef4444', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{safeStr(v, 'Unknown')}</span> },
    { key: 'id', label: '', sortable: false, render: v => <button onClick={() => retryJob(v)} style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Retry</button> },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Automations</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activeWf.length} active / {workflows.length} total</span>
          <button onClick={() => setShowProduction(!showProduction)}
            style={{ background: showProduction ? '#10b98118' : 'var(--bg-card)', border: `1px solid ${showProduction ? '#10b98130' : 'var(--border)'}`, borderRadius: 6, padding: '5px 12px', color: showProduction ? '#10b981' : 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {showProduction ? 'Production' : 'All'}
          </button>
          <button onClick={load} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Refresh</button>
        </div>
      </div>

      {criticalInactive.length > 0 && (
        <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, background: '#ef444412', border: '1px solid #ef444430', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: '#ef4444', boxShadow: '0 0 8px #ef4444', animation: 'fmPulse 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
            {criticalInactive.length} critical inactive: {criticalInactive.map(w => safeStr(w.name).replace('Flowmatix — ', '')).join(', ')}
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <StatCard label="Active" value={activeWf.length} color="green" sub={`${inactiveWf.length} inactive`} />
        <StatCard label="Pending Jobs" value={totalPending} color={totalPending > 50 ? 'orange' : 'blue'} />
        <StatCard label="Failed Jobs" value={totalFailed} color={totalFailed > 0 ? 'red' : 'green'} />
        <StatCard label="Queues" value={queues.length} color="blue" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? '#ff8a2a' : 'var(--bg-card)', color: filter === f ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Active Workflows */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10, marginBottom: 20 }}>
        {displayed.filter(w => w.status === 'active').map((w, i) => <WfCard key={w.id || i} w={w} />)}
      </div>

      {/* Non-active (collapsed) */}
      {displayed.some(w => w.status !== 'active') && (
        <>
          <button onClick={() => setShowInactive(!showInactive)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 10, padding: 0 }}>
            {showInactive ? '▾' : '▸'} Standby / Disabled / Draft ({displayed.filter(w => w.status !== 'active').length})
          </button>
          {showInactive && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10, marginBottom: 20, opacity: 0.5 }}>
              {displayed.filter(w => w.status !== 'active').map((w, i) => <WfCard key={w.id || i} w={w} />)}
            </div>
          )}
        </>
      )}

      {/* Queues */}
      {queues.length > 0 && (
        <>
          <h2 style={secH}>Queue Health</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 20 }}>
            {queues.map((q, i) => {
              const f = safeNum(q.failed); const p = safeNum(q.pending);
              const c = f > 0 ? '#ef4444' : p > 10 ? '#f97316' : '#10b981';
              return (
                <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '12px 14px', borderLeft: `3px solid ${c}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{safeStr(q.name)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p} pending · <span style={{ color: f > 0 ? '#ef4444' : 'inherit' }}>{f} failed</span></div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {jobs.length > 0 && (
        <>
          <h2 style={{ ...secH, color: '#ef4444' }}>Failed Jobs ({jobs.length})</h2>
          <DataTable columns={jobColumns} data={jobs} emptyText="No failed jobs" />
        </>
      )}
    </div>
  );
}

function WfCard({ w }) {
  const st = STATUS_CONFIG[w.status] || STATUS_CONFIG.disabled;
  const isBroken = w.status === 'broken';
  const isActive = w.status === 'active';
  const isLow = w.priority === 'low';
  const isHigh = w.priority === 'high';
  const bc = isBroken ? '#ef4444' : (isHigh && isActive) ? '#10b98140' : isActive ? '#10b98120' : 'rgba(255,255,255,0.04)';
  const shadow = isBroken ? '0 0 16px rgba(239,68,68,0.12)' : (isHigh && isActive) ? '0 0 10px rgba(16,185,129,0.06)' : 'none';
  const opacity = (isLow && !isActive) ? 0.45 : 1;
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '14px 16px', border: `1px solid ${bc}`, boxShadow: shadow, opacity, transition: 'all 0.12s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, flex: 1, marginRight: 8 }}>{safeStr(w.name)}</div>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${w.color || '#6b7280'}18`, color: w.color || '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{w.label || 'OTHER'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: st.dot, boxShadow: isActive ? `0 0 6px ${st.dot}` : 'none' }} />
        <span style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>{st.label}</span>
        {w.trigger && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{TRIGGER_ICONS[w.trigger] || ''}</span>}
        {w.critical && <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', background: '#ef444415', padding: '1px 6px', borderRadius: 3 }}>CRITICAL</span>}
        {w.updatedAt && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{safeStr(w.updatedAt, '').slice(0, 10)}</span>}
      </div>
      {w.hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>{w.hint}</div>}
    </div>
  );
}

const secH = { fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 };
