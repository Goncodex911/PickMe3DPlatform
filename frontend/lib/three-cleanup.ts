import * as THREE from "three";

/**
 * Disposes a material and all its attached textures
 */
export function disposeMaterial(material: THREE.Material): void {
  const mat = material as any;
  const textureProperties = [
    "map",
    "normalMap",
    "roughnessMap",
    "metalnessMap",
    "bumpMap",
    "alphaMap",
    "emissiveMap",
    "aoMap",
    "lightMap",
    "specularMap",
    "envMap"
  ];

  for (const prop of textureProperties) {
    if (mat[prop] && typeof mat[prop].dispose === "function") {
      mat[prop].dispose();
      mat[prop] = null;
    }
  }

  if (typeof mat.dispose === "function") {
    mat.dispose();
  }
}

/**
 * Deeply disposes a Three.js scene and all child objects, geometries, materials and textures
 * to prevent WebGL memory leaks when switching projects or navigating away.
 */
export function cleanupThreeScene(
  scene: THREE.Scene,
  renderer?: THREE.WebGLRenderer | null
): { geometriesDisposed: number; materialsDisposed: number } {
  let geometriesDisposed = 0;
  let materialsDisposed = 0;

  scene.traverse((object: THREE.Object3D) => {
    // 1. Dispose Geometry
    if ((object as THREE.Mesh).geometry) {
      (object as THREE.Mesh).geometry.dispose();
      geometriesDisposed++;
    }

    // 2. Dispose Materials & Textures
    const mesh = object as THREE.Mesh;
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => {
          disposeMaterial(mat);
          materialsDisposed++;
        });
      } else {
        disposeMaterial(mesh.material);
        materialsDisposed++;
      }
    }

    // 3. Clear Skeletal or Animation if any
    const skinned = object as THREE.SkinnedMesh;
    if (skinned.skeleton && typeof skinned.skeleton.dispose === "function") {
      skinned.skeleton.dispose();
    }
  });

  // 4. Remove all children from scene
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }

  // 5. Dispose WebGL Renderer & Force Context Loss
  if (renderer) {
    renderer.dispose();
    if (typeof renderer.forceContextLoss === "function") {
      renderer.forceContextLoss();
    }
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }

  return { geometriesDisposed, materialsDisposed };
}

