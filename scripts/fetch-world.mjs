// Fetch only the reviewed, pinned source batch. No map tiles are requested.
import fs from "node:fs/promises";
import path from "node:path";
import { createWriteStream } from "node:fs";
import { createHash } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
const dir = process.argv[2] ?? ".research/world";
const manifest = JSON.parse(
  await fs.readFile("data/provenance/world-downloads.json", "utf8"),
);
const digest = (b) => createHash("sha256").update(b).digest("hex");
await fs.mkdir(dir, { recursive: true });
for (const item of manifest.snapshots) {
  const bytes = await fs.readFile(
    path.join("data/provenance/world-inputs", item.file),
  );
  if (digest(bytes) !== item.sha256)
    throw new Error("Snapshot changed: " + item.file);
  await fs.writeFile(path.join(dir, item.file), bytes);
}
let cursor = 0,
  downloaded = 0,
  cached = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (cursor < manifest.downloads.length) {
      const item = manifest.downloads[cursor++],
        file = path.join(dir, item.file);
      let valid = false;
      try {
        valid = digest(await fs.readFile(file)) === item.sha256;
      } catch {}
      if (valid) cached++;
      else {
        const response = await fetch(item.url, {
          signal: AbortSignal.timeout(240000),
        });
        if (!response.ok)
          throw new Error(item.file + ": HTTP " + response.status);
        const hash = createHash("sha256");
        let size = 0;
        const meter = new Transform({
          transform(chunk, encoding, done) {
            size += chunk.length;
            if (size > item.bytes)
              return done(new Error("Unexpected input size"));
            hash.update(chunk);
            done(null, chunk);
          },
        });
        await pipeline(
          Readable.fromWeb(response.body),
          meter,
          createWriteStream(file + ".pending"),
        );
        if (size !== item.bytes || hash.digest("hex") !== item.sha256)
          throw new Error("Source digest differs: " + item.file);
        await fs.rename(file + ".pending", file);
        downloaded++;
      }
      if (item.meta)
        await fs.writeFile(
          path.join(dir, item.meta),
          JSON.stringify(
            { url: item.url, bytes: item.bytes, sha256: item.sha256 },
            null,
            2,
          ),
        );
    }
  }),
);
console.log({ downloaded, cached, snapshots: manifest.snapshots.length });
