// Balanssimulatie: draait de spellogica van index.html in Node (vm), zonder DOM-rendering.
// Gebruik: node sim.js <html> <jobs.json> <out.json>
'use strict';
const fs = require('fs');
const vm = require('vm');

const [, , htmlPath, jobsPath, outPath] = process.argv;
if (!htmlPath || !jobsPath || !outPath) throw new Error('usage: node sim.js <html> <jobs.json> <out.json>');

const html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error('no inline script found');

const dummy = () => ({ innerHTML: '', insertAdjacentHTML() {}, scrollTop: 0, scrollHeight: 0, addEventListener() {}, clientWidth: 0, clientHeight: 0 });
const els = { '#main': dummy(), '#act': dummy(), '#hud': dummy(), '#log': dummy() };
const ctx = vm.createContext({
  console, Math, JSON, Object, Array, String, Number, Set, Map, Date,
  document: { querySelector: s => els[s] || null, addEventListener() {}, body: { contains: () => false } },
  window: {}, matchMedia: () => ({ matches: true }), requestAnimationFrame() {}, cancelAnimationFrame() {}, devicePixelRatio: 1
});
vm.runInContext(m[1], ctx, { filename: 'game.js' });
vm.runInContext(fs.readFileSync(__dirname + '/bot.js', 'utf8'), ctx, { filename: 'bot.js' });

const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
const out = [];
const t0 = Date.now();
for (const j of jobs) {
  try { out.push({ ...j, ...ctx.runBot(j) }); }
  catch (e) { out.push({ ...j, error: String(e && e.stack || e).slice(0, 300) }); }
}
fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`${jobs.length} runs in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
