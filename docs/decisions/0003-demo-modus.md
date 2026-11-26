# ADR 0003: Demo-Modus über VITE_DATA

Datum: 26.11.2026
Status: angenommen

## Kontext

Previews auf Vercel, Tests und die CI brauchen Daten, ohne dass sich jemand anmelden muss. Echte Daten dürfen aber nicht auf Preview-URLs landen, und das HR-Sheet enthält personenbezogene Daten.

Außerdem erlaubt Google keine Wildcard-Origins für OAuth. Eine Preview-URL pro Pull Request kann also nicht als autorisierte Quelle im Google-Client eingetragen werden.

## Entscheidung

Eine Umgebungsvariable steuert die Datenquelle:

- `VITE_DATA=sheets`: echte Google Sheets, mit Login
- `VITE_DATA=demo`: anonymisierte Fixtures aus `tests/fixtures`, ohne Login

Der Demo-Modus liest nur die Fixtures. Previews auf Vercel laufen im Demo-Modus. CI und Playwright nutzen ebenfalls den Demo-Modus.

Lokal starten `npm run dev:demo` den Demo-Modus und `npm run dev` den echten Modus.

## Folgen

- Fixtures müssen anonymisiert bleiben. Echte Namen, Kontaktdaten oder Zellinhalte gehören nicht in das Repo.
- Die Demo-Daten können vom echten Sheet abweichen. Fehler, die nur mit echten Daten auftreten, findet man im Demo-Modus nicht.
- Die Umgebungsvariable muss in Vercel richtig gesetzt sein: Production `sheets`, Preview `demo`. Eine Verwechslung wäre ein Datenschutzproblem.
