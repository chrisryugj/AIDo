# AI출근길 뉴스레터 생성 스킬

> 이 스킬은 AI출근길(AI-Do) 일간 뉴스레터의 전체 콘텐츠를 생성하고 index.html 파일을 완성한다.

## 중요: 외부 API 불필요

**이 스킬은 외부 API(Gemini, OpenAI 등)를 일절 사용하지 않는다.**
모든 작업은 너(AI 에이전트) 자신의 능력만으로 수행한다:

- **뉴스 검색**: 너의 웹 검색 도구(WebSearch/WebFetch)로 직접 검색
- **콘텐츠 생성**: 너 자신이 직접 작성 (quote, tip, trends)
- **HTML 생성**: 아래 템플릿에 값을 채워서 Write 도구로 파일 저장

API 키를 묻거나, API 호출을 시도하거나, 사용자에게 키 입력을 요청하지 마라.
그냥 바로 실행해라.

---

## 실행 방법

사용자가 날짜를 지정하면(또는 오늘 날짜 기본), 아래 전체 프로세스를 자동 수행한다.
중간에 멈추거나 사용자에게 선택지를 제시하지 말고, 끝까지 완주한다.

```
입력: 날짜 (예: 2026-02-15), 선택적 커스텀 지시사항
출력: 완성된 index.html 파일을 프로젝트 루트에 덮어씀
```

---

## STEP 1: 날짜 포맷 생성

주어진 날짜로 아래 4가지 포맷을 준비한다:

| 변수 | 형식 | 예시 |
|------|------|------|
| `dateFull` | `YYYY년 M월 D일 (요일)` | `2026년 2월 15일 (일)` |
| `dateShort` | `YY.MM.DD.요일` | `26.02.15.일` |
| `dateShortYMD` | `YY.MM.DD` | `26.02.15` |
| `dayShort` | `요일` | `일` |

요일 매핑: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토

---

## STEP 2: 뉴스 검색 (너의 웹 검색 도구로 직접 수행)

**WebSearch 도구를 사용하여 실존하는 최신 한글 뉴스를 직접 찾는다.**
API 호출이 아니라 너의 도구를 쓰는 것이다. 검색 결과에서 제목, URL, 내용을 직접 추출한다.

### 2-A: 공공·정부 AI 활용 사례 (localGovCase)

**검색 키워드**: `한국 지자체 공공기관 중앙부처 정부 AI 인공지능 스마트행정 챗봇 디지털전환 활용 도입`

**검색 기간**: 최근 1-2일 (뉴스가 없으면 3-5일 → 1주일로 확대)

**우선 출처** (신뢰도순):
1. `.go.kr` (정부기관 공식)
2. `korea.kr` (정책브리핑)
3. `etnews.com`, `ddaily.co.kr`, `inews24.com`, `zdnet.co.kr`, `aitimes.com`, `yna.co.kr`

**주제**: 지자체/중앙부처/공공기관이 AI를 실무에 도입·활용한 **구체적 사례**

### 2-B: AI 핫이슈 (hotIssue)

**검색 키워드**: `한국 AI 인공지능 신기술 LLM 생성형AI 모델 칩 산업 스타트업 오픈AI 구글 네이버 카카오`

**검색 기간**: 최근 1-2일 (뉴스가 없으면 3-5일 → 1주일로 확대)

**우선 출처** (신뢰도순):
1. `etnews.com` (전자신문)
2. `ddaily.co.kr` (디지털데일리)
3. `aitimes.com` (AI타임스)
4. `inews24.com`, `zdnet.co.kr`, `tech42.co.kr`, `it.chosun.com`

**주제**: 순수 AI 기술·산업 동향 (공공/정부 관련 **제외**)

### 검색 실행 방법

각 섹션에 대해:
1. WebSearch로 키워드 검색 실행
2. 검색 결과에서 한글 뉴스 기사 1건 선택
3. 필요하면 WebFetch로 기사 본문을 읽어서 정확한 제목과 요약 추출
4. title, link, summary를 직접 구성

### 뉴스 검증 규칙 (두 섹션 공통)

- **한글 뉴스만** (영문 기사 제외)
- 제목은 **검색 결과에서 가져온 실제 뉴스 헤드라인** (최소 10자)
- URL은 **검색 결과에서 가져온 실제 링크** (PDF/HWP/문서 파일 URL 제외)
- 요약은 **1-2문장, 최대 2줄** (최소 20자). 너가 기사 내용을 바탕으로 직접 작성
- 요약 관점: 공무원 독자가 왜 이 뉴스에 관심을 가져야 하는지

---

## STEP 3: 콘텐츠 직접 작성 (너가 직접 만든다)

### 3-A: 오늘의 한마디 (quote)

```
text: 공직자에게 위로와 힘을 주는 따뜻한 문구
      힐링되고 마음이 편안해지는 짧고 감성적인 표현 (1-2문장)
author: 반드시 실존하는 유명인의 실명
        예: 스티브 잡스, 빌 게이츠, 헬렌 켈러, 마더 테레사, 넬슨 만델라
        ❌ 금지: "무명 작가", "~이", 가공의 인물
```

### 3-B: 오늘의 실전 팁 (tip)

공무원이 실무에서 바로 활용할 수 있는 AI 활용 팁.

```
title:     간결한 팁 제목
summary:   1-2문장 요약
situation: 개조식 필수 (• 로 시작하는 2-3개 핵심 포인트, 각 1줄)
solution:  개조식 필수 (• 로 시작하는 2-3개 핵심 단계, 각 1줄)
prompt:    복사해서 바로 GPT/AI에 붙여넣을 수 있는 완전한 프롬프트
           여러 줄 가능. [사용자 입력 부분]은 대괄호로 표시
result:    prompt를 실행했을 때의 구체적 예시 출력
           여러 줄 가능. 실제처럼 보이는 구체적 내용
usage:     개조식 필수 (• 로 시작하는 2-3개 업무 적용 팁, 각 1줄)
```

**개조식 형식 예시**:
```
• 장문의 민원 서류 이해에 시간 소요
• 핵심 내용 파악 및 보고서 작성 지연
• 중요 정보 누락 가능성 상존
```

### 3-C: 오늘의 AI 트렌드 (trends)

```
description: AI 트렌드 총평 1-2문장 (최대 3줄)
hashtags:    반드시 정확히 5개. #으로 시작하는 한글 해시태그
             예: ["#공공AI", "#스마트오피스", "#업무자동화", "#AI역량강화", "#공직혁신"]
```

---

## STEP 4: index.html 생성

아래 HTML 템플릿의 `{{플레이스홀더}}`를 STEP 2-3에서 생성한 콘텐츠로 치환하여 `index.html`에 쓴다.

### 이스케이프 규칙

큰따옴표(`"`) 안에 들어가는 값들:
- `\` → `\\`
- `"` → `\"`
- 줄바꿈 → `\n`
- `\r` 제거

백틱(`` ` ``) 안에 들어가는 값 (prompt, result만 해당):
- `\` → `\\`
- `` ` `` → `` \` ``
- `\r` 제거
- 줄바꿈은 그대로 유지

### OG 태그 생성 규칙

```
ogTitle = "AI출근길 ({{dateShortYMD}}.{{dayShort}}) - 공공 AI 실전팁"
ogDescription = "{{tip.summary}}, 지자체 사례·핫이슈 1건씩, 오늘의 한 문장 포함."
```

### HTML 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ogTitle}}</title>

    <!-- OGP -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://chrisryugj.github.io/AIDo/">
    <meta property="og:title" content="{{ogTitle}}">
    <meta property="og:description" content="{{ogDescription}}">
    <meta property="og:image" content="https://chrisryugj.github.io/AIDo/images/aido-og-image.jpg">

    <style>
        @font-face {
            font-family: 'GiantsInline';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2307-1@1.1/Giants-Inline.woff2') format('woff2');
            font-weight: normal;
            font-display: swap;
        }

        @font-face {
            font-family: 'Atomy';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_four@1.0/Atomy-Bold.woff') format('woff');
            font-weight: normal;
            font-display: swap;
        }

        @font-face {
            font-family: 'SimGyeongha';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2202-2@1.0/SimKyungha.woff') format('woff');
            font-weight: normal;
            font-display: swap;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(180deg, hsl(210 20% 98%), hsl(215 25% 96%));
            color: hsl(215 25% 20%);
            min-height: 100vh;
        }

        .header {
            position: relative;
            overflow: hidden;
            background: linear-gradient(135deg, hsl(215 85% 45%), hsl(210 80% 55%));
            color: white;
            padding: 1rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .header-bg {
            position: absolute;
            inset: 0;
            opacity: 0.1;
        }

        .header-bg-circle-1 {
            position: absolute;
            top: 0;
            left: 25%;
            width: 16rem;
            height: 16rem;
            background: white;
            border-radius: 50%;
            filter: blur(60px);
        }

        .header-bg-circle-2 {
            position: absolute;
            bottom: 0;
            right: 25%;
            width: 24rem;
            height: 24rem;
            background: white;
            border-radius: 50%;
            filter: blur(60px);
        }

        .header-content {
            position: relative;
            max-width: 48rem;
            margin: 0 auto;
            text-align: center;
        }

        .date-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.375rem 1rem;
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(8px);
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 1rem;
        }

        .date-download-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1rem;
        }

        .pulse-dot {
            width: 0.5rem;
            height: 0.5rem;
            background: white;
            border-radius: 50%;
            animation: pulse-dot 2s infinite;
        }

        @keyframes pulse-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .title {
            font-family: 'GiantsInline', sans-serif;
            font-size: 2.5rem;
            font-weight: bold;
            margin: 1rem 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }

        .title-icon {
            font-size: 2.5rem;
            line-height: 1;
            display: inline-flex;
            align-items: center;
        }

        @media (min-width: 768px) {
            .title {
                font-size: 3rem;
            }
            .title-icon {
                font-size: 3rem;
            }
        }

        .subtitle {
            font-size: 1rem;
            opacity: 0.95;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }

        .subtitle-line {
            height: 1px;
            width: 3rem;
            background: rgba(255,255,255,0.5);
        }

        .container {
            max-width: 48rem;
            margin: 0 auto;
            padding: 1rem;
        }

        .download-btn {
            position: absolute;
            top: 0;
            right: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.375rem;
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(8px);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s;
            width: 2rem;
            height: 2rem;
        }

        .download-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: scale(1.1);
        }

        .download-btn .icon {
            width: 1rem;
            height: 1rem;
            stroke: white;
        }

        .card {
            background: white;
            padding: 1.25rem;
            border-radius: 1rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            transition: all 0.3s;
        }

        .card:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }

        .quote-card {
            background: linear-gradient(135deg, hsl(215 85% 45%), hsl(210 80% 55%));
            color: white;
            position: relative;
            overflow: hidden;
        }

        .quote-card::before,
        .quote-card::after {
            content: '';
            position: absolute;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
        }

        .quote-card::before {
            width: 8rem;
            height: 8rem;
            top: -4rem;
            right: -4rem;
        }

        .quote-card::after {
            width: 6rem;
            height: 6rem;
            bottom: -3rem;
            left: -3rem;
        }

        .card-title {
            font-family: 'Atomy', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 1.125rem;
            font-weight: bold;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .tip-card {
            border: 2px solid hsla(215 85% 45% / 0.3);
            cursor: pointer;
            position: relative;
            animation: tip-pulse 2s ease-in-out infinite;
        }

        .tip-card:hover {
            border-color: hsla(215 85% 45% / 0.8);
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 8px 24px rgba(33, 110, 243, 0.2);
            animation: tip-shake 0.5s ease-in-out;
        }

        @keyframes tip-pulse {
            0%, 100% {
                box-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 0 0 0 rgba(33, 110, 243, 0.4);
            }
            50% {
                box-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 0 0 8px rgba(33, 110, 243, 0);
            }
        }

        @keyframes tip-shake {
            0%, 100% { transform: translateY(-2px) scale(1.02) rotate(0deg); }
            25% { transform: translateY(-2px) scale(1.02) rotate(-1deg); }
            75% { transform: translateY(-2px) scale(1.02) rotate(1deg); }
        }

        .tip-title {
            font-size: 1rem;
            font-weight: 600;
            color: hsl(215 85% 45%);
            margin-bottom: 0.5rem;
            word-break: keep-all;
        }

        @media (min-width: 768px) {
            .tip-title {
                font-size: 1.125rem;
            }
        }

        .tip-summary {
            font-size: 0.875rem;
            color: hsl(215 15% 50%);
            margin-bottom: 0.5rem;
            word-break: keep-all;
        }

        .tip-link {
            font-size: 0.75rem;
            color: hsl(215 85% 45%);
            font-weight: 500;
        }

        .tip-card:hover .tip-link {
            text-decoration: underline;
        }

        .news-summary {
            font-size: 0.875rem;
            color: hsl(215 15% 50%);
            line-height: 1.5;
            margin-bottom: 0.75rem;
            word-break: keep-all;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .news-link {
            color: hsl(215 85% 45%);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            word-break: keep-all;
        }

        .news-link:hover {
            color: hsl(215 85% 35%);
            text-decoration: underline;
        }

        .trends-desc {
            font-size: 0.875rem;
            color: hsl(215 15% 50%);
            line-height: 1.5;
            margin-bottom: 1rem;
        }

        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .tag {
            padding: 0.5rem 1rem;
            background: hsl(215 100% 96%);
            color: hsl(215 85% 40%);
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
        }

        .footer {
            background: white;
            border-top: 1px solid hsl(215 20% 90%);
            padding: 2rem 1rem;
            margin-top: 0.5rem;
            text-align: center;
        }

        .footer > * {
            text-align: center;
        }

        .footer-text {
            font-size: 0.875rem;
            color: hsl(215 15% 50%);
            margin: 0.5rem 0;
            text-align: center;
        }

        .footer-small {
            font-size: 0.75rem;
            color: hsl(215 15% 50%);
            text-align: center;
        }

        /* 모달 */
        .modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 50;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background: white;
            border-radius: 1rem;
            max-width: 42rem;
            width: 100%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
        }

        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid hsl(215 20% 90%);
        }

        .modal-title {
            font-size: 1.5rem;
            font-weight: bold;
        }

        .modal-body {
            padding: 1.5rem;
            overflow-y: auto;
            max-height: 60vh;
        }

        .modal-section {
            margin-bottom: 1.5rem;
        }

        .modal-section-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: hsl(215 85% 45%);
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .modal-text {
            line-height: 1.6;
        }

        .code-block {
            background: hsl(210 15% 95%);
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid hsl(215 20% 90%);
            font-family: monospace;
            font-size: 0.875rem;
            white-space: pre-wrap;
            line-height: 1.6;
        }

        .result-block {
            background: hsla(215 100% 96% / 0.5);
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid hsla(215 85% 45% / 0.2);
            font-size: 0.875rem;
            white-space: pre-wrap;
            line-height: 1.6;
        }

        .icon {
            width: 1.25rem;
            height: 1.25rem;
        }
    </style>
</head>
<body>
    <!-- ============================================ -->
    <!-- 매일 변경되는 콘텐츠 영역 START -->
    <!-- ============================================ -->
    <script>
        // 날짜 정보 (매일 업데이트)
        const currentDate = "{{dateFull}}";

        // 오늘의 한마디 (매일 교체)
        const todayQuote = {
            text: "{{quote.text}}",
            author: "{{quote.author}}"
        };

        // 오늘의 실전 팁 (매일 새 주제)
        const todayTip = {
            title: "{{tip.title}}",
            summary: "{{tip.summary}}",
            situation: "{{tip.situation}}",
            solution: "{{tip.solution}}",
            prompt: `{{tip.prompt}}`,
            result: `{{tip.result}}`,
            usage: "{{tip.usage}}"
        };

        // 공공·정부 AI 활용 사례
        const localGovCase = {
            title: "{{localGovCase.title}}",
            summary: "{{localGovCase.summary}}",
            link: "{{localGovCase.link}}"
        };

        // AI 핫이슈 (AI 기술·산업)
        const hotIssue = {
            title: "{{hotIssue.title}}",
            summary: "{{hotIssue.summary}}",
            link: "{{hotIssue.link}}"
        };

        // 오늘의 AI 트렌드
        const todayTrendsDescription = "{{trends.description}}";
        const todayTrends = {{trends.hashtags_json}};

        // OG 태그 (매일 업데이트)
        const ogTags = {
            title: "{{ogTitle}}",
            description: "{{ogDescription}}"
        };
    </script>
    <!-- ============================================ -->
    <!-- 매일 변경되는 콘텐츠 영역 END -->
    <!-- ============================================ -->

    <!-- 헤더 -->
    <header class="header">
        <div class="header-bg">
            <div class="header-bg-circle-1"></div>
            <div class="header-bg-circle-2"></div>
        </div>
        <div class="header-content">
            <div class="date-download-wrapper">
                <div class="date-badge">
                    <span class="pulse-dot"></span>
                    <span id="date-display"></span>
                </div>
                <button class="download-btn" onclick="downloadHTML()">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                </button>
            </div>
            <h1 class="title">
                <span>AI출근길</span>
                <span class="title-icon">🚇</span>
            </h1>
            <div class="subtitle">
                <div class="subtitle-line"></div>
                <p>출근길 공무원을 위한 AI 한스푼</p>
                <div class="subtitle-line"></div>
            </div>
        </div>
    </header>

    <!-- 메인 콘텐츠 -->
    <div class="container">
        <!-- 오늘의 한마디 -->
        <div class="card quote-card" style="position: relative; z-index: 1;">
            <div style="position: relative;">
                <h2 class="card-title">
                    <span style="font-size: 1.25rem;">💡</span>
                    오늘의 한마디
                </h2>
                <p id="quote-text" style="font-family: 'SimGyeongha', sans-serif; font-size: 1.125rem; line-height: 1.6; margin-bottom: 0.75rem; font-weight: 500; word-break: keep-all;"></p>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="height: 1px; flex: 1; background: rgba(255,255,255,0.3);"></div>
                    <p id="quote-author" style="font-size: 0.875rem; opacity: 0.95; font-weight: 500;"></p>
                </div>
            </div>
        </div>

        <!-- 오늘의 실전 팁 -->
        <div class="card tip-card" onclick="openModal()">
            <h2 class="card-title">
                <span style="font-size: 1.25rem;">💡</span>
                오늘의 실전 팁
            </h2>
            <h3 class="tip-title" id="tip-title"></h3>
            <p class="tip-summary" id="tip-summary"></p>
            <p class="tip-link">클릭하여 상세 가이드 보기 →</p>
        </div>

        <!-- 공공·정부 AI 활용 사례 -->
        <div class="card" id="local-card" style="cursor: pointer;" onclick="window.open(document.getElementById('local-link').href, '_blank')">
            <h3 class="card-title">
                <span style="font-size: 1.25rem;">🏛️</span>
                공공·정부 AI 활용 사례
            </h3>
            <p class="news-summary" id="local-summary"></p>
            <a class="news-link" id="local-link" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">
                <span id="local-title"></span>
                <span style="font-size: 0.75rem;">↗</span>
            </a>
        </div>

        <!-- AI 핫이슈 (AI 기술·산업) -->
        <div class="card" id="hot-card" style="cursor: pointer;" onclick="window.open(document.getElementById('hot-link').href, '_blank')">
            <h3 class="card-title">
                <span style="font-size: 1.25rem;">🔥</span>
                AI 핫이슈 (AI 기술·산업)
            </h3>
            <p class="news-summary" id="hot-summary"></p>
            <a class="news-link" id="hot-link" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">
                <span id="hot-title"></span>
                <span style="font-size: 0.75rem;">↗</span>
            </a>
        </div>

        <!-- 오늘의 AI 트렌드 -->
        <div class="card">
            <h3 class="card-title">
                <span style="font-size: 1.25rem;">📊</span>
                오늘의 AI 트렌드
            </h3>
            <p class="trends-desc" id="trends-desc"></p>
            <div class="tags" id="trends-tags"></div>
        </div>
    </div>

    <!-- 푸터 -->
    <footer class="footer">
        <div>
            <img src="https://hitscounter.dev/api/hit?url=https%3A%2F%2Fchrisryugj.github.io%2FAIDo%2F&label=AI-Do&icon=book-half&color=%23cc9a06&message=&style=flat&tz=Asia%2FSeoul" alt="조회수">
        </div>
        <p class="footer-text">제작: AI.Do 개친절한 류주임</p>
        <p class="footer-text">문의: ryuseungin@gwangjin.go.kr</p>
        <p class="footer-small">📧 피드백은 언제나 환영합니다!</p>
    </footer>

    <!-- 팁 모달 -->
    <div class="modal" id="tipModal" onclick="closeModal(event)">
        <div class="modal-content" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h2 class="modal-title" id="modal-title"></h2>
            </div>
            <div class="modal-body">
                <div class="modal-section">
                    <h3 class="modal-section-title">
                        <span style="font-size: 1.125rem;">🎯</span> 상황/문제
                    </h3>
                    <p class="modal-text" id="modal-situation"></p>
                </div>

                <div class="modal-section">
                    <h3 class="modal-section-title">
                        <span style="font-size: 1.125rem;">💡</span> 해결방법
                    </h3>
                    <p class="modal-text" id="modal-solution"></p>
                </div>

                <div class="modal-section">
                    <h3 class="modal-section-title">
                        <span style="font-size: 1.125rem;">📝</span> 복붙 가능한 예제 프롬프트
                    </h3>
                    <div class="code-block" id="modal-prompt"></div>
                </div>

                <div class="modal-section">
                    <h3 class="modal-section-title">
                        <span style="font-size: 1.125rem;">✅</span> 실제 결과 예시
                    </h3>
                    <div class="result-block" id="modal-result"></div>
                </div>

                <div class="modal-section">
                    <h3 class="modal-section-title">
                        <span style="font-size: 1.125rem;">💼</span> 업무 적용 팁
                    </h3>
                    <p class="modal-text" id="modal-usage"></p>
                </div>
            </div>
        </div>
    </div>

    <script>
        // 페이지 로드 시 콘텐츠 렌더링
        document.addEventListener('DOMContentLoaded', function() {
            // 날짜
            document.getElementById('date-display').textContent = currentDate;

            // 오늘의 한마디
            document.getElementById('quote-text').textContent = '"' + todayQuote.text + '"';
            document.getElementById('quote-author').textContent = todayQuote.author;

            // 오늘의 실전 팁
            document.getElementById('tip-title').textContent = todayTip.title;
            document.getElementById('tip-summary').textContent = todayTip.summary;

            // 공공·정부 AI 활용 사례
            document.getElementById('local-summary').textContent = localGovCase.summary;
            document.getElementById('local-title').textContent = localGovCase.title;
            document.getElementById('local-link').href = localGovCase.link;

            // AI 핫이슈 (AI 기술·산업)
            document.getElementById('hot-summary').textContent = hotIssue.summary;
            document.getElementById('hot-title').textContent = hotIssue.title;
            document.getElementById('hot-link').href = hotIssue.link;

            // 오늘의 AI 트렌드
            document.getElementById('trends-desc').textContent = todayTrendsDescription;
            const tagsContainer = document.getElementById('trends-tags');
            todayTrends.forEach(function(trend) {
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.textContent = trend;
                tagsContainer.appendChild(tag);
            });

            // OG 태그 업데이트
            document.title = ogTags.title;
            document.querySelector('meta[property="og:title"]').setAttribute('content', ogTags.title);
            document.querySelector('meta[property="og:description"]').setAttribute('content', ogTags.description);
        });

        // 모달 열기
        function openModal() {
            document.getElementById('modal-title').textContent = todayTip.title;
            document.getElementById('modal-situation').textContent = todayTip.situation;
            document.getElementById('modal-solution').textContent = todayTip.solution;
            document.getElementById('modal-prompt').textContent = todayTip.prompt;
            document.getElementById('modal-result').textContent = todayTip.result;
            document.getElementById('modal-usage').textContent = todayTip.usage;
            document.getElementById('tipModal').classList.add('active');
        }

        // 모달 닫기
        function closeModal(event) {
            if (event.target === document.getElementById('tipModal')) {
                document.getElementById('tipModal').classList.remove('active');
            }
        }

        // HTML 다운로드
        function downloadHTML() {
            const htmlContent = document.documentElement.outerHTML;
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
            a.href = url;
            a.download = 'AI출근길_' + dateStr + '.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                document.getElementById('tipModal').classList.remove('active');
            }
        });
    </script>
</body>
</html>
```

---

## STEP 5: 파일 저장 및 완료

**즉시 실행한다. 사용자에게 "진행할까요?" 같은 확인을 구하지 않는다.**

1. 위 HTML의 `{{플레이스홀더}}`를 모두 실제 값으로 치환한다
2. 치환된 완성 HTML을 Write 도구로 `index.html`에 저장한다 (프로젝트 루트)
3. 저장 후 사용자에게 생성된 콘텐츠 요약을 보여준다:
   - 오늘의 한마디: quote.text (quote.author)
   - 오늘의 실전 팁: tip.title
   - 공공·정부 뉴스: localGovCase.title + link
   - AI 핫이슈: hotIssue.title + link
   - 해시태그 5개
4. 사용자 확인 후 git commit & push

---

## 최종 체크리스트

- [ ] 뉴스 2건 모두 **실제 웹 검색**으로 찾은 실존 뉴스인가?
- [ ] 뉴스 URL이 실제 접속 가능한 링크인가?
- [ ] 뉴스 제목이 실제 헤드라인인가? (10자 이상)
- [ ] 뉴스 요약이 1-2문장, 최대 2줄인가? (20자 이상)
- [ ] 한글 뉴스만 수집했는가?
- [ ] quote.author가 실존 유명인인가?
- [ ] tip의 situation/solution/usage가 개조식(•)인가?
- [ ] tip.prompt가 복사 가능한 실제 프롬프트인가?
- [ ] 해시태그가 정확히 5개인가?
- [ ] 이스케이프가 올바르게 적용되었는가? (`"`, `\`, `` ` ``, `\n`)
- [ ] `</script>` 태그가 `<\/script>`로 이스케이프되었는가?
- [ ] OG 태그의 title과 description이 올바른 형식인가?
