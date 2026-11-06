import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { cleanupThreeScene, disposeMaterial } from "./three-cleanup";

describe("STORY-THUAN-BP09: WebGL Scene Memory Cleanup & Disposal", () => {
  it("disposes geometry and material of a single mesh correctly", () => {
    const scene = new THREE.Scene();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    const geoDisposeSpy = vi.spyOn(geo, "dispose");
    const matDisposeSpy = vi.spyOn(mat, "dispose");

    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    const stats = cleanupThreeScene(scene);
    expect(geoDisposeSpy).toHaveBeenCalledOnce();
    expect(matDisposeSpy).toHaveBeenCalledOnce();
    expect(stats.geometriesDisposed).toBe(1);
    expect(stats.materialsDisposed).toBe(1);
    expect(scene.children.length).toBe(0);
  });

  it("disposes multi-materials and textures attached to materials", () => {
    const scene = new THREE.Scene();
    const geo = new THREE.CylinderGeometry(1, 1, 2);
    const texture = new THREE.Texture();
    const texDisposeSpy = vi.spyOn(texture, "dispose");

    const mat1 = new THREE.MeshStandardMaterial({ map: texture });
    const mat2 = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

    const mat1DisposeSpy = vi.spyOn(mat1, "dispose");
    const mat2DisposeSpy = vi.spyOn(mat2, "dispose");

    const mesh = new THREE.Mesh(geo, [mat1, mat2]);
    scene.add(mesh);

    const stats = cleanupThreeScene(scene);
    expect(texDisposeSpy).toHaveBeenCalledOnce();
    expect(mat1DisposeSpy).toHaveBeenCalledOnce();
    expect(mat2DisposeSpy).toHaveBeenCalledOnce();
    expect(stats.materialsDisposed).toBe(2);
    expect(stats.geometriesDisposed).toBe(1);
    expect(scene.children.length).toBe(0);
  });

  it("disposes renderer and forces WebGL context loss", () => {
    const scene = new THREE.Scene();
    const renderer = {
      dispose: vi.fn(),
      forceContextLoss: vi.fn(),
      domElement: {
        parentNode: {
          removeChild: vi.fn()
        }
      }
    } as unknown as THREE.WebGLRenderer;

    cleanupThreeScene(scene, renderer);
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(renderer.forceContextLoss).toHaveBeenCalledOnce();
    expect((renderer.domElement.parentNode as any).removeChild).toHaveBeenCalledWith(renderer.domElement);
  });
});

