const { test, expect } = require('@playwright/test');

const object = (page, name) => page.locator(`[data-follow="${name}"]`);
async function center(locator) {
  return locator.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
}
async function move(page, x, y, time = 20, type = 'mouse') {
  await page.clock.runFor(time);
  if (type === 'mouse') await page.mouse.move(x, y);
  else await page.evaluate(({ x, y, type }) => window.dispatchEvent(new PointerEvent('pointermove', {
    clientX: x, clientY: y, pointerType: type
  })), { x, y, type });
}
async function capture(page, name) {
  const point = await center(object(page, name));
  await move(page, point.x, point.y);
  await expect(object(page, name)).toHaveAttribute('data-motion', 'following');
  return point;
}
async function freezeOrbits(page, time = 0) {
  await page.evaluate(time => document.querySelectorAll('[data-follow]').forEach(el => {
    el.getAnimations().forEach(a => { a.pause(); a.currentTime = time; });
  }), time);
}
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1000));
  await page.goto('/index.html');
  await freezeOrbits(page);
});

test('Vier Objekte behalten ihre Bahnen; Dinosaurier und Eingabeziele fehlen', async ({ page }) => {
  // Use the browser timeline for the CSS motion path; the remaining tests clock JS events.
  await page.clock.resume();
  await page.reload();
  await expect(page.locator('[data-follow]')).toHaveCount(4);
  await expect(page.locator('.chase-dinosaur, .space-scene svg')).toHaveCount(0);
  await expect(page.locator('.space-scene')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.orbit-carrier').first()).toHaveCSS('pointer-events', 'none');
  const rocket = object(page, 'rocket');
  await rocket.evaluate(async el => { const animation = el.getAnimations()[0]; animation.pause(); await animation.ready; });
  const points = [];
  for (const time of [0, 4250, 17000]) {
    await rocket.evaluate((el, time) => { el.getAnimations()[0].currentTime = time; }, time);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    points.push(await rocket.evaluate(el => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, duration: el.getAnimations()[0].effect.getTiming().duration };
    }));
  }
  expect(points[0].duration).toBe(17000);
  expect(points[0]).toEqual(points[2]);
  expect(points[0].x).not.toBe(points[1].x);
  await page.getByRole('button', { name: '+1 Klick', exact: true }).click();
  await expect(page.locator('#counter')).toHaveText('1');
});

test('Fangradius, stabile Reihe, langsame Richtungswechsel und Stillstand', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await freezeOrbits(page);
  const earth = object(page, 'earth');
  const initial = await center(earth);
  await move(page, initial.x + 101, initial.y);
  await expect(earth).toHaveAttribute('data-motion', 'orbit');
  await move(page, initial.x + 99, initial.y, 100);
  await expect(earth).toHaveAttribute('data-motion', 'following');
  const atCapture = await center(earth);
  expect(Math.hypot(atCapture.x - initial.x, atCapture.y - initial.y)).toBeLessThan(1);
  await capture(page, 'ufo');
  await expect(earth).toHaveAttribute('data-order', '0');
  await expect(object(page, 'ufo')).toHaveAttribute('data-order', '1');
  for (let x = 1080; x >= 800; x -= 20) await move(page, x, 710, 100);
  for (let y = 710; y >= 510; y -= 20) await move(page, 800, y, 100);
  await page.clock.runFor(1000);
  const first = await center(earth), second = await center(object(page, 'ufo'));
  expect(first.x).toBeCloseTo(800, 0);
  expect(first.y).toBeCloseTo(574, 0);
  expect(second.y - first.y).toBeCloseTo(64, 0);
  await page.clock.runFor(1000);
  expect(Math.hypot((await center(earth)).x - first.x, (await center(earth)).y - first.y)).toBeLessThan(1);
  await expect(earth).toHaveAttribute('data-motion', 'following');
  expect(await page.locator('.space-object:not([data-follow])').evaluateAll(els => els.every(el => !el.hasAttribute('data-motion')))).toBe(true);
});

test('Ein Sprung und schnelle Annäherung lösen nicht; schnelles Wegziehen löst die ganze Reihe', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await freezeOrbits(page);
  await capture(page, 'earth');
  await capture(page, 'ufo');
  // A single jump after idle cannot count as sustained motion.
  await move(page, 900, 700, 500);
  await expect(object(page, 'earth')).toHaveAttribute('data-motion', 'following');
  await page.clock.runFor(1000);
  // Establish a rightward trail, then approach its head from the right.
  for (let x = 920; x <= 1040; x += 20) await move(page, x, 700, 100);
  await page.clock.runFor(1000);
  for (let x = 1020; x >= 980; x -= 20) await move(page, x, 700, 16);
  await expect(object(page, 'earth')).toHaveAttribute('data-motion', 'following');
  await page.clock.runFor(1000);
  // After the turn the head lies to the right: sustained leftward motion is away.
  for (let x = 960; x >= 800; x -= 20) await move(page, x, 700, 16);
  await expect(object(page, 'earth')).toHaveAttribute('data-motion', 'returning');
  await expect(object(page, 'ufo')).toHaveAttribute('data-motion', 'returning');
  const during = await center(object(page, 'earth'));
  await move(page, during.x, during.y);
  await expect(object(page, 'earth')).toHaveAttribute('data-motion', 'returning');
  await page.clock.runFor(850);
  await expect(object(page, 'earth')).toHaveAttribute('data-motion', 'orbit');
  await expect(object(page, 'ufo')).toHaveAttribute('data-motion', 'orbit');
  await capture(page, 'earth');
});

test('Rückkehr erreicht die laufende Bahn ohne Neustart; Austritt, Fokus, Scroll und Resize räumen auf', async ({ page }) => {
  for (const action of ['leave', 'blur', 'scroll', 'resize']) {
    await page.reload();
    await freezeOrbits(page, 4300);
    await capture(page, 'rocket');
    await move(page, 200, 140, 200);
    await page.clock.runFor(300);
    await freezeOrbits(page, 4300);
    const before = await center(object(page, 'rocket'));
    await page.evaluate(action => {
      if (action === 'leave') document.documentElement.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
      else window.dispatchEvent(new Event(action));
    }, action);
    const after = await center(object(page, 'rocket'));
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(1);
    await expect(object(page, 'rocket')).toHaveAttribute('data-motion', 'returning');
    await page.clock.runFor(400);
    await freezeOrbits(page, 7000);
    await page.clock.runFor(450);
    await expect(object(page, 'rocket')).toHaveAttribute('data-motion', 'orbit');
    expect(await object(page, 'rocket').evaluate(el => el.parentElement.style.transform)).toBe('translate(0px, 0px)');
    expect(await object(page, 'rocket').evaluate(el => el.getAnimations()[0].currentTime)).toBe(7000);
  }
});

test('Reduzierte Bewegung beendet Verfolgung sofort und bleibt statisch, auch nach Umschalten', async ({ page }) => {
  await capture(page, 'rocket');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(object(page, 'rocket')).toHaveAttribute('data-motion', 'orbit');
  expect(await page.locator('.space-scene').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  const before = await center(object(page, 'rocket'));
  await move(page, before.x, before.y);
  await page.clock.runFor(60000);
  expect(await center(object(page, 'rocket'))).toEqual(before);
  await expect(page.locator('#smiley-primary')).toHaveText('🚀');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await freezeOrbits(page);
  await expect(object(page, 'rocket')).toHaveAttribute('data-motion', 'orbit');
  await capture(page, 'rocket');
});

test('Touch sammelt nichts; Maus funktioniert bei Smartphone-Breite ohne Überlauf', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const point = await center(object(page, 'rocket'));
  await move(page, point.x, point.y, 20, 'touch');
  await expect(object(page, 'rocket')).toHaveAttribute('data-motion', 'orbit');
  await capture(page, 'rocket');
  await page.clock.runFor(500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('textbox').fill('Ada');
  await expect(page.locator('#greeting')).toHaveText('Hallo, Ada! Schön, dass du da bist.');
});

test('Enge Kurven behalten auch nach Stillstand sichtbaren Abstand', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await capture(page, 'earth');
  await capture(page, 'ufo');
  for (let x = 1080; x >= 940; x -= 20) await move(page, x, 710, 100);
  for (let y = 710; y >= 600; y -= 10) await move(page, 940, y, 100);
  await page.clock.runFor(1000);
  const a = await center(object(page, 'earth')), b = await center(object(page, 'ufo'));
  expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(63.9);
  await expect(object(page, 'earth')).toHaveAttribute('data-order', '0');
  await expect(object(page, 'ufo')).toHaveAttribute('data-order', '1');
});
