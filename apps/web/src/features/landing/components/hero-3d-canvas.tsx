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
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setIsSupported(false);
        return;
      }
    } catch {
      setIsSupported(false);
      return;
    }

    const width = container.clientWidth || 450;
    const height = container.clientHeight || 450;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 5.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xb91c1c, 3.2); // Brand crimson rim light
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const topFill = new THREE.DirectionalLight(0x60a5fa, 1.2); // Cool blue-slate fill
    topFill.position.set(0, 6, 0);
    scene.add(topFill);

    // 3D Dumbbell Assembly
    const dumbbellGroup = new THREE.Group();

    // 1. Central Knurled Grip Bar
    const barGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.4, 32);
    const barMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.22,
    });
    const barMesh = new THREE.Mesh(barGeo, barMat);
    barMesh.rotation.z = Math.PI / 2;
    dumbbellGroup.add(barMesh);

    // Center Grip Ring Details
    for (let i = -0.5; i <= 0.5; i += 0.25) {
      const ringGeo = new THREE.TorusGeometry(0.125, 0.012, 16, 32);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        metalness: 0.95,
        roughness: 0.15,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.y = Math.PI / 2;
      ringMesh.position.x = i;
      dumbbellGroup.add(ringMesh);
    }

    // 2. Weights Material (Navy/Dark Matte Steel with Red Accents)
    const plateOuterMat = new THREE.MeshStandardMaterial({
      color: 0x0f223d, // Deep navy
      metalness: 0.65,
      roughness: 0.35,
    });

    const plateAccentMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c, // Premium red stripe
      metalness: 0.7,
      roughness: 0.3,
    });

    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.25,
    });

    // Helper to add plate stacks
    const createPlateStack = (xOffset: number, isRight: boolean) => {
      const sideGroup = new THREE.Group();
      sideGroup.position.x = xOffset;

      // Inner Collar
      const innerCollarGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 32);
      const innerCollar = new THREE.Mesh(innerCollarGeo, collarMat);
      innerCollar.rotation.z = Math.PI / 2;
      innerCollar.position.x = isRight ? -0.1 : 0.1;
      sideGroup.add(innerCollar);

      // Plate 1 (Inner Large Plate)
      const p1Geo = new THREE.CylinderGeometry(0.85, 0.85, 0.18, 32);
      const p1 = new THREE.Mesh(p1Geo, plateOuterMat);
      p1.rotation.z = Math.PI / 2;
      p1.position.x = isRight ? 0.05 : -0.05;
      sideGroup.add(p1);

      // Crimson Accent Rim on Plate 1
      const accentRingGeo = new THREE.TorusGeometry(0.85, 0.02, 16, 32);
      const accentRing = new THREE.Mesh(accentRingGeo, plateAccentMat);
      accentRing.rotation.y = Math.PI / 2;
      accentRing.position.x = isRight ? 0.05 : -0.05;
      sideGroup.add(accentRing);

      // Plate 2 (Mid Plate)
      const p2Geo = new THREE.CylinderGeometry(0.72, 0.72, 0.16, 32);
      const p2 = new THREE.Mesh(p2Geo, plateOuterMat);
      p2.rotation.z = Math.PI / 2;
      p2.position.x = isRight ? 0.26 : -0.26;
      sideGroup.add(p2);

      // Plate 3 (Outer Plate)
      const p3Geo = new THREE.CylinderGeometry(0.58, 0.58, 0.14, 32);
      const p3 = new THREE.Mesh(p3Geo, plateOuterMat);
      p3.rotation.z = Math.PI / 2;
      p3.position.x = isRight ? 0.44 : -0.44;
      sideGroup.add(p3);

      // Outer End-Cap Nut
      const nutGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 6); // Hexagonal nut
      const nut = new THREE.Mesh(nutGeo, collarMat);
      nut.rotation.z = Math.PI / 2;
      nut.position.x = isRight ? 0.55 : -0.55;
      sideGroup.add(nut);

      dumbbellGroup.add(sideGroup);
    };

    createPlateStack(0.8, true);
    createPlateStack(-0.8, false);

    // Initial Angle
    dumbbellGroup.rotation.x = 0.35;
    dumbbellGroup.rotation.y = -0.55;
    dumbbellGroup.rotation.z = 0.2;
    scene.add(dumbbellGroup);

    // Orbiting Geometric Telemetry Rings
    const orbitRingGeo = new THREE.RingGeometry(1.9, 1.94, 64);
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2.3;
    scene.add(orbitRing);

    // Mouse Interaction
    let targetRotationX = 0.35;
    let targetRotationY = -0.55;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) {
        // Subtle hover tilt
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const rect = container.getBoundingClientRect();
        const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const normY = -(((clientY - rect.top) / rect.height) * 2 - 1);
        targetRotationY = -0.55 + normX * 0.45;
        targetRotationX = 0.35 - normY * 0.3;
        return;
      }

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - prevMouseX;
      const deltaY = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      targetRotationY += deltaX * 0.012;
      targetRotationX += deltaY * 0.012;
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    container.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Gentle floating oscillation
      dumbbellGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.08;

      // Inertial damping towards target
      if (!isDragging) {
        targetRotationY += 0.003; // Gentle continuous spin
      }
      dumbbellGroup.rotation.y += (targetRotationY - dumbbellGroup.rotation.y) * 0.08;
      dumbbellGroup.rotation.x += (targetRotationX - dumbbellGroup.rotation.x) * 0.08;

      orbitRing.rotation.z = elapsedTime * 0.15;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      container.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  if (!isSupported) {
    return (
      <div className="w-full h-full min-h-[380px] flex items-center justify-center bg-[#F5F5F0] border border-[#E5E7EB] p-8 text-center">
        <div>
          <div className="w-20 h-20 mx-auto rounded-none bg-[#0A192F] flex items-center justify-center text-[#FBFBF9] font-bold text-2xl border border-[#CBD5E1]">
            TF
          </div>
          <p className="mt-4 font-semibold text-[#0A192F]">Interactive 3D Hardware Core</p>
          <p className="text-xs text-[#6B7280] mt-1">Biometric Turnstile & ERP Cloud Synchronizer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px] md:h-[480px] lg:h-[540px] flex items-center justify-center select-none cursor-grab active:cursor-grabbing">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Real-Time Telemetry Badges Floating in 3D Space */}
      <div className="absolute top-4 left-2 sm:left-4 bg-[#FFFFFF] border border-[#E5E7EB] px-3 py-2 text-left shadow-none pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-none bg-[#16A34A] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A192F]">Turnstile Status</span>
        </div>
        <p className="text-[10px] text-[#6B7280] mt-0.5 font-mono">Biometric Sync: 12ms</p>
      </div>

      <div className="absolute bottom-6 right-2 sm:right-4 bg-[#0A192F] border border-[#334E70] px-3 py-2 text-left shadow-none pointer-events-none text-[#FBFBF9]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-none bg-[#B91C1C]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#FBFBF9]">Zero Unauthorized Access</span>
        </div>
        <p className="text-[10px] text-[#CBD5E1] mt-0.5 font-mono">Auto-Lock on Due Fees</p>
      </div>

      <div className="absolute bottom-4 left-6 hidden sm:block pointer-events-none text-[10px] font-mono uppercase tracking-widest text-[#6B7280]">
        Interactive 3D Engine &bull; Drag to Inspect
      </div>
    </div>
  );
}

