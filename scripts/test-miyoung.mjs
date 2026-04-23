import yaml from "js-yaml";
import fs from "node:fs";

const url =
  process.argv[2] ||
  "https://teat-plum.vercel.app/api/dialogue";
const question = process.argv[3] || "도현 씨 아이폰, 지금 어디 있어요?";

const doc = yaml.load(
  fs.readFileSync("content/scenes/c2-miyoung.yaml", "utf8"),
);
const prompt = doc.nodes["improv-node"].improv.systemPrompt;

const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    npcId: "miyoung",
    systemPrompt: prompt,
    history: [],
    playerLine: question,
  }),
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
