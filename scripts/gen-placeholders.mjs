// Placeholder image generator. Produces gradient silhouettes labeled with
// character name + expression (or location) so scenes render identifiably
// while real AI art is being produced.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const CHAR_W = 720;
const CHAR_H = 1280;
const BG_W = 1440;
const BG_H = 2560;

const characters = {
  "cha-sangmu": { hue: 220, name: "차 상무", role: "전 직장 상사" },
  jaemin: { hue: 40, name: "재민", role: "흥신소" },
  "kim-sunggi": { hue: 280, name: "김승기", role: "그룹 부회장" },
  seungjae: { hue: 180, name: "백승재", role: "주인공" },
  miyoung: { hue: 330, name: "미영", role: "변호사" },
  junhyuk: { hue: 110, name: "준혁", role: "증권맨 · 도현 동창" },
  wonjang: { hue: 75, name: "원장 스님", role: "북한산 암자 주지" },
};

const expressions = [
  "neutral",
  "smile",
  "tense",
  "weary",
  "angry",
  "shock",
  "grim",
  "amused",
];

const backgrounds = {
  "office-exec": { hue: 210, name: "광화문 임원실 (저녁)" },
  "euljiro-office": { hue: 30, name: "을지로 7층 사무실" },
  "gwanghwamun-vip": { hue: 260, name: "광화문 VIP 상담실" },
  "dohyun-officetel": { hue: 200, name: "도현 오피스텔 (강남)" },
  "cheongdam-cafe": { hue: 330, name: "청담 카페 (저녁)" },
  "bukhansan-amja": { hue: 80, name: "북한산 자락 암자 (저녁)" },
};

function charSvg({ hue, name, role, expression }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CHAR_W}" height="${CHAR_H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsla(${hue}, 45%, 25%, 0)"/>
      <stop offset="0.4" stop-color="hsla(${hue}, 45%, 25%, 0.95)"/>
      <stop offset="1" stop-color="hsla(${hue}, 50%, 12%, 1)"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="transparent"/>
  <ellipse cx="${CHAR_W / 2}" cy="${CHAR_H * 0.35}" rx="${CHAR_W * 0.22}" ry="${CHAR_W * 0.28}" fill="hsl(${hue}, 30%, 35%)"/>
  <rect x="${CHAR_W * 0.2}" y="${CHAR_H * 0.55}" width="${CHAR_W * 0.6}" height="${CHAR_H * 0.45}" fill="url(#g)" rx="40"/>
  <text x="50%" y="75%" text-anchor="middle" font-family="sans-serif" font-size="56" font-weight="700" fill="white">${name}</text>
  <text x="50%" y="81%" text-anchor="middle" font-family="sans-serif" font-size="28" fill="rgba(255,255,255,0.7)">${role}</text>
  <text x="50%" y="88%" text-anchor="middle" font-family="sans-serif" font-size="34" fill="rgba(255,220,130,0.9)">${expression}</text>
  <text x="50%" y="94%" text-anchor="middle" font-family="sans-serif" font-size="20" fill="rgba(255,255,255,0.4)">placeholder</text>
</svg>`;
}

function bgSvg({ hue, name }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BG_W}" height="${BG_H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue}, 30%, 20%)"/>
      <stop offset="0.6" stop-color="hsl(${hue}, 25%, 10%)"/>
      <stop offset="1" stop-color="hsl(${hue - 20}, 40%, 6%)"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <g opacity="0.1" stroke="white" stroke-width="2">
    ${Array.from({ length: 20 })
      .map(
        (_, i) =>
          `<line x1="0" y1="${(BG_H * i) / 20}" x2="${BG_W}" y2="${(BG_H * i) / 20}"/>`,
      )
      .join("")}
  </g>
  <text x="50%" y="40%" text-anchor="middle" font-family="sans-serif" font-size="120" font-weight="700" fill="rgba(255,255,255,0.6)">${name}</text>
  <text x="50%" y="46%" text-anchor="middle" font-family="sans-serif" font-size="48" fill="rgba(255,255,255,0.3)">placeholder background</text>
</svg>`;
}

async function writeCharacters() {
  for (const [id, meta] of Object.entries(characters)) {
    const dir = path.join(process.cwd(), "public", "characters", id);
    await mkdir(dir, { recursive: true });
    for (const expression of expressions) {
      const file = path.join(dir, `${expression}.webp`);
      await sharp(Buffer.from(charSvg({ ...meta, expression })))
        .webp({ quality: 82 })
        .toFile(file);
      console.log("wrote", file);
    }
  }
}

async function writeBackgrounds() {
  const dir = path.join(process.cwd(), "public", "backgrounds");
  await mkdir(dir, { recursive: true });
  for (const [id, meta] of Object.entries(backgrounds)) {
    const file = path.join(dir, `${id}.webp`);
    await sharp(Buffer.from(bgSvg(meta)))
      .webp({ quality: 82 })
      .toFile(file);
    console.log("wrote", file);
  }
}

await writeCharacters();
await writeBackgrounds();
