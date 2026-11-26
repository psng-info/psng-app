# Runbook

Was tun, wenn etwas nicht läuft. Kurz halten, Details kommen nach und nach dazu.

## Token abgelaufen oder ständig neu anmelden

Das Google-Token läuft nach einer Stunde ab. Die App fordert dann still ein neues an. Wenn die App immer wieder zur Anmeldung springt:

- Prüfen, ob die Person als Testnutzer im Google-Cloud-Projekt „PSNG Orga“ eingetragen ist.
- Browser-Cookies für die App-Domain löschen und neu anmelden.

_Platzhalter: weitere Ursachen und Details folgen._

## „Keine Berechtigung“ (403)

Die Person hat keinen Zugriff auf das Sheet. Ursache ist fast immer die Freigabe in Google Drive.

- Im Drive prüfen, ob die Person beim Sheet als Editor oder Betrachter eingetragen ist.
- Für das HR-Sheet braucht die Person zusätzlich die Rolle `hr` im Tab „Zugang“.

_Platzhalter: Liste der Sheets mit Links folgt._

## Google-Limit erreicht (429)

Google erlaubt etwa 60 Lesezugriffe pro Minute und Nutzer. Bei zu vielen Klicks kommt der Fehler 429.

- Eine Minute warten, dann neu laden.

## „Spalte X fehlt“

Jemand hat eine Spalte im Sheet umbenannt. Die Apps Scripts hängen an den Spaltennamen, und die App findet die Spalte dann nicht mehr.

- Die Spalte wieder auf den alten Namen zurückbenennen.
- Den Namen nicht „verbessern“, auch wenn er unschön wirkt.

## Sheet verschoben oder neu erstellt

Die App kennt die Sheets über ihre ID.

- Neue ID aus der URL des Sheets kopieren.
- Die ID in `src/data/config.ts` ändern.
- Danach neu deployen.

## Neue Person ins Team

Drei Dinge gehören zusammen:

1. Zeile im Tab „Zugang“ anlegen (E-Mail, Name, Rolle).
2. Im Google Drive die Freigaben für die nötigen Sheets setzen. Für das HR-Sheet nur bei Rolle `hr`.
3. Die E-Mail als Testnutzer im Google-Cloud-Projekt eintragen.

_Platzhalter: Reihenfolge und Stolpersteine folgen._

## Person verlässt das Team

Alle drei Schritte von oben rückgängig machen:

1. Zeile im Tab „Zugang“ entfernen oder deaktivieren.
2. Freigaben im Google Drive entziehen.
3. Testnutzer im Google-Cloud-Projekt entfernen.

## Deploy kaputt

1. In Vercel unter „Deployments“ den letzten funktionierenden Stand suchen.
2. Die drei Punkte öffnen und „Promote to Production“ wählen.
3. Danach den fehlerhaften Commit in Ruhe prüfen und reparieren.

_Platzhalter: Vorgehen bei Problemen mit Umgebungsvariablen folgt._
