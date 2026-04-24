// Replicate(Flux Kontext) 기반 이미지 생성 파이프라인 스켈레톤.
//
// 환경 변수:
//   REPLICATE_API_TOKEN      — 필수. https://replicate.com/account/api-tokens
//   FLUX_KONTEXT_MODEL       — 선택. 기본 "black-forest-labs/flux-kontext-max".
//
// 실행 모드:
//   node scripts/gen-replicate.mjs reference <characterId>
//       — 캐릭터 1인의 중립 표정 레퍼런스 이미지 1장 생성. public/characters/<id>/neutral.webp 로 저장.
//   node scripts/gen-replicate.mjs expressions <characterId>
//       — 해당 캐릭터의 neutral.webp 를 ref 로 Kontext edit 호출, 나머지 7종 표정 생성.
//   node scripts/gen-replicate.mjs backgrounds
//       — 배경 전체 일괄 생성. public/backgrounds/<file>.webp.
//   node scripts/gen-replicate.mjs all
//       — 모든 캐릭터 reference + expressions + backgrounds (오래 걸림).
//
// **주의**
//   1. 하진(hajin) 캐릭터는 이 파이프라인에서 건너뛴다 (미성년 규칙).
//   2. 기존 placeholder .webp 는 덮어쓰기된다. 원본은 git 히스토리에만 남는다.
//   3. Flux Kontext 의 "edit" 모드에 ref 이미지를 넣는 방식은 모델 버전에 따라
//      input schema 가 다르다 (input_image vs image vs ref_image). 호출 전에
//      replicate.com 에서 최신 파라미터 이름을 확인할 것.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BIBLE_PATH = path.join(ROOT, "content", "character-bible.yaml");
const CHARACTERS_DIR = path.join(ROOT, "public", "characters");
const BACKGROUNDS_DIR = path.join(ROOT, "public", "backgrounds");

const MODEL = process.env.FLUX_KONTEXT_MODEL ?? "black-forest-labs/flux-kontext-max";
const TOKEN = process.env.REPLICATE_API_TOKEN;

const EXPRESSIONS = [
  "neutral",
  "smile",
  "tense",
  "weary",
  "angry",
  "shock",
  "grim",
  "amused",
];

const SKIP_CHARACTERS = new Set(["hajin"]);

async function loadBible() {
  const raw = await fs.readFile(BIBLE_PATH, "utf8");
  return yaml.load(raw);
}

function composeReferencePrompt(char) {
  const parts = [
    `한국인 ${char.age}세`,
    char.build,
    char.face,
    `의상: ${char.outfit_default}`,
    `팔레트: ${char.palette}`,
    `무드: ${char.mood}`,
  ];
  if (char.notes) parts.push(char.notes);
  parts.push("사진풍 인물 포트레이트, 투명/단색 배경, 정면 바스트 샷");
  return parts.join(". ");
}

function composeExpressionPrompt(char, template, displayName) {
  return template.replace(/\{name\}/g, displayName ?? "인물");
}

async function callReplicate({ prompt, imageUrl }) {
  if (!TOKEN) throw new Error("REPLICATE_API_TOKEN 미설정");
  const body = {
    input: {
      prompt,
      aspect_ratio: "3:4",
      ...(imageUrl ? { input_image: imageUrl } : {}),
    },
  };
  const res = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
      prefer: "wait",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Replicate ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  // Flux Kontext 는 보통 string URL 을 반환하지만 배열일 수도 있음.
  const output = Array.isArray(json.output) ? json.output[0] : json.output;
  if (!output) throw new Error(`Replicate 응답에 output 없음: ${JSON.stringify(json)}`);
  return output;
}

async function downloadTo(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`다운로드 실패 ${res.status} — ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buf);
}

async function generateReference(bible, id) {
  if (SKIP_CHARACTERS.has(id)) {
    console.log(`skip ${id} (미성년 규칙)`);
    return null;
  }
  const char = bible.characters[id];
  if (!char) throw new Error(`bible 에 ${id} 없음`);
  const prompt = composeReferencePrompt(char);
  console.log(`[${id}] reference 생성 중…`);
  const url = await callReplicate({ prompt });
  const out = path.join(CHARACTERS_DIR, id, "neutral.webp");
  await downloadTo(url, out);
  console.log(`  → ${path.relative(ROOT, out)}`);
  return url;
}

async function generateExpressions(bible, id) {
  if (SKIP_CHARACTERS.has(id)) return;
  const char = bible.characters[id];
  if (!char) throw new Error(`bible 에 ${id} 없음`);

  // ref 이미지는 이미 로컬 neutral.webp 에 저장되어 있다고 전제. Replicate 는
  // 외부 URL 을 받으므로 업로드 기능이 필요하다. 여기서는 public/ 정적
  // 서빙 가정으로 DEV_BASE_URL 을 읽는다. 프로덕션 실행 시엔 CDN URL 로 교체.
  const base = process.env.DEV_BASE_URL ?? "http://127.0.0.1:3000";
  const refUrl = `${base}/characters/${id}/neutral.webp`;

  for (const exp of EXPRESSIONS) {
    if (exp === "neutral") continue; // 이미 생성됨
    const template = bible.expressions_prompts[exp];
    if (!template) continue;
    const prompt = composeExpressionPrompt(char, template, char.name ?? id);
    console.log(`[${id}] ${exp} 생성 중…`);
    const url = await callReplicate({ prompt, imageUrl: refUrl });
    const out = path.join(CHARACTERS_DIR, id, `${exp}.webp`);
    await downloadTo(url, out);
    console.log(`  → ${path.relative(ROOT, out)}`);
  }
}

async function generateBackgrounds(bible) {
  const bgs = bible.backgrounds ?? {};
  for (const [id, prompt] of Object.entries(bgs)) {
    console.log(`[bg:${id}] 생성 중…`);
    const url = await callReplicate({ prompt: `${prompt}. 영화적 세로 구도, 인물 없음, 시네마틱 조명, 디지털 포토리얼` });
    const out = path.join(BACKGROUNDS_DIR, `${id}.webp`);
    await downloadTo(url, out);
    console.log(`  → ${path.relative(ROOT, out)}`);
  }
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  const bible = await loadBible();

  switch (cmd) {
    case "reference":
      if (!arg) throw new Error("characterId 필요");
      await generateReference(bible, arg);
      break;
    case "expressions":
      if (!arg) throw new Error("characterId 필요");
      await generateExpressions(bible, arg);
      break;
    case "backgrounds":
      await generateBackgrounds(bible);
      break;
    case "all": {
      for (const id of Object.keys(bible.characters)) {
        await generateReference(bible, id);
        await generateExpressions(bible, id);
      }
      await generateBackgrounds(bible);
      break;
    }
    default:
      console.log(
        "사용법: gen-replicate.mjs <reference|expressions|backgrounds|all> [characterId]",
      );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
