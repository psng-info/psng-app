# ADR 0002: Login mit Google Identity Services und zwei Scopes

Datum: 26.11.2026
Status: angenommen

## Kontext

Die App liest und schreibt Google Sheets direkt im Browser. Dafür braucht sie ein Zugriffstoken des Nutzers. Der Login läuft über Google Identity Services im Token-Client-Modus, ohne eigenen Server.

Ursprünglich war nur der Scope für Sheets vorgesehen. Die App braucht aber die E-Mail-Adresse der angemeldeten Person. Sie gleicht sie mit dem Tab „Zugang“ im Lecture-Sheet ab, um die Anzeige zu steuern. Später prüft auch die KI-Function (v2) das Google-Token gegen dieselbe Liste.

## Entscheidung

Scopes:

- `https://www.googleapis.com/auth/spreadsheets`
- `openid email`

Das ist eine Abweichung vom Brief, der nur `spreadsheets` vorsah. Der Drive-Scope wird bewusst nicht angefragt. Die Rechte an den Sheets regelt Google Drive über die Freigaben, die App braucht dafür keinen eigenen Zugriff.

Das Token läuft nach einer Stunde ab. Die App fordert dann still ein neues an, ohne dass sich die Person erneut anmelden muss.

Die Google-App bleibt im Testmodus. Sensible Scopes sind im Testmodus erlaubt, dafür gilt eine Grenze von 100 Testnutzern. Die Teammitglieder werden als Testnutzer eingetragen.

## Folgen

- Die App sieht die E-Mail-Adresse. Sie wird nur für den Abgleich genutzt und nirgends gespeichert oder geloggt.
- Neue Teammitglieder brauchen einen Eintrag als Testnutzer im Google-Cloud-Projekt, sonst kommt der Login nicht durch.
- Die Grenze von 100 Testnutzern reicht für das Kernteam. Für eine öffentliche Nutzung müsste die App verifiziert werden.
