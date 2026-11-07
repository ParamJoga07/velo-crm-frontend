import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = { className?: string };

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    const target = obj as unknown as {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (target.geometry) target.geometry.dispose();
    if (target.material) {
      const list = Array.isArray(target.material) ? target.material : [target.material];
      list.forEach((m) => m.dispose());
    }
  });
}

function wireShape(
  geometry: THREE.BufferGeometry,
  color: number,
  opacity: number,
  vertexSize: number,
) {
  const group = new THREE.Group();
  const edges = new THREE.EdgesGeometry(geometry, 12);
  group.add(
    new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    ),
  );

  const pos = geometry.getAttribute('position');
  const seen = new Set<string>();
  const sph = new THREE.SphereGeometry(vertexSize, 8, 8);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: Math.min(1, opacity + 0.35),
  });
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(2)}|${y.toFixed(2)}|${z.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const dot = new THREE.Mesh(sph, mat);
    dot.position.set(x, y, z);
    group.add(dot);
  }
  geometry.dispose();
  return group;
}

export function LoginScene3D({ className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07090d, 0.055);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    camera.position.set(0, 0.15, 9.2);

    const rig = new THREE.Group();
    scene.add(rig);

    const core = wireShape(new THREE.IcosahedronGeometry(1.85, 1), 0xc5dff6, 0.92, 0.045);
    rig.add(core);

    const ringA = wireShape(new THREE.TorusGeometry(2.55, 0.012, 8, 80), 0x94bce3, 0.7, 0.02);
    ringA.rotation.x = Math.PI / 2.4;
    rig.add(ringA);
    const ringB = wireShape(new THREE.TorusGeometry(3.15, 0.008, 8, 96), 0x7fd8ff, 0.45, 0.016);
    ringB.rotation.x = Math.PI / 1.7;
    ringB.rotation.y = 0.6;
    rig.add(ringB);

    const satellites = [
      wireShape(new THREE.OctahedronGeometry(0.28), 0xe9f4ff, 0.95, 0.03),
      wireShape(new THREE.TetrahedronGeometry(0.24), 0x94bce3, 0.9, 0.028),
      wireShape(new THREE.IcosahedronGeometry(0.2, 0), 0xb5d9fd, 0.85, 0.024),
    ];
    satellites.forEach((sat) => rig.add(sat));

    const starGeo = new THREE.BufferGeometry();
    const starCount = 280;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 22;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0x9ec4ea,
        size: 0.028,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    );
    scene.add(stars);

    let yaw = 0.4;
    let pitch = 0.15;
    let velYaw = 0;
    let velPitch = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let hoverX = 0;
    let hoverY = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      host.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      hoverX = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      hoverY = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      velYaw = dx * 0.008;
      velPitch = dy * 0.008;
      yaw += velYaw;
      pitch = THREE.MathUtils.clamp(pitch + velPitch, -0.9, 0.9);
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    };

    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let last = performance.now();
    let elapsed = 0;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      if (!dragging && !reduce) {
        velYaw += (0.18 - velYaw) * (1 - Math.exp(-0.6 * dt));
        velPitch *= Math.exp(-1.4 * dt);
        yaw += velYaw * dt;
        pitch = THREE.MathUtils.clamp(pitch + velPitch * dt, -0.9, 0.9);
      } else if (!dragging) {
        velYaw *= Math.exp(-2 * dt);
        velPitch *= Math.exp(-2 * dt);
      }

      const leanX = reduce ? 0 : hoverY * -0.18;
      const leanY = reduce ? 0 : hoverX * 0.22;
      rig.rotation.y = THREE.MathUtils.damp(rig.rotation.y, yaw + leanY, 8, dt);
      rig.rotation.x = THREE.MathUtils.damp(rig.rotation.x, pitch + leanX, 8, dt);

      if (!reduce) {
        ringA.rotation.z += dt * 0.15;
        ringB.rotation.z -= dt * 0.08;
        satellites.forEach((sat, i) => {
          const speed = 0.35 + i * 0.12;
          const radius = 2.7 + i * 0.45;
          const a = elapsed * speed + i * 2.1;
          sat.position.set(
            Math.cos(a) * radius,
            Math.sin(a * 0.8 + i) * 0.85,
            Math.sin(a) * radius * 0.35,
          );
          sat.rotation.y += dt * (0.6 + i * 0.2);
          sat.rotation.x += dt * 0.25;
        });
        stars.rotation.y = elapsed * 0.01;
      }

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
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
