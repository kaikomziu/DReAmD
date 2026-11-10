// 夢のエリア（ゾーン）定義
// 各ゾーンは { title, group, spawn, world, fog, bg, ambience, wet, update, idle } を返す
import * as THREE from '../vendor/three.module.min.js';
import {
  tileTexture, waterTexture, mushroomCapTexture, grassTexture, wallpaperTexture,
  carpetTexture, portraitTexture, sunFaceTexture, buildingTexture, makeStatic, skyMaterial,
} from './textures.js';

const lambert = (color, map = null, extra = {}) => new THREE.MeshLambertMaterial({ color, map, ...extra });
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

function plane(w, h, mat) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); }
function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }

// 細長すぎる「誰か」
function makeFigure() {
  const g = new THREE.Group();
  const m = basic('#050608');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.26, 2.7, 10), m);
  body.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), m);
  head.position.y = 2.95; head.scale.y = 1.25;
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.0, 6), m);
  armL.position.set(-0.22, 1.6, 0); armL.rotation.z = 0.06;
  const armR = armL.clone(); armR.position.x = 0.22; armR.rotation.z = -0.06;
  g.add(body, head, armL, armR);
  return g;
}

// 見られる・近づかれると消える存在
class Watcher {
  constructor(parent, { vanishDist = 9, lookTime = 2.5 } = {}) {
    this.obj = makeFigure();
    this.obj.visible = false;
    parent.add(this.obj);
    this.vanishDist = vanishDist;
    this.lookTime = lookTime;
    this.seen = 0;
    this.everSeen = false;
  }
  place(x, z, y = 0) {
    this.obj.position.set(x, y, z);
    this.obj.visible = true;
    this.seen = 0;
  }
  update(dt, g) {
    if (!this.obj.visible) return;
    const p = g.player.pos, o = this.obj.position;
    this.obj.rotation.y = Math.atan2(p.x - o.x, p.z - o.z);
    const d = Math.hypot(p.x - o.x, p.z - o.z);
    if (g.inView(o.x, 1.6, o.z, 0.85)) { this.seen += dt; this.everSeen = true; }
    if (d < this.vanishDist || this.seen > this.lookTime) {
      this.obj.visible = false;
      g.glitch(0.9);
      g.audio.sting(0.7);
      if (Math.random() < 0.5) g.ui.subliminal(['nO', 'sTAY', 'bEHInD', 'yOU'][Math.floor(Math.random() * 4)]);
    }
  }
}

// 一度だけ発火するトリガー
function once() {
  const fired = new Set();
  return (key) => { if (fired.has(key)) return false; fired.add(key); return true; };
}

/* =====================================================================
   0: 深いプール
   ===================================================================== */
export function poolZone(g) {
  const group = new THREE.Group();
  const W = 18, L = 74, H = 6.5;
  const z0 = 2, z1 = z0 - L;
  const dark = g.dreamCount > 0;

  const floorTex = tileTexture('#d9e6dc', '#9fb2a8', 8, W / 4, L / 4);
  const wallTex = tileTexture('#ece6d3', '#c2bba5', 8, L / 4, H / 4);
  const wallTexS = tileTexture('#ece6d3', '#c2bba5', 8, W / 4, H / 4);
  const ceilTex = tileTexture('#efeadb', '#d3cdb9', 4, W / 4, L / 4);

  const floor = plane(W, L, lambert('#ffffff', floorTex));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, z0 - L / 2);
  const ceil = plane(W, L, lambert('#ffffff', ceilTex));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, z0 - L / 2);
  const wl = plane(L, H, lambert('#ffffff', wallTex));
  wl.rotation.y = Math.PI / 2; wl.position.set(-W / 2, H / 2, z0 - L / 2);
  const wr = wl.clone(); wr.rotation.y = -Math.PI / 2; wr.position.x = W / 2;
  const wb = plane(W, H, lambert('#ffffff', wallTexS)); wb.position.set(0, H / 2, z1);
  const wf = wb.clone(); wf.rotation.y = Math.PI; wf.position.z = z0;
  group.add(floor, ceil, wl, wr, wb, wf);

  // 壁際の段差（プールサイド）
  const ledgeMat = lambert('#ffffff', tileTexture('#e3ddca', '#bdb6a0', 4, L / 2, 1));
  const ledgeL = box(1.4, 0.7, L, ledgeMat); ledgeL.position.set(-W / 2 + 0.7, 0.35, z0 - L / 2);
  const ledgeR = ledgeL.clone(); ledgeR.position.x = W / 2 - 0.7;
  group.add(ledgeL, ledgeR);

  // 水面
  const wTex = waterTexture();
  wTex.repeat.set(W / 3, L / 3);
  const water = plane(W - 2.8, L, new THREE.MeshPhongMaterial({
    color: dark ? '#4f9d93' : '#79cdbd', map: wTex, transparent: true, opacity: 0.62,
    shininess: 90, specular: '#ffffff', depthWrite: false,
  }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.32, z0 - L / 2);
  group.add(water);

  // 天井の照明パネル
  const panelMat = basic('#fffbe8');
  for (let z = z0 - 6; z > z1 + 3; z -= 8) {
    for (const x of [-3.5, 3.5]) {
      const p = box(2.2, 0.05, 0.9, panelMat); p.position.set(x, H - 0.03, z); group.add(p);
    }
  }
  const lights = [];
  [-10, -36, -62].forEach((z) => {
    const l = new THREE.PointLight('#fff4dc', dark ? 18 : 30, 45, 1.3);
    l.position.set(0, H - 0.8, z); group.add(l); lights.push(l);
  });
  group.add(new THREE.HemisphereLight('#fff8e8', '#5fa59a', dark ? 0.9 : 1.4));
  group.add(new THREE.AmbientLight('#ffffff', 0.25));

  // 螺旋階段（天井の穴へ続く）
  const sx = -3.5, sz = -24;
  const stoneMat = lambert('#ece6d6');
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, H, 24), stoneMat);
  col.position.set(sx, H / 2, sz); group.add(col);
  for (let i = 0; i < 26; i++) {
    const a = i * 0.48;
    const step = box(1.9, 0.16, 0.75, stoneMat);
    step.position.set(sx + Math.cos(a) * 1.55, 0.25 + i * 0.235, sz + Math.sin(a) * 1.55);
    step.rotation.y = -a;
    group.add(step);
  }
  const hole = new THREE.Mesh(new THREE.CircleGeometry(2.7, 32), basic('#0b0d0d'));
  hole.rotation.x = Math.PI / 2; hole.position.set(sx, H - 0.01, sz); group.add(hole);

  // 柱
  const pillarMat = lambert('#ffffff', tileTexture('#e6e0cc', '#bdb6a0', 4, 1, 3));
  const circles = [{ x: sx, z: sz, r: 2.6 }];
  for (const z of [-12, -36, -48, -60]) {
    for (const x of [-5.6, 5.6]) {
      const p = box(1, H, 1, pillarMat); p.position.set(x, H / 2, z); group.add(p);
      circles.push({ x, z, r: 0.8 });
    }
  }

  // 監視員の椅子（誰もいない）
  const chair = new THREE.Group();
  const cm = lambert('#f4f1ea');
  for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) {
    const leg = box(0.08, 2.4, 0.08, cm); leg.position.set(x, 1.2, z); chair.add(leg);
  }
  const seat = box(1, 0.1, 1, cm); seat.position.y = 2.4; chair.add(seat);
  const back = box(1, 0.9, 0.08, cm); back.position.set(0, 2.9, 0.48); chair.add(back);
  chair.position.set(4.6, 0, -44); chair.rotation.y = 0.4;
  group.add(chair);
  circles.push({ x: 4.6, z: -44, r: 0.9 });

  // 奥の暗いトンネル
  const tunnelC = document.createElement('canvas'); tunnelC.width = tunnelC.height = 128;
  const tc = tunnelC.getContext('2d');
  const rg = tc.createRadialGradient(64, 64, 4, 64, 64, 64);
  rg.addColorStop(0, '#000000'); rg.addColorStop(0.6, '#050807'); rg.addColorStop(0.92, '#2b3c38'); rg.addColorStop(1, '#5e746c');
  tc.fillStyle = rg; tc.fillRect(0, 0, 128, 128);
  const tTex = new THREE.CanvasTexture(tunnelC); tTex.colorSpace = THREE.SRGBColorSpace;
  const tunnel = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), basic('#ffffff', { map: tTex }));
  tunnel.position.set(0, 1.9, z1 + 0.02); group.add(tunnel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.18, 10, 40), lambert('#e9e3d0'));
  rim.position.copy(tunnel.position); group.add(rim);

  const watcher = new Watcher(group, { vanishDist: 12, lookTime: 3 });
  if (dark) watcher.place(4, -64, 0.1);

  const trig = once();
  let flicker = 0;

  return {
    title: 'the deep end',
    group,
    spawn: { x: 0, z: -1, yaw: 0 },
    world: { rects: [{ minX: -W / 2 + 1.7, maxX: W / 2 - 1.7, minZ: z1 + 0.6, maxZ: z0 - 0.6 }], circles, boxes: [] },
    fog: { color: dark ? '#9fb4ab' : '#d8e3d9', near: 6, far: 70 },
    bg: '#d8e3d9',
    ambience: { water: 0.06, music: true, drone: dark ? 0.06 : 0.035 },
    wet: true,
    idle: [
      'the water is warm because someone is still in it',
      'who turned the pool on',
      'keep your head above the ____',
      'you have been here. you have not been here.',
      'the tiles are counting your steps. 412. 413. 41',
    ],
    update(dt, t) {
      const pz = g.player.pos.z;
      wTex.offset.x = t * 0.01; wTex.offset.y = Math.sin(t * 0.2) * 0.05;
      const breath = 1 + Math.sin(t * 0.9) * 0.04;
      tunnel.scale.set(breath, breath, 1);
      if (t > 2.5 && trig('a')) g.ui.say(dark ? 'you came back. you always come ____' : 'you have been here before. you have not been here before.');
      if (pz < -18 && trig('b')) g.ui.say("don't look at the stairs. they go up to ____");
      if (pz < -40 && trig('c')) { flicker = 2.2; g.audio.sting(0.5); g.ui.say('lifeguard on duty: no lifeguard on duty: no life'); }
      if (pz < -58 && trig('d')) g.ui.say('the tunnel is breathing. in. out. in.');
      if (flicker > 0) {
        flicker -= dt;
        lights.forEach((l) => { l.visible = flicker <= 0 || Math.random() > 0.5; });
        panelMat.color.set(flicker > 0 && Math.random() < 0.4 ? '#333' : '#fffbe8');
      }
      watcher.update(dt, g);
      // トンネルへ
      if (pz < z1 + 2.2 && Math.abs(g.player.pos.x) < 2.6) g.goto(1);
    },
  };
}

/* =====================================================================
   1: キノコの庭のプール（夜）
   ===================================================================== */
export function mushroomZone(g) {
  const group = new THREE.Group();
  const curveX = (z) => Math.sin(z * 0.075) * 7 + Math.sin(z * 0.023) * 3;
  const zEnd = -90;

  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), skyMaterial('#07141c', '#1f5157', 0.7));
  group.add(sky);

  const ground = plane(70, 110, lambert('#ffffff', tileTexture('#a6dccb', '#6aa392', 8, 35, 55)));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -45);
  group.add(ground);

  // 曲がりくねった水路（リボン状のジオメトリ）
  const wTex = waterTexture(); wTex.repeat.set(2, 30);
  const pts = [];
  for (let z = 6; z >= zEnd - 6; z -= 1.5) pts.push(z);
  const pos = [], uv = [], idx = [];
  pts.forEach((z, i) => {
    const x = curveX(z);
    pos.push(x - 2.6, 0.04, z, x + 2.6, 0.04, z);
    uv.push(0, i / pts.length, 1, i / pts.length);
    if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  rg.setIndex(idx); rg.computeVertexNormals();
  const water = new THREE.Mesh(rg, new THREE.MeshPhongMaterial({
    color: '#4fb7b0', map: wTex, transparent: true, opacity: 0.8, shininess: 100, specular: '#bfffff', side: THREE.DoubleSide,
  }));
  group.add(water);
  // 縁石
  const edgeMat = lambert('#d7efe6');
  pts.forEach((z, i) => {
    if (i % 2) return;
    for (const s of [-1, 1]) {
      const e = box(0.35, 0.18, 1.6, edgeMat);
      e.position.set(curveX(z) + s * 2.75, 0.09, z);
      e.rotation.y = Math.atan(0.075 * 7 * Math.cos(z * 0.075));
      group.add(e);
    }
  });

  // 浮き輪
  const ringMat = lambert('#e48ad6');
  const rings = [];
  for (let i = 0; i < 9; i++) {
    const z = -8 - i * 9 - Math.random() * 3;
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.3, 12, 28), ringMat);
    r.position.set(curveX(z) + (Math.random() - 0.5) * 2, 0.2, z);
    r.rotation.x = -Math.PI / 2;
    r.userData.phase = Math.random() * 6;
    group.add(r); rings.push(r);
  }

  // 巨大キノコ
  const capTex = mushroomCapTexture();
  const stemMat = lambert('#dcefe9');
  const capMat = lambert('#ffffff', capTex);
  const underMat = lambert('#b7a99b', null, { side: THREE.DoubleSide });
  const circles = [];
  const caps = [];
  let placed = 0, tries = 0;
  while (placed < 17 && tries < 400) {
    tries++;
    const z = -6 - Math.random() * 84;
    const x = (Math.random() - 0.5) * 50;
    if (Math.abs(x - curveX(z)) < 5) continue;
    if (circles.some((c) => Math.hypot(c.x - x, c.z - z) < 7)) continue;
    const h = 5 + Math.random() * 7, R = 2.5 + Math.random() * 2.5, r = 0.35 + R * 0.12;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 1.2, h, 16), stemMat);
    stem.position.set(x, h / 2, z);
    const capG = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    cap.scale.y = 0.62;
    const under = new THREE.Mesh(new THREE.CircleGeometry(R, 32), underMat);
    under.rotation.x = Math.PI / 2;
    capG.add(cap, under);
    capG.position.set(x, h, z);
    capG.rotation.z = (Math.random() - 0.5) * 0.2;
    group.add(stem, capG);
    caps.push(capG);
    circles.push({ x, z, r: r * 1.2 + 0.3 });
    placed++;
  }

  // 生け垣（トゲトゲ）
  const hedgeMat = lambert('#1d3a2c', null, { flatShading: true });
  for (let z = 4; z > zEnd - 8; z -= 4.5) {
    for (const x of [-30, 30]) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), hedgeMat);
      b.position.set(x + (Math.random() - 0.5) * 2, 1.2, z);
      b.scale.set(1, 0.8 + Math.random() * 0.5, 1);
      group.add(b);
    }
  }
  // 遠くのビル
  const bTex = buildingTexture();
  for (let i = 0; i < 6; i++) {
    const bw = 10 + Math.random() * 8, bh = 14 + Math.random() * 18;
    const t = bTex.clone(); t.repeat.set(bw / 10, bh / 10); t.needsUpdate = true;
    const b = box(bw, bh, 8, basic('#ffffff', { map: t }));
    b.position.set(-35 + i * 14, bh / 2, zEnd - 18 - Math.random() * 6);
    group.add(b);
  }

  // 街灯
  const lights = [];
  [-20, -50, -78].forEach((z, i) => {
    const x = curveX(z) + (i % 2 ? 4 : -4);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4, 8), lambert('#2b3b3e'));
    pole.position.set(x, 2, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), basic('#d9fff4'));
    bulb.position.set(x, 4.1, z);
    const l = new THREE.PointLight('#a8ffe8', 14, 26, 1.4);
    l.position.set(x, 3.8, z);
    group.add(pole, bulb, l); lights.push(l);
    circles.push({ x, z, r: 0.4 });
  });
  group.add(new THREE.HemisphereLight('#5aa0a0', '#1c2a26', 1.1));
  group.add(new THREE.AmbientLight('#7fb0b0', 0.25));

  // 出口：直立した巨大な浮き輪
  const px = curveX(zEnd + 2), pz = zEnd + 2;
  const portal = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.6, 16, 40), basic('#ff9ee9'));
  portal.position.set(px, 2.7, pz);
  const glowMat = basic('#ffe6fb', { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.CircleGeometry(2.0, 32), glowMat);
  glow.position.copy(portal.position);
  group.add(portal, glow);
  const pl = new THREE.PointLight('#ff9ee9', 20, 20, 1.3); pl.position.set(px, 2.5, pz + 1.5); group.add(pl);

  const watcher = new Watcher(group, { vanishDist: 10, lookTime: 2 });
  const trig = once();
  let ringsWatch = false;
  const tmp = new THREE.Vector3();

  return {
    title: 'garden of soft things',
    group,
    spawn: { x: curveX(2), z: 2, yaw: 0 },
    world: { rects: [{ minX: -27, maxX: 27, minZ: zEnd - 1, maxZ: 5 }], circles, boxes: [] },
    fog: { color: '#163a40', near: 6, far: 72 },
    bg: '#163a40',
    ambience: { water: 0.03, wind: 0.02, music: true, drone: 0.05 },
    wet: false,
    idle: [
      'someone left the night on',
      'do not pick them. they remember hands.',
      'what is under the caps is not shadow',
      'you are getting smaller. that is normal. that is nor',
    ],
    update(dt, t) {
      const p = g.player.pos;
      wTex.offset.y = -t * 0.02;
      glowMat.opacity = 0.35 + Math.sin(t * 2) * 0.15;
      // 浮き輪：ぷかぷか → ある地点から全員こちらを向く
      rings.forEach((r) => {
        if (!ringsWatch) {
          r.position.y = 0.2 + Math.sin(t * 1.2 + r.userData.phase) * 0.05;
          r.rotation.z += dt * 0.1;
        } else {
          r.position.y += (1.3 - r.position.y) * dt * 0.8;
          tmp.set(p.x, 1.6, p.z);
          const q0 = r.quaternion.clone();
          r.lookAt(tmp);
          const q1 = r.quaternion.clone();
          r.quaternion.copy(q0).slerp(q1, Math.min(1, dt * 1.5));
        }
      });
      // キノコの傘がゆっくりプレイヤーの方へ傾く
      caps.forEach((c) => {
        const dx = p.x - c.position.x, dz = p.z - c.position.z;
        const d = Math.hypot(dx, dz) || 1;
        const k = Math.min(0.28, 6 / d);
        c.rotation.x += ((dz / d) * k - c.rotation.x) * dt * 0.4;
        c.rotation.z += ((-dx / d) * k - c.rotation.z) * dt * 0.4;
      });
      if (t > 2 && trig('a')) g.ui.say("they grew while you slept. they grow while you ____");
      if (p.z < -25 && trig('b')) g.ui.say("the rings are for those who can't swim. can you?");
      if (p.z < -45 && trig('c')) {
        ringsWatch = true; g.audio.sting(0.8); g.glitch(0.5);
        g.ui.say('do not look at them looking at you', { priority: true });
      }
      if (p.z < -55 && trig('w')) watcher.place(curveX(-75) + 6, -75);
      if (p.z < -80 && trig('d')) g.ui.say('go through. it is softer on the other ____');
      watcher.update(dt, g);
      if (Math.hypot(p.x - px, p.z - pz) < 2.3) g.goto(2);
    },
  };
}

/* =====================================================================
   2: どこまでも続く草原と、近づけない家
   ===================================================================== */
export function fieldZone(g) {
  const group = new THREE.Group();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), skyMaterial('#3566c8', '#c3d6e4', 0.55));
  group.add(sky);

  const gTex = grassTexture(); gTex.repeat.set(80, 80);
  const ground = plane(800, 800, lambert('#ffffff', gTex));
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  group.add(new THREE.HemisphereLight('#ffffff', '#4f7a33', 1.7));
  const sunL = new THREE.DirectionalLight('#fff6e0', 1.4); sunL.position.set(-40, 60, -80); group.add(sunL);

  // 顔のある太陽
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunFaceTexture(), fog: false, depthWrite: false, transparent: true }));
  sun.scale.set(60, 60, 1);
  group.add(sun);

  // 家
  const house = new THREE.Group();
  const body = box(4, 2.6, 3.5, lambert('#f3f0e8')); body.position.y = 1.3;
  const shape = new THREE.Shape();
  shape.moveTo(-2.4, 0); shape.lineTo(2.4, 0); shape.lineTo(0, 1.7); shape.lineTo(-2.4, 0);
  const roofG = new THREE.ExtrudeGeometry(shape, { depth: 4.0, bevelEnabled: false });
  roofG.translate(0, 0, -2.0);
  const roof = new THREE.Mesh(roofG, lambert('#c62f2d'));
  roof.position.y = 2.6;
  roof.rotation.y = Math.PI / 2;
  const door = plane(0.9, 1.8, lambert('#5a3b2a')); door.position.set(0, 0.9, 1.76);
  const winMat = lambert('#2c3d5a');
  const w1 = plane(0.7, 0.6, winMat); w1.position.set(-1.3, 1.6, 1.76);
  const w2 = w1.clone(); w2.position.x = 1.3;
  house.add(body, roof, door, w1, w2);
  group.add(house);

  // 電柱（プレイヤーに合わせて繰り返す）
  const poleMat = lambert('#5a4a3c');
  const poles = [];
  for (let i = 0; i < 22; i++) {
    const pg = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 7, 8), poleMat); p.position.y = 3.5;
    const bar = box(1.6, 0.1, 0.1, poleMat); bar.position.y = 6.6;
    pg.add(p, bar);
    group.add(pg); poles.push(pg);
  }
  const wire = box(0.03, 0.03, 420, basic('#2a2a2a'));
  const wire2 = wire.clone();
  group.add(wire, wire2);

  const trig = once();
  let phase = 0; // 0: 近づけない 1: 背後へ回る待ち 2: 背後にいる
  let walked = 0;
  const last = g.player.pos.clone();
  const housePos = new THREE.Vector3(0, 0, -70);
  house.position.copy(housePos);
  const PERIOD = 18;

  return {
    title: 'home (far)',
    group,
    spawn: { x: 0, z: 0, yaw: 0 },
    world: { rects: [{ minX: -1e5, maxX: 1e5, minZ: -1e5, maxZ: 1e5 }], circles: [], boxes: [], dynamic: [] },
    fog: { color: '#bfd2e2', near: 35, far: 240 },
    bg: '#bfd2e2',
    ambience: { wind: 0.09, music: false, drone: 0.02 },
    wet: false,
    idle: [
      'the grass is the same blade. the same blade. the same',
      'there used to be a road here. there used to be a here.',
      'it is 4:00 pm. it has been 4:00 pm for a long ____',
    ],
    update(dt, t) {
      const p = g.player.pos;
      walked += Math.hypot(p.x - last.x, p.z - last.z);
      last.copy(p);
      // 地面・電柱・電線をプレイヤーに追従（テクスチャ周期でスナップ）
      ground.position.set(Math.round(p.x / 10) * 10, 0, Math.round(p.z / 10) * 10);
      const bz = Math.round(p.z / PERIOD) * PERIOD;
      poles.forEach((pg, i) => pg.position.set(7, 0, bz + (i - 11) * PERIOD));
      wire.position.set(7.7, 6.6, p.z); wire2.position.set(6.3, 6.6, p.z);
      sun.position.set(p.x - 120, 170, p.z - 300);

      if (phase === 0) {
        // 家はいつも同じ距離だけ前にある
        house.position.set(0, 0, p.z - 70);
        house.rotation.y = 0;
        if (walked > 10 && trig('a')) g.ui.say('almost home');
        if (walked > 24 && trig('b')) g.ui.say('almost home');
        if (walked > 34 && trig('s')) g.ui.say('why is the sun looking');
        if (walked > 46 && trig('c')) g.ui.say('almost home almost home almost home almost hom');
        if (walked > 58) phase = 1;
      } else if (phase === 1) {
        if (trig('turn')) g.ui.say('stop. turn around. slowly.', { priority: true, hold: 6 });
        // 見ていない隙に背後へ
        if (!g.inView(house.position.x, 1.5, house.position.z, 0.2)) {
          const f = g.forward();
          house.position.set(p.x - f.x * 8, 0, p.z - f.z * 8);
          house.rotation.y = Math.atan2(p.x - house.position.x, p.z - house.position.z);
          phase = 2;
          g.audio.sting(1);
          g.glitch(0.7);
        }
      } else if (phase === 2) {
        if (trig('d')) g.ui.say('it was behind you the whole ____', { priority: true });
        if (g.inView(house.position.x, 1.5, house.position.z, 0.8) && trig('e')) {
          setTimeout(() => g.ui.say('go inside. it is warm. it is warm. it is'), 4500);
        }
        if (Math.hypot(p.x - house.position.x, p.z - house.position.z) < 3.3) g.goto(3);
      }
    },
    // 家との衝突（フェーズ2のみ）
    extraCircles() {
      return phase === 2 ? [{ x: house.position.x, z: house.position.z, r: 2.4 }] : [];
    },
  };
}

/* =====================================================================
   3: 家の中の廊下（ループ）
   ===================================================================== */
export function hallwayZone(g) {
  const group = new THREE.Group();
  const HW = 1.6, L = 43, H = 2.7, z0 = 1, z1 = z0 - L;

  const wpTex = wallpaperTexture(); wpTex.repeat.set(L / 1.2, H / 1.2);
  const wpMat = lambert('#ffffff', wpTex);
  const wl = plane(L, H, wpMat); wl.rotation.y = Math.PI / 2; wl.position.set(-HW, H / 2, z0 - L / 2);
  const wr = plane(L, H, wpMat); wr.rotation.y = -Math.PI / 2; wr.position.set(HW, H / 2, z0 - L / 2);
  const cTex = carpetTexture(); cTex.repeat.set(3, L);
  const fl = plane(HW * 2, L, lambert('#ffffff', cTex)); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, z0 - L / 2);
  const ce = plane(HW * 2, L, lambert('#efe6d6')); ce.rotation.x = Math.PI / 2; ce.position.set(0, H, z0 - L / 2);
  const endTex = wallpaperTexture(); endTex.repeat.set(HW * 2 / 1.2, H / 1.2);
  const we = plane(HW * 2, H, lambert('#ffffff', endTex)); we.position.set(0, H / 2, z1);
  const ws = we.clone(); ws.rotation.y = Math.PI; ws.position.z = z0;
  group.add(wl, wr, fl, ce, we, ws);
  // 巾木
  const bbMat = lambert('#f4efe6');
  const bl = box(0.04, 0.14, L, bbMat); bl.position.set(-HW + 0.02, 0.07, z0 - L / 2);
  const br = bl.clone(); br.position.x = HW - 0.02;
  group.add(bl, br);

  // 扉と絵
  const doorColors = ['#a9c6d6', '#d8b4c4', '#c7d6a9', '#e2d1a4', '#b9b0d8'];
  const portraits = [];
  for (let i = 0; i < 6; i++) {
    const z = -4 - i * 6;
    const side = i % 2 ? 1 : -1;
    const d = box(0.06, 2.05, 0.92, lambert(doorColors[i % doorColors.length]));
    d.position.set(side * (HW - 0.03), 1.025, z);
    const frame = box(0.04, 2.2, 1.1, lambert('#f5efe4'));
    frame.position.set(side * (HW - 0.01), 1.1, z);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), lambert('#c9a64a'));
    knob.position.set(side * (HW - 0.09), 1.0, z + 0.33);
    group.add(frame, d, knob);
    const pt = plane(0.55, 0.7, lambert('#ffffff', portraitTexture(150 + i * 30)));
    pt.position.set(-side * (HW - 0.01), 1.55, z - 2);
    pt.rotation.y = side * Math.PI / 2;
    group.add(pt); portraits.push(pt);
  }

  // 照明
  const lampMat = basic('#fff1d6');
  for (let z = -2; z > z1; z -= 4) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.08, 16), lampMat);
    lamp.position.set(0, H - 0.04, z); group.add(lamp);
  }
  const lights = [-6, -20, -34].map((z) => {
    const l = new THREE.PointLight('#ffe7c2', 7, 16, 1.4);
    l.position.set(0, H - 0.3, z); group.add(l); return l;
  });
  const hemi = new THREE.HemisphereLight('#ffeedd', '#4a3a3a', 0.55);
  group.add(hemi, new THREE.AmbientLight('#ffffff', 0.15));

  // テレビ
  const stat = makeStatic();
  stat.setText('WHO IS THERE');
  const tv = new THREE.Group();
  const stand = box(1.0, 0.45, 0.6, lambert('#6b4e36')); stand.position.y = 0.225;
  const body = box(0.9, 0.7, 0.6, lambert('#3a3a3c')); body.position.y = 0.8;
  const screen = plane(0.7, 0.52, basic('#ffffff', { map: stat.tex })); screen.position.set(0, 0.8, 0.301);
  tv.add(stand, body, screen);
  tv.position.set(0, 0, z1 + 0.5);
  const tvLight = new THREE.PointLight('#cfe8ff', 3, 6, 1.5); tvLight.position.set(0, 1, z1 + 1.4);
  group.add(tv, tvLight);

  // 最後の白い出口
  const exitMat = basic('#ffffff', { transparent: true, opacity: 0 });
  const exit = plane(HW * 2 - 0.1, H - 0.1, exitMat); exit.position.set(0, H / 2, z1 + 0.02);
  group.add(exit);

  const watcher = new Watcher(group, { vanishDist: 5, lookTime: 4 });
  const trig = once();
  let loop = 0;
  let flicker = 0;

  function applyLoop() {
    if (loop === 1) {
      portraits.forEach((p) => { p.rotation.z = Math.PI; });
      lights.forEach((l) => { l.intensity = 4.5; });
      stat.setText('yOU');
      g.ui.say('again');
    } else if (loop === 2) {
      lights.forEach((l) => { l.intensity = 3; });
      watcher.place(0, -28);
      stat.setText('bEHInD');
      flicker = 3;
      g.ui.say('you walked this way before. twice. three ____');
    } else if (loop === 3) {
      lights.forEach((l) => { l.color.set('#ff8a7a'); l.intensity = 4; });
      hemi.color.set('#ff9a9a');
      tv.visible = false; tvLight.visible = false;
      exitMat.opacity = 1;
      g.ui.say('wake up wake up wake up wake up', { priority: true });
    }
  }

  return {
    title: 'hallway (again)',
    group,
    spawn: { x: 0, z: -1, yaw: 0 },
    world: { rects: [{ minX: -HW + 0.3, maxX: HW - 0.3, minZ: z1 + 0.9, maxZ: z0 - 0.4 }], circles: [], boxes: [] },
    fog: { color: '#2a2224', near: 3, far: 34 },
    bg: '#2a2224',
    ambience: { hum: 0.03, tv: 0.0, music: true, drone: 0.04 },
    wet: false,
    idle: [
      "don't open the doors. there is no other side",
      'the tv knows your name. do you?',
      'welcome home. who are you?',
    ],
    update(dt, t) {
      const p = g.player.pos;
      stat.update(t);
      if (tv.visible) g.audio.setTv(Math.max(0, 0.08 * (1 - Math.abs(p.z - z1) / 20)));
      if (loop >= 2) wpTex.offset.x = Math.sin(t * 0.3) * 0.02; // 壁紙の目が動く
      if (t > 2 && trig('a')) g.ui.say('welcome home. who are you?');
      if (p.z < -20 && trig('b')) g.ui.say("don't open the doors. there is no other side");
      if (flicker > 0) {
        flicker -= dt;
        lights.forEach((l) => { l.visible = flicker <= 0 || Math.random() > 0.4; });
      }
      watcher.update(dt, g);
      if (loop < 3 && p.z < z1 + 4.5) {
        // 一瞬の砂嵐 → 廊下の最初に戻される
        p.z += 37;
        loop++;
        g.glitch(1);
        g.audio.whoosh();
        applyLoop();
      }
      if (loop === 3 && p.z < z1 + 1.3 && trig('exit')) {
        g.dreamCount++;
        g.goto(0);
      }
    },
  };
}

export const ZONES = [poolZone, mushroomZone, fieldZone, hallwayZone];
