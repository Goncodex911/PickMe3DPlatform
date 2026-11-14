/**
 * Nội thất & trang trí dựng thủ tục (procedural) theo loại phòng cho viewer Casa Serra.
 * Tách nguyên văn từ CasaSerraViewer.tsx; dùng cho mặt bằng mẫu / phòng không có nội thất từ AI.
 */
import * as THREE from "three";
import type { RoomSpec } from "../floorplan-types";

export interface InteriorLightEntry {
  light: THREE.Light;
  baseIntensity: number;
}

export interface ProceduralFurnitureContext {
  /** Danh sách đèn nội thất của viewer (để điều chỉnh cường độ theo thời gian trong ngày). */
  interiorLights: InteriorLightEntry[];
  /** Nhận đèn lò sưởi (viewer dùng để tạo hiệu ứng lửa bập bùng). */
  onFireLight?: (light: THREE.PointLight) => void;
}

export function buildProceduralRoomFurniture(
  room: RoomSpec,
  cx: number,
  cz: number,
  w: number,
  d: number,
  group: THREE.Group,
  scene: THREE.Scene,
  ctx: ProceduralFurnitureContext
): void {
  const oakMat = new THREE.MeshStandardMaterial({ color: 0xa87f54, roughness: 0.55 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x362c25, roughness: 0.65 });
  const travertineMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d7, roughness: 0.45 });
  const linenBeigeMat = new THREE.MeshStandardMaterial({ color: 0xd8d1c5, roughness: 0.85 });
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xb8452a, roughness: 0.75 });
  const ochreMat = new THREE.MeshStandardMaterial({ color: 0xc9a15a, roughness: 0.75 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc89d42, roughness: 0.32, metalness: 0.9 });
  const darkBronzeMat = new THREE.MeshStandardMaterial({ color: 0x3d352e, roughness: 0.45, metalness: 0.75 });
  const ceramicWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.3 });
  const ceramicBlackMat = new THREE.MeshStandardMaterial({ color: 0x1f1d1b, roughness: 0.4 });
  const leatherCognacMat = new THREE.MeshStandardMaterial({ color: 0x6e3d23, roughness: 0.6 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x546647, roughness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88aab5, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3 });

  // ROOM 02: THE LIVING ROOM (Screenshot 1)
  if (room.category === "living") {
    // 1. Sunken Lounge U-Shaped Sectional Sofa (Sitting inside 45cm pit)
    const pitY = -0.42;

    // Center Travertine Coffee Table
    const tableW = 2.4;
    const tableD = 1.3;
    const table = new THREE.Mesh(new THREE.BoxGeometry(tableW, 0.35, tableD), travertineMat);
    table.position.set(cx, pitY + 0.18, cz);
    table.castShadow = true;
    group.add(table);

    // Living Room Architectural Spotlight focusing down on coffee table & sunken lounge (STORY-THUAN-BP13)
    const livingSpot = new THREE.SpotLight(0xffecd2, 1.8, 12, Math.PI / 4, 0.5, 1.2);
    livingSpot.position.set(cx, 3.9, cz);
    livingSpot.target.position.set(cx, pitY + 0.2, cz);
    livingSpot.castShadow = true;
    livingSpot.shadow.bias = -0.0001;
    scene.add(livingSpot);
    scene.add(livingSpot.target);
    ctx.interiorLights.push({ light: livingSpot, baseIntensity: 1.8 });

    // Items on Coffee table: White bowl, Black vase with leafy branches, art books
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.12, 0.12, 24), ceramicWhiteMat);
    bowl.position.set(cx - 0.4, pitY + 0.41, cz);
    group.add(bowl);

    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.42, 24), ceramicBlackMat);
    vase.position.set(cx + 0.5, pitY + 0.56, cz);
    group.add(vase);

    // Green leafy branches extending from the vase
    const branchGeo = new THREE.CylinderGeometry(0.01, 0.015, 0.65, 8);
    const branch = new THREE.Mesh(branchGeo, darkWoodMat);
    branch.position.set(cx + 0.5, pitY + 0.85, cz);
    branch.rotation.z = -0.25;
    group.add(branch);

    const leafSphere = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), foliageMat);
    leafSphere.position.set(cx + 0.65, pitY + 1.1, cz);
    group.add(leafSphere);

    // U-Shaped Modular Sofa Base & Cushions
    const sofaBaseMat = linenBeigeMat;
    const sofaLength = 4.8;
    const sofaDepth = 1.0;
    const cushionH = 0.44;

    // North side sofa segment
    const sofaN = new THREE.Mesh(new THREE.BoxGeometry(sofaLength, cushionH, sofaDepth), sofaBaseMat);
    sofaN.position.set(cx, pitY + cushionH / 2, cz - 1.6);
    sofaN.castShadow = true;
    group.add(sofaN);

    // South side sofa segment
    const sofaS = new THREE.Mesh(new THREE.BoxGeometry(sofaLength, cushionH, sofaDepth), sofaBaseMat);
    sofaS.position.set(cx, pitY + cushionH / 2, cz + 1.6);
    sofaS.castShadow = true;
    group.add(sofaS);

    // West side connecting lounge
    const sofaW_mesh = new THREE.Mesh(new THREE.BoxGeometry(sofaDepth, cushionH, 3.2), sofaBaseMat);
    sofaW_mesh.position.set(cx - 1.9, pitY + cushionH / 2, cz);
    sofaW_mesh.castShadow = true;
    group.add(sofaW_mesh);

    // Throw Pillows (Terracotta, Ochre, Sage)
    [
      { x: cx - 1.6, z: cz - 1.4, col: terracottaMat, rot: 0.2 },
      { x: cx + 1.2, z: cz - 1.4, col: ochreMat, rot: -0.15 },
      { x: cx + 1.8, z: cz + 1.4, col: terracottaMat, rot: 0.1 },
      { x: cx - 1.4, z: cz + 1.4, col: ochreMat, rot: -0.2 },
    ].forEach((p) => {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.16), p.col);
      pillow.position.set(p.x, pitY + cushionH + 0.18, p.z);
      pillow.rotation.y = p.rot;
      pillow.castShadow = true;
      group.add(pillow);
    });

    // 2. Concrete Fireplace Wall with Lit Hearth
    const fireWallW = 3.4;
    const fireWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 3.2, fireWallW),
      new THREE.MeshStandardMaterial({ color: 0xc8c1b5, roughness: 0.9 })
    );
    fireWall.position.set(cx - w * 0.45, 1.6, cz);
    fireWall.castShadow = true;
    group.add(fireWall);

    // Hearth Firebox opening
    const firebox = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.8, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.95 })
    );
    firebox.position.set(cx - w * 0.45 + 0.05, 0.6, cz - 0.2);
    group.add(firebox);

    // Glowing Amber Fire Hearth
    const ember = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 1.2),
      new THREE.MeshBasicMaterial({ color: 0xff5511 })
    );
    ember.position.set(cx - w * 0.45 + 0.12, 0.35, cz - 0.2);
    group.add(ember);

    const fireLight = new THREE.PointLight(0xff7722, 1.8, 8);
    fireLight.position.set(cx - w * 0.45 + 0.4, 0.7, cz - 0.2);
    scene.add(fireLight);
    ctx.onFireLight?.(fireLight);
    ctx.interiorLights.push({ light: fireLight, baseIntensity: 1.8 });

    // Stacked Firewood logs next to fireplace
    for (let l = 0; l < 4; l++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.75, 10), darkWoodMat);
      log.rotation.x = Math.PI / 2;
      log.position.set(cx - w * 0.45 + 0.2, 0.15 + l * 0.12, cz + 0.9 + (l % 2) * 0.1);
      group.add(log);
    }

    // 3. Curved Brass Arc Floor Lamp (Arco Lamp)
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.45, 16), travertineMat);
    lampBase.position.set(cx - w * 0.44, 0.22, cz - 1.8);
    group.add(lampBase);

    // Curved Arc Pole (Spline curve)
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(cx - w * 0.44, 0.45, cz - 1.8),
      new THREE.Vector3(cx - 2.8, 3.8, cz - 1.2),
      new THREE.Vector3(cx - 1.2, 2.6, cz - 0.5)
    );
    const arcGeo = new THREE.TubeGeometry(curve, 24, 0.02, 8, false);
    const arcMesh = new THREE.Mesh(arcGeo, brassMat);
    group.add(arcMesh);

    const lampDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      brassMat
    );
    lampDome.position.set(cx - 1.2, 2.6, cz - 0.5);
    group.add(lampDome);

    // 4. Potted Olive Tree in Round Wooden Tub
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.65, 20), oakMat);
    pot.position.set(cx - 3.4, 0.32, cz + 1.8);
    pot.castShadow = true;
    group.add(pot);

    const treeTrunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 1.8, 10),
      new THREE.MeshStandardMaterial({ color: 0x4a3e35, roughness: 0.95 })
    );
    treeTrunk.position.set(cx - 3.4, 1.2, cz + 1.8);
    treeTrunk.rotation.z = 0.15;
    group.add(treeTrunk);

    const treeLeaves = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), foliageMat);
    treeLeaves.position.set(cx - 3.2, 2.2, cz + 1.8);
    treeLeaves.scale.set(1.2, 0.9, 1.1);
    group.add(treeLeaves);

    // 5. Framed Modern Wall Art (Bauhaus white canvas with red dot and black rectangle)
    const frameW = 1.2;
    const frameH = 1.6;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, frameH, frameW),
      new THREE.MeshStandardMaterial({ color: 0x9e7349, roughness: 0.6 })
    );
    frame.position.set(cx - w * 0.45 + 0.02, 2.1, cz - 1.8);
    group.add(frame);

    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(frameW - 0.1, frameH - 0.1),
      new THREE.MeshBasicMaterial({ color: 0xf6f2ea })
    );
    canvas.rotation.y = Math.PI / 2;
    canvas.position.set(cx - w * 0.45 + 0.05, 2.1, cz - 1.8);
    group.add(canvas);

    // Red circle on canvas
    const redDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 24),
      new THREE.MeshBasicMaterial({ color: 0xb8452a })
    );
    redDot.rotation.y = Math.PI / 2;
    redDot.position.set(cx - w * 0.45 + 0.055, 1.9, cz - 1.8);
    group.add(redDot);

    // Feature Wall Warm Cove LED Light Strip (STORY-THUAN-BP13)
    const tvCoveGeo = new THREE.BoxGeometry(0.04, 0.02, 3.2);
    const tvCoveMat = new THREE.MeshBasicMaterial({ color: 0xffe8c8 });
    const tvCoveMesh = new THREE.Mesh(tvCoveGeo, tvCoveMat);
    tvCoveMesh.position.set(cx - w * 0.44, 2.9, cz);
    group.add(tvCoveMesh);

    const tvCoveLight = new THREE.PointLight(0xffeedd, 1.1, 4.5);
    tvCoveLight.position.set(cx - w * 0.42, 2.85, cz);
    scene.add(tvCoveLight);
    ctx.interiorLights.push({ light: tvCoveLight, baseIntensity: 1.1 });
  }
  // ROOM 03: KITCHEN AND DINING (Screenshot 2)
  else if (room.category === "kitchen") {
    // 1. Long 6-meter Oak Dining Table for 14 People
    const tableLen = 6.2;
    const tableWidth = 1.25;
    const tableH = 0.76;

    const diningTableTop = new THREE.Mesh(new THREE.BoxGeometry(tableLen, 0.08, tableWidth), oakMat);
    diningTableTop.position.set(cx, tableH, cz - 0.8);
    diningTableTop.castShadow = true;
    group.add(diningTableTop);

    // Table Legs
    [-tableLen / 2 + 0.4, tableLen / 2 - 0.4].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, tableH, tableWidth - 0.2), oakMat);
      leg.position.set(cx + lx, tableH / 2, cz - 0.8);
      leg.castShadow = true;
      group.add(leg);
    });

    // White Linen Runner
    const runner = new THREE.Mesh(new THREE.BoxGeometry(tableLen - 0.6, 0.01, 0.45), ceramicWhiteMat);
    runner.position.set(cx, tableH + 0.045, cz - 0.8);
    group.add(runner);

    // Ceramic vases & tableware
    [-1.2, 0, 1.2].forEach((offset) => {
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.06, 20), ceramicWhiteMat);
      dish.position.set(cx + offset, tableH + 0.08, cz - 0.8);
      group.add(dish);
    });

    // 14 Dining Chairs with Leather Cushions
    for (let i = 0; i < 7; i++) {
      const chairX = cx - tableLen / 2 + 0.6 + i * 0.85;

      // North chairs
      const chairN = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.48), leatherCognacMat);
      chairN.position.set(chairX, 0.23, cz - 0.8 - tableWidth / 2 - 0.32);
      chairN.castShadow = true;
      group.add(chairN);

      const backN = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.06), leatherCognacMat);
      backN.position.set(chairX, 0.65, cz - 0.8 - tableWidth / 2 - 0.52);
      group.add(backN);

      // South chairs
      const chairS = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.48), leatherCognacMat);
      chairS.position.set(chairX, 0.23, cz - 0.8 + tableWidth / 2 + 0.32);
      chairS.castShadow = true;
      group.add(chairS);

      const backS = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.06), leatherCognacMat);
      backS.position.set(chairX, 0.65, cz - 0.8 + tableWidth / 2 + 0.52);
      group.add(backS);
    }

    // 2. Two Hanging Brass Dome Pendant Lights Above Table (Glow from above)
    [-1.4, 1.4].forEach((lampX) => {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.8, 8), darkWoodMat);
      cord.position.set(cx + lampX, 3.2, cz - 0.8);
      group.add(cord);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        brassMat
      );
      dome.position.set(cx + lampX, 2.3, cz - 0.8);
      group.add(dome);

      const pendantLight = new THREE.PointLight(0xffdf99, 1.4, 6);
      pendantLight.position.set(cx + lampX, 2.1, cz - 0.8);
      scene.add(pendantLight);
      ctx.interiorLights.push({ light: pendantLight, baseIntensity: 1.4 });
    });

    // 3. 5-meter Travertine Kitchen Island
    const islandLen = 5.2;
    const islandW = 1.2;
    const islandH = 0.92;
    const island = new THREE.Mesh(new THREE.BoxGeometry(islandLen, islandH, islandW), travertineMat);
    island.position.set(cx, islandH / 2, cz + 1.8);
    island.castShadow = true;
    group.add(island);

    // Bronze Gooseneck Faucet & Undermount Sink
    const sink = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.02, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 })
    );
    sink.position.set(cx - 0.8, islandH + 0.01, cz + 1.8);
    group.add(sink);

    const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 12), brassMat);
    faucet.position.set(cx - 0.8, islandH + 0.2, cz + 2.05);
    group.add(faucet);

    // Kitchen Bar Stools
    for (let s = 0; s < 4; s++) {
      const stoolX = cx - islandLen / 2 + 1.0 + s * 1.1;
      const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20), oakMat);
      stoolSeat.position.set(stoolX, 0.65, cz + 1.8 - islandW / 2 - 0.35);
      group.add(stoolSeat);

      const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 10), darkWoodMat);
      stoolLeg.position.set(stoolX, 0.31, cz + 1.8 - islandW / 2 - 0.35);
      group.add(stoolLeg);
    }

    // 4. Dark Cabinetry Wall with LED strip niche
    const cabWall = new THREE.Mesh(new THREE.BoxGeometry(islandLen, 3.2, 0.65), darkWoodMat);
    cabWall.position.set(cx, 1.6, cz + d / 2 - 0.35);
    cabWall.castShadow = true;
    group.add(cabWall);

    // Cyan / Blue Under-Cabinet LED Strip (matching Image 2 - STORY-THUAN-BP13)
    const cyanLedStrip = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.03, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    );
    cyanLedStrip.position.set(cx, 1.45, cz + d / 2 - 0.68);
    group.add(cyanLedStrip);

    const cyanLedLight = new THREE.PointLight(0x38bdf8, 1.2, 3.8);
    cyanLedLight.position.set(cx, 1.42, cz + d / 2 - 0.65);
    scene.add(cyanLedLight);
    ctx.interiorLights.push({ light: cyanLedLight, baseIntensity: 1.2 });

    const ledNiche = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.6, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x1f2428 })
    );
    ledNiche.position.set(cx, 1.4, cz + d / 2 - 0.55);
    group.add(ledNiche);

    // Downlight spotlight focusing on island & dining area
    const kitchenSpot = new THREE.SpotLight(0xffeedd, 1.8, 10, Math.PI / 5, 0.45, 1.2);
    kitchenSpot.position.set(cx, 3.8, cz + 1.8);
    kitchenSpot.target.position.set(cx, 0.9, cz + 1.8);
    kitchenSpot.castShadow = true;
    kitchenSpot.shadow.bias = -0.0001;
    scene.add(kitchenSpot);
    scene.add(kitchenSpot.target);
    ctx.interiorLights.push({ light: kitchenSpot, baseIntensity: 1.8 });

    // 5. Floor-to-ceiling Glass Wall looking out onto the landscape
    const glassWall = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 3.8, 0.04), glassMat);
    glassWall.position.set(cx, 1.9, cz - d / 2 + 0.1);
    group.add(glassWall);
  }
  // ROOM 05: THE GLASS GALLERY (Screenshot 3)
  else if (room.category === "hallway" && (room.id === "gallery" || room.name.toLowerCase().includes("gallery"))) {
    // 24m Bronze glass mullions casting shadow strips
    const galleryLen = Math.max(w, d);
    for (let m = 0; m < 12; m++) {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.0, 0.08), darkBronzeMat);
      mullion.position.set(cx - galleryLen / 2 + m * (galleryLen / 11), 2.0, cz - 1.2);
      group.add(mullion);
    }

    // Contemporary Gallery Paintings on the opposite wall
    [-4, 0, 4].forEach((gx) => {
      const pFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.04), oakMat);
      pFrame.position.set(cx + gx, 2.0, cz + 1.2);
      group.add(pFrame);

      const pCanvas = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), new THREE.MeshBasicMaterial({ color: 0xf4eee1 }));
      pCanvas.position.set(cx + gx, 2.0, cz + 1.17);
      group.add(pCanvas);
    });
  }
  // ROOM 06: BEDROOM / MASTER SUITE
  else if (room.category === "bedroom") {
    // 1. Oak Platform King Bed with Textured Linen
    const bedW = 2.2;
    const bedL = 2.3;
    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(bedW + 0.2, 0.35, bedL + 0.15), oakMat);
    bedBase.position.set(cx, 0.18, cz);
    bedBase.castShadow = true;
    group.add(bedBase);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.44, bedL), linenBeigeMat);
    mattress.position.set(cx, 0.55, cz);
    mattress.castShadow = true;
    group.add(mattress);

    // Charred Larch Wood Accent Headboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(bedW + 0.8, 1.6, 0.12), darkWoodMat);
    headboard.position.set(cx, 0.85, cz - bedL / 2 - 0.06);
    headboard.castShadow = true;
    group.add(headboard);

    // Headboard Warm Cove LED Strip (STORY-THUAN-BP13)
    const bedCoveGeo = new THREE.BoxGeometry(bedW + 0.6, 0.03, 0.04);
    const bedCoveMat = new THREE.MeshBasicMaterial({ color: 0xffd59e });
    const bedCoveMesh = new THREE.Mesh(bedCoveGeo, bedCoveMat);
    bedCoveMesh.position.set(cx, 1.65, cz - bedL / 2 + 0.02);
    group.add(bedCoveMesh);

    const bedCoveLight = new THREE.PointLight(0xffd59e, 1.1, 4.0);
    bedCoveLight.position.set(cx, 1.68, cz - bedL / 2 + 0.1);
    scene.add(bedCoveLight);
    ctx.interiorLights.push({ light: bedCoveLight, baseIntensity: 1.1 });

    // Plump Pillows
    [-0.52, 0.52].forEach((offset) => {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, 0.48), ceramicWhiteMat);
      pillow.position.set(cx + offset, 0.86, cz - bedL / 2 + 0.36);
      group.add(pillow);
    });

    // Travertine Nightstands & Brass Reading Lamps
    [-1, 1].forEach((dir) => {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.52, 0.52), travertineMat);
      stand.position.set(cx + dir * (bedW / 2 + 0.48), 0.26, cz - bedL / 2 + 0.28);
      stand.castShadow = true;
      group.add(stand);

      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.32, 16), brassMat);
      lamp.position.set(cx + dir * (bedW / 2 + 0.48), 0.68, cz - bedL / 2 + 0.28);
      group.add(lamp);
    });

    // Study Desk & Glass Sliding Wall to Private Garden
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 0.7), oakMat);
    desk.position.set(cx - w * 0.3, 0.38, cz + d * 0.32);
    desk.castShadow = true;
    group.add(desk);
  }
  // ROOM 04: THE OLIVE PATIO (Courtyard with Century-Old Olive Tree & Pool)
  else if (room.category === "outdoor" && (room.id === "patio" || room.name.toLowerCase().includes("patio"))) {
    // 1. Ancient Olive Tree c. 1890 right in the center of the patio
    const oliveTrunkGroup = new THREE.Group();
    oliveTrunkGroup.position.set(cx, 0, cz);

    // Gnarled sculptural trunk
    const trunkMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.52, 2.5, 12),
      new THREE.MeshStandardMaterial({ color: 0x483e33, roughness: 0.95 })
    );
    trunkMesh.position.y = 1.25;
    trunkMesh.rotation.z = 0.12;
    oliveTrunkGroup.add(trunkMesh);

    // Main branches
    [-0.6, 0.6].forEach((bx, bIdx) => {
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.24, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x483e33, roughness: 0.95 })
      );
      branch.position.set(bx, 2.3, (bIdx - 0.5) * 0.4);
      branch.rotation.z = (bIdx === 0 ? -1 : 1) * 0.45;
      oliveTrunkGroup.add(branch);
    });

    // Canopy of silver-green olive foliage
    [
      { x: -0.7, y: 3.2, z: -0.3, s: 1.5 },
      { x: 0.7, y: 3.3, z: 0.4, s: 1.6 },
      { x: 0, y: 3.9, z: 0, s: 1.9 },
    ].forEach((c) => {
      const clump = new THREE.Mesh(new THREE.SphereGeometry(c.s, 12, 10), foliageMat);
      clump.position.set(c.x, c.y, c.z);
      clump.scale.set(1.2, 0.85, 1.1);
      oliveTrunkGroup.add(clump);
    });

    group.add(oliveTrunkGroup);

    // 2. Travertine Sitting Bench under the olive tree
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.65), travertineMat);
    bench.position.set(cx + 2.2, 0.22, cz + 1.2);
    bench.castShadow = true;
    group.add(bench);
  }
  // GENERAL / RESIDENTIAL FALLBACK
  else {
    // Clean modern low cabinet
    const credenza = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.5, 2.4), 0.65, 0.5), oakMat);
    credenza.position.set(cx, 0.33, cz);
    credenza.castShadow = true;
    group.add(credenza);
  }
}
