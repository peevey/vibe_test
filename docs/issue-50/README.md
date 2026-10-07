# Visuelle Abnahme: Dinosaurier verfolgt die Rakete

| Ansicht | Vollständiger Zyklus | Reduzierte Bewegung |
| --- | --- | --- |
| Desktop, 1280 × 800 | [Animation](chase-desktop.gif) | [Ruhende Szene](reduced-desktop.png) |
| Smartphone, 390 × 844 | [Animation](chase-mobile.gif) | [Ruhende Szene](reduced-mobile.png) |
| Schmal, 320 × 844 | [Animation](chase-narrow.gif) | [Oben](reduced-narrow.png), [nach Scrollen](reduced-narrow-scrolled.png) |

Die GIFs zeigen jeweils den vollständigen 17-Sekunden-Zyklus mit vier Bildern
pro Sekunde. Die CSS-Animation wurde im System-Chromium schrittweise abgetastet;
übrige Animationen und der Symbolwechsel wurden nur für die Vergleichsaufnahmen
angehalten. In der App laufen sie mit ihrem bisherigen Verhalten weiter.

Visuell geprüft: Dinosaurier mit Kopf, Armen, Beinen und Schwanz erkennbar;
Rakete voraus, Dinosaurier in Flugrichtung ausgerichtet; flüssige Wiederholung
und kein Zusammenstoß. Auf Smartphones bleibt die Flugbahn im oberen freien
Streifen. Nach Scrollen zum Seitenende verwendet sie den unteren freien Rand.
Während die Karte den Bildschirm füllt, darf sie die Szene verdecken.

Die automatisierten Tests prüfen die Positionen alle 125 Millisekunden über
den gesamten Zyklus, die Orientierung an allen vier Wendepunkten, die
Zyklusgrenze, Resize und Scrollen sowie reduzierte Bewegung mit Umschalten.
Begrüßung, Zähler, Tastaturbedienung, Sternenhimmel und Kartensymbole werden
durch die bestehenden Tests weiter geprüft. Die finale Bildwirkung wird im PR
und in der veröffentlichten Vorschau menschlich abgenommen.
