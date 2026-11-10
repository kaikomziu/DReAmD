// v0.2.0 で追加した夢のエリア
// 4: 水没した子ども部屋（巨大） 5: 雲の上の遊び場 6: 閉店後のショッピングモール
import * as THREE from '../vendor/three.module.min.js';
import { lambert, basic, plane, box, Watcher, once } from './zones.js';
import {
  tileTexture, waterTexture, skyMaterial, woodTexture, cloudWallpaperTexture,
  blockTexture, matTexture, shutterTexture, signTexture,
} from './textures.js';

const inRect = (p, r) => p.x > r.minX && p.x < r.maxX && p.z > r.minZ && p.z < r.maxZ;

/* =====================================================================
   4: 水没した子ども部屋（自分が小さくなっている）
   ===================================================================== */
export function bedroomZone(g) {
  const group = new THREE.Group();
  const W = 24, L = 42, H = 14, z0 = 2, z1 = z0 - L;

  const floor = plane(W, L, lambert('#ffffff', woodTexture(W / 6, L / 6)));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, z0 - L / 2);
  const wpL = cloudWallpaperTexture(); wpL.repeat.set(L / 5, H / 5);
  const wpS = cloudWallpaperTexture(); wpS.repeat.set(W / 5, H / 5);
  const wl = plane(L, H, lambert('#ffffff', wpL)); wl.rotation.y = Math.PI / 2; wl.position.set(-W / 2, H / 2, z0 - L / 2);
  const wr = wl.clone(); wr.rotation.y = -Math.PI / 2; wr.position.x = W / 2;
  const wb = plane(W, H, lambert('#ffffff', wpS)); wb.position.set(0, H / 2, z1);
  const wf = wb.clone(); wf.rotation.y = Math.PI; wf.position.z = z0;
  const ceil = plane(W, L, lambert('#26324a')); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, z0 - L / 2);
  group.add(floor, wl, wr, wb, wf, ceil);

  // 天井の蓄光の星
  const starMat = basic('#eaffb8');
  for (let i = 0; i < 70; i++) {
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.08 + Math.random() * 0.12, 5), starMat);
    s.rotation.x = Math.PI / 2;
    s.position.set((Math.random() - 0.5) * (W - 1), H - 0.02, z0 - Math.random() * L);
    group.add(s);
  }

  // 床まで水が来ている
  const wTex = waterTexture(); wTex.repeat.set(W / 3, L / 3);
  const water = plane(W, L, new THREE.MeshPhongMaterial({
    color: '#8fc7d6', map: wTex, transparent: true, opacity: 0.55, shininess: 80, specular: '#ffffff', depthWrite: false,
  }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.38, z0 - L / 2);
  group.add(water);

  // 巨大なベッド（下にもぐれる）
  const circles = [];
  const woodMat = lambert('#ffffff', woodTexture(2, 2));
  const bx0 = 4, bx1 = 11.6, bz0 = -8, bz1 = -26, bcx = (bx0 + bx1) / 2, bcz = (bz0 + bz1) / 2;
  for (const [x, z] of [[bx0 + 0.4, bz0 - 0.4], [bx1 - 0.4, bz0 - 0.4], [bx0 + 0.4, bz1 + 0.4], [bx1 - 0.4, bz1 + 0.4]]) {
    const leg = box(0.6, 3, 0.6, woodMat); leg.position.set(x, 1.5, z); group.add(leg);
    circles.push({ x, z, r: 0.5 });
  }
  const frame = box(bx1 - bx0, 0.8, bz0 - bz1, woodMat); frame.position.set(bcx, 3.4, bcz);
  const mattress = box(bx1 - bx0 - 0.3, 1.3, bz0 - bz1 - 0.3, lambert('#f4f1ea')); mattress.position.set(bcx, 4.45, bcz);
  const blanket = box(bx1 - bx0, 0.5, 11, lambert('#e9b7c8')); blanket.position.set(bcx, 5.2, bz0 - 5.8);
  const drape = box(0.2, 3.2, 11, lambert('#e9b7c8')); drape.position.set(bx0 - 0.05, 3.7, bz0 - 5.8);
  const pillow = box(5, 0.9, 2.4, lambert('#ffffff')); pillow.position.set(bcx, 5.5, bz1 + 2);
  const head = box(bx1 - bx0, 6, 0.5, woodMat); head.position.set(bcx, 4, bz1);
  group.add(frame, mattress, blanket, drape, pillow, head);
  circles.push({ x: bcx, z: bz1, r: 0.2 });
  // ベッドの下の、こちらを見ている二つの点
  const eyeMat = basic('#fff3c4', { transparent: true, opacity: 0 });
  const eyes = new THREE.Group();
  for (const dx of [-0.18, 0.18]) {
    const e = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), eyeMat);
    e.position.x = dx; eyes.add(e);
  }
  eyes.position.set(bcx + 1.5, 1.2, bz1 + 0.6);
  group.add(eyes);

  // 積み木（文字が少し違う）
  const letters = [['D', '#d4625c'], ['R', '#5c8fd4'], ['E', '#e3b04b'], ['A', '#6cbf84'], ['W', '#a77cd4'], ['D', '#d4625c']];
  letters.forEach(([ch, col], i) => {
    const s = 2.2;
    const t = blockTexture(ch, col);
    const b = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), lambert('#ffffff', t));
    const x = -7 + (i % 3) * 2.9 + (Math.random() - 0.5) * 0.6;
    const z = -12 - Math.floor(i / 3) * 4.2;
    b.position.set(x, s / 2, z);
    b.rotation.y = (Math.random() - 0.5) * 0.6;
    group.add(b);
    circles.push({ x, z, r: 1.55 });
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), lambert('#ffffff', blockTexture('?', '#7a7f8a')));
  top.position.set(-4.1, 3.3, -12); top.rotation.y = 0.5; group.add(top);

  // 窓（外は真っ白）
  const win = plane(6, 5, basic('#ffffff'));
  win.rotation.y = Math.PI / 2; win.position.set(-W / 2 + 0.02, 8, -16);
  const barMat = lambert('#f2ede2');
  const barV = box(0.3, 5.4, 0.3, barMat); barV.position.set(-W / 2 + 0.1, 8, -16);
  const barH = box(0.3, 0.3, 6.4, barMat); barH.position.set(-W / 2 + 0.1, 8, -16);
  group.add(win, barV, barH);
  const winLight = new THREE.PointLight('#e8f2ff', 40, 40, 1.2); winLight.position.set(-W / 2 + 3, 8, -16); group.add(winLight);

  // 常夜灯
  const nl = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI), basic('#ffbb66'));
  nl.rotation.y = -Math.PI / 2; nl.position.set(W / 2 - 0.02, 1.2, -33); group.add(nl);
  const nlLight = new THREE.PointLight('#ffaa55', 10, 14, 1.4); nlLight.position.set(W / 2 - 1, 1.3, -33); group.add(nlLight);
  group.add(new THREE.HemisphereLight('#c7dcf0', '#3b3a4a', 0.75));
  group.add(new THREE.AmbientLight('#ffffff', 0.12));

  // 少しだけ開いた巨大なドア（すき間から光）
  const dx0 = 2, dw = 6, dh = 10;
  const light = plane(dw, dh, basic('#fffdf4')); light.position.set(dx0 + dw / 2, dh / 2, z1 + 0.02);
  const doorPivot = new THREE.Group(); doorPivot.position.set(dx0, 0, z1 + 0.05);
  const door = box(dw, dh, 0.3, lambert('#f1ebe0')); door.position.set(dw / 2, dh / 2, 0);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), lambert('#c9a64a')); knob.position.set(dw - 0.6, 4.5, 0.3);
  doorPivot.add(door, knob); doorPivot.rotation.y = -0.45;
  group.add(light, doorPivot);
  const doorLight = new THREE.PointLight('#fff6dc', 20, 22, 1.3); doorLight.position.set(dx0 + dw / 2, 4, z1 + 2); group.add(doorLight);

  // くま（見ていないときだけ近づく）
  const bear = new THREE.Group();
  const fur = lambert('#9a6b4a'), light2 = lambert('#d8b48f'), black = basic('#111');
  const bodyM = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), fur); bodyM.position.y = 1; bodyM.scale.set(1, 1.1, 0.9);
  const headM = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), fur); headM.position.y = 2.5;
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), light2); snout.position.set(0, 2.35, 0.65);
  bear.add(bodyM, headM, snout);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), fur); ear.position.set(s * 0.55, 3.1, 0); bear.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), black); eye.position.set(s * 0.25, 2.65, 0.68); bear.add(eye);
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), fur); arm.position.set(s * 0.95, 1.3, 0.3); arm.scale.y = 1.4; bear.add(arm);
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), fur); leg.position.set(s * 0.55, 0.35, 0.6); bear.add(leg);
  }
  bear.scale.setScalar(1.5);
  bear.position.set(-7, 0, -30);
  group.add(bear);

  const rect = { minX: -W / 2 + 0.6, maxX: W / 2 - 0.6, minZ: z1 + 0.6, maxZ: z0 - 0.6 };
  const underBed = { minX: bx0, maxX: bx1, minZ: bz1, maxZ: bz0 };
  const trig = once();
  let bearTimer = 0, bearMoves = 0;

  return {
    title: 'the room you grew up in',
    group,
    spawn: { x: -3, z: -1, yaw: 0 },
    world: { rects: [rect], circles, boxes: [] },
    fog: { color: '#7f98b0', near: 8, far: 70 },
    bg: '#7f98b0',
    ambience: { water: 0.05, music: true, drone: 0.04 },
    wet: true,
    idle: [
      "don't wake the ____",
      'you used to be afraid of this room. you used to be.',
      'it is past your bedtime. it has always been past your bedtime.',
    ],
    update(dt, t) {
      const p = g.player.pos;
      wTex.offset.x = t * 0.008;
      if (t > 2.5 && trig('a')) g.ui.say('you were smaller here. you are smaller here.');
      if (p.z < -11 && trig('b')) g.ui.say('the blocks spell your name. they spell it wrong.');
      if (inRect(p, underBed)) {
        eyeMat.opacity = Math.min(0.9, eyeMat.opacity + dt * 0.3);
        if (trig('c')) g.ui.say('it is dark under here. something is breathing slower than you.');
      } else {
        eyeMat.opacity = Math.max(0, eyeMat.opacity - dt * 2);
      }
      if (p.z < -32 && trig('d')) g.ui.say('mom left the water running. mom left. the water.');

      // くま：視界の外にいる間だけ、少しずつ近づく
      const bp = bear.position;
      const d = Math.hypot(p.x - bp.x, p.z - bp.z);
      if (g.inView(bp.x, 2, bp.z, 0.45)) {
        bearTimer = 0;
      } else {
        bearTimer += dt;
        if (bearTimer > 1.6 && d > 5) {
          bearTimer = 0;
          const k = 0.3;
          const nx = bp.x + (p.x - bp.x) * k, nz = bp.z + (p.z - bp.z) * k;
          if (nx > rect.minX + 1.5 && nx < rect.maxX - 1.5 && nz > rect.minZ + 1.5 && nz < rect.maxZ - 1.5 && !inRect({ x: nx, z: nz }, underBed)) {
            bp.x = nx; bp.z = nz;
            bearMoves++;
            if (bearMoves === 2) { g.audio.sting(0.5); g.ui.say('it only moves when you blink. you blink seventeen times a minute.'); }
          }
        }
        bear.rotation.y = Math.atan2(p.x - bp.x, p.z - bp.z);
      }

      if (p.z < z1 + 2 && p.x > dx0 && p.x < dx0 + dw && trig('exit')) g.goto(5);
    },
    extraCircles() { return [{ x: bear.position.x, z: bear.position.z, r: 1.7 }]; },
  };
}

/* =====================================================================
   5: 雲の上の遊び場（誰もいない）
   ===================================================================== */
export function playgroundZone(g) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), skyMaterial('#f2b9cf', '#cfe8f4', 0.6)));

  // 足場（島）と橋
  const pads = [
    { minX: -9, maxX: 9, minZ: -12, maxZ: 6 },
    { minX: -1.5, maxX: 1.5, minZ: -26, maxZ: -12 },
    { minX: -9, maxX: 9, minZ: -44, maxZ: -26 },
    { minX: -1.5, maxX: 1.5, minZ: -56, maxZ: -44 },
    { minX: -10, maxX: 10, minZ: -76, maxZ: -56 },
  ];
  const sideMat = lambert('#f4efe8');
  pads.forEach((r) => {
    const w = r.maxX - r.minX, d = r.maxZ - r.minZ;
    const top = matTexture(w / 4, d / 4);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), [sideMat, sideMat, lambert('#ffffff', top), sideMat, sideMat, sideMat]);
    m.position.set((r.minX + r.maxX) / 2, -0.3, (r.minZ + r.maxZ) / 2);
    group.add(m);
  });
  const rects = pads.map((r) => ({ minX: r.minX + 0.4, maxX: r.maxX - 0.4, minZ: r.minZ + (r.minX > -2 ? -0.5 : 0.4), maxZ: r.maxZ - (r.minX > -2 ? -0.5 : 0.4) }));

  // 雲の海
  const cloudMat = lambert('#ffffff');
  const sea = plane(900, 900, basic('#f7eef3')); sea.rotation.x = -Math.PI / 2; sea.position.y = -9; group.add(sea);
  for (let i = 0; i < 70; i++) {
    const c = new THREE.Group();
    const n = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(2 + Math.random() * 2.5, 12, 8), cloudMat);
      s.position.set(k * 2.6 - n, Math.random() * 1.2, (Math.random() - 0.5) * 2);
      c.add(s);
    }
    let x = (Math.random() - 0.5) * 160;
    if (Math.abs(x) < 14) x += Math.sign(x || 1) * 14;
    c.position.set(x, -4 - Math.random() * 4, 30 - Math.random() * 170);
    group.add(c);
  }
  group.add(new THREE.HemisphereLight('#fff2f8', '#b7cfe0', 1.6));
  const sun = new THREE.DirectionalLight('#fff4e8', 1.2); sun.position.set(30, 50, 20); group.add(sun);

  const circles = [];
  const metal = lambert('#e06b6b'), metal2 = lambert('#5aa7c8'), seatMat = lambert('#f2d16b');
  const cyl = (r, h, m) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), m);

  // ブランコ（見ている間だけ止まる）
  const swingZ = -4;
  for (const sx of [-4.5, 4.5]) {
    for (const dz of [-1.2, 1.2]) {
      const leg = cyl(0.1, 4.6, metal);
      leg.position.set(sx, 2.2, swingZ + dz / 2); leg.rotation.x = dz > 0 ? -0.27 : 0.27;
      group.add(leg);
    }
    circles.push({ x: sx, z: swingZ, r: 0.8 });
  }
  const barTop = cyl(0.1, 9.2, metal); barTop.rotation.z = Math.PI / 2; barTop.position.set(0, 4.4, swingZ); group.add(barTop);
  const swings = [];
  [-2.6, 0, 2.6].forEach((x, i) => {
    const pivot = new THREE.Group(); pivot.position.set(x, 4.4, swingZ);
    for (const dx of [-0.4, 0.4]) { const ch = cyl(0.02, 3.4, lambert('#9a9a9a')); ch.position.set(dx, -1.7, 0); pivot.add(ch); }
    const seat = box(1, 0.1, 0.45, seatMat); seat.position.y = -3.4; pivot.add(seat);
    pivot.userData.phase = i * 1.3;
    group.add(pivot); swings.push(pivot);
  });
  let swingAmp = 1;

  // すべり台
  const slide = new THREE.Group();
  for (const dx of [-0.6, 0.6]) { const rail = cyl(0.07, 4.2, metal2); rail.position.set(dx, 2.1, 0); slide.add(rail); }
  for (let i = 0; i < 6; i++) { const r = cyl(0.05, 1.2, metal2); r.rotation.z = Math.PI / 2; r.position.set(0, 0.6 + i * 0.65, 0); slide.add(r); }
  const deck = box(1.6, 0.15, 1.6, metal2); deck.position.set(0, 4.1, -0.8); slide.add(deck);
  const chute = box(1.3, 0.12, 8.2, lambert('#7fd1c3')); chute.position.set(0, 2.2, -5.4); chute.rotation.x = -0.5; slide.add(chute);
  slide.position.set(4.5, 0, -29);
  group.add(slide);
  circles.push({ x: 4.5, z: -29.4, r: 1.3 }, { x: 4.5, z: -32.5, r: 1.1 }, { x: 4.5, z: -36, r: 1 });

  // シーソー（ひとりでに動く）
  const sawBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.5, 0.8, 8), metal);
  sawBase.position.set(-4.5, 0.4, -35);
  const plank = box(0.6, 0.15, 7, seatMat); plank.position.set(-4.5, 0.85, -35);
  group.add(sawBase, plank);
  circles.push({ x: -4.5, z: -33, r: 0.8 }, { x: -4.5, z: -35, r: 0.8 }, { x: -4.5, z: -37, r: 0.8 });

  // 回転遊具
  const merry = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.3, 32), lambert('#e7a35c'));
  disc.position.y = 0.35; merry.add(disc);
  const pole = cyl(0.12, 2.4, metal2); pole.position.y = 1.5; merry.add(pole);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const h = cyl(0.05, 2.9, metal); h.rotation.z = Math.PI / 2; h.rotation.y = a;
    h.position.set(Math.cos(a) * 1.4, 1.4, -Math.sin(a) * 1.4); merry.add(h);
  }
  merry.position.set(0, 0, -64);
  group.add(merry);
  circles.push({ x: 0, z: -64, r: 3.4 });
  // 風船
  const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), lambert('#e04848'));
  balloon.scale.y = 1.2;
  const string = cyl(0.01, 3, lambert('#ddd'));
  group.add(balloon, string);

  // 空中に立つドア
  const doorFrameMat = lambert('#ffffff');
  const postL = box(0.25, 3, 0.25, doorFrameMat); postL.position.set(-1, 1.5, -74.5);
  const postR = postL.clone(); postR.position.x = 1;
  const lintel = box(2.25, 0.25, 0.25, doorFrameMat); lintel.position.set(0, 3, -74.5);
  const dark = plane(1.75, 2.88, basic('#050505', { side: THREE.DoubleSide })); dark.position.set(0, 1.44, -74.5);
  group.add(postL, postR, lintel, dark);
  circles.push({ x: -1, z: -74.5, r: 0.3 }, { x: 1, z: -74.5, r: 0.3 });

  const watcher = new Watcher(group, { vanishDist: 9, lookTime: 2.2 });
  const trig = once();
  const swingCenter = new THREE.Vector3(0, 2.4, swingZ);

  return {
    title: 'recess (forever)',
    group,
    spawn: { x: 0, z: 4, yaw: 0 },
    world: { rects, circles, boxes: [] },
    fog: { color: '#efd8e4', near: 25, far: 170 },
    bg: '#efd8e4',
    ambience: { wind: 0.06, music: false, drone: 0.025 },
    wet: false,
    idle: [
      'the clouds are soft. do not test this.',
      'someone is counting to ten. they stopped at nine.',
      'it is still lunchtime somewhere below',
    ],
    update(dt, t) {
      const p = g.player.pos;
      // ブランコ：見ていると止まり、目を離すと揺れ出す
      const looking = g.inView(swingCenter.x, swingCenter.y, swingCenter.z, 0.75);
      swingAmp += ((looking ? 0 : 1) - swingAmp) * Math.min(1, dt * (looking ? 12 : 0.8));
      swings.forEach((s) => { s.rotation.x = Math.sin(t * 1.7 + s.userData.phase) * 0.7 * swingAmp; });
      if (looking && swingAmp < 0.1 && t > 4 && trig('sw')) g.ui.say('who was on the swings?');
      plank.rotation.x = Math.sin(t * 0.9) * 0.28;
      merry.rotation.y += dt * 0.35;
      balloon.position.set(1.5, 3.4 + Math.sin(t * 1.3) * 0.15, -64);
      string.position.set(1.5, 1.9 + Math.sin(t * 1.3) * 0.15, -64);

      if (t > 2.5 && trig('a')) g.ui.say('recess is over. recess is over. recess is');
      if (p.z < -14 && trig('b')) g.ui.say("don't look down. there is no down.");
      if (p.z < -46 && trig('w')) watcher.place(6.5, -72);
      if (p.z < -50 && trig('c')) g.ui.say('everyone went home without you');
      if (p.z < -68 && trig('d')) g.ui.say('the bell rang forty years ago. you are late.');
      watcher.update(dt, g);
      if (p.z < -74.2 && p.z > -75.4 && Math.abs(p.x) < 0.8 && trig('exit')) g.goto(6);
    },
  };
}

/* =====================================================================
   6: 閉店後のショッピングモール
   ===================================================================== */
export function mallZone(g) {
  const group = new THREE.Group();
  const W = 28, L = 72, H = 11, z0 = 2, z1 = z0 - L;

  const floor = plane(W, L, lambert('#ffffff', tileTexture('#e9dfcf', '#bfb19c', 4, W / 3, L / 3)));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, z0 - L / 2);
  const wallMat = lambert('#efe4d2');
  const wl = plane(L, H, wallMat); wl.rotation.y = Math.PI / 2; wl.position.set(-W / 2, H / 2, z0 - L / 2);
  const wr = wl.clone(); wr.rotation.y = -Math.PI / 2; wr.position.x = W / 2;
  const wb = plane(W, H, wallMat); wb.position.set(0, H / 2, z1);
  const wf = wb.clone(); wf.rotation.y = Math.PI; wf.position.z = z0;
  const ceil = plane(W, L, lambert('#d9d2c6')); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, z0 - L / 2);
  group.add(floor, wl, wr, wb, wf, ceil);
  // 天窓（外は灰色の夕方）
  const skyMat = basic('#cfdbe4');
  for (let z = -4; z > z1 + 4; z -= 10) { const s = plane(8, 6, skyMat); s.rotation.x = Math.PI / 2; s.position.set(0, H - 0.02, z); group.add(s); }

  // 2階のバルコニー
  const slabMat = lambert('#e6dccb');
  const glassMat = new THREE.MeshPhongMaterial({ color: '#bfe3e8', transparent: true, opacity: 0.25, shininess: 100, depthWrite: false, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const slab = box(3, 0.5, L, slabMat); slab.position.set(s * (W / 2 - 1.5), 5, z0 - L / 2); group.add(slab);
    const glass = plane(L, 1.1, glassMat); glass.rotation.y = Math.PI / 2; glass.position.set(s * (W / 2 - 3), 5.8, z0 - L / 2); group.add(glass);
    const rail = box(0.08, 0.08, L, lambert('#c9c2b5')); rail.position.set(s * (W / 2 - 3), 6.35, z0 - L / 2); group.add(rail);
  }

  // 店（シャッターと看板）
  const names = ['dReAm sHOES', 'sORRY wE aRE oPEN', 'lOST & fOUND (yOU)', 'mANNEQUIN', 'fOOD cOURT ->', 'kIDS wORLD', 'pHOTO 1 hR'];
  const shTex = shutterTexture();
  const shutterMat = lambert('#ffffff', shTex);
  const mannequins = [];
  for (let i = 0; i < 7; i++) {
    const z = -4.5 - i * 9;
    for (const s of [-1, 1]) {
      const x = s * (W / 2 - 0.03);
      const lit = s === -1 && i === 3;
      const front = plane(7, 4, lit ? basic('#fff3dc') : shutterMat);
      front.rotation.y = -s * Math.PI / 2; front.position.set(x, 2, z);
      const sign = plane(6, 0.9, basic('#ffffff', { map: signTexture(names[(i + (s > 0 ? 3 : 0)) % names.length], s > 0 ? '#ffc9d8' : '#ffe9c8') }));
      sign.rotation.y = -s * Math.PI / 2; sign.position.set(s * (W / 2 - 0.05), 4.4, z);
      const pil = box(0.6, 4.8, 0.6, lambert('#d8ccb8')); pil.position.set(s * (W / 2 - 0.3), 2.4, z - 4.5);
      // 2階の暗い店
      const up = plane(7, 3.5, basic('#3a3430')); up.rotation.y = -s * Math.PI / 2; up.position.set(x, 7.2, z);
      group.add(front, sign, pil, up);
      if (lit) {
        for (let k = 0; k < 3; k++) {
          const m = new THREE.Group();
          const mm = lambert('#f4f1ec');
          const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.3, 4, 10), mm); body.position.y = 1.2;
          const headM = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mm); headM.position.y = 2.25;
          const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), lambert('#888')); stand.position.y = 0.2;
          m.add(body, headM, stand);
          m.position.set(-W / 2 + 0.9, 0, z - 2 + k * 2);
          m.rotation.y = Math.PI / 2;
          group.add(m); mannequins.push(m);
        }
        const glass = plane(7, 4, glassMat); glass.rotation.y = Math.PI / 2; glass.position.set(-W / 2 + 1.7, 2, z);
        group.add(glass);
      }
    }
  }

  // 噴水
  const circles = [];
  const fz = -30;
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.7, 0.8, 40, 1, true), lambert('#e8e1d4', null, { side: THREE.DoubleSide }));
  basin.position.set(0, 0.4, fz);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.22, 8, 48), lambert('#f1ebe0')); rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.8, fz);
  const fwTex = waterTexture(); fwTex.repeat.set(3, 3);
  const fWater = new THREE.Mesh(new THREE.CircleGeometry(4.45, 40), new THREE.MeshPhongMaterial({ color: '#7fc8c8', map: fwTex, transparent: true, opacity: 0.8, shininess: 100 }));
  fWater.rotation.x = -Math.PI / 2; fWater.position.set(0, 0.6, fz);
  const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 2.4, 16), lambert('#efe8dc')); tier1.position.set(0, 1.2, fz);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.5, 0.4, 24), lambert('#efe8dc')); bowl.position.set(0, 2.5, fz);
  group.add(basin, rim, fWater, tier1, bowl);
  circles.push({ x: 0, z: fz, r: 4.9 });
  // しぶき（粒子）
  const N = 260;
  const sprayGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(N * 3);
  const seeds = [];
  for (let i = 0; i < N; i++) seeds.push({ a: Math.random() * Math.PI * 2, v: 1.5 + Math.random() * 1.2, o: Math.random() * 1.4 });
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: '#e8ffff', size: 0.16, transparent: true, opacity: 0.85 }));
  group.add(spray);
  const fLight = new THREE.PointLight('#8fe8e0', 12, 16, 1.4); fLight.position.set(0, 1.5, fz); group.add(fLight);

  // 鉢植えのヤシとベンチ
  const potMat = lambert('#b98b62'), trunkMat = lambert('#8a6a48'), leafMat = lambert('#4f8a55', null, { side: THREE.DoubleSide });
  for (const [x, z] of [[-8, -12], [8, -12], [-8, -48], [8, -48]]) {
    const pot = box(1.6, 0.9, 1.6, potMat); pot.position.set(x, 0.45, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 3.4, 8), trunkMat); trunk.position.set(x, 2.5, z);
    group.add(pot, trunk);
    for (let k = 0; k < 7; k++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.4, 4), leafMat);
      const a = (k / 7) * Math.PI * 2;
      leaf.position.set(x + Math.cos(a) * 0.9, 4.0, z + Math.sin(a) * 0.9);
      leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      leaf.scale.z = 0.25;
      group.add(leaf);
    }
    circles.push({ x, z, r: 1.15 });
  }
  const benchMat = lambert('#8c6a4f');
  for (const [x, z] of [[-8, -22], [8, -22], [-8, -38], [8, -38]]) {
    const b = box(0.8, 0.5, 2.6, benchMat); b.position.set(x, 0.45, z); group.add(b);
    circles.push({ x, z: z - 0.8, r: 0.7 }, { x, z: z + 0.8, r: 0.7 });
  }

  // どこにも着かないエスカレーター
  const esc = box(2.4, 0.5, 10, lambert('#9da3a8')); esc.position.set(9, 2.5, -56); esc.rotation.x = 0.56; group.add(esc);
  for (const dx of [-1.3, 1.3]) {
    const side = box(0.2, 1.2, 10.2, lambert('#c9cdd0')); side.position.set(9 + dx, 3.1, -56); side.rotation.x = 0.56; group.add(side);
  }
  circles.push({ x: 9, z: -52, r: 1.5 }, { x: 9, z: -55, r: 1.5 }, { x: 9, z: -58.5, r: 1.5 });

  // 出口
  const exitDoor = plane(4, 3.2, basic('#060606')); exitDoor.position.set(0, 1.6, z1 + 0.02);
  const exitSign = plane(2.4, 0.6, basic('#ffffff', { map: signTexture('eXIt', '#7dffb0', '#0b2a18') })); exitSign.position.set(0, 3.7, z1 + 0.03);
  group.add(exitDoor, exitSign);

  // 照明
  const hemi = new THREE.HemisphereLight('#fff1de', '#6b5d50', 0.9);
  group.add(hemi, new THREE.AmbientLight('#ffffff', 0.15));
  const lights = [-10, -35, -60].map((z) => {
    const l = new THREE.PointLight('#ffe6c4', 22, 40, 1.3); l.position.set(0, H - 1.2, z); group.add(l); return l;
  });
  const storeLight = new THREE.PointLight('#fff0d0', 8, 10, 1.5); storeLight.position.set(-W / 2 + 2.5, 3, -31.5); group.add(storeLight);

  const watcher = new Watcher(group, { vanishDist: 12, lookTime: 3 });
  const trig = once();
  let blackout = 0;

  return {
    title: 'mall (closed)',
    group,
    spawn: { x: 0, z: 0, yaw: 0 },
    world: { rects: [{ minX: -W / 2 + 3.2, maxX: W / 2 - 3.2, minZ: z1 + 0.6, maxZ: z0 - 0.6 }], circles, boxes: [] },
    fog: { color: '#c3b6a4', near: 10, far: 85 },
    bg: '#c3b6a4',
    ambience: { hum: 0.02, water: 0.02, music: true, drone: 0.035 },
    wet: false,
    idle: [
      'lost child at the information desk. lost child. lost',
      'today only: everything. forever.',
      'the escalator goes up. nothing comes down.',
    ],
    update(dt, t) {
      const p = g.player.pos;
      fwTex.offset.x = t * 0.03;
      // しぶき
      for (let i = 0; i < N; i++) {
        const s = seeds[i];
        const k = ((t * 0.8 + s.o) % 1.4);
        const r = 0.3 + k * s.v * 0.9;
        sp[i * 3] = Math.cos(s.a) * r;
        sp[i * 3 + 1] = 2.7 + k * 3.2 - k * k * 3.4;
        sp[i * 3 + 2] = fz + Math.sin(s.a) * r;
      }
      sprayGeo.attributes.position.needsUpdate = true;

      // マネキン：見ていないうちにこちらを向く
      mannequins.forEach((m) => {
        if (!g.inView(m.position.x, 1.5, m.position.z, 0.55)) m.rotation.y = Math.atan2(p.x - m.position.x, p.z - m.position.z);
      });

      if (t > 2.5 && trig('a')) g.ui.say('welcome. we have been expecting you since 1994.');
      if (p.z < -14 && trig('b')) g.ui.say('please return to your parents. your parents are not here.');
      if (Math.hypot(p.x, p.z - fz) < 9 && trig('f')) g.ui.say('the fountain is making a wish. it is you.');
      if (p.z < -38 && trig('blk')) {
        blackout = 3.5;
        g.audio.musicOn = false;
        g.audio.sting(0.6);
        g.ui.say('attention shoppers. the store is now closed. the store is now closed. the store is now', { priority: true, hold: 5 });
      }
      if (blackout > 0) {
        blackout -= dt;
        const off = blackout > 0;
        lights.forEach((l) => { l.visible = !off; });
        storeLight.visible = !off; hemi.intensity = off ? 0.06 : 0.9;
        skyMat.color.set(off ? '#3a4048' : '#cfdbe4');
        if (!off) g.audio.musicOn = true;
      }
      if (p.z < -42 && trig('w')) watcher.place(-12.4, -58, 5.25);
      if (p.z < -60 && trig('d')) g.ui.say('we hope you enjoyed your stay. we hope you stay.');
      watcher.update(dt, g);
      if (p.z < z1 + 1.4 && Math.abs(p.x) < 2 && trig('exit')) {
        g.dreamCount++;
        g.goto(0);
      }
    },
  };
}
