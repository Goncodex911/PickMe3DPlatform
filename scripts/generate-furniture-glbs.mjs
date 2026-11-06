/**
 * Generator script to create 8 standard, lightweight, PBR-textured GLB models for PickMe3D
 * All models have Pivot Point at (0, 0, 0) at the bottom center.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 1. Polyfill FileReader for Node.js environment
class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
}
globalThis.FileReader = NodeFileReader;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Dynamic imports of Three.js from frontend node_modules
const threeModulePath = path.resolve(rootDir, "frontend/node_modules/three/build/three.module.js");
const exporterPath = path.resolve(rootDir, "frontend/node_modules/three/examples/jsm/exporters/GLTFExporter.js");

const THREE = await import(`file://${threeModulePath}`);
const { GLTFExporter } = await import(`file://${exporterPath}`);

const outputDir = path.resolve(rootDir, "frontend/public/models/furniture");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper to export a THREE.Object3D to a .glb file
function exportToGLB(object, fileName) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      object,
      (glbArrayBuffer) => {
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(glbArrayBuffer));
        const stats = fs.statSync(filePath);
        console.log(`✓ Exported ${fileName} (${(stats.size / 1024).toFixed(1)} KB)`);
        resolve({ fileName, sizeKb: stats.size / 1024 });
      },
      reject,
      { binary: true }
    );
  });
}

// -------------------------------------------------------------
// 1. BED QUEEN MODERN (1.8m W x 2.0m L x 0.9m H)
// -------------------------------------------------------------
function createBedQueenModern() {
  const group = new THREE.Group();
  group.name = "bed_queen_modern";

  // Materials
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7, metalness: 0.1 });
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.9, metalness: 0.0 });
  const headboardMat = new THREE.MeshStandardMaterial({ color: 0x3d312a, roughness: 0.8, metalness: 0.1 });
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 });
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x2b4c6f, roughness: 0.85, metalness: 0.05 });

  // Bed Base / Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 2.0), woodMat);
  frame.position.set(0, 0.125, 0);
  group.add(frame);

  // Mattress
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 1.9), mattressMat);
  mattress.position.set(0, 0.375, 0.02);
  group.add(mattress);

  // Headboard
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.1), headboardMat);
  headboard.position.set(0, 0.45, -0.95);
  group.add(headboard);

  // Pillows (2)
  for (const x of [-0.45, 0.45]) {
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.35), pillowMat);
    pillow.position.set(x, 0.54, -0.65);
    group.add(pillow);
  }

  // Blanket Runner
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.04, 0.75), blanketMat);
  blanket.position.set(0, 0.51, 0.55);
  group.add(blanket);

  return group;
}

// -------------------------------------------------------------
// 2. SOFA MODERN 3-SEAT (2.2m W x 0.9m D x 0.8m H)
// -------------------------------------------------------------
function createSofaModern3Seat() {
  const group = new THREE.Group();
  group.name = "sofa_modern_3seat";

  const fabricMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.85, metalness: 0.05 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0x5a677d, roughness: 0.8, metalness: 0.05 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.3, metalness: 0.8 });

  // 4 Legs
  const legPositions = [
    [-1.0, 0.075, -0.38],
    [1.0, 0.075, -0.38],
    [-1.0, 0.075, 0.38],
    [1.0, 0.075, 0.38],
  ];
  for (const pos of legPositions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.15, 8), legMat);
    leg.position.set(...pos);
    group.add(leg);
  }

  // Base platform
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.9), fabricMat);
  base.position.set(0, 0.21, 0);
  group.add(base);

  // 3 Seat Cushions
  for (let i = 0; i < 3; i++) {
    const x = -0.65 + i * 0.65;
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.7), cushionMat);
    cushion.position.set(x, 0.34, 0.05);
    group.add(cushion);
  }

  // Backrest
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.52, 0.18), fabricMat);
  backrest.position.set(0, 0.54, -0.36);
  group.add(backrest);

  // 2 Armrests
  for (const x of [-1.02, 1.02]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.9), fabricMat);
    arm.position.set(x, 0.44, 0);
    group.add(arm);
  }

  return group;
}

// -------------------------------------------------------------
// 3. DINING TABLE & 6 CHAIRS (1.6m W x 0.9m D x 0.75m H)
// -------------------------------------------------------------
function createDiningTable6Chairs() {
  const group = new THREE.Group();
  group.name = "dining_table_6chairs";

  const tableTopMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.6, metalness: 0.1 });
  const tableLegMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.7 });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.2 });

  // Tabletop
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.9), tableTopMat);
  top.position.set(0, 0.725, 0);
  group.add(top);

  // Table Legs (4)
  const legPositions = [
    [-0.72, 0.35, -0.37],
    [0.72, 0.35, -0.37],
    [-0.72, 0.35, 0.37],
    [0.72, 0.35, 0.37],
  ];
  for (const pos of legPositions) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), tableLegMat);
    leg.position.set(...pos);
    group.add(leg);
  }

  // 6 Chairs (3 north, 3 south)
  const chairX = [-0.5, 0.0, 0.5];
  for (const z of [-0.62, 0.62]) {
    for (const x of chairX) {
      const chairGroup = new THREE.Group();
      chairGroup.position.set(x, 0, z);

      // Chair Seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.4), chairMat);
      seat.position.set(0, 0.44, 0);
      chairGroup.add(seat);

      // Chair Backrest
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.03), chairMat);
      back.position.set(0, 0.65, z > 0 ? 0.18 : -0.18);
      chairGroup.add(back);

      // 4 Chair Legs
      for (const cx of [-0.17, 0.17]) {
        for (const cz of [-0.17, 0.17]) {
          const cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.42, 6), tableLegMat);
          cLeg.position.set(cx, 0.21, cz);
          chairGroup.add(cLeg);
        }
      }
      group.add(chairGroup);
    }
  }

  return group;
}

// -------------------------------------------------------------
// 4. TOILET WALL-HUNG (0.4m W x 0.6m D x 0.5m H)
// -------------------------------------------------------------
function createToiletWallHung() {
  const group = new THREE.Group();
  group.name = "toilet_wall_hung";

  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.05 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.95 });

  // Concealed Cistern Wall Plate (Backing)
  const wallPlate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.9, 0.06), ceramicMat);
  wallPlate.position.set(0, 0.45, -0.27);
  group.add(wallPlate);

  // Dual Flush Buttons
  const flushBtn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.02), chromeMat);
  flushBtn.position.set(0, 0.72, -0.23);
  group.add(flushBtn);

  // Toilet Bowl Body (rounded box)
  const bowl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.5), ceramicMat);
  bowl.position.set(0, 0.26, 0.0);
  group.add(bowl);

  // Toilet Seat & Lid
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.04, 0.48), ceramicMat);
  seat.position.set(0, 0.44, 0.0);
  group.add(seat);

  return group;
}

// -------------------------------------------------------------
// 5. SINK CABINET BATH (0.8m W x 0.5m D x 1.8m H)
// -------------------------------------------------------------
function createSinkCabinetBath() {
  const group = new THREE.Group();
  group.name = "sink_cabinet_bath";

  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7, metalness: 0.1 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.1 });
  const basinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.0 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.1, metalness: 0.95 });
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.05, metalness: 0.9 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 });

  // Cabinet Base
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.48), cabinetMat);
  cabinet.position.set(0, 0.375, 0);
  group.add(cabinet);

  // Countertop Slab
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.04, 0.5), counterMat);
  top.position.set(0, 0.77, 0);
  group.add(top);

  // Vessel Basin Sink
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.12, 16), basinMat);
  basin.position.set(0, 0.85, 0.04);
  group.add(basin);

  // Gooseneck Faucet
  const faucet = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.1), chromeMat);
  faucet.position.set(0, 0.94, -0.12);
  group.add(faucet);

  // Mirror Frame & Glass
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.82, 0.03), frameMat);
  mirrorFrame.position.set(0, 1.45, -0.22);
  group.add(mirrorFrame);

  const mirrorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.78, 0.01), mirrorMat);
  mirrorGlass.position.set(0, 1.45, -0.20);
  group.add(mirrorGlass);

  return group;
}

// -------------------------------------------------------------
// 6. KITCHEN COUNTER ISLAND (2.4m W x 0.8m D x 0.88m H)
// -------------------------------------------------------------
function createKitchenCounterIsland() {
  const group = new THREE.Group();
  group.name = "kitchen_counter_island";

  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.6, metalness: 0.2 });
  const marbleTopMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.25, metalness: 0.1 });
  const inductionMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.8 });
  const sinkMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 });
  const faucetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.95 });

  // Base Cabinet
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.82, 0.76), cabinetMat);
  base.position.set(0, 0.41, 0);
  group.add(base);

  // Marble Countertop
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.8), marbleTopMat);
  top.position.set(0, 0.85, 0);
  group.add(top);

  // Induction Cooktop (Left side)
  const cooktop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.01, 0.5), inductionMat);
  cooktop.position.set(-0.6, 0.885, 0);
  group.add(cooktop);

  // Undermount Sink (Right side)
  const sink = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.01, 0.45), sinkMat);
  sink.position.set(0.6, 0.885, 0);
  group.add(sink);

  // Faucet
  const faucet = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.14), faucetMat);
  faucet.position.set(0.6, 1.03, -0.22);
  group.add(faucet);

  return group;
}

// -------------------------------------------------------------
// 7. DOOR SINGLE WOOD (0.9m W x 2.2m H x 0.15m D)
// -------------------------------------------------------------
function createDoorSingleWood() {
  const group = new THREE.Group();
  group.name = "door_single_wood";

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.6, metalness: 0.1 });
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x7c5335, roughness: 0.7, metalness: 0.05 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.95 });

  // Top Frame
  const topFrame = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.12), frameMat);
  topFrame.position.set(0, 2.17, 0);
  group.add(topFrame);

  // Left & Right Jambs
  for (const x of [-0.45, 0.45]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.14, 0.12), frameMat);
    jamb.position.set(x, 1.07, 0);
    group.add(jamb);
  }

  // Door Slab (Slightly open ~10 deg)
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.82, 2.12, 0.04), slabMat);
  slab.position.set(-0.01, 1.07, 0.04);
  slab.rotation.y = THREE.MathUtils.degToRad(12);
  group.add(slab);

  // Door Lever Handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.06), handleMat);
  handle.position.set(0.32, 1.0, 0.09);
  group.add(handle);

  return group;
}

// -------------------------------------------------------------
// 8. WINDOW SLIDING 2-PANE (1.6m W x 1.5m H x 0.1m D)
// -------------------------------------------------------------
function createWindowSliding2Pane() {
  const group = new THREE.Group();
  group.name = "window_sliding_2pane";

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.4
  });

  // Outer Aluminum Frame: Top, Bottom, Left, Right
  const outerTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.08), frameMat);
  outerTop.position.set(0, 1.475, 0);
  group.add(outerTop);

  const outerBottom = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.08), frameMat);
  outerBottom.position.set(0, 0.025, 0);
  group.add(outerBottom);

  for (const x of [-0.775, 0.775]) {
    const outerSide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 0.08), frameMat);
    outerSide.position.set(x, 0.75, 0);
    group.add(outerSide);
  }

  // Left Sliding Pane (Sash + Glass)
  const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.38, 0.015), glassMat);
  leftGlass.position.set(-0.38, 0.75, -0.015);
  group.add(leftGlass);

  const leftSash = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.4, 0.03), frameMat);
  leftSash.position.set(-0.38, 0.75, -0.015);
  leftSash.visible = false; // Internal wireframe reference

  // Right Sliding Pane (Sash + Glass)
  const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.38, 0.015), glassMat);
  rightGlass.position.set(0.38, 0.75, 0.015);
  group.add(rightGlass);

  // Center overlap mullion
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.05), frameMat);
  mullion.position.set(0, 0.75, 0);
  group.add(mullion);

  return group;
}

// -------------------------------------------------------------
// MAIN EXECUTION
// -------------------------------------------------------------
async function run() {
  console.log("🚀 Generating 8 standardized furniture & opening GLB models...");

  const models = [
    { generator: createBedQueenModern, fileName: "bed_queen_modern.glb" },
    { generator: createSofaModern3Seat, fileName: "sofa_modern_3seat.glb" },
    { generator: createDiningTable6Chairs, fileName: "dining_table_6chairs.glb" },
    { generator: createToiletWallHung, fileName: "toilet_wall_hung.glb" },
    { generator: createSinkCabinetBath, fileName: "sink_cabinet_bath.glb" },
    { generator: createKitchenCounterIsland, fileName: "kitchen_counter_island.glb" },
    { generator: createDoorSingleWood, fileName: "door_single_wood.glb" },
    { generator: createWindowSliding2Pane, fileName: "window_sliding_2pane.glb" }
  ];

  for (const item of models) {
    const object = item.generator();
    await exportToGLB(object, item.fileName);
  }

  console.log("🎉 All 8 models generated successfully!");
}

run().catch((err) => {
  console.error("❌ Generator failed:", err);
  process.exit(1);
});

