const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => { await page.goto('/index.html'); });

test('Smiley steht über der Überschrift und dreht sich nicht', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const smiley = page.getByRole('img', { name: 'Lächelnder Smiley' });
  await expect(smiley).toBeVisible();
  await expect(smiley).toHaveCSS('font-size', '96px');
  const smileyBox = await smiley.boundingBox();
  const headingBox = await page.getByRole('heading', { level: 1 }).boundingBox();
  expect(smileyBox.y + smileyBox.height).toBeLessThan(headingBox.y);
  await expect(smiley).toHaveCSS('animation-name', 'none');
  await expect(smiley).toHaveCSS('transform', 'none');
});

test('Smiley bleibt bei reduzierter Bewegung still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const smiley = page.getByRole('img', { name: 'Lächelnder Smiley' });
  await expect(smiley).toBeVisible();
  await expect(smiley).toHaveCSS('animation-name', 'none');
  await expect(smiley).toHaveCSS('transform', 'none');
});

test('Begrüßung berücksichtigt Namen und leere Eingaben', async ({ page }) => {
  await page.getByLabel('Wie heißt du?').fill(' Ada ');
  await expect(page.locator('#greeting')).toHaveText('Hallo, Ada! Schön, dass du da bist.');
  await page.getByLabel('Wie heißt du?').fill(' ');
  await expect(page.locator('#greeting')).toHaveText('Hallo! Schön, dass du da bist.');
});

test('Zähler bleibt mindestens null und synchronisiert den Minus-Button', async ({ page }) => {
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

test('Neue Botschaften wiederholen sich nicht direkt', async ({ page }) => {
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

test('Hintergrundfarbe wechselt und kehrt nach vier Klicks zurück', async ({ page }) => {
  const card = page.getByRole('main');
  await expect(card).toHaveCSS('background-color', 'rgb(232, 245, 238)');
  const background = () => page.locator('html').evaluate(el => getComputedStyle(el).backgroundColor);
  const initial = await background();
  expect(initial).toBe('rgb(241, 243, 250)');
  await page.getByRole('button', { name: 'Farbe wechseln' }).click();
  expect(await background()).not.toBe(initial);
  await expect(card).toHaveCSS('background-color', 'rgb(232, 245, 238)');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Farbe wechseln' }).click();
    await expect(card).toHaveCSS('background-color', 'rgb(232, 245, 238)');
  }
  expect(await background()).toBe(initial);
});

test('Layout passt ohne horizontalen Überlauf und Buttons sind per Tastatur bedienbar', async ({ page }) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '+1 Klick', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#counter')).toHaveText('1');
});

test('Zählerstand und Minus-Button bleiben nach Neuladen erhalten', async ({ page }) => {
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

test('Ungültige gespeicherte Zählerstände starten bei null', async ({ page }) => {
  for (const value of ['abc', '-1', '1.5', '', 'Infinity', '9007199254740992']) {
    await page.evaluate(value => localStorage.setItem('vibe-counter:/', value), value);
    await page.reload();
    await expect(page.locator('#counter')).toHaveText('0');
    await expect(page.getByRole('button', { name: '−1 Klick', exact: true })).toBeDisabled();
  }
});

test('Zähler funktioniert auch bei gesperrter Browserspeicherung', async ({ page }) => {
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

test('Hauptseite und PR-Vorschau speichern getrennte Zählerstände', async ({ page }) => {
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

test('Smiley wechselt genau nach drei Sekunden durch alle fünf Gesichter', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  const smiley = page.getByRole('img', { name: 'Lächelnder Smiley' });
  await expect(smiley).toHaveText('🙂');
  await page.clock.runFor(2999);
  await expect(smiley).toHaveText('🙂');
  await page.clock.runFor(1);
  await expect(smiley).toHaveText('😄');
  for (const face of ['😎', '🤩', '😊', '🙂']) {
    await page.clock.runFor(3000);
    await expect(smiley).toHaveText(face);
  }
});

test('Reduzierte Bewegung verhindert auch den automatischen Smiley-Wechsel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  const smiley = page.getByRole('img', { name: 'Lächelnder Smiley' });
  await page.clock.runFor(60000);
  await expect(smiley).toHaveText('🙂');
  await expect(smiley).toHaveCSS('animation-name', 'none');
});

test('Smiley reagiert auf Änderungen der Bewegungseinstellung', async ({ page }) => {
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
  const smiley = page.getByRole('img', { name: 'Lächelnder Smiley' });
  await page.clock.runFor(3000);
  await expect(smiley).toHaveText('😄');
  await expect(page.getByRole('img', { name: 'Zweiter Smiley' })).toHaveText('😁');
  await changeMotionPreference('reduce');
  await expect(smiley).toHaveText('🙂');
  await expect(page.getByRole('img', { name: 'Zweiter Smiley' })).toHaveText('😀');
  await page.clock.runFor(30000);
  await expect(smiley).toHaveText('🙂');
  await expect(page.getByRole('img', { name: 'Zweiter Smiley' })).toHaveText('😀');
  await changeMotionPreference('no-preference');
  await expect(smiley).toHaveCSS('animation-name', 'none');
  await page.clock.runFor(3000);
  await expect(smiley).toHaveText('😄');
  await expect(page.getByRole('img', { name: 'Zweiter Smiley' })).toHaveText('😁');
});

test('Hauptüberschrift ist verspielt, mit Farbverlauf und unverändertem Text', async ({ page }) => {
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveText('Hier wird experimentiert!');
  await expect(heading).toHaveCSS('font-family', '"Comic Sans MS", "Comic Sans", cursive');
  await expect(heading).toHaveCSS('background-image', 'linear-gradient(90deg, rgb(124, 58, 237), rgb(190, 24, 93))');
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
  await expect(heading).toHaveCSS('color', 'rgb(124, 58, 237)');
  await expect(heading).toHaveCSS('background-image', 'none');
});

test('Zweiter Smiley steht gleich groß rechts daneben, auch bei schmaler Smartphone-Breite', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const first = page.getByRole('img', { name: 'Lächelnder Smiley' });
  const second = page.getByRole('img', { name: 'Zweiter Smiley' });
  await expect(second).toBeVisible();
  await expect(second).toHaveCSS('font-size', '96px');
  await expect(second).toHaveCSS('animation-name', 'none');
  const a = await first.boundingBox(), b = await second.boundingBox();
  expect(b.x).toBeGreaterThanOrEqual(a.x + a.width);
  expect(b.y).toBe(a.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Beide Smileys wechseln im vollständigen Zyklus um 1,5 Sekunden versetzt', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  const first = page.getByRole('img', { name: 'Lächelnder Smiley' });
  const second = page.getByRole('img', { name: 'Zweiter Smiley' });
  await expect(first).toHaveText('🙂');
  await expect(second).toHaveText('😀');
  await page.clock.runFor(1499);
  await expect(first).toHaveText('🙂');
  await expect(second).toHaveText('😀');
  await page.clock.runFor(1);
  await expect(first).toHaveText('🙂');
  await expect(second).toHaveText('😁');
  for (const [a, b] of [
    ['😄', '😁'], ['😄', '😆'], ['😎', '😆'], ['😎', '🥳'],
    ['🤩', '🥳'], ['🤩', '😇'], ['😊', '😇'], ['😊', '😀'], ['🙂', '😀']
  ]) {
    await page.clock.runFor(1500);
    await expect(first).toHaveText(a);
    await expect(second).toHaveText(b);
  }
});

test('Beide Smileys bleiben bei reduzierter Bewegung auf ihren Startgesichtern', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  await page.clock.runFor(60000);
  await expect(page.getByRole('img', { name: 'Lächelnder Smiley' })).toHaveText('🙂');
  await expect(page.getByRole('img', { name: 'Zweiter Smiley' })).toHaveText('😀');
});
