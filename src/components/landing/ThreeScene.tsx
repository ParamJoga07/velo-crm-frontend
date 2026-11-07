import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type Pointer = { x: number; y: number };

export type SceneHandle = {
  /** Called every frame (unless reduced motion). dt in seconds, elapsed in seconds. */
  update?: (dt: number, elapsed: number, pointer: Pointer) => void;
  onResize?: (width: number, height: number) => void;
  dispose?: () => void;
};

export type SceneBuilder = (ctx: {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  host: HTMLElement;
  reduce: boolean;
}) => SceneHandle;

type Props = {
  build: SceneBuilder;
  className?: string;
  fov?: number;
  cameraZ?: number;
  cameraY?: number;
};

export function disposeObject3D(root: THREE.Object3D) {
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

/**
 * Small, self-contained WebGL host. Owns the renderer, resize, the RAF loop and
 * the pointer, pauses when scrolled out of view, and hands everything else to
 * the `build` function so each illustration is just a scene description.
 */
export function ThreeScene({ build, className, fov = 35, cameraZ = 8, cameraY = 0 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    camera.position.set(0, cameraY, cameraZ);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const handle = buildRef.current({ scene, camera, renderer, host, reduce });

    const pointer: Pointer = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      pointer.x = THREE.MathUtils.clamp((e.clientX - cx) / Math.max(window.innerWidth, 1), -0.5, 0.5);
      pointer.y = THREE.MathUtils.clamp((e.clientY - cy) / Math.max(window.innerHeight, 1), -0.5, 0.5);
    };

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      handle.onResize?.(width, height);
      if (reduce) renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let running = false;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      handle.update?.(dt, elapsed, pointer);
      renderer.render(scene, camera);
    };

    const start = () => {
      if (running || reduce) return;
      running = true;
      last = performance.now();
      tick();
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? start() : stop()));
      },
      { threshold: 0.02 },
    );
    io.observe(host);

    if (reduce) {
      handle.update?.(0, 0, pointer);
      renderer.render(scene, camera);
    } else {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
    }

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      handle.dispose?.();
      disposeObject3D(scene);
      renderer.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
  }, [fov, cameraZ, cameraY]);

  return <div ref={hostRef} className={className} aria-hidden />;
}
