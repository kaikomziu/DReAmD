// 画面上のテキスト表示（タイプライター・崩れた大文字小文字・サブリミナル）

// 「DReAmD」のように大文字小文字をおかしくする
export function dreamCase(s) {
  return s.split(' ').map((w) => {
    let out = '';
    for (let i = 0; i < w.length; i++) {
      const ch = w[i];
      if (i === 0) out += Math.random() < 0.8 ? ch.toLowerCase() : ch.toUpperCase();
      else out += Math.random() < 0.5 ? ch.toUpperCase() : ch.toLowerCase();
    }
    return out;
  }).join(' ');
}

const GLITCH_CHARS = '▓▒░█■#%&@?_';

export class UI {
  constructor(audio) {
    this.audio = audio;
    this.msgEl = document.getElementById('msg');
    this.titleEl = document.getElementById('zoneTitle');
    this.flashEl = document.getElementById('flash');
    this.queue = [];
    this.current = null;
    this.zoneTitleTimer = 0;
  }

  // メッセージを表示（rawならdreamCaseを掛けない）
  say(text, { raw = false, hold = 4.2, priority = false } = {}) {
    const t = raw ? text : dreamCase(text);
    const item = { text: t, hold };
    if (priority) {
      this.queue = [item];
      this.current = null;
    } else if (this.queue.length < 3) {
      this.queue.push(item);
    }
  }

  get busy() { return !!this.current || this.queue.length > 0; }

  zoneTitle(text) {
    this.titleEl.textContent = dreamCase(text);
    this.titleEl.classList.remove('show');
    void this.titleEl.offsetWidth;
    this.titleEl.classList.add('show');
  }

  // 一瞬だけ大きな文字を出す
  subliminal(word) {
    this.flashEl.textContent = word;
    this.flashEl.style.opacity = '1';
    this.flashEl.style.transform = `translate(-50%,-50%) scale(${1 + Math.random() * 0.4}) rotate(${(Math.random() - 0.5) * 8}deg)`;
    setTimeout(() => { this.flashEl.style.opacity = '0'; }, 70 + Math.random() * 60);
  }

  update(dt) {
    if (!this.current && this.queue.length) {
      this.current = { ...this.queue.shift(), shown: 0, t: 0, done: false, fade: 0 };
      this.msgEl.style.opacity = '1';
    }
    const c = this.current;
    if (!c) return;
    c.t += dt;
    if (!c.done) {
      const target = Math.floor(c.t / 0.045);
      if (target > c.shown) {
        c.shown = Math.min(target, c.text.length);
        if (c.shown % 2 === 0) this.audio?.blip();
      }
      let s = c.text.slice(0, c.shown);
      // ときどき末尾が化ける
      if (c.shown < c.text.length && Math.random() < 0.3) {
        s += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      this.msgEl.textContent = s;
      if (c.shown >= c.text.length) { c.done = true; c.t = 0; }
    } else {
      // 表示中、ごくまれに一文字だけ別の文字に変わる
      if (Math.random() < 0.02) {
        const i = Math.floor(Math.random() * c.text.length);
        const s = c.text.slice(0, i) + GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] + c.text.slice(i + 1);
        this.msgEl.textContent = s;
      } else {
        this.msgEl.textContent = c.text;
      }
      if (c.t > c.hold) {
        this.msgEl.style.opacity = '0';
        if (c.t > c.hold + 0.9) this.current = null;
      }
    }
  }

  clear() {
    this.queue = [];
    this.current = null;
    this.msgEl.style.opacity = '0';
  }
}
