/* ═══ DEMO / SEED DATA ═══ */

export const DEMO_ACCOUNTS = [
  { email: "admin@flowmatix.io", pass: "admin", role: "admin", clinicId: null, name: "Admin" },
  { email: "mehmet@hairclinicturkiye.com", pass: "clinic", role: "clinic_staff", clinicId: "c1", name: "Mehmet Yilmaz" },
  { email: "anna@dentapro.de", pass: "clinic", role: "clinic_staff", clinicId: "c2", name: "Anna Schmidt" },
];

export const CLINICS_INIT = [
  { id: "c1", name: "Hair Clinic Turkiye", type: "Hair transplant", plan: "pro", status: "active", setupStatus: "new", contact: "Mehmet Yilmaz", email: "mehmet@hairclinicturkiye.com", phone: "+90 532 111 2233", clinicEmail: "info@hairclinicturkiye.com", website: "https://hairclinicturkiye.com", address: "Ataşehir, Istanbul", city: "Istanbul", country: "Turkey", timezone: "Europe/Istanbul", googleEmail: "clinic@gmail.com", brandColor: "#FF8C42", tone: "friendly", primaryLang: "English", waName: "Hair Clinic Turkiye", welcomeMsg: "Hi! 👋 Welcome.", hours: "Mon–Sat: 09:00–18:00", afterHours: "collect", onboarded: "2026-01-15", lastLogin: "2026-02-27T18:30:00", lastActivity: "2026-02-27T18:45:00", totalLogins: 84,
    stats: { leadsMonth: 47, bookingsMonth: 12, convRate: 25.5, aiHandled: 82, avgResponse: "1.2 min", revenueEst: "€4,800", leadsTotal: 142, bookingsTotal: 38, revenueTotal: "€15,200", activeConvs: 8 },
    addons: { extraPatients: 500, languages: "all", voiceAI: false, reminders: true },
    billing: { nextDate: "2026-03-15", method: "Visa ••4242", invoices: [{ date: "2026-02-15", amount: "€578", status: "paid", desc: "Pro + Add-ons" }, { date: "2026-01-15", amount: "€578", status: "paid", desc: "Pro + Add-ons" }] },
    team: [{ name: "Mehmet Yilmaz", role: "Owner", email: "mehmet@hairclinicturkiye.com", lastLogin: "2h ago", inviteStatus: "active" }, { name: "Ayşe Kara", role: "Receptionist", email: "ayse@hairclinicturkiye.com", lastLogin: "1d ago", inviteStatus: "active" }],
    aiConfig: { responseTone: "friendly", clinicDesc: "Premium hair transplant clinic in Istanbul with 12+ years of experience. We specialize in FUE, DHI, and beard transplant.", services: ["FUE Hair Transplant", "DHI Hair Transplant", "Beard Transplant", "Eyebrow Transplant", "PRP Treatment"], faq: [{ q: "How much does it cost?", a: "FUE starts from €1,800 depending on grafts needed." }, { q: "How long is recovery?", a: "Most patients return to work within 3-5 days." }, { q: "Do you offer hotel packages?", a: "Yes! We include 3-night hotel + airport transfers." }], allowedLangs: ["English", "Turkish", "Arabic", "French", "German", "Spanish", "Japanese"], bookingRules: "Only book after medical review is complete. Minimum 2 weeks from today.", autoCollectPhotos: true, autoQualify: true, maxWaitBeforeHandover: 10 },
    bankName: "Türkiye İş Bankası", iban: "TR33 0006 1005 1978 6457 8413 26", bic: "ISBKTRIS", taxId: "TR-1234567890", defaultVat: 8, invoiceCurrency: "EUR", invoiceFooter: "Thank you for choosing Hair Clinic Turkiye. Payment is due within 14 days.",
    drivers: [
      { id: "drv1", name: "Ahmet Kaya", phone: "+90 532 444 5566", role: "primary", vehicle: "Mercedes Vito", plateNo: "34 ABC 123", active: true, totalPickups: 38, lastPickup: "2026-02-25" },
      { id: "drv2", name: "Mustafa Demir", phone: "+90 533 777 8899", role: "backup", vehicle: "VW Transporter", plateNo: "34 DEF 456", active: true, totalPickups: 12, lastPickup: "2026-02-20" },
    ],
    logisticsConfig: { autoNotifyDriver: true, escalationTimeoutMin: 30, pickupTemplateEn: "Hi {driver_name}, please pick up {first_name} at Istanbul Airport on {date} at {arrival_time}. Flight: {flight_no} ({airline}). Vehicle: {vehicle}. Reply CONFIRM or DECLINE.", pickupTemplateDe: "Hallo {driver_name}, bitte holen Sie {first_name} am Flughafen Istanbul ab am {date} um {arrival_time}. Flug: {flight_no} ({airline}). Fahrzeug: {vehicle}. Antworten Sie BESTÄTIGEN oder ABLEHNEN." },
    automations: [
      { id: "aut1", name: "Photo Follow-up", trigger: "No photos after 2h", action: "Send reminder for photos", active: true, lastRun: "2026-02-27T14:00:00", runs: 23 },
      { id: "aut2", name: "Booking Reminder 24h", trigger: "24h before appointment", action: "WhatsApp reminder", active: true, lastRun: "2026-02-27T08:00:00", runs: 31 },
      { id: "aut3", name: "Post-Treatment Day 3", trigger: "3 days after treatment", action: "Send care instructions", active: true, lastRun: "2026-02-25T09:00:00", runs: 12 },
      { id: "aut4", name: "Missed Lead Recovery", trigger: "No reply 48h", action: "Re-engage message", active: false, lastRun: null, runs: 0 },
      { id: "aut5", name: "Qualification Flow", trigger: "New lead message", action: "AI qualification questions", active: true, lastRun: "2026-02-27T17:30:00", runs: 47 },
      { id: "aut6", name: "Driver Auto-Notify", trigger: "Flight detected", action: "Notify primary driver via WhatsApp", active: true, lastRun: "2026-02-27T16:42:00", runs: 5 },
    ],
    files: [
      { id: "f1", name: "carlos_mendez_front.jpg", patient: "Carlos Mendez", type: "image", size: "2.4 MB", uploaded: "2026-02-27T14:38:00", category: "photos", source: "whatsapp" },
      { id: "f2", name: "carlos_mendez_top.jpg", patient: "Carlos Mendez", type: "image", size: "2.1 MB", uploaded: "2026-02-27T14:38:00", category: "photos", source: "whatsapp" },
      { id: "f3", name: "ali_hassan_front.jpg", patient: "Ali Hassan", type: "image", size: "1.8 MB", uploaded: "2026-02-26T16:10:00", category: "photos", source: "whatsapp" },
      { id: "f4", name: "ali_hassan_top.jpg", patient: "Ali Hassan", type: "image", size: "2.0 MB", uploaded: "2026-02-26T16:10:00", category: "photos", source: "whatsapp" },
      { id: "f5", name: "pierre_laurent_beard.jpg", patient: "Pierre Laurent", type: "image", size: "1.6 MB", uploaded: "2026-02-27T17:10:00", category: "photos", source: "whatsapp" },
      { id: "f6", name: "treatment_plan_ali.pdf", patient: "Ali Hassan", type: "pdf", size: "340 KB", uploaded: "2026-02-26T16:30:00", category: "documents" },
      { id: "f7", name: "INV-2026-0001_yusuf.pdf", patient: "Yusuf Demir", type: "pdf", size: "180 KB", uploaded: "2026-02-20T10:00:00", category: "invoices" },
      { id: "f8", name: "flight_ticket_mark.pdf", patient: "Mark Thompson", type: "pdf", size: "95 KB", uploaded: "2026-02-27T16:42:00", category: "logistics" },
    ],
    notifications: [
      { id: "n1", type: "lead", text: "New lead: Carlos Mendez — Hair transplant", time: "2026-02-27T14:32:00", read: false },
      { id: "n2", type: "photo", text: "Carlos Mendez sent 3 photos — ready for review", time: "2026-02-27T14:38:00", read: false },
      { id: "n3", type: "action", text: "Fatima Al-Sayed asked a question AI can't answer", time: "2026-02-27T12:00:00", read: false },
      { id: "n4", type: "booking", text: "Ali Hassan booked: FUE 4000 — March 12", time: "2026-02-26T17:00:00", read: true },
      { id: "n5", type: "automation", text: "Photo follow-up sent to Sophie Dubois", time: "2026-02-27T13:05:00", read: true },
      { id: "n6", type: "lead", text: "New lead: Pierre Laurent — Beard transplant", time: "2026-02-27T17:00:00", read: false },
      { id: "n7", type: "system", text: "Booking reminder sent to Kenji Watanabe", time: "2026-02-27T08:00:00", read: true },
      { id: "n8", type: "driver", text: "🚗 Driver Ahmet Kaya confirmed pickup for Mark Thompson (Mar 14)", time: "2026-02-27T17:00:00", read: false },
      { id: "n9", type: "driver", text: "🚗 Driver notified for Yusuf Demir pickup (Mar 7)", time: "2026-02-26T09:30:00", read: true },
    ],
  },
  { id: "c2", name: "DentaPro Berlin", type: "Dental", plan: "premium", status: "active", setupStatus: "live", contact: "Anna Schmidt", email: "anna@dentapro.de", phone: "+49 170 555 6677", clinicEmail: "info@dentapro.de", website: "https://dentapro.de", address: "Friedrichstraße 42, Berlin", city: "Berlin", country: "Germany", timezone: "Europe/Berlin", googleEmail: "dentapro@gmail.com", brandColor: "#2DA8FF", tone: "professional", primaryLang: "German", waName: "DentaPro Berlin", welcomeMsg: "Willkommen!", hours: "Mon–Fri: 08:00–17:00", afterHours: "24_7", onboarded: "2026-02-01", lastLogin: "2026-02-25T10:00:00", lastActivity: "2026-02-25T11:20:00", totalLogins: 31,
    drivers: [], logisticsConfig: { autoNotifyDriver: false, escalationTimeoutMin: 30, pickupTemplateEn: "", pickupTemplateDe: "" },
    stats: { leadsMonth: 31, bookingsMonth: 8, convRate: 25.8, aiHandled: 76, avgResponse: "1.8 min", revenueEst: "€3,200", leadsTotal: 89, bookingsTotal: 22, revenueTotal: "€8,800", activeConvs: 4 },
    addons: { extraPatients: 0, languages: null, voiceAI: true, reminders: true },
    billing: { nextDate: "2026-03-01", method: "SEPA ••DE89", invoices: [{ date: "2026-02-01", amount: "€787", status: "paid", desc: "Premium + Add-ons" }] },
    team: [{ name: "Anna Schmidt", role: "Owner", email: "anna@dentapro.de", lastLogin: "3d ago", inviteStatus: "active" }, { name: "Markus Lang", role: "Dentist", email: "markus@dentapro.de", lastLogin: "5d ago", inviteStatus: "active" }, { name: "Julia Braun", role: "Receptionist", email: "julia@dentapro.de", lastLogin: "Never", inviteStatus: "pending" }],
    aiConfig: { responseTone: "professional", clinicDesc: "Modern dental clinic in Berlin specializing in cosmetic dentistry, implants, and veneers.", services: ["Veneers", "Dental Implants", "All-on-4", "Teeth Whitening", "Crowns"], faq: [{ q: "Do you treat international patients?", a: "Yes, we welcome patients from all over Europe." }], allowedLangs: ["German", "English", "Italian", "Swedish"], bookingRules: "Consultation required before major procedures.", autoCollectPhotos: true, autoQualify: true, maxWaitBeforeHandover: 15 },
    automations: [
      { id: "aut1", name: "Photo Follow-up", trigger: "No photos after 2h", action: "Send reminder", active: true, lastRun: "2026-02-25T10:00:00", runs: 9 },
      { id: "aut2", name: "Booking Reminder 24h", trigger: "24h before appointment", action: "WhatsApp reminder", active: true, lastRun: "2026-02-25T08:00:00", runs: 14 },
    ],
    files: [
      { id: "f1", name: "emma_johansson_smile.jpg", patient: "Emma Johansson", type: "image", size: "1.9 MB", uploaded: "2026-02-24T10:10:00" },
      { id: "f2", name: "luca_rossi_teeth.jpg", patient: "Luca Rossi", type: "image", size: "2.2 MB", uploaded: "2026-02-25T09:30:00" },
    ],
    notifications: [
      { id: "n1", type: "booking", text: "Emma Johansson booked: Veneers — March 5", time: "2026-02-24T11:05:00", read: true },
      { id: "n2", type: "lead", text: "New lead: Luca Rossi — All-on-4", time: "2026-02-25T09:00:00", read: false },
    ],
  },
  { id: "c3", name: "AesthetiCare London", type: "Aesthetic", plan: "enterprise", status: "active", contact: "James Wilson", email: "james@aestheticare.co.uk", phone: "+44 7700 123456", clinicEmail: "info@aestheticare.co.uk", website: "https://aestheticare.co.uk", address: "Harley Street, London", city: "London", country: "UK", timezone: "Europe/London", googleEmail: "aestheticare@gmail.com", brandColor: "#A78BFA", tone: "concierge", primaryLang: "English", waName: "AesthetiCare", welcomeMsg: "Welcome!", hours: "Mon–Fri: 09:00–18:00", afterHours: "transfer", onboarded: "2025-12-10", lastLogin: "2026-02-27T09:15:00", lastActivity: "2026-02-27T14:50:00", totalLogins: 156,
    drivers: [], logisticsConfig: { autoNotifyDriver: false, escalationTimeoutMin: 30, pickupTemplateEn: "", pickupTemplateDe: "" },
    stats: { leadsMonth: 89, bookingsMonth: 24, convRate: 27.0, aiHandled: 88, avgResponse: "0.8 min", revenueEst: "€9,600", leadsTotal: 267, bookingsTotal: 71, revenueTotal: "€28,400", activeConvs: 12 },
    addons: { extraPatients: 1000, languages: "all", voiceAI: true, reminders: true },
    billing: { nextDate: "2026-03-10", method: "Visa ••1234", invoices: [{ date: "2026-02-10", amount: "€1,886", status: "paid", desc: "Enterprise + Add-ons" }] },
    team: [{ name: "James Wilson", role: "Owner", email: "james@aestheticare.co.uk", lastLogin: "5h ago", inviteStatus: "active" }],
    aiConfig: { responseTone: "concierge", clinicDesc: "Exclusive aesthetic clinic on Harley Street, London.", services: ["Rhinoplasty", "Facelift", "Botox", "Fillers", "Liposuction"], faq: [], allowedLangs: ["English", "Portuguese", "Spanish"], bookingRules: "Consultation deposit required.", autoCollectPhotos: true, autoQualify: true, maxWaitBeforeHandover: 5 },
    automations: [
      { id: "aut1", name: "VIP Follow-up", trigger: "After consultation", action: "Send personalized follow-up", active: true, lastRun: "2026-02-27T15:00:00", runs: 44 },
      { id: "aut2", name: "Booking Reminder 24h", trigger: "24h before appointment", action: "WhatsApp reminder", active: true, lastRun: "2026-02-27T08:00:00", runs: 52 },
    ],
    files: [
      { id: "f1", name: "michael_brown_side.jpg", patient: "Michael Brown", type: "image", size: "2.5 MB", uploaded: "2026-02-26T09:22:00" },
    ],
    notifications: [
      { id: "n1", type: "action", text: "Michael Brown — human takeover required", time: "2026-02-27T09:25:00", read: false },
    ],
  },
];

export const LEADS_INIT = [
  /* ═══ LEAD 1: Ali — Neuer Lead, KI antwortet auf Arabisch ═══ */
  { id: "l1", name: "Ali Hassan", clinic: "c1", phone: "+966 50 111 2233", email: "ali.hassan@yahoo.com", treatment: "FUE 4000 grafts", stage: "new", convStatus: "ai_active", country: "Saudi Arabia", language: "Arabic", photos: false, assigned: null, reviewAssignedTo: null, dob: "1985-06-12", notes: "", booking: null, photoUrls: [], reviewData: null, lastAiInteraction: "2026-02-28T14:05:00",
    timeline: [{ time: "14:00", type: "msg_in", text: "New WhatsApp message received (Arabic)" },{ time: "14:01", type: "bot", text: "AI replied in Arabic — asked about hair loss area" },{ time: "14:03", type: "msg_in", text: "Patient described crown + frontal thinning" },{ time: "14:05", type: "bot", text: "AI requested 3 photos (front, top, donor)" }],
    internalNotes: [] },

  /* ═══ LEAD 2: Sarah — Fotos geschickt, wartet auf Medical Review ═══ */
  { id: "l2", name: "Sarah Mitchell", clinic: "c1", phone: "+44 7911 123456", email: "sarah.m@gmail.com", treatment: "FUE 2500 grafts", stage: "new", convStatus: "needs_medical_review", country: "UK", language: "English", photos: true, assigned: "Dr. Yilmaz", reviewAssignedTo: "Dr. Yilmaz", dob: "1992-08-15", notes: "Hairline recession, wants natural look.", booking: null, photoUrls: ["sarah_front.jpg","sarah_top.jpg","sarah_donor.jpg"], reviewData: null, lastAiInteraction: "2026-02-28T11:45:00",
    timeline: [{ time: "10:30", type: "msg_in", text: "Inquiry via Instagram ad" },{ time: "10:31", type: "bot", text: "AI greeted, asked about concerns" },{ time: "10:40", type: "msg_in", text: "Described hairline recession since age 25" },{ time: "11:00", type: "photo", text: "3 photos received (front, top, donor)" },{ time: "11:00", type: "system", text: "All photos received → Medical review required" }],
    internalNotes: [{ text: "Good donor area visible in photos. Likely 2000-2500 grafts.", author: "Mehmet Yilmaz", time: "2026-02-28T11:50:00" }] },

  /* ═══ LEAD 3: Mark — Flugdaten eingetragen, alles bestätigt ═══ */
  { id: "l3", name: "Mark Thompson", clinic: "c1", phone: "+1 415 555 0199", email: "mark.t@outlook.com", treatment: "FUE 3000 grafts", stage: "booked", convStatus: "ai_active", country: "USA", language: "English", photos: true, assigned: "Dr. Yilmaz", reviewAssignedTo: null, dob: "1988-03-22", notes: "Travel package booked. Premium hotel.", booking: { date: "2026-03-15", time: "09:00", type: "FUE 3000", dur: "5h" }, photoUrls: ["mark_f.jpg","mark_t.jpg","mark_d.jpg"], reviewData: { grafts: "3000", price: "\u20ac2,400", notes: "Norwood 3. Front + crown. Excellent donor density." }, lastAiInteraction: "2026-02-27T16:00:00", flightConfirmed: { date: "2026-03-14", airline: "Delta Airlines", flightNo: "DL 234", arrivalTime: "18:45", detected: "2026-02-27T16:42:00" },
    logistics: { driverId: "drv1", driverName: "Ahmet Kaya", status: "confirmed", notifiedAt: "2026-02-27T16:45:00", confirmedAt: "2026-02-27T17:00:00" },
    financials: { treatmentPrice: 2400, currency: "EUR", depositAmount: 0, depositStatus: "pending", paymentStatus: "pending" },
    timeline: [{ time: "Feb 20", type: "msg_in", text: "Initial inquiry from California" },{ time: "Feb 20", type: "bot", text: "AI collected info + photos" },{ time: "Feb 21", type: "photo", text: "3 photos received" },{ time: "Feb 21", type: "system", text: "Medical review completed by Dr. Yilmaz" },{ time: "Feb 23", type: "system", text: "Treatment plan sent: FUE 3000, \u20ac2,400" },{ time: "Feb 24", type: "booking", text: "Booked March 15, 09:00" },{ time: "Feb 27", type: "system", text: "\u2708 Flight detected: Delta DL 234, March 14, arrival 18:45" },{ time: "Feb 27", type: "driver", text: "🚗 Driver Ahmet Kaya notified for pickup" },{ time: "Feb 27", type: "driver", text: "✅ Driver Ahmet Kaya confirmed pickup" }],
    internalNotes: [{ text: "VIP \u2014 arrange premium hotel + airport pickup", author: "Mehmet Yilmaz", time: "2026-02-24T10:00:00" }] },

  /* ═══ LEAD 4: Yusuf — Bezahlte Rechnung, Deposit confirmed ═══ */
  { id: "l4", name: "Yusuf Demir", clinic: "c1", phone: "+49 170 888 9900", email: "yusuf.d@web.de", treatment: "DHI 3500 grafts", stage: "booked", convStatus: "deposit_paid", country: "Germany", language: "German", photos: true, assigned: "Dr. Yilmaz", reviewAssignedTo: null, dob: "1990-11-04", notes: "Deposit paid. Everything confirmed.", booking: { date: "2026-03-08", time: "08:00", type: "DHI 3500", dur: "6h" }, photoUrls: ["yusuf_f.jpg","yusuf_t.jpg","yusuf_d.jpg","yusuf_b.jpg"], reviewData: { grafts: "3500", price: "\u20ac3,800", notes: "Norwood 4. DHI method preferred. Full crown restoration." }, lastAiInteraction: "2026-02-26T15:00:00", flightConfirmed: { date: "2026-03-07", airline: "Lufthansa", flightNo: "LH 1234", arrivalTime: "14:30", detected: "2026-02-26T09:15:00" }, consent: { granted: true, timestamp: "2026-02-22T10:00:00", method: "whatsapp" },
    logistics: { driverId: "drv1", driverName: "Ahmet Kaya", status: "notified", notifiedAt: "2026-02-26T09:30:00" },
    financials: { treatmentPrice: 3800, currency: "EUR", depositAmount: 950, depositStatus: "paid", paymentStatus: "partial" },
    timeline: [{ time: "Feb 18", type: "msg_in", text: "Inquiry from Berlin" },{ time: "Feb 18", type: "bot", text: "AI collected photos + info in German" },{ time: "Feb 19", type: "photo", text: "4 photos received" },{ time: "Feb 19", type: "system", text: "Medical review completed" },{ time: "Feb 20", type: "system", text: "Treatment plan sent: DHI 3500, \u20ac3,800" },{ time: "Feb 22", type: "system", text: "\u2705 DSGVO consent received via WhatsApp" },{ time: "Feb 22", type: "booking", text: "Booked March 8, 08:00" },{ time: "Feb 25", type: "finance", text: "💰 Deposit €950 received (Stripe)" },{ time: "Feb 26", type: "system", text: "\u2708 Flight: Lufthansa LH 1234, March 7, 14:30" }],
    internalNotes: [{ text: "Patient speaks fluent German + Turkish. Very decisive, booked within 4 days.", author: "Mehmet Yilmaz", time: "2026-02-22T11:00:00" }] },

  /* ═══ LEAD 5: Kenji — KI steckt fest, Human Takeover nötig ═══ */
  { id: "l5", name: "Kenji Watanabe", clinic: "c1", phone: "+81 80 5555 1234", email: "kenji.w@gmail.com", treatment: "FUE (unbestimmt)", stage: "contacted", convStatus: "human_takeover", country: "Japan", language: "Japanese", photos: true, assigned: null, reviewAssignedTo: null, dob: "1991-05-20", notes: "AI konnte medizinische Frage nicht beantworten.", booking: null, photoUrls: ["kenji_f.jpg","kenji_t.jpg"], reviewData: null, lastAiInteraction: "2026-02-28T09:30:00",
    timeline: [{ time: "08:00", type: "msg_in", text: "\u3053\u3093\u306b\u3061\u306f (Hello)" },{ time: "08:01", type: "bot", text: "AI greeted in Japanese, collected basic info" },{ time: "08:15", type: "photo", text: "2 photos received" },{ time: "09:00", type: "msg_in", text: "Patient asked about medication interactions" },{ time: "09:00", type: "system", text: "\u26a0 AI confidence low \u2014 medical question outside scope" },{ time: "09:30", type: "handover", text: "\ud83d\udd14 Human takeover required" }],
    internalNotes: [] },

  /* ═══ DONE — Completed procedures ═══ */
  { id: "l6", name: "Dmitri Volkov", clinic: "c1", phone: "+7 916 123 4567", email: "dmitri.v@mail.ru", treatment: "FUE 3000 grafts", stage: "done", convStatus: "closed", country: "Russia", language: "Russian", photos: true, assigned: "Dr. Yilmaz", reviewAssignedTo: null, dob: "1987-07-02", notes: "Completed successfully. Excellent result.", booking: { date: "2026-02-20", time: "09:00", type: "FUE 3000", dur: "5h" }, photoUrls: ["d_f.jpg","d_t.jpg","d_d.jpg"], reviewData: { grafts: "3000", price: "€2,400", notes: "Norwood 3. Front + mid." }, lastAiInteraction: "2026-02-20T16:00:00",
    financials: { treatmentPrice: 2400, currency: "EUR", depositAmount: 600, depositStatus: "paid", paymentStatus: "paid" },
    timeline: [{ time: "Feb 10", type: "msg_in", text: "Inquiry from Moscow" },{ time: "Feb 12", type: "photo", text: "3 photos" },{ time: "Feb 14", type: "system", text: "Treatment plan sent" },{ time: "Feb 18", type: "finance", text: "💰 Deposit €600 received" },{ time: "Feb 20", type: "system", text: "✅ Procedure completed" },{ time: "Feb 20", type: "finance", text: "💰 Full payment €1,800 received (cash)" }],
    internalNotes: [{ text: "Very happy with result. Left 5-star Google review.", author: "Mehmet Yilmaz", time: "2026-02-21T10:00:00" }] },

  { id: "l7", name: "Omar Farouq", clinic: "c1", phone: "+20 100 555 7890", email: "omar.f@yahoo.com", treatment: "Beard transplant", stage: "done", convStatus: "closed", country: "Egypt", language: "Arabic", photos: true, assigned: "Dr. Yilmaz", reviewAssignedTo: null, dob: "1993-11-30", notes: "Full beard restoration completed.", booking: { date: "2026-02-18", time: "10:00", type: "Beard 2500", dur: "4h" }, photoUrls: ["o_f.jpg","o_b.jpg"], reviewData: { grafts: "2500", price: "€2,200", notes: "Full beard restoration" }, lastAiInteraction: "2026-02-18T16:00:00",
    financials: { treatmentPrice: 2200, currency: "EUR", depositAmount: 550, depositStatus: "paid", paymentStatus: "paid" },
    timeline: [{ time: "Feb 05", type: "msg_in", text: "Beard inquiry (Arabic)" },{ time: "Feb 07", type: "photo", text: "2 photos" },{ time: "Feb 16", type: "finance", text: "💰 Deposit €550 received" },{ time: "Feb 18", type: "system", text: "✅ Procedure completed" },{ time: "Feb 18", type: "finance", text: "💰 Full payment €1,650 received (card)" }],
    internalNotes: [] },

  { id: "l8", name: "Hans Weber", clinic: "c1", phone: "+49 170 123 4567", email: "hans.w@gmx.de", treatment: "FUE 3500 grafts", stage: "done", convStatus: "closed", country: "Germany", language: "German", photos: true, assigned: "Dr. Yilmaz", reviewAssignedTo: null, dob: "1980-09-14", notes: "Travel package. Completed.", booking: { date: "2026-02-25", time: "08:00", type: "FUE 3500", dur: "6h" }, photoUrls: ["h_f.jpg","h_t.jpg","h_d.jpg"], reviewData: { grafts: "3500", price: "€2,800", notes: "Crown + front. Excellent donor." }, lastAiInteraction: "2026-02-25T15:00:00",
    financials: { treatmentPrice: 2800, currency: "EUR", depositAmount: 700, depositStatus: "paid", paymentStatus: "paid" },
    timeline: [{ time: "Feb 15", type: "msg_in", text: "Inquiry from Berlin (German)" },{ time: "Feb 17", type: "photo", text: "3 photos" },{ time: "Feb 23", type: "finance", text: "💰 Deposit €700 received" },{ time: "Feb 25", type: "system", text: "✅ Procedure completed" },{ time: "Feb 25", type: "finance", text: "💰 Full payment €2,100 received (card)" }],
    internalNotes: [{ text: "Referred by Dmitri Volkov. Gave both 10% referral discount.", author: "Mehmet Yilmaz", time: "2026-02-25T16:00:00" }] },
];

export const INVOICES_INIT = [
  { id:"inv1", nr:"INV-2026-0001", clinicId:"c1", leadId:"l4", patientName:"Yusuf Demir", patientEmail:"yusuf.d@web.de", treatment:"DHI 3500", items:"DHI Hair Transplant 3500 grafts\nPremium Hotel Package (3 nights)\nVIP Airport Transfer", net:3800, vatPct:8, vatAmount:304, gross:4104, currency:"EUR", status:"paid", created:"2026-02-20T10:00:00", clinicName:"Hair Clinic Turkiye", clinicAddress:"Istanbul, Turkey", clinicEmail:"info@hairclinicturkiye.com", clinicPhone:"+90 212 555 0100", dueDate:"2026-03-01", payments:[{amount:950,date:"2026-02-25T14:30:00",method:"card"}], paidDate:"2026-02-25T14:30:00", paidMethod:"card", depositAmount:950 },
  { id:"inv2", nr:"INV-2026-0002", clinicId:"c1", leadId:"l3", patientName:"Mark Thompson", patientEmail:"mark.t@outlook.com", treatment:"FUE 3000", items:"FUE Hair Transplant 3000 grafts\nHotel Package (2 nights)\nAirport Transfer", net:2400, vatPct:8, vatAmount:192, gross:2592, currency:"EUR", status:"unpaid", created:"2026-02-24T11:00:00", clinicName:"Hair Clinic Turkiye", clinicAddress:"Istanbul, Turkey", clinicEmail:"info@hairclinicturkiye.com", clinicPhone:"+90 212 555 0100", dueDate:"2026-03-10", payments:[], stripeLink:"https://checkout.stripe.com/pay/cs_demo_mark001?amount=2592&currency=eur" },
];

export const APPOINTMENTS_INIT = [
  /* March 2026 — 18 appointments, all on different days, 1 cancelled */
  { id: "a1", clinic: "c1", leadId: "l4", patient: "Yusuf Demir", treatment: "DHI 3500 grafts", date: "2026-03-02", time: "08:00", endTime: "14:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "Deposit paid" },
  { id: "a2", clinic: "c1", leadId: null, patient: "Carlos Mendez", treatment: "FUE 2500 grafts", date: "2026-03-03", time: "09:00", endTime: "13:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a3", clinic: "c1", leadId: null, patient: "Sophie Laurent", treatment: "Eyebrow transplant", date: "2026-03-04", time: "10:00", endTime: "12:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a4", clinic: "c1", leadId: null, patient: "Ahmed Al-Rashid", treatment: "FUE 4000 grafts", date: "2026-03-05", time: "08:00", endTime: "15:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "VIP" },
  { id: "a5", clinic: "c1", leadId: null, patient: "Thomas Weber", treatment: "FUE 3000 grafts", date: "2026-03-06", time: "09:00", endTime: "14:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a6", clinic: "c1", leadId: "l3", patient: "Mark Thompson", treatment: "FUE 3000 grafts", date: "2026-03-09", time: "09:00", endTime: "14:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "VIP - premium hotel" },
  { id: "a7", clinic: "c1", leadId: null, patient: "Dmitri Volkov", treatment: "FUE 2800 grafts", date: "2026-03-10", time: "08:00", endTime: "13:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a8", clinic: "c1", leadId: null, patient: "Pierre Dupont", treatment: "FUE 3200 grafts", date: "2026-03-11", time: "09:00", endTime: "14:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a9", clinic: "c1", leadId: null, patient: "Luca Bianchi", treatment: "Hairline restoration", date: "2026-03-12", time: "10:00", endTime: "14:00", status: "booked", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a10", clinic: "c1", leadId: null, patient: "James Wilson", treatment: "FUE 2200 grafts", date: "2026-03-13", time: "09:00", endTime: "12:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a11", clinic: "c1", leadId: null, patient: "Omar Khalil", treatment: "Beard transplant", date: "2026-03-16", time: "10:00", endTime: "13:00", status: "booked", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a12", clinic: "c1", leadId: null, patient: "Fatima Al-Sayed", treatment: "Eyebrow transplant", date: "2026-03-17", time: "10:00", endTime: "12:30", status: "booked", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a13", clinic: "c1", leadId: null, patient: "Hans Müller", treatment: "FUE 3500 grafts", date: "2026-03-18", time: "08:00", endTime: "14:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a14", clinic: "c1", leadId: null, patient: "Ricardo Santos", treatment: "DHI 2000 grafts", date: "2026-03-19", time: "09:00", endTime: "13:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a15", clinic: "c1", leadId: null, patient: "Ali Mansour", treatment: "FUE 4500 grafts", date: "2026-03-20", time: "08:00", endTime: "16:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "VIP full day" },
  { id: "a16", clinic: "c1", leadId: null, patient: "Erik Johansson", treatment: "FUE 2800 grafts", date: "2026-03-23", time: "09:00", endTime: "13:00", status: "booked", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a17", clinic: "c1", leadId: null, patient: "Mohamed Hassan", treatment: "Beard + FUE combo", date: "2026-03-24", time: "08:00", endTime: "15:00", status: "confirmed", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "" },
  { id: "a18", clinic: "c1", leadId: null, patient: "Stefan Braun", treatment: "FUE 2000 grafts", date: "2026-03-26", time: "09:00", endTime: "12:00", status: "cancelled", assigned: "Dr. Yilmaz", source: "WhatsApp AI", notes: "Patient postponed to April" },
];

export const MSGS_INIT = {
  c1: [
    { id: "m1", leadId: "l1", from: "+966 50 111 2233", name: "Ali Hassan", unread: true, msgs: [
      { text: "\u0645\u0631\u062d\u0628\u0627\u060c \u0623\u0631\u064a\u062f \u0632\u0631\u0627\u0639\u0629 \u0634\u0639\u0631", time: "14:00", sender: "patient" },
      { text: "\u0623\u0647\u0644\u0627 \u0639\u0644\u064a! \u0623\u0646\u0627 \u0627\u0644\u0645\u0633\u0627\u0639\u062f \u0627\u0644\u0630\u0643\u064a \u0644\u0639\u064a\u0627\u062f\u0629 Hair Clinic Turkiye. \u0643\u064a\u0641 \u064a\u0645\u0643\u0646\u0646\u064a \u0645\u0633\u0627\u0639\u062f\u062a\u0643\u061f \u0647\u0644 \u064a\u0645\u0643\u0646\u0643 \u0648\u0635\u0641 \u0645\u0646\u0637\u0642\u0629 \u062a\u0633\u0627\u0642\u0637 \u0627\u0644\u0634\u0639\u0631\u061f", time: "14:01", sender: "bot" },
      { text: "\u0646\u0639\u0645\u060c \u0623\u0639\u0627\u0646\u064a \u0645\u0646 \u062a\u0633\u0627\u0642\u0637 \u0641\u064a \u0627\u0644\u062c\u0632\u0621 \u0627\u0644\u0623\u0645\u0627\u0645\u064a \u0648\u0627\u0644\u062a\u0627\u062c", time: "14:03", sender: "patient" },
      { text: "\u0634\u0643\u0631\u0627 \u0639\u0644\u064a! \u0644\u0643\u064a \u064a\u062a\u0645\u0643\u0646 \u0637\u0628\u064a\u0628\u0646\u0627 \u0645\u0646 \u062a\u0642\u064a\u064a\u0645 \u062d\u0627\u0644\u062a\u0643\u060c \u064a\u0631\u062c\u0649 \u0625\u0631\u0633\u0627\u0644 3 \u0635\u0648\u0631: \u0623\u0645\u0627\u0645\u064a\u0629\u060c \u0639\u0644\u0648\u064a\u0629\u060c \u0648\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0645\u0627\u0646\u062d\u0629", time: "14:05", sender: "bot" },
    ]},
    { id: "m2", leadId: "l2", from: "+44 7911 123456", name: "Sarah Mitchell", unread: true, msgs: [
      { text: "Hi, I saw your clinic on Instagram. I\u2019m interested in a hair transplant for my receding hairline.", time: "10:30", sender: "patient" },
      { text: "Hello Sarah! Welcome to Hair Clinic Turkiye. I\u2019d love to help you. Can you tell me more about when you first noticed the hairline changes?", time: "10:31", sender: "bot" },
      { text: "Started about 3 years ago. It\u2019s getting worse, especially at the temples.", time: "10:40", sender: "patient" },
      { text: "Thank you for sharing. To give you an accurate assessment, our medical team needs 3 photos: front hairline, top of head, and back/donor area. You can take them with your phone now.", time: "10:42", sender: "bot" },
      { text: "\ud83d\udcf7 \ud83d\udcf7 \ud83d\udcf7", time: "11:00", sender: "patient" },
      { text: "Perfect! All 3 photos received. Our medical team (Dr. Yilmaz) will review them and prepare your personalized treatment plan. You\u2019ll hear back within a few hours!", time: "11:00", sender: "bot" },
    ]},
    { id: "m3", leadId: "l3", from: "+1 415 555 0199", name: "Mark Thompson", unread: false, msgs: [
      { text: "Hey, looking into FUE hair transplant. I\u2019m from San Francisco.", time: "Feb 20", sender: "patient" },
      { text: "Welcome Mark! Hair Clinic Turkiye specializes in FUE. Let me collect some details and photos.", time: "Feb 20", sender: "bot" },
      { text: "\ud83d\udcf7 \ud83d\udcf7 \ud83d\udcf7", time: "Feb 21", sender: "patient" },
      { text: "Dr. Yilmaz has reviewed your photos. Recommendation: FUE 3000 grafts, \u20ac2,400. Includes hotel + transfer package.", time: "Feb 23", sender: "bot" },
      { text: "That sounds great. Let\u2019s book March 15.", time: "Feb 24", sender: "patient" },
      { text: "\u2705 Confirmed! March 15, 09:00. Your treatment plan and booking details have been sent to your email.", time: "Feb 24", sender: "bot" },
      { text: "\u2708 Flight detected: Delta DL 234, arriving March 14 at 18:45. Airport pickup will be arranged.", time: "Feb 27", sender: "system", msgType: "system" },
    ]},
    { id: "m4", leadId: "l4", from: "+49 170 888 9900", name: "Yusuf Demir", unread: false, msgs: [
      { text: "Hallo, ich interessiere mich f\u00fcr eine Haartransplantation mit der DHI-Methode.", time: "Feb 18", sender: "patient" },
      { text: "Hallo Yusuf! Willkommen bei Hair Clinic Turkiye. Die DHI-Methode ist eine ausgezeichnete Wahl. K\u00f6nnen Sie mir Fotos senden?", time: "Feb 18", sender: "bot" },
      { text: "\ud83d\udcf7 \ud83d\udcf7 \ud83d\udcf7 \ud83d\udcf7", time: "Feb 19", sender: "patient" },
      { text: "Dr. Yilmaz empfiehlt: DHI 3500 Grafts, \u20ac3.800. Inklusive Hotelpaket + Flughafentransfer.", time: "Feb 20", sender: "bot" },
      { text: "Perfekt. Ich buche den 8. M\u00e4rz.", time: "Feb 22", sender: "patient" },
      { text: "\u2705 Termin best\u00e4tigt: 8. M\u00e4rz, 08:00 Uhr. Hier ist Ihr Anzahlungslink:", time: "Feb 22", sender: "bot" },
      { text: JSON.stringify({type:"payment_card",amount:950,currency:"EUR",status:"paid",link:"https://checkout.stripe.com/pay/cs_live_yusuf001",created:"2026-02-22T16:00:00",id:"pc_yusuf_1",paidAt:"2026-02-25T14:30:00"}), time: "Feb 22", sender: "system", msgType: "payment_card" },
      { text: "\ud83d\udcb0 Anzahlung \u20ac950 eingegangen! Ihr Termin am 8. M\u00e4rz ist nun vollst\u00e4ndig best\u00e4tigt.", time: "Feb 25", sender: "bot" },
    ]},
    { id: "m5", leadId: "l5", from: "+81 80 5555 1234", name: "Kenji Watanabe", unread: true, msgs: [
      { text: "\u3053\u3093\u306b\u3061\u306f\u3001\u690d\u6bdb\u306b\u3064\u3044\u3066\u76f8\u8ac7\u3057\u305f\u3044\u3067\u3059", time: "08:00", sender: "patient" },
      { text: "\u3053\u3093\u306b\u3061\u306f\u3001\u30b1\u30f3\u30b8\u3055\u3093\uff01Hair Clinic Turkiye\u3078\u3088\u3046\u3053\u305d\u3002\u307e\u305a\u304a\u5199\u771f\u3092\u304a\u9001\u308a\u304f\u3060\u3055\u3044\u3002", time: "08:01", sender: "bot" },
      { text: "\ud83d\udcf7 \ud83d\udcf7", time: "08:15", sender: "patient" },
      { text: "I am currently taking Finasteride and Minoxidil. Will these affect the transplant procedure? Can I continue during recovery?", time: "09:00", sender: "patient" },
      { text: "\ud83d\udd14 This question requires medical expertise. Let me connect you with our clinical team who can advise on medication interactions.", time: "09:00", sender: "bot" },
      { text: "\u26a0 Human takeover \u2014 AI cannot answer medical question about drug interactions", time: "09:30", sender: "system" },
    ]},
  ],
  c2: [],
};

/* ======== LEAD CHART DATA (monthly) ======== */
export const LEAD_CHART = {
  c1: [{ m: "Sep", v: 18 },{ m: "Oct", v: 24 },{ m: "Nov", v: 29 },{ m: "Dec", v: 35 },{ m: "Jan", v: 41 },{ m: "Feb", v: 47 }],
  c2: [{ m: "Sep", v: 0 },{ m: "Oct", v: 0 },{ m: "Nov", v: 0 },{ m: "Dec", v: 0 },{ m: "Jan", v: 12 },{ m: "Feb", v: 31 }],
  c3: [{ m: "Sep", v: 32 },{ m: "Oct", v: 41 },{ m: "Nov", v: 55 },{ m: "Dec", v: 63 },{ m: "Jan", v: 78 },{ m: "Feb", v: 89 }],
};
export const COUNTRY_DATA = {
  c1: [{ country: "Saudi Arabia", pct: 22 },{ country: "Spain", pct: 18 },{ country: "France", pct: 16 },{ country: "UAE", pct: 14 },{ country: "Germany", pct: 12 },{ country: "Japan", pct: 10 },{ country: "Other", pct: 8 }],
  c2: [{ country: "Germany", pct: 40 },{ country: "Sweden", pct: 18 },{ country: "Italy", pct: 15 },{ country: "Austria", pct: 12 },{ country: "Other", pct: 15 }],
  c3: [{ country: "UK", pct: 30 },{ country: "USA", pct: 22 },{ country: "Brazil", pct: 15 },{ country: "Middle East", pct: 18 },{ country: "Other", pct: 15 }],
};
