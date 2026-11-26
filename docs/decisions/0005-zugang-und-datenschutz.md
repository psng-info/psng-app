# ADR 0005: Zugang, Rollen und Datenschutz

Datum: 26.11.2026
Status: angenommen

## Kontext

Die App zeigt Daten aus drei Sheets, darunter das HR-Sheet mit Kandidat:innen. Nicht jede Person im Kernteam soll alles sehen. Das Repo ist öffentlich. Ein Sheet darf deshalb nie allein durch das Verstecken im Code geschützt sein.

## Entscheidung

- **Anmeldeseite zuerst.** Vor dem Login wird kein Sheet gelesen.
- **Tab „Zugang“** im Lecture-Sheet mit E-Mail, Name und Rollen (`kern`, `hr`, `admin`). Die Liste regelt, was die App anzeigt. Wer nicht drauf steht, sieht nur einen Hinweis.
- **Echter Schutz sind die Freigaben in Google Drive.** Das HR-Sheet ist nur für Personen mit Rolle `hr` freigegeben. Ohne Freigabe antwortet Google mit 403, egal was die App anzeigt.
- **Teamnamen aus dem Tab „Zugang“** statt aus HR › Members. Der Grund: Die Rolle `kern` kann das HR-Sheet nicht lesen, braucht die Namen aber für To-dos und Talks.
- **Fonts selbst gehostet** (fontsource), keine Google Fonts. Damit gehen keine IP-Adressen an Google, das ist DSGVO-freundlich.
- **Referenz-Dashboard nicht im öffentlichen Repo.** Die alte Datei `docs/reference/dashboard.html` bleibt lokal.
- **Repo ist öffentlich.** Die Sheet-IDs stehen ohnehin im ausgelieferten JavaScript. Das ist kein Problem, weil die IDs allein nichts öffnen. Der Schutz liegt bei den Freigaben.
  - Geprüft am 26.11.2026: keins der drei Sheets ist per Link freigegeben.

## Folgen

- Jede Freigabe in Drive ist eine Entscheidung über Zugriff und muss bei Personalwechseln mit angepasst werden. Das steht im Runbook.
- Wenn ein Sheet per Link freigegeben wird, ist der Schutz weg, auch wenn die App es nicht anzeigt. Diese Prüfung gehört zur Übergabe.
- Keine Analytics und kein Fehler-Tracking mit Personendaten. Fehlermeldungen zeigen keine Zellinhalte.
- Das Repo darf keine echten Daten, keine Zugangsliste und kein Referenz-Dashboard enthalten.
