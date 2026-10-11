// Ataria txarteletarako irudiak: canvas WebGL-a SOILIK (HUDik gabe).
// node tools/test/keyart.js <url> <irteera.png> <canvas-hautatzailea> [ekintzak-JSON] [w] [h]
const { launch, runActions } = require('./_browser');
(async () => {
  const [url, out, sel = 'canvas', actions = '[]', w = '1200', h = '900'] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: +w, height: +h }, hasTouch: true })).newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(7000);
  const acts = JSON.parse(actions);
  acts.push({ wait: 300 });
  await runActions(page, acts, () => {});
  await page.evaluate(s => {
    const c = document.querySelector(s);
    document.querySelectorAll('body > *').forEach(e => { if (!e.contains(c)) e.style.display = 'none'; });
  }, sel);
  await page.waitForTimeout(400);
  await page.locator(sel).first().screenshot({ path: out });
  await browser.close();
})();
