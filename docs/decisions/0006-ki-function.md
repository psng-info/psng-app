# ADR 0006: „Mit Claude verarbeiten“ (v2) als Function hinter einem Schalter

Datum: 27.11.2026
Status: Prototyp (Entwurf, hinter Schalter, nicht live)

## Kontext

Im alten Dashboard konnte das Team Notizen vormerken, Claude daraus Sheet-Änderungen vorschlagen lassen und nach einer Vorschau schreiben. Die App ersetzt das Dashboard und soll das ohne Claude-Konto für alle im Kernteam können (CLAUDE.md, Funktionsumfang Punkt 4). Das ist die einzige Stelle, an der die App einen Server und laufende Kosten braucht. Der API-Schlüssel darf nie in den Browser.

## Entscheidung

**Ablauf**

1. Notizen werden in einer Warteschlange gesammelt: je To-do, je Person (HR), je Talk, dazu freie Einträge (Knopf mit Funkeln in der Kopfzeile). Noch nichts geht an Claude, noch nichts in ein Sheet.
2. Eine Leiste unten zeigt „N vorgemerkt · Mit Claude verarbeiten“.
3. Der Browser schickt die Notizen mit wenig Kontext an `POST /api/claude` (Vercel Function, Node, gleiche Herkunft, `Authorization: Bearer <Google-Token>`).
4. Die Function prüft das Token, die Zugangsliste und das Tageslimit, ruft die Anthropic Messages API auf und gibt einen geprüften Plan als JSON zurück. Sie schreibt nie.
5. Die App zeigt eine Vorschau als Diff (alt, neu) mit Haken pro Änderung. „Ergänzen/korrigieren“ rechnet den Vorschlag mit Zusatzanweisung neu, abgewählte Einträge bleiben abgewählt.
6. Erst „Ins Sheet schreiben“ schreibt, mit den vorhandenen Schreibfunktionen (Zeile frisch lesen, Schlüssel statt Zeilennummer, `safeCell`). Danach wird die Warteschlange geleert.

**Plan-Form** wie im Dashboard: `todo` (ID, Spalten), `hr` (Schlüssel, Spalten), `new` (neues To-do), `talk` (Schlüssel, Spalten in Lectures), `steps` (Orga-Schritte im Talk-Log), jeweils mit kurzer Begründung. Claude liefert `set` als Liste von Spalte und Wert, weil die strukturierte Ausgabe keine freien Objekt-Schlüssel erlaubt. Die Function macht daraus wieder ein Objekt und wirft alles weg, was nicht auf der Whitelist steht (Spalten, Schritte, Status).

**Strukturierte Ausgabe statt Tool-Zwang.** `output_config.format` mit JSON-Schema. `tool_choice` wird nicht erzwungen, das lehnen die neuen Modelle ab. Der Plan wird trotzdem ein zweites Mal geprüft (`parsePlan`), im Browser und in der Function.

**Modelle.** Standard `claude-haiku-5-5` (Aufwand `low`). Nur auf ausdrücklichen Wunsch („Gründlich“ in der Vorschau) `claude-sonnet-5-5` (Aufwand `medium`). Die IDs stehen an einer Stelle (`AI_MODELS` in `src/domain/ai/plan.ts`) und werden per Test festgehalten. Server-seitige Fallbacks bei Ablehnung sind nicht eingebaut: Eine Ablehnung bei Orga-Notizen ist unwahrscheinlich und wird als klare Meldung angezeigt.

**Grenzen.** Pro Anfrage höchstens 30 Einträge je Art, 20 freie Einträge, 2000 Zeichen je Notiz, 80 weitere offene To-dos zum Zuordnen, 120 000 Zeichen Body, `max_tokens` 8000, 50 s Timeout.

**Datenschutz**

- An Claude gehen nur die vorgemerkten Einträge und deren betroffene Zeilen, nur mit den änderbaren Spalten. Von Personen nur Schlüssel, Vorname und Pipeline-Felder. Nie Nachname, E-Mail, Telefon, Links, Formularantworten, Speaker-Kontakte.
- Doppelt gefiltert: im Browser beim Bauen der Anfrage und in der Function (`sanitizeRequest`, Spalten-Whitelist). Zusätzlich entfernt die Function E-Mail-Adressen, Telefonnummern und Links aus freiem Text.
- HR-Notizen nimmt die Function nur an, wenn die Person die Rolle `hr` hat. Notizen zu Personen werden nicht in `localStorage` gespeichert, nur im Speicher. To-do-, Talk- und freie Notizen liegen bis zum Verarbeiten in `localStorage` (nur Text) und werden beim Abmelden gelöscht.
- Die Function loggt weder Eingaben noch Antworten noch Tokens. Das Google-Token geht nie an Anthropic.
- Anthropic bekommt Orga-Text. Das gehört in die Datenschutzerklärung der App, bevor der Schalter live geht (offen, siehe unten).

**Zugriffsschutz in der Function.** Das Token wird per POST an `oauth2.googleapis.com/tokeninfo` geprüft: E-Mail verifiziert, `aud` gleich der eigenen Client ID (Umgebungsvariable `GOOGLE_CLIENT_ID`, sonst ginge jedes Google-Token einer fremden App), Scope Sheets enthalten. Dann liest die Function den Tab `Zugang` mit dem Token der Person. Wer das Sheet nicht sehen darf oder nicht auf der Liste steht, bekommt 403.

**Kosten und Limit (ehrlich)**

- Haiku 5.5 kostet 0,10 US-Dollar je Million Eingabe-Token und 0,50 je Million Ausgabe-Token (Stand 11/2026). Eine typische Anfrage mit einigen Notizen liegt weit unter einem Cent. Sonnet 5.5 kostet das Zwanzigfache, deshalb zählt „Gründlich“ beim Tageslimit dreifach.
- Tageslimit pro Person (`AI_DAILY_LIMIT`, Standard 20). Serverless-Instanzen teilen keinen Speicher, der Zähler lebt im Speicher der warmen Instanz und wird bei Kaltstart zurückgesetzt. Er bremst Dauerklicken, ist aber **keine harte Grenze**. Ein zentraler Zähler bräuchte Vercel KV (Extra-Dienst, Kosten) oder einen Schreibzugriff auf ein Sheet. Beides ist für den Prototyp zu viel.
- **Die harte Grenze ist das Ausgabenlimit in der Claude Console** auf dem PSNG-Konto (z. B. 10 US-Dollar im Monat). Ist es erreicht, antwortet Claude mit einem Fehler, die App zeigt eine Meldung, nichts Weiteres passiert.

**Schalter.** `VITE_AI=on` (Standard aus). Aus: kein Knopf, keine Leiste, keine Warteschlange, nichts in `localStorage`. Die Function liegt trotzdem im Deployment, antwortet aber ohne `ANTHROPIC_API_KEY` mit 503.

**Demo-Modus** nutzt einen deterministischen Mock-Planer (`src/domain/ai/mock.ts`). Kein Netzwerk, damit Tests und Vorschauen den ganzen Ablauf zeigen können.

**CSP.** Keine neue Herkunft im Browser: `connect-src 'self'` deckt `/api/claude` ab. Anthropic wird nur von der Function aus angesprochen.

## Folgen

- Neue Umgebungsvariablen nur bei Vercel: `ANTHROPIC_API_KEY` (Sensitive), `GOOGLE_CLIENT_ID`, optional `AI_DAILY_LIMIT`. Einrichtung im README.
- `plan.ts` wird von Browser und Function geteilt und hat deshalb keine Importe. Die Spaltenlisten sind Kopien der Schreib-Whitelists; `plan.test.ts` schlägt an, wenn sie auseinanderlaufen.
- Eine echte Antwort von Claude wurde im Prototyp nicht getestet (kein Schlüssel). Vor dem Einschalten: einmal mit echtem Schlüssel in der Vorschau-Umgebung durchspielen und prüfen, ob die Function auf Vercel mit der geteilten Datei (`../src/domain/ai/plan.js`) baut.
- Der Prompt ist aus dem Dashboard übernommen und gekürzt. Qualität am echten Material prüfen, bevor das Team darauf vertraut. Die Vorschau bleibt der Schutz.

## Offen

- Datenschutzerklärung und Auftragsverarbeitung (Anthropic) klären, bevor der Schalter live geht.
- Welche Person ist Admin der Claude Console, wer bekommt die Warnmails beim Ausgabenlimit.
- Brauchen wir eine harte Zählung (KV), falls das Limit in der Console zu grob ist?
