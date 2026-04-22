export type Stat = "gwonmo" | "beopri" | "jikgam" | "ttuksim" | "inmaek" | "yangsim";

export const STAT_LABELS: Record<Stat, string> = {
  gwonmo: "권모",
  beopri: "법리",
  jikgam: "직감",
  ttuksim: "뚝심",
  inmaek: "인맥",
  yangsim: "양심",
};

export const STAT_DESCRIPTIONS: Record<Stat, string> = {
  gwonmo: "조직 정치 해독, 숨은 의도 읽기",
  beopri: "규정·계약·수사 언어",
  jikgam: "거짓말 감지, 위험 조기 경보",
  ttuksim: "협박·접대·장기전을 버티는 힘",
  inmaek: "과거 인연 회수, 부탁하기",
  yangsim: "양날 — 높으면 진실·미영, 낮으면 차상무·재민·김승기에게 동류로 인정",
};

export type SkillCheck = {
  stat: Stat;
  dc: number;
};

export type CheckResult = {
  stat: Stat;
  dc: number;
  roll: number;
  statValue: number;
  total: number;
  success: boolean;
};
