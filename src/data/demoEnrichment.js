import { useBillingStore } from "../stores/billingStore";
// NOTE: Invoices are the ONLY remaining client-side demo data.
// Stats, notifications, and automations now come from DB metadata (via clone_demo_to_org).

export function enrichDemoData(cid, setClinics) {
  if (!cid) return;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now()-86400000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(Date.now()-172800000).toISOString().split("T")[0];

  // ── Patients, Appointments, Conversations come from DB (clone_demo_to_org) ──
  // Do NOT overwrite them. They are loaded via fetchPatients/fetchAppointments/fetchConversations.

  // ── Invoices: inject demo invoices if none exist ──
  const currentInvoices = useBillingStore.getState().invoices || [];
  const hasDemoInvoices = currentInvoices.some(i => i.is_demo);
  if (!hasDemoInvoices) {
    const demoInvoices = [
      { id:"demo-inv1", clinicId:cid, patient:"Priya Sharma", leadId:null, treatment:"FUE Saphir 3000 Grafts", gross:2000, net:1852, vat:148, status:"paid", date:twoDaysAgo, paidAt:twoDaysAgo, is_demo:true },
      { id:"demo-inv2", clinicId:cid, patient:"Anna Kowalski", leadId:null, treatment:"FUE Saphir 2500 Grafts", gross:1900, net:1759, vat:141, status:"paid", date:twoDaysAgo, paidAt:twoDaysAgo, is_demo:true },
      { id:"demo-inv3", clinicId:cid, patient:"Mohammed Al-Rashid", leadId:null, treatment:"DHI 4500 Grafts", gross:3200, net:2963, vat:237, status:"paid", date:yesterday, paidAt:yesterday, is_demo:true },
      { id:"demo-inv4", clinicId:cid, patient:"Sven Johansson", leadId:null, treatment:"DHI 3800 Grafts", gross:2790, net:2583, vat:207, status:"paid", date:yesterday, paidAt:yesterday, is_demo:true },
      { id:"demo-inv5", clinicId:cid, patient:"Min-jun Kim", leadId:null, treatment:"FUE Saphir 4200 Grafts", gross:2990, net:2769, vat:221, status:"paid", date:yesterday, paidAt:yesterday, is_demo:true },
      { id:"demo-inv6", clinicId:cid, patient:"Yuki Tanaka", leadId:null, treatment:"FUE Saphir 3500 Grafts", gross:2500, net:2315, vat:185, status:"deposit", date:today, is_demo:true },
      { id:"demo-inv7", clinicId:cid, patient:"Pierre Dupont", leadId:null, treatment:"DHI 3200 Grafts", gross:2800, net:2593, vat:207, status:"pending", date:today, is_demo:true },
    ];
    useBillingStore.getState().setInvoices(prev => {
      const real = (Array.isArray(prev)?prev:[]).filter(i => !i.is_demo);
      return [...real, ...demoInvoices];
    });
  }

  // ── Clinic stats + notifications: read from DB metadata (via clone_demo_to_org) ──
  // Automations already come from DB metadata via getAutomations() — no change needed.
  setClinics(prev => prev.map(c => {
    if (c.id !== cid) return c;
    // Stats from DB metadata (demo_stats), fallback to current stats
    const dbStats = c.demo_stats;
    const stats = dbStats
      ? { leadsMonth: dbStats.leadsMonth, bookingsMonth: dbStats.bookingsMonth, convRate: dbStats.convRate, aiHandled: dbStats.aiHandled, activeConvs: dbStats.activeConvs, avgResponse: dbStats.avgResponse }
      : c.stats;
    // Notifications from DB metadata (demo_notifications), convert hoursAgo to ISO timestamps
    const dbNotifs = c.demo_notifications;
    const notifications = Array.isArray(dbNotifs)
      ? dbNotifs.map(n => ({ id: n.id, type: n.type, text: n.text, time: new Date(Date.now() - (n.hoursAgo || 0) * 3600000).toISOString(), read: !!n.read }))
      : c.notifications || [];
    return { ...c, stats, notifications };
  }));
}

export function cleanDemoData(cid, setClinics) {
  if (!cid) return;
  // Don't clear DB-loaded patients/appointments — they get filtered by demo_mode_enabled=false
  useBillingStore.getState().setInvoices(prev => (Array.isArray(prev)?prev:[]).filter(i => !i.is_demo));
  setClinics(prev => prev.map(c => {
    if (c.id !== cid) return c;
    return { ...c,
      stats: { leadsMonth:0, bookingsMonth:0, convRate:0, aiHandled:0, activeConvs:0, avgResponse:"—" },
      automations: (c.automations||[]).filter(a => !a.is_demo),
      notifications: [],
    };
  }));
}
