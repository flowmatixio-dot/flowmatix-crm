/**
 * Route configuration — maps view IDs (used in uiStore) to URL paths.
 * Bidirectional: viewToPath for navigation, pathToView for URL parsing.
 */

const ROUTE_MAP = [
  { view: "action_needed",  path: "/action-needed" },
  { view: "dashboard",      path: "/dashboard" },
  { view: "inbox",          path: "/inbox" },
  { view: "pipeline",       path: "/pipeline" },
  { view: "appointments",   path: "/appointments" },
  { view: "analytics",      path: "/analytics" },
  { view: "revenue",        path: "/revenue" },
  { view: "automations",    path: "/automations" },
  { view: "files",          path: "/files" },
  { view: "subscription",   path: "/subscription" },
  { view: "setup",          path: "/setup" },
  { view: "settings",       path: "/settings" },
  { view: "support",        path: "/help" },
  { view: "ai_control",     path: "/ai-control" },
  { view: "whatsapp_setup", path: "/whatsapp-setup" },
  { view: "addons",         path: "/addons" },
  { view: "audit_log",      path: "/audit-log" },
  { view: "operator",       path: "/operator" },
  { view: "billing",        path: "/billing" },
  { view: "op_prep",        path: "/op-prep" },
  { view: "archive",        path: "/archive" },
  { view: "manual",         path: "/manual" },
  { view: "doctor_portal",  path: "/doctor-portal" },
  { view: "review_board",   path: "/review-board" },
  { view: "payments",       path: "/payments" },
  { view: "patients_db",    path: "/patients" },
];

// view ID → URL path
export const viewToPath = Object.fromEntries(
  ROUTE_MAP.map(r => [r.view, r.path])
);

// URL path → view ID
export const pathToView = Object.fromEntries(
  ROUTE_MAP.map(r => [r.path, r.view])
);

// Default view/path
export const DEFAULT_VIEW = "dashboard";
export const DEFAULT_PATH = "/dashboard";
