# Flowmatix CRM — Regeln

## DEPLOY-ISOLATION (KRITISCH!)
- **Kunden-CRM** (crm.flowmatix.io) = Branch `main` → `./deploy.sh`
- **Kontroll-CRM** (app.flowmatix.io) = Branch `operator` → `./deploy-ops.sh`
- **VOR JEDER AENDERUNG:** `git branch --show-current` pruefen!
- **VOR JEDEM DEPLOY:** Branch muss zum Script passen. Falscher Branch = ABBRECHEN.
- **VOR Branch-Wechsel:** `git add -A && git commit -m "WIP"` — NIEMALS git stash
- **NIEMALS** operator in main mergen ohne Anweisung

## Immer erst Plan zeigen
- VOR jeder Aenderung erst Plan zeigen — was, welche Dateien, warum
- Erst nach User-Bestaetigung umsetzen

## Stack
- React (Vite) — lokal bauen, per Script hochladen
- Rollenbasiert: admin, coordinator, doctor, finance (4 verschiedene CRM-Erlebnisse)
- i18n: DE/EN/TR via T-Objekt in src/data/i18n.js

## Wichtige Dateien
- `CRM.jsx` — Haupt-App-Logik (root)
- `src/components/MainLayout.jsx` — View-Routing
- `src/data/i18n.js` — Uebersetzungen (DE/EN/TR)
- `src/data/constants.js` — Stages, Rollen, MODULE_ACCESS, ACTION_PERMS
- `src/components/Operator/` — Operator Panel (nur auf operator Branch)

## Regeln
- NUR aendern was explizit gefragt wurde
- UI-Layouts/Designs NICHT anfassen ohne Rueckfrage
- NIEMALS DoctorTasks/Arzt-Portal Popup-Komponenten aendern
- NIEMALS dist/ auf dem Server direkt patchen
- NIEMALS AppointmentsPage.jsx komplett neu schreiben — nur chirurgische Einzelaenderungen (max. 20 Zeilen pro Commit). Die Datei hat 15+ voneinander abhaengige Features. Jeder Grossrefactor zerstoert davon mehrere gleichzeitig.

## Deploy
```bash
# Kunden-CRM (Branch: main)
npm run build && ./deploy.sh

# Operator-CRM (Branch: operator)  
npm run build && ./deploy-ops.sh
```

## Sprache
- User spricht Deutsch (informell). Antworten auf Deutsch, Code auf Englisch.
- Kurz und direkt. Keine Zusammenfassungen.
