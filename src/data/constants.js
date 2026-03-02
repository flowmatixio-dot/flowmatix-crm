export const AUTH_BG = "radial-gradient(ellipse 1200px 600px at 50% -5%,rgba(76,201,255,0.07),transparent 55%),linear-gradient(180deg,#0f1623 0%,#0e1422 100%)";

export const DATA_VERSION = "10";

export const CONV_STATUS = {
  ai_active: { label: "AI Active", color: "#10b981", icon: "🤖", desc: "AI is handling" },
  collecting_photos: { label: "Collecting Photos", color: "#a78bfa", icon: "📷", desc: "Waiting for photos" },
  needs_medical_review: { label: "Medical Review", color: "#ff8a2a", icon: "⚕️", desc: "Clinic review required" },
  waiting_for_clinic_reply: { label: "Waiting Reply", color: "#fbbf24", icon: "⏳", desc: "Clinic must reply" },
  booking_pending: { label: "Booking Pending", color: "#4cc9ff", icon: "📅", desc: "Awaiting booking confirm" },
  deposit_paid: { label: "Deposit Paid", color: "#10b981", icon: "💰", desc: "Deposit received — ready to confirm" },
  human_takeover: { label: "Human Takeover", color: "#ef4444", icon: "👤", desc: "Staff handling" },
  resolved: { label: "Resolved", color: "#6b7280", icon: "✓", desc: "Conversation resolved" },
  closed: { label: "Closed", color: "#6b7280", icon: "✕", desc: "Conversation ended" },
};

export const STAGES = [{ id: "new", label: "New", color: "#4cc9ff", icon: "✦" },{ id: "contacted", label: "Contacted", color: "#fbbf24", icon: "◉" },{ id: "booked", label: "Booked", color: "#a78bfa", icon: "◈" },{ id: "done", label: "Done", color: "#10b981", icon: "✓" }];
export const PLAN_C = { starter: "#6b7280", pro: "#4cc9ff", premium: "#a78bfa", enterprise: "#ff8a2a" };
export const PLAN_PRICE = { starter: "€199", pro: "€399", premium: "€699", enterprise: "€1,199" };
export const PLAN_LIMITS = {
  starter:    { patients: 150,  messages: 500,   automations: 3,  storageMB: 500,   revenueCap: 30000  },
  pro:        { patients: 400,  messages: 2000,  automations: 6,  storageMB: 2000,  revenueCap: 80000  },
  premium:    { patients: 800,  messages: 5000,  automations: 10, storageMB: 5000,  revenueCap: 200000 },
  enterprise: { patients: null, messages: null,  automations: null, storageMB: null, revenueCap: null   },
};
export const APPT_C = { booked: { c: "#4cc9ff", l: "Booked" }, confirmed: { c: "#a78bfa", l: "Confirmed" }, completed: { c: "#10b981", l: "Completed" }, cancelled: { c: "#ef4444", l: "Cancelled" } };
export const TL = { msg_in: { i: "💬", c: "#4cc9ff", l: "Patient" }, bot: { i: "🤖", c: "rgba(76,201,255,0.6)", l: "AI Bot" }, photo: { i: "📷", c: "#a78bfa", l: "Photos" }, handover: { i: "🔔", c: "#ff8a2a", l: "Handover" }, human: { i: "👤", c: "#fbbf24", l: "Staff" }, booking: { i: "📅", c: "#10b981", l: "Booking" }, system: { i: "⚙️", c: "rgba(167,177,195,0.5)", l: "System" }, action: { i: "⚡", c: "#ff8a2a", l: "Action" }, review: { i: "⚕️", c: "#ff8a2a", l: "Review" }, driver: { i: "🚗", c: "#00B4D8", l: "Driver" }, finance: { i: "💰", c: "#10b981", l: "Payment" } };
export const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const NOTIF_ICONS = { lead: "✦", photo: "📷", action: "⚡", booking: "📅", automation: "⚙️", system: "🔔", alert: "🚨", driver: "🚗", payment: "💰" };
export const NOTIF_COLORS = { lead: "#4cc9ff", photo: "#a78bfa", action: "#ff8a2a", booking: "#10b981", automation: "rgba(167,177,195,0.5)", system: "rgba(167,177,195,0.5)", alert: "#ef4444", driver: "#00B4D8", payment: "#10b981" };

export const INVOICE_STATUS = {
  draft: { label: "Draft", color: "#6b7280", icon: "📝" },
  sent: { label: "Sent", color: "#4cc9ff", icon: "📤" },
  paid: { label: "Paid", color: "#10b981", icon: "✓" },
  overdue: { label: "Overdue", color: "#ef4444", icon: "⚠️" },
  cancelled: { label: "Cancelled", color: "#6b7280", icon: "✕" },
};

export const FILE_CATEGORIES = {
  photos: { label: "Photos", icon: "📷", color: "#a78bfa" },
  documents: { label: "Documents", icon: "📄", color: "#4cc9ff" },
  invoices: { label: "Invoices", icon: "🧾", color: "#10b981" },
  logistics: { label: "Logistics", icon: "✈️", color: "#00B4D8" },
};

export const TOUR_STEPS = [
  { id: "dashboard", target: "[data-tour='dashboard']", title: "Dashboard", desc: "Your clinic at a glance — KPIs, revenue, AI activity, and upcoming appointments all in one view.", position: "right" },
  { id: "inbox", target: "[data-tour='inbox']", title: "Inbox", desc: "All patient WhatsApp conversations. AI handles them 24/7 — take over anytime with one click.", position: "right" },
  { id: "pipeline", target: "[data-tour='pipeline']", title: "Pipeline", desc: "Drag patients through stages: New → Contacted → Booked → Done. See your entire funnel.", position: "right" },
  { id: "patient", target: "[data-tour='patient']", title: "Patient Detail", desc: "Click any patient to see their full journey: timeline, photos, invoices, booking, and logistics.", position: "left" },
  { id: "automations", target: "[data-tour='automations']", title: "Automations", desc: "Set up triggers like photo reminders, booking follow-ups, and post-treatment check-ins — all automated.", position: "right" },
  { id: "revenue", target: "[data-tour='revenue']", title: "Revenue", desc: "Track all patient payments, invoices, deposits, and clinic revenue in real time.", position: "right" },
];

export const DRIVER_STATUS = {
  pending: { label: "Pending", color: "#fbbf24", icon: "⏳" },
  notified: { label: "Notified", color: "#4cc9ff", icon: "📱" },
  confirmed: { label: "Confirmed", color: "#10b981", icon: "✅" },
  declined: { label: "Declined", color: "#ef4444", icon: "✕" },
  escalated: { label: "Escalated", color: "#ff8a2a", icon: "🔄" },
  backup_confirmed: { label: "Backup Confirmed", color: "#10b981", icon: "✅" },
  backup_declined: { label: "Backup Declined", color: "#ef4444", icon: "❌" },
};
export const PRICE_MAP = {"FUE":2800,"DHI":3200,"Beard":2200,"Veneers":6200,"Implants":4000,"All-on-4":8500,"Whitening":500,"Rhinoplasty":7000,"Facelift":12000,"Botox":600,"PRP":800,"Eyebrow":1500};

// Copy MSG_TEMPLATES exactly from CRM.jsx lines 342-351
export const MSG_TEMPLATES = [
  { id: "t1", name: "Deposit Request", category: "billing", lang: "en", text: "Hi {first_name}, your treatment plan is ready! To secure your appointment on {date}, please complete the deposit of {price}. Here's your payment link: {payment_link}" },
  { id: "t2", name: "Anzahlung anfragen", category: "billing", lang: "de", text: "Hallo {first_name}, Ihr Behandlungsplan ist fertig! Um Ihren Termin am {date} zu sichern, überweisen Sie bitte die Anzahlung von {price}. Hier ist Ihr Zahlungslink: {payment_link}" },
  { id: "t3", name: "Missing Photos", category: "intake", lang: "en", text: "Hi {first_name}, we still need your photos to prepare your treatment plan. Please send 3 clear photos: front, top, and sides. Our AI will analyze them immediately!" },
  { id: "t4", name: "Booking Confirmation", category: "booking", lang: "en", text: "Great news {first_name}! Your {treatment} appointment with {doctor} is confirmed for {date} at {time}. We'll send you pre-op instructions shortly." },
  { id: "t5", name: "Aftercare", category: "post_op", lang: "en", text: "Hi {first_name}, it's been 24h since your {treatment}. How are you feeling? Remember: no direct sunlight, sleep elevated, take your medications. Any concerns? We're here 24/7." },
  { id: "t6", name: "Follow-Up (No Reply)", category: "followup", lang: "en", text: "Hi {first_name}, Dr. {doctor} wanted to check — do you have any questions about your treatment plan? We'd love to help you book your appointment. Shall we proceed?" },
  { id: "t7", name: "Flight Info Request", category: "logistics", lang: "en", text: "Hi {first_name}, your appointment is approaching! Please share your flight details so we can arrange VIP airport pickup and hotel check-in. Just send us a photo of your ticket." },
  { id: "t8", name: "Termin-Bestätigung", category: "booking", lang: "de", text: "Gute Neuigkeiten {first_name}! Ihr {treatment}-Termin bei {doctor} ist bestätigt für den {date} um {time}. Vorab-Anweisungen folgen in Kürze." },
  { id: "t9", name: "Driver Pickup Notification", category: "logistics", lang: "en", text: "Hi {driver_name}, please pick up {first_name} at {airport} on {date} at {arrival_time}. Flight: {flight_no} ({airline}). Vehicle: {vehicle}. Reply CONFIRM or DECLINE." },
  { id: "t10", name: "Fahrer-Abholbenachrichtigung", category: "logistics", lang: "de", text: "Hallo {driver_name}, bitte holen Sie {first_name} am {airport} ab am {date} um {arrival_time}. Flug: {flight_no} ({airline}). Fahrzeug: {vehicle}. Antworten Sie BESTÄTIGEN oder ABLEHNEN." },
];

// Copy ROLE_PERMISSIONS exactly from CRM.jsx lines 354-359
export const ROLE_PERMISSIONS = {
  Owner:       { view_leads:true, edit_leads:true, send_messages:true, medical_review:true, view_billing:true, manage_billing:true, view_analytics:true, manage_team:true, manage_settings:true, export_data:true, delete_data:true },
  Doctor:      { view_leads:true, edit_leads:true, send_messages:true, medical_review:true, view_billing:false, manage_billing:false, view_analytics:true, manage_team:false, manage_settings:false, export_data:false, delete_data:false },
  Receptionist:{ view_leads:true, edit_leads:true, send_messages:true, medical_review:false, view_billing:true, manage_billing:false, view_analytics:false, manage_team:false, manage_settings:false, export_data:false, delete_data:false },
  Billing:     { view_leads:true, edit_leads:false, send_messages:false, medical_review:false, view_billing:true, manage_billing:true, view_analytics:true, manage_team:false, manage_settings:false, export_data:true, delete_data:false },
};
export const PERM_LABELS = {view_leads:"View Leads",edit_leads:"Edit Leads",send_messages:"Send Messages",medical_review:"Medical Review",view_billing:"View Billing",manage_billing:"Manage Billing",view_analytics:"View Analytics",manage_team:"Manage Team",manage_settings:"Manage Settings",export_data:"Export Data",delete_data:"Delete Data"};
