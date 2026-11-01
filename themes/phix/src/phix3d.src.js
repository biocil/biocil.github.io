/* Phi-X 3D demos (WebGL, three.js): holotomography in 3D and the 3D scanning holotomography set-up.
   Built with esbuild into themes/phix/static/js/phix3d.js; the 2D versions remain as fall-backs. */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const PhiX = window.PhiX || {};
const LANG_TR = (document.documentElement.lang || "").toLowerCase().startsWith("tr");
const tx = (en, tr) => (LANG_TR && tr ? tr : en);
const TAU = Math.PI * 2;
function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
}
const css = (n, f) => (PhiX.cssVar && PhiX.cssVar(n)) || f;
const col = (n, f) => new THREE.Color(css(n, f));

/* ---------- small helpers ---------- */
function makeView(canvas, labelBox, opts) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov || 35, 1, 0.1, 2000);
  camera.up.set(0, 0, 1);
  camera.position.copy(opts.pos);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(opts.target || new THREE.Vector3());
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = opts.minD || 1; controls.maxDistance = opts.maxD || 500;
  controls.update();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1d2a26, 1.1));
  const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(5, -8, 12); scene.add(dl);
  const labels = [];
  const view = {
    renderer, scene, camera, controls, labels, dirty: true, first: true,
    label(text, pos, cls, onClick) {
      const el = document.createElement(onClick ? "button" : "span");
      el.className = "gl-label" + (cls ? " " + cls : ""); el.textContent = text;
      if (onClick) { el.type = "button"; el.addEventListener("click", onClick); }
      labelBox.appendChild(el); const l = { el, pos: pos.clone ? pos.clone() : new THREE.Vector3(...pos) }; labels.push(l); return l;
    },
    resize(force) {
      const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
      if (force || view.first || canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
        view.first = false;
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); view.dirty = true;
      }
    },
    render() {
      view.resize(); renderer.render(scene, camera);
      const w = canvas.clientWidth, h = canvas.clientHeight, v = new THREE.Vector3();
      for (const l of labels) {
        v.copy(l.pos).project(camera);
        const hidden = v.z > 1 || l.hide;
        l.el.style.display = hidden ? "none" : "";
        l.el.style.transform = `translate(-50%,-50%) translate(${((v.x + 1) / 2 * w).toFixed(1)}px,${((1 - v.y) / 2 * h).toFixed(1)}px)`;
      }
    }
  };
  controls.addEventListener("change", () => { view.dirty = true; });
  return view;
}
function onVisible(el, fn) { if (PhiX.whenVisible) PhiX.whenVisible(el, fn); else fn(); }
function isShown(el) { return el && el.offsetParent !== null; }
function cylinderBetween(a, b, r, mat) {
  const g = new THREE.CylinderGeometry(r, r, 1, 16, 1, true); const m = new THREE.Mesh(g, mat); setBetween(m, a, b); return m;
}
function setBetween(mesh, a, b) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.scale.set(1, Math.max(len, 1e-4), 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
}
function circleLine(radius, center, mat, axis) {
  const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU; pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0)); }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat); line.position.copy(center); if (axis) line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis); return line;
}

/* ======================= HOLOTOMOGRAPHY IN 3D ======================= */
function initTomo3D() {
  const root = document.getElementById("t3");
  if (!root || root.dataset.ready) return; root.dataset.ready = "1";
  const $ = id => document.getElementById(id);
  const Q = 64, DX = 0.12, L = Q * DX, LAMBDA = 0.6328, NM = 1.33, NAD = 1.25, QQ = Q * Q, Q3 = Q * Q * Q;
  const K = NM / LAMBDA * L, KD = NAD / LAMBDA * L, CAP = Math.asin(NAD / NM);
  const THMAX = Math.floor(Math.asin(Math.min(0.985, 1.3 / NM)) * 180 / Math.PI);
  const F = PhiX.getFFT(Q);
  const accent = col("--accent-on-deep", "#E0B252"), soft = col("--on-deep-soft", "#CFE0D6"), ink = col("--on-deep", "#EEF4EF");
  const T = { range: Math.min(70, THMAX), ill: [], idx: -1, single: false, playing: false, timer: null, mask: null, cur: null, Fre: null, Fim: null, truth: null, rec: null, mode: "surfaces", t: 0, delays: null };
  const drops = [[1.6, 0, 0.65, 0.28], [1.6, 0, -0.65, 0.28], [-2.1, 1.0, 0.35, 0.22]];
  function dn(x, y, z) {
    let v = 0; if (x * x / 9 + y * y / 5.76 + z * z / 2.25 < 1) v += 0.012;
    if ((x + 0.6) * (x + 0.6) / 1.44 + y * y + z * z / 0.64 < 1) v += 0.010;
    if ((x + 0.8) * (x + 0.8) + (y - 0.1) * (y - 0.1) + z * z < 0.0625) v += 0.010;
    drops.forEach((d, i) => { if ((x - d[0]) ** 2 + (y - d[1]) ** 2 + (z - d[2]) ** 2 < d[3] * d[3]) v += i < 2 ? 0.06 : 0.05; });
    return v;
  }
  const lr = new Float64Array(Q), li = new Float64Array(Q);
  function fft3(re, im, inv) {
    for (let z = 0; z < Q; z++) F.fft2(re.subarray(z * QQ, (z + 1) * QQ), im.subarray(z * QQ, (z + 1) * QQ), inv);
    for (let y = 0; y < Q; y++) for (let x = 0; x < Q; x++) {
      for (let z = 0; z < Q; z++) { lr[z] = re[z * QQ + y * Q + x]; li[z] = im[z * QQ + y * Q + x]; }
      F.fft1(lr, li, inv); const sc = inv ? 1 / Q : 1;
      for (let z = 0; z < Q; z++) { re[z * QQ + y * Q + x] = lr[z] * sc; im[z * QQ + y * Q + x] = li[z] * sc; }
    }
  }
  function build() {
    const re = new Float64Array(Q3), im = new Float64Array(Q3);
    for (let iz = 0; iz < Q; iz++) for (let iy = 0; iy < Q; iy++) for (let ix = 0; ix < Q; ix++) {
      let s = 0; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) s += dn((ix + 0.25 + 0.5 * a - Q / 2) * DX, (iy + 0.25 + 0.5 * b - Q / 2) * DX, (iz + 0.25 + 0.5 * c - Q / 2) * DX);
      re[(iz * Q + iy) * Q + ix] = s / 8;
    }
    T.truth = new Float64Array(re); fft3(re, im, false); T.Fre = re; T.Fim = im;
  }
  function setIll() { T.ill = [[0, 0]]; if (T.range > 0) { for (let a = 0; a < 16; a++) T.ill.push([T.range / 2, a * 22.5]); for (let b = 0; b < 32; b++) T.ill.push([T.range, b * 11.25]); } }
  const kdir = i => { const th = T.ill[i][0] * Math.PI / 180, ph = T.ill[i][1] * Math.PI / 180; return new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)); };
  const vidx = (u, v, w) => { u = Math.round(u); v = Math.round(v); w = Math.round(w); return (((w % Q) + Q) % Q) * QQ + (((v % Q) + Q) % Q) * Q + (((u % Q) + Q) % Q); };
  /* Fourier diffraction theorem: one cap of the Ewald sphere per illumination, shifted by −k_in. No conjugate. */
  function addAngle(i) {
    T.idx = i; const k = kdir(i).multiplyScalar(K), cur = new Uint8Array(Q3);
    for (let ky = -KD; ky <= KD; ky += 0.4) for (let kx = -KD; kx <= KD; kx += 0.4) {
      const r2 = kx * kx + ky * ky; if (r2 > KD * KD) continue;
      const id = vidx(kx - k.x, ky - k.y, Math.sqrt(K * K - r2) - k.z); T.mask[id] = 1; cur[id] = 1;
    }
    T.cur = cur; addCapMesh(i); recon();
  }
  function recon() {
    const m = T.single && T.cur ? T.cur : T.mask, re = new Float64Array(Q3), im = new Float64Array(Q3); let any = false;
    for (let i = 0; i < Q3; i++) if (m && m[i]) { re[i] = T.Fre[i]; im[i] = T.Fim[i]; any = true; }
    if (any) fft3(re, im, true);
    T.rec = any ? re : null; updateRec();
  }

  /* ---- view 1: the scan ---- */
  const V1 = makeView($("t3-scan"), $("t3-scan-labels"), { pos: new THREE.Vector3(36, -46, 15), target: new THREE.Vector3(0, 0, -0.5), minD: 10, maxD: 130 });
  const glassMat = (c, o) => new THREE.MeshPhysicalMaterial({ color: c, transparent: true, opacity: o, roughness: 0.25, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), glassMat(soft, 0.2)); body.scale.set(3, 2.4, 1.5); V1.scene.add(body);
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), glassMat(soft.clone().lerp(new THREE.Color(1, 1, 1), 0.4), 0.32)); nuc.scale.set(1.2, 1.0, 0.8); nuc.position.set(-0.6, 0, 0); V1.scene.add(nuc);
  const nucl = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 14), glassMat(new THREE.Color(1, 1, 1), 0.5)); nucl.position.set(-0.8, 0.1, 0); V1.scene.add(nucl);
  const dropMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent.clone().multiplyScalar(0.25), roughness: 0.3 });
  drops.forEach(d => { const s = new THREE.Mesh(new THREE.SphereGeometry(d[3], 24, 16), dropMat); s.position.set(d[0], d[1], d[2]); V1.scene.add(s); });
  const slip = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 0.12), glassMat(soft, 0.1)); slip.position.z = -1.62; V1.scene.add(slip);
  /* condenser below and objective above, each drawn as a single lens wide enough to pass every illumination angle */
  const lensMat = new THREE.MeshPhysicalMaterial({ color: soft, transparent: true, opacity: 0.16, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x9aa6a0, metalness: 0.6, roughness: 0.35 });
  const LR = 14.5, LZ = 2.7;
  [LZ, -LZ].forEach(z => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 24), lensMat); l.scale.set(LR, LR, 0.55); l.position.z = z; V1.scene.add(l);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(LR, 0.2, 10, 120), rimMat); rim.position.z = z; V1.scene.add(rim);
  });
  /* illumination directions so far, on a hemisphere below the sample */
  const RH = 16, dirMat = new THREE.MeshBasicMaterial({ color: accent }), dirs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 10, 8), dirMat, 64); dirs.count = 0; V1.scene.add(dirs);
  const curDir = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); V1.scene.add(curDir);
  const ringMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.35 });
  let rings = [];
  function drawRings() {
    rings.forEach(r => V1.scene.remove(r)); rings = [];
    [T.range / 2, T.range].forEach(a => { if (a <= 0) return; const t = a * Math.PI / 180; rings.push(circleLine(RH * Math.sin(t), new THREE.Vector3(0, 0, -RH * Math.cos(t)), ringMat)); });
    rings.forEach(r => V1.scene.add(r));
  }
  /* the tilted plane wave: a beam column and wavefronts that lag where the cell delays the light */
  const beamMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 1, 48, 1, true), beamMat); V1.scene.add(beam);
  const NR = 10, NA = 48, discs = [];
  function discGeometry() {
    const pos = [], idx = []; pos.push(0, 0, 0);
    for (let r = 1; r <= NR; r++) for (let a = 0; a < NA; a++) { const rr = r / NR * 2.2, aa = a / NA * TAU; pos.push(rr * Math.cos(aa), rr * Math.sin(aa), 0); }
    for (let a = 0; a < NA; a++) idx.push(0, 1 + a, 1 + (a + 1) % NA);
    for (let r = 1; r < NR; r++) for (let a = 0; a < NA; a++) { const i0 = 1 + (r - 1) * NA + a, i1 = 1 + (r - 1) * NA + (a + 1) % NA, j0 = i0 + NA, j1 = i1 + NA; idx.push(i0, j0, j1, i0, j1, i1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
  }
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(discGeometry(), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    m.userData.base = Float32Array.from(m.geometry.attributes.position.array); discs.push(m); V1.scene.add(m);
  }
  const kl = V1.label("k_in", [0, 0, -10.8], "k");
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -9), 3.2, 0xffffff, 0.9, 0.55); V1.scene.add(arrow);
  let frame = { k: new THREE.Vector3(0, 0, 1), e1: new THREE.Vector3(1, 0, 0), e2: new THREE.Vector3(0, 1, 0) };
  /* optical delay through the cell for each wavefront vertex (exaggerated for display) */
  function computeDelays() {
    const k = frame.k, e1 = frame.e1, e2 = frame.e2, base = discs[0].userData.base, n = base.length / 3, d = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = base[i * 3], v = base[i * 3 + 1]; let s = 0;
      for (let t = -4; t <= 4; t += 0.1) { const p = e1.clone().multiplyScalar(u).addScaledVector(e2, v).addScaledVector(k, t); s += dn(p.x, p.y, p.z) * 0.1; }
      d[i] = s;
    }
    T.delays = d;
  }
  function setFrame(i) {
    const k = i >= 0 ? kdir(i) : new THREE.Vector3(0, 0, 1), ref = Math.abs(k.z) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const e1 = new THREE.Vector3().crossVectors(k, ref).normalize(), e2 = new THREE.Vector3().crossVectors(k, e1).normalize();
    frame = { k, e1, e2 };
    setBetween(beam, k.clone().multiplyScalar(-17), k.clone().multiplyScalar(12));
    beam.scale.x = beam.scale.z = 1;
    arrow.position.copy(k.clone().multiplyScalar(-20)); arrow.setDirection(k);
    curDir.position.copy(k.clone().multiplyScalar(-RH));
    kl.pos.copy(k).multiplyScalar(-20.8);
    computeDelays();
  }
  function updateDirs() {
    const m = new THREE.Matrix4(); dirs.count = Math.max(0, T.idx + 1);
    for (let j = 0; j <= T.idx; j++) { m.makeTranslation(kdir(j).multiplyScalar(-RH)); dirs.setMatrixAt(j, m); }
    dirs.instanceMatrix.needsUpdate = true;
  }
  function animateWaves(dt) {
    T.t += dt; const k = frame.k, q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(frame.e1, frame.e2, k));
    discs.forEach((m, i) => {
      const s = -16 + ((T.t * 2.6 + i * 4.6) % 28);          /* position along the beam */
      m.position.copy(k).multiplyScalar(s); m.quaternion.copy(q);
      m.material.opacity = Math.max(0, 0.26 - Math.max(0, Math.abs(s + 2) - 11) * 0.1);
      const pos = m.geometry.attributes.position.array, base = m.userData.base, d = T.delays;
      const lag = Math.max(0, Math.min(1, (s + 1.6) / 3.2));   /* the wavefront picks up the delay while crossing the cell */
      for (let j = 0; j < pos.length / 3; j++) pos[j * 3 + 2] = d ? -d[j] * 26 * lag : 0;
      m.geometry.attributes.position.needsUpdate = true;
    });
    V1.dirty = true;
  }
  V1.label(tx("Condenser", "Kondansör"), [0, -LR - 1.5, -LZ - 0.8]); V1.label(tx("Objective", "Objektif"), [0, -LR - 1.5, LZ + 0.8]);
  V1.label(tx("Illumination directions", "Aydınlatma yönleri"), [RH * 0.62, RH * 0.45, -RH * 0.62], "small");

  /* ---- view 2: Fourier space ---- */
  const V2 = makeView($("t3-k"), $("t3-k-labels"), { pos: new THREE.Vector3(66, -82, 20), target: new THREE.Vector3(0, 0, -1), minD: 30, maxD: 300 });
  const axMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  [[[-34, 0, 0], [34, 0, 0], "kx"], [[0, -34, 0], [0, 34, 0], "ky"], [[0, 0, -22], [0, 0, 22], "kz"]].forEach(a => {
    V2.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a[0]), new THREE.Vector3(...a[1])]), axMat));
    V2.label(a[2], new THREE.Vector3(...a[1]).multiplyScalar(1.1), "axis");
  });
  const capGeo = new THREE.SphereGeometry(K, 48, 10, 0, TAU, 0, CAP); capGeo.rotateX(Math.PI / 2);   /* cap around +z */
  const capMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.032, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const capGroup = new THREE.Group(); V2.scene.add(capGroup);
  const curCap = new THREE.Mesh(capGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  const curCapWire = new THREE.Mesh(capGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.22 }));
  const ewald = new THREE.Mesh(new THREE.SphereGeometry(K, 36, 18), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.025 }));
  const kArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -K), K, 0xffffff, 2.4, 1.4);
  [curCap, curCapWire, ewald, kArrow].forEach(o => { o.visible = false; V2.scene.add(o); });
  const kLab = V2.label("k_in", [0, 0, -K / 2], "k");
  function addCapMesh(i) {
    const c = kdir(i).multiplyScalar(-K), m = new THREE.Mesh(capGeo, capMat); m.position.copy(c); capGroup.add(m);
    [curCap, curCapWire, ewald].forEach(o => { o.position.copy(c); o.visible = true; });
    kArrow.position.copy(c); kArrow.setDirection(kdir(i)); kArrow.setLength(K, 2.4, 1.4); kArrow.visible = true;
    kLab.pos.copy(c).multiplyScalar(0.5); kLab.hide = false;
    V2.dirty = true;
  }
  function showCaps() { capGroup.visible = !T.single; ewald.visible = !T.single && T.idx >= 0; V2.dirty = true; }

  /* ---- view 3: reconstruction ---- */
  const V3 = makeView($("t3-rec"), $("t3-rec-labels"), { pos: new THREE.Vector3(9, -11, 6.5), target: new THREE.Vector3(0, 0, 0), minD: 5, maxD: 60 });
  const outerMat = new THREE.MeshPhysicalMaterial({ color: soft, transparent: true, opacity: 0.2, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const innerMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent.clone().multiplyScalar(0.2), roughness: 0.35 });
  const mcOuter = new MarchingCubes(Q, outerMat, false, false, 90000), mcInner = new MarchingCubes(Q, innerMat, false, false, 60000);
  [mcOuter, mcInner].forEach(m => { m.scale.setScalar(L / 2); V3.scene.add(m); });
  /* orthogonal sections (x–z through the droplets, x–y at the upper droplet) */
  function sectionPlane(w, h) { const tex = new THREE.DataTexture(new Uint8Array(Q * Q * 4), Q, Q); tex.magFilter = THREE.LinearFilter; tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })); m.userData.tex = tex; return m; }
  const secXZ = sectionPlane(L, L); secXZ.rotation.x = Math.PI / 2; V3.scene.add(secXZ);
  const ZD = Math.round(0.65 / DX), secXY = sectionPlane(L, L); secXY.position.z = ZD * DX; V3.scene.add(secXY);
  const frameBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L, L, L)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })); V3.scene.add(frameBox);
  const trueWire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 24, 12)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06 })); trueWire.scale.set(3, 2.4, 1.5); V3.scene.add(trueWire);
  const recLab = V3.label("", [-L / 2, -L / 2, L / 2 + 0.6], "small left");
  function fillSection(mesh, vol, kind) {
    const tex = mesh.userData.tex, d = tex.image.data, lut = PhiX.LUT_P, vals = new Float32Array(QQ);
    for (let a = 0; a < Q; a++) for (let b = 0; b < Q; b++) vals[a * Q + b] = kind === "xz" ? vol[a * QQ + (Q / 2) * Q + b] : vol[(Q / 2 + ZD) * QQ + a * Q + b];
    const sorted = Float32Array.from(vals).sort(), lo = sorted[Math.floor(QQ * 0.05)], hi = sorted[Math.floor(QQ * 0.97)];   /* robust contrast; the dense droplets saturate */
    for (let a = 0; a < Q; a++) for (let b = 0; b < Q; b++) {
      const v = vals[a * Q + b];
      let t = Math.round(Math.max(0, Math.min(1, (v - lo) / ((hi - lo) || 1))) * 255) * 3; const o = (a * Q + b) * 4;
      d[o] = lut[t]; d[o + 1] = lut[t + 1]; d[o + 2] = lut[t + 2]; d[o + 3] = 255;
    }
    tex.needsUpdate = true;
  }
  /* light 3×3×3 box smoothing for a cleaner outer surface */
  function smooth(v) {
    const a = new Float32Array(Q3), b = new Float32Array(Q3);
    for (let i = 1; i < Q3 - 1; i++) a[i] = (v[i - 1] + v[i] + v[i + 1]) / 3;
    for (let i = Q; i < Q3 - Q; i++) b[i] = (a[i - Q] + a[i] + a[i + Q]) / 3;
    for (let i = QQ; i < Q3 - QQ; i++) a[i] = (b[i - QQ] + b[i] + b[i + QQ]) / 3;
    return a;
  }
  function updateRec() {
    const vol = T.rec;
    if (!vol) { mcOuter.visible = mcInner.visible = secXZ.visible = secXY.visible = false; recLab.el.textContent = tx("no data yet", "henüz veri yok"); V3.dirty = true; return; }
    let hi = 1e-9; for (let i = 0; i < Q3; i++) if (vol[i] > hi) hi = vol[i];
    if (T.mode === "surfaces") {
      const fo = mcOuter.field, fi = mcInner.field, sm = smooth(vol);
      for (let i = 0; i < Q3; i++) { fo[i] = sm[i]; fi[i] = vol[i]; }
      mcOuter.isolation = 0.2 * hi; mcInner.isolation = 0.55 * hi; mcOuter.update(); mcInner.update();
    } else { fillSection(secXZ, vol, "xz"); fillSection(secXY, vol, "xy"); }
    mcOuter.visible = mcInner.visible = trueWire.visible = T.mode === "surfaces"; secXZ.visible = secXY.visible = T.mode === "sections";
    recLab.el.textContent = T.single && T.cur ? tx("one angle", "tek açı") : (T.idx + 1) + " / " + T.ill.length + tx(" angles", " açı");
    V3.dirty = true;
  }

  /* ---- linked cameras ---- */
  const views = [V1, V2, V3]; let syncing = false;
  views.forEach(v => v.controls.addEventListener("change", () => {
    if (syncing || !$("t3-link").checked) return; syncing = true;
    const dir = new THREE.Vector3().subVectors(v.camera.position, v.controls.target).normalize();
    views.forEach(o => { if (o === v) return; const dist = o.camera.position.distanceTo(o.controls.target); o.camera.position.copy(o.controls.target).addScaledVector(dir, dist); o.camera.lookAt(o.controls.target); o.controls.update(); o.dirty = true; });
    syncing = false;
  }));
  if (!PhiX.reduceMotion) { V1.controls.autoRotate = true; V1.controls.autoRotateSpeed = 0.6; }
  views.forEach(v => v.controls.addEventListener("start", () => { V1.controls.autoRotate = false; }));

  /* ---- scanning ---- */
  function describe() {
    let msg;
    if (T.idx < 0) msg = tx("<b>Press “Scan the illumination”.</b> The beam steps through normal incidence and two rings of directions, up to " + T.range + "°. Each angle adds one cap of the Ewald sphere to Fourier space.", "<b>“Aydınlatmayı tara” düğmesine basın.</b> Işın önce dik gelişten, sonra " + T.range + "°’ye kadar iki halka boyunca ilerler. Her açı Fourier uzayına Ewald küresinden bir kapak ekler.");
    else if (T.ill.length === 1) msg = tx("<b>No illumination scan.</b> With the beam fixed at normal incidence, one cap carries almost no information along z: the reconstruction stretches along z and the two droplets merge.", "<b>Aydınlatma taraması yok.</b> Işın dik gelişte sabitken tek bir kapak z boyunca neredeyse hiç bilgi taşımaz: rekonstrüksiyon z boyunca uzar ve iki damlacık birleşir.");
    else if (T.single) msg = tx("<b>One angle alone</b> fills a single cap. The reconstruction smears out along the illumination direction, and the two droplets on the right merge.", "<b>Tek bir açı</b> yalnızca bir kapağı doldurur. Rekonstrüksiyon aydınlatma yönü boyunca bulanıklaşır ve sağdaki iki damlacık birleşir.");
    else if (T.idx < T.ill.length - 1) msg = tx("<b>Angle " + (T.idx + 1) + " of " + T.ill.length + " (θ = " + Math.round(T.ill[T.idx][0]) + "°).</b> The wavefronts lag behind where the cell slows the light. Each hologram maps onto the cap of the Ewald sphere for that illumination, shifted by −k<sub>in</sub>; the caps add up into a volume of Fourier space.", "<b>Açı " + (T.idx + 1) + " / " + T.ill.length + " (θ = " + Math.round(T.ill[T.idx][0]) + "°).</b> Dalga cepheleri hücrenin ışığı yavaşlattığı yerlerde geride kalır. Her hologram, o aydınlatmanın −k<sub>in</sub> kadar kaydırılmış Ewald küresi kapağına karşılık gelir; kapaklar birikerek Fourier uzayında bir hacim oluşturur.");
    else msg = tx("<b>Synthesis complete.</b> " + T.ill.length + " caps fill a volume of Fourier space shaped like an apple with its core missing: the missing cone along kz. Its extent along kz sets the axial resolution, so the droplets 1.3 µm apart along z now separate in 3D.", "<b>Sentez tamamlandı.</b> " + T.ill.length + " kapak, Fourier uzayında çekirdeği eksik bir elmaya benzeyen bir hacmi doldurur: kz boyunca eksik koni. Bu hacmin kz yönündeki genişliği eksenel çözünürlüğü belirler; z boyunca 1,3 µm aralıklı damlacıklar artık 3B’de ayrılır.");
    $("t3-status").innerHTML = msg;
  }
  function step() {
    if (T.idx >= T.ill.length - 1) { stop(); describe(); return; }
    addAngle(T.idx + 1); setFrame(T.idx); updateDirs(); describe();
  }
  function play() {
    if (T.playing) { stop(); return; }
    if (T.idx >= T.ill.length - 1) reset(true);
    T.playing = true; $("t3-play").textContent = tx("Pause", "Duraklat"); T.timer = setInterval(step, 170);
  }
  function stop() { T.playing = false; clearInterval(T.timer); const b = $("t3-play"); if (b) b.textContent = T.idx >= 0 && T.idx < T.ill.length - 1 ? tx("Resume scan", "Taramaya devam et") : tx("Scan the illumination", "Aydınlatmayı tara"); }
  function reset(keepPlaying) {
    if (!keepPlaying) stop();
    T.mask = new Uint8Array(Q3); T.idx = -1; T.cur = null; capGroup.clear(); [curCap, curCapWire, ewald, kArrow].forEach(o => o.visible = false); kLab.hide = true;
    setFrame(-1); updateDirs(); drawRings(); recon(); describe(); views.forEach(v => v.dirty = true);
  }
  $("t3-play").addEventListener("click", play);
  $("t3-reset").addEventListener("click", () => reset());
  $("t3-range").max = THMAX; $("t3-range").value = T.range; $("t3-rangeOut").textContent = T.range + "°";
  $("t3-range").addEventListener("input", function () { T.range = +this.value; $("t3-rangeOut").textContent = this.value + "°"; setIll(); reset(); });
  $("t3-single").addEventListener("change", function () { T.single = this.checked; recon(); showCaps(); describe(); });
  root.querySelectorAll("[data-t3view]").forEach(btn => btn.addEventListener("click", () => {
    root.querySelectorAll("[data-t3view]").forEach(b => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
    T.mode = btn.getAttribute("data-t3view"); updateRec();
  }));

  /* ---- palette changes: recolour materials that used the old accent or soft colour ---- */
  let oldA = accent.getHex(), oldS = soft.getHex();
  document.addEventListener("phix:palette", () => {
    const nA = col("--accent-on-deep", "#E0B252"), nS = col("--on-deep-soft", "#CFE0D6");
    views.forEach(v => v.scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(m => {
      if (m.color && m.color.getHex() === oldA) { m.color.copy(nA); if (m.emissive) m.emissive.copy(nA).multiplyScalar(0.25); }
      else if (m.color && m.color.getHex() === oldS) m.color.copy(nS);
    }); }));
    oldA = nA.getHex(); oldS = nS.getHex(); updateRec(); views.forEach(v => v.dirty = true);
  });

  /* ---- render loop: only while visible ---- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (isShown(root)) {
      if (!PhiX.reduceMotion) animateWaves(dt);
      views.forEach(v => { v.controls.update(); if (v.dirty || v === V1) { v.render(); v.dirty = false; } });
    }
    requestAnimationFrame(loop);
  }
  build(); setIll(); reset(); requestAnimationFrame(loop);
  if (PhiX.reduceMotion) { for (let i = 0; i < T.ill.length; i++) { addAngle(i); } setFrame(T.idx); updateDirs(); describe(); }
  else setTimeout(play, 500);
}

/* ======================= 3D SET-UPS (all four) ======================= */
/* Visible wavelength (nm) to an sRGB colour, after Bruton’s approximation. */
function waveRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; } else r = 1;
  const f = nm < 420 ? 0.55 + 0.45 * (nm - 380) / 40 : nm > 680 ? 0.55 + 0.45 * (750 - nm) / 70 : 1;
  return [r, g, b].map(c => Math.round(255 * Math.pow(Math.max(0, c * f), 0.8)));
}
PhiX.waveRGB = waveRGB;
function makeSetup3D() {
  const box = document.getElementById("su-3d"); if (!box) return null;
  const canvas = document.getElementById("su-3d-canvas"), labelsBox = document.getElementById("su-3d-labels");
  let V = null, running = false, current = null, dyn = {}, pick = [], beams = [], lastNm = -1, lastArm = "";
  const H = 8, RB = 1.1, RL = 0.22;                       /* beam height, expanded and raw beam radii */
  const P = (x, y, z = H) => new THREE.Vector3(x, y, z), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  const INFO = {
    laser: tx("<b>Laser.</b> A coherent source, typically a helium–neon laser at 632.8 nm or a single-mode diode laser. Use the wavelength slider to change its colour.", "<b>Lazer.</b> Uyumlu (koherent) ışık kaynağı; genellikle 632,8 nm helyum–neon lazeri ya da tek modlu diyot lazer. Rengini dalga boyu kaydırıcısıyla değiştirin."),
    expander: tx("<b>Beam expander.</b> A diverging and a converging lens widen the laser so that it fills the field of view evenly.", "<b>Işın genişletici.</b> Iraksak ve yakınsak iki mercek lazeri genişletir; böylece görüş alanı düzgün aydınlanır."),
    led: tx("<b>LED.</b> A partially coherent source: its limited coherence suppresses speckle, while the pinhole gives enough spatial coherence for holography.", "<b>LED.</b> Kısmen koherent bir kaynak: sınırlı koherens benek gürültüsünü azaltır, iğne deliği ise holografi için yeterli uzaysal koherensi sağlar."),
    pinhole: tx("<b>Pinhole.</b> Filters the LED light into a nearly spherical wave that becomes almost plane at the sample, a few centimetres away.", "<b>İğne deliği.</b> LED ışığını neredeyse küresel bir dalgaya dönüştürür; birkaç santimetre ötedeki numunede dalga neredeyse düzlemseldir."),
    bs1: tx("<b>Beam splitter.</b> Divides the laser into the object arm and the reference arm.", "<b>Işın bölücü.</b> Lazeri nesne kolu ve referans kolu olarak ikiye ayırır."),
    bs: tx("<b>Beam splitter.</b> One cube both divides the light and recombines what comes back from the sample and the reference mirror.", "<b>Işın bölücü.</b> Tek bir küp hem ışığı böler hem de numuneden ve referans aynasından dönen ışığı birleştirir."),
    bs2: tx("<b>Combining beam splitter, slightly tilted.</b> It joins the object and reference waves just before the camera. Tilting it turns the reference by twice the tilt, so the two waves meet at a small angle and give the carrier fringes, while they still overlap on the sensor.", "<b>Birleştirici ışın bölücü, hafifçe eğik.</b> Nesne ve referans dalgalarını kameranın hemen önünde birleştirir. Eğilmesi referansı eğimin iki katı kadar döndürür; iki dalga küçük bir açıyla buluşup taşıyıcı saçakları oluşturur ve sensörde üst üste binmeye devam eder."),
    mirror: tx("<b>Mirror.</b> Folds the beam. The angle of incidence equals the angle of reflection.", "<b>Ayna.</b> Işını katlar; geliş açısı yansıma açısına eşittir."),
    refmirror: tx("<b>Reference mirror.</b> Close to the beam splitter and the camera, so its tilt mostly changes the angle of the reference wave on the camera rather than its position. That angle gives the off-axis carrier fringes.", "<b>Referans aynası.</b> Işın bölücüye ve kameraya yakındır; bu yüzden eğimi referans dalgasının kameradaki konumundan çok açısını değiştirir. Bu açı eksen dışı taşıyıcı saçakları verir."),
    galvo: tx("<b>Two-axis galvo mirror.</b> Its tilt sets the illumination direction; the mirror turns in a gimbal so that it always obeys the law of reflection. The relay lens and condenser image it onto the sample, so the angle changes while the lit spot stays put.", "<b>İki eksenli galvo ayna.</b> Eğimi aydınlatma yönünü belirler; ayna bir yalpa çemberi içinde döner ve her zaman yansıma yasasına uyar. Röle merceği ve kondansör onu numune üzerine görüntüler; böylece açı değişirken aydınlatılan nokta yerinde kalır."),
    relay: tx("<b>Relay lens.</b> With the condenser it forms a 4f system that images the galvo mirror onto the sample plane.", "<b>Röle merceği.</b> Kondansörle birlikte galvo aynayı numune düzlemine görüntüleyen bir 4f sistemi oluşturur."),
    cond: tx("<b>Condenser.</b> Turns the scanned beam into a tilted plane wave at the sample. Its numerical aperture limits the largest illumination angle.", "<b>Kondansör.</b> Taranan ışını numunede eğik bir düzlem dalgaya çevirir. Sayısal açıklığı en büyük aydınlatma açısını sınırlar."),
    sample: tx("<b>Sample.</b> Cells on a glass slide, held in a clamp on its own post.", "<b>Numune.</b> Kendi direğindeki bir kıskaçla tutulan cam lam üzerinde hücreler."),
    surface: tx("<b>Reflective sample.</b> Light goes down and back, so the measured phase is twice the height times 2π/λ.", "<b>Yansıtıcı numune.</b> Işık gidip geri döndüğü için ölçülen faz, yüksekliğin iki katının 2π/λ ile çarpımıdır."),
    obj: tx("<b>Microscope objective.</b> Collects the light from the sample within its numerical aperture. Drawn see-through so that you can follow the beam inside.", "<b>Mikroskop objektifi.</b> Numuneden gelen ışığı sayısal açıklığı içinde toplar. Işını içeride izleyebilmeniz için yarı saydam çizildi."),
    tube: tx("<b>Tube lens.</b> With the objective, forms the image of the sample on the camera.", "<b>Tüp merceği.</b> Objektifle birlikte numunenin görüntüsünü kamera üzerinde oluşturur."),
    tubemi: tx("<b>Tube lens.</b> Sits with the objective in the sample arm, so the reference wave reaches the camera without passing a lens: its tilt then changes only the angle, not the position, of the reference on the camera.", "<b>Tüp merceği.</b> Objektifle birlikte numune kolundadır; böylece referans dalgası kameraya bir mercekten geçmeden ulaşır ve eğimi referansın kameradaki konumunu değil yalnızca açısını değiştirir."),
    cam: tx("<b>Camera.</b> Records the hologram: the intensity of the object and reference waves added together where they overlap.", "<b>Kamera.</b> Hologramı, yani nesne ve referans dalgalarının üst üste bindiği yerde toplamlarının şiddetini kaydeder."),
    sensor: tx("<b>Image sensor.</b> Sits a fraction of a millimetre to a millimetre behind the sample, so its whole area is the field of view. Drag the distance slider to move the sample on its post.", "<b>Görüntü sensörü.</b> Numunenin bir milimetreden daha az ile bir milimetre arkasında durur; bu yüzden tüm yüzeyi görüş alanıdır. Numuneyi direğiyle birlikte taşımak için mesafe kaydırıcısını sürükleyin.")
  };
  const hint = tx(" <span class='hint'>Click another part, or drag to look around.</span>", " <span class='hint'>Başka bir parçaya tıklayın ya da etrafa bakmak için sürükleyin.</span>");
  function setInfo(k) { const s = document.getElementById("su-status"); if (s && INFO[k]) s.innerHTML = INFO[k] + hint; }

  /* ---------- materials ---------- */
  function mats() {
    const accent = col("--accent-on-deep", "#E0B252");
    return {
      accent,
      steel: new THREE.MeshStandardMaterial({ color: 0xc8cdd0, metalness: 0.9, roughness: 0.28 }),
      black: new THREE.MeshStandardMaterial({ color: 0x23282a, metalness: 0.55, roughness: 0.45 }),
      anod: new THREE.MeshStandardMaterial({ color: 0x15191b, metalness: 0.6, roughness: 0.38 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transmission: 1, thickness: 0.8, ior: 1.5, transparent: true, opacity: 0.5 }),
      cube: new THREE.MeshPhysicalMaterial({ color: 0xdfeff5, roughness: 0.03, transmission: 0.95, thickness: 2, ior: 1.52, transparent: true, opacity: 0.35 }),
      coat: new THREE.MeshStandardMaterial({ color: 0x9fd0e0, metalness: 1, roughness: 0.1, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
      mirror: new THREE.MeshStandardMaterial({ color: 0xf2f4f5, metalness: 1, roughness: 0.04 }),
      shell: new THREE.MeshStandardMaterial({ color: 0xd9dee0, metalness: 0.85, roughness: 0.3, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
      pcb: new THREE.MeshStandardMaterial({ color: 0x1f5a3a, roughness: 0.6 }),
      chip: new THREE.MeshStandardMaterial({ color: 0x2a2f45, metalness: 0.3, roughness: 0.3 }),
      cell: new THREE.MeshStandardMaterial({ color: accent, emissive: accent.clone().multiplyScalar(0.3), roughness: 0.4 }),
      led: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 }),
      red: new THREE.MeshStandardMaterial({ color: 0xc9302c, metalness: 0.4, roughness: 0.4 })
    };
  }
  /* ---------- building blocks: every part sits on its own post, all in one group ---------- */
  const shadow = o => { o.traverse(m => { if (m.isMesh) m.castShadow = true; }); return o; };
  function addPick(o, key) { o.traverse(m => { if (m.isMesh) { m.userData.key = key; pick.push(m); } }); }
  function label(text, pos, key) { return V.label(text, pos, "setup", () => setInfo(key)); }
  /* post, post holder and base from the table up to height top, at local (0,0) of group g */
  function post(g, top, M, dx = 0, dy = 0) {
    const ph = Math.min(top * 0.42, 3.2), base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 0.5), M.black); base.position.set(dx, dy, 0.25); g.add(base);
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, ph, 24), M.black); holder.rotation.x = Math.PI / 2; holder.position.set(dx, dy, 0.5 + ph / 2); g.add(holder);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, top - 0.5 - ph * 0.5, 24), M.steel); rod.rotation.x = Math.PI / 2; rod.position.set(dx, dy, 0.5 + ph * 0.5 + (top - 0.5 - ph * 0.5) / 2); g.add(rod);
  }
  function part(x, y, M, top, key) { const g = new THREE.Group(); g.position.set(x, y, 0); if (top) post(g, top, M); V.scene.add(g); g.userData.key = key; return g; }
  function head(g) { const h = new THREE.Group(); h.position.z = H; g.add(h); return h; }
  /* orient so that local z = n and local y points up as far as possible */
  function orientUp(o, n) {
    const z = n.clone().normalize(); let up = Z.clone().addScaledVector(z, -z.dot(Z)); if (up.lengthSq() < 1e-6) up = Y.clone();
    up.normalize(); const x = new THREE.Vector3().crossVectors(up, z); o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, z));
  }
  function lensPart(x, y, axis, r, M, key, text, o = {}) {
    const g = part(x, y, M, H - r - 0.42, key), h = head(g);
    const l = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), M.glass); l.scale.set(r, r, r * (o.thick || 0.16)); h.add(l);
    h.add(new THREE.Mesh(new THREE.TorusGeometry(r + 0.18, 0.22, 12, 56), M.black)); orientUp(h, axis);
    shadow(g); addPick(g, key); if (text) label(text, P(x, y, o.below ? H - r - 2.4 : H + r + 1.4), key); return g;
  }
  function mirrorPart(x, y, n, M, key, text, r = 1.8) {
    const g = part(x, y, M, H - r * 1.25, key), h = head(g);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.25, 40), M.mirror); m.rotation.x = Math.PI / 2; h.add(m);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(r * 2.5, r * 2.5, 0.5), M.black); plate.position.z = -0.4; h.add(plate);
    [[1, 1], [-1, 1], [1, -1]].forEach(([a, b]) => { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 12), M.steel); k.rotation.x = Math.PI / 2; k.position.set(a * r, b * r, -0.9); h.add(k); });
    orientUp(h, n); shadow(g); addPick(g, key); if (text) label(text, P(x, y, H + r + 1.6), key); g.userData.head = h; return g;
  }
  function cubePart(x, y, n, M, key, text, tilt = 0) {
    const g = part(x, y, M, H - 1.7, key), h = head(g);
    h.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), M.cube));
    const d = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), M.coat); orientUp(d, n); h.add(d);
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 0.4), M.black); base.position.z = -1.5; g.add(base); base.position.set(0, 0, H - 1.5);
    h.rotation.z = tilt; g.userData.head = h; shadow(g); addPick(g, key); if (text) label(text, P(x, y, H + 2.9), key); return g;
  }
  function laserPart(x, y, M, text) {                      /* points along +x; returns its aperture */
    const g = part(x, y, M, 0, "laser"), h = head(g);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 12, 40), M.black); body.rotation.z = Math.PI / 2; body.position.x = -6.6; h.add(body);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 1.2, 40), M.red); band.rotation.z = Math.PI / 2; band.position.x = -3.6; h.add(band);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.0, 1.2, 24), M.steel); cap.rotation.z = Math.PI / 2; cap.position.x = -0.6; h.add(cap);
    [-10.6, -2.6].forEach(lx => { const v = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.6, H - 1.2), M.black); v.position.set(lx, 0, (H - 1.2) / 2); g.add(v); });
    shadow(g); addPick(g, "laser"); label(text, P(x - 6.6, y, H + 2.8), "laser"); return P(x, y);
  }
  function cameraPart(x, y, dir, M, text) {                /* sensor at (x,y), body behind it along dir */
    const g = part(x + 2.8 * dir.x, y + 2.8 * dir.y, M, H - 2.2, "cam"), h = head(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(5, 4.4, 4.4), M.anod); h.add(body);
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.9, 32), M.steel); mount.rotation.z = Math.PI / 2; mount.position.x = -2.6; h.add(mount);
    const sensor = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), M.chip); sensor.rotation.y = -Math.PI / 2; sensor.position.x = -2.5; h.add(sensor);
    h.rotation.z = Math.atan2(dir.y, dir.x); shadow(g); addPick(g, "cam"); label(text, P(x + 2.8 * dir.x, y + 2.8 * dir.y, H + 3.4), "cam");
  }
  function objectivePart(x, y, axis, M, text, r = 2.2) {   /* front lens at (x,y), barrel along axis */
    const g = new THREE.Group(); g.position.set(x, y, 0); V.scene.add(g);
    const h = head(g), barrel = new THREE.Group(); h.add(barrel);
    const pts = [[0, 0], [r * 0.62, 0], [r * 0.7, 0.6], [r, 1.6], [r, 4.4], [r * 1.12, 4.6], [r * 1.12, 5.6], [r, 5.8], [r, 7.2]].map(p => new THREE.Vector2(p[0], p[1]));
    const shell = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), M.shell); shell.rotation.x = Math.PI / 2; barrel.add(shell);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.005, r * 1.005, 0.35, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8b13a, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide })); ring.rotation.x = Math.PI / 2; ring.position.z = 3.0; barrel.add(ring);
    const front = new THREE.Mesh(new THREE.SphereGeometry(r * 0.6, 32, 16), M.glass); front.scale.z = 0.35; front.position.z = 0.15; barrel.add(front);
    orientUp(barrel, axis);
    const c = axis.clone().multiplyScalar(4.2), clamp = new THREE.Mesh(new THREE.TorusGeometry(r + 0.12, 0.3, 12, 48), M.black); orientUp(clamp, axis); clamp.position.set(c.x, c.y, H); g.add(clamp);
    post(g, H - r - 0.3, M, c.x, c.y); shadow(g); addPick(g, "obj"); label(text, P(x + c.x, y + c.y, H + r + 1.4), "obj"); return g;
  }
  function slidePart(x, y, n, M, key, text, cells = true) {
    const g = part(x, y, M, H - 3.55, key), h = head(g);
    h.add(new THREE.Mesh(new THREE.BoxGeometry(4.4, 5.6, 0.16), M.glass));
    if (cells) [[0.6, 0.5], [-0.8, -0.4], [0.2, -1.2]].forEach(c => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), M.cell); m.position.set(c[0], c[1], 0.15); m.scale.z = 0.5; h.add(m); });
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.8, 1.2), M.black); clamp.position.set(0, -3.15, 0); h.add(clamp);
    orientUp(h, n); shadow(g); addPick(g, key); if (text) g.userData.label = label(text, P(x, y, H + 3.9), key); return g;
  }
  /* ---------- beams: translucent core, glow and flowing light, coloured by the wavelength ---------- */
  const dashCanvas = document.createElement("canvas"); dashCanvas.width = 8; dashCanvas.height = 64;
  { const c = dashCanvas.getContext("2d"), gr = c.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.45, "rgba(255,255,255,1)"); gr.addColorStop(0.55, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 8, 64); }
  function beam(a, b, r1, r2, arm) {
    const g = new THREE.Group(), add = (geo, mat, base) => { const m = new THREE.Mesh(geo, mat); m.userData.base = base; g.add(m); return m; };
    add(new THREE.CylinderGeometry(r2, r1, 1, 32, 1, true), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }), 0.3);
    const tex = new THREE.CanvasTexture(dashCanvas); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    add(new THREE.CylinderGeometry(Math.min(r2, 0.3), Math.min(r1, 0.3), 1, 16, 1, true), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }), 1);
    add(new THREE.CylinderGeometry(r2 * 1.25, r1 * 1.25, 1, 32, 1, true), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), 0.08);
    V.scene.add(g); const s = { g, tex, arm, r1, r2 }; beams.push(s); setBeam(s, a, b); return s;
  }
  function setBeam(s, a, b) {
    const d = new THREE.Vector3().subVectors(b, a), len = Math.max(1e-3, d.length());
    s.g.position.copy(a).addScaledVector(d, 0.5); s.g.quaternion.setFromUnitVectors(Y, d.normalize()); s.g.scale.set(1, len, 1); s.tex.repeat.set(1, len / 2.4);
  }
  function path(pts, arm, r = RB) { const out = []; for (let i = 0; i < pts.length - 1; i++) out.push(beam(pts[i], pts[i + 1], r, r, arm)); return out; }
  function setPath(segs, pts) { segs.forEach((s, i) => setBeam(s, pts[i], pts[i + 1])); }
  /* laser, expander (diverging then collimating lens) and the expanded beam up to point `to` */
  function source(M, x, y, to) {
    const ap = laserPart(x, y, M, tx("Laser", "Lazer"));
    lensPart(x + 4, y, X, 0.7, M, "expander", tx("Beam expander", "Işın genişletici"), { below: true, thick: 0.25 });
    lensPart(x + 10, y, X, 1.7, M, "expander", null);
    beam(ap, P(x + 4, y), RL, RL, "src"); beam(P(x + 4, y), P(x + 10, y), RL, RB, "src"); beam(P(x + 10, y), to, RB, RB, "src");
  }
  const reflectNormal = (din, dout) => new THREE.Vector3().subVectors(dout.clone().normalize(), din.clone().normalize()).normalize();
  const reflect = (d, n) => d.clone().addScaledVector(n, -2 * d.dot(n));
  const rotZ = (v, a) => new THREE.Vector3(v.x * Math.cos(a) - v.y * Math.sin(a), v.x * Math.sin(a) + v.y * Math.cos(a), v.z);
  const deg = Math.PI / 180, tilt = () => (PhiX.scan ? PhiX.scan.tilt : 1.5);

  /* ---------- scene ---------- */
  function baseScene() {
    if (V) { V.controls.dispose(); V.renderer.dispose(); labelsBox.innerHTML = ""; }
    V = makeView(canvas, labelsBox, { pos: new THREE.Vector3(-6, -50, 36), target: new THREE.Vector3(2, 0, 6), fov: 32, minD: 15, maxD: 170 });
    V.renderer.shadowMap.enabled = true; V.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    V.renderer.toneMapping = THREE.ACESFilmicToneMapping; V.renderer.toneMappingExposure = 1.05;
    const pm = new THREE.PMREMGenerator(V.renderer); V.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-20, -25, 45); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 30, bottom: -30, near: 1, far: 140 }); V.scene.add(sun);
    const tc = document.createElement("canvas"); tc.width = tc.height = 256; const t2 = tc.getContext("2d");
    t2.fillStyle = "#2a3133"; t2.fillRect(0, 0, 256, 256); t2.fillStyle = "#131718";
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { t2.beginPath(); t2.arc(16 + i * 32, 16 + j * 32, 4.5, 0, TAU); t2.fill(); }
    const tex = new THREE.CanvasTexture(tc); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(8.4, 4.4); tex.colorSpace = THREE.SRGBColorSpace;
    const table = new THREE.Mesh(new THREE.BoxGeometry(84, 44, 1.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.2 })); table.position.set(-2, 0, -0.8); table.receiveShadow = true; V.scene.add(table);
    pick = []; beams = []; dyn = {}; lastNm = -1; lastArm = "";
    return mats();
  }
  function buildMZ(M) {
    source(M, -31, -10, P(-15, -10));
    cubePart(-15, -10, reflectNormal(X, Y), M, "bs1", tx("Beam splitter", "Işın bölücü"));
    mirrorPart(-15, 10, reflectNormal(Y, X), M, "mirror", tx("Mirror", "Ayna"));
    slidePart(-7, 10, X, M, "sample", tx("Sample", "Numune"));
    objectivePart(-5.2, 10, X, M, tx("Objective", "Objektif"));
    lensPart(8, 10, X, 2.4, M, "tube", tx("Tube lens", "Tüp merceği"));
    mirrorPart(16, -10, reflectNormal(X, Y), M, "mirror", tx("Mirror", "Ayna"));
    dyn.bs2 = cubePart(16, 10, reflectNormal(Y, X), M, "bs2", tx("Tilted beam splitter", "Eğik ışın bölücü"));
    cameraPart(20.6, 10, X, M, tx("Camera", "Kamera"));
    path([P(-15, -10), P(-15, 10), P(16, 10), P(20.6, 10)], "obj");
    dyn.ref = path([P(-15, -10), P(16, -10), P(16, 10), P(20.6, 10)], "ref");
    dyn.update = () => {
      const a = tilt() * 2 * deg, n = rotZ(reflectNormal(Y, X), a), out = reflect(Y, n);    /* tilting the combiner turns the reference by 2a */
      dyn.bs2.userData.head.rotation.z = a;
      const hit = P(16, 10).addScaledVector(out, 4.6 / out.x);
      setPath(dyn.ref, [P(-15, -10), P(16, -10), P(16, 10), hit]);
    };
    V.camera.position.set(-9, -62, 44); V.controls.target.set(-9, 0, 4);
  }
  function buildMI(M) {
    const bx = -12;
    source(M, -31, 0, P(bx, 0));
    const nbs = reflectNormal(X, Y.clone().negate());
    cubePart(bx, 0, nbs, M, "bs", tx("Beam splitter", "Işın bölücü"));
    lensPart(bx, -3.0, Y, 2.3, M, "tubemi", tx("Tube lens", "Tüp merceği"), { below: true });
    objectivePart(bx, -11.4, Y, M, tx("Objective", "Objektif"), 2.0);
    const sg = part(bx, -13.4, M, H - 3.0, "surface"), sh = head(sg);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 6), M.mirror); sh.add(plate);
    [[-1.2, 0.8], [1.0, -0.6], [0.2, 1.4]].forEach(c => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10), M.mirror); b.scale.y = 0.35; b.position.set(c[0], 0.3, c[1]); sh.add(b); });
    shadow(sg); addPick(sg, "surface"); label(tx("Reflective sample", "Yansıtıcı numune"), P(bx, -13.4, H + 4.4), "surface");
    dyn.mr = mirrorPart(bx + 5.5, 0, X.clone().negate(), M, "refmirror", tx("Reference mirror", "Referans aynası"), 1.4);
    cameraPart(bx, 4.0, Y, M, tx("Camera", "Kamera"));
    path([P(bx - 0.25, 0), P(bx - 0.25, -13.1)], "obj"); path([P(bx + 0.25, -13.1), P(bx + 0.25, 4.0)], "obj");
    dyn.ref = path([P(bx, 0), P(bx + 5.5, 0), P(bx, 0), P(bx, 4)], "ref");
    dyn.update = () => {
      const a = tilt() * 1 * deg, n = rotZ(X.clone().negate(), a), back = reflect(X, n);  /* mirror tilt a turns the beam by 2a */
      dyn.mr.userData.head.quaternion.identity(); orientUp(dyn.mr.userData.head, n);
      const m = P(bx + 5.5, 0), t = new THREE.Vector3().subVectors(P(bx, 0), m).dot(nbs) / back.dot(nbs), b = m.clone().addScaledVector(back, t);
      const down = reflect(back, nbs), c = b.clone().addScaledVector(down, (4.0 - b.y) / down.y);
      setPath(dyn.ref, [P(bx, 0), m, b, c]);
    };
    V.camera.position.set(14, -48, 40); V.controls.target.set(-15, -3, 5);
  }
  function buildInline(M) {
    const led = part(-22, 0, M, H - 2, "led"), lh = head(led);
    lh.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 4), M.pcb));
    dyn.ledDome = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 12, 0, TAU, 0, Math.PI / 2), M.led); dyn.ledDome.rotation.z = -Math.PI / 2; dyn.ledDome.position.x = 0.15; lh.add(dyn.ledDome);
    shadow(led); addPick(led, "led"); label("LED", P(-22, 0, H + 3), "led");
    const ph = part(-17, 0, M, H - 2.2, "pinhole"), phh = head(ph);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.2, 40), M.anod); plate.rotation.z = Math.PI / 2; phh.add(plate);
    dyn.hole = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: 0xffffff })); dyn.hole.rotation.y = Math.PI / 2; dyn.hole.position.x = 0.12; phh.add(dyn.hole);
    shadow(ph); addPick(ph, "pinhole"); label(tx("Pinhole", "İğne deliği"), P(-17, 0, H + 3), "pinhole");
    const sen = part(12.4, 0, M, H - 4.5, "sensor"), sh = head(sen);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 9), M.pcb); sh.add(board);
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.5, 5.5), M.chip); chip.position.x = -0.35; sh.add(chip);
    shadow(sen); addPick(sen, "sensor"); label(tx("Image sensor", "Görüntü sensörü"), P(12.4, 0, H + 5.8), "sensor");
    dyn.sample = slidePart(8, 0, X, M, "sample", tx("Sample", "Numune"));
    /* expanding wavefronts from the pinhole, and wavelets scattered by the cells */
    const capGeo = new THREE.SphereGeometry(1, 40, 10, 0, TAU, 0, 0.3); capGeo.rotateZ(-Math.PI / 2);
    dyn.waves = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(capGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })); V.scene.add(m); dyn.waves.push(m); }
    const wl = new THREE.SphereGeometry(1, 24, 10, 0, TAU, 0, Math.PI / 2.2); wl.rotateZ(-Math.PI / 2);
    dyn.wavelets = []; [[0.6, 0.5], [-0.8, -0.4], [0.2, -1.2]].forEach((c, i) => { for (let k = 0; k < 2; k++) { const m = new THREE.Mesh(wl, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); m.userData = { c, ph: k * 0.5 + i * 0.17 }; V.scene.add(m); dyn.wavelets.push(m); } });
    dyn.cone = new THREE.Mesh(new THREE.ConeGeometry(4.2, 29, 40, 1, true), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }));
    dyn.cone.rotation.z = Math.PI / 2; dyn.cone.position.copy(P(-2.5, 0)); V.scene.add(dyn.cone);
    dyn.update = (t, c3) => {
      const z = PhiX.scan ? PhiX.scan.z : 600, gap = 0.7 + (z - 100) / 1400 * 5.3, sx = 12.2 - gap;
      dyn.sample.position.x = sx; if (dyn.sample.userData.label) dyn.sample.userData.label.pos.set(sx, 0, H + 3.9);   /* sample, clamp and post move together */
      dyn.waves.forEach((m, i) => { const r = 0.5 + ((t * 7 + i * 5) % 30); m.scale.setScalar(r); m.position.set(-17, 0, H); m.material.opacity = -17 + r > sx ? 0 : 0.3 * (1 - r / 32); m.material.color.copy(c3); });
      dyn.wavelets.forEach(m => { const r = ((t * 0.9 + m.userData.ph) % 1) * gap; m.scale.setScalar(Math.max(0.05, r)); m.position.set(sx + 0.1, m.userData.c[0], H + m.userData.c[1]); m.material.opacity = 0.5 * (1 - r / gap); m.material.color.copy(c3).lerp(new THREE.Color(1, 1, 1), 0.35); });
      dyn.cone.material.color.copy(c3); dyn.ledDome.material.emissive.copy(c3); dyn.hole.material.color.copy(c3);
    };
    V.camera.position.set(-6, -44, 26); V.controls.target.set(-5, 0, 7);
  }
  function buildTomo(M) {
    source(M, -31, -10, P(-15, -10));
    cubePart(-15, -10, reflectNormal(X, Y), M, "bs1", tx("Beam splitter", "Işın bölücü"));
    /* two-axis galvo: a yoke turns about the vertical axis on a motor block that sits on the post; the mirror pivots in the yoke */
    const gv = part(-15, 10, M, H - 3.5, "galvo");
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.4, 32), M.anod); motor.rotation.x = Math.PI / 2; motor.position.z = H - 2.8; gv.add(motor);
    const yoke = new THREE.Group(); yoke.position.z = H; gv.add(yoke);
    const yb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.8, 0.4), M.anod); yb.position.z = -2.05; yoke.add(yb);
    [-2.25, 2.25].forEach(yy => { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 2.3), M.anod); arm.position.set(0, yy, -0.95); yoke.add(arm);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12), M.steel); pin.position.set(0, yy * 0.9, 0); yoke.add(pin); });
    const tiltG = new THREE.Group(); yoke.add(tiltG);
    const gm = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.2, 40), M.mirror); gm.rotation.z = Math.PI / 2; tiltG.add(gm);
    const gr = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.12, 10, 40), M.anod); gr.rotation.y = Math.PI / 2; tiltG.add(gr);
    shadow(gv); addPick(gv, "galvo"); label(tx("Galvo mirror", "Galvo ayna"), P(-15, 10, H + 3), "galvo");
    lensPart(-9, 10, X, 2.8, M, "relay", tx("Relay lens", "Röle merceği"));
    lensPart(1, 10, X, 3.2, M, "cond", tx("Condenser", "Kondansör"), { below: true, thick: 0.26 });
    slidePart(5, 10, X, M, "sample", null); label(tx("Sample", "Numune"), P(4.4, 10, H + 4.0), "sample");
    objectivePart(6.4, 10, X, M, tx("Objective", "Objektif"), 2.6);
    lensPart(15, 10, X, 2.6, M, "tube", tx("Tube lens", "Tüp merceği"), { below: true });
    mirrorPart(20, -10, reflectNormal(X, Y), M, "mirror", tx("Mirror", "Ayna"));
    const bt = 3 * deg; cubePart(20, 10, reflectNormal(Y, X), M, "bs2", tx("Tilted beam splitter", "Eğik ışın bölücü"), bt);
    cameraPart(24.6, 10, X, M, tx("Camera", "Kamera"));
    path([P(-15, -10), P(-15, 10)], "obj");
    const out = reflect(Y, rotZ(reflectNormal(Y, X), bt));
    path([P(-15, -10), P(20, -10), P(20, 10), P(20, 10).addScaledVector(out, 4.6 / out.x)], "ref");
    dyn.ray = path([P(-15, 10), P(-9, 10), P(1, 10), P(5, 10), P(8, 10), P(15, 10), P(24.6, 10)], "obj", 1.0);
    dyn.waves = []; for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })); V.scene.add(w); dyn.waves.push(w); }
    dyn.readout = V.label("", P(5, 3.5, H - 5.5), "setup readout");
    dyn.update = (t, c3) => {
      const U = PhiX.scan || { phi: 0, rho: 0.8 }, dy = 2.0 * U.rho * Math.cos(U.phi), dz = 2.0 * U.rho * Math.sin(U.phi);
      const pts = [P(-15, 10), P(-9, 10 + dy, H + dz), P(1, 10 + dy, H + dz), P(5, 10), P(8, 10 - 0.75 * dy, H - 0.75 * dz), P(15, 10 - 0.75 * dy, H - 0.75 * dz), P(24.6, 10)];
      setPath(dyn.ray, pts);
      /* law of reflection: the mirror normal bisects the incoming and outgoing beams */
      const n = reflectNormal(Y, new THREE.Vector3().subVectors(pts[1], pts[0]));
      yoke.rotation.z = Math.atan2(n.y, n.x); tiltG.rotation.y = -Math.asin(Math.max(-1, Math.min(1, n.z)));
      const dir = new THREE.Vector3().subVectors(pts[3], pts[2]).normalize(), q = new THREE.Quaternion().setFromUnitVectors(Z, dir);
      dyn.waves.forEach((w, i) => { const s = -3.4 + ((t * 1.6 + i * 0.85) % 3.4); w.position.copy(pts[3]).addScaledVector(dir, s); w.quaternion.copy(q); w.material.opacity = 0.5 - Math.abs(s + 1.7) * 0.2; w.material.color.copy(c3).lerp(new THREE.Color(1, 1, 1), 0.3); });
      dyn.readout.el.textContent = "θ = " + Math.round(70 * U.rho) + "°, φ = " + Math.round(((U.phi * 180 / Math.PI) % 360 + 360) % 360) + "°";
    };
    V.camera.position.set(-9, -64, 44); V.controls.target.set(-9, 0, 4);
  }
  const builders = { mz: buildMZ, mi: buildMI, inline: buildInline, tomo: buildTomo };
  function build(key) { const M = baseScene(); builders[key](M); V.controls.update(); current = key; }
  /* click a part to explain it */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
  canvas.addEventListener("pointerdown", e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", e => {
    if (!down || !V || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, V.camera); const hit = ray.intersectObjects(pick, false)[0]; if (hit) setInfo(hit.object.userData.key);
  });
  const t0 = performance.now(), c3 = new THREE.Color();
  function loop(now) {
    if (!running) return;
    if (isShown(box) && V) {
      const U = PhiX.scan || {}, t = (now - t0) / 1000, playing = U.playing !== false, nm = U.lambda || 633, arm = U.arm || "both";
      if (nm !== lastNm) { const rgb = waveRGB(nm); c3.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace); }
      if (nm !== lastNm || arm !== lastArm) {
        beams.forEach(s => { const f = s.arm === "src" || arm === "both" || arm === s.arm ? 1 : 0.1;
          s.g.children.forEach(m => { m.material.color.copy(c3); if (m.userData.base === 1) m.material.color.lerp(new THREE.Color(1, 1, 1), 0.45); m.material.opacity = m.userData.base * f; }); });
        lastNm = nm; lastArm = arm;
      }
      if (playing) beams.forEach(s => { s.tex.offset.y = -t * 1.2; });
      if (dyn.update) dyn.update(playing ? t : 0, c3);
      V.controls.update(); V.render();
    }
    requestAnimationFrame(loop);
  }
  return {
    start(key) { if (!V || key !== current) build(key); if (!running) { running = true; requestAnimationFrame(loop); } },
    stop() { running = false; },
    repaint() { if (current) { const k = current; current = null; build(k); } }
  };
}

/* ======================= START-UP ======================= */
if (webglOK() && PhiX.getFFT) {
  const t3 = document.getElementById("t3"), classic = document.getElementById("tomo");
  if (t3) {
    PhiX.tomo3dActive = true;
    t3.hidden = false; if (classic) classic.hidden = true;
    if (PhiX.initFns) PhiX.initFns.tomo = initTomo3D;
    onVisible(t3, initTomo3D);
  }
  const s3 = makeSetup3D();
  if (s3) { PhiX.setup3d = s3; if (PhiX.setupsShow) PhiX.setupsShow(); document.addEventListener("phix:palette", () => s3.repaint()); }
}
