# Mein kleines HTML-Labor

Eine einfache App mit HTML, CSS und JavaScript, ohne externe Abhängigkeiten.

## Starten

`index.html` direkt in einem Browser öffnen. Alternativ einen lokalen Webserver starten:

```sh
cd /workspace/vibe_test
python3 -m http.server 8000 --bind 127.0.0.1
```

## Ausprobieren

- Einen Namen eingeben: Die Begrüßung passt sich an.
- „Neue Willkommensbotschaft“ wählt zufällig eine andere Begrüßung und berücksichtigt deinen Namen.
- Auf „+1 Klick“ klicken: Der Zähler steigt.
- Auf „−1 Klick“ klicken: Der Zähler sinkt, auch unter null.
- „Zurücksetzen“ setzt den Zähler auf null.
- „Farbe wechseln“ wechselt die Hintergrundfarbe.

Alles steckt in `index.html`. Änderungen werden nach dem Neuladen sichtbar.

## Automatisierte Browsertests

Die App selbst benötigt weiterhin keine Abhängigkeiten. Für Tests sind Node.js 24 und Python 3 erforderlich:

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

Die Tests starten und stoppen ihren eigenen Webserver auf Port 8765. Sie prüfen sieben Abläufe jeweils bei Desktop- und Smartphone-Breite. Dazu gehören die Smiley-Animation und die Einstellung für reduzierte Bewegung. Das prüft Funktionen und horizontalen Überlauf; das Aussehen sollte zusätzlich visuell geprüft werden. Ein HTML-Bericht liegt anschließend unter `playwright-report/index.html`, bei Fehlern inklusive Trace.

In der Codex-Cloud ist Chromium bereits unter `/usr/bin/chromium` installiert. Dort entfällt der Browserdownload:

```sh
npm --cache /tmp/vibe-npm-cache ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
```

GitHub Actions verwendet den zu Playwright passenden Browser; die Cloud-Prüfung verwendet den vorhandenen Systembrowser.

## Gemeinsamer Entwicklungsablauf

1. Gewünschtes Verhalten und Grenzfälle beschreiben.
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

Unter **Settings → General → Pull Requests** „Allow merge commits“ aktivieren. Optional Squash-Merges deaktivieren, damit einzelne Änderungen erhalten bleiben.

### Eine Änderung zurücknehmen

Einen neuen Branch vom aktuellen `main` erstellen, `git revert <Commit-ID>` ausführen, testen und einen Pull Request öffnen. Nach dem Merge veröffentlicht Pages die Rücknahme automatisch, sofern Pages für `main` aktiviert ist.

## Vorschau pro Pull Request

Der Workflow `Pages and PR previews` veröffentlicht die Hauptseite und zusätzliche Vorschauen offener Pull Requests aus diesem Repository:

```text
https://peevey.github.io/vibe_test/previews/pr-<Nummer>/
```

Die Vorschauen werden beim Öffnen, Aktualisieren und Schließen eines Pull Requests neu aufgebaut. Geschlossene Vorschauen verschwinden nach dem nächsten erfolgreichen Deployment. Die Hauptseite bleibt auf dem Stand von `main`. Der Link steht auch in der Zusammenfassung des Deployment-Laufs unter Actions. Tests und Vorschau sind separate Ergebnisse; eine erreichbare Vorschau bedeutet nicht, dass die Tests bestanden sind.

Aktuell wird ausschließlich die eigenständige `index.html` kopiert. Für Apps mit zusätzlichen Bildern, CSS- oder JavaScript-Dateien muss der Builder erweitert werden. Pull Requests aus Forks erhalten keine Vorschau. Anwendungscode aus PRs wird im Deployment-Runner nicht ausgeführt. Die Vorschau ist öffentlich und teilt die Website-Origin mit der Hauptseite; daher nur vertrauenswürdige Beiträge verwenden und keine sensiblen Daten auf diesen Seiten speichern.

### Einmalige Aktivierung nach dem Merge

1. Unter **Settings → Pages → Build and deployment → Source** auf **GitHub Actions** umstellen.
2. Falls das Environment `github-pages` Branch-Einschränkungen hat: Unter **Settings → Environments → github-pages** den Branch `main` für Deployments erlauben. Der Workflow führt PR-Deployments im Kontext des Zielbranches aus.
3. Unter **Actions → Pages and PR previews → Run workflow** den Branch `main` auswählen und einmal starten.
4. Den erfolgreichen Lauf und die Hauptseite prüfen. Beim nächsten offenen Pull Request die Vorschau prüfen.

Der initiale Infrastruktur-PR kann noch keine eigene Vorschau erzeugen, weil GitHub den vertrauenswürdigen Workflow erst nach dem Merge von `main` ausführt.

Der Builder wird mit `npm run test:pages` getestet. Dieser Test prüft Hauptseite, Vorschau, Ausschluss von Forks und das Entfernen geschlossener Vorschauen. Die Browsertests laufen weiterhin mit `npm test`.
