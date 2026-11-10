// 入力：PCはWASD＋マウス（ポインタロック）、スマホは左親指スティック＋右側ドラッグで視点
export class Controls {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.move = { x: 0, y: 0 };   // x:右, y:前
    this.lookDelta = { x: 0, y: 0 };
    this.run = false;
    this.enabled = false;
    this.locked = false;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.look = { id: null, lx: 0, ly: 0 };
    this.mouseDrag = null;

    this.stickBase = document.getElementById('stickBase');
    this.stickKnob = document.getElementById('stickKnob');

    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.onLockChange?.(this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.locked) {
        this.lookDelta.x += e.movementX * 0.0022;
        this.lookDelta.y += e.movementY * 0.0022;
      }
    });

    // タッチ・ペン・ポインタロック非対応マウス
    canvas.addEventListener('pointerdown', (e) => this._down(e));
    addEventListener('pointermove', (e) => this._moveP(e));
    addEventListener('pointerup', (e) => this._up(e));
    addEventListener('pointercancel', (e) => this._up(e));
  }

  requestLock() {
    if (this.isTouch) return;
    try {
      const p = this.canvas.requestPointerLock?.();
      if (p && p.catch) p.catch(() => {});
    } catch (_) { /* 非対応 */ }
  }

  _down(e) {
    if (!this.enabled) return;
    if (e.pointerType === 'mouse') {
      if (!this.locked) this.mouseDrag = { x: e.clientX, y: e.clientY };
      return;
    }
    e.preventDefault();
    const leftSide = e.clientX < innerWidth * 0.45;
    if (leftSide && this.stick.id === null) {
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      this.stickBase.style.display = 'block';
      this.stickBase.style.left = e.clientX + 'px';
      this.stickBase.style.top = e.clientY + 'px';
      this.stickKnob.style.transform = 'translate(-50%,-50%)';
    } else if (this.look.id === null) {
      this.look = { id: e.pointerId, lx: e.clientX, ly: e.clientY };
    }
  }

  _moveP(e) {
    if (!this.enabled) return;
    if (e.pointerType === 'mouse') {
      if (this.mouseDrag && !this.locked) {
        this.lookDelta.x += (e.clientX - this.mouseDrag.x) * 0.004;
        this.lookDelta.y += (e.clientY - this.mouseDrag.y) * 0.004;
        this.mouseDrag = { x: e.clientX, y: e.clientY };
      }
      return;
    }
    if (e.pointerId === this.stick.id) {
      const R = 55;
      let dx = e.clientX - this.stick.ox, dy = e.clientY - this.stick.oy;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx *= R / len; dy *= R / len; }
      this.stick.x = dx / R; this.stick.y = dy / R;
      this.stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    } else if (e.pointerId === this.look.id) {
      this.lookDelta.x += (e.clientX - this.look.lx) * 0.0055;
      this.lookDelta.y += (e.clientY - this.look.ly) * 0.0055;
      this.look.lx = e.clientX; this.look.ly = e.clientY;
    }
  }

  _up(e) {
    if (e.pointerType === 'mouse') { this.mouseDrag = null; return; }
    if (e.pointerId === this.stick.id) {
      this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
      this.stickBase.style.display = 'none';
    } else if (e.pointerId === this.look.id) {
      this.look = { id: null, lx: 0, ly: 0 };
    }
  }

  update() {
    const k = this.keys;
    let x = 0, y = 0;
    if (k.KeyW || k.ArrowUp) y += 1;
    if (k.KeyS || k.ArrowDown) y -= 1;
    if (k.KeyD || k.ArrowRight) x += 1;
    if (k.KeyA || k.ArrowLeft) x -= 1;
    if (this.stick.id !== null) {
      x += this.stick.x;
      y += -this.stick.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.move.x = this.enabled ? x : 0;
    this.move.y = this.enabled ? y : 0;
    this.run = !!(k.ShiftLeft || k.ShiftRight);
  }

  consumeLook() {
    const d = { x: this.lookDelta.x, y: this.lookDelta.y };
    this.lookDelta.x = 0; this.lookDelta.y = 0;
    return d;
  }
}
