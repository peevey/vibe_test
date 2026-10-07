# Visuelle Prüfung für Ticket #48

Aufgenommen mit System-Chromium, reduzierter Bewegung und identischen
Startsymbolen, damit die Änderung am Sternenhimmel vergleichbar bleibt.

| Ansicht | Vorher | Nachher |
| --- | --- | --- |
| Desktop, 1280 × 800 | [Vorher](before-desktop.png) | [Nachher](after-desktop.png) |
| Smartphone, 390 × 844 | [Vorher](before-mobile.png) | [Nachher](after-mobile.png) |
| Schmal, 320 × 844 | — | [Oben](after-narrow.png), [gescrollt](after-narrow-scrolled.png) |

Visuell geprüft: unregelmäßige Verteilung, unterschiedliche Sternhelligkeit,
keine Raster oder Kachelnähte, dunkle lesbare Karte und keine freien Ränder beim
Scrollen. Die vorhandenen Symbole und Bedienelemente bleiben sichtbar.
Die automatisierten Browsertests prüfen zusätzlich Resize, beide Enden der
Drift, horizontale Überläufe, Bedienbarkeit und reduzierte Bewegung.
