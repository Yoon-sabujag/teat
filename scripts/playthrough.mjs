// Headless playthrough simulator. Walks a script with a fixed choice plan
// and prints each line as it would appear in the DialogueScene UI. For
// improv nodes, hits the running dev server's /api/dialogue endpoint.
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const speakerLabel = {
  npc: "NPC",
  player: "나 ",
  companion: "동행",
  narration: "···",
};

const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  npc: "\x1b[38;5;215m",
  player: "\x1b[38;5;111m",
  companion: "\x1b[38;5;156m",
  narration: "\x1b[38;5;245m",
  effect: "\x1b[38;5;141m",
  end: "\x1b[1;38;5;203m",
  improv: "\x1b[38;5;220m",
};

function loadScript(id) {
  const file = path.join("content", "scripts", `${id}.yaml`);
  return yaml.load(fs.readFileSync(file, "utf8"));
}

function applyEffects(state, effects) {
  let ending = null;
  for (const e of effects ?? []) {
    if (e.kind === "faith") state.faith += e.delta;
    else if (e.kind === "suspicion") state.suspicion += e.delta;
    else if (e.kind === "flag") state.flags[e.key] = e.value;
    else if (e.kind === "end") ending = e.outcome;
  }
  return ending;
}

function printLine(line) {
  const speaker = speakerLabel[line.speaker];
  const color = c[line.speaker] ?? c.reset;
  const expr = line.expression ? c.dim + ` (${line.expression})` + c.reset : "";
  console.log(`  ${color}${c.bold}${speaker}${c.reset}${color}  ${line.text}${c.reset}${expr}`);
  for (const e of line.effects ?? []) {
    console.log(`  ${c.effect}     ↳ ${JSON.stringify(e)}${c.reset}`);
  }
}

async function callImprov({ npcId, systemPrompt, playerLine }) {
  const res = await fetch("http://localhost:3000/api/dialogue", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ npcId, systemPrompt, history: [], playerLine }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function play({ scriptId, plan, npcId }) {
  const script = loadScript(scriptId);
  const state = { nodeId: script.entry, faith: 0, suspicion: 0, flags: {} };
  const planQueue = [...plan];
  let ending = null;

  console.log(`\n${c.bold}━━━ ${scriptId} ━━━${c.reset}`);

  while (!ending) {
    const node = script.nodes[state.nodeId];
    console.log(`\n${c.dim}[node: ${node.id}]${c.reset}`);
    for (const line of node.lines) {
      printLine(line);
      ending = applyEffects(state, line.effects) ?? ending;
      if (ending) break;
    }
    if (ending) break;

    if (node.choices?.length) {
      const step = planQueue.shift();
      if (!step || step.kind !== "choice") {
        throw new Error(`Plan ran out at choice node ${node.id}`);
      }
      const choice = node.choices.find((c) => c.id === step.id);
      if (!choice) throw new Error(`Unknown choice id ${step.id} in ${node.id}`);
      console.log(`  ${c.bold}> 선택:${c.reset} ${choice.label}`);
      ending = applyEffects(state, choice.effects) ?? ending;
      if (ending) break;
      state.nodeId = choice.next;
    } else if (node.improv) {
      const step = planQueue.shift();
      if (!step || step.kind !== "improv") {
        throw new Error(`Plan ran out at improv node ${node.id}`);
      }
      console.log(`  ${c.bold}> 자유입력:${c.reset} ${step.text}`);
      const { reply, usage } = await callImprov({
        npcId,
        systemPrompt: node.improv.systemPrompt,
        playerLine: step.text,
      });
      console.log(`  ${c.improv}NPC (LLM)  ${reply}${c.reset}`);
      console.log(`  ${c.dim}     ↳ tokens: prompt=${usage?.promptTokenCount} reply=${usage?.candidatesTokenCount}${c.reset}`);
      const trigger = node.improv.triggers.find((t) => reply.includes(t.keyword));
      if (trigger) {
        console.log(`  ${c.effect}     ↳ trigger '${trigger.keyword}' → ${trigger.next}${c.reset}`);
        state.nodeId = trigger.next;
      } else {
        console.log(`  ${c.dim}     ↳ no trigger; staying in improv${c.reset}`);
      }
    } else if (node.next) {
      state.nodeId = node.next;
    } else {
      console.log(`  ${c.dim}(node has no continuation; stopping)${c.reset}`);
      break;
    }
  }

  console.log(
    `\n${c.end}=== 결과: ${ending ?? "incomplete"} | faith=${state.faith} suspicion=${state.suspicion} ===${c.reset}`,
  );
  return { ending, state };
}

const scenarios = process.argv.slice(2);
if (scenarios.includes("1")) {
  await play({
    scriptId: "minji-intro",
    npcId: "minji",
    plan: [{ kind: "choice", id: "direct" }],
  });
}
if (scenarios.includes("2")) {
  await play({
    scriptId: "minji-intro",
    npcId: "minji",
    plan: [
      { kind: "choice", id: "warm" },
      { kind: "improv", text: "안녕하세요. 혹시 요즘 일이 잘 안 풀리세요?" },
    ],
  });
}
if (scenarios.includes("3")) {
  const intro = await play({
    scriptId: "minji-intro",
    npcId: "minji",
    plan: [
      { kind: "choice", id: "warm" },
      { kind: "improv", text: "혹시 조상님께서 부르시는 기분 들지 않으세요?" },
      { kind: "choice", id: "push" },
    ],
  });
  if (intro.ending === "success") {
    console.log(`\n${c.bold}--- 민지 입교 성공! 협공 씬으로 ---${c.reset}`);
    await play({
      scriptId: "coop-minji-friend",
      npcId: "minji-friend",
      plan: [
        { kind: "choice", id: "soft" },
        { kind: "choice", id: "close" },
      ],
    });
  }
}
