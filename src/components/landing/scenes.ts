import * as THREE from 'three';
import type { SceneBuilder } from './ThreeScene';

/* ---------------------------------------------------------------------------
 * Shared helpers
 * ------------------------------------------------------------------------- */

const FRESNEL_VERT = `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRESNEL_FRAG = `
  uniform vec3 uColor;
  uniform vec3 uRim;
  uniform float uOpacity;
  uniform float uPower;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), uPower);
    vec3 c = mix(uColor, uRim, f);
    gl_FragColor = vec4(c, clamp(uOpacity + f * (1.0 - uOpacity), 0.0, 1.0));
  }
`;

function glass(color: number, rim: number, opacity: number, power = 2.4, side: THREE.Side = THREE.FrontSide) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uRim: { value: new THREE.Color(rim) },
      uOpacity: { value: opacity },
      uPower: { value: power },
    },
    vertexShader: FRESNEL_VERT,
    fragmentShader: FRESNEL_FRAG,
    transparent: true,
    depthWrite: false,
    side,
  });
}

function softDotTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function prng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 100000) / 100000;
  };
}

function edges(geometry: THREE.BufferGeometry, color: number, opacity: number) {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
}

/* ---------------------------------------------------------------------------
 * 1. Pipeline funnel — leads pour in at the top, narrow through the stages,
 *    and land as "Won" at the bottom. Some fall out sideways as "Lost".
 * ------------------------------------------------------------------------- */

export const STAGE_COLORS = {
  INCOMING: 0x7fb6ff,
  CONTACTED: 0x8b8cf5,
  PROSPECT: 0x4fd1a5,
  DNP: 0xf3b24f,
  WON: 0x5ee0c9,
  LOST: 0x8a94a6,
};

export const funnelScene: SceneBuilder = ({ scene, camera, reduce }) => {
  camera.position.set(0, 0.9, 7.4);
  camera.lookAt(0, -0.1, 0);

  const rng = prng(4242);
  const root = new THREE.Group();
  scene.add(root);

  const stages = [
    { r: 1.9, y: 1.75, color: STAGE_COLORS.INCOMING },
    { r: 1.5, y: 0.95, color: STAGE_COLORS.CONTACTED },
    { r: 1.15, y: 0.15, color: STAGE_COLORS.PROSPECT },
    { r: 0.85, y: -0.65, color: STAGE_COLORS.DNP },
    { r: 0.55, y: -1.5, color: STAGE_COLORS.WON },
  ];

  // Funnel body: a lathe through the stage radii, drawn as fresnel glass.
  const lathePts = stages.map((s) => new THREE.Vector2(s.r, s.y));
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(lathePts, 72),
    glass(0x0d1a2c, 0x7fb6ff, 0.04, 5.0, THREE.DoubleSide),
  );
  body.renderOrder = 0;
  root.add(body);

  // Stage rings.
  const rings: THREE.Mesh[] = [];
  stages.forEach((s) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(s.r, 0.014, 8, 140),
      new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = s.y;
    ring.renderOrder = 2;
    root.add(ring);
    rings.push(ring);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(s.r, 0.05, 8, 140),
      new THREE.MeshBasicMaterial({
        color: s.color,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = s.y;
    halo.renderOrder = 1;
    root.add(halo);
  });

  // Meridian guides.
  const guidePts: number[] = [];
  for (let m = 0; m < 14; m++) {
    const a = (m / 14) * Math.PI * 2;
    for (let i = 0; i < stages.length - 1; i++) {
      const s0 = stages[i];
      const s1 = stages[i + 1];
      guidePts.push(s0.r * Math.cos(a), s0.y, s0.r * Math.sin(a), s1.r * Math.cos(a), s1.y, s1.r * Math.sin(a));
    }
  }
  const guideGeo = new THREE.BufferGeometry();
  guideGeo.setAttribute('position', new THREE.Float32BufferAttribute(guidePts, 3));
  const guides = new THREE.LineSegments(
    guideGeo,
    new THREE.LineBasicMaterial({ color: 0x7fb6ff, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  root.add(guides);

  // Won plate at the bottom.
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 48),
    new THREE.MeshBasicMaterial({
      color: STAGE_COLORS.WON,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = stages[stages.length - 1].y - 0.01;
  root.add(plate);

  // Particles.
  const COUNT = 220;
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  type P = { p: number; speed: number; angle: number; spin: number; rf: number; lost: boolean; lostAt: number };
  const parts: P[] = [];
  for (let i = 0; i < COUNT; i++) {
    parts.push({
      p: rng(),
      speed: 0.08 + rng() * 0.09,
      angle: rng() * Math.PI * 2,
      spin: 0.3 + rng() * 0.5,
      rf: 0.1 + rng() * 0.85,
      lost: rng() < 0.16,
      lostAt: 0.62 + rng() * 0.18,
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const tex = softDotTexture();
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.09,
      map: tex ?? undefined,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  points.renderOrder = 3;
  root.add(points);

  const topY = stages[0].y + 0.9;
  const botY = stages[stages.length - 1].y;
  const colorAt = (() => {
    const cs = stages.map((s) => new THREE.Color(s.color));
    const tmp = new THREE.Color();
    return (t: number) => {
      const f = t * (cs.length - 1);
      const i = Math.min(Math.floor(f), cs.length - 2);
      return tmp.copy(cs[i]).lerp(cs[i + 1], f - i);
    };
  })();
  const radiusAt = (y: number) => {
    if (y >= stages[0].y) return stages[0].r;
    for (let i = 0; i < stages.length - 1; i++) {
      const a = stages[i];
      const b = stages[i + 1];
      if (y <= a.y && y >= b.y) {
        const t = (a.y - y) / (a.y - b.y);
        return THREE.MathUtils.lerp(a.r, b.r, t);
      }
    }
    return stages[stages.length - 1].r;
  };

  const lostColor = new THREE.Color(STAGE_COLORS.LOST);
  const wonColor = new THREE.Color(0xffffff);

  let tiltX = 0;
  let tiltY = 0;
  root.rotation.x = 0.12;

  const layout = (elapsed: number) => {
    for (let i = 0; i < COUNT; i++) {
      const q = parts[i];
      const y = THREE.MathUtils.lerp(topY, botY, q.p);
      const a = q.angle + elapsed * q.spin;
      let r: number;
      let c: THREE.Color;
      if (q.lost && q.p > q.lostAt) {
        // Falls out sideways and fades.
        const k = (q.p - q.lostAt) / (1 - q.lostAt);
        r = radiusAt(THREE.MathUtils.lerp(topY, botY, q.lostAt)) * (1 + k * 2.2);
        c = lostColor.clone().multiplyScalar(1 - k * 0.9);
        positions[i * 3 + 1] = THREE.MathUtils.lerp(topY, botY, q.lostAt) - k * 1.1;
      } else {
        r = radiusAt(y) * q.rf;
        const t = THREE.MathUtils.clamp((stages[0].y - y) / (stages[0].y - botY), 0, 1);
        c = colorAt(t).clone();
        if (q.p > 0.96) c.lerp(wonColor, (q.p - 0.96) / 0.04);
        positions[i * 3 + 1] = y;
      }
      positions[i * 3] = r * Math.cos(a);
      positions[i * 3 + 2] = r * Math.sin(a);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  };

  layout(0);

  return {
    update(dt, elapsed, pointer) {
      if (!reduce) {
        for (const q of parts) {
          q.p += q.speed * dt;
          if (q.p > 1) {
            q.p = 0;
            q.angle = rng() * Math.PI * 2;
            q.rf = 0.1 + rng() * 0.85;
            q.lost = rng() < 0.16;
          }
        }
      }
      layout(elapsed);
      tiltY += ((pointer.x * 0.5 - tiltY) * 1 - 0) * Math.min(dt * 3, 1);
      tiltX += ((0.12 - pointer.y * 0.25 - tiltX) * 1 - 0) * Math.min(dt * 3, 1);
      root.rotation.y = elapsed * 0.08 + tiltY;
      root.rotation.x = tiltX;
      rings.forEach((r, i) => {
        const m = r.material as THREE.MeshBasicMaterial;
        m.opacity = 0.65 + Math.sin(elapsed * 1.4 - i * 0.7) * 0.2;
      });
    },
    dispose() {
      tex?.dispose();
    },
  };
};

/* ---------------------------------------------------------------------------
 * 2. Tenant shield — nested polyhedra with three isolated "tenant" nodes
 *    orbiting on their own rings. Nothing crosses the shell.
 * ------------------------------------------------------------------------- */

export const shieldScene: SceneBuilder = ({ scene, camera }) => {
  camera.position.set(0, 0.2, 8.3);
  camera.lookAt(0, 0, 0);
  const rng = prng(99);
  const root = new THREE.Group();
  scene.add(root);

  const outerGeo = new THREE.IcosahedronGeometry(1.75, 1);
  const outer = edges(outerGeo, 0x9ccbf5, 0.32);
  root.add(outer);
  const outerFill = new THREE.Mesh(outerGeo, glass(0x0b1424, 0x7fb6ff, 0.04, 3.2));
  root.add(outerFill);

  const midGeo = new THREE.IcosahedronGeometry(1.2, 2);
  const mid = new THREE.Mesh(midGeo, glass(0x15294a, 0x9ccbf5, 0.16, 2.2));
  root.add(mid);
  const midEdges = edges(new THREE.IcosahedronGeometry(1.2, 0), 0xbfe0ff, 0.22);
  root.add(midEdges);

  const coreGeo = new THREE.OctahedronGeometry(0.46, 0);
  const core = new THREE.Mesh(coreGeo, glass(0x3d5a80, 0xe9f4ff, 0.65, 1.6));
  root.add(core);
  const coreEdges = edges(coreGeo, 0xe9f4ff, 0.6);
  core.add(coreEdges);
  const coreGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0x6aa8e8,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  root.add(coreGlow);

  type Orbit = { pivot: THREE.Group; spinner: THREE.Group; speed: number; node: THREE.Mesh };
  const orbits: Orbit[] = [];
  const colors = [0x7fb6ff, 0x4fd1a5, 0xf3b24f];
  [
    { tiltX: 0.9, tiltZ: 0.3, speed: 0.35, r: 2.25 },
    { tiltX: -0.6, tiltZ: 0.9, speed: -0.27, r: 2.45 },
    { tiltX: 0.2, tiltZ: -1.1, speed: 0.22, r: 2.65 },
  ].forEach((cfg, i) => {
    const pivot = new THREE.Group();
    pivot.rotation.set(cfg.tiltX, 0, cfg.tiltZ);
    root.add(pivot);
    const track = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.r, 0.006, 6, 160),
      new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: 0.3, depthWrite: false }),
    );
    track.rotation.x = Math.PI / 2;
    pivot.add(track);

    const spinner = new THREE.Group();
    spinner.rotation.y = rng() * Math.PI * 2;
    pivot.add(spinner);
    const nodeGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const node = new THREE.Mesh(nodeGeo, glass(colors[i], 0xffffff, 0.75, 1.4));
    node.position.set(cfg.r, 0, 0);
    node.add(edges(nodeGeo, 0xffffff, 0.7));
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 16, 16),
      new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    node.add(glow);
    spinner.add(node);
    orbits.push({ pivot, spinner, speed: cfg.speed, node });
  });

  // Ambient particles.
  const N = 260;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 3.1 + rng() * 2.4;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = softDotTexture();
  const dust = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0xbfe0ff,
      size: 0.05,
      map: tex ?? undefined,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(dust);

  let tiltX = 0;
  let tiltY = 0;
  return {
    update(dt, elapsed, pointer) {
      tiltY += (pointer.x * 0.6 - tiltY) * Math.min(dt * 3, 1);
      tiltX += (-pointer.y * 0.4 - tiltX) * Math.min(dt * 3, 1);
      root.rotation.y = elapsed * 0.1 + tiltY;
      root.rotation.x = tiltX + Math.sin(elapsed * 0.3) * 0.05;
      outer.rotation.y = elapsed * 0.06;
      outerFill.rotation.y = elapsed * 0.06;
      mid.rotation.y = -elapsed * 0.12;
      mid.rotation.z = elapsed * 0.05;
      midEdges.rotation.copy(mid.rotation);
      core.rotation.y = elapsed * 0.5;
      core.rotation.x = Math.sin(elapsed * 0.7) * 0.3;
      const pulse = 1 + Math.sin(elapsed * 2.2) * 0.08;
      coreGlow.scale.setScalar(pulse);
      orbits.forEach((o) => {
        o.spinner.rotation.y = elapsed * o.speed;
        o.node.rotation.x = elapsed * 0.9;
        o.node.rotation.y = elapsed * 1.3;
      });
      dust.rotation.y = elapsed * 0.015;
    },
    dispose() {
      tex?.dispose();
    },
  };
};

/* ---------------------------------------------------------------------------
 * 3. Console stack — floating glass panels with table rows, one per module,
 *    stacked isometrically. Small cubes of data drift between the layers.
 * ------------------------------------------------------------------------- */

export const stackScene: SceneBuilder = ({ scene, camera }) => {
  camera.position.set(0, 0, 8.4);
  camera.lookAt(0, 0, 0);
  const rng = prng(7);
  const root = new THREE.Group();
  root.rotation.x = 0.62;
  root.rotation.y = -0.55;
  scene.add(root);

  const layerColors = [0x7fb6ff, 0x8b8cf5, 0x4fd1a5, 0xf3b24f, 0x5ee0c9];
  type Layer = { g: THREE.Group; base: number; phase: number };
  const layers: Layer[] = [];
  const W = 3.4;
  const H = 2.2;

  layerColors.forEach((c, i) => {
    const g = new THREE.Group();
    const y = -1.3 + i * 0.65;
    g.position.y = y;
    root.add(g);

    const panelGeo = new THREE.BoxGeometry(W, 0.03, H);
    const panel = new THREE.Mesh(panelGeo, glass(0x0f1d33, c, 0.18, 2.6));
    g.add(panel);
    g.add(edges(panelGeo, c, 0.55));

    // Header bar + rows.
    const header = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.86, 0.02, 0.16),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    header.position.set(0, 0.03, -H / 2 + 0.3);
    g.add(header);
    for (let r = 0; r < 4; r++) {
      const w = W * (0.45 + rng() * 0.4);
      const row = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.015, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xdde9f7, transparent: true, opacity: 0.22, depthWrite: false }),
      );
      row.position.set(-(W * 0.86 - w) / 2, 0.03, -H / 2 + 0.65 + r * 0.32);
      g.add(row);
      const chip = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.015, 0.08),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, depthWrite: false }),
      );
      chip.position.set(W * 0.43 - 0.14, 0.03, -H / 2 + 0.65 + r * 0.32);
      g.add(chip);
    }
    layers.push({ g, base: y, phase: rng() * Math.PI * 2 });
  });

  // Vertical connectors.
  const linePts: number[] = [];
  [
    [-W / 2 + 0.2, -H / 2 + 0.2],
    [W / 2 - 0.2, -H / 2 + 0.2],
    [-W / 2 + 0.2, H / 2 - 0.2],
    [W / 2 - 0.2, H / 2 - 0.2],
  ].forEach(([x, z]) => {
    linePts.push(x, -1.6, z, x, 1.6, z);
  });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3));
  root.add(
    new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ color: 0x9ccbf5, transparent: true, opacity: 0.16, depthWrite: false }),
    ),
  );

  // Drifting data cubes.
  type Cube = { m: THREE.Mesh; speed: number; x: number; z: number; off: number };
  const cubes: Cube[] = [];
  for (let i = 0; i < 14; i++) {
    const c = layerColors[i % layerColors.length];
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const m = new THREE.Mesh(geo, glass(c, 0xffffff, 0.7, 1.5));
    m.add(edges(geo, 0xffffff, 0.5));
    root.add(m);
    cubes.push({
      m,
      speed: 0.25 + rng() * 0.3,
      x: (rng() - 0.5) * W * 1.1,
      z: (rng() - 0.5) * H * 1.1,
      off: rng() * 4,
    });
  }

  let tiltX = 0;
  let tiltY = 0;
  return {
    update(dt, elapsed, pointer) {
      tiltY += (pointer.x * 0.5 - tiltY) * Math.min(dt * 3, 1);
      tiltX += (-pointer.y * 0.3 - tiltX) * Math.min(dt * 3, 1);
      root.rotation.y = -0.55 + Math.sin(elapsed * 0.18) * 0.12 + tiltY;
      root.rotation.x = 0.62 + tiltX;
      layers.forEach((l, i) => {
        l.g.position.y = l.base + Math.sin(elapsed * 0.9 + l.phase) * 0.05 + i * 0.01;
      });
      cubes.forEach((c) => {
        const t = ((elapsed * c.speed + c.off) % 4) / 4;
        c.m.position.set(c.x, -1.7 + t * 3.6, c.z);
        c.m.rotation.x = elapsed * 1.1 + c.off;
        c.m.rotation.y = elapsed * 0.8;
        const mat = c.m.material as THREE.ShaderMaterial;
        mat.uniforms.uOpacity.value = 0.7 * Math.sin(Math.PI * t);
      });
    },
  };
};

/** Shared by the page's GSAP timeline and the hero globe: 0 = scattered, 1 = assembled. */
export const heroMotion = { progress: 0 };
