const { test, expect } = require('@playwright/test');

test('Die dekorative Rakete bleibt ohne Dinosaurier auf ihrer geschlossenen Bahn', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/index.html');
  await expect(page.locator('.chase-dinosaur, .space-scene svg')).toHaveCount(0);
  await expect(page.locator('.chase-rocket')).toHaveText('🚀');
  await expect(page.locator('.space-scene')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.chase-track')).toHaveCSS('pointer-events', 'none');
  const positions = await page.locator('.chase-rocket').evaluate(el => {
    const animation = el.getAnimations()[0]; animation.pause();
    return [0, 4250, 17000].map(time => {
      animation.currentTime = time;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, duration: animation.effect.getTiming().duration };
    });
  });
  expect(positions[0].duration).toBe(17000);
  expect(positions[0]).toEqual(positions[2]);
  expect(positions[0].x).not.toBe(positions[1].x);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.space-scene').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
});
