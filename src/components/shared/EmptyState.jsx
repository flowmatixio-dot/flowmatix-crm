import React from "react";

/**
 * Shared EmptyState component — shown when a view has no data.
 * @param {string} icon - Emoji or icon to display
 * @param {string} title - Heading text
 * @param {string} description - Descriptive text
 * @param {React.ReactNode} [action] - Optional CTA button
 */
const EmptyState = ({ icon, title, description, action }) => (
  <div style={{ textAlign: "center", padding: "60px 20px", color: "#a7b1c3" }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
    <h3 style={{ color: "#e2e8f0", marginBottom: 8, fontWeight: 700, fontSize: 18 }}>{title}</h3>
    <p style={{ maxWidth: 360, margin: "0 auto", lineHeight: 1.6, fontSize: 14 }}>{description}</p>
    {action && <div style={{ marginTop: 20 }}>{action}</div>}
  </div>
);

export default EmptyState;
