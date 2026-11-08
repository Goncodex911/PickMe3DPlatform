/**
 * High-Fidelity PBR Material System for PickMe3D (STORY-THUAN-BP11)
 * Generates photorealistic architectural materials (wood parquet, polished marble, glass, stone)
 * with seamless procedural normal/roughness maps and support for physical transmission.
 */

import * as THREE from "three";
import { ArchitecturalStyle } from "./floorplan-types";

export interface PBRMaterialLibrary {
  oakParquetFloor: THREE.MeshStandardMaterial;
  darkWoodFloor: THREE.MeshStandardMaterial;
  marbleTileFloor: THREE.MeshStandardMaterial;
  ceramicTileFloor: THREE.MeshStandardMaterial;
  balconySlateFloor: THREE.MeshStandardMaterial;
  concreteFloor: THREE.MeshStandardMaterial;
  glassShowerClear: THREE.MeshPhysicalMaterial;
  blackGraniteCounter: THREE.MeshStandardMaterial;
  warmWhiteWall: THREE.MeshStandardMaterial;
  woodSlatsAccent: THREE.MeshStandardMaterial;
  fabricSofaGrey: THREE.MeshStandardMaterial;
  metalDarkBrushed: THREE.MeshStandardMaterial;
}

export interface PBRTextureBundle {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

/**
 * Creates a flat neutral normal map texture
 */
function createFlatNormalTexture(): THREE.CanvasTexture {
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!canvas) return new THREE.CanvasTexture({} as any);
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext ? canvas.getContext("2d") : null;
  if (ctx && typeof ctx.fillRect === "function") {
    ctx.fillStyle = "rgb(128, 128, 255)"; // neutral tangent-space normal
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Creates a uniform roughness texture
 */
function createUniformRoughnessTexture(val: number): THREE.CanvasTexture {
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!canvas) return new THREE.CanvasTexture({} as any);
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext ? canvas.getContext("2d") : null;
  if (ctx && typeof ctx.fillRect === "function") {
    const c = Math.round(Math.min(255, Math.max(0, val * 255)));
    ctx.fillStyle = `rgb(${c}, ${c}, ${c})`;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Procedurally creates a high-quality tileable Wood Parquet bundle (map, normal, roughness)
 */
function createProceduralParquetBundle(isLightOak = true): PBRTextureBundle {
  const size = 512;
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  const normCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  const roughCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;

  if (!canvas || !normCanvas || !roughCanvas || typeof canvas.getContext !== "function") {
    return {
      map: new THREE.CanvasTexture({} as any),
      normalMap: createFlatNormalTexture(),
      roughnessMap: createUniformRoughnessTexture(0.38)
    };
  }

  canvas.width = normCanvas.width = roughCanvas.width = size;
  canvas.height = normCanvas.height = roughCanvas.height = size;
  const ctx = canvas.getContext("2d");
  const normCtx = normCanvas.getContext("2d");
  const roughCtx = roughCanvas.getContext("2d");

  if (
    !ctx ||
    !normCtx ||
    !roughCtx ||
    typeof ctx.fillRect !== "function" ||
    typeof normCtx.fillRect !== "function" ||
    typeof roughCtx.fillRect !== "function"
  ) {
    return {
      map: new THREE.CanvasTexture(canvas),
      normalMap: createFlatNormalTexture(),
      roughnessMap: createUniformRoughnessTexture(0.38)
    };
  }

  // Base background
  ctx.fillStyle = isLightOak ? "#c8ad8d" : "#5a4128";
  ctx.fillRect(0, 0, size, size);

  normCtx.fillStyle = "rgb(128, 128, 255)";
  normCtx.fillRect(0, 0, size, size);

  roughCtx.fillStyle = "rgb(105, 105, 105)";
  roughCtx.fillRect(0, 0, size, size);

  const plankH = 32;
  const plankW = 128;
  const rows = size / plankH;
  const cols = size / plankW + 2;

  for (let r = 0; r < rows; r++) {
    const y = r * plankH;
    const xOffset = (r % 2) * (plankW * 0.5);

    for (let c = -1; c < cols; c++) {
      const x = c * plankW + xOffset;
      const shadeDiff = (Math.sin(r * 12.3 + c * 4.7) * 0.5 + 0.5) * 16 - 8;

      const rVal = Math.min(255, Math.max(0, (isLightOak ? 200 : 90) + shadeDiff));
      const gVal = Math.min(255, Math.max(0, (isLightOak ? 173 : 65) + shadeDiff));
      const bVal = Math.min(255, Math.max(0, (isLightOak ? 141 : 40) + shadeDiff));

      ctx.fillStyle = `rgb(${rVal},${gVal},${bVal})`;
      ctx.fillRect(x + 1, y + 1, plankW - 2, plankH - 2);

      // Fine wood grain lines
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 1;
      for (let g = 3; g < plankH - 2; g += 5) {
        ctx.beginPath();
        ctx.moveTo(x, y + g);
        ctx.lineTo(x + plankW, y + g + (Math.random() - 0.5) * 2);
        ctx.stroke();
      }
    }
  }

  // Bevel grooves in normal and roughness
  normCtx.strokeStyle = "rgb(100, 100, 255)";
  normCtx.lineWidth = 2;
  roughCtx.strokeStyle = "rgb(210, 210, 210)";
  roughCtx.lineWidth = 2;

  for (let r = 0; r <= rows; r++) {
    const y = r * plankH;
    normCtx.beginPath();
    normCtx.moveTo(0, y);
    normCtx.lineTo(size, y);
    normCtx.stroke();

    roughCtx.beginPath();
    roughCtx.moveTo(0, y);
    roughCtx.lineTo(size, y);
    roughCtx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(3, 3);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 3);

  return { map, normalMap, roughnessMap };
}

/**
 * Procedurally creates a Marble Tile bundle (map, normal, roughness)
 */
function createProceduralMarbleBundle(): PBRTextureBundle {
  const size = 512;
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  const normCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  const roughCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;

  if (!canvas || !normCanvas || !roughCanvas) {
    return {
      map: new THREE.CanvasTexture({} as any),
      normalMap: createFlatNormalTexture(),
      roughnessMap: createUniformRoughnessTexture(0.18)
    };
  }

  canvas.width = normCanvas.width = roughCanvas.width = size;
  canvas.height = normCanvas.height = roughCanvas.height = size;
  const ctx = canvas.getContext("2d");
  const normCtx = normCanvas.getContext("2d");
  const roughCtx = roughCanvas.getContext("2d");

  if (
    !ctx ||
    !normCtx ||
    !roughCtx ||
    typeof ctx.fillRect !== "function" ||
    typeof normCtx.fillRect !== "function" ||
    typeof roughCtx.fillRect !== "function"
  ) {
    return {
      map: new THREE.CanvasTexture(canvas),
      normalMap: createFlatNormalTexture(),
      roughnessMap: createUniformRoughnessTexture(0.18)
    };
  }

  ctx.fillStyle = "#edebe6";
  ctx.fillRect(0, 0, size, size);

  normCtx.fillStyle = "rgb(128, 128, 255)";
  normCtx.fillRect(0, 0, size, size);

  roughCtx.fillStyle = "rgb(45, 45, 45)"; // high-gloss smooth surface
  roughCtx.fillRect(0, 0, size, size);

  // Soft marble veins
  ctx.strokeStyle = "rgba(140, 135, 130, 0.25)";
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let x = (i * size) / 5 + (Math.random() - 0.5) * 40;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < size) {
      y += 20 + Math.random() * 30;
      x += (Math.random() - 0.5) * 35;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Grout grid
  ctx.strokeStyle = "rgba(160, 155, 150, 0.5)";
  ctx.lineWidth = 2;
  normCtx.strokeStyle = "rgb(105, 105, 255)";
  normCtx.lineWidth = 2;
  roughCtx.strokeStyle = "rgb(190, 190, 190)";
  roughCtx.lineWidth = 2;

  const tileSize = 128;
  for (let x = 0; x <= size; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();

    normCtx.beginPath();
    normCtx.moveTo(x, 0);
    normCtx.lineTo(x, size);
    normCtx.stroke();

    roughCtx.beginPath();
    roughCtx.moveTo(x, 0);
    roughCtx.lineTo(x, size);
    roughCtx.stroke();
  }
  for (let y = 0; y <= size; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();

    normCtx.beginPath();
    normCtx.moveTo(0, y);
    normCtx.lineTo(size, y);
    normCtx.stroke();

    roughCtx.beginPath();
    roughCtx.moveTo(0, y);
    roughCtx.lineTo(size, y);
    roughCtx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(2, 2);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);

  return { map, normalMap, roughnessMap };
}

/**
 * Procedurally creates a Slate Balcony Tile bundle (map, normal, roughness)
 */
function createProceduralSlateBundle(): PBRTextureBundle {
  const size = 512;
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  const normCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  const roughCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;

  if (!canvas || !normCanvas || !roughCanvas) {
    return {
      map: new THREE.CanvasTexture({} as any),
      normalMap: createFlatNormalTexture(),
      roughnessMap: createUniformRoughnessTexture(0.88)
    };
  }

  canvas.width = normCanvas.width = roughCanvas.width = size;
  canvas.height = normCanvas.height = roughCanvas.height = size;
  const ctx = canvas.getContext("2d");
  const normCtx = normCanvas.getContext("2d");
  const roughCtx = roughCanvas.getContext("2d");

  if (
    !ctx ||
    !normCtx ||
    !roughCtx ||
    typeof ctx.fillRect !== "function" ||
    typeof normCtx.fillRect !== "function" ||
    typeof roughCtx.fillRect !== "function"
  ) {
    return {
      map: new THREE.CanvasTexture(canvas),
      normalMap: createFlatNormalTexture(),
      roughnessMap: createUniformRoughnessTexture(0.88)
    };
  }

  // Dark charcoal slate color matching Image 1 balcony
  ctx.fillStyle = "#343940";
  ctx.fillRect(0, 0, size, size);

  normCtx.fillStyle = "rgb(128, 128, 255)";
  normCtx.fillRect(0, 0, size, size);

  roughCtx.fillStyle = "rgb(220, 220, 220)"; // rough non-slip finish
  roughCtx.fillRect(0, 0, size, size);

  // Subtle stone flecks
  ctx.fillStyle = "rgba(60, 65, 72, 0.4)";
  for (let i = 0; i < 300; i++) {
    ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }

  // Grout grid
  ctx.strokeStyle = "rgba(20, 22, 25, 0.8)";
  ctx.lineWidth = 2.5;
  normCtx.strokeStyle = "rgb(110, 110, 255)";
  normCtx.lineWidth = 2.5;

  const tileSize = 128;
  for (let x = 0; x <= size; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();

    normCtx.beginPath();
    normCtx.moveTo(x, 0);
    normCtx.lineTo(x, size);
    normCtx.stroke();
  }
  for (let y = 0; y <= size; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();

    normCtx.beginPath();
    normCtx.moveTo(0, y);
    normCtx.lineTo(size, y);
    normCtx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(2, 2);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);

  return { map, normalMap, roughnessMap };
}

/**
 * Procedurally creates a Plaster Stucco Wall bundle (map, normal, roughness)
 */
function createProceduralPlasterBundle(isWarm = true): PBRTextureBundle {
  const size = 256;
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  const normCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  const roughCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;

  if (!canvas || !normCanvas || !roughCanvas) {
    return {
      map: new THREE.CanvasTexture({} as any),
      normalMap: createFlatNormalTexture(),
      roughnessMap: createUniformRoughnessTexture(0.85)
    };
  }

  canvas.width = normCanvas.width = roughCanvas.width = size;
  canvas.height = normCanvas.height = roughCanvas.height = size;
  const ctx = canvas.getContext("2d");
  const normCtx = normCanvas.getContext("2d");
  const roughCtx = roughCanvas.getContext("2d");

  if (
    !ctx ||
    !normCtx ||
    !roughCtx ||
    typeof ctx.fillRect !== "function" ||
    typeof normCtx.fillRect !== "function" ||
    typeof roughCtx.fillRect !== "function"
  ) {
    return {
      map: new THREE.CanvasTexture(canvas),
      normalMap: createFlatNormalTexture(),
      roughnessMap: createUniformRoughnessTexture(0.85)
    };
  }

  ctx.fillStyle = isWarm ? "#fcfbfa" : "#f5f5f7";
  ctx.fillRect(0, 0, size, size);

  normCtx.fillStyle = "rgb(128, 128, 255)";
  normCtx.fillRect(0, 0, size, size);

  roughCtx.fillStyle = "rgb(215, 215, 215)";
  roughCtx.fillRect(0, 0, size, size);

  // Soft granular plaster noise
  ctx.fillStyle = "rgba(0, 0, 0, 0.02)";
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 4);

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(4, 4);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(4, 4);

  return { map, normalMap, roughnessMap };
}

/**
 * Creates the complete ArchViz PBR Material suite adapted to the chosen Architectural Style (STORY-THUAN-BP11)
 */
export function createPhotorealisticMaterialLibrary(style: ArchitecturalStyle = "scandinavian"): PBRMaterialLibrary {
  const oakParquetBundle = createProceduralParquetBundle(style !== "luxury_marble");
  const marbleBundle = createProceduralMarbleBundle();
  const slateBundle = createProceduralSlateBundle();
  const plasterBundle = createProceduralPlasterBundle(style === "scandinavian" || style === "casa_serra");

  // 1. Sàn Gỗ Tự Nhiên (Oak Parquet with map, normalMap, roughnessMap)
  const oakParquetFloor = new THREE.MeshStandardMaterial({
    map: oakParquetBundle.map,
    normalMap: oakParquetBundle.normalMap,
    roughnessMap: oakParquetBundle.roughnessMap,
    roughness: 0.38,
    metalness: 0.05,
    color: style === "modern_minimal" ? 0xdfd3c3 : 0xf0e6d6
  });

  const darkWoodFloor = new THREE.MeshStandardMaterial({
    map: oakParquetBundle.map,
    normalMap: oakParquetBundle.normalMap,
    roughnessMap: oakParquetBundle.roughnessMap,
    roughness: 0.35,
    metalness: 0.08,
    color: 0x4a3728
  });

  // 2. Sàn Đá Marble Cao Cấp (Marble Tile with map, normalMap, roughnessMap)
  const marbleTileFloor = new THREE.MeshStandardMaterial({
    map: marbleBundle.map,
    normalMap: marbleBundle.normalMap,
    roughnessMap: marbleBundle.roughnessMap,
    roughness: 0.18,
    metalness: 0.1,
    color: 0xffffff
  });

  const ceramicTileFloor = new THREE.MeshStandardMaterial({
    map: marbleBundle.map,
    normalMap: marbleBundle.normalMap,
    roughnessMap: marbleBundle.roughnessMap,
    roughness: 0.3,
    metalness: 0.05,
    color: 0xe5e0d8
  });

  // 3. Sàn Đá Nhám Ban Công Chống Trơn (Slate Balcony with map, normalMap, roughnessMap)
  const balconySlateFloor = new THREE.MeshStandardMaterial({
    map: slateBundle.map,
    normalMap: slateBundle.normalMap,
    roughnessMap: slateBundle.roughnessMap,
    roughness: 0.88,
    metalness: 0.12,
    color: 0x3d434a
  });

  // 4. Sàn Bê Tông Mài
  const concreteFloor = new THREE.MeshStandardMaterial({
    roughness: 0.75,
    metalness: 0.05,
    color: 0xd8d4cb
  });

  // 5. Kính Cường Lực Phòng Tắm Trong Suốt (Physical Transmission: AC requirement transmission: 0.95, roughness: 0.05, ior: 1.5)
  const glassShowerClear = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
    transmission: 0.95,
    roughness: 0.05,
    ior: 1.5,
    metalness: 0.02
  });

  // 6. Mặt Đá Bếp Granite Đen Bóng
  const blackGraniteCounter = new THREE.MeshStandardMaterial({
    color: 0x181a1d,
    roughness: 0.22,
    metalness: 0.15
  });

  // 7. Tường Sơn Trắng Ấm / Kem (Plaster Wall with map, normalMap, roughnessMap)
  const warmWhiteWall = new THREE.MeshStandardMaterial({
    map: plasterBundle.map,
    normalMap: plasterBundle.normalMap,
    roughnessMap: plasterBundle.roughnessMap,
    color: style === "casa_serra" ? 0xede6db : 0xfcfbfa,
    roughness: 0.85,
    metalness: 0.02
  });

  // 8. Vách Lam Gỗ Trang Trí
  const woodSlatsAccent = new THREE.MeshStandardMaterial({
    color: 0x8a5d3b,
    roughness: 0.55,
    metalness: 0.05
  });

  // 9. Vải Sofa Nỉ
  const fabricSofaGrey = new THREE.MeshStandardMaterial({
    color: 0xc8c9cb,
    roughness: 0.95,
    metalness: 0.0
  });

  // 10. Kim Loại Đen Mờ Nhôm Kính
  const metalDarkBrushed = new THREE.MeshStandardMaterial({
    color: 0x222428,
    roughness: 0.45,
    metalness: 0.8
  });

  return {
    oakParquetFloor,
    darkWoodFloor,
    marbleTileFloor,
    ceramicTileFloor,
    balconySlateFloor,
    concreteFloor,
    glassShowerClear,
    blackGraniteCounter,
    warmWhiteWall,
    woodSlatsAccent,
    fabricSofaGrey,
    metalDarkBrushed
  };
}
