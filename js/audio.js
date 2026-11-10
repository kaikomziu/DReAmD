// Web Audio APIだけで鳴らす環境音・効果音（音声ファイル不要）
export class DreamAudio {
  constructor() {
    this.ctx = null;
    this.ambient = {};
    this.musicTimer = 0;
    this.musicOn = false;
    this.melody = [0, 4, 7, 12, 11, 7, 4, 2, 0, -1, 0, 4, 7, 9, 7, 4];
    this.noteIdx = 0;
  }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(ctx.destination);

    // リバーブ（ノイズで作ったインパルス応答）
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.5;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb.buffer = ir;
    this.wet = ctx.createGain(); this.wet.gain.value = 0.55;
    this.reverb.connect(this.wet); this.wet.connect(this.master);

    // ノイズバッファ
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;

    // 低いドローン
    const droneGain = ctx.createGain(); droneGain.gain.value = 0.045;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    [55, 55.45, 82.6].forEach((f) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(lp); o.start();
    });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 120;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    lp.connect(droneGain); droneGain.connect(this.master); droneGain.connect(this.reverb);
    this.droneGain = droneGain;

    // 環境ノイズ（水・風・ハム）用の3系統
    this.ambient.water = this._noiseLayer('bandpass', 500, 0.6);
    this.ambient.wind = this._noiseLayer('lowpass', 380, 0.3);
    this.ambient.tv = this._noiseLayer('highpass', 2500, 0.2);
    const hum = ctx.createOscillator(); hum.frequency.value = 60; hum.type = 'square';
    const humLp = ctx.createBiquadFilter(); humLp.type = 'lowpass'; humLp.frequency.value = 180;
    const humG = ctx.createGain(); humG.gain.value = 0;
    hum.connect(humLp); humLp.connect(humG); humG.connect(this.master); hum.start();
    this.ambient.hum = { gain: humG };
  }

  _noiseLayer(type, freq, q) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.master); g.connect(this.reverb);
    src.start();
    return { gain: g, filter: f };
  }

  // ゾーンごとの環境音量を設定
  setAmbience({ water = 0, wind = 0, tv = 0, hum = 0, music = false, drone = 0.045 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.ambient.water.gain.gain.setTargetAtTime(water, t, 1.2);
    this.ambient.wind.gain.gain.setTargetAtTime(wind, t, 1.2);
    this.ambient.tv.gain.gain.setTargetAtTime(tv, t, 0.5);
    this.ambient.hum.gain.gain.setTargetAtTime(hum, t, 1.0);
    this.droneGain.gain.setTargetAtTime(drone, t, 1.5);
    this.musicOn = music;
  }

  setTv(v) {
    if (!this.ctx) return;
    this.ambient.tv.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.2);
  }

  // 風の揺らぎなど
  update(dt, time) {
    if (!this.ctx) return;
    this.ambient.wind.filter.frequency.value = 300 + Math.sin(time * 0.3) * 150 + Math.sin(time * 1.7) * 40;
    // 遠くで鳴るオルゴール（少しずつ音程が狂う）
    if (this.musicOn) {
      this.musicTimer -= dt;
      if (this.musicTimer <= 0) {
        this.musicTimer = 0.55 + Math.random() * 0.1;
        let n = this.melody[this.noteIdx % this.melody.length];
        if (Math.random() < 0.08) n += Math.random() < 0.5 ? 1 : -1; // ときどき外れた音
        this.noteIdx++;
        const detune = Math.sin(time * 0.2) * 30 - 20;
        this._note(880 * Math.pow(2, n / 12), detune, 0.025);
        if (this.noteIdx % 16 === 0) this.musicTimer += 3;
      }
    }
  }

  _note(freq, detune, vol) {
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq; o.detune.value = detune;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 3.01;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    const g2 = ctx.createGain(); g2.gain.value = 0.2;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp);
    lp.connect(this.reverb);
    const dry = ctx.createGain(); dry.gain.value = 0.15; lp.connect(dry); dry.connect(this.master);
    o.start(t); o2.start(t); o.stop(t + 1.7); o2.stop(t + 1.7);
  }

  // 足音（wet=trueで水音）
  step(wet) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = wet ? 900 + Math.random() * 500 : 180 + Math.random() * 80;
    f.Q.value = wet ? 1.5 : 2;
    const g = ctx.createGain();
    const dur = wet ? 0.28 : 0.09;
    g.gain.setValueAtTime(wet ? 0.18 : 0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master); g.connect(this.reverb);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  blip() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.value = 520 + Math.random() * 30;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.012, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(this.master); g.connect(this.reverb);
    o.start(t); o.stop(t + 0.06);
  }

  // 不穏な一撃（イベント時）
  sting(strength = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12 * strength, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.0);
    g.connect(this.master); g.connect(this.reverb);
    [41, 43.6, 61.7, 466, 494].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i < 3 ? 'sawtooth' : 'sine';
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.94, t + 3);
      const og = ctx.createGain(); og.gain.value = i < 3 ? 0.6 : 0.15;
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + 3.1);
    });
  }

  // 場面転換の吸い込み音
  whoosh() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(200, t);
    f.frequency.exponentialRampToValueAtTime(3000, t + 1.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 1.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    src.connect(f); f.connect(g); g.connect(this.master); g.connect(this.reverb);
    src.start(t); src.stop(t + 1.9);
  }
}
