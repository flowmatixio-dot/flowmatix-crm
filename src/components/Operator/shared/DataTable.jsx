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

  return (
    <div>
      {searchable && (
        <div style={{ marginBottom: 12 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{
              background: 'var(--bg-input)', border: '1px solid var(--border-default)',
              borderRadius: 10, padding: '9px 16px', color: 'var(--text-primary)',
              fontSize: 13, width: 300, outline: 'none', fontFamily: 'inherit',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--border-input-focus)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
          />
        </div>
      )}
      <div style={{
        overflowX: 'auto', borderRadius: 14,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                  style={{
                    padding: '12px 16px', fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: 1,
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border-default)',
                    textAlign: 'left',
                    cursor: col.sortable !== false ? 'pointer' : 'default',
                    userSelect: 'none', whiteSpace: 'nowrap',
                    width: col.width,
                  }}>
                  {col.label} {sortCol === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{
                  padding: 48, textAlign: 'center', color: 'var(--text-muted)',
                  fontSize: 13,
                }}>
                  {emptyText}
                </td>
              </tr>
            ) : sorted.map((row, i) => (
              <tr key={row.id || i}
                onClick={() => onRowClick?.(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {columns.map(col => {
                  const val = row[col.key];
                  const safeDefault = val === null || val === undefined ? '—' : typeof val === 'object' ? JSON.stringify(val) : val;
                  return (
                    <td key={col.key} style={{
                      padding: '12px 16px', fontSize: 13,
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      {col.render ? col.render(val, row) : safeDefault}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
          {sorted.length} items
        </div>
      )}
    </div>
  );
}
