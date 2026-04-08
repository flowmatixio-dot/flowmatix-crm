import { useState, useEffect, useRef } from "react";

/**
 * AVV/DPA Generator Modal — Option C
 *
 * Loads the locale-specific HTML template + CSS from /legal/templates/,
 * fills in the clinic name, address and representative, opens a print
 * window and calls window.print() so the user can save it as PDF
 * directly from the browser ("Save as PDF" in the print dialog).
 *
 * No backend needed — everything happens client-side. The static PDFs
 * in /legal/*.pdf remain as fallback for users who don't fill the form.
 *
 * Form fields:
 *   - clinicName        (required)
 *   - addressLine       (street + number, required)
 *   - postalCode        (required)
 *   - city              (required)
 *   - country           (required, default DE)
 *   - representative    (required, person responsible)
 *
 * The values are also persisted to localStorage so the form is
 * pre-filled the next time the user generates a DPA.
 */
export default function DpaGeneratorModal({ open, onClose, lang = "de", initialClinicName = "" }) {
  const [form, setForm] = useState({
    clinicName: "",
    addressLine: "",
    postalCode: "",
    city: "",
    country: "Deutschland",
    representative: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstInputRef = useRef(null);

  const TR = (de, en, tr) => ({ de, en, tr }[lang] || de);

  // Pre-fill from localStorage + initial clinic name on open
  useEffect(() => {
    if (!open) return;
    try {
      const saved = JSON.parse(localStorage.getItem("fm_dpa_clinic_data") || "{}");
      setForm((prev) => ({
        ...prev,
        ...saved,
        clinicName: saved.clinicName || initialClinicName || "",
      }));
    } catch {
      setForm((prev) => ({ ...prev, clinicName: initialClinicName || "" }));
    }
    setError("");
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [open, initialClinicName]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const isValid =
    form.clinicName.trim().length >= 2 &&
    form.addressLine.trim().length >= 3 &&
    form.postalCode.trim().length >= 3 &&
    form.city.trim().length >= 2 &&
    form.country.trim().length >= 2 &&
    form.representative.trim().length >= 2;

  const handleGenerate = async () => {
    if (!isValid || busy) return;
    setBusy(true);
    setError("");
    try {
      // Persist for next time
      try { localStorage.setItem("fm_dpa_clinic_data", JSON.stringify(form)); } catch {}

      // Pick template based on lang (TR has its own DPA, fall back to EN)
      const templateFile = lang === "tr" ? "avv-tr.html" : lang === "en" ? "avv-en.html" : "avv-de.html";
      const [htmlRes, cssRes] = await Promise.all([
        fetch(`/legal/templates/${templateFile}`, { cache: "no-store" }),
        fetch(`/legal/templates/legal.css`, { cache: "no-store" }),
      ]);
      if (!htmlRes.ok || !cssRes.ok) throw new Error("template_load_failed");
      const htmlRaw = await htmlRes.text();
      const css = await cssRes.text();

      // Build the address block as HTML (preserve line breaks)
      const escapeHtml = (s) =>
        String(s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const addressHtml = `${escapeHtml(form.addressLine)}<br>${escapeHtml(form.postalCode)} ${escapeHtml(form.city)}, ${escapeHtml(form.country)}`;

      // Replace placeholders
      const filled = htmlRaw
        .replace(/\{\{CLINIC_NAME\}\}/g, escapeHtml(form.clinicName))
        .replace(/\{\{CLINIC_ADDRESS\}\}/g, addressHtml)
        .replace(/\{\{CLINIC_REPRESENTATIVE\}\}/g, escapeHtml(form.representative))
        // Inline the CSS so the print window doesn't need to fetch it
        .replace(/<link\s+rel="stylesheet"\s+href="legal\.css"\s*\/?>/, `<style>${css}</style>`);

      // Render into a hidden iframe instead of a popup window. This avoids
      // the broken on-screen layout (the user previously saw a 900px-wide
      // window with the right side cut off because tables overflowed) and
      // also bypasses popup blockers entirely. The iframe is sized to the
      // page so the print preview matches the final A4 layout exactly.
      const existing = document.getElementById("fm-dpa-print-frame");
      if (existing) existing.remove();
      const iframe = document.createElement("iframe");
      iframe.id = "fm-dpa-print-frame";
      iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
      document.body.appendChild(iframe);

      const idoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!idoc) throw new Error("iframe_doc_unavailable");
      idoc.open();
      idoc.write(filled);
      idoc.close();

      // Wait for the iframe document to fully render (fonts, layout) then
      // trigger the print dialog. The browser will use the @page rules
      // from the inlined CSS to render A4.
      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          setError(TR("Druck fehlgeschlagen. Versuchen Sie es erneut.", "Print failed. Please try again.", "Yazdırma başarısız oldu. Lütfen tekrar deneyin."));
        }
        // Cleanup the iframe a few seconds after the print dialog opens.
        // We can't reliably detect dialog close, so we just remove it
        // after a delay long enough for the user to interact with it.
        setTimeout(() => { try { iframe.remove(); } catch {} }, 60000);
      };

      if (iframe.contentDocument?.readyState === "complete") {
        setTimeout(triggerPrint, 300);
      } else {
        iframe.addEventListener("load", () => setTimeout(triggerPrint, 300));
      }

      setBusy(false);
      onClose?.();
    } catch (e) {
      setError(e.message || TR("Fehler beim Erstellen", "Generation failed", "Oluşturma hatası"));
      setBusy(false);
    }
  };

  const inp = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff",
    fontFamily: "inherit",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };
  const label = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(167,177,195,0.85)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 5,
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 11000,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#131c2e",
          border: "1px solid rgba(76,201,255,0.2)",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(76,201,255,0.12)", border: "1px solid rgba(76,201,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📄</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>
            {TR("AVV mit Klinik-Daten erstellen", "Generate DPA with clinic data", "Klinik verileriyle DPA oluştur")}
          </h2>
        </div>
        <p style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", lineHeight: 1.5, margin: "8px 0 18px" }}>
          {TR(
            'Tragen Sie Ihre Klinik-Daten ein. Wir füllen die Vorlage aus und öffnen den Druck-Dialog. Wählen Sie dort „Als PDF speichern".',
            "Enter your clinic data. We'll fill the template and open the print dialog — choose 'Save as PDF' there.",
            "Klinik verilerinizi girin. Şablonu dolduracağız ve yazdırma iletişim kutusunu açacağız — orada 'PDF olarak kaydet' seçin."
          )}
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={label}>{TR("Klinik-Name *", "Clinic name *", "Klinik adı *")}</label>
            <input ref={firstInputRef} style={inp} value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} placeholder={TR("Beispielklinik GmbH", "Example Clinic Ltd.", "Örnek Klinik Ltd.")} />
          </div>
          <div>
            <label style={label}>{TR("Straße + Hausnummer *", "Street + number *", "Cadde + numara *")}</label>
            <input style={inp} value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} placeholder={TR("Musterstraße 12", "Example Street 12", "Örnek Sokak 12")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 10 }}>
            <div>
              <label style={label}>{TR("PLZ *", "Postcode *", "Posta kodu *")}</label>
              <input style={inp} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="12345" />
            </div>
            <div>
              <label style={label}>{TR("Stadt *", "City *", "Şehir *")}</label>
              <input style={inp} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={TR("Berlin", "Berlin", "İstanbul")} />
            </div>
          </div>
          <div>
            <label style={label}>{TR("Land *", "Country *", "Ülke *")}</label>
            <input style={inp} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div>
            <label style={label}>{TR("Vertreten durch (Name) *", "Represented by (name) *", "Temsilci (isim) *")}</label>
            <input style={inp} value={form.representative} onChange={(e) => setForm({ ...form, representative: e.target.value })} placeholder={TR("Dr. Max Mustermann", "Dr. Jane Doe", "Dr. Ahmet Yılmaz")} />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <button
            onClick={() => !busy && onClose?.()}
            disabled={busy}
            style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(167,177,195,0.85)", fontWeight: 700, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {TR("Abbrechen", "Cancel", "İptal")}
          </button>
          <button
            onClick={handleGenerate}
            disabled={!isValid || busy}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              background: isValid && !busy ? "linear-gradient(135deg,rgba(76,201,255,.18),rgba(45,168,255,.12))" : "rgba(255,255,255,0.04)",
              border: `1px solid ${isValid && !busy ? "rgba(76,201,255,.3)" : "rgba(255,255,255,0.08)"}`,
              color: isValid && !busy ? "#4cc9ff" : "rgba(167,177,195,0.5)",
              fontWeight: 800,
              fontSize: 13,
              cursor: isValid && !busy ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            {busy ? "…" : TR("PDF generieren", "Generate PDF", "PDF oluştur")}
          </button>
        </div>
      </div>
    </div>
  );
}
