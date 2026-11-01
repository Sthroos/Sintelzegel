// Bot-spelers voor de balanssimulatie. Draait in dezelfde vm-context als de game.
render = () => {}; hud = () => {}; store.set = () => {}; store.del = () => {};

const SIGN_FOR = { krijger: 'beer', dief: 'vos', magier: 'uil', alchemist: 'vos', stormroeper: 'uil', necromant: 'uil', bezweerder: 'uil' };
const CROSS = {
  krijger: ['olieflacon', 'brandpijl', 'vlammendwapen'],
  dief: ['schildbreker', 'wervelwind', 'oorlogskreet'],
  magier: ['windstoot', 'wervelstorm', 'stoomlans'],
  alchemist: ['brandpijl', 'dubbelsteek', 'rookbom'],
  stormroeper: ['bliksemschicht', 'ijsschicht', 'ketenbliksem'],
  necromant: ['geestwolf', 'vuurelementaal', 'ijsgolem'],
  bezweerder: ['doodopwekken', 'aderlaten', 'zielenoogst']
};
const CC_SK = { schildslag: 'fa', grondbreker: 'fa', windstoot: 'ma', wervelstorm: 'ma' };
const NAT_MAKERS = ['regenwolk', 'stoomwolk', 'stormroep'];
const NAT_USERS = ['bliksemschicht', 'ijsschicht', 'ketenbliksem', 'winterhand', 'stormroep'];
const OIL_MAKERS = ['olieflacon', 'pekbom'];
const FIRE = ['vuurflacon', 'vuurschicht', 'brandpijl', 'stoomlans', 'vuurbal', 'kettingreactie', 'meteoor'];
const HEALS = ['herstel', 'helendeaanraking', 'transmutatie', 'aderlaten'];
const ARMOR = ['onverzettelijk', 'magischschild', 'dodenpantser', 'wachterbezwering'];
const BUFFS = ['oorlogskreet', 'rugwind', 'vlammendwapen', 'nevelbom'];

const known = id => S.p.skills.includes(id);
function avail(id) { const sk = SK[id]; return known(id) && !S.c.cd[id] && S.p.mp >= mpCost(sk, stats()) && (!sk.req || sk.req()); }
function useS(id, tgt) { if (tgt) S.c.target = tgt.uid; pAction('skill', id); }

function simpleTurn() {
  const t = stats();
  if (S.p.hp < t.maxHp * .35 && S.p.cons.heal && !S.c.potion) usePotion('heal');
  if (S.screen !== 'combat') return;
  const sk = S.p.skills.filter(avail).sort((a, b) => SK[b].mp - SK[a].mp)[0];
  if (sk && Math.random() < .8) pAction('skill', sk); else pAction('atk');
}

function smartTurn() {
  const t = stats(), en = alive();
  if (S.p.hp < t.maxHp * .4 && S.p.cons.heal && !S.c.potion) usePotion('heal');
  else if (S.p.mp < 10 && S.p.cons.mana && !S.c.potion) usePotion('mana');
  if (S.screen !== 'combat') return;
  const low = en.slice().sort((a, b) => a.hp - b.hp)[0];
  const boss = en.find(e => e.boss);
  if (S.p.hp < t.maxHp * .35) { const h = HEALS.find(avail); if (h) return useS(h, low); }
  const ch = en.find(e => e.forced);
  if (ch) {
    for (const id in CC_SK) if (avail(id) && ch[CC_SK[id]] <= 0) return useS(id, ch);
    if (ch.st.nat && ch.ma <= 0) { const id = ['bliksemschicht', 'ijsschicht'].find(avail); if (id) return useS(id, ch); }
  }
  if (S.c.allies.length < 2) { const sm = S.p.skills.filter(id => SK[id].summon && avail(id)).sort((a, b) => SK[b].mp - SK[a].mp)[0]; if (sm) return useS(sm); }
  if (S.c.allies.length && avail('bezielen') && S.c.allies.some(a => a.hp < a.maxHp * .5)) return useS('bezielen');
  const armFrac = (S.p.fa + S.p.ma) / (t.maxFa + t.maxMa + 1);
  if (armFrac < .25 && S.p.hp < t.maxHp * .6) { const a = ARMOR.find(avail); if (a) return useS(a); if (ch) return pAction('def'); }
  const natT = en.find(e => e.st.nat);
  if (natT) { const id = NAT_USERS.find(avail); if (id) return useS(id, natT); }
  const oilT = en.find(e => e.st.olie);
  if (oilT) { const id = FIRE.find(avail); if (id) return useS(id, oilT); }
  if (!natT && NAT_USERS.some(known)) { const id = NAT_MAKERS.find(avail); if (id) return useS(id); }
  if (!oilT && FIRE.some(known)) { const id = OIL_MAKERS.find(avail); if (id) return useS(id); }
  if (S.c.turn <= 2 && (boss || en.length > 1)) { const b = BUFFS.find(id => avail(id) && !(S.p.st.versterkt && id === 'oorlogskreet')); if (b) return useS(b); }
  const off = S.p.skills.filter(id => avail(id) && !SK[id].self && !NAT_MAKERS.includes(id) && !OIL_MAKERS.includes(id) && id !== 'offerande');
  if (en.length >= 2) { const a = off.filter(id => SK[id].aoe).sort((x, y) => SK[y].mp - SK[x].mp)[0]; if (a) return useS(a); }
  const tgt = boss && en.length === 1 ? boss : low;
  if (tgt.hp / tgt.maxHp < .3 && avail('executie')) return useS('executie', tgt);
  const s1 = off.filter(id => !SK[id].aoe).sort((x, y) => SK[y].mp - SK[x].mp)[0];
  if (s1) return useS(s1, tgt);
  if (off[0]) return useS(off[0], tgt);
  S.c.target = tgt.uid; pAction('atk');
}

function bestChoice(ev) {
  let best = -1, bestV = -1;
  ev.c.forEach((ch, i) => {
    if (ch.req && !ch.req()) return;
    let v = .5;
    if (ch.chk) { const [st, base] = ch.chk; const dc = base + Math.round(S.reg * 1.5); const b = Math.floor(stats()[st] / 2); v = Math.min(.95, Math.max(.05, (21 - (dc - b)) / 20)); }
    if (/Loop door|Laat|Negeer|Vertrek|Blijf|Zwijg|Rust liever|Nee, dank/.test(ch.t)) v = .2;
    if (v > bestV) { bestV = v; best = i; }
  });
  return Math.max(0, best);
}

function manageGear(build, cls, st) {
  const main = CLASSES[cls].main;
  while (S.p.pts > 0) { S.p.pts--; st.ptc = (st.ptc || 0) + 1; const k = build === 'bal' && st.ptc % 3 === 0 ? 'vit' : main; S.p[k]++; if (k === 'vit') S.p.hp += 5; }
  while (S.p.picks > 0) {
    let pool = CLASSES[cls].pool.filter(k => !known(k) && canLearn(k));
    if (!pool.length) pool = Object.keys(SK).filter(k => !known(k) && SK[k].sc !== 'univ' && canLearn(k));
    if (pool.length) S.p.skills.push(pool.sort((a, b) => SK[b].mp - SK[a].mp)[0]); else S.p.pts += 2;
    S.p.picks--;
    if (S.p.pts) manageGear(build, cls, st);
  }
  for (const it of S.p.bag.slice()) {
    if (it.slot === 'tome') { if (canLearn(it.skill)) equip(it.uid); continue; }
    const c = compareItem(it); if (c.off + c.def * .6 > 0) equip(it.uid);
  }
  while (S.p.bag.length > BAG_MAX) {
    const worst = S.p.bag.slice().sort((a, b) => { const ca = a.slot === 'tome' ? { off: 99, def: 0 } : compareItem(a), cb = b.slot === 'tome' ? { off: 99, def: 0 } : compareItem(b); return (ca.off + ca.def) - (cb.off + cb.def); })[0];
    scrap(worst.uid);
  }
}

function townTurn(strat, cls, st) {
  const T = S.town, t = stats();
  if (!T.story) { ACT.tstory(); return; }
  if (T.spots.length < 3) { ACT.tspot(T.spots.length); return; }
  if (!T._bot) {
    T._bot = 1;
    if (S.p.hp < t.maxHp * .95 && S.gold >= 10 * (T.i + 1)) ACT.trest();
    for (let k = 0; k < T.offers.length && activeQuests().length < 2; k++) {
      const q = T.offers[k];
      if (['kill', 'kist', 'worp', 'killany', 'elite'].includes(q.k) && S.gold >= q.borg + 30) { ACT.taccept(k); k--; }
    }
    if (strat === 'kruis') for (const id of CROSS[cls]) if (!known(id) && canLearn(id) && S.gold >= trainPrice(id)) { ACT.tlearn(id); break; }
    const w = S.p.eq.wapen; if (w) { S.town.smith = 'wapen'; const c = smithCost(w).up; if ((w.up || 0) < 5 && S.gold >= c + 60) ACT.tup(); }
    S.screen = 'shop'; S.ctx = { tab: 'koop', ret: 'town' };
    const stk = shopStock();
    const hi = stk.findIndex(e => e.t === 'c' && e.k === 'heal');
    while ((S.p.cons.heal || 0) < 4 && hi >= 0 && S.gold >= stk[hi].p + 40) buy(hi);
    backTown();
    return;
  }
  ACT.leave();
}

function runBot(job) {
  const { cls, diff, strat, build } = job;
  M.unlocked = 6;
  newRun({ name: 'Bot', cls, sign: SIGN_FOR[cls], diff, heir: '' }); VIEW = 'run';
  const st = { fights: 0, bossTurns: [], lastFight: null };
  let guard = 0, fightTurns = 0;
  while (guard++ < 30000) {
    TOAST = null;
    const sc = S.screen;
    if (sc === 'einde') break;
    S.ov = null;
    manageGear(build, cls, st);
    if (sc === 'regio') { toMap(); continue; }
    if (sc === 'map') {
      if (!S.choices) S.choices = genChoices();
      const t = stats(), hurt = S.p.hp < t.maxHp * .5;
      const pr = hurt ? ['boss', 'kampvuur', 'heiligdom', 'visioen', 'kist', 'gebeurtenis', 'handelaar', 'gevecht', 'elite']
        : ['boss', 'visioen', 'gevecht', 'elite', 'kist', 'gebeurtenis', 'heiligdom', 'kampvuur', 'handelaar'];
      if (!hurt && S.p.hp < t.maxHp * .75) { pr.splice(pr.indexOf('elite'), 1); pr.push('elite'); }
      let i = 0, best = 99; S.choices.forEach((c, j) => { const r = pr.indexOf(c.k); if (r < best) { best = r; i = j; } });
      enterNode(i);
      if (S.screen === 'combat') { st.lastFight = { kind: S.c.kind, n: alive().map(e => e.n).join('+'), reg: S.reg }; fightTurns = 0; st.fights++; }
      continue;
    }
    if (sc === 'combat') {
      if (!st.lastFight || st.lastFight.c !== S.c) { st.lastFight = { kind: S.c.kind, n: alive().map(e => e.n).join('+'), reg: S.reg, c: S.c }; fightTurns = 0; }
      fightTurns++;
      if (fightTurns > 300) { S.p.hp = 0; lose(); break; }
      (strat === 'simpel' ? simpleTurn : smartTurn)();
      if (S.screen !== 'combat' && st.lastFight.kind === 'boss' && S.screen !== 'einde') st.bossTurns.push([S.reg, fightTurns]);
      continue;
    }
    if (sc === 'buit') { ACT.buitnext(); continue; }
    if (sc === 'keuze') { const ok = Object.keys(ENDINGS).filter(k => { const E = ENDINGS[k]; return !E.need || (E.need === 'frags' ? S.frags.length >= 4 : S.flags.includes(E.need)); }); ACT.ending(ok[ok.length - 1]); continue; }
    if (sc === 'event') { if (!S.ctx.res) resolveChoice(bestChoice(getEvent(S.ctx.id))); else eventContinue(); continue; }
    if (sc === 'kist') {
      const c = S.ctx, t = stats();
      if (c.opened) { ACT.back(); continue; }
      if (c.insp && c.insp.ok && c.mimic) { if (S.p.hp > t.maxHp * .6) ACT.mimicatk(); else ACT.back(); continue; }
      if (!c.tried.insp && t.int >= 10) { chestTry('insp'); continue; }
      if (!c.locked) { chestTry('open'); continue; }
      if (S.p.cons.loper) { chestTry('loper'); continue; }
      const order = ['dex', 'str'].sort((a, b) => t[b] - t[a]); if (S.p.mp >= 8) order.push('int');
      const m = order.find(k => !c.tried[k]); if (m) chestTry(m); else ACT.back();
      continue;
    }
    if (sc === 'shop') { const stk = shopStock(); const hi = stk.findIndex(e => e.t === 'c' && e.k === 'heal'); if ((S.p.cons.heal || 0) < 3 && hi >= 0 && S.gold >= stk[hi].p + 30) buy(hi); ACT.back(); continue; }
    if (sc === 'kamp') { const t = stats(); campDo(S.p.hp < t.maxHp * .75 ? 'rust' : 'smeed'); if (!S.ctx.done) campDo('rust'); toMap(); continue; }
    if (sc === 'schrijn') { const cu = S.bless.some(b => BLESS[b].curse); shrineDo(cu ? 'zuiver' : S.ctx.opts[0]); toMap(); continue; }
    if (sc === 'stad') { townTurn(strat, cls, st); continue; }
    throw new Error('onbekend scherm ' + sc);
  }
  const win = !!(S.ctx && S.ctx.win);
  const lf = st.lastFight || {};
  return { win, reg: S.reg, step: S.step, lvl: S.p.lvl, end: win ? S.ctx.end : null, died: win ? null : (lf.kind || '?') + ':' + (lf.n || ''), bossTurns: st.bossTurns, guard };
}
