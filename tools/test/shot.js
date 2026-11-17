// Pantaila-argazkiak: node tools/test/shot.js <url> <irteera-aurrizkia> [w] [h] [itxaron-ms] [ekintzak-JSON]
const { launch, runActions } = require('./_browser');
(async () => {
  const [url, out, w = '844', h = '390', wait = '6000', actions = '[]'] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: +w, height: +h }, hasTouch: /touch/.test(process.env.SHOT_MODE || '') })).newPage();
  page.on('pageerror', e => console.log('pageerror:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 300)); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(+wait);
  await page.screenshot({ path: `${out}_0.png` });
  await runActions(page, JSON.parse(actions), name => page.screenshot({ path: `${out}_${name}.png` }));
  await browser.close();
})();
