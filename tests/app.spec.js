const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => { await page.goto('/index.html'); });

test('Hauptüberschrift steht mittig in der Karte, auch bei Zeilenumbruch', async ({ page }) => {
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveText('Hier wird experimentiert!');
    await expect(heading).toHaveCSS('text-align', 'center');
    const layout = await heading.evaluate(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const card = element.closest('main').getBoundingClientRect();
      return {
        center: card.x + card.width / 2,
        lines: Array.from(range.getClientRects(), rect => ({ x: rect.x, width: rect.width })),
        overflow: document.documentElement.scrollWidth > innerWidth
      };
    });
    expect(layout.overflow).toBe(false);
    for (const line of layout.lines) {
      expect(Math.abs(line.x + line.width / 2 - layout.center)).toBeLessThan(1);
    }
    if (width === 320) expect(layout.lines.length).toBeGreaterThan(1);
  }
});

test('Weltall-Symbol steht über der Überschrift und dreht sich nicht', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const smiley = page.getByRole('img', { name: 'Erstes Weltall-Symbol' });
  await expect(smiley).toBeVisible();
  await expect(smiley).toHaveCSS('font-size', page.viewportSize().width <= 600 ? '64px' : '96px');
  const smileyBox = await smiley.boundingBox();
  const headingBox = await page.getByRole('heading', { level: 1 }).boundingBox();
  expect(smileyBox.y + smileyBox.height).toBeLessThan(headingBox.y);
  await expect(smiley).toHaveCSS('animation-name', 'none');
  await expect(smiley).toHaveCSS('transform', 'none');
});

test('Weltall-Symbol bleibt bei reduzierter Bewegung still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const smiley = page.getByRole('img', { name: 'Erstes Weltall-Symbol' });
  await expect(smiley).toBeVisible();
  await expect(smiley).toHaveCSS('animation-name', 'none');
  await expect(smiley).toHaveCSS('transform', 'none');
});

test('Begrüßung berücksichtigt Namen und leere Eingaben', { tag: '@once' }, async ({ page }) => {
  await page.getByLabel('Wie heißt du?').fill(' Ada ');
  await expect(page.locator('#greeting')).toHaveText('Hallo, Ada! Schön, dass du da bist.');
  await page.getByLabel('Wie heißt du?').fill(' ');
  await expect(page.locator('#greeting')).toHaveText('Hallo! Schön, dass du da bist.');
});

test('Zähler bleibt mindestens null und synchronisiert den Minus-Button', { tag: '@once' }, async ({ page }) => {
  const minus = page.getByRole('button', { name: '−1 Klick', exact: true });
  const plus = page.getByRole('button', { name: '+1 Klick', exact: true });
  await expect(page.locator('#counter')).toHaveText('0');
  await expect(minus).toBeDisabled();
  await plus.click();
  await expect(page.locator('#counter')).toHaveText('1');
  await expect(minus).toBeEnabled();
  await plus.click();
  await expect(page.locator('#counter')).toHaveText('2');
  await minus.click();
  await expect(page.locator('#counter')).toHaveText('1');
  await expect(minus).toBeEnabled();
  await minus.click();
  await expect(page.locator('#counter')).toHaveText('0');
  await expect(minus).toBeDisabled();
  // Auch ein programmatisch ausgelöstes Ereignis darf die Untergrenze nicht umgehen.
  await minus.dispatchEvent('click');
  await expect(page.locator('#counter')).toHaveText('0');
  await expect(minus).toBeDisabled();
  await plus.click();
  await page.getByRole('button', { name: 'Zurücksetzen' }).click();
  await expect(page.locator('#counter')).toHaveText('0');
  await expect(minus).toBeDisabled();
});

test('Neue Botschaften wiederholen sich nicht direkt', { tag: '@once' }, async ({ page }) => {
  await page.getByLabel('Wie heißt du?').fill('Ada');
  for (let i = 0; i < 8; i++) {
    const previous = await page.locator('#greeting').textContent();
    await page.getByRole('button', { name: 'Neue Willkommensbotschaft' }).click();
    await expect(page.locator('#greeting')).not.toHaveText(previous);
    await expect(page.locator('#greeting')).toContainText('Hallo, Ada!');
  }
  await page.getByLabel('Wie heißt du?').fill('');
  await page.getByRole('button', { name: 'Neue Willkommensbotschaft' }).click();
  await expect(page.locator('#greeting')).toContainText('Hallo!');
});

test('Dauerhaftes Weltall-Design ersetzt den Farbwechsel', async ({ page }) => {
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(7, 11, 26)');
  await expect(page.getByRole('main')).toHaveCSS('background-color', 'rgb(18, 27, 54)');
  await expect(page.getByRole('main')).toHaveCSS('color', 'rgb(238, 243, 255)');
  await expect(page.getByLabel('Wie heißt du?')).toHaveCSS('background-color', 'rgb(11, 19, 40)');
  await expect(page.getByRole('button', { name: 'Farbe wechseln' })).toHaveCount(0);
  await expect(page.locator('.space-scene')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.space-scene')).toHaveCSS('pointer-events', 'none');
  await expect(page.locator('.starfield')).toBeVisible();
  await expect(page.locator('.space-object')).toHaveCount(9);
  for (const object of await page.locator('.space-object').all()) await expect(object).toBeVisible();
  await page.getByRole('button', { name: '+1 Klick', exact: true }).focus();
  await expect(page.locator('#increment')).toHaveCSS('outline-color', 'rgb(253, 230, 138)');
});

test('Weltall bewegt sich auf unterschiedlichen Bahnen und reagiert auf reduzierte Bewegung', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const motion = await page.locator('.space-scene').evaluate(scene => {
    const animations = scene.getAnimations({ subtree: true }).filter(animation => !animation.effect.target.matches('.chase-flier'));
    const samples = animations.map(animation => {
      animation.pause();
      animation.currentTime = 0;
      const before = getComputedStyle(animation.effect.target).transform;
      animation.currentTime = 2000;
      return { before, after: getComputedStyle(animation.effect.target).transform,
        duration: animation.effect.getTiming().duration, name: animation.animationName };
    });
    animations.forEach(animation => animation.play());
    return samples;
  });
  expect(motion).toHaveLength(10);
  expect(motion.every(sample => sample.before !== sample.after)).toBe(true);
  expect(new Set(motion.map(sample => sample.duration)).size).toBe(10);
  expect(new Set(motion.map(sample => sample.name)).size).toBe(test.info().project.name === 'mobile' ? 4 : 3);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const item of await page.locator('.space-object, .starfield').all()) {
    await expect(item).toHaveCSS('animation-name', 'none');
    await expect(item).toHaveCSS('transform', 'none');
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.starfield')).toHaveCSS('animation-name', 'star-drift');
});

test('Layout passt ohne horizontalen Überlauf und Buttons sind per Tastatur bedienbar', async ({ page }) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '+1 Klick', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#counter')).toHaveText('1');
});

test('Zählerstand und Minus-Button bleiben nach Neuladen erhalten', { tag: '@once' }, async ({ page }) => {
  const plus = page.getByRole('button', { name: '+1 Klick', exact: true });
  const minus = page.getByRole('button', { name: '−1 Klick', exact: true });
  await plus.click();
  await plus.click();
  await page.reload();
  await expect(page.locator('#counter')).toHaveText('2');
  await expect(minus).toBeEnabled();
  await minus.click();
  await page.reload();
  await expect(page.locator('#counter')).toHaveText('1');
  await page.getByRole('button', { name: 'Zurücksetzen' }).click();
  await page.reload();
  await expect(page.locator('#counter')).toHaveText('0');
  await expect(minus).toBeDisabled();
});

test('Ungültige gespeicherte Zählerstände starten bei null', { tag: '@once' }, async ({ page }) => {
  for (const value of ['abc', '-1', '1.5', '', 'Infinity', '9007199254740992']) {
    await page.evaluate(value => localStorage.setItem('vibe-counter:/', value), value);
    await page.reload();
    await expect(page.locator('#counter')).toHaveText('0');
    await expect(page.getByRole('button', { name: '−1 Klick', exact: true })).toBeDisabled();
  }
});

test('Zähler funktioniert auch bei gesperrter Browserspeicherung', { tag: '@once' }, async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await expect(page.locator('#counter')).toHaveText('0');
  await page.getByRole('button', { name: '+1 Klick', exact: true }).click();
  await expect(page.locator('#counter')).toHaveText('1');
  await page.getByRole('button', { name: 'Zurücksetzen' }).click();
  await expect(page.locator('#counter')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('Hauptseite und PR-Vorschau speichern getrennte Zählerstände', { tag: '@once' }, async ({ page }) => {
  await page.getByRole('button', { name: '+1 Klick', exact: true }).click();
  await page.route('**/previews/pr-10/', async route => {
    const response = await page.request.get('/index.html');
    await route.fulfill({ response });
  });
  await page.goto('/previews/pr-10/');
  await expect(page.locator('#counter')).toHaveText('0');
  await page.getByRole('button', { name: '+1 Klick', exact: true }).click();
  await page.getByRole('button', { name: '+1 Klick', exact: true }).click();
  await page.reload();
  await expect(page.locator('#counter')).toHaveText('2');
  await page.goto('/index.html');
  await expect(page.locator('#counter')).toHaveText('1');
});

test('Weltall-Symbol wechselt genau nach drei Sekunden durch alle fünf Symbole', { tag: '@once' }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  const smiley = page.getByRole('img', { name: 'Erstes Weltall-Symbol' });
  await expect(smiley).toHaveText('🚀');
  await page.clock.runFor(2999);
  await expect(smiley).toHaveText('🚀');
  await page.clock.runFor(1);
  await expect(smiley).toHaveText('🪐');
  for (const face of ['⭐', '🌙', '🛸', '🚀']) {
    await page.clock.runFor(3000);
    await expect(smiley).toHaveText(face);
  }
});

test('Reduzierte Bewegung verhindert auch den automatischen Weltall-Symbol-Wechsel', { tag: '@once' }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  const smiley = page.getByRole('img', { name: 'Erstes Weltall-Symbol' });
  await page.clock.runFor(60000);
  await expect(smiley).toHaveText('🚀');
  await expect(smiley).toHaveCSS('animation-name', 'none');
});

test('Weltall-Symbol reagiert auf Änderungen der Bewegungseinstellung', { tag: '@once' }, async ({ page }) => {
  async function changeMotionPreference(reducedMotion) {
    // CSS und das JavaScript-change-Ereignis werden nicht zwingend gleichzeitig aktualisiert.
    await page.evaluate(() => {
      window.motionPreferenceChanged = new Promise(resolve => {
        matchMedia('(prefers-reduced-motion: reduce)')
          .addEventListener('change', () => resolve(true), { once: true });
      });
    });
    await page.emulateMedia({ reducedMotion });
    await page.evaluate(() => window.motionPreferenceChanged);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  const smiley = page.getByRole('img', { name: 'Erstes Weltall-Symbol' });
  await page.clock.runFor(3000);
  await expect(smiley).toHaveText('🪐');
  await expect(page.getByRole('img', { name: 'Zweites Weltall-Symbol' })).toHaveText('☄️');
  await changeMotionPreference('reduce');
  await expect(smiley).toHaveText('🚀');
  await expect(page.getByRole('img', { name: 'Zweites Weltall-Symbol' })).toHaveText('🌍');
  await page.clock.runFor(30000);
  await expect(smiley).toHaveText('🚀');
  await expect(page.getByRole('img', { name: 'Zweites Weltall-Symbol' })).toHaveText('🌍');
  await changeMotionPreference('no-preference');
  await expect(smiley).toHaveCSS('animation-name', 'none');
  await page.clock.runFor(3000);
  await expect(smiley).toHaveText('🪐');
  await expect(page.getByRole('img', { name: 'Zweites Weltall-Symbol' })).toHaveText('☄️');
});

test('Hauptüberschrift ist verspielt, mit Farbverlauf und unverändertem Text', async ({ page }) => {
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveText('Hier wird experimentiert!');
  await expect(heading).toHaveCSS('font-family', '"Comic Sans MS", "Comic Sans", cursive');
  await expect(heading).toHaveCSS('background-image', 'linear-gradient(90deg, rgb(196, 181, 253), rgb(249, 168, 212))');
  await expect(heading).toHaveCSS('background-clip', 'text');
  const bodyFont = await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily);
  expect(bodyFont).not.toContain('Comic Sans');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Überschrift hat ohne Verlaufstext-Unterstützung eine sichtbare violette Ersatzfarbe', async ({ page }) => {
  // Simuliere einen Browser, der den @supports-Block nicht anwendet.
  await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
        const rule = sheet.cssRules[i];
        if (rule instanceof CSSSupportsRule && rule.conditionText.includes('background-clip')) sheet.deleteRule(i);
      }
    }
  });
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS('color', 'rgb(196, 181, 253)');
  await expect(heading).toHaveCSS('background-image', 'none');
});

for (const width of [1280, 600, 601, 390, 320]) {
  test(`Drei Weltall-Symbole sind bei ${width}px zentriert und vollständig sichtbar`, { tag: '@once' }, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const symbols = page.locator('.smileys [role="img"]');
    await expect(symbols).toHaveCount(3);
    const boxes = [];
    for (const symbol of await symbols.all()) {
      await expect(symbol).toBeVisible();
      await expect(symbol).toHaveCSS('font-size', width <= 600 ? '64px' : '96px');
      await expect(symbol).toHaveCSS('animation-name', 'none');
      await expect(symbol).toHaveCSS('transform', 'none');
      boxes.push(await symbol.boundingBox());
    }
    const card = await page.locator('main').boundingBox();
    const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
    expect(Math.abs((boxes[0].x + boxes[2].x + boxes[2].width) / 2 - (card.x + card.width / 2))).toBeLessThan(1);
    for (let i = 0; i < boxes.length; i++) {
      expect(boxes[i].x).toBeGreaterThanOrEqual(card.x);
      expect(boxes[i].x + boxes[i].width).toBeLessThanOrEqual(card.x + card.width);
      expect(boxes[i].y + boxes[i].height).toBeLessThan(heading.y);
      if (i) {
        expect(boxes[i].y).toBe(boxes[0].y);
        expect(boxes[i].x - boxes[i - 1].x - boxes[i - 1].width).toBeCloseTo(16, 1);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('Beide Weltall-Symbole wechseln im vollständigen Zyklus um 1,5 Sekunden versetzt', { tag: '@once' }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  const first = page.getByRole('img', { name: 'Erstes Weltall-Symbol' });
  const second = page.getByRole('img', { name: 'Zweites Weltall-Symbol' });
  await expect(first).toHaveText('🚀');
  await expect(second).toHaveText('🌍');
  await page.clock.runFor(1499);
  await expect(first).toHaveText('🚀');
  await expect(second).toHaveText('🌍');
  await page.clock.runFor(1);
  await expect(first).toHaveText('🚀');
  await expect(second).toHaveText('☄️');
  for (const [a, b] of [
    ['🪐', '☄️'], ['🪐', '🌟'], ['⭐', '🌟'], ['⭐', '🌌'],
    ['🌙', '🌌'], ['🌙', '👽'], ['🛸', '👽'], ['🛸', '🌍'], ['🚀', '🌍']
  ]) {
    await page.clock.runFor(1500);
    await expect(first).toHaveText(a);
    await expect(second).toHaveText(b);
  }
});

test('Alle drei Weltall-Symbole bleiben bei reduzierter Bewegung auf ihren Startsymbolen', { tag: '@once' }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Drittes Weltall-Symbol' })).toHaveText('🛰️');
  await page.clock.runFor(60000);
  await expect(page.getByRole('img', { name: 'Erstes Weltall-Symbol' })).toHaveText('🚀');
  await expect(page.getByRole('img', { name: 'Zweites Weltall-Symbol' })).toHaveText('🌍');
  await expect(page.getByRole('img', { name: 'Drittes Weltall-Symbol' })).toHaveText('🛰️');
});

test('Eingebetteter Sternenhimmel lädt auch in der Vorschau ohne weitere Ressourcen', async ({ page }) => {
  const failures = [];
  const requests = [];
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => { if (!response.ok()) failures.push(response.url()); });
  page.on('request', request => requests.push(request.url()));
  const html = await (await page.request.get('/index.html')).text();
  await page.route('**/previews/pr-48/', route => route.fulfill({ body: html, contentType: 'text/html' }));
  for (const url of ['/index.html', '/previews/pr-48/']) {
    await page.goto(url);
    await expect(page.locator('.chase-dinosaur')).toHaveCount(0);
    await expect(page.locator('.chase-rocket')).toHaveText('🚀');
    const image = await page.locator('.starfield').evaluate(async element => {
      const style = getComputedStyle(element);
      const source = style.backgroundImage.slice(5, -2);
      const image = new Image();
      image.src = source;
      await image.decode();
      return { source, width: image.naturalWidth, height: image.naturalHeight,
        repeat: style.backgroundRepeat, size: style.backgroundSize, color: style.backgroundColor };
    });
    expect(image.source).toMatch(/^data:image\/webp;base64,/);
    expect(image.width).toBeGreaterThanOrEqual(1920);
    expect(image.height).toBeGreaterThanOrEqual(1920);
    expect(image.repeat).toBe('no-repeat');
    expect(image.size).toBe('cover');
    expect(image.color).toBe('rgb(7, 11, 26)');
  }
  expect(failures).toEqual([]);
  expect(requests.every(url => new URL(url).origin === 'http://127.0.0.1:8765')).toBe(true);
  expect(requests).toHaveLength(2);
});

test('Sternenhimmel deckt den Bildschirm nach Resize, Scrollen und an beiden Drift-Enden ab', { tag: '@once' }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const bottom of [false, true]) {
      await page.evaluate(bottom => scrollTo(0, bottom ? document.body.scrollHeight : 0), bottom);
      for (const time of [0, 50000]) {
        const bounds = await page.locator('.starfield').evaluate((element, time) => {
          const animation = element.getAnimations()[0];
          animation.pause();
          animation.currentTime = time;
          const rect = element.getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
            overflow: document.documentElement.scrollWidth > innerWidth };
        }, time);
        expect(bounds.left).toBeLessThanOrEqual(0);
        expect(bounds.top).toBeLessThanOrEqual(0);
        expect(bounds.right).toBeGreaterThanOrEqual(viewport.width);
        expect(bounds.bottom).toBeGreaterThanOrEqual(viewport.height);
        expect(bounds.overflow).toBe(false);
      }
    }
  }
});

test('Drei Weltall-Symbole wechseln an ihren versetzten Grenzen durch vollständige Zyklen', { tag: '@once' }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  const symbols = page.locator('.smileys [role="img"]');
  const cycles = [
    ['🚀', '🪐', '⭐', '🌙', '🛸'],
    ['🌍', '☄️', '🌟', '🌌', '👽'],
    ['🛰️', '🌕', '✨', '👾', '🔭'],
  ];
  const expected = time => cycles.map((faces, i) => {
    const delay = [3000, 1500, 750][i];
    return faces[(time < delay ? 0 : 1 + Math.floor((time - delay) / 3000)) % faces.length];
  });
  await expect(symbols).toHaveText(expected(0));
  for (let time = 750; time <= 15000; time += 750) {
    await page.clock.runFor(749);
    await expect(symbols).toHaveText(expected(time - 1));
    await page.clock.runFor(1);
    await expect(symbols).toHaveText(expected(time));
  }
});

test('Wiederholtes Umschalten beendet ausstehende und laufende Emoji-Zeitgeber', { tag: '@once' }, async ({ page }) => {
  async function changeMotionPreference(reducedMotion) {
    await page.evaluate(() => {
      window.motionPreferenceChanged = new Promise(resolve => {
        matchMedia('(prefers-reduced-motion: reduce)')
          .addEventListener('change', () => resolve(true), { once: true });
      });
    });
    await page.emulateMedia({ reducedMotion });
    await page.evaluate(() => window.motionPreferenceChanged);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  const symbols = page.locator('.smileys [role="img"]');
  for (const elapsed of [500, 1000, 2000, 4500]) {
    await page.clock.runFor(elapsed);
    await changeMotionPreference('reduce');
    await expect(symbols).toHaveText(['🚀', '🌍', '🛰️']);
    await page.clock.runFor(30000);
    await expect(symbols).toHaveText(['🚀', '🌍', '🛰️']);
    await changeMotionPreference('no-preference');
    await expect(symbols).toHaveText(['🚀', '🌍', '🛰️']);
    await page.clock.runFor(749);
    await expect(symbols).toHaveText(['🚀', '🌍', '🛰️']);
    await page.clock.runFor(1);
    await expect(symbols).toHaveText(['🚀', '🌍', '🌕']);
    await page.clock.runFor(750);
    await expect(symbols).toHaveText(['🚀', '☄️', '🌕']);
    await page.clock.runFor(1500);
    await expect(symbols).toHaveText(['🪐', '☄️', '🌕']);
    await page.clock.runFor(750);
    await expect(symbols).toHaveText(['🪐', '☄️', '✨']);
  }
});
