import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import * as fmApi from '../../../api/client.js';

export default function BillingView({ actions }) {
  const [revenue, setRevenue] = useState(null);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fmApi.getRevenue?.().catch(() => null),
      fmApi.getSubscriptions?.().catch(() => null),
    ]).then(([r, s]) => { setRevenue(r); setSubs(s?.subscriptions || []); setLoading(false); });
  }, []);

  const { clinics = [], totalMrr = 0 } = actions || {};
  const mrr = revenue?.mrr || 0;
  const fmt = n => `€${(n / 100).toLocaleString('de-DE')}`;
  const countByStatus = revenue?.countByStatus || {};

  // Platform costs (static for now)
  const PLATFORM_COSTS = [
    { name: 'Hetzner Server', cost: 18 },
    { name: 'Cloudflare Pro', cost: 0 },
    { name: 'Meta (WhatsApp API)', cost: 0 },
    { name: '360dialog', cost: 0 },
    { name: 'Anthropic (Claude AI)', cost: 12 },
    { name: 'Porkbun Domain', cost: 1 },
  ];
  const totalCosts = PLATFORM_COSTS.reduce((s, c) => s + c.cost, 0);
  const profit = (mrr / 100) - totalCosts;

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 20px' }}>Billing & Finance</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Monthly Revenue (MRR)" value={fmt(mrr)} color="green" sub={`${countByStatus.active || 0} paid · ${countByStatus.trialing || 0} trial`} />
        <StatCard label="Monthly Costs" value={`€${totalCosts}`} color="red" sub={`${PLATFORM_COSTS.length} services`} />
        <StatCard label="Profit" value={`€${profit.toFixed(0)}`} color={profit >= 0 ? 'green' : 'red'} sub={profit < 0 ? 'Negative margin' : 'Positive margin'} />
        <StatCard label="Overdue" value={countByStatus.past_due || 0} color={countByStatus.past_due > 0 ? 'red' : 'green'} sub="All current" />
      </div>

      {/* Platform Costs */}
      <details style={{ marginBottom: 28 }}>
        <summary style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 8 }}>
          Platform Costs — €{totalCosts}/mo
        </summary>
        <div style={{ background: 'var(--bg-card)', borderRadius: 10, overflow: 'hidden' }}>
          {PLATFORM_COSTS.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>€{c.cost}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Customer Subscriptions */}
      <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 12 }}>Customer Subscriptions</h2>
      <div style={{ background: 'var(--bg-card)', borderRadius: 10, overflow: 'hidden' }}>
        {clinics.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', gap: 14 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: c.subscription_status === 'active' ? '#10b981' : c.subscription_status === 'trialing' ? '#eab308' : '#6b7280' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.plan_name || 'No plan'}</div>
            </div>
            <StatusBadge status={c.subscription_status || 'unknown'} />
            <span style={{ fontSize: 13, fontWeight: 700, color: c.mrr > 0 ? '#10b981' : 'var(--text-muted)', minWidth: 70, textAlign: 'right' }}>
              {c.mrr > 0 ? `€${c.mrr.toLocaleString('de-DE')}` : '€0'}
            </span>
          </div>
        ))}
        {clinics.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No subscriptions</div>}
      </div>
    </div>
  );
}
