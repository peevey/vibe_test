# Testzuordnung und Laufzeit für #58

## Auswahl

Alle 34 bisherigen Testszenarien bleiben mit ihren Assertions erhalten.
Der Tag `@once` kennzeichnet 20 Szenarien, deren zweite Ausführung entfällt.
Das Smartphone-Projekt schließt nur diesen expliziten Tag über `grepInvert` aus;
ungekennzeichnete neue Tests laufen weiterhin in beiden Projekten.
`npm test` wählt damit 34 Desktop- und 14 Smartphone-Ausführungen, insgesamt 48.
Es gibt keine übersprungenen Tests innerhalb dieser Auswahl.

| Einmal geprüfter Bereich | Szenarien | Begründung |
|---|---:|---|
| Begrüßung, Willkommensbotschaften, Zähler und Speicherung | 7 | Gleiche JavaScript-Logik und Chromium-Speicherfunktionen unabhängig von der Bildschirmbreite. Eingabebedienung auf Smartphone bleibt im Touch-Test erhalten. |
| Emoji-Zyklen, Startwerte und Wechsel der Bewegungseinstellung | 5 | Zeitplan und JavaScript-MediaQuery-Reaktion sind unabhängig vom Viewport. CSS und Hintergrundverfolgung bei reduzierter Bewegung bleiben auf beiden Geräten geprüft. |
| Fangradius, Reihenfolge, Geschwindigkeit, Kurven und Reihe mit acht Objekten | 4 | Diese Tests setzen bereits ausdrücklich denselben 1280 × 800 Viewport beziehungsweise kontrollierte Objektpositionen. Die zweite Ausführung liefert keine zusätzliche Bildschirmgröße. |
| Sternenhimmel nach Resize und Scrollen an beiden Drift-Enden | 1 | Der Test prüft selbst 1280, 390 und 320 Pixel Breite. |
| Sichtbarkeit der neuen Motive außerhalb der Karte | 3 | Jeder Test setzt seine eigene Größe; 1280, 390 und 320 Pixel werden jeweils einmal geprüft. |

Die 14 Szenarien auf beiden Geräten erhalten insbesondere CSS und Layout,
Fokus und Tastaturbedienung, Smartphone- und Touch-Eingaben, Rückkehr nach
Scroll/Resize/Fokusverlust, reduzierte Hintergrundbewegung einschließlich
Umschalten und Ressourcenladung in Hauptseite und Vorschau.

## Vollständige Zuordnung

Die Titel entsprechen den Testdateien. „Beide“ bedeutet Desktop und Smartphone;
„Einmal“ bedeutet Desktop-Projekt mit gegebenenfalls selbst gesetztem Viewport.

| Szenario | Ausführung |
|---|---|
| Weltall-Symbol steht über der Überschrift und dreht sich nicht | Beide |
| Weltall-Symbol bleibt bei reduzierter Bewegung still | Beide |
| Begrüßung berücksichtigt Namen und leere Eingaben | Beide |
| Zähler bleibt mindestens null und synchronisiert den Minus-Button | Beide |
| Neue Botschaften wiederholen sich nicht direkt | Beide |
| Dauerhaftes Weltall-Design ersetzt den Farbwechsel | Beide |
| Weltall bewegt sich auf unterschiedlichen Bahnen und reagiert auf reduzierte Bewegung | Beide |
| Layout passt ohne horizontalen Überlauf und Buttons sind per Tastatur bedienbar | Beide |
| Zählerstand und Minus-Button bleiben nach Neuladen erhalten | Beide |
| Ungültige gespeicherte Zählerstände starten bei null | Beide |
| Zähler funktioniert auch bei gesperrter Browserspeicherung | Beide |
| Hauptseite und PR-Vorschau speichern getrennte Zählerstände | Beide |
| Weltall-Symbol wechselt genau nach drei Sekunden durch alle fünf Symbole | Beide |
| Reduzierte Bewegung verhindert auch den automatischen Weltall-Symbol-Wechsel | Beide |
| Weltall-Symbol reagiert auf Änderungen der Bewegungseinstellung | Beide |
| Hauptüberschrift ist verspielt, mit Farbverlauf und unverändertem Text | Beide |
| Überschrift hat ohne Verlaufstext-Unterstützung eine sichtbare violette Ersatzfarbe | Beide |
| Zweites Weltall-Symbol steht gleich groß rechts daneben, auch bei schmaler Smartphone-Breite | Beide |
| Beide Weltall-Symbole wechseln im vollständigen Zyklus um 1,5 Sekunden versetzt | Beide |
| Beide Weltall-Symbole bleiben bei reduzierter Bewegung auf ihren Startsymbolen | Beide |
| Eingebetteter Sternenhimmel lädt auch in der Vorschau ohne weitere Ressourcen | Beide |
| Sternenhimmel deckt den Bildschirm nach Resize, Scrollen und an beiden Drift-Enden ab | Beide |
| Weltall-Symbol steht über der Überschrift und dreht sich nicht | Beide |
| Weltall-Symbol bleibt bei reduzierter Bewegung still | Beide |
| Dauerhaftes Weltall-Design ersetzt den Farbwechsel | Beide |
| Weltall bewegt sich auf unterschiedlichen Bahnen und reagiert auf reduzierte Bewegung | Beide |
| Layout passt ohne horizontalen Überlauf und Buttons sind per Tastatur bedienbar | Beide |
| Hauptüberschrift ist verspielt, mit Farbverlauf und unverändertem Text | Beide |
| Überschrift hat ohne Verlaufstext-Unterstützung eine sichtbare violette Ersatzfarbe | Beide |
| Zweites Weltall-Symbol steht gleich groß rechts daneben, auch bei schmaler Smartphone-Breite | Beide |
| Eingebetteter Sternenhimmel lädt auch in der Vorschau ohne weitere Ressourcen | Beide |
| Acht Objekte behalten ihre Bahnen; Dinosaurier und Eingabeziele fehlen | Beide |
| Fangradius, stabile Reihe, langsame Richtungswechsel und Stillstand | Beide |
| Ein Sprung und schnelle Annäherung lösen nicht; schnelles Wegziehen löst die ganze Reihe | Beide |
| Rückkehr erreicht die laufende Bahn ohne Neustart; Austritt, Fokus, Scroll und Resize räumen auf | Beide |
| Reduzierte Bewegung beendet Verfolgung sofort und bleibt statisch, auch nach Umschalten | Beide |
| Touch sammelt nichts; Maus funktioniert bei Smartphone-Breite ohne Überlauf | Beide |
| Enge Kurven behalten auch nach Stillstand sichtbaren Abstand | Beide |
| Neue Motive lassen sich einzeln aufnehmen; Touch und reduzierte Bewegung bleiben statisch | Beide |
| Alle acht Objekte folgen mit stabiler Reihenfolge, werden freigegeben und erneut aufgenommen | Beide |
| Neue Motive sind außerhalb der Karte sichtbar bei 1280px | Beide |
| Neue Motive sind außerhalb der Karte sichtbar bei 390px | Beide |
| Neue Motive sind außerhalb der Karte sichtbar bei 320px | Beide |
| Acht Objekte behalten ihre Bahnen; Dinosaurier und Eingabeziele fehlen | Beide |
| Rückkehr erreicht die laufende Bahn ohne Neustart; Austritt, Fokus, Scroll und Resize räumen auf | Beide |
| Reduzierte Bewegung beendet Verfolgung sofort und bleibt statisch, auch nach Umschalten | Beide |
| Touch sammelt nichts; Maus funktioniert bei Smartphone-Breite ohne Überlauf | Beide |
| Neue Motive lassen sich einzeln aufnehmen; Touch und reduzierte Bewegung bleiben statisch | Beide |

## Messung

Zwei aufeinanderfolgende vollständige Läufe am 8. Oktober 2026 in derselben
Codex-Cloud-Umgebung, ohne parallel laufende Testsuite. Abhängigkeiten und Browser
waren bereits installiert. Keine Installation, GitHub-Wartezeit oder visuelle
Prüfung ist in der Laufzeit enthalten.

- Ausgangsstand: `ad55f018198b3f42184d6e5dff3075657f585d3c` (`main` nach #56).
- Linux x86_64, 3 sichtbare CPUs, Node.js 24.19.0, Playwright 1.63.0.
- System-Chromium 151.0.7922.173; Headless-Modus, zwei Worker, kein `CI`, keine Retries.
- Derselbe Python-Webserver und dieselben Projekt-/Viewport-Einstellungen.
- Laufzeit: Playwright-JSON-Bericht, `stats.duration`, einschließlich Suite-Start
  und Webserver. Testanzahl: ausgeführte Tests, nicht nur unterschiedliche Titel.

Befehl für beide Stände, lediglich mit unterschiedlichem Berichtspfad:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/issue-58-result.json \
npm test -- --workers=2 --reporter=list,json
```

| Stand | Tests | Laufzeit | Ergebnis |
|---|---:|---:|---|
| Vorher | 68 | 143.1 s | Alle erfolgreich, keine Retries |
| Nachher | 48 | 95.6 s | Alle erfolgreich, keine Retries |

Das sind 20 Ausführungen weniger (29,4 %) und in diesem Messpaar
47.5 Sekunden beziehungsweise 33.2 % kürzere Laufzeit.

Ein einzelnes Messpaar zeigt die Wirkung in dieser Umgebung; die genaue
Einsparung variiert mit Rechnerlast und Browser. Für einen Vergleich auf einem
anderen Rechner beide Stände mit identischer Worker-Anzahl und Browserversion
nacheinander ausführen. Die Worker-Vorgabe im Repository und in CI bleibt
unverändert. Die vollständige Suite vor dem PR und der erforderliche
GitHub-Check `browser-tests` bleiben erhalten.

## Prüfung der Auswahl

Die Playwright-Listen vor und nach der Änderung wurden nach Szenariotitel
abgeglichen: kein Szenario fehlt. Alle `@once`-Szenarien und die drei expliziten
Sichtbarkeitsgrößen erscheinen jeweils einmal, die übrigen Szenarien zweimal.
Die vollständige Suite prüft anschließend alle ausgewählten Szenarien tatsächlich.
Gezielte Entwicklungsbefehle stehen im Abschnitt „Automatisierte Browsertests“
der Haupt-README. Die App und die CI-Workflows wurden nicht verändert.
