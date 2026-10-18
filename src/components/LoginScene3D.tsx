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
  const edges = new THREE.EdgesGeometry(geometry, 18);
  const lines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  group.add(lines);

  const pos = geometry.getAttribute('position');
  const seen = new Set<string>();
  const sph = new THREE.SphereGeometry(vertexSize, 10, 10);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: Math.min(1, opacity + 0.25),
  });
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(3)}|${y.toFixed(3)}|${z.toFixed(3)}`;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080a0e, 0.045);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    camera.position.set(0, 0.15, 11);

    const cluster = new THREE.Group();
    scene.add(cluster);

    const pieces: { obj: THREE.Object3D; spinX: number; spinY: number }[] = [];

    const add = (
      obj: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      scale: number,
      spinX: number,
      spinY: number,
    ) => {
      obj.position.set(x, y, z);
      obj.scale.setScalar(scale);
      cluster.add(obj);
      pieces.push({ obj, spinX, spinY });
    };

    add(wireShape(new THREE.IcosahedronGeometry(2.15, 1), 0x94bce3, 0.42, 0.035), 0.2, 0.1, 0, 1, 0.07, 0.11);
    add(wireShape(new THREE.OctahedronGeometry(1.15), 0x7fd8ff, 0.5, 0.04), -3.4, 1.5, -0.8, 1, 0.12, -0.08);
    add(wireShape(new THREE.TetrahedronGeometry(1.05), 0x749dc4, 0.48, 0.045), 3.6, -1.4, -0.4, 1, -0.09, 0.14);
    add(wireShape(new THREE.DodecahedronGeometry(0.95), 0xb5d9fd, 0.38, 0.03), 2.8, 2.1, -1.6, 1, 0.06, -0.12);
    add(wireShape(new THREE.TorusGeometry(1.15, 0.22, 12, 36), 0x3d5a80, 0.55, 0.02), -2.6, -2.0, -0.6, 1, 0.15, 0.05);
    add(wireShape(new THREE.IcosahedronGeometry(0.7, 0), 0xe9f4ff, 0.55, 0.04), 0.8, -2.4, 0.6, 1, -0.16, 0.1);
    add(wireShape(new THREE.OctahedronGeometry(0.55), 0x94bce3, 0.4, 0.035), -4.2, -0.4, -2.2, 1, 0.08, 0.18);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 220;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 28;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 4;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0x94bce3,
        size: 0.035,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    );
    scene.add(stars);

    let pointerX = 0;
    let pointerY = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;
    let tiltX = 0;
    let tiltY = 0;
    let tiltVX = 0;
    let tiltVY = 0;
    let spin = 0.12;
    let yaw = 0;
    let havePointer = false;

    const onPointerMove = (e: PointerEvent) => {
      if (reduce) return;
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      if (havePointer) {
        spin = THREE.MathUtils.clamp(spin + (nx - pointerX) * 1.6, -0.85, 0.85);
      }
      pointerX = nx;
      pointerY = ny;
      havePointer = true;
      targetTiltY = nx * 0.55;
      targetTiltX = -ny * 0.38;
    };

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (reduce) renderer.render(scene, camera);
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

      const stiffness = 28;
      const damping = 2 * Math.sqrt(stiffness) * 0.88;
      tiltVX += ((targetTiltX - tiltX) * stiffness - tiltVX * damping) * dt;
      tiltVY += ((targetTiltY - tiltY) * stiffness - tiltVY * damping) * dt;
      tiltX += tiltVX * dt;
      tiltY += tiltVY * dt;
      spin += (0.12 - spin) * (1 - Math.exp(-1.15 * dt));
      yaw += spin * dt;

      cluster.rotation.x = tiltX + Math.sin(elapsed * 0.28) * 0.03;
      cluster.rotation.y = tiltY + yaw;
      cluster.rotation.z = pointerY * 0.04;
      cluster.position.x = THREE.MathUtils.damp(cluster.position.x, pointerX * 0.55, 4, dt);
      cluster.position.y = THREE.MathUtils.damp(cluster.position.y, -pointerY * 0.4, 4, dt);

      pieces.forEach((p) => {
        p.obj.rotation.x += p.spinX * dt;
        p.obj.rotation.y += p.spinY * dt;
      });
      stars.rotation.y = elapsed * 0.012;

      renderer.render(scene, camera);
    };

    if (reduce) {
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
