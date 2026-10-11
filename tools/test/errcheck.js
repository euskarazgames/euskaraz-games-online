// Erroreak bilatu: node tools/test/errcheck.js <url> [itxaron-ms] [blokeatu-regex]
// Adib. fallback-a probatzeko: node tools/test/errcheck.js http://localhost:8091/games/pilota.html 9000 'egfx\.js'
const { launch } = require('./_browser');
(async () => {
  const [url, wait = '8000', block] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true })).newPage();
  const errs = [];
  if (block) await page.route(new RegExp(block), r => r.abort());
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push('http ' + r.status() + ': ' + r.url()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(+wait);
  const canvases = await page.evaluate(() => document.querySelectorAll('canvas').length);
  console.log(errs.length ? errs.join('\n') : `ERRORERIK EZ (canvas: ${canvases})`);
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
