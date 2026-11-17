// Playwright laguntzailea: aurrez instalatutako Chromium (WebGL swiftshader-ekin).
const { chromium } = require('playwright');
async function launch() { return chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); }
async function runActions(page, actions, shot) {
  for (const a of actions) {
    if (a.ttap) await page.touchscreen.tap(a.ttap[0], a.ttap[1]);
    else if (a.click) await page.click(a.click);
    else if (a.wait) await page.waitForTimeout(a.wait);
    else if (a.key) await page.keyboard.press(a.key);
    else if (a.down) await page.keyboard.down(a.down);
    else if (a.up) await page.keyboard.up(a.up);
    else if (a.eval) await page.evaluate(a.eval);
    else if (a.shot) await shot(a.shot);
  }
}
module.exports = { launch, runActions };
