// Jokoaren pantaila-argazkiak.  node tools/test/shot.js <url> <irteera-aurrizkia> [w] [h] [itxaron-ms] [ekintzak-JSON]
// Ekintzak: [{"ttap":[x,y]} | {"click":"#id"} | {"wait":ms} | {"type":"IKER"} | {"key":"Enter"} | {"eval":"js"} | {"shot":"izena"}]
const { launch, runActions } = require('./_browser');
(async () => {
  const [url, out, w = '844', h = '390', wait = '6000', actions = '[]'] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: +w, height: +h }, hasTouch: true })).newPage();
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(+wait);
  await page.screenshot({ path: `${out}_0.png` });
  await runActions(page, JSON.parse(actions), name => page.screenshot({ path: `${out}_${name}.png` }));
  await browser.close();
})();
