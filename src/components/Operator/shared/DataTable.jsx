import React, { useState, useMemo } from 'react';

export default function DataTable({ columns, data, onRowClick, emptyText = 'No data', searchable = false, searchKeys = [] }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search || !searchKeys.length) return data || [];
    const q = search.toLowerCase();
    return (data || []).filter(row => searchKeys.some(k => String(row[k] || '').toLowerCase().includes(q)));
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const toggleSort = (key) => {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(key); setSortDir('asc'); }
  };

  const thStyle = { padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '12px 14px', fontSize: 13, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.04))' };

  return (
    <div>
      {searchable && (
        <div style={{ marginBottom: 12 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', color: 'var(--text-primary)', fontSize: 13, width: 280, outline: 'none' }}
          />
        </div>
      )}
      <div style={{ overflowX: 'auto', borderRadius: 10, background: 'var(--bg-card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ ...thStyle, width: col.width }} onClick={() => col.sortable !== false && toggleSort(col.key)}>
                  {col.label} {sortCol === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>{emptyText}</td></tr>
            ) : sorted.map((row, i) => (
              <tr key={row.id || i} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? 'pointer' : 'default', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {columns.map(col => (
                  <td key={col.key} style={tdStyle}>{col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>{sorted.length} items</div>}
    </div>
  );
}
