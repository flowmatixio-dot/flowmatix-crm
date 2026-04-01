import React, { useState, useEffect, useCallback } from 'react';
import StatCard from '../shared/StatCard.jsx';
import DataTable from '../shared/DataTable.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

export default function AutomationsView() {
  const [queueStats, setQueueStats] = useState(null);
  const [n8n, setN8n] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      fmApi.getQueueStats().catch(() => null),
      fmApi.getN8nWorkflows().catch(() => null),
      fmApi.getQueueJobs({ status: 'failed', limit: 20 }).catch(() => null),
    ]).then(([qs, n, j]) => {
      setQueueStats(qs);
      setN8n(n);
      setJobs(Array.isArray(j?.jobs) ? j.jobs : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const queues = Array.isArray(queueStats?.queues) ? queueStats.queues : [];
  const totalFailed = queues.reduce((s, q) => s + safeNum(q.failed), 0);
  const totalPending = queues.reduce((s, q) => s + safeNum(q.pending), 0);
  const workflows = Array.isArray(n8n?.workflows) ? n8n.workflows : [];
  const activeWf = workflows.filter(w => w.active === true).length;

  const retryJob = async (id) => {
    try {
      await fmApi.retryJob(id);
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch {}
  };

  const queueColumns = [
    { key: 'name', label: 'Queue', render: v => <span style={{ fontWeight: 700 }}>{safeStr(v)}</span> },
    { key: 'pending', label: 'Pending', render: v => <span style={{ color: safeNum(v) > 0 ? '#eab308' : 'var(--text-muted)' }}>{safeNum(v)}</span> },
    { key: 'running', label: 'Running', render: v => <span style={{ color: safeNum(v) > 0 ? '#3b82f6' : 'var(--text-muted)' }}>{safeNum(v)}</span> },
    { key: 'completed', label: 'Done', render: v => <span style={{ color: '#10b981' }}>{safeNum(v)}</span> },
    { key: 'failed', label: 'Failed', render: v => {
      const n = safeNum(v);
      return <span style={{ color: n > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: n > 0 ? 700 : 400 }}>{n}</span>;
    }},
    { key: 'dead_letter', label: 'Dead Letter', render: v => {
      const n = safeNum(v);
      return <span style={{ color: n > 0 ? '#ef4444' : 'var(--text-muted)' }}>{n}</span>;
    }},
  ];

  const jobColumns = [
    { key: 'queue_name', label: 'Queue', render: v => <span style={{ fontSize: 12 }}>{safeStr(v)}</span> },
    { key: 'job_name', label: 'Job', render: v => safeStr(v) },
    { key: 'error_message', label: 'Error', render: v => (
      <span style={{ fontSize: 11, color: '#ef4444', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
        {safeStr(v, 'Unknown error')}
      </span>
    )},
    { key: 'created_at', label: 'When', render: v => v ? new Date(v).toLocaleString('de-DE') : '---' },
    { key: 'id', label: '', sortable: false, render: (v) => (
      <button onClick={() => retryJob(v)} style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
        Retry
      </button>
    )},
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Automations</h1>
        <button onClick={load} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 16px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Queues" value={queues.length} color="blue" />
        <StatCard label="Pending Jobs" value={totalPending} color={totalPending > 50 ? 'orange' : 'blue'} />
        <StatCard label="Failed Jobs" value={totalFailed} color={totalFailed > 0 ? 'red' : 'green'} />
        <StatCard label="n8n Workflows" value={workflows.length} color="purple" sub={`${activeWf} active`} />
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>Queue Health</h2>
      <div style={{ marginBottom: 28 }}>
        <DataTable columns={queueColumns} data={queues} emptyText="No queues" />
      </div>

      {jobs.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#ef4444' }}>Failed Jobs ({jobs.length})</h2>
          <div style={{ marginBottom: 28 }}>
            <DataTable columns={jobColumns} data={jobs} emptyText="No failed jobs" />
          </div>
        </>
      )}

      {workflows.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>n8n Workflows</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {workflows.map((w, i) => (
              <div key={w.id || i} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '14px 18px', borderLeft: `3px solid ${w.active === true ? '#10b981' : '#6b7280'}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{safeStr(w.name)}</div>
                <div style={{ fontSize: 11, color: w.active === true ? '#10b981' : '#6b7280', marginTop: 4 }}>
                  {w.active === true ? 'Active' : 'Inactive'}
                </div>
                {w.updatedAt && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Updated: {new Date(w.updatedAt).toLocaleDateString('de-DE')}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
