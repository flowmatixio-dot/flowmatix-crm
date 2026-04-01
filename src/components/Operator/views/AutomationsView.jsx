import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import DataTable from '../shared/DataTable.jsx';
import * as fmApi from '../../../api/client.js';

export default function AutomationsView() {
  const [queueStats, setQueueStats] = useState(null);
  const [n8n, setN8n] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fmApi.getQueueStats?.().catch(() => null),
      fmApi.getN8nWorkflows?.().catch(() => null),
      fmApi.getQueueJobs?.({ status: 'failed', limit: 20 }).catch(() => null),
    ]).then(([qs, n, j]) => {
      setQueueStats(qs); setN8n(n); setJobs(j?.jobs || []); setLoading(false);
    });
  }, []);

  const queues = queueStats?.queues || [];
  const totalFailed = queues.reduce((s, q) => s + (q.failed || 0), 0);
  const totalPending = queues.reduce((s, q) => s + (q.pending || 0), 0);
  const workflows = n8n?.workflows || [];

  const retryJob = async (id) => {
    try { await fmApi.retryJob?.(id); setJobs(prev => prev.filter(j => j.id !== id)); } catch {}
  };

  const queueColumns = [
    { key: 'name', label: 'Queue', render: v => <span style={{ fontWeight: 700 }}>{v}</span> },
    { key: 'pending', label: 'Pending', render: v => <span style={{ color: v > 0 ? '#eab308' : 'var(--text-muted)' }}>{v || 0}</span> },
    { key: 'running', label: 'Running', render: v => <span style={{ color: v > 0 ? '#3b82f6' : 'var(--text-muted)' }}>{v || 0}</span> },
    { key: 'completed', label: 'Done', render: v => <span style={{ color: '#10b981' }}>{v || 0}</span> },
    { key: 'failed', label: 'Failed', render: v => <span style={{ color: v > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: v > 0 ? 700 : 400 }}>{v || 0}</span> },
    { key: 'dead_letter', label: 'Dead Letter', render: v => <span style={{ color: v > 0 ? '#ef4444' : 'var(--text-muted)' }}>{v || 0}</span> },
  ];

  const jobColumns = [
    { key: 'queue_name', label: 'Queue', render: v => <span style={{ fontSize: 12 }}>{v}</span> },
    { key: 'job_name', label: 'Job' },
    { key: 'error_message', label: 'Error', render: v => <span style={{ fontSize: 11, color: '#ef4444', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{v || '—'}</span> },
    { key: 'created_at', label: 'When', render: v => v ? new Date(v).toLocaleString('de-DE') : '—' },
    { key: 'id', label: '', sortable: false, render: (v) => (
      <button onClick={() => retryJob(v)} style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
    )},
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 20px' }}>Automations</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Queues" value={queues.length} color="blue" />
        <StatCard label="Pending Jobs" value={totalPending} color={totalPending > 50 ? 'orange' : 'blue'} />
        <StatCard label="Failed Jobs" value={totalFailed} color={totalFailed > 0 ? 'red' : 'green'} />
        <StatCard label="n8n Workflows" value={workflows.length} color="purple" sub={`${workflows.filter(w => w.active).length} active`} />
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>Queue Health</h2>
      <div style={{ marginBottom: 28 }}>
        <DataTable columns={queueColumns} data={queues} emptyText="No queues" />
      </div>

      {jobs.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#ef4444' }}>Failed Jobs</h2>
          <DataTable columns={jobColumns} data={jobs} emptyText="No failed jobs" />
        </>
      )}

      {workflows.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>n8n Workflows</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280, 1fr))', gap: 12 }}>
            {workflows.map(w => (
              <div key={w.id} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '14px 18px', borderLeft: `3px solid ${w.active ? '#10b981' : '#6b7280'}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{w.name}</div>
                <div style={{ fontSize: 11, color: w.active ? '#10b981' : '#6b7280', marginTop: 4 }}>{w.active ? '● Active' : '○ Inactive'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
