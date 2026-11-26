# Runbook

Was tun, wenn etwas nicht läuft. Die Texte in Anführungszeichen sind die Meldungen, die die App wirklich zeigt.

## „Anmeldung abgelaufen. Bitte neu anmelden.“

Das Google-Token läuft nach einer Stunde ab. Die App fordert still ein neues an, und nur wenn das scheitert, kommt diese Meldung mit der Anmeldeseite. Still klappt es meist nur nach einem Klick (Google öffnet dafür kurz ein Fenster, das Browser sonst blockieren). Wer die App länger offen lässt, sieht nach etwa einer Stunde beim nächsten automatischen Neuladen die Anmeldeseite. Nach dem Anmelden lädt die App alles frisch.

- Neu anmelden.
- Wenn es sich ständig wiederholt: prüfen, ob die Person als Testnutzer im Google-Cloud-Projekt „PSNG Orga“ steht, und Cookies von Google für den Browser nicht blockieren (Anmeldung läuft über ein Popup).

## Meldungen bei der Anmeldung

| Meldung | Ursache und Lösung |
|---|---|
| „Anmeldung abgebrochen.“ | Popup wurde geschlossen. Nochmal klicken. |
| „Das Anmeldefenster wurde blockiert. Popups für diese Seite erlauben und erneut versuchen.“ | Popup-Blocker. Für die App-Domain erlauben. |
| „Das Google-Anmeldeskript konnte nicht geladen werden.“ | Kein Netz oder ein Blocker verhindert `accounts.google.com`. |
| „Anmeldung bei Google fehlgeschlagen.“ | Meist falsche Client-ID oder die Domain fehlt bei den autorisierten JavaScript-Quellen. In der Google Cloud Console prüfen. |
| „Die E-Mail-Adresse konnte nicht gelesen werden.“ | Der Scope `email` fehlt am Zustimmungsbildschirm. |
| „Ohne Zugriff auf Google Sheets funktioniert die App nicht. …“ | Beim Google-Fenster wurde das Häkchen für Tabellen (Sheets) abgewählt. Neu anmelden und alle Häkchen setzen. |
| „Anmeldung gerade nicht möglich.“ (Anmeldeseite, Produktion) | `VITE_GOOGLE_CLIENT_ID` fehlt im Vercel-Projekt für Production. Setzen und neu deployen. |
| Google zeigt „Zugriff blockiert“ | Die Person ist nicht als Testnutzer eingetragen (siehe „Neue Person ins Team“). |

## „Keine Freigabe“ und „Kein Zugang“

- „Kein Zugang“ (mit „Angemeldet als …“): die E-Mail steht nicht im Tab „Zugang“. Zeile anlegen, dann in der App „Abmelden“ und neu anmelden.
- „Keine Freigabe“ („Keine Freigabe für das Lecture-Sheet …“) und im Betrieb „Keine Berechtigung für dieses Sheet. Bitte im Google Drive Zugriff anfragen.“ (403): die Person hat in Google Drive keinen Zugriff auf das Sheet.
  - Im Drive prüfen, ob die Adresse als Editor eingetragen ist.
  - Das HR-Sheet ist nur für Personen mit Rolle `hr` freigegeben, nur sie sehen „Kandidat:innen“.

## „Google-Limit für Abrufe pro Minute erreicht. Eine Minute warten, dann neu laden.“ (429)

Google erlaubt etwa 60 Lesezugriffe pro Minute und Nutzer. Eine Minute warten, dann „Neu laden“.

## „Spalte „X“ fehlt im Tab Y.“

Jemand hat eine Spalte im Sheet umbenannt oder gelöscht. Die Apps Scripts hängen an den Spaltennamen, und die App findet die Spalte dann nicht mehr.

- Die Spalte wieder auf den alten Namen zurückbenennen (genau gleich geschrieben).
- Den Namen nicht „verbessern“, auch wenn er unschön wirkt.

## „Tab oder Bereich nicht gefunden. Wurde ein Tab umbenannt?“ und „Sheet oder Tab nicht gefunden.“

Ein Tab wurde umbenannt oder das Sheet ersetzt. Tab-Namen stehen in `src/data/config.ts` (`TABS`, `RANGES`). Name im Sheet zurückändern oder dort anpassen und neu deployen. Wurde das ganze Sheet neu erstellt: neue ID aus der URL in `SHEET_IDS` eintragen.

## „Zeile für … nicht gefunden. Neu laden und nochmal versuchen.“

Beim Speichern wurde die Zeile im Sheet nicht mehr gefunden (jemand hat sie gelöscht oder bei einem Talk Datum oder Speaker geändert). „Neu laden“ und die Änderung wiederholen. Gespeichert wurde nichts.

Kommt die Meldung bei einem Talk ohne Speaker oder bei zwei Zeilen mit gleichem Datum und Speaker: Der Talk ist im Sheet nicht eindeutig, die App schreibt dann lieber nicht. Im Sheet Speaker oder Datum ergänzen.

## „Die ID T… steht mehrfach im Tab To-dos. …“

Zwei Zeilen haben dieselbe ID. Die App schreibt in keine davon. Im Sheet einer Zeile die nächste freie ID geben. (Legen zwei Personen gleichzeitig ein To-do an, weicht die App selbst aus.)

## „„Spalte“ wurde inzwischen im Sheet geändert. Neu laden und nochmal versuchen.“

Beim Speichern der Eckdaten stand in der Zelle schon etwas anderes als beim Öffnen des Formulars: jemand hat parallel dieselbe Zelle geändert. Gespeichert wurde nichts. „Neu laden“, den neuen Stand ansehen, dann die eigene Änderung wiederholen.

## „Nur teilweise gespeichert (x von y Feldern). …“

Die App schreibt jede Zelle einzeln. Ist mittendrin die Verbindung weg, steht im Sheet ein halber Stand (z. B. Status „erledigt“ ohne Datum). „Neu laden“, prüfen und die Aktion wiederholen oder im Sheet ergänzen.

## „Text zu lang …“ und „Google hat den Wert abgelehnt. …“

Eine Zelle in Google Sheets fasst höchstens 50.000 Zeichen. Text kürzen, lange Notizen lieber in ein Doc und den Link eintragen.

## „Keine Verbindung zu Google. Netzwerk prüfen und neu laden.“

Netzwerkfehler. Siehe nächster Abschnitt.

## Offline

Die App ist installierbar (PWA) und speichert die zuletzt geladenen Daten lokal:

- Gespeichert werden **To-dos, Talks und die Zugangsliste**, in IndexedDB (Datenbank `psng-orga-cache`), höchstens 7 Tage. Wird eine neue App-Version ausgeliefert, wird der alte Cache verworfen.
- Telefonnummern von Speaker:innen (Spalten „Telefon“ und „Handynummer…“) werden vor dem Speichern geleert. Nach einem Neustart fehlen sie, bis die Talks frisch geladen sind.
- Schreibaktionen werden nie gespeichert.
- **Kandidat:innen (HR) werden nie gespeichert**, auch nicht kurz. Offline ist diese Ansicht leer oder zeigt nur, was im geöffneten Tab noch im Speicher liegt.
- Im Demo-Modus gibt es keinen Cache.
- Ohne Netz (oder wenn ein Abruf scheitert, aber Daten da sind) steht im Kopf der Ansicht „Offline, Stand TT.MM.JJJJ HH:MM“ mit dem Zeitpunkt der angezeigten Daten. Alle Schreib-Aktionen (abhaken, Notiz, neues To-do, Schritt, Eckdaten, Status) sind dann deaktiviert, mit dem Hinweis „Offline: Änderungen sind erst mit Verbindung möglich.“ Es wird nie offline geschrieben und nichts nachgeholt.
- Der Google-Token liegt nur im Arbeitsspeicher. Wer die App offline **neu startet**, sieht die Anmeldeseite und kann sich ohne Netz nicht anmelden. Der Lesecache hilft also, wenn die App schon offen ist, das Netz wegbricht und nach dem Wiederkommen wieder ein Abruf läuft. Das ist Absicht: kein Token auf der Platte.

### Cache löschen

- Normalerweise: in der App „Abmelden“. Das löscht den Lesecache und alle IndexedDB-Daten dieser Domain.
- Von Hand: Browser, Einstellungen, Websitedaten der App-Domain löschen (oder in den Entwicklertools unter „Application“, „Storage“, „Clear site data“). Danach neu laden.
- Bei seltsamen Daten nach einem Update: einmal abmelden und neu anmelden.
- Wechselt jemand am selben Gerät das Google-Konto, ohne vorher abzumelden, löscht die App die Daten des alten Kontos beim Anmelden (solange die App dazwischen nicht neu gestartet wurde). Auf geteilten Geräten trotzdem immer abmelden.

## Neue Person ins Team

Drei Dinge gehören zusammen, am besten in dieser Reihenfolge:

1. Zeile im Tab „Zugang“ anlegen: E-Mail (Google-Adresse der Person), Name (so erscheint er als Owner), Rollen (`kern`, `hr`, `admin`, kommagetrennt).
2. Im Google Drive die Freigaben setzen: Koordination To-dos und Lectures & Speaker als Editor, das HR-Sheet nur bei Rolle `hr`.
3. Die E-Mail als Testnutzer im Google-Cloud-Projekt eintragen (Zielgruppe).

Stolpersteine: Die Adresse muss in allen drei Schritten genau dieselbe sein (Google-Konto, nicht die Arbeitsadresse). Fehlt Schritt 3, zeigt Google „Zugriff blockiert“, fehlt Schritt 1, die App „Kein Zugang“, fehlt Schritt 2, „Keine Berechtigung für dieses Sheet“.

## Person verlässt das Team

Alle drei Schritte rückgängig machen:

1. Zeile im Tab „Zugang“ entfernen.
2. Freigaben im Google Drive entziehen (das ist der eigentliche Schutz).
3. Testnutzer im Google-Cloud-Projekt entfernen.

## Deploy kaputt

1. In Vercel unter „Deployments“ den letzten funktionierenden Stand suchen.
2. Die drei Punkte öffnen und „Promote to Production“ (oder „Rollback“) wählen.
3. Danach den fehlerhaften Commit in Ruhe prüfen und reparieren.

Wenn nach dem Deploy die Anmeldeseite „Anmeldung gerade nicht möglich.“ zeigt: In Vercel unter „Settings“, „Environment Variables“ prüfen, ob für Production `VITE_DATA=sheets` und `VITE_GOOGLE_CLIENT_ID` gesetzt sind. Die Werte werden beim Build eingebettet, also nach jeder Änderung neu deployen. Zeigt die Production Demo-Daten („Demo-Modus“ in der Kopfzeile), steht `VITE_DATA` auf `demo` oder fehlt.

## Alte Version bleibt hängen

Nach einem Deploy lädt die App im Hintergrund die neue Version und wechselt beim nächsten Neuladen. Bleibt eine alte Version hängen: Tab schließen und neu öffnen, notfalls Websitedaten der Domain löschen (siehe „Cache löschen“).
