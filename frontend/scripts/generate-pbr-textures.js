/**
 * Script to generate high-fidelity seamless 1024x1024 PBR textures for PickMe3D (STORY-THUAN-BP11)
 * Generates map (diffuse), normalMap, and roughnessMap in WebP format.
 */

const path = require("path");
const fs = require("fs");
const sharp = require("../node_modules/sharp");

const OUT_DIR = path.join(__dirname, "../public/textures");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const SIZE = 1024;

// Simple deterministic pseudo-random / hash function for repeatable seamless textures
function pseudoNoise(x, y, seed = 1) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y, scale = 1, seed = 1) {
  const sX = x / scale;
  const sY = y / scale;
  const x0 = Math.floor(sX);
  const x1 = x0 + 1;
  const y0 = Math.floor(sY);
  const y1 = y0 + 1;

  const fx = sX - x0;
  const fy = sY - y0;

  const n00 = pseudoNoise(x0 % (SIZE / scale), y0 % (SIZE / scale), seed);
  const n10 = pseudoNoise(x1 % (SIZE / scale), y0 % (SIZE / scale), seed);
  const n01 = pseudoNoise(x0 % (SIZE / scale), y1 % (SIZE / scale), seed);
  const n11 = pseudoNoise(x1 % (SIZE / scale), y1 % (SIZE / scale), seed);

  const wx = fx * fx * (3 - 2 * fx);
  const wy = fy * fy * (3 - 2 * fy);

  const nx0 = n00 * (1 - wx) + n10 * wx;
  const nx1 = n01 * (1 - wx) + n11 * wx;
  return nx0 * (1 - wy) + nx1 * wy;
}

// Generate height map gradients to tangent-space normal map
function heightToNormal(heights, width, height, strength = 2.0) {
  const normalBuf = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const yPrev = (y - 1 + height) % height;
    const yNext = (y + 1) % height;
    for (let x = 0; x < width; x++) {
      const xPrev = (x - 1 + width) % width;
      const xNext = (x + 1) % width;

      const idx = (y * width + x);
      const hL = heights[y * width + xPrev];
      const hR = heights[y * width + xNext];
      const hU = heights[yPrev * width + x];
      const hD = heights[yNext * width + x];

      let dx = (hR - hL) * strength;
      let dy = (hD - hU) * strength;
      let dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      dx /= len;
      dy /= len;
      dz /= len;

      const r = Math.round((dx * 0.5 + 0.5) * 255);
      const g = Math.round((dy * 0.5 + 0.5) * 255);
      const b = Math.round((dz * 0.5 + 0.5) * 255);

      const pIdx = idx * 4;
      normalBuf[pIdx] = r;
      normalBuf[pIdx + 1] = g;
      normalBuf[pIdx + 2] = b;
      normalBuf[pIdx + 3] = 255;
    }
  }
  return normalBuf;
}

// 1. OAK PARQUET (Sàn gỗ sồi thanh)
async function generateOakParquet() {
  console.log("Generating Oak Parquet PBR Maps...");
  const diffuseBuf = Buffer.alloc(SIZE * SIZE * 4);
  const roughnessBuf = Buffer.alloc(SIZE * SIZE * 4);
  const heights = new Float32Array(SIZE * SIZE);

  const plankH = 64;  // 16 rows
  const plankW = 256; // 4 cols

  for (let y = 0; y < SIZE; y++) {
    const row = Math.floor(y / plankH);
    const inPlankY = y % plankH;
    const isYBevel = inPlankY <= 1 || inPlankY >= plankH - 2;

    const xOffset = (row % 2) * (plankW * 0.5);

    for (let x = 0; x < SIZE; x++) {
      const shiftedX = (x + xOffset) % SIZE;
      const col = Math.floor(shiftedX / plankW);
      const inPlankX = shiftedX % plankW;
      const isXBevel = inPlankX <= 1 || inPlankX >= plankW - 2;

      const idx = y * SIZE + x;
      const pIdx = idx * 4;

      // Plank color variation
      const plankRand = pseudoNoise(col, row, 10);
      const shadeDiff = (plankRand - 0.5) * 25;

      // Fine grain noise
      const grain = Math.sin((x + smoothNoise(x, y, 16, 2) * 12) * 0.4) * 0.5 + 0.5;
      const grainMod = (grain - 0.5) * 18;

      let r = Math.min(255, Math.max(0, 204 + shadeDiff + grainMod));
      let g = Math.min(255, Math.max(0, 172 + shadeDiff + grainMod * 0.8));
      let b = Math.min(255, Math.max(0, 136 + shadeDiff + grainMod * 0.6));

      let rough = 100 + Math.round(plankRand * 25);
      let height = 0.5;

      // Groove / Bevel darkening
      if (isYBevel || isXBevel) {
        r = Math.round(r * 0.55);
        g = Math.round(g * 0.55);
        b = Math.round(b * 0.55);
        rough = 210;
        height = 0.1;
      }

      diffuseBuf[pIdx] = r;
      diffuseBuf[pIdx + 1] = g;
      diffuseBuf[pIdx + 2] = b;
      diffuseBuf[pIdx + 3] = 255;

      roughnessBuf[pIdx] = rough;
      roughnessBuf[pIdx + 1] = rough;
      roughnessBuf[pIdx + 2] = rough;
      roughnessBuf[pIdx + 3] = 255;

      heights[idx] = height;
    }
  }

  const normalBuf = heightToNormal(heights, SIZE, SIZE, 4.0);

  await sharp(diffuseBuf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "oak_parquet_diffuse.webp"));

  await sharp(roughnessBuf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "oak_parquet_roughness.webp"));

  await sharp(normalBuf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "oak_parquet_normal.webp"));
}

// 2. MARBLE TILE (Gạch đá mài bóng Calacatta)
async function generateMarbleTile() {
  console.log("Generating Marble Tile PBR Maps...");
  const diffuseBuf = Buffer.alloc(SIZE * SIZE * 4);
  const roughnessBuf = Buffer.alloc(SIZE * SIZE * 4);
  const heights = new Float32Array(SIZE * SIZE);

  const tileSize = 256; // 4x4 tiles in 1024x1024

  for (let y = 0; y < SIZE; y++) {
    const inTileY = y % tileSize;
    const isYJoint = inTileY <= 2 || inTileY >= tileSize - 3;

    for (let x = 0; x < SIZE; x++) {
      const inTileX = x % tileSize;
      const isXJoint = inTileX <= 2 || inTileX >= tileSize - 3;

      const idx = y * SIZE + x;
      const pIdx = idx * 4;

      // Base marble color
      let base = 245 + Math.round(smoothNoise(x, y, 64, 5) * 8);

      // Veins using turbulence
      const turb1 = smoothNoise(x * 2, y * 0.8, 48, 12);
      const turb2 = smoothNoise(x * 0.7, y * 2, 32, 17);
      const veinDist = Math.abs(Math.sin((x + y * 0.6) * 0.015 + turb1 * 3.5 + turb2 * 2.0));
      const isVein = veinDist < 0.08;
      const veinStrength = isVein ? (1.0 - veinDist / 0.08) : 0;

      let r = base - Math.round(veinStrength * 65);
      let g = base - Math.round(veinStrength * 68);
      let b = base - Math.round(veinStrength * 72);

      let rough = 45; // polished high-gloss
      let height = 0.8;

      if (isYJoint || isXJoint) {
        // Grout line
        r = 185;
        g = 182;
        b = 178;
        rough = 190;
        height = 0.2;
      }

      diffuseBuf[pIdx] = r;
      diffuseBuf[pIdx + 1] = g;
      diffuseBuf[pIdx + 2] = b;
      diffuseBuf[pIdx + 3] = 255;

      roughnessBuf[pIdx] = rough;
      roughnessBuf[pIdx + 1] = rough;
      roughnessBuf[pIdx + 2] = rough;
      roughnessBuf[pIdx + 3] = 255;

      heights[idx] = height;
    }
  }

  const normalBuf = heightToNormal(heights, SIZE, SIZE, 3.5);

  await sharp(diffuseBuf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "marble_tile_diffuse.webp"));

  await sharp(roughnessBuf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "marble_tile_roughness.webp"));

  await sharp(normalBuf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "marble_tile_normal.webp"));
}

// 3. SLATE TILE (Ban công đá đen chống trơn)
async function generateSlateTile() {
  console.log("Generating Slate Balcony Tile PBR Maps...");
  const diffuseBuf = Buffer.alloc(SIZE * SIZE * 4);
  const roughnessBuf = Buffer.alloc(SIZE * SIZE * 4);
  const heights = new Float32Array(SIZE * SIZE);

  const tileSize = 256;

  for (let y = 0; y < SIZE; y++) {
    const inTileY = y % tileSize;
    const isYJoint = inTileY <= 2 || inTileY >= tileSize - 3;

    for (let x = 0; x < SIZE; x++) {
      const inTileX = x % tileSize;
      const isXJoint = inTileX <= 2 || inTileX >= tileSize - 3;

      const idx = y * SIZE + x;
      const pIdx = idx * 4;

      // Rough stone micro-relief
      const stoneNoise = smoothNoise(x, y, 8, 21) * 0.5 + smoothNoise(x, y, 32, 23) * 0.5;
      const gray = 52 + Math.round((stoneNoise - 0.5) * 20);

      let r = gray;
      let g = gray + 3; // slight slate cyan/blue tint
      let b = gray + 7;

      let rough = 215; // rough matte stone
      let height = stoneNoise * 0.4 + 0.4;

      if (isYJoint || isXJoint) {
        r = 28;
        g = 30;
        b = 32;
        rough = 245;
        height = 0.1;
      }

      diffuseBuf[pIdx] = r;
      diffuseBuf[pIdx + 1] = g;
      diffuseBuf[pIdx + 2] = b;
      diffuseBuf[pIdx + 3] = 255;

      roughnessBuf[pIdx] = rough;
      roughnessBuf[pIdx + 1] = rough;
      roughnessBuf[pIdx + 2] = rough;
      roughnessBuf[pIdx + 3] = 255;

      heights[idx] = height;
    }
  }

  const normalBuf = heightToNormal(heights, SIZE, SIZE, 4.5);

  await sharp(diffuseBuf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "slate_tile_diffuse.webp"));

  await sharp(roughnessBuf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "slate_tile_roughness.webp"));

  await sharp(normalBuf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "slate_tile_normal.webp"));
}

// 4. PLASTER WALL (Tường vữa thạch cao ấm)
async function generatePlasterWall() {
  console.log("Generating Plaster Wall PBR Maps...");
  const diffuseBuf = Buffer.alloc(SIZE * SIZE * 4);
  const roughnessBuf = Buffer.alloc(SIZE * SIZE * 4);
  const heights = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = y * SIZE + x;
      const pIdx = idx * 4;

      const noise1 = smoothNoise(x, y, 4, 31);
      const noise2 = smoothNoise(x, y, 16, 33);
      const val = (noise1 * 0.4 + noise2 * 0.6 - 0.5) * 8;

      const r = Math.min(255, Math.max(0, 246 + Math.round(val)));
      const g = Math.min(255, Math.max(0, 244 + Math.round(val)));
      const b = Math.min(255, Math.max(0, 240 + Math.round(val * 0.8)));

      diffuseBuf[pIdx] = r;
      diffuseBuf[pIdx + 1] = g;
      diffuseBuf[pIdx + 2] = b;
      diffuseBuf[pIdx + 3] = 255;

      const rough = 220 + Math.round(val);
      roughnessBuf[pIdx] = rough;
      roughnessBuf[pIdx + 1] = rough;
      roughnessBuf[pIdx + 2] = rough;
      roughnessBuf[pIdx + 3] = 255;

      heights[idx] = (noise1 * 0.3 + noise2 * 0.7);
    }
  }

  const normalBuf = heightToNormal(heights, SIZE, SIZE, 2.0);

  await sharp(diffuseBuf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "plaster_wall_diffuse.webp"));

  await sharp(roughnessBuf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "plaster_wall_roughness.webp"));

  await sharp(normalBuf, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "plaster_wall_normal.webp"));
}

async function main() {
  console.log("=== STARTING PBR TEXTURE GENERATION ===");
  await generateOakParquet();
  await generateMarbleTile();
  await generateSlateTile();
  await generatePlasterWall();
  console.log("✓ Successfully generated all 12 PBR texture maps at:", OUT_DIR);
}

main().catch((err) => {
  console.error("Failed to generate textures:", err);
  process.exit(1);
});

