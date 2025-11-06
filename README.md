# AI출근길 (AIDo)

출근길 공무원을 위한 AI 뉴스레터

## 📌 프로젝트 소개

**AI출근길**은 공무원들에게 매일 AI 관련 실전 팁, 지자체 활용 사례, 최신 이슈를 전달하는 일일 뉴스레터 웹페이지입니다.

- 🎯 **대상**: 공무원 및 공공기관 종사자
- 📅 **업데이트**: 매일
- 💡 **콘텐츠**: GPT 실전 팁, 지자체 AI 사례, 핫이슈, 트렌드

## 🚀 빠른 시작

### 방법 1: 수동 업데이트 (기존 방식)

1. `daily-update-prompt.md` 파일의 프롬프트를 복사
2. ChatGPT에 붙여넣고 내용 생성
3. `index.html` 파일의 JavaScript 변수 영역 업데이트

### 방법 2: 자동 생성 웹앱 (새로운 방식) 🆕

#### 1단계: 웹앱 열기

브라우저로 `generator.html` 파일 열기:

```bash
# 로컬에서 직접 열기
start generator.html  # Windows
open generator.html   # macOS
```

또는 GitHub Pages로 접속:
```
https://chrisryugj.github.io/AIDo/generator.html
```

#### 2단계: API 키 설정

1. [Google AI Studio](https://aistudio.google.com/app/apikey)에서 Gemini API 키 발급
2. generator.html의 "API 키" 입력란에 붙여넣기
3. API 키는 브라우저에 자동 저장됨 (다음에 재입력 불필요)

#### 3단계: 콘텐츠 생성

1. 날짜 선택 (기본값: 오늘)
2. 추가 지시사항 입력 (선택사항)
   - 예: "디지털 전환 관련 내용 강조"
   - 예: "예산 편성 시즌에 맞는 팁"
3. "✨ 콘텐츠 생성하기" 버튼 클릭
4. 약 30초~1분 대기

#### 4단계: 결과 적용

생성 완료 후 두 가지 방법 중 선택:

**옵션 A: HTML 복사**
1. "📋 HTML 복사하기" 버튼 클릭
2. `index.html` 파일 열기
3. 전체 내용을 복사한 HTML로 교체
4. 저장

**옵션 B: HTML 다운로드**
1. "💾 HTML 다운로드" 버튼 클릭
2. 다운로드된 파일을 `index.html`로 이름 변경
3. 기존 `index.html` 교체

#### 5단계: Git 푸시 (선택)

```bash
cd AIDo
git add index.html
git commit -m "Update daily content for 2025.XX.XX"
git push
```

## 📁 프로젝트 구조

```
AIDo/
├── index.html              # 메인 뉴스레터 페이지
├── generator.html          # 콘텐츠 자동생성 웹앱 🆕
├── daily-update-prompt.md  # 수동 업데이트 가이드
├── CLAUDE.md              # Claude Code용 프로젝트 가이드
├── images/                # 이미지 파일
│   └── aido-og-image.png
├── 250902.html            # 아카이브 (예시)
├── 250903.html            # NotebookLM 가이드
└── coupon.html            # 쿠폰 페이지
```

## 🎨 주요 기능

### index.html (뉴스레터)
- 📅 오늘 날짜 자동 표시
- 💬 오늘의 한마디 (명언)
- 💡 오늘의 실전 팁 (모달 팝업으로 상세보기)
- 🏛️ 지자체 AI 활용사례
- 🔥 AI 핫이슈
- 📊 오늘의 AI 트렌드 (해시태그 5개)
- 💾 HTML 다운로드 기능

### generator.html (생성기) 🆕
- 🤖 Gemini AI 기반 콘텐츠 자동 생성
- 🔑 API 키 로컬 저장
- 📅 날짜 선택 기능
- 🎯 커스텀 프롬프트 입력
- 👀 생성 결과 미리보기
- 📋 원클릭 복사
- 💾 HTML 다운로드

## 🔧 기술 스택

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **AI**: Google Gemini API (gemini-2.0-flash-exp)
- **Fonts**: GiantsInline (웹폰트)
- **Hosting**: GitHub Pages
- **Analytics**: hitscounter.dev

## 📝 콘텐츠 구조

매일 업데이트되는 콘텐츠는 `index.html`의 JavaScript 변수로 관리됩니다:

```javascript
const currentDate = "2025년 11월 6일 (목)";
const todayQuote = { text: "...", author: "..." };
const todayTip = { title: "...", summary: "...", ... };
const localGovCase = { title: "...", summary: "...", link: "..." };
const hotIssue = { title: "...", summary: "...", link: "..." };
const todayTrends = ["#태그1", "#태그2", ...];
const ogTags = { title: "...", description: "..." };
```

## 🎯 사용 팁

### generator.html 활용 꿀팁

1. **API 키 안전**: API 키는 브라우저 localStorage에만 저장되며, 외부로 전송되지 않습니다
2. **커스텀 프롬프트**: 특정 시즌이나 이슈에 맞춘 콘텐츠 생성 가능
   - 예: "예산 편성 시즌 관련 팁 포함"
   - 예: "챗GPT-4o 신기능 위주로 작성"
3. **미리보기 확인**: 생성 후 미리보기로 품질 확인 후 적용
4. **재생성**: 마음에 들지 않으면 다시 생성 가능 (API 비용 주의)

### 수동 업데이트 팁

- `daily-update-prompt.md` 파일 참고
- 매일 아침 10분 투자로 업데이트 가능
- 프롬프트 엔지니어링으로 품질 향상

## 🔒 보안 주의사항

- ⚠️ **개인정보 업로드 금지**: API에 전송되는 내용은 공개 가능한 내용만
- ⚠️ **API 키 관리**: API 키를 GitHub에 커밋하지 마세요
- ⚠️ **뉴스 링크 검증**: 생성된 링크는 실제 존재하지 않을 수 있음 (수동 확인 필요)

## 📊 API 비용

Gemini API 무료 할당량:
- **무료 티어**: 월 1,500회 요청 (충분함)
- **비용**: 초과 시 요금제 확인 필요
- 자세한 정보: [Google AI Pricing](https://ai.google.dev/pricing)

## 🤝 기여

피드백 및 개선 제안은 언제나 환영합니다!

**문의**: ryuseungin@gwangjin.go.kr

## 📜 라이선스

이 프로젝트는 공공 업무 효율화를 위해 제작되었습니다.

---

**제작**: AI.Do 개친절한 류주임
**업데이트**: 매일
**버전**: 2.0 (자동생성 기능 추가)
