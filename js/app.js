/* KG Study Zone – app logic (no external libraries) */
(function () {
'use strict';
const KG = window.KG, CFG = window.KGCONFIG || {};
const SUBJ = {
  english: { name: 'English', emoji: '🔤', color: '#ef476f', bg: '#ffe3ea', blurb: 'Words, sounds, animals and sentences' },
  maths:   { name: 'Maths',   emoji: '🔢', color: '#118ab2', bg: '#d8f1fb', blurb: 'Numbers, adding, subtracting and patterns' },
  science: { name: 'Science', emoji: '🌱', color: '#06a77d', bg: '#d6f5ea', blurb: 'Plants, living things and being kind' },
  myanmar: { name: 'Myanmar', emoji: 'က',  color: '#8338ec', bg: '#ebdcff', blurb: 'မြန်မာစာ: letters, signs and words' }
};
const UNITS = KG.units, BYID = {};
UNITS.forEach(u => { BYID[u.id] = u; u.groups.forEach((g, gi) => g.cards.forEach((c, ci) => { c.id = u.id + '-' + gi + '-' + ci; })); });

/* ---------- tiny helpers ---------- */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(9).forEach(c => { if (c == null || c === false) return; e.append(c.nodeType ? c : document.createTextNode(c)); });
  return e;
}
const $ = (s, r) => (r || document).querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = {
  get(k, d) { try { const v = localStorage.getItem('kg_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kg_' + k, JSON.stringify(v)); } catch (e) {} }
};
let stars = store.get('stars', 0);
const prog = store.get('prog', {});
function addStars(n) { stars += n; store.set('stars', stars); const el = $('#starcount'); if (el) el.textContent = stars; }
function toast(msg) { const t = h('div', { class: 'toast' }, msg); document.body.append(t); setTimeout(() => t.remove(), 1800); }
const isMy = s => /[က-႟]/.test(s || '');

/* ---------- confetti ---------- */
const fx = $('#fx'), ctx = fx.getContext('2d'); let parts = [], raf = 0;
function fit() { fx.width = innerWidth; fx.height = innerHeight; } fit(); addEventListener('resize', fit);
function confetti(x, y, n) {
  n = n || 40; const cols = ['#ef476f', '#ffd166', '#06a77d', '#118ab2', '#8338ec', '#f4a261'];
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 3, g: .38, s: rnd(6, 12), c: cols[rnd(0, 5)], r: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 70 + rnd(0, 30) });
  if (!raf) loop();
}
function loop() {
  ctx.clearRect(0, 0, fx.width, fx.height);
  parts = parts.filter(p => p.life-- > 0);
  parts.forEach(p => { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
  raf = parts.length ? requestAnimationFrame(loop) : 0; if (!raf) ctx.clearRect(0, 0, fx.width, fx.height);
}
function party() { confetti(innerWidth / 2, innerHeight / 3, 120); }

/* ---------- voice ---------- */
const Voice = { rate: store.get('rate', 0.85), list: [], loaded: false };
let curAudio = null, speakToken = 0;
function loadVoices() {
  try { Voice.list = window.speechSynthesis ? speechSynthesis.getVoices() || [] : []; } catch (e) { Voice.list = []; }
  Voice.loaded = true;
}
if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = () => { loadVoices(); const b = $('#myvoicewarn'); if (b) b.remove(); }; }
const normLang = v => (v.lang || '').toLowerCase().replace('_', '-');
function pickVoice(lang) {
  const pref = store.get('voice_' + lang, '');
  if (pref) { const v = Voice.list.find(v => v.voiceURI === pref); if (v) return v; }
  if (lang === 'my') return Voice.list.find(v => normLang(v).startsWith('my')) || Voice.list.find(v => /burm|myanm/i.test(v.name)) || null;
  const L = Voice.list.filter(v => normLang(v).startsWith('en'));
  const score = v => (/google|natural|online|samantha|karen|daniel|aria|jenny|zira|moira|serena/i.test(v.name) ? 2 : 0) + (/en-(us|gb)/.test(normLang(v)) ? 1 : 0) + (v.localService ? 0 : .5);
  return L.sort((a, b) => score(b) - score(a))[0] || null;
}
const useClips = lang => lang === 'my' ? (CFG.myanmarAudio !== false || !!CFG.useAudioFiles) : !!CFG.useAudioFiles;
const hasMyVoice = () => useClips('my') || !!pickVoice('my');
function cleanText(t, lang) {
  t = String(t || '');
  if (lang !== 'my') {
    t = t.replace(/_{2,}/g, ' blank ').replace(/−/g, ' minus ').replace(/\+/g, ' plus ').replace(/=/g, ' equals ').replace(/×/g, ' times ').replace(/\s\/\s/g, ', ');
    t = t.replace(/[က-႟◌]+/g, ' ');
  }
  return t.replace(/[✔✘★☆🔊]/g, '').replace(/\s+/g, ' ').trim();
}
function stopSpeech() { speakToken++; try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; } if (clipPending) clipPending(false); }
function dwell(t, my) { return Math.min(6000, 1400 + (t || '').length * 90); }
/* one shared player, unlocked on the first tap, so phones (iPhone) allow later automatic playback */
const clipEl = new Audio(); clipEl.preload = 'auto';
(function unlockAudio() {
  const go = () => {
    removeEventListener('pointerdown', go, true); removeEventListener('keydown', go, true);
    if (clipEl.src) return;
    try { const sr = 8000, n = 800, b = new ArrayBuffer(44 + n * 2), d = new DataView(b), w = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
      d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
      clipEl.src = URL.createObjectURL(new Blob([b], { type: 'audio/wav' })); clipEl.play().catch(() => {}); } catch (e) {}
  };
  addEventListener('pointerdown', go, true); addEventListener('keydown', go, true);
})();
let clipPending = null;
function playClip(url) {
  if (clipPending) clipPending(false);
  return new Promise(res => {
    const a = clipEl; curAudio = a; let done = false;
    const f = ok => { if (!done) { done = true; a.onended = a.onerror = null; if (clipPending === f) clipPending = null; res(ok); } };
    clipPending = f;
    try { a.pause(); } catch (e) {}
    a.onended = () => f(true); a.onerror = () => f(false);
    a.src = url; a.playbackRate = Math.min(1.4, Math.max(.6, Voice.rate / .85));
    a.play().catch(() => f(false));
  });
}
function speak(text, lang, opt) {
  opt = opt || {}; lang = lang || 'en';
  const mine = ++speakToken; text = cleanText(text, lang);
  return new Promise(async resolve => {
    if (!text) return resolve();
    if (useClips(lang) && opt.audio) { const ok = await playClip(opt.audio); if (mine !== speakToken) return resolve(); if (ok) return resolve(); }
    if (!window.speechSynthesis) { return setTimeout(resolve, dwell(text)); }
    const v = pickVoice(lang);
    if (lang === 'my' && !v) { return setTimeout(resolve, dwell(text, true)); }
    try { speechSynthesis.cancel(); } catch (e) {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = v ? v.lang : (lang === 'my' ? 'my-MM' : 'en-US'); if (v) u.voice = v;
    u.rate = opt.rate || Voice.rate; u.pitch = 1.08;
    let done = false; let tm;
    const fin = () => { if (done) return; done = true; clearTimeout(tm); resolve(); };
    u.onend = fin; u.onerror = fin;
    tm = setTimeout(fin, Math.max(4000, text.length * 220 / u.rate + 2500));
    setTimeout(() => { try { speechSynthesis.speak(u); } catch (e) { fin(); } }, 40);
  });
}
function speakCard(c, u) {
  const lang = u.lang === 'my' ? 'my' : 'en';
  return speak(c.say || c.w, lang, { audio: 'audio/' + c.id + '.mp3' });
}
function subText(s) { return String(s || '').replace(/[()·✘]/g, ' ').replace(/\s+/g, ' ').trim(); }

/* ---------- layout ---------- */
const app = $('#app');
function shell(content, accent) {
  app.innerHTML = '';
  const top = h('div', { class: 'top' }, h('div', { class: 'in' },
    h('a', { class: 'logo', href: '#/' }, h('div', { class: 'b' }, '🎒'), h('span', { class: 't' }, CFG.siteTitle || 'Okkar Min Thant Learning Zone', CFG.schoolName ? h('small', null, CFG.schoolName) : null)),
    h('div', { class: 'sp' }),
    h('div', { class: 'pill', title: 'Your stars' }, '⭐ ', h('span', { id: 'starcount' }, stars)),
    h('button', { class: 'iconbtn', title: 'Voice settings', 'aria-label': 'Voice settings', onclick: settings }, '🔊')));
  const wrap = h('div', { class: 'wrap' }, content);
  if (accent) wrap.style.setProperty('--accent', accent);
  app.append(top, wrap);
  return wrap;
}
function settings() {
  const m = h('div', { class: 'modal', onclick: e => { if (e.target === m) m.remove(); } });
  const en = Voice.list.filter(v => normLang(v).startsWith('en'));
  const sel = h('select', { onchange: e => store.set('voice_en', e.target.value) }, h('option', { value: '' }, 'Automatic (best voice)'), en.map(v => h('option', { value: v.voiceURI, selected: store.get('voice_en', '') === v.voiceURI }, v.name + ' (' + v.lang + ')')));
  const rate = h('input', { type: 'range', min: .5, max: 1.2, step: .05, value: Voice.rate, oninput: e => { Voice.rate = +e.target.value; store.set('rate', Voice.rate); } });
  const myok = hasMyVoice();
  m.append(h('div', { class: 'mbox' }, h('h3', null, '🔊 Voice settings'),
    h('label', null, 'Speaking speed (slow is good for learning)'), rate,
    h('label', null, 'English voice'), sel,
    h('div', { style: 'margin-top:8px' }, h('button', { class: 'btn sm', onclick: () => speak('Hello! Let us learn together. Apple, banana, cat.', 'en') }, '▶ Test English')),
    h('label', null, 'Myanmar voice'),
    useClips('my') ? h('div', { class: 'okmsg' }, '✅ Myanmar words use a recorded Burmese voice, so they work on every phone and computer.') :
    myok ? h('div', { class: 'okmsg' }, '✅ A Myanmar voice was found on this device.') : h('div', { class: 'warn' }, 'No Myanmar voice was found on this device. Android phones usually have one (Settings › Language › Text-to-speech › Google › Install voice data › Burmese). Words are still shown in big letters.'),
    h('div', { style: 'margin-top:8px' }, h('button', { class: 'btn sm', onclick: () => speak('မင်္ဂလာပါ', 'my', { audio: 'audio/my-test.mp3' }) }, '▶ Test Myanmar')),
    h('div', { style: 'margin-top:18px;display:flex;gap:8px;flex-wrap:wrap' },
      h('button', { class: 'btn alt sm', onclick: () => { if (confirm('Reset all stars and progress?')) { stars = 0; store.set('stars', 0); Object.keys(prog).forEach(k => delete prog[k]); store.set('prog', {}); const el = $('#starcount'); if (el) el.textContent = 0; toast('Progress reset'); } } }, '🗑 Reset stars'),
      h('button', { class: 'btn', onclick: () => m.remove() }, 'Done'))));
  document.body.append(m);
}

/* ---------- pages ---------- */
function home() {
  const daily = dailyCard();
  const c = h('div', null,
    h('div', { class: 'hero' },
      h('div', null, h('h1', null, 'Hello! Let’s learn today! 🌈'), h('p', null, 'Big colour pictures, talking words, lesson videos, games and practice for KG.'),
        daily && h('div', { class: 'daily', onclick: () => lightbox(daily.u, daily.g, daily.i) }, h('img', { src: daily.c.img, alt: '' }), h('div', null, h('b', null, '⭐ Word of the day'), h('span', null, 'Tap to see it big and hear it!')))),
      h('div', { class: 'big' }, '🎒📚🌟')),
    h('div', { class: 'banners' },
      songCount ? h('a', { class: 'songbanner', href: '#/songs' }, h('div', { class: 'em', 'aria-hidden': 'true' }, '🎵'),
        h('div', null, h('h3', null, 'Sing-along Songs'), h('p', null, songCount + ' famous English songs: ABC, numbers, animals and dancing!')),
        h('span', { class: 'go' }, '▶ Let’s sing')) : null,
      h('a', { class: 'songbanner artbanner', href: '#/art' }, h('div', { class: 'em', 'aria-hidden': 'true' }, '🎨'),
        h('div', null, h('h3', null, 'Art Studio'), h('p', null, 'Paint with beautiful colours, colour pictures and draw along!')),
        h('span', { class: 'go' }, '🖌️ Let’s paint')),
      h('a', { class: 'songbanner codebanner', href: '#/code' }, h('div', { class: 'em', 'aria-hidden': 'true' }, '🤖'),
        h('div', null, h('h3', null, 'Code Lab'), h('p', null, 'Guide the robot, fix bugs, find patterns and learn if–then!')),
        h('span', { class: 'go' }, '▶ Let’s code')),
      FAM.photos.length ? h('a', { class: 'songbanner fambanner', href: '#/family' }, h('div', { class: 'em', 'aria-hidden': 'true' }, '📸'),
        h('div', null, h('h3', null, 'Family Album'), h('p', null, 'Our happy trips: photos, a family movie and a memory game!')),
        h('span', { class: 'go' }, '📷 Open album')) : null),
    h('h2', { class: 'sec' }, '📖 Choose a subject'),
    h('div', { class: 'grid subjects' }, Object.keys(SUBJ).map(k => {
      const S = SUBJ[k], us = UNITS.filter(u => u.subject === k);
      return h('a', { class: 'tile', href: '#/s/' + k, style: '--c:' + S.color }, h('div', { class: 'corner' }), h('div', { class: 'em my' }, S.emoji), h('h3', null, S.name), h('p', null, S.blurb),
        h('span', { class: 'badge' }, us.length + ' units'), h('span', { class: 'badge', style: '--c:#ffb703;color:#2b2d42' }, us.reduce((a, u) => a + u.nQ, 0) + ' questions'));
    })),
    h('h2', { class: 'sec' }, '🆕 October & November lessons'),
    h('div', { class: 'grid subjects' }, UNITS.filter(u => /-oct$/.test(u.id)).map(unitTile)));
  shell(c, '#ef476f');
}
function dailyCard() {
  const pool = []; UNITS.forEach(u => { if (u.lang !== 'en') return; u.groups.forEach((g, gi) => { if (g.wide || g.textonly) return; g.cards.forEach((c, i) => { if (c.img) pool.push({ u, g, i, c }); }); }); });
  if (!pool.length) return null; const d = new Date(); const seed = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate();
  return pool[(seed * 7919) % pool.length];
}
function unitTile(u) {
  const S = SUBJ[u.subject];
  return h('a', { class: 'tile', href: '#/u/' + u.id + '/learn', style: '--c:' + S.color }, h('div', { class: 'corner' }), h('div', { class: 'em my' }, u.emoji), h('h3', null, S.name + ': ' + u.title), h('p', null, u.sub),
    h('span', { class: 'badge' }, u.nCards + ' pictures'), u.nQ ? h('span', { class: 'badge', style: '--c:#ffb703;color:#2b2d42' }, u.nQ + ' questions') : h('span', { class: 'badge', style: '--c:#ffb703;color:#2b2d42' }, 'games'));
}
function subjectPage(k) {
  const S = SUBJ[k]; if (!S) return home();
  const us = UNITS.filter(u => u.subject === k);
  shell(h('div', null, h('div', { class: 'crumb' }, h('a', { href: '#/' }, '🏠 Home')),
    h('div', { class: 'utitle' }, h('div', { class: 'em my' }, S.emoji), h('div', null, h('h1', null, S.name), h('p', null, S.blurb))),
    h('div', { class: 'grid subjects' }, us.map(unitTile))), S.color);
}

/* ---------- unit page ---------- */
const TABS = [['learn', '📖 Learn'], ['watch', '🎬 Watch'], ['practice', '✏️ Practice'], ['games', '🎮 Games']];
function unitPage(id, tab) {
  const u = BYID[id]; if (!u) return home(); const S = SUBJ[u.subject];
  const tabs = TABS.filter(t => t[0] !== 'practice' || u.nQ);
  if (!tabs.some(t => t[0] === tab)) tab = 'learn';
  const body = h('div');
  const box = h('div', null,
    h('div', { class: 'crumb' }, h('a', { href: '#/' }, '🏠 Home'), '›', h('a', { href: '#/s/' + u.subject }, S.name)),
    h('div', { class: 'utitle' }, h('div', { class: 'em my' }, u.emoji), h('div', null, h('h1', null, u.title), h('p', null, u.sub))),
    h('div', { class: 'tabs' }, tabs.map(t => h('a', { class: 'tab' + (t[0] === tab ? ' on' : ''), href: '#/u/' + id + '/' + t[0] }, t[1]))), body);
  shell(box, S.color);
  if (u.lang === 'my' && Voice.loaded && !hasMyVoice() && (tab === 'learn' || tab === 'watch')) body.append(h('div', { class: 'note', id: 'myvoicewarn' }, '🔈 No Myanmar voice was found on this device, so words will be shown without sound. Open the 🔊 button at the top for help (Android phones usually have a Burmese voice).'));
  ({ learn, watch, practice, games })[tab](u, body);
}

/* ---------- LEARN ---------- */
function learn(u, box) {
  if (u.ideas.length) {
    box.append(h('h2', { class: 'sec' }, '💡 Big ideas'),
      h('div', { class: 'ideas' }, u.ideas.map(i => h('div', { class: 'idea' },
        h('h3', null, h('button', { class: 'say', 'aria-label': 'Read aloud', onclick: () => speak(i.say || i.lines.join(' '), 'en') }, '🔊'), i.t),
        i.lines.map(l => h('p', { class: 'my' }, l)), i.img && h('img', { src: i.img, alt: '' })))));
  }
  u.groups.forEach((g, gi) => {
    const wideImgs = g.ar && g.ar > 1.5;
    const cls = 'cards' + (g.wide ? ' wide' : g.textonly ? ' text' : wideImgs ? ' big' : '');
    const grid = h('div', { class: cls });
    g.cards.forEach((c, i) => grid.append(cardEl(c, g, u, gi, i)));
    box.append(h('div', { class: 'group', style: '--gc:' + g.color },
      h('div', { class: 'ghead' }, h('h2', null, g.t), h('button', { class: 'say', title: 'Read all', 'aria-label': 'Read all', onclick: () => readAll(g, u, grid) }, '▶')), grid));
  });
}
let readTok = 0;
async function readAll(g, u, grid) {
  const me = ++readTok; stopSpeech();
  for (let i = 0; i < g.cards.length; i++) {
    if (me !== readTok) return; const el = grid.children[i]; if (!el) return;
    el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce'); el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    await speakCard(g.cards[i], u); await sleep(350);
  }
}
function cardEl(c, g, u, gi, i) {
  const el = h('button', { class: 'cd', style: '--gc:' + g.color, onclick: () => lightbox(u, g, i, gi) },
    h('span', { class: 'spk', onclick: e => { e.stopPropagation(); el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce'); speakCard(c, u); } }, '🔊'),
    c.img ? h('img', { class: 'pic', src: c.img, alt: c.w, loading: 'lazy' }) : h('div', { class: 'bigtxt my' }, c.big || c.w),
    c.img || !c.big ? h('div', { class: 'w' }, c.w) : null,
    c.sub ? h('div', { class: 's' }, c.sub) : null);
  return el;
}
function lightbox(u, g, i) {
  let idx = i; const m = h('div', { class: 'lb', style: '--gc:' + g.color });
  function render() {
    const c = g.cards[idx]; m.innerHTML = '';
    const box = h('div', { class: 'lbc' },
      c.img ? h('img', { src: c.img, alt: c.w }) : h('div', { class: 'my', style: 'font-size:clamp(50px,14vw,110px);font-weight:700;line-height:1.5' }, c.big || c.w),
      (c.img || !c.big) ? h('div', { class: 'w' }, c.w) : null, c.sub ? h('div', { class: 's' }, c.sub) : null,
      h('div', { class: 'lbrow' },
        h('button', { class: 'btn alt', 'aria-label': 'Previous', onclick: () => { idx = (idx + g.cards.length - 1) % g.cards.length; render(); } }, '◀'),
        h('button', { class: 'btn', onclick: () => speakCard(c, u) }, '🔊 Listen'),
        h('button', { class: 'btn alt', 'aria-label': 'Next', onclick: () => { idx = (idx + 1) % g.cards.length; render(); } }, '▶')),
      h('div', { class: 'lbrow' }, h('span', { class: 's' }, (idx + 1) + ' / ' + g.cards.length), h('button', { class: 'btn alt sm', onclick: close }, '✖ Close')));
    m.append(box); speakCard(c, u);
  }
  function close() { stopSpeech(); m.remove(); document.removeEventListener('keydown', key); }
  function key(e) { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') { idx = (idx + 1) % g.cards.length; render(); } if (e.key === 'ArrowLeft') { idx = (idx + g.cards.length - 1) % g.cards.length; render(); } }
  m.addEventListener('click', e => { if (e.target === m) close(); });
  document.addEventListener('keydown', key); document.body.append(m); render();
}

/* ---------- WATCH (video-style lesson player) ---------- */
function buildSlides(u) {
  const S = [{ k: 'title', say: u.title + '. ' + u.sub.replace(/[၌၍ဤ၏ိီး◌]/g, '') }];
  u.ideas.forEach(i => S.push({ k: 'idea', i, say: i.say || i.lines.join(' ') }));
  u.groups.forEach(g => { S.push({ k: 'group', g, say: g.say || g.t }); g.cards.forEach(c => S.push({ k: 'card', c, g })); });
  S.push({ k: 'end', say: 'Well done! You finished the lesson.' });
  return S;
}
function watch(u, box) {
  const slides = buildSlides(u), S = SUBJ[u.subject]; let idx = 0, playing = false, run = 0;
  const stage = h('div', { class: 'stage in' });
  const playBtn = h('button', { class: 'play', 'aria-label': 'Play' }, '▶');
  const bar = h('div', { class: 'bar' }, h('i')), cnt = h('div', { class: 'cnt' });
  const speed = h('select', { 'aria-label': 'Speed', onchange: e => { Voice.rate = +e.target.value; store.set('rate', Voice.rate); } },
    [['0.65', '🐢 Slow'], ['0.85', '🙂 Normal'], ['1.05', '🐇 Fast']].map(o => h('option', { value: o[0], selected: Math.abs(Voice.rate - +o[0]) < .1 }, o[1])));
  const player = h('div', { class: 'player' }, stage, h('div', { class: 'ctrl' },
    h('button', { 'aria-label': 'Previous', onclick: () => go(idx - 1) }, '⏮'), playBtn, h('button', { 'aria-label': 'Next', onclick: () => go(idx + 1) }, '⏭'),
    bar, cnt, speed, h('button', { 'aria-label': 'Full screen', onclick: () => { const f = player.requestFullscreen || player.webkitRequestFullscreen; if (f) f.call(player); } }, '⛶')));
  bar.addEventListener('click', e => { const r = bar.getBoundingClientRect(); go(Math.round(((e.clientX - r.left) / r.width) * (slides.length - 1))); });
  function show(i) {
    idx = Math.max(0, Math.min(slides.length - 1, i)); const s = slides[idx]; stage.className = 'stage'; void stage.offsetWidth; stage.className = 'stage in'; stage.innerHTML = '';
    stage.style.setProperty('--gc', s.g ? s.g.color : S.color);
    if (s.k === 'title') stage.append(h('div', { style: 'font-size:90px' }, u.emoji), h('div', { class: 'sw my' }, u.title), h('div', { class: 'ss my' }, u.sub));
    else if (s.k === 'group') stage.append(h('div', { class: 'sw' }, s.g.t), h('div', { class: 'ss' }, s.g.cards.length + ' pictures'));
    else if (s.k === 'idea') stage.append(...[h('div', { class: 'sw' }, '💡 ' + s.i.t), s.i.img ? h('div', { class: 'sp1' }, h('img', { src: s.i.img, alt: '' })) : null, ...s.i.lines.map(l => h('div', { class: 'ss my' }, l))].filter(Boolean));
    else if (s.k === 'card') {
      const c = s.c; stage.append(h('div', { class: 'gt' }, s.g.t));
      if (c.img) stage.append(h('div', { class: 'sp1' }, h('img', { src: c.img, alt: c.w })), h('div', { class: 'sw my' }, c.w), ...(c.sub ? [h('div', { class: 'ss my' }, c.sub)] : []));
      else stage.append(h('div', { class: 'bt my' }, c.big || c.w), ...(c.sub ? [h('div', { class: 'ss my' }, c.sub)] : []));
    } else stage.append(h('div', { style: 'font-size:90px' }, '🏆'), h('div', { class: 'sw' }, 'Well done!'), h('div', { class: 'ss' }, 'You finished: ' + u.title));
    bar.firstChild.style.width = (slides.length > 1 ? idx / (slides.length - 1) * 100 : 0) + '%'; cnt.textContent = (idx + 1) + ' / ' + slides.length;
  }
  async function narrate(s, me) {
    if (s.k === 'card') {
      if (u.lang === 'my') { await speakCard(s.c, u); if (me === run && s.c.sub) await speak(subText(s.c.sub), 'en'); }
      else { await speakCard(s.c, u); }
    } else await speak(s.say, 'en');
  }
  async function play(from) {
    const me = ++run; playing = true; playBtn.textContent = '⏸'; playBtn.setAttribute('aria-label', 'Pause');
    for (let i = from; i < slides.length; i++) {
      if (me !== run) return; show(i); await narrate(slides[i], me); if (me !== run) return; await sleep(slides[i].k === 'card' ? 700 : 500);
    }
    if (me === run) { playing = false; playBtn.textContent = '▶'; party(); addStars(3); toast('⭐ +3 stars for watching!'); }
  }
  function pause() { run++; playing = false; stopSpeech(); playBtn.textContent = '▶'; playBtn.setAttribute('aria-label', 'Play'); }
  function go(i) { i = Math.max(0, Math.min(slides.length - 1, i)); const was = playing; run++; stopSpeech(); show(i); if (was) play(i); }
  playBtn.addEventListener('click', () => { if (playing) pause(); else play(idx >= slides.length - 1 ? 0 : idx); });
  show(0);
  box.append(h('h2', { class: 'sec' }, '🎬 Lesson video'), h('p', { style: 'color:var(--soft);margin:-4px 0 12px' }, 'Press ▶ and watch the whole lesson. The pictures change and a voice reads each word.'), player);
  const vids = (CFG.videos || {})[u.id];
  if (vids && vids.length) {
    const list = vids.filter(v => v && v.youtube).map(v => ({ t: v.title || 'Song', by: v.by || '', yt: v.youtube }));
    const col = SUBJ[u.subject].color;
    box.append(h('h2', { class: 'sec' }, '🎵 Songs for this lesson'), h('div', { class: 'songs' }, list.map((s, i) => songCard(s, list, i, col))),
      h('p', { style: 'margin:14px 0 0' }, h('a', { class: 'btn alt sm', href: '#/songs', style: 'text-decoration:none;display:inline-block' }, '🎤 See all ' + songCount + ' sing-along songs')));
  }
  box.append(h('div', { class: 'note' }, 'Tip: tap ⛶ for full screen. Teachers can add songs for this lesson in js/config.js.'));
  box.__cleanup = () => { run++; stopSpeech(); };
}

/* ---------- PRACTICE ---------- */
const nrm = s => String(s == null ? '' : s).toLowerCase().replace(/[.!?,;:။၊"“”'’]/g, '').replace(/\s+/g, ' ').trim();
const nrmMy = s => nrm(s).replace(/\s/g, '');
function variants(a) {
  const v = new Set(); const add = x => { x = nrm(x); if (x) { v.add(x); v.add(x.replace(/\s/g, '')); } };
  add(a); add(a.replace(/\s*\(.*?\)\s*/g, ' ')); add(a.split('. ')[0]); add(a.replace(/\s*\(.*?\)\s*/g, ' ').replace(/^(in a|in the|in|a|an|the)\s+/i, ''));
  const m = a.match(/^([AB])(?:\.|\s|\()/); if (m) add(m[1]);
  const n = a.match(/^(\d)\s*[( ]/); if (n && /\(/.test(a)) add(n[1]);
  const p = a.match(/\(([^)]+)\)/); if (p && !isMy(a)) add(p[1].replace(/^a /, ''));
  return v;
}
function isCorrect(typed, a) { const t = nrm(typed); if (!t) return false; const vs = variants(a); return vs.has(t) || vs.has(t.replace(/\s/g, '')); }
function optionsOf(it, set) {
  const a = it.a, q = it.q || '', bank = it.bank || '';
  if (/^(true|false)\b/i.test(a)) return ['True', 'False'];
  if (/^[AB](\.|\s|\()/.test(a)) return ['A', 'B'];
  if (/^\d\s*\(/.test(a) && /1, 2, 3 or 4/.test(q + bank)) return ['1', '2', '3', '4'];
  if (/၌, ၍, ဤ or ၏/.test(q)) return ['၌', '၍', 'ဤ', '၏'];
  if (/voiced or unvoiced/i.test(q)) return ['Voiced', 'Unvoiced'];
  if (/jungle or on a farm/i.test(q)) return ['Jungle', 'Farm'];
  if (/\+ or −/.test(q + (set.hint || ''))) return ['+', '−'];
  const nums = (it.my || '').match(/\d\.\s+\S+/g);
  if (nums && nums.length >= 3 && !/Write 1, 2, 3 or 4/.test(q)) { const t = nums.map(x => x.replace(/^\d\.\s+/, '')); if (t.some(x => isCorrect(x, a))) return t; }
  let list = null; const src = bank + ' ' + (/^Word box:/.test(set.hint) ? set.hint : '');
  const m = bank.match(/\(([^)]+)\)/);
  if (m) list = m[1].split(/\s*,\s*/);
  else if (/Word box:/.test(src)) list = src.replace(/^[\s\S]*Word box:\s*/, '').split(/\s*,\s*/);
  else if (/^[a-z]{2}(\s{2,}[a-z]{2})+$/.test(bank.trim())) list = bank.trim().split(/\s{2,}/);
  if (!list && !bank && /Number words/.test(set.t)) { const mm = (set.hint || '').match(/\(([^)]+)\)/); if (mm) list = mm[1].split(/\s*,\s*/); }
  if (list && list.length >= 2 && list.length <= 10 && list.every(x => x.length <= 26) && list.some(x => isCorrect(x, a))) return list;
  if (it.my && !/_/.test(it.my) && !/ \/ /.test(it.my)) {
    let toks = it.my.split(/\s{2,}|\s+\|\s+/).map(x => x.replace(/^\d\.\s*/, '').trim()).filter(Boolean);
    if (toks.length >= 3 && toks.length <= 6 && toks.some(x => isCorrect(x, a))) return toks;
  }
  if (it.my && /_{3,}/.test(it.my) && set.t === 'Say the three steps') {
    const toks = it.my.split(/\s{2,}/).filter(x => !/_/.test(x)); const all = ALLTR.find(r => toks.every(t => r.includes(t)));
    if (all) return all;
  }
  return null;
}
const ALLTR = [['စည့်', 'စည်', 'စည်း'], ['ပိ', 'ပီ', 'ပီး'], ['နိ', 'နီ', 'နီး'], ['သည့်', 'သည်', 'သည်း'], ['ညိ', 'ညီ', 'ညီး'], ['မည့်', 'မည်', 'မည်း']];
function tilesOf(it, set) {
  const t = set.t;
  if (/Unscramble/.test(t) && it.bank) return { toks: it.bank.trim().split(/\s+/), join: '' };
  if (/Rearrange|in order/.test(t)) { const src = /Rearrange/.test(t) ? it.bank : it.my; if (src) return { toks: src.split(/\s*\/\s*/).map(x => x.trim()).filter(Boolean), join: isMy(src) ? '' : ' ' }; }
  return null;
}
function practice(u, box) {
  let si = store.get('ps_' + u.id, 0); if (si >= u.sets.length) si = 0; let qi = 0;
  const P = prog[u.id] = prog[u.id] || {};
  const chips = h('div', { class: 'chips' }), host = h('div');
  box.append(h('h2', { class: 'sec' }, '✏️ Practice: ' + u.nQ + ' questions'), chips, host);
  function drawChips() {
    chips.innerHTML = '';
    u.sets.forEach((s, i) => { const d = s.items.filter((_, j) => P[s.k + '-' + j]).length;
      chips.append(h('button', { class: 'chip' + (i === si ? ' on' : '') + (d === s.items.length ? ' done' : ''), title: s.t, onclick: () => { si = i; qi = 0; store.set('ps_' + u.id, si); drawChips(); render(); } }, s.k + (d ? ' · ' + d + '/' + s.items.length : ' · ' + s.items.length))); });
  }
  function render() {
    stopSpeech(); const s = u.sets[si], it = s.items[qi], key = s.k + '-' + qi; host.innerHTML = '';
    const my = u.lang === 'my', done = !!P[key]; let answered = done;
    const fb = h('div', { class: 'fb' }); const next = () => { if (qi < s.items.length - 1) { qi++; render(); } else if (si < u.sets.length - 1) { si++; qi = 0; store.set('ps_' + u.id, si); drawChips(); render(); } else { party(); toast('🎉 You finished all questions!'); } };
    function good() { if (!P[key]) { P[key] = 1; store.set('prog', prog); addStars(1); } answered = true; fb.className = 'fb ok'; fb.textContent = '✅ Correct! Great job!'; const r = fb.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 40); drawChips(); }
    function bad(sol) { fb.className = 'fb no'; fb.innerHTML = ''; fb.append('Not quite. Try again, or tap “Show answer”.'); }
    const solShow = () => { fb.className = 'fb'; fb.innerHTML = ''; fb.append('Answer: ', h('span', { class: 'sol my' }, it.a)); if (!P[key]) { /* showing answer gives no star */ } answered = true; };
    const card = h('div', { class: 'qcard' });
    card.append(h('div', { class: 'qmeta' }, h('span', null, 'Set ' + s.k + ': ' + s.t), h('span', null, 'Question ' + (qi + 1) + ' of ' + s.items.length)));
    card.append(h('div', { class: 'prog' }, h('i', { style: 'width:' + ((qi + 1) / s.items.length * 100) + '%' })));
    if (it.img) card.append(h('img', { class: 'qpic', src: it.img, alt: 'question picture' }));
    if (it.my && !/in order/.test(s.t)) { const parts = it.my.split(/\s{6,}|\s+\|\s+/); parts.forEach(p => card.append(h('div', { class: 'qmy my' }, p.replace(/\s{3}/g, '  ')))); }
    card.append(h('div', { class: 'qtext my' }, h('button', { class: 'say', style: 'display:inline-grid;vertical-align:middle;margin-right:8px;width:36px;height:36px', 'aria-label': 'Read the question', onclick: () => speak((it.q + ' ' + ((optionsOf(it, s) || []).length ? '' : (it.bank || ''))), 'en') }, '🔊'), it.q));
    const bank = it.bank || (/^Word box:/.test(s.hint) ? s.hint : ''); if (bank) card.append(h('div', { class: 'qbank my' }, bank));
    const T = tilesOf(it, s), O = T ? null : optionsOf(it, s);
    if (T) {
      const chosen = [], slots = h('div', { class: 'slots' }), pool = h('div', { class: 'tiles' }); const tiles = shuffle(T.toks.map((t, i) => ({ t, i, used: false })));
      const redraw = () => { slots.innerHTML = ''; chosen.forEach(x => slots.append(h('button', { class: 'tile2 my', style: 'width:auto;min-width:56px;padding:0 10px', onclick: () => { x.used = false; chosen.splice(chosen.indexOf(x), 1); redraw(); } }, x.t))); if (!chosen.length) slots.append(h('span', { style: 'color:var(--soft)' }, 'Tap the pieces in order')); pool.innerHTML = ''; tiles.forEach(x => pool.append(h('button', { class: 'tile2 my' + (x.used ? ' used' : ''), style: 'width:auto;min-width:56px;padding:0 10px', disabled: x.used, onclick: () => { x.used = true; chosen.push(x); redraw(); } }, x.t))); };
      const check = () => { const typed = chosen.map(x => x.t).join(T.join); if (chosen.length !== tiles.length) { fb.className = 'fb no'; fb.textContent = 'Use all the pieces first.'; return; } (isCorrect(typed, it.a) || nrmMy(typed) === nrmMy(it.a) || nrm(typed.replace(/ /g, '')) === nrm(it.a.replace(/ /g, ''))) ? good() : (bad(), chosen.forEach(x => x.used = false), chosen.length = 0, redraw()); };
      redraw(); card.append(slots, pool, h('div', { class: 'ans' }, h('button', { class: 'btn', onclick: check }, '✔ Check'), h('button', { class: 'btn alt', onclick: () => { chosen.forEach(x => x.used = false); chosen.length = 0; redraw(); } }, '↺ Clear')));
    } else if (O) {
      const row = h('div', { class: 'opts' });
      O.forEach(o => { const b = h('button', { class: 'opt my', onclick: () => { if (isCorrect(o, it.a) || nrm(o) === nrm(it.a)) { b.classList.add('right'); good(); } else { b.classList.add('wrong'); bad(); } } }, o); row.append(b); });
      card.append(row);
    } else {
      const inp = h('input', { type: 'text', class: 'my', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', inputmode: /^\d+$/.test(it.a.trim()) ? 'numeric' : 'text', placeholder: my ? 'Type your answer' : 'Type your answer here', onkeydown: e => { if (e.key === 'Enter') chk(); } });
      function chk() { if (!inp.value.trim()) return; isCorrect(inp.value, it.a) ? good() : bad(); }
      card.append(h('div', { class: 'ans' }, inp, h('button', { class: 'btn', onclick: chk }, '✔ Check')));
    }
    card.append(fb);
    card.append(h('div', { class: 'qnav' }, h('button', { class: 'btn alt', disabled: qi === 0 && si === 0, onclick: () => { if (qi > 0) qi--; else if (si > 0) { si--; qi = u.sets[si].items.length - 1; drawChips(); } render(); } }, '◀ Back'),
      h('button', { class: 'btn alt', onclick: solShow }, '👀 Show answer'), h('button', { class: 'btn', onclick: next }, 'Next ▶')));
    if (done) { fb.className = 'fb ok'; fb.textContent = '⭐ You answered this one before.'; }
    host.append(card);
  }
  drawChips(); render();
  box.__cleanup = stopSpeech;
}

/* ---------- GAMES ---------- */
function poolOf(u, needImg) {
  const out = []; u.groups.forEach(g => { if (g.wide) return; if (u.subject === 'maths' && !/^(Numbers|Tens and ones|Maths words)/.test(g.t)) return; g.cards.forEach(c => { if (needImg ? c.img : (c.img || c.big || /^[^\s]+$/.test(c.w))) out.push(c); }); });
  const seen = new Set(); return out.filter(c => { const k = c.w; if (seen.has(k)) return false; seen.add(k); return true; });
}
function games(u, box) {
  const host = h('div'); const list = [];
  const imgs = poolOf(u, true), any = poolOf(u, false);
  if (any.length >= 4 && (u.lang !== 'my' || hasMyVoice())) list.push(['🎧', 'Listen and pick', 'Hear the word. Tap the right picture.', () => listenPick(u, host, back)]);
  if (imgs.length >= 4 && !/^(maths)$/.test(u.subject)) list.push(['👀', 'Which word?', 'Look at the picture. Pick the word.', () => whichWord(u, host, back)]);
  if (imgs.length >= 6) list.push(['🧠', 'Memory match', 'Find the matching picture and word.', () => memory(u, host, back)]);
  if (u.lang === 'en' && u.subject !== 'maths' && imgs.filter(c => /^[a-z]{3,9}$/i.test(c.w)).length >= 4) list.push(['🔤', 'Spell it', 'Tap the letters to spell the word.', () => spell(u, host, back)]);
  if (u.subject === 'maths') list.push(['➕', 'Quick sums', 'Add and subtract with dots. Unlimited!', () => sums(u, host, back)]);
  function back() { stopSpeech(); host.innerHTML = ''; host.append(menu()); }
  function menu() { return h('div', null, h('h2', { class: 'sec' }, '🎮 Choose a game'), h('div', { class: 'gpick' }, list.map(g => h('button', { class: 'gbtn', onclick: g[3] }, h('div', { class: 'em' }, g[0]), h('h3', null, g[1]), h('p', null, g[2]))))); }
  box.append(host); host.append(menu()); box.__cleanup = stopSpeech;
}
function gameFrame(host, title, onBack) { host.innerHTML = ''; const body = h('div'); const hd = h('div', { class: 'ghd' }, h('button', { class: 'btn alt sm', onclick: onBack }, '◀ Games'), h('span', null, title), h('span', { id: 'gscore' }, '')); host.append(h('div', { class: 'gbox' }, hd, body)); return { body, score: t => { const e = $('#gscore'); if (e) e.textContent = t; } }; }
function finish(f, score, total, again, onBack) {
  const bonus = score >= total * .8 ? 3 : 0; if (bonus) { addStars(bonus); party(); }
  const s = score >= total * .8 ? '⭐⭐⭐' : score >= total * .5 ? '⭐⭐' : '⭐';
  f.body.innerHTML = ''; f.body.append(h('div', { class: 'result' }, h('div', { class: 'big' }, score >= total * .8 ? '🏆' : '👍'), h('h2', null, 'You got ' + score + ' out of ' + total + '!'), h('div', { class: 'stars' }, s), bonus ? h('p', null, '+3 bonus stars!') : null,
    h('div', { class: 'lbrow' }, h('button', { class: 'btn', onclick: again }, '↺ Play again'), h('button', { class: 'btn alt', onclick: onBack }, '◀ Games'))));
}
function pickOthers(pool, c, n) { return shuffle(pool.filter(x => x.w !== c.w)).slice(0, n); }
function listenPick(u, host, back) {
  const f = gameFrame(host, '🎧 Listen and pick', back), N = 10, withImg = poolOf(u, true).length >= 4; const pool = withImg ? poolOf(u, true) : poolOf(u, false);
  const rounds = shuffle(pool).slice(0, N); let i = 0, score = 0;
  function next() {
    if (i >= rounds.length) return finish(f, score, rounds.length, () => listenPick(u, host, back), back);
    const c = rounds[i]; const opts = shuffle([c, ...pickOthers(pool, c, 3)]); f.body.innerHTML = ''; f.score('Question ' + (i + 1) + '/' + rounds.length + '  ·  ✔ ' + score);
    const play = () => speakCard(c, u); let locked = false;
    f.body.append(h('button', { class: 'bigspk', 'aria-label': 'Listen again', onclick: play }, '🔊'), h('p', { style: 'text-align:center;color:var(--soft);margin:0' }, 'Listen. Tap the right one.'),
      h('div', { class: 'choices' }, opts.map(o => { const b = h('button', { class: 'choice my', onclick: () => { if (locked) return; locked = true; if (o === c) { b.classList.add('right'); score++; const r = b.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 30); } else { b.classList.add('wrong'); [...b.parentNode.children].forEach(x => { if (x.__c === c) x.classList.add('right'); }); } setTimeout(() => { i++; next(); }, 1100); } }, o.img ? h('img', { src: o.img, alt: '' }) : (o.big || o.w)); b.__c = o; return b; })));
    setTimeout(play, 300);
  }
  next();
}
function whichWord(u, host, back) {
  const f = gameFrame(host, '👀 Which word?', back), N = 10, pool = poolOf(u, true), rounds = shuffle(pool).slice(0, N); let i = 0, score = 0;
  function next() {
    if (i >= rounds.length) return finish(f, score, rounds.length, () => whichWord(u, host, back), back);
    const c = rounds[i]; const opts = shuffle([c, ...pickOthers(pool, c, 3)]); f.body.innerHTML = ''; f.score('Question ' + (i + 1) + '/' + rounds.length + '  ·  ✔ ' + score); let locked = false;
    f.body.append(h('img', { class: 'qpic', src: c.img, alt: '', style: 'max-height:240px', onclick: () => speakCard(c, u) }), h('p', { style: 'text-align:center;color:var(--soft);margin:0' }, 'Which word is this? (tap the picture to hear it)'),
      h('div', { class: 'choices' }, opts.map(o => { const b = h('button', { class: 'choice my', onclick: () => { if (locked) return; locked = true; speakCard(c, u); if (o === c) { b.classList.add('right'); score++; const r = b.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 30); } else { b.classList.add('wrong'); [...b.parentNode.children].forEach(x => { if (x.__c === c) x.classList.add('right'); }); } setTimeout(() => { i++; next(); }, 1300); } }, o.w); b.__c = o; return b; })));
  }
  next();
}
function memory(u, host, back) {
  const f = gameFrame(host, '🧠 Memory match', back); const pool = shuffle(poolOf(u, true)).slice(0, 6);
  const deck = shuffle(pool.flatMap(c => [{ c, k: 'p' }, { c, k: 'w' }])); let open = [], moves = 0, found = 0, lock = false;
  const grid = h('div', { class: 'mem' });
  deck.forEach(d => { const el = h('button', { class: 'mc', 'aria-label': 'card', onclick: () => flip(d, el) }, h('div', { class: 'f' }, h('div', { class: 'bk' }, '?'), h('div', { class: 'fr my' }, d.k === 'p' ? h('img', { src: d.c.img, alt: '' }) : d.c.w))); d.el = el; grid.append(el); });
  function flip(d, el) {
    if (lock || el.classList.contains('flip') || el.classList.contains('done')) return; el.classList.add('flip'); if (d.k === 'w') speakCard(d.c, u); open.push(d);
    if (open.length === 2) { moves++; f.score('Moves: ' + moves); lock = true; const [a, b] = open;
      if (a.c === b.c && a.k !== b.k) { setTimeout(() => { a.el.classList.add('done'); b.el.classList.add('done'); a.el.classList.remove('flip'); b.el.classList.remove('flip'); open = []; lock = false; found++; confetti(innerWidth / 2, innerHeight / 2, 25); if (found === 6) { addStars(3); party(); f.body.append(h('div', { class: 'result' }, h('h2', null, '🎉 You found them all in ' + moves + ' moves!'), h('p', null, '+3 stars'), h('div', { class: 'lbrow' }, h('button', { class: 'btn', onclick: () => memory(u, host, back) }, '↺ Play again')))); } }, 500); }
      else setTimeout(() => { a.el.classList.remove('flip'); b.el.classList.remove('flip'); open = []; lock = false; }, 900); }
  }
  f.body.append(h('p', { style: 'text-align:center;color:var(--soft);margin:6px 0' }, 'Flip two cards. Match each picture with its word.'), grid);
}
function spell(u, host, back) {
  const f = gameFrame(host, '🔤 Spell it', back), pool = poolOf(u, true).filter(c => /^[a-z]{3,9}$/i.test(c.w)), rounds = shuffle(pool).slice(0, 8); let i = 0, score = 0;
  function next() {
    if (i >= rounds.length) return finish(f, score, rounds.length, () => spell(u, host, back), back);
    const c = rounds[i], word = c.w.toLowerCase(); f.body.innerHTML = ''; f.score('Word ' + (i + 1) + '/' + rounds.length + '  ·  ✔ ' + score);
    const letters = shuffle(word.split('').map((ch, k) => ({ ch, k, used: false }))); const got = []; let tries = 0;
    const slots = h('div', { class: 'slots' }), tiles = h('div', { class: 'tiles' });
    function draw() {
      slots.innerHTML = ''; for (let k = 0; k < word.length; k++) slots.append(h('div', { class: 'slot' }, got[k] ? got[k].ch : ''));
      tiles.innerHTML = ''; letters.forEach(l => tiles.append(h('button', { class: 'tile2' + (l.used ? ' used' : ''), disabled: l.used, onclick: () => { l.used = true; got.push(l); draw(); if (got.length === word.length) done(); } }, l.ch)));
    }
    function done() {
      if (got.map(x => x.ch).join('') === word) { score++; speak(c.w, 'en'); const r = slots.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 40); setTimeout(() => { i++; next(); }, 1300); }
      else { slots.style.animation = 'shake .4s'; setTimeout(() => { slots.style.animation = ''; got.length = 0; letters.forEach(l => l.used = false); tries++; draw(); }, 500); if (tries >= 2) { /* allow more tries */ } }
    }
    f.body.append(h('img', { class: 'qpic', src: c.img, alt: '', style: 'max-height:220px', onclick: () => speakCard(c, u) }), h('div', { style: 'text-align:center' }, h('button', { class: 'btn alt sm', onclick: () => speakCard(c, u) }, '🔊 Hear the word')), slots, tiles,
      h('div', { class: 'lbrow' }, h('button', { class: 'btn alt sm', onclick: () => { got.length = 0; letters.forEach(l => l.used = false); draw(); } }, '↺ Clear'), h('button', { class: 'btn alt sm', onclick: () => { i++; next(); } }, 'Skip ▶')));
    draw(); setTimeout(() => speakCard(c, u), 250);
  }
  next();
}
function sums(u, host, back) {
  const max = u.maxn || 10, f = gameFrame(host, '➕ Quick sums (up to ' + max + ')', back), N = 10; let i = 0, score = 0;
  function next() {
    if (i >= N) return finish(f, score, N, () => sums(u, host, back), back);
    const plus = Math.random() < .5; let a, b, ans; if (plus) { a = rnd(1, max - 1); b = rnd(1, max - a); ans = a + b; } else { a = rnd(2, max); b = rnd(1, a - 1); ans = a - b; }
    const opts = new Set([ans]); while (opts.size < 4) { const o = Math.max(0, Math.min(max, ans + rnd(-3, 3))); opts.add(o); } let locked = false;
    f.body.innerHTML = ''; f.score('Question ' + (i + 1) + '/' + N + '  ·  ✔ ' + score);
    const dots = h('div', { class: 'dots' }); for (let k = 0; k < a; k++) dots.append(h('i', { style: !plus && k >= a - b ? 'opacity:.25' : '' })); if (plus) for (let k = 0; k < b; k++) dots.append(h('i', { class: 'b' }));
    f.body.append(h('div', { class: 'eq' }, a + ' ' + (plus ? '+' : '−') + ' ' + b + ' = ?'), dots, h('p', { style: 'text-align:center;color:var(--soft);margin:0' }, plus ? 'Blue dots + orange dots. Count them all.' : 'Take away the faded dots.'),
      h('div', { class: 'choices' }, [...opts].sort((x, y) => x - y).map(o => h('button', { class: 'choice', onclick: e => { if (locked) return; locked = true; const b2 = e.currentTarget; if (o === ans) { b2.classList.add('right'); score++; confetti(e.clientX, e.clientY, 30); } else { b2.classList.add('wrong'); [...b2.parentNode.children].forEach(x => { if (+x.textContent === ans) x.classList.add('right'); }); } speak(a + (plus ? ' plus ' : ' minus ') + b + ' equals ' + ans, 'en'); setTimeout(() => { i++; next(); }, 1500); } }, String(o)))));
  }
  next();
}

/* ---------- SONGS ---------- */
const SONGS = (window.KGSONGS || []).filter(c => c && c.songs && c.songs.length);
const songCount = SONGS.reduce((a, c) => a + c.songs.length, 0);
let songClose = null;
function songCard(s, list, i, color) {
  return h('button', { class: 'song', style: '--c:' + (color || 'var(--accent)'), 'aria-label': 'Play ' + s.t, onclick: () => playSong(list, i, color) },
    h('div', { class: 'thumb' }, h('img', { src: 'https://i.ytimg.com/vi/' + s.yt + '/hqdefault.jpg', alt: '', loading: 'lazy' }), h('span', { class: 'play' }, '▶')),
    h('div', { class: 'meta' }, h('b', null, s.t), s.by ? h('small', null, s.by) : null));
}
function playSong(list, i, color) {
  stopSpeech(); if (songClose) songClose();
  const s = list[i];
  const onKey = e => { if (e.key === 'Escape') close(); };
  const close = () => { m.remove(); removeEventListener('keydown', onKey); if (songClose === close) songClose = null; };
  const m = h('div', { class: 'modal songm', onclick: e => { if (e.target === m) close(); } },
    h('div', { class: 'sbox', style: '--c:' + (color || 'var(--accent)') },
      h('div', { class: 'shead' }, h('div', null, h('b', null, '🎵 ' + s.t), s.by ? h('small', null, s.by) : null),
        h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: close }, '✕')),
      h('div', { class: 'frame' }, h('iframe', { src: 'https://www.youtube-nocookie.com/embed/' + s.yt + '?autoplay=1&rel=0&playsinline=1', title: s.t, allowfullscreen: true, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen' })),
      list.length > 1 ? h('div', { class: 'snav' },
        h('button', { class: 'btn alt sm', disabled: i === 0, onclick: () => playSong(list, i - 1, color) }, '◀ Back'),
        h('span', null, (i + 1) + ' / ' + list.length),
        h('button', { class: 'btn sm', disabled: i >= list.length - 1, onclick: () => playSong(list, i + 1, color) }, 'Next song ▶')) : null));
  songClose = close; addEventListener('keydown', onKey); document.body.append(m);
  const seen = store.get('songs_seen', {});
  if (!seen[s.yt]) { seen[s.yt] = 1; store.set('songs_seen', seen); addStars(1); toast('⭐ +1 star for watching!'); }
}
function songsPage(cat) {
  const sel = SONGS.find(c => c.id === cat);
  const c = h('div', null,
    h('div', { class: 'crumb' }, h('a', { href: '#/' }, '🏠 Home')),
    h('div', { class: 'songhero' },
      h('div', null, h('h1', null, 'Sing-along Songs'), h('p', null, 'Famous English songs loved by children all over America. Tap a song, sing along and dance!'),
        h('span', { class: 'badge' }, '🎵 ' + songCount + ' songs'), h('span', { class: 'badge' }, '⭐ +1 star for each new song')),
      h('div', { class: 'notes', 'aria-hidden': 'true' }, '🎤')),
    h('div', { class: 'chips' }, h('a', { class: 'chip' + (sel ? '' : ' on'), href: '#/songs' }, '🌈 All songs'),
      SONGS.map(k => h('a', { class: 'chip' + (sel === k ? ' on' : ''), href: '#/songs/' + k.id, style: '--c:' + k.color }, k.emoji + ' ' + k.name))),
    (sel ? [sel] : SONGS).map(k => h('section', null,
      h('h2', { class: 'sec songsec', style: '--c:' + k.color }, h('span', { class: 'dot' }, k.emoji), k.name, h('small', null, k.songs.length + ' songs')),
      h('div', { class: 'songs' }, k.songs.map((s, i) => songCard(s, k.songs, i, k.color))))),
    h('div', { class: 'note' }, 'Songs play from YouTube, so an internet connection is needed. Grown-ups can add or change songs in js/songs.js.'));
  shell(c, '#8338ec');
  return () => { if (songClose) songClose(); };
}

/* ---------- ART STUDIO ---------- */
const ARTV = (window.KGART || []).filter(c => c && c.songs && c.songs.length);
const artCount = ARTV.reduce((a, c) => a + c.songs.length, 0);
const AW = 1200, AH = 900;
const COLORS = [['Red', '#ef233c'], ['Pink', '#ff5d8f'], ['Orange', '#ff9f1c'], ['Yellow', '#ffd60a'], ['Light green', '#a7d129'], ['Green', '#2bb673'],
  ['Mint', '#06d6a0'], ['Sky blue', '#4cc9f0'], ['Blue', '#3a86ff'], ['Dark blue', '#3f37c9'], ['Purple', '#9d4edd'], ['Light purple', '#cdb4f6'],
  ['Light pink', '#ffc8dd'], ['Peach', '#ffcfa3'], ['Brown', '#8d5524'], ['Grey', '#adb5bd'], ['Black', '#2b2d42'], ['White', '#ffffff']];
const TOOLS = [['brush', '🖌️', 'Brush'], ['rainbow', '🌈', 'Rainbow'], ['sparkle', '✨', 'Sparkle'], ['fill', '🪣', 'Fill'], ['stamp', '⭐', 'Stamp'], ['eraser', '🧽', 'Eraser']];
const SIZES = [['Small', 8], ['Medium', 22], ['Big', 48]];
const STAMPS = ['⭐', '❤️', '🌸', '🦋', '🐞', '🌈', '☀️', '🍎', '🐟', '🐱', '🚗', '🎈'];
function cloudPath(c, x, y, s) {
  s = s || 1;
  c.moveTo(x - 130 * s, y + 50 * s); c.quadraticCurveTo(x - 175 * s, y + 5 * s, x - 115 * s, y - 25 * s); c.quadraticCurveTo(x - 105 * s, y - 95 * s, x - 30 * s, y - 75 * s);
  c.quadraticCurveTo(x + 25 * s, y - 135 * s, x + 85 * s, y - 65 * s); c.quadraticCurveTo(x + 155 * s, y - 65 * s, x + 140 * s, y + 5 * s); c.quadraticCurveTo(x + 175 * s, y + 50 * s, x + 130 * s, y + 50 * s); c.closePath();
}
const TAU = Math.PI * 2;
const circ = (c, x, y, r, fill) => { c.beginPath(); c.arc(x, y, r, 0, TAU); fill ? c.fill() : c.stroke(); };
const PAGES = [
  ['blank', 'Blank page', null],
  ['apple', 'Apple', c => {
    c.beginPath(); c.moveTo(600, 300); c.bezierCurveTo(500, 220, 300, 250, 320, 470); c.bezierCurveTo(340, 680, 480, 770, 600, 710); c.bezierCurveTo(720, 770, 860, 680, 880, 470); c.bezierCurveTo(900, 250, 700, 220, 600, 300); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(590, 302); c.quadraticCurveTo(580, 230, 615, 165); c.lineTo(642, 177); c.quadraticCurveTo(608, 235, 614, 300); c.stroke();
    c.beginPath(); c.moveTo(620, 240); c.quadraticCurveTo(700, 140, 810, 175); c.quadraticCurveTo(730, 275, 620, 240); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(395, 430); c.quadraticCurveTo(400, 360, 455, 325); c.stroke();
  }],
  ['fish', 'Fish', c => {
    c.beginPath(); c.ellipse(530, 450, 270, 175, 0, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(770, 410); c.lineTo(965, 290); c.quadraticCurveTo(905, 450, 965, 610); c.lineTo(770, 490); c.stroke();
    c.beginPath(); c.moveTo(450, 290); c.quadraticCurveTo(540, 165, 650, 300); c.stroke();
    c.beginPath(); c.moveTo(470, 610); c.quadraticCurveTo(530, 700, 600, 612); c.stroke();
    c.beginPath(); c.arc(330, 450, 140, -0.55, 0.55); c.stroke();
    circ(c, 390, 410, 34); circ(c, 398, 414, 13, true);
    c.beginPath(); c.arc(318, 492, 26, 0.3, 1.6); c.stroke();
    [[560, 400], [640, 450], [560, 500], [680, 380], [680, 520]].forEach(p => { c.beginPath(); c.arc(p[0], p[1], 34, -1.2, 1.2); c.stroke(); });
    circ(c, 190, 250, 26); circ(c, 140, 165, 18); circ(c, 215, 110, 12);
  }],
  ['house', 'House', c => {
    c.strokeRect(350, 410, 500, 370);
    c.beginPath(); c.moveTo(740, 292); c.lineTo(740, 200); c.lineTo(800, 200); c.lineTo(800, 342); c.stroke();
    c.beginPath(); c.moveTo(300, 410); c.lineTo(600, 160); c.lineTo(900, 410); c.closePath(); c.stroke();
    c.strokeRect(545, 600, 110, 180); circ(c, 635, 690, 9, true);
    [405, 685].forEach(x => { c.strokeRect(x, 480, 110, 100); c.beginPath(); c.moveTo(x + 55, 480); c.lineTo(x + 55, 580); c.moveTo(x, 530); c.lineTo(x + 110, 530); c.stroke(); });
    c.beginPath(); c.moveTo(40, 780); c.lineTo(1160, 780); c.stroke();
    circ(c, 1050, 140, 60);
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.moveTo(1050 + Math.cos(a) * 80, 140 + Math.sin(a) * 80); c.lineTo(1050 + Math.cos(a) * 115, 140 + Math.sin(a) * 115); c.stroke(); }
    c.beginPath(); cloudPath(c, 200, 170, .9); c.stroke();
    [[120, 780], [220, 780], [980, 780], [1080, 780]].forEach(p => { c.beginPath(); c.moveTo(p[0] - 30, p[1]); c.lineTo(p[0] - 15, p[1] - 50); c.lineTo(p[0], p[1]); c.lineTo(p[0] + 15, p[1] - 50); c.lineTo(p[0] + 30, p[1]); c.stroke(); });
  }],
  ['flower', 'Flower', c => {
    c.save(); c.beginPath(); c.rect(0, 0, AW, AH); c.arc(600, 290, 62, 0, TAU); c.clip('evenodd');
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.ellipse(600 + Math.cos(a) * 125, 290 + Math.sin(a) * 125, 78, 48, a, 0, TAU); c.stroke(); }
    c.restore(); circ(c, 600, 290, 62);
    c.beginPath(); c.moveTo(578, 485); c.quadraticCurveTo(560, 630, 578, 768); c.moveTo(622, 485); c.quadraticCurveTo(604, 630, 622, 768); c.stroke();
    c.beginPath(); c.moveTo(585, 640); c.quadraticCurveTo(470, 560, 405, 615); c.quadraticCurveTo(480, 700, 583, 668); c.stroke();
    c.beginPath(); c.moveTo(596, 600); c.quadraticCurveTo(720, 520, 795, 575); c.quadraticCurveTo(720, 660, 596, 630); c.stroke();
    c.beginPath(); c.moveTo(470, 760); c.lineTo(730, 760); c.lineTo(700, 885); c.lineTo(500, 885); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(482, 800); c.lineTo(718, 800); c.stroke();
  }],
  ['sun', 'Sun', c => {
    circ(c, 600, 450, 170);
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.moveTo(600 + Math.cos(a - .14) * 205, 450 + Math.sin(a - .14) * 205); c.lineTo(600 + Math.cos(a) * 335, 450 + Math.sin(a) * 335); c.lineTo(600 + Math.cos(a + .14) * 205, 450 + Math.sin(a + .14) * 205); c.closePath(); c.stroke(); }
    circ(c, 540, 410, 17, true); circ(c, 660, 410, 17, true); circ(c, 495, 480, 26); circ(c, 705, 480, 26);
    c.beginPath(); c.arc(600, 460, 80, .2 * Math.PI, .8 * Math.PI); c.stroke();
  }],
  ['butterfly', 'Butterfly', c => {
    c.save(); c.beginPath(); c.rect(0, 0, AW, AH); c.ellipse(600, 470, 34, 200, 0, 0, TAU); c.clip('evenodd');
    [[430, 340, 180, 135, -.5], [770, 340, 180, 135, .5], [465, 610, 128, 100, .5], [735, 610, 128, 100, -.5]].forEach(w => { c.beginPath(); c.ellipse(w[0], w[1], w[2], w[3], w[4], 0, TAU); c.stroke(); });
    circ(c, 420, 330, 48); circ(c, 780, 330, 48); circ(c, 470, 615, 34); circ(c, 730, 615, 34);
    c.restore();
    c.beginPath(); c.ellipse(600, 470, 34, 200, 0, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(588, 290); c.quadraticCurveTo(560, 180, 500, 145); c.moveTo(612, 290); c.quadraticCurveTo(640, 180, 700, 145); c.stroke();
    circ(c, 494, 140, 16); circ(c, 706, 140, 16); circ(c, 588, 320, 7, true); circ(c, 612, 320, 7, true);
  }],
  ['rainbow', 'Rainbow', c => {
    c.save(); c.beginPath(); c.rect(0, 0, AW, AH); cloudPath(c, 150, 720, 1.1); cloudPath(c, 1050, 720, 1.1); c.clip('evenodd');
    [470, 400, 330, 260, 190].forEach(r => { c.beginPath(); c.arc(600, 720, r, Math.PI, 0); c.stroke(); });
    c.beginPath(); c.moveTo(130, 720); c.lineTo(410, 720); c.moveTo(790, 720); c.lineTo(1070, 720); c.stroke();
    c.restore();
    c.beginPath(); cloudPath(c, 150, 720, 1.1); c.stroke(); c.beginPath(); cloudPath(c, 1050, 720, 1.1); c.stroke();
    circ(c, 1050, 150, 70);
  }],
  ['cat', 'Cat', c => {
    c.save(); c.beginPath(); c.rect(0, 0, AW, AH); c.arc(600, 470, 210, 0, TAU); c.clip('evenodd');
    c.beginPath(); c.moveTo(425, 380); c.lineTo(445, 160); c.lineTo(585, 268); c.closePath(); c.moveTo(775, 380); c.lineTo(755, 160); c.lineTo(615, 268); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(465, 300); c.lineTo(472, 215); c.lineTo(530, 262); c.moveTo(735, 300); c.lineTo(728, 215); c.lineTo(670, 262); c.stroke();
    c.restore(); circ(c, 600, 470, 210);
    c.beginPath(); c.ellipse(520, 440, 30, 42, 0, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(680, 440, 30, 42, 0, 0, TAU); c.stroke();
    circ(c, 525, 448, 13, true); circ(c, 685, 448, 13, true);
    c.beginPath(); c.moveTo(578, 505); c.lineTo(622, 505); c.lineTo(600, 530); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(600, 530); c.quadraticCurveTo(600, 575, 552, 570); c.moveTo(600, 530); c.quadraticCurveTo(600, 575, 648, 570); c.stroke();
    c.beginPath(); c.moveTo(470, 520); c.lineTo(290, 490); c.moveTo(470, 545); c.lineTo(290, 560); c.moveTo(730, 520); c.lineTo(910, 490); c.moveTo(730, 545); c.lineTo(910, 560); c.stroke();
  }]
];
/* drawing helpers for colouring pages */
const rr = (c, x, y, w, hh, r) => { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const circP = (c, x, y, r) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); };
const ellP = (c, x, y, rx, ry, rot) => { c.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); c.ellipse(x, y, rx, ry, rot, 0, TAU); };
const starP = (c, x, y, R) => { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? R * .45 : R; i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); };
const S = (c, f) => { c.beginPath(); f(); c.stroke(); };
/* draw `draw` everywhere EXCEPT inside the shapes made by `excl` (so lines stay behind them) */
const outside = (c, excl, draw) => { c.save(); c.beginPath(); c.rect(0, 0, AW, AH); excl(); c.clip('evenodd'); draw(); c.restore(); };
const inside = (c, shape, draw) => { c.save(); c.beginPath(); shape(); c.clip(); draw(); c.restore(); };
const waveP = (c, y) => { c.moveTo(-20, y); for (let x = -20; x < AW + 20; x += 100) c.quadraticCurveTo(x + 50, y - 28, x + 100, y); };
const sunP = (c, x, y, r) => { S(c, () => circP(c, x, y, r)); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; S(c, () => { c.moveTo(x + Math.cos(a) * (r + 18), y + Math.sin(a) * (r + 18)); c.lineTo(x + Math.cos(a) * (r + 52), y + Math.sin(a) * (r + 52)); }); } };
PAGES.push(
  ['car', 'Car', c => {
    const wheels = () => { circP(c, 340, 610, 88); circP(c, 870, 610, 88); };
    outside(c, wheels, () => {
      S(c, () => { c.moveTo(170, 600); c.lineTo(170, 505); c.quadraticCurveTo(170, 460, 220, 456); c.lineTo(370, 450); c.lineTo(455, 335); c.quadraticCurveTo(475, 308, 515, 308); c.lineTo(760, 308); c.quadraticCurveTo(798, 308, 822, 338); c.lineTo(915, 450); c.lineTo(1005, 462); c.quadraticCurveTo(1050, 470, 1050, 520); c.lineTo(1050, 600); c.closePath(); });
      S(c, () => { c.moveTo(60, 700); c.lineTo(1140, 700); });
    });
    S(c, wheels); S(c, () => { circP(c, 340, 610, 36); circP(c, 870, 610, 36); });
    S(c, () => { c.moveTo(478, 440); c.lineTo(530, 340); c.lineTo(645, 340); c.lineTo(645, 440); c.closePath(); });
    S(c, () => { c.moveTo(675, 440); c.lineTo(675, 340); c.lineTo(765, 340); c.quadraticCurveTo(785, 342, 800, 360); c.lineTo(860, 440); c.closePath(); });
    S(c, () => { c.moveTo(660, 456); c.lineTo(660, 590); });
    S(c, () => rr(c, 690, 478, 46, 14, 7)); S(c, () => ellP(c, 1028, 500, 14, 24, 0)); S(c, () => rr(c, 174, 478, 26, 44, 8));
    sunP(c, 1060, 150, 58); S(c, () => cloudPath(c, 230, 170, .9));
  }],
  ['motorcycle', 'Motorcycle', c => {
    const wheels = () => { circP(c, 300, 640, 115); circP(c, 900, 640, 115); };
    outside(c, wheels, () => {
      S(c, () => { c.moveTo(745, 420); c.lineTo(888, 640); c.moveTo(772, 405); c.lineTo(912, 628); });
      S(c, () => { c.moveTo(430, 540); c.lineTo(505, 445); c.quadraticCurveTo(600, 395, 700, 430); c.lineTo(770, 520); c.quadraticCurveTo(700, 575, 620, 575); c.lineTo(470, 575); c.closePath(); });
      S(c, () => c.arc(300, 640, 150, Math.PI * 1.12, Math.PI * 1.72));
      S(c, () => rr(c, 360, 592, 270, 42, 21));
      S(c, () => { c.moveTo(40, 757); c.lineTo(1160, 757); });
    });
    S(c, wheels); S(c, () => { circP(c, 300, 640, 70); circP(c, 900, 640, 70); circP(c, 300, 640, 20); circP(c, 900, 640, 20); });
    S(c, () => { c.moveTo(330, 455); c.quadraticCurveTo(335, 415, 385, 418); c.lineTo(520, 425); c.quadraticCurveTo(545, 432, 525, 455); c.lineTo(360, 475); c.closePath(); });
    S(c, () => { c.moveTo(758, 412); c.lineTo(790, 330); c.lineTo(840, 322); }); S(c, () => rr(c, 832, 308, 54, 24, 11));
    S(c, () => circP(c, 818, 432, 32));
    sunP(c, 140, 140, 55);
  }],
  ['boat', 'Sailboat', c => {
    const hull = () => { c.moveTo(250, 600); c.lineTo(950, 600); c.lineTo(860, 720); c.lineTo(340, 720); c.closePath(); };
    outside(c, hull, () => { S(c, () => waveP(c, 700)); S(c, () => waveP(c, 800)); });
    S(c, hull); S(c, () => { c.moveTo(291, 655); c.lineTo(909, 655); });
    [420, 600, 780].forEach(x => S(c, () => circP(c, x, 628, 16)));
    S(c, () => { c.moveTo(590, 600); c.lineTo(590, 95); c.lineTo(610, 95); c.lineTo(610, 600); });
    S(c, () => { c.moveTo(578, 170); c.lineTo(578, 570); c.lineTo(300, 570); c.closePath(); });
    S(c, () => { c.moveTo(622, 200); c.lineTo(622, 570); c.lineTo(860, 570); c.closePath(); });
    S(c, () => { c.moveTo(610, 100); c.lineTo(700, 125); c.lineTo(610, 150); });
    sunP(c, 1040, 150, 60);
    [[200, 160], [290, 220]].forEach(b => S(c, () => { c.moveTo(b[0] - 40, b[1]); c.quadraticCurveTo(b[0] - 20, b[1] - 25, b[0], b[1]); c.quadraticCurveTo(b[0] + 20, b[1] - 25, b[0] + 40, b[1]); }));
  }],
  ['bicycle', 'Bicycle', c => {
    [[330, 600], [870, 600]].forEach(w => { S(c, () => circP(c, w[0], w[1], 150)); S(c, () => circP(c, w[0], w[1], 128)); S(c, () => circP(c, w[0], w[1], 18)); });
    S(c, () => { c.moveTo(330, 600); c.lineTo(560, 600); c.lineTo(500, 385); c.closePath(); c.moveTo(500, 385); c.lineTo(790, 385); c.lineTo(560, 600); c.moveTo(790, 385); c.lineTo(870, 600); });
    S(c, () => { c.moveTo(500, 385); c.lineTo(492, 352); });
    S(c, () => { c.moveTo(440, 352); c.quadraticCurveTo(450, 322, 500, 326); c.lineTo(560, 332); c.quadraticCurveTo(572, 352, 545, 360); c.closePath(); });
    S(c, () => { c.moveTo(790, 385); c.lineTo(770, 300); c.lineTo(830, 292); }); S(c, () => rr(c, 822, 278, 54, 26, 12));
    S(c, () => circP(c, 560, 600, 30)); S(c, () => { c.moveTo(560, 600); c.lineTo(600, 662); }); S(c, () => rr(c, 578, 656, 56, 18, 7));
    S(c, () => { c.moveTo(40, 752); c.lineTo(1160, 752); });
    sunP(c, 1060, 140, 55); S(c, () => cloudPath(c, 220, 160, .85));
  }],
  ['plane', 'Aeroplane', c => {
    const body = () => { c.moveTo(200, 450); c.quadraticCurveTo(200, 380, 300, 380); c.lineTo(900, 380); c.quadraticCurveTo(1060, 388, 1085, 450); c.quadraticCurveTo(1060, 512, 900, 520); c.lineTo(300, 520); c.quadraticCurveTo(200, 520, 200, 450); c.closePath(); };
    outside(c, body, () => {
      S(c, () => { c.moveTo(250, 400); c.lineTo(175, 215); c.lineTo(255, 215); c.lineTo(390, 400); c.closePath(); });
      S(c, () => { c.moveTo(520, 500); c.lineTo(760, 500); c.lineTo(560, 720); c.lineTo(455, 720); c.closePath(); });
      S(c, () => { c.moveTo(560, 400); c.lineTo(700, 400); c.lineTo(560, 255); c.lineTo(500, 255); c.closePath(); });
      S(c, () => { c.moveTo(230, 470); c.lineTo(120, 505); c.lineTo(140, 545); c.lineTo(270, 500); c.closePath(); });
    });
    S(c, body);
    inside(c, body, () => S(c, () => { c.moveTo(100, 492); c.lineTo(1150, 492); }));
    for (let x = 420; x <= 820; x += 80) S(c, () => circP(c, x, 432, 22));
    S(c, () => { c.moveTo(965, 412); c.quadraticCurveTo(1035, 410, 1058, 445); c.lineTo(965, 445); c.closePath(); });
    S(c, () => rr(c, 318, 404, 50, 82, 14));
    S(c, () => cloudPath(c, 950, 170, .9)); S(c, () => cloudPath(c, 180, 790, .8)); S(c, () => cloudPath(c, 1000, 770, .7));
  }],
  ['speedboat', 'Speedboat', c => {
    const hull = () => { c.moveTo(150, 540); c.lineTo(1000, 540); c.lineTo(1120, 505); c.lineTo(1000, 665); c.lineTo(225, 665); c.closePath(); };
    outside(c, hull, () => {
      S(c, () => waveP(c, 650)); S(c, () => waveP(c, 770));
      S(c, () => { c.moveTo(160, 585); c.quadraticCurveTo(90, 555, 30, 590); c.moveTo(180, 625); c.quadraticCurveTo(110, 610, 40, 640); });
    });
    S(c, hull);
    inside(c, hull, () => S(c, () => { c.moveTo(100, 600); c.lineTo(500, 600); c.lineTo(540, 575); c.lineTo(580, 625); c.lineTo(620, 600); c.lineTo(1150, 600); }));
    S(c, () => circP(c, 380, 632, 22));
    S(c, () => { c.moveTo(560, 540); c.lineTo(650, 430); c.lineTo(820, 430); c.lineTo(880, 540); }); S(c, () => { c.moveTo(735, 430); c.lineTo(745, 540); });
    S(c, () => { c.moveTo(232, 540); c.lineTo(232, 420); c.lineTo(305, 440); c.lineTo(232, 462); });
    sunP(c, 1050, 150, 60); S(c, () => cloudPath(c, 260, 170, .85));
  }],
  ['superkid', 'Super Kid', c => {
    const torso = () => rr(c, 500, 360, 200, 225, 45);
    const boots = () => { rr(c, 500, 715, 100, 62, 22); rr(c, 600, 715, 100, 62, 22); };
    outside(c, torso, () => {
      outside(c, boots, () => S(c, () => { c.moveTo(510, 385); c.lineTo(370, 760); c.quadraticCurveTo(600, 805, 830, 760); c.lineTo(690, 385); }));
      S(c, () => { c.moveTo(510, 398); c.lineTo(405, 262); c.lineTo(448, 232); c.lineTo(535, 372); });
      S(c, () => { c.moveTo(695, 400); c.lineTo(790, 470); c.lineTo(735, 548); c.lineTo(700, 522); });
      outside(c, boots, () => S(c, () => { rr(c, 515, 585, 75, 175, 25); rr(c, 610, 585, 75, 175, 25); }));
    });
    S(c, torso); S(c, boots); S(c, () => circP(c, 420, 232, 38));
    S(c, () => circP(c, 600, 250, 110));
    inside(c, () => circP(c, 600, 250, 110), () => S(c, () => { c.moveTo(470, 215); c.quadraticCurveTo(520, 145, 600, 172); c.quadraticCurveTo(665, 138, 730, 215); }));
    S(c, () => { c.moveTo(498, 228); c.quadraticCurveTo(600, 200, 702, 228); c.lineTo(698, 280); c.quadraticCurveTo(600, 258, 502, 280); c.closePath(); });
    S(c, () => { ellP(c, 558, 248, 22, 13, 0); ellP(c, 642, 248, 22, 13, 0); });
    S(c, () => c.arc(600, 296, 34, .2 * Math.PI, .8 * Math.PI));
    S(c, () => starP(c, 600, 452, 55)); S(c, () => { c.moveTo(500, 545); c.lineTo(700, 545); });
  }],
  ['anthero', 'Ant Hero', c => {
    const thorax = () => ellP(c, 600, 470, 85, 68, 0), head = () => circP(c, 790, 330, 100);
    outside(c, thorax, () => {
      S(c, () => ellP(c, 390, 520, 160, 120, -.15));
      S(c, () => { c.moveTo(560, 410); c.quadraticCurveTo(430, 330, 300, 370); c.quadraticCurveTo(360, 430, 330, 500); c.quadraticCurveTo(470, 470, 560, 520); });
      [[545, 520, 470, 690], [600, 535, 600, 710], [655, 520, 730, 690]].forEach(l => S(c, () => { c.moveTo(l[0], l[1]); c.quadraticCurveTo((l[0] + l[2]) / 2 + (l[2] > l[0] ? 25 : l[2] < l[0] ? -25 : 0), l[1] + 70, l[2], l[3]); }));
    });
    outside(c, () => { thorax(); head(); }, () => S(c, () => { c.moveTo(670, 440); c.lineTo(720, 392); c.moveTo(680, 472); c.lineTo(738, 410); }));
    S(c, thorax); S(c, head);
    S(c, () => { ellP(c, 470, 702, 32, 14, 0); ellP(c, 600, 722, 32, 14, 0); ellP(c, 730, 702, 32, 14, 0); });
    S(c, () => { c.moveTo(700, 315); c.quadraticCurveTo(790, 285, 882, 315); c.lineTo(878, 362); c.quadraticCurveTo(790, 342, 704, 362); c.closePath(); });
    S(c, () => { ellP(c, 752, 336, 20, 12, 0); ellP(c, 830, 336, 20, 12, 0); });
    S(c, () => c.arc(796, 378, 30, .15 * Math.PI, .85 * Math.PI));
    S(c, () => { c.moveTo(750, 240); c.quadraticCurveTo(720, 170, 684, 152); c.moveTo(830, 238); c.quadraticCurveTo(860, 170, 900, 152); });
    S(c, () => { circP(c, 672, 146, 18); circP(c, 912, 146, 18); });
    S(c, () => starP(c, 600, 470, 34));
    S(c, () => { c.moveTo(60, 760); c.lineTo(1140, 760); });
  }],
  ['teamhero', 'Helmet Hero', c => {
    const helmet = () => { c.moveTo(455, 330); c.quadraticCurveTo(450, 125, 600, 125); c.quadraticCurveTo(750, 125, 745, 330); c.lineTo(745, 395); c.quadraticCurveTo(600, 430, 455, 395); c.closePath(); };
    const torso = () => rr(c, 470, 415, 260, 225, 45), boots = () => { rr(c, 483, 770, 120, 70, 26); rr(c, 597, 770, 120, 70, 26); };
    outside(c, helmet, () => {
      outside(c, torso, () => { S(c, () => { rr(c, 395, 440, 72, 190, 30); rr(c, 733, 440, 72, 190, 30); }); S(c, () => { circP(c, 431, 655, 40); circP(c, 769, 655, 40); }); });
      outside(c, () => { torso(); boots(); }, () => S(c, () => { rr(c, 495, 630, 95, 175, 30); rr(c, 610, 630, 95, 175, 30); }));
      S(c, torso);
    });
    S(c, boots); S(c, helmet);
    S(c, () => { c.moveTo(482, 262); c.quadraticCurveTo(600, 232, 718, 262); c.lineTo(704, 332); c.quadraticCurveTo(600, 352, 496, 332); c.closePath(); });
    S(c, () => { c.moveTo(612, 148); c.lineTo(578, 198); c.lineTo(602, 198); c.lineTo(585, 228); c.lineTo(634, 178); c.lineTo(609, 178); c.lineTo(628, 148); c.closePath(); });
    S(c, () => circP(c, 600, 515, 52));
    S(c, () => { c.moveTo(610, 478); c.lineTo(583, 518); c.lineTo(603, 518); c.lineTo(590, 552); c.lineTo(625, 508); c.lineTo(605, 508); c.lineTo(620, 478); c.closePath(); });
    S(c, () => { c.moveTo(470, 598); c.lineTo(730, 598); }); S(c, () => rr(c, 566, 583, 68, 30, 8));
  }],
  ['beardoll', 'Bear Buddy', c => {
    const hood = () => circP(c, 600, 330, 200), body = () => rr(c, 495, 505, 210, 200, 70);
    outside(c, hood, () => {
      S(c, () => { circP(c, 445, 165, 62); circP(c, 755, 165, 62); }); S(c, () => { circP(c, 445, 165, 30); circP(c, 755, 165, 30); });
      outside(c, body, () => S(c, () => { ellP(c, 470, 585, 36, 62, .5); ellP(c, 730, 585, 36, 62, -.5); ellP(c, 548, 712, 58, 30, 0); ellP(c, 652, 712, 58, 30, 0); }));
      S(c, body);
    });
    S(c, hood); S(c, () => ellP(c, 600, 370, 150, 125, 0));
    inside(c, () => ellP(c, 600, 370, 150, 125, 0), () => S(c, () => { c.moveTo(430, 330); c.quadraticCurveTo(500, 270, 560, 300); c.quadraticCurveTo(600, 262, 640, 300); c.quadraticCurveTo(700, 270, 770, 330); }));
    S(c, () => { ellP(c, 548, 405, 24, 32, 0); ellP(c, 652, 405, 24, 32, 0); }); S(c, () => { circP(c, 556, 394, 8); circP(c, 660, 394, 8); });
    S(c, () => { circP(c, 510, 448, 20); circP(c, 690, 448, 20); }); S(c, () => c.arc(600, 450, 18, .15 * Math.PI, .85 * Math.PI));
    S(c, () => circP(c, 600, 612, 45));
  }],
  ['stardoll', 'Star Fairy', c => {
    const head = () => circP(c, 600, 315, 165), dress = () => { c.moveTo(525, 470); c.lineTo(675, 470); c.lineTo(770, 745); c.lineTo(430, 745); c.closePath(); };
    outside(c, head, () => {
      S(c, () => { circP(c, 450, 175, 58); circP(c, 750, 175, 58); });
      outside(c, dress, () => { S(c, () => { ellP(c, 555, 762, 42, 22, 0); ellP(c, 645, 762, 42, 22, 0); }); S(c, () => { c.moveTo(522, 520); c.lineTo(432, 610); c.moveTo(678, 520); c.lineTo(770, 590); c.lineTo(850, 470); }); });
      S(c, dress);
    });
    S(c, () => { circP(c, 425, 616, 20); circP(c, 773, 594, 20); });
    S(c, head);
    inside(c, head, () => S(c, () => { c.moveTo(420, 300); c.quadraticCurveTo(520, 215, 600, 262); c.quadraticCurveTo(680, 215, 780, 300); }));
    S(c, () => { c.arc(545, 362, 24, 1.15 * Math.PI, 1.85 * Math.PI); }); S(c, () => { c.arc(655, 362, 24, 1.15 * Math.PI, 1.85 * Math.PI); });
    S(c, () => { circP(c, 500, 395, 22); circP(c, 700, 395, 22); }); S(c, () => c.arc(600, 400, 22, .15 * Math.PI, .85 * Math.PI));
    S(c, () => starP(c, 868, 440, 55)); S(c, () => starP(c, 600, 620, 34)); S(c, () => starP(c, 690, 205, 26));
  }]
);
const PCATS = [['all', '🌈 All'], ['nature', '🌸 Nature & animals'], ['go', '🚗 Things that go'], ['hero', '🦸 Heroes'], ['toy', '🧸 Cute toys']];
const PMETA = {
  apple: ['nature', [['the apple', 'Red'], ['the leaf', 'Green'], ['the stem', 'Brown']]],
  fish: ['nature', [['the fish', 'Orange'], ['the tail', 'Yellow'], ['the bubbles', 'Sky blue']]],
  house: ['nature', [['the roof', 'Red'], ['the walls', 'Yellow'], ['the door', 'Brown'], ['the windows', 'Sky blue'], ['the sun', 'Orange']]],
  flower: ['nature', [['the petals', 'Pink'], ['the middle', 'Yellow'], ['the leaves', 'Green'], ['the pot', 'Orange']]],
  sun: ['nature', [['the sun', 'Yellow'], ['the rays', 'Orange'], ['the cheeks', 'Pink']]],
  butterfly: ['nature', [['the big wings', 'Purple'], ['the small wings', 'Pink'], ['the spots', 'Yellow'], ['the body', 'Black']]],
  rainbow: ['nature', [['the top stripe', 'Red'], ['the next stripe', 'Orange'], ['the middle stripe', 'Yellow'], ['the next stripe', 'Green'], ['the bottom stripe', 'Blue']]],
  cat: ['nature', [['the cat', 'Orange'], ['the ears', 'Pink'], ['the eyes', 'Green']]],
  car: ['go', [['the car', 'Red'], ['the wheels', 'Black'], ['the windows', 'Sky blue'], ['the sun', 'Yellow']]],
  motorcycle: ['go', [['the motorcycle', 'Blue'], ['the seat', 'Black'], ['the tyres', 'Grey'], ['the light', 'Yellow']]],
  boat: ['go', [['the big sail', 'Red'], ['the small sail', 'Yellow'], ['the boat', 'Blue'], ['the flag', 'Green'], ['the water', 'Sky blue']]],
  bicycle: ['go', [['the bicycle', 'Green'], ['the seat', 'Brown'], ['the tyres', 'Black'], ['the sun', 'Yellow']]],
  plane: ['go', [['the aeroplane', 'Blue'], ['the wings', 'Grey'], ['the tail', 'Red'], ['the windows', 'Yellow']]],
  speedboat: ['go', [['the speedboat', 'Orange'], ['the stripe', 'Red'], ['the window', 'Sky blue'], ['the water', 'Blue']]],
  superkid: ['hero', [['the cape', 'Red'], ['the suit', 'Blue'], ['the mask', 'Black'], ['the star', 'Yellow'], ['the boots', 'Red']]],
  anthero: ['hero', [['the ant', 'Red'], ['the mask', 'Blue'], ['the cape', 'Yellow'], ['the star', 'Orange']]],
  teamhero: ['hero', [['the helmet', 'Red'], ['the visor', 'Black'], ['the suit', 'Red'], ['the gloves', 'White'], ['the lightning', 'Yellow']]],
  beardoll: ['toy', [['the hood', 'Brown'], ['the ears', 'Pink'], ['the body', 'Light green'], ['the cheeks', 'Pink']]],
  stardoll: ['toy', [['the hair', 'Purple'], ['the dress', 'Pink'], ['the stars', 'Yellow'], ['the shoes', 'Red']]]
};
const PAGEBY = {}; PAGES.forEach(p => { PAGEBY[p[0]] = p; });
function drawPage(c, id, lw) {
  const p = PAGEBY[id]; if (!p || !p[2]) return;
  c.save(); c.strokeStyle = c.fillStyle = '#2b2d42'; c.lineWidth = lw; c.lineCap = c.lineJoin = 'round'; p[2](c); c.restore();
}
function paintStudio(box) {
  const st = Object.assign({ tool: 'brush', color: '#ef233c', size: 22, stamp: '⭐', page: 'blank' }, store.get('art_state', {}));
  if (!PAGEBY[st.page]) st.page = 'blank';
  const paint = h('canvas', { width: AW, height: AH, class: 'paint', 'aria-label': 'Painting board' });
  const lines = h('canvas', { width: AW, height: AH, class: 'lines' });
  const pc = paint.getContext('2d', { willReadFrequently: true }), lc = lines.getContext('2d', { willReadFrequently: true });
  const easel = h('div', { class: 'easel' }, paint, lines);
  const undo = []; let dirty = false, saveT = 0;
  const undoBtn = h('button', { class: 'btn alt', onclick: () => { if (!undo.length) return; pc.putImageData(undo.pop(), 0, 0); updUndo(); scheduleSave(); } }, '↩️ Undo');
  const updUndo = () => { undoBtn.disabled = !undo.length; };
  const snapshot = () => { try { undo.push(pc.getImageData(0, 0, AW, AH)); if (undo.length > 8) undo.shift(); } catch (e) {} updUndo(); };
  function scheduleSave() {
    dirty = true; clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem('kg_art_img', paint.toDataURL('image/png')); localStorage.setItem('kg_art_img_page', st.page); } catch (e) {} }, 700);
  }
  function setPage(id, keep) {
    st.page = id; pc.fillStyle = '#fff'; pc.fillRect(0, 0, AW, AH); lc.clearRect(0, 0, AW, AH); drawPage(lc, id, 10);
    undo.length = 0; updUndo(); drawMission(); upd();
    if (!keep) { dirty = false; try { localStorage.removeItem('kg_art_img'); } catch (e) {} }
  }
  /* drawing */
  let down = false, last = null, mid = null, hue = 0, pid = null;
  const pos = e => { const r = paint.getBoundingClientRect(); return { x: (e.clientX - r.left) * AW / r.width, y: (e.clientY - r.top) * AH / r.height }; };
  const bw = () => st.tool === 'eraser' ? st.size * 1.6 : st.size;
  const col = () => st.tool === 'eraser' ? '#ffffff' : st.tool === 'rainbow' ? 'hsl(' + Math.round(hue) + ',95%,55%)' : st.color;
  function star5(x, y, s) { pc.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? s * .45 : s; pc.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } pc.closePath(); pc.fill(); }
  function sparkle(p) {
    const n = 3 + (st.size / 10 | 0);
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = Math.random() * st.size * 1.8; pc.fillStyle = Math.random() < .5 ? st.color : COLORS[rnd(0, 11)][1]; star5(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 3 + Math.random() * (st.size / 3.2)); }
  }
  function dot(p) { if (st.tool === 'sparkle') return sparkle(p); pc.fillStyle = col(); pc.beginPath(); pc.arc(p.x, p.y, bw() / 2, 0, TAU); pc.fill(); }
  function drawTo(p) {
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    if (st.tool === 'sparkle') { if (dist < st.size * .6) return; sparkle(p); last = p; return; }
    if (dist < 1) return;
    if (st.tool === 'rainbow') hue = (hue + dist * .5) % 360;
    const m = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
    pc.lineCap = pc.lineJoin = 'round'; pc.lineWidth = bw(); pc.strokeStyle = col();
    pc.beginPath(); pc.moveTo(mid.x, mid.y); pc.quadraticCurveTo(last.x, last.y, m.x, m.y); pc.stroke();
    last = p; mid = m;
  }
  function stampAt(p) {
    pc.save(); pc.font = Math.round(st.size * 3.2 + 30) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    pc.textAlign = 'center'; pc.textBaseline = 'middle'; pc.fillText(st.stamp, p.x, p.y); pc.restore();
  }
  function floodFill(x, y, hex) {
    x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= AW || y >= AH) return;
    const img = pc.getImageData(0, 0, AW, AH), d = img.data, L = lc.getImageData(0, 0, AW, AH).data;
    const i0 = (y * AW + x) * 4; if (L[i0 + 3] > 90) return;
    const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], n = parseInt(hex.slice(1), 16), fr = n >> 16 & 255, fg = n >> 8 & 255, fb = n & 255;
    if (Math.abs(fr - tr) + Math.abs(fg - tg) + Math.abs(fb - tb) < 12) return;
    const seen = new Uint8Array(AW * AH);
    const ok = k => { if (seen[k]) return false; const i = k * 4; return L[i + 3] <= 90 && Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) <= 110; };
    const stack = [y * AW + x];
    while (stack.length) {
      const k = stack.pop(); if (!ok(k)) continue;
      const yy = (k / AW) | 0, xx = k - yy * AW; let l = xx, r = xx;
      while (l > 0 && ok(yy * AW + l - 1)) l--;
      while (r < AW - 1 && ok(yy * AW + r + 1)) r++;
      for (let i = l; i <= r; i++) {
        const kk = yy * AW + i, q = kk * 4; seen[kk] = 1; d[q] = fr; d[q + 1] = fg; d[q + 2] = fb; d[q + 3] = 255;
        if (yy > 0 && !seen[kk - AW]) stack.push(kk - AW);
        if (yy < AH - 1 && !seen[kk + AW]) stack.push(kk + AW);
      }
    }
    pc.putImageData(img, 0, 0);
  }
  const end = () => { if (down || pid !== null) scheduleSave(); down = false; pid = null; last = null; };
  easel.addEventListener('pointerdown', e => {
    if (pid !== null) return; e.preventDefault(); pid = e.pointerId; try { easel.setPointerCapture(pid); } catch (x) {}
    snapshot(); const p = pos(e);
    if (st.tool === 'fill') { floodFill(p.x, p.y, st.color); end(); return; }
    if (st.tool === 'stamp') { stampAt(p); end(); return; }
    down = true; last = p; mid = p; dot(p);
  });
  easel.addEventListener('pointermove', e => {
    if (!down || e.pointerId !== pid) return;
    const evs = (e.getCoalescedEvents && e.getCoalescedEvents()) || []; (evs.length ? evs : [e]).forEach(ev => drawTo(pos(ev)));
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => easel.addEventListener(t, e => { if (e.pointerId === pid) end(); }));
  /* controls */
  const curName = () => (COLORS.find(c => c[1] === st.color) || ['My colour'])[0];
  const nameEl = h('span'), curDot = h('i');
  const swatches = COLORS.map(([name, hex]) => h('button', { class: 'sw', style: '--sw:' + hex, title: name, 'aria-label': name, 'data-c': hex,
    onclick: () => { st.color = hex; if (st.tool === 'eraser' || st.tool === 'rainbow') st.tool = 'brush'; upd(); speak(name, 'en'); } }));
  const picker = h('input', { type: 'color', value: st.color, 'aria-label': 'Choose any colour', oninput: e => { st.color = e.target.value; if (st.tool === 'eraser' || st.tool === 'rainbow') st.tool = 'brush'; upd(); } });
  const palette = h('div', { class: 'palette' }, swatches, h('label', { class: 'sw more', title: 'More colours' }, '+', picker), h('div', { class: 'curname' }, curDot, nameEl));
  const toolBtns = TOOLS.map(([id, ic, label]) => h('button', { class: 'tool', 'data-t': id, onclick: () => { st.tool = id; upd(); } }, h('span', { class: 'ic' }, ic), h('small', null, label)));
  const sizeBtns = SIZES.map(([n, s]) => h('button', { class: 'size', 'data-s': s, title: n, 'aria-label': n + ' brush', onclick: () => { st.size = s; upd(); } }, h('i', { style: 'width:' + Math.round(8 + s / 1.8) + 'px;height:' + Math.round(8 + s / 1.8) + 'px' })));
  const stampRow = h('div', { class: 'stamps' }, STAMPS.map(s => h('button', { class: 'stamp', 'data-st': s, 'aria-label': 'Stamp ' + s, onclick: () => { st.stamp = s; upd(); } }, s)));
  const pageBtns = PAGES.map(([id, label]) => {
    const th = h('canvas', { width: 160, height: 120 }); const tc = th.getContext('2d');
    tc.fillStyle = '#fff'; tc.fillRect(0, 0, 160, 120); tc.save(); tc.scale(160 / AW, 120 / AH); drawPage(tc, id, 26); tc.restore();
    return h('button', { class: 'pg', 'data-p': id, onclick: () => {
      if (st.page === id && !dirty) return;
      if (dirty && !confirm('Start a new picture? Your painting will be cleared.')) return;
      setPage(id); if (id !== 'blank') speak(label, 'en');
    } }, th, h('small', null, label));
  });
  /* picture categories + colour missions */
  if (!st.cat || !PCATS.some(k => k[0] === st.cat)) st.cat = 'all';
  const catBtns = PCATS.map(([id, label]) => h('button', { class: 'chip', 'data-k': id, onclick: () => { st.cat = id; upd(); } }, label));
  const mission = h('div', { class: 'mission' });
  function drawMission() {
    mission.innerHTML = '';
    const m = PMETA[st.page];
    if (!m || !m[1].length) { mission.style.display = 'none'; return; }
    mission.style.display = '';
    mission.append(h('b', { class: 'mt' }, '🎯 Colour mission'),
      ...m[1].map(([what, name]) => {
        const hex = (COLORS.find(k => k[0] === name) || COLORS[0])[1], n = parseInt(hex.slice(1), 16);
        const dark = (.299 * (n >> 16 & 255) + .587 * (n >> 8 & 255) + .114 * (n & 255)) < 150;
        return h('button', { class: 'task', 'data-c': hex, onclick: () => { st.color = hex; st.tool = 'fill'; upd(); speak('Colour ' + what + ' ' + name.toLowerCase() + '.', 'en'); } },
          h('i', { style: '--sw:' + hex }), 'Colour ' + what + ' ', h('b', { class: 'cw' + (dark ? ' dk' : ''), style: '--sw:' + hex }, name.toLowerCase()), ' 🔊');
      }));
  }
  function upd() {
    catBtns.forEach(b => b.classList.toggle('on', b.dataset.k === st.cat));
    pageBtns.forEach(b => { const k = (PMETA[b.dataset.p] || [])[0]; b.style.display = (st.cat === 'all' || !k || k === st.cat) ? '' : 'none'; });
    mission.querySelectorAll('.task').forEach(b => b.classList.toggle('on', b.dataset.c === st.color && st.tool !== 'eraser' && st.tool !== 'rainbow'));
    toolBtns.forEach(b => b.classList.toggle('on', b.dataset.t === st.tool));
    sizeBtns.forEach(b => b.classList.toggle('on', +b.dataset.s === st.size));
    swatches.forEach(b => b.classList.toggle('on', b.dataset.c === st.color && st.tool !== 'eraser' && st.tool !== 'rainbow'));
    stampRow.querySelectorAll('.stamp').forEach(b => b.classList.toggle('on', b.dataset.st === st.stamp));
    pageBtns.forEach(b => b.classList.toggle('on', b.dataset.p === st.page));
    stampRow.style.display = st.tool === 'stamp' ? '' : 'none';
    const show = st.tool === 'rainbow' ? 'conic-gradient(#ef233c,#ff9f1c,#ffd60a,#2bb673,#3a86ff,#9d4edd,#ef233c)' : st.tool === 'eraser' ? '#ffffff' : st.color;
    box.style.setProperty('--cur', show);
    nameEl.textContent = st.tool === 'rainbow' ? 'Rainbow' : st.tool === 'eraser' ? 'Eraser' : curName();
    easel.style.cursor = st.tool === 'fill' ? 'cell' : st.tool === 'stamp' ? 'copy' : 'crosshair';
    store.set('art_state', st);
  }
  function savePicture() {
    const out = document.createElement('canvas'); out.width = AW; out.height = AH; const o = out.getContext('2d');
    o.drawImage(paint, 0, 0); o.drawImage(lines, 0, 0);
    const done = url => { const a = h('a', { href: url, download: 'my-painting.png' }); document.body.append(a); a.click(); setTimeout(() => { a.remove(); if (url.slice(0, 5) === 'blob:') URL.revokeObjectURL(url); }, 3000); party(); addStars(2); toast('⭐ +2 stars! Your picture is saved'); };
    if (out.toBlob) out.toBlob(b => done(b ? URL.createObjectURL(b) : out.toDataURL('image/png')), 'image/png'); else done(out.toDataURL('image/png'));
  }
  box.append(
    h('div', { class: 'pagesbar' }, h('b', null, '🖍️ Pick a picture to colour'), h('div', { class: 'chips pcats' }, catBtns), h('div', { class: 'pages' }, pageBtns)),
    mission, palette, stampRow,
    h('div', { class: 'studio' },
      h('div', { class: 'tools' }, toolBtns, h('div', { class: 'sizes' }, sizeBtns)),
      h('div', null, easel,
        h('div', { class: 'artbar' }, undoBtn,
          h('button', { class: 'btn alt', onclick: () => { if (!dirty || confirm('Clear your painting?')) setPage(st.page); } }, '🗑️ Clear'),
          h('button', { class: 'btn good', onclick: savePicture }, '💾 Save my picture')))),
    h('div', { class: 'note' }, '💡 Tip: choose 🪣 Fill and tap inside a shape to colour it in one go. Tap a colour to hear its name!'));
  setPage(st.page, true);
  try {
    const saved = localStorage.getItem('kg_art_img');
    if (saved && localStorage.getItem('kg_art_img_page') === st.page) { const im = new Image(); im.onload = () => { pc.drawImage(im, 0, 0); dirty = true; }; im.src = saved; }
  } catch (e) {}
  return () => { if (dirty) { clearTimeout(saveT); try { localStorage.setItem('kg_art_img', paint.toDataURL('image/png')); localStorage.setItem('kg_art_img_page', st.page); } catch (e) {} } };
}
function artPage(tab) {
  tab = tab === 'videos' ? 'videos' : 'paint';
  const body = h('div');
  const c = h('div', null,
    h('div', { class: 'crumb' }, h('a', { href: '#/' }, '🏠 Home')),
    h('div', { class: 'songhero arthero' },
      h('div', null, h('h1', null, 'Art Studio'), h('p', null, 'Paint with beautiful colours, colour a picture, or draw along with a friendly art teacher!'),
        h('span', { class: 'badge' }, '🎨 18 colours'), h('span', { class: 'badge' }, '🖍️ ' + (PAGES.length - 1) + ' colouring pages'), artCount ? h('span', { class: 'badge' }, '📺 ' + artCount + ' draw-along videos') : null),
      h('div', { class: 'notes', 'aria-hidden': 'true' }, '🎨')),
    h('div', { class: 'tabs' }, [['paint', '🖌️ Paint & Colour'], ['videos', '📺 Draw Along']].filter(t => t[0] === 'paint' || artCount).map(t => h('a', { class: 'tab' + (t[0] === tab ? ' on' : ''), href: '#/art/' + t[0] }, t[1]))),
    body);
  shell(c, '#ff5d8f');
  if (tab === 'videos') {
    ARTV.forEach(k => body.append(
      h('h2', { class: 'sec songsec', style: '--c:' + k.color }, h('span', { class: 'dot' }, k.emoji), k.name, h('small', null, k.songs.length + ' videos')),
      h('div', { class: 'songs' }, k.songs.map((s, i) => songCard(s, k.songs, i, k.color)))));
    body.append(h('div', { class: 'note' }, '✏️ Get paper and crayons, press play, and draw together! Grown-ups can add videos in js/art.js.'));
    return null;
  }
  return paintStudio(body);
}

/* ---------- CODE LAB ---------- */
/* CODE-DATA-START */
const DIRS = { U: [-1, 0, '⬆️', 'up'], D: [1, 0, '⬇️', 'down'], L: [0, -1, '⬅️', 'left'], R: [0, 1, '➡️', 'right'] };
const ROT = { U: 'R', R: 'D', D: 'L', L: 'U' };
const B = (d, n) => ({ d, n: n || 1 });
const PATH_LV = [
  { n: 4, start: [3, 0], goal: [3, 3], say: 'Help the robot go to the star. Tap the arrows, then press Run!', sol: [B('R'), B('R'), B('R')] },
  { n: 4, start: [3, 1], goal: [0, 1], say: 'The star is up high. Make the robot go up!', sol: [B('U'), B('U'), B('U')] },
  { n: 4, start: [3, 0], goal: [1, 2], say: 'Go right, then go up to the star.', sol: [B('R'), B('R'), B('U'), B('U')] },
  { n: 5, start: [4, 0], goal: [0, 0], rocks: [[2, 0], [2, 1]], say: 'Trees are in the way! Go around them.', sol: [B('R'), B('R'), B('U'), B('U'), B('U'), B('U'), B('L'), B('L')] },
  { n: 5, start: [4, 2], goal: [0, 2], rocks: [[2, 1], [2, 2], [2, 3]], apples: [[4, 4]], say: 'Pick up the apple first, then go to the star.', sol: [B('R'), B('R'), B('U'), B('U'), B('U'), B('U'), B('L'), B('L')] },
  { n: 5, start: [0, 0], goal: [4, 4], rocks: [[1, 1], [2, 2], [3, 3]], apples: [[0, 4]], say: 'Get the apple, then find the star.', sol: [B('R'), B('R'), B('R'), B('R'), B('D'), B('D'), B('D'), B('D')] },
  { n: 6, start: [5, 0], goal: [5, 5], loop: true, max: 1, say: 'New! A loop repeats a step. Put one arrow, then tap it to repeat it. Use only 1 block!', sol: [B('R', 5)] },
  { n: 6, start: [5, 0], goal: [0, 5], loop: true, max: 2, say: 'Use only 2 blocks. Tap a block to make it repeat.', sol: [B('U', 5), B('R', 5)] },
  { n: 6, start: [0, 0], goal: [5, 5], rocks: [[0, 3], [1, 3], [2, 3]], loop: true, max: 2, say: 'Go around the trees with only 2 blocks.', sol: [B('D', 5), B('R', 5)] },
  { n: 6, start: [5, 0], goal: [0, 0], rocks: [[3, 0], [3, 1], [3, 2], [3, 3]], loop: true, max: 3, say: 'A long wall of trees! Use 3 blocks.', sol: [B('R', 4), B('U', 5), B('L', 4)] },
  { n: 6, start: [2, 0], goal: [2, 5], rocks: [[2, 2], [2, 3]], apples: [[0, 2]], loop: true, max: 3, say: 'Get the apple, then the star. Use 3 blocks.', sol: [B('U', 2), B('R', 5), B('D', 2)] },
  { n: 6, start: [5, 5], goal: [0, 0], rocks: [[1, 0], [1, 1], [1, 2], [1, 3], [4, 1], [4, 2], [4, 3], [4, 4]], apples: [[5, 0]], loop: true, max: 4, say: 'Super coder level! Apple first, then the star. Use 4 blocks.', sol: [B('L', 5), B('R', 5), B('U', 5), B('L', 5)] }
];
const BUG_LV = [
  { n: 4, start: [3, 0], goal: [3, 3], prog: [B('R'), B('R'), B('U')], say: 'Oh no, a bug! The robot does not reach the star. Tap the wrong arrow to change it.' },
  { n: 4, start: [3, 0], goal: [0, 0], prog: [B('U'), B('U'), B('R')], say: 'Find the bug! Tap the wrong arrow to turn it.' },
  { n: 5, start: [4, 0], goal: [0, 4], prog: [B('R'), B('R'), B('L'), B('R'), B('U'), B('U'), B('U'), B('U')], say: 'One arrow is wrong. Can you find it?' },
  { n: 5, start: [4, 2], goal: [0, 2], rocks: [[2, 2]], prog: [B('U'), B('R'), B('U'), B('U'), B('R'), B('U')], say: 'The robot goes around the tree, but one arrow is wrong.' },
  { n: 6, start: [5, 0], goal: [0, 5], prog: [B('U', 5), B('L', 5)], say: 'This program has loops. Find the bug!' },
  { n: 6, start: [0, 0], goal: [5, 5], rocks: [[0, 3], [1, 3], [2, 3]], prog: [B('D', 3), B('R', 5), B('U', 2)], say: 'Last bug! Test the program, then fix it.' }
];
function simulate(lv, prog) {
  let r = lv.start[0], c = lv.start[1];
  const apples = new Set((lv.apples || []).map(a => a.join(','))), rock = new Set((lv.rocks || []).map(a => a.join(','))), steps = [];
  for (let bi = 0; bi < prog.length; bi++) for (let k = 0; k < prog[bi].n; k++) {
    const nr = r + DIRS[prog[bi].d][0], nc = c + DIRS[prog[bi].d][1];
    if (nr < 0 || nc < 0 || nr >= lv.n || nc >= lv.n) { steps.push({ r, c, bi, bump: true }); return { steps, res: 'edge' }; }
    if (rock.has(nr + ',' + nc)) { steps.push({ r, c, bi, bump: true }); return { steps, res: 'rock' }; }
    r = nr; c = nc; const got = apples.delete(r + ',' + c); steps.push({ r, c, bi, apple: got });
    if (r === lv.goal[0] && c === lv.goal[1] && !apples.size) return { steps, res: 'win' };
  }
  return { steps, res: r === lv.goal[0] && c === lv.goal[1] ? 'apples' : 'short' };
}
/* CODE-DATA-END */
let codeTok = 0;
function codeBoard(lv) {
  const el = h('div', { class: 'cboard', style: '--n:' + lv.n });
  const key = (r, c) => r + ',' + c, rocks = new Set((lv.rocks || []).map(a => a.join(',')));
  for (let r = 0; r < lv.n; r++) for (let c = 0; c < lv.n; c++)
    el.append(h('div', { class: 'cc' + ((r + c) % 2 ? ' alt' : ''), 'data-k': key(r, c) }, rocks.has(key(r, c)) ? '🌳' : (r === lv.goal[0] && c === lv.goal[1]) ? '⭐' : ''));
  const bot = h('div', { class: 'bot', 'aria-label': 'Robot' }, '🤖'); el.append(bot);
  const cell = (r, c) => el.children[r * lv.n + c];
  const place = (r, c) => { bot.style.left = (c * 100 / lv.n) + '%'; bot.style.top = (r * 100 / lv.n) + '%'; };
  const reset = () => {
    place(lv.start[0], lv.start[1]); bot.classList.remove('shake', 'happy');
    el.querySelectorAll('.trail').forEach(x => x.classList.remove('trail'));
    (lv.apples || []).forEach(a => { cell(a[0], a[1]).textContent = '🍎'; });
  };
  reset();
  return { el, bot, place, cell, reset };
}
function codeGame(box, mode) {
  const LV = mode === 'bug' ? BUG_LV : PATH_LV, key = 'code_' + mode;
  const wrapEl = h('div'); box.append(wrapEl);
  function load(i) {
    const tok = ++codeTok, lv = LV[i], done = store.get(key, []);
    const maxOpen = Math.min(LV.length - 1, done.length ? Math.max.apply(null, done) + 1 : 0);
    let running = false, prog = mode === 'bug' ? lv.prog.map(b => ({ d: b.d, n: b.n })) : [];
    const bd = codeBoard(lv);
    const status = h('div', { class: 'cstatus' });
    const countEl = h('span', { class: 'ccount' });
    const progEl = h('div', { class: 'prog', 'aria-label': 'Your program' });
    const setStatus = (t, cls) => { status.className = 'cstatus' + (cls ? ' ' + cls : ''); status.innerHTML = ''; if (typeof t === 'string') status.textContent = t; else status.append(t); };
    function drawProg(active) {
      progEl.innerHTML = '';
      if (!prog.length) progEl.append(h('span', { class: 'ph' }, 'Tap the arrows below to build your program 👇'));
      prog.forEach((b, j) => progEl.append(h('button', { class: 'blk' + (j === active ? ' run' : ''), 'aria-label': DIRS[b.d][3] + (b.n > 1 ? ' ' + b.n + ' times' : ''),
        onclick: () => {
          if (running) return;
          if (mode === 'bug') { b.d = ROT[b.d]; speak(DIRS[b.d][3], 'en'); }
          else if (lv.loop) { b.n = b.n >= 5 ? 1 : b.n + 1; speak(DIRS[b.d][3] + ' ' + b.n + (b.n > 1 ? ' times' : ''), 'en'); }
          else return;
          bd.reset(); setStatus(''); drawProg();
        } }, h('span', null, DIRS[b.d][2]), b.n > 1 ? h('b', null, '×' + b.n) : null)));
      countEl.textContent = mode === 'bug' ? '' : lv.loop ? 'Blocks: ' + prog.length + ' / ' + lv.max : 'Blocks: ' + prog.length;
    }
    async function run() {
      if (running) return;
      if (!prog.length) { setStatus('First add some arrows! 👇', 'bad'); speak('First add some arrows.', 'en'); return; }
      running = true; bd.reset(); setStatus('🤖 Running...');
      const sim = simulate(lv, prog); let prev = lv.start;
      for (const s of sim.steps) {
        if (tok !== codeTok) return;
        drawProg(s.bi);
        if (s.bump) { bd.bot.classList.add('shake'); await sleep(700); break; }
        bd.cell(prev[0], prev[1]).classList.add('trail'); bd.place(s.r, s.c); prev = [s.r, s.c];
        if (s.apple) { bd.cell(s.r, s.c).textContent = ''; toast('🍎 Yummy!'); }
        await sleep(430);
      }
      if (tok !== codeTok) return;
      running = false; drawProg(-1);
      if (sim.res === 'win') {
        bd.bot.classList.add('happy'); party(); speak('Hooray! Great coding!', 'en');
        const first = !done.includes(i); if (first) { done.push(i); store.set(key, done); addStars(2); }
        setStatus(h('span', null, '🎉 Great coding!' + (first ? ' ⭐ +2 stars' : '') + ' ',
          i < LV.length - 1 ? h('button', { class: 'btn good sm', onclick: () => load(i + 1) }, 'Next level ▶') : h('b', null, '🏆 You finished every level!')), 'win');
      } else {
        const why = { edge: 'Oops! The robot bumped into the wall.', rock: 'Oops! A tree is in the way.', apples: 'Almost! Get all the apples first.', short: 'Not there yet! The robot stopped too early.' }[sim.res];
        setStatus('🤔 ' + why + ' Change your program and try again.', 'bad'); speak(why + ' Try again!', 'en');
      }
    }
    const add = d => {
      if (running) return;
      const max = lv.loop ? lv.max : 14;
      if (prog.length >= max) { const t = lv.loop ? 'Only ' + max + (max > 1 ? ' blocks' : ' block') + '! Tap a block to make it repeat.' : 'That is a lot of blocks!'; setStatus('💡 ' + t, 'bad'); speak(t, 'en'); return; }
      prog.push(B(d)); bd.reset(); setStatus(''); drawProg(); speak(DIRS[d][3], 'en');
    };
    const tools = mode === 'bug'
      ? h('div', { class: 'pal' }, h('button', { class: 'btn good', onclick: run }, '▶ Run'), h('button', { class: 'btn alt', onclick: () => { if (running) return; prog = lv.prog.map(b => ({ d: b.d, n: b.n })); bd.reset(); setStatus(''); drawProg(); } }, '↺ Start again'))
      : h('div', null,
          h('div', { class: 'pal' }, ['U', 'L', 'D', 'R'].map(d => h('button', { class: 'arrow', 'aria-label': DIRS[d][3], onclick: () => add(d) }, DIRS[d][2]))),
          h('div', { class: 'pal' }, h('button', { class: 'btn good', onclick: run }, '▶ Run'),
            h('button', { class: 'btn alt sm', onclick: () => { if (running || !prog.length) return; prog.pop(); bd.reset(); setStatus(''); drawProg(); } }, '⌫ Undo'),
            h('button', { class: 'btn alt sm', onclick: () => { if (running) return; prog = []; bd.reset(); setStatus(''); drawProg(); } }, '🗑️ Clear'),
            h('button', { class: 'btn alt sm', onclick: () => { const s = lv.sol[0]; const t = 'Start with ' + DIRS[s.d][3] + (s.n > 1 ? ', ' + s.n + ' times' : '') + '.'; setStatus('💡 ' + t + ' ' + DIRS[s.d][2] + (s.n > 1 ? '×' + s.n : '')); speak(t, 'en'); } }, '💡 Hint')));
    wrapEl.innerHTML = '';
    wrapEl.append(
      h('div', { class: 'lvdots' }, h('b', null, 'Level'), LV.map((_, j) => h('button', { class: 'lvdot' + (done.includes(j) ? ' ok' : '') + (j === i ? ' on' : ''), disabled: j > maxOpen, 'aria-label': 'Level ' + (j + 1), onclick: () => load(j) }, done.includes(j) && j !== i ? '✓' : String(j + 1)))),
      h('div', { class: 'cmission' }, h('button', { class: 'say', 'aria-label': 'Read aloud', onclick: () => speak(lv.say, 'en') }, '🔊'), h('span', null, lv.say)),
      h('div', { class: 'codewrap' }, bd.el,
        h('div', null, h('div', { class: 'proghead' }, h('b', null, mode === 'bug' ? '🐞 The program (tap an arrow to change it)' : '📜 My program'), countEl), progEl, tools, status)));
    drawProg(); speak(lv.say, 'en');
  }
  const done = store.get(key, []);
  load(Math.min(LV.length - 1, done.length ? Math.max.apply(null, done) + 1 : 0));
}
function patternGame(box) {
  const SETS = [['🔴', '🔵', '🟡', '🟢'], ['⭐', '🌙', '❤️', '☀️'], ['🐶', '🐱', '🐰', '🐸'], ['🍎', '🍌', '🍇', '🍓'], ['🚗', '🚲', '✈️', '⛵'], ['🌸', '🍀', '🍄', '🌻']];
  const TYPES = [['AB'], ['AAB', 'ABB'], ['ABC', 'AABB', 'ABB']];
  const CARC = ['#ef233c', '#ff9f1c', '#2bb673', '#3a86ff', '#9d4edd', '#ff5d8f'];
  const tok = ++codeTok; let round = 0, score = 0;
  const area = h('div', { class: 'ptrain' }); box.append(area);
  function next() {
    if (tok !== codeTok) return;
    area.innerHTML = '';
    if (round >= 10) {
      const st = score >= 8 ? 3 : score >= 5 ? 2 : 1; addStars(st); party(); speak('Well done! You are a pattern expert!', 'en');
      area.append(h('div', { class: 'cend' }, h('div', { class: 'big' }, '🏆'), h('h2', null, 'You got ' + score + ' out of 10!'), h('p', null, '⭐ +' + st + ' stars'), h('button', { class: 'btn', onclick: () => { round = 0; score = 0; next(); } }, '🔁 Play again')));
      return;
    }
    const stage = round < 3 ? 0 : round < 6 ? 1 : 2, type = TYPES[stage][rnd(0, TYPES[stage].length - 1)];
    const set = shuffle(SETS[rnd(0, SETS.length - 1)]), map = {}; [...new Set(type)].forEach((ch, k) => { map[ch] = set[k]; });
    const unit = type.split('').map(ch => map[ch]), shown = Math.max(6, unit.length * 2) + (stage ? 1 : 0);
    const seq = Array.from({ length: shown + 1 }, (_, k) => unit[k % unit.length]), answer = seq[shown];
    const opts = shuffle([answer].concat(shuffle(set.filter(x => x !== answer)).slice(0, 2)));
    let first = true;
    const q = h('div', { class: 'car q', style: '--c:' + CARC[shown % CARC.length] }, '?');
    area.append(
      h('div', { class: 'cmission' }, h('button', { class: 'say', 'aria-label': 'Read aloud', onclick: () => speak('What comes next?', 'en') }, '🔊'), h('span', null, 'What comes next? Look at the pattern on the train. (' + (round + 1) + ' / 10)')),
      h('div', { class: 'train' }, h('div', { class: 'engine', 'aria-hidden': 'true' }, '🚂'), seq.slice(0, shown).map((x, k) => h('div', { class: 'car', style: '--c:' + CARC[k % CARC.length] }, x)), q),
      h('div', { class: 'opts' }, opts.map(o => h('button', { class: 'opt', 'aria-label': 'Choose ' + o, onclick: e => {
        const b = e.currentTarget;
        if (o === answer) { q.textContent = o; q.classList.remove('q'); b.classList.add('good'); if (first) score++; speak('Yes!', 'en'); const r = b.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 30); round++; setTimeout(next, 1200); }
        else { first = false; b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad'); speak('Try again!', 'en'); }
      } }, o))));
    speak('What comes next?', 'en');
  }
  next();
}
function ifGame(box) {
  const RULES = [
    { cond: 'it is red', yes: ['🍎', '🍓', '🍒', '🚒', '🌹', '❤️', '🍅', '🎈'], no: ['🍌', '🥦', '🐸', '🌻', '🚙', '🐳', '🍋', '🌽'], yb: ['🧺', 'basket'], nb: ['📦', 'box'] },
    { cond: 'it can fly', yes: ['🐦', '🦋', '✈️', '🐝', '🦅', '🚁', '🦜', '🦉'], no: ['🐶', '🐟', '🚗', '🐢', '🐘', '🚲', '🐄', '🐌'], yb: ['☁️', 'sky'], nb: ['🌳', 'ground'] },
    { cond: 'it is a fruit', yes: ['🍎', '🍌', '🍇', '🍓', '🍉', '🍍', '🍐', '🥝'], no: ['🚗', '⚽', '🧸', '✏️', '🐱', '👟', '📚', '🎈'], yb: ['🧺', 'fruit basket'], nb: ['📦', 'toy box'] },
    { cond: 'it lives in water', yes: ['🐟', '🐠', '🐙', '🐳', '🦀', '🐬', '🦈', '🐡'], no: ['🐶', '🐱', '🐄', '🐔', '🐘', '🦁', '🐰', '🐒'], yb: ['🌊', 'sea'], nb: ['🏡', 'land'] }
  ];
  const tok = ++codeTok; let ri = store.get('code_if_r', 0) % RULES.length;
  const area = h('div', { class: 'ifgame' }); box.append(area);
  function start() {
    if (tok !== codeTok) return;
    const R = RULES[ri], items = shuffle(shuffle(R.yes).slice(0, 4).map(e => ({ e, y: true })).concat(shuffle(R.no).slice(0, 4).map(e => ({ e, y: false }))));
    let idx = 0, score = 0, first = true;
    const ruleTxt = 'If ' + R.cond + ', put it in the ' + R.yb[1] + '. Else, put it in the ' + R.nb[1] + '.';
    const itemEl = h('div', { class: 'ifitem' }), prog = h('div', { class: 'ifprog' });
    const pick = (yes, btn) => {
      const it = items[idx]; if (!it) return;
      if (it.y === yes) {
        if (first) score++; idx++; first = true; btn.classList.add('good'); setTimeout(() => btn.classList.remove('good'), 400);
        speak(yes ? 'Yes! ' + R.cond + '.' : 'Yes! Else.', 'en'); itemEl.classList.add('fly'); setTimeout(show, 450);
      } else { first = false; btn.classList.remove('bad'); void btn.offsetWidth; btn.classList.add('bad'); speak('Look again. Does ' + R.cond.replace(/^it /, 'it ') + '?', 'en'); }
    };
    function show() {
      if (tok !== codeTok) return;
      itemEl.classList.remove('fly');
      prog.textContent = items.map((_, k) => k < idx ? '🟢' : k === idx ? '🔵' : '⚪').join(' ');
      if (idx >= items.length) {
        const st = score >= 7 ? 3 : score >= 5 ? 2 : 1; addStars(st); party(); speak('Super sorting!', 'en');
        ri = (ri + 1) % RULES.length; store.set('code_if_r', ri);
        area.querySelector('.bins').replaceWith(h('div', { class: 'cend' }, h('h2', null, '🎉 ' + score + ' / 8 correct!'), h('p', null, '⭐ +' + st + ' stars'), h('button', { class: 'btn', onclick: start }, 'Next rule ▶')));
        itemEl.textContent = '🏆'; return;
      }
      itemEl.textContent = items[idx].e;
    }
    area.innerHTML = '';
    area.append(
      h('div', { class: 'rulecard' }, h('button', { class: 'say', 'aria-label': 'Read the rule', onclick: () => speak(ruleTxt, 'en') }, '🔊'),
        h('div', null, h('div', null, h('span', { class: 'kw' }, 'IF'), ' ' + R.cond + ' ➜ ' + R.yb[0] + ' ' + R.yb[1]), h('div', null, h('span', { class: 'kw else' }, 'ELSE'), ' ➜ ' + R.nb[0] + ' ' + R.nb[1]))),
      prog, itemEl,
      h('div', { class: 'bins' },
        h('button', { class: 'bin yes', onclick: e => pick(true, e.currentTarget) }, h('span', { class: 'e' }, R.yb[0]), h('b', null, R.yb[1]), h('small', null, 'IF ' + R.cond)),
        h('button', { class: 'bin no', onclick: e => pick(false, e.currentTarget) }, h('span', { class: 'e' }, R.nb[0]), h('b', null, R.nb[1]), h('small', null, 'ELSE'))));
    show(); speak(ruleTxt, 'en');
  }
  start();
}
function codePage(tab) {
  const TABSC = [['robot', '🤖 Robot Path'], ['bug', '🐞 Bug Hunt'], ['pattern', '🚂 Pattern Train'], ['if', '🔀 If–Then Sort']];
  if (!TABSC.some(t => t[0] === tab)) tab = 'robot';
  const IDEAS = [['👣', 'Sequence', 'Steps in order', 'A sequence is steps in the right order, one after another.'], ['🔁', 'Loop', 'Do it again', 'A loop repeats a step again and again.'],
    ['🐞', 'Bug', 'A mistake to fix', 'A bug is a mistake in a program. Coders find bugs and fix them.'], ['🔀', 'If–Then', 'Choose what to do', 'If something is true, then do this. Else, do that.']];
  const body = h('div');
  const c = h('div', null,
    h('div', { class: 'crumb' }, h('a', { href: '#/' }, '🏠 Home')),
    h('div', { class: 'songhero codehero' },
      h('div', null, h('h1', null, 'Code Lab'), h('p', null, 'Think like a coder! Guide the robot, fix bugs, find patterns and make choices.'),
        h('span', { class: 'badge' }, '🤖 ' + PATH_LV.length + ' robot levels'), h('span', { class: 'badge' }, '🐞 ' + BUG_LV.length + ' bugs to fix'), h('span', { class: 'badge' }, '⭐ win stars')),
      h('div', { class: 'notes', 'aria-hidden': 'true' }, '🤖')),
    h('div', { class: 'concepts' }, IDEAS.map(x => h('button', { class: 'concept', onclick: () => speak(x[3], 'en') }, h('span', { class: 'e' }, x[0]), h('span', null, h('b', null, x[1]), h('small', null, x[2] + ' 🔊'))))),
    h('div', { class: 'tabs' }, TABSC.map(t => h('a', { class: 'tab' + (t[0] === tab ? ' on' : ''), href: '#/code/' + t[0] }, t[1]))),
    body);
  shell(c, '#9d4edd');
  if (tab === 'robot') codeGame(body, 'path'); else if (tab === 'bug') codeGame(body, 'bug'); else if (tab === 'pattern') patternGame(body); else ifGame(body);
  return () => { codeTok++; };
}

/* ---------- FAMILY ALBUM ---------- */
const FAM = window.KGFAMILY || { groups: [], photos: [], videos: [] };
const famSrc = p => 'img/family/' + p.f, famThumb = p => 'img/family/t/' + p.f;
let famTok = 0;
function famLightbox(list, start) {
  stopSpeech(); const old = $('.modal.famm'); if (old) old.remove();
  let idx = start, sx = null;
  const img = h('img', { class: 'fbig', alt: '' }), cap = h('div', { class: 'fcap' }), words = h('div', { class: 'fwords' }), count = h('span', { class: 'fcount' });
  const show = () => {
    const p = list[idx]; img.src = famSrc(p); img.alt = p.cap;
    cap.innerHTML = ''; cap.append(h('button', { class: 'say', 'aria-label': 'Read aloud', onclick: () => speak(p.cap, 'en') }, '🔊'), h('b', null, p.cap));
    words.innerHTML = ''; (p.words || []).forEach(w => words.append(h('button', { class: 'fword', onclick: () => speak(w, 'en') }, w, ' 🔊')));
    count.textContent = (idx + 1) + ' / ' + list.length; speak(p.cap, 'en');
  };
  const go = d => { idx = (idx + d + list.length) % list.length; show(); };
  const onKey = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
  const close = () => { m.remove(); removeEventListener('keydown', onKey); stopSpeech(); };
  const m = h('div', { class: 'modal famm', onclick: e => { if (e.target === m) close(); } },
    h('div', { class: 'fbox' },
      h('div', { class: 'fstage', onpointerdown: e => { sx = e.clientX; }, onpointerup: e => { if (sx !== null && Math.abs(e.clientX - sx) > 50) go(e.clientX < sx ? 1 : -1); sx = null; } },
        img, h('button', { class: 'fnav prev', 'aria-label': 'Previous photo', onclick: () => go(-1) }, '‹'), h('button', { class: 'fnav next', 'aria-label': 'Next photo', onclick: () => go(1) }, '›')),
      h('div', { class: 'fmeta' }, cap, words, h('div', { class: 'frow' }, count, h('button', { class: 'btn sm', onclick: close }, '✕ Close')))));
  addEventListener('keydown', onKey); document.body.append(m); show();
}
function famAlbum(box) {
  FAM.groups.forEach(g => {
    const list = FAM.photos.filter(p => p.g === g.id); if (!list.length) return;
    box.append(h('h2', { class: 'sec songsec', style: '--c:' + g.color }, h('span', { class: 'dot' }, g.emoji), g.name, h('small', null, list.length + ' photos')),
      h('div', { class: 'polas' }, list.map((p, i) => h('button', { class: 'pola', style: '--r:' + (((i * 7) % 5) - 2) * 1.3 + 'deg', 'aria-label': p.cap, onclick: () => famLightbox(list, i) },
        h('img', { src: famThumb(p), alt: '', loading: 'lazy' }), h('span', null, p.cap)))));
  });
  box.append(h('div', { class: 'note' }, '💡 Tap a photo to see it big. Tap the words to learn them in English!'));
}
function famMovie(box) {
  const list = FAM.photos; if (!list.length) return;
  const tok = ++famTok; let i = 0, playing = false, timer = 0, front = 0;
  const layers = [h('div', { class: 'mlayer' }), h('div', { class: 'mlayer' })];
  const capEl = h('div', { class: 'mcap' });
  const dots = h('div', { class: 'mdots' }, list.map((_, k) => h('button', { class: 'mdot', 'aria-label': 'Photo ' + (k + 1), onclick: () => { show(k); if (playing) schedule(); } })));
  const intro = h('button', { class: 'mintro', onclick: () => play() }, h('span', { class: 'mplay' }, '▶'), h('b', null, 'Our Family Movie'), h('small', null, list.length + ' happy moments'));
  const stage = h('div', { class: 'mstage' }, layers, capEl, intro);
  const btn = h('button', { class: 'btn good', onclick: () => playing ? pause() : play() }, '▶ Play');
  function paint(layer, p) { layer.innerHTML = ''; layer.append(h('div', { class: 'mbg', style: 'background-image:url("' + famSrc(p) + '")' }), h('img', { class: 'mimg', src: famSrc(p), alt: p.cap })); }
  function show(k) {
    i = (k + list.length) % list.length; const p = list[i], back = layers[1 - front];
    paint(back, p); back.className = 'mlayer'; void back.offsetWidth; back.classList.add('on', 'kb' + (i % 4));
    layers[front].classList.remove('on'); front = 1 - front;
    capEl.textContent = p.cap; capEl.classList.remove('in'); void capEl.offsetWidth; capEl.classList.add('in');
    dots.querySelectorAll('.mdot').forEach((d, j) => d.classList.toggle('on', j === i));
    if (playing) speak(p.cap, 'en');
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => { if (tok !== famTok || !playing) return; if (i >= list.length - 1) return finish(); show(i + 1); schedule(); }, 5200);
  }
  function play() { if (tok !== famTok) return; intro.style.display = 'none'; const restart = i >= list.length - 1 && !playing && btn.dataset.done; playing = true; btn.textContent = '⏸ Pause'; delete btn.dataset.done; show(restart ? 0 : i); schedule(); }
  function pause() { playing = false; clearTimeout(timer); stopSpeech(); btn.textContent = '▶ Play'; }
  function finish() { pause(); btn.textContent = '🔁 Play again'; btn.dataset.done = '1'; party(); speak('The end! What a happy family trip!', 'en'); if (!store.get('fam_movie', 0)) { store.set('fam_movie', 1); addStars(2); toast('⭐ +2 stars for watching!'); } }
  box.append(
    h('div', { class: 'cmission' }, h('span', null, '🎬 Press play and watch your family movie. The voice reads each picture!')),
    stage,
    h('div', { class: 'mctrl' },
      h('button', { class: 'btn alt sm', 'aria-label': 'Previous', onclick: () => { show(i - 1); if (playing) schedule(); } }, '⏮'), btn,
      h('button', { class: 'btn alt sm', 'aria-label': 'Next', onclick: () => { show(i + 1); if (playing) schedule(); } }, '⏭'),
      h('button', { class: 'btn alt sm', onclick: () => { try { (stage.requestFullscreen || stage.webkitRequestFullscreen).call(stage); } catch (e) {} } }, '⛶ Full screen')),
    dots);
  show(0);
  return () => { clearTimeout(timer); };
}
function famMemory(box) {
  const tok = ++famTok, area = h('div'); box.append(area);
  function start() {
    if (tok !== famTok) return;
    const pics = shuffle(FAM.photos).slice(0, 6), deck = shuffle(pics.concat(pics));
    let open = [], lock = false, pairs = 0, moves = 0;
    const movesEl = h('b', null, '0');
    const grid = h('div', { class: 'memgrid' }, deck.map(p => {
      const el = h('button', { class: 'mcard', 'aria-label': 'Hidden photo card' }, h('div', { class: 'mface mfront' }, '📸'), h('div', { class: 'mface mback' }, h('img', { src: famThumb(p), alt: p.cap })));
      el.addEventListener('click', () => {
        if (lock || el.classList.contains('flip')) return;
        el.classList.add('flip'); open.push({ el, p });
        if (open.length < 2) return;
        moves++; movesEl.textContent = moves; lock = true;
        const [a, b] = open;
        if (a.p === b.p) setTimeout(() => {
          a.el.classList.add('done'); b.el.classList.add('done'); pairs++; open = []; lock = false; speak('Match! ' + p.cap, 'en');
          const r = b.el.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, 30);
          if (pairs === pics.length) setTimeout(win, 900);
        }, 450);
        else setTimeout(() => { a.el.classList.remove('flip'); b.el.classList.remove('flip'); open = []; lock = false; }, 1100);
      });
      return el;
    }));
    function win() {
      if (tok !== famTok) return;
      const st = moves <= 9 ? 3 : moves <= 14 ? 2 : 1; addStars(st); party(); speak('You found all the photos! Well done!', 'en');
      area.append(h('div', { class: 'cend' }, h('div', { class: 'big' }, '🏆'), h('h2', null, 'All pairs found in ' + moves + ' tries!'), h('p', null, '⭐ +' + st + ' stars'), h('button', { class: 'btn', onclick: start }, '🔁 Play again')));
    }
    area.innerHTML = '';
    area.append(h('div', { class: 'cmission' }, h('button', { class: 'say', 'aria-label': 'Read aloud', onclick: () => speak('Turn over two cards. Find the same photos!', 'en') }, '🔊'), h('span', null, 'Turn over two cards. Find the same photos! Tries: '), movesEl), grid);
    speak('Turn over two cards. Find the same photos!', 'en');
  }
  start();
}
function famVideos(box) {
  const vids = (FAM.videos || []).filter(v => v && (v.file || v.yt));
  if (!vids.length) {
    box.append(h('div', { class: 'cend vidempty' }, h('div', { class: 'big' }, '📹'), h('h2', null, 'Family videos will go here'),
      h('p', null, 'A grown-up can add short phone videos (see js/family.js). Until then, enjoy the family movie made from our photos!'),
      h('a', { class: 'btn', href: '#/family/movie', style: 'text-decoration:none;display:inline-block' }, '🎬 Watch the Family Movie')));
    return;
  }
  const files = vids.filter(v => v.file), yts = vids.filter(v => v.yt).map(v => ({ t: v.t || 'Video', by: 'Family video', yt: v.yt }));
  if (files.length) box.append(h('div', { class: 'fvids' }, files.map(v => h('figure', { class: 'fvid' }, h('video', { src: v.file, controls: true, playsinline: true, preload: 'metadata' }), h('figcaption', null, '🎥 ' + (v.t || 'Family video'))))));
  if (yts.length) box.append(h('div', { class: 'songs', style: 'margin-top:18px' }, yts.map((s, k) => songCard(s, yts, k, '#ff9f1c'))));
}
function familyPage(tab) {
  const TABSF = [['album', '📷 Album'], ['movie', '🎬 Family Movie'], ['memory', '🧠 Photo Memory'], ['videos', '📹 Videos']];
  if (!TABSF.some(t => t[0] === tab)) tab = 'album';
  const fan = FAM.photos.length >= 3 ? [FAM.photos[Math.min(14, FAM.photos.length - 1)], FAM.photos[3] || FAM.photos[0], FAM.photos[FAM.photos.length - 1]] : FAM.photos;
  const body = h('div');
  const c = h('div', null,
    h('div', { class: 'crumb' }, h('a', { href: '#/' }, '🏠 Home')),
    h('div', { class: 'songhero famhero' },
      h('div', null, h('h1', null, 'Family Album'), h('p', null, 'Our happy family trips! Look at the photos, watch the family movie and play the memory game.'),
        h('span', { class: 'badge' }, '📷 ' + FAM.photos.length + ' photos'), h('span', { class: 'badge' }, '🎬 family movie'), h('span', { class: 'badge' }, '🧠 memory game')),
      h('div', { class: 'fan', 'aria-hidden': 'true' }, fan.map(p => h('img', { src: famThumb(p), alt: '' })))),
    h('div', { class: 'tabs' }, TABSF.map(t => h('a', { class: 'tab' + (t[0] === tab ? ' on' : ''), href: '#/family/' + t[0] }, t[1]))),
    body);
  shell(c, '#ff9f1c');
  let extra = null;
  if (tab === 'album') famAlbum(body); else if (tab === 'movie') extra = famMovie(body); else if (tab === 'memory') famMemory(body); else famVideos(body);
  return () => { famTok++; if (extra) extra(); stopSpeech(); const m = $('.modal.famm'); if (m) m.remove(); };
}

/* ---------- router ---------- */
let cleanup = null;
function route() {
  if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; } stopSpeech(); readTok++;
  const p = location.hash.replace(/^#\/?/, '').split('/');
  if (songClose) songClose();
  if (p[0] === 'songs') songsPage(p[1]); else if (p[0] === 'art') cleanup = artPage(p[1]); else if (p[0] === 'code') cleanup = codePage(p[1]); else if (p[0] === 'family') cleanup = familyPage(p[1]); else if (p[0] === 's') subjectPage(p[1]); else if (p[0] === 'u') { unitPage(p[1], p[2]); const b = $('.wrap > div > div:last-child'); cleanup = () => { const x = document.querySelector('.wrap > div'); const l = x && x.lastElementChild; if (l && l.__cleanup) l.__cleanup(); }; } else home();
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route);
route();
})();
