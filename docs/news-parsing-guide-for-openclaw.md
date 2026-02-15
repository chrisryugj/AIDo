# AI출근길 뉴스 파싱 & 콘텐츠 생성 완전 분석서

> openclaw가 기존 Gemini API 기반 generator.js를 대체하여 뉴스 콘텐츠를 생성하기 위한 기술 문서

---

## 1. 전체 아키텍처 개요

### 1.1 기존 시스템 흐름

```
[사용자 입력: 날짜 + 커스텀 지시사항]
        │
        ▼
[3단계 생성 프로세스]
        │
        ├── 1단계: 기본 섹션 생성 (quote, tip, trends)  ← Gemini API (검색 OFF)
        │
        ├── 2단계: 뉴스 2건 병렬 생성                   ← Gemini API (Google Search 검색 ON)
        │    ├── 공공·정부 AI 활용 사례 (localGovCase)
        │    └── AI 핫이슈 (hotIssue)
        │
        └── 3단계: 최종 병합 → JSON → HTML 템플릿 삽입
                                          │
                                          ▼
                                   [완성된 index.html]
```

### 1.2 openclaw가 대체해야 할 부분

- Gemini API 호출 전체 (callGeminiAPI 함수)
- 뉴스 검색 + 요약 생성 (generateNewsSection 함수)
- 기본 콘텐츠 생성 (generateContent 함수 내 1단계)
- JSON 파싱 로직은 불필요 (openclaw가 직접 구조화된 데이터를 반환하면 됨)

---

## 2. 최종 출력 데이터 구조 (핵심)

openclaw가 생성해야 하는 **최종 JSON 구조**는 다음과 같다:

```json
{
  "quote": {
    "text": "위로와 힘이 되는 따뜻한 문구",
    "author": "실존 유명인 실명"
  },
  "tip": {
    "title": "팁 제목 (간결하게)",
    "summary": "팁 요약 (1-2문장)",
    "situation": "• 핵심포인트1\n• 핵심포인트2\n• 핵심포인트3",
    "solution": "• 단계1\n• 단계2\n• 단계3",
    "prompt": "복사해서 바로 쓸 수 있는 GPT/AI 프롬프트 전문",
    "result": "프롬프트 실행 시 예상 결과 예시",
    "usage": "• 업무적용팁1\n• 업무적용팁2\n• 업무적용팁3"
  },
  "localGovCase": {
    "title": "실제 뉴스 헤드라인",
    "summary": "핵심 요약 1-2문장 (최대 2줄)",
    "link": "https://실제뉴스URL"
  },
  "hotIssue": {
    "title": "실제 뉴스 헤드라인",
    "summary": "핵심 요약 1-2문장 (최대 2줄)",
    "link": "https://실제뉴스URL"
  },
  "trends": {
    "description": "AI 트렌드 설명 1-2문장 (최대 3줄)",
    "hashtags": ["#해시태그1", "#해시태그2", "#해시태그3", "#해시태그4", "#해시태그5"]
  }
}
```

---

## 3. 각 섹션별 상세 파싱 규칙

### 3.1 오늘의 한마디 (quote)

**목적**: 공직자에게 위로와 힘을 주는 따뜻한 문구

| 필드 | 규칙 |
|------|------|
| `text` | 힐링되고 마음이 편안해지는 짧고 감성적인 표현. 부담 없이 읽을 수 있는 수준 |
| `author` | **반드시 실존하는 유명인의 실명만 사용**. 예: 스티브 잡스, 빌 게이츠, 헬렌 켈러, 마더 테레사, 넬슨 만델라. "무명 작가", "~이" 같은 표현 **금지** |

**주의사항**:
- 지나치게 긴 문구 금지 (1-2문장이 적당)
- 실제 해당 인물이 한 말인지 확인 필요

---

### 3.2 오늘의 실전 팁 (tip)

**목적**: 공무원이 실무에서 바로 활용할 수 있는 AI 활용 팁

| 필드 | 규칙 | 형식 |
|------|------|------|
| `title` | 간결한 제목 | 자유 텍스트 |
| `summary` | 1-2문장 요약 | 자유 텍스트 |
| `situation` | 문제 상황 2-3개 핵심 포인트 | **개조식 필수**: `• 포인트1\n• 포인트2` |
| `solution` | 해결방법 2-3개 핵심 단계 | **개조식 필수**: `• 단계1\n• 단계2` |
| `prompt` | 복사해서 바로 GPT에 붙여넣을 수 있는 프롬프트 | 여러 줄 가능. 백틱(\`) 이스케이프 필요 |
| `result` | 프롬프트 실행 시 예상 결과 예시 | 여러 줄 가능. 구체적 예시 형태 |
| `usage` | 업무 적용 팁 2-3개 핵심 포인트 | **개조식 필수**: `• 팁1\n• 팁2` |

**핵심 규칙**:
- `situation`, `solution`, `usage` 세 필드는 **반드시 개조식(bullet list)**으로 작성
- 각 항목은 짧은 한 줄로, 불필요한 서술 금지
- `prompt`는 실제로 복사해서 AI에 입력 가능해야 함
- `result`는 `prompt`를 실행했을 때의 **구체적인 예시** 출력

**팁 주제 다양성 관리** (중복 방지):
- 기존 시스템은 localStorage에 최근 30일간의 팁 제목을 저장 (최대 50개)
- 새로 생성할 때 이전 팁 목록을 프롬프트에 포함하여 중복 방지
- openclaw에서도 이전 생성 이력을 추적하여 동일 주제 반복 방지 필요

---

### 3.3 공공·정부 AI 활용 사례 (localGovCase)

**목적**: 지자체/중앙부처/공공기관의 AI 활용 사례 뉴스

#### 검색 전략

```
검색 키워드: "한국 지자체 공공기관 중앙부처 정부 AI 인공지능 스마트행정 챗봇 디지털전환 활용 도입"
검색 기간: 최근 1-2일 (기본) → 실패 시 3-5일 → 재실패 시 1주일
언어: 한글 뉴스만 (영문 기사 제외)
```

#### 우선 도메인 (신뢰도 순)

| 우선순위 | 도메인 | 비고 |
|----------|--------|------|
| 1 (최우선) | `.go.kr` | 정부기관 공식 사이트 |
| 2 (최우선) | `korea.kr` | 대한민국 정책브리핑 |
| 3 | `etnews.com` | 전자신문 |
| 4 | `ddaily.co.kr` | 디지털데일리 |
| 5 | `inews24.com` | 아이뉴스24 |
| 6 | `zdnet.co.kr` | 지디넷코리아 |
| 7 | `aitimes.com` | AI타임스 |
| 8 | `yna.co.kr` | 연합뉴스 |

#### 출력 형식

| 필드 | 규칙 |
|------|------|
| `title` | 실제 뉴스 헤드라인 (최소 10자 이상, 도메인명만 있으면 안 됨) |
| `summary` | 핵심만 1-2문장 간결하게 (최대 2줄, 최소 20자, 공무원 독자 관점) |
| `link` | 실제 접속 가능한 뉴스 URL |

---

### 3.4 AI 핫이슈 (hotIssue)

**목적**: 순수 AI 기술/산업 뉴스 (공공/정부 관련 제외)

#### 검색 전략

```
검색 키워드: "한국 AI 인공지능 신기술 LLM 생성형AI 모델 칩 산업 스타트업 오픈AI 구글 네이버 카카오"
검색 기간: 최근 1-2일 (기본) → 실패 시 3-5일 → 재실패 시 1주일
언어: 한글 뉴스만 (영문 기사 제외)
```

#### 우선 도메인 (한글 IT 전문 매체)

| 우선순위 | 도메인 | 비고 |
|----------|--------|------|
| 1 (최우선) | `etnews.com` | 전자신문 |
| 2 (최우선) | `ddaily.co.kr` | 디지털데일리 |
| 3 (최우선) | `aitimes.com` | AI타임스 |
| 4 | `inews24.com` | 아이뉴스24 |
| 5 | `zdnet.co.kr` | 지디넷코리아 |
| 6 | `tech42.co.kr` | 테크42 |
| 7 | `it.chosun.com` | IT조선 |

#### 출력 형식

localGovCase와 동일한 구조 (title, summary, link)

#### 핵심 차이: localGovCase vs hotIssue

| | localGovCase | hotIssue |
|---|---|---|
| **주제** | 공공/정부의 AI **도입·활용** 사례 | 순수 AI **기술·산업** 동향 |
| **관점** | "정부가 AI를 어떻게 쓰고 있나" | "AI 업계에서 뭐가 새로운가" |
| **우선 출처** | .go.kr, korea.kr | etnews, ddaily, aitimes |
| **제외 대상** | AI 기술 자체 뉴스 | 공공/정부 AI 뉴스 |

---

### 3.5 오늘의 AI 트렌드 (trends)

| 필드 | 규칙 |
|------|------|
| `description` | 1-2문장으로 간결하게 (최대 3줄). AI 트렌드 총평 |
| `hashtags` | **반드시 정확히 5개**. `#`으로 시작하는 한글 해시태그 배열 |

---

## 4. 뉴스 검증 규칙 (Validation)

### 4.1 URL 검증 (`isValidNewsUrl`)

```
통과 조건:
  ✅ http 또는 https로 시작
  ✅ URL 경로(pathname) 길이 5자 이상
  ✅ Google redirect URL 허용 (vertexaisearch.cloud.google.com/grounding-api-redirect/)

차단 조건:
  ❌ 파일 URL: .pdf, .hwp, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .zip
  ❌ 포털 메인 페이지: naver.com, daum.net, google.com (경로 없는 최상위)
  ❌ 경로 길이 5자 미만 (예: https://example.com/ab)
```

### 4.2 제목 검증 (`isValidNewsTitle`)

```
통과 조건:
  ✅ 최소 10자 이상
  ✅ 실제 뉴스 헤드라인 형태

차단 조건:
  ❌ 5자 미만
  ❌ 도메인명만 있는 경우 (예: "ebn.co.kr", "korea.kr")
  ❌ 정규식: /^[a-z0-9]+\.(co\.kr|kr|com|net|org)$/i
```

### 4.3 요약 검증

```
  ✅ 최소 20자 이상 (15자 미만이면 기본 문장으로 대체)
  ✅ "~에 관한 최신 뉴스입니다" 형태의 fallback 존재
  ✅ 최대 2줄 이내 (-webkit-line-clamp: 2로 표시)
```

### 4.4 중복 검증

```
뉴스 중복 체크:
  - 최근 14일간 사용된 뉴스 title 또는 url이 동일하면 중복으로 판단
  - localStorage에 저장 (최대 100개 유지)

팁 중복 체크:
  - 최근 30일간 사용된 팁 title 확인
  - localStorage에 저장 (최대 50개 유지)
```

---

## 5. 재시도 & 에러 처리 전략

### 5.1 뉴스 검색 재시도

```
시도 1 (기본): 검색 범위 1-2일, 최대 3회 API 호출
시도 2 (1차 재시도): 검색 범위 3-5일
시도 3 (2차 재시도): 검색 범위 1주일
시도 4 이후: 초기화, 다시 1-2일부터

각 시도 내에서도 최대 3회 API 호출 재시도:
  - 필수 정보(제목/URL) 누락 시 재시도
  - URL/제목 검증 실패 시 재시도
  - 중복 뉴스 시 재시도
```

### 5.2 실패 시 placeholder

뉴스 생성 실패 시에도 나머지 콘텐츠는 정상 완성된다:

```json
{
  "title": "⚠️ 뉴스를 찾지 못했습니다",
  "summary": "최근 1-2일 이내 관련 뉴스가 없습니다. 아래 🔄 내용교체 버튼을 눌러 더 넓은 기간에서 검색하세요.",
  "link": "#",
  "_failed": true
}
```

### 5.3 주말 처리

- 토/일요일에는 뉴스가 적으므로 검색 실패 가능성 높음
- 주말 감지 시 로그에 안내 메시지 출력
- 검색 범위 자동 확대 권장

---

## 6. 기존 프롬프트 엔지니어링 분석

### 6.1 기본 콘텐츠 생성 프롬프트 (1단계)

기존 시스템에서 Gemini에게 보내는 프롬프트 원문:

```
공무원 AI 뉴스레터 콘텐츠 생성.
날짜: {dateInfo.full}
지시: {customPrompt} (선택)

quote: 공직자에게 위로와 힘을 주는 따뜻한 문구. 힐링되고 마음이 편안해지는 내용.
       부담 없이 읽을 수 있는 짧고 감성적인 표현.
quote.author: 반드시 실존하는 유명인의 실명만 사용.

tip: 공무원들이 실무에서 바로 활용할 수 있는 AI 실전 팁.
     다양한 주제로 매일 새로운 내용 제공.
tip.situation: 문제 상황을 2-3개 핵심 포인트로 개조식 작성
tip.solution: 해결방법을 2-3개 핵심 단계로 개조식 작성
tip.usage: 업무 적용 팁을 2-3개 핵심 포인트로 개조식 작성
⚠️ situation, solution, usage는 반드시 개조식(bullet list)으로 작성.

trends.description: 1-2문장 간결하게 (최대 3줄)
trends.hashtags: 정확히 5개

⚠️ 최근 다룬 주제 (중복 금지):
1. {이전팁제목1}
2. {이전팁제목2}
...
위 주제들과 완전히 다른 새로운 주제로 생성해주세요.
```

**API 설정**: temperature=0.7, maxOutputTokens=6144, 검색=OFF

### 6.2 뉴스 검색 프롬프트 (2단계)

```
{날짜} 기준 {기간} 이내의 "{검색키워드}" 관련 최신 뉴스를 검색해줘.

다음 형식으로 정확히 1개의 뉴스만 알려줘:
제목: [실제 뉴스 제목]
출처: [언론사명 또는 기관명]
날짜: [발표 날짜]
URL: [뉴스 링크]
요약: [핵심만 1-2문장으로 간결하게, 최대 2줄 이내]

주의사항:
- 반드시 한글 뉴스만 수집 (영문 기사 제외)
- {섹션별 우선 매체 안내}
- 실제 존재하는 뉴스만 알려줘
- 제목은 반드시 실제 뉴스 헤드라인이어야 함
- 요약은 짧고 간결하게 핵심만

⚠️ 최근 사용한 뉴스 (중복 금지):
1. {이전뉴스제목1}
...
위 뉴스들과 다른 새로운 뉴스를 찾아주세요.
```

**API 설정**: temperature=0.3, maxOutputTokens=2048, 검색=ON (Google Search grounding)

### 6.3 뉴스 응답 파싱 (정규식)

기존 시스템은 AI 응답 텍스트에서 정규식으로 정보를 추출했다:

```javascript
const titleMatch = responseText.match(/제목:\s*([^\n]+)/);
const sourceMatch = responseText.match(/출처:\s*([^\n]+)/);
const dateMatch = responseText.match(/날짜:\s*([^\n]+)/);
const urlMatch = responseText.match(/URL:\s*([^\n]+)/);
const summaryMatch = responseText.match(/요약:\s*([^\n]+(?:\n[^\n]+)?)/);
```

→ openclaw에서는 이 정규식 파싱이 불필요. 직접 구조화된 JSON을 반환하면 됨.

### 6.4 추가 요약 생성 프롬프트

뉴스 요약이 30자 미만일 때 추가 호출:

```
"{뉴스 제목}"

위 뉴스를 공무원 독자를 위해 핵심만 간결하게 요약해주세요.
{섹션 컨텍스트}의 관점에서 중요한 점을 강조하되,
1-2문장으로 최대 2줄 이내로만 작성해주세요.
```

**API 설정**: temperature=0.7, maxOutputTokens=256, 검색=OFF

---

## 7. HTML 템플릿 구조

### 7.1 최종 출력 파일 구조

생성된 `index.html`은 완전한 단독 실행 가능한 HTML 파일이다:

```
index.html
├── <head>
│   ├── OG 태그 (title, description, image)
│   ├── 폰트 로드 (GiantsInline, Atomy, SimGyeongha)
│   └── 인라인 CSS (전체 스타일)
├── <body>
│   ├── [콘텐츠 변수 영역] ← JavaScript 변수로 모든 일일 데이터 정의
│   │   ├── currentDate
│   │   ├── todayQuote {text, author}
│   │   ├── todayTip {title, summary, situation, solution, prompt, result, usage}
│   │   ├── localGovCase {title, summary, link}
│   │   ├── hotIssue {title, summary, link}
│   │   ├── todayTrendsDescription
│   │   ├── todayTrends []
│   │   └── ogTags {title, description}
│   ├── [헤더] - 날짜 배지, 타이틀, 다운로드 버튼
│   ├── [카드들]
│   │   ├── 오늘의 한마디 (quote-card)
│   │   ├── 오늘의 실전 팁 (tip-card) → 클릭 시 모달 오픈
│   │   ├── 공공·정부 AI 활용 사례 → 클릭 시 뉴스 링크 오픈
│   │   ├── AI 핫이슈 → 클릭 시 뉴스 링크 오픈
│   │   └── 오늘의 AI 트렌드 (해시태그 5개)
│   ├── [푸터] - 조회수 카운터, 제작자 정보
│   ├── [팁 모달] - 상세 팁 내용 (situation, solution, prompt, result, usage)
│   └── [렌더링 스크립트] - DOMContentLoaded에서 변수 → DOM 바인딩
│   └── [다운로드/모달 기능 스크립트]
```

### 7.2 콘텐츠 변수 삽입 시 이스케이프 규칙

generator.js의 `generateHTML()` 함수에서 문자열 삽입 시 다음 이스케이프를 적용:

```javascript
// 큰따옴표(") 안에 들어가는 값들:
.replace(/\\/g, '\\\\')   // 백슬래시 이스케이프
.replace(/"/g, '\\"')      // 큰따옴표 이스케이프
.replace(/\n/g, '\\n')     // 줄바꿈 이스케이프
.replace(/\r/g, '')         // 캐리지리턴 제거

// 백틱(`) 안에 들어가는 값들 (prompt, result):
.replace(/\\/g, '\\\\')   // 백슬래시 이스케이프
.replace(/`/g, '\\`')      // 백틱 이스케이프
.replace(/\r/g, '')         // 캐리지리턴 제거
```

**중요**: `prompt`와 `result` 필드만 백틱 템플릿 리터럴을 사용 (여러 줄 지원), 나머지는 큰따옴표 문자열.

### 7.3 날짜 포맷

```javascript
formatDate(date) → {
  full: "2025년 12월 1일 (월)",         // currentDate에 사용
  short: "25.12.01.월",                 // OG 태그 제목에 사용
  shortYMD: "25.12.01",                 // 파일명에 사용
  dayShort: "월"                        // 요일 약자
}
```

### 7.4 OG 태그 생성 규칙

```
og:title = "AI출근길 ({shortYMD}.{dayShort}) - 공공 AI 실전팁"
           예: "AI출근길 (25.12.01.월) - 공공 AI 실전팁"

og:description = "{tip.summary}, 지자체 사례·핫이슈 1건씩, 오늘의 한 문장 포함."
```

---

## 8. 뉴스 카드 UI 렌더링 규칙

### 8.1 뉴스 요약 표시

```css
.news-summary {
  -webkit-line-clamp: 2;  /* 최대 2줄까지만 표시 */
  overflow: hidden;
}
```

→ 요약이 아무리 길어도 화면에는 2줄만 보임. 따라서 **요약은 1-2문장으로 충분**.

### 8.2 뉴스 카드 동작

- 카드 전체 클릭 → `window.open(link, '_blank')` (새 탭에서 뉴스 열기)
- 링크 텍스트 클릭 → `event.stopPropagation()` (버블링 방지, 동일 동작)

### 8.3 팁 카드 동작

- 카드 클릭 → 모달 오픈 (situation, solution, prompt, result, usage 표시)
- 모달 내 prompt는 `code-block` 스타일 (monospace, pre-wrap)
- 모달 내 result는 `result-block` 스타일 (pre-wrap)
- ESC 키 또는 배경 클릭으로 모달 닫기

---

## 9. openclaw 구현 시 체크리스트

### 9.1 필수 기능

- [ ] 5개 섹션 모두 생성 (quote, tip, localGovCase, hotIssue, trends)
- [ ] 뉴스 2건은 **실제 존재하는 최신 뉴스** 검색 필수
- [ ] 뉴스 URL은 **실제 접속 가능한 링크** 필수
- [ ] 해시태그는 **정확히 5개** 생성
- [ ] tip의 situation/solution/usage는 **개조식** 형태
- [ ] tip의 prompt는 **복사 가능한 실제 프롬프트**
- [ ] 한글 뉴스만 수집 (영문 기사 제외)

### 9.2 품질 보장

- [ ] 뉴스 제목은 실제 헤드라인 (최소 10자)
- [ ] 뉴스 요약은 최소 20자, 최대 2줄
- [ ] PDF/HWP 등 파일 링크 제외
- [ ] 포털 메인 페이지 링크 제외
- [ ] quote.author는 실존 인물만
- [ ] 이전 생성 콘텐츠와 중복 방지 (최소 14일간 뉴스, 30일간 팁)

### 9.3 생성된 데이터 → HTML 변환

openclaw가 JSON 데이터를 생성하면, 그것을 HTML 템플릿에 삽입해야 한다.
기존 `generateHTML()` 함수(generator.js:818-1588)가 이 역할을 수행한다.

**두 가지 접근법**:
1. openclaw가 JSON만 생성 → 기존 generateHTML() 함수로 HTML 완성
2. openclaw가 완성된 HTML을 직접 생성 (템플릿을 openclaw에게 제공)

### 9.4 뉴스 섹션별 요약 관점

| 섹션 | 요약 관점 |
|------|-----------|
| localGovCase | "지자체 또는 정부기관(중앙부처, 공공기관 포함)이 AI를 실무에 도입/활용한 사례" |
| hotIssue | "순수 AI 신기술, AI 모델 발표, AI 칩, AI 산업 동향, 글로벌 AI 기업 뉴스 (공공/정부 관련 제외)" |

---

## 10. 실제 완성 예시 (index.html에서 추출)

### 10.1 quote 예시

```json
{
  "text": "가장 큰 기쁨은 다른 사람을 위해 뭔가 할 수 있는 기쁨이다. 당신의 작은 헌신이 모여 세상을 더 나은 곳으로 만듭니다.",
  "author": "마더 테레사"
}
```

### 10.2 tip 예시

```json
{
  "title": "복잡한 민원 서류, AI로 3초 만에 핵심 요약!",
  "summary": "장문의 민원 서류나 보고서를 AI로 빠르고 정확하게 핵심만 요약하여 업무 효율을 극대화하는 방법을 알아봅니다.",
  "situation": "• 장문의 민원 서류 이해에 시간 소요\n• 핵심 내용 파악 및 보고서 작성 지연\n• 중요 정보 누락 가능성 상존",
  "solution": "• AI 요약 도구 또는 챗봇 활용\n• 핵심 키워드 추출 및 중요 문장 식별\n• 요약 결과 검토 및 필요시 부분 수정",
  "prompt": "다음 민원 서류 내용을 3가지 핵심 요점과 2가지 건의사항으로 요약하고, 예상 민원인의 주요 감정을 분석해줘: [민원 서류 내용 붙여넣기]",
  "result": "핵심 요점:\n• 교통 인프라 부족으로 인한 출퇴근 불편\n• 인근 공사 소음 및 분진 피해\n• 주민 의견 수렴 절차 미흡 지적\n\n건의사항:\n• 대중교통 노선 확충 및 배차 간격 단축\n• 공사장 소음 저감 대책 마련 및 관리 감독 강화\n\n예상 민원인의 주요 감정:\n• 불만, 피로감, 무시당하는 느낌",
  "usage": "• 방대한 자료 신속 파악 및 보고서 초안 작성\n• 민원인의 숨겨진 의도와 감정 분석에 활용\n• 주요 정책 결정 시 참고 자료로 활용"
}
```

### 10.3 localGovCase 예시

```json
{
  "title": "수원특례시, '2025 지방자치콘텐츠대상' 인공지능·디지털 분야 대상 수상",
  "summary": "수원특례시가 '2025 지방자치콘텐츠대상'에서 인공지능(AI)·디지털 분야 대상을 수상하며 AI 전담조직 신설 및 AI 기반 업무관리 플랫폼, AI 챗봇 구축 등 행정 혁신 성과를 인정받았다.",
  "link": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEb5zbe..."
}
```

### 10.4 hotIssue 예시

```json
{
  "title": "포지큐브, NIPA 고성능컴퓨팅 지원사업 선정…국산 문서파싱 비전언어모델 개발 가속",
  "summary": "생성형 AI 기업 포지큐브가 NIPA 고성능컴퓨팅 지원사업에 선정되어 한글 기반 문서 분석 및 마크다운 자동 생성을 위한 경량 비전언어모델(SVLM) 개발을 가속화한다.",
  "link": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFDqix8G..."
}
```

### 10.5 trends 예시

```json
{
  "description": "최근 공공 부문에서 AI 기반의 스마트 오피스 솔루션 도입이 가속화되고 있습니다. 특히 반복적 업무 자동화와 데이터 분석을 통한 정책 수립 지원 등 AI 활용 범위가 넓어지고 있어, 공직자들의 AI 역량 강화가 더욱 중요해지고 있습니다.",
  "hashtags": ["#공공AI", "#스마트오피스", "#업무자동화", "#AI역량강화", "#공직혁신"]
}
```

---

## 11. 기존 시스템의 알려진 한계점 (openclaw에서 개선 가능)

1. **가짜 URL 문제**: Gemini가 실제로 존재하지 않는 URL을 생성하는 경우 있음. Google Vertex AI Search redirect URL로 우회했으나 완벽하지 않음
2. **뉴스 신선도**: 주말/공휴일에는 뉴스가 적어 검색 실패 빈번
3. **요약 품질**: 때때로 요약이 너무 길거나 짧음. 일관된 1-2문장 유지 어려움
4. **제목 검증 한계**: 도메인명 필터링은 있지만, AI가 만든 가짜 헤드라인을 완벽히 걸러내지 못함
5. **중복 관리**: localStorage 기반이라 브라우저/기기 변경 시 중복 이력 소실

→ openclaw는 웹 검색 결과를 직접 활용할 수 있으므로, URL 신뢰도와 뉴스 헤드라인 정확도를 크게 개선할 수 있을 것으로 기대.

---

## 12. 파일 참조 맵

| 정보 | 파일 | 위치 |
|------|------|------|
| 뉴스 검색 키워드/도메인 설정 | generator.js | 418-433행 |
| 뉴스 검색 프롬프트 | generator.js | 465-479행 |
| 뉴스 응답 파싱 (정규식) | generator.js | 502-513행 |
| URL 검증 함수 | generator.js | 339-373행 |
| 제목 검증 함수 | generator.js | 376-389행 |
| 중복 관리 함수들 | generator.js | 213-273행 |
| 기본 콘텐츠 프롬프트 | generator.js | 660-677행 |
| JSON 파싱 로직 | generator.js | 700-726행 |
| HTML 템플릿 (generateHTML) | generator.js | 818-1588행 |
| 최종 데이터 병합 | generator.js | 789-799행 |
| 완성된 HTML 예시 (실제 출력) | index.html | 전체 |
| 콘텐츠 변수 실제 값 | index.html | 484-537행 |
| 뉴스 섹션 재시도 로직 | generator.js | 1819-1857행 |
| 링크 수정 (editLink) | generator.js | 1650-1786행 |
