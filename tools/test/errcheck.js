// Erroreak bilatu: node tools/test/errcheck.js <url> [itxaron-ms] [blokeatu-regex]
const { launch } = require('./_browser');
(async () => {
  const [url, wait = '8000', block] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true })).newPage();
  const errs = [];
  if (block) await page.route(new RegExp(block), r => r.abort());
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); if (m.type() === 'warning') console.log('warn:', m.text().slice(0, 200)); });
  page.on('response', r => { if (r.status() >= 400 && !/favicon|assets\/tex\//.test(r.url())) errs.push('http ' + r.status() + ': ' + r.url()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(+wait);
  const info = await page.evaluate(() => ({ canvases: document.querySelectorAll('canvas').length, loading: document.getElementById('loading')?.textContent }));
  console.log(errs.length ? errs.join('\n') : `ERRORERIK EZ (canvas: ${info.canvases}, egoera: ${info.loading})`);
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
