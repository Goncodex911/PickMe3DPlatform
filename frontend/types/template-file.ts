// types/template-file.ts — PickMe3D Import/Export Template File Schema

/**
 * The canonical JSON format used when importing or exporting a PickMe3D project
 * file (.json or .pickme3d). This is separate from the internal `Doc` type used
 * by the canvas editor — parsing converts between the two.
 *
 * Validation is done with a hand-rolled validator (no external runtime deps)
 * so the bundle stays small. Each field has a safe fallback for backwards
 * compatibility with older / partial files.
 */

export interface TemplateFileLayer {
  id: string;
  name: string;
  type: "mesh" | "text" | "image" | "group";
  visible: boolean;
  locked: boolean;
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  materialProps?: Record<string, unknown>;
  assetUrl?: string;
  children?: TemplateFileLayer[];
}

export interface TemplateFileCameraSettings {
  position: [number, number, number];
  target?: [number, number, number];
  fov?: number;
}

export interface TemplateFileSceneSettings {
  backgroundColor: string;
  lightingPreset: "studio" | "outdoor" | "indoor" | "dramatic" | "soft" | string;
  ambientIntensity?: number;
  environmentUrl?: string;
}

export interface TemplateFileDevicePreset {
  id?: string;
  name?: string;
  width: number;
  height: number;
}

export interface TemplateFileMetadata {
  title: string;
  description?: string;
  author?: string;
  createdAt?: string;
  tags?: string[];
}

/** Root structure of a .json / .pickme3d import file */
export interface TemplateFile {
  /** Semver-style: "1.0", "1.1", … */
  version: string;
  metadata: TemplateFileMetadata;
  devicePreset?: TemplateFileDevicePreset;
  /** ID of a DeviceConfig from constants/devices.ts (preferred over raw devicePreset) */
  devicePresetId?: string;
  camera: TemplateFileCameraSettings;
  sceneSettings: TemplateFileSceneSettings;
  layers: TemplateFileLayer[];
  /** Raw editor document data (when exported directly from m3e canvas) */
  docData?: unknown;
}

// ─── Defaults used when optional fields are absent ────────────────────────────

export const DEFAULT_CAMERA: TemplateFileCameraSettings = {
  position: [0, 1, 5],
  target: [0, 0, 0],
  fov: 45,
};

export const DEFAULT_SCENE: TemplateFileSceneSettings = {
  backgroundColor: "#ffffff",
  lightingPreset: "studio",
};

// ─── Runtime validation (no Zod — avoids adding a new dependency) ─────────────

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNumberTriple(v: unknown): v is [number, number, number] {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number");
}

function validateLayer(raw: unknown, path: string): string[] {
  if (!isObject(raw)) return [`${path}: expected object`];
  const errs: string[] = [];
  if (typeof raw.id !== "string" || !raw.id) errs.push(`${path}.id: required string`);
  if (typeof raw.name !== "string") errs.push(`${path}.name: required string`);
  const validTypes = ["mesh", "text", "image", "group"];
  if (!validTypes.includes(raw.type as string)) errs.push(`${path}.type: must be one of ${validTypes.join(", ")}`);
  if (!isObject(raw.transform)) {
    errs.push(`${path}.transform: required object`);
  } else {
    const t = raw.transform;
    if (!isNumberTriple(t.position)) errs.push(`${path}.transform.position: must be [number,number,number]`);
    if (!isNumberTriple(t.rotation)) errs.push(`${path}.transform.rotation: must be [number,number,number]`);
    if (!isNumberTriple(t.scale)) errs.push(`${path}.transform.scale: must be [number,number,number]`);
  }
  return errs;
}

/** Validate raw JSON and return a typed TemplateFile or a list of errors. */
export function parseTemplateFile(raw: unknown): ParseResult<TemplateFile> {
  if (!isObject(raw)) {
    return { ok: false, errors: ["Root value must be a JSON object"] };
  }

  const errs: string[] = [];

  if (typeof raw.version !== "string") errs.push("version: required string");

  // metadata
  if (!isObject(raw.metadata)) {
    errs.push("metadata: required object");
  } else {
    if (typeof raw.metadata.title !== "string" || !raw.metadata.title)
      errs.push("metadata.title: required non-empty string");
  }

  // camera — required; fall back gracefully
  let camera: TemplateFileCameraSettings = DEFAULT_CAMERA;
  if (isObject(raw.camera)) {
    if (!isNumberTriple(raw.camera.position))
      errs.push("camera.position: must be [number,number,number]");
    else
      camera = {
        position: raw.camera.position as [number, number, number],
        target: isNumberTriple(raw.camera.target)
          ? (raw.camera.target as [number, number, number])
          : DEFAULT_CAMERA.target,
        fov: typeof raw.camera.fov === "number" ? raw.camera.fov : DEFAULT_CAMERA.fov,
      };
  } else {
    errs.push("camera: required object");
  }

  // sceneSettings — required
  let scene: TemplateFileSceneSettings = DEFAULT_SCENE;
  if (isObject(raw.sceneSettings)) {
    scene = {
      backgroundColor:
        typeof raw.sceneSettings.backgroundColor === "string"
          ? raw.sceneSettings.backgroundColor
          : "#ffffff",
      lightingPreset:
        typeof raw.sceneSettings.lightingPreset === "string"
          ? raw.sceneSettings.lightingPreset
          : "studio",
      ambientIntensity:
        typeof raw.sceneSettings.ambientIntensity === "number"
          ? raw.sceneSettings.ambientIntensity
          : undefined,
    };
  } else {
    errs.push("sceneSettings: required object");
  }

  // layers — required array
  if (!Array.isArray(raw.layers)) {
    errs.push("layers: required array");
  } else {
    raw.layers.forEach((layer, i) => {
      errs.push(...validateLayer(layer, `layers[${i}]`));
    });
  }

  if (errs.length > 0) return { ok: false, errors: errs };

  // Build the fully-typed output with safe fallbacks
  const meta = raw.metadata as Record<string, unknown>;
  const devicePreset = isObject(raw.devicePreset)
    ? {
        id: typeof raw.devicePreset.id === "string" ? raw.devicePreset.id : undefined,
        name: typeof raw.devicePreset.name === "string" ? raw.devicePreset.name : undefined,
        width: typeof raw.devicePreset.width === "number" ? raw.devicePreset.width : 393,
        height: typeof raw.devicePreset.height === "number" ? raw.devicePreset.height : 852,
      }
    : undefined;

  return {
    ok: true,
    data: {
      version: raw.version as string,
      metadata: {
        title: meta.title as string,
        description: typeof meta.description === "string" ? meta.description : undefined,
        author: typeof meta.author === "string" ? meta.author : undefined,
        createdAt: typeof meta.createdAt === "string" ? meta.createdAt : undefined,
        tags: Array.isArray(meta.tags)
          ? (meta.tags as unknown[]).filter((t) => typeof t === "string") as string[]
          : undefined,
      },
      devicePreset,
      devicePresetId:
        typeof raw.devicePresetId === "string" ? raw.devicePresetId : undefined,
      camera,
      sceneSettings: scene,
      layers: (raw.layers as unknown[]).map((l) => {
        const layer = l as Record<string, unknown>;
        const transform = (layer.transform ?? {}) as Record<string, unknown>;
        return {
          id: layer.id as string,
          name: (layer.name as string) ?? "Untitled Layer",
          type: layer.type as TemplateFileLayer["type"],
          visible: layer.visible !== false,
          locked: layer.locked === true,
          transform: {
            position: isNumberTriple(transform.position) ? transform.position : [0, 0, 0],
            rotation: isNumberTriple(transform.rotation) ? transform.rotation : [0, 0, 0],
            scale: isNumberTriple(transform.scale) ? transform.scale : [1, 1, 1],
          },
          materialProps: isObject(layer.materialProps)
            ? (layer.materialProps as Record<string, unknown>)
            : undefined,
          assetUrl: typeof layer.assetUrl === "string" ? layer.assetUrl : undefined,
        };
      }),
      docData: raw.docData,
    },
  };
}
