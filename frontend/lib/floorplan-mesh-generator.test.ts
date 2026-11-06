import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  generateWallSegmentMeshes,
  generateRoomFloorMesh,
  generateRoomCeilingMesh,
  buildFull3DSceneFromLayout
} from "./floorplan-mesh-generator";
import { exportSceneToGLB, exportLayoutDataToGLB } from "./floorplan-glb-exporter";
import { WallSegment, OpeningSpec, LayoutData, RoomPolygon } from "./floorplan-types";
import fs from "fs";
import path from "path";

describe("STORY-THUAN-BP05: Segmented Wall Extrusion & Mesh Generation", () => {
  it("should create 1 solid box mesh for a wall without openings", () => {
    const solidWall: WallSegment = {
      id: "w_solid",
      type: "exterior",
      start: [0, 0],
      end: [6, 0],
      thickness: 0.22,
      height: 3.3,
      openings: []
    };

    const group = generateWallSegmentMeshes(solidWall, []);
    expect(group.children.length).toBe(1);
    expect(group.children[0].name).toBe("w_solid_solid");
  });

  it("should create left, right, lintel and door meshes for a wall with a door", () => {
    const wallWithDoor: WallSegment = {
      id: "w_door",
      type: "interior",
      start: [0, 0],
      end: [6, 0],
      thickness: 0.11,
      height: 3.3,
      openings: ["door_1"]
    };

    const door: OpeningSpec = {
      id: "door_1",
      type: "door",
      wall_id: "w_door",
      center: [3.0, 0],
      width: 1.0,
      height: 2.2,
      sill_height: 0.0
    };

    const group = generateWallSegmentMeshes(wallWithDoor, [door]);
    const names = group.children.map((c) => c.name);

    // Left wall segment
    expect(names).toContain("w_door_seg_0");
    // Right wall segment
    expect(names).toContain("w_door_seg_end");
    // Lintel above door
    expect(names).toContain("w_door_lintel_0");
    // Door filler group
    expect(names).toContain("filler_door_1");
  });

  it("should create left, right, lintel, sill and window meshes for a wall with a window", () => {
    const wallWithWin: WallSegment = {
      id: "w_win",
      type: "exterior",
      start: [0, 0],
      end: [8, 0],
      thickness: 0.22,
      height: 3.3,
      openings: ["win_1"]
    };

    const window: OpeningSpec = {
      id: "win_1",
      type: "window",
      wall_id: "w_win",
      center: [4.0, 0],
      width: 1.6,
      height: 1.5,
      sill_height: 0.9 // Sill 90cm
    };

    const group = generateWallSegmentMeshes(wallWithWin, [window]);
    const names = group.children.map((c) => c.name);

    // Left wall
    expect(names).toContain("w_win_seg_0");
    // Right wall
    expect(names).toContain("w_win_seg_end");
    // Lintel above window
    expect(names).toContain("w_win_lintel_0");
    // Sill below window
    expect(names).toContain("w_win_sill_0");
    // Window filler group
    expect(names).toContain("filler_win_1");
  });

  it("should generate polygonal room floor and ceiling meshes", () => {
    const room: RoomPolygon = {
      id: "room_test",
      name: "Living Room",
      category: "living",
      polygon: [
        [0, 0],
        [5, 0],
        [5, 4],
        [0, 4]
      ],
      area_m2: 20
    };

    const floor = generateRoomFloorMesh(room);
    expect(floor).toBeInstanceOf(THREE.Mesh);
    expect(floor.name).toBe("floor_room_test");
    expect(floor.position.y).toBeCloseTo(0.01, 2);

    const ceiling = generateRoomCeilingMesh(room, 3.3);
    expect(ceiling).toBeInstanceOf(THREE.Mesh);
    expect(ceiling.name).toBe("ceiling_room_test");
    expect(ceiling.position.y).toBe(3.3);
  });
});

describe("STORY-THUAN-BP06: Scene Assembly & GLB Export", () => {
  it("should assemble a full 3D architectural scene from layout data", () => {
    const villaJsonPath = path.resolve(__dirname, "../public/data/layout_data_demo_villa.json");
    const villaLayout: LayoutData = JSON.parse(fs.readFileSync(villaJsonPath, "utf-8"));

    const scene = buildFull3DSceneFromLayout(villaLayout);
    expect(scene.getObjectByName("foundation_slab")).toBeDefined();
    expect(scene.getObjectByName("walls_group")).toBeDefined();
    expect(scene.getObjectByName("floors_group")).toBeDefined();
    expect(scene.getObjectByName("ceilings_group")).toBeDefined();
    expect(scene.getObjectByName("furniture_group")).toBeDefined();
  });

  it("should export scene to a valid .GLB binary file with magic header 'glTF'", async () => {
    const villaJsonPath = path.resolve(__dirname, "../public/data/layout_data_demo_villa.json");
    const villaLayout: LayoutData = JSON.parse(fs.readFileSync(villaJsonPath, "utf-8"));

    const result = await exportLayoutDataToGLB(villaLayout, { autoDownload: false });
    expect(result.arrayBuffer.byteLength).toBeGreaterThan(1024);
    expect(result.sizeKb).toBeGreaterThan(1);
    expect(result.filename).toContain(".glb");

    // Check magic bytes "glTF"
    const buffer = Buffer.from(result.arrayBuffer);
    const magic = buffer.toString("utf-8", 0, 4);
    expect(magic).toBe("glTF");

    // Check GLB version (bytes 4-7 = 2 in Little Endian)
    const version = buffer.readUInt32LE(4);
    expect(version).toBe(2);
  });
});

