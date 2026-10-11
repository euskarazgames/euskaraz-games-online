// Playwright + Chromium (WebGL swiftshader-ekin, GPUrik gabeko makinetan ere).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/<script>.js ...
const fs = require('fs');
const { chromium } = require('playwright');
function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base).sort().reverse()) {
      const p = `${base}/${d}/chrome-linux/chrome`;
      if (/^chromium-\d+$/.test(d) && fs.existsSync(p)) return p;
    }
  } catch (e) {}
  return undefined; // Playwright-en lehenetsia
}
async function launch() {
  return chromium.launch({
    executablePath: chromiumPath(),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
}
async function runActions(page, actions, onShot) {
  for (const a of actions) {
    try {
      if (a.ttap) await page.touchscreen.tap(a.ttap[0], a.ttap[1]);
      if (a.tap) await page.mouse.click(a.tap[0], a.tap[1]);
      if (a.click) await page.click(a.click, { timeout: 5000, force: true });
      if (a.type) await page.keyboard.type(a.type);
      if (a.key) await page.keyboard.press(a.key);
      if (a.eval) console.log('eval:', String(JSON.stringify(await page.evaluate(a.eval))).slice(0, 2000));
      if (a.wait) await page.waitForTimeout(a.wait);
      if (a.shot) await onShot(a.shot);
    } catch (e) { console.log('action fail', JSON.stringify(a), e.message.split('\n')[0]); }
  }
}
module.exports = { launch, runActions };
