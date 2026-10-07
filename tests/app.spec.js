const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => { await page.goto('/index.html'); });

test('Smiley steht über der Überschrift und dreht sich dauerhaft', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const smiley = page.getByRole('img', { name: 'Lächelnder Smiley' });
  await expect(smiley).toBeVisible();
  const smileyBox = await smiley.boundingBox();
  const headingBox = await page.getByRole('heading', { level: 1 }).boundingBox();
  expect(smileyBox.y + smileyBox.height).toBeLessThan(headingBox.y);
  await smiley.evaluate(el => {
    const animation = el.getAnimations()[0];
    animation.pause();
    animation.currentTime = 0;
  });
  const initial = await smiley.evaluate(el => getComputedStyle(el).transform);
  await smiley.evaluate(el => { el.getAnimations()[0].currentTime = 1500; });
  expect(await smiley.evaluate(el => getComputedStyle(el).transform)).not.toBe(initial);
  const timing = await smiley.evaluate(el => el.getAnimations()[0].effect.getTiming());
  expect(timing.duration).toBe(6000);
  expect(timing.iterations).toBe(Infinity);
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
  const background = () => page.locator('html').evaluate(el => getComputedStyle(el).backgroundColor);
  const initial = await background();
  await page.getByRole('button', { name: 'Farbe wechseln' }).click();
  expect(await background()).not.toBe(initial);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Farbe wechseln' }).click();
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

test('Smiley wechselt genau nach zehn Sekunden durch alle fünf Gesichter', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  const smiley = page.getByRole('img', { name: 'Lächelnder Smiley' });
  await expect(smiley).toHaveText('🙂');
  await page.clock.runFor(9999);
  await expect(smiley).toHaveText('🙂');
  await page.clock.runFor(1);
  await expect(smiley).toHaveText('😄');
  for (const face of ['😎', '🤩', '😊', '🙂']) {
    await page.clock.runFor(10000);
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
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.reload();
  const smiley = page.getByRole('img', { name: 'Lächelnder Smiley' });
  await page.clock.runFor(10000);
  await expect(smiley).toHaveText('😄');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(smiley).toHaveText('🙂');
  await page.clock.runFor(30000);
  await expect(smiley).toHaveText('🙂');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(smiley).toHaveCSS('animation-name', 'spin');
  await page.clock.runFor(10000);
  await expect(smiley).toHaveText('😄');
});
