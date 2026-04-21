# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Teat** (코드네임) — 대화기반 비주얼 시뮬레이션 설교 게임. 플레이어는 "도(道)믿남"이 되어 거리에서 행인에게 접근해 자신의 교단으로 입교시키고, 입교한 신도가 본인의 가족·친구를 데려와 **2대1 협공 설교**로 추가 전도를 하는 바이럴 확산형 게임이다.

**톤**: 한국 인터넷 밈 "도믿남"을 풍자하는 **코미디/부조리극**. 실제 사이비 포교 매뉴얼이 아니라 과장된 패러디임. 대사 작성 시 이 톤을 유지할 것 — 진지한 심리 조작 지침이 되지 않도록 하라.

## Commands

```bash
npm run dev         # 개발 서버 (모바일 뷰포트로 확인)
npm run build       # 프로덕션 빌드
npm run start       # 빌드 실행
npm run lint        # eslint . (Next 16에서 next lint가 제거되므로 ESLint CLI 직접 사용)
npm run typecheck   # tsc --noEmit

node scripts/gen-placeholders.mjs   # 캐릭터 자리 이미지 재생성 (sharp 기반)
```

Gemini API 프록시를 사용하려면 `.env.local`에 `GEMINI_API_KEY`를 설정해야 한다 (`.env.example` 참고). 모델은 `GEMINI_MODEL`로 오버라이드 가능 (기본 `gemini-2.0-flash`).

## 게임 루프 — 세 단계

코드 구조가 이 세 단계를 반영하므로 반드시 먼저 이해할 것.

1. **전도 (1:1)** — `/preach/[npcId]`. 행인 한 명과의 분기형 VN 대화. 성공 시 해당 NPC가 `followers`에 추가되고, 그 NPC의 `relatives`가 모두 `pendingTargets`로 쌓인다.
2. **관리 (N명 동시)** — `/congregation`. 모든 입교한 신도를 대시보드로 본다. 각 신도의 `faith`(맹신도 레벨), 남은 입교 대상 목록이 표시된다. 여기서 Zustand 스토어가 **유일한 진실 공급원**.
3. **협공 (2대1)** — `/coop/[followerId]/[targetId]`. 입교한 신도를 `companion`으로 데리고 그의 가족/친구를 설득하는 VN. 대사 스피커는 `npc`(타겟), `companion`(신도), `player`(플레이어) 세 종류.

성공 조건은 "각 NPC가 자기 가족/친구를 입교시키는 것"이므로, 사실상 **재귀적 전도 그래프**가 게임의 목표 구조다.

## 아키텍처

### 대화 엔진 (Hybrid)

핵심 설계는 **스크립트된 분기 트리 + LLM improv 노드** 하이브리드.

- 모든 대화는 `content/scripts/*.yaml`의 Scene Graph로 작성 (`lib/dialogue-engine/schema.ts`의 Zod 스키마 참조).
- 각 `Node`는 선형 `lines[]`를 재생한 뒤 셋 중 하나로 분기:
  - `choices[]` — 분기 선택지 (메인 게임 플레이)
  - `next` — 다음 노드로 자동 이동 (선형 구간)
  - `improv` — **LLM에게 제어권 이양**. `systemPrompt`로 NPC 페르소나를 주입, `triggers[]`의 키워드가 LLM 응답에 나타나면 다시 스크립트 노드로 복귀.
- `Effect`로 상태 변경: `faith`, `suspicion`, `flag`, `end`(success/flee).
- 런타임은 `lib/dialogue-engine/runner.ts`의 `useSceneRunner` 훅 한 곳에 집중. `DialogueScene` 컴포넌트가 이를 감싼 프레젠테이션 층.

**LLM improv의 관례**: `systemInstruction`은 반드시 (1) NPC 페르소나, (2) 출력 언어(한국어), (3) 트리거 키워드를 응답 끝에 붙이라는 지시를 포함해야 한다. `minji-intro.yaml`의 `warm-open` 노드가 표준 템플릿이다.

**LLM 백엔드**: `/api/dialogue` 라우트는 `@google/genai` SDK를 통해 Gemini를 호출한다. 메시지 role은 Gemini 컨벤션에 따라 `user` / `model` 두 종류 (Anthropic의 `assistant`가 아님). 같은 NPC와 여러 턴이 길어질 경우 [Gemini Caches API](https://ai.google.dev/gemini-api/docs/caching)로 시스템 프롬프트를 캐시할 수 있지만, 현재는 미적용 (페르소나 프롬프트가 짧고 캐시 최소 토큰 임계치를 못 넘기는 경우가 많음).

### 상태 관리

- **서버 측**: NPC 정의와 스크립트는 `content/` 아래 YAML. 페이지가 서버 컴포넌트에서 `loadNpc`/`loadScript`로 읽어 클라이언트에 prop으로 전달. 이 데이터는 **정적 콘텐츠**로 취급 — 저장 상태에 들어가지 않는다.
- **클라이언트 측**: 플레이어 진행 상황(입교한 신도, 각 신도의 `faith`, 남은 타겟)은 `lib/game-state/store.ts`의 Zustand 스토어. `persist` 미들웨어로 **localStorage에 자동 저장** (`teat-save` 키, 버전 1).
- **런너 내부 상태**: `faith`/`suspicion`/`flags`는 한 씬 안에서만 유효한 휘발성 상태로 `useState`에 보관. 씬 종료 시 결과(`success`/`flee`)만 스토어에 커밋.

스토어 스키마를 변경하면 `version`을 올리고 마이그레이션을 작성할 것 — 기존 플레이어의 로컬 세이브가 깨진다.

### 소셜 그래프

`Npc` → `Relative[]`는 현재 2단계만 허용한다 (행인 → 그의 가족/친구). 재귀적으로 가족의 가족까지 확장하려면 `Relative` 타입에 `relatives`를 추가하고 `loadRelative`를 재설계해야 한다. 지금은 **의도적으로 평면 구조**를 유지 중.

### 라우팅

- `app/page.tsx` — 타이틀/메뉴
- `app/preach/page.tsx` — 행인 목록 (인덱스). `listAvailableProspects`가 `content/npcs/*.yaml`을 스캔
- `app/preach/[npcId]/page.tsx` — 1:1 전도 씬 (conversion mode)
- `app/congregation/page.tsx` — 신도 대시보드 (클라이언트 컴포넌트, Zustand 직접 구독)
- `app/coop/[followerId]/[targetId]/page.tsx` — 협공 씬 (coop mode)
- `app/api/dialogue/route.ts` — Gemini API 프록시 (절대 클라이언트에 키 노출 금지)

## 콘텐츠 작성 규칙

### YAML 파일 명명
- `content/npcs/<npcId>.yaml` — NPC 정의. `id`는 파일명과 일치.
- `content/scripts/<scriptId>.yaml` — 대화 스크립트. `id`는 파일명과 일치. 전도용은 `<npcId>-intro`, 협공용은 `coop-<npcId>-<relationId>` 관례 사용.

### 이미지 에셋
- 경로: `public/characters/<npcId>/<expression>.webp`
- `expression` 값은 `lib/dialogue-engine/types.ts`의 `Expression` 유니언과 일치해야 함 (`neutral`, `smile`, `annoyed`, `skeptical`, `entranced`, `afraid`).
- 없는 expression을 참조하면 이미지가 깨지므로 신규 expression 추가 시 타입 먼저 업데이트.
- 이미지는 **사전 생성 (AI 생성 결과물을 저장)**. 런타임 이미지 생성은 사용하지 않는다.
- 현재는 `scripts/gen-placeholders.mjs`로 만든 색상 그라디언트 자리 이미지가 들어있다. **실제 NPC 일러스트로 교체할 때 같은 파일명을 그대로 덮어쓰면 됨.** 새 NPC를 추가하면 `gen-placeholders.mjs`의 `characters` 맵에도 추가하거나, 직접 `public/characters/<npcId>/` 디렉토리를 채울 것.

### 스크립트 작성 시
- 모든 종료 경로에 `{ kind: end, outcome: success | flee }` effect가 있어야 한다. 없으면 씬이 멈춘 상태로 남는다.
- `choices[]`는 최소 2개, 의미 있는 트레이드오프가 있어야 한다 (예: faith+ vs suspicion-).
- Improv 노드는 분기점에만 사용. 메인 플롯은 스크립트로 고정.

## 모바일 우선

- 모든 페이지는 `max-w-md` 이내 폭으로 디자인. 뷰포트는 `userScalable: false`, `viewportFit: "cover"`.
- 터치 타깃 최소 44px (`py-3`/`py-4` 유지).
- `@import "tailwindcss"`를 사용하는 **Tailwind v4** 세팅. v3 문법(`@tailwind base` 등) 사용 금지.

## 저장소 규칙

- 개발 브랜치: `claude/add-claude-documentation-bNGxg` (초기 스캐폴딩 기준). 이후 작업은 별도 feature 브랜치로.
- `.env.local`, `node_modules/`, `.next/`는 커밋 금지 (`.gitignore`로 차단됨).
- 캐릭터 이미지는 아직 없음 — `public/characters/`는 `.gitkeep`만 있음. 새 NPC를 추가하면 해당 `<npcId>/` 디렉토리도 채워야 한다.

## 현 상태

**아직 초기 스캐폴딩 단계**다. 다음 항목들이 비어 있다:

- 실제 캐릭터 일러스트가 없어 `scripts/gen-placeholders.mjs`로 생성한 자리 이미지를 사용 중. 같은 경로에 진짜 webp를 덮어쓰면 자동으로 반영됨.
- 테스트 프레임워크 미설치. 필요하면 Vitest 추가 후 `package.json` 스크립트와 본 문서 업데이트.
- 튜토리얼/세이브 슬롯 UI 없음. `reset()` 액션은 store에 있지만 UI에 노출 안 됨.
- NPC가 민지 한 명뿐. `content/npcs/`에 행인을 더 추가하면 자동으로 `/preach` 인덱스에 잡힌다.
- improv 노드를 실제로 돌리려면 `.env.local`에 `GEMINI_API_KEY`가 있어야 한다 (없으면 그 노드에서 500).
