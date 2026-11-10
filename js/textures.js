// キャンバスで手続き的にテクスチャを生成するモジュール
// 外部画像を使わず、すべてコードで描くことで「どこかで見た気がする」質感を作る
import * as THREE from '../vendor/three.module.min.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTex(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  return t;
}

// 小さな乱数（ノイズ用）
function jitter(ctx, w, h, amount, count) {
  for (let i = 0; i < count; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * amount})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

// プールのタイル
export function tileTexture(base = '#e9e4d2', grout = '#b9b49f', n = 8, rx = 1, ry = 1) {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = grout; ctx.fillRect(0, 0, S, S);
  const step = S / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const shade = (Math.random() - 0.5) * 10;
      ctx.fillStyle = base;
      ctx.globalAlpha = 1;
      ctx.fillRect(x * step + 1.5, y * step + 1.5, step - 3, step - 3);
      ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade / 40})` : `rgba(0,0,0,${-shade / 40})`;
      ctx.fillRect(x * step + 1.5, y * step + 1.5, step - 3, step - 3);
    }
  }
  jitter(ctx, S, S, 0.08, 600);
  return toTex(c, rx, ry);
}

// 水面のゆらぎ（アルファ＆カラー）
export function waterTexture() {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#7fd3c4'; ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    const x = Math.random() * S, y = Math.random() * S, r = 10 + Math.random() * 40;
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const rr = r + Math.sin(a * 3 + i) * 6;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.6;
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  return toTex(c, 8, 8);
}

// 赤いキノコの傘（白い斑点）
export function mushroomCapTexture() {
  const W = 512, H = 256;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#e2545a'); g.addColorStop(1, '#b3283a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * W, y = Math.random() * H * 0.85;
    const r = 8 + Math.random() * 18;
    ctx.fillStyle = '#e8f3f0';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    // 継ぎ目対策
    if (x < 30) { ctx.beginPath(); ctx.ellipse(x + W, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  jitter(ctx, W, H, 0.1, 800);
  return toTex(c);
}

// 縞模様の草原
export function grassTexture() {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#5f9a3e'; ctx.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += 32) {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, 'rgba(30,70,20,0.55)');
    g.addColorStop(0.35, 'rgba(30,70,20,0.05)');
    g.addColorStop(1, 'rgba(140,200,90,0.15)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, 32, S);
  }
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '20,60,10' : '170,220,120'},${Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1, 3 + Math.random() * 4);
  }
  return toTex(c);
}

// 壁紙（よく見ると小さな目の模様）
export function wallpaperTexture(base = '#e8c9cf', motif = 'rgba(120,70,90,0.35)') {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let x = 0; x < S; x += 32) ctx.fillRect(x, 0, 6, S);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const cx = x * 64 + (y % 2 ? 32 : 0) + 16, cy = y * 64 + 32;
      ctx.strokeStyle = motif; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy); ctx.quadraticCurveTo(cx, cy - 6, cx + 8, cy);
      ctx.quadraticCurveTo(cx, cy + 6, cx - 8, cy); ctx.stroke();
      ctx.fillStyle = motif;
      ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  jitter(ctx, S, S, 0.06, 500);
  return toTex(c);
}

export function carpetTexture() {
  const S = 128;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#5b7d78'; ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(230,200,150,0.25)'; ctx.lineWidth = 3;
  for (let i = -S; i < S * 2; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + S, 0); ctx.lineTo(i, S); ctx.stroke();
  }
  jitter(ctx, S, S, 0.15, 1500);
  return toTex(c);
}

// 顔のない肖像画
export function portraitTexture(hue = 200) {
  const W = 128, H = 160;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#6b5236'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `hsl(${hue},30%,70%)`; ctx.fillRect(10, 10, W - 20, H - 20);
  ctx.fillStyle = `hsl(${hue},20%,35%)`;
  ctx.beginPath(); ctx.ellipse(W / 2, H - 10, 40, 45, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#e9d4c0';
  ctx.beginPath(); ctx.ellipse(W / 2, 62, 22, 28, 0, 0, Math.PI * 2); ctx.fill();
  // 顔の位置だけ少し暗い（目があった場所）
  ctx.fillStyle = 'rgba(80,50,40,0.18)';
  ctx.fillRect(W / 2 - 14, 55, 28, 5);
  return toTex(c);
}

// 顔のある太陽
export function sunFaceTexture() {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,252,225,1)');
  g.addColorStop(0.45, 'rgba(255,245,200,1)');
  g.addColorStop(0.5, 'rgba(255,240,190,0.55)');
  g.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(40,30,20,0.85)';
  ctx.beginPath(); ctx.arc(S / 2 - 22, S / 2 - 8, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(S / 2 + 22, S / 2 - 8, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,20,0.7)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(S / 2, S / 2 + 6, 26, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 夜空のビル（窓明かり）
export function buildingTexture() {
  const W = 256, H = 256;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#3a1b24'; ctx.fillRect(0, 0, W, H);
  for (let y = 12; y < H; y += 26) {
    for (let x = 10; x < W; x += 22) {
      const on = Math.random() < 0.18;
      ctx.fillStyle = on ? 'rgba(255,215,160,0.9)' : 'rgba(10,5,10,0.6)';
      ctx.fillRect(x, y, 12, 14);
    }
  }
  return toTex(c);
}

// 砂嵐テレビ（毎フレーム更新するのでCanvasごと返す）
export function makeStatic(w = 80, h = 60) {
  const [c, ctx] = canvas(w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  const img = ctx.createImageData(w, h);
  let text = '';
  return {
    tex,
    setText(t) { text = t; },
    update(time) {
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 200 + 30;
        d[i] = v * 0.9; d[i + 1] = v; d[i + 2] = v * 1.05; d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if (text && Math.sin(time * 3) > -0.3) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, h / 2 - 9, w, 18);
        ctx.fillStyle = '#e8fff4';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, w / 2 + (Math.random() - 0.5) * 2, h / 2 + 4);
      }
      tex.needsUpdate = true;
    },
  };
}

// 空のグラデーション用の簡易シェーダーマテリアル
export function skyMaterial(top, bottom, exponent = 1.0) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(top) },
      bottom: { value: new THREE.Color(bottom) },
      expo: { value: exponent },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform float expo; varying vec3 vP;
      void main(){ float h = clamp(vP.y,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, expo)), 1.0);
      #include <colorspace_fragment>
      }`,
  });
}
