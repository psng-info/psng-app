# PSNG Orga

Die Orga-App des PSNG: To-dos, Kandidat:innen und Talks, direkt aus den Google Sheets im Team.

## Schnellstart lokal

Voraussetzung: Node 24.

```bash
npm ci
cp .env.example .env.local
npm run dev:demo
```

`npm run dev:demo` startet mit anonymisierten Demo-Daten, ohne Login. Für die echten Daten mit Google-Login:

```bash
npm run dev
```

Dafür braucht `.env.local` die Client-ID (siehe nächster Abschnitt).

## Google-Login einrichten (10 Minuten)

1. Im PSNG-Konto in [console.cloud.google.com](https://console.cloud.google.com) ein neues Projekt „PSNG Orga“ anlegen.
2. Die Google Sheets API aktivieren.
3. Den OAuth-Zustimmungsbildschirm einrichten:
   - Nutzertyp: Extern
   - App-Name: PSNG Orga
   - Support-E-Mail: die Adresse des PSNG-Kontos
   - Scopes: `spreadsheets`, `openid`, `email`
   - Testnutzer: die Teammitglieder
4. Unter Anmeldedaten eine OAuth-Client-ID vom Typ Webanwendung anlegen:
   - Autorisierte JavaScript-Quellen: `http://localhost:5173` und die Produktions-Domain
5. Die Client-ID in `.env.local` als `VITE_GOOGLE_CLIENT_ID` eintragen und dieselbe Variable bei Vercel setzen.

Die Client-ID ist öffentlich und darf ins Repo. Andere Geheimnisse gehören nicht ins Repo.

## Deploy auf Vercel

1. Im PSNG-Account bei Vercel ein Projekt anlegen und das GitHub-Repo `psng-info/psng-app` importieren.
2. Umgebungsvariablen setzen:
   - Production: `VITE_DATA=sheets` und `VITE_GOOGLE_CLIENT_ID`
   - Preview: `VITE_DATA=demo`

Previews laufen so ohne echte Daten. Hintergrund in `docs/decisions/0003-demo-modus.md`.

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver mit echtem Login (Port 5173) |
| `npm run dev:demo` | Entwicklungsserver mit Demo-Daten |
| `npm run typecheck` | TypeScript prüfen |
| `npm run lint` | Lint |
| `npm test` | Unit-Tests (Vitest) |
| `npm run build` | Produktionsbuild |
| `npm run e2e` | Klickpfade im Demo-Modus (Playwright) |

## Aufbau

- `src/domain/`: reine Logik ohne React und ohne Netzwerk, mit Tests
- `src/data/`: Zugriff auf die Sheets (Google oder Demo)
- `src/auth/`: Google-Login
- `src/features/`: talks, todos, hr, access
- `src/ui/`: gemeinsame Komponenten und Design-Tokens
- `src/app/`: App-Rahmen, Router, Provider
- `tests/fixtures/`: anonymisierte Beispieldaten

## Weiterlesen

- `CLAUDE.md`: Regeln und Arbeitsweise für Claude Code
- `docs/spec.md`: fachliche Spezifikation
- `docs/runbook.md`: Was tun, wenn etwas nicht läuft
- `docs/decisions/`: Entscheidungen mit Begründung (ADRs)
