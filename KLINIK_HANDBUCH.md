# FLOWMATIX — Komplettes Klinik-Handbuch

> Dieses Handbuch richtet sich an Kliniken, die das Flowmatix CRM nutzen. Es beschreibt jede Funktion des Systems im Detail.

---

## 1. Erste Schritte

### 1.1 Login

Sie erreichen Ihr CRM unter **crm.flowmatix.io**. Melden Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an. Die Oberfläche ist in drei Sprachen verfügbar: **Deutsch**, **Englisch** und **Türkisch**. Die Sprache lässt sich jederzeit über das Zahnrad-Menü oben rechts umschalten.

### 1.2 Demo-Modus & Live-Modus

Nach dem ersten Login startet Ihr System im **Demo-Modus**. Dieser ist durch ein rotes **DEMO**-Badge oben rechts gekennzeichnet. Im Demo-Modus arbeiten Sie mit Beispieldaten, um das System risikofrei kennenzulernen. Jede Ansicht zeigt ein gelbes Banner mit einer kontextbezogenen Erklärung.

Wenn Sie bereit sind, echte Patienten zu empfangen, klicken Sie auf den **DEMO/LIVE**-Schalter oben rechts (nur für Admins sichtbar). Der Wechsel zu LIVE verbindet Ihr System mit echten WhatsApp-Nachrichten und aktiviert alle Automatisierungen.

### 1.3 Onboarding-Wizard

Beim ersten Login im Live-Modus öffnet sich automatisch der **Onboarding-Wizard**. Dieser führt Sie durch drei Schritte:

1. **Klinik-Daten** — Name, Adresse, Telefon, E-Mail
2. **WhatsApp** — Verbindung Ihres WhatsApp Business Accounts
3. **KI-Bot** — Grundkonfiguration des Bot-Tons und der Behandlungsarten

Sie können den Wizard überspringen und die Einstellungen später vervollständigen.

---

## 2. Dashboard

Das Dashboard ist Ihre Zentrale. Es zeigt den aktuellen Systemzustand auf einen Blick.

### 2.1 Begrüßung & Status-Banner

Oben sehen Sie eine tageszeit-abhängige Begrüßung und den Namen Ihrer Klinik. Das **Status-Banner** unterhalb zeigt einen von drei Zuständen:

- **Alles läuft automatisch** (grün, pulsierend) — Keine Aktion erforderlich. Alle Systeme arbeiten im Hintergrund.
- **X Aktionen erforderlich** (rot, pulsierend) — Es gibt Aufgaben, die manuelles Eingreifen erfordern: Gespräche zur Übernahme, Fahrer die abgelehnt haben, Patienten ohne Hotel.
- **X Punkte in Bearbeitung** (gelb) — Automatische Prozesse laufen, z.B. Flugtickets ausstehend oder Fahrer-Bestätigung wird abgewartet.

### 2.2 KPI-Kacheln

Vier Kennzahlen in einer Reihe:

| KPI | Beschreibung |
|-----|-------------|
| **Offene Leads** | Patienten in der Stufe "Neu" |
| **Buchungen heute** | Heute neu gebuchte Termine |
| **Aktive Chats** | Laufende WhatsApp-Konversationen |
| **Pipeline** | Gesamtwert aller gebuchten/abgeschlossenen Behandlungen in EUR |

### 2.3 Hintergrund-Prozesse

Ein Info-Balken zeigt laufende Hintergrund-Prozesse: Anzahl ärztlicher Bewertungen in Bearbeitung und Fahrer, die automatisch zugewiesen werden.

### 2.4 Automatisierungs-Status

Badges zeigen den Status aller Systeme: KI-Bot, Termine & Buchungen, Nachsorge & Bewertungen, Logistik, Google Drive, Kalender-Sync. Grüne pulsierende Punkte = aktiv, rote Punkte = nicht verbunden.

### 2.5 Tagesplan ("Heute")

Zwei Spalten zeigen:
- **Heute** — Alle heutigen Termine und Ankünfte (Flüge), chronologisch sortiert. Klick auf einen Eintrag öffnet das Patientenprofil.
- **Nächste OPs** — Die nächsten 5 anstehenden Operationen mit Datum, Patient, Behandlungsart, Grafts und zugewiesenem Arzt.

### 2.6 Transfers & Ankünfte

Karten zeigen Patienten mit bestätigten Flügen: Name, Flugdaten, Datum und Fahrer-Status (zugewiesen, ausstehend oder abgelehnt).

---

## 3. Posteingang (WhatsApp)

### 3.1 Konversationsliste

Links sehen Sie alle WhatsApp-Konversationen, filterbar nach:

- **Offen** — Aktive, unerledigte Gespräche
- **Aktion** — Gespräche, die manuelles Eingreifen erfordern (Human Takeover)
- **KI** — Gespräche, die der Bot aktuell bearbeitet
- **Erledigt** — Abgeschlossene Konversationen
- **Alle** — Alle Gespräche

Jede Konversation zeigt: Avatar, Name, letzte Nachricht, Zeitstempel und Status-Badges:
- **AI Aktiv** (blau) — Bot bearbeitet das Gespräch
- **Bewertung** (orange) — Wartet auf ärztliche Bewertung
- **Menschliche Übernahme** (rot) — Ein Mitarbeiter muss eingreifen
- **Anzahlung bezahlt** (grün) — Deposit bestätigt
- **Foto-Anzahl** (lila) — Anzahl empfangener Patientenfotos
- **Fahrer fehlt / Hotel fehlt / Flug fehlt** — Logistik-Badges

Zusätzlich wird ein **Lead Score** und eine **SLA-Warnung** angezeigt, wenn ein Patient zu lange wartet.

### 3.2 Chat-Bereich

Im mittleren Panel sehen Sie den vollständigen Chatverlauf. Nachrichten sind als Bubbles dargestellt:
- **Patient** (links, grau) — Eingehende Nachrichten
- **Bot** (rechts, blau) mit 🤖-Icon — Automatische Antworten
- **Mitarbeiter** (rechts, orange) mit 👤-Icon — Manuelle Antworten
- **System** (zentriert, orange) — Systemnachrichten

**Medien**: Fotos werden als Vorschaubild angezeigt und lassen sich durch Klick vergrößern. Zahlungskarten zeigen Betrag, Status und einen "Zahlung simulieren"-Button im Demo-Modus.

### 3.3 24-Stunden-Fenster

WhatsApp erlaubt kostenlose Antworten nur innerhalb von 24 Stunden nach der letzten Patientennachricht. Das System zeigt Warnungen:
- **Antwortfenster läuft ab** (gelb) — Weniger als 4 Stunden verbleibend
- **Antwortfenster abgelaufen** (rot) — Nur noch Template-Nachrichten möglich

### 3.4 Übernahme-Steuerung

Je nach Konversationsstatus sehen Sie unterschiedliche Steuerungselemente:

- **KI bearbeitet**: Banner mit "KI STOPPEN & ÜBERNEHMEN"-Button. Die Eingabeleiste ist gesperrt.
- **Menschliche Übernahme**: Banner "Du hast die Kontrolle" mit "KI fortsetzen"-Button. Sie können frei tippen.
- **Wartet auf Bewertung**: Banner mit "Bewertung öffnen"-Button. KI pausiert.
- **Geschlossen**: "Wieder öffnen"-Link

### 3.5 Auto-Übersetzung

Alle Nachrichten werden automatisch in Ihre gewählte Sprache übersetzt (einstellbar im Chat-Header: DE/EN/TR). Übersetzungen erscheinen kursiv unterhalb der Originalnachricht.

### 3.6 Vorlagen (Templates)

Über den Vorlagen-Button in der Eingabeleiste öffnen Sie den **Template-Picker**. Vorlagen sind nach Kategorien filterbar: Abrechnung, Intake, Buchung, Followup, Logistik. Vorlagen werden automatisch mit Patientendaten gefüllt (Name, Datum, Preis, Arzt, Zahlungslink).

### 3.7 Fallübersicht (rechtes Panel)

Das rechte Panel "Fallübersicht" zeigt alle Patientendaten auf einen Blick:
- **Patient**: Name, Alter, Land, Sprache
- **Medizinisch**: Anliegen, Grafts, Haarausfall-Typ, Vorbehandlungen, Medikamente, Allergien, med. Historie
- **Bewertung**: Status (ausstehend/abgeschlossen), Empfehlung, bewertender Arzt
- **Termin**: Arzt und Datum
- **Einwilligung**: DSGVO-Status
- **Buchung**: Behandlung, Kosten
- **Status**: Visueller Fortschrittsbalken (Neu → Kontaktiert → Gebucht → Abgeschlossen)

---

## 4. Pipeline

### 4.1 Kanban-Board

Die Pipeline zeigt alle Patienten in vier Spalten:

| Stufe | Farbe | Beschreibung |
|-------|-------|-------------|
| **Neue Anfrage** | Blau | Erstanfragen, KI sammelt Daten |
| **Arzt-Review** | Orange | Fotos vorhanden, wartet auf ärztliche Bewertung |
| **Gebucht** | Lila | Termin bestätigt, Vorbereitung läuft |
| **Abgeschlossen** | Grün | Behandlung durchgeführt |

### 4.2 Patientenkarten

Jede Karte zeigt: Name, Behandlungsart, Land, Lead Score und **Sub-Status-Punkte** für den Fortschritt:

- **Fotos** — Patientenfotos empfangen
- **Review** — Ärztliche Bewertung abgeschlossen
- **DSGVO** — Einwilligung erteilt
- **Deposit** — Anzahlung bezahlt
- **Flug** — Flugdaten bestätigt
- **Hotel** — Hotel gebucht
- **Fahrer** — Transfer zugewiesen

Farbcodierung: Grün = erledigt, Orange = in Bearbeitung, Rot = fehlt, Grau = offen.

### 4.3 Drag & Drop

Patienten können per Drag & Drop zwischen Stufen verschoben werden. Bei "Human Takeover"-Patienten blinkt der Status-Punkt rot/orange.

### 4.4 Stornierte Patienten

Unterhalb des Boards gibt es einen ausklappbaren Bereich für stornierte Patienten.

### 4.5 Tabs

Die Pipeline-Ansicht hat drei Tabs:
- **Aktiv** — Das Kanban-Board
- **Archiv** — Abgeschlossene und stornierte Fälle
- **Dateien** — Dateien-Übersicht

---

## 5. Patienten-Details

Durch Klick auf einen Patienten (in Pipeline, Inbox oder Dashboard) öffnet sich das **Patienten-Panel**. Es enthält:

- **Stammdaten**: Name, Telefon, Land, Sprache, Alter
- **Medizinische Daten**: Haarausfall-Typ, Anliegen, Vorbehandlungen, Allergien, Medikamente
- **Fotos**: Bis zu 6 Fotos (Vorne, Oben, Links, Rechts, Hinten, Extra) mit Lightbox-Funktion
- **Bewertungsergebnis**: Grafts, Preis, Technik, bewertender Arzt
- **Timeline**: Chronologischer Verlauf aller Ereignisse (Nachrichten, Fotos, Buchungen, Zahlungen, Systemereignisse)
- **Notizen**: Interne Notizen für das Team
- **Behandlungsplan**: Automatisch generiert nach ärztlicher Bewertung
- **Logistik**: Flugdaten, Fahrer, Hotel
- **Finanzen**: Anzahlung, Gesamtkosten, Zahlungsstatus

---

## 6. Arzt-Portal

### 6.1 Übersicht

Das Arzt-Portal ist die Hauptansicht für Ärzte. Es zeigt alle Patienten, die auf eine medizinische Bewertung warten.

### 6.2 Bewertungs-Queue

Offene Fälle werden als Karten angezeigt mit: Patientenname, Behandlungstyp, Land, Alter, Fotos und Wartezeit. Fälle sind nach **Dringlichkeit** farbcodiert:
- **Rot (Dringend)** — Wartet über 24 Stunden
- **Gelb (Normal)** — Wartet 6-24 Stunden
- **Blau (Geplant)** — Wartet weniger als 6 Stunden

### 6.3 Popup bei neuen Bewertungen

Wenn ein neuer Patient zur Bewertung eintrifft, erscheint ein **globaler Banner** am oberen Bildschirmrand — unabhängig davon, in welcher Ansicht sich der Arzt befindet. Der Banner zeigt den Patientennamen und bietet zwei Buttons: "Jetzt bewerten" und "Später". Das System prüft alle 15 Sekunden auf neue Aufgaben.

### 6.4 Bewertung durchführen

Für jeden Patienten gibt der Arzt ein:
- **Grafts** — Geschätzte Anzahl (Pflichtfeld)
- **Preis** — Behandlungskosten in EUR (Pflichtfeld)
- **Technik** — FUE, DHI, FUE Saphir (aus den konfigurierten Behandlungsarten)
- **Notizen** — Freitextfeld für medizinische Anmerkungen

### 6.5 Überspringen

Ein Arzt kann einen Fall **überspringen** — er bleibt dann für andere Ärzte sichtbar. Übersprungene Fälle können jederzeit wieder eingeblendet werden.

### 6.6 Was passiert nach der Bewertung

Nach dem Speichern übernimmt das System automatisch:
1. Der Behandlungsplan wird erstellt
2. Der Patient erhält den Plan per WhatsApp (mit Preis, Grafts, Technik)
3. Der Zahlungslink wird mitgesendet (wenn Deposit aktiviert)
4. Der Patient-Status wechselt zu "booking_pending"
5. Der Termin wird automatisch gebucht (basierend auf Kalender-Verfügbarkeit)

### 6.7 Review Board

Zusätzlich zum Arzt-Portal gibt es das **Review Board** — eine Übersichtsansicht aller offenen Bewertungen mit Sortierung (Wartezeit, Dringlichkeit, Neueste) und Filterung nach Behandlungstyp. Ärzte können Fälle "claimen" (5-Minuten-Sperre), um Doppelbewertungen zu vermeiden.

### 6.8 Tabs

Das Arzt-Portal hat zwei Tabs:
- **Offen** — Ausstehende Bewertungen mit Anzahl
- **Bewertet** — Abgeschlossene Bewertungen

---

## 7. Termine / Kalender

### 7.1 Ansichten

Der Kalender bietet vier Ansichten: **Monat**, **Woche**, **Tag** und **Raum-Planer** (Room Scheduler). Zwischen den Ansichten wechseln Sie über die Toolbar.

### 7.2 Termin-Farben

Termine sind nach Status farbcodiert:
- **Blau** — Gebucht
- **Grün** — Bestätigt / Abgeschlossen
- **Gelb** — Reserviert / Ausstehend
- **Rot** — Storniert / Nicht erschienen

Zusätzlich haben verschiedene Behandlungstypen eigene Farben (FUE = Blau, DHI = Lila, FUE Saphir = Türkis, Bart = Gelb, Augenbrauen = Pink, PRP = Grün).

### 7.3 Arzt-Filter

Über den **Arzt-Filter** können Sie Termine nach einzelnen Ärzten filtern. Jeder Arzt hat eine eigene Farbe.

### 7.4 Tage blockieren

Über den "Tage blockieren"-Button können Sie Feiertage oder Urlaubstage eintragen, an denen keine Buchungen möglich sind.

### 7.5 Termin-Drawer

Klick auf einen Termin öffnet ein Detail-Panel mit:
- Patientenname, Behandlung, Status
- Aktionen: Verschieben, Abschließen, Stornieren, Bestätigen
- Verschiebungsformular mit neuem Datum und neuer Uhrzeit
- Zugewiesener Arzt, Datum, Zeit, Quelle
- Notizen

### 7.6 Arzt-Einstellungen

Im Kalender können Sie pro Arzt konfigurieren: Arbeitszeiten, erlaubte Behandlungstypen, Operationsräume, Max OPs pro Tag, Max Grafts pro Tag.

### 7.7 Google Kalender Sync

Termine werden bidirektional mit Google Calendar synchronisiert. Ärzte können ihren eigenen Google Kalender verbinden.

---

## 8. OP-Planung

### 8.1 Übersicht

Die OP-Planung zeigt alle gebuchten Termine mit ihrem **Readiness Score** — dem Prozentsatz aller erledigten Vorbereitungsschritte.

### 8.2 Checkliste

Für jeden Termin gibt es eine dreiteilige Checkliste mit einklappbaren Sektionen:

**Medizinisch:**
- Anzahlung bezahlt
- Dokumente unterschrieben
- Bluttest vorhanden
- Medizinische Freigabe
- Fotos vollständig

**Logistik:**
- Flugdaten empfangen
- Fahrer zugewiesen
- Hotel gebucht
- Transfer bestätigt

**Einwilligungen:**
- DSGVO-Einwilligung (Consent Tracker)

### 8.3 Readiness Score

Der Fortschrittsbalken zeigt visuell den Anteil erledigter Punkte:
- 0-40%: Orange
- 41-80%: Gelb
- 81-100%: Grün

### 8.4 Erinnerungen senden

Für jeden offenen Punkt kann direkt eine **WhatsApp-Erinnerung** an den Patienten gesendet werden (z.B. "Bitte senden Sie Ihren Bluttest").

### 8.5 Upload-System

Dokumente können direkt in der OP-Planung hochgeladen werden. Bei verbundenem Google Drive werden sie automatisch synchronisiert und dem Patienten zugeordnet.

### 8.6 Countdown

Für jeden Termin wird die **Anzahl verbleibender Tage** angezeigt, um Dringlichkeit zu vermitteln.

---

## 9. Automatisierungen

Das System verfügt über **8 Automatisierungstypen**, organisiert in drei Gruppen:

### 9.1 Terminerinnerungen & Buchungen

| Automatisierung | Beschreibung | Konfiguration |
|----------------|-------------|---------------|
| **Buchungsbestätigung** (booking_confirm) | Patient erhält automatisch Buchungsbestätigung mit Termin, Adresse und Vorbereitungshinweisen | Automatisch bei Buchung |
| **Terminerinnerung** (appt_reminder) | Erinnerung vor dem Termin per WhatsApp | Konfigurierbar: 24h+2h, 48h+24h, nur 24h, oder 48h+24h+2h |
| **Deposit-Followup** (deposit_followup) | 48 Stunden nach Angebotserstellung wird der Patient an die ausstehende Anzahlung erinnert | Automatisch 48h nach Angebot |

### 9.2 Nachsorge & Bewertungen

| Automatisierung | Beschreibung | Konfiguration |
|----------------|-------------|---------------|
| **Nachsorge** (aftercare) | Automatische Nachsorge-Nachricht nach der OP in der Sprache des Patienten | Konfigurierbar: 2h, 4h, 6h, 12h oder 24h nach OP |
| **Bewertungsanfrage** (review_request) | Bittet den Patienten um eine Google Maps Bewertung | Google Maps Link konfigurierbar |
| **No-Show** (noshow) | 30 Minuten nach Terminzeit: automatische WhatsApp zur Umbuchung | Automatisch |

### 9.3 Logistik

| Automatisierung | Beschreibung | Konfiguration |
|----------------|-------------|---------------|
| **Flug-Tracking** (flight_tracking) | Patienten werden nach Flugdaten gefragt; die KI extrahiert Airline, Flugnummer und Ankunftszeit automatisch | Automatisch über Webhook |
| **Fahrer-Benachrichtigung** (driver_notify) | Fahrer wird vor Ankunft per Telegram benachrichtigt | Konfigurierbar: 15, 30, 45 oder 60 Minuten vorher |

### 9.4 Steuerung

Jede Gruppe kann per **Toggle** ein- oder ausgeschaltet werden. Im ausgeklappten Zustand sind Detaileinstellungen je Automatisierung sichtbar. Statistiken zeigen: Anzahl aktiver Automatisierungen und Gesamtausführungen.

### 9.5 Hintergrund-Automatik

Zusätzlich laufen permanent im Hintergrund:
- **DSGVO & 24h-Fenster-Logik** — Automatische Verwaltung der WhatsApp-Einwilligungen
- **Auto-Stage-Progression** — Patienten werden automatisch in die nächste Pipeline-Stufe verschoben (z.B. bei Deposit-Zahlung)
- **KI-gestützte Übersetzung** — Alle automatischen Nachrichten werden in die Sprache des Patienten übersetzt (Anthropic Claude oder OpenAI)

---

## 10. Dateien & Google Drive

### 10.1 Übersicht

Die Dateiverwaltung zeigt alle Patientendokumente, organisiert nach Kategorien:
- **Fotos** (lila) — Patientenfotos
- **Dokumente** (blau) — Verträge, Pläne
- **Rechnungen** (grün) — Rechnungen und Belege
- **Logistik** (türkis) — Flugtickets, Transfer-Dokumente

### 10.2 Google Drive Integration

Bei verbundenem Google Drive werden Dateien automatisch synchronisiert:
- WhatsApp-Fotos vom Patienten
- Behandlungspläne nach ärztlicher Bewertung
- Rechnungen
- Patientenkarten

Ein Banner zeigt den Verbindungsstatus und die Anzahl synchronisierter Dateien. Über "In Drive öffnen" gelangen Sie direkt zum Google Drive Ordner.

### 10.3 Upload

Über "Datei hochladen" können Sie manuell Dateien hinzufügen (Bilder, PDFs, Word-Dokumente). Bei verbundenem Drive werden diese automatisch in den richtigen Ordner verschoben.

### 10.4 Datei-Aktionen

Für jede Datei stehen folgende Aktionen zur Verfügung: Vorschau, Teilen (Link kopieren), Löschen. Fotos werden mit Thumbnail-Vorschau angezeigt.

---

## 11. Zahlungen & Umsatz

### 11.1 Zahlungen & Anzahlungen (PaymentsView)

Die Zahlungsansicht zeigt alle Patienten mit ihrem Anzahlungsstatus:

**Status-Typen:**
- **Ausstehend** (gelb) — Zahlung noch nicht eingegangen
- **Beleg hochgeladen** (blau) — Patient hat Zahlungsbeleg gesendet
- **Bestätigt** (grün) — Zahlung von Admin bestätigt
- **Fehlgeschlagen** (rot) — Zahlung gescheitert
- **Erstattet** (lila) — Betrag zurückgegeben

**KPI-Kacheln:** Ausstehend, Beleg vorhanden, Bestätigt, Bestätigt gesamt (EUR), Ausstehender Betrag (EUR)

**Aktionen pro Patient:** Status ändern (bestätigen, ablehnen), Beleg hochladen, Patientenprofil öffnen

### 11.2 Umsatz (RevenueView)

Die Umsatzansicht hat drei Tabs:

**Übersicht:**
- KPI-Kacheln: Umsatz, Deposits, Ausstehend, Ø OP-Preis, Conversion-Rate
- Balkendiagramm: Monatlicher Umsatz der letzten 6 Monate
- Aufschlüsselung nach Zahlungsmethode (Karte, Bar, Stripe, etc.)

**Rechnungen:**
- Filterbar nach: Alle, Bezahlt, Ausstehend, Überfällig
- Neue Rechnung erstellen: Patient auswählen, Posten, Nettobetrag, MwSt.
- Pro Rechnung: Als bezahlt markieren, PDF generieren, Stripe-Link erstellen

**Exporte:**
- Export nach Google Sheets (Patienten und Umsatzdaten)
- Monatsweise Auswahl

---

## 12. Einstellungen (komplett)

Die Einstellungen sind in eine **Sidebar mit Kategorien** und einen **Inhaltsbereich** aufgeteilt.

### 12.1 Allgemein
Klinikname, Adresse, PLZ, Stadt, Land, Telefon, E-Mail, Zeitzone.

### 12.2 Team & Zugriff
*(Verfügbar ab Operations-Plan)*

Teammitglieder einladen per E-Mail mit Rollenzuweisung (Admin, Koordinator, Arzt, Finanzen). Teamliste mit Name, E-Mail, Rolle, Status (Aktiv/Eingeladen). Rolle ändern und Mitglieder entfernen. **Berechtigungsmatrix** zeigt übersichtlich, welche Rolle auf welches Modul Zugriff hat.

### 12.3 Behandlungsarten
Konfigurieren Sie die angebotenen Behandlungen (z.B. FUE, DHI, FUE Saphir, Bart, Augenbrauen, PRP). Diese werden im Bot, bei der Bewertung und im Kalender verwendet.

### 12.4 Kalender & Termine
Buchungsregeln, Arbeitszeiten, Vorlaufzeit, maximale Buchungen pro Tag. Konfiguration der automatischen Terminvergabe.

### 12.5 Arzt-Zuweisung
**Automatische Zuweisung** ist standardmäßig aktiv. Drei Algorithmen stehen zur Wahl:
- **Frühester verfügbarer Arzt** — Der Arzt, der am schnellsten frei ist
- **Am wenigsten ausgelastet** — Der Arzt mit den wenigsten offenen Bewertungen
- **Gleichmäßige Verteilung** — Bewertungen werden gleichmäßig verteilt

**Pro Arzt konfigurierbar:**
- Bewertungen durchführen (an/aus)
- Operationen durchführen (an/aus)
- Max OPs pro Tag
- Erlaubte Behandlungstypen (selektierbar)
- Individuelle Farbe im Kalender

### 12.6 Zahlungen
**Anzahlungs-Policy:**
- Keine Anzahlung
- Festbetrag (z.B. €500)
- Prozentsatz (10-50%)

**Zahlungszeitpunkt:**
- Bei Buchung
- Nach Bestätigung (nach ärztlicher Freigabe)
- Vor Behandlung (X Tage vor Termin)

**Zahlungsmethoden** (einzeln aktivierbar):
- Stripe (Online-Zahlung per Karte)
- Eigener Zahlungslink (individuelle URL und Button-Text)
- Banküberweisung (IBAN konfigurierbar)
- Zahlung vor Ort (Bar oder Karte in der Klinik)

### 12.7 Fahrer
Fahrer für Flughafentransfers anlegen und verwalten. Pro Fahrer: Name, Telefon, Fahrzeug, Kennzeichen, Telegram Chat-ID, Rolle (Primär/Backup). Fahrer erhalten Benachrichtigungen per **Telegram** (nicht WhatsApp), um Template-Kosten zu sparen.

### 12.8 KI-Bot
- **Antwortverzögerung** — 0-10 Sekunden (menschlicher wirken lassen)
- **Fallback an Mitarbeiter** — Bei unklaren Anfragen automatisch übergeben
- **WhatsApp-Kostenhinweis** — 24h-Fenster-Erklärung
- **Bot-Profil & Persönlichkeit** — Name, Tonalität, Custom Instructions
- **Wissensdatenbank (FAQ)** — Frage-Antwort-Paare, die der Bot nutzt

### 12.9 Automatisierungen
Eingebettete Ansicht aller Automatisierungen (siehe Kapitel 9).

### 12.10 Integrationen
Übersicht aller Integrationen mit Verbindungsstatus:
- WhatsApp, Google Calendar, Google Drive, Google Sheets, Analytics, Stripe

**Google verbinden/trennen**: OAuth-basierte Verbindung für Kalender, Drive und Sheets.

**Analytics-Anbieter**: Google Analytics 4, Plausible oder Matomo konfigurierbar mit individuellen API-Schlüsseln.

### 12.11 Statistiken
Eingebettete Analytics-Ansicht mit Kennzahlen.

### 12.12 Abonnement
Eingebettete Abonnement-Verwaltung (siehe Kapitel 19).

### 12.13 Audit-Log
Chronologisches Protokoll aller Systemereignisse und Benutzeraktionen.

### 12.14 Mein Account
Angemeldeter Benutzer mit E-Mail und Rolle. Passwort ändern (min. 8 Zeichen).

---

## 13. Rollen & Berechtigungen

Flowmatix verwendet ein **RBAC-System** (Role-Based Access Control) mit vier Frontend-Rollen:

### 13.1 Admin (👑)

Voller Zugriff auf alle Module und Funktionen. Kann Einstellungen ändern, Team verwalten, Abonnement steuern, Automatisierungen konfigurieren.

### 13.2 Koordinator (📋)

Zugriff auf: Dashboard, Aufgaben, Posteingang, Pipeline, Patienten, Termine, OP-Vorbereitung, Review Board, Dateien, Archiv. **Kein Zugriff auf:** Einstellungen, Abonnement, Automatisierungen, KI-Konfiguration, Statistiken, Umsatz.

### 13.3 Arzt (⚕️)

Zugriff auf: Arzt-Portal, Review Board, Termine, OP-Vorbereitung. **Kein Zugriff auf:** Dashboard, Posteingang, Pipeline, Einstellungen und alle anderen Module. Sieht nur eigene zugewiesene Termine im Kalender.

### 13.4 Finanzen (💰)

Zugriff auf: Dashboard, Statistiken, Umsatz, Zahlungen. **Kein Zugriff auf:** Posteingang, Pipeline, Termine, Patienten, Einstellungen.

### 13.5 Berechtigungsmatrix

Die vollständige Berechtigungsmatrix ist unter Einstellungen → Team & Zugriff einsehbar. Berechtigungen werden sowohl im Frontend als auch im Backend durchgesetzt.

---

## 14. KI-Bot Konfiguration

### 14.1 KI-Steuerung (AIControlView)

Die zentrale Bot-Konfiguration umfasst:

**Metriken:**
- Automatisierungsrate (% der Gespräche ohne menschliches Eingreifen)
- Menschliche Interventionen
- Aktive Konversationen
- Buchungserfolgsrate

**Antwort-Einstellungen:**
- **Tonalität** — Professional, Freundlich, Concierge, Effizient
- **Klinikbeschreibung** — Custom Instructions, die der Bot kennt
- **Buchungsregeln** — Regeln für die automatische Terminvergabe

**Behandlungen:**
Liste der angebotenen Leistungen, die der Bot dem Patienten nennen kann.

**FAQ / Wissensdatenbank:**
Frage-Antwort-Paare, die der Bot nutzt, um spezifische Fragen zu beantworten.

**Erlaubte Sprachen:**
Wählbar aus 13+ Sprachen. Der Bot antwortet automatisch in der Sprache des Patienten.

**Verhalten:**
- **Fotos automatisch sammeln** — Bot bittet aktiv um Patientenfotos
- **Leads automatisch qualifizieren** — Bot führt Intake-Prozess durch
- **Max. Wartezeit vor Übergabe** — Nach X Minuten ohne Bot-Antwort wird an Mitarbeiter übergeben

### 14.2 Webhook-Controller

Zeigt den aktiven Webhook-Endpoint und Verify-Token für die WhatsApp-Integration. Status-Kacheln für: Eingehende Nachrichten, Vision AI (Bildanalyse), Auto-Responder 24/7.

**Vision AI Pipeline:** Patientenfotos werden automatisch analysiert — die KI erkennt Haarausfall-Muster und ordnet Fotos den richtigen Kategorien zu.

---

## 15. WhatsApp-Verbindung

### 15.1 Setup

Unter "WhatsApp" in der Sidebar finden Sie die Einrichtung. Die Verbindung läuft über **360dialog** und die **Meta Business API**. Flowmatix stellt den Webhook bereit:

- **Webhook-Endpoint:** `https://api.flowmatix.io/webhook/wa/{orgId}`
- **Verify Token:** `fm_{orgId}_verify_2026`

### 15.2 Was passiert nach der Verbindung

Sobald WhatsApp verbunden ist:
1. Eingehende Nachrichten erscheinen sofort im Posteingang
2. Der KI-Bot beginnt automatisch zu antworten
3. Fotos werden per Vision AI analysiert
4. Automatische Nachrichten (Bestätigungen, Erinnerungen) werden gesendet

---

## 16. Fahrer & Transfers

### 16.1 Fahrer anlegen

Unter Einstellungen → Fahrer erstellen Sie Fahrprofile mit: Name, Telefon, Fahrzeug, Kennzeichen, Telegram Chat-ID, Rolle (Primär/Backup).

### 16.2 Bot-Aktivierung

Fahrer erhalten Benachrichtigungen per **Telegram**, nicht per WhatsApp. Zur Aktivierung muss der Fahrer:
1. @FlowmatixBot auf Telegram öffnen
2. `/start` senden
3. Die angezeigte Chat-ID an die Klinik weitergeben

### 16.3 Automatische Zuweisung

Wenn ein Patient Flugdaten bestätigt hat, startet das System automatisch die Fahrerzuweisung:
1. Primärer Fahrer wird per Telegram benachrichtigt
2. Fahrer antwortet mit BESTÄTIGEN oder ABLEHNEN
3. Bei Ablehnung: Eskalation an Backup-Fahrer
4. Bei Ablehnung aller Fahrer: Dashboard zeigt "Alle Fahrer haben abgelehnt" — manuelle Zuweisung nötig

### 16.4 Benachrichtigungszeitpunkt

Konfigurierbar unter Automatisierungen → Logistik: 15, 30, 45 oder 60 Minuten vor Ankunft.

### 16.5 Flug-Tracking

Der KI-Bot fragt Patienten aktiv nach Flugdaten. Die KI extrahiert automatisch: Airline, Flugnummer, Datum und Ankunftszeit. Diese Daten fließen in die Transfer-Planung ein.

---

## 17. Nachsorge & Follow-Up

### 17.1 Automatische Nachsorge

Nach der Behandlung erhält der Patient automatisch eine Nachsorge-Nachricht per WhatsApp. Der Zeitpunkt ist konfigurierbar (2h, 4h, 6h, 12h oder 24h nach OP). Die Nachricht wird automatisch in die Sprache des Patienten übersetzt und enthält Pflegehinweise.

### 17.2 Bewertungsanfrage

Nach der Nachsorge sendet das System eine Bitte um eine **Google Maps Bewertung**. Den Google Maps Link konfigurieren Sie unter Automatisierungen → Nachsorge & Bewertungen → Review Request.

### 17.3 No-Show Handling

Erscheint ein Patient 30 Minuten nach Terminzeit nicht, sendet das System automatisch eine WhatsApp-Nachricht zur Umbuchung.

---

## 18. KI-Support-Widget

### 18.1 Hilfe-Button

Unten rechts auf jeder Seite befindet sich das **KI-Support-Widget** — eine animierte blaue Kugel (Flowmatix Orb). Durch Klick öffnet sich ein Chat-Fenster.

### 18.2 Funktionen

Das Widget bietet:
- **Vorgeschlagene Fragen** in der aktuellen Sprache (z.B. "Wie teste ich mein System?", "Wie bekomme ich meine erste WhatsApp-Anfrage?")
- **Streaming-Antworten** — Die KI antwortet in Echtzeit mit Markdown-Formatierung
- **Navigation** — Antworten können Links zu CRM-Ansichten enthalten (z.B. "Gehe zu Einstellungen")
- **Kontextbezogen** — Die KI kennt Ihren aktuellen System-Status und kann spezifische Hilfe geben

---

## 19. Abonnement & Abrechnung

### 19.1 Pläne

| Plan | Preis | Patienten/Monat | Besonderheiten |
|------|-------|-----------------|----------------|
| **Core** | €690/Mo | 250 | Alle Funktionen, alle Sprachen, KI WhatsApp 24/7 |
| **Pro** | €990/Mo | 500 | Alle Funktionen, alle Sprachen, KI WhatsApp 24/7 |
| **Operations** | €1.490/Mo | 1.000 | Team-Verwaltung, alle Funktionen |
| **Enterprise** | €2.500+/Mo | Unbegrenzt | Dedizierter Account Manager, SLA & Priority Support |

### 19.2 Add-ons

Zusätzliche Kapazität und Funktionen einzeln buchbar:
- **+250 Patienten** — €149/Mo
- **+500 Patienten** — €249/Mo (beliebteste Option)
- **+1.000 Patienten** — €399/Mo
- **+1 Sprache** — €99/Mo
- **Alle Sprachen** — €249/Mo
- **Voice Messages** (KI-Sprachtranskription) — €149/Mo
- **+1 CRM-Zugang** — €39/Mo
- **WA Reminders** — €119/Mo

### 19.3 Trial & Kündigung

Die **Patienten-Nutzungsanzeige** oben rechts zeigt den aktuellen Verbrauch (z.B. 47/250). Bei Überschreitung wird ein Upgrade-Hinweis angezeigt.

Die **Kündigung** erfolgt über "Abo kündigen" oder das **Stripe Billing Portal**. Nach Kündigung läuft das Abonnement bis zum Ende der bezahlten Periode weiter.

### 19.4 Rechnungen

Unter Abonnement → Rechnungen sehen Sie alle Stripe-Rechnungen mit Datum, Betrag und Download-Möglichkeit.

---

## 20. Sicherheit & Datenschutz

### 20.1 DSGVO

Das System verwaltet DSGVO-Einwilligungen automatisch:
- Patienten werden vor der Datenverarbeitung um Zustimmung gebeten
- Der Consent-Status wird im Patientenprofil und der Pipeline gespeichert
- Eine spezielle "DSGVO + Reaktivierung"-Vorlage wird gesendet, wenn das 24h-Fenster abgelaufen ist

### 20.2 Audit-Log

Jede Aktion im System wird protokolliert: Wer hat was wann getan. Einsehbar unter Einstellungen → Audit-Log. Dazu gehören: Automatisierungs-Ausführungen, Statusänderungen, Nachrichtenversand, Login-Ereignisse.

### 20.3 Passwort ändern

Unter Einstellungen → Mein Account. Mindestlänge: 8 Zeichen. Bestätigung durch zweimalige Eingabe.

### 20.4 Rollen-Schutz

Das RBAC-System stellt sicher, dass jeder Benutzer nur die Funktionen sieht und ausführen kann, die seiner Rolle entsprechen. Dies gilt sowohl im Frontend als auch im Backend (API).

### 20.5 Verschlüsselung

WhatsApp-Zugangsdaten werden verschlüsselt in der Datenbank gespeichert (`access_token_encrypted`). Die Kommunikation erfolgt ausschließlich über HTTPS.

---

## 21. Tipps & Best Practices

### 21.1 Empfohlener Workflow: Vom ersten Patienten bis zur Nachsorge

1. **Einrichtung (einmalig)**
   - Klinikdaten vervollständigen
   - WhatsApp verbinden
   - KI-Bot konfigurieren (Ton, Behandlungen, FAQ)
   - Google Drive verbinden
   - Ärzte anlegen und Behandlungstypen zuweisen
   - Fahrer anlegen (Name, Telefon, Telegram)
   - Zahlungseinstellungen konfigurieren (Deposit, Methoden)
   - Automatisierungen aktivieren

2. **Patient schreibt per WhatsApp**
   - KI-Bot beantwortet automatisch
   - Bot sammelt Informationen: Name, Alter, Anliegen, Land
   - Bot bittet um Fotos (Vorne, Oben, Seiten)
   - Fotos werden per Vision AI analysiert

3. **Ärztliche Bewertung**
   - Patient erscheint automatisch im Arzt-Portal
   - Arzt sieht Fotos und Patientendaten
   - Arzt gibt Grafts, Preis und Technik ein
   - System erstellt Behandlungsplan und sendet ihn an den Patienten

4. **Buchung & Zahlung**
   - Patient erhält Plan + Zahlungslink
   - Bei Anzahlung: System sendet automatische Erinnerung nach 48h
   - Nach Zahlung: Status wechselt zu "Gebucht"
   - Buchungsbestätigung wird automatisch gesendet

5. **Logistik-Vorbereitung**
   - Bot fragt nach Flugdaten
   - KI extrahiert Flugdetails automatisch
   - Fahrer wird automatisch zugewiesen und per Telegram benachrichtigt
   - Hotel-Info wird gesammelt

6. **OP-Tag**
   - Dashboard zeigt Tagesplan
   - OP-Planung zeigt Checkliste mit Readiness Score
   - Kalender zeigt alle Termine

7. **Nachsorge**
   - Automatische Nachsorge-Nachricht (konfigurierbar)
   - Bewertungsanfrage mit Google Maps Link
   - Bei No-Show: Automatische Umbuchungsanfrage

### 21.2 Allgemeine Tipps

- **Dashboard zuerst**: Starten Sie jeden Tag mit dem Dashboard — es zeigt sofort, ob Aktionen nötig sind.
- **Lassen Sie die KI arbeiten**: Greifen Sie nur ein, wenn das System "Menschliche Übernahme" signalisiert. Je weniger Sie manuell eingreifen, desto effizienter wird das System.
- **Vorlagen nutzen**: Verwenden Sie die vordefinierten Template-Nachrichten statt freiem Text — sie sind professionell formuliert und werden automatisch personalisiert.
- **Google Drive verbinden**: Damit werden alle Patientenfotos, Pläne und Rechnungen automatisch organisiert und gesichert.
- **Ärzte richtig konfigurieren**: Stellen Sie sicher, dass für jeden Arzt die erlaubten Behandlungstypen und die Kalender-Einstellungen korrekt sind.
- **Patienten-Limit beachten**: Die Nutzungsanzeige oben rechts zeigt den aktuellen Verbrauch. Planen Sie rechtzeitig ein Upgrade oder Add-on.

---

*Flowmatix CRM — Version v368 — Stand: März 2026*
