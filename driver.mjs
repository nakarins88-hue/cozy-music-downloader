// Playwright REPL driver for Cozy Music Downloader
import { _electron as electron } from 'playwright-core';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(__dirname, 'screenshots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const electronBin = path.join(__dirname, 'node_modules/electron/dist/electron.exe');

let app = null;
let page = null;

const COMMANDS = {
  async launch() {
    if (app) return console.log('already launched');
    console.log('Launching Electron from:', electronBin);
    app = await electron.launch({
      executablePath: electronBin,
      args: ['--no-sandbox', path.join(__dirname, 'out/main/index.js')],
      env: { ...process.env },
      timeout: 30_000,
    });
    await new Promise(r => setTimeout(r, 4_000));
    page = app.windows().find(w => !w.url().startsWith('devtools://'))
        ?? await app.firstWindow();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    console.log('launched.', app.windows().length, 'windows');
    for (const w of app.windows()) console.log(' ', w.url());
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first');
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
    await page.screenshot({ path: f, fullPage: true });
    console.log('screenshot:', f);
  },

  async click(sel) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate(s => {
      const el = document.querySelector(s);
      if (!el) return 'NOT_FOUND';
      el.click(); return 'OK';
    }, sel);
    await new Promise(r => setTimeout(r, 500));
    console.log('click', sel, '->', r);
  },

  async 'click-text'(text) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate(t => {
      const els = [...document.querySelectorAll('button, a, [role="button"], nav button')];
      const el = els.find(e => e.textContent?.trim() === t)
              ?? els.find(e => e.textContent?.includes(t));
      if (!el) return 'NOT_FOUND';
      el.click(); return 'OK: ' + el.tagName + ' "' + el.textContent.trim().substring(0, 40) + '"';
    }, text);
    await new Promise(r => setTimeout(r, 600));
    console.log('click-text', JSON.stringify(text), '->', r);
  },

  async type(text) { if (page) await page.keyboard.type(text, { delay: 30 }); },
  async press(key) { if (page) await page.keyboard.press(key); },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch first');
    try { await page.waitForSelector(sel, { timeout: 10_000 }); console.log('found:', sel); }
    catch { console.log('TIMEOUT:', sel); }
  },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first');
    try { console.log(JSON.stringify(await page.evaluate(expr))); }
    catch (e) { console.log('ERROR:', e.message); }
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first');
    console.log(await page.evaluate(
      s => (s ? document.querySelector(s) : document.body)?.innerText?.substring(0, 2000) ?? '(null)',
      sel || null));
  },

  async windows() {
    if (!app) return console.log('ERROR: launch first');
    for (const w of app.windows()) console.log(' url:', w.url());
  },

  async nav(page_name) {
    // Navigate to a sidebar page by name
    const r = await page.evaluate(name => {
      const btns = [...document.querySelectorAll('nav button, aside button')];
      const btn = btns.find(b => b.textContent?.toLowerCase().includes(name.toLowerCase()));
      if (!btn) return 'NOT_FOUND: ' + btns.map(b => b.textContent.trim()).join(', ');
      btn.click(); return 'OK: ' + btn.textContent.trim();
    }, page_name);
    await new Promise(r => setTimeout(r, 800));
    console.log('nav', page_name, '->', r);
  },

  async fill(sel_and_text) {
    if (!page) return console.log('ERROR: launch first');
    const idx = sel_and_text.indexOf(' ');
    const sel = sel_and_text.substring(0, idx);
    const text = sel_and_text.substring(idx + 1);
    await page.evaluate((args) => {
      const el = document.querySelector(args[0]);
      if (!el) return;
      el.focus();
      const nativeInput = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (nativeInput?.set) {
        nativeInput.set.call(el, args[1]);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, [sel, text]);
    console.log('fill', sel, '=', JSON.stringify(text));
  },

  async quit() { if (app) await app.close().catch(() => {}); app = null; page = null; },
  help() { console.log('commands:', Object.keys(COMMANDS).join(', ')); },
};

const stdin = fs.createReadStream(null, { fd: 0 });
const rl = readline.createInterface({ input: stdin, output: process.stdout, prompt: 'driver> ' });

rl.on('line', async line => {
  const trimmed = line.trim();
  if (!trimmed) { rl.prompt(); return; }
  const spaceIdx = trimmed.indexOf(' ');
  const cmd = spaceIdx > -1 ? trimmed.substring(0, spaceIdx) : trimmed;
  const arg = spaceIdx > -1 ? trimmed.substring(spaceIdx + 1) : '';
  const fn = COMMANDS[cmd];
  if (!fn) { console.log('unknown:', cmd, '— try: help'); rl.prompt(); return; }
  try { await fn(arg || undefined); } catch (e) { console.log('ERROR:', e.message); }
  if (cmd === 'quit') { rl.close(); process.exit(0); }
  rl.prompt();
});
rl.on('close', async () => { await COMMANDS.quit(); process.exit(0); });

console.log('Cozy Music Downloader driver — "help" for commands, "launch" to start');
rl.prompt();
