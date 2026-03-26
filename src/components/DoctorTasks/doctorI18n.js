const doctorI18n = {
  de: {
    // Header/Navigation
    portal_title: "Arzt-Portal",
    flowmatix: "Flowmatix",
    logout: "Abmelden",
    help: "Hilfe",
    open_count: "offen",
    completed_count: "abgeschlossen",

    // Tabs
    tab_pending: "Offen",
    tab_completed: "Erledigt",
    tab_calendar: "Kalender",
    tab_stats: "Statistik",

    // Task Types
    task_graft: "Graft-Bewertung",
    task_medical: "Medizinische Bewertung",
    task_pickup: "Flughafen-Transfer",

    // Status
    status_pending: "Offen",
    status_in_progress: "In Bearbeitung",
    status_completed: "Abgeschlossen",
    status_canceled: "Abgebrochen",

    // Tabs (new)
    tab_open: "Offen",
    tab_reviewed: "Bewertet",

    // Empty States
    all_done: "Alles erledigt!",
    no_pending: "Keine offenen Bewertungen. Neue Aufgaben erscheinen hier automatisch.",
    no_completed: "Noch keine abgeschlossenen Aufgaben.",
    no_appointments: "Keine Termine",
    empty_open_title: "Keine offenen Bewertungen",
    empty_open_desc: "Neue Patienten erscheinen hier automatisch, sobald Fotos eingereicht wurden. Das System erstellt neue Fälle im Hintergrund.",
    empty_reviewed_title: "Noch keine bewerteten Fälle",
    empty_reviewed_desc: "Bereits bearbeitete Bewertungen erscheinen hier automatisch.",

    // Urgency
    waiting_since: "Wartet seit",
    new_since: "Neu seit",

    // Portal
    doctor_portal_title: "Arzt-Portal",
    review_queue_desc: "Medizinische Bewertungen und Entscheidungen",

    // Patient Data
    patient_data: "Patientendaten",
    treatment: "Behandlung",
    concern: "Bereich",
    hair_loss_since: "Haarausfall seit",
    previous_treatments: "Vorbehandlungen",
    medications: "Medikamente",
    patient_photos: "Patientenfotos",

    // Flight/Pickup
    flight_data: "Flugdaten",
    airline: "Airline",
    flight: "Flug",
    from: "Von",
    to: "Nach",
    arrival: "Ankunft",
    time: "Uhrzeit",
    driver_name: "Fahrer Name",
    driver_phone: "Fahrer Telefon",
    vehicle: "Fahrzeug / Kennzeichen",
    assign_driver: "Fahrer zuweisen",

    // Review Form
    graft_count: "Graft-Anzahl",
    price_eur: "Preis (EUR)",
    technique: "Technik",
    internal_notes: "Interne Notizen (optional)",
    notes_hint: "Anmerkungen für das Team (werden NICHT an den Patienten gesendet).",
    notes_privacy: "Notizen bleiben intern — nur Grafts, Methode und Preis werden per WhatsApp an den Patienten gesendet.",
    submit_review: "Bewertung absenden",
    saving: "Wird gespeichert...",
    review_btn: "Bewerten",

    // Review Panel
    medical_assessment: "Medizinische Bewertung",
    graft_slider_label: "Graft-Anzahl",
    technique_recommendation: "Technik-Empfehlung",
    donor_quality: "Spenderbereich-Qualität",
    treatment_zones: "Behandlungszonen",
    duration_estimate: "Geschätzte Dauer (Std.)",
    price_estimate: "Preisschätzung",
    doctor_notes: "Arzt-Notizen",
    decision: "Entscheidung",
    approve: "Genehmigen",
    request_more_photos: "Mehr Fotos anfordern",
    reject: "Ablehnen",
    reject_reason: "Ablehnungsgrund",
    confirm_reject: "Ablehnung bestätigen",
    cancel: "Abbrechen",
    msg_to_patient: "Nachricht an den Patienten",
    request_photos: "Fotos anfordern",
    previous_reviews: "Bisherige Bewertungen",
    approved: "Genehmigt",
    rejected: "Abgelehnt",
    photos_requested: "Fotos angefordert",

    // Donor Quality Options
    excellent: "Exzellent",
    good: "Gut",
    fair: "Ausreichend",
    poor: "Schlecht",

    // Treatment Zones
    zone_front: "Stirn / Haarlinie",
    zone_crown: "Tonsur / Oberkopf",
    zone_temples: "Geheimratsecken",
    zone_vertex: "Wirbel",

    // Photo Labels
    photo_front: "Vorne",
    photo_top: "Oben",
    photo_left: "Links",
    photo_right: "Rechts",
    photo_donor: "Spenderbereich",
    no_photo: "Kein Foto",

    // Techniques
    fue: "FUE",
    fue_sapphire: "FUE Saphir",
    dhi: "DHI",
    fue_dhi: "FUE + DHI Kombi",
    prp: "PRP",
    beard: "Bart-Transplantation",
    eyebrow: "Augenbrauen-Transplantation",

    // Deposit
    request_deposit: "Anzahlung anfordern",
    deposit_stripe: "Stripe-Link wird mit Behandlungsplan gesendet",
    deposit_custom: "Zahlungslink wird mitgesendet",
    deposit_bank: "Bankdaten werden mitgesendet",
    deposit_amount: "Anzahlung (EUR)",
    appointment_first: "Erst Termin, dann Anzahlung",
    deposit_after_booking: "Die Anzahlung wird automatisch nach der Terminbuchung angefordert.",

    // Calendar
    today: "Heute",
    this_week: "Diese Woche",
    this_month: "Dieser Monat",
    no_appointments_today: "Keine Termine heute",
    appointments: "Termine",
    hours: "Stunden",
    surgery: "OP",
    consultation: "Beratung",

    // Stats
    total_reviews: "Bewertungen gesamt",
    avg_grafts: "\u00D8 Grafts",
    avg_price: "\u00D8 Preis",
    reviews_this_week: "Diese Woche",
    reviews_this_month: "Dieser Monat",
    approval_rate: "Genehmigungsrate",

    // Priority
    urgent: "Dringend",
    waiting_long: "Wartet lange",
    normal: "Normal",
    waiting_since: "Wartet seit",

    // Onboarding
    onboarding_title: "So funktioniert das Arzt-Portal",
    onboarding_line1: "Neue Patienten werden automatisch zugewiesen, sobald Fotos eingereicht wurden.",
    onboarding_line2: "Du siehst die Fotos, gibst Graft-Anzahl, Preis und Technik ein — fertig.",
    onboarding_line3: "Bitte bewerte offene Fälle zeitnah, damit der Patient schnell weiterverarbeitet werden kann.",
    onboarding_line4: "Alles andere — Terminbuchung, Nachrichten, Zahlungen — läuft vollautomatisch im Hintergrund.",

    // Alert
    new_case_alert: "Neuer Patient zur Bewertung",
    review_now: "Jetzt bewerten",
    later: "Später",

    // Toasts
    review_saved: "Bewertung gespeichert",
    driver_assigned: "Fahrer zugewiesen",
    error_saving: "Fehler beim Speichern",
    error_enter_grafts: "Bitte Graft-Anzahl eingeben",
    error_enter_price: "Bitte Preis eingeben",
    error_enter_driver: "Bitte Fahrer-Name eingeben",
    photo_request_sent: "Foto-Anfrage gesendet",

    // DoctorReviewMode — Rejection Reasons
    reject_insufficient_donor: "Spenderbereich unzureichend",
    reject_medical_contraindication: "Medizinische Kontraindikation",
    reject_too_young: "Patient zu jung",
    reject_unrealistic_expectations: "Unrealistische Erwartungen",
    reject_other: "Anderer Grund",

    // DoctorReviewMode — Labels
    doctor_review: "Arzt-Review",
    age_label: "Alter",
    years_unit: "Jahre",
    norwood_label: "Norwood",
    area_label: "Bereich",
    pre_conditions: "Vorerkrankungen",
    allergies_label: "Allergien",
    recommended_price: "Empfohlener Preis",
    grafts_label_ui: "Grafts",
    price_eur_label: "Preis (\u20AC)",
    notes_label: "Notizen",
    medical_notes_placeholder: "Medizinische Anmerkungen, Technik-Empfehlung...",
    no_photos_available: "Keine Fotos vorhanden",
    approve_btn: "Genehmigen",
    reject_btn: "Ablehnen",
    more_photos_btn: "Mehr Fotos",
    ai_recommendation: "KI-Empfehlung",
    nav_navigate: "Navigieren",
    close_label: "Schlie\u00DFen",
    blood_thinners: "Blutverd\u00FCnner",
    personal_consultation_needed: "Pers\u00F6nliche Konsultation n\u00F6tig",

    // DoctorTasksView — Labels
    doctor_portal_title: "Arzt-Portal",
    loading_tasks: "Lade Aufgaben...",
    notes_optional: "Notizen (optional)",
    driver_name_required: "Fahrer Name *",
    driver_phone_label: "Fahrer Telefon",
    saving_label: "Wird gespeichert...",
    graft_count_required: "Graft-Anzahl *",
    price_eur_required: "Preis (EUR) *",
    internal_notes_optional: "Interne Notizen (optional)",
    notes_stay_internal: "Notizen bleiben intern \u2014 nur Grafts, Methode und Preis werden per WhatsApp an den Patienten gesendet.",
    percent_of_price: "% vom Preis",
    review_panel_notes_placeholder: "Medizinische Anmerkungen, Besonderheiten, Empfehlungen...",
    photo_request_placeholder: "z.B. Bitte sende ein Foto der Spenderregion bei Tageslicht...",
    reject_reason_placeholder: "Bitte gib den Grund f\u00FCr die Ablehnung an...",

    // Language
    lang_de: "Deutsch",
    lang_en: "English",
    lang_tr: "T\u00FCrk\u00E7e",
    no_reviewed_cases: "Noch keine bewerteten Fälle",
    reviewed_cases_hint: "Abgeschlossene Bewertungen erscheinen hier.",
    case_skipped: "Fall übersprungen — bleibt für andere Ärzte offen",
    demo_blocked: "Im Demo-Modus nicht möglich",
    session_expired: "Sitzung abgelaufen — bitte neu einloggen",
    skipped_cases_show: "übersprungene — wieder anzeigen",
  },

  en: {
    // Header/Navigation
    portal_title: "Doctor Portal",
    flowmatix: "Flowmatix",
    logout: "Log out",
    help: "Help",
    open_count: "open",
    completed_count: "completed",

    // Tabs
    tab_pending: "Pending",
    tab_completed: "Completed",
    tab_calendar: "Calendar",
    tab_stats: "Statistics",

    // Task Types
    task_graft: "Graft Assessment",
    task_medical: "Medical Assessment",
    task_pickup: "Airport Pickup",

    // Status
    status_pending: "Pending",
    status_in_progress: "In Progress",
    status_completed: "Completed",
    status_canceled: "Canceled",

    tab_open: "Open",
    tab_reviewed: "Reviewed",
    // Empty States
    all_done: "All done!",
    no_pending: "No pending assessments. New tasks will appear here automatically.",
    no_completed: "No completed tasks yet.",
    no_appointments: "No appointments",
    empty_open_title: "No open reviews",
    empty_open_desc: "New patients will appear here automatically once photos have been submitted. The system creates new cases in the background.",
    empty_reviewed_title: "No reviewed cases yet",
    empty_reviewed_desc: "Completed reviews will appear here automatically.",
    waiting_since: "Waiting for",
    new_since: "New since",
    doctor_portal_title: "Doctor Portal",
    review_queue_desc: "Medical reviews and decisions",

    // Patient Data
    patient_data: "Patient Data",
    treatment: "Treatment",
    concern: "Area of Concern",
    hair_loss_since: "Hair loss since",
    previous_treatments: "Previous Treatments",
    medications: "Medications",
    patient_photos: "Patient Photos",

    // Flight/Pickup
    flight_data: "Flight Data",
    airline: "Airline",
    flight: "Flight",
    from: "From",
    to: "To",
    arrival: "Arrival",
    time: "Time",
    driver_name: "Driver Name",
    driver_phone: "Driver Phone",
    vehicle: "Vehicle / License Plate",
    assign_driver: "Assign Driver",

    // Review Form
    graft_count: "Graft Count",
    price_eur: "Price (EUR)",
    technique: "Technique",
    internal_notes: "Internal Notes (optional)",
    notes_hint: "Notes for the team (will NOT be sent to the patient).",
    notes_privacy: "Notes remain internal \u2014 only grafts, method, and price are sent to the patient via WhatsApp.",
    submit_review: "Submit Review",
    saving: "Saving...",
    review_btn: "Review",

    // Review Panel
    medical_assessment: "Medical Assessment",
    graft_slider_label: "Graft Count",
    technique_recommendation: "Technique Recommendation",
    donor_quality: "Donor Area Quality",
    treatment_zones: "Treatment Zones",
    duration_estimate: "Estimated Duration (hrs)",
    price_estimate: "Price Estimate",
    doctor_notes: "Doctor Notes",
    decision: "Decision",
    approve: "Approve",
    request_more_photos: "Request More Photos",
    reject: "Reject",
    reject_reason: "Rejection Reason",
    confirm_reject: "Confirm Rejection",
    cancel: "Cancel",
    msg_to_patient: "Message to Patient",
    request_photos: "Request Photos",
    previous_reviews: "Previous Reviews",
    approved: "Approved",
    rejected: "Rejected",
    photos_requested: "Photos Requested",

    // Donor Quality Options
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    poor: "Poor",

    // Treatment Zones
    zone_front: "Frontal / Hairline",
    zone_crown: "Crown / Top",
    zone_temples: "Temples",
    zone_vertex: "Vertex",

    // Photo Labels
    photo_front: "Front",
    photo_top: "Top",
    photo_left: "Left",
    photo_right: "Right",
    photo_donor: "Donor Area",
    no_photo: "No Photo",

    // Techniques
    fue: "FUE",
    fue_sapphire: "FUE Sapphire",
    dhi: "DHI",
    fue_dhi: "FUE + DHI Combo",
    prp: "PRP",
    beard: "Beard Transplant",
    eyebrow: "Eyebrow Transplant",

    // Deposit
    request_deposit: "Request Deposit",
    deposit_stripe: "Stripe link will be sent with the treatment plan",
    deposit_custom: "Payment link will be included",
    deposit_bank: "Bank details will be included",
    deposit_amount: "Deposit (EUR)",
    appointment_first: "Appointment first, then deposit",
    deposit_after_booking: "The deposit will be requested automatically after booking.",

    // Calendar
    today: "Today",
    this_week: "This Week",
    this_month: "This Month",
    no_appointments_today: "No appointments today",
    appointments: "Appointments",
    hours: "Hours",
    surgery: "Surgery",
    consultation: "Consultation",

    // Stats
    total_reviews: "Total Reviews",
    avg_grafts: "Avg. Grafts",
    avg_price: "Avg. Price",
    reviews_this_week: "This Week",
    reviews_this_month: "This Month",
    approval_rate: "Approval Rate",

    // Priority
    urgent: "Urgent",
    waiting_long: "Waiting long",
    normal: "Normal",
    waiting_since: "Waiting since",

    // Onboarding
    onboarding_title: "How the Doctor Portal works",
    onboarding_line1: "New patients are automatically assigned once photos are submitted.",
    onboarding_line2: "You see the photos, enter graft count, price and technique — done.",
    onboarding_line3: "Please review open cases promptly so the patient can be processed quickly.",
    onboarding_line4: "Everything else — appointments, messages, payments — runs automatically in the background.",

    // Alert
    new_case_alert: "New patient for review",
    review_now: "Review now",
    later: "Later",

    // Toasts
    review_saved: "Review saved",
    driver_assigned: "Driver assigned",
    error_saving: "Error saving",
    error_enter_grafts: "Please enter graft count",
    error_enter_price: "Please enter price",
    error_enter_driver: "Please enter driver name",
    photo_request_sent: "Photo request sent",

    // DoctorReviewMode — Rejection Reasons
    reject_insufficient_donor: "Insufficient donor area",
    reject_medical_contraindication: "Medical contraindication",
    reject_too_young: "Patient too young",
    reject_unrealistic_expectations: "Unrealistic expectations",
    reject_other: "Other reason",

    // DoctorReviewMode — Labels
    doctor_review: "Doctor Review",
    age_label: "Age",
    years_unit: "Years",
    norwood_label: "Norwood",
    area_label: "Area",
    pre_conditions: "Pre-existing conditions",
    allergies_label: "Allergies",
    recommended_price: "Recommended Price",
    grafts_label_ui: "Grafts",
    price_eur_label: "Price (\u20AC)",
    notes_label: "Notes",
    medical_notes_placeholder: "Medical notes, technique recommendation...",
    no_photos_available: "No photos available",
    approve_btn: "Approve",
    reject_btn: "Reject",
    more_photos_btn: "More Photos",
    ai_recommendation: "AI Recommendation",
    nav_navigate: "Navigate",
    close_label: "Close",
    blood_thinners: "Blood thinners",
    personal_consultation_needed: "Personal consultation needed",

    // DoctorTasksView — Labels
    doctor_portal_title: "Doctor Portal",
    loading_tasks: "Loading tasks...",
    notes_optional: "Notes (optional)",
    driver_name_required: "Driver Name *",
    driver_phone_label: "Driver Phone",
    saving_label: "Saving...",
    graft_count_required: "Graft Count *",
    price_eur_required: "Price (EUR) *",
    internal_notes_optional: "Internal Notes (optional)",
    notes_stay_internal: "Notes remain internal \u2014 only grafts, method, and price are sent to the patient via WhatsApp.",
    percent_of_price: "% of price",
    review_panel_notes_placeholder: "Medical notes, observations, recommendations...",
    photo_request_placeholder: "e.g. Please send a photo of the donor area in daylight...",
    reject_reason_placeholder: "Please provide the reason for rejection...",

    // Language
    lang_de: "Deutsch",
    lang_en: "English",
    lang_tr: "T\u00FCrk\u00E7e",
    no_reviewed_cases: "No reviewed cases yet",
    reviewed_cases_hint: "Completed reviews will appear here.",
    case_skipped: "Case skipped — remains open for other doctors",
    demo_blocked: "Not available in demo mode",
    session_expired: "Session expired — please log in again",
    skipped_cases_show: "skipped — show again",
  },

  tr: {
    // Header/Navigation
    portal_title: "Doktor Portal\u0131",
    flowmatix: "Flowmatix",
    logout: "\u00C7\u0131k\u0131\u015F Yap",
    help: "Yard\u0131m",
    open_count: "a\u00E7\u0131k",
    completed_count: "tamamland\u0131",

    // Tabs
    tab_pending: "Bekleyen",
    tab_completed: "Tamamlanan",
    tab_calendar: "Takvim",
    tab_stats: "\u0130statistik",

    // Task Types
    task_graft: "Greft De\u011Ferlendirmesi",
    task_medical: "T\u0131bbi De\u011Ferlendirme",
    task_pickup: "Havaliman\u0131 Transferi",

    // Status
    status_pending: "Bekliyor",
    status_in_progress: "\u0130\u015Flemde",
    status_completed: "Tamamland\u0131",
    status_canceled: "\u0130ptal Edildi",

    tab_open: "A\u00E7\u0131k",
    tab_reviewed: "De\u011Ferlendirildi",
    // Empty States
    all_done: "Hepsi tamamland\u0131!",
    no_pending: "Bekleyen de\u011Ferlendirme yok. Yeni g\u00F6revler otomatik olarak burada g\u00F6r\u00FCnecektir.",
    no_completed: "Hen\u00FCz tamamlanm\u0131\u015F g\u00F6rev yok.",
    no_appointments: "Randevu yok",
    empty_open_title: "A\u00E7\u0131k de\u011Ferlendirme yok",
    empty_open_desc: "Yeni hastalar foto\u011Fraflar g\u00F6nderildi\u011Finde otomatik olarak burada g\u00F6r\u00FCnecektir.",
    empty_reviewed_title: "Hen\u00FCz de\u011Ferlendirilmi\u015F vaka yok",
    empty_reviewed_desc: "Tamamlanan de\u011Ferlendirmeler otomatik olarak burada g\u00F6r\u00FCnecektir.",
    waiting_since: "Bekliyor",
    new_since: "Yeni",
    doctor_portal_title: "Doktor Portal\u0131",
    review_queue_desc: "T\u0131bbi de\u011Ferlendirmeler ve kararlar",

    // Patient Data
    patient_data: "Hasta Bilgileri",
    treatment: "Tedavi",
    concern: "B\u00F6lge",
    hair_loss_since: "Sa\u00E7 d\u00F6k\u00FClmesi ba\u015Flang\u0131c\u0131",
    previous_treatments: "\u00D6nceki Tedaviler",
    medications: "\u0130la\u00E7lar",
    patient_photos: "Hasta Foto\u011Fraflar\u0131",

    // Flight/Pickup
    flight_data: "U\u00E7u\u015F Bilgileri",
    airline: "Havayolu",
    flight: "U\u00E7u\u015F",
    from: "Kalk\u0131\u015F",
    to: "Var\u0131\u015F",
    arrival: "Var\u0131\u015F",
    time: "Saat",
    driver_name: "\u015Eof\u00F6r Ad\u0131",
    driver_phone: "\u015Eof\u00F6r Telefonu",
    vehicle: "Ara\u00E7 / Plaka",
    assign_driver: "\u015Eof\u00F6r Ata",

    // Review Form
    graft_count: "Greft Say\u0131s\u0131",
    price_eur: "Fiyat (EUR)",
    technique: "Teknik",
    internal_notes: "Dahili Notlar (iste\u011Fe ba\u011Fl\u0131)",
    notes_hint: "Ekip i\u00E7in notlar (hastaya G\u00D6NDER\u0130LMEZ).",
    notes_privacy: "Notlar dahili kal\u0131r \u2014 yaln\u0131zca greft say\u0131s\u0131, y\u00F6ntem ve fiyat WhatsApp ile hastaya g\u00F6nderilir.",
    submit_review: "De\u011Ferlendirmeyi G\u00F6nder",
    saving: "Kaydediliyor...",
    review_btn: "De\u011Ferlendir",

    // Review Panel
    medical_assessment: "T\u0131bbi De\u011Ferlendirme",
    graft_slider_label: "Greft Say\u0131s\u0131",
    technique_recommendation: "Teknik \u00D6nerisi",
    donor_quality: "Don\u00F6r B\u00F6lgesi Kalitesi",
    treatment_zones: "Tedavi B\u00F6lgeleri",
    duration_estimate: "Tahmini S\u00FCre (saat)",
    price_estimate: "Fiyat Tahmini",
    doctor_notes: "Doktor Notlar\u0131",
    decision: "Karar",
    approve: "Onayla",
    request_more_photos: "Daha Fazla Foto\u011Fraf \u0130ste",
    reject: "Reddet",
    reject_reason: "Red Gerek\u00E7esi",
    confirm_reject: "Reddi Onayla",
    cancel: "\u0130ptal",
    msg_to_patient: "Hastaya Mesaj",
    request_photos: "Foto\u011Fraf \u0130ste",
    previous_reviews: "\u00D6nceki De\u011Ferlendirmeler",
    approved: "Onayland\u0131",
    rejected: "Reddedildi",
    photos_requested: "Foto\u011Fraf \u0130stendi",

    // Donor Quality Options
    excellent: "M\u00FCkemmel",
    good: "\u0130yi",
    fair: "Yeterli",
    poor: "Zay\u0131f",

    // Treatment Zones
    zone_front: "Sa\u00E7 \u00C7izgisi / \u00D6n B\u00F6lge",
    zone_crown: "Tepe B\u00F6lgesi",
    zone_temples: "\u015Eakak B\u00F6lgesi",
    zone_vertex: "Verteks",

    // Photo Labels
    photo_front: "\u00D6n",
    photo_top: "\u00DCst",
    photo_left: "Sol",
    photo_right: "Sa\u011F",
    photo_donor: "Don\u00F6r B\u00F6lgesi",
    no_photo: "Foto\u011Fraf Yok",

    // Techniques
    fue: "FUE",
    fue_sapphire: "FUE Safir",
    dhi: "DHI",
    fue_dhi: "FUE + DHI Kombinasyon",
    prp: "PRP",
    beard: "Sakal Ekimi",
    eyebrow: "Ka\u015F Ekimi",

    // Deposit
    request_deposit: "Kapora Talep Et",
    deposit_stripe: "Stripe linki tedavi plan\u0131 ile g\u00F6nderilecek",
    deposit_custom: "\u00D6deme linki eklenecek",
    deposit_bank: "Banka bilgileri eklenecek",
    deposit_amount: "Kapora (EUR)",
    appointment_first: "\u00D6nce randevu, sonra kapora",
    deposit_after_booking: "Kapora, randevu sonras\u0131 otomatik olarak talep edilecektir.",

    // Calendar
    today: "Bug\u00FCn",
    this_week: "Bu Hafta",
    this_month: "Bu Ay",
    no_appointments_today: "Bug\u00FCn randevu yok",
    appointments: "Randevular",
    hours: "Saat",
    surgery: "Operasyon",
    consultation: "Konsultasyon",

    // Stats
    total_reviews: "Toplam De\u011Ferlendirme",
    avg_grafts: "Ort. Greft",
    avg_price: "Ort. Fiyat",
    reviews_this_week: "Bu Hafta",
    reviews_this_month: "Bu Ay",
    approval_rate: "Onay Oran\u0131",

    // Priority
    urgent: "Acil",
    waiting_long: "Uzun s\u00FCredir bekliyor",
    normal: "Normal",
    waiting_since: "Bekleme s\u00FCresi",

    // Onboarding
    onboarding_title: "Doktor Portal\u0131 nas\u0131l \u00E7al\u0131\u015F\u0131r",
    onboarding_line1: "Yeni hastalar foto\u011Fraflar g\u00F6nderildi\u011Finde otomatik olarak atan\u0131r.",
    onboarding_line2: "Foto\u011Fraflar\u0131 g\u00F6r\u00FCn, greft say\u0131s\u0131, fiyat ve teknik girin — bitti.",
    onboarding_line3: "L\u00FCtfen a\u00E7\u0131k vakalar\u0131 h\u0131zl\u0131ca de\u011Ferlendirin, b\u00F6ylece hasta h\u0131zl\u0131 i\u015Flenebilir.",
    onboarding_line4: "Geri kalan her \u015Fey — randevular, mesajlar, \u00F6demeler — arka planda otomatik \u00E7al\u0131\u015F\u0131r.",

    // Alert
    new_case_alert: "De\u011Ferlendirme i\u00E7in yeni hasta",
    review_now: "\u015Eimdi de\u011Ferlendir",
    later: "Sonra",

    // Toasts
    review_saved: "De\u011Ferlendirme kaydedildi",
    driver_assigned: "\u015Eof\u00F6r atand\u0131",
    error_saving: "Kaydetme hatas\u0131",
    error_enter_grafts: "L\u00FCtfen greft say\u0131s\u0131n\u0131 girin",
    error_enter_price: "L\u00FCtfen fiyat girin",
    error_enter_driver: "L\u00FCtfen \u015Fof\u00F6r ad\u0131n\u0131 girin",
    photo_request_sent: "Foto\u011Fraf talebi g\u00F6nderildi",

    // DoctorReviewMode — Rejection Reasons
    reject_insufficient_donor: "Don\u00F6r b\u00F6lgesi yetersiz",
    reject_medical_contraindication: "T\u0131bbi kontrendikasyon",
    reject_too_young: "Hasta \u00E7ok gen\u00E7",
    reject_unrealistic_expectations: "Ger\u00E7ek\u00E7i olmayan beklentiler",
    reject_other: "Di\u011Fer neden",

    // DoctorReviewMode — Labels
    doctor_review: "Doktor De\u011Ferlendirmesi",
    age_label: "Ya\u015F",
    years_unit: "Ya\u015F",
    norwood_label: "Norwood",
    area_label: "B\u00F6lge",
    pre_conditions: "Mevcut hastal\u0131klar",
    allergies_label: "Alerjiler",
    recommended_price: "\u00D6nerilen Fiyat",
    grafts_label_ui: "Greft",
    price_eur_label: "Fiyat (\u20AC)",
    notes_label: "Notlar",
    medical_notes_placeholder: "T\u0131bbi notlar, teknik \u00F6nerisi...",
    no_photos_available: "Foto\u011Fraf yok",
    approve_btn: "Onayla",
    reject_btn: "Reddet",
    more_photos_btn: "Daha Fazla Foto\u011Fraf",
    ai_recommendation: "Yapay Zeka \u00D6nerisi",
    nav_navigate: "Gezin",
    close_label: "Kapat",
    blood_thinners: "Kan suland\u0131r\u0131c\u0131lar",
    personal_consultation_needed: "Ki\u015Fisel konsultasyon gerekli",

    // DoctorTasksView — Labels
    doctor_portal_title: "Doktor Portal\u0131",
    loading_tasks: "G\u00F6revler y\u00FCkleniyor...",
    notes_optional: "Notlar (iste\u011Fe ba\u011Fl\u0131)",
    driver_name_required: "\u015Eof\u00F6r Ad\u0131 *",
    driver_phone_label: "\u015Eof\u00F6r Telefonu",
    saving_label: "Kaydediliyor...",
    graft_count_required: "Greft Say\u0131s\u0131 *",
    price_eur_required: "Fiyat (EUR) *",
    internal_notes_optional: "Dahili Notlar (iste\u011Fe ba\u011Fl\u0131)",
    notes_stay_internal: "Notlar dahili kal\u0131r \u2014 yaln\u0131zca greft say\u0131s\u0131, y\u00F6ntem ve fiyat WhatsApp ile hastaya g\u00F6nderilir.",
    percent_of_price: "% fiyattan",
    review_panel_notes_placeholder: "T\u0131bbi notlar, \u00F6zellikler, \u00F6neriler...",
    photo_request_placeholder: "\u00D6rn: L\u00FCtfen don\u00F6r b\u00F6lgesinin g\u00FCn \u0131\u015F\u0131\u011F\u0131nda foto\u011Fraf\u0131n\u0131 g\u00F6nderin...",
    reject_reason_placeholder: "L\u00FCtfen red nedenini belirtin...",

    // Language
    lang_de: "Deutsch",
    lang_en: "English",
    lang_tr: "T\u00FCrk\u00E7e",
    no_reviewed_cases: "Henüz değerlendirilmiş vaka yok",
    reviewed_cases_hint: "Tamamlanan değerlendirmeler burada görünecektir.",
    case_skipped: "Vaka atlandı — diğer doktorlar için açık kalır",
    demo_blocked: "Demo modunda kullanılamaz",
    session_expired: "Oturum süresi doldu — lütfen tekrar giriş yapın",
    skipped_cases_show: "atlanan — tekrar göster",
  },
};

export function dt(lang, key) {
  return doctorI18n[lang]?.[key] || doctorI18n.en?.[key] || key;
}

export default doctorI18n;
