# Spezifikation v1

Quelle: das alte Claude-Dashboard (lokal: `docs/reference/dashboard.html`, nicht im Repo). Diese Seite hält Datenmodell, Regeln und offene Fragen fest. Bei Widerspruch gilt diese Seite; Änderungen hier eintragen.

## Allgemeine Helfer (`src/domain/`)
- `rowsOf(values)`: Zeile 1 = Kopfzeile (getrimmt). Jede weitere Zeile wird ein Objekt `{Kopf: Wert}` (Werte getrimmte Strings) plus `_row` (Sheet-Zeilennummer, Kopf = 1). Zeilen, die nur leer oder TRUE/FALSE enthalten, fallen weg.
- `parseDate`: `T.M.JJ(JJ)` (zweistellig +2000) oder ISO `JJJJ-MM-TT`, sonst `null`. Lokale Mitternacht.
- `daysFrom(d)`: ganze Tage von heute (Mitternacht) bis `d`, gerundet. Heute wird injizierbar gehalten (Tests).
- `norm(s)`: klein, Akzente und unsichtbare Zeichen weg, Bindestriche/Gedankenstriche → Leerzeichen, Leerraum zusammengefasst.
- `yes(v)`: `true|wahr|ja|x|✓` (Groß/klein egal).
- Datumsformat beim Schreiben: `TT.MM.JJJJ`. Anzeige: `TT.MM.` (Jahr zweistellig, wenn nicht aktuelles Jahr).

## Talks (Lecture-Sheet)
**Bereiche:** `Lectures!A1:AF400`, `Speaker!A1:Z600`, `'Talk-Schritte'!A1:G5000`, `'Talk-Berichte'!A1:T400`, `'Speaker-Formular'!A1:AD400`. Ein `batchGet`. Bereit, sobald Lectures geladen ist. Refetch 15 Minuten.

**Spalten**
- Lectures: Datum, Speaker, Titel, Status, Uhrzeit, Ort, Format, Sprache, Reihe, Kooperation, Owner, Moderation, Event-Link, Luma, Veröffentlichung, Abstract, Notizen, TN vor Ort, TN online, TN gesamt, Views nach 4 Wo., YouTube-Link, Was gut lief, Was schlecht lief. Zeile zählt, wenn Speaker oder Titel gesetzt.
- Speaker: Name, Akad. Titel, Affiliation, Status, Thema, Kontakt via (PSNG), Empfohlen von, Endorsement, Endorsement-Text, Hat empfohlen, Letzter Kontakt, Nächster Schritt, Website / Social, Bio, E-Mail, Telefon (führendes `'` weg), Notizen.
- Talk-Schritte: Zeitpunkt, Talk, Schritt, Status, Owner, Von, Notiz. Neuester Eintrag je Schritt gewinnt (je Feld: letzter nicht leerer Status, Owner, Notiz).
- Talk-Berichte: Lecture (`TT.MM.JJJJ · Speaker` oder `ohne Datum · …`), Ausgefüllt von, Zeitstempel; Präfix-Spalten „Falls nicht in der Liste: Datum“, „Falls nicht in der Liste: Speaker“, „Neue Interessierte“.
- Speaker-Formular: über `col(row, präfix)` (exakt, sonst erste Kopfzeile, die mit dem Präfix beginnt): E-Mail, Vollständiger Name, Affiliation, Livestream, Fotos vom Abend, Freigabe der Präsentationsfolien, Technik, Interessenkonflikte, Sonstiges, Social Media, Porträtfoto, Kurzbio, Handynummer. Anzeige kürzt Antworten auf den Teil vor dem ersten `/`.

**Modell**
- `splitNames(Speaker)`: trennen an `,` `&` `/` ` und ` ` and `.
- `nn(name)`: `norm` ohne Titel (prof, dr, med, phil, rer, nat, pd, habil, msc, bsc, ma, ba, dipl, psych, phd), nur Buchstaben und Leerzeichen.
- `nameMatch(a,b)`: gleich nach `nn`; oder beide mehrteilig, gleicher Nachname und gleicher erster Buchstabe des Vornamens.
- Talk-Schlüssel: `TT.MM.JJJJ · <Speaker-Zelle getrimmt>`, ohne Datum `ohne Datum · …`.
- Speaker je Name: Zeile im Tab Speaker per `nameMatch`; Formular: letzte Antwort mit gleicher E-Mail (norm) oder `nameMatch(Vollständiger Name)`.
- Berichte: Lecture-Feld mit ` · ` → Speaker per `nameMatch` und gleiches Datum (wenn beide da). Sonst „Falls nicht in der Liste“-Felder: gleiches Datum und Nachname eines Speakers im Text.
- Log-Zuordnung: exakter Schlüssel; sonst Speaker-Teil per `nameMatch`, nur wenn genau ein Talk passt.
- `isOff`: Status enthält abgesagt oder pausiert. `isHeld`: nicht off und (Status durchgeführt/veröffentlicht oder Datum vergangen).
- `onsite`: Format enthält „vor ort“ oder „hybrid“. `online`: „online“ oder „hybrid“. `hasYT`: YouTube-Link enthält „youtu“. `pubOk`: Veröffentlichung beginnt nicht mit „nein“.
- `tnOf`: TN gesamt, sonst TN vor Ort + TN online.
- `coord(t)`: Owner, sonst „Polina“ (Anzeige „Standard, nicht eingetragen“).
- `TRACK_FROM = 29.10.2026` (Start der SOP).

**Rollen (Standard-Owner):** Koordination → coord; Marketing → Stela; Raum → online: coord, Reihe enthält BPSA: Eric, sonst „Lokale Orga“; Lokale Orga → BPSA: „BPSA-Orga“, sonst „Lokale Orga“; HR → Lennert; Schnitt/Upload → leer (= Owner fehlt); Website → Lennert. Im Log je Talk/Schritt überschreibbar.

**Schritte** (Schlüssel im Log, Text, Phase 0 Planung / 1 Vorbereitung / 2 Am Tag / 3 Nachbereitung, Rolle, Tage relativ zum Talk; `sop` = erst seit SOP Pflicht; `when` = nur wenn zutreffend; `auto` = aus Sheet erkannt):
| Schlüssel | Text | Ph | Rolle | Tage | sop | when | auto |
|---|---|---|---|---|---|---|---|
| Anfrage | Speaker angefragt | 0 | Koordination | -42 | | | Status nicht leer/„Idee“ |
| Zusage | Zusage und Termin fix | 0 | Koordination | -42 | | | Datum und Status fix/durchgeführt/veröffentlicht |
| Raum/Zoom | Raum bzw. Zoom organisiert | 0 | Raum | -28 | ✓ | | |
| Formular | Speaker-Formular eingegangen | 0 | Koordination | -21 | ✓ | | ein Speaker mit Formular oder Speaker-Spalte „Formular eingegangen“ |
| Freigaben | Freigaben geklärt (Stream, Aufnahme, Fotos) | 0 | Koordination | -21 | | | Veröffentlichung gesetzt |
| Briefing Marketing | Briefing an Team Marketing | 0 | Koordination | -21 | ✓ | | |
| Ankündigung | Grafik und Ankündigung online | 1 | Marketing | -14 | ✓ | | |
| Moderation | Moderation steht | 1 | Koordination | -7 | ✓ | | Moderation gesetzt |
| Apero | Apero danach organisiert | 1 | Lokale Orga | -3 | ✓ | onsite | |
| Reminder | Speaker erinnert, Technik geklärt | 1 | Koordination | -2 | ✓ | | |
| Geschenk | Speaker-Geschenk besorgt | 1 | Lokale Orga | -1 | ✓ | onsite | |
| Durchgeführt | Talk gehalten, Teilnehmende gezählt | 2 | Koordination | 1 | | | Status durchgeführt/veröffentlicht oder tnOf>0 |
| Talk-Bericht | Talk-Bericht ausgefüllt | 3 | Koordination | 2 | ✓ | | Bericht vorhanden oder „Was gut/schlecht lief“ |
| Interessierte | Interessierte ins HR-Sheet | 3 | HR | 2 | ✓ | Bericht mit „Neue Interessierte“ | |
| Dank | Dank und Endorsement-Anfrage | 3 | Koordination | 3 | ✓ | | alle Speaker mit Endorsement angefragt/ja |
| Recap | Recap-Post veröffentlicht | 3 | Marketing | 3 | ✓ | | |
| YouTube | Aufnahme geschnitten, auf YouTube | 3 | Schnitt/Upload | 7 | | pubOk | hasYT |
| Website | Video auf psng.info | 3 | Website | 10 | ✓ | pubOk | |
| Views | Views nach 4 Wochen eingetragen | 3 | Koordination | 28 | | hasYT oder pubOk | Views gesetzt |

**Schritt-Status** (in dieser Reihenfolge): `na` wenn Talk off, `when` falsch oder Log-Status „nicht nötig“; `done` wenn auto oder Log „erledigt“; `implied` wenn Talk gehalten und Phase < 2; `unk` wenn Datum < TRACK_FROM und sop; sonst `open`. Fällig = Datum + Tage. `late` = open und fällig < heute; `soon` = open und fällig in 0–7 Tagen.

**Flags je Talk** (keine, wenn off): crit „Überfällig“ (späte Schritte, mit Owner); warn „Bald fällig“ (Schritt bis Datum); crit „Owner fehlt“ (offene Schritte ohne Owner); in ≤21 Tagen und onsite ohne Ort: „Ort fehlt“ (crit ≤7 Tage, sonst warn); in ≤21 Tagen ohne Abstract: warn „Abstract fehlt“; YouTube-Link bei Veröffentlichung = nein: crit „Freigabe“; YouTube-Link aber Status nicht veröffentlicht: warn „Status“ mit Fix `Status=veröffentlicht`; sonst vergangen und Status fix/angefragt/Idee/leer: warn „Status“ mit Fix `Status=durchgeführt`; vergangen ohne Teilnehmende: warn „Zahlen“; Speaker fehlt im Tab Speaker: warn „Speaker“; Namensteil ≥4 Buchstaben weicht um genau einen Buchstaben von der E-Mail ab: warn „Schreibweise“. Prozess-Flags = Überfällig, Bald fällig, Owner fehlt; alle anderen = „Daten prüfen“.

**Lücken:** für die nächsten 4 Monate jeder Monat ohne Talk (nicht off): warn „Semesterplan“ („Ziel laut SOP: ein Talk pro Monat“).

**Handlungsbedarf:** Talks mit Flags plus Lücken; Rang crit vor warn, dann anstehend vor vergangen, dann Nähe zum heute.

**Ansicht Talks**
1. Nächster Talk (frühester ab heute, nicht off): „heute/morgen/in N Tagen“, Titel, Speaker, Datum + Uhrzeit, Reihe, Format, Ort, Fortschritt, „x von y Schritten“, „N überfällig“.
2. Kacheln (Filter-Schalter): Anstehend; Mit überfälligen Schritten (crit); Schritte fällig in 7 Tagen (warn); Schritt ohne Owner (crit); Daten prüfen (warn); Aufnahme ausstehend (gehalten, YouTube-Schritt offen, warn); Gehalten. Zahlen-Kacheln: Teilnehmende gesamt (gehaltene), YouTube-Views nach 4 Wo.
3. Handlungsbedarf-Liste mit Link zum Talk.
4. Filter: Suche (alle Spalten), Zeitraum (alle, anstehend, vergangen, ohne Termin), Reihe, Status, Owner (Lectures-Owner und Owner offener Schritte), mit Zählern; aktive Filter als Chips.
5. Liste gruppiert: Anstehend (aufsteigend), Vergangen (absteigend), Ohne Termin. Karte aufklappbar; der nächste Talk ist offen, bis jemand klickt. Kopf: Datum, Reihe · Format · Sprache · relativ, Titel, Speaker (Titel, Name, Affiliation), Status, Fortschritt, YouTube, TN, Anzahl Hinweise. Inhalt: Flags, Ablauf nach Phasen (Owner, Fälligkeit, Notiz aus Log; „Entfällt: …“), Eckdaten, Speaker-Block (Kontakt nur nach Klick „Kontakt anzeigen (nur intern)“), Abstract, „Nach dem Talk“ (gehaltene: TN vor Ort/online/gesamt, Views, YouTube-Link oder Hinweis, Lief gut/Verbessern, Berichte), verknüpfte To-dos (ab PR 3), Notizen, Link „Zeile N im Sheet“.
6. Zahlen: gehaltene Talks mit Datum, Balken TN und Views, „Ø N Teilnehmende pro Talk“.
7. Speaker-Pool: Kacheln je Status (Idee, angefragt, zugesagt, gesprochen, abgesagt, pausiert, dann unbekannte) plus „Endorsements erhalten“ (Endorsement = ja unter gesprochen). Ohne Filter ohne gesprochen/abgesagt. Karte: Thema, Kontakt via, Empfohlen von, Nächster Schritt, Endorsement (nur gesprochen), Letzter Kontakt, Notizen, „Talk am … öffnen“.

**Schreiben (PR 2):** Schritt-Änderung = neue Zeile in Talk-Schritte `[heute, Schlüssel, Schritt, Status, Owner, Von=Name aus Zugang, Notiz]`. Eckdaten = Zelle in Lectures; Zeile frisch lesen, Suche: gleiches Datum und exakte Speaker-Zelle, sonst `nameMatch`; nicht gefunden → „Zeile für X nicht gefunden. Neu laden und nochmal versuchen.“ Nicht änderbar: Speaker, TN gesamt.

## To-dos (Koordination) — PR 3
Bereich `'To-dos'!A1:R1000`, Refetch 5 Minuten. Spalten: ID, To-do, Status, Ebene, Modus, Ziel, Bereich, Prio, Deadline, Wartet auf, Delegiert an, Nächster Schritt, Quelle, Link, Erfasst, Erledigt, Notiz, Geändert. Werte: Status offen|läuft|wartet|geparkt|erledigt|verworfen; Ebene Schritt|Projekt|Ziel; Modus selbst|koordinieren|entscheiden|delegieren; Prio A|B|C. Regeln (isDone, late, week, waiting, touched, Owner = Delegiert an, sonst Wartet auf, sonst „Koordination“; Ziele, Kacheln, Sortierung, Gruppen, Mood) wie Referenz-Modul `T` (Zeilen 627–794). Abhaken: Status=erledigt, Erledigt=heute, Geändert=heute. Neues To-do: ID = höchste `T<n>` + 1 (zweistellig gepolstert), Erfasst und Geändert = heute, Quelle „App TT.MM.JJJJ“, Zeile per `append` in Kopfzeilen-Reihenfolge. Verknüpfte To-dos je Talk: Nachname (≥4 Zeichen) im Text aus To-do + Nächster Schritt + Notiz; oder Vorname, wenn Bereich Lectures / Ziel Lecture-Pipeline, mehrteiliger Name und Erfasst ≤60 Tage vom Talk.

## Kandidat:innen (HR, nur Rolle hr) — PR 4
Bereiche: `Kandidaten!A1:AA1000`, `Abbrüche!A1:AC1000`, `'Formularantworten 1'!A1:U500`, `Notizen!A1:E2000`. Stufen, Checkliste (10 Schritte), Fortschritt, Flags, Widerspruch zu To-dos, Mood wie Referenz-Modul `H` (Zeilen 799–1053). Schreiben nur in Kandidaten (Zeile per `norm(Vorname Nachname)`), nie für Abbrüche oder „Nur Formular“. Erlaubte Pipeline-Status beim Schreiben: Neu eingegangen, Warte auf Termin, 1:1 geführt, Probeaufgabe läuft, Review, Core, Helper, Pause, Abgesagt. Kontaktdaten nur nach Klick, nie in Listen, nie in Suche-Treffern angezeigt, nie offline gespeichert.

## Zugang
Tab `Zugang` im Lecture-Sheet: E-Mail, Name, Rollen (kommagetrennt: kern, hr, admin). Vergleich der Login-E-Mail klein geschrieben. Namen dieser Liste sind die Teamnamen (Owner-Auswahl, Avatare/Initialen).

## Offene Fragen
1. Mood-Meter im UI zeigen? (im Dashboard war es eine „Spielerei“; die Berechnung existiert in der Domain)
2. Tab `Konfiguration` (Schritte, Rollen): Spalten mit Lennert abstimmen, bevor er angelegt wird.
3. Talk-ID-Migration (Spalte `ID`, L001 ff.): eigene Aufgabe, Apps Script betroffen.
4. Avatare: Initialen statt Fotos (öffentliches Repo). Fotos nur, wenn das Team zustimmt.
5. Produktions-Domain (Vorschlag `app.psng.info`).
6. „Owner fehlt“ beim YouTube-Schritt (Schnitt/Upload) erscheint bei fast jedem Talk, weil dieser Schritt keinen Standard-Owner hat. Soll es einen geben (z. B. Medien-Team) oder soll der Hinweis bei diesem Schritt entfallen?
