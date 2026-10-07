const { test, expect } = require('@playwright/test');

async function sample(page, time) {
  return page.locator('.chase-track').evaluate((track, time) => {
    const rect = element => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height,
        right: r.right, bottom: r.bottom, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
    };
    return [...track.querySelectorAll('.chase-flier')].map(element => {
      const animation = element.getAnimations()[0];
      animation.pause();
      animation.currentTime = time;
      const style = getComputedStyle(element);
      const matrix = element.querySelector('svg')?.getScreenCTM();
      return { ...rect(element), distance: parseFloat(style.offsetDistance),
        path: style.offsetPath, orientation: style.offsetRotate,
        duration: animation.effect.getTiming().duration,
        facing: matrix ? { x: matrix.a, y: matrix.b } : null };
    });
  }, time);
}
function separated(a, b, gap = 0) {
  return a.right + gap < b.x || b.right + gap < a.x || a.bottom + gap < b.y || b.bottom + gap < a.y;
}
function inside(rect, viewport) {
  return rect.x >= 0 && rect.y >= 0 && rect.right <= viewport.width && rect.bottom <= viewport.height;
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/index.html');
});

test('Genau ein eigener Dinosaurier jagt die Hintergrundrakete dekorativ', async ({ page }) => {
  await expect(page.locator('.chase-dinosaur')).toHaveCount(1);
  await expect(page.locator('.chase-dinosaur svg')).toBeVisible();
  await expect(page.locator('.chase-rocket')).toHaveText('🚀');
  await expect(page.locator('.chase-track')).toHaveCSS('pointer-events', 'none');
  await expect(page.locator('.space-scene')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.chase-dinosaur svg')).toHaveAttribute('focusable', 'false');
  await expect(page.getByRole('img')).toHaveCount(2);
  await page.getByRole('button', { name: '+1 Klick', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#counter')).toHaveText('1');
  await expect(page.locator('#increment')).toHaveCSS('outline-color', 'rgb(253, 230, 138)');
});

test('Geschlossene Jagdbahn hält Abstand und Reihenfolge über den ganzen Zyklus, auch nach Resize und Scrollen', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const scroll of [0, 10000]) {
      await page.evaluate(y => scrollTo(0, y), scroll);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const r = await page.locator('main').boundingBox();
      const card = { ...r, right: r.x + r.width, bottom: r.y + r.height };
      let visibleTogether = false;
      const start = await sample(page, 0);
      for (let time = 0; time <= 17000; time += 125) {
        const [rocket, dinosaur] = await sample(page, time);
        expect(rocket.duration).toBe(17000);
        expect(dinosaur.duration).toBe(17000);
        expect(rocket.path).toBe(dinosaur.path);
        expect(rocket.path).not.toBe('none');
        expect(rocket.orientation).toMatch(/^auto(?: 0deg)?$/);
        expect(dinosaur.orientation).toMatch(/^auto(?: 0deg)?$/);
        expect(((rocket.distance - dinosaur.distance) % 100 + 100) % 100).toBeCloseTo(25, 3);
        expect(separated(rocket, dinosaur, 2), `collision at ${viewport.width}px, ${time}ms`).toBe(true);
        expect(inside(rocket, viewport)).toBe(true);
        expect(inside(dinosaur, viewport)).toBe(true);
        visibleTogether ||= separated(rocket, card) && separated(dinosaur, card);
      }
      expect(visibleTogether, `joint visibility at ${viewport.width}px, scroll ${scroll}`).toBe(true);
      // SVG's forward axis must follow the actual tangent, including all turns.
      for (const time of [0, 4250, 8500, 12750, 16999]) {
        const earlier = (await sample(page, (time + 16995) % 17000))[1];
        const later = (await sample(page, (time + 5) % 17000))[1];
        const current = (await sample(page, time))[1];
        const dx = later.cx - earlier.cx, dy = later.cy - earlier.cy;
        const dot = (dx * current.facing.x + dy * current.facing.y) /
          (Math.hypot(dx, dy) * Math.hypot(current.facing.x, current.facing.y));
        expect(dot).toBeGreaterThan(0.99);
      }
      const end = await sample(page, 17000);
      const beforeEnd = await sample(page, 16999);
      for (let i = 0; i < 2; i++) {
        expect(Math.hypot(end[i].cx - start[i].cx, end[i].cy - start[i].cy)).toBeLessThan(0.1);
        expect(Math.hypot(beforeEnd[i].cx - start[i].cx, beforeEnd[i].cy - start[i].cy)).toBeLessThan(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  const moved = await sample(page, 4250);
  const initial = await sample(page, 0);
  expect(Math.hypot(moved[0].cx - initial[0].cx, moved[0].cy - initial[0].cy)).toBeGreaterThan(20);
  const beforeScroll = await sample(page, 8000);
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const afterScroll = await sample(page, 8000);
  expect(afterScroll.map(item => item.cx)).toEqual(beforeScroll.map(item => item.cx));
  expect(afterScroll[0].cy).toBeLessThan(beforeScroll[0].cy);
});

test('Reduzierte Bewegung stoppt die gesamte Szene und startet sie nach Umschalten erneut', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.chase-rocket')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.chase-dinosaur')).toHaveCSS('offset-path', 'none');
  expect(await page.locator('.space-scene').evaluate(scene => scene.getAnimations({ subtree: true }).length)).toBe(0);
  await page.clock.install();
  await page.reload();
  const before = await page.locator('.chase-track').evaluate(track => [...track.children].map(el => {
    const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height };
  }));
  expect(before[0].x).toBeGreaterThan(before[1].x + before[1].width);
  await page.clock.runFor(60000);
  const after = await page.locator('.chase-track').evaluate(track => [...track.children].map(el => {
    const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height };
  }));
  expect(after).toEqual(before);
  await expect(page.locator('#smiley-primary')).toHaveText('🚀');
  await expect(page.locator('#smiley-secondary')).toHaveText('🌍');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.chase-rocket')).toHaveCSS('animation-name', 'chase-orbit');
  const first = await sample(page, 0), second = await sample(page, 4000);
  expect(first[0].cx).not.toBe(second[0].cx);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.chase-dinosaur')).toHaveCSS('animation-name', 'none');
  expect(await page.locator('.space-scene').evaluate(scene => scene.getAnimations({ subtree: true }).length)).toBe(0);
});
