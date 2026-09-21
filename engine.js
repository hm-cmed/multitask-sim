// 多重課題ゲームのロジック。画面描画には依存しません。
// スコアの5軸：priority 優先順位 / time 時間 / safety 安全確認 / resume 再開 / comm 委任・報告

export const LEVEL_MULT = [1.0, 1.1, 1.2, 1.3];   // 経験レベルによる得点係数
const ARRIVE_F = [1.15, 1.0, 0.85, 0.72];           // レベルが上がるほど呼び出しが早く来る
const DEADLINE_F = [1.3, 1.0, 0.9, 0.8];            // レベルが上がるほど期限が短い
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class Game {
  constructor({ scenario, level = 1, extraStaff = 0, onChange, onTick, onEvent, onEnd }) {
    this.sc = scenario;
    this.level = Math.max(0, Math.min(3, level | 0));
    this.onChange = onChange || (() => {});
    this.onTick = onTick || (() => {});
    this.onEvent = onEvent || (() => {});
    this.onEnd = onEnd || (() => {});
    const fa = ARRIVE_F[this.level], fd = DEADLINE_F[this.level];
    this.tasks = (scenario.tasks || [])
      .filter(d => (d.lv || 0) <= this.level)
      .map(d => ({
        def: d, id: String(d.id), p: d.p, state: 'future', outcome: null,
        arriveT: d.at * fa, window: d.dl * fd, deadlineT: d.at * fa + d.dl * fd,
        work: d.dur, progress: 0, memo: false, checked: false, prioScored: false, pauses: 0,
      }));
    this.staff = Array(1 + extraStaff).fill(0);   // 同僚が空く時刻
    this.limit = scenario.limit || 150;
    this.t = 0;
    this.active = null;
    this.running = false;
    this.finished = false;
    this.axes = { priority: 0, time: 0, safety: 0, resume: 0, comm: 0 };
    this.stats = { badPriority: 0, noMemo: 0, badDelegate: 0, checkWrong: 0, expired: 0, done: 0, delegated: 0 };
    this.log = [];
    this.maxPossible = this.tasks.reduce((s, x) => s + 8 + 20 + (x.def.chk ? 8 : 0), 0) || 1;
  }

  find(id) { return this.tasks.find(x => x.id === String(id)); }
  ev(type, x) { const e = { type, t: +this.t.toFixed(1), id: x ? x.id : null }; this.log.push(e); this.onEvent({ ...e, task: x }); }
  changed() { this.onChange(this); }

  start() {
    if (this.running || this.finished) return;
    this.running = true;
    let last = now();
    this.timer = setInterval(() => {
      const n = now(); const dt = Math.min(1, (n - last) / 1000); last = n;
      this.tick(dt);
    }, 200);
  }

  stop() { clearInterval(this.timer); this.running = false; }

  tick(dt) {
    if (!this.running) return;
    this.t += dt;
    let ch = false;
    for (const x of this.tasks) {
      if (x.state === 'future' && this.t >= x.arriveT) { x.state = 'pending'; ch = true; this.ev('arrive', x); }
      else if (x.state === 'pending' && this.t >= x.deadlineT) { this.miss(x); ch = true; }
      else if (x.state === 'delegated' && this.t >= x.doneT) {
        x.state = 'done'; x.outcome = 'delegated';
        this.axes.time += x.doneT <= x.deadlineT ? 10 : 2; ch = true;
      }
    }
    const a = this.active;
    if (a) { a.progress += dt; if (a.progress >= a.work) { this.complete(a); ch = true; } }
    if (ch) this.changed();
    this.onTick(this);
    const allClosed = this.tasks.every(x => x.state === 'done' || x.state === 'missed');
    if (this.t >= this.limit || allClosed) this.finish();
  }

  // 着手（新規・再開）の判断。優先順位を評価し、安全確認が必要なら 'check' を返す
  requestStart(x) {
    if (!this.running || !x || x === this.active || !(x.state === 'pending' || x.state === 'paused')) return 'no';
    this.evalPriority(x);
    if (x.def.chk && !x.checked) return 'check';
    this.begin(x);
    return 'ok';
  }

  evalPriority(x) {
    const others = this.tasks.filter(y => y !== x && (y.state === 'pending' || y.state === 'paused' || y.state === 'active'));
    const best = Math.min(x.p, ...others.map(y => y.p));
    if (x.p <= best) {
      if (!x.prioScored) { this.axes.priority += 8; x.prioScored = true; }
      return true;
    }
    this.axes.priority -= 4 * (x.p - best);
    this.stats.badPriority++;
    this.ev('badPriority', x);
    return false;
  }

  answerCheck(x, ok) {
    if (!x || x.checked) return;
    x.checked = true;
    if (ok) { this.axes.safety += 8; this.ev('checkOk', x); }
    else { this.axes.safety -= 10; this.stats.checkWrong++; this.ev('checkWrong', x); }
    if (this.running && x !== this.active && (x.state === 'pending' || x.state === 'paused')) this.begin(x);
    else this.changed();
  }

  begin(x) {
    const a = this.active;
    if (a && a !== x) {
      a.state = 'paused'; a.pauses++;
      if (a.memo) this.ev('pauseMemo', a);
      else { this.stats.noMemo++; this.ev('pauseNoMemo', a); }
    }
    if (x.state === 'paused') {
      if (x.memo) { this.axes.resume += 4; this.ev('resumeOk', x); }
      else { this.axes.resume -= 6; this.ev('resumeSlip', x); }
      x.memo = false;
    }
    x.state = 'active';
    this.active = x;
    this.changed();
  }

  memo() {
    if (this.active && !this.active.memo) { this.active.memo = true; this.ev('memo', this.active); this.changed(); }
  }

  delegate(x) {
    if (!this.running || !x || x.state !== 'pending') return 'no';
    if (!x.def.del) {
      this.axes.comm -= 8; this.stats.badDelegate++; this.ev('badDelegate', x);
      return 'bad';
    }
    const i = this.staff.findIndex(b => b <= this.t);
    if (i < 0) { this.ev('noStaff', x); return 'busy'; }
    this.staff[i] = this.t + x.work * 1.3;
    x.state = 'delegated'; x.doneT = this.staff[i];
    this.axes.comm += 6; this.stats.delegated++;
    this.ev('delegated', x);
    this.changed();
    return 'ok';
  }

  complete(x) {
    x.state = 'done'; x.outcome = 'done';
    if (this.active === x) this.active = null;
    const late = this.t > x.deadlineT;
    this.axes.time += late ? 2 : 10 + Math.round(10 * Math.max(0, x.deadlineT - this.t) / x.window);
    this.stats.done++;
    this.ev('done', x);
  }

  miss(x) {
    x.state = 'missed'; x.outcome = 'missed';
    this.axes.time -= (5 - x.p) * 6;
    if (x.p === 1) this.axes.safety -= 10;
    this.stats.expired++;
    this.ev('missed', x);
  }

  total() { return Object.values(this.axes).reduce((s, v) => s + v, 0); }
  liveScore() { return Math.round(1000 * this.total() / this.maxPossible * LEVEL_MULT[this.level]); }

  finish() {
    if (this.finished) return;
    this.stop();
    this.finished = true;
    for (const x of this.tasks) {
      if (x.state === 'pending' || x.state === 'paused' || x.state === 'active' || x.state === 'delegated') {
        if (x.state === 'delegated') { x.outcome = 'delegated'; continue; }
        x.outcome = 'incomplete';
        this.axes.time -= (5 - x.p) * 3;
      } else if (x.state === 'future') x.outcome = 'notArrived';
    }
    this.active = null;
    this.changed();
    this.onEnd(this.result());
  }

  result() {
    const shown = this.tasks.filter(x => x.outcome !== 'notArrived');
    return {
      scenarioId: this.sc.id,
      level: this.level,
      score: this.liveScore(),
      total: this.total(),
      maxPossible: this.maxPossible,
      axes: { ...this.axes },
      axMax: {
        priority: 8 * shown.length,
        time: 20 * shown.length,
        safety: 8 * shown.filter(x => x.def.chk).length,
        resume: 0,
        comm: 6 * Math.min(shown.filter(x => x.def.del).length, 3),
      },
      stats: { ...this.stats },
      duration: Math.round(this.t),
      tasks: shown.map(x => ({ id: x.id, p: x.p, del: !!x.def.del, text: x.def.t, outcome: x.outcome || 'incomplete', arrive: x.arriveT })),
      log: this.log,
    };
  }
}
