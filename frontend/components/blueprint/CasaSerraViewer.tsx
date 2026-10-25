"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BlueprintProject, RoomSpec, TimeOfDay } from "@/lib/floorplan-types";

interface CasaSerraViewerProps {
  project: BlueprintProject;
  scrollProgress: number; // 0 (2D) to 1 (full 3D tour)
  onScrollProgressChange: (progress: number) => void;
}

export default function CasaSerraViewer({
  project,
  scrollProgress,
  onScrollProgressChange
}: CasaSerraViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Stale-closure prevention ref: ALWAYS holds current scroll progress!
  const scrollProgressRef = useRef<number>(scrollProgress);
  useEffect(() => {
    scrollProgressRef.current = scrollProgress;
  }, [scrollProgress]);

  const [activeRoomIndex, setActiveRoomIndex] = useState<number>(0);
  const [isAutoTouring, setIsAutoTouring] = useState<boolean>(false);
  const [isOrbitMode, setIsOrbitMode] = useState<boolean>(false);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const wallGroupRef = useRef<THREE.Group | null>(null);
  const floorGroupRef = useRef<THREE.Group | null>(null);
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Smooth camera positions
  const currentCamPos = useRef(new THREE.Vector3(0, 32, 1));
  const targetCamPos = useRef(new THREE.Vector3(0, 32, 1));
  const currentCamLook = useRef(new THREE.Vector3(0, 0, 0));
  const targetCamLook = useRef(new THREE.Vector3(0, 0, 0));

  // Free Orbit drag state
  const mouseState = useRef({ isDown: false, prevX: 0, prevY: 0, phi: Math.PI / 3.4, theta: Math.PI / 4.2, radius: 24 });

  const activeRoom = project.rooms[activeRoomIndex] || project.rooms[0];

  // 1. UPDATE SCROLL PROGRESS & ROOM SELECTION
  const updateProgress = (newProg: number) => {
    const clamped = Math.max(0, Math.min(1, newProg));
    scrollProgressRef.current = clamped;
    onScrollProgressChange(clamped);

    if (clamped <= 0.2) {
      setActiveRoomIndex(0);
    } else {
      const tourProgress = (clamped - 0.2) / 0.8;
      const roomIdx = Math.min(
        project.rooms.length - 1,
        Math.floor(tourProgress * project.rooms.length)
      );
      setActiveRoomIndex(roomIdx);
    }
  };

  // 2. GLOBAL WINDOW WHEEL LISTENER (Guarantees scrolling works everywhere on the page!)
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      // Don't scroll if inside sidebar scrollable element
      const target = e.target as HTMLElement;
      if (target && target.closest("aside")) return;

      e.preventDefault();
      const delta = e.deltaY * 0.0012;
      updateProgress(scrollProgressRef.current + delta);
    };

    window.addEventListener("wheel", handleGlobalWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleGlobalWheel);
  }, [project]);

  // 3. THREE.JS INITIALIZATION
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1218);
    scene.fog = new THREE.FogExp2(0x0f1218, 0.005);
    sceneRef.current = scene;

    const bW = project.specs.width || 16;
    const bL = project.specs.length || 20;
    const initMaxDim = Math.max(bW, bL, 16);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 800);
    camera.position.set(0, initMaxDim * 2.2, 0.05);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    currentCamPos.current.set(0, initMaxDim * 2.2, 0.05);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // Remove any leftover canvas from previous mounts
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xfff8ee, 0x3d4758, 0.75);
    scene.add(hemi);

    // Warm Directional Sunlight with Shadows
    const sun = new THREE.DirectionalLight(0xfff3e0, 2.9);
    sun.position.set(24, 32, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 120;
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    sun.shadow.bias = -0.0003;
    scene.add(sun);
    sunLightRef.current = sun;

    // Architectural Ground Grid
    const grid = new THREE.GridHelper(100, 100, 0x364052, 0x1b202a);
    grid.position.y = -0.05;
    scene.add(grid);

    // Groups
    const floorGroup = new THREE.Group();
    const wallGroup = new THREE.Group();
    const furnitureGroup = new THREE.Group();
    scene.add(floorGroup);
    scene.add(wallGroup);
    scene.add(furnitureGroup);
    floorGroupRef.current = floorGroup;
    wallGroupRef.current = wallGroup;
    furnitureGroupRef.current = furnitureGroup;

    // Build the 3D model
    buildModel(scene, floorGroup, wallGroup, furnitureGroup);

    // RENDER LOOP
    let currentExtrusion = 0.02;
    let frameCount = 0;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      try {
        frameCount++;
        // Camera motion: Free Orbit or Choreographed Rail
        if (cameraRef.current) {
          if (isOrbitMode) {
            const { radius, phi, theta } = mouseState.current;
            const x = radius * Math.sin(phi) * Math.sin(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.cos(theta);
            cameraRef.current.position.lerp(new THREE.Vector3(x, Math.max(y, 1.5), z), 0.08);
            cameraRef.current.lookAt(targetCamLook.current);
          } else {
            currentCamPos.current.lerp(targetCamPos.current, 0.08);
            currentCamLook.current.lerp(targetCamLook.current, 0.08);
            cameraRef.current.position.copy(currentCamPos.current);
            cameraRef.current.lookAt(currentCamLook.current);
          }

          // Camera lerp completed
        }

        // Smooth wall extrusion: 0.02 in 2D, 1.0 in 3D
        const p = scrollProgressRef.current;
        const targetExtrude = p <= 0.06 ? 0.02 : Math.min(1.0, (p - 0.06) * 4.2);
        currentExtrusion += (targetExtrude - currentExtrusion) * 0.12;

        if (wallGroupRef.current) {
          wallGroupRef.current.scale.set(1, currentExtrusion, 1);
          wallGroupRef.current.visible = true;
        }
        if (furnitureGroupRef.current) {
          furnitureGroupRef.current.visible = currentExtrusion > 0.15;
          furnitureGroupRef.current.position.y = (currentExtrusion - 1) * 1.2;
        }

        renderer.render(scene, cameraRef.current!);
      } catch (err) {
        console.error("FATAL ANIMATE ERROR:", err);
      }
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [project, isOrbitMode]);

  // 4. DRAMATIC ARCHITECTURAL CAMERA CHOREOGRAPHY
  useEffect(() => {
    const p = scrollProgress;
    const bW = project.specs.width || 16;
    const bL = project.specs.length || 20;
    const maxDim = Math.max(bW, bL, 16);

    // PHASE 1: 2D BLUEPRINT VIEW (p = 0 to 0.05)
    // Overhead bird's-eye view with enough altitude so the whole blueprint fits comfortably
    if (p <= 0.05) {
      targetCamPos.current.set(0, maxDim * 2.2, 0.05);
      targetCamLook.current.set(0, 0, 0);
    } 
    // PHASE 2: 3D ISOMETRIC OVERVIEW (p = 0.05 to 0.30)
    // Camera swoops smoothly from overhead 2D down to a glorious 42° 3D Axonometric Isometric View
    // Walls and furniture extrude upward out of the floor in real-time!
    else if (p <= 0.30) {
      const t = (p - 0.05) / 0.25; // 0 to 1
      const startPos = new THREE.Vector3(0, maxDim * 2.2, 0.05);
      const endPos = new THREE.Vector3(-maxDim * 1.1, maxDim * 1.15, maxDim * 1.25);
      targetCamPos.current.lerpVectors(startPos, endPos, t);
      targetCamLook.current.set(0, 0.6, 0);
    } 
    // PHASE 3: ELEVATED ROOM WALKTHROUGH (p = 0.30 to 1.0)
    // Camera glides over each room from an elevated cutaway angle, looking straight INTO the room!
    // Never blocked by walls; full interior, furniture, and dimensions are clearly visible!
    else {
      const t = (p - 0.30) / 0.70; // 0 to 1
      const totalRooms = project.rooms.length;
      const roomFloat = t * (totalRooms - 1);
      const currIdx = Math.floor(roomFloat);
      const nextIdx = Math.min(totalRooms - 1, currIdx + 1);
      const blend = roomFloat - currIdx;

      const r1 = project.rooms[currIdx] || project.rooms[0];
      const r2 = project.rooms[nextIdx] || r1;

      const c1X = (r1.bounds[0] + r1.bounds[2]) / 2;
      const c1Z = (r1.bounds[1] + r1.bounds[3]) / 2;
      const c2X = (r2.bounds[0] + r2.bounds[2]) / 2;
      const c2Z = (r2.bounds[1] + r2.bounds[3]) / 2;

      const curX = c1X + (c2X - c1X) * blend;
      const curZ = c1Z + (c2Z - c1Z) * blend;

      // Elevated cutaway angle looking directly down into the target room
      const roomDistance = Math.max(9, maxDim * 0.52);
      targetCamPos.current.set(curX - roomDistance * 0.72, roomDistance * 0.88, curZ + roomDistance * 0.82);
      targetCamLook.current.set(curX, 0.5, curZ);
    }
  }, [scrollProgress, project]);

  // 5. BUILD 3D ARCHITECTURAL MODEL & BLUEPRINT FLOOR TEXTURE
  const buildModel = (
    scene: THREE.Scene,
    floorGroup: THREE.Group,
    wallGroup: THREE.Group,
    furnitureGroup: THREE.Group
  ) => {
    while (floorGroup.children.length > 0) floorGroup.remove(floorGroup.children[0]);
    while (wallGroup.children.length > 0) wallGroup.remove(wallGroup.children[0]);
    while (furnitureGroup.children.length > 0) furnitureGroup.remove(furnitureGroup.children[0]);

    // Architectural cutaway wall height (2.4m standard BIM cutaway)
    const wallHeight = Math.min(project.specs.ceilingHeight || 3.0, 2.6);
    const wallThick = project.specs.exteriorWallThickness || 0.22;

    // Distinct materials: Wall faces (warm sandstone plaster), Wall top cut cap (dark architectural cap)
    const wallSideMat = new THREE.MeshStandardMaterial({
      color: 0xded8cb,
      roughness: 0.6,
      metalness: 0.05
    });

    const wallCapMat = new THREE.MeshStandardMaterial({
      color: 0x242832,
      roughness: 0.8,
      metalness: 0.1
    });

    // Multi-material for walls: sides are sandstone, top cut face is dark charcoal
    const wallMaterials = [
      wallSideMat, // right (+X)
      wallSideMat, // left (-X)
      wallCapMat,  // top (+Y) - CUT SECTION CAP!
      wallSideMat, // bottom (-Y)
      wallSideMat, // front (+Z)
      wallSideMat  // back (-Z)
    ];

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x1d212a, linewidth: 2 });

    // Base Foundation Slab
    const slabGeo = new THREE.BoxGeometry(project.specs.width + 6, 0.25, project.specs.length + 6);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x12151d, roughness: 0.95 });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.y = -0.13;
    slabMesh.receiveShadow = true;
    floorGroup.add(slabMesh);

    // BLUEPRINT 2D IMAGE AS BASE FLOOR (Displays user's exact uploaded drawing)
    if (project.originalBlueprintUrl) {
      const texLoader = new THREE.TextureLoader();
      texLoader.load(project.originalBlueprintUrl, (tex) => {
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        const planeGeo = new THREE.PlaneGeometry(project.specs.width, project.specs.length);
        const planeMat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.96,
          side: THREE.DoubleSide
        });
        const planeMesh = new THREE.Mesh(planeGeo, planeMat);
        planeMesh.rotation.x = -Math.PI / 2;
        planeMesh.position.y = 0.02;
        floorGroup.add(planeMesh);
      });
    }

    // Build each room's floor & perimeter walls
    project.rooms.forEach((room) => {
      const [x0, z0, x1, z1] = room.bounds;
      const rW = Math.abs(x1 - x0);
      const rD = Math.abs(z1 - z0);
      const cX = (x0 + x1) / 2;
      const cZ = (z0 + z1) / 2;

      // Floor tint
      let floorColor = 0xe8e4dc;
      if (room.floorMaterial === "oak") floorColor = 0xc89f6e;
      else if (room.floorMaterial === "dark_wood") floorColor = 0x5a4128;
      else if (room.floorMaterial === "marble") floorColor = 0xf5f3ee;
      else if (room.floorMaterial === "tile") floorColor = 0x8a919d;
      else if (room.floorMaterial === "grass") floorColor = 0x4f6e4d;
      else if (room.floorMaterial === "gravel") floorColor = 0xa3a7af;

      // Room floor plane (semi-transparent if blueprint image exists, solid if no image)
      const floorGeo = new THREE.BoxGeometry(rW, 0.05, rD);
      const floorMat = new THREE.MeshStandardMaterial({
        color: floorColor,
        roughness: room.floorMaterial === "marble" ? 0.25 : 0.7,
        transparent: Boolean(project.originalBlueprintUrl),
        opacity: project.originalBlueprintUrl ? 0.45 : 1.0
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(cX, 0.03, cZ);
      floorMesh.receiveShadow = true;
      floorGroup.add(floorMesh);

      // Walls with proper extrusion origin at ground level (translate Y by h/2) and black architectural edges
      const addWall = (w: number, h: number, d: number, px: number, pz: number) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        geo.translate(0, h / 2, 0);
        const mesh = new THREE.Mesh(geo, wallMaterials);
        mesh.position.set(px, 0, pz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Architectural edge outlines (makes 3D walls pop unmistakably!)
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, edgeMat);
        mesh.add(line);

        wallGroup.add(mesh);
      };

      // Add 4 walls per room with standard door gap (leave front or side open for circulation)
      addWall(rW, wallHeight, wallThick, cX, z0);
      addWall(rW, wallHeight, wallThick, cX, z1);
      addWall(wallThick, wallHeight, rD, x0, cZ);
      addWall(wallThick, wallHeight, rD, x1, cZ);

      // Furniture
      buildFurniture(room, cX, cZ, rW, rD, furnitureGroup);
    });
  };

  // 6. PROCEDURAL ARCHITECTURAL FURNITURE
  const buildFurniture = (
    room: RoomSpec,
    cx: number,
    cz: number,
    w: number,
    d: number,
    group: THREE.Group
  ) => {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8c6239, roughness: 0.5 });
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x3d4756, roughness: 0.7 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3 });

    if (room.category === "living") {
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.65, 3.6), 0.55, 1.1), sofaMat);
      sofa.position.set(cx, 0.28, cz - 0.4);
      sofa.castShadow = true;
      group.add(sofa);

      const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.38, 0.9), woodMat);
      table.position.set(cx, 0.2, cz + 0.6);
      table.castShadow = true;
      group.add(table);
    } else if (room.category === "bedroom") {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 2.2), whiteMat);
      bed.position.set(cx, 0.33, cz);
      bed.castShadow = true;
      group.add(bed);

      const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.15), woodMat);
      headboard.position.set(cx, 0.6, cz - 1.15);
      headboard.castShadow = true;
      group.add(headboard);
    } else if (room.category === "kitchen") {
      const island = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.55, 3.0), 0.95, 0.9), whiteMat);
      island.position.set(cx, 0.48, cz - d * 0.15);
      island.castShadow = true;
      group.add(island);

      const dining = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.5, 2.2), 0.8, 1.0), woodMat);
      dining.position.set(cx, 0.42, cz + d * 0.25);
      dining.castShadow = true;
      group.add(dining);
    } else if (room.category === "bath") {
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.48, 0.65, 24), whiteMat);
      tub.scale.set(1.5, 1, 1);
      tub.position.set(cx, 0.35, cz);
      tub.castShadow = true;
      group.add(tub);
    }
  };

  // 7. MOUSE DRAG ORBIT HANDLERS
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseState.current.isDown = true;
    mouseState.current.prevX = e.clientX;
    mouseState.current.prevY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseState.current.isDown) return;
    const deltaX = e.clientX - mouseState.current.prevX;
    const deltaY = e.clientY - mouseState.current.prevY;
    mouseState.current.prevX = e.clientX;
    mouseState.current.prevY = e.clientY;

    if (!isOrbitMode) setIsOrbitMode(true);

    mouseState.current.theta += deltaX * 0.008;
    mouseState.current.phi = Math.max(0.15, Math.min(Math.PI / 2.1, mouseState.current.phi - deltaY * 0.008));
  };

  const handleMouseUp = () => {
    mouseState.current.isDown = false;
  };

  // Auto Tour
  useEffect(() => {
    if (!isAutoTouring) return;
    const interval = setInterval(() => {
      const nextP = Math.min(1.0, scrollProgressRef.current + 0.008);
      updateProgress(nextP);
      if (nextP >= 1.0) {
        setIsAutoTouring(false);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [isAutoTouring]);

  return (
    <div 
      className="relative w-full h-full bg-[#0c0e14] select-none overflow-hidden font-sans text-neutral-200 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 3D CANVAS */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* TOP HEADER: Architectural Title & Scale */}
      <div className="absolute top-0 left-0 right-0 p-5 flex items-center justify-between pointer-events-none z-10 bg-gradient-to-b from-black/85 via-black/35 to-transparent">
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-sm">
            📐
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                {project.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-neutral-300 font-mono">
                {project.code}
              </span>
            </div>
            <p className="text-xs text-neutral-400 flex items-center gap-2">
              <span>{project.subtitle}</span>
              <span>•</span>
              <span className="text-amber-400 font-medium">Tỉ lệ {project.specs.scale}</span>
              <span>•</span>
              <span>{project.specs.totalArea} m²</span>
            </p>
          </div>
        </div>

        {/* View Mode Direct Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => {
              setIsOrbitMode(false);
              updateProgress(0);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              scrollProgress < 0.08 && !isOrbitMode
                ? "bg-amber-400 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20"
                : "bg-[#181c25]/90 text-neutral-300 border-[#2b3342] hover:bg-[#222734]"
            }`}
          >
            2D Mặt Bằng
          </button>

          <button
            onClick={() => {
              setIsOrbitMode(false);
              updateProgress(0.28);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              scrollProgress >= 0.15 && scrollProgress <= 0.35 && !isOrbitMode
                ? "bg-amber-400 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20"
                : "bg-[#181c25]/90 text-neutral-300 border-[#2b3342] hover:bg-[#222734]"
            }`}
          >
            3D Phối Cảnh
          </button>

          <button
            onClick={() => {
              setIsOrbitMode(!isOrbitMode);
              if (!isOrbitMode) updateProgress(0.3);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              isOrbitMode
                ? "bg-amber-400 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20"
                : "bg-[#181c25]/90 text-neutral-300 border-[#2b3342] hover:bg-[#222734]"
            }`}
          >
            Xoay 360° (Kéo Chuột)
          </button>

          <button
            onClick={() => setIsAutoTouring(!isAutoTouring)}
            className="px-3 py-1.5 rounded-xl bg-[#181c25]/90 hover:bg-[#222734] border border-[#2b3342] text-xs font-semibold text-amber-300 transition"
          >
            {isAutoTouring ? "⏸ Tạm Dừng" : "▶ Tự Động Cuộn"}
          </button>
        </div>
      </div>

      {/* 2D HELPER BANNER (Visible when in 2D mode) */}
      {scrollProgress <= 0.08 && !isOrbitMode && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none animate-bounce">
          <div className="px-5 py-2.5 rounded-2xl bg-black/80 backdrop-blur-md border border-amber-500/30 text-center shadow-2xl flex items-center gap-2.5">
            <span className="text-amber-400 text-lg">🖱</span>
            <span className="text-xs font-semibold text-white">
              Cuộn chuột xuống hoặc kéo slider ở dưới để dựng tường 3D và khám phá từng phòng
            </span>
          </div>
        </div>
      )}

      {/* RIGHT SIDE: ROOM SPEC CARD */}
      {scrollProgress > 0.22 && activeRoom && (
        <div className="absolute right-5 top-20 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl bg-[#141822]/95 backdrop-blur-xl border border-[#2c3444] p-5 shadow-2xl z-10 pointer-events-auto transition-all">
          <div className="flex items-center justify-between border-b border-[#242b38] pb-3 mb-3">
            <div>
              <span className="text-[10px] tracking-wider uppercase font-mono text-amber-400 font-semibold block">
                KHÔNG GIAN #{activeRoomIndex + 1} · {activeRoom.category.toUpperCase()}
              </span>
              <h3 className="text-base font-bold text-white">
                {activeRoom.vietnameseName || activeRoom.name}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-base font-mono font-bold text-amber-300 block">
                {activeRoom.area} m²
              </span>
              <span className="text-[10px] text-neutral-400">
                Cao {activeRoom.ceilingHeight || project.specs.ceilingHeight}m
              </span>
            </div>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed mb-4">
            {activeRoom.description}
          </p>

          <div className="space-y-2 text-xs border-t border-[#242b38] pt-3 text-neutral-400">
            {activeRoom.specs.orientation && (
              <div className="flex justify-between">
                <span>Hướng đón sáng:</span>
                <span className="text-neutral-200 font-medium">{activeRoom.specs.orientation}</span>
              </div>
            )}
            {activeRoom.specs.ventilation && (
              <div className="flex justify-between">
                <span>Thông gió:</span>
                <span className="text-neutral-200 font-medium">{activeRoom.specs.ventilation}</span>
              </div>
            )}
            {activeRoom.floorMaterial && (
              <div className="flex justify-between">
                <span>Vật liệu sàn:</span>
                <span className="text-amber-300 font-medium capitalize">{activeRoom.floorMaterial}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM ROOM TIMELINE RULER & SCROLL SCRUBBER */}
      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-auto">
        <div className="max-w-4xl mx-auto rounded-2xl bg-[#13161f]/95 backdrop-blur-2xl border border-[#272e3d] p-3 shadow-2xl space-y-2">
          
          {/* Progress Slider (Scrubber) */}
          <div className="flex items-center gap-3 px-2">
            <span className="text-[11px] font-mono text-neutral-400 font-semibold">
              2D
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.005}
              value={scrollProgress}
              onChange={(e) => {
                setIsOrbitMode(false);
                updateProgress(parseFloat(e.target.value));
              }}
              className="flex-1 accent-amber-400 h-1.5 bg-[#252c3a] rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono text-amber-400 font-semibold">
              {Math.round(scrollProgress * 100)}% 3D
            </span>
          </div>

          {/* Timeline Room Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {project.rooms.map((room, idx) => {
              const isActive = idx === activeRoomIndex && scrollProgress > 0.18;
              return (
                <button
                  key={room.id}
                  onClick={() => {
                    setIsOrbitMode(false);
                    const total = project.rooms.length;
                    const targetProgress = 0.35 + (idx / Math.max(1, total - 1)) * 0.65;
                    updateProgress(targetProgress);
                  }}
                  className={`flex-1 min-w-[120px] px-3 py-2 rounded-xl border text-left transition relative overflow-hidden ${
                    isActive
                      ? "bg-amber-500/15 border-amber-400 text-white shadow-lg shadow-amber-500/10"
                      : "bg-[#181c25] border-[#29303f] hover:border-neutral-500 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400" />
                  )}
                  <span className="block text-[10px] font-mono text-neutral-500">
                    0{idx + 1} · {room.area}m²
                  </span>
                  <span className="block text-xs font-semibold truncate text-white">
                    {room.vietnameseName || room.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
