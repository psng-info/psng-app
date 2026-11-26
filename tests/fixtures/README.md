# Test-Fixtures

Diese Dateien sind **synthetisch und anonymisiert**. Sie enthalten keine echten Personen, E-Mail-Adressen, Telefonnummern oder Freitexte.

## Entstehung
- Kopfzeilen, Datums- und Statusformate, Checkbox-Werte (TRUE/FALSE), IDs, Reihen, Prios, Ebenen usw. stammen unverändert aus den echten Sheets, damit die Parser gegen reale Strukturen getestet werden (inkl. weggelassener Endzellen und leerer Zeilen).
- Alle Namen sind erfunden (Speaker, Kandidat:innen). E-Mails: `@example.org`, Telefon: `+49 000 0000000`, Links: `example.org` bzw. `https://youtu.be/demoN`. Teamnamen erscheinen nur als Vornamen.
- Freitexte sind neutrale Platzhalter. Szenarien, die in den echten Daten fehlten, wurden synthetisch ergänzt.

## Dateien
- `talks.json`: `lectures`, `speakers`, `steps`, `reports`, `speakerForm`
- `todos.json`: `todos`
- `hr.json`: `kandidaten`, `abbrueche`, `formular`, `notizen`

Format: rohe 2D-String-Arrays wie von der Sheets-API (Zeile 1 = Kopfzeile).

## Referenzdatum
Die Szenarien setzen **heute = 2026-11-26** voraus (Tests müssen "heute" injizieren).

Enthalten u. a.: Talk in 4 Tagen (online, Doppel-Speaker), Talk in 7 Tagen (vor Ort, Ort leer), Talk in 19 Tagen (hybrid, Ort und Abstract leer, Speaker nicht im Tab), Talks vor SOP-Start (29.10.2026), vergangene Talks mit/ohne YouTube, abgesagter Talk, Schreibweise-Abweichung (Name/E-Mail), überfällige und bald fällige To-dos, Ziele (Ebene=Ziel), alle HR-Stufen, Abbrüche und eine Person nur im Formular.
