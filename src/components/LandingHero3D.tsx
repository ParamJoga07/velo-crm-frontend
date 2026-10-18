import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = {
  className?: string;
};

/** Feature tags that orbit the globe — the product surface, circling the world. */
const ORBIT_LABELS = ['Leads', 'Pipeline', 'Imports', 'Attendance', 'Teams', 'Reports'];

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    const target = obj as unknown as {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (target.geometry) target.geometry.dispose();
    if (target.material) {
      const list = Array.isArray(target.material) ? target.material : [target.material];
      list.forEach((m) => {
        const map = (m as THREE.SpriteMaterial).map;
        if (map) map.dispose();
        m.dispose();
      });
    }
  });
}

/* ---------------------------------------------------------------------------
 * Shaders. The globe is unlit geometry, so realism comes from three cheap
 * view-dependent effects: a lit terminator on the body, a fresnel atmosphere
 * that concentrates at the limb, and grid lines that dim on the far side.
 * ------------------------------------------------------------------------- */

/** Globe body: fixed studio light + soft rim, so the sphere reads as a volume. */
const BODY_VERT = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const BODY_FRAG = `
  uniform vec3 uDark;
  uniform vec3 uLit;
  uniform vec3 uLightDir;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(vNormal);
    float lambert = dot(n, normalize(uLightDir)) * 0.5 + 0.5;
    vec3 col = mix(uDark, uLit, pow(clamp(lambert, 0.0, 1.0), 1.6));
    float rim = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 3.0);
    col += uLit * rim * 0.45;
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/** Atmosphere: a back-facing shell wider than the planet. Brightness peaks behind
 * the planet's silhouette (where the body hides it) and falls off toward the shell's
 * own edge, so what you see is a halo that fades outward into space. */
const ATMO_VERT = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const ATMO_FRAG = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uBias;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float d = dot(normalize(vNormal), normalize(vView));
    float glow = pow(max(uBias - d, 0.0), uPower) * uIntensity;
    gl_FragColor = vec4(uColor, clamp(glow, 0.0, 1.0));
  }
`;

/** Grid lines: no normal attribute on a line geometry, so derive it from the
 * position — valid because the grid sits on a sphere centred at the origin. */
const GRID_VERT = `
  varying float vFacing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normalize(position));
    vFacing = dot(n, normalize(-mv.xyz));
    gl_Position = projectionMatrix * mv;
  }
`;

const GRID_FRAG = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uBack;
  varying float vFacing;
  void main() {
    float f = smoothstep(-0.4, 0.7, vFacing);
    gl_FragColor = vec4(uColor, uOpacity * mix(uBack, 1.0, f));
  }
`;

function gridMaterial(color: number, opacity: number, back = 0.14) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uBack: { value: back },
    },
    vertexShader: GRID_VERT,
    fragmentShader: GRID_FRAG,
    transparent: true,
    depthWrite: false,
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws a glassy "chip" with a status dot + label into a canvas, returned as a billboard sprite. */
function makeLabelSprite(text: string, maxAnisotropy: number, worldH: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const font = "600 30px 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";
  const padX = 24;
  const padY = 16;
  const dotR = 6;
  const gap = 15;

  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) return null;
  measure.font = font;
  measure.letterSpacing = '2px';
  const label = text.toUpperCase();
  const textW = measure.measureText(label).width;

  const w = padX * 2 + dotR * 2 + gap + textW;
  const h = padY * 2 + 30;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  ctx.font = font;
  ctx.letterSpacing = '2px';

  roundedRect(ctx, 1, 1, w - 2, h - 2, (h - 2) / 2);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, 'rgba(26, 45, 70, 0.86)');
  bg.addColorStop(1, 'rgba(12, 22, 36, 0.8)');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 188, 227, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(padX + dotR, h / 2, dotR, 0, Math.PI * 2);
  ctx.fillStyle = '#7fd8ff';
  ctx.shadowColor = 'rgba(127, 216, 255, 0.9)';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#e9f4ff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, padX + dotR * 2 + gap, h / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = maxAnisotropy;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }),
  );
  sprite.scale.set(worldH * (w / h), worldH, 1);
  // Half-width in world units, so the layout can keep tags inside the viewport.
  sprite.userData.halfW = (worldH * (w / h)) / 2;
  return sprite;
}

/** Clean latitude/longitude wireframe — far more elegant than a triangulated sphere. */
function makeGlobeGrid(radius: number, meridians: number, parallels: number) {
  const pts: number[] = [];
  const segs = 128;

  for (let i = 1; i <= parallels; i++) {
    const phi = (i / (parallels + 1)) * Math.PI;
    const y = radius * Math.cos(phi);
    const r = radius * Math.sin(phi);
    for (let s = 0; s < segs; s++) {
      const a0 = (s / segs) * Math.PI * 2;
      const a1 = ((s + 1) / segs) * Math.PI * 2;
      pts.push(r * Math.cos(a0), y, r * Math.sin(a0), r * Math.cos(a1), y, r * Math.sin(a1));
    }
  }

  for (let m = 0; m < meridians; m++) {
    const theta = (m / meridians) * Math.PI * 2;
    for (let s = 0; s < segs; s++) {
      const p0 = (s / segs) * Math.PI;
      const p1 = ((s + 1) / segs) * Math.PI;
      const y0 = radius * Math.cos(p0);
      const r0 = radius * Math.sin(p0);
      const y1 = radius * Math.cos(p1);
      const r1 = radius * Math.sin(p1);
      pts.push(r0 * Math.cos(theta), y0, r0 * Math.sin(theta), r1 * Math.cos(theta), y1, r1 * Math.sin(theta));
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geometry;
}

function makeRingGeometry(radius: number, segs = 160) {
  const pts: number[] = [];
  for (let s = 0; s < segs; s++) {
    const a0 = (s / segs) * Math.PI * 2;
    const a1 = ((s + 1) / segs) * Math.PI * 2;
    pts.push(radius * Math.cos(a0), 0, radius * Math.sin(a0), radius * Math.cos(a1), 0, radius * Math.sin(a1));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geometry;
}

function addDot(
  parent: THREE.Object3D,
  position: THREE.Vector3 | [number, number, number],
  color: number,
  radius: number,
  opacity = 0.95,
  additive = false,
) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 16),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }),
  );
  if (Array.isArray(position)) mesh.position.set(...position);
  else mesh.position.copy(position);
  parent.add(mesh);
  return mesh;
}

function surfacePoint(radius: number, rng: () => number) {
  const theta = rng() * Math.PI * 2;
  const phi = Math.acos(2 * rng() - 1);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  );
}

/** Rotating "global network" globe: a lit wireframe world with product feature tags
 * orbiting it and data pulses travelling between surface nodes. Pointer motion steers
 * it with real momentum. Sits behind the hero copy and never blocks it. */
export function LandingHero3D({ className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gridColor = 0x9ccbf5;
    const equatorColor = 0xd6ecff;
    const glowColor = 0x6aa8e8;
    const arcColor = 0x8fd0ff;
    const pulseColor = 0xdff3ff;
    const dotColor = 0xcfe9ff;

    // Deterministic PRNG so the surface layout is stable across mounts.
    let seed = 1337;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed % 100000) / 100000;
    };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 8.6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const R = 1.55;
    const LABEL_R = 1.98;
    const LABEL_H = 0.15;

    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    const globeSpin = new THREE.Group();
    sceneGroup.add(globeSpin);

    // Globe body — lit from a fixed direction in view space, so the terminator stays
    // put while the world turns underneath it.
    // The body writes depth so every later object is occluded correctly when it
    // passes behind the planet; everything else only tests against it.
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.98, 64, 48),
      new THREE.ShaderMaterial({
        uniforms: {
          uDark: { value: new THREE.Color(0x070d16) },
          uLit: { value: new THREE.Color(0x24486f) },
          uLightDir: { value: new THREE.Vector3(-0.45, 0.55, 0.7).normalize() },
          uOpacity: { value: 0.88 },
        },
        vertexShader: BODY_VERT,
        fragmentShader: BODY_FRAG,
        transparent: true,
        depthWrite: true,
      }),
    );
    body.renderOrder = 0;
    globeSpin.add(body);

    const grid = new THREE.LineSegments(makeGlobeGrid(R, 18, 11), gridMaterial(gridColor, 0.42));
    grid.renderOrder = 1;
    globeSpin.add(grid);

    const equator = new THREE.LineSegments(makeRingGeometry(R), gridMaterial(equatorColor, 0.6, 0.1));
    equator.renderOrder = 2;
    globeSpin.add(equator);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.45, 48, 36),
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(glowColor) },
          uIntensity: { value: 0.1 },
          uPower: { value: 4.0 },
          uBias: { value: 0.72 },
        },
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    atmosphere.renderOrder = -2;
    sceneGroup.add(atmosphere);

    // Surface nodes joined by arcs, with a pulse travelling along each arc — the
    // "data moving between offices" motif.
    type Pulse = { curve: THREE.QuadraticBezierCurve3; dot: THREE.Mesh; speed: number; offset: number };
    const pulses: Pulse[] = [];

    // Sit just clear of the body so nothing is clipped by its depth write.
    const SURFACE_R = R * 1.015;

    for (let i = 0; i < 6; i++) {
      const a = surfacePoint(SURFACE_R, rng);
      const b = surfacePoint(SURFACE_R, rng);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(SURFACE_R * (1 + 0.32 * (a.distanceTo(b) / R)));
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);

      const arc = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)),
        new THREE.LineBasicMaterial({ color: arcColor, transparent: true, opacity: 0.4, depthWrite: false }),
      );
      arc.renderOrder = 3;
      globeSpin.add(arc);

      addDot(globeSpin, a, dotColor, 0.026, 0.9).renderOrder = 3;
      addDot(globeSpin, b, dotColor, 0.022, 0.8).renderOrder = 3;

      const dot = addDot(globeSpin, a, pulseColor, 0.032, 1, true);
      dot.renderOrder = 4;
      pulses.push({ curve, dot, speed: 0.1 + rng() * 0.12, offset: rng() });
    }

    // Two quiet satellites inside the tag ring, for a bit of extra orbital life.
    type Orbit = { spinner: THREE.Group; speed: number; phase: number };
    const orbits: Orbit[] = [];

    [
      { radius: R * 1.14, tiltX: 0.42, tiltZ: 0.16, speed: 0.24, size: 0.04 },
      { radius: R * 1.26, tiltX: -0.5, tiltZ: -0.3, speed: -0.17, size: 0.032 },
    ].forEach((cfg) => {
      const pivot = new THREE.Group();
      pivot.rotation.set(cfg.tiltX, 0, cfg.tiltZ);
      sceneGroup.add(pivot);
      const track = new THREE.LineSegments(makeRingGeometry(cfg.radius), gridMaterial(gridColor, 0.18, 0.25));
      track.renderOrder = 3;
      pivot.add(track);

      const phase = rng() * Math.PI * 2;
      const spinner = new THREE.Group();
      spinner.rotation.y = phase;
      pivot.add(spinner);

      const node = addDot(spinner, [cfg.radius, 0, 0], pulseColor, cfg.size, 0.95);
      node.renderOrder = 4;
      addDot(node, [0, 0, 0], arcColor, cfg.size * 2.4, 0.3, true).renderOrder = 4;

      orbits.push({ spinner, speed: cfg.speed, phase });
    });

    // Feature tags circling the globe on a gently tilted track.
    const labelRing = new THREE.Group();
    labelRing.rotation.x = 0.2;
    sceneGroup.add(labelRing);
    const labelTrack = new THREE.LineSegments(makeRingGeometry(LABEL_R), gridMaterial(gridColor, 0.14, 0.3));
    labelTrack.renderOrder = 3;
    labelRing.add(labelTrack);

    const labels: THREE.Sprite[] = [];
    ORBIT_LABELS.forEach((text, i) => {
      const sprite = makeLabelSprite(text, maxAnisotropy, LABEL_H);
      if (!sprite) return;
      const angle = (i / ORBIT_LABELS.length) * Math.PI * 2;
      sprite.position.set(LABEL_R * Math.cos(angle), 0, LABEL_R * Math.sin(angle));
      labelRing.add(sprite);
      labels.push(sprite);
    });

    // Starfield.
    const starCount = 240;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const p = surfacePoint(4.8 + rng() * 3.4, rng);
      starPositions[i * 3] = p.x;
      starPositions[i * 3 + 1] = p.y;
      starPositions[i * 3 + 2] = p.z;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xbfe0ff,
        size: 0.03,
        transparent: true,
        opacity: 0.45,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    );
    stars.renderOrder = -3;
    scene.add(stars);

    /* -----------------------------------------------------------------------
     * Pointer steering. Everything below is time-based rather than per-frame,
     * so the feel is identical on a 60Hz and a 144Hz display: targets are
     * chased with exponential damping, and a flick feeds real angular
     * momentum into the spin that then eases back to the idle rate.
     * --------------------------------------------------------------------- */
    const BASE_SPIN = 0.075; // rad/s idle rotation
    const FLICK_GAIN = 3.4; // how hard a swipe throws the globe
    const MAX_SPIN = 2.4;

    let pointerX = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;
    let tiltX = 0;
    let tiltY = 0;
    let tiltVX = 0;
    let tiltVY = 0;
    let spin = BASE_SPIN;
    let globeYaw = 0;
    let labelYaw = 0;
    let havePointer = false;

    const onPointerMove = (e: PointerEvent) => {
      if (reduce) return;
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      if (havePointer) {
        // Horizontal travel becomes angular momentum — the globe follows your hand.
        spin = THREE.MathUtils.clamp(spin + (nx - pointerX) * FLICK_GAIN, -MAX_SPIN, MAX_SPIN);
      }
      pointerX = nx;
      havePointer = true;
      targetTiltY = nx * 0.34;
      targetTiltX = -ny * 0.24;
    };

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      // Keep the tag ring inside the frame: the widest chip must still fit at the
      // ring's extreme, otherwise tags clip against the edge of the canvas.
      const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
      const widest = labels.reduce((m, s) => Math.max(m, s.userData.halfW as number), 0);
      const showLabels = width >= 620 && LABEL_R + widest < halfW * 0.97;
      labels.forEach((s) => {
        s.visible = showLabels;
      });
      if (reduce) renderer.render(scene, camera);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const tmp = new THREE.Vector3();
    let last = performance.now();
    let elapsed = 0;
    let raf = 0;

    /** Tags ignore the depth buffer, so their layering is driven explicitly: a tag on
     * the far side draws before the planet (which then covers it) and fades out. */
    const updateLabels = () => {
      labels.forEach((s) => {
        s.updateWorldMatrix(true, false);
        s.getWorldPosition(tmp);
        const front = THREE.MathUtils.clamp((tmp.z + LABEL_R) / (2 * LABEL_R), 0, 1);
        s.material.opacity = 0.08 + Math.pow(front, 1.7) * 0.92;
        s.renderOrder = tmp.z >= 0 ? 10 : -10;
      });
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      // Clamp so a backgrounded tab doesn't resume with one enormous step.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      // Critically damped spring on the tilt: fluid, never overshoots into wobble.
      const stiffness = 34;
      const damping = 2 * Math.sqrt(stiffness) * 0.85;
      tiltVX += ((targetTiltX - tiltX) * stiffness - tiltVX * damping) * dt;
      tiltVY += ((targetTiltY - tiltY) * stiffness - tiltVY * damping) * dt;
      tiltX += tiltVX * dt;
      tiltY += tiltVY * dt;

      // Momentum bleeds back to the idle spin rate.
      spin += (BASE_SPIN - spin) * (1 - Math.exp(-1.4 * dt));
      globeYaw += spin * dt;
      // Tags keep a readable pace but share a little of the momentum.
      labelYaw += (-0.085 + (spin - BASE_SPIN) * 0.25) * dt;

      sceneGroup.rotation.x = tiltX + Math.sin(elapsed * 0.22) * 0.018;
      sceneGroup.rotation.y = tiltY;
      globeSpin.rotation.y = globeYaw;
      labelRing.rotation.y = labelYaw;
      stars.rotation.y = elapsed * 0.008;

      orbits.forEach((o) => {
        o.spinner.rotation.y = elapsed * o.speed + o.phase;
      });

      pulses.forEach((p) => {
        const u = (elapsed * p.speed + p.offset) % 1;
        p.curve.getPoint(u, tmp);
        p.dot.position.copy(tmp);
        (p.dot.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * u) * 0.95;
      });

      updateLabels();

      renderer.render(scene, camera);
    };

    if (reduce) {
      updateLabels();
      renderer.render(scene, camera);
    } else {
      tick();
      window.addEventListener('pointermove', onPointerMove, { passive: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      ro.disconnect();
      disposeObject3D(scene);
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden />;
}
