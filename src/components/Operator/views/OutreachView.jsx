import { useState, useEffect, useCallback } from "react";
import * as api from "../../../api/client";

const S = {
  card: { background: '#23234a', borderRadius: 12, padding: 20, marginBottom: 16 },
  accent: '#00B4D8',
  green: '#22c55e',
  yellow: '#ffcf40',
  red: '#ef4444',
  gray: '#8899b0',
};

const STATUSES = [
  { key: 'pending',   label: 'Ausstehend', color: '#8899b0' },
  { key: 'waiting_1', label: 'Mail 1 ✓',   color: '#00B4D8' },
  { key: 'waiting_2', label: 'Mail 2 ✓',   color: '#7c3aed' },
  { key: 'waiting_3', label: 'Mail 3 ✓',   color: '#f59e0b' },
  { key: 'finished',  label: 'Fertig',      color: '#22c55e' },
];

const badge = (color, text) => (
  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + '22', color }}>{text}</span>
);

const Btn = ({ onClick, children, danger, small }) => (
  <button onClick={onClick} style={{
    padding: small ? '4px 10px' : '8px 18px', borderRadius: 8,
    background: danger ? '#ef444422' : '#333366', color: danger ? '#ef4444' : '#fff',
    border: `1px solid ${danger ? '#ef4444' : '#444488'}`, cursor: 'pointer',
    fontSize: small ? 11 : 13, fontWeight: 600, fontFamily: 'inherit',
  }}>{children}</button>
);

function statusBadge(status, replied) {
  if (replied) return badge('#22c55e', 'Geantwortet');
  const s = STATUSES.find(x => x.key === status);
  return s ? badge(s.color, s.label) : badge('#8899b0', status);
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
    d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default function OutreachView() {
  const [leads, setLeads] = useState(null);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const [leadsRes, statsRes] = await Promise.all([
        api.getOutreachLeads(opts),
        api.getOutreachStats(),
      ]);
      setLeads(leadsRes.leads || []);
      setStats(statsRes || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refresh = () => fetchData(filter && !['replied', 'dnc'].includes(filter) ? { status: filter } : {});
  const doSearch = () => fetchData(search ? { search } : {});

  const toggleDnc = async (lead) => {
    await api.updateOutreachLead(lead.id, { do_not_contact: !lead.do_not_contact });
    refresh();
  };

  const loadLogs = async (id) => {
    if (logs[id]) { setLogs({ ...logs, [id]: null }); return; }
    try {
      const r = await api.getOutreachLogs(id);
      setLogs({ ...logs, [id]: r.logs || [] });
    } catch { setLogs({ ...logs, [id]: [] }); }
  };

  const filtered = (leads || []).filter(l => {
    if (filter === 'replied') return l.replied_at;
    if (filter === 'dnc') return l.do_not_contact;
    if (filter) return l.status === filter;
    return true;
  });

  const todaySent = stats.today_sent ?? 0;
  const todayPct = Math.round((todaySent / 30) * 100);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 20, margin: 0 }}>Outreach-Pipeline</h2>
        <Btn onClick={refresh}>Aktualisieren</Btn>
      </div>

      <div style={{ ...S.card, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#8888aa', fontWeight: 600 }}>Heute gesendet</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{todaySent} / 30</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: '#1a1a2e', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${todayPct}%`, background: todaySent >= 30 ? S.green : S.accent, borderRadius: 99, transition: 'width .4s' }} />
        </div>
        <div style={{ fontSize: 11, color: '#8888aa', marginTop: 4 }}>
          {todaySent >= 30 ? 'Tageslimit erreicht' : `Noch ${(stats.today_remaining ?? 30)} ausstehend — Mo-Fr 05:00/05:15 CEST`}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <div key={s.key} onClick={() => setFilter(filter === s.key ? null : s.key)} style={{
            padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
            background: filter === s.key ? s.color + '33' : '#23234a',
            border: `1px solid ${filter === s.key ? s.color : '#333366'}`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{stats[s.key] ?? 0}</span>
            <span style={{ fontSize: 11, color: filter === s.key ? s.color : '#8888aa', fontWeight: filter === s.key ? 700 : 500 }}>{s.label}</span>
          </div>
        ))}
        <div onClick={() => setFilter(filter === 'replied' ? null : 'replied')} style={{
          padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
          background: filter === 'replied' ? S.green + '33' : '#23234a',
          border: `1px solid ${filter === 'replied' ? S.green : '#333366'}`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: S.green }}>{(leads || []).filter(l => l.replied_at).length}</span>
          <span style={{ fontSize: 11, color: filter === 'replied' ? S.green : '#8888aa', fontWeight: filter === 'replied' ? 700 : 500 }}>Geantwortet</span>
        </div>
        <div style={{ padding: '6px 14px', borderRadius: 8, background: '#23234a', border: '1px solid #333366', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{stats.total ?? 0}</span>
          <span style={{ fontSize: 11, color: '#8888aa' }}>Gesamt</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
          placeholder="Klinik oder E-Mail suchen..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #333366', background: '#1a1a2e', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
        <Btn onClick={doSearch}>Suchen</Btn>
        {(search || filter) && <Btn onClick={() => { setSearch(''); setFilter(null); fetchData(); }}>Reset</Btn>}
      </div>

      {loading && !leads ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8888aa' }}>Lädt...</div>
      ) : !filtered.length ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8888aa' }}>Keine Leads gefunden</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Klinik', 'E-Mail', 'Spr.', 'Status', 'Mail #', 'Zuletzt gesendet', 'Nächster Versand', 'Aktionen'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #333366', color: '#8888aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <>
                  <tr key={lead.id} style={{ opacity: lead.do_not_contact ? 0.45 : 1 }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #1e1e3e', color: '#fff', fontWeight: 600 }}>
                      {lead.do_not_contact && <span style={{ fontSize: 10, background: '#ef444422', color: '#ef4444', borderRadius: 4, padding: '1px 5px', marginRight: 6 }}>BLOCKED</span>}
                      {lead.clinic_name}
                      {lead.homepage && <a href={lead.homepage.startsWith('http') ? lead.homepage : `https://${lead.homepage}`} target="_blank" rel="noopener" style={{ marginLeft: 6, fontSize: 10, color: S.accent, textDecoration: 'none' }}>↗</a>}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #1e1e3e', color: '#ccc' }}>{lead.email}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #1e1e3e', color: '#ccc' }}>{(lead.language || 'tr').toUpperCase()}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #1e1e3e' }}>{statusBadge(lead.status, lead.replied_at)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #1e1e3e', color: '#ccc', textAlign: 'center' }}>
                      {lead.sent_count > 0 ? <strong style={{ color: '#fff' }}>{lead.sent_count}</strong> : <span style={{ color: '#555' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #1e1e3e', color: '#8888aa', whiteSpace: 'nowrap' }}>{fmtDate(lead.last_sent_at)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #1e1e3e', color: '#8888aa', whiteSpace: 'nowrap' }}>
                      {lead.next_send_at ? <span style={{ color: new Date(lead.next_send_at) < new Date() ? S.yellow : '#8888aa' }}>{fmtDate(lead.next_send_at)}</span> : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #1e1e3e' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn small onClick={() => loadLogs(lead.id)}>{logs[lead.id] ? 'Logs ▲' : 'Logs ▼'}</Btn>
                        <Btn small danger={!lead.do_not_contact} onClick={() => toggleDnc(lead)}>{lead.do_not_contact ? 'Entsperren' : 'Blockieren'}</Btn>
                      </div>
                    </td>
                  </tr>
                  {logs[lead.id] && (
                    <tr key={`logs-${lead.id}`}>
                      <td colSpan={8} style={{ padding: '0 12px 12px 32px', borderBottom: '1px solid #1e1e3e', background: '#1a1a2e' }}>
                        {logs[lead.id].length === 0 ? <span style={{ fontSize: 12, color: '#555' }}>Keine Logs</span> : (
                          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                            <tbody>
                              {logs[lead.id].map((lg, i) => (
                                <tr key={i}>
                                  <td style={{ padding: '4px 8px', color: '#8888aa', whiteSpace: 'nowrap' }}>{fmtDate(lg.created_at)}</td>
                                  <td style={{ padding: '4px 8px', color: '#fff' }}>{lg.action}</td>
                                  <td style={{ padding: '4px 8px', color: '#8888aa' }}>Mail #{lg.mail_number}</td>
                                  <td style={{ padding: '4px 8px', color: '#555' }}>{lg.status_before} → {lg.status_after}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
