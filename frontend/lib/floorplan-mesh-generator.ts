/**
 * 3D Mesh Generator for PickMe3D (STORY-THUAN-BP05)
 * Implements Segmented Wall Extrusion (BIM Standard) to create walls with clean window/door openings
 * without any CSG Boolean non-manifold errors.
 */

import * as THREE from "three";
import {
  LayoutData,
  WallSegment,
  OpeningSpec,
  RoomPolygon,
  FurniturePlacement
} from "./floorplan-types";
import { FURNITURE_CATALOG } from "./furniture-catalog";

export interface MeshMaterials {
  exteriorWallMat: THREE.Material;
  interiorWallMat: THREE.Material;
  lintelSillMat: THREE.Material;
  doorWoodMat: THREE.Material;
  windowFrameMat: THREE.Material;
  glassMat: THREE.Material;
  concreteFloorMat: THREE.Material;
  oakFloorMat: THREE.Material;
  marbleFloorMat: THREE.Material;
  tileFloorMat: THREE.Material;
  ceilingMat: THREE.Material;
}

/**
 * Creates default PBR materials for architectural rendering
 */
export function createDefaultArchitecturalMaterials(): MeshMaterials {
  return {
    exteriorWallMat: new THREE.MeshStandardMaterial({
      color: 0xf3eee5, // warm architectural stucco
      roughness: 0.85,
      metalness: 0.05
    }),
    interiorWallMat: new THREE.MeshStandardMaterial({
      color: 0xfdfbf7, // pure interior plaster white
      roughness: 0.9,
      metalness: 0.02
    }),
    lintelSillMat: new THREE.MeshStandardMaterial({
      color: 0xe8e2d8,
      roughness: 0.8,
      metalness: 0.05
    }),
    doorWoodMat: new THREE.MeshStandardMaterial({
      color: 0x5c4033, // warm walnut / teak
      roughness: 0.65,
      metalness: 0.1
    }),
    windowFrameMat: new THREE.MeshStandardMaterial({
      color: 0x1f2937, // dark aluminum
      roughness: 0.35,
      metalness: 0.75
    }),
    glassMat: new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.35
    }),
    concreteFloorMat: new THREE.MeshStandardMaterial({
      color: 0xcfcfcf,
      roughness: 0.7,
      metalness: 0.05
    }),
    oakFloorMat: new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.55,
      metalness: 0.08
    }),
    marbleFloorMat: new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.2,
      metalness: 0.1
    }),
    tileFloorMat: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.45,
      metalness: 0.05
    }),
    ceilingMat: new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.9,
      side: THREE.DoubleSide
    })
  };
}

/**
 * 1. SEGMENTED WALL EXTRUSION:
 * Creates wall meshes with door/window openings via direct segmented boxes (lintel, sill, left/right walls).
 */
export function generateWallSegmentMeshes(
  wall: WallSegment,
  allOpenings: OpeningSpec[],
  materials: MeshMaterials = createDefaultArchitecturalMaterials()
): THREE.Group {
  const wallGroup = new THREE.Group();
  wallGroup.name = `wall_${wall.id}`;

  const [x1, z1] = wall.start;
  const [x2, z2] = wall.end;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.hypot(dx, dz);

  if (length < 0.05) return wallGroup;

  // Position parent group at start point and rotate towards end point
  wallGroup.position.set(x1, 0, z1);
  wallGroup.rotation.y = -Math.atan2(dz, dx);

  const T = wall.thickness || (wall.type === "exterior" ? 0.22 : 0.11);
  const H = wall.height || 3.3;
  const mainWallMat = wall.type === "exterior" ? materials.exteriorWallMat : materials.interiorWallMat;

  // Find openings belonging to this wall
  const relevantOpenings = allOpenings.filter((op) => {
    if (op.wall_id && op.wall_id === wall.id) return true;
    if (wall.openings && wall.openings.includes(op.id)) return true;
    return false;
  });

  // If no openings, render 1 solid wall box
  if (relevantOpenings.length === 0) {
    const geo = new THREE.BoxGeometry(length, H, T);
    geo.translate(length / 2, H / 2, 0);
    const mesh = new THREE.Mesh(geo, mainWallMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `${wall.id}_solid`;
    wallGroup.add(mesh);
    return wallGroup;
  }

  // Calculate local interval along wall length for each opening
  interface LocalOpening {
    spec: OpeningSpec;
    start: number;
    end: number;
    width: number;
    height: number;
    sill: number;
  }

  const localOpenings: LocalOpening[] = [];

  for (const op of relevantOpenings) {
    // Project opening center onto wall axis
    const t = (op.center[0] - x1) * (dx / length) + (op.center[1] - z1) * (dz / length);
    const w = op.width || 1.0;
    const start = Math.max(0, t - w / 2);
    const end = Math.min(length, t + w / 2);

    if (end > start + 0.05) {
      localOpenings.push({
        spec: op,
        start,
        end,
        width: end - start,
        height: op.height || 2.2,
        sill: op.sill_height || 0.0
      });
    }
  }

  // Sort openings from start to end
  localOpenings.sort((a, b) => a.start - b.start);

  // A. Generate Full-Height Solid Wall Segments between openings
  let curX = 0;

  for (let i = 0; i < localOpenings.length; i++) {
    const op = localOpenings[i];

    if (op.start > curX + 0.05) {
      const segLen = op.start - curX;
      const segGeo = new THREE.BoxGeometry(segLen, H, T);
      segGeo.translate(curX + segLen / 2, H / 2, 0);
      const segMesh = new THREE.Mesh(segGeo, mainWallMat);
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      segMesh.name = `${wall.id}_seg_${i}`;
      wallGroup.add(segMesh);
    }

    curX = Math.max(curX, op.end);
  }

  // Final wall section from last opening to wall end
  if (curX < length - 0.05) {
    const segLen = length - curX;
    const segGeo = new THREE.BoxGeometry(segLen, H, T);
    segGeo.translate(curX + segLen / 2, H / 2, 0);
    const segMesh = new THREE.Mesh(segGeo, mainWallMat);
    segMesh.castShadow = true;
    segMesh.receiveShadow = true;
    segMesh.name = `${wall.id}_seg_end`;
    wallGroup.add(segMesh);
  }

  // B. Generate Lintel (above opening) and Sill (below opening)
  for (let i = 0; i < localOpenings.length; i++) {
    const op = localOpenings[i];
    const midX = (op.start + op.end) / 2;
    const opTop = op.sill + op.height;

    // 1. Lintel (Khối tường phía trên cửa)
    if (H > opTop + 0.05) {
      const lintelH = H - opTop;
      const lintelGeo = new THREE.BoxGeometry(op.width, lintelH, T);
      lintelGeo.translate(midX, opTop + lintelH / 2, 0);
      const lintelMesh = new THREE.Mesh(lintelGeo, mainWallMat);
      lintelMesh.castShadow = true;
      lintelMesh.receiveShadow = true;
      lintelMesh.name = `${wall.id}_lintel_${i}`;
      wallGroup.add(lintelMesh);
    }

    // 2. Sill (Bậu tường phía dưới cửa sổ)
    if (op.sill > 0.05) {
      const sillH = op.sill;
      const sillGeo = new THREE.BoxGeometry(op.width, sillH, T);
      sillGeo.translate(midX, sillH / 2, 0);
      const sillMesh = new THREE.Mesh(sillGeo, mainWallMat);
      sillMesh.castShadow = true;
      sillMesh.receiveShadow = true;
      sillMesh.name = `${wall.id}_sill_${i}`;
      wallGroup.add(sillMesh);
    }

    // 3. Opening Trim & Glass / Door Slab
    const fillerGroup = createOpeningFillerMesh(op.spec, op.width, T, materials);
    fillerGroup.position.set(midX, op.sill, 0);
    wallGroup.add(fillerGroup);
  }

  return wallGroup;
}

/**
 * Creates window glass/aluminum sash or wood door slab inside an opening.
 */
function createOpeningFillerMesh(
  opening: OpeningSpec,
  width: number,
  wallThickness: number,
  materials: MeshMaterials
): THREE.Group {
  const group = new THREE.Group();
  group.name = `filler_${opening.id}`;

  const isDoor = opening.type === "door";
  const H = opening.height;
  const frameThick = 0.05;

  if (isDoor) {
    // Outer Door Frame
    const frameGeo = new THREE.BoxGeometry(width, H, wallThickness * 1.05);
    frameGeo.translate(0, H / 2, 0);

    // Door Slab (thin wood panel slightly open)
    const doorGeo = new THREE.BoxGeometry(width - frameThick * 2, H - frameThick, 0.04);
    doorGeo.translate(0, (H - frameThick) / 2, 0);
    const doorMesh = new THREE.Mesh(doorGeo, materials.doorWoodMat);
    doorMesh.castShadow = true;
    group.add(doorMesh);
  } else {
    // Window Frame (Aluminum)
    const frameGeo = new THREE.BoxGeometry(width, H, wallThickness * 0.7);
    frameGeo.translate(0, H / 2, 0);

    // Glass Pane
    const glassGeo = new THREE.BoxGeometry(width - frameThick * 2, H - frameThick * 2, 0.015);
    glassGeo.translate(0, H / 2, 0);
    const glassMesh = new THREE.Mesh(glassGeo, materials.glassMat);
    group.add(glassMesh);

    // Thin horizontal mullion
    const mullionGeo = new THREE.BoxGeometry(width, 0.04, wallThickness * 0.75);
    mullionGeo.translate(0, H / 2, 0);
    const mullionMesh = new THREE.Mesh(mullionGeo, materials.windowFrameMat);
    group.add(mullionMesh);
  }

  return group;
}

/**
 * 2. POLYGON ROOM FLOOR GENERATOR:
 * Creates clean polygonal floor meshes from RoomPolygon vertices.
 */
export function generateRoomFloorMesh(
  room: RoomPolygon,
  materials: MeshMaterials = createDefaultArchitecturalMaterials()
): THREE.Mesh {
  const poly = room.polygon;
  if (!poly || poly.length < 3) {
    // Fallback plane
    const fallbackGeo = new THREE.PlaneGeometry(4, 4);
    fallbackGeo.rotateX(-Math.PI / 2);
    return new THREE.Mesh(fallbackGeo, materials.concreteFloorMat);
  }

  const shape = new THREE.Shape();
  shape.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) {
    shape.lineTo(poly[i][0], poly[i][1]);
  }
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape);
  // In ShapeGeometry, X is horizontal, Y is vertical. Rotate X by -90° to map Y to Z!
  geo.rotateX(-Math.PI / 2);

  // Pick floor material
  let mat = materials.concreteFloorMat;
  const floorType = room.materials?.floor;
  if (floorType === "oak" || floorType === "dark_wood") mat = materials.oakFloorMat;
  else if (floorType === "marble") mat = materials.marbleFloorMat;
  else if (floorType === "tile") mat = materials.tileFloorMat;

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = `floor_${room.id}`;
  mesh.position.y = 0.01; // Slightly above ground to avoid z-fighting
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * 3. POLYGON ROOM CEILING GENERATOR:
 */
export function generateRoomCeilingMesh(
  room: RoomPolygon,
  defaultHeight: number = 3.3,
  materials: MeshMaterials = createDefaultArchitecturalMaterials()
): THREE.Mesh {
  const poly = room.polygon;
  if (!poly || poly.length < 3) {
    const fallbackGeo = new THREE.PlaneGeometry(4, 4);
    fallbackGeo.rotateX(Math.PI / 2);
    return new THREE.Mesh(fallbackGeo, materials.ceilingMat);
  }

  const shape = new THREE.Shape();
  shape.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) {
    shape.lineTo(poly[i][0], poly[i][1]);
  }
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(Math.PI / 2); // normals facing downwards into the room

  const mesh = new THREE.Mesh(geo, materials.ceilingMat);
  mesh.name = `ceiling_${room.id}`;
  mesh.position.y = room.ceiling_height || defaultHeight;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * 4. HIGH-LEVEL ARCHITECTURAL SCENE BUILDER:
 * Creates a complete THREE.Scene from a LayoutData structure.
 */
export function buildFull3DSceneFromLayout(
  layout: LayoutData,
  materials: MeshMaterials = createDefaultArchitecturalMaterials(),
  options: { includeCeilings?: boolean; includeFoundation?: boolean } = {}
): THREE.Scene {
  const scene = new THREE.Scene();
  scene.name = layout.metadata.project_name || "PickMe3D Scene";

  const { width, length, default_ceiling_height } = layout.metadata.dimensions;

  // A. Foundation Ground Slab
  if (options.includeFoundation !== false) {
    const slabGeo = new THREE.BoxGeometry(width + 4, 0.3, length + 4);
    slabGeo.translate(0, -0.15, 0);
    const slabMesh = new THREE.Mesh(slabGeo, materials.concreteFloorMat);
    slabMesh.receiveShadow = true;
    slabMesh.name = "foundation_slab";
    scene.add(slabMesh);
  }

  // B. Wall Groups
  const wallsGroup = new THREE.Group();
  wallsGroup.name = "walls_group";

  for (const wall of layout.walls) {
    const wallMeshGroup = generateWallSegmentMeshes(wall, layout.openings, materials);
    wallsGroup.add(wallMeshGroup);
  }
  scene.add(wallsGroup);

  // C. Room Floors and Ceilings
  const floorsGroup = new THREE.Group();
  floorsGroup.name = "floors_group";

  const ceilingsGroup = new THREE.Group();
  ceilingsGroup.name = "ceilings_group";

  for (const room of layout.rooms) {
    const floorMesh = generateRoomFloorMesh(room, materials);
    floorsGroup.add(floorMesh);

    if (options.includeCeilings !== false) {
      const ceilingMesh = generateRoomCeilingMesh(room, default_ceiling_height, materials);
      ceilingsGroup.add(ceilingMesh);
    }
  }

  scene.add(floorsGroup);
  if (options.includeCeilings !== false) {
    scene.add(ceilingsGroup);
  }

  // D. Furniture Placement Placeholders
  const furnitureGroup = new THREE.Group();
  furnitureGroup.name = "furniture_group";

  for (const asset of layout.furniture_assets) {
    const catalogItem = FURNITURE_CATALOG.find((item) => item.id === asset.asset_model_id);
    const w = catalogItem?.dimensions.width || 1.0;
    const h = catalogItem?.dimensions.height || 0.8;
    const d = catalogItem?.dimensions.depth || 1.0;

    // Standard bounding box placeholder
    const boxGeo = new THREE.BoxGeometry(w, h, d);
    boxGeo.translate(0, h / 2, 0); // bottom-center pivot

    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      roughness: 0.6,
      metalness: 0.2
    });

    const assetMesh = new THREE.Mesh(boxGeo, boxMat);
    assetMesh.name = `furniture_${asset.id}`;
    assetMesh.position.set(asset.position[0], asset.position[1], asset.position[2]);
    assetMesh.rotation.y = THREE.MathUtils.degToRad(asset.rotation_deg || 0);
    assetMesh.castShadow = true;
    assetMesh.receiveShadow = true;

    furnitureGroup.add(assetMesh);
  }

  scene.add(furnitureGroup);

  return scene;
}

