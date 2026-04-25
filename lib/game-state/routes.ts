/**
 * Derives "route" summaries from the player's flag state. Used by the path
 * view to show (a) a one-line trajectory under each chapter and (b) macro
 * trackers at the top (미영 / 차 상무 / 이수연 / 사건).
 *
 * This module only READS flags — predicates must be read-only and pure.
 */

type FlagValue = boolean | string | number;
type Flags = Record<string, FlagValue>;

export type RouteTone = "neutral" | "warm" | "cold" | "tense" | "dim";

export type ChapterSummary = {
  text: string;
  tone: RouteTone;
};

export type Tracker = {
  label: string;
  value: string;
  tone: RouteTone;
};

// ─────────────── helpers ───────────────

const is = (flags: Flags, key: string): boolean => flags[key] === true;

// ─────────────── per-chapter summaries ───────────────

export function summarizeChapterRoute(
  chapterId: string,
  flags: Flags,
): ChapterSummary | null {
  switch (chapterId) {
    case "prologue": {
      const p = flags.prologue_signing;
      if (p === "clean") return { text: "군말 없이 서명", tone: "cold" };
      if (p === "deferred")
        return { text: "하루 검토 얻어 서명 미룸", tone: "warm" };
      if (p === "forced") return { text: "강제로 서명", tone: "tense" };
      if (p === "reluctantly")
        return { text: "5년 조항 눈치, 그래도 서명", tone: "tense" };
      if (p === "pretended")
        return { text: "5년 조항 모른 척 서명", tone: "cold" };
      if (p === "read_failed")
        return { text: "조항 못 읽고 서명", tone: "dim" };
      if (p === "backed_down")
        return { text: "한 번 밀렸다가 서명", tone: "tense" };
      return null;
    }
    case "chapter-1": {
      if (!is(flags, "accepted_case"))
        return { text: "의뢰 미수락", tone: "cold" };
      const a = flags.c1_acceptance;
      if (a === "negotiated")
        return { text: "수락 · 조건 협상", tone: "warm" };
      if (a === "negotiate_failed")
        return { text: "수락 · 협상 실패", tone: "tense" };
      if (a === "clean") return { text: "수락 · 조건 없이", tone: "neutral" };
      if (is(flags, "reserved_channel"))
        return { text: "수락 · 외부 채널 조항 박음", tone: "warm" };
      return { text: "의뢰 수락", tone: "neutral" };
    }
    case "chapter-2": {
      const bits: string[] = [];
      if (is(flags, "saw_audit_paper")) bits.push("감사 공시 발견");
      if (is(flags, "ghost_visitors")) bits.push("새벽 방문자 확인");
      if (is(flags, "miyoung_full_disclosure")) bits.push("미영 전면 공개");
      else if (is(flags, "miyoung_walked_out")) bits.push("미영 결렬");
      else if (is(flags, "pushed_hard_with_miyoung"))
        bits.push("미영 강압 공개");
      else if (is(flags, "held_back_with_miyoung"))
        bits.push("미영 두 번째 자리 예약");
      else if (is(flags, "miyoung_has_phone")) bits.push("미영 아이폰 확인");
      else if (is(flags, "miyoung_was_there")) bits.push("미영 알리바이 꺾음");
      if (is(flags, "miyoung_hinted_firing_line")) bits.push("해고 라인 시사");
      if (bits.length === 0) return null;
      return {
        text: bits.join(" / "),
        tone: is(flags, "miyoung_walked_out") ? "tense" : "neutral",
      };
    }
    case "chapter-3": {
      const bits: string[] = [];
      if (is(flags, "got_tape")) bits.push("녹음기 확보");
      if (is(flags, "heard_dohyun_legacy_line"))
        bits.push("도현의 유언 한 줄");
      if (is(flags, "heard_monk_line")) bits.push("스님 문장");
      if (is(flags, "dohyun_came_to_confirm")) bits.push("도현의 결단 확인");
      if (bits.length === 0) return { text: "빈손으로 하산", tone: "dim" };
      return {
        text: bits.join(" / "),
        tone: is(flags, "got_tape") ? "warm" : "neutral",
      };
    }
    case "chapter-4": {
      const bits: string[] = [];
      if (is(flags, "tape_duplicated_plan")) bits.push("복제본 계약");
      if (is(flags, "got_shortlist")) bits.push("임원 3명 명단");
      if (is(flags, "knew_security_head")) bits.push("보안실장 이름");
      if (is(flags, "cha_under_watch")) bits.push("차 상무 감시중 확인");
      if (is(flags, "learned_why_chosen")) bits.push("해고 이유 확인");
      if (is(flags, "learned_miyoung_triangle")) bits.push("미영 3선 구조");
      if (bits.length === 0) return null;
      return { text: bits.join(" / "), tone: "warm" };
    }
    case "chapter-5": {
      const r = flags.cha_call_response;
      const tail: string[] = [];
      if (r === "defiant") tail.push("차 상무에 맞불");
      else if (r === "defiant_flinch") tail.push("차 상무에 떨린 맞불");
      else if (r === "compliant") tail.push("차 상무에 수긍");
      else if (r === "silent") tail.push("차 상무 전화 회피");
      if (is(flags, "followed_to_office")) tail.push("미행 감지");
      if (tail.length === 0) return null;
      return {
        text: tail.join(" / "),
        tone: r === "defiant" ? "warm" : "tense",
      };
    }
    case "chapter-6": {
      const d = flags.c6_decision;
      if (d === "expose") return { text: "공개 라인 쪽", tone: "warm" };
      if (d === "leverage") return { text: "지렛대 라인 쪽", tone: "neutral" };
      if (d === "confront")
        return { text: "맨손 대면 라인 쪽", tone: "tense" };
      if (d === "postpone") return { text: "유예 라인 쪽", tone: "dim" };
      return null;
    }
    case "chapter-7": {
      const e = flags.c7_end;
      if (e === "public") return { text: "공개 라인 확정", tone: "warm" };
      if (e === "deal") return { text: "복귀·거래 라인 확정", tone: "cold" };
      if (e === "deal_tainted")
        return { text: "거래 라인 · 기울어진 저울", tone: "tense" };
      if (e === "silence") return { text: "없던 자리로 정리", tone: "dim" };
      if (e === "silence_leak")
        return { text: "침묵 라인 · 문고리 새어나감", tone: "tense" };
      if (e === "defer") return { text: "유예 · 다음 자리로", tone: "neutral" };
      return null;
    }
    case "chapter-8": {
      // C8 routes fan out by c7_end; no new macro toggle worth surfacing.
      const e = flags.c7_end;
      if (!e) return null;
      return { text: "카페 결과에 따른 다리 장", tone: "dim" };
    }
    case "chapter-9": {
      // Endings land via `end` effect, not a flag. Use the upstream c7_end as
      // a stand-in label.
      const e = flags.c7_end;
      if (e) return { text: "엔딩 분기", tone: "cold" };
      return null;
    }
    default:
      return null;
  }
}

// ─────────────── macro trackers (top of page) ───────────────

export function routeTrackers(flags: Flags): Tracker[] {
  const out: Tracker[] = [];

  // 미영
  (() => {
    const bond = flags.miyoung_bond;
    if (bond === "deepened")
      return out.push({
        label: "미영",
        value: "두 번째 자리 · 선 한 번 넘음",
        tone: "warm",
      });
    if (bond === "respected")
      return out.push({
        label: "미영",
        value: "두 번째 자리 · 선 그대로 닫음",
        tone: "warm",
      });
    if (bond === "clean")
      return out.push({
        label: "미영",
        value: "두 번째 자리 · 일정 안 자리로",
        tone: "neutral",
      });
    if (is(flags, "miyoung_walked_out"))
      return out.push({ label: "미영", value: "결렬", tone: "tense" });
    if (is(flags, "miyoung_full_disclosure"))
      return out.push({ label: "미영", value: "전면 공개", tone: "warm" });
    if (is(flags, "pushed_hard_with_miyoung"))
      return out.push({ label: "미영", value: "강압 공개", tone: "tense" });
    if (is(flags, "miyoung_has_phone"))
      return out.push({
        label: "미영",
        value: "핵심 공개 · 두 번째 자리 예약",
        tone: "warm",
      });
    if (is(flags, "miyoung_was_there"))
      return out.push({
        label: "미영",
        value: "알리바이 꺾음",
        tone: "neutral",
      });
    if (is(flags, "held_back_with_miyoung"))
      return out.push({
        label: "미영",
        value: "일찍 접고 다음으로",
        tone: "warm",
      });
    if (is(flags, "miyoung_meeting"))
      return out.push({ label: "미영", value: "미팅 통과만", tone: "dim" });
  })();

  // 차 상무
  (() => {
    const e = flags.c7_end;
    if (e === "public")
      return out.push({ label: "차 상무", value: "공개 통보", tone: "warm" });
    if (e === "deal" || e === "deal_tainted")
      return out.push({
        label: "차 상무",
        value: "복귀 거래",
        tone: e === "deal_tainted" ? "tense" : "cold",
      });
    if (e === "silence" || e === "silence_leak")
      return out.push({
        label: "차 상무",
        value: "없던 자리",
        tone: e === "silence_leak" ? "tense" : "dim",
      });
    if (e === "defer")
      return out.push({ label: "차 상무", value: "유예", tone: "neutral" });
    const d = flags.c6_decision;
    if (d === "expose")
      return out.push({
        label: "차 상무",
        value: "공개 쪽으로 기울어짐",
        tone: "warm",
      });
    if (d === "confront")
      return out.push({
        label: "차 상무",
        value: "맨손 대면 준비",
        tone: "tense",
      });
    if (d === "leverage")
      return out.push({
        label: "차 상무",
        value: "지렛대 준비",
        tone: "neutral",
      });
    if (d === "postpone")
      return out.push({ label: "차 상무", value: "유예 쪽", tone: "dim" });
    if (is(flags, "cha_under_watch"))
      return out.push({
        label: "차 상무",
        value: "감시중 확인",
        tone: "neutral",
      });
  })();

  // 이수연
  (() => {
    const bond = flags.sooyeon_bond;
    if (bond === "deepened")
      return out.push({
        label: "이수연",
        value: "마포 자리 · 같은 라인 사람",
        tone: "warm",
      });
    if (bond === "respected")
      return out.push({
        label: "이수연",
        value: "마포 자리 · 식탁 자세 유지",
        tone: "warm",
      });
    if (bond === "clean")
      return out.push({
        label: "이수연",
        value: "마포 자리 · 동등한 동료",
        tone: "neutral",
      });
    if (is(flags, "tape_duplicated_plan"))
      return out.push({
        label: "이수연",
        value: "복제본 협조",
        tone: "warm",
      });
    if (is(flags, "soo_yeon_offered_inside"))
      return out.push({
        label: "이수연",
        value: "내부 라인 기지 공유",
        tone: "warm",
      });
    if (is(flags, "got_shortlist"))
      return out.push({
        label: "이수연",
        value: "3인 명단 받음",
        tone: "warm",
      });
    if (is(flags, "reserved_channel"))
      return out.push({
        label: "이수연",
        value: "외부 채널 조항으로 확보",
        tone: "neutral",
      });
    if (is(flags, "soo_yeon_calling"))
      return out.push({
        label: "이수연",
        value: "연락 옴 · 응답 미정",
        tone: "dim",
      });
  })();

  // 도현
  (() => {
    if (is(flags, "heard_dohyun_recording"))
      return out.push({
        label: "도현",
        value: "녹음 청취 완료",
        tone: "warm",
      });
    if (is(flags, "got_tape"))
      return out.push({
        label: "도현",
        value: "녹음기 확보 · 미청취",
        tone: "neutral",
      });
    if (is(flags, "dohyun_probably_alive"))
      return out.push({
        label: "도현",
        value: "살아 있을 가능성 있음",
        tone: "warm",
      });
    if (is(flags, "dohyun_came_to_confirm"))
      return out.push({
        label: "도현",
        value: "결단 확인된 사람",
        tone: "neutral",
      });
  })();

  // 나 (내 위치)
  (() => {
    if (is(flags, "knew_pc_named_in_dohyun_chain"))
      return out.push({
        label: "나",
        value: "도현 라인에 이름 박힌 상태 (준혁 확인)",
        tone: "cold",
      });
    if (is(flags, "learned_why_chosen"))
      return out.push({
        label: "나",
        value: "해고가 판의 카드였음을 앎",
        tone: "cold",
      });
    if (is(flags, "miyoung_hinted_firing_line"))
      return out.push({
        label: "나",
        value: "도현의 경고등 자리",
        tone: "cold",
      });
    if (is(flags, "noticed_nda"))
      return out.push({
        label: "나",
        value: "5년 NDA 박힌 상태",
        tone: "tense",
      });
  })();

  // 다음 첫 패 (c5 라인 선택)
  (() => {
    const line = flags.c5_line;
    if (line === "cha")
      return out.push({
        label: "다음 패",
        value: "차 상무 정면",
        tone: "tense",
      });
    if (line === "miyoung")
      return out.push({
        label: "다음 패",
        value: "미영 한 번 더 → 차 상무",
        tone: "warm",
      });
    if (line === "press")
      return out.push({
        label: "다음 패",
        value: "이수연 → 차 상무",
        tone: "warm",
      });
  })();

  // 미행 추적 (c6 사이드)
  (() => {
    if (is(flags, "tail_orders_traced"))
      return out.push({
        label: "미행",
        value: "보안실 → 장 전무 비서실 라인",
        tone: "warm",
      });
    if (is(flags, "tail_was_security_line"))
      return out.push({
        label: "미행",
        value: "본사 보안실 차량",
        tone: "neutral",
      });
  })();

  // 도현 사흘 동선 (c2 사이드)
  (() => {
    if (is(flags, "dohyun_three_day_route"))
      return out.push({
        label: "도현 동선",
        value: "사흘치 확보 (강남 호텔 한 곳 미상)",
        tone: "warm",
      });
  })();

  // 27층 동석 (c7-confrontation)
  (() => {
    if (is(flags, "jang_present"))
      return out.push({
        label: "본사 위쪽",
        value: "장 전무 비서실 라인 동석 확인",
        tone: "tense",
      });
  })();

  return out;
}
