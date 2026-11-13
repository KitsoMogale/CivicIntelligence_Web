// OSM policy prohibits automated panning/zooming against its public tile server.
// Generate a neutral 256px PNG locally; integration tests still render the real boundary assets.
import { deflateSync } from "node:zlib";
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const tag = Buffer.from(type),
    length = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, data])));
  return Buffer.concat([length, tag, data, crc]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(256, 0);
header.writeUInt32BE(256, 4);
header[8] = 8;
header[9] = 6;
const raw = Buffer.alloc(256 * (1 + 256 * 4));
for (let y = 0; y < 256; y++)
  for (let x = 0; x < 256; x++) {
    const offset = y * 1025 + 1 + x * 4;
    raw[offset] = 224;
    raw[offset + 1] = 232;
    raw[offset + 2] = 220;
    raw[offset + 3] = 255;
  }
const tile = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
export async function mockStreetTiles(context, status = () => 200) {
  await context.route("https://tile.openstreetmap.org/**", (route) => {
    const code = status();
    return route.fulfill({
      status: code,
      contentType: code === 200 ? "image/png" : "text/plain",
      body: code === 200 ? tile : "Simulated offline tile",
      headers: { "access-control-allow-origin": "*" },
    });
  });
}
