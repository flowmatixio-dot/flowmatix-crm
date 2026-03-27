import React from "react";

/**
 * AutomationInspector — Compact queue health summary.
 * Shows: success rate, failures, queue length per queue.
 * Only shows signal, not noise.
 */

export default function AutomationInspector({ queueStats, recentJobs }) {
  const queues = queueStats?.queues || [];
  if (queues.length === 0) return null;

  const MUTED = '#8D93A6';

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Queue Metrics</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {queues.map(q => {
          const total = (q.completed || 0) + (q.failed || 0) + (q.dead_letter || 0);
          const rate = total > 0 ? ((q.completed || 0) / total * 100).toFixed(0) : '100';
          const rateColor = rate >= 95 ? '#10b981' : rate >= 80 ? '#fbbf24' : '#ef4444';
          const failures = (q.failed || 0) + (q.dead_letter || 0);

          return (
            <div key={q.queue_name} style={{
              padding: '10px 14px', borderRadius: 10,
              background: '#121826', border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 14, minWidth: 180,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', minWidth: 80 }}>{q.queue_name}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div title="Success rate">
                  <span style={{ fontSize: 13, fontWeight: 800, color: rateColor }}>{rate}%</span>
                </div>
                {failures > 0 && (
                  <div title="Failures">
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#ef4444' }}>{failures}</span>
                    <span style={{ fontSize: 9, color: '#ef4444', marginLeft: 2 }}>err</span>
                  </div>
                )}
                {(q.pending || 0) > 0 && (
                  <div title="Queue length">
                    <span style={{ fontSize: 12, fontWeight: 800, color: (q.pending || 0) > 10 ? '#fbbf24' : MUTED }}>{q.pending}</span>
                    <span style={{ fontSize: 9, color: MUTED, marginLeft: 2 }}>queue</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
