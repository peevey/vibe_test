# Mein kleines HTML-Labor

Eine einfache App mit HTML, CSS und JavaScript, ohne externe Abhängigkeiten.

## Starten

`index.html` direkt in einem Browser öffnen. Alternativ einen lokalen Webserver starten:

```sh
cd /workspace/vibe_test
python3 -m http.server 8000 --bind 127.0.0.1
```

## Ausprobieren

- Die Hauptüberschrift verwendet eine verspielte lokale Schrift mit einem Verlauf von Hellviolett zu Rosa. Die verfügbare Schrift hängt vom Gerät ab; ohne Verlaufstext-Unterstützung bleibt die Schrift hellviolett.

- Zwei 96 Pixel große Weltall-Symbole stehen nebeneinander und drehen sich nicht. Der erste wechselt alle drei Sekunden in der Reihenfolge 🚀 → 🪐 → ⭐ → 🌙 → 🛸 → 🚀. Der zweite wechselt 🌍 → ☄️ → 🌟 → 🌌 → 👽 → 🌍, mit dem ersten Wechsel nach 1,5 Sekunden und danach alle drei Sekunden.
- Bei reduzierter Bewegung bleiben beide auf ihren Startsymbolen 🚀 und 🌍. Nach Deaktivierung dieser Einstellung startet der versetzte Zeitplan erneut.

- Einen Namen eingeben: Die Begrüßung passt sich an.
- „Neue Willkommensbotschaft“ wählt zufällig eine andere Begrüßung und berücksichtigt deinen Namen.
- Auf „+1 Klick“ klicken: Der Zähler steigt.
- Auf „−1 Klick“ klicken: Der Zähler sinkt bis null. Bei null ist der Button deaktiviert.
- „Zurücksetzen“ setzt den Zähler auf null und deaktiviert den Minus-Button.
- Der Zählerstand bleibt beim Neuladen im selben Browser erhalten. Hauptseite und jede PR-Vorschau speichern getrennte Werte. Nach dem Löschen der Website-Daten startet er wieder bei null.
- Falls Browserspeicherung gesperrt ist, bleibt der Zähler bedienbar, wird aber nicht dauerhaft gespeichert.
- Rakete, UFO, beide Hintergrundplaneten sowie Mond 🌙, Komet ☄️, Satellit 🛰️ und Alien 👽 schließen sich bei Mausannäherung einer Reihe entlang der Mausspur an. Fangradius: 100 CSS-Pixel; Abstand: 64 CSS-Pixel, in engen Kurven bei Bedarf größer, damit sich die Objekte nicht dauerhaft überlagern. Schnelles Wegziehen (mindestens 900 CSS-Pixel/s für 80 ms bei wachsendem Abstand zur Spitze) löst die ganze Reihe. Die Objekte kehren in etwa 800 ms weich auf ihre laufenden Bahnen zurück. Maus-Austritt und Fokusverlust lösen ebenfalls die Rückkehr aus. Touch-Eingaben sammeln keine Objekte; bei reduzierter Bewegung ist die Szene statisch. Der Dinosaurier wurde entfernt.
- Das dauerhafte Weltall-Design zeigt einen dunklen Sternenhimmel mit langsam bewegten Raumschiffen, Planeten und Sternen hinter der dunkelblauen Karte. Der Farbwechsel-Button entfällt. Bei reduzierter Bewegung bleibt auch die Hintergrundszene still.

Alles steckt in `index.html`, einschließlich des Sternenhimmelbildes. Änderungen werden nach dem Neuladen sichtbar.

### Sternenhimmel: Herkunft, Rechte und Einbindung

Das Bild wurde für Ticket #48 mit `scripts/generate-starfield.py` eigenständig
prozedural erzeugt; es enthält keine fremden Fotos oder Bildbestandteile.
Das erzeugte Bild wird unter **CC0 1.0** bereitgestellt
(https://creativecommons.org/publicdomain/zero/1.0/): freie Nutzung, Änderung und
Weitergabe ohne Namensnennung. Es ist eine synthetische Darstellung, kein Foto.
Unabhängig verteilte Positionen, unterschiedliche Helligkeiten, Größen und leicht
variierende Sternfarben vermeiden Raster und Kachelnähte.

Das 1920 × 1920 Pixel große WebP benötigt 27.000 Byte (36.000 Zeichen Base64)
und steckt als `data:image/webp;base64,…` in `.starfield`. `cover`, `center` und
`no-repeat` erhalten das Seitenverhältnis und beschneiden es bei Bedarf. Der
fixierte Szenenrahmen und 40 Pixel Überstand decken auch beim Scrollen, Resize
und an beiden Enden der vorhandenen Drift den Bildschirm ab. Als Ersatzfarbe
bleibt `#070b1a` sichtbar. Das Bild benötigt weder Netzwerkabrufe noch neue
Dateien im Vorschau-Builder; dessen unveränderte HTML-Kopie enthält es bereits.

Zum Reproduzieren: Pillow 12.3.0 in einer Python-Umgebung installieren und
`python scripts/generate-starfield.py` ausführen. Der feste Zufallsstartwert 48
liefert dieselbe Verteilung; Python/Pillow werden nur zur Bildherstellung benötigt,
nicht zur Laufzeit oder beim Pages-Build.

## Automatisierte Browsertests

Die App selbst benötigt weiterhin keine Abhängigkeiten. Für Tests sind Node.js 24 und Python 3 erforderlich:

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

Die Tests starten und stoppen ihren eigenen Webserver auf Port 8765. Geräteabhängige
Darstellung, reduzierte Bewegung und Eingaben werden im Desktop- und im
Smartphone-Projekt geprüft. Tests mit dem Tag `@once` laufen nur im Desktop-Projekt:
sie prüfen gemeinsame Funktionslogik oder setzen ihre Bildschirmgrößen selbst.
Die Sichtbarkeit der neuen Motive bei 1280, 390 und 320 Pixel Breite wird dadurch
jeweils einmal geprüft. Neue Tests laufen ohne diesen Tag weiterhin in beiden
Projekten. Die Zuordnung und der Laufzeitvergleich stehen in
[docs/issue-58/README.md](docs/issue-58/README.md).

Während der Entwicklung können betroffene Tests gezielt ausgeführt werden:

```sh
# Hintergrundobjekte und Mausinteraktion
npm test -- tests/chase.spec.js
# Zähler und Speicherung: gemeinsame Logik einmal
npm test -- --project=desktop --grep 'Zähler|speichern'
# Geräteabhängige Prüfungen auf Smartphone
npm test -- --project=mobile
# Auswahl ohne Ausführung kontrollieren
npm test -- --list
```

In der Cloud diese Befehle mit `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`
ausführen. Vor dem Push für einen Pull Request weiterhin einmal `npm test` ohne
Datei-, Projekt- oder Titel-Filter ausführen. Der erforderliche GitHub-Check
`browser-tests` führt ebenfalls die vollständige Suite aus.

Die Prüfungen decken Funktionen und horizontalen Überlauf ab; das Aussehen sollte
bei sichtbaren App-Änderungen zusätzlich visuell geprüft werden. Ein HTML-Bericht
liegt anschließend unter `playwright-report/index.html`, bei Fehlern inklusive Trace.

In der Codex-Cloud ist Chromium bereits unter `/usr/bin/chromium` installiert. Dort entfällt der Browserdownload:

```sh
npm --cache /tmp/vibe-npm-cache ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
```

GitHub Actions verwendet den zu Playwright passenden Browser; die Cloud-Prüfung verwendet den vorhandenen Systembrowser.

## Gemeinsamer Entwicklungsablauf

1. Das Ticket vollständig im Chat besprechen: Titel, Ziel, gewünschtes Verhalten, Akzeptanzkriterien und Abgrenzung. Nach Änderungen die vollständige Fassung erneut zeigen. Erst nach ausdrücklicher Freigabe genau diesen Text ins Issue übernehmen und anschließend Ready setzen. Die Umsetzung separat beauftragen.
2. Einen Branch vom aktuellen `main` erstellen; bestehende lokale Änderungen zuvor sichern.
3. Änderung umsetzen, passende Tests ergänzen und `npm test` ausführen.
4. Darstellung bei Desktop- und Smartphone-Breite visuell prüfen.
5. Jede unabhängig rücknehmbare Änderung einzeln committen und den Branch pushen.
6. Pull Request nach `main` öffnen. GitHub Actions führt die Browsertests aus und stellt den Bericht als Artefakt bereit.
7. Änderungen prüfen, auf grüne Tests warten und mit **Create a merge commit** mergen. Nicht squashen, wenn einzelne Commits erhalten bleiben sollen.
8. Wenn GitHub Pages auf `main` eingerichtet ist, die Veröffentlichung unter Actions abwarten und die veröffentlichte Seite kurz testen.

### Empfohlene GitHub-Einstellungen

Unter **Settings → Rules → Rulesets** eine Branch-Regel für `main` anlegen und aktivieren:

- Pull Request vor dem Merge verlangen.
- Erfolgreichen Statuscheck `browser-tests` verlangen. Er ist auswählbar, nachdem der erste Pull-Request-Test gelaufen ist.
- Force-Pushes und Löschen des Branches blockieren.

Für ein Solo-Projekt sind verpflichtende Fremdfreigaben nicht nötig. Je nach GitHub-Tarif und Repository-Sichtbarkeit können Branch-Regeln eingeschränkt sein.

Für unseren vereinbarten Ablauf unter **Settings → General → Pull Requests**:

- **Allow merge commits** aktivieren.
- **Allow squash merging** deaktivieren.
- **Allow rebase merging** deaktivieren.
- **Automatically delete head branches** aktivieren, damit gemergte Aufgabenbranches automatisch aufgeräumt werden.

Damit bietet GitHub nur **Create a merge commit** an und die einzelnen Commits bleiben erhalten. Die Branch-Schutzregeln und erforderlichen Tests gelten weiterhin. Diese Optionen sind GitHub-Einstellungen: Ein Dokumentations-PR ändert sie nicht. Ihre tatsächlichen Werte müssen nach der Einrichtung geprüft werden.

### Eine Änderung zurücknehmen

Einen neuen Branch vom aktuellen `main` erstellen, `git revert <Commit-ID>` ausführen, testen und einen Pull Request öffnen. Nach dem Merge veröffentlicht Pages die Rücknahme automatisch, sofern Pages für `main` aktiviert ist.

## Vorschau pro Pull Request

Der Workflow `Pages and PR previews` veröffentlicht die Hauptseite und zusätzliche Vorschauen offener Pull Requests aus diesem Repository:

```text
https://peevey.github.io/vibe_test/previews/pr-<Nummer>/
```

Die Vorschauen werden beim Öffnen, Aktualisieren und Schließen eines Pull Requests neu aufgebaut. Geschlossene Vorschauen verschwinden nach dem nächsten erfolgreichen Deployment. Die Hauptseite verwendet einen erfolgreich getesteten `main`-Commit. Nach erfolgreicher Veröffentlichung steht der Link direkt im Pull Request als Kommentar von `github-actions[bot]` sowie in der Zusammenfassung des Deployment-Laufs unter Actions. Der Bot aktualisiert seinen vorhandenen Kommentar, statt bei jedem Deployment einen neuen anzulegen. Tests und Vorschau sind separate Ergebnisse; eine erreichbare Vorschau bedeutet nicht, dass die Tests bestanden sind.

Bei jedem Auslöser wählt der Builder den neuesten verfügbaren grünen Commit aus der aktuellen `main`-Historie, dessen Push-Testlauf im Workflow `Browser tests` erfolgreich abgeschlossen ist. Die zuletzt gemeldeten `browser-tests`-Checks dieses Commits müssen ebenfalls erfolgreich abgeschlossen sein; ein laufender oder fehlgeschlagener erneuter Testversuch ist keine Freigabe. Der Builder kopiert anschließend genau diese Commit-ID und löst `main` nicht erneut auf. Ein verspäteter alter Testlauf kann damit keinen neueren verfügbaren grünen Stand zurücknehmen. Während neue `main`-Tests noch laufen oder fehlschlagen, können Vorschauen aktualisiert werden und die Hauptseite bleibt bei einem geeigneten früheren grünen Stand. Ohne geeigneten getesteten Stand stoppt das Deployment; die bestehende Pages-Veröffentlichung bleibt bestehen. Unter **Actions → Pages and PR previews** verlinkt die Zusammenfassung den ausgewählten Commit und Testlauf. Dies gilt auch für **Run workflow**.

Aktuell wird ausschließlich die eigenständige `index.html` kopiert. Für Apps mit zusätzlichen Bildern, CSS- oder JavaScript-Dateien muss der Builder erweitert werden. Pull Requests aus Forks erhalten keine Vorschau. Anwendungscode aus PRs wird im Deployment-Runner nicht ausgeführt. Die Vorschau ist öffentlich und teilt die Website-Origin mit der Hauptseite; daher nur vertrauenswürdige Beiträge verwenden und keine sensiblen Daten auf diesen Seiten speichern.

### Einmalige Aktivierung nach dem Merge

1. Unter **Settings → Pages → Build and deployment → Source** auf **GitHub Actions** umstellen.
2. Falls das Environment `github-pages` Branch-Einschränkungen hat: Unter **Settings → Environments → github-pages** den Branch `main` für Deployments erlauben. Der Workflow führt PR-Deployments im Kontext des Zielbranches aus.
3. Unter **Actions → Pages and PR previews → Run workflow** den Branch `main` auswählen und einmal starten.
4. Den erfolgreichen Lauf und die Hauptseite prüfen. Beim nächsten offenen Pull Request die Vorschau prüfen.

Der initiale Infrastruktur-PR kann noch keine eigene Vorschau erzeugen, weil GitHub den vertrauenswürdigen Workflow erst nach dem Merge von `main` ausführt.

Der Builder wird mit `npm run test:pages` getestet. Diese Tests prüfen die Auswahl des getesteten `main`-Commits, Hauptseite, Vorschau, Ausschluss von Forks und das Entfernen geschlossener Vorschauen. Die Browsertests laufen weiterhin mit `npm test`.

## Refinement, Umsetzungsauftrag und automatische Project-Status

Refinement und Umsetzung sind getrennte Schritte. Eine Zustimmung zur Aufgabenbeschreibung startet keine Implementierung.

Codex zeigt vor einer Aktualisierung in GitHub den vollständigen vorgeschlagenen
Issue-Text im Chat: Titel, Ziel, gewünschtes Verhalten, Akzeptanzkriterien und
Abgrenzung. Wir klären offene Fragen und besprechen diesen Text gemeinsam.
Nach Änderungen wird die vollständige überarbeitete Fassung erneut gezeigt.
Erst nach ausdrücklicher Freigabe übernimmt Codex genau diese Fassung ins Issue
und setzt es anschließend auf **Ready**. Ohne Freigabe bleiben Issue-Text und
Ready-Status unverändert. Beim Übertragen werden keine zusätzlichen Anforderungen
ergänzt. Die Umsetzung benötigt einen separaten Auftrag.

| Auslöser | Board-Status |
|---|---|
| Vollständiger Issue-Text im Chat freigegeben und in GitHub übernommen; Label `workflow:ready` | Ready |
| Separater ausdrücklicher Umsetzungsauftrag; Label `workflow:in-progress` | In Progress |
| Aktueller, offener PR nach main besteht den Workflow Browser tests | In Review |
| Neue PR-Änderung oder fehlgeschlagene Tests | In Progress |
| Merge, Veröffentlichung und bestätigter Smoke-Test | Done, weiterhin manuell |

Codex setzt erst nach ausdrücklicher Freigabe der vollständigen Fassung und deren Übernahme ins Issue das Ready-Label. Beim separaten Umsetzungsauftrag ersetzt es dieses durch das In-Progress-Label. Nur das Hinzufügen dieser beiden Labels startet die labelbasierte Status-Synchronisierung, keine Implementierung. Entfernen und andere Labels ändern den Board-Status nicht. Bereits entfernte Labels werden auch bei verspäteten Ereignissen ignoriert.

Die Labels kennzeichnen den beauftragten Arbeitsschritt; sie spiegeln nicht jeden späteren Board-Status. Der PR verknüpft das Issue über `Closes #<Nummer>`. Sobald ein passender offener PR vorhanden ist, hat sein aktueller Teststand Vorrang vor den Labels: erfolgreiche Tests bedeuten In Review, ausstehende oder fehlgeschlagene Tests In Progress. So setzt ein verspätetes Ready- oder In-Progress-Ereignis einen bereits grünen PR nicht zurück. Ein Entwurf bleibt bei Label-Ereignissen In Progress; PR- und Test-Ereignisse stufen Entwürfe nicht zur Prüfung hoch. Fork-PRs, geschlossene Issues und Testläufe für einen inzwischen veralteten PR-Stand werden nicht nach In Review gesetzt. Ein ausdrücklich angeforderter manueller Statuswechsel per Run workflow bleibt möglich.

Der Workflow `Project status` verwendet ausschließlich die Skripte aus main. Er führt keinen PR-Code aus. Die erforderliche Testsuite ist aktuell der Workflow `Browser tests` mit Browsertests und Workflow-Tests. Werden weitere Pflichtprüfungen eingeführt, muss die Statuslogik entsprechend erweitert werden. Verwende eine Aufgabe pro aktivem PR. Mehrere verknüpfte offene PRs aus diesem Repository nach main für dasselbe Issue werden als mehrdeutig gemeldet; der betroffene Status wird dann nicht geschrieben.

### Einmaliges Setup

Standardmäßig ist die Automatisierung deaktiviert. Nur die Repository-Variable `PROJECT_STATUS_ENABLED` mit dem exakten Wert `true` aktiviert Board-Änderungen. Ohne Aktivierung erscheint in der Workflow-Zusammenfassung **Nicht aktiviert**; pflege den Board-Status dann manuell. Ein grüner Lauf mit dieser Meldung bestätigt keinen Statuswechsel. Lasse den Schalter bis zur erfolgreichen Einrichtung unset oder auf `false`.

1. Öffne dein persönliches Project. Seine URL lautet beispielsweise `https://github.com/users/peevey/projects/1`; die letzte Zahl ist die Project-Nummer.
2. Unter Repository **Settings → Secrets and variables → Actions → Variables** eine Repository-Variable `PROJECT_NUMBER` mit dieser Zahl anlegen.
3. Unter deinen persönlichen GitHub-Einstellungen **Developer settings → Personal access tokens → Tokens (classic)** einen zeitlich begrenzten Token mit dem Scope **project** anlegen. Dieser Scope erlaubt das Bearbeiten persönlicher Projects. Für unser öffentliches Repository ist kein pauschaler `repo`-Scope nötig. Falls deine Organisation eine andere Authentifizierung verlangt, verwende deren unterstützte GitHub-App- oder Token-Konfiguration mit Project-Schreibrechten.
4. Den Token ausschließlich unter Repository **Settings → Secrets and variables → Actions → Secrets → New repository secret** als `PROJECTS_TOKEN` speichern. Keine Tokenwerte in Chat, Dateien oder Variablen eintragen. Notiere das Ablaufdatum; nach Ablauf muss das Secret sicher erneuert werden.
5. Das Project muss ein Single-Select-Feld `Status` mit den Optionen `Ready`, `In Progress` und `In Review` (Groß-/Kleinschreibung ist unerheblich; `In progress` und `In review` funktionieren ebenfalls) enthalten. Die Automatisierung fügt ein verknüpftes Issue bei Bedarf zum Project hinzu. Deaktiviere widersprechende native Project-Workflows, etwa „PR geöffnet → In Progress“ oder „Issue geschlossen → Done“, wenn diese unseren vereinbarten Ablauf überschreiben.
6. Nach dem Merge unter **Actions → Project setup check → Run workflow** den Branch `main` und ein offenes Test-Issue aus diesem Repository wählen. Aktiviere die ausdrückliche Bestätigung der Schreibprobe: Das Issue wird dem Project hinzugefügt (falls noch nicht vorhanden) und auf **Ready** gesetzt. Der Check prüft Project-Nummer, Secret, Project-Zugriff und alle drei Statusoptionen, bevor er diese Schreibprobe durchführt. Bei Fehlern die Ursache beheben und erneut prüfen.
7. Prüfe den erfolgreichen Setup-Lauf und die Testkarte im Board. Der Check aktiviert nichts selbst. Setze erst danach unter **Actions → Variables** die Repository-Variable `PROJECT_STATUS_ENABLED` auf `true`.
8. Teste anschließend Ready über das Issue-Label, In Progress nach einem separaten Umsetzungsauftrag und In Review nach erfolgreichen Tests des verknüpften aktuellen PRs. Bei Bedarf erlaubt **Actions → Project status → Run workflow** nach Aktivierung eine ausdrücklich angeforderte Statusänderung zu Ready oder In Progress.

Nach Aktivierung lassen fehlende Secrets, ungültige Project-Nummern, fehlende Statusoptionen und fehlende Rechte die Synchronisierung mit einer erklärenden Fehlermeldung scheitern. Abgelaufene Tokens bleiben ebenfalls echte Fehler. Vor Aktivierung erfolgen keine Synchronisierungsversuche; der separate manuelle Setup-Check meldet fehlende Konfiguration trotzdem als Fehler. Sie verhindern nicht die unabhängige App-Entwicklung. Statuswechsel sind erst nach erfolgreichem Workflow und Sichtprüfung des Boards bestätigt. Done bleibt nach dem Smoke-Test bewusst manuell.

Der Pflichtcheck für einen Merge bleibt `browser-tests`. Die optionale Project-Synchronisierung wird nicht als Pflichtcheck hinzugefügt. Zum Deaktivieren `PROJECT_STATUS_ENABLED=false` setzen; dadurch werden bereits gestartete Läufe nicht rückwirkend abgebrochen. Setup- und Aktivierungslogik werden durch `npm run test:pages` geprüft.
