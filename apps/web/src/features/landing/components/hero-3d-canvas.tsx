import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function Hero3dCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setIsSupported(false);
        return;
      }
    } catch {
      setIsSupported(false);
      return;
    }

    const getW = () => container.clientWidth || 460;
    const getH = () => container.clientHeight || 460;

    const width = getW();
    const height = getH();

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0.2, 3.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio 3-Point Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 2.0);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xb91c1c, 4.0); // Brand Crimson Accent Rim
    rimLight.position.set(-2, -3, -2);
    scene.add(rimLight);

    const topLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    topLight.position.set(0, 4, 1);
    scene.add(topLight);

    // 3D Gym Equipment Assembly (Dumbbell)
    const dumbbellGroup = new THREE.Group();

    // 1. Central Stainless Steel Knurled Bar
    const barGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.7, 32);
    const barMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.15,
    });
    const barMesh = new THREE.Mesh(barGeo, barMat);
    barMesh.rotation.z = Math.PI / 2;
    dumbbellGroup.add(barMesh);

    // Knurling Grip Texture Rings
    for (let i = -0.36; i <= 0.36; i += 0.08) {
      const ringGeo = new THREE.TorusGeometry(0.082, 0.007, 12, 32);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.9,
        roughness: 0.25,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.y = Math.PI / 2;
      ringMesh.position.x = i;
      dumbbellGroup.add(ringMesh);
    }

    // 2. Iron Weight Plate Materials
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x0f223d, // Deep Navy Steel
      metalness: 0.8,
      roughness: 0.28,
    });

    const crimsonAccentMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c, // Premium Red Ring
      metalness: 0.85,
      roughness: 0.2,
    });

    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.2,
    });

    // Plate Stacks
    const createPlateStack = (xOffset: number, isRight: boolean) => {
      const stack = new THREE.Group();
      stack.position.x = xOffset;

      // Inner Collar
      const innerCollarGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 24);
      const innerCollar = new THREE.Mesh(innerCollarGeo, collarMat);
      innerCollar.rotation.z = Math.PI / 2;
      innerCollar.position.x = isRight ? -0.04 : 0.04;
      stack.add(innerCollar);

      // Plate 1 (Heavy Inner Plate)
      const p1Geo = new THREE.CylinderGeometry(0.62, 0.62, 0.11, 32);
      const p1 = new THREE.Mesh(p1Geo, plateMat);
      p1.rotation.z = Math.PI / 2;
      p1.position.x = isRight ? 0.05 : -0.05;
      stack.add(p1);

      // Crimson Accent Ring on Plate 1
      const accentGeo = new THREE.TorusGeometry(0.62, 0.015, 16, 32);
      const accent = new THREE.Mesh(accentGeo, crimsonAccentMat);
      accent.rotation.y = Math.PI / 2;
      accent.position.x = isRight ? 0.05 : -0.05;
      stack.add(accent);

      // Plate 2 (Mid Plate)
      const p2Geo = new THREE.CylinderGeometry(0.52, 0.52, 0.1, 32);
      const p2 = new THREE.Mesh(p2Geo, plateMat);
      p2.rotation.z = Math.PI / 2;
      p2.position.x = isRight ? 0.17 : -0.17;
      stack.add(p2);

      // Plate 3 (Outer Plate)
      const p3Geo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 32);
      const p3 = new THREE.Mesh(p3Geo, plateMat);
      p3.rotation.z = Math.PI / 2;
      p3.position.x = isRight ? 0.28 : -0.28;
      stack.add(p3);

      // Hex End-Cap Lock Nut
      const nutGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.07, 6);
      const nut = new THREE.Mesh(nutGeo, collarMat);
      nut.rotation.z = Math.PI / 2;
      nut.position.x = isRight ? 0.36 : -0.36;
      stack.add(nut);

      dumbbellGroup.add(stack);
    };

    createPlateStack(0.55, true);
    createPlateStack(-0.55, false);

    // Initial orientation
    dumbbellGroup.scale.set(1.15, 1.15, 1.15);
    dumbbellGroup.position.set(0, 0, 0);
    dumbbellGroup.rotation.set(0.25, -0.4, 0.15);
    scene.add(dumbbellGroup);

    // Ambient Subtle Gyroscopic Telemetry Ring
    const orbitRingGeo = new THREE.RingGeometry(1.3, 1.32, 64);
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2.3;
    scene.add(orbitRing);

    // Smooth Interaction State
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let userRotX = 0.25;
    let userRotY = -0.4;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevX = clientX;
      prevY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - prevX;
      const dy = clientY - prevY;
      prevX = clientX;
      prevY = clientY;

      userRotY += dx * 0.008;
      userRotX += dy * 0.008;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    container.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Gentle floating levitation
      dumbbellGroup.position.y = Math.sin(time * 1.5) * 0.04;

      // Gentle continuous rotation when not dragging
      if (!isDragging) {
        userRotY += 0.004;
      }

      dumbbellGroup.rotation.y += (userRotY - dumbbellGroup.rotation.y) * 0.1;
      dumbbellGroup.rotation.x += (userRotX - dumbbellGroup.rotation.x) * 0.1;
      orbitRing.rotation.z = time * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  if (!isSupported) {
    return (
      <div className="w-full h-full min-h-[360px] flex items-center justify-center bg-[#F5F5F0] border border-[#E5E7EB] p-8 text-center">
        <div>
          <div className="w-16 h-16 mx-auto bg-[#0A192F] text-[#FBFBF9] flex items-center justify-center font-bold text-xl">
            TF
          </div>
          <p className="mt-3 font-bold text-sm text-[#0A192F]">Biometric Hardware Core</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[360px] sm:h-[420px] lg:h-[460px] flex items-center justify-center select-none cursor-grab active:cursor-grabbing bg-[#FAFAF8] border border-[#E5E7EB] overflow-hidden">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Real-Time Telemetry Badges */}
      <div className="absolute top-4 left-4 bg-white/95 border border-[#E5E7EB] px-3 py-1.5 text-left pointer-events-none shadow-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-none bg-[#16A34A] animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0A192F]">Turnstile Status</span>
        </div>
        <p className="text-[10px] text-[#6B7280] font-mono mt-0.5">Biometric Sync: 12ms</p>
      </div>

      <div className="absolute bottom-4 right-4 bg-[#0A192F] border border-[#334E70] px-3 py-1.5 text-left pointer-events-none text-[#FBFBF9] shadow-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-none bg-[#B91C1C]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#FBFBF9]">Zero Unauthorized Access</span>
        </div>
        <p className="text-[10px] text-[#CBD5E1] font-mono mt-0.5">Auto-Lock on Overdue Fees</p>
      </div>

      <div className="absolute bottom-4 left-4 hidden sm:block pointer-events-none text-[9px] font-mono uppercase tracking-widest text-[#94A3B8]">
        Interactive 3D Engine &bull; Drag to Rotate
      </div>
    </div>
  );
}
