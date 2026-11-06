/**
 * 3D Scene GLB Exporter for PickMe3D (STORY-THUAN-BP06)
 * Packs 3D architectural scene (segmented walls, floors, ceilings, openings, furniture)
 * into a single, compact, industry-standard .GLB binary file.
 */

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { LayoutData } from "./floorplan-types";
import { buildFull3DSceneFromLayout } from "./floorplan-mesh-generator";

// Node.js FileReader polyfill for test/SSR environments
if (typeof globalThis !== "undefined" && typeof globalThis.FileReader === "undefined") {
  class NodeFileReader {
    result: ArrayBuffer | string | null = null;
    onload: ((e: any) => void) | null = null;
    onloadend: ((e: any) => void) | null = null;

    readAsArrayBuffer(blob: any) {
      if (blob && typeof blob.arrayBuffer === "function") {
        blob.arrayBuffer().then((buf: ArrayBuffer) => {
          this.result = buf;
          if (this.onload) this.onload({ target: this });
          if (this.onloadend) this.onloadend({ target: this });
        });
      }
    }
  }
  (globalThis as any).FileReader = NodeFileReader;
}

export interface GLBExportOptions {
  binary?: boolean; // default true
  onlyVisible?: boolean;
  includeCustomExtensions?: boolean;
  maxTextureSize?: number;
}

/**
 * Exports any THREE.Object3D / THREE.Scene to a standard .GLB binary buffer
 */
export function exportSceneToGLB(
  scene: THREE.Object3D,
  options: GLBExportOptions = {}
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          // If JSON returned instead of binary
          const stringified = JSON.stringify(result);
          const encoder = new TextEncoder();
          resolve(encoder.encode(stringified).buffer as ArrayBuffer);
        }
      },
      (error) => {
        reject(error);
      },
      {
        binary: options.binary !== false,
        onlyVisible: options.onlyVisible ?? true,
        maxTextureSize: options.maxTextureSize || 1024
      }
    );
  });
}

/**
 * Triggers a browser file download for a generated GLB ArrayBuffer
 */
export function downloadGLBBlob(arrayBuffer: ArrayBuffer, filename: string = "model.glb"): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const blob = new Blob([arrayBuffer], { type: "model/gltf-binary" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".glb") ? filename : `${filename}.glb`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1-Click Pipeline: Converts LayoutData into a complete 3D Scene and exports it to a .GLB file
 */
export async function exportLayoutDataToGLB(
  layout: LayoutData,
  options: {
    includeCeilings?: boolean;
    includeFoundation?: boolean;
    autoDownload?: boolean;
  } = {}
): Promise<{ arrayBuffer: ArrayBuffer; filename: string; sizeKb: number }> {
  // 1. Build the full 3D architectural scene
  const scene = buildFull3DSceneFromLayout(layout, undefined, {
    includeCeilings: options.includeCeilings !== false,
    includeFoundation: options.includeFoundation !== false
  });

  // 2. Export to GLB binary
  const arrayBuffer = await exportSceneToGLB(scene, { binary: true });
  const sizeKb = Number((arrayBuffer.byteLength / 1024).toFixed(1));

  // 3. Format safe filename
  const rawName = layout.metadata.project_name || "pickme3d_architecture";
  const safeName = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const filename = `${safeName}.glb`;

  // 4. Trigger download if in browser and enabled
  if (options.autoDownload && typeof window !== "undefined") {
    downloadGLBBlob(arrayBuffer, filename);
  }

  return { arrayBuffer, filename, sizeKb };
}

