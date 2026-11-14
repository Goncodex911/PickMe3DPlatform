/**
 * Nén file .GLB bằng Draco (KHR_draco_mesh_compression) qua gltf-transform.
 * Pipeline: dedup (gộp dữ liệu trùng) -> weld (gộp đỉnh trùng) -> draco (nén hình học).
 */
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { dedup, weld, draco } = require('@gltf-transform/functions');
const draco3d = require('draco3dgltf');

let ioPromise = null;

/** NodeIO dùng chung (module WASM của Draco chỉ khởi tạo một lần). */
function getIO() {
  if (!ioPromise) {
    ioPromise = (async () => {
      const [encoder, decoder] = await Promise.all([draco3d.createEncoderModule(), draco3d.createDecoderModule()]);
      return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
        'draco3d.encoder': encoder,
        'draco3d.decoder': decoder,
      });
    })();
    ioPromise.catch(() => {
      ioPromise = null;
    });
  }
  return ioPromise;
}

const GLB_MAGIC = 0x46546c67; // "glTF"

function isGlb(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 12 && buffer.readUInt32LE(0) === GLB_MAGIC;
}

/**
 * @param {Buffer} input GLB gốc
 * @returns {Promise<{ buffer: Buffer, originalBytes: number, compressedBytes: number, ratio: number }>}
 */
async function compressGlbWithDraco(input) {
  if (!isGlb(input)) {
    const err = new Error('Tệp không phải định dạng GLB hợp lệ.');
    err.status = 400;
    throw err;
  }
  const io = await getIO();
  const document = await io.readBinary(new Uint8Array(input.buffer, input.byteOffset, input.byteLength));
  await document.transform(dedup(), weld(), draco({ method: 'edgebreaker' }));
  const output = Buffer.from(await io.writeBinary(document));
  return {
    buffer: output,
    originalBytes: input.length,
    compressedBytes: output.length,
    ratio: Number((input.length / Math.max(1, output.length)).toFixed(2)),
  };
}

module.exports = { compressGlbWithDraco, isGlb };
