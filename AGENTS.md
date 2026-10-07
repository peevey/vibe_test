# Zusammenarbeit mit Codex

Dieses Repository ist ein Schulungsprojekt für einen GitHub-Workflow mit einer
kleinen HTML-App. Erkläre Entscheidungen und Ergebnisse in einfachem Deutsch.
Setze nur den beauftragten Schritt um und halte Änderungen überschaubar.

## Auftrag und Refinement

- Lies das betroffene Issue und kläre gewünschtes Verhalten, Akzeptanzkriterien
  und relevante Grenzfälle. Prüfe dazu den vorhandenen Code.
- Refinement und Umsetzung sind getrennt: Zustimmung zur Aufgabenbeschreibung
  ist kein Umsetzungsauftrag. Nach abgestimmtem Refinement aktualisiere das
  Issue und setze `workflow:ready`.
- Beginne die Implementierung erst nach einem ausdrücklichen Umsetzungsauftrag.
  Dieser kann auch mehrere konkret benannte Arbeitsschritte autorisieren.
  Ersetze dann `workflow:ready` durch `workflow:in-progress`.
- Erstelle für neue beauftragte Änderungen ein Issue, sofern noch keines
  existiert. Stelle bereits beauftragte Arbeit nicht erneut zur Freigabe.

## Branches, Commits und Pull Requests

- Prüfe vor Änderungen den Git-Status und aktualisiere `origin/main` per Fetch.
  Erstelle den Aufgabenbranch vom aktuellen `origin/main` im bestehenden
  Checkout. Nutze ein Worktree nur auf ausdrücklichen Wunsch.
- Erhalte bestehende Nutzeränderungen. Überschreibe sie nicht und nimm nur
  aufgabenbezogene Änderungen in deine Commits auf.
- Arbeite über einen Branch und Pull Request pro zusammenhängender,
  überprüfbarer Änderung. Code, zugehörige Tests und Dokumentation gehören
  zusammen. Trenne unabhängig rücknehmbare Änderungen in eigene Commits.
- Pushe den getesteten Stand und öffne einen PR nach `main`. Verknüpfe das
  Issue mit `Closes #<Nummer>`. Beschreibe das Ergebnis, die Prüfung und
  verbleibende Einschränkungen für einen Leser ohne Chat-Kontext.
- Pushe nicht direkt auf `main`, umgehe keine Schutzregeln und führe keinen
  Force-Push ohne ausdrücklichen Auftrag aus.
- Der Nutzer prüft und mergt. Merge einen PR nur auf ausdrücklichen Auftrag.
  Unsere vereinbarte Methode ist **Create a merge commit**, damit einzelne
  Commits erhalten bleiben. GitHub erlaubt derzeit auch andere Methoden.
- Rücknahmen erfolgen als `git revert` auf einem neuen Branch mit Prüfung und
  PR. Bereits veröffentlichte Historie wird nicht umgeschrieben.

## Umsetzung und Prüfung

- Die App liegt vollständig in `index.html` und benötigt keine externen
  Laufzeit-Abhängigkeiten. Der Vorschau-Builder kopiert aktuell nur diese Datei.
  Änderungen an dieser Struktur erfordern eine Anpassung des Builders.
- Leite Tests aus Akzeptanzkriterien ab. Prüfe relevante Grenzfälle und
  bestehende Funktionen, die von der Änderung betroffen sein könnten.
  Ändere eine Erwartung nicht allein deshalb, weil die Implementierung
  einen anderen Wert liefert; prüfe zuerst das vereinbarte Verhalten.
- Für App-Änderungen führe `npm test` aus. Prüfe sichtbare Änderungen zusätzlich
  auf Desktop und Smartphone, einschließlich Lesbarkeit, Bedienbarkeit,
  horizontalem Überlauf und reduzierter Bewegung, soweit betroffen.
- Für Workflow- und Vorschau-Änderungen führe `npm run test:pages` aus und
  ergänze sinnvolle Tests für das geänderte Verhalten. Bei zusätzlicher
  App-Auswirkung führe auch die Browsertests aus.
- Reine Dokumentationsänderungen benötigen keinen lokalen Browserlauf.
  Prüfe Inhalt, Konsistenz und `git diff --check`. Der erforderliche
  GitHub-Check bleibt auch für solche PRs bestehen.
- In der Cloud lautet der Browser-Testbefehl:
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`.
  Falls Test-Abhängigkeiten fehlen, verwende
  `npm --cache /tmp/vibe-npm-cache ci`. Die regulären Setup-Befehle stehen
  in `README.md`.
- Melde ausgeführte, erfolgreiche, fehlgeschlagene und nicht ausgeführte
  Prüfungen korrekt. Warte auf die GitHub-Checks des aktuellen PR-Stands oder
  kennzeichne laufende Checks ausdrücklich. Grüne Tests ersetzen kein Review
  der Akzeptanzkriterien und keinen visuellen Test.

## Vorschau, Board und Veröffentlichung

- Die PR-Vorschau steht nach erfolgreichem Deployment im Bot-Kommentar und
  unter `https://peevey.github.io/vibe_test/previews/pr-<Nummer>/`.
  Eine veröffentlichte Vorschau bestätigt keine erfolgreichen Tests.
- Der Project-Workflow setzt nach dem Ready-Label den Status **Ready**, nach
  dem Umsetzungsauftrag **In progress** und nach erfolgreichen Tests des
  aktuellen offenen PRs **In review**. Neue Änderungen oder fehlgeschlagene
  Tests setzen ihn zurück auf **In progress**. Entwurfs-PRs werden nicht zur
  Prüfung hochgestuft. Verwende nur einen aktiven PR pro Issue.
- Labels kennzeichnen Refinement und Umsetzungsauftrag, nicht jeden späteren
  Board-Status. Nur ihr Hinzufügen löst die labelbasierte Synchronisierung aus.
  Bei einem passenden offenen PR hat dessen aktueller Teststand Vorrang vor
  den Labels. Mehrere passende offene PRs für ein Issue führen zu einer
  Fehlermeldung statt einem beliebigen Statuswechsel.
- **In review** bedeutet bereit für menschliche Prüfung. **Done** folgt erst
  nach Merge, erfolgreicher Veröffentlichung und bestätigtem Smoke-Test.
  Done wird derzeit manuell gepflegt.
- Prüfe den zugehörigen Synchronisierungslauf, bevor du einen Board-Wechsel
  als erfolgreich meldest. Wenn die Anzeige hinterherhinkt, hilft oft ein
  Neuladen oder ein Wechsel zur Tabellenansicht. Bleibt die Karte unsichtbar,
  prüfe Status, Filter und Project-Zuordnung statt sie blind neu anzulegen.
- Berichte zum Abschluss den PR-Link, das Testergebnis, den Vorschau-Link
  beziehungsweise ihren Veröffentlichungsstand und den nächsten Nutzerschritt.
- Nach dem Merge prüfe die Veröffentlichung und bitte den Nutzer um einen
  kurzen Test der betroffenen Funktionen auf der Hauptseite:
  `https://peevey.github.io/vibe_test/`.
- Pages veröffentlicht genau einen erfolgreich getesteten `main`-Commit.
  Prüfe Commit und Testlauf in der Deployment-Zusammenfassung. Ein erfolgreiches
  Vorschau-Deployment kann noch einen früheren grünen Hauptseiten-Stand enthalten,
  während die Tests für den neuen `main`-Stand laufen. Ein Merge allein bestätigt
  deshalb noch nicht seine Veröffentlichung.
- Speichere Tokens ausschließlich als Secrets. Gib keine Secret-Werte aus.
  Beachte bei Workflow-Änderungen die bestehende Trennung: privilegierte
  Workflows laden ihre Skripte von `main` und führen keinen PR-Code aus.
