# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**을지로 7층** (코드네임 `teat`, 저장소 이름은 그대로 둠) — 한국 누아르 **대화 CRPG**.

- 주인공 **백승재(46)**. SK·삼성급 재벌그룹 전략기획실 18년 → 해외사업본부 "실적 부진"으로 명예퇴직 권고. 퇴직금으로 **을지로 3가 낡은 빌딩 7층**에 "백승재 리서치" 사무실. 간판은 시장조사, 실제는 사람 찾기.
- 첫 의뢰: 그룹 부회장 김승기가 실종된 조카 김도현(재벌 3세) 수색을 **개인 명의**로 부탁. 파고들수록 승재 본인의 해고가 같은 사건 라인에 묶여있다.
- **레퍼런스 톤**: 《비밀의 숲》 + 《미생》 + 《내부자들》 + 《시그널》. 중년·음울·조직어.

## Commands

```bash
npm run dev         # 개발 서버 (모바일 뷰포트로 확인)
npm run build       # 프로덕션 빌드
npm run start       # 빌드 실행
npm run lint        # eslint . (Next 16에서 next lint 제거 예정이라 ESLint CLI 직접 사용)
npm run typecheck   # tsc --noEmit

node scripts/gen-placeholders.mjs   # 캐릭터·배경 자리 이미지 재생성 (sharp 기반)
```

`.env.local`:
- `GEMINI_API_KEY` — improv 노드에 필요 (Gemini API 프록시)
- `GEMINI_MODEL` — 기본 `gemini-2.5-flash` (2.0은 신규 키로 호출 불가)

**Thinking 비활성화**: `/api/dialogue` 라우트에서 `thinkingConfig: { thinkingBudget: 0 }`을 강제. 2.5 Flash는 기본이 thinking on이라 그대로 두면 토큰이 thinking에 다 먹혀 본문이 잘림. 플레이어 발언을 LLM이 진짜 깊게 추론해야 하는 노드(예: 7장 차 상무 카페 대면)가 생기면 그 노드만 별도 설정.

## 핵심 구조

게임은 **Campaign → Chapter → Scene → Node → Line**의 위계:

- **Campaign** (`content/campaign.yaml`): 전체 게임의 루트. 챕터 순서 정의.
- **Chapter**: 제목 + 속한 씬 id 목록. 챕터 단위로 "완료" 플래그 기록.
- **Scene** (`content/scenes/<id>.yaml`): 한 장소·상황. 배경·캐스트·노드 그래프.
- **Node**: 한 스크립트 단위. `lines[]` 재생 후 `choices[]` 또는 `next` 또는 `improv`.
- **Line**: 한 대사. `speaker`, `text`, `expression`, `position`, `effects[]`.

### Scene 그래프 DSL 요약

- `speaker`: `"narration"`, `"pc"`, `"thought"`, 또는 NPC id (content/npcs/ 아래 yaml 파일명)
- `expression`: 8종 (`lib/dialogue-engine/types.ts`의 Expression). 이미지 파일명과 일치해야 함
- `position`: `left | center | right | offscreen`
- `effects`: `{ kind: ... }` 형태. Line에도, Choice에도, Check의 success/failure 브랜치에도 달 수 있음

### Effect 종류

| kind | 용도 |
|---|---|
| `stat { target, delta }` | PC 스탯 증감 (0~10 clamp) |
| `flag { key, value }` | 조건부 선택지 열쇠 |
| `memory { text }` | PC 누적 기억. 후반 LLM 컨텍스트 주입용 |
| `goto { scene }` | 다른 씬으로 전이 |
| `chapterComplete { chapter, nextChapter? }` | 챕터 완료 배너 + 다음 챕터 첫 씬으로 전이 |
| `end { outcome }` | 배드 엔딩 처리 (챕터 중단) |

### Choice와 Skill Check

- 일반 선택지: `next` + 옵션 `effects`
- 스킬 체크 선택지: `check: { stat, dc }` + `success: Branch` + `failure: Branch`
  - 체크: `d20 + PC.stats[stat] vs dc`. 실패도 반드시 **다른 결의 결과**가 나오게 설계 (Disco Elysium 철학)
- `requires`: `flag`, `flagEquals`, `flagNotEquals`, `minStat`, `maxStat` — 특정 조건에서만 노출

### Line-level requires — 분기 텍스처의 핵심

**Line에도 `requires`를 달 수 있다.** 조건 안 맞으면 그 라인은 건너뜀 (effects도 안 터짐). 씬 그래프가 여러 분기를 거쳐 같은 노드로 수렴할 때 **수렴 노드 안에서 플레이어가 어떤 경로로 왔는지 반영**하는 용도.

**반드시 지킬 패턴** — 선택지에서 플래그를 심고, 수렴 노드에서 그 플래그로 분기 텍스트를 삽입한다. 안 하면 "뭘 골라도 같은 대사"가 됨:

```yaml
choices:
  - id: accept
    effects: [{ kind: flag, key: c1_acceptance, value: clean }]
  - id: negotiate
    check: { stat: gwonmo, dc: 14 }
    success:
      effects: [{ kind: flag, key: c1_acceptance, value: negotiated }]
    failure:
      effects: [{ kind: flag, key: c1_acceptance, value: negotiate_failed }]

# 수렴 노드
accept:
  lines:
    - speaker: kim-sunggi
      requires: { flagEquals: { key: c1_acceptance, value: negotiated } }
      text: 오늘 조건 추가하신 거, 속상합니다. 다만 그래서 더 믿습니다.
    - speaker: kim-sunggi
      requires: { flagEquals: { key: c1_acceptance, value: negotiate_failed } }
      text: 조정은 어렵습니다. 다만 조심히 움직이세요.
    - speaker: kim-sunggi
      requires: { flagEquals: { key: c1_acceptance, value: clean } }
      text: 고맙습니다, 백 실장님.
```

**안티패턴**: 모든 분기가 같은 수렴 노드로 가고, 그 노드 안에 공통 대사만 있으면 플레이어는 선택한 티가 안 난다. 경로별 1~2줄이라도 다르게.

**플래그 명명**: `<씬id접두>_<결정어>` — `prologue_opening`, `prologue_signing`, `c1_greeting`, `c1_pickup`, `c1_drink`, `c1_response`, `c1_acceptance`. 값은 스네이크케이스 문자열.

### LLM Improv 노드

노드에 `improv: { npc, systemPrompt, triggers[] }` 설정하면 `lines[]` 이후 자유 입력창. 시스템 프롬프트에 페르소나를 주입, `triggers[]`의 키워드가 LLM 응답에 포함되면 다음 노드로 라우팅. 트리거에 `effects`도 부착 가능.

**프롬프트 관례**: (1) 페르소나, (2) 한국어 출력, (3) 트리거 키워드를 응답 끝에 붙이라는 지시. 아직 프롤로그/1장에 improv 노드 없음 — 향후 **차 상무 카페 대면(7장)**, **미영 거짓말(2·3·6장)** 같은 핵심 씬에 투입 예정.

## 상태 관리

- **PC 상태** (`lib/game-state/store.ts`): Zustand + localStorage persist (`euljiro-save` 키, v1)
  - `pc.stats`: 6개 스탯 (`gwonmo`, `beopri`, `jikgam`, `ttuksim`, `inmaek`, `yangsim`). 초기값 2~3.
  - `pc.flags`: 씬 간 공유 플래그 (`accepted_case`, `noticed_nda` 등)
  - `pc.memory`: LLM 컨텍스트용 짧은 텍스트 로그. 후반 차 상무 심문 씬에서 시스템 프롬프트에 주입해 "너 그때 이랬잖아" 연출
  - `currentChapter`, `currentScene`, `history`, `completedChapters`
- **씬 런타임 상태** (`lib/dialogue-engine/runner.ts`): 현재 노드·라인 인덱스. 씬 전환 시 리셋.

스토어 스키마 변경 시 `version` 올리고 마이그레이션 작성 필요.

## 스탯 설계 메모

| 스탯 | 용도 | 낮으면 |
|---|---|---|
| **권모** | 조직 정치 해독, 숨은 의도 | 허풍 감지 실패 |
| **법리** | 계약·규정 언어 | NDA 함정 못 봄 |
| **직감** | 거짓말·위험 감지 | 의뢰인 동기 놓침 |
| **뚝심** | 협박·접대 버티기, 장기전 | 쉽게 합의 |
| **인맥** | 과거 인연 회수 | 재민·박형사 거리감 |
| **양심** | **양날**. 진실·미영 유리 ↔ 차상무·재민·김승기에게 동류 인정 | — |

## 라우팅

- `app/page.tsx` — 타이틀. 세이브 유무 감지 후 "이어서 하기" / "새로 시작"
- `app/play/page.tsx` — 서버 컴포넌트. 모든 씬·NPC·배경 YAML 로드해 `PlayClient`에 주입
- `app/play/PlayClient.tsx` — 현재 씬을 스토어에서 읽어 `SceneView` 렌더. `goto`/`chapterComplete`/`end` 이벤트 처리
- `components/SceneView.tsx` — 배경 레이어 + 캐릭터 스프라이트 컴포지팅 + 대사 박스 + 선택지/입력/체크 결과
- `app/api/dialogue/route.ts` — Gemini API 프록시 (절대 클라이언트에 키 노출 금지)

## 콘텐츠 작성 규칙

### 파일 위치
- `content/campaign.yaml` — 루트
- `content/npcs/<id>.yaml` — NPC 프로필 (id, displayName, role, bio)
- `content/backgrounds/<id>.yaml` — 배경 메타 (id, displayName, file)
- `content/scenes/<id>.yaml` — 씬 그래프

### 이미지 자산
- 캐릭터: `public/characters/<npcId>/<expression>.webp` — **투명 배경** (실제 AI 생성 시). 현재는 플레이스홀더라 그라디언트
- 배경: `public/backgrounds/<file>.webp` — 풀 사이즈 장면 배경
- 표정 8종: `neutral`, `smile`, `tense`, `weary`, `angry`, `shock`, `grim`, `amused`
- 신규 캐릭터·배경 추가 시 `scripts/gen-placeholders.mjs`의 `characters`/`backgrounds` 맵에도 추가 (또는 수동으로 public/ 아래 채우기)

### YAML 주의사항

- **대사 안에 `: ` (콜론+스페이스) 또는 시작 `"` 가 있으면 반드시 단일 따옴표로 감싸기.** js-yaml이 plain scalar로 파싱하다 깨짐. 예:
  - `text: '간판: "백승재 리서치". 간판 밑...'`
  - `text: '"백승재가 을지로에 사무실 낸다"고. 그래서...'`
- 모든 종료 경로에 `end` 또는 `chapterComplete` 있어야 함. 없으면 "다음 ▶" 눌러도 반응 없음
- `choices[]`는 최소 2개, 의미 있는 트레이드오프
- 스킬 체크의 `failure` 브랜치도 **재미있는 결과**가 나오게 (플레이어를 벌하지 말 것)

### 스탯 DC 가이드

- 초보: DC 10~11 (50% 근처 성공)
- 보통: DC 12~13 (30~40%)
- 어려움: DC 14~15 (20%)
- 최고 난이도: DC 16~ (10% 이하)

PC 초기 스탯 2, 최대 10이라 후반으로 갈수록 높은 DC를 뚫을 수 있게 설계.

## 현 상태

**프롤로그 + 1장만 구현됨 (플레이 시간 ~20분 예상)**:

1. **프롤로그 — 그날의 결재판**: 차 상무 앞에서 퇴직 합의서 서명. 3개 스킬 체크 분기 (`gwonmo`, `ttuksim`, `beopri`)
2. **1장 — 을지로에 앉다**: 재민과의 재회 + 김승기 부회장의 의뢰 수락. `accepted_case`, `reserved_channel` 등 플래그 세팅

### 아직 없는 것 (다음 단계)

- 2장 이후 (**도현의 궤적** → **북한산 암자** → … → **9장 엔딩 분기**) 9개 챕터 남음
- LLM improv 노드 — 차 상무 카페 대면(7장), 미영 거짓말(2·3·6장), 원장 스님(3장)에서 도입 예정
- 캐릭터 메모리 → 시스템 프롬프트 주입 로직 (7장 전에 필요)
- **실제 이미지**: 전부 플레이스홀더 (회색 그라디언트 + 라벨). 캐릭터 바이블 확정 후 Replicate(Flux Kontext)로 일괄 생성 예정
- 단톡방 UI (딸 하진과의 대화용 — 다른 씬과 시각 대비)
- 다중 엔딩 처리 UI
- 메인 메뉴에 스탯 리셋 이상의 세이브 슬롯 관리

## 개발 팁

- 씬 작성 후 `npm run build`로 YAML 파싱 오류 먼저 확인 (런타임에 나는 것보다 빠름)
- 새 씬은 반드시 이전 씬의 마지막 노드에서 `goto` 또는 `chapterComplete`로 연결되도록
- 스킬 체크 밸런싱: DC가 너무 빡빡하면 실패 서사가 지배적이 됨. 처음 플레이에서 70% 체크가 성공하도록 전체 DC 점검
- 실제 이미지로 교체할 때는 플레이스홀더와 **같은 파일명** 유지. 덮어쓰기만 하면 됨
