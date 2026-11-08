/**
 * Script to generate 12 High-Fidelity ArchViz 3D Assets for PickMe3D (STORY-THUAN-BP14)
 * Generates compact, standard .GLB files matching reference image 1.
 */

const fs = require("fs");
const path = require("path");

class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
}
global.FileReader = NodeFileReader;

const THREE = require("../node_modules/three");
const { GLTFExporter } = require("../node_modules/three/examples/jsm/exporters/GLTFExporter.js");

const OUT_DIR = path.join(__dirname, "../public/models/archviz");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function saveSceneToGLB(scene, filename) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (glb) => {
        const outPath = path.join(OUT_DIR, filename);
        fs.writeFileSync(outPath, Buffer.from(glb));
        const sizeKb = (glb.byteLength / 1024).toFixed(1);
        console.log(`✓ Exported ${filename} (${sizeKb} KB)`);
        resolve(outPath);
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

// Common Materials
const oakMat = new THREE.MeshStandardMaterial({ color: 0xbda07d, roughness: 0.5 });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d3024, roughness: 0.6 });
const fabricLinenGrey = new THREE.MeshStandardMaterial({ color: 0x484b50, roughness: 0.95 }); // dark wrinkled linen like Image 1
const sheetWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.9 });
const pillowGreenMat = new THREE.MeshStandardMaterial({ color: 0x3e4f3a, roughness: 0.85 }); // sage/forest green accent pillows
const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.15, metalness: 0.05 });
const blackGraniteMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.25, metalness: 0.1 });
const metalDarkMat = new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.4, metalness: 0.8 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.1, metalness: 0.95 });
const ceramicWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.2 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.35 });
const carpetWovenMat = new THREE.MeshStandardMaterial({ color: 0x5a5650, roughness: 0.95 }); // dark woven concentric carpet

// 1. Double Bed with Wrinkled Linen, Folded Duvet & Pillows (archviz_bed_double_linen.glb)
async function createBedDoubleLinen() {
  const root = new THREE.Group();
  const W = 1.9, L = 2.15, H = 0.85;

  // Wood Frame & Headboard
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W, 0.28, L), oakMat);
  frame.position.set(0, 0.14, 0);
  root.add(frame);

  const headboard = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.85, 0.12), darkWoodMat);
  headboard.position.set(0, 0.425, -L / 2 - 0.06);
  root.add(headboard);

  // Mattress
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.32, L - 0.15), sheetWhiteMat);
  mattress.position.set(0, 0.38, 0.05);
  root.add(mattress);

  // Folded Wrinkled Duvet (Dark grey/charcoal linen as in Image 1)
  const duvet = new THREE.Mesh(new THREE.BoxGeometry(W - 0.08, 0.16, L * 0.65), fabricLinenGrey);
  duvet.position.set(0, 0.52, 0.3);
  root.add(duvet);

  // Duvet fold rim
  const duvetFold = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.08, 0.28), fabricLinenGrey);
  duvetFold.position.set(0, 0.56, -0.05);
  root.add(duvetFold);

  // Layered Pillows
  [-0.45, 0.45].forEach((px) => {
    // Back white pillow
    const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 0.4), sheetWhiteMat);
    pillow1.position.set(px, 0.58, -L / 2 + 0.3);
    pillow1.rotation.x = 0.25;
    root.add(pillow1);

    // Front sage green accent pillow
    const pillow2 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.32), pillowGreenMat);
    pillow2.position.set(px, 0.62, -L / 2 + 0.52);
    pillow2.rotation.x = 0.35;
    root.add(pillow2);
  });

  // Nightstand with Lamp
  const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), darkWoodMat);
  nightstand.position.set(W / 2 + 0.3, 0.225, -L / 2 + 0.35);
  root.add(nightstand);

  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.04, 16), metalDarkMat);
  lampBase.position.set(W / 2 + 0.3, 0.47, -L / 2 + 0.35);
  root.add(lampBase);

  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 16), sheetWhiteMat);
  lampShade.position.set(W / 2 + 0.3, 0.6, -L / 2 + 0.35);
  root.add(lampShade);

  await saveSceneToGLB(root, "archviz_bed_double_linen.glb");
}

// 2. Vertical Wood Slats Room Divider (archviz_wood_slats_divider.glb)
async function createWoodSlatsDivider() {
  const root = new THREE.Group();
  const numSlats = 16;
  const slatW = 0.04, slatD = 0.09, slatH = 2.4;
  const spacing = 0.13;

  // Top and bottom rail
  const totalW = numSlats * spacing;
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(totalW, 0.05, slatD + 0.02), darkWoodMat);
  topRail.position.set(0, slatH - 0.025, 0);
  root.add(topRail);

  const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(totalW, 0.05, slatD + 0.02), darkWoodMat);
  bottomRail.position.set(0, 0.025, 0);
  root.add(bottomRail);

  for (let i = 0; i < numSlats; i++) {
    const x = -totalW / 2 + i * spacing + spacing / 2;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(slatW, slatH - 0.1, slatD), oakMat);
    slat.position.set(x, slatH / 2, 0);
    // Slight angled rotation matching Image 1 louvers
    slat.rotation.y = 0.35;
    root.add(slat);
  }

  await saveSceneToGLB(root, "archviz_wood_slats_divider.glb");
}

// 3. L-Shaped Fabric Sectional Sofa (archviz_sofa_l_shape.glb)
async function createSofaLShape() {
  const root = new THREE.Group();
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0xdedcd7, roughness: 0.95 }); // soft beige/grey fabric

  // Base platform
  const baseW = 2.6, baseD = 1.8, seatH = 0.42;

  // Main 3-seat section
  const mainSeat = new THREE.Mesh(new THREE.BoxGeometry(baseW, seatH, 0.9), sofaMat);
  mainSeat.position.set(0, seatH / 2, -0.45);
  root.add(mainSeat);

  // Backrest main
  const backMain = new THREE.Mesh(new THREE.BoxGeometry(baseW, 0.38, 0.22), sofaMat);
  backMain.position.set(0, seatH + 0.19, -0.8);
  root.add(backMain);

  // Chaise section (extending forward on right)
  const chaise = new THREE.Mesh(new THREE.BoxGeometry(0.95, seatH, baseD - 0.9), sofaMat);
  chaise.position.set(baseW / 2 - 0.95 / 2, seatH / 2, 0.45);
  root.add(chaise);

  // Armrests
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.9), sofaMat);
  armL.position.set(-baseW / 2 + 0.1, seatH + 0.14, -0.45);
  root.add(armL);

  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, baseD), sofaMat);
  armR.position.set(baseW / 2 - 0.1, seatH + 0.14, 0);
  root.add(armR);

  // Throw Pillows
  [-0.6, 0.2, 0.9].forEach((px, i) => {
    const pMat = i % 2 === 0 ? pillowGreenMat : sheetWhiteMat;
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.14), pMat);
    pillow.position.set(px, seatH + 0.22, -0.65);
    pillow.rotation.y = (i - 1) * 0.2;
    root.add(pillow);
  });

  await saveSceneToGLB(root, "archviz_sofa_l_shape.glb");
}

// 4. Round Marble Coffee Table (archviz_coffee_table_round_marble.glb)
async function createCoffeeTableRoundMarble() {
  const root = new THREE.Group();
  const R = 0.48, H = 0.38;

  // Marble Top
  const top = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.035, 32), marbleMat);
  top.position.set(0, H - 0.0175, 0);
  root.add(top);

  // Center Decorative Tray
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 24), darkWoodMat);
  tray.position.set(0, H + 0.01, 0);
  root.add(tray);

  // Small flower pot / bowl on table
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.08, 16), ceramicWhiteMat);
  bowl.position.set(0, H + 0.05, 0);
  root.add(bowl);

  // Black Metal Legs (Tripod)
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, H - 0.035, 8), metalDarkMat);
    leg.position.set(Math.cos(angle) * (R * 0.7), (H - 0.035) / 2, Math.sin(angle) * (R * 0.7));
    root.add(leg);
  }

  await saveSceneToGLB(root, "archviz_coffee_table_round_marble.glb");
}

// 5. 90° Corner Glass Shower Cabin with Chrome Column (archviz_shower_cabin_glass.glb)
async function createShowerCabinGlass() {
  const root = new THREE.Group();
  const size = 1.05, H = 2.0;

  // 2 Glass Walls at 90 degrees
  const glass1 = new THREE.Mesh(new THREE.BoxGeometry(size, H, 0.012), glassMat);
  glass1.position.set(0, H / 2, size / 2);
  root.add(glass1);

  const glass2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, H, size), glassMat);
  glass2.position.set(size / 2, H / 2, 0);
  root.add(glass2);

  // Chrome Profiles & Corner Hinges
  const profileH = new THREE.Mesh(new THREE.BoxGeometry(0.03, H, 0.03), chromeMat);
  profileH.position.set(size / 2, H / 2, size / 2);
  root.add(profileH);

  // Chrome Shower Column (Rain shower head + mixer tap)
  const showerPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 8), chromeMat);
  showerPipe.position.set(-0.25, 1.2, -0.25);
  root.add(showerPipe);

  const rainHead = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 20), chromeMat);
  rainHead.position.set(-0.15, 1.95, -0.25);
  root.add(rainHead);

  const showerTray = new THREE.Mesh(new THREE.BoxGeometry(size + 0.05, 0.05, size + 0.05), ceramicWhiteMat);
  showerTray.position.set(size / 2 - 0.25, 0.025, size / 2 - 0.25);
  root.add(showerTray);

  await saveSceneToGLB(root, "archviz_shower_cabin_glass.glb");
}

// 6. Double Vanity with Black Granite Counter & LED Mirror (archviz_vanity_double_mirror.glb)
async function createVanityDoubleMirror() {
  const root = new THREE.Group();
  const W = 1.4, D = 0.55, H = 0.85;

  // Oak Floating Cabinet
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(W, 0.5, D), oakMat);
  cabinet.position.set(0, 0.55, 0);
  root.add(cabinet);

  // Black Granite Countertop
  const counter = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.04, D + 0.02), blackGraniteMat);
  counter.position.set(0, 0.82, 0);
  root.add(counter);

  // Two Round Ceramic Sinks
  [-0.35, 0.35].forEach((sx) => {
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.12, 24), ceramicWhiteMat);
    basin.position.set(sx, 0.89, 0);
    root.add(basin);

    const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 12), chromeMat);
    faucet.position.set(sx, 0.96, -0.16);
    root.add(faucet);
  });

  // LED Backlit Mirror
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.85, 0.03), metalDarkMat);
  mirrorFrame.position.set(0, 1.5, -D / 2 + 0.01);
  root.add(mirrorFrame);

  const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.85, 0.8), glassMat);
  mirrorGlass.position.set(0, 1.5, -D / 2 + 0.03);
  root.add(mirrorGlass);

  await saveSceneToGLB(root, "archviz_vanity_double_mirror.glb");
}

// 7. Wall-Hung Modern Toilet (archviz_toilet_wall_hung.glb)
async function createToiletWallHung() {
  const root = new THREE.Group();

  // Wall flush actuator plate
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.015), chromeMat);
  plate.position.set(0, 0.95, -0.28);
  root.add(plate);

  // Ceramic Toilet Bowl
  const bowl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.54), ceramicWhiteMat);
  bowl.position.set(0, 0.42, 0);
  root.add(bowl);

  // Soft-close Seat Cover
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.5), sheetWhiteMat);
  seat.position.set(0, 0.62, 0);
  root.add(seat);

  await saveSceneToGLB(root, "archviz_toilet_wall_hung.glb");
}

// 8. Kitchen Module Combo: Sink + Induction Cooktop + Fridge (archviz_kitchen_module_combo.glb)
async function createKitchenModuleCombo() {
  const root = new THREE.Group();
  const W = 2.6, D = 0.65, H = 0.88;

  // Lower Base Cabinets
  const baseCab = new THREE.Mesh(new THREE.BoxGeometry(1.8, H - 0.04, D), sheetWhiteMat);
  baseCab.position.set(-0.4, (H - 0.04) / 2, 0);
  root.add(baseCab);

  // Marble / Granite Worktop
  const worktop = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.04, D + 0.02), marbleMat);
  worktop.position.set(-0.4, H - 0.02, 0);
  root.add(worktop);

  // Stainless Steel Undermount Sink & Mixer
  const sink = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.4), chromeMat);
  sink.position.set(-0.85, H, 0);
  root.add(sink);

  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 12), chromeMat);
  faucet.position.set(-0.85, H + 0.16, -0.16);
  root.add(faucet);

  // Black Glass Induction Cooktop
  const cooktop = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.01, 0.45), blackGraniteMat);
  cooktop.position.set(0.05, H + 0.005, 0);
  root.add(cooktop);

  // Burner Rings
  [-0.15, 0.15].forEach((bx) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.08, 20), sheetWhiteMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0.05 + bx, H + 0.012, 0);
    root.add(ring);
  });

  // Tall Refrigerator (Side-by-side Stainless Steel)
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 0.7), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.3, metalness: 0.7 }));
  fridge.position.set(0.9, 0.95, 0.02);
  root.add(fridge);

  await saveSceneToGLB(root, "archviz_kitchen_module_combo.glb");
}

// 9. Work Desk with Ergonomic Swivel Chair & Laptop (archviz_desk_office_chair.glb)
async function createDeskOfficeChair() {
  const root = new THREE.Group();
  const W = 1.4, D = 0.65, H = 0.75;

  // Oak Desk Top
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, 0.04, D), oakMat);
  top.position.set(0, H - 0.02, 0);
  root.add(top);

  // Dark Metal Legs
  [-W / 2 + 0.08, W / 2 - 0.08].forEach((lx) => {
    const legFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, H - 0.04, D - 0.08), metalDarkMat);
    legFrame.position.set(lx, (H - 0.04) / 2, 0);
    root.add(legFrame);
  });

  // Laptop on Desk
  const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.01, 0.22), metalDarkMat);
  laptopBase.position.set(0, H + 0.005, 0.05);
  root.add(laptopBase);

  const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.008), metalDarkMat);
  laptopScreen.position.set(0, H + 0.1, -0.06);
  laptopScreen.rotation.x = 0.15;
  root.add(laptopScreen);

  // Ergonomic Swivel Chair
  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.46), fabricLinenGrey);
  chairSeat.position.set(0, 0.46, 0.55);
  root.add(chairSeat);

  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.06), fabricLinenGrey);
  chairBack.position.set(0, 0.74, 0.75);
  root.add(chairBack);

  const chairStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 12), chromeMat);
  chairStem.position.set(0, 0.22, 0.55);
  root.add(chairStem);

  await saveSceneToGLB(root, "archviz_desk_office_chair.glb");
}

// 10. Open Walk-in Wardrobe (archviz_wardrobe_open_walkin.glb)
async function createWardrobeOpenWalkin() {
  const root = new THREE.Group();
  const W = 1.6, D = 0.55, H = 2.2;

  // Outer frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), darkWoodMat);
  frame.position.set(0, H / 2, 0);
  root.add(frame);

  // Hollow inner cutout
  const hollow = new THREE.Mesh(new THREE.BoxGeometry(W - 0.08, H - 0.12, D), sheetWhiteMat);
  hollow.position.set(0, H / 2, 0.02);
  root.add(hollow);

  // Hanging Rail with Shirt Hangers
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, W - 0.12, 8), chromeMat);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, H * 0.78, 0);
  root.add(rail);

  // 4 Shirts hanging
  for (let s = 0; s < 5; s++) {
    const sx = -0.5 + s * 0.25;
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.38), fabricLinenGrey);
    shirt.position.set(sx, H * 0.78 - 0.36, 0);
    root.add(shirt);
  }

  // Lower Shelves
  [0.35, 0.65].forEach((sy) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.03, D - 0.05), oakMat);
    shelf.position.set(0, sy, 0);
    root.add(shelf);
  });

  await saveSceneToGLB(root, "archviz_wardrobe_open_walkin.glb");
}

// 11. Balcony Flower Planter Box with Plants (archviz_balcony_planter_box.glb)
async function createBalconyPlanterBox() {
  const root = new THREE.Group();
  const W = 1.2, D = 0.35, H = 0.45;

  // Dark Slate Planter Trough
  const planter = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), metalDarkMat);
  planter.position.set(0, H / 2, 0);
  root.add(planter);

  // Soil
  const soil = new THREE.Mesh(new THREE.BoxGeometry(W - 0.06, 0.04, D - 0.06), darkWoodMat);
  soil.position.set(0, H - 0.02, 0);
  root.add(soil);

  // Colorful Flowers (Pink, Orange, Violet Petals as in Image 1 balcony)
  const flowerColors = [0xff4081, 0xff9800, 0x9c27b0, 0x4caf50];
  for (let f = 0; f < 8; f++) {
    const fx = -W / 2 + 0.15 + f * 0.13;
    const fz = (f % 2 === 0 ? 0.05 : -0.05);

    // Green Foliage Bush
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: 0x3d703b, roughness: 0.85 }));
    bush.position.set(fx, H + 0.1, fz);
    root.add(bush);

    // Blossom cluster
    const flowerMat = new THREE.MeshStandardMaterial({ color: flowerColors[f % flowerColors.length], roughness: 0.6 });
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), flowerMat);
    flower.position.set(fx, H + 0.22, fz);
    root.add(flower);
  }

  await saveSceneToGLB(root, "archviz_balcony_planter_box.glb");
}

// 12. Round Woven Fiber Rug (archviz_carpet_round_woven.glb)
async function createCarpetRoundWoven() {
  const root = new THREE.Group();
  const R = 1.15; // 2.3m diameter rug

  const rug = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.015, 36), carpetWovenMat);
  rug.position.set(0, 0.008, 0);
  root.add(rug);

  // Concentric woven border ring
  const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.88, R * 0.98, 36), new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.95 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.016, 0);
  root.add(ring);

  await saveSceneToGLB(root, "archviz_carpet_round_woven.glb");
}

async function main() {
  console.log("=== STARTING ARCHVIZ 3D ASSET GENERATION ===");
  await createBedDoubleLinen();
  await createWoodSlatsDivider();
  await createSofaLShape();
  await createCoffeeTableRoundMarble();
  await createShowerCabinGlass();
  await createVanityDoubleMirror();
  await createToiletWallHung();
  await createKitchenModuleCombo();
  await createDeskOfficeChair();
  await createWardrobeOpenWalkin();
  await createBalconyPlanterBox();
  await createCarpetRoundWoven();
  console.log("✓ Successfully generated all 12 ArchViz 3D GLB assets in:", OUT_DIR);
}

main().catch((err) => {
  console.error("Failed to generate archviz models:", err);
  process.exit(1);
});

