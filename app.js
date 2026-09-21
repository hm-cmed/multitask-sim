import { firebaseConfig, STORAGE_ENABLED } from './firebase-config.js';
import { T, LANGS } from './i18n.js';
import { PROFESSIONS, LEVELS, PRIORITY, CHECKS, TIPS, BUILTIN_SCENARIOS } from './data.js';
import { Game, LEVEL_MULT } from './engine.js';

const FB_VER = '10.12.2';
const LI = { ja: 0, en: 1, ko: 2, zh: 3 };
const L4 = ['ja', 'en', 'ko', 'zh'];
const AXES = ['priority', 'time', 'safety', 'resume', 'comm'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const store = {
  get(k, d) { try { const v = localStorage.getItem('mts.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mts.' + k, JSON.stringify(v)); } catch { /* 保存できない環境では無視 */ } },
};

const S = {
  lang: store.get('lang', (navigator.language || 'ja').slice(0, 2)),
  profile: store.get('profile', { name: '', prof: 'ns', level: 1 }),
  sound: store.get('sound', true),
  fb: null, user: null, isAdmin: false, adminDoc: null,
  scenarios: {}, meta: {},
  session: null, players: [], unsubs: [],
  game: null, gameCtx: null, bots: null, lastResult: null, lastPush: 0,
  view: 'home', soloMode: 'individual', soloScenario: 'random',
  adminTab: 'scenarios', editId: null, draft: null, logRows: [], auditRows: [],
  pendingCode: '', autoJoinTried: false,
};
if (!(S.lang in LI)) S.lang = 'ja';

/* ---------- 小さな道具 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function t(k, vars) {
  const a = T[k]; let s = a ? (a[LI[S.lang]] ?? a[0]) : k;
  if (vars) for (const [x, y] of Object.entries(vars)) s = s.replace(`{${x}}`, y);
  return s;
}
function tx(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v[LI[S.lang]] || v[0] || '';
  if (typeof v === 'object') return v[S.lang] || v.ja || v.en || '';
  return String(v);
}
const par = (x) => (S.lang === 'ja' || S.lang === 'zh') ? `（${x}）` : ` (${x})`;
function view(html) { $('#view').innerHTML = html; window.scrollTo(0, 0); }
function toast(msg, kind = '') {
  const d = document.createElement('div'); d.className = 'toast ' + kind; d.textContent = msg;
  $('#toasts').appendChild(d); setTimeout(() => d.remove(), 2600);
}
function modal(html) {
  closeModal();
  const o = document.createElement('div'); o.className = 'modal';
  o.innerHTML = `<div class="mbox" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(o); o.querySelector('button')?.focus();
}
function closeModal() { document.querySelector('.modal')?.remove(); }
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function fmtDate(ts) { const d = ts?.toDate ? ts.toDate() : null; return d ? d.toLocaleString(S.lang) : ''; }
function errMsg(e) {
  const c = e?.code || '';
  if (/wrong-password|invalid-credential|invalid-login|user-not-found/.test(c)) return t('pwWrong');
  if (/too-many-requests/.test(c)) return t('tooMany');
  if (/weak-password/.test(c)) return t('pwShort');
  if (/popup-closed|cancelled-popup/.test(c)) return t('loginCancelled');
  if (/permission-denied/.test(c)) return t('permDenied');
  if (/unauthorized-domain/.test(c)) return t('unauthDomain');
  return t('errorGeneric') + (c ? ` (${c})` : '');
}
let AC;
function beep(f = 880, d = 0.12) {
  if (!S.sound) return;
  try {
    AC ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.value = f; g.gain.value = 0.05; o.connect(g); g.connect(AC.destination);
    o.start(); o.stop(AC.currentTime + d);
  } catch { /* 音が出せない環境 */ }
}

/* ---------- Firebase ---------- */
async function initFirebase() {
  const c = firebaseConfig || {};
  if (!c.apiKey || /YOUR_/.test(c.apiKey)) return;
  try {
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    const [appM, A, F] = await Promise.all([
      import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js'),
    ]);
    const app = appM.initializeApp(c);
    S.fb = { app, A, F, auth: A.getAuth(app), db: F.getFirestore(app) };
    if (STORAGE_ENABLED) {
      const ST = await import(base + 'firebase-storage.js');
      S.fb.ST = ST; S.fb.storage = ST.getStorage(app);
    }
  } catch (e) { console.error(e); S.fb = null; }
}

function watchAuth() {
  const { A, F, auth, db } = S.fb;
  A.onAuthStateChanged(auth, async (u) => {
    S.user = u; S.isAdmin = false; S.adminDoc = null;
    if (u) {
      if (!S.profile.name) { S.profile.name = (u.displayName || (u.email || '').split('@')[0]).slice(0, 24); store.set('profile', S.profile); }
      try {
        const snap = await F.getDoc(F.doc(db, 'admins', u.uid));
        if (snap.exists()) { S.isAdmin = true; S.adminDoc = snap.data(); }
      } catch { /* 管理者でなければ読めない */ }
      if (S.pendingCode && !S.autoJoinTried && !S.session && S.view === 'home') {
        S.autoJoinTried = true; guard(() => joinSession(S.pendingCode)); return;
      }
    }
    renderHeader();
    if (S.view !== 'game') rerender();
  });
}

async function loginGoogle() {
  const { A, auth } = S.fb; const p = new A.GoogleAuthProvider();
  try { await A.signInWithPopup(auth, p); }
  catch (e) {
    if (/popup-blocked|operation-not-supported/.test(e.code || '')) return A.signInWithRedirect(auth, p);
    throw e;
  }
}

async function audit(action, extra = {}) {
  if (!S.fb || !S.user) return;
  const { F, db } = S.fb;
  try {
    await F.addDoc(F.collection(db, 'auditLogs'), {
      action, uid: S.user.uid, email: S.user.email || '', at: F.serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 180), ...extra,
    });
  } catch (e) { console.warn('audit', e); }
}

async function guard(fn) { try { await fn(); } catch (e) { console.error(e); toast(errMsg(e), 'bad'); } }

/* ---------- シナリオと動画 ---------- */
function loadBuiltins() {
  S.scenarios = {};
  for (const s of BUILTIN_SCENARIOS) S.scenarios[s.id] = { ...s, source: 'builtin' };
}
async function loadRemote() {
  if (!S.fb) return;
  const { F, db } = S.fb;
  try {
    const [sc, me] = await Promise.all([F.getDocs(F.collection(db, 'scenarios')), F.getDocs(F.collection(db, 'scenarioMeta'))]);
    loadBuiltins();
    sc.forEach(d => { const had = !!S.scenarios[d.id]; S.scenarios[d.id] = { ...d.data(), id: d.id, source: had ? 'override' : 'custom' }; });
    S.meta = {}; me.forEach(d => { S.meta[d.id] = d.data(); });
  } catch (e) { console.warn('loadRemote', e); }
}
function playable(prof) {
  const all = Object.values(S.scenarios).filter(s => !s.hidden && Array.isArray(s.tasks) && s.tasks.length);
  const mine = prof ? all.filter(s => s.prof === prof) : all;
  return (mine.length ? mine : all).sort((a, b) => a.id.localeCompare(b.id));
}
function pickScenario(prof, seed) { const list = playable(prof); return list[hashStr(prof + ':' + seed) % list.length]; }

function videoEmbed(url) {
  if (!url || !/^https:\/\//i.test(url)) return `<p class="muted small">${t('noVideo')}</p>`;
  let m;
  const frame = (src) => `<div class="video"><iframe src="${esc(src)}" title="video" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/))) return frame(`https://www.youtube-nocookie.com/embed/${m[1]}`);
  if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return frame(`https://player.vimeo.com/video/${m[1]}`);
  if ((m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/))) return frame(`https://drive.google.com/file/d/${m[1]}/preview`);
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || /firebasestorage\.googleapis\.com/.test(url)) {
    return `<div class="video"><video controls preload="metadata" src="${esc(url)}"></video></div>`;
  }
  return `<p><a href="${esc(url)}" target="_blank" rel="noopener">${t('openVideo')}</a></p>`;
}
function briefingBlock(sc) {
  return `<div class="brief"><h3>${esc(tx(sc.title))}</h3><p>${esc(tx(sc.intro))}</p>${videoEmbed(S.meta[sc.id]?.videoUrl)}</div>`;
}

/* ---------- 画面の切り替え ---------- */
function go(v) {
  S.view = v;
  if (v === 'admin') { if (location.hash !== '#admin') history.replaceState(null, '', '#admin'); }
  else if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  rerender();
}
function rerender() {
  closeModal();
  ({ home: renderHome, solo: renderSolo, lobby: () => renderLobby(true), game: renderGameShell, result: renderResult, admin: renderAdmin })[S.view]?.();
}
function setLang(l) {
  S.lang = l; store.set('lang', l); document.documentElement.lang = l;
  document.title = t('appTitle'); renderHeader(); rerender();
}

function renderHeader() {
  const auth = S.fb ? (S.user
    ? `<span class="who">${esc(S.user.displayName || S.user.email || '')}</span><button class="btn ghost sm" data-act="logout">${t('logout')}</button>`
    : `<button class="btn sm" data-act="login">${t('login')}</button>`) : '';
  $('#hdr').innerHTML = `
    <a class="brand" href="./" data-act="home">${esc(t('appTitle'))}</a>
    <div class="hdr-r">
      <label class="sr" for="langSel">Language</label>
      <select id="langSel">${LANGS.map(([c, n]) => `<option value="${c}" ${c === S.lang ? 'selected' : ''}>${n}</option>`).join('')}</select>
      ${auth}
    </div>`;
}

/* ---------- ホーム ---------- */
function renderHome() {
  const p = S.profile;
  const multi = S.fb
    ? (S.user
      ? `<button class="btn" data-act="createSession">${t('createSession')}</button>
         <div class="joinrow"><label class="sr" for="joinCode">${t('sessionCode')}</label>
           <input id="joinCode" placeholder="${t('sessionCode')}" maxlength="6" value="${esc(S.pendingCode)}" autocapitalize="characters" autocomplete="off">
           <button class="btn ghost" data-act="joinSession">${t('join')}</button></div>`
      : `<button class="btn" data-act="login">${t('login')}</button><p class="muted small">${t('needLogin')}</p>`)
    : `<p class="muted small">${t('localMode')}</p>`;
  view(`
  <section class="hero">
    <h1>${esc(t('appTitle'))}</h1>
    <p class="lead">${esc(t('tagline'))}</p>
    <div class="panel-demo" aria-hidden="true">
      ${[[1, 'demo1'], [2, 'demo2'], [4, 'demo3']].map(([pr, k], i) => `<div class="demo-call" style="--i:${i}"><span class="lamp p${pr}"></span><span>${esc(t(k))}</span></div>`).join('')}
    </div>
  </section>
  <section class="card you">
    <h2>${t('you')}</h2>
    <div class="grid3">
      <label>${t('yourName')}<input id="pName" value="${esc(p.name)}" maxlength="24" autocomplete="nickname"></label>
      <label>${t('profession')}<select id="pProf">${Object.entries(PROFESSIONS).map(([k, v]) => `<option value="${k}" ${k === p.prof ? 'selected' : ''}>${esc(tx(v))}</option>`).join('')}</select></label>
      <label>${t('level')}<select id="pLevel">${LEVELS.map((v, i) => `<option value="${i}" ${i === +p.level ? 'selected' : ''}>${esc(tx(v))}</option>`).join('')}</select></label>
    </div>
  </section>
  <section class="actions">
    <div class="act"><h2>${t('soloPlay')}</h2><p>${t('soloDesc')}</p><button class="btn" data-act="soloSetup">${t('soloPlay')}</button></div>
    <div class="act"><h2>${t('multiTitle')}</h2><p>${t('multiDesc')}</p>${multi}</div>
  </section>
  <footer class="foot"><p>${t('evidenceNote')}</p><a href="#admin" data-act="admin">${t('admin')}</a></footer>`);
}
function saveProfile() {
  const n = $('#pName'), pr = $('#pProf'), lv = $('#pLevel');
  if (!n) return;
  const prof = pr.value;
  if (prof !== S.profile.prof) S.soloScenario = 'random';
  S.profile = { name: n.value.trim().slice(0, 24), prof, level: +lv.value };
  store.set('profile', S.profile);
}
function myName() { return S.profile.name || (S.user?.displayName || '').slice(0, 24) || 'Player'; }

/* ---------- ひとりで練習 ---------- */
function renderSolo() {
  const list = playable(S.profile.prof);
  const sc = S.soloScenario !== 'random' ? S.scenarios[S.soloScenario] : null;
  view(`<section class="card">
    <h2>${t('soloPlay')}</h2>
    <fieldset class="seg"><legend>${t('mode')}</legend>
      <label><input type="radio" name="soloMode" value="individual" ${S.soloMode === 'individual' ? 'checked' : ''}> ${t('modeIndividual')}</label>
      <label><input type="radio" name="soloMode" value="team" ${S.soloMode === 'team' ? 'checked' : ''}> ${t('modeTeam')}</label>
    </fieldset>
    <p class="muted">${S.soloMode === 'team' ? t('soloTeamDesc') : t('soloIndDesc')}</p>
    <label class="w-md">${t('scenario')}<select id="soloSc"><option value="random">${t('random')}</option>${list.map(s => `<option value="${esc(s.id)}" ${s.id === S.soloScenario ? 'selected' : ''}>${esc(tx(s.title))}</option>`).join('')}</select></label>
    ${sc ? briefingBlock(sc) : ''}
    <div class="row"><button class="btn big" data-act="soloStart">${t('start')}</button><button class="btn ghost" data-act="home">${t('backHome')}</button></div>
  </section>`);
}
function makeBots(mode, mult) {
  const n = mode === 'team' ? 5 : 3;
  return Array.from({ length: n }, (_, i) => ({
    name: `NPC ${i + 1}`, final: Math.round(1000 * (0.5 + Math.random() * 0.35) * mult),
    score: 0, team: mode === 'team' ? (i < 2 ? 'A' : 'B') : null, npc: true, finished: false,
  }));
}
function soloStart() {
  const list = playable(S.profile.prof);
  const sc = (S.soloScenario !== 'random' && S.scenarios[S.soloScenario]) || list[Math.floor(Math.random() * list.length)];
  S.bots = makeBots(S.soloMode, LEVEL_MULT[+S.profile.level]);
  startGame(sc, { mode: S.soloMode, extraStaff: S.soloMode === 'team' ? 1 : 0 });
}

/* ---------- セッション（オンライン対戦） ---------- */
function joinLink(code) { return `${location.origin}${location.pathname}?s=${code}`; }
function unsubAll() { S.unsubs.forEach(u => { try { u(); } catch { /* 無視 */ } }); S.unsubs = []; }

async function createSession() {
  const { F, db } = S.fb;
  let code = '';
  for (let i = 0; i < 6; i++) {
    code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    if (!(await F.getDoc(F.doc(db, 'sessions', code))).exists()) break;
  }
  await F.setDoc(F.doc(db, 'sessions', code), {
    hostUid: S.user.uid, hostName: myName(), mode: 'individual', status: 'lobby',
    seed: Math.floor(Math.random() * 1e9), createdAt: F.serverTimestamp(),
  });
  await joinSession(code);
}

async function joinSession(raw) {
  const code = String(raw || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) { toast(t('sessionNotFound'), 'bad'); return; }
  const { F, db } = S.fb;
  const snap = await F.getDoc(F.doc(db, 'sessions', code));
  if (!snap.exists()) { toast(t('sessionNotFound'), 'bad'); return; }
  const s = snap.data();
  const pref = F.doc(db, 'sessions', code, 'players', S.user.uid);
  const mine = await F.getDoc(pref);
  if (s.status !== 'lobby' && !mine.exists()) { toast(t('alreadyStarted'), 'bad'); return; }
  const me = { uid: S.user.uid, name: myName(), prof: S.profile.prof, level: +S.profile.level };
  if (!mine.exists()) await F.setDoc(pref, { ...me, team: 'A', score: 0, finished: false, joinedAt: F.serverTimestamp() });
  else if (s.status === 'lobby') await F.updateDoc(pref, me);
  S.session = { code, ...s }; S.players = []; S.lastResult = null; S.bots = null;
  history.replaceState(null, '', '?s=' + code);
  subscribe(code);
  if (s.status === 'playing') { startMulti(); return; }
  S.view = 'lobby'; renderLobby(true);
}

function subscribe(code) {
  unsubAll();
  const { F, db } = S.fb;
  S.unsubs.push(F.onSnapshot(F.doc(db, 'sessions', code), snap => {
    if (!snap.exists()) { leaveLocal(); go('home'); return; }
    const prev = S.session?.status;
    S.session = { code, ...snap.data() };
    if (prev === 'lobby' && S.session.status === 'playing' && S.view === 'lobby') startMulti();
    else if (S.view === 'lobby') renderLobby(false);
    else if (S.view === 'result' && S.session.status === 'finished') { toast(t('sessionEnded')); updateResultRank(); }
  }));
  S.unsubs.push(F.onSnapshot(F.collection(db, 'sessions', code, 'players'), q => {
    S.players = q.docs.map(d => d.data());
    if (S.view === 'lobby') renderLobby(false);
    else if (S.view === 'result') updateResultRank();
  }));
}

function renderLobby(full) {
  const s = S.session; if (!s) return go('home');
  const isHost = s.hostUid === S.user?.uid;
  if (full || !$('#lobbyDyn')) {
    const sc = pickScenario(S.profile.prof, s.seed);
    view(`<section class="lobby">
      <div class="code-box">
        <p class="muted small">${t('sessionCode')}</p>
        <p class="code">${esc(s.code)}</p>
        <div id="qr" aria-hidden="true"></div>
        <button class="btn ghost sm" data-act="copyLink">${t('shareLink')}</button>
      </div>
      <div>
        <div id="lobbyDyn"></div>
        <h2>${t('yourScenario')}</h2>${sc ? briefingBlock(sc) : ''}
      </div></section>`);
    drawQR(joinLink(s.code));
  }
  const me = S.players.find(p => p.uid === S.user?.uid);
  $('#lobbyDyn').innerHTML = `
    <fieldset class="seg" ${isHost ? '' : 'disabled'}><legend>${t('mode')}</legend>
      <label><input type="radio" name="sesMode" value="individual" ${s.mode === 'individual' ? 'checked' : ''}> ${t('modeIndividual')}</label>
      <label><input type="radio" name="sesMode" value="team" ${s.mode === 'team' ? 'checked' : ''}> ${t('modeTeam')}</label>
    </fieldset>
    ${s.mode === 'team' && me ? `<fieldset class="seg"><legend>${t('yourTeam')}</legend>${['A', 'B'].map(k => `<label><input type="radio" name="myTeam" value="${k}" ${me.team === k ? 'checked' : ''}> ${t('team' + k)}</label>`).join('')}</fieldset>` : ''}
    <h2>${t('players')} (${S.players.length})</h2>
    <ul class="plist">${S.players.map(p => `<li><strong>${esc(p.name)}</strong><span class="muted">${esc(tx(PROFESSIONS[p.prof]))}</span><span class="muted">${esc(tx(LEVELS[p.level]))}</span>${s.mode === 'team' ? `<span class="tb t${esc(p.team)}">${esc(p.team)}</span>` : ''}${p.uid === s.hostUid ? `<span class="tag">${t('host')}</span>` : ''}</li>`).join('')}</ul>
    <div class="row">${isHost ? `<button class="btn big" data-act="hostStart" ${S.players.length ? '' : 'disabled'}>${t('start')}</button>` : `<p class="muted">${t('waitingHost')}</p>`}
      <button class="btn ghost" data-act="leave">${t('leave')}</button></div>`;
}
function drawQR(text) {
  const el = $('#qr'); if (!el || !window.QRCode) return;
  el.innerHTML = '';
  new window.QRCode(el, { text, width: 144, height: 144, correctLevel: window.QRCode.CorrectLevel.M });
}
function startMulti() {
  const sc = pickScenario(S.profile.prof, S.session.seed);
  S.bots = null;
  startGame(sc, { mode: S.session.mode, extraStaff: 0 });
}
function pushScore(final) {
  if (!S.session || !S.fb || !S.user) return;
  const n = Date.now();
  if (!final && n - S.lastPush < 5000) return;
  S.lastPush = n;
  const { F, db } = S.fb;
  const data = final ? { score: final.score, axes: final.axes, finished: true } : { score: S.game.liveScore() };
  F.updateDoc(F.doc(db, 'sessions', S.session.code, 'players', S.user.uid), data).catch(() => {});
}
function leaveLocal() {
  unsubAll();
  S.session = null; S.players = [];
  history.replaceState(null, '', location.pathname);
}
async function leaveSession() {
  if (S.session && S.fb && S.user && S.view === 'lobby') {
    const { F, db } = S.fb;
    await F.deleteDoc(F.doc(db, 'sessions', S.session.code, 'players', S.user.uid)).catch(() => {});
  }
  leaveLocal();
}

/* ---------- ゲーム ---------- */
function startGame(sc, opts) {
  if (S.game) S.game.stop();
  S.lastResult = null; S.lastPush = 0;
  S.gameCtx = { sc, ...opts };
  S.game = new Game({
    scenario: sc, level: +S.profile.level, extraStaff: opts.extraStaff || 0,
    onChange: () => drawGame(),
    onTick: () => tickUI(),
    onEvent: (e) => gameEvent(e),
    onEnd: (r) => endGame(r),
  });
  S.view = 'game';
  renderGameShell();
  countdown(3, () => { beep(660, 0.15); S.game.start(); });
}
function countdown(n, cb) {
  const o = document.createElement('div'); o.className = 'count'; o.setAttribute('aria-live', 'assertive');
  document.body.appendChild(o);
  const step = () => { if (n <= 0) { o.remove(); cb(); return; } o.textContent = n; n--; setTimeout(step, 800); };
  step();
}
function renderGameShell() {
  const { sc, mode } = S.gameCtx || {};
  if (!sc) return go('home');
  view(`<section class="game">
    <div class="gbar">
      <div class="gtitle"><strong>${esc(tx(sc.title))}</strong>
        <span class="meta"><span>${esc(tx(PROFESSIONS[S.profile.prof]))}</span><span>${esc(tx(LEVELS[S.profile.level]))}</span><span>${t(mode === 'team' ? 'modeTeam' : 'modeIndividual')}</span></span></div>
      <div class="gstat"><span class="small">${t('timeLeft')}</span><span id="gTime" class="num">--</span></div>
      <div class="gstat"><span class="small">${t('score')}</span><span id="gScore" class="num">0</span></div>
      <div class="gtools">
        <label class="snd"><input type="checkbox" id="sound" ${S.sound ? 'checked' : ''}> ${t('sound')}</label>
        <button class="btn ghost sm light" data-act="quitGame">${t('quit')}</button>
      </div>
    </div>
    ${+S.profile.level === 0 ? `<p class="hint">${t('hintPriority')}</p>` : ''}
    <div class="ggrid">
      <div class="calls"><h2>${t('calls')}</h2><div id="gCalls"></div></div>
      <div class="side">
        <h2>${t('working')}</h2><div id="gActive"></div>
        <h2>${t('paused')}</h2><div id="gPaused"></div>
        <h2>${t('staff')}</h2><div id="gStaff"></div>
        <h2>${t('ranking')}</h2><div id="gRank"></div>
      </div>
    </div></section>`);
  drawGame();
}
function callCard(x, hint) {
  const id = esc(x.id);
  return `<article class="call" id="c-${id}">
    <span class="lamp ${hint ? 'p' + x.p : ''}"></span>
    <div class="cb"><p class="ct">${esc(tx(x.def.t))}</p>
      ${hint ? `<span class="tag p${x.p}">${esc(tx(PRIORITY[x.p]))}</span>` : ''}
      <div class="dl"><i id="dl-${id}"></i></div></div>
    <div class="ca"><button class="btn sm" data-act="doTask" data-id="${id}">${t('doIt')}</button>
      <button class="btn ghost sm" data-act="delegateTask" data-id="${id}">${t('delegate')}</button></div>
  </article>`;
}
function drawGame() {
  const g = S.game; if (!g || S.view !== 'game' || !$('#gCalls')) return;
  const hint = g.level === 0;
  const pend = g.tasks.filter(x => x.state === 'pending').sort((a, b) => a.arriveT - b.arriveT);
  $('#gCalls').innerHTML = pend.length ? pend.map(x => callCard(x, hint)).join('') : `<p class="empty">${t('noCalls')}</p>`;
  const a = g.active;
  $('#gActive').innerHTML = a
    ? `<div class="work"><p class="ct">${esc(tx(a.def.t))}</p><div class="prog"><i id="gProg"></i></div>
        <button class="btn ghost sm" data-act="memo" ${a.memo ? 'disabled' : ''}>${a.memo ? t('memoDone') : t('memo')}</button></div>`
    : `<p class="empty dark">${t('none')}</p>`;
  const ps = g.tasks.filter(x => x.state === 'paused');
  $('#gPaused').innerHTML = ps.length
    ? ps.map(x => `<div class="pz"><p>${esc(tx(x.def.t))}</p><span class="small ${x.memo ? 'ok' : 'warn'}">${x.memo ? t('memoDone') : t('noMemoLabel')}</span>
        <button class="btn sm" data-act="resumeTask" data-id="${esc(x.id)}">${t('resume')}</button></div>`).join('')
    : `<p class="empty dark">${t('none')}</p>`;
  tickUI();
}
function tickUI() {
  const g = S.game; if (!g || S.view !== 'game' || !$('#gTime')) return;
  const tl = Math.max(0, Math.ceil(g.limit - g.t));
  $('#gTime').textContent = `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`;
  $('#gScore').textContent = g.liveScore();
  if (g.active) { const el = $('#gProg'); if (el) el.style.width = Math.min(100, g.active.progress / g.active.work * 100) + '%'; }
  for (const x of g.tasks) {
    if (x.state !== 'pending') continue;
    const el = document.getElementById('dl-' + x.id);
    if (el) { const f = Math.max(0, (x.deadlineT - g.t) / x.window); el.style.width = f * 100 + '%'; el.classList.toggle('low', f < 0.3); }
    document.getElementById('c-' + x.id)?.classList.toggle('new', g.t - x.arriveT < 3);
  }
  $('#gStaff').innerHTML = g.staff.map(b => `<span class="staff ${b > g.t ? 'busy' : ''}">${b > g.t ? t('staffBusy') : t('staffFree')}</span>`).join('');
  if (S.bots) for (const b of S.bots) b.score = Math.round(b.final * Math.min(1, g.t / (g.limit * 0.85)));
  $('#gRank').innerHTML = rankingHTML(S.gameCtx.mode);
  pushScore();
}
function gameEvent(e) {
  const name = e.task ? tx(e.task.def.t) : '';
  const m = {
    badPriority: [t('ev_badPriority'), 'bad'], badDelegate: [t('ev_badDelegate'), 'bad'], noStaff: [t('noStaff'), ''],
    missed: [t('ev_missed', { task: name }), 'bad'], resumeSlip: [t('ev_resumeSlip'), 'bad'], resumeOk: [t('ev_resumeOk'), 'good'],
    checkWrong: [t('ev_checkWrong'), 'bad'], checkOk: [t('ev_checkOk'), 'good'], delegated: [t('ev_delegated'), 'good'],
  }[e.type];
  if (m) toast(m[0], m[1]);
  if (e.type === 'arrive') beep(880, 0.1);
  if (e.type === 'missed') beep(220, 0.25);
}
function openCheck(x) {
  const c = CHECKS[x.def.chk];
  if (!c) { S.game.answerCheck(x, true); return; }
  const opts = c.o.map((o, i) => ({ o, ok: i === 0 })).sort(() => Math.random() - 0.5);
  modal(`<h2>${t('checkTitle')}</h2><p class="muted">${esc(tx(x.def.t))}</p><p class="q">${esc(tx(c.q))}</p>
    <div class="opts">${opts.map(o => `<button class="opt" data-act="checkAns" data-ok="${o.ok ? 1 : 0}" data-id="${esc(x.id)}">${esc(tx(o.o))}</button>`).join('')}</div>`);
}
async function endGame(r) {
  closeModal();
  S.lastResult = r;
  if (S.bots) S.bots.forEach(b => { b.score = b.final; b.finished = true; });
  S.view = 'result'; renderResult();
  if (S.session) pushScore(r);
  if (S.fb && S.user) {
    const { F, db } = S.fb; const sc = S.gameCtx.sc;
    try {
      await F.addDoc(F.collection(db, 'logs'), {
        uid: S.user.uid, name: myName(), prof: S.profile.prof, level: +S.profile.level,
        scenarioId: sc.id, scenarioTitle: tx(sc.title), mode: S.gameCtx.mode, sessionCode: S.session?.code || null,
        solo: !S.session, score: r.score, total: r.total, maxPossible: r.maxPossible, axes: r.axes, stats: r.stats,
        duration: r.duration, events: r.log.slice(0, 300), lang: S.lang, at: F.serverTimestamp(),
      });
    } catch (e) { console.warn('log', e); }
  }
}

/* ---------- 順位 ---------- */
function rankEntries() {
  if (S.session) {
    return S.players.map(p => ({
      name: p.name, score: p.uid === S.user?.uid && S.game && !S.lastResult ? S.game.liveScore() : (p.score || 0),
      team: p.team, prof: p.prof, finished: p.finished, me: p.uid === S.user?.uid,
    }));
  }
  const me = { name: myName(), score: S.lastResult ? S.lastResult.score : (S.game ? S.game.liveScore() : 0), team: S.gameCtx?.mode === 'team' ? 'A' : null, prof: S.profile.prof, me: true, finished: !!S.lastResult };
  return [me, ...(S.bots || []).map(b => ({ ...b }))];
}
function rankingHTML(mode) {
  const e = rankEntries().sort((a, b) => b.score - a.score);
  let html = '';
  if (mode === 'team') {
    const teams = {};
    for (const x of e) if (x.team) (teams[x.team] ||= []).push(x);
    const ts = Object.entries(teams).map(([k, v]) => {
      const total = v.reduce((s, x) => s + x.score, 0);
      return { k, total, n: v.length, avg: Math.round(total / v.length) };
    }).sort((a, b) => b.avg - a.avg);
    html += `<div class="teams">${ts.map(x => `<div class="team t${esc(x.k)}"><span>${t('team' + x.k)}</span><span class="tavg">${x.avg}</span><span class="small">${t('teamAvg')}${par(`${t('teamTotal')} ${x.total} / ${x.n}`)}</span></div>`).join('')}</div>`;
  }
  html += `<ol class="rank">${e.map(x => `<li class="${x.me ? 'me' : ''}"><span class="rn">${esc(x.name)}${x.me ? par(t('you')) : ''}</span>${x.team ? `<span class="tb t${esc(x.team)}">${esc(x.team)}</span>` : ''}${x.prof && PROFESSIONS[x.prof] ? `<span class="muted small">${esc(tx(PROFESSIONS[x.prof]))}</span>` : ''}<span class="rs">${x.score}</span></li>`).join('')}</ol>`;
  return html;
}
function updateResultRank() {
  const el = $('#finalRank'); if (!el) return;
  el.innerHTML = rankingHTML(S.session ? S.session.mode : S.gameCtx?.mode);
  const w = $('#waitNote');
  if (w && S.session) {
    const done = S.players.filter(p => p.finished).length;
    w.textContent = done < S.players.length ? t('finishedWaiting', { n: done, m: S.players.length }) : '';
  }
}

/* ---------- 結果 ---------- */
function renderResult() {
  const r = S.lastResult; const sc = S.gameCtx?.sc;
  if (!r || !sc) return go('home');
  const axisRow = (a) => {
    const v = r.axes[a], mx = r.axMax[a];
    const w = mx > 0 ? Math.min(100, Math.abs(v) / mx * 100) : Math.min(100, Math.abs(v) * 4);
    return `<div class="ax"><span>${t('axis_' + a)}</span><div class="axbar"><i class="${v < 0 ? 'neg' : ''}" style="width:${w}%"></i></div><span class="num-s">${v > 0 ? '+' : ''}${v}${mx > 0 ? ` / ${mx}` : ''}</span></div>`;
  };
  const st = r.stats;
  const fb = [['badPriority', 'fb_badPriority'], ['noMemo', 'fb_noMemo'], ['badDelegate', 'fb_badDelegate'], ['checkWrong', 'fb_checkWrong'], ['expired', 'fb_expired']]
    .filter(([k]) => st[k] > 0).map(([k, key]) => `<li>${t(key, { n: st[k] })}</li>`);
  const isHost = S.session && S.session.hostUid === S.user?.uid;
  view(`<section class="result">
    <div class="res-head">
      <p class="muted">${esc(tx(sc.title))}</p>
      <p class="big-score">${r.score}</p>
      <p class="muted">${t('score')}${par(`${esc(tx(LEVELS[r.level]))} ×${LEVEL_MULT[r.level]}`)}</p>
    </div>
    <div class="res-grid">
      <div>
        <div class="axes card">${AXES.map(axisRow).join('')}</div>
        <div class="card"><h2>${t('reviewTitle')}</h2>
          <ul class="fb">${fb.length ? fb.join('') : `<li>${t('fb_perfect')}</li>`}</ul>
          <div class="tablewrap"><table class="review"><thead><tr><th>${t('task')}</th><th>${t('priority')}</th><th>${t('delegable')}</th><th>${t('outcome')}</th></tr></thead>
          <tbody>${r.tasks.slice().sort((a, b) => a.p - b.p || a.arrive - b.arrive).map(x => `<tr><td>${esc(tx(x.text))}</td><td><span class="tag p${x.p}">${esc(tx(PRIORITY[x.p]))}</span></td><td>${x.del ? '○' : '—'}</td><td class="oc-${x.outcome}">${t(x.outcome)}</td></tr>`).join('')}</tbody></table></div>
        </div>
        <div class="card"><h2>${t('tipsTitle')}</h2><ul>${TIPS.map(s => `<li>${esc(tx(s))}</li>`).join('')}</ul></div>
      </div>
      <div class="card"><h2>${t('ranking')}</h2><div id="finalRank"></div><p id="waitNote" class="muted small"></p></div>
    </div>
    <div class="row">
      ${S.session ? '' : `<button class="btn" data-act="soloSetup">${t('playAgain')}</button>`}
      ${isHost && S.session.status !== 'finished' ? `<button class="btn ghost" data-act="endSession">${t('endSession')}</button>` : ''}
      <button class="btn ghost" data-act="exitResult">${t('backHome')}</button>
    </div>
  </section>`);
  updateResultRank();
}

/* ---------- 管理者 ---------- */
function isPasswordUser() { return !!S.user?.providerData?.some(p => p.providerId === 'password'); }
function renderAdmin() {
  if (!S.fb) return view(`<section class="card narrow"><h2>${t('admin')}</h2><p>${t('localMode')}</p><button class="btn ghost" data-act="home">${t('backHome')}</button></section>`);
  if (!S.user) {
    return view(`<section class="card narrow"><h2>${t('adminLogin')}</h2>
      <form id="adForm" class="stack" onsubmit="return false">
        <label>${t('email')}<input id="adEmail" type="email" autocomplete="username" required></label>
        <label>${t('password')}<input id="adPw" type="password" autocomplete="current-password" required></label>
        <button class="btn" data-act="adminSignIn">${t('signIn')}</button>
      </form>
      <p class="muted small sep">${t('orGoogle')}</p>
      <button class="btn ghost" data-act="login">${t('login')}</button></section>`);
  }
  if (!S.isAdmin) {
    return view(`<section class="card narrow"><h2>${t('admin')}</h2><p>${t('notAdmin')}</p>
      <p class="muted small">UID: <code>${esc(S.user.uid)}</code></p>
      <div class="row"><button class="btn ghost" data-act="logout">${t('logout')}</button><button class="btn ghost" data-act="home">${t('backHome')}</button></div></section>`);
  }
  if (isPasswordUser() && S.adminDoc?.mustChangePassword) {
    return view(`<section class="card narrow"><h2>${t('mustChange')}</h2><p class="muted">${t('mustChangeDesc')}</p>${pwFormHTML()}</section>`);
  }
  const tabs = ['scenarios', 'videos', 'logs', 'audit', ...(isPasswordUser() ? ['password'] : [])];
  if (!tabs.includes(S.adminTab)) S.adminTab = 'scenarios';
  view(`<section class="admin">
    <nav class="tabs" role="tablist">${tabs.map(k => `<button role="tab" class="tab ${S.adminTab === k ? 'on' : ''}" aria-selected="${S.adminTab === k}" data-act="adminTab" data-tab="${k}">${t('tab_' + k)}</button>`).join('')}</nav>
    <div id="adminBody"></div></section>`);
  ({ scenarios: adminScenarios, videos: adminVideos, logs: adminLogs, audit: adminAudit, password: () => { $('#adminBody').innerHTML = `<div class="card narrow">${pwFormHTML()}</div>`; } })[S.adminTab]();
}
function pwFormHTML() {
  return `<form class="stack" onsubmit="return false">
    <input type="email" autocomplete="username" value="${esc(S.user?.email || '')}" hidden>
    <label>${t('currentPw')}<input id="pwCur" type="password" autocomplete="current-password"></label>
    <label>${t('newPw')}<input id="pwNew" type="password" autocomplete="new-password" minlength="8"></label>
    <label>${t('confirmPw')}<input id="pwNew2" type="password" autocomplete="new-password" minlength="8"></label>
    <button class="btn" data-act="changePw">${t('changePw')}</button></form>`;
}
async function changePw() {
  const cur = $('#pwCur').value, n1 = $('#pwNew').value, n2 = $('#pwNew2').value;
  if (n1.length < 8) return toast(t('pwShort'), 'bad');
  if (n1 !== n2) return toast(t('pwMismatch'), 'bad');
  if (n1 === cur) return toast(t('pwSame'), 'bad');
  const { A, F, auth, db } = S.fb; const u = auth.currentUser;
  const initial = !!S.adminDoc?.mustChangePassword;
  await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, cur));
  await A.updatePassword(u, n1);
  await audit(initial ? 'initial_password_changed' : 'password_changed');
  await F.updateDoc(F.doc(db, 'admins', u.uid), { mustChangePassword: false, passwordChangedAt: F.serverTimestamp() });
  S.adminDoc = { ...S.adminDoc, mustChangePassword: false };
  toast(t('pwChanged'), 'good');
  S.adminTab = 'scenarios'; renderAdmin();
}
async function adminSignIn() {
  const { A, F, auth, db } = S.fb;
  const cred = await A.signInWithEmailAndPassword(auth, $('#adEmail').value.trim(), $('#adPw').value);
  const snap = await F.getDoc(F.doc(db, 'admins', cred.user.uid));
  S.user = cred.user;
  if (snap.exists()) { S.isAdmin = true; S.adminDoc = snap.data(); await audit('admin_login'); }
  renderHeader(); renderAdmin();
}

const toObj = (v) => Array.isArray(v) ? Object.fromEntries(L4.map((l, i) => [l, v[i] || ''])) : (v && typeof v === 'object' ? { ...v } : { ja: v || '' });
function adminScenarios() {
  const list = Object.values(S.scenarios).sort((a, b) => (a.prof + a.id).localeCompare(b.prof + b.id));
  const cur = S.draft || (S.editId ? S.scenarios[S.editId] : null);
  $('#adminBody').innerHTML = `<div class="split">
    <aside class="slist"><button class="btn sm" data-act="newScenario">${t('newScenario')}</button>
      <ul>${list.map(s => `<li><button class="linkish ${s.id === S.editId && !S.draft ? 'on' : ''}" data-act="editScenario" data-id="${esc(s.id)}">${esc(tx(s.title))}<span class="muted small">${esc(tx(PROFESSIONS[s.prof]))}／${t('src_' + s.source)}${s.hidden ? '／' + t('hiddenLabel') : ''}</span></button></li>`).join('')}</ul></aside>
    <div class="editor">${cur ? editorHTML(cur) : `<p class="muted">${t('pickScenario')}</p>`}</div></div>`;
}
function editorHTML(s) {
  const isNew = !!s._new;
  const title = toObj(s.title), intro = toObj(s.intro);
  const tasks = (s.tasks || []).map(x => ({ ...x, t: toObj(x.t) }));
  return `<form id="scForm" class="stack" onsubmit="return false">
    <div class="grid3">
      <label>ID<input name="id" value="${esc(s.id || '')}" ${isNew ? '' : 'readonly'} required></label>
      <label>${t('profession')}<select name="prof">${Object.entries(PROFESSIONS).map(([k, v]) => `<option value="${k}" ${k === s.prof ? 'selected' : ''}>${esc(tx(v))}</option>`).join('')}</select></label>
      <label>${t('limitSec')}<input name="limit" type="number" min="60" max="600" value="${+s.limit || 150}"></label>
    </div>
    <label class="inline"><input type="checkbox" name="hidden" ${s.hidden ? 'checked' : ''}> ${t('hideScenario')}</label>
    ${L4.map(l => `<fieldset class="lang"><legend>${LANGS.find(x => x[0] === l)[1]}</legend>
      <label>${t('titleF')}<input name="title_${l}" value="${esc(title[l] || '')}"></label>
      <label>${t('introF')}<textarea name="intro_${l}" rows="2">${esc(intro[l] || '')}</textarea></label></fieldset>`).join('')}
    <label>${t('tasksJson')}<textarea name="tasks" rows="18" class="mono" spellcheck="false">${esc(JSON.stringify(tasks, null, 2))}</textarea></label>
    <details class="help"><summary>${t('taskHelpTitle')}</summary><p>${t('taskHelp')}</p><p class="muted small">chk: ${Object.keys(CHECKS).join(', ')}</p></details>
    <div class="row"><button class="btn" data-act="saveScenario">${t('save')}</button>
      ${s.source === 'override' ? `<button class="btn ghost" data-act="deleteScenario" data-id="${esc(s.id)}">${t('resetScenario')}</button>` : ''}
      ${s.source === 'custom' ? `<button class="btn danger" data-act="deleteScenario" data-id="${esc(s.id)}">${t('deleteScenario')}</button>` : ''}</div>
  </form>`;
}
function validateTasks(a) {
  if (!Array.isArray(a) || !a.length) return 'tasks = []';
  const ids = new Set();
  for (const [i, x] of a.entries()) {
    const at = `#${i + 1}`;
    if (!x || typeof x !== 'object') return at;
    if (!x.id || ids.has(String(x.id))) return `${at} id`;
    ids.add(String(x.id));
    if (!x.t || !tx(x.t)) return `${at} t`;
    if (![1, 2, 3, 4].includes(x.p)) return `${at} p`;
    for (const k of ['dur', 'dl']) if (!(typeof x[k] === 'number' && x[k] > 0)) return `${at} ${k}`;
    if (!(typeof x.at === 'number' && x.at >= 0)) return `${at} at`;
    if (x.chk && !CHECKS[x.chk]) return `${at} chk`;
    if (x.lv != null && ![0, 1, 2, 3].includes(x.lv)) return `${at} lv`;
  }
  return '';
}
async function saveScenario() {
  const f = new FormData($('#scForm'));
  const id = String(f.get('id') || '').trim();
  if (!/^[a-z0-9-]{2,40}$/.test(id)) return toast(t('badId'), 'bad');
  if (S.draft && S.scenarios[id]) return toast(t('idExists'), 'bad');
  let tasks;
  try { tasks = JSON.parse(f.get('tasks')); } catch { return toast(t('jsonError'), 'bad'); }
  const err = validateTasks(tasks); if (err) return toast(`${t('jsonError')}: ${err}`, 'bad');
  tasks = tasks.map(x => ({ id: String(x.id), t: toObj(x.t), p: x.p, dur: x.dur, dl: x.dl, at: x.at, del: !!x.del, chk: x.chk || null, lv: x.lv || 0 }));
  const data = {
    prof: f.get('prof'), limit: Math.max(60, Math.min(600, +f.get('limit') || 150)), hidden: f.get('hidden') === 'on',
    title: Object.fromEntries(L4.map(l => [l, String(f.get('title_' + l) || '').trim()])),
    intro: Object.fromEntries(L4.map(l => [l, String(f.get('intro_' + l) || '').trim()])),
    tasks,
  };
  if (!data.title.ja && !data.title.en) return toast(t('needTitle'), 'bad');
  const { F, db } = S.fb;
  await F.setDoc(F.doc(db, 'scenarios', id), { ...data, updatedAt: F.serverTimestamp(), updatedBy: S.user.email || S.user.uid });
  await audit('scenario_saved', { scenarioId: id });
  S.draft = null; S.editId = id;
  await loadRemote();
  toast(t('saved'), 'good'); adminScenarios();
}
async function deleteScenario(id) {
  if (!confirm(t('confirmDelete'))) return;
  const { F, db } = S.fb;
  await F.deleteDoc(F.doc(db, 'scenarios', id));
  await audit('scenario_deleted', { scenarioId: id });
  await loadRemote();
  if (!S.scenarios[id]) S.editId = null;
  toast(t('saved'), 'good'); adminScenarios();
}

function adminVideos() {
  const list = Object.values(S.scenarios).sort((a, b) => (a.prof + a.id).localeCompare(b.prof + b.id));
  const canUpload = STORAGE_ENABLED && S.fb.storage;
  $('#adminBody').innerHTML = `<p class="muted">${t('videoHelp')}</p>${list.map(s => {
    const url = S.meta[s.id]?.videoUrl || '';
    const id = esc(s.id);
    return `<div class="vrow"><div><strong>${esc(tx(s.title))}</strong> <span class="muted small">${esc(tx(PROFESSIONS[s.prof]))}</span></div>
      <div class="vf"><label class="sr" for="v-${id}">URL</label><input type="url" id="v-${id}" value="${esc(url)}" placeholder="https://">
        <button class="btn sm" data-act="saveVideo" data-id="${id}">${t('save')}</button>
        ${url ? `<button class="btn ghost sm" data-act="removeVideo" data-id="${id}">${t('removeVideo')}</button>` : ''}
        ${canUpload ? `<label class="file btn ghost sm">${t('uploadVideo')}<input type="file" accept="video/*" data-upload="${id}"></label>` : ''}</div>
      ${url ? `<details data-preview="${id}"><summary>${t('preview')}</summary><div class="pv"></div></details>` : ''}</div>`;
  }).join('')}`;
}
async function saveVideoUrl(id, url, action = 'video_saved') {
  const { F, db } = S.fb;
  await F.setDoc(F.doc(db, 'scenarioMeta', id), { videoUrl: url, updatedAt: F.serverTimestamp(), updatedBy: S.user.email || S.user.uid }, { merge: true });
  await audit(action, { scenarioId: id, url });
  S.meta[id] = { ...(S.meta[id] || {}), videoUrl: url };
  toast(t('saved'), 'good'); adminVideos();
}
async function uploadVideo(id, file) {
  if (!file) return;
  if (file.size > 200 * 1024 * 1024) return toast(t('fileTooLarge'), 'bad');
  const { ST, storage } = S.fb;
  toast(t('uploading'));
  const r = ST.ref(storage, `videos/${id}/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`);
  await ST.uploadBytes(r, file, { contentType: file.type });
  await saveVideoUrl(id, await ST.getDownloadURL(r));
}

async function fetchRows(col) {
  const { F, db } = S.fb;
  const q = await F.getDocs(F.query(F.collection(db, col), F.orderBy('at', 'desc'), F.limit(500)));
  return q.docs.map(d => ({ _id: d.id, ...d.data() }));
}
async function adminLogs() {
  const body = $('#adminBody'); body.innerHTML = `<p class="muted">${t('loading')}</p>`;
  try { S.logRows = await fetchRows('logs'); } catch (e) { body.innerHTML = `<p class="bad">${esc(errMsg(e))}</p>`; return; }
  const cols = ['colDate', 'yourName', 'profession', 'level', 'scenario', 'mode', 'sessionCode', 'score', ...AXES.map(a => 'axis_' + a)];
  body.innerHTML = `<div class="row"><button class="btn sm" data-act="exportLogs">${t('exportCsv')}</button><span class="muted small">${S.logRows.length}</span></div>
    <div class="tablewrap"><table class="data"><thead><tr>${cols.map(k => `<th>${t(k)}</th>`).join('')}</tr></thead>
    <tbody>${S.logRows.map(r => `<tr><td>${fmtDate(r.at)}</td><td>${esc(r.name)}</td><td>${esc(tx(PROFESSIONS[r.prof]))}</td><td>${esc(tx(LEVELS[r.level]))}</td><td>${esc(r.scenarioTitle || r.scenarioId)}</td><td>${t(r.mode === 'team' ? 'modeTeam' : 'modeIndividual')}</td><td>${esc(r.sessionCode || '—')}</td><td class="num-s">${r.score}</td>${AXES.map(a => `<td class="num-s">${r.axes?.[a] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
async function adminAudit() {
  const body = $('#adminBody'); body.innerHTML = `<p class="muted">${t('loading')}</p>`;
  try { S.auditRows = await fetchRows('auditLogs'); } catch (e) { body.innerHTML = `<p class="bad">${esc(errMsg(e))}</p>`; return; }
  body.innerHTML = `<div class="row"><button class="btn sm" data-act="exportAudit">${t('exportCsv')}</button><span class="muted small">${S.auditRows.length}</span></div>
    <div class="tablewrap"><table class="data"><thead><tr><th>${t('colDate')}</th><th>${t('colAction')}</th><th>${t('email')}</th><th>UID</th><th>${t('colDetail')}</th></tr></thead>
    <tbody>${S.auditRows.map(r => `<tr><td>${fmtDate(r.at)}</td><td>${esc(T['act_' + r.action] ? t('act_' + r.action) : r.action)}</td><td>${esc(r.email)}</td><td class="small">${esc(r.uid)}</td><td class="small">${esc([r.scenarioId, r.url].filter(Boolean).join(' '))}</td></tr>`).join('')}</tbody></table></div>`;
}
function downloadCSV(name, rows) {
  const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const iso = (ts) => (ts?.toDate ? ts.toDate().toISOString() : '');

/* ---------- 操作の受け付け ---------- */
const ACT = {
  home: () => { if (S.view === 'lobby') leaveSession(); go('home'); },
  login: () => guard(loginGoogle),
  logout: () => guard(async () => { await leaveSession(); await S.fb.A.signOut(S.fb.auth); S.isAdmin = false; go('home'); }),
  admin: () => go('admin'),
  soloSetup: () => { leaveLocal(); go('solo'); },
  soloStart,
  createSession: () => guard(createSession),
  joinSession: () => guard(() => joinSession($('#joinCode')?.value)),
  copyLink: () => navigator.clipboard?.writeText(joinLink(S.session.code)).then(() => toast(t('copied'), 'good')),
  hostStart: () => guard(async () => { const { F, db } = S.fb; await F.updateDoc(F.doc(db, 'sessions', S.session.code), { status: 'playing', startedAt: F.serverTimestamp() }); }),
  leave: () => guard(async () => { await leaveSession(); go('home'); }),
  endSession: () => guard(async () => { const { F, db } = S.fb; await F.updateDoc(F.doc(db, 'sessions', S.session.code), { status: 'finished', endedAt: F.serverTimestamp() }); }),
  exitResult: () => { leaveLocal(); S.game = null; go('home'); },
  quitGame: () => { if (!confirm(t('confirmDelete'))) return; S.game?.stop(); S.game = null; closeModal(); leaveLocal(); go('home'); },
  doTask: ({ id }) => { const g = S.game; const x = g?.find(id); if (x && g.requestStart(x) === 'check') openCheck(x); },
  resumeTask: ({ id }) => { const g = S.game; const x = g?.find(id); if (x && g.requestStart(x) === 'check') openCheck(x); },
  delegateTask: ({ id }) => { const g = S.game; const x = g?.find(id); if (x) g.delegate(x); },
  memo: () => S.game?.memo(),
  checkAns: ({ id, ok }) => { closeModal(); const g = S.game; const x = g?.find(id); if (x) g.answerCheck(x, ok === '1'); },
  adminSignIn: () => guard(adminSignIn),
  adminTab: ({ tab }) => { S.adminTab = tab; renderAdmin(); },
  newScenario: () => {
    S.editId = null;
    S.draft = { _new: true, id: '', prof: S.profile.prof, limit: 150, title: {}, intro: {},
      tasks: [{ id: 'a1', t: { ja: '', en: '', ko: '', zh: '' }, p: 2, dur: 10, dl: 40, at: 0, del: false, chk: null, lv: 0 }] };
    adminScenarios();
  },
  editScenario: ({ id }) => { S.draft = null; S.editId = id; adminScenarios(); },
  saveScenario: () => guard(saveScenario),
  deleteScenario: ({ id }) => guard(() => deleteScenario(id)),
  saveVideo: ({ id }) => {
    const url = (document.getElementById('v-' + id)?.value || '').trim();
    if (!/^https:\/\/\S+$/i.test(url)) return toast(t('badUrl'), 'bad');
    guard(() => saveVideoUrl(id, url));
  },
  removeVideo: ({ id }) => { if (confirm(t('confirmDelete'))) guard(() => saveVideoUrl(id, '', 'video_removed')); },
  changePw: () => guard(changePw),
  exportLogs: () => downloadCSV('play-logs.csv', [
    ['date', 'uid', 'name', 'profession', 'level', 'scenarioId', 'scenario', 'mode', 'session', 'score', ...AXES, 'badPriority', 'noMemo', 'badDelegate', 'checkWrong', 'expired', 'done', 'delegated', 'durationSec', 'lang'],
    ...S.logRows.map(r => [iso(r.at), r.uid, r.name, r.prof, r.level, r.scenarioId, r.scenarioTitle, r.mode, r.sessionCode || '', r.score,
      ...AXES.map(a => r.axes?.[a]), ...['badPriority', 'noMemo', 'badDelegate', 'checkWrong', 'expired', 'done', 'delegated'].map(k => r.stats?.[k]), r.duration, r.lang]),
  ]),
  exportAudit: () => downloadCSV('audit-log.csv', [
    ['date', 'action', 'email', 'uid', 'scenarioId', 'url', 'userAgent'],
    ...S.auditRows.map(r => [iso(r.at), r.action, r.email, r.uid, r.scenarioId || '', r.url || '', r.userAgent || '']),
  ]),
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = ACT[el.dataset.act]; if (!f) return;
  e.preventDefault();
  f(el.dataset, el);
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'langSel') setLang(el.value);
  else if (['pName', 'pProf', 'pLevel'].includes(el.id)) saveProfile();
  else if (el.id === 'soloSc') { S.soloScenario = el.value; renderSolo(); }
  else if (el.name === 'soloMode') { S.soloMode = el.value; renderSolo(); }
  else if (el.name === 'sesMode') guard(async () => { const { F, db } = S.fb; await F.updateDoc(F.doc(db, 'sessions', S.session.code), { mode: el.value }); });
  else if (el.name === 'myTeam') guard(async () => { const { F, db } = S.fb; await F.updateDoc(F.doc(db, 'sessions', S.session.code, 'players', S.user.uid), { team: el.value }); });
  else if (el.id === 'sound') { S.sound = el.checked; store.set('sound', S.sound); }
  else if (el.dataset.upload) guard(() => uploadVideo(el.dataset.upload, el.files[0]));
});
document.addEventListener('input', (e) => { if (e.target.id === 'pName') saveProfile(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'joinCode') { e.preventDefault(); ACT.joinSession(); }
  if (e.key === 'Enter' && (e.target.id === 'adPw' || e.target.id === 'adEmail')) { e.preventDefault(); ACT.adminSignIn(); }
});
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (d.matches?.('details[data-preview]') && d.open) d.querySelector('.pv').innerHTML = videoEmbed(S.meta[d.dataset.preview]?.videoUrl);
}, true);
window.addEventListener('hashchange', () => { if (location.hash === '#admin' && S.view !== 'game') go('admin'); });

/* ---------- 起動 ---------- */
(async function main() {
  document.documentElement.lang = S.lang;
  document.title = t('appTitle');
  loadBuiltins();
  S.pendingCode = (new URLSearchParams(location.search).get('s') || '').toUpperCase().slice(0, 6);
  if (location.hash === '#admin') S.view = 'admin';
  renderHeader(); rerender();
  await initFirebase();
  if (S.fb) { await loadRemote(); watchAuth(); }
  renderHeader();
  if (S.view !== 'game') rerender();
})();
