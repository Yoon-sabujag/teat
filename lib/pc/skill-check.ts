import type { CheckResult, SkillCheck, Stat } from "./stats";

export function rollCheck(
  check: SkillCheck,
  stats: Record<Stat, number>,
  rng: () => number = Math.random,
): CheckResult {
  const roll = Math.floor(rng() * 20) + 1;
  const statValue = stats[check.stat] ?? 0;
  const total = roll + statValue;
  return {
    stat: check.stat,
    dc: check.dc,
    roll,
    statValue,
    total,
    success: total >= check.dc,
  };
}
