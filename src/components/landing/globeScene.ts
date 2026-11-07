import * as THREE from 'three';
import type { SceneBuilder } from './ThreeScene';
import { heroMotion } from './scenes';

/* ---------------------------------------------------------------------------
 * Hero globe — a real Earth drawn as a dot-matrix of land (Natural Earth data
 * via world-atlas), facing India. Lead pings rise from Indian cities, pulses
 * travel between offices, and lead cards lift off the map into the pipeline.
 * `heroMotion.progress` (0 → 1) assembles the land dots from scattered space,
 * which the preloader hand-off drives.
 * ------------------------------------------------------------------------- */

const R = 1.9;

function prng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 100000) / 100000;
  };
}

function latLonToVec(lat: number, lon: number, r: number, out = new THREE.Vector3()) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function softDot() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* Rasterise the land polygons into a mask we can sample. */
async function landMask(w: number, h: number): Promise<Uint8ClampedArray | null> {
  const [{ feature }, topo] = await Promise.all([
    import('topojson-client'),
    import('world-atlas/land-110m.json'),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = topo as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const land = feature(t, t.objects.land) as any;
  const geoms = land.type === 'FeatureCollection' ? land.features.map((f: { geometry: unknown }) => f.geometry) : [land.geometry];
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  const drawRing = (ring: number[][]) => {
    ring.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * w;
      const y = ((90 - lat) / 180) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  };
  geoms.forEach((g: { type: string; coordinates: number[][][] | number[][][][] }) => {
    if (g.type === 'Polygon') (g.coordinates as number[][][]).forEach(drawRing);
    else if (g.type === 'MultiPolygon') (g.coordinates as number[][][][]).forEach((poly) => poly.forEach(drawRing));
  });
  ctx.fill('evenodd');
  return ctx.getImageData(0, 0, w, h).data;
}

const BODY_VERT = `
  varying vec3 vN; varying vec3 vV;
  void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }
`;
const BODY_FRAG = `
  uniform vec3 uDark; uniform vec3 uLit; uniform vec3 uLightDir; varying vec3 vN; varying vec3 vV;
  void main(){
    vec3 n = normalize(vN);
    float lambert = dot(n, normalize(uLightDir)) * 0.5 + 0.5;
    vec3 col = mix(uDark, uLit, pow(clamp(lambert,0.0,1.0), 1.8));
    float rim = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 3.0);
    col += uLit * rim * 0.6;
    // Soft specular highlight so the body reads as glossy.
    vec3 h = normalize(normalize(uLightDir) + normalize(vV));
    col += vec3(0.6, 0.8, 1.0) * pow(max(dot(n, h), 0.0), 60.0) * 0.18;
    gl_FragColor = vec4(col, 1.0);
  }
`;
const ATMO_FRAG = `
  uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
  void main(){ float d = dot(normalize(vN), normalize(vV)); float g = pow(max(0.62 - d, 0.0), 6.0) * 0.55; gl_FragColor = vec4(uColor, clamp(g,0.0,1.0)); }
`;

const DOT_VERT = `
  attribute vec3 aScatter; attribute float aSeed; attribute float aSize;
  uniform float uProgress; uniform float uPixelRatio;
  varying float vFacing; varying float vSeed;
  void main(){
    float p = clamp((uProgress - aSeed * 0.3) / 0.7, 0.0, 1.0);
    p = 1.0 - pow(1.0 - p, 3.0);
    vec3 pos = mix(aScatter, position, p);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vec3 n = normalize(normalMatrix * normalize(position));
    vFacing = dot(n, normalize(-mv.xyz));
    vSeed = aSeed;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (16.0 / -mv.z);
  }
`;
const DOT_FRAG = `
  uniform sampler2D uMap; uniform vec3 uColor; uniform vec3 uHot; uniform float uProgress;
  varying float vFacing; varying float vSeed;
  void main(){
    vec4 tex = texture2D(uMap, gl_PointCoord);
    float front = smoothstep(-0.15, 0.55, vFacing);
    vec3 col = mix(uColor, uHot, step(0.985, vSeed));
    gl_FragColor = vec4(col, tex.a * front * (0.35 + 0.65 * uProgress));
  }
`;

const CITIES: { name: string; lat: number; lon: number; hub?: boolean }[] = [
  { name: 'Mumbai', lat: 19.08, lon: 72.88, hub: true },
  { name: 'Pune', lat: 18.52, lon: 73.86 },
  { name: 'Bengaluru', lat: 12.97, lon: 77.59 },
  { name: 'Hyderabad', lat: 17.39, lon: 78.49 },
  { name: 'Delhi NCR', lat: 28.61, lon: 77.21 },
  { name: 'Chennai', lat: 13.08, lon: 80.27 },
  { name: 'Ahmedabad', lat: 23.02, lon: 72.57 },
  { name: 'Kolkata', lat: 22.57, lon: 88.36 },
];

const LEAD_FEED = [
  ['Rohit Nair', 'Pune', '₹85L–1.1Cr', 'Housing.com'],
  ['Sneha Kulkarni', 'Mumbai', '₹1.4–1.8Cr', '99acres'],
  ['Arjun Mehta', 'Bengaluru', '₹72–90L', 'MagicBricks'],
  ['Kavita Reddy', 'Hyderabad', '₹55–68L', 'Walk-in'],
  ['Imran Qureshi', 'Delhi NCR', '₹95L–1.2Cr', 'Meta Ads'],
  ['Deepa Joshi', 'Chennai', '₹48–60L', 'Referral'],
  ['Nikhil Shah', 'Ahmedabad', '₹62–75L', 'Housing.com'],
  ['Priya Sen', 'Kolkata', '₹40–52L', '99acres'],
];

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Glass "new lead" card as a billboard sprite. */
function leadCardSprite(name: string, city: string, budget: string, source: string, anisotropy: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = 290;
  const h = 96;
  const c = document.createElement('canvas');
  c.width = w * dpr;
  c.height = h * dpr;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  roundedRect(ctx, 1, 1, w - 2, h - 2, 14);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, 'rgba(26, 45, 70, 0.92)');
  bg.addColorStop(1, 'rgba(12, 22, 36, 0.88)');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 188, 227, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Accent bar
  ctx.fillStyle = '#5ee0c9';
  roundedRect(ctx, 14, 18, 4, 60, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(148,188,227,0.85)';
  ctx.font = "600 11px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.letterSpacing = '2px';
  ctx.fillText('NEW LEAD · ' + source.toUpperCase(), 30, 30);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#eef0f2';
  ctx.font = "700 20px 'IBM Plex Sans', 'Segoe UI', sans-serif";
  ctx.fillText(name, 30, 56);
  ctx.fillStyle = 'rgba(238,240,242,0.7)';
  ctx.font = "500 13px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText(city + '  ·  ' + budget, 30, 78);
  // status dot
  ctx.fillStyle = '#ffd48a';
  ctx.shadowColor = 'rgba(255,212,138,0.9)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(w - 24, 26, 5, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
  const sh = 0.52;
  sp.scale.set(sh * (w / h), sh, 1);
  return sp;
}

export type GlobeOptions = {
  /** Horizontal direction lead cards drift as they lift (+1 right, -1 left). */
  cardDrift?: number;
};

export function makeGlobeScene(opts: GlobeOptions = {}): SceneBuilder {
  const cardDrift = opts.cardDrift ?? 1;
  return ({ scene, camera, renderer, reduce }) => {
  camera.position.set(0, 0.25, 7.4);
  camera.lookAt(0, 0, 0);
  const rng = prng(91);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const root = new THREE.Group();
  scene.add(root);
  // Face India (lon ≈ 78°E) toward the camera, tilt slightly like a desk globe.
  const INDIA_YAW = -THREE.MathUtils.degToRad(78 + 180) + Math.PI / 2;
  const globe = new THREE.Group();
  globe.rotation.y = INDIA_YAW;
  root.add(globe);
  root.rotation.z = 0.2;
  root.rotation.x = 0.18;

  // Body.
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(R, 72, 54),
    new THREE.ShaderMaterial({
      uniforms: {
        uDark: { value: new THREE.Color(0x060c17) },
        uLit: { value: new THREE.Color(0x1f3d63) },
        uLightDir: { value: new THREE.Vector3(-0.5, 0.6, 0.65).normalize() },
      },
      vertexShader: BODY_VERT,
      fragmentShader: BODY_FRAG,
    }),
  );
  body.renderOrder = 0;
  globe.add(body);

  // Faint graticule.
  const gratPts: number[] = [];
  const segs = 96;
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let s = 0; s < segs; s++) {
      const a = latLonToVec(lat, (s / segs) * 360 - 180, R * 1.002);
      const b = latLonToVec(lat, ((s + 1) / segs) * 360 - 180, R * 1.002);
      gratPts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  for (let lon = -180; lon < 180; lon += 30) {
    for (let s = 0; s < segs; s++) {
      const a = latLonToVec((s / segs) * 180 - 90, lon, R * 1.002);
      const b = latLonToVec(((s + 1) / segs) * 180 - 90, lon, R * 1.002);
      gratPts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const gratGeo = new THREE.BufferGeometry();
  gratGeo.setAttribute('position', new THREE.Float32BufferAttribute(gratPts, 3));
  globe.add(new THREE.LineSegments(gratGeo, new THREE.LineBasicMaterial({ color: 0x7fb6ff, transparent: true, opacity: 0.08, depthWrite: false })));

  // Atmosphere.
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.045, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0x7fb6ff) } },
      vertexShader: BODY_VERT,
      fragmentShader: ATMO_FRAG,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  atmo.renderOrder = -2;
  root.add(atmo);

  // Land dots: filled once the mask resolves.
  const dotTex = softDot();
  const dotMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: dotTex },
      uColor: { value: new THREE.Color(0x9ccbf5) },
      uHot: { value: new THREE.Color(0xffffff) },
      uProgress: { value: reduce ? 1 : 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
    },
    vertexShader: DOT_VERT,
    fragmentShader: DOT_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  let dots: THREE.Points | null = null;
  let disposed = false;
  const MW = 1440;
  const MH = 720;
  landMask(MW, MH)
    .then((mask) => {
      if (!mask || disposed) return;
      const pos: number[] = [];
      const scatter: number[] = [];
      const seeds: number[] = [];
      const sizes: number[] = [];
      const step = 1.35;
      const v = new THREE.Vector3();
      for (let lat = -84; lat <= 84; lat += step) {
        // Keep dot density even toward the poles.
        const lonStep = step / Math.max(Math.cos(THREE.MathUtils.degToRad(lat)), 0.15);
        for (let lon = -180; lon < 180; lon += lonStep) {
          const x = Math.floor(((lon + 180) / 360) * MW);
          const y = Math.floor(((90 - lat) / 180) * MH);
          if (mask[(y * MW + x) * 4] < 128) continue;
          latLonToVec(lat, lon, R * 1.006, v);
          pos.push(v.x, v.y, v.z);
          const d = 3 + rng() * 5;
          const th = rng() * Math.PI * 2;
          const ph = Math.acos(2 * rng() - 1);
          scatter.push(d * Math.sin(ph) * Math.cos(th), d * Math.sin(ph) * Math.sin(th), d * Math.cos(ph));
          seeds.push(rng());
          sizes.push(1.4 + rng() * 0.9);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('aScatter', new THREE.Float32BufferAttribute(scatter, 3));
      geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
      geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
      dots = new THREE.Points(geo, dotMat);
      dots.renderOrder = 1;
      globe.add(dots);
      if (reduce) renderer.render(scene, camera);
    })
    .catch(() => undefined);

  // Cities: marker, ring ping, and arcs to the hub.
  type Ping = { ring: THREE.Mesh; phase: number };
  const pings: Ping[] = [];
  type Pulse = { curve: THREE.QuadraticBezierCurve3; dot: THREE.Mesh; speed: number; offset: number };
  const pulses: Pulse[] = [];
  const cityPos = new Map<string, THREE.Vector3>();
  const hub = CITIES.find((c) => c.hub)!;
  const hubV = latLonToVec(hub.lat, hub.lon, R * 1.01);
  CITIES.forEach((c, i) => {
    const p = latLonToVec(c.lat, c.lon, R * 1.01);
    cityPos.set(c.name, p);
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(c.hub ? 0.034 : 0.024, 12, 12),
      new THREE.MeshBasicMaterial({ color: c.hub ? 0x5ee0c9 : 0xffffff, depthWrite: false }),
    );
    m.position.copy(p);
    m.renderOrder = 3;
    globe.add(m);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.03, 0.04, 32),
      new THREE.MeshBasicMaterial({ color: c.hub ? 0x5ee0c9 : 0x9ccbf5, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.position.copy(p);
    ring.lookAt(p.clone().multiplyScalar(2));
    ring.renderOrder = 3;
    globe.add(ring);
    pings.push({ ring, phase: i * 0.37 });

    if (!c.hub) {
      const mid = p.clone().add(hubV).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(R * (1 + 0.28 * (p.distanceTo(hubV) / R)));
      const curve = new THREE.QuadraticBezierCurve3(p, mid, hubV);
      const arc = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
        new THREE.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.45, depthWrite: false }),
      );
      arc.renderOrder = 3;
      globe.add(arc);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xdff3ff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      dot.renderOrder = 4;
      globe.add(dot);
      pulses.push({ curve, dot, speed: 0.18 + rng() * 0.14, offset: rng() });
    }
  });

  // Lead cards lifting off the map.
  type Card = { sprite: THREE.Sprite; from: THREE.Vector3; t: number; dur: number; drift: number };
  const cards: Card[] = [];
  const cardPool: THREE.Sprite[] = [];
  LEAD_FEED.forEach(([n, c, b, s]) => {
    const sp = leadCardSprite(n, c, b, s, maxAniso);
    if (sp) {
      sp.visible = false;
      cardPool.push(sp);
      scene.add(sp);
    }
  });
  let nextCard = 0;
  let spawnTimer = 0.8;
  const tmpWorld = new THREE.Vector3();
  const spawn = () => {
    const i = nextCard % cardPool.length;
    const sp = cardPool[i];
    const lead = LEAD_FEED[i];
    nextCard++;
    if (cards.some((c) => c.sprite === sp)) return;
    const from = cityPos.get(lead[1]);
    if (!from) return;
    sp.visible = true;
    cards.push({ sprite: sp, from: from.clone(), t: 0, dur: 4.2, drift: (rng() - 0.5) * 0.6 });
  };

  // Dust.
  const DN = 320;
  const dpos = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) {
    const r = 3.6 + rng() * 3;
    const th = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    dpos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    dpos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    dpos[i * 3 + 2] = r * Math.cos(ph);
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(
    dgeo,
    new THREE.PointsMaterial({ color: 0xbfe0ff, size: 0.04, map: dotTex ?? undefined, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  scene.add(dust);

  let tiltX = 0;
  let tiltY = 0;
  const tmp = new THREE.Vector3();

  return {
    update(dt, elapsed, pointer) {
      const p = reduce ? 1 : heroMotion.progress;
      dotMat.uniforms.uProgress.value = p;
      tiltY += (pointer.x * 0.5 - tiltY) * Math.min(dt * 2.5, 1);
      tiltX += (-pointer.y * 0.3 - tiltX) * Math.min(dt * 2.5, 1);
      // Sway around India rather than spinning it away.
      globe.rotation.y = INDIA_YAW + Math.sin(elapsed * 0.16) * 0.32 + tiltY;
      root.rotation.x = 0.18 + tiltX;
      root.scale.setScalar(0.88 + 0.12 * p);

      pings.forEach((pg) => {
        const k = ((elapsed * 0.45 + pg.phase) % 1);
        pg.ring.scale.setScalar(1 + k * 5);
        (pg.ring.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.8 * p;
      });
      pulses.forEach((pl) => {
        const u = (elapsed * pl.speed + pl.offset) % 1;
        pl.curve.getPoint(u, tmp);
        pl.dot.position.copy(tmp);
        (pl.dot.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * u) * p;
      });

      if (p > 0.85 && !reduce) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawn();
          spawnTimer = 1.6 + rng() * 0.6;
        }
      }
      for (let i = cards.length - 1; i >= 0; i--) {
        const c = cards[i];
        c.t += dt;
        const k = c.t / c.dur;
        if (k >= 1) {
          c.sprite.visible = false;
          cards.splice(i, 1);
          continue;
        }
        // Start on the city (in world space), lift up and drift right, fade in then out.
        globe.localToWorld(tmpWorld.copy(c.from));
        const lift = 1 - Math.pow(1 - Math.min(k * 1.2, 1), 3);
        c.sprite.position.set(
          tmpWorld.x + 0.35 * cardDrift * lift + c.drift * k,
          tmpWorld.y + 1.05 * lift + 0.25 * k,
          tmpWorld.z + 0.5 * lift,
        );
        const front = tmpWorld.z > 0.2 ? 1 : 0.15;
        c.sprite.material.opacity = Math.min(k * 4, 1) * (1 - Math.max((k - 0.7) / 0.3, 0)) * front;
      }
      dust.rotation.y = elapsed * 0.01;
    },
    dispose() {
      disposed = true;
      dotTex?.dispose();
      cardPool.forEach((s) => s.material.map?.dispose());
    },
  };
};
}

export const globeScene: SceneBuilder = makeGlobeScene();
