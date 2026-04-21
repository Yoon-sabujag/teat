import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const W = 720;
const H = 1280;

const characters = {
  minji: { hue: 340, name: "민지" },
  "minji-mom": { hue: 25, name: "민지 엄마" },
  "minji-friend": { hue: 200, name: "소연" },
};

const expressions = [
  "neutral",
  "smile",
  "annoyed",
  "skeptical",
  "entranced",
  "afraid",
];

function svg({ hue, name, expression }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue}, 55%, 35%)"/>
      <stop offset="1" stop-color="hsl(${hue}, 60%, 18%)"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${W / 2}" cy="${H * 0.4}" r="${W * 0.28}" fill="hsl(${hue}, 40%, 75%)" opacity="0.85"/>
  <text x="50%" y="78%" text-anchor="middle" font-family="sans-serif" font-size="64" font-weight="700" fill="white">${name}</text>
  <text x="50%" y="84%" text-anchor="middle" font-family="sans-serif" font-size="36" fill="rgba(255,255,255,0.8)">${expression}</text>
  <text x="50%" y="92%" text-anchor="middle" font-family="sans-serif" font-size="22" fill="rgba(255,255,255,0.5)">placeholder</text>
</svg>`;
}

for (const [id, meta] of Object.entries(characters)) {
  const dir = path.join(process.cwd(), "public", "characters", id);
  await mkdir(dir, { recursive: true });
  for (const expression of expressions) {
    const file = path.join(dir, `${expression}.webp`);
    await sharp(Buffer.from(svg({ ...meta, expression })))
      .webp({ quality: 80 })
      .toFile(file);
    console.log(`wrote ${file}`);
  }
}
