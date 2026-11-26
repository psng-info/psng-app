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

Dafür braucht `.env.local` die Client-ID (siehe nächster Abschnitt) und `VITE_DATA=sheets`. Ohne beides läuft die App im Demo-Modus. Wer den Login-Bildschirm ohne Client-ID sehen will: `VITE_DATA=sheets npm run dev`.

## Google-Login einrichten (10 Minuten)

Einmalig, im PSNG-Konto (nicht privat).

1. In [console.cloud.google.com](https://console.cloud.google.com) oben ein neues Projekt „PSNG Orga“ anlegen.
2. Menü „APIs und Dienste“, „Bibliothek“: „Google Sheets API“ suchen und aktivieren.
3. „APIs und Dienste“, „OAuth-Zustimmungsbildschirm“ (je nach Oberfläche „Google Auth Platform“, „Branding“):
   - Nutzertyp: Extern
   - App-Name: PSNG Orga
   - Support-E-Mail und Kontakt-E-Mail: die Adresse des PSNG-Kontos
   - Autorisierte Domain: die Produktions-Domain (sobald bekannt)
4. Unter „Datenzugriff“ („Scopes“) hinzufügen: `.../auth/spreadsheets`, `openid`, `.../auth/userinfo.email`. Kein Drive-Scope.
5. Unter „Zielgruppe“ („Testnutzer“) alle Teammitglieder mit ihrer Google-E-Mail eintragen. Solange die App im Status „Testing“ ist, kommen nur diese Personen durch (max. 100). Der Hinweis „App nicht bestätigt“ beim ersten Login ist dann normal („Erweitert“, „Weiter zu PSNG Orga“).
6. „Anmeldedaten“, „Anmeldedaten erstellen“, „OAuth-Client-ID“:
   - Anwendungstyp: Webanwendung
   - Name: PSNG Orga Web
   - Autorisierte JavaScript-Quellen: `http://localhost:5173` und die Produktions-Domain (mit `https://`, ohne Pfad und ohne Schrägstrich am Ende)
   - Weiterleitungs-URIs bleiben leer (der Login läuft über ein Popup).
7. Die Client-ID (endet auf `.apps.googleusercontent.com`) kopieren:
   - lokal: in `.env.local` als `VITE_GOOGLE_CLIENT_ID=...`, danach `npm run dev` neu starten
   - Vercel: als Umgebungsvariable (siehe unten)

Die Client-ID ist öffentlich und darf ins Repo. Andere Geheimnisse gehören nicht ins Repo. Ohne Client-ID zeigt die Anmeldeseite im Dev-Modus einen Einrichtungshinweis, im Produktionsbuild „Anmeldung gerade nicht möglich“.

## Deploy auf Vercel

1. Im PSNG-Account bei Vercel „Add New“, „Project“ wählen und das GitHub-Repo `psng-info/psng-app` importieren. Framework „Vite“ wird erkannt, Build-Befehl `npm run build`, Ausgabe `dist`.
2. Unter „Settings“, „Environment Variables“ je Umgebung setzen:

| Umgebung   | Variable                | Wert                        |
| ---------- | ----------------------- | --------------------------- |
| Production | `VITE_DATA`             | `sheets`                    |
| Production | `VITE_GOOGLE_CLIENT_ID` | die Client-ID aus Schritt 7 |
| Preview    | `VITE_DATA`             | `demo`                      |

3. Deploy aus `main` ist Production, jeder Pull Request bekommt eine Preview. Previews laufen im Demo-Modus ohne Login und ohne echte Daten (ADR 0003), deshalb braucht die Preview keine Client-ID.
4. Nach Änderungen an Umgebungsvariablen neu deployen (Variablen werden beim Build eingebettet).
5. Die Domain der Production in der Google Cloud Console bei den autorisierten JavaScript-Quellen ergänzen.

## Neue Person ins Team

Drei Dinge, in dieser Reihenfolge:

1. **Zugang:** im Lecture-Sheet im Tab „Zugang“ eine Zeile anlegen: E-Mail (die Google-Adresse, mit der sich die Person anmeldet), Name (so erscheint er als Owner), Rollen (`kern`, optional `hr`, `admin`).
2. **Drive-Freigabe:** die drei Sheets (Koordination To-dos, Lectures & Speaker, nur bei Rolle `hr` auch das HR-Sheet) für dieselbe Adresse als Editor freigeben. Die Liste regelt nur, was die App zeigt, den echten Schutz geben die Freigaben.
3. **OAuth-Testnutzer:** in der Google Cloud Console unter „Zielgruppe“ die Adresse als Testnutzer eintragen. Ohne diesen Schritt bricht der Login mit „Zugriff blockiert“ ab.

Abmelden einer Person: dieselben drei Schritte rückwärts (siehe `docs/runbook.md`).

## Befehle

| Befehl              | Zweck                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run dev`       | Entwicklungsserver mit echtem Login (Port 5173)                                                          |
| `npm run dev:demo`  | Entwicklungsserver mit Demo-Daten                                                                        |
| `npm run build`     | Typprüfung und Produktionsbuild nach `dist/`                                                             |
| `npm run preview`   | Gebauten Stand lokal ansehen                                                                             |
| `npm run typecheck` | TypeScript prüfen                                                                                        |
| `npm run lint`      | Lint (ESLint)                                                                                            |
| `npm run format`    | Dateien mit Prettier formatieren                                                                         |
| `npm test`          | Unit-Tests (Vitest)                                                                                      |
| `npm run e2e`       | Klickpfade und Barrierefreiheit im Demo-Modus (Playwright, startet den Demo-Server selbst auf Port 4173) |

Beim ersten Mal für `npm run e2e`: `npx playwright install chromium`.

## Offline

Im Sheets-Modus speichert die App To-dos, Talks und die Zugangsliste bis zu 7 Tage in IndexedDB (nur Lesen). Kandidat:innen (HR) werden nie gespeichert. Beim Abmelden wird alles gelöscht. Details in `docs/runbook.md`.

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
