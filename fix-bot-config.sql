-- ═══ FLOWMATIX BOT CONFIG FIX ═══
-- Fixes all empty/junk config fields

UPDATE clinic_agent_config SET
  offered_treatments = '{}',
  custom_treatments = NULL,
  clinic_location = 'Istanbul, Turkey',
  travel_package = '{"hotel": true, "airport_pickup": true, "days_stay": "3-5 days", "includes": "Hotel, VIP airport transfer, medication kit, follow-up consultation"}',
  faq_entries = '[{"q":"How much does it cost?","a":"Pricing depends on the number of grafts needed. After reviewing your photos, our medical team will provide a personalized quote."},{"q":"Is the consultation free?","a":"Yes, the initial consultation and photo evaluation are completely free."},{"q":"How long is recovery?","a":"Most patients can return to normal activities within 3-5 days. Full results are visible after 12-18 months."},{"q":"Does it hurt?","a":"The procedure is performed under local anesthesia. You will feel minimal discomfort."},{"q":"FUE vs DHI?","a":"Both are excellent methods. Our doctor will recommend the best option for your case after reviewing your photos."},{"q":"How many grafts do I need?","a":"This depends on your hair loss pattern and donor area. Our team will determine the exact number after reviewing your photos."},{"q":"Am I a good candidate?","a":"Most people with stable hair loss and sufficient donor area are good candidates. Send us your photos for evaluation."},{"q":"Where is the clinic?","a":"Our clinic is located in Istanbul, Turkey. We welcome international patients and provide hotel and airport transfer."}]',
  greeting_template = 'Welcome to Hair of Sunshine! I am your personal patient coordinator and will guide you through the entire process.',
  welcome_message = NULL,
  out_of_hours_reply = 'Thank you for your message! Our team is currently outside working hours. We will get back to you first thing in the morning.',
  fallback_message = 'Let me connect you with our specialist team who can assist you further.',
  photo_instructions = 'Please send us 3 clear photos in good lighting: 1) Front view of hairline, 2) Top view of head, 3) Back/donor area.',
  handoff_text = 'I am connecting you with our specialist team now. A team member will be with you shortly.',
  consent_text = 'To provide you with the best consultation, we need your consent to process your health data per GDPR Article 9. Your data is stored securely and used exclusively for treatment planning. Do you agree?',
  analysis_response_text = 'Our medical team has reviewed your photos and prepared your personalized treatment plan.',
  emoji_level = 2
WHERE organization_id = '992e539b-951e-4125-b75e-919456a8a2a8';
