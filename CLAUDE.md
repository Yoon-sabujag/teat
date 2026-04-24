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

## 성인 콘텐츠 정책

**이 프로젝트는 성인 누아르 CRPG**다. `/api/dialogue`의 `safetySettings`에서 4개 조정 가능 카테고리(HARASSMENT / HATE_SPEECH / SEXUALLY_EXPLICIT / DANGEROUS_CONTENT) 모두 `BLOCK_NONE`으로 내려져 있다. Gemini 2.5 Flash는 이 상태에서도 **모델 자체의 RLHF로 일부 명시적 묘사는 거부**할 수 있다 — 빈 응답이 자주 오는 씬은 프롬프트를 더 문학적으로 감아서 작성할 것.

### 비타협 규칙

- **하진(14, 주인공 딸)을 포함한 미성년 캐릭터는 어떤 형태의 성적 맥락에도 등장시키지 않는다.** 스크립트·LLM 프롬프트·시사·암시 전부 포함. 이 규칙은 작성자 합의 + Gemini의 하드 필터 양쪽에서 강제된다.
- 성인 캐릭터(미영 28, 이수연 35, 민영 43, 재민 32 등)만 성적·폭력적 맥락의 대상이 될 수 있다.
- NPC 페르소나에 성적 동의·나이를 명시적으로 담아 LLM이 흐름을 잘 따라오게 하라.

## 문체 가이드 — 이게 프로젝트에서 가장 중요한 문서다

이 게임은 대사·내레이션의 **결**로 살아야 한다. 독자는 AI 글인지 사람 글인지 바로 느낀다. 다음 네 가지를 지킬 것.

### 1. AI 냄새 제거

다음 습관들은 전부 **AI tell**이고 프로젝트에서 금지다:

- **두 박자 아포리즘**: *"말 안 하는 이름이 제일 중요한 이름이다."* / *"X는 Y다. Z는 W다."* — 문장이 대구로 똑똑해지려는 순간 멈춰라. 이런 문장 보이면 무조건 뺀다.
- **수정 강조 톤**: 내가 뭘 바꿀 때마다 그 부분이 **도드라지게** 쓰는 습관 (강조 조사 남발, 의미심장한 줄표, "사실은", "오히려") — 바꾼 티가 나면 이미 졌다. 바꾼 문장도 주변 문장과 같은 호흡으로 깔린다.
- **해설 내레이션**: 방금 캐릭터가 한 행동의 의미를 바로 다음 줄에서 작가가 풀이해주는 것. *"차 상무가 먼저 눈을 깔았다."* 다음에 *"이 합의서, 뭔가 있다."* 같은 설명은 삭제. 독자가 스스로 짚게 둔다.
- **과도한 줄표(—)와 말줄임표(…)**: 씬 하나에 줄표 두 번 이상 나오면 리팩터. 말줄임표는 진짜 입이 멎는 순간에만.

### 2. 호흡은 길게, 문장은 이어서

- 씬의 평균 문장 길이를 늘려라. 단문 연발은 멋있어 보이지만 AI 특유의 리듬이다. *"저녁 여섯 시. 창 밖은 어둡다."* 보다 *"창 밖이 이미 어두워진 저녁 여섯 시, 책상 위 결산 자료 철 위로 형광등이 한번 깜박였다 돌아왔다."*
- 쉼표와 관계절을 써서 한 문장 안에서 장면이 움직이게 한다.
- 다만 같은 길이의 문장이 세 줄 이상 이어지면 안 된다. 긴-긴-짧, 짧-긴-긴 식으로 리듬을 깨라.

### 3. 구체성 — 브랜드·거리·시간

- *"호텔 바"* X → *"반얀트리 라운지"* / *"레이크 파크 타워 지하 1층 위스키 바"* O
- *"퇴근 시간"* X → *"여섯 시 사십 분, 서소문 사거리"* O
- *"양주"* X → *"시바스 리갈 18년"* / *"로얄 살루트 21"* O
- *"회식"* X → *"을지로 OB맥주집 2차, 3차는 청담 BKK"* O
- 한국 중년 남성의 물건·장소 레퍼런스 — 결산판, 결재판, 식당 단골, 운전기사, 법인 카드 한도, 사우나 월회비, 정장 재고 개수
- 브랜드는 실명이 자연스러우면 실명 (삼성·SK 급, 현대·기아, LG), 특정하지 말아야 할 땐 "OO그룹"으로 일관되게

### 4. 인물 보이스

각 인물은 **어휘 세트**가 달라야 한다.

- **백승재 (PC, 46)** — 전략기획실 18년. 내레이션은 3인칭에 가까운 1인칭. 업무용 명사 섞어 쓰기 ("정리 중", "라인", "판", "끝단", "결재"). 정서는 회계사적 거리감. 감정 단어 적게.
- **차 상무 (54)** — 회사어 + 인간어 섞이는 순간마다 의도. 존댓말 "승재씨"를 쓰다가 중요한 말에서 "백 실장"으로 호칭 바꾸기. 격식체와 반말 사이 회피형 어미 ("...요, 그게", "...네요, 저는").
- **김승기 (62)** — 재벌 2대 형. 말끝마다 여유. 단정 표현 쓰되 결정은 즉답 피함. "…예요" "…ㅂ니다" 섞음.
- **이수연 (35)** — 시사주간지 기자. 명사형 문장 ("확인 됐어요." "그림이 돼요.") 선호. 욕설 섞이되 기자용 ("씨발"보다는 "참 네").
- **미영 (28)** — 송무 변호사. 단정 회피, "…는 것 같네요" "…로 보입니다" 자주. 논리 닫힌 완결형 문장.
- **재민 (32)** — 흥신소. 드립 섞인 존댓말. "형", "아 진짜" 잦음. 결정적 순간엔 존댓말만 남긴다.
- **준혁 (29)** — 증권맨. 회사어 + 공포. 말이 끊긴다. 장문보단 단문 반복.
- **원장 스님 (60대)** — 후반 등장 예정. 선문답. 직답 금지.

### 5. 성인 누아르 기본 tissue

평범한 씬에도 성인 누아르의 공기를 깔 수 있는 요소를 배경에 배치:

- 음주 (소주 빈 병 개수, 위스키 잔 자국)
- 호텔 / 룸싸롱 / 모텔 언급
- 돈의 단위 구체 (5천, 3억, 경비 실비)
- 담배 (피우는 인물만, 일관되게)
- 늦은 시간의 택시, 라이드 로그
- 피로·수면 부족
- 결혼·별거·이혼의 미시 흔적 (왼손 약지 반지 자국, 딸 카톡 미리보기)
- 성적 암시는 직접 묘사보다 **감각의 전이** (*"향수 냄새가 좌석 벨트에 남아 있었다"*)

### 6. 빈 응답 대응

Gemini가 특정 씬에서 빈 응답(`502: 빈 응답`)을 자주 뱉으면 프롬프트 리팩터 방향:

- 노골적 동사 → 감각 동사 (*"삽입"* → *"몸이 밀려 들어왔다"*)
- 해부학적 지명 → 의복/공간 경유 (*"가슴"* → *"블라우스 단추"*)
- 시제 현재 → 과거 (현재형은 직시성을 끌어올려 차단되기 쉬움)
- 메타 프레임 한 줄 추가 (*"성인 대상 문학 번역 작업"*)

## 현 상태 (문체 재작성 이전)

프롤로그·1장·2장 모두 **단문 AI톤**으로 작성됐고, 위 가이드에 맞춰 전면 재작성이 진행 중 또는 예정이다. 새 씬 쓰기 전에 이 섹션을 다시 읽고, 기존 씬을 고칠 때도 이 기준으로 판단한다.

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

### LLM Improv 노드 (현재 미사용 — 인프라 보존)

노드에 `improv: { npc, systemPrompt, triggers[], suggestions[] }` 설정하면 `lines[]` 이후 자유 입력창이 뜨고 Gemini가 페르소나로 응답한다. 트리거 키워드가 응답에 포함되면 다음 노드로 라우팅.

**현 상태**: 프롤로그·1·2장 전부 **일반 choices로 통일**. Gemini API 의존성이 실제 게임 흐름에선 제거됐다. 이유: (1) Gemini 무료 티어의 429/503/529가 체감상 자주 떨어짐, (2) 현재 시나리오는 선택지 5개로 충분히 분기 가능, (3) "LLM이 내 문장을 각색" 가치는 있지만 그 한 가지 때문에 씬마다 에러 위험을 짊어지는 건 비용 대비 비효율.

**인프라는 남겨둠**. 후반 결정적 씬(7장 차 상무 카페 대면, 원장 스님 선문답, 미영 재회에서의 NSFW 구간)처럼 **각색 가치가 분기 개수보다 클 때만** 선택적으로 다시 사용. 그 씬만 `improv:` 블록 추가하고 나머지는 스크립트로.

**메모리 HUD**: 플레이어는 씬 안에서 "기억" 버튼으로 `pc.memory[]` 누적 로그를 볼 수 있음. 선택지 고를 때 자기가 지금까지 뭘 알아냈는지 확인용. 메모리는 **플레이어에게 보여줄 것**을 전제로 짧게 써야 함 (길면 HUD가 지저분).

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

**프롤로그 ~ 9장 엔딩까지 스크립트 완료**. 플레이 시간 한 회 기준 80-120분 예상.

- 프롤로그부터 9장까지의 모든 씬 YAML 작성됨. 45개 스킬 체크 전체 DC 10-13 범위.
- 세이브 슬롯 3개 + 슬롯 단위 로드/덮어쓰기/지우기 (`lib/game-state/slots.ts`, `app/TitleClient.tsx`).
- 카카오톡 UI 모드 (`Node.mode: kakao`) — 현재는 5장 하진 카톡 씬에만 적용.
- 허브 씬(c2 미영 / c3 암자 / c4 이수연)에 실패 누적 시 열리는 "기지" 선택지 추가.

### 아직 없는 것 / 추후 업데이트 후보

- **실제 이미지** — 캐릭터·배경 전부 회색 그라디언트 플레이스홀더. `content/character-bible.yaml` + `scripts/gen-replicate.mjs` 로 Flux Kontext 파이프라인 준비됨. 실행 블록은 뒷 섹션 참조.
- LLM improv 노드 — 현재는 전 씬 스크립트로 대체. 후반 결정적 씬에서만 선택적 도입 검토 (7장 차 상무 대면 확장 등).
- 메모리 → 시스템 프롬프트 주입 로직 — improv 도입 시에만 필요.
- 다중 엔딩 처리 UI (현재는 단순 배너). 9장 엔딩 6갈래 각각 전용 에필로그 페이지로 이어지는 쪽이 더 좋음.
- 엔딩 후 세이브 슬롯 상태 처리 (현재는 그대로 두고 타이틀로). "끝난 세이브"를 아카이브로 이동하는 플래그 추가 검토.

## 이미지 파이프라인

캐릭터·배경 이미지 생성은 Flux Kontext (Replicate) 기반으로 단계적 생성.

**바이블**: `content/character-bible.yaml`
- 각 캐릭터의 나이·체형·얼굴·기본 의상·팔레트·무드를 고정.
- `expressions_prompts` 8종 표정 변환용 템플릿.
- `backgrounds` 로케이션 프롬프트.
- 하진은 바이블에 있지만 **생성 스킵 대상** (미성년 규칙).

**생성 순서**:
1. `node scripts/gen-replicate.mjs reference <id>` — 캐릭터 중립 표정 1장 생성 → `public/characters/<id>/neutral.webp`.
2. `node scripts/gen-replicate.mjs expressions <id>` — 1번의 neutral.webp 를 ref 로 Kontext edit, 나머지 7종 생성.
3. `node scripts/gen-replicate.mjs backgrounds` — 배경 일괄 생성.
4. `node scripts/gen-replicate.mjs all` — 전부 (오래 걸림, 비용 큼).

**환경 변수**:
- `REPLICATE_API_TOKEN` — replicate.com 토큰.
- `FLUX_KONTEXT_MODEL` — 선택, 기본 `black-forest-labs/flux-kontext-max`.
- `DEV_BASE_URL` — expressions 생성 시 neutral.webp 를 Replicate 가 읽을 수 있어야 하므로 정적 서빙 URL 필요 (프로덕션 CDN 또는 ngrok).

**주의**:
- Replicate 의 input schema 는 모델 버전에 따라 `input_image` / `image` / `ref_image` 로 바뀌므로 `callReplicate` 에서 직접 수정.
- placeholder 덮어쓰기 전 `git stash` 해 두면 PR 에서 비교가 쉽다.
- 캐릭터 하진은 스크립트가 자동으로 skip. 수동 생성도 금지.

## 개발 팁

- 씬 작성 후 `npm run build`로 YAML 파싱 오류 먼저 확인 (런타임에 나는 것보다 빠름)
- 새 씬은 반드시 이전 씬의 마지막 노드에서 `goto` 또는 `chapterComplete`로 연결되도록
- 스킬 체크 밸런싱: DC가 너무 빡빡하면 실패 서사가 지배적이 됨. 처음 플레이에서 70% 체크가 성공하도록 전체 DC 점검
- 실제 이미지로 교체할 때는 플레이스홀더와 **같은 파일명** 유지. 덮어쓰기만 하면 됨
