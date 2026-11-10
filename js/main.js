// DReAmD メイン：描画・ポストエフェクト・プレイヤー移動・ゾーン遷移
import * as THREE from '../vendor/three.module.min.js';
import { poolZone, mushroomZone, fieldZone, hallwayZone } from './zones.js';
import { bedroomZone, playgroundZone, mallZone } from './zones2.js';

// エリアの並び（最後のモールを抜けるとプールへ戻る）
const ZONES = [poolZone, mushroomZone, fieldZone, hallwayZone, bedroomZone, playgroundZone, mallZone];
import { UI } from './ui.js';
import { DreamAudio } from './audio.js';
import { Controls } from './controls.js';

// ゲーム内に表示するバージョンと更新日時（CHANGELOG.md と合わせる）
export const VERSION = '0.2.0';
export const UPDATED = '2026-11-10 19:20 JST';

const canvas = document.getElementById('c');
document.getElementById('ver').textContent = `DReAmD v${VERSION} · ${UPDATED}`;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  document.getElementById('err').style.display = 'flex';
  document.getElementById('start').classList.add('hidden');
  throw e;
}
renderer.setPixelRatio(1);

const audio = new DreamAudio();
const ui = new UI(audio);
const controls = new Controls(canvas);

if (controls.isTouch) {
  document.getElementById('startSub').textContent = 'tAP tO fALL aSLeEp';
  document.getElementById('help').innerHTML = 'lEFt tHUMb tO wALk · rIGHt tHUMb tO lOoK<br>tURn tHE sOUNd oN. tURN tHE lIGHTs oFF.';
}

// ---- 描画ターゲット（低解像度で描いて引き伸ばす＝夢のようなにじみ） ----
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 900);
camera.rotation.order = 'YXZ';
const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: true });

const postMat = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: rt.texture },
    uTime: { value: 0 },
    uGlitch: { value: 0 },
    uFade: { value: 1 },
    uFadeColor: { value: new THREE.Color('#ffffff') },
    uRes: { value: new THREE.Vector2(1, 1) },
    uWarp: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uGlitch, uFade, uWarp; uniform vec3 uFadeColor; uniform vec2 uRes;
    varying vec2 vUv;
    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      float g = uGlitch;
      // ゆらぎ（夢の水面のような歪み）
      uv.x += sin(uv.y * 11.0 + uTime * 1.1) * (0.0016 + uWarp * 0.01) + sin(uv.y * 37.0 - uTime * 2.3) * 0.0005;
      uv.y += sin(uv.x * 9.0 + uTime * 0.7) * uWarp * 0.008;
      // ブロック状のグリッチ
      float by = floor(uv.y * 28.0);
      float r = rand(vec2(by, floor(uTime * 24.0)));
      if (r < g * 0.45) uv.x += (rand(vec2(by, uTime)) - 0.5) * 0.18 * g;
      vec2 d = uv - 0.5;
      float ca = 0.0012 + g * 0.012 + dot(d, d) * 0.012;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + d * ca * 2.0 + vec2(ca, 0.0)).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - d * ca * 2.0 - vec2(ca, 0.0)).b;
      col = pow(max(col, 0.0), vec3(1.0 / 2.2)); // リニア→sRGB（以降はsRGB空間で色調整）
      // にじむ光
      vec3 bl = texture2D(tDiffuse, uv + vec2(0.006, 0.0)).rgb + texture2D(tDiffuse, uv - vec2(0.006, 0.0)).rgb
              + texture2D(tDiffuse, uv + vec2(0.0, 0.009)).rgb + texture2D(tDiffuse, uv - vec2(0.0, 0.009)).rgb;
      bl = pow(max(bl * 0.25, 0.0), vec3(1.0 / 2.2));
      col += max(bl - 0.7, 0.0) * 0.7;
      // 色調：黒を持ち上げ、少しだけ青緑に
      col = col * vec3(0.96, 1.02, 1.03) * 0.9 + vec3(0.02, 0.03, 0.035);
      // 走査線とノイズ
      col -= sin(vUv.y * uRes.y * 1.4) * 0.012;
      col += (rand(vUv * uRes + fract(uTime * 7.0) * 91.0) - 0.5) * (0.06 + g * 0.25);
      if (rand(vec2(floor(uTime * 30.0), by)) < g * 0.08) col = vec3(rand(vUv + uTime));
      // ビネット
      float v = smoothstep(0.85, 0.25, length(d * vec2(1.0, 1.15)));
      col *= mix(0.45, 1.0, v);
      col = mix(col, uFadeColor, uFade);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
  depthTest: false,
  depthWrite: false,
});
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

function resize() {
  const w = innerWidth, h = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setSize(Math.floor(w * dpr), Math.floor(h * dpr), false);
  // 内部解像度：縦 最大 480px 程度
  const scale = Math.min(1, 480 / h);
  rt.setSize(Math.max(2, Math.floor(w * scale)), Math.max(2, Math.floor(h * scale)));
  camera.aspect = w / h;
  camera.fov = w < h ? 88 : 72;
  camera.updateProjectionMatrix();
  postMat.uniforms.uRes.value.set(w, h);
}
addEventListener('resize', resize);
resize();

// ---- ゲーム状態 ----
const player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0 };
const EYE = 1.6, RADIUS = 0.3;
let zone = null, zoneIndex = 0, zoneTime = 0;
let transition = null; // { t, next, phase }
let glitchSpike = 0;
let bobPhase = 0, stepAcc = 0;
let idleTimer = 25, subTimer = 50;
let started = false, paused = false, hadLock = false;
let time = 0;

const fwd = new THREE.Vector3();
const camDir = new THREE.Vector3();
const tmpV = new THREE.Vector3();

const g = {
  player, camera, ui, audio,
  dreamCount: 0,
  goto(i) {
    if (transition) return;
    transition = { t: 0, next: i, phase: 'out' };
    audio.whoosh();
    glitchSpike = Math.max(glitchSpike, 0.6);
  },
  glitch(a) { glitchSpike = Math.max(glitchSpike, a); },
  forward() { return fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); },
  // 点がカメラの視界中心付近にあるか（thr: 内積のしきい値）
  inView(x, y, z, thr = 0.8) {
    camera.getWorldDirection(camDir);
    tmpV.set(x, y, z).sub(camera.position).normalize();
    return camDir.dot(tmpV) > thr;
  },
};

function disposeGroup(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
        m.dispose();
      });
    }
  });
}

function loadZone(i) {
  if (zone) { scene.remove(zone.group); disposeGroup(zone.group); }
  zoneIndex = i;
  player.pos.set(0, 0, 0);
  zone = ZONES[i](g);
  scene.add(zone.group);
  scene.fog = new THREE.Fog(zone.fog.color, zone.fog.near, zone.fog.far);
  scene.background = new THREE.Color(zone.bg);
  player.pos.set(zone.spawn.x, 0, zone.spawn.z);
  player.vel.set(0, 0, 0);
  player.yaw = zone.spawn.yaw; player.pitch = 0;
  zoneTime = 0;
  audio.setAmbience(zone.ambience);
  if (started) ui.zoneTitle(zone.title);
  idleTimer = 28 + Math.random() * 15;
}

// ---- 衝突判定 ----
function insideRects(x, z, rects) {
  for (const r of rects) if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return true;
  return false;
}
function movePlayer(dx, dz) {
  const w = zone.world;
  const p = player.pos;
  if (insideRects(p.x + dx, p.z, w.rects)) p.x += dx;
  if (insideRects(p.x, p.z + dz, w.rects)) p.z += dz;
  const circles = zone.extraCircles ? w.circles.concat(zone.extraCircles()) : w.circles;
  for (const c of circles) {
    const ox = p.x - c.x, oz = p.z - c.z;
    const d = Math.hypot(ox, oz), min = c.r + RADIUS;
    if (d < min && d > 1e-5) {
      const nx = c.x + (ox / d) * min, nz = c.z + (oz / d) * min;
      if (insideRects(nx, nz, w.rects)) { p.x = nx; p.z = nz; }
    }
  }
}

// ---- 開始・一時停止 ----
const startEl = document.getElementById('start');
const pauseEl = document.getElementById('pause');

function begin() {
  audio.start();
  controls.enabled = true;
  controls.requestLock();
  startEl.classList.add('hidden');
  if (!started) {
    started = true;
    ui.zoneTitle(zone.title);
    // 全画面（スマホ）
    if (controls.isTouch && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }
}
startEl.addEventListener('click', begin);
startEl.addEventListener('touchend', (e) => { e.preventDefault(); begin(); }, { passive: false });
pauseEl.addEventListener('click', () => {
  paused = false; pauseEl.classList.add('hidden');
  controls.enabled = true; controls.requestLock();
  audio.ctx?.resume();
});
controls.onLockChange = (locked) => {
  if (locked) hadLock = true;
  else if (started && hadLock && !paused) {
    paused = true; controls.enabled = false;
    pauseEl.classList.remove('hidden');
  }
};
// 非アクティブ時は音を止める
document.addEventListener('visibilitychange', () => {
  if (!audio.ctx) return;
  if (document.hidden) audio.ctx.suspend(); else if (!paused) audio.ctx.resume();
});

// ---- デバッグ用（?zone=2 で直接開始） ----
const qs = new URLSearchParams(location.search);
const startZone = Math.min(ZONES.length - 1, Math.max(0, parseInt(qs.get('zone') || '0', 10) || 0));
window.__dreamd = { g, player, goto: (i) => loadZone(i), begin, get zone() { return zone; }, get busy() { return !!transition; }, get fade() { return postMat.uniforms.uFade.value; }, get time() { return zoneTime; } };

loadZone(startZone);

// ---- メインループ ----
const clock = new THREE.Clock();
const SUBLIMINAL = ['wAKE', 'nO', 'bEHInD', 'sTAY', 'yOU', 'hERE', 'dROWN'];

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;

  if (!started) {
    // タイトル画面：ゆっくり見回す
    player.yaw = Math.sin(time * 0.1) * 0.5;
    player.pitch = Math.sin(time * 0.13) * 0.06 + 0.05;
  } else if (!paused) {
    controls.update();
    const look = controls.consumeLook();
    player.yaw -= look.x;
    player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - look.y));

    // 移動（夢の中なので遅く、走れない）
    const speed = controls.run ? 3.4 : 2.9;
    const f = g.forward();
    const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
    const tx = (f.x * controls.move.y + rx * controls.move.x) * speed;
    const tz = (f.z * controls.move.y + rz * controls.move.x) * speed;
    const k = 1 - Math.exp(-dt * 6);
    player.vel.x += (tx - player.vel.x) * k;
    player.vel.z += (tz - player.vel.z) * k;
    if (!transition) movePlayer(player.vel.x * dt, player.vel.z * dt);

    // 頭の揺れと足音
    const sp = Math.hypot(player.vel.x, player.vel.z);
    bobPhase += sp * dt * 2.2;
    stepAcc += sp * dt;
    if (stepAcc > 0.85) { stepAcc = 0; audio.step(zone.wet); }

    zoneTime += dt;
    zone.update(dt, zoneTime);

    // ランダムな独り言とサブリミナル
    idleTimer -= dt;
    if (idleTimer <= 0 && !ui.busy && zone.idle?.length) {
      ui.say(zone.idle[Math.floor(Math.random() * zone.idle.length)]);
      idleTimer = 30 + Math.random() * 25;
    }
    subTimer -= dt;
    if (subTimer <= 0) {
      ui.subliminal(SUBLIMINAL[Math.floor(Math.random() * SUBLIMINAL.length)]);
      subTimer = 40 + Math.random() * 60 - g.dreamCount * 8;
      glitchSpike = Math.max(glitchSpike, 0.3);
    }
  }

  // 起動時の白いフェードを晴らす（開始ボタンを早く押しても残らないように）
  if (!transition) postMat.uniforms.uFade.value = Math.max(0, postMat.uniforms.uFade.value - dt * 0.5);

  // 場面転換（白く溶ける）
  if (transition) {
    transition.t += dt;
    if (transition.phase === 'out') {
      postMat.uniforms.uFade.value = Math.min(1, transition.t / 1.3);
      postMat.uniforms.uWarp.value = transition.t;
      if (transition.t >= 1.4) {
        loadZone(transition.next);
        transition.phase = 'in'; transition.t = 0;
      }
    } else {
      postMat.uniforms.uFade.value = Math.max(0, 1 - transition.t / 1.8);
      postMat.uniforms.uWarp.value = Math.max(0, 1 - transition.t);
      if (transition.t >= 1.8) { transition = null; postMat.uniforms.uWarp.value = 0; }
    }
  }

  // カメラ
  const bob = Math.sin(bobPhase * 2) * 0.045;
  const sway = Math.sin(time * 0.5) * 0.008;
  camera.position.set(player.pos.x, EYE + bob, player.pos.z);
  camera.rotation.set(player.pitch + sway, player.yaw, Math.sin(bobPhase) * 0.006 + Math.sin(time * 0.31) * 0.01);

  ui.update(dt);
  audio.update(dt, time);

  glitchSpike = Math.max(0, glitchSpike - dt * 1.4);
  postMat.uniforms.uGlitch.value = 0.02 + g.dreamCount * 0.025 + glitchSpike;
  postMat.uniforms.uTime.value = time;

  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
}
frame();
