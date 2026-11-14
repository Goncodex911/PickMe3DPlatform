/**
 * Đặt nội thất từ kho GLB (public/models/furniture) theo đúng vị trí AI/người dùng trong LayoutData.
 * Món nào chưa có file GLB (catalog khai báo nhiều hơn số file hiện có) sẽ được thay bằng
 * khối giữ chỗ đúng kích thước catalog, để người dùng vẫn thấy vị trí và độ lớn.
 */
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { FurniturePlacement } from "../floorplan-types";
import { FURNITURE_CATALOG } from "../furniture-catalog";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** GLB đã nạp được dùng chung giữa các lần dựng lại cảnh (mỗi lần đặt sẽ clone). */
const gltfCache = new Map<string, Promise<GLTF>>();

export function resolveFurnitureUrl(asset: FurniturePlacement): string {
  const catalogUrl = FURNITURE_CATALOG.find((c) => c.id === asset.asset_model_id)?.glb_url;
  const raw = asset.glb_url || catalogUrl || `/models/furniture/${asset.asset_model_id}.glb`;
  if (/^(https?:|data:|blob:)/.test(raw)) return raw;
  return `${BASE_PATH}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function loadGltf(url: string, loader: GLTFLoader): Promise<GLTF> {
  let pending = gltfCache.get(url);
  if (!pending) {
    pending = loader.loadAsync(url);
    // Không giữ lại lỗi trong cache để lần sau còn thử lại
    pending.catch(() => gltfCache.delete(url));
    gltfCache.set(url, pending);
  }
  return pending;
}

/** Khối giữ chỗ theo kích thước catalog (pivot ở đáy, giữa). */
export function createFurniturePlaceholder(asset: FurniturePlacement): THREE.Mesh {
  const dims = FURNITURE_CATALOG.find((c) => c.id === asset.asset_model_id)?.dimensions;
  const w = dims?.width ?? 1;
  const h = dims?.height ?? 0.8;
  const d = dims?.depth ?? 1;
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0xc9bfae, roughness: 0.8, transparent: true, opacity: 0.85 })
  );
  mesh.name = `furniture_placeholder_${asset.id}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function applyPlacement(object: THREE.Object3D, asset: FurniturePlacement): void {
  object.position.set(asset.position[0], asset.position[1] || 0, asset.position[2]);
  object.rotation.y = THREE.MathUtils.degToRad(asset.rotation_deg || 0);
  const [sx, sy, sz] = asset.scale || [1, 1, 1];
  object.scale.set(sx || 1, sy || 1, sz || 1);
}

export interface PlaceFurnitureOptions {
  loader?: GLTFLoader;
  /** Trả false khi cảnh đã bị dựng lại/huỷ: bỏ qua kết quả nạp muộn. */
  isActive?: () => boolean;
}

/**
 * Đặt toàn bộ nội thất vào `group`. Khối giữ chỗ hiện ngay lập tức, rồi được thay bằng
 * mô hình GLB khi nạp xong. Trả về Promise hoàn tất khi mọi món đã xử lý (dùng cho test).
 */
export function placeLayoutFurniture(
  assets: FurniturePlacement[],
  group: THREE.Group,
  options: PlaceFurnitureOptions = {}
): Promise<{ loaded: number; placeholders: number }> {
  const loader = options.loader ?? new GLTFLoader();
  const isActive = options.isActive ?? (() => true);
  let loaded = 0;
  let placeholders = 0;

  const jobs = assets.map(async (asset) => {
    const placeholder = createFurniturePlaceholder(asset);
    applyPlacement(placeholder, asset);
    group.add(placeholder);

    try {
      const gltf = await loadGltf(resolveFurnitureUrl(asset), loader);
      if (!isActive()) return;
      const model = gltf.scene.clone(true);
      model.name = `furniture_${asset.id}`;
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      applyPlacement(model, asset);
      group.remove(placeholder);
      placeholder.geometry.dispose();
      group.add(model);
      loaded++;
    } catch (err) {
      // Giữ khối giữ chỗ khi không có file GLB / lỗi mạng
      placeholders++;
      console.warn(`Không nạp được nội thất ${asset.asset_model_id}:`, (err as Error)?.message);
    }
  });

  return Promise.all(jobs).then(() => ({ loaded, placeholders }));
}
