// Labels are i18n keys - use t(label) to get translated text
export const AUTH_BG = "radial-gradient(ellipse 1200px 600px at 50% -5%,rgba(76,201,255,0.07),transparent 55%),linear-gradient(180deg,#0f1623 0%,#0e1422 100%)";

export const CONV_STATUS = {
  ai_active: { label: "conv_ai_active", color: "#10b981", icon: "🤖", desc: "conv_ai_active_desc" },
  collecting_photos: { label: "conv_collecting_photos", color: "#a78bfa", icon: "📷", desc: "conv_collecting_photos_desc" },
  needs_medical_review: { label: "conv_medical_review", color: "#ff8a2a", icon: "⚕️", desc: "conv_medical_review_desc" },
  waiting_for_clinic_reply: { label: "conv_waiting_reply", color: "#fbbf24", icon: "⏳", desc: "conv_waiting_reply_desc" },
  booking_pending: { label: "conv_booking_pending", color: "#4cc9ff", icon: "📅", desc: "conv_booking_pending_desc" },
  deposit_paid: { label: "conv_deposit_paid", color: "#10b981", icon: "💰", desc: "conv_deposit_paid_desc" },
  human_takeover: { label: "conv_human_takeover", color: "#ef4444", icon: "👤", desc: "conv_human_takeover_desc" },
  awaiting_reactivation: { label: "conv_awaiting_reactivation", color: "#f59e0b", icon: "📨", desc: "conv_awaiting_reactivation_desc" },
  resolved: { label: "conv_resolved", color: "#6b7280", icon: "✓", desc: "conv_resolved_desc" },
  closed: { label: "conv_closed", color: "#6b7280", icon: "✕", desc: "conv_closed_desc" },
};

export const STAGES = [{ id: "new", label: "stage_new", color: "#4cc9ff", icon: "✦" },{ id: "contacted", label: "stage_contacted", color: "#fbbf24", icon: "◉" },{ id: "booked", label: "stage_booked", color: "#a78bfa", icon: "◈" },{ id: "done", label: "stage_done", color: "#10b981", icon: "✓" },{ id: "cancelled", label: "stage_cancelled", color: "#ef4444", icon: "✕" }];
export const PLAN_C = { core: "#4cc9ff", pro: "#a78bfa", operations: "#ff8a2a", enterprise: "#10b981" };
export const PLAN_PRICE = { core: "€690", pro: "€990", operations: "€1.490", enterprise: "€2.500+" };
export const TEAM_LIMITS = {
  core: 1,
  pro: 3,
  operations: 5,
  enterprise: null,
};
export const PLAN_LIMITS = {
  core:       { patients: 250 },
  pro:        { patients: 500 },
  operations: { patients: 1000 },
  enterprise: { patients: null },
};
const _al = () => (typeof localStorage !== "undefined" ? localStorage.getItem("fm_lang") : "de") || "de";
const _at = (en, de, tr) => ({ en, de, tr }[_al()] || de);
export const APPT_C = { reserved: { c: "#fbbf24", get l() { return _at("Reserved","Reserviert","Rezerve"); } }, pending: { c: "#ff8a2a", get l() { return _at("Pending","Ausstehend","Beklemede"); } }, booked: { c: "#4cc9ff", get l() { return _at("Booked","Gebucht","Rezerve"); } }, confirmed: { c: "#10b981", get l() { return _at("Confirmed","Bestätigt","Onaylandı"); } }, completed: { c: "#10b981", get l() { return _at("Completed","Abgeschlossen","Tamamlandı"); } }, cancelled: { c: "#ef4444", get l() { return _at("Cancelled","Storniert","İptal"); } }, canceled: { c: "#ef4444", get l() { return _at("Cancelled","Storniert","İptal"); } }, no_show: { c: "#6b7280", get l() { return _at("No-show","Nicht erschienen","Gelmedi"); } } };
export const TL = { msg_in: { i: "💬", c: "#4cc9ff", l: "tl_patient" }, bot: { i: "🤖", c: "rgba(76,201,255,0.6)", l: "tl_bot" }, photo: { i: "📷", c: "#a78bfa", l: "tl_photos" }, handover: { i: "🔔", c: "#ff8a2a", l: "tl_handover" }, human: { i: "👤", c: "#fbbf24", l: "tl_staff" }, booking: { i: "📅", c: "#10b981", l: "tl_booking" }, system: { i: "⚙️", c: "rgba(167,177,195,0.5)", l: "tl_system" }, action: { i: "⚡", c: "#ff8a2a", l: "tl_action" }, review: { i: "⚕️", c: "#ff8a2a", l: "tl_review" }, driver: { i: "🚗", c: "#00B4D8", l: "tl_driver" }, finance: { i: "💰", c: "#10b981", l: "tl_payment" } };
export const DAYS = ["day_mon","day_tue","day_wed","day_thu","day_fri","day_sat","day_sun"];
export const MONTHS = ["month_jan","month_feb","month_mar","month_apr","month_may","month_jun","month_jul","month_aug","month_sep","month_oct","month_nov","month_dec"];
export const NOTIF_ICONS = { lead: "✦", photo: "📷", action: "⚡", booking: "📅", automation: "⚙️", system: "🔔", alert: "🚨", driver: "🚗", payment: "💰" };
export const NOTIF_COLORS = { lead: "#4cc9ff", photo: "#a78bfa", action: "#ff8a2a", booking: "#10b981", automation: "rgba(167,177,195,0.5)", system: "rgba(167,177,195,0.5)", alert: "#ef4444", driver: "#00B4D8", payment: "#10b981" };

export const INVOICE_STATUS = {
  draft: { label: "invoice_draft", color: "#6b7280", icon: "📝" },
  sent: { label: "invoice_sent", color: "#4cc9ff", icon: "📤" },
  paid: { label: "invoice_paid", color: "#10b981", icon: "✓" },
  overdue: { label: "invoice_overdue", color: "#ef4444", icon: "⚠️" },
  cancelled: { label: "invoice_cancelled", color: "#6b7280", icon: "✕" },
};

export const FILE_CATEGORIES = {
  photos: { label: "filecat_photos", icon: "📷", color: "#a78bfa" },
  documents: { label: "filecat_documents", icon: "📄", color: "#4cc9ff" },
  invoices: { label: "filecat_invoices", icon: "🧾", color: "#10b981" },
  logistics: { label: "filecat_logistics", icon: "✈️", color: "#00B4D8" },
};

export const TOUR_STEPS = [
  { id: "welcome", target: "[data-tour='dashboard']", title: "tour_welcome_title", desc: "tour_welcome_desc", position: "right" },
  { id: "inbox", target: "[data-tour='inbox']", title: "tour_inbox_title", desc: "tour_inbox_desc", position: "right" },
  { id: "pipeline", target: "[data-tour='pipeline']", title: "tour_pipeline_title", desc: "tour_pipeline_desc", position: "right" },
  { id: "appointments", target: "[data-tour='appointments']", title: "tour_appointments_title", desc: "tour_appointments_desc", position: "right" },
  { id: "analytics", target: "[data-tour='analytics']", title: "tour_analytics_title", desc: "tour_analytics_desc", position: "right" },
  { id: "revenue", target: "[data-tour='revenue']", title: "tour_revenue_title", desc: "tour_revenue_desc", position: "right" },
  { id: "automations", target: "[data-tour='automations']", title: "tour_automations_title", desc: "tour_automations_desc", position: "right" },
  { id: "subscription", target: "[data-tour='subscription']", title: "tour_subscription_title", desc: "tour_subscription_desc", position: "right" },
  { id: "settings", target: "[data-tour='settings']", title: "tour_settings_title", desc: "tour_settings_desc", position: "right" },
  { id: "go_live", target: "[data-tour='demo_toggle']", title: "tour_go_live_title", desc: "tour_go_live_desc", position: "bottom" },
  { id: "help", target: "[data-tour='support']", title: "tour_help_title", desc: "tour_help_desc", position: "right" },
]


export const ADDONS = [
  // Patient Capacity — name/desc are i18n keys resolved via t() at render time
  { id: "patients_250", nameKey: "addon_patients_250_name", descKey: "addon_patients_250_desc", name: "+250 Patients", desc: "Add 250 patients to your plan.", price: 149, icon: "👥", category: "capacity", plans: ["core","pro","operations","enterprise"] },
  { id: "patients_500", nameKey: "addon_patients_500_name", descKey: "addon_patients_500_desc", name: "+500 Patients", desc: "Best value for growing clinics.", price: 249, icon: "👥", category: "capacity", popular: true, plans: ["core","pro","operations","enterprise"] },
  { id: "patients_1000", nameKey: "addon_patients_1000_name", descKey: "addon_patients_1000_desc", name: "+1,000 Patients", desc: "Max boost with bulk savings.", price: 399, icon: "👥", category: "capacity", plans: ["core","pro","operations","enterprise"] },
  // Feature Upgrades
  { id: "plus_1_language", nameKey: "addon_lang_1_name", descKey: "addon_lang_1_desc", name: "+1 Language", desc: "One extra language.", price: 99, icon: "🗣️", category: "feature", plans: ["core","pro"] },
  { id: "all_languages", nameKey: "addon_all_lang_name", descKey: "addon_all_lang_desc", name: "All Languages", desc: "Every language.", price: 249, icon: "🌍", category: "feature", plans: ["core","pro"] },
  { id: "voice_messages", nameKey: "addon_voice_name", descKey: "addon_voice_desc", name: "Voice Messages", desc: "AI voice transcription.", price: 149, icon: "🎙️", category: "feature", plans: ["core"] },
  { id: "extra_user", nameKey: "addon_extra_user_name", descKey: "addon_extra_user_desc", name: "+1 CRM Access", desc: "Add one more CRM access.", price: 39, icon: "👤", category: "feature", plans: ["core","pro","operations"] },
  { id: "wa_reminders", nameKey: "addon_wa_reminders_name", descKey: "addon_wa_reminders_desc", name: "WA Reminders", desc: "Auto-reminders for no-shows.", price: 119, icon: "🔔", category: "feature", plans: ["core","pro"] },
]

export const DRIVER_STATUS = {
  pending: { label: "driver_pending", color: "#fbbf24", icon: "⏳" },
  notified: { label: "driver_notified", color: "#4cc9ff", icon: "📱" },
  confirmed: { label: "driver_confirmed", color: "#10b981", icon: "✅" },
  declined: { label: "driver_declined", color: "#ef4444", icon: "✕" },
  escalated: { label: "driver_escalated", color: "#ff8a2a", icon: "🔄" },
  backup_confirmed: { label: "driver_backup_confirmed", color: "#10b981", icon: "✅" },
  backup_declined: { label: "driver_backup_declined", color: "#ef4444", icon: "❌" },
};
export const PRICE_MAP = {"FUE":2800,"DHI":3200,"Beard":2200,"Veneers":6200,"Implants":4000,"All-on-4":8500,"Whitening":500,"Rhinoplasty":7000,"Facelift":12000,"Botox":600,"PRP":800,"Eyebrow":1500};

// Copy MSG_TEMPLATES exactly from CRM.jsx lines 342-351
export const MSG_TEMPLATES = [
  { id: "t1", name: "Deposit Request", category: "billing", lang: "en", text: "Hi {first_name}, your treatment plan is ready! To secure your appointment on {date}, please complete the deposit of {price}. Here's your payment link: {payment_link}" },
  { id: "t2", name: "Anzahlung anfragen", category: "billing", lang: "de", text: "Hallo {first_name}, dein Behandlungsplan ist fertig! Um deinen Termin am {date} zu sichern, überweise bitte die Anzahlung von {price}. Hier ist dein Zahlungslink: {payment_link}" },
  { id: "t3", name: "Missing Photos", category: "intake", lang: "en", text: "Hi {first_name}, we still need your photos to prepare your treatment plan. Please send 3 clear photos: front, top, and sides. Our AI will analyze them immediately!" },
  { id: "t4", name: "Booking Confirmation", category: "booking", lang: "en", text: "Great news {first_name}! Your {treatment} appointment with {doctor} is confirmed for {date} at {time}. We'll send you pre-op instructions shortly." },
  { id: "t5", name: "Aftercare", category: "post_op", lang: "en", text: "Hi {first_name}, it's been 24h since your {treatment}. How are you feeling? Remember: no direct sunlight, sleep elevated, take your medications. Any concerns? We're here 24/7." },
  { id: "t6", name: "Follow-Up (No Reply)", category: "followup", lang: "en", text: "Hi {first_name}, Dr. {doctor} wanted to check — do you have any questions about your treatment plan? We'd love to help you book your appointment. Shall we proceed?" },
  { id: "t7", name: "Flight Info Request", category: "logistics", lang: "en", text: "Hi {first_name}, your appointment is approaching! Please share your flight details so we can arrange VIP airport pickup and hotel check-in. Just send us a photo of your ticket." },
  { id: "t8", name: "Termin-Bestätigung", category: "booking", lang: "de", text: "Gute Neuigkeiten {first_name}! Dein {treatment}-Termin bei {doctor} ist bestätigt für den {date} um {time}. Vorab-Anweisungen folgen in Kürze." },
  { id: "t9", name: "Driver Pickup Notification", category: "logistics", lang: "en", text: "Hi {driver_name}, please pick up {first_name} at {airport} on {date} at {arrival_time}. Flight: {flight_no} ({airline}). Vehicle: {vehicle}. Reply CONFIRM or DECLINE." },
  { id: "t10", name: "Fahrer-Abholbenachrichtigung", category: "logistics", lang: "de", text: "Hallo {driver_name}, bitte hole {first_name} am {airport} ab am {date} um {arrival_time}. Flug: {flight_no} ({airline}). Fahrzeug: {vehicle}. Antworte BESTÄTIGEN oder ABLEHNEN." },
  { id: "t_consent_reactivate", name: "DSGVO + Reaktivierung", category: "consent", lang: "de", text: "Hallo 👋\n\nbevor wir weitermachen, benötigen wir kurz deine Zustimmung zur Verarbeitung deiner Daten.\n\nBitte bestätige dies kurz, damit wir deine Anfrage fortsetzen können 😊", isSystem: true },
  // ═══ 24h SESSION REACTIVATION TEMPLATES ═══
  // Variant 1 — neutral reactivation
  { id: "t_reactivate_neutral_en", name: "Session Reactivation", category: "reactivation", lang: "en", text: "Hi {first_name}, we received your message and would love to continue our conversation. Simply reply to this message and our team will be right with you.", isSystem: true, isReactivation: true },
  { id: "t_reactivate_neutral_de", name: "Sitzung reaktivieren", category: "reactivation", lang: "de", text: "Hallo {first_name}, wir haben deine Nachricht erhalten und möchten gerne weiter mit dir sprechen. Antworte einfach auf diese Nachricht und unser Team ist sofort für dich da.", isSystem: true, isReactivation: true },
  { id: "t_reactivate_neutral_tr", name: "Oturum yeniden etkinleştirme", category: "reactivation", lang: "tr", text: "Merhaba {first_name}, mesajınızı aldık ve görüşmemize devam etmek istiyoruz. Bu mesajı yanıtlayın, ekibimiz hemen sizinle ilgilenecektir.", isSystem: true, isReactivation: true },
  // Variant 2 — consultation-oriented
  { id: "t_reactivate_consult_en", name: "Continue Consultation", category: "reactivation", lang: "en", text: "Hi {first_name}, thank you for reaching out again. We're ready to continue with your treatment consultation. Just send us a quick reply so we can pick up where we left off.", isSystem: true, isReactivation: true },
  { id: "t_reactivate_consult_de", name: "Beratung fortsetzen", category: "reactivation", lang: "de", text: "Hallo {first_name}, schön, dass du dich wieder meldest. Wir sind bereit, deine Behandlungsberatung fortzusetzen. Schreib uns einfach kurz zurück, damit wir dort weitermachen können, wo wir aufgehört haben.", isSystem: true, isReactivation: true },
  { id: "t_reactivate_consult_tr", name: "Danışmanlığa devam", category: "reactivation", lang: "tr", text: "Merhaba {first_name}, tekrar bizimle iletişime geçtiğiniz için teşekkürler. Tedavi danışmanlığınıza devam etmeye hazırız. Kaldığımız yerden devam edebilmemiz için bize kısa bir yanıt gönderin.", isSystem: true, isReactivation: true },
  // Variant 3 — support-oriented
  { id: "t_reactivate_support_en", name: "Team Ready to Help", category: "reactivation", lang: "en", text: "Hi {first_name}, our team noticed your message and is ready to assist you with the next steps. Reply here and we'll take care of everything for you.", isSystem: true, isReactivation: true },
  { id: "t_reactivate_support_de", name: "Team bereit zu helfen", category: "reactivation", lang: "de", text: "Hallo {first_name}, unser Team hat deine Nachricht gesehen und ist bereit, dich bei den nächsten Schritten zu unterstützen. Antworte hier und wir kümmern uns um alles.", isSystem: true, isReactivation: true },
  { id: "t_reactivate_support_tr", name: "Ekip yardıma hazır", category: "reactivation", lang: "tr", text: "Merhaba {first_name}, ekibimiz mesajınızı fark etti ve sonraki adımlarda size yardımcı olmaya hazır. Buradan yanıt verin, her şeyi sizin için halledelim.", isSystem: true, isReactivation: true },
];

// ═══ RBAC SYSTEM ═══
// Roles: admin, coordinator, doctor, finance
// Each role maps to allowed modules + actions

export const ROLES = {
  admin: { label: "role_admin", color: "#4cc9ff", icon: "👑", desc: "role_admin_desc" },
  coordinator: { label: "role_coordinator", color: "#a78bfa", icon: "📋", desc: "role_coordinator_desc" },
  doctor: { label: "role_doctor", color: "#10b981", icon: "⚕️", desc: "role_doctor_desc" },
  finance: { label: "role_finance", color: "#f59e0b", icon: "💰", desc: "role_finance_desc" },
};

// Module-level permissions: which roles can access which views
export const MODULE_ACCESS = {
  dashboard:      { admin: true, coordinator: true, doctor: false, finance: true },
  support:        { admin: true, coordinator: true, doctor: true, finance: true },
  action_needed:  { admin: true, coordinator: true, doctor: false, finance: false },
  inbox:          { admin: true, coordinator: true, doctor: false, finance: false },
  patients:       { admin: true, coordinator: true, doctor: false, finance: false },
  pipeline:       { admin: true, coordinator: true, doctor: false, finance: false },
  appointments:   { admin: true, coordinator: true, doctor: true,  finance: false },
  op_prep:        { admin: true, coordinator: true, doctor: true,  finance: false },
  analytics:      { admin: true, coordinator: false, doctor: false, finance: true },
  revenue:        { admin: true, coordinator: false, doctor: false, finance: true },
  automations:    { admin: true, coordinator: false, doctor: false, finance: false },
  files:          { admin: true, coordinator: true, doctor: false, finance: false },
  archive:        { admin: true, coordinator: true, doctor: false, finance: false },
  setup:          { admin: true, coordinator: false, doctor: false, finance: false },
  settings:       { admin: true, coordinator: false, doctor: false, finance: false },
  billing:        { admin: true, coordinator: false, doctor: false, finance: false },
  patients_db:    { admin: true, coordinator: true, doctor: false, finance: false },
  doctor_portal:  { admin: false, coordinator: false, doctor: true, finance: false },
  review_board:   { admin: true, coordinator: true, doctor: true,  finance: false },
  ai_control:     { admin: true, coordinator: false, doctor: false, finance: false },
  whatsapp_setup: { admin: true, coordinator: false, doctor: false, finance: false },
  addons:         { admin: true, coordinator: false, doctor: false, finance: false },
  audit_log:      { admin: true, coordinator: false, doctor: false, finance: false },
  payments:       { admin: true, coordinator: false, doctor: false, finance: true },
  support:        { admin: true, coordinator: true, doctor: true,  finance: true },
};

// Action-level permissions
export const ACTION_PERMS = {
  // Patient actions
  view_leads:       { admin: true, coordinator: true, doctor: "assigned", finance: false },
  edit_leads:       { admin: true, coordinator: true, doctor: false, finance: false },
  delete_leads:     { admin: true, coordinator: false, doctor: false, finance: false },
  archive_leads:    { admin: true, coordinator: true, doctor: false, finance: false },
  restore_leads:    { admin: true, coordinator: false, doctor: false, finance: false },
  assign_doctor:    { admin: true, coordinator: true, doctor: false, finance: false },
  // Messages
  send_messages:    { admin: true, coordinator: true, doctor: false, finance: false },
  // Medical
  medical_review:   { admin: true, coordinator: false, doctor: true, finance: false },
  // Calendar
  view_all_calendar:{ admin: true, coordinator: true, doctor: false, finance: false },
  view_own_calendar:{ admin: true, coordinator: true, doctor: true, finance: false },
  create_appt:      { admin: true, coordinator: true, doctor: false, finance: false },
  edit_appt:        { admin: true, coordinator: true, doctor: false, finance: false },
  delete_appt:      { admin: true, coordinator: false, doctor: false, finance: false },
  // Finance
  view_billing:     { admin: true, coordinator: false, doctor: false, finance: true },
  manage_billing:   { admin: true, coordinator: false, doctor: false, finance: false },
  view_invoices:    { admin: true, coordinator: false, doctor: false, finance: true },
  create_invoice:   { admin: true, coordinator: false, doctor: false, finance: true },
  // Analytics
  view_analytics:   { admin: true, coordinator: false, doctor: false, finance: true },
  export_data:      { admin: true, coordinator: false, doctor: false, finance: true },
  // Admin
  manage_team:      { admin: true, coordinator: false, doctor: false, finance: false },
  manage_settings:  { admin: true, coordinator: false, doctor: false, finance: false },
  manage_automations:{ admin: true, coordinator: false, doctor: false, finance: false },
  manage_integrations:{ admin: true, coordinator: false, doctor: false, finance: false },
  manage_roles:     { admin: true, coordinator: false, doctor: false, finance: false },
  delete_data:      { admin: true, coordinator: false, doctor: false, finance: false },
  // Files
  view_files:       { admin: true, coordinator: true, doctor: "assigned", finance: false },
  upload_files:     { admin: true, coordinator: true, doctor: false, finance: false },
  delete_files:     { admin: true, coordinator: false, doctor: false, finance: false },
};

// Helper: check if role has module access
// If plan is not Operations/Enterprise, all users get full access
export function hasModuleAccess(role, module, plan) {
  if (!role || !module) return false;
  let r = role.toLowerCase().replace("clinic_", "");
  // Normalize: staff → coordinator (same access level)
  if (r === "staff") r = "coordinator";
  return MODULE_ACCESS[module]?.[r] === true;
}

// Helper: check if role has action permission
// Returns true, false, or "assigned" (needs object-level check)
export function hasPermission(role, action) {
  if (!role || !action) return false;
  let r = role.toLowerCase().replace("clinic_", "");
  if (r === "staff") r = "coordinator";
  return ACTION_PERMS[action]?.[r] || false;
}

// Helper: get allowed modules for a role
export function getAllowedModules(role) {
  if (!role) return [];
  let r = role.toLowerCase().replace("clinic_", "");
  if (r === "staff") r = "coordinator";
  return Object.entries(MODULE_ACCESS).filter(([, roles]) => roles[r] === true).map(([mod]) => mod);
}

// ROLE_PERMISSIONS removed — use ACTION_PERMS + hasPermission() instead
export const PERM_LABELS = {view_leads:"perm_view_leads",edit_leads:"perm_edit_leads",send_messages:"perm_send_messages",medical_review:"perm_medical_review",view_billing:"perm_view_billing",manage_billing:"perm_manage_billing",view_analytics:"perm_view_analytics",manage_team:"perm_manage_team",manage_settings:"perm_manage_settings",export_data:"perm_export_data",delete_data:"perm_delete_data"};
