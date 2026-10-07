# Zusammenarbeit mit Codex

Dieses Repository ist ein Schulungsprojekt für einen GitHub-Workflow. Der Nutzer lernt die Arbeit mit Issues, Branches, Tests und Pull Requests. Erkläre Schritte und Ergebnisse kurz auf Deutsch und führe Übungen in überschaubaren Schritten durch.

## Aufgaben und Git

- Beschreibe neue Aufgaben zuerst in einem Issue mit klaren Akzeptanzkriterien. Verwende ein vorhandenes Issue; lege kein Duplikat an. Bei einer neuen, bereits autorisierten Aufgabe darfst du selbst ein Issue anlegen. Kläre nur offene Fragen, die die Umsetzung wesentlich beeinflussen.
- Trenne Refinement und Umsetzung: Nach abgestimmten Akzeptanzkriterien aktualisiere nur das Issue und setze das Label `workflow:ready`. Eine Zustimmung wie „Passt so“ ist kein Umsetzungsauftrag. Beginne Branch, Code und Tests erst nach einem separaten ausdrücklichen Auftrag, z. B. „Setze Issue #20 um“.
- Beim ausdrücklichen Umsetzungsauftrag entferne `workflow:ready` und setze `workflow:in-progress` auf dem Issue. Die Actions-Automatisierung synchronisiert den Project-Status, wenn sie eingerichtet ist.
- Prüfe vor Änderungen den Git-Status und relevante Repository-Anweisungen. Bewahre bestehende Nutzeränderungen; überschreibe oder verwerfe sie nicht.
- Starte jede eigenständige Aufgabe auf einem eigenen Branch vom aktuellen `origin/main`. Aktualisiere dafür die Remote-Referenz. Prüfe bei laufenden Arbeiten, bevor du den Branch wechselst. Arbeite nicht direkt auf `main`.
- Verwende den bestehenden Checkout. Cloud-Aufgaben sind bereits isoliert; erstelle keinen Git-Worktree, sofern der Nutzer ihn nicht ausdrücklich verlangt.
- Halte Pull Requests klein: eine klar beschreibbare Aufgabe. Funktion, zugehörige Tests und Dokumentation gehören zusammen. Unabhängig rücknehmbare Änderungen erhalten eigene Commits mit verständlichen Titeln.
- Öffne nach Umsetzung und Prüfung einen Pull Request nach `main`. Verknüpfe die Aufgabe mit `Closes #<Issue-Nummer>`, wenn der PR sie vollständig löst. Dokumentiere Verhalten, relevante Prüfungen und verbleibende Einschränkungen.
- Merge einen Pull Request nur nach ausdrücklicher Freigabe für diesen Merge. Standardmäßig prüft und mergt der Nutzer selbst. Verwende `Create a merge commit`, damit einzelne Commits erhalten bleiben; kein Squash oder Rebase-Merge.
- Umgehe den Schutz von `main` nicht. Bei Merge-Konflikten erläutere die konkurrierenden Änderungen und kläre die gewünschte Lösung, wenn sie nicht bereits feststeht. Prüfe nach der Auflösung erneut die betroffenen Funktionen.
- Rücknahmen erfolgen ebenfalls über einen neuen Branch und Pull Request mit `git revert`. Erhalte die Historie; verwende kein Reset oder Force-Push, um veröffentlichte Änderungen zurückzunehmen.

## Entwicklung und Tests

Die App besteht aus `index.html` mit HTML, CSS und JavaScript. Sie benötigt keine Laufzeit-Abhängigkeiten. Für die automatisierten Tests verwenden wir Node.js 24, Python 3 und Playwright.

```sh
npm ci
npx playwright install --with-deps chromium
npm test
npm run test:pages
```

In der Codex-Cloud ist System-Chromium verfügbar. Verwende dort aus dem Repository-Verzeichnis:

```sh
npm --cache /tmp/vibe-npm-cache ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
npm run test:pages
```

- `npm test` prüft die App im Browser bei Desktop- und Smartphone-Breite. Playwright startet und stoppt seinen eigenen Server auf Port 8765. Stoppe bei Port-Konflikten keine fremden Prozesse.
- `npm run test:pages` prüft Vorschau-Builder und Bot-Kommentare. Führe es insbesondere bei Änderungen an der Deployment-Logik aus.
- Ergänze oder aktualisiere Tests für geändertes Verhalten und relevante Grenzfälle. Erfinde keine trivialen Tests für reine Text- oder Dokumentationsänderungen.
- Wähle Prüfungen passend zur Änderung. App-Änderungen erfordern die Browsertests; reine Dokumentationsänderungen benötigen keine wiederholten vollständigen Browserläufe. Der GitHub-Check `browser-tests` muss vor dem Merge erfolgreich sein.
- Untersuche Fehler und unterscheide App-Fehler, Testprobleme und Umgebungsprobleme. Entferne keine sinnvollen Prüfungen, um einen grünen Lauf zu erzwingen. Synchronisiere zeitabhängige Tests mit den tatsächlichen Browser-Ereignissen.
- Berichte lokale Ergebnisse und GitHub-Ergebnisse getrennt. Behaupte keine erfolgreiche Prüfung, die nicht ausgeführt oder bestätigt wurde. Prüfe Darstellung zusätzlich in der Vorschau; automatische Tests ersetzen keine visuelle Beurteilung.
- Bevorzuge bestehende Werkzeuge und wenige Abhängigkeiten. Bewahre TLS- und Paketprüfungen; speichere keine Zugangsdaten im Repository, in Logs oder im Chat.

## Review und Veröffentlichung

- GitHub Actions veröffentlicht die Hauptseite aus `main` unter `https://peevey.github.io/vibe_test/`.
- Offene Pull Requests aus diesem Repository erhalten nach erfolgreichem Deployment eine Vorschau unter `/vibe_test/previews/pr-<Nummer>/`. Der Bot veröffentlicht den Link im PR-Kommentar; die Actions-Zusammenfassung enthält ihn ebenfalls.
- Tests und Vorschau sind getrennte Ergebnisse. Eine erfolgreiche Vorschau beweist keine erfolgreichen Tests. Vorschauen werden nach dem Schließen oder Mergen beim nächsten erfolgreichen Deployment entfernt.
- Der Vorschau-Builder kopiert derzeit nur `index.html`, unterstützt keine Fork-PRs und führt keinen PR-Anwendungscode im Deployment-Runner aus. Bei zusätzlichen Assets muss die Lösung erweitert werden. Vorschauen teilen die Website-Origin mit der Hauptseite; für sensible Anwendungen oder unvertrauenswürdige Beiträge ist eine getrennte Vorschau-Architektur erforderlich.
- Lade keinen Code aus PR-Branches zur Ausführung in den privilegierten `pull_request_target`-Workflow. Verwende dort ausschließlich den vertrauenswürdigen Workflow-Code aus `main`.
- Prüfe nach dem Merge Tests und Deployment. Anschließend folgt ein kurzer Smoke-Test der veröffentlichten Funktion. Eine erfolgreiche Veröffentlichung und ein erfolgreicher Smoke-Test sind unterschiedliche Nachweise.
- Gemergte Branches dürfen nach Prüfung der Veröffentlichung aufgeräumt werden. Lösche offene Arbeitsbranches nicht ohne Auftrag; bewahre `main`.

## Project-Board

Wir verfolgen Aufgaben über Issues, nicht über zusätzliche PR-Karten:

- **Backlog:** Ideen und spätere Aufgaben.
- **Ready:** Beschreibung und Akzeptanzkriterien sind klar.
- **In Progress:** Die Umsetzung läuft auf einem Branch.
- **In Review:** Der Pull Request ist offen und die erforderlichen automatisierten Tests für seinen aktuellen Stand sind erfolgreich. Erst dann ist er bereit für das menschliche Review.
- **Done:** Die Änderung ist gemergt und auf der veröffentlichten Seite geprüft.

Die Automatisierung setzt Ready und In Progress anhand der Issue-Labels und In Review nach erfolgreichen Browser tests. Neue PR-Änderungen gehen während der erneuten Prüfung zurück nach In Progress. GitHub Actions benötigt dafür PROJECT_NUMBER und PROJECTS_TOKEN (siehe README). Direkter Project-Zugriff aus Codex ist dafür nicht erforderlich. Prüfe den Actions-Lauf, bevor du einen erfolgreichen Statuswechsel behauptest. Done bleibt nach dem Smoke-Test manuell.

Aktualisiere den Status, wenn die Project-Berechtigungen dies erlauben. Wenn der Zugriff scheitert, berichte das konkret und bitte den Nutzer um die Änderung; behaupte keinen erfolgreichen Statuswechsel. Das automatische Schließen eines Issues durch `Closes` bestätigt den Merge, aber noch nicht den Smoke-Test oder den Board-Status.
