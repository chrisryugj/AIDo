# 🤖 AI출근길 자동화 설정 가이드

매일 오전 8시에 자동으로 콘텐츠를 생성하고 Telegram으로 알림을 받는 방법입니다.

## 📋 목차

1. [Telegram Bot 생성](#1-telegram-bot-생성)
2. [GitHub Secrets 설정](#2-github-secrets-설정)
3. [테스트 실행](#3-테스트-실행)
4. [문제 해결](#4-문제-해결)

---

## 1. Telegram Bot 생성

### 1-1. Bot 만들기

1. **Telegram 앱 실행**
   - 스마트폰 또는 PC에서 Telegram 실행
   - 없다면: https://telegram.org/apps 에서 다운로드

2. **BotFather 찾기**
   ```
   검색창에 입력: @BotFather
   ```
   - ✅ 파란색 체크마크가 있는 공식 계정 선택
   - ❌ 비슷한 이름의 가짜 계정 주의!

3. **Bot 생성 명령어 입력**
   ```
   /start
   /newbot
   ```

4. **Bot 이름 입력** (표시될 이름, 자유롭게)
   ```
   AI출근길 알림봇
   ```

5. **Bot 유저네임 입력** (고유 ID, 반드시 'bot'으로 끝나야 함)
   ```
   aido_notify_bot
   ```
   - 이미 사용 중이면 다른 이름 시도: `aido_notify_2024_bot` 등

6. **BOT_TOKEN 복사**
   ```
   Done! Congratulations on your new bot.
   ...
   Use this token to access the HTTP API:
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-1234567
   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   이 부분을 복사!
   ```
   - ⚠️ **메모장에 저장!** 나중에 GitHub Secrets에 입력할 것

### 1-2. Chat ID 얻기

1. **본인의 Bot과 대화 시작**
   - Telegram 검색창에 방금 만든 Bot 유저네임 입력
   - 예: `@aido_notify_bot`
   - "START" 버튼 클릭 또는 `/start` 입력

2. **브라우저에서 Chat ID 확인**
   - 다음 URL을 복사해서 브라우저 주소창에 붙여넣기:
   ```
   https://api.telegram.org/bot여기에토큰붙여넣기/getUpdates
   ```

   **실제 예시:**
   ```
   https://api.telegram.org/bot1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-1234567/getUpdates
   ```

3. **응답에서 Chat ID 찾기**
   - 브라우저에 다음과 같은 JSON이 표시됨:
   ```json
   {
     "ok": true,
     "result": [{
       "message": {
         "chat": {
           "id": 123456789,  ← 이 숫자가 CHAT_ID
           "first_name": "홍길동"
         }
       }
     }]
   }
   ```

   - ⚠️ **`id` 숫자를 메모장에 저장!**

### ✅ 체크리스트

- [ ] BOT_TOKEN 획득: `1234567890:ABC...`
- [ ] CHAT_ID 획득: `123456789`

---

## 2. GitHub Secrets 설정

GitHub 저장소에 환경변수를 안전하게 저장합니다.

### 2-1. GitHub 저장소로 이동

1. 브라우저에서 GitHub 저장소 열기
   ```
   https://github.com/chrisryugj/AIDo
   ```

2. **Settings** 탭 클릭
   - 저장소 상단 메뉴에서 톱니바퀴 모양 아이콘

3. 왼쪽 사이드바에서 **Secrets and variables** → **Actions** 클릭

### 2-2. Secrets 추가

"New repository secret" 버튼을 클릭하여 다음 3개를 추가:

#### Secret 1: GEMINI_API_KEY

```
Name: GEMINI_API_KEY
Secret: 여기에_Gemini_API_키_입력
```

- Gemini API 키가 없다면:
  1. https://aistudio.google.com/app/apikey 접속
  2. "Create API key" 클릭
  3. 생성된 키 복사

#### Secret 2: TELEGRAM_BOT_TOKEN

```
Name: TELEGRAM_BOT_TOKEN
Secret: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-1234567
```

- 1단계에서 복사한 BOT_TOKEN 입력

#### Secret 3: TELEGRAM_CHAT_ID

```
Name: TELEGRAM_CHAT_ID
Secret: 123456789
```

- 1단계에서 복사한 CHAT_ID 입력

### ✅ 체크리스트

- [ ] GEMINI_API_KEY 등록 완료
- [ ] TELEGRAM_BOT_TOKEN 등록 완료
- [ ] TELEGRAM_CHAT_ID 등록 완료

---

## 3. 테스트 실행

자동화가 제대로 작동하는지 테스트합니다.

### 3-1. 수동 실행 테스트

1. **GitHub 저장소 → Actions 탭** 클릭

2. 왼쪽에서 **"Daily Newsletter Generation"** 워크플로우 선택

3. **"Run workflow"** 버튼 클릭
   - 드롭다운에서 `main` 브랜치 선택
   - 녹색 "Run workflow" 버튼 클릭

4. **실행 결과 확인**
   - 워크플로우 실행 시작 (30초 정도 소요)
   - 상단에 새로운 실행 항목 표시
   - 클릭해서 로그 확인

### 3-2. 성공 확인

✅ **성공 시:**
- GitHub Actions에서 모든 단계가 초록색 체크 표시
- Telegram으로 알림 메시지 도착:
  ```
  ✅ AI출근길 자동 생성 성공!

  📅 날짜: 2024년 11월 12일 화요일
  ⏱ 소요시간: 45.2초

  💡 오늘의 팁: ...
  💬 오늘의 한마디: ...

  🔗 확인: https://chrisryugj.github.io/AIDo/
  ```

- `index.html` 파일이 자동으로 업데이트됨
- 새로운 커밋 메시지: `Update daily content for 2024-11-12`

❌ **실패 시:**
- GitHub Actions에서 빨간색 X 표시
- 로그에서 오류 확인
- [문제 해결](#4-문제-해결) 섹션 참고

### 3-3. 자동 스케줄 확인

- 매일 **오전 8시(KST)**에 자동 실행됨
- GitHub Actions 탭에서 매일 실행 기록 확인 가능
- Telegram으로 매일 알림 수신

---

## 4. 문제 해결

### Q1. "GEMINI_API_KEY is not set" 오류

**원인:** GitHub Secrets에 API 키가 없거나 이름이 잘못됨

**해결:**
1. GitHub → Settings → Secrets and variables → Actions
2. `GEMINI_API_KEY`가 정확한 이름으로 등록되어 있는지 확인
3. 없다면 다시 추가

### Q2. Telegram 알림이 오지 않음

**원인 1:** BOT_TOKEN 또는 CHAT_ID가 잘못됨

**해결:**
1. 브라우저에서 다시 확인:
   ```
   https://api.telegram.org/bot여기에토큰/getUpdates
   ```
2. `chat.id` 값이 GitHub Secrets의 TELEGRAM_CHAT_ID와 일치하는지 확인

**원인 2:** Bot과 대화를 시작하지 않음

**해결:**
1. Telegram에서 본인의 Bot 검색
2. "START" 버튼 클릭 또는 `/start` 입력
3. 반드시 메시지를 한 번은 보내야 함

### Q3. "HTTP 403" 또는 Git push 실패

**원인:** GitHub Actions 권한 부족

**해결:**
1. GitHub → Settings → Actions → General
2. "Workflow permissions" 섹션에서
3. ✅ "Read and write permissions" 선택
4. "Save" 버튼 클릭

### Q4. Cron이 실행되지 않음

**원인:** GitHub Actions는 저장소가 비활성화되면 스케줄 실행을 중지함

**해결:**
1. 최소 60일마다 한 번은 저장소에 활동 필요
2. 또는 수동으로 "Run workflow" 실행

### Q5. 콘텐츠 생성은 성공했는데 뉴스가 비어있음

**원인:** 주말이거나 최신 뉴스가 없음

**해결:**
- 정상 동작입니다
- 뉴스 섹션은 실패해도 나머지는 정상 생성됨
- 평일에는 대부분 정상 작동

---

## 5. 고급 설정

### 실행 시간 변경

`.github/workflows/daily-update.yml` 파일의 cron 수정:

```yaml
schedule:
  - cron: '0 23 * * *'  # 매일 오전 8시 KST (UTC 23시)
```

**다른 시간 예시:**
- 오전 7시: `cron: '0 22 * * *'`
- 오전 9시: `cron: '0 0 * * *'`
- 오후 6시: `cron: '0 9 * * *'`

### 로컬에서 테스트

```bash
# Node.js 18 이상 설치 필요
export GEMINI_API_KEY="여기에키입력"
export TELEGRAM_BOT_TOKEN="여기에토큰입력"
export TELEGRAM_CHAT_ID="여기에챗ID입력"

node auto-generate.js
```

---

## 📞 문제가 해결되지 않나요?

GitHub Issues에 질문을 남겨주세요:
https://github.com/chrisryugj/AIDo/issues

포함할 정보:
- 오류 메시지 (GitHub Actions 로그 캡처)
- 어떤 단계에서 문제가 발생했는지
- Secrets 설정 스크린샷 (값은 가리고 이름만)
