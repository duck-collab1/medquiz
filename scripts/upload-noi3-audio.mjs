import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { spawnSync } from "child_process";
import { randomUUID } from "crypto";
import path from "path";

const SRC = "E:/tài liệu học tập/video/nội 3 anh hải";
const OUT = process.argv[2];
const BUCKET = "onthinoitru-d1a99.firebasestorage.app";
mkdirSync(OUT, { recursive: true });

const svc = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));
initializeApp({ credential: cert(svc) });
const bucket = getStorage().bucket(BUCKET);

function describe(file) {
  const base = file.replace(/\.[^.]+$/, "");
  const m = base.match(/(\d+)/);
  const n = m ? Number(m[1]) : 0;
  const detail = base
    .replace(/^N[ộo]i\s+/i, "")
    .replace(/^Buổi\s+\d+/i, "")
    .replace(/^[_\s:]+/, "")
    .replace(/_/g, "")
    .trim();
  const title = `Buổi ${n}${detail ? ": " + detail : ""}`;
  const dup = /đầy đủ hơn/i.test(base) ? "-day-du" : "";
  const nn = String(n).padStart(2, "0");
  return { n, title, slug: `b${nn}${dup}` };
}

const files = readdirSync(SRC).filter((f) => /\.(mp4|m4a)$/i.test(f));
const items = files.map((f) => ({ file: f, ...describe(f) }));
items.sort((a, b) => a.n - b.n || a.slug.localeCompare(b.slug));

const manifest = [];
for (const it of items) {
  const out = path.join(OUT, `${it.slug}.m4a`);
  if (!existsSync(out)) {
    const r = spawnSync(
      "ffmpeg",
      ["-y", "-v", "error", "-i", path.join(SRC, it.file), "-vn", "-ac", "1", "-c:a", "aac", "-b:a", "48k", "-movflags", "+faststart", out],
      { stdio: "inherit" },
    );
    if (r.status !== 0) throw new Error("ffmpeg failed: " + it.file);
  }
  const dest = `lecture-audio/noi3-anh-hai/${it.slug}.m4a`;
  const token = randomUUID();
  await bucket.upload(out, {
    destination: dest,
    metadata: { contentType: "audio/mp4", cacheControl: "public, max-age=31536000", metadata: { firebaseStorageDownloadTokens: token } },
  });
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
  manifest.push({ id: `lecture-noi3-${it.slug}`, title: it.title, audioUrl: url, mb: Math.round(statSync(out).size / 1e6) });
  console.log("OK", it.slug, it.title, statSync(out).size / 1e6 + "MB");
  writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
}
console.log("DONE", manifest.length);
process.exit(0);
