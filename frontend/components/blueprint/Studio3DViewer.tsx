"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BlueprintProject, RoomSpec, TimeOfDay } from "@/lib/floorplan-types";

interface Studio3DViewerProps {
  project: BlueprintProject;
  activeRoomId?: string;
  onSelectRoom?: (room: RoomSpec) => void;
  showBlueprintOverlay?: boolean;
  showFurniture?: boolean;
  showLabels?: boolean;
  viewMode?: "2d" | "3d" | "orbit";
  onViewModeChange?: (mode: "2d" | "3d" | "orbit") => void;
}

export default function Studio3DViewer({
  project,
  activeRoomId,
  onSelectRoom,
  showBlueprintOverlay = true,
  showFurniture = true,
  showLabels = true,
  viewMode = "3d",
  onViewModeChange
}: Studio3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalViewMode, setInternalViewMode] = useState<"2d" | "3d" | "orbit">(viewMode);
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<TimeOfDay>(project.specs.timeOfDay || "golden_hour");
  const [isTourRunning, setIsTourRunning] = useState<boolean>(false);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const wallGroupRef = useRef<THREE.Group | null>(null);
  const floorGroupRef = useRef<THREE.Group | null>(null);
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const blueprintMeshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Camera targets for smooth animation
  const targetCamPos = useRef(new THREE.Vector3(0, 18, 22));
  const targetCamLook = useRef(new THREE.Vector3(0, 1, 0));
  const mouseState = useRef({ isDown: false, prevX: 0, prevY: 0, phi: Math.PI / 3.2, theta: Math.PI / 5, radius: 28 });

  // Sync external viewMode prop
  useEffect(() => {
    if (viewMode !== internalViewMode) {
      setInternalViewMode(viewMode);
      setCameraForMode(viewMode);
    }
  }, [viewMode]);

  // Set camera based on mode
  const setCameraForMode = (mode: "2d" | "3d" | "orbit", targetRoom?: RoomSpec) => {
    const focusX = targetRoom ? (targetRoom.bounds[0] + targetRoom.bounds[2]) / 2 : 0;
    const focusZ = targetRoom ? (targetRoom.bounds[1] + targetRoom.bounds[3]) / 2 : 0;

    if (mode === "2d") {
      targetCamPos.current.set(0, Math.max(project.specs.length * 1.5, 28), 0.001);
      targetCamLook.current.set(0, 0, 0);
    } else if (mode === "3d") {
      const dist = Math.max(project.specs.width, project.specs.length) * 0.9;
      targetCamPos.current.set(focusX - dist * 0.6, dist * 0.75, focusZ + dist * 0.8);
      targetCamLook.current.set(focusX, 0.8, focusZ);
    } else if (mode === "orbit") {
      targetCamLook.current.set(focusX, 0.8, focusZ);
    }
  };

  // 1. INITIALIZE THREE.JS SCENE
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x13161c); // Professional studio dark-slate background
    scene.fog = new THREE.FogExp2(0x13161c, 0.008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 500);
    camera.position.set(0, 22, 26);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Studio Ambient & Hemisphere Light
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambient);
    ambientLightRef.current = ambient;

    const hemi = new THREE.HemisphereLight(0xfffaed, 0x3d4452, 0.6);
    scene.add(hemi);

    // Warm Sun Light
    const sun = new THREE.DirectionalLight(0xfff6e6, 2.4);
    sun.position.set(22, 28, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    sunLightRef.current = sun;

    // Architectural Technical Grid Floor
    const grid = new THREE.GridHelper(80, 80, 0x3a4254, 0x222733);
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

    // Build the 3D House
    buildArchitecturalModel(scene, floorGroup, wallGroup, furnitureGroup);

    // Initial camera position
    setCameraForMode(internalViewMode);

    // RENDER LOOP
    let currentExtrusion = 1.0;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (cameraRef.current) {
        if (internalViewMode === "orbit") {
          const { radius, phi, theta } = mouseState.current;
          const x = radius * Math.sin(phi) * Math.sin(theta);
          const y = radius * Math.cos(phi);
          const z = radius * Math.sin(phi) * Math.cos(theta);
          cameraRef.current.position.lerp(new THREE.Vector3(x, Math.max(y, 1.5), z), 0.08);
          cameraRef.current.lookAt(targetCamLook.current);
        } else {
          cameraRef.current.position.lerp(targetCamPos.current, 0.07);
          const curDir = new THREE.Vector3();
          cameraRef.current.getWorldDirection(curDir);
          const desiredDir = targetCamLook.current.clone().sub(cameraRef.current.position).normalize();
          curDir.lerp(desiredDir, 0.07);
          cameraRef.current.lookAt(cameraRef.current.position.clone().add(curDir));
        }
      }

      // Smooth wall extrusion animation for 2D vs 3D
      const targetH = internalViewMode === "2d" ? 0.05 : 1.0;
      currentExtrusion += (targetH - currentExtrusion) * 0.1;
      if (wallGroupRef.current) wallGroupRef.current.scale.set(1, currentExtrusion, 1);
      if (furnitureGroupRef.current) {
        furnitureGroupRef.current.visible = showFurniture && currentExtrusion > 0.15;
      }

      renderer.render(scene, cameraRef.current!);
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
  }, [project]);

  // 2. BUILD ARCHITECTURAL GEOMETRY & BLUEPRINT TEXTURE
  const buildArchitecturalModel = (
    scene: THREE.Scene,
    floorGroup: THREE.Group,
    wallGroup: THREE.Group,
    furnitureGroup: THREE.Group
  ) => {
    while (floorGroup.children.length > 0) floorGroup.remove(floorGroup.children[0]);
    while (wallGroup.children.length > 0) wallGroup.remove(wallGroup.children[0]);
    while (furnitureGroup.children.length > 0) furnitureGroup.remove(furnitureGroup.children[0]);

    const wallHeight = project.specs.ceilingHeight || 3.2;
    const wallThick = project.specs.exteriorWallThickness || 0.20;

    // Wall Material: Crisp, modern architectural plaster with warm white tone
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeece9,
      roughness: 0.7,
      metalness: 0.05
    });

    // Base Slab
    const slabGeo = new THREE.BoxGeometry(project.specs.width + 2, 0.25, project.specs.length + 2);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.9 });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.y = -0.13;
    slabMesh.receiveShadow = true;
    floorGroup.add(slabMesh);

    // USER'S 2D BLUEPRINT TEXTURE OVERLAY (Shows user's real drawing on the 3D floor)
    if (project.originalBlueprintUrl && showBlueprintOverlay) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(project.originalBlueprintUrl, (tex) => {
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        const blueprintPlaneGeo = new THREE.PlaneGeometry(project.specs.width, project.specs.length);
        const blueprintPlaneMat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide
        });
        const blueprintMesh = new THREE.Mesh(blueprintPlaneGeo, blueprintPlaneMat);
        blueprintMesh.rotation.x = -Math.PI / 2;
        blueprintMesh.position.y = 0.02; // Just above ground
        floorGroup.add(blueprintMesh);
        blueprintMeshRef.current = blueprintMesh;
      });
    }

    // Build Rooms
    project.rooms.forEach((room) => {
      const [x0, z0, x1, z1] = room.bounds;
      const rW = Math.abs(x1 - x0);
      const rD = Math.abs(z1 - z0);
      const cX = (x0 + x1) / 2;
      const cZ = (z0 + z1) / 2;

      // Floor
      let floorColor = 0xe4dfd7; // Default light stone
      if (room.floorMaterial === "oak") floorColor = 0xcba071;
      else if (room.floorMaterial === "marble") floorColor = 0xf5f3ee;
      else if (room.floorMaterial === "tile") floorColor = 0x8a929e;
      else if (room.floorMaterial === "grass") floorColor = 0x4f704d;
      else if (room.floorMaterial === "gravel") floorColor = 0xd5d2cc;

      const floorGeo = new THREE.BoxGeometry(rW, 0.06, rD);
      const floorMat = new THREE.MeshStandardMaterial({
        color: floorColor,
        roughness: room.floorMaterial === "marble" ? 0.25 : 0.65,
        metalness: room.floorMaterial === "marble" ? 0.1 : 0.02
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(cX, 0.03, cZ);
      floorMesh.receiveShadow = true;
      floorGroup.add(floorMesh);

      // Walls
      const addWall = (w: number, h: number, d: number, px: number, pz: number) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        geo.translate(0, h / 2, 0);
        const mesh = new THREE.Mesh(geo, wallMaterial);
        mesh.position.set(px, 0, pz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        wallGroup.add(mesh);
      };

      addWall(rW, wallHeight, wallThick, cX, z0);
      addWall(rW, wallHeight, wallThick, cX, z1);
      addWall(wallThick, wallHeight, rD, x0, cZ);
      addWall(wallThick, wallHeight, rD, x1, cZ);

      // Furniture
      buildFurnitureForRoom(room, cX, cZ, rW, rD, furnitureGroup);
    });
  };

  // 3. VIBRANT PROCEDURAL FURNITURE
  const buildFurnitureForRoom = (
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
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x3e683b, roughness: 0.8 });

    if (room.category === "living") {
      // Sofa
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.65, 3.6), 0.45, 1.1), sofaMat);
      sofa.position.set(cx, 0.25, cz - 0.5);
      sofa.castShadow = true;
      group.add(sofa);

      const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.65, 3.6), 0.45, 0.25), sofaMat);
      sofaBack.position.set(cx, 0.65, cz - 0.95);
      sofaBack.castShadow = true;
      group.add(sofaBack);

      // Coffee Table
      const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.9), woodMat);
      table.position.set(cx, 0.2, cz + 0.5);
      table.castShadow = true;
      group.add(table);

      // Plant
      const plant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55), plantMat);
      plant.position.set(cx - w * 0.35, 0.7, cz - 0.8);
      group.add(plant);
    } else if (room.category === "bedroom") {
      // Bed
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 2.2), whiteMat);
      bed.position.set(cx, 0.3, cz);
      bed.castShadow = true;
      group.add(bed);

      const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 0.15), woodMat);
      headboard.position.set(cx, 0.55, cz - 1.15);
      headboard.castShadow = true;
      group.add(headboard);
    } else if (room.category === "kitchen") {
      // Island / Cabinet
      const kitchenIsland = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.6, 3.2), 0.9, 0.9), whiteMat);
      kitchenIsland.position.set(cx, 0.45, cz - d * 0.15);
      kitchenIsland.castShadow = true;
      group.add(kitchenIsland);

      // Dining Table
      const dining = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.5, 2.2), 0.75, 1.0), woodMat);
      dining.position.set(cx, 0.4, cz + d * 0.25);
      dining.castShadow = true;
      group.add(dining);
    } else if (room.category === "bath") {
      // Bathtub
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.48, 0.6, 24), whiteMat);
      tub.scale.set(1.5, 1, 1);
      tub.position.set(cx, 0.32, cz);
      tub.castShadow = true;
      group.add(tub);
    }
  };

  // 4. DAYLIGHT / SUN TOGGLE
  useEffect(() => {
    if (!sunLightRef.current || !ambientLightRef.current) return;
    if (currentTimeOfDay === "morning") {
      sunLightRef.current.color.setHex(0xfff2e0);
      sunLightRef.current.intensity = 2.4;
      sunLightRef.current.position.set(28, 22, 14);
      ambientLightRef.current.intensity = 0.85;
    } else if (currentTimeOfDay === "noon") {
      sunLightRef.current.color.setHex(0xffffff);
      sunLightRef.current.intensity = 2.8;
      sunLightRef.current.position.set(5, 36, 5);
      ambientLightRef.current.intensity = 0.95;
    } else if (currentTimeOfDay === "golden_hour") {
      sunLightRef.current.color.setHex(0xffaa5e);
      sunLightRef.current.intensity = 2.6;
      sunLightRef.current.position.set(26, 14, -16);
      ambientLightRef.current.intensity = 0.65;
    } else if (currentTimeOfDay === "night") {
      sunLightRef.current.color.setHex(0x6080b0);
      sunLightRef.current.intensity = 0.5;
      sunLightRef.current.position.set(-15, 24, 18);
      ambientLightRef.current.intensity = 0.35;
    }
  }, [currentTimeOfDay]);

  // 5. VIEW SWITCHER
  const handleSwitchMode = (mode: "2d" | "3d" | "orbit") => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
    setCameraForMode(mode);
  };

  const handleRoomClick = (room: RoomSpec) => {
    onSelectRoom?.(room);
    setCameraForMode(internalViewMode, room);
  };

  // EXPORT 3D RENDER IMAGE
  const handleExportScreenshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${project.name.replace(/\s+/g, "_")}_3D_Render.png`;
    link.href = dataUrl;
    link.click();
  };

  // ORBIT CONTROLS LISTENERS
  const handleMouseDown = (e: React.MouseEvent) => {
    if (internalViewMode !== "orbit") return;
    mouseState.current.isDown = true;
    mouseState.current.prevX = e.clientX;
    mouseState.current.prevY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseState.current.isDown || internalViewMode !== "orbit") return;
    const deltaX = e.clientX - mouseState.current.prevX;
    const deltaY = e.clientY - mouseState.current.prevY;
    mouseState.current.prevX = e.clientX;
    mouseState.current.prevY = e.clientY;

    mouseState.current.theta += deltaX * 0.008;
    mouseState.current.phi = Math.max(0.1, Math.min(Math.PI / 2.1, mouseState.current.phi - deltaY * 0.008));
  };

  const handleMouseUp = () => {
    mouseState.current.isDown = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (internalViewMode === "orbit") {
      mouseState.current.radius = Math.max(8, Math.min(65, mouseState.current.radius + e.deltaY * 0.035));
    }
  };

  return (
    <div 
      className="relative w-full h-full bg-[#111317] select-none overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* THREE.JS CANVAS */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* TOP FLOATING CONTROLS BAR */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        {/* Left: View Modes */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-xl bg-[#1a1e27]/90 backdrop-blur-md border border-[#2e3646] shadow-xl">
          <button
            onClick={() => handleSwitchMode("2d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              internalViewMode === "2d" ? "bg-amber-400 text-black shadow" : "text-neutral-400 hover:text-white"
            }`}
          >
            2D Mặt Bằng
          </button>
          <button
            onClick={() => handleSwitchMode("3d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              internalViewMode === "3d" ? "bg-amber-400 text-black shadow" : "text-neutral-400 hover:text-white"
            }`}
          >
            3D Phối Cảnh
          </button>
          <button
            onClick={() => handleSwitchMode("orbit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              internalViewMode === "orbit" ? "bg-amber-400 text-black shadow" : "text-neutral-400 hover:text-white"
            }`}
          >
            Xoay Tự Do 360°
          </button>
        </div>

        {/* Right: Sunlight & Export */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#1a1e27]/90 backdrop-blur-md border border-[#2e3646] shadow-xl text-xs">
            <button
              onClick={() => setCurrentTimeOfDay("morning")}
              title="Bình minh"
              className={`p-1.5 rounded-lg transition ${currentTimeOfDay === "morning" ? "bg-white/10 text-amber-300" : "text-neutral-400 hover:text-white"}`}
            >
              🌅
            </button>
            <button
              onClick={() => setCurrentTimeOfDay("noon")}
              title="Trưa nắng"
              className={`p-1.5 rounded-lg transition ${currentTimeOfDay === "noon" ? "bg-white/10 text-amber-300" : "text-neutral-400 hover:text-white"}`}
            >
              ☀️
            </button>
            <button
              onClick={() => setCurrentTimeOfDay("golden_hour")}
              title="Hoàng hôn"
              className={`p-1.5 rounded-lg transition ${currentTimeOfDay === "golden_hour" ? "bg-white/10 text-amber-300" : "text-neutral-400 hover:text-white"}`}
            >
              🌇
            </button>
            <button
              onClick={() => setCurrentTimeOfDay("night")}
              title="Ban đêm"
              className={`p-1.5 rounded-lg transition ${currentTimeOfDay === "night" ? "bg-white/10 text-amber-300" : "text-neutral-400 hover:text-white"}`}
            >
              🌙
            </button>
          </div>

          <button
            onClick={handleExportScreenshot}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
          >
            <span>📸</span>
            <span>Xuất Ảnh 3D</span>
          </button>
        </div>
      </div>

      {/* 3D FLOATING ROOM LABELS */}
      {showLabels && (
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none z-10 flex items-center justify-center">
          <div className="pointer-events-auto flex items-center gap-2 p-2 rounded-2xl bg-[#161a23]/95 backdrop-blur-xl border border-[#2b3342] shadow-2xl overflow-x-auto max-w-full">
            <span className="text-xs font-semibold text-neutral-400 px-2 uppercase font-mono">
              Phòng:
            </span>
            {project.rooms.map((room) => {
              const isSelected = room.id === activeRoomId;
              return (
                <button
                  key={room.id}
                  onClick={() => handleRoomClick(room)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-amber-400 text-black font-bold shadow-md"
                      : "bg-[#202531] text-neutral-300 hover:bg-[#2c3343] hover:text-white"
                  }`}
                >
                  <span>{room.vietnameseName || room.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({room.area}m²)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
