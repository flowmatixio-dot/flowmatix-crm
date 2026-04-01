import React from 'react';

const COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' };

export default function PriorityDot({ priority = 'medium', size = 8 }) {
  const c = COLORS[priority] || COLORS.medium;
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 99, background: c, boxShadow: `0 0 ${size}px ${c}60`, flexShrink: 0 }} />;
}
