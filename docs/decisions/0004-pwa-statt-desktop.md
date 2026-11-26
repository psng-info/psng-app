# ADR 0004: PWA statt native Desktop-App

Datum: 26.11.2026
Status: angenommen

## Kontext

Das Team soll die App auf dem Handy und auf dem Desktop nutzen können, ohne Browser-Tab. Naheliegend wären Electron oder Tauri für den Desktop.

## Entscheidung

Die Web-App ist eine PWA (vite-plugin-pwa). Sie lässt sich auf Handy und Desktop installieren.

Keine native App mit Electron oder Tauri. Der Grund:

- Sie wäre nicht sicherer. Der Schutz liegt bei Google-Login und den Drive-Freigaben, nicht bei der Hülle.
- Eine native App bräuchte pro Betriebssystem eigene Builds, Signierung und Updates. Das ist für ein kleines Team mit wenig Zeit nicht tragbar.

Der Service Worker cacht nur die App-Hülle (HTML, JS, CSS, Schriften). Antworten von Google werden nicht gecacht. Die Lesedaten für To-dos und Talks liegen separat im IndexedDB-Cache, siehe CLAUDE.md.

## Folgen

- Die App braucht eine Internetverbindung, um Daten zu laden. Offline funktioniert nur die Hülle und der Lesecache.
- Installation geht über den Browser: auf dem Handy „Zum Startbildschirm hinzufügen“, am Desktop über das Installationssymbol in der Adressleiste.
