# ADR 0001: Stack mit Vite, React und TanStack Query

Datum: 26.11.2026
Status: angenommen

## Kontext

Die PSNG-Orga-App ist eine reine Client-App mit Google-Login. Sie braucht keine Seiten für Suchmaschinen, keinen Server und keine Datenbank. Sie hat Hash-Routen (`#/todos`, `#/talks`) und soll als PWA installierbar sein.

psng.info läuft mit Astro. Astro ist für Inhaltsseiten gebaut. Für eine Anwendung mit Login und vielen Zuständen wäre es ein Umweg.

## Entscheidung

- Vite als Build-Werkzeug
- React mit TypeScript im strict-Modus
- Tailwind CSS v4
- shadcn/ui für Bausteine
- TanStack Query für Daten vom Server (Sheets)
- Eigener kleiner Hash-Router, keine Router-Bibliothek

Gemeinsam mit psng.info bleiben React, TypeScript, Tailwind, shadcn und Vercel als Hosting. So muss das Team nur eine Art von Code lesen.

## Folgen

- Tailwind v4 weicht von psng.info ab, dort läuft v3. Konfiguration und Klassen lassen sich nicht einfach übernehmen.
- Ohne Router-Bibliothek gibt es einen eigenen Hook für Hash-Routen. Er ist klein, muss aber gepflegt werden.
- Astro wird nicht genutzt. Wer die App pflegt, braucht Vite und React, keine Astro-Kenntnisse.
