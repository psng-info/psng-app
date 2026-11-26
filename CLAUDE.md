# PSNG-App

Dieses Repo baut die Orga-App des Psychedelic Student Network Germany (PSNG). Sie ersetzt das bisherige Claude-Dashboard durch eine eigenständige Web-App, die das ganze Kernteam ohne Claude-Konto nutzen kann. Die fachliche Spezifikation steht in `docs/spec.md`. Die alte Referenz (`docs/reference/dashboard.html`) liegt nur lokal, sie ist nicht im Repo.

Lies diese Datei vor jeder Aufgabe. Wenn etwas unklar ist oder einer Anforderung widerspricht: fragen, nicht raten.

## Ziel und Prinzipien
1. **Nachhaltig vor clever.** Die App muss weiterlaufen, wenn Lennert die Koordination im März 2027 abgibt. Jemand mit wenig Erfahrung soll sie mit Claude Code pflegen können. Weniger Abhängigkeiten, weniger Magie, mehr Lesbarkeit.
2. **Sparsam.** Kein eigener Server, keine Datenbank, keine laufenden Kosten in v1 (ab v2 nur eine Serverless Function für KI). Jede neue Abhängigkeit braucht einen Grund, der im PR steht.
3. **Google Sheets bleibt die einzige Datenquelle.** Das Team arbeitet weiter in den Sheets, Formulare und Apps Scripts laufen weiter. Die App ist ein besseres Fenster darauf, kein Ersatz.
4. **Datenschutz zuerst.** Das HR-Sheet enthält personenbezogene Daten. Keine Daten in Logs, Analytics, Fehlermeldungen oder Drittdienste. Echte Daten nie ins Repo (Fixtures sind anonymisiert).

## Datenquellen (Spaltennamen nie umbenennen, Apps Scripts hängen daran)
| Sheet | ID | Tabs |
|---|---|---|
| Koordination To-dos | `1RconQa9454jAwtibcp2kcoZAnAh2dK1ZhHHMBG1oCJM` | To-dos (IDs T01 ff.) |
| HR-Sheet | `10PYamzuwl_9-cnoJOkbl0SO1sWvPrRWuhy8u0SaVS7Y` | Kandidaten, Abbrüche, Notizen, Members, Formularantworten 1 |
| PSNG Lectures & Speaker | `12bBZKGjUA_ilIqYgz5racmCWZL_M7uBIjLLYsDlwfeI` | Lectures, Speaker, Talk-Schritte, Talk-Berichte, Speaker-Formular, Info, Zugang |

Regeln:
- Lesen per `spreadsheets.values.batchGet`, alle Bereiche einer Ansicht in einem Aufruf (Google erlaubt ca. 60 Lesezugriffe pro Minute und Nutzer).
- Schreiben nur einzelne Zellen (`values.update`) oder neue Zeilen (`values.append`). Vor jedem Schreiben die Zielzeile frisch lesen und über einen Schlüssel finden, nie über eine zwischengespeicherte Zeilennummer.
- Spalten über den Kopfzeilen-Namen finden, nie über Buchstaben.
- Neue Felder nur als neue Spalte am Ende, nach Rücksprache.
- Talk-Schlüssel ist aktuell `TT.MM.JJJJ · Speaker`. Ziel: Spalte `ID` im Tab Lectures (L001 ff.), Migration als eigene Aufgabe.

## Architektur
- **Stack:** Vite, React, TypeScript (strict), Tailwind v4, shadcn/ui, TanStack Query. React, TS, Tailwind, shadcn und Vercel teilt die App mit psng.info; psng.info baut mit Astro, diese App mit Vite, weil sie eine reine Client-App mit Login ist (ADR 0001).
- **PWA** (vite-plugin-pwa): installierbar auf Handy und Desktop, Lesecache offline. Keine native App (ADR 0004).
- **Login:** Google Identity Services im Browser (Token Client). Scopes `spreadsheets` und `openid email` (E-Mail für die Zugangsliste, ADR 0002). Kein Drive-Scope. Rechte = Freigaben der Sheets in Google Drive. Fehler 403 zeigt einen klaren Hinweis.
- **Anmeldeseite zuerst:** Logo und „Mit Google anmelden“. Vor dem Login wird kein Sheet gelesen.
- **Datenmodus** `VITE_DATA=sheets|demo`. Demo nutzt anonymisierte Fixtures ohne Login (Previews, Tests, CI). ADR 0003.
- **Keine Geheimnisse im Code.** Die OAuth Client ID ist öffentlich und darf ins Repo. Alles andere nicht. `.env.example` pflegen.
- **Schichten:**
  - `src/domain/`: reine Funktionen ohne React und ohne Netzwerk (Ablauf-Schritte, Fälligkeiten, Flags, Mood). Hier steckt die Logik, hier stehen die Tests.
  - `src/data/`: `SheetsAdapter` (Google oder Demo) und ein Repository pro Tabelle. Später austauschbar gegen eine Datenbank, ohne dass UI oder Domain sich ändern.
  - `src/auth/`: Google-Login.
  - `src/features/`: talks, todos, hr, access. Jedes Feature eigener Ordner.
  - `src/ui/`: gemeinsame Komponenten und Design-Tokens.
  - `src/app/`: App-Rahmen, Router, Provider.
- **Server-State:** TanStack Query (Cache, Refetch, optimistische Updates mit Rollback). Kein Redux.
- **Konfiguration statt Code:** Ablauf-Schritte und Standardrollen der Talks stehen als Standardwerte in `src/domain/talks/steps.ts` und sollen später über einen Tab `Konfiguration` im Lecture-Sheet überschreibbar sein. Teamnamen kommen aus dem Tab `Zugang` (das HR-Sheet ist nur für die Rolle `hr` freigegeben).
- **Routing:** Hash-Routen `#/todos`, `#/kandidaten`, `#/talks`, `#/talks/<key>` (eigener kleiner Hook, keine Router-Bibliothek).

## Zugang und Rollen
- Nur das Kernteam. Erlaubte Google-Konten stehen im Tab `Zugang` im Lecture-Sheet (E-Mail, Name, Rollen). Wer nicht drauf steht, sieht nach dem Login nur einen Hinweis.
- Rollen: `kern` (To-dos, Talks), `hr` (zusätzlich Kandidat:innen), `admin` (Zugang verwalten, KI-Limits).
- Die Liste regelt nur, was die App zeigt. Echter Schutz bleibt die Freigabe der Sheets in Google Drive: das HR-Sheet nur für Leute mit Rolle `hr` freigeben.

## Funktionsumfang v1
1. **To-dos:** Lage-Kacheln, Ziele mit Fortschritt, Liste mit Filtern (Modus, Person, Bereich, Bearbeitet), abhaken, Notiz, neues To-do. Neue To-dos bekommen ID, Quelle und Erfasst-Datum.
2. **Kandidat:innen:** Pipeline, Handlungsbedarf, Personenkarten mit Checkliste. Kontaktdaten nur auf Klick, nie in Listen.
3. **Talks:** nächster Talk, Handlungsbedarf, Talks als aufklappbare Karten mit Ablauf in 19 Schritten (Owner, Fälligkeit, Log), Eckdaten, Speaker, Nachbereitung, verknüpfte To-dos, Zahlen, Speaker-Pool.
4. **KI (v2, nach v1):** „Mit Claude verarbeiten“: Notizen rein, Vorschlag für Sheet-Änderungen raus, Vorschau, erst nach Klick schreiben. Als Vercel Function (`api/claude.ts`), API-Schlüssel nur als Umgebungsvariable bei Vercel. Die Function prüft das Google-Token (nur Leute aus `Zugang`), begrenzt Anfragen pro Person und Tag, schickt keine Kontaktdaten. Standardmodell Haiku, Sonnet nur für schwierige Fälle. Ausgabenlimit in der Claude Console.

## Design
- **Richtung:** ruhig, wissenschaftlich, seriös. Kein Counterculture- oder Esoterik-Look. Marke PSNG: Rosé/Pink (`#c94a6e`, `#dc776b`). Schriften selbst gehostet (fontsource): Space Grotesk (Überschriften), Atkinson Hyperlegible (Text), IBM Plex Mono (Zahlen, IDs).
- **Frosted Glass, dosiert:** halbtransparente Flächen mit `backdrop-filter: blur(16px) saturate(140%)` über einem weichen Farbverlauf. Nur für Rahmen-Elemente (Kopfzeile, Tab-Leiste, Bottom-Sheet, Aktionsleiste). Listen und Text auf fast deckenden Flächen.
  - Fallback `@supports not (backdrop-filter: blur(1px))`: deckend.
  - `prefers-reduced-transparency: reduce` und `prefers-contrast: more`: deckend.
  - Kontrast mindestens WCAG AA (4,5:1) auf der ungünstigsten Hintergrundstelle.
  - Keine verschachtelten Glasflächen, nicht auf langen Listen-Elementen.
- **Hell und dunkel**, jeweils eigene Tokens.
- **Mobile first:** Tippflächen mindestens 44 px, Eingaben 16 px, Safe Areas, Aktionen als Bottom-Sheet.
- **Bewegung:** eine dezente Übergangsanimation, aus bei `prefers-reduced-motion`.
- **Barrierefreiheit:** semantisches HTML, Tastaturbedienung, sichtbarer Fokus, Status nie nur über Farbe.
- **Texte:** Deutsch, knapp, keine Gedankenstriche als Satzzeichen.

## Sicherheit und Datenschutz
- CSP und Security-Header über `vercel.json` (nur Google-Login und Google-APIs).
- Keine Analytics, kein Fehler-Tracking mit Personendaten. Fehler lokal anzeigen, ohne Zellinhalte.
- Lesecache (IndexedDB) nur für To-dos und Talks. HR-Daten nicht offline speichern, beim Abmelden alle Caches löschen.
- Abhängigkeiten minimal und exakt gepinnt, Lockfile im Repo, Dependabot an, `npm audit` in der CI.
- Kein `dangerouslySetInnerHTML`. Alle Sheet-Inhalte sind Text.

## Qualität und Arbeitsweise
- **Erst planen, dann bauen.** Für jede größere Aufgabe zuerst einen Plan vorlegen und auf OK warten.
- **Kleine Schritte:** ein Feature pro Branch, ein PR pro Schritt, mit kurzer Beschreibung und Screenshot.
- **Tests:** Vitest für alles in `src/domain/`, mit anonymisierten Beispielzeilen als Fixtures. Playwright für einen Klickpfad pro Feature (Demo-Modus).
- **CI (GitHub Actions):** typecheck, lint, test, build, audit. Kein Merge bei Rot.
- **Hosting:** Vercel, Deploy aus `main`, Preview pro PR (Demo-Modus).
- **Doku für die Übergabe:** `README.md` (Einrichtung in 10 Minuten, inkl. Google-OAuth-Client), `docs/decisions/` (ADRs), `docs/runbook.md`.
- **Eigentum:** Repo in der GitHub-Organisation `psng-info`, Google-Cloud-Projekt, Vercel und Claude Console auf dem PSNG-Konto, nicht auf Privatkonten. Mindestens zwei Personen mit Admin-Zugang.

## Befehle
- `npm run dev` (Port 5173), `npm run dev:demo` (Demo-Daten)
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run e2e`
