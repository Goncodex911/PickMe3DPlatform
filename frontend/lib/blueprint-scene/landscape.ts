/**
 * Cảnh quan bên ngoài công trình (địa hình đồi, cây ô liu, hồ bơi) cho viewer Casa Serra.
 * Tách từ CasaSerraViewer.tsx. Vùng đất phẳng, vị trí cây và hồ bơi được tính theo kích thước
 * công trình thật để không mọc xuyên vào nhà khi dựng từ bản vẽ AI.
 */
import * as THREE from "three";
import type { BlueprintProject } from "../floorplan-types";

export interface PoolRect {
  cx: number;
  cz: number;
  width: number;
  depth: number;
}

export interface LandscapeOptions {
  buildingWidth: number;
  buildingLength: number;
  pool: PoolRect | null;
}

/** Hồ bơi mặc định của các mặt bằng mẫu Casa Serra (giữ nguyên hành vi cũ). */
export const PRESET_POOL: PoolRect = { cx: 3, cz: -16, width: 18, depth: 3.8 };

const POOL_NAME_PATTERN = /pool|hồ bơi|ho boi|bể bơi/i;

/**
 * Vị trí hồ bơi:
 * - Mặt bằng mẫu (không có layoutData): giữ hồ bơi cố định như trước.
 * - Bản vẽ AI / nắn chỉnh: chỉ đặt hồ bơi trong phòng outdoor có tên chứa "pool"/"hồ bơi",
 *   co theo kích thước phòng; không có phòng như vậy thì không vẽ hồ bơi.
 */
export function resolvePoolRect(project: BlueprintProject): PoolRect | null {
  if (!project.layoutData) return PRESET_POOL;

  const poolRoom = project.rooms.find(
    (r) => r.category === "outdoor" && POOL_NAME_PATTERN.test(`${r.name} ${r.vietnameseName ?? ""}`)
  );
  if (!poolRoom) return null;

  const [x0, z0, x1, z1] = poolRoom.bounds;
  const roomW = Math.abs(x1 - x0);
  const roomD = Math.abs(z1 - z0);
  const width = Math.min(PRESET_POOL.width, Math.max(0, roomW - 2));
  const depth = Math.min(PRESET_POOL.depth, Math.max(0, roomD - 2));
  if (width < 1.5 || depth < 1.5) return null;
  return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, width, depth };
}

/** Bán kính vùng đất phẳng quanh công trình (trước đây cố định 18m). */
export function flatGroundRadius(buildingWidth: number, buildingLength: number): number {
  return Math.max(18, Math.hypot(buildingWidth, buildingLength) / 2 + 4);
}

export function buildExteriorLandscape(landscapeGroup: THREE.Group, options: LandscapeOptions): void {
  const flatRadius = flatGroundRadius(options.buildingWidth, options.buildingLength);
  const terrainSize = Math.max(160, flatRadius * 2 + 80);

  // A. EXTERIOR LANDSCAPE (Rolling hills terrain)
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 48, 48);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    // Create gentle rolling hillside topography outside building perimeter
    const dist = Math.hypot(x, z);
    if (dist > flatRadius) {
      const hill = Math.sin(x * 0.06) * 1.8 + Math.cos(z * 0.05) * 1.5 + (dist - flatRadius) * 0.035;
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

  // Exterior Olive Trees on distant hills (đẩy ra ngoài vùng đất phẳng nếu công trình lớn)
  const minTreeDist = flatRadius + 3;
  [-24, -18, 22, 28].forEach((tx) => {
    [-22, 24, -28, 26].forEach((tz) => {
      const dist = Math.hypot(tx, tz);
      const scale = dist < minTreeDist ? minTreeDist / dist : 1;
      const treeGroup = new THREE.Group();
      treeGroup.position.set(tx * scale, 0.4, tz * scale);

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

  // B. PATIO REFLECTING WATER POOL
  const pool = options.pool;
  if (!pool) return;

  const poolGeo = new THREE.PlaneGeometry(pool.width, pool.depth);
  poolGeo.rotateX(-Math.PI / 2);
  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: 0x3d5a68,
    roughness: 0.04,
    metalness: 0.6,
    transparent: true,
    opacity: 0.85,
  });
  const poolMesh = new THREE.Mesh(poolGeo, poolWaterMat);
  poolMesh.name = "pool_water";
  poolMesh.position.set(pool.cx, 0.015, pool.cz);
  poolMesh.receiveShadow = true;
  landscapeGroup.add(poolMesh);

  // Stone rim around pool
  const poolRimGeo = new THREE.BoxGeometry(pool.width + 0.6, 0.08, pool.depth + 0.6);
  const poolRimMat = new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.65 });
  const poolRimMesh = new THREE.Mesh(poolRimGeo, poolRimMat);
  poolRimMesh.name = "pool_rim";
  poolRimMesh.position.set(pool.cx, -0.02, pool.cz);
  landscapeGroup.add(poolRimMesh);
}
