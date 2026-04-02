import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StatCard from '../shared/StatCard.jsx';
import DataTable from '../shared/DataTable.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

function classifyWorkflow(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('whatsapp') || n.includes('wa ') || n.includes('send router') || n.includes('inbound bridge')) return { type: 'core', label: 'Core', color: '#3b82f6', critical: true };
  if (n.includes('booking') || n.includes('provisioning') || n.includes('clinic provision')) return { type: 'core', label: 'Core', color: '#3b82f6', critical: true };
  if (n.includes('zahlung') || n.includes('payment') || n.includes('subscription') || n.includes('overdue')) return { type: 'revenue', label: 'Revenue', color: '#10b981', critical: true };
  if (n.includes('reminder') || n.includes('aftercare') || n.includes('follow') || n.includes('nachverfolgung') || n.includes('no-show') || n.includes('flight')) return { type: 'ops', label: 'Ops', color: '#f97316', critical: false };
  if (n.includes('error') || n.includes('metrics') || n.includes('platform')) return { type: 'ops', label: 'Ops', color: '#f97316', critical: false };
  if (n.includes('telegram') || n.includes('demo') || n.includes('test') || n.includes('[partner]')) return { type: 'test', label: 'Test', color: '#6b7280', critical: false };
  if (n.includes('staff') || n.includes('review') || n.includes('driver') || n.includes('willkommen')) return { type: 'support', label: 'Support', color: '#a78bfa', critical: false };
  return { type: 'other', label: 'Other', color: '#6b7280', critical: false };
}

const TYPE_ORDER = { core: 0, revenue: 1, ops: 2, support: 3, test: 4, other: 5 };
const FILTERS = ['all', 'active', 'inactive', 'critical'];

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
    rawWorkflows.map(w => ({ ...w, ...classifyWorkflow(w.name) }))
      .sort((a, b) => (a.active === b.active ? 0 : a.active ? -1 : 1) || (TYPE_ORDER[a.type] || 5) - (TYPE_ORDER[b.type] || 5)),
  [rawWorkflows]);

  const activeWf = workflows.filter(w => w.active === true);
  const inactiveWf = workflows.filter(w => w.active !== true);
  const criticalInactive = workflows.filter(w => w.critical && w.active !== true);

  const displayed = useMemo(() => {
    let list = showProduction ? workflows.filter(w => w.type !== 'test') : workflows;
    if (filter === 'active') list = list.filter(w => w.active === true);
    else if (filter === 'inactive') list = list.filter(w => w.active !== true);
    else if (filter === 'critical') list = list.filter(w => w.critical);
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
        {displayed.filter(w => w.active === true).map((w, i) => <WfCard key={w.id || i} w={w} />)}
      </div>

      {/* Inactive (collapsed) */}
      {displayed.some(w => w.active !== true) && (
        <>
          <button onClick={() => setShowInactive(!showInactive)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 10, padding: 0 }}>
            {showInactive ? '▾' : '▸'} Inactive ({displayed.filter(w => w.active !== true).length})
          </button>
          {showInactive && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10, marginBottom: 20, opacity: 0.5 }}>
              {displayed.filter(w => w.active !== true).map((w, i) => <WfCard key={w.id || i} w={w} />)}
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
  const on = w.active === true;
  const crit = w.critical && !on;
  const bc = crit ? '#ef4444' : on ? '#10b98130' : 'rgba(255,255,255,0.04)';
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '14px 16px', border: `1px solid ${bc}`, boxShadow: crit ? '0 0 12px rgba(239,68,68,0.08)' : on ? '0 0 6px rgba(16,185,129,0.04)' : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, flex: 1, marginRight: 8 }}>{safeStr(w.name)}</div>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${w.color || '#6b7280'}18`, color: w.color || '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{w.label || 'Other'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: on ? '#10b981' : '#6b7280', boxShadow: on ? '0 0 6px #10b981' : 'none' }} />
        <span style={{ fontSize: 11, color: on ? '#10b981' : '#6b7280', fontWeight: 600 }}>{on ? 'Active' : 'Inactive'}</span>
        {w.critical && <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', background: '#ef444415', padding: '1px 6px', borderRadius: 3 }}>CRITICAL</span>}
        {w.updatedAt && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{safeStr(w.updatedAt, '').slice(0, 10)}</span>}
      </div>
    </div>
  );
}

const secH = { fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 };
