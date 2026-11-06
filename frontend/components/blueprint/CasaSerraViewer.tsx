"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as THREE from "three";
import { BlueprintProject, RoomSpec, convertBlueprintProjectToLayoutData } from "@/lib/floorplan-types";
import { exportLayoutDataToGLB } from "@/lib/floorplan-glb-exporter";
import { cleanupThreeScene } from "@/lib/three-cleanup";
import FloorLayerToolbar, { CameraMode } from "./FloorLayerToolbar";

interface CasaSerraViewerProps {
  project: BlueprintProject;
  scrollProgress: number; // 0 (2D) to 1 (full 3D tour)
  onScrollProgressChange: (progress: number) => void;
  onUploadClick?: () => void;
  onResetToDemo?: () => void;
  onSelectArchetype?: (archId: string) => void;
  onUpdateRoom?: (index: number, updated: Partial<RoomSpec>) => void;
  isCustomUploaded?: boolean;
}

interface CameraWaypoint {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

export default function CasaSerraViewer({
  project,
  scrollProgress,
  onScrollProgressChange,
  onUploadClick,
  onResetToDemo,
  onSelectArchetype,
  onUpdateRoom,
  isCustomUploaded = false,
}: CasaSerraViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Stale-closure prevention ref
  const scrollProgressRef = useRef<number>(scrollProgress);
  useEffect(() => {
    scrollProgressRef.current = scrollProgress;
  }, [scrollProgress]);

  const [activeRoomIndex, setActiveRoomIndex] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isEditingRoom, setIsEditingRoom] = useState<boolean>(false);
  const [isExportingGLB, setIsExportingGLB] = useState<boolean>(false);

  // Layer & Camera Controls (Phase 4 Story 4.2)
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [showCeilings, setShowCeilings] = useState<boolean>(true);
  const [showWalls, setShowWalls] = useState<boolean>(true);
  const [showFurniture, setShowFurniture] = useState<boolean>(true);
  const [showLandscape, setShowLandscape] = useState<boolean>(true);
  const [isRulerActive, setIsRulerActive] = useState<boolean>(false);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);

  const cameraModeRef = useRef<CameraMode>("orbit");
  const showCeilingsRef = useRef<boolean>(true);
  const showWallsRef = useRef<boolean>(true);
  const showFurnitureRef = useRef<boolean>(true);
  const showLandscapeRef = useRef<boolean>(true);
  const isRulerActiveRef = useRef<boolean>(false);

  useEffect(() => { cameraModeRef.current = cameraMode; }, [cameraMode]);
  useEffect(() => { showCeilingsRef.current = showCeilings; }, [showCeilings]);
  useEffect(() => { showWallsRef.current = showWalls; }, [showWalls]);
  useEffect(() => { showFurnitureRef.current = showFurniture; }, [showFurniture]);
  useEffect(() => { showLandscapeRef.current = showLandscape; }, [showLandscape]);
  useEffect(() => { isRulerActiveRef.current = isRulerActive; }, [isRulerActive]);

  // 3D Measurement Ruler references
  const rulerGroupRef = useRef<THREE.Group | null>(null);
  const rulerPointsRef = useRef<THREE.Vector3[]>([]);
  const rulerMarkersRef = useRef<THREE.Mesh[]>([]);
  const rulerLineRef = useRef<THREE.Line | null>(null);

  const clearMeasurement = useCallback(() => {
    if (rulerGroupRef.current) {
      rulerGroupRef.current.clear();
    }
    rulerMarkersRef.current = [];
    rulerLineRef.current = null;
    rulerPointsRef.current = [];
    setMeasuredDistance(null);
  }, []);

  // First-person walkthrough keyboard listeners
  const keysDown = useRef<Record<string, boolean>>({});
  const walkPos = useRef(new THREE.Vector3(0, 1.65, 0));
  const fpsAngles = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleCameraModeChange = (mode: CameraMode) => {
    setCameraMode(mode);
    if (mode === "walkthrough") {
      walkPos.current.set(currentCamPos.current.x, 1.65, currentCamPos.current.z);
      fpsAngles.current.yaw = lookOffset.current.yaw;
      fpsAngles.current.pitch = lookOffset.current.pitch;
    } else if (mode === "top_down") {
      lookOffset.current = { yaw: 0, pitch: 0 };
    }
  };

  const handleExportGLB = async () => {
    setIsExportingGLB(true);
    try {
      const layoutData = convertBlueprintProjectToLayoutData(project);
      await exportLayoutDataToGLB(layoutData, { autoDownload: true });
    } catch (err) {
      console.error("Failed to export GLB:", err);
      alert("Không thể xuất file 3D .GLB. Vui lòng thử lại!");
    } finally {
      setIsExportingGLB(false);
    }
  };

  // Three.js Core References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const wallGroupRef = useRef<THREE.Group | null>(null);
  const ceilingGroupRef = useRef<THREE.Group | null>(null);
  const floorGroupRef = useRef<THREE.Group | null>(null);
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const landscapeGroupRef = useRef<THREE.Group | null>(null);
  const doorPivotRef = useRef<THREE.Group | null>(null);
  const blueprintMeshRef = useRef<THREE.Mesh | null>(null);
  const roomFloorsRef = useRef<THREE.Mesh[]>([]);
  const roomInkMeshesRef = useRef<{ mesh: THREE.Mesh; roomId: string }[]>([]);
  const fireLightRef = useRef<THREE.PointLight | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Smooth camera vectors
  const currentCamPos = useRef(new THREE.Vector3(0, 22, 0.01));
  const targetCamPos = useRef(new THREE.Vector3(0, 22, 0.01));
  const currentCamLook = useRef(new THREE.Vector3(0, 0, 0));
  const targetCamLook = useRef(new THREE.Vector3(0, 0, 0));

  // Interactive mouse look-around offset (when dragging or looking around inside room)
  const lookOffset = useRef({ yaw: 0, pitch: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const isCasaSerra = project.id === "casa-serra-original";
  const activeRoom = project.rooms[activeRoomIndex] || project.rooms[0];

  // Helper to update progress and determine active room index
  const updateProgress = (newProg: number) => {
    const clamped = Math.max(0, Math.min(1, newProg));
    scrollProgressRef.current = clamped;
    onScrollProgressChange(clamped);

    if (clamped <= 0.28) {
      setActiveRoomIndex(0);
    } else if (clamped >= 0.88) {
      setActiveRoomIndex(project.rooms.length - 1);
    } else {
      const tourProgress = (clamped - 0.28) / 0.60;
      const roomIdx = Math.min(
        project.rooms.length - 1,
        Math.floor(tourProgress * project.rooms.length)
      );
      setActiveRoomIndex(roomIdx);
    }
  };

  // 1. GLOBAL WINDOW WHEEL LISTENER (Smooth momentum scrolling)
  useEffect(() => {
    let scrollVel = 0;
    const handleGlobalWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest("[data-no-scroll]")) return;

      e.preventDefault();
      const delta = e.deltaY * 0.00085;
      scrollVel += delta;
      updateProgress(scrollProgressRef.current + scrollVel);
      scrollVel *= 0.65;
    };

    window.addEventListener("wheel", handleGlobalWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleGlobalWheel);
  }, [project]);

  // 2. MOUSE DRAG LOOK-AROUND & 3D RULER CLICK
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let hasDragged = false;

    const onMouseDown = (e: MouseEvent) => {
      if (scrollProgressRef.current <= 0.15 && cameraModeRef.current === "orbit") return;
      isDragging.current = true;
      hasDragged = false;
      dragStart.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged = true;
      }
      dragStart.current = { x: e.clientX, y: e.clientY };

      if (cameraModeRef.current === "walkthrough") {
        fpsAngles.current.yaw -= dx * 0.0035;
        fpsAngles.current.pitch = Math.max(-1.3, Math.min(1.3, fpsAngles.current.pitch - dy * 0.003));
      } else {
        lookOffset.current.yaw -= dx * 0.004;
        lookOffset.current.pitch = Math.max(-0.65, Math.min(0.65, lookOffset.current.pitch - dy * 0.003));
      }
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onContainerClick = (e: MouseEvent) => {
      if (hasDragged) return; // Prevent placing measurement point when dragging view
      if (!isRulerActiveRef.current || !containerRef.current || !cameraRef.current || !rulerGroupRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const targets: THREE.Object3D[] = [];
      if (wallGroupRef.current) targets.push(wallGroupRef.current);
      if (floorGroupRef.current) targets.push(floorGroupRef.current);

      const intersects = raycaster.intersectObjects(targets, true);
      if (intersects.length > 0) {
        const hitPoint = intersects[0].point;

        if (rulerPointsRef.current.length >= 2) {
          clearMeasurement();
        }

        const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.copy(hitPoint);
        rulerGroupRef.current.add(sphere);
        rulerMarkersRef.current.push(sphere);

        rulerPointsRef.current.push(hitPoint.clone());

        if (rulerPointsRef.current.length === 2) {
          const p1 = rulerPointsRef.current[0];
          const p2 = rulerPointsRef.current[1];
          const dist = p1.distanceTo(p2);
          setMeasuredDistance(dist);

          const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          const lineMat = new THREE.LineBasicMaterial({
            color: 0x10b981,
            linewidth: 3
          });
          const line = new THREE.Line(lineGeo, lineMat);
          rulerGroupRef.current.add(line);
          rulerLineRef.current = line;
        }
      }
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("click", onContainerClick);

    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("click", onContainerClick);
    };
  }, [clearMeasurement]);

  // 3. THREE.JS INITIALIZATION WITH AUTHENTIC CASA SERRA LIGHTING & ENVIRONMENT
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Palette authentic to Lintel · Casa Serra: Warm Architectural Paper Canvas #efebe2
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xefebe2);
    scene.fog = new THREE.FogExp2(0xefebe2, 0.0032);
    sceneRef.current = scene;

    const bW = project.specs.width || 14;
    const bL = project.specs.length || 12;
    const maxDim = Math.max(bW, bL, 14);

    const init2DAlt = (maxDim * 0.72) / zoomScale;
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, init2DAlt, 0.01);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    currentCamPos.current.set(0, init2DAlt, 0.01);
    targetCamPos.current.set(0, init2DAlt, 0.01);
    currentCamLook.current.set(0, 0, 0);
    targetCamLook.current.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 5PM Late Afternoon Golden Sun (Casa Serra Golden Hour Lighting)
    const ambient = new THREE.AmbientLight(0xfff5ea, 1.35);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xfffbf2, 0xd4cebf, 1.05);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffecd2, 2.8);
    sun.position.set(28, 36, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 160;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.bias = -0.00015;
    scene.add(sun);

    // Warm Architectural Drafting Grid on Ground
    const grid = new THREE.GridHelper(160, 160, 0xd3cbbe, 0xe5dfd4);
    grid.position.y = -0.02;
    scene.add(grid);

    // Scene Groups
    const landscapeGroup = new THREE.Group();
    const floorGroup = new THREE.Group();
    const wallGroup = new THREE.Group();
    const ceilingGroup = new THREE.Group();
    const furnitureGroup = new THREE.Group();
    const rulerGroup = new THREE.Group();

    scene.add(landscapeGroup);
    scene.add(floorGroup);
    scene.add(wallGroup);
    scene.add(ceilingGroup);
    scene.add(furnitureGroup);
    scene.add(rulerGroup);

    landscapeGroupRef.current = landscapeGroup;
    floorGroupRef.current = floorGroup;
    wallGroupRef.current = wallGroup;
    ceilingGroupRef.current = ceilingGroup;
    furnitureGroupRef.current = furnitureGroup;
    rulerGroupRef.current = rulerGroup;

    // Build the Full 3D Architectural Model with Landscape, Ceilings, and Furniture
    buildArchitecturalScene(scene, landscapeGroup, floorGroup, wallGroup, ceilingGroup, furnitureGroup);

    // RENDER LOOP
    let currentExtrusion = 0.0;
    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      try {
        const p = scrollProgressRef.current;

        // Realistic Fireplace Amber Hearth Glow Flicker
        if (fireLightRef.current) {
          const flicker = Math.sin(time * 0.008) * 0.25 + Math.cos(time * 0.015) * 0.15;
          fireLightRef.current.intensity = 2.2 + flicker;
        }

        if (cameraRef.current) {
          // Dynamic FOV: 38° in 2D blueprint mode, widening to 56° for spacious eye-level tour
          const targetFov = p > 0.18 ? 56 : 38;
          cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, targetFov, 0.06);
          cameraRef.current.updateProjectionMatrix();

          if (cameraModeRef.current === "walkthrough") {
            // First-person WASD Walkthrough
            const speed = 0.085;
            const yaw = fpsAngles.current.yaw;
            const pitch = fpsAngles.current.pitch;

            const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
            const right = new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw));

            if (keysDown.current["w"] || keysDown.current["arrowup"]) {
              walkPos.current.addScaledVector(forward, speed);
            }
            if (keysDown.current["s"] || keysDown.current["arrowdown"]) {
              walkPos.current.addScaledVector(forward, -speed);
            }
            if (keysDown.current["a"] || keysDown.current["arrowleft"]) {
              walkPos.current.addScaledVector(right, speed);
            }
            if (keysDown.current["d"] || keysDown.current["arrowright"]) {
              walkPos.current.addScaledVector(right, -speed);
            }

            walkPos.current.y = 1.65;
            currentCamPos.current.copy(walkPos.current);
            targetCamPos.current.copy(walkPos.current);

            const lookDir = new THREE.Vector3(
              -Math.sin(yaw) * Math.cos(pitch),
              Math.sin(pitch),
              -Math.cos(yaw) * Math.cos(pitch)
            );
            cameraRef.current.position.copy(walkPos.current);
            cameraRef.current.lookAt(walkPos.current.clone().add(lookDir));
          } else if (cameraModeRef.current === "top_down") {
            // Top-down Orthographic-style Perspective
            const bW = project.specs.width || 14;
            const bL = project.specs.length || 12;
            const maxDim = Math.max(bW, bL, 14);
            const altitude = (maxDim * 0.85) / zoomScale;

            targetCamPos.current.set(0, altitude, 0.001);
            targetCamLook.current.set(0, 0, 0);

            currentCamPos.current.lerp(targetCamPos.current, 0.08);
            currentCamLook.current.lerp(targetCamLook.current, 0.08);
            cameraRef.current.position.copy(currentCamPos.current);
            cameraRef.current.lookAt(currentCamLook.current);
          } else {
            // Smooth lerp camera movement
            currentCamPos.current.lerp(targetCamPos.current, 0.075);
            currentCamLook.current.lerp(targetCamLook.current, 0.075);

            cameraRef.current.position.copy(currentCamPos.current);

            // Apply interactive lookOffset (mouse dragging)
            const lookDir = currentCamLook.current.clone().sub(currentCamPos.current);
            if (p > 0.15 && (lookOffset.current.yaw !== 0 || lookOffset.current.pitch !== 0)) {
              lookDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), lookOffset.current.yaw);
              lookDir.y += lookOffset.current.pitch * 2.8;
            }
            cameraRef.current.lookAt(currentCamPos.current.clone().add(lookDir));
          }
        }

        // Wall Extrusion: 0.0 in 2D, extruding up to 1.0 in 3D
        const targetExtrude = p <= 0.06 ? 0.0 : Math.min(1.0, (p - 0.06) * 5.0);
        currentExtrusion += (targetExtrude - currentExtrusion) * 0.12;

        if (wallGroupRef.current) {
          wallGroupRef.current.scale.set(1, currentExtrusion, 1);
          wallGroupRef.current.visible = showWallsRef.current && currentExtrusion > 0.005;
        }

        // Ceilings appear when walls are fully upright
        if (ceilingGroupRef.current) {
          ceilingGroupRef.current.visible = showCeilingsRef.current && p > 0.22 && p < 0.92;
        }

        // Exterior Landscape fades in as user enters 3D
        if (landscapeGroupRef.current) {
          landscapeGroupRef.current.visible = showLandscapeRef.current && currentExtrusion > 0.08;
        }

        // 2D Blueprint Floorplan fades out when 3D rises
        if (blueprintMeshRef.current) {
          const bpMat = blueprintMeshRef.current.material as THREE.MeshBasicMaterial;
          if (bpMat) {
            const bpOpacity = Math.max(0, 1 - (p - 0.05) * 16.0);
            bpMat.opacity = bpOpacity;
            blueprintMeshRef.current.visible = bpOpacity > 0.01;
          }
        }

        // Room floors fade in during 3D transition
        const floorOpacity = p <= 0.08 ? 0.0 : Math.min(0.95, (p - 0.08) * 3.5);
        roomFloorsRef.current.forEach((m) => {
          if (m.material) {
            (m.material as THREE.MeshStandardMaterial).opacity = floorOpacity;
          }
        });

        // 3D Animated Oak Pivot Door: Swings open smoothly 78° as user reaches entrance
        if (doorPivotRef.current) {
          const doorOpenT = Math.max(0, Math.min(1, (p - 0.18) / 0.10));
          doorPivotRef.current.rotation.y = -doorOpenT * (Math.PI * 0.44);
        }

        // Furniture appears seamlessly as walls rise
        if (furnitureGroupRef.current) {
          furnitureGroupRef.current.visible = showFurnitureRef.current && currentExtrusion > 0.15;
          furnitureGroupRef.current.position.y = (currentExtrusion - 1) * 0.65;
        }

        // Ink Drawing Transition for Adjacent Rooms:
        // Highlights the current active room in full PBR while distant rooms retain architectural sketch styling
        roomInkMeshesRef.current.forEach(({ mesh, roomId }) => {
          const isCurrent = roomId === project.rooms[activeRoomIndex]?.id;
          mesh.visible = !isCurrent && p > 0.25;
        });

        renderer.render(scene, cameraRef.current!);
      } catch (err) {
        console.error("Render loop error:", err);
      }
    };
    animate(0);

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
      cleanupThreeScene(scene, renderer);
    };
  }, [project, zoomScale, activeRoomIndex]);

  // 4. COMPUTED ROOM CINEMATIC WAYPOINTS (Exact eye-level framing without obstruction)
  const roomWaypoints = useMemo(() => {
    return project.rooms.map((room) => {
      const [x0, z0, x1, z1] = room.bounds;
      const rW = Math.abs(x1 - x0);
      const rD = Math.abs(z1 - z0);
      const cX = (x0 + x1) / 2;
      const cZ = (z0 + z1) / 2;

      if (isCasaSerra) {
        if (room.id === "entrance") {
          return {
            pos: new THREE.Vector3(-11.0, 1.55, -2.2),
            look: new THREE.Vector3(-8.0, 1.35, -2.0),
            fov: 56,
          };
        }
        if (room.id === "living") {
          // Standing in doorway looking northeast across sunken lounge, coffee table, with fireplace on left and kitchen portal on right
          return {
            pos: new THREE.Vector3(-6.8, 1.45, 1.2),
            look: new THREE.Vector3(0.5, 1.15, -2.6),
            fov: 56,
          };
        }
        if (room.id === "kitchen") {
          // Standing at the head of the 14-person dining table looking down the table and island
          return {
            pos: new THREE.Vector3(3.2, 1.48, -4.2),
            look: new THREE.Vector3(10.5, 1.30, -0.8),
            fov: 52,
          };
        }
        if (room.id === "patio") {
          // Patio looking at ancient olive tree and reflective pool
          return {
            pos: new THREE.Vector3(-6.5, 1.55, -7.5),
            look: new THREE.Vector3(-3.0, 1.45, -10.0),
            fov: 54,
          };
        }
        if (room.id === "gallery") {
          // Down the bronze glass gallery
          return {
            pos: new THREE.Vector3(4.0, 1.52, -7.5),
            look: new THREE.Vector3(4.0, 1.45, -13.5),
            fov: 48,
          };
        }
        if (room.id === "bedroom") {
          // Master bedroom looking across bed to private garden
          return {
            pos: new THREE.Vector3(7.6, 1.42, -7.8),
            look: new THREE.Vector3(12.8, 1.25, -12.5),
            fov: 50,
          };
        }
      }

      // Position camera safely at entrance or prime architectural vantage point for custom floorplans
      let camX = cX;
      let camZ = cZ;
      let targetX = cX;
      let targetZ = cZ;
      const camY = 1.48; // Architectural eye level

      if (room.category === "living") {
        camX = x0 + rW * 0.15;
        camZ = z1 - rD * 0.18;
        targetX = x1 - rW * 0.25;
        targetZ = z0 + rD * 0.25;
      } else if (room.category === "kitchen") {
        camX = x0 + rW * 0.18;
        camZ = z0 + rD * 0.22;
        targetX = x1 - rW * 0.22;
        targetZ = z1 - rD * 0.22;
      } else if (room.category === "bedroom") {
        camX = x0 + rW * 0.16;
        camZ = z1 - rD * 0.18;
        targetX = x1 - rW * 0.25;
        targetZ = z0 + rD * 0.32;
      } else if (room.category === "outdoor") {
        camX = x0 + rW * 0.25;
        camZ = z0 + rD * 0.25;
        targetX = x1 - rW * 0.28;
        targetZ = z1 - rD * 0.28;
      } else if (room.category === "bath") {
        camX = x0 + rW * 0.25;
        camZ = z0 + rD * 0.3;
        targetX = x1 - rW * 0.25;
        targetZ = z1 - rD * 0.25;
      } else {
        camX = cX - rW * 0.15;
        camZ = z0 + rD * 0.2;
        targetX = cX + rW * 0.15;
        targetZ = z1 - rD * 0.2;
      }

      return {
        pos: new THREE.Vector3(camX, camY, camZ),
        look: new THREE.Vector3(targetX, 1.25, targetZ),
        fov: 56,
      };
    });
  }, [project, isCasaSerra]);

  // 5. CINEMATIC SCROLL CAMERA CHOREOGRAPHY (Casa Serra Spline Walkthrough)
  useEffect(() => {
    const p = scrollProgress;
    const bW = project.specs.width || 14;
    const bL = project.specs.length || 12;
    const maxDim = Math.max(bW, bL, 14);

    const room0 = project.rooms[0] || { bounds: [-2, -4, 2, 0] };
    const r0cX = (room0.bounds[0] + room0.bounds[2]) / 2;
    const r0cZ = (room0.bounds[1] + room0.bounds[3]) / 2;
    const doorZ = room0.bounds[1];

    // PHASE 1: 2D BLUEPRINT VIEW (p = 0 to 0.06) - High top-down crisp floorplan
    if (p <= 0.06) {
      const altitude = (maxDim * 0.72) / zoomScale;
      targetCamPos.current.set(0, altitude, 0.01);
      targetCamLook.current.set(0, 0, 0);
    }
    // PHASE 2: 3D AXONOMETRIC MAQUETTE RISE (p = 0.06 to 0.18)
    // Swoops down from overhead into an elegant 48° architectural perspective
    else if (p <= 0.18) {
      const t = (p - 0.06) / 0.12;
      const startPos = new THREE.Vector3(0, (maxDim * 0.72) / zoomScale, 0.01);
      const endPos = new THREE.Vector3(-maxDim * 0.65, maxDim * 0.58, maxDim * 0.68);
      targetCamPos.current.lerpVectors(startPos, endPos, t);
      targetCamLook.current.set(0, 0.8 * t, 0);
    }
    // PHASE 3: DOOR APPROACH & CINEMATIC GLIDE INSIDE (p = 0.18 to 0.28)
    // Camera descends to eye-level outside door, door pivots open, camera glides inside!
    else if (p <= 0.28) {
      const t = (p - 0.18) / 0.10;
      const axonPos = new THREE.Vector3(-maxDim * 0.65, maxDim * 0.58, maxDim * 0.68);
      const outsideDoorPos = new THREE.Vector3(r0cX, 1.58, doorZ - 3.4);
      const insideEntryPos = new THREE.Vector3(r0cX, 1.52, doorZ + 1.1);

      if (t < 0.45) {
        const subT = t / 0.45;
        targetCamPos.current.lerpVectors(axonPos, outsideDoorPos, subT);
        targetCamLook.current.set(r0cX, 1.35, doorZ + 1.6);
      } else {
        const subT = (t - 0.45) / 0.55;
        targetCamPos.current.lerpVectors(outsideDoorPos, insideEntryPos, subT);
        targetCamLook.current.set(r0cX, 1.25, r0cZ + 1.4);
      }
    }
    // PHASE 4: ROOM-BY-ROOM EYE-LEVEL WALKTHROUGH (p = 0.28 to 0.88)
    // Sweeps gracefully from room to room, looking inside across the furnishings & windows
    else if (p <= 0.88) {
      const t = (p - 0.28) / 0.60;
      const totalRooms = roomWaypoints.length;
      const floatIdx = t * (totalRooms - 1);
      const i0 = Math.floor(floatIdx);
      const i1 = Math.min(totalRooms - 1, i0 + 1);
      const blend = floatIdx - i0;

      const wp0 = roomWaypoints[i0];
      const wp1 = roomWaypoints[i1];

      // Smooth cosine easing for luxurious camera pacing
      const easeBlend = 0.5 - 0.5 * Math.cos(blend * Math.PI);

      targetCamPos.current.lerpVectors(wp0.pos, wp1.pos, easeBlend);
      targetCamLook.current.lerpVectors(wp0.look, wp1.look, easeBlend);
    }
    // PHASE 5: GRAND FINALE LIFT (p = 0.88 to 1.0)
    // Rises up to an aerial golden-hour perspective overlooking the full house
    else {
      const t = (p - 0.88) / 0.12;
      const lastWp = roomWaypoints[roomWaypoints.length - 1];
      const endPos = new THREE.Vector3(maxDim * 0.55, maxDim * 0.70, maxDim * 0.60);
      targetCamPos.current.lerpVectors(lastWp.pos, endPos, t);
      targetCamLook.current.set(0, 0.5, 0);
    }
  }, [scrollProgress, project, zoomScale, roomWaypoints]);

  // 6. BUILD COMPLETE ARCHITECTURAL SCENE (Walls, Ceilings, Skylights, Clerestory, Landscape, Staging)
  const buildArchitecturalScene = (
    scene: THREE.Scene,
    landscapeGroup: THREE.Group,
    floorGroup: THREE.Group,
    wallGroup: THREE.Group,
    ceilingGroup: THREE.Group,
    furnitureGroup: THREE.Group
  ) => {
    while (landscapeGroup.children.length > 0) landscapeGroup.remove(landscapeGroup.children[0]);
    while (floorGroup.children.length > 0) floorGroup.remove(floorGroup.children[0]);
    while (wallGroup.children.length > 0) wallGroup.remove(wallGroup.children[0]);
    while (ceilingGroup.children.length > 0) ceilingGroup.remove(ceilingGroup.children[0]);
    while (furnitureGroup.children.length > 0) furnitureGroup.remove(furnitureGroup.children[0]);
    roomFloorsRef.current = [];
    roomInkMeshesRef.current = [];

    const wallHeight = 4.2; // Full Casa Serra ceiling height
    const wallThick = project.specs.exteriorWallThickness || 0.25;

    // Authentic Casa Serra Materials
    const plasterMat = new THREE.MeshStandardMaterial({
      color: 0xf3eee5, // Soft warm architectural stucco
      roughness: 0.78,
      metalness: 0.02,
    });

    const boardMarkedConcreteMat = new THREE.MeshStandardMaterial({
      color: 0xd6cfc4,
      roughness: 0.88,
      metalness: 0.05,
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xf5f1e8,
      roughness: 0.75,
      side: THREE.DoubleSide,
    });

    const darkBronzeMat = new THREE.MeshStandardMaterial({
      color: 0x3d352e,
      roughness: 0.45,
      metalness: 0.75,
    });

    const clerestoryGlassMat = new THREE.MeshStandardMaterial({
      color: 0xa8c5cf,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.35,
    });

    // A. EXTERIOR LANDSCAPE (Rolling hills terrain, grass, trees, and patio water pool)
    const terrainGeo = new THREE.PlaneGeometry(160, 160, 48, 48);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      // Create gentle rolling hillside topography outside building perimeter
      const dist = Math.hypot(x, z);
      if (dist > 18) {
        const hill = Math.sin(x * 0.06) * 1.8 + Math.cos(z * 0.05) * 1.5 + (dist - 18) * 0.035;
        posAttr.setY(i, hill - 0.15);
      } else {
        posAttr.setY(i, -0.06);
      }
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xb5ad8e, // Warm Mediterranean dry grass
      roughness: 0.92,
      flatShading: true,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    landscapeGroup.add(terrainMesh);

    // Exterior Olive Trees on distant hills
    [-24, -18, 22, 28].forEach((tx) => {
      [-22, 24, -28, 26].forEach((tz) => {
        const treeGroup = new THREE.Group();
        treeGroup.position.set(tx, 0.4, tz);

        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.32, 2.2, 8),
          new THREE.MeshStandardMaterial({ color: 0x4a4137, roughness: 0.95 })
        );
        trunk.position.y = 1.1;
        treeGroup.add(trunk);

        const canopy = new THREE.Mesh(
          new THREE.SphereGeometry(1.6, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x5e6e52, roughness: 0.85 })
        );
        canopy.position.y = 2.6;
        canopy.scale.set(1.4, 0.85, 1.2);
        treeGroup.add(canopy);

        landscapeGroup.add(treeGroup);
      });
    });

    // B. PATIO REFLECTING WATER POOL (Casa Serra Courtyard)
    const poolW = 18;
    const poolD = 3.8;
    const poolGeo = new THREE.PlaneGeometry(poolW, poolD);
    poolGeo.rotateX(-Math.PI / 2);
    const poolWaterMat = new THREE.MeshStandardMaterial({
      color: 0x3d5a68,
      roughness: 0.04,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85,
    });
    const poolMesh = new THREE.Mesh(poolGeo, poolWaterMat);
    poolMesh.position.set(3, 0.015, -16);
    poolMesh.receiveShadow = true;
    landscapeGroup.add(poolMesh);

    // Stone rim around pool
    const poolRimGeo = new THREE.BoxGeometry(poolW + 0.6, 0.08, poolD + 0.6);
    const poolRimMat = new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.65 });
    const poolRimMesh = new THREE.Mesh(poolRimGeo, poolRimMat);
    poolRimMesh.position.set(3, -0.02, -16);
    landscapeGroup.add(poolRimMesh);

    // C. FOUNDATION SLAB & 2D BLUEPRINT TEXTURE
    const slabGeo = new THREE.BoxGeometry(project.specs.width + 4.0, 0.25, project.specs.length + 4.0);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.95 });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.y = -0.13;
    slabMesh.receiveShadow = true;
    floorGroup.add(slabMesh);

    if (project.originalBlueprintUrl) {
      const texLoader = new THREE.TextureLoader();
      texLoader.load(project.originalBlueprintUrl, (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        if (rendererRef.current) {
          tex.anisotropy = rendererRef.current.capabilities.getMaxAnisotropy();
        }
        const imgAspect = (tex.image && tex.image.width && tex.image.height)
          ? tex.image.width / tex.image.height
          : project.specs.width / project.specs.length;
        const pW = project.specs.width;
        const pL = pW / imgAspect;
        const planeGeo = new THREE.PlaneGeometry(pW, pL);
        const planeMat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 1.0,
          side: THREE.DoubleSide,
        });
        const planeMesh = new THREE.Mesh(planeGeo, planeMat);
        planeMesh.rotation.x = -Math.PI / 2;
        planeMesh.position.y = 0.01;
        floorGroup.add(planeMesh);
        blueprintMeshRef.current = planeMesh;
      });
    }

    // Helper: Add solid wall segment with clerestory top glass band
    const addArchitecturalWall = (
      w: number,
      h: number,
      d: number,
      px: number,
      pz: number,
      hasClerestory: boolean = true
    ) => {
      const mainH = hasClerestory ? h - 0.7 : h;

      // Main Plaster Wall Body
      const geo = new THREE.BoxGeometry(w, mainH, d);
      geo.translate(0, mainH / 2, 0);
      const mesh = new THREE.Mesh(geo, plasterMat);
      mesh.position.set(px, 0, pz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      wallGroup.add(mesh);

      // Clerestory Glass Band on top (under the ceiling)
      if (hasClerestory) {
        const glassGeo = new THREE.BoxGeometry(w, 0.7, d * 0.4);
        glassGeo.translate(0, 0.35, 0);
        const glassMesh = new THREE.Mesh(glassGeo, clerestoryGlassMat);
        glassMesh.position.set(px, mainH, pz);
        wallGroup.add(glassMesh);

        // Thin bronze horizontal transom bar
        const transomGeo = new THREE.BoxGeometry(w, 0.06, d * 0.8);
        const transomMesh = new THREE.Mesh(transomGeo, darkBronzeMat);
        transomMesh.position.set(px, mainH, pz);
        wallGroup.add(transomMesh);
      }
    };

    // D. BUILD ROOMS, FLOORS, CEILINGS & CLERESTORY BANDS
    project.rooms.forEach((room, idx) => {
      const [x0, z0, x1, z1] = room.bounds;
      const rW = Math.abs(x1 - x0);
      const rD = Math.abs(z1 - z0);
      const cX = (x0 + x1) / 2;
      const cZ = (z0 + z1) / 2;

      // Authentic Floor Materials
      let floorColor = 0xe5dfd4;
      let roughness = 0.65;
      if (room.floorMaterial === "oak") {
        floorColor = 0xbf9567; // Warm oiled oak boards
        roughness = 0.55;
      } else if (room.floorMaterial === "concrete") {
        floorColor = 0xd2cbbf; // Honed concrete
        roughness = 0.6;
      } else if (room.floorMaterial === "marble" || room.floorMaterial === "tile") {
        floorColor = 0xf3efe7; // Polished travertine / marble
        roughness = 0.35;
      } else if (room.floorMaterial === "grass") {
        floorColor = 0x5b7548; // Sage green grass
        roughness = 0.9;
      }

      // Floor Plane (For living room, sunken floor sits 45cm lower)
      const isLiving = room.category === "living";
      const floorY = isLiving ? -0.42 : 0.02;
      const floorGeo = new THREE.BoxGeometry(rW, 0.03, rD);
      const floorMat = new THREE.MeshStandardMaterial({
        color: floorColor,
        roughness,
        transparent: true,
        opacity: 0.0,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(cX, floorY, cZ);
      floorMesh.receiveShadow = true;
      floorGroup.add(floorMesh);
      roomFloorsRef.current.push(floorMesh);

      // Ink Drawing Blueprint Outline Overlay for Adjacent Room Transition
      const inkEdges = new THREE.EdgesGeometry(floorGeo);
      const inkLineMat = new THREE.LineBasicMaterial({ color: 0x1d1d1f, linewidth: 1.5 });
      const inkLine = new THREE.LineSegments(inkEdges, inkLineMat);
      inkLine.position.set(cX, 0.03, cZ);
      floorGroup.add(inkLine);
      roomInkMeshesRef.current.push({ mesh: floorMesh, roomId: room.id });

      // Ceilings (With Skylights in Kitchen & Dining)
      if (room.category !== "outdoor") {
        if (room.category === "kitchen") {
          // Ceiling with 3 recessed skylight cutouts
          const slabPartW = rW / 3;
          for (let s = 0; s < 3; s++) {
            const partX = x0 + slabPartW * (s + 0.5);
            const ceilPart = new THREE.Mesh(new THREE.BoxGeometry(slabPartW - 1.2, 0.15, rD), ceilingMat);
            ceilPart.position.set(partX, wallHeight, cZ);
            ceilingGroup.add(ceilPart);

            // Skylight Shaft Light Beam
            const skyLight = new THREE.SpotLight(0xfff6ea, 2.5, 12, Math.PI / 6, 0.4);
            skyLight.position.set(partX, wallHeight + 0.5, cZ);
            skyLight.target.position.set(partX, 0, cZ);
            scene.add(skyLight);
            scene.add(skyLight.target);
          }
        } else {
          // Smooth architectural ceiling slab
          const ceilingGeo = new THREE.BoxGeometry(rW, 0.15, rD);
          const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
          ceilingMesh.position.set(cX, wallHeight, cZ);
          ceilingGroup.add(ceilingMesh);
        }
      }

      // Warm Sconce Light for realistic interior ambiance
      const roomLight = new THREE.PointLight(0xffeed8, 1.4, Math.max(rW, rD) * 1.8);
      roomLight.position.set(cX, 2.8, cZ);
      scene.add(roomLight);

      if (room.category === "outdoor") {
        // Outdoor Patio / Garden: open courtyard, no tall walls blocking sky or views!
        // Low board-marked concrete parapet wall on the perimeter
        const lowParapet = new THREE.Mesh(
          new THREE.BoxGeometry(rW, 0.45, wallThick),
          boardMarkedConcreteMat
        );
        lowParapet.position.set(cX, 0.22, z0);
        wallGroup.add(lowParapet);
      } else {
        const doorW = 2.4; // Wide 2.4m Casa Serra opening
        // Front wall (entrance door or doorway)
        if (idx === 0) {
          // Entrance Pivot Door (Oak wood, 2.4m wide x 4.2m tall)
          const leftW = Math.max(0.2, (rW - doorW) / 2);
          addArchitecturalWall(leftW, wallHeight, wallThick, x0 + leftW / 2, z0, false);
          addArchitecturalWall(leftW, wallHeight, wallThick, x1 - leftW / 2, z0, false);

          const doorPivot = new THREE.Group();
          doorPivot.position.set(cX - doorW / 2, 0, z0);

          const doorH = wallHeight - 0.2;
          const doorLeafGeo = new THREE.BoxGeometry(doorW - 0.05, doorH, 0.06);
          doorLeafGeo.translate((doorW - 0.05) / 2, doorH / 2, 0);
          const doorLeafMat = new THREE.MeshStandardMaterial({
            color: 0x92673d, // Natural oak wood
            roughness: 0.5,
          });
          const doorMesh = new THREE.Mesh(doorLeafGeo, doorLeafMat);
          doorMesh.castShadow = true;

          // Brushed bronze vertical handle
          const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.018, 0.018, 0.65, 12),
            new THREE.MeshStandardMaterial({ color: 0xb58b42, metalness: 0.85, roughness: 0.25 })
          );
          handle.position.set(doorW - 0.18, doorH * 0.45, 0.05);
          doorMesh.add(handle);

          doorPivot.add(doorMesh);
          wallGroup.add(doorPivot);
          doorPivotRef.current = doorPivot;
        } else {
          // Wall with doorway into next room
          const openingW = 2.4;
          const wallLeftW = Math.max(0.4, (rW - openingW) / 2);
          addArchitecturalWall(wallLeftW, wallHeight, wallThick, x0 + wallLeftW / 2, z0);
          addArchitecturalWall(wallLeftW, wallHeight, wallThick, x1 - wallLeftW / 2, z0);
        }

        // Back wall: If Living or Kitchen facing Patio/Exterior, make it Floor-to-Ceiling Glass!
        if (room.category === "living" || room.category === "kitchen") {
          const glassWallGeo = new THREE.BoxGeometry(rW - 0.2, wallHeight - 0.1, 0.04);
          const glassWall = new THREE.Mesh(glassWallGeo, clerestoryGlassMat);
          glassWall.position.set(cX, wallHeight / 2, z0);
          wallGroup.add(glassWall);

          // Bronze mullions every 2 meters
          const numMullions = Math.max(3, Math.round(rW / 2.0));
          for (let m = 0; m <= numMullions; m++) {
            const mul = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallHeight, 0.08), darkBronzeMat);
            mul.position.set(x0 + (rW / numMullions) * m, wallHeight / 2, z0);
            wallGroup.add(mul);
          }
        } else {
          addArchitecturalWall(rW, wallHeight, wallThick, cX, z1);
        }

        // Side walls
        if (room.id === "gallery" || room.name.toLowerCase().includes("gallery")) {
          // 24m Bronze Glass wall on the side facing the patio!
          const glassWallGeo = new THREE.BoxGeometry(0.04, wallHeight - 0.1, rD);
          const glassWall = new THREE.Mesh(glassWallGeo, clerestoryGlassMat);
          glassWall.position.set(x0, wallHeight / 2, cZ);
          wallGroup.add(glassWall);

          // Opposite solid wall for art
          addArchitecturalWall(wallThick, wallHeight, rD, x1, cZ);
        } else {
          addArchitecturalWall(wallThick, wallHeight, rD, x0, cZ);
          addArchitecturalWall(wallThick, wallHeight, rD, x1, cZ);
        }
      }

      // Build rich architectural furniture & styling
      buildArchitecturalFurniture(room, cX, cZ, rW, rD, furnitureGroup, scene);
    });
  };

  // 7. BUILD RICH ARCHITECTURAL FURNITURE & STYLING (1:1 with Screenshots 1-3)
  const buildArchitecturalFurniture = (
    room: RoomSpec,
    cx: number,
    cz: number,
    w: number,
    d: number,
    group: THREE.Group,
    scene: THREE.Scene
  ) => {
    const oakMat = new THREE.MeshStandardMaterial({ color: 0xa87f54, roughness: 0.55 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x362c25, roughness: 0.65 });
    const travertineMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d7, roughness: 0.45 });
    const linenBeigeMat = new THREE.MeshStandardMaterial({ color: 0xd8d1c5, roughness: 0.85 });
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xb8452a, roughness: 0.75 });
    const ochreMat = new THREE.MeshStandardMaterial({ color: 0xc9a15a, roughness: 0.75 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc89d42, roughness: 0.32, metalness: 0.9 });
    const darkBronzeMat = new THREE.MeshStandardMaterial({ color: 0x3d352e, roughness: 0.45, metalness: 0.75 });
    const ceramicWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.3 });
    const ceramicBlackMat = new THREE.MeshStandardMaterial({ color: 0x1f1d1b, roughness: 0.4 });
    const leatherCognacMat = new THREE.MeshStandardMaterial({ color: 0x6e3d23, roughness: 0.6 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x546647, roughness: 0.7 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88aab5, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3 });

    // ROOM 02: THE LIVING ROOM (Screenshot 1)
    if (room.category === "living") {
      // 1. Sunken Lounge U-Shaped Sectional Sofa (Sitting inside 45cm pit)
      const pitY = -0.42;

      // Center Travertine Coffee Table
      const tableW = 2.4;
      const tableD = 1.3;
      const table = new THREE.Mesh(new THREE.BoxGeometry(tableW, 0.35, tableD), travertineMat);
      table.position.set(cx, pitY + 0.18, cz);
      table.castShadow = true;
      group.add(table);

      // Items on Coffee table: White bowl, Black vase with leafy branches, art books
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.12, 0.12, 24), ceramicWhiteMat);
      bowl.position.set(cx - 0.4, pitY + 0.41, cz);
      group.add(bowl);

      const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.42, 24), ceramicBlackMat);
      vase.position.set(cx + 0.5, pitY + 0.56, cz);
      group.add(vase);

      // Green leafy branches extending from the vase
      const branchGeo = new THREE.CylinderGeometry(0.01, 0.015, 0.65, 8);
      const branch = new THREE.Mesh(branchGeo, darkWoodMat);
      branch.position.set(cx + 0.5, pitY + 0.85, cz);
      branch.rotation.z = -0.25;
      group.add(branch);

      const leafSphere = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), foliageMat);
      leafSphere.position.set(cx + 0.65, pitY + 1.1, cz);
      group.add(leafSphere);

      // U-Shaped Modular Sofa Base & Cushions
      const sofaBaseMat = linenBeigeMat;
      const sofaLength = 4.8;
      const sofaDepth = 1.0;
      const cushionH = 0.44;

      // North side sofa segment
      const sofaN = new THREE.Mesh(new THREE.BoxGeometry(sofaLength, cushionH, sofaDepth), sofaBaseMat);
      sofaN.position.set(cx, pitY + cushionH / 2, cz - 1.6);
      sofaN.castShadow = true;
      group.add(sofaN);

      // South side sofa segment
      const sofaS = new THREE.Mesh(new THREE.BoxGeometry(sofaLength, cushionH, sofaDepth), sofaBaseMat);
      sofaS.position.set(cx, pitY + cushionH / 2, cz + 1.6);
      sofaS.castShadow = true;
      group.add(sofaS);

      // West side connecting lounge
      const sofaW_mesh = new THREE.Mesh(new THREE.BoxGeometry(sofaDepth, cushionH, 3.2), sofaBaseMat);
      sofaW_mesh.position.set(cx - 1.9, pitY + cushionH / 2, cz);
      sofaW_mesh.castShadow = true;
      group.add(sofaW_mesh);

      // Throw Pillows (Terracotta, Ochre, Sage)
      [
        { x: cx - 1.6, z: cz - 1.4, col: terracottaMat, rot: 0.2 },
        { x: cx + 1.2, z: cz - 1.4, col: ochreMat, rot: -0.15 },
        { x: cx + 1.8, z: cz + 1.4, col: terracottaMat, rot: 0.1 },
        { x: cx - 1.4, z: cz + 1.4, col: ochreMat, rot: -0.2 },
      ].forEach((p) => {
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.16), p.col);
        pillow.position.set(p.x, pitY + cushionH + 0.18, p.z);
        pillow.rotation.y = p.rot;
        pillow.castShadow = true;
        group.add(pillow);
      });

      // 2. Concrete Fireplace Wall with Lit Hearth
      const fireWallW = 3.4;
      const fireWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 3.2, fireWallW),
        new THREE.MeshStandardMaterial({ color: 0xc8c1b5, roughness: 0.9 })
      );
      fireWall.position.set(cx - w * 0.45, 1.6, cz);
      fireWall.castShadow = true;
      group.add(fireWall);

      // Hearth Firebox opening
      const firebox = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.95 })
      );
      firebox.position.set(cx - w * 0.45 + 0.05, 0.6, cz - 0.2);
      group.add(firebox);

      // Glowing Amber Fire Hearth
      const ember = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.25, 1.2),
        new THREE.MeshBasicMaterial({ color: 0xff5511 })
      );
      ember.position.set(cx - w * 0.45 + 0.12, 0.35, cz - 0.2);
      group.add(ember);

      const fireLight = new THREE.PointLight(0xff7722, 2.5, 8);
      fireLight.position.set(cx - w * 0.45 + 0.4, 0.7, cz - 0.2);
      scene.add(fireLight);
      fireLightRef.current = fireLight;

      // Stacked Firewood logs next to fireplace
      for (let l = 0; l < 4; l++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.75, 10), darkWoodMat);
        log.rotation.x = Math.PI / 2;
        log.position.set(cx - w * 0.45 + 0.2, 0.15 + l * 0.12, cz + 0.9 + (l % 2) * 0.1);
        group.add(log);
      }

      // 3. Curved Brass Arc Floor Lamp (Arco Lamp)
      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.45, 16), travertineMat);
      lampBase.position.set(cx - w * 0.44, 0.22, cz - 1.8);
      group.add(lampBase);

      // Curved Arc Pole (Spline curve)
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(cx - w * 0.44, 0.45, cz - 1.8),
        new THREE.Vector3(cx - 2.8, 3.8, cz - 1.2),
        new THREE.Vector3(cx - 1.2, 2.6, cz - 0.5)
      );
      const arcGeo = new THREE.TubeGeometry(curve, 24, 0.02, 8, false);
      const arcMesh = new THREE.Mesh(arcGeo, brassMat);
      group.add(arcMesh);

      const lampDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        brassMat
      );
      lampDome.position.set(cx - 1.2, 2.6, cz - 0.5);
      group.add(lampDome);

      // 4. Potted Olive Tree in Round Wooden Tub
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.65, 20), oakMat);
      pot.position.set(cx - 3.4, 0.32, cz + 1.8);
      pot.castShadow = true;
      group.add(pot);

      const treeTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 1.8, 10),
        new THREE.MeshStandardMaterial({ color: 0x4a3e35, roughness: 0.95 })
      );
      treeTrunk.position.set(cx - 3.4, 1.2, cz + 1.8);
      treeTrunk.rotation.z = 0.15;
      group.add(treeTrunk);

      const treeLeaves = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), foliageMat);
      treeLeaves.position.set(cx - 3.2, 2.2, cz + 1.8);
      treeLeaves.scale.set(1.2, 0.9, 1.1);
      group.add(treeLeaves);

      // 5. Framed Modern Wall Art (Bauhaus white canvas with red dot and black rectangle)
      const frameW = 1.2;
      const frameH = 1.6;
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, frameH, frameW),
        new THREE.MeshStandardMaterial({ color: 0x9e7349, roughness: 0.6 })
      );
      frame.position.set(cx - w * 0.45 + 0.02, 2.1, cz - 1.8);
      group.add(frame);

      const canvas = new THREE.Mesh(
        new THREE.PlaneGeometry(frameW - 0.1, frameH - 0.1),
        new THREE.MeshBasicMaterial({ color: 0xf6f2ea })
      );
      canvas.rotation.y = Math.PI / 2;
      canvas.position.set(cx - w * 0.45 + 0.05, 2.1, cz - 1.8);
      group.add(canvas);

      // Red circle on canvas
      const redDot = new THREE.Mesh(
        new THREE.CircleGeometry(0.18, 24),
        new THREE.MeshBasicMaterial({ color: 0xb8452a })
      );
      redDot.rotation.y = Math.PI / 2;
      redDot.position.set(cx - w * 0.45 + 0.055, 1.9, cz - 1.8);
      group.add(redDot);
    }
    // ROOM 03: KITCHEN AND DINING (Screenshot 2)
    else if (room.category === "kitchen") {
      // 1. Long 6-meter Oak Dining Table for 14 People
      const tableLen = 6.2;
      const tableWidth = 1.25;
      const tableH = 0.76;

      const diningTableTop = new THREE.Mesh(new THREE.BoxGeometry(tableLen, 0.08, tableWidth), oakMat);
      diningTableTop.position.set(cx, tableH, cz - 0.8);
      diningTableTop.castShadow = true;
      group.add(diningTableTop);

      // Table Legs
      [-tableLen / 2 + 0.4, tableLen / 2 - 0.4].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, tableH, tableWidth - 0.2), oakMat);
        leg.position.set(cx + lx, tableH / 2, cz - 0.8);
        leg.castShadow = true;
        group.add(leg);
      });

      // White Linen Runner
      const runner = new THREE.Mesh(new THREE.BoxGeometry(tableLen - 0.6, 0.01, 0.45), ceramicWhiteMat);
      runner.position.set(cx, tableH + 0.045, cz - 0.8);
      group.add(runner);

      // Ceramic vases & tableware
      [-1.2, 0, 1.2].forEach((offset) => {
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.06, 20), ceramicWhiteMat);
        dish.position.set(cx + offset, tableH + 0.08, cz - 0.8);
        group.add(dish);
      });

      // 14 Dining Chairs with Leather Cushions
      for (let i = 0; i < 7; i++) {
        const chairX = cx - tableLen / 2 + 0.6 + i * 0.85;

        // North chairs
        const chairN = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.48), leatherCognacMat);
        chairN.position.set(chairX, 0.23, cz - 0.8 - tableWidth / 2 - 0.32);
        chairN.castShadow = true;
        group.add(chairN);

        const backN = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.06), leatherCognacMat);
        backN.position.set(chairX, 0.65, cz - 0.8 - tableWidth / 2 - 0.52);
        group.add(backN);

        // South chairs
        const chairS = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.48), leatherCognacMat);
        chairS.position.set(chairX, 0.23, cz - 0.8 + tableWidth / 2 + 0.32);
        chairS.castShadow = true;
        group.add(chairS);

        const backS = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.06), leatherCognacMat);
        backS.position.set(chairX, 0.65, cz - 0.8 + tableWidth / 2 + 0.52);
        group.add(backS);
      }

      // 2. Two Hanging Brass Dome Pendant Lights Above Table (Glow from above)
      [-1.4, 1.4].forEach((lampX) => {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.8, 8), darkWoodMat);
        cord.position.set(cx + lampX, 3.2, cz - 0.8);
        group.add(cord);

        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.45, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
          brassMat
        );
        dome.position.set(cx + lampX, 2.3, cz - 0.8);
        group.add(dome);

        const pendantLight = new THREE.PointLight(0xffdf99, 2.2, 6);
        pendantLight.position.set(cx + lampX, 2.1, cz - 0.8);
        scene.add(pendantLight);
      });

      // 3. 5-meter Travertine Kitchen Island
      const islandLen = 5.2;
      const islandW = 1.2;
      const islandH = 0.92;
      const island = new THREE.Mesh(new THREE.BoxGeometry(islandLen, islandH, islandW), travertineMat);
      island.position.set(cx, islandH / 2, cz + 1.8);
      island.castShadow = true;
      group.add(island);

      // Bronze Gooseneck Faucet & Undermount Sink
      const sink = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.02, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 })
      );
      sink.position.set(cx - 0.8, islandH + 0.01, cz + 1.8);
      group.add(sink);

      const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 12), brassMat);
      faucet.position.set(cx - 0.8, islandH + 0.2, cz + 2.05);
      group.add(faucet);

      // Kitchen Bar Stools
      for (let s = 0; s < 4; s++) {
        const stoolX = cx - islandLen / 2 + 1.0 + s * 1.1;
        const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20), oakMat);
        stoolSeat.position.set(stoolX, 0.65, cz + 1.8 - islandW / 2 - 0.35);
        group.add(stoolSeat);

        const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 10), darkWoodMat);
        stoolLeg.position.set(stoolX, 0.31, cz + 1.8 - islandW / 2 - 0.35);
        group.add(stoolLeg);
      }

      // 4. Dark Cabinetry Wall with LED strip niche
      const cabWall = new THREE.Mesh(new THREE.BoxGeometry(islandLen, 3.2, 0.65), darkWoodMat);
      cabWall.position.set(cx, 1.6, cz + d / 2 - 0.35);
      cabWall.castShadow = true;
      group.add(cabWall);

      const ledNiche = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.6, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xfff0db })
      );
      ledNiche.position.set(cx, 1.4, cz + d / 2 - 0.55);
      group.add(ledNiche);

      // 5. Floor-to-ceiling Glass Wall looking out onto the landscape
      const glassWall = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 3.8, 0.04), glassMat);
      glassWall.position.set(cx, 1.9, cz - d / 2 + 0.1);
      group.add(glassWall);
    }
    // ROOM 05: THE GLASS GALLERY (Screenshot 3)
    else if (room.category === "hallway" && (room.id === "gallery" || room.name.toLowerCase().includes("gallery"))) {
      // 24m Bronze glass mullions casting shadow strips
      const galleryLen = Math.max(w, d);
      for (let m = 0; m < 12; m++) {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.0, 0.08), darkBronzeMat);
        mullion.position.set(cx - galleryLen / 2 + m * (galleryLen / 11), 2.0, cz - 1.2);
        group.add(mullion);
      }

      // Contemporary Gallery Paintings on the opposite wall
      [-4, 0, 4].forEach((gx) => {
        const pFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.04), oakMat);
        pFrame.position.set(cx + gx, 2.0, cz + 1.2);
        group.add(pFrame);

        const pCanvas = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), new THREE.MeshBasicMaterial({ color: 0xf4eee1 }));
        pCanvas.position.set(cx + gx, 2.0, cz + 1.17);
        group.add(pCanvas);
      });
    }
    // ROOM 06: BEDROOM / MASTER SUITE
    else if (room.category === "bedroom") {
      // 1. Oak Platform King Bed with Textured Linen
      const bedW = 2.2;
      const bedL = 2.3;
      const bedBase = new THREE.Mesh(new THREE.BoxGeometry(bedW + 0.2, 0.35, bedL + 0.15), oakMat);
      bedBase.position.set(cx, 0.18, cz);
      bedBase.castShadow = true;
      group.add(bedBase);

      const mattress = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.44, bedL), linenBeigeMat);
      mattress.position.set(cx, 0.55, cz);
      mattress.castShadow = true;
      group.add(mattress);

      // Charred Larch Wood Accent Headboard
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(bedW + 0.8, 1.6, 0.12), darkWoodMat);
      headboard.position.set(cx, 0.85, cz - bedL / 2 - 0.06);
      headboard.castShadow = true;
      group.add(headboard);

      // Plump Pillows
      [-0.52, 0.52].forEach((offset) => {
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, 0.48), ceramicWhiteMat);
        pillow.position.set(cx + offset, 0.86, cz - bedL / 2 + 0.36);
        group.add(pillow);
      });

      // Travertine Nightstands & Brass Reading Lamps
      [-1, 1].forEach((dir) => {
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.52, 0.52), travertineMat);
        stand.position.set(cx + dir * (bedW / 2 + 0.48), 0.26, cz - bedL / 2 + 0.28);
        stand.castShadow = true;
        group.add(stand);

        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.32, 16), brassMat);
        lamp.position.set(cx + dir * (bedW / 2 + 0.48), 0.68, cz - bedL / 2 + 0.28);
        group.add(lamp);
      });

      // Study Desk & Glass Sliding Wall to Private Garden
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 0.7), oakMat);
      desk.position.set(cx - w * 0.3, 0.38, cz + d * 0.32);
      desk.castShadow = true;
      group.add(desk);
    }
    // ROOM 04: THE OLIVE PATIO (Courtyard with Century-Old Olive Tree & Pool)
    else if (room.category === "outdoor" && (room.id === "patio" || room.name.toLowerCase().includes("patio"))) {
      // 1. Ancient Olive Tree c. 1890 right in the center of the patio
      const oliveTrunkGroup = new THREE.Group();
      oliveTrunkGroup.position.set(cx, 0, cz);

      // Gnarled sculptural trunk
      const trunkMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.52, 2.5, 12),
        new THREE.MeshStandardMaterial({ color: 0x483e33, roughness: 0.95 })
      );
      trunkMesh.position.y = 1.25;
      trunkMesh.rotation.z = 0.12;
      oliveTrunkGroup.add(trunkMesh);

      // Main branches
      [-0.6, 0.6].forEach((bx, bIdx) => {
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.24, 1.8, 8),
          new THREE.MeshStandardMaterial({ color: 0x483e33, roughness: 0.95 })
        );
        branch.position.set(bx, 2.3, (bIdx - 0.5) * 0.4);
        branch.rotation.z = (bIdx === 0 ? -1 : 1) * 0.45;
        oliveTrunkGroup.add(branch);
      });

      // Canopy of silver-green olive foliage
      [
        { x: -0.7, y: 3.2, z: -0.3, s: 1.5 },
        { x: 0.7, y: 3.3, z: 0.4, s: 1.6 },
        { x: 0, y: 3.9, z: 0, s: 1.9 },
      ].forEach((c) => {
        const clump = new THREE.Mesh(new THREE.SphereGeometry(c.s, 12, 10), foliageMat);
        clump.position.set(c.x, c.y, c.z);
        clump.scale.set(1.2, 0.85, 1.1);
        oliveTrunkGroup.add(clump);
      });

      group.add(oliveTrunkGroup);

      // 2. Travertine Sitting Bench under the olive tree
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.65), travertineMat);
      bench.position.set(cx + 2.2, 0.22, cz + 1.2);
      bench.castShadow = true;
      group.add(bench);
    }
    // GENERAL / RESIDENTIAL FALLBACK
    else {
      // Clean modern low cabinet
      const credenza = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.5, 2.4), 0.65, 0.5), oakMat);
      credenza.position.set(cx, 0.33, cz);
      credenza.castShadow = true;
      group.add(credenza);
    }
  };

  const heroOpacity = Math.max(0, 1 - scrollProgress * 7);

  return (
    <div className="relative w-full h-full min-h-[580px] bg-[#efebe2] select-none overflow-hidden font-sans">
      
      {/* 3D CANVAS VIEWPORT */}
      <div 
        ref={containerRef} 
        className={`absolute inset-0 w-full h-full ${scrollProgress > 0.15 ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
      />

      {/* TOP HEADER BAR */}
      <header className="absolute top-0 left-0 right-0 px-6 py-4 flex items-center justify-between z-20 pointer-events-none">
        
        {/* Left Project Title */}
        <div className="pointer-events-auto flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest font-mono font-bold text-neutral-800">
            LINTEL · {project.name.toUpperCase()} · 2026
          </span>
        </div>

        {/* Right Actions & Archetype Selector */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          
          {/* Quick Archetype Switcher */}
          {onSelectArchetype && (
            <div className="hidden sm:flex items-center gap-1.5 bg-white/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-neutral-300 text-[11px] font-mono text-neutral-700 shadow-sm">
              <span className="text-neutral-400 font-bold">MẪU:</span>
              <button
                id="btn-casaserra"
                onClick={() => onSelectArchetype("casa-serra-original")}
                className={`px-2.5 py-0.5 rounded-full cursor-pointer transition ${
                  project.id === "casa-serra-original" ? "bg-[#FF4D00] text-white font-bold shadow-sm" : "hover:text-black"
                }`}
                title="Mẫu gốc Casa Serra chuẩn Sintra, Bồ Đào Nha"
              >
                Casa Serra
              </button>
              <button
                id="btn-lau2"
                onClick={() => onSelectArchetype("nha-lau-2")}
                className={`px-2.5 py-0.5 rounded-full cursor-pointer transition ${
                  project.id === "nha-lau-2" ? "bg-[#FF4D00] text-white font-bold shadow-sm" : "hover:text-black"
                }`}
                title="Bản vẽ Lầu 2: Sinh Hoạt Chung ở giữa, 2 Phòng Ngủ 2 bên"
              >
                Lầu 2 (nhà.jfif)
              </button>
            </div>
          )}

          {/* Upload Button */}
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="px-4 py-1.5 rounded-full border border-neutral-800 text-xs font-mono font-semibold tracking-wider uppercase text-neutral-900 bg-white/80 hover:bg-neutral-900 hover:text-white transition shadow-sm flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Tải Bản Vẽ 2D</span>
            </button>
          )}

          {/* Export 3D GLB Button */}
          <button
            onClick={handleExportGLB}
            disabled={isExportingGLB}
            className="px-4 py-1.5 rounded-full border border-amber-600 bg-amber-500/90 hover:bg-amber-500 text-neutral-950 font-mono text-xs font-bold tracking-wider uppercase shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            title="Tải toàn bộ cảnh 3D về máy dưới dạng file .GLB"
          >
            <span>{isExportingGLB ? "⏳" : "📥"}</span>
            <span>{isExportingGLB ? "Đang Xuất..." : "Xuất 3D (.GLB)"}</span>
          </button>

          {/* Revert to Demo */}
          {isCustomUploaded && onResetToDemo && (
            <button
              onClick={onResetToDemo}
              className="px-3 py-1.5 rounded-full border border-neutral-400 text-xs font-mono text-neutral-700 bg-white/60 hover:bg-white transition"
              title="Xem lại bản vẽ mẫu Casa Serra"
            >
              ↺ Về Mẫu Gốc
            </button>
          )}
        </div>
      </header>

      {/* 3D CAMERA MODES, LAYER TOGGLES & 3D RULER TOOLBAR (Story 4.2) */}
      <FloorLayerToolbar
        cameraMode={cameraMode}
        onCameraModeChange={handleCameraModeChange}
        showCeilings={showCeilings}
        onToggleCeilings={() => setShowCeilings((v) => !v)}
        showWalls={showWalls}
        onToggleWalls={() => setShowWalls((v) => !v)}
        showFurniture={showFurniture}
        onToggleFurniture={() => setShowFurniture((v) => !v)}
        showLandscape={showLandscape}
        onToggleLandscape={() => setShowLandscape((v) => !v)}
        isRulerActive={isRulerActive}
        onToggleRuler={() => {
          setIsRulerActive((v) => {
            const next = !v;
            if (!next) clearMeasurement();
            return next;
          });
        }}
        measuredDistance={measuredDistance}
        onClearMeasurement={clearMeasurement}
      />

      {/* 2D ZOOM CONTROLS */}
      {scrollProgress <= 0.08 && (
        <div className="absolute top-20 right-6 z-20 pointer-events-auto flex items-center gap-1 bg-white/80 backdrop-blur-md border border-neutral-300 rounded-full px-2 py-1 shadow-sm text-xs font-mono">
          <span className="text-[10px] text-neutral-500 font-bold px-1">2D ZOOM</span>
          <button
            onClick={() => setZoomScale((z) => Math.max(0.7, z - 0.2))}
            className="w-6 h-6 rounded-full hover:bg-neutral-200 flex items-center justify-center font-bold text-neutral-700"
            title="Thu nhỏ bản vẽ"
          >
            -
          </button>
          <span className="text-[11px] font-bold text-[#FF4D00] w-10 text-center">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            onClick={() => setZoomScale((z) => Math.min(2.5, z + 0.25))}
            className="w-6 h-6 rounded-full hover:bg-neutral-200 flex items-center justify-center font-bold text-neutral-700"
            title="Phóng to bản vẽ"
          >
            +
          </button>
        </div>
      )}

      {/* 3D FREE-LOOK INSTRUCTION HINT */}
      {scrollProgress > 0.18 && (
        <div className="absolute top-20 right-6 z-20 pointer-events-none hidden md:flex items-center gap-2 bg-[#f5f2ea]/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-300 text-[11px] font-mono text-neutral-600 shadow-sm">
          <span className="text-[#FF4D00]">✦</span>
          <span>Giữ & kéo chuột để xoay nhìn 360° bên trong phòng</span>
        </div>
      )}

      {/* 2D HERO OVERLAY (Lintel · Casa Serra Typography) */}
      <div 
        className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-200"
        style={{ opacity: heroOpacity, display: heroOpacity <= 0 ? "none" : "block" }}
      >
        {/* Left Column: Headline */}
        <div className="absolute top-24 left-8 md:left-12 max-w-sm space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[0.95] text-neutral-900 font-mono">
            EVERY HOUSE<br />
            STARTS AS<br />
            A <span className="text-[#FF4D00]">PLAN.</span>
          </h1>

          <p className="text-xs md:text-sm text-neutral-600 font-sans leading-relaxed">
            {project.id === "nha-lau-2" ? (
              <>Mặt bằng lầu 2 gồm Phòng sinh hoạt chung mở ra ban công trước, 2 phòng ngủ và sảnh thang. Cuộn chuột để mở cửa bước vào không gian 3D.</>
            ) : isCustomUploaded ? (
              <>Bản vẽ mặt bằng {project.specs.totalArea} m² gồm {project.rooms.length} phòng. Cuộn chuột để mở cửa và bước vào từng phòng.</>
            ) : (
              <>Casa Serra có mười sáu gian phòng và một cây ô liu cổ thụ. Cuộn chuột để bức vẽ phẳng vươn thành ngôi nhà thực thể.</>
            )}
          </p>
        </div>

        {/* Bottom Left: Title Block Table */}
        <div className="absolute bottom-10 left-8 md:left-12 pointer-events-auto">
          <div className="border border-neutral-800 bg-[#efebe2]/90 backdrop-blur-sm text-[10px] font-mono uppercase text-neutral-800">
            <div className="grid grid-cols-2 border-b border-neutral-800">
              <div className="px-3 py-1.5 border-r border-neutral-800">
                <span className="block text-[8px] text-neutral-500 font-bold">PROJECT</span>
                <span className="font-bold tracking-wider">{project.name}</span>
              </div>
              <div className="px-3 py-1.5">
                <span className="block text-[8px] text-neutral-500 font-bold">DRAWING</span>
                <span className="font-bold tracking-wider">{project.subtitle || "GROUND FLOOR PLAN"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2">
              <div className="px-3 py-1.5 border-r border-neutral-800">
                <span className="block text-[8px] text-neutral-500 font-bold">SCALE</span>
                <span className="font-bold tracking-wider">{project.specs.scale || "1 : 100"}</span>
              </div>
              <div className="px-3 py-1.5">
                <span className="block text-[8px] text-neutral-500 font-bold">SHEET</span>
                <span className="font-bold tracking-wider">{project.code || "A-101 REV D"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Center: Scroll Hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
          <div className="inline-flex flex-col items-center gap-1">
            <span className="text-[11px] font-mono tracking-widest uppercase text-neutral-800 font-bold animate-pulse">
              SCROLL TO WALK IN
            </span>
            <span className="text-neutral-500 text-xs animate-bounce">↓</span>
          </div>
        </div>
      </div>

      {/* 3D MODE: ROOM SPECIFICATION CORNER OVERLAY (Exact match to Lintel Room Header) */}
      {scrollProgress > 0.22 && activeRoom && (
        <aside 
          aria-label="Room Specification"
          data-no-scroll="true"
          className="absolute left-8 top-16 md:left-12 max-w-md z-20 pointer-events-auto transition-all text-neutral-900"
        >
          <div className="flex items-center gap-3 mb-1 text-[11px] font-mono font-bold tracking-widest uppercase text-[#FF4D00]">
            <span>[ + ]</span>
            <span>ROOM 0{activeRoomIndex + 1}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-900 font-mono leading-none mb-2">
            {activeRoom.name}
          </h2>

          <div className="text-[11px] font-mono text-neutral-600 tracking-wider mb-2">
            <span>{activeRoom.area} M²</span>
            <span className="mx-2">·</span>
            <span>CEILING {activeRoom.ceilingHeight || 4.5} M</span>
            <span className="mx-2">·</span>
            <span className="text-[#FF4D00] cursor-pointer hover:underline">OPEN FILE +</span>
          </div>

          <p className="text-xs text-neutral-700 font-sans leading-relaxed max-w-sm hidden sm:block">
            {activeRoom.description}
          </p>
        </aside>
      )}

      {/* 3D MODE: MINIMAL TIMELINE SCRUBBER */}
      {scrollProgress > 0.08 && (
        <div className="absolute bottom-4 left-6 right-6 z-20 pointer-events-auto">
          <div className="max-w-3xl mx-auto rounded-xl bg-[#f5f2ea]/95 backdrop-blur-md border border-neutral-300 p-2.5 shadow-lg space-y-2">
            
            {/* Scrubber slider */}
            <div className="flex items-center gap-3 px-1">
              <button
                onClick={() => updateProgress(0)}
                className="text-[10px] font-mono uppercase font-bold text-neutral-600 hover:text-neutral-900 transition"
              >
                ← 2D Plan
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.005}
                value={scrollProgress}
                onChange={(e) => updateProgress(parseFloat(e.target.value))}
                className="flex-1 accent-[#FF4D00] h-1.5 bg-neutral-300 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] font-mono font-bold text-[#FF4D00]">
                {Math.round(scrollProgress * 100)}% 3D
              </span>
            </div>

            {/* Room pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {project.rooms.map((room, idx) => {
                const isActive = idx === activeRoomIndex && scrollProgress > 0.25;
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      const total = project.rooms.length;
                      const targetProg = 0.28 + (idx / Math.max(1, total - 1)) * 0.60;
                      updateProgress(targetProg);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap border transition ${
                      isActive
                        ? "bg-[#FF4D00] text-white border-[#FF4D00] font-bold shadow-sm"
                        : "bg-white/80 border-neutral-300 text-neutral-700 hover:bg-white"
                    }`}
                  >
                    0{idx + 1} {room.name}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
