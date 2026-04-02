import React, { useState, useEffect } from 'react';
import StatCard from '../shared/StatCard.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import DataTable from '../shared/DataTable.jsx';
import { safeNum, safeStr } from '../shared/safe.js';
import * as fmApi from '../../../api/client.js';

const PLATFORM_COSTS = [
  { name: 'Hetzner Server (CX32)', cost: 18 },
  { name: 'Cloudflare Pro', cost: 0 },
  { name: 'Meta (WhatsApp Business API)', cost: 0 },
  { name: '360dialog', cost: 0 },
  { name: 'Anthropic (Claude AI)', cost: 12 },
  { name: 'Porkbun Domain', cost: 1 },
];

export default function BillingView({ actions }) {
  const [revenue, setRevenue] = useState(null);
  const [subs, setSubs] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [billingEvents, setBillingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      fmApi.getRevenue().catch(() => null),
      fmApi.getSubscriptions().catch(() => null),
      fmApi.apiFetch('/api/v1/ops/billing/overdue').catch(() => null),
    ]).then(([r, s, o]) => {
      setRevenue(r);
      setSubs(Array.isArray(s?.subscriptions) ? s.subscriptions : []);
      setBillingEvents(Array.isArray(r?.recentBillingEvents) ? r.recentBillingEvents : []);
      setOverdue(Array.isArray(o?.overdue) ? o.overdue : []);
      setLoading(false);
    });
  }, []);

  const { clinics = [], totalMrr = 0 } = actions || {};
  const mrr = safeNum(revenue?.mrr);
  const fmtCents = n => `EUR ${(safeNum(n) / 100).toLocaleString('de-DE')}`;
  const fmtEur = n => `EUR ${safeNum(n).toLocaleString('de-DE')}`;
  const countByStatus = (revenue?.countByStatus && typeof revenue.countByStatus === 'object' && !Array.isArray(revenue.countByStatus)) ? revenue.countByStatus : {};

  const totalCosts = PLATFORM_COSTS.reduce((s, c) => s + c.cost, 0);
  const profit = (mrr / 100) - totalCosts;

  const handleDatevExport = async () => {
    setExporting(true);
    try {
      const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);
      await fmApi.downloadDatevExport(from, to);
    } catch {} finally { setExporting(false); }
  };

  const subColumns = [
    { key: 'name', label: 'Clinic', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{safeStr(v || row.org_name)}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{safeStr(row.email)}</div>
      </div>
    )},
    { key: 'plan_name', label: 'Plan', render: v => <span style={{ fontSize: 12, fontWeight: 600 }}>{safeStr(v, '---')}</span> },
    { key: 'subscription_status', label: 'Status', render: v => <StatusBadge status={safeStr(v, 'unknown')} /> },
    { key: 'mrr', label: 'MRR', render: v => {
      const n = safeNum(v);
      return <span style={{ fontSize: 12, fontWeight: 700, color: n > 0 ? '#22c55e' : 'var(--text-muted)' }}>
        {n > 0 ? `EUR ${n.toLocaleString('de-DE')}` : 'EUR 0'}
      </span>;
    }},
    { key: 'billing_interval', label: 'Interval', render: v => <span style={{ fontSize: 12 }}>{safeStr(v, 'monthly')}</span> },
    { key: 'trial_end', label: 'Trial End', render: v => v ? new Date(v).toLocaleDateString('de-DE') : '---' },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Billing & Finance</h1>
        <button onClick={handleDatevExport} disabled={exporting}
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: exporting ? 'wait' : 'pointer', opacity: exporting ? 0.6 : 1, fontFamily: 'inherit', transition: 'all 0.15s' }}>
          {exporting ? 'Exporting...' : 'DATEV Export'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Monthly Revenue (MRR)" value={fmtCents(mrr)} color="green" sub={`${safeNum(countByStatus.active)} paid / ${safeNum(countByStatus.trialing)} trial`} />
        <StatCard label="Monthly Costs" value={`EUR ${totalCosts}`} color="red" sub={`${PLATFORM_COSTS.length} services`} />
        <StatCard label="Profit" value={`EUR ${profit.toFixed(0)}`} color={profit >= 0 ? 'green' : 'red'} sub={profit < 0 ? 'Negative margin' : 'Positive margin'} />
        <StatCard label="Overdue" value={overdue.length || safeNum(countByStatus.past_due)} color={(overdue.length || safeNum(countByStatus.past_due)) > 0 ? 'red' : 'green'} sub={overdue.length > 0 ? 'Needs attention' : 'All current'} />
      </div>

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', margin: '0 0 10px' }}>Overdue Payments ({overdue.length})</h3>
          {overdue.map((o, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: i < overdue.length - 1 ? '1px solid rgba(239,68,68,0.15)' : 'none', fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{safeStr(o.org_name || o.name)}</span>
              <span style={{ color: 'var(--text-muted)' }}>{safeStr(o.plan_name, '---')}</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>EUR {safeNum(o.amount_due || o.mrr).toLocaleString('de-DE')}</span>
              {o.days_overdue && <span style={{ fontSize: 11, color: '#ef4444' }}>{safeNum(o.days_overdue)}d overdue</span>}
            </div>
          ))}
        </div>
      )}

      {/* Customer Subscriptions */}
      <h2 style={sectionH}>Customer Subscriptions</h2>
      <div style={{ marginBottom: 28 }}>
        <DataTable
          columns={subColumns}
          data={clinics.length > 0 ? clinics : subs}
          searchable
          searchKeys={['name', 'email', 'plan_name', 'org_name']}
          emptyText="No subscriptions"
        />
      </div>

      {/* Platform Costs */}
      <details style={{ marginBottom: 28 }}>
        <summary style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 8 }}>
          Platform Costs -- EUR {totalCosts}/mo
        </summary>
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          {PLATFORM_COSTS.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
              <span style={{ fontWeight: 600, color: c.cost > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>EUR {c.cost}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', fontSize: 13, fontWeight: 700, background: 'var(--bg-card)' }}>
            <span style={{ color: 'var(--text-primary)' }}>Total</span>
            <span style={{ color: '#ef4444' }}>EUR {totalCosts}/mo</span>
          </div>
        </div>
      </details>

      {/* Recent Billing Events */}
      {billingEvents.length > 0 && (
        <>
          <h2 style={sectionH}>Recent Billing Events</h2>
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            {billingEvents.slice(0, 15).map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)', width: 140, flexShrink: 0 }}>
                  {ev.created_at ? new Date(ev.created_at).toLocaleString('de-DE') : '---'}
                </span>
                <span style={{ color: eventColor(ev.type), fontWeight: 600, width: 120, flexShrink: 0 }}>
                  {safeStr(ev.type, '---')}
                </span>
                <span style={{ color: 'var(--text-secondary)', flex: 1 }}>
                  {safeStr(ev.org_name || ev.description, '---')}
                </span>
                {ev.amount !== undefined && (
                  <span style={{ fontWeight: 700, color: '#22c55e', flexShrink: 0 }}>
                    EUR {(safeNum(ev.amount) / 100).toLocaleString('de-DE')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const sectionH = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)', marginBottom: 14 };

function eventColor(type) {
  if (typeof type !== 'string') return '#8899b0';
  if (type.includes('failed') || type.includes('overdue')) return '#ef4444';
  if (type.includes('succeeded') || type.includes('paid')) return '#22c55e';
  if (type.includes('created') || type.includes('updated')) return '#5ee0ff';
  return '#ffcf40';
}
