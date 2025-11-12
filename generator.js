/**
 * ========================================
 * AI출근길 콘텐츠 생성기 JavaScript
 * ========================================
 *
 * 파일명: generator.js
 * 용도: generator.html의 모든 로직 처리
 *
 * ⚠️ 주의사항:
 * - 이 파일은 generator.html에서만 사용됩니다
 * - localStorage에 API 키와 GitHub 토큰을 저장합니다
 * - Gemini API를 사용하여 콘텐츠를 생성합니다
 * - 생성된 HTML은 index.html 전체 코드를 포함합니다
 *
 * 📦 주요 함수:
 * - addLog(): 로그 메시지 출력
 * - callGeminiAPI(): Gemini API 호출
 * - generateNewsSection(): 뉴스 섹션 생성 (공공·정부 / AI 핫이슈)
 * - generateFullContent(): 전체 콘텐츠 생성 (오늘의 한마디, 팁, 뉴스, 트렌드)
 * - generateHTML(): index.html 전체 코드 생성
 * - pushToGitHub(): GitHub에 직접 푸시
 *
 * 🔧 수정 시 주의할 섹션:
 * 1. 뉴스 수집 설정 (라인 ~800):
 *    - 공공·정부 AI: 지자체/중앙부처/공공기관 AI 활용 사례
 *    - AI 핫이슈: 순수 AI 기술/산업 뉴스 (한글만, 1-2일 이내)
 * 
 * 2. HTML 템플릿 (라인 ~1600-1800):
 *    - generateHTML() 함수 내부에 index.html 전체 구조 포함
 *    - 템플릿 수정 시 백틱(`) 이스케이프 주의
 *
 * 3. 프롬프트 설정 (라인 ~1050):
 *    - AI 응답 품질에 영향을 주는 프롬프트 수정
 *
 * 📝 변경 이력:
 * 2025-11-08: generator.html에서 JavaScript 분리 (파일 크기 최적화)
 * 2025-11-08: 뉴스 섹션 변경 (지자체→공공·정부, 핫이슈→AI기술·산업)
 * 2025-11-08: 뉴스 수집 기간 변경 (1주일→1-2일, 한글만)
 *
 * 🔗 관련 파일:
 * - generator.html: HTML 구조
 * - generator.css: CSS 스타일
 */

        // 로그 함수
        function addLog(message) {
            const logContent = document.getElementById('logContent');
            const timestamp = new Date().toLocaleTimeString('ko-KR');
            const logLine = document.createElement('div');
            logLine.textContent = `[${timestamp}] ${message}`;
            logLine.style.marginBottom = '0.25rem';

            // 에러 메시지는 빨간색으로
            if (message.startsWith('ERROR')) {
                logLine.style.color = 'hsl(0 100% 75%)';
            }

            logContent.appendChild(logLine);

            // 자동 스크롤
            const logContainer = document.getElementById('logContainer');
            logContainer.scrollTop = logContainer.scrollHeight;
        }

        function clearLog() {
            const logContent = document.getElementById('logContent');
            logContent.innerHTML = '로그가 지워졌습니다.';
            addLog('로그 초기화');
        }

        // 팁 미리보기 모달 열기
        function showTipPreview() {
            if (!currentContent || !currentContent.tip) {
                showAlert('팁 내용이 없습니다. 먼저 콘텐츠를 생성해주세요.');
                return;
            }

            const tip = currentContent.tip;

            // Helper function to format long text for better readability
            function formatText(text) {
                if (!text) return '';

                // Split by common sentence endings and add proper spacing
                let formatted = text
                    .replace(/\. /g, '.\n\n')  // Add double line break after periods
                    .replace(/\? /g, '?\n\n')  // Add double line break after question marks
                    .replace(/\! /g, '!\n\n')  // Add double line break after exclamation marks
                    .replace(/: /g, ':\n')     // Add single line break after colons
                    .trim();

                // If text is very long (>300 chars), create summary
                if (formatted.length > 300) {
                    const sentences = formatted.split('\n\n').filter(s => s.trim());
                    if (sentences.length > 3) {
                        // Take first 2 sentences and add summary
                        const preview = sentences.slice(0, 2).join('\n\n');
                        const rest = sentences.slice(2).join(' ');
                        return `${preview}\n\n📌 ${rest}`;
                    }
                }

                return formatted;
            }

            document.getElementById('tipModalTitle').textContent = tip.title;
            document.getElementById('tipModalSummary').textContent = tip.summary;

            // Apply improved formatting to verbose sections
            document.getElementById('tipModalSituation').innerHTML = formatText(tip.situation).replace(/\n/g, '<br>');
            document.getElementById('tipModalSolution').innerHTML = formatText(tip.solution).replace(/\n/g, '<br>');
            document.getElementById('tipModalUsage').innerHTML = formatText(tip.usage).replace(/\n/g, '<br>');

            // Keep prompt and result as-is (they're already formatted)
            document.getElementById('tipModalPrompt').textContent = tip.prompt;
            document.getElementById('tipModalResult').textContent = tip.result;

            document.getElementById('tipPreviewModal').style.display = 'block';
            document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
        }

        // 팁 미리보기 모달 닫기
        function closeTipPreview() {
            document.getElementById('tipPreviewModal').style.display = 'none';
            document.body.style.overflow = 'auto'; // 스크롤 복원
        }

        // API 키 로드
        const savedApiKey = localStorage.getItem('gemini_api_key');
        if (savedApiKey) {
            document.getElementById('apiKey').value = savedApiKey;
        }

        // GitHub Token 로드
        const savedGitHubToken = localStorage.getItem('github_token');
        if (savedGitHubToken) {
            document.getElementById('githubToken').value = savedGitHubToken;
        }

        // GitHub 설정 로드
        const savedGitHubRepo = localStorage.getItem('github_repo');
        if (savedGitHubRepo) {
            document.getElementById('githubRepo').value = savedGitHubRepo;
        }

        const savedGitHubBranch = localStorage.getItem('github_branch');
        if (savedGitHubBranch) {
            document.getElementById('githubBranch').value = savedGitHubBranch;
        }

        const savedGitHubFilePath = localStorage.getItem('github_file_path');
        if (savedGitHubFilePath) {
            document.getElementById('githubFilePath').value = savedGitHubFilePath;
        }

        // GitHub Token 저장
        document.getElementById('githubToken').addEventListener('change', (e) => {
            if (e.target.value.trim()) {
                localStorage.setItem('github_token', e.target.value.trim());
                addLog('GitHub Token이 저장되었습니다.');
            }
        });

        // GitHub 설정 저장
        document.getElementById('githubRepo').addEventListener('change', (e) => {
            if (e.target.value.trim()) {
                localStorage.setItem('github_repo', e.target.value.trim());
            }
        });

        document.getElementById('githubBranch').addEventListener('change', (e) => {
            if (e.target.value.trim()) {
                localStorage.setItem('github_branch', e.target.value.trim());
            }
        });

        document.getElementById('githubFilePath').addEventListener('change', (e) => {
            if (e.target.value.trim()) {
                localStorage.setItem('github_file_path', e.target.value.trim());
            }
        });

        // 오늘 날짜 설정 (로컬 시간대 기준)
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('date').value = `${year}-${month}-${day}`;

        // API 키 저장
        document.getElementById('apiKey').addEventListener('change', (e) => {
            localStorage.setItem('gemini_api_key', e.target.value);
        });

        // 날짜 포맷 함수
        function formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const dayOfWeek = days[date.getDay()];

            return {
                full: `${year}년 ${parseInt(month)}월 ${parseInt(day)}일 (${dayOfWeek})`,
                short: `${String(year).slice(2)}.${month}.${day}.${dayOfWeek}`,
                shortYMD: `${String(year).slice(2)}.${month}.${day}`,
                dayShort: dayOfWeek
            };
        }

        // ========================================
        // 중복 방지 관리 함수들
        // ========================================

        // 이전 팁 가져오기 (최근 30일)
        function getPreviousTips() {
            const stored = localStorage.getItem('previous_tips');
            if (!stored) return [];

            const tips = JSON.parse(stored);
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

            // 30일 이내 팁만 필터링
            return tips.filter(tip => tip.timestamp > thirtyDaysAgo);
        }

        // 새 팁 저장
        function saveTip(title, summary) {
            const tips = getPreviousTips();
            tips.push({
                title: title,
                summary: summary,
                timestamp: Date.now()
            });

            // 최근 50개만 유지
            const recentTips = tips.slice(-50);
            localStorage.setItem('previous_tips', JSON.stringify(recentTips));
        }

        // 이전 뉴스 가져오기 (최근 14일)
        function getPreviousNews() {
            const stored = localStorage.getItem('previous_news');
            if (!stored) return [];

            const news = JSON.parse(stored);
            const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);

            // 14일 이내 뉴스만 필터링
            return news.filter(item => item.timestamp > fourteenDaysAgo);
        }

        // 새 뉴스 저장
        function saveNews(title, url) {
            const news = getPreviousNews();
            news.push({
                title: title,
                url: url,
                timestamp: Date.now()
            });

            // 최근 100개만 유지
            const recentNews = news.slice(-100);
            localStorage.setItem('previous_news', JSON.stringify(recentNews));
        }

        // 뉴스 중복 체크
        function isDuplicateNews(title, url) {
            const previousNews = getPreviousNews();
            return previousNews.some(item =>
                item.url === url || item.title === title
            );
        }

        // 알림 표시
        function showAlert(message, type = 'error') {
            const container = document.getElementById('alertContainer');
            const alert = document.createElement('div');
            alert.className = `alert alert-${type}`;
            alert.textContent = message;
            container.innerHTML = '';
            container.appendChild(alert);

            setTimeout(() => {
                alert.remove();
            }, 5000);
        }

        // ========================================
        // 헬퍼 함수들
        // ========================================

        /**
         * 뉴스 검색 및 요약 생성 로직 (v3.3 - AI 응답 텍스트 파싱 방식)
         *
         * [핵심 변경사항]
         * Grounding metadata의 제목이 도메인명만 반환하는 문제를 해결하기 위해
         * AI 응답 텍스트에서 직접 정보를 추출하는 방식으로 전환
         *
         * 1. 검색 전략:
         *    - 자연스러운 한글 키워드로 검색 (site: 연산자 제거)
         *    - 공공·정부: "한국 지자체 공공기관 중앙부처 정부 AI 인공지능 스마트행정 챗봇 디지털전환 활용 도입"
         *    - 핫이슈: "한국 AI 인공지능 신기술 LLM 생성형AI 모델 칩 산업 스타트업"
         *    - 기간: 최근 1-2일 (한글 뉴스만)
         *
         * 2. 정보 추출 프로세스:
         *    - AI에게 구조화된 형식으로 응답 요청 (제목/출처/URL/요약)
         *    - 정규식으로 응답 텍스트에서 정보 파싱
         *    - Grounding chunks에서 redirect URL 매칭
         *    - 추출된 정보 검증
         *
         * 3. URL 처리:
         *    - AI가 제공한 URL을 기본값으로 사용
         *    - Grounding chunks에서 redirect URL 찾기
         *    - Google redirect URL 허용
         *
         * 4. 요약 생성:
         *    - AI가 처음부터 요약 제공시 그대로 사용
         *    - 요약이 없거나 짧으면 추가 생성
         *    - Fallback: 제목 기반 기본 문장
         *
         * 5. 검증 체크:
         *    - 제목: 도메인명 제외, 최소 10자
         *    - URL: PDF/HWP 파일 제외
         *    - 요약: 최소 20자
         *
         * 6. 재시도 로직:
         *    - 최대 3회 재시도
         *    - 필수 정보 누락시 재시도
         *    - 검증 실패시 재시도
         *
         * 7. 성능:
         *    - Temperature: 0.3 (일관성 우선)
         *    - MaxTokens: 2048 (충분한 응답)
         *    - 예상 시간: 40-60초
         */

        // 링크 유효성 검증
        function isValidNewsUrl(url) {
            if (!url || !url.startsWith('http')) return false;

            // PDF, HWP 등 파일 차단 (뉴스 아님!)
            const fileExtensions = ['.pdf', '.hwp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip'];
            if (fileExtensions.some(ext => url.toLowerCase().includes(ext))) {
                return false;
            }

            // Google redirect URL은 실제로 작동하므로 허용!
            if (url.includes('vertexaisearch.cloud.google.com/grounding-api-redirect/')) {
                return true; // 허용!
            }

            // 포털 메인 페이지는 제외
            const mainPages = [
                'https://naver.com', 'https://www.naver.com',
                'https://daum.net', 'https://www.daum.net',
                'https://google.com', 'https://www.google.com'
            ];

            if (mainPages.some(page => url === page || url === page + '/')) {
                return false;
            }

            // 최소 경로 길이 체크
            try {
                const urlObj = new URL(url);
                if (urlObj.pathname.length < 5) return false;
            } catch {
                return false;
            }

            return true;
        }

        // 제목 유효성 검증 (도메인명만 있는 경우 제외)
        function isValidNewsTitle(title) {
            if (!title || title.trim().length < 5) return false;

            // 도메인명만 있는 경우 (예: "ebn.co.kr", "korea.kr")
            const domainOnlyPattern = /^[a-z0-9]+\.(co\.kr|kr|com|net|org)$/i;
            if (domainOnlyPattern.test(title.trim())) {
                return false;
            }

            // 너무 짧은 제목 제외
            if (title.trim().length < 10) return false;

            return true;
        }

        // Gemini API 공통 호출 함수
        async function callGeminiAPI(apiKey, prompt, useSearch = true, temperature = 0.5, maxTokens = 8192) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    ...(useSearch && { tools: [{ googleSearch: {} }] }),
                    generationConfig: {
                        temperature: temperature,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: maxTokens
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'API 호출 실패');
            }

            return await response.json();
        }

        // 뉴스 섹션 독립 생성 (병렬 호출 가능) - AI 응답 텍스트 파싱 방식 v3.3
        async function generateNewsSection(apiKey, section, dateInfo, maxRetries = 3, dateRangeDays = 2) {
            const config = {
                localGovCase: {
                    name: '공공·정부 AI 활용 사례',
                    searchKeywords: '한국 지자체 공공기관 중앙부처 정부 AI 인공지능 스마트행정 챗봇 디지털전환 활용 도입',
                    summaryContext: '지자체 또는 정부기관(중앙부처, 공공기관 포함)이 AI를 실무에 도입/활용한 사례',
                    validDomains: ['.go.kr', 'korea.kr', 'etnews.com', 'ddaily.co.kr', 'inews24.com', 'zdnet.co.kr', 'aitimes.com', 'yna.co.kr'],
                    preferredDomains: ['.go.kr', 'korea.kr'] // 우선순위 도메인
                },
                hotIssue: {
                    name: 'AI 핫이슈 (AI 기술·산업)',
                    searchKeywords: '한국 AI 인공지능 신기술 LLM 생성형AI 모델 칩 산업 스타트업 오픈AI 구글 네이버 카카오',
                    summaryContext: '순수 AI 신기술, AI 모델 발표, AI 칩, AI 산업 동향, 글로벌 AI 기업 뉴스 (공공/정부 관련 제외)',
                    validDomains: ['etnews.com', 'ddaily.co.kr', 'inews24.com', 'zdnet.co.kr', 'aitimes.com', 'tech42.co.kr', 'it.chosun.com'],
                    preferredDomains: ['etnews.com', 'ddaily.co.kr', 'aitimes.com'] // 우선순위 도메인 (한글 IT 전문 매체)
                }
            };

            const { name, searchKeywords, summaryContext, validDomains, preferredDomains } = config[section];

            // 날짜 범위 텍스트 동적 생성
            const dateRangeText = dateRangeDays <= 2 ? '최근 1-2일'
                                : dateRangeDays <= 5 ? '최근 3-5일'
                                : '최근 1주일';

            const searchPrompt = `${searchKeywords} ${dateRangeText}`;

            addLog(`[${name}] 검색 범위: ${dateRangeText}`);

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                addLog(`[${name}] 시도 ${attempt}/${maxRetries} 시작`);

                try {
                    // 1단계: AI에게 검색 결과를 텍스트로 요청
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);

                    const dateStr = `${yesterday.getMonth()+1}월 ${yesterday.getDate()}일`;

                    // 이전 뉴스 가져오기 (중복 방지)
                    const previousNews = getPreviousNews();
                    const previousNewsTitles = previousNews.map(n => n.title).slice(-10); // 최근 10개
                    const newsExclusionNote = previousNewsTitles.length > 0
                        ? `\n\n⚠️ 최근 사용한 뉴스 (중복 금지):\n${previousNewsTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n위 뉴스들과 다른 새로운 뉴스를 찾아주세요.`
                        : '';

                    // AI 응답에서 직접 정보를 추출하도록 요청
                    const finalPrompt = `${dateStr} 기준 ${dateRangeText} 이내의 "${searchPrompt}" 관련 최신 뉴스를 검색해줘.

다음 형식으로 정확히 1개의 뉴스만 알려줘:
제목: [실제 뉴스 제목]
출처: [언론사명 또는 기관명]
날짜: [발표 날짜]
URL: [뉴스 링크]
요약: [핵심만 1-2문장으로 간결하게, 최대 2줄 이내]

주의사항:
- **반드시 한글 뉴스만 수집** (영문 기사 제외)
- ${section === 'localGovCase' ? '정부기관(.go.kr), 공식 언론사 기사를 우선적으로 찾아줘' : '한국 IT 전문 매체(전자신문, 디지털데일리, 아이뉴스24, 지디넷코리아, AI타임스, 테크42, IT조선) 기사를 우선적으로 찾아줘'}
- 실제 존재하는 뉴스만 알려줘
- 제목은 반드시 실제 뉴스 헤드라인이어야 함
- 요약은 짧고 간결하게 핵심만${newsExclusionNote}`;

                    addLog(`  📡 검색: ${searchPrompt.substring(0, 50)}...`);
                    const searchData = await callGeminiAPI(apiKey, finalPrompt, true, 0.3, 2048);

                    // 2단계: AI 응답 텍스트에서 뉴스 정보 추출
                    let responseText = '';
                    if (searchData.candidates && searchData.candidates[0] &&
                        searchData.candidates[0].content &&
                        searchData.candidates[0].content.parts &&
                        searchData.candidates[0].content.parts[0]) {
                        responseText = searchData.candidates[0].content.parts[0].text.trim();
                    }

                    addLog(`  📄 AI 응답 길이: ${responseText.length}자`);

                    if (!responseText || responseText.length < 50) {
                        addLog(`  ⚠️ AI 응답 없음. 재시도...`);
                        if (attempt < maxRetries) continue;
                        throw new Error('AI 응답 없음');
                    }

                    // 응답에서 정보 파싱
                    const titleMatch = responseText.match(/제목:\s*([^\n]+)/);
                    const sourceMatch = responseText.match(/출처:\s*([^\n]+)/);
                    const dateMatch = responseText.match(/날짜:\s*([^\n]+)/);
                    const urlMatch = responseText.match(/URL:\s*([^\n]+)/);
                    const summaryMatch = responseText.match(/요약:\s*([^\n]+(?:\n[^\n]+)?)/);

                    if (!titleMatch || !urlMatch) {
                        addLog(`  ⚠️ 필수 정보 누락 (제목/URL). 재시도...`);
                        addLog(`  [DEBUG] 응답 일부: ${responseText.substring(0, 200)}...`);
                        if (attempt < maxRetries) continue;
                        throw new Error('뉴스 정보 파싱 실패');
                    }

                    const extractedTitle = titleMatch[1].trim();
                    const extractedUrl = urlMatch[1].trim();
                    const extractedSummary = summaryMatch ? summaryMatch[1].trim() : '';

                    addLog(`  📰 추출된 제목: ${extractedTitle.substring(0, 50)}...`);
                    addLog(`  🔗 추출된 URL: ${extractedUrl.substring(0, 60)}...`);

                    // Grounding metadata에서 실제 redirect URL 찾기
                    const metadata = searchData.candidates?.[0]?.groundingMetadata;
                    const chunks = metadata?.groundingChunks || [];

                    addLog(`  🔍 Grounding chunks: ${chunks.length}개`);

                    let finalUrl = extractedUrl;

                    // chunks에서 redirect URL 찾기
                    if (chunks.length > 0) {
                        const webChunks = chunks.filter(c => c.web && c.web.uri);
                        if (webChunks.length > 0) {
                            // 추출된 URL과 가장 관련있는 chunk 찾기
                            const matchedChunk = webChunks.find(c => {
                                const uri = c.web.uri;
                                // URL에 도메인이 포함되어 있는지 확인
                                const domain = extractedUrl.match(/(?:https?:\/\/)?([^\/]+)/)?.[1];
                                return domain && uri.includes('vertexaisearch.cloud.google.com');
                            });

                            if (matchedChunk) {
                                finalUrl = matchedChunk.web.uri;
                                addLog(`  ✅ Redirect URL 발견`);
                            }
                        }
                    }

                    // URL 검증
                    if (!isValidNewsUrl(finalUrl)) {
                        addLog(`  ⚠️ 유효하지 않은 URL. 재시도...`);
                        if (attempt < maxRetries) continue;
                        throw new Error('유효하지 않은 URL');
                    }

                    // 제목 검증
                    if (!isValidNewsTitle(extractedTitle)) {
                        addLog(`  ⚠️ 유효하지 않은 제목. 재시도...`);
                        if (attempt < maxRetries) continue;
                        throw new Error('유효하지 않은 제목');
                    }

                    // 중복 체크
                    if (isDuplicateNews(extractedTitle, finalUrl)) {
                        addLog(`  ⚠️ 중복된 뉴스 (최근 14일 내 사용). 재시도...`);
                        if (attempt < maxRetries) continue;
                        throw new Error('중복된 뉴스');
                    }

                    const selectedNews = {
                        title: extractedTitle,
                        uri: finalUrl,
                        snippet: extractedSummary
                    };

                    const isRedirect = selectedNews.uri.includes('vertexaisearch.cloud.google.com');
                    addLog(`     URL 타입: ${isRedirect ? 'Google redirect' : '직접 링크'}`);

                    // 3단계: 요약 최적화
                    let finalSummary = '';

                    if (selectedNews.snippet && selectedNews.snippet.trim().length > 30) {
                        // AI가 이미 요약을 제공한 경우 그대로 사용
                        finalSummary = selectedNews.snippet.trim();
                        addLog(`  ✅ AI 제공 요약 사용: ${finalSummary.substring(0, 60)}...`);
                    } else {
                        // 추가 요약이 필요한 경우
                        addLog(`  📝 추가 요약 생성 중...`);
                        try {
                            const summaryPrompt = `"${selectedNews.title}"

위 뉴스를 공무원 독자를 위해 핵심만 간결하게 요약해주세요.
${summaryContext}의 관점에서 중요한 점을 강조하되, 1-2문장으로 최대 2줄 이내로만 작성해주세요.

요약:`;

                            const summaryData = await callGeminiAPI(apiKey, summaryPrompt, false, 0.7, 256);

                            if (summaryData.candidates?.[0]?.content?.parts?.[0]) {
                                finalSummary = summaryData.candidates[0].content.parts[0].text.trim();
                                finalSummary = finalSummary.replace(/^요약:\s*/i, '');
                                addLog(`  ✅ 추가 요약 생성됨`);
                            }
                        } catch (summaryError) {
                            addLog(`  ⚠️ 추가 요약 실패: ${summaryError.message}`);
                            finalSummary = `${selectedNews.title}에 관한 최신 뉴스입니다.`;
                        }
                    }

                    // 최종 검증 (너무 짧으면 기본 문장 사용)
                    if (finalSummary.length < 15) {
                        finalSummary = `${selectedNews.title}에 관한 최신 뉴스입니다.`;
                    }

                    addLog(`  📋 최종 요약: ${finalSummary.substring(0, 60)}...`);

                    return {
                        title: selectedNews.title,
                        summary: finalSummary,
                        link: selectedNews.uri
                    };

                } catch (error) {
                    addLog(`  ❌ 오류: ${error.message}`);
                    if (attempt === maxRetries) {
                        throw new Error(`[${name}] 생성 실패: ${error.message}`);
                    }
                }
            }
        }

        // Gemini API 호출 (전체 콘텐츠 생성 - 3단계 분리 + 병렬 처리 + 성능 최적화)
        async function generateContent(apiKey, dateInfo, customPrompt) {
            const startTime = Date.now();
            addLog('=== 🚀 콘텐츠 생성 시작 (3단계 프로세스) ===');

            // 주말 감지 및 안내
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0=일요일, 6=토요일
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                const dayName = dayOfWeek === 0 ? '일요일' : '토요일';
                addLog(`📅 오늘은 ${dayName}입니다. 최신 뉴스가 적을 수 있습니다.`);
                addLog('💡 뉴스 검색 실패 시 🔄 내용교체 버튼을 눌러주세요 (자동으로 검색 범위 확대)');
            }

            // ========================================
            // 1단계: 기본 섹션 생성 (quote, tip, trends)
            // ========================================
            const stage1Start = Date.now();
            addLog('📝 1/3 단계: 기본 섹션 생성 중...');

            // 이전 팁 가져오기 (중복 방지)
            const previousTips = getPreviousTips();
            const previousTitles = previousTips.map(t => t.title).slice(-10); // 최근 10개
            const tipExclusionNote = previousTitles.length > 0
                ? `\n\n⚠️ 최근 다룬 주제 (중복 금지):\n${previousTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n위 주제들과 완전히 다른 새로운 주제로 생성해주세요.`
                : '';

            // 간결한 프롬프트로 속도 향상
            const basePrompt = `공무원 AI 뉴스레터 콘텐츠 생성.
날짜: ${dateInfo.full}${customPrompt ? `\n지시: ${customPrompt}` : ''}

quote: 공직자에게 위로와 힘을 주는 따뜻한 문구. 힐링되고 마음이 편안해지는 내용. 부담 없이 읽을 수 있는 짧고 감성적인 표현.
quote.author: 반드시 실존하는 유명인의 실명만 사용. 예: 스티브 잡스, 빌 게이츠, 헬렌 켈러, 마더 테레사, 넬슨 만델라, 무명 작가나 "~이" 같은 표현 금지.

tip: 공무원들이 실무에서 바로 활용할 수 있는 AI 실전 팁. 다양한 주제로 매일 새로운 내용 제공.${tipExclusionNote}
tip.situation: 문제 상황을 2-3개 핵심 포인트로 개조식 작성 (각 항목 1줄, 짧고 명확하게)
tip.solution: 해결방법을 2-3개 핵심 단계로 개조식 작성 (각 항목 1줄, 실행 가능한 구체적 방법)
tip.usage: 업무 적용 팁을 2-3개 핵심 포인트로 개조식 작성 (각 항목 1줄, 실용적이고 간결하게)
⚠️ situation, solution, usage는 반드시 개조식(bullet list)으로 작성. 각 항목은 짧은 한 줄로, 불필요한 서술 금지.

JSON만:
{
  "quote": {"text": "위로와 힘이 되는 문구", "author": "실명"},
  "tip": {"title": "제목", "summary": "요약", "situation": "• 핵심포인트1\n• 핵심포인트2", "solution": "• 단계1\n• 단계2", "prompt": "프롬프트", "result": "결과", "usage": "• 팁1\n• 팁2"},
  "trends": {"description": "1-2문장 간결하게 (최대 3줄)", "hashtags": ["#1","#2","#3","#4","#5"]}
}`;

            const baseData = await callGeminiAPI(apiKey, basePrompt, false, 0.7, 6144);

            // API 응답 안전성 체크
            if (!baseData.candidates || !baseData.candidates[0]) {
                addLog('ERROR: 기본 콘텐츠 생성 API 응답에 candidates가 없습니다.');
                throw new Error('API 응답 없음. 잠시 후 다시 시도해주세요.');
            }

            const baseCandidate = baseData.candidates[0];

            if (baseCandidate.finishReason && baseCandidate.finishReason !== 'STOP') {
                addLog(`ERROR: 기본 콘텐츠 생성이 비정상 종료되었습니다. finishReason: ${baseCandidate.finishReason}`);
                throw new Error(`API 응답 중단 (${baseCandidate.finishReason}). 다시 시도해주세요.`);
            }

            if (!baseCandidate.content || !baseCandidate.content.parts ||
                !baseCandidate.content.parts[0] || !baseCandidate.content.parts[0].text) {
                addLog('ERROR: 기본 콘텐츠 생성 API 응답 구조가 올바르지 않습니다.');
                throw new Error('API 응답 구조 오류. 잠시 후 다시 시도해주세요.');
            }

            let baseText = baseCandidate.content.parts[0].text.trim();

            // JSON 추출
            if (baseText.includes('```')) {
                const match = baseText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
                if (match) baseText = match[1].trim();
            }

            // Balanced braces 추출
            let braceCount = 0, startIdx = -1, endIdx = -1;
            for (let i = 0; i < baseText.length; i++) {
                if (baseText[i] === '{') {
                    if (braceCount === 0) startIdx = i;
                    braceCount++;
                } else if (baseText[i] === '}') {
                    braceCount--;
                    if (braceCount === 0 && startIdx !== -1) {
                        endIdx = i;
                        break;
                    }
                }
            }
            if (startIdx !== -1 && endIdx !== -1) {
                baseText = baseText.substring(startIdx, endIdx + 1);
            }

            const baseContent = JSON.parse(baseText);
            const stage1Time = ((Date.now() - stage1Start) / 1000).toFixed(1);
            addLog(`✅ 1단계 완료: 기본 섹션 생성됨 (${stage1Time}초)`);

            // ========================================
            // 2단계: 뉴스 섹션 병렬 생성
            // ========================================
            const stage2Start = Date.now();
            addLog('🔍 2/3 단계: 뉴스 섹션 병렬 검색 중...');

            // Promise.allSettled 사용: 하나 실패해도 나머지는 완성
            const newsResults = await Promise.allSettled([
                generateNewsSection(apiKey, 'localGovCase', dateInfo),
                generateNewsSection(apiKey, 'hotIssue', dateInfo)
            ]);

            // 결과 처리 (실패 시 placeholder)
            const localGovCase = newsResults[0].status === 'fulfilled'
                ? newsResults[0].value
                : {
                    title: '⚠️ 뉴스를 찾지 못했습니다',
                    summary: '최근 1-2일 이내 관련 뉴스가 없습니다. 아래 🔄 내용교체 버튼을 눌러 더 넓은 기간에서 검색하세요.',
                    link: '#',
                    _failed: true
                };

            const hotIssue = newsResults[1].status === 'fulfilled'
                ? newsResults[1].value
                : {
                    title: '⚠️ 뉴스를 찾지 못했습니다',
                    summary: '최근 1-2일 이내 관련 뉴스가 없습니다. 아래 🔄 내용교체 버튼을 눌러 더 넓은 기간에서 검색하세요.',
                    link: '#',
                    _failed: true
                };

            // 실패 로그
            if (newsResults[0].status === 'rejected') {
                addLog(`⚠️ 공공·정부 AI 뉴스 검색 실패: ${newsResults[0].reason?.message || '알 수 없는 오류'}`);
            }
            if (newsResults[1].status === 'rejected') {
                addLog(`⚠️ AI 핫이슈 뉴스 검색 실패: ${newsResults[1].reason?.message || '알 수 없는 오류'}`);
            }

            const stage2Time = ((Date.now() - stage2Start) / 1000).toFixed(1);
            const successCount = newsResults.filter(r => r.status === 'fulfilled').length;
            addLog(`✅ 2단계 완료: 뉴스 섹션 생성 (성공 ${successCount}/2, ${stage2Time}초)`);

            // 뉴스 실패 시 재생성 안내
            if (successCount < 2) {
                addLog('');
                addLog('💡 ===== 중요 안내 =====');
                addLog('📰 일부 뉴스를 찾지 못했지만 나머지 콘텐츠는 완성되었습니다!');
                addLog('🔄 미리보기에서 실패한 뉴스 섹션의 "내용교체" 버튼을 눌러주세요.');
                addLog('   → 자동으로 더 넓은 기간(3-5일 → 1주일)에서 검색합니다.');
                addLog('======================');
                addLog('');
            }

            // ========================================
            // 3단계: 최종 병합
            // ========================================
            addLog('📦 3/3 단계: 콘텐츠 병합 중...');

            const finalContent = {
                quote: baseContent.quote,
                tip: baseContent.tip,
                localGovCase: localGovCase,
                hotIssue: hotIssue,
                trends: baseContent.trends,
                ogTags: {
                    title: `AI출근길 (${dateInfo.short}) - 공공 AI 실전팁`,
                    description: `${baseContent.tip.summary}, 지자체 사례·핫이슈 1건씩, 오늘의 한 문장 포함.`
                }
            };

            // 중복 방지를 위해 생성된 콘텐츠 저장 (성공한 것만)
            saveTip(baseContent.tip.title, baseContent.tip.summary);
            if (!localGovCase._failed) {
                saveNews(localGovCase.title, localGovCase.url);
            }
            if (!hotIssue._failed) {
                saveNews(hotIssue.title, hotIssue.url);
            }
            addLog('💾 생성된 콘텐츠를 저장했습니다 (중복 방지용)');

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
            addLog('✅ 3단계 완료: 모든 콘텐츠 생성 성공!');
            addLog(`=== 🎉 콘텐츠 생성 완료 (총 ${totalTime}초) ===`);

            return finalContent;
        }

        // HTML 템플릿 생성
        function generateHTML(content, dateInfo) {
            // OG 태그 동적 생성
            const ogTitle = `AI출근길 (${dateInfo.shortYMD}.${dateInfo.dayShort}) - 공공 AI 실전팁`;
            const ogDescription = `${content.tip.summary}, 지자체 사례·핫이슈 1건씩, 오늘의 한 문장 포함.`;

            return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${ogTitle}</title>

    <!-- OGP -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://chrisryugj.github.io/AIDo/">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDescription}">
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
    <!-- 🔄 매일 변경되는 콘텐츠 영역 START -->
    <!-- ============================================ -->
    <script>
        // 📅 날짜 정보 (매일 업데이트)
        const currentDate = "${dateInfo.full}";

        // 💬 오늘의 한마디 (매일 교체)
        const todayQuote = {
            text: "${(content.quote?.text || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            author: "${(content.quote?.author || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}"
        };

        // 💡 오늘의 실전 팁 (매일 새 주제)
        const todayTip = {
            title: "${(content.tip?.title || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            summary: "${(content.tip?.summary || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            situation: "${(content.tip?.situation || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            solution: "${(content.tip?.solution || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            prompt: \`${(content.tip?.prompt || '').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\r/g, '')}\`,
            result: \`${(content.tip?.result || '').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\r/g, '')}\`,
            usage: "${(content.tip?.usage || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}"
        };

        // 🏛️ 공공·정부 AI 활용 사례
        const localGovCase = {
            title: "${(content.localGovCase?.title || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            summary: "${(content.localGovCase?.summary || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            link: "${content.localGovCase?.link || '#'}"
        };

        // 🔥 AI 핫이슈 (AI 기술·산업)
        const hotIssue = {
            title: "${(content.hotIssue?.title || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            summary: "${(content.hotIssue?.summary || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            link: "${content.hotIssue?.link || '#'}"
        };

        // 📊 오늘의 AI 트렌드
        const todayTrendsDescription = "${(content.trends?.description || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}";
        const todayTrends = ${JSON.stringify(content.trends?.hashtags || [])};

        // 🏷️ OG 태그 (매일 업데이트)
        const ogTags = {
            title: "${ogTitle.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            description: "${ogDescription.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}"
        };
    <\/script>
    <!-- ============================================ -->
    <!-- 🔄 매일 변경되는 콘텐츠 영역 END -->
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
    <\/script>
</body>
</html>`;
        }

        // 전역 변수: 현재 생성된 콘텐츠 저장
        let currentContent = null;

        // 미리보기 생성
        function createPreview(content) {
            currentContent = content; // 전역 변수에 저장
            return `
                <div class="preview-item">
                    <strong>📅 날짜</strong>
                    <p>${document.getElementById('date').value}</p>
                </div>
                <div class="preview-item">
                    <strong>💬 오늘의 한마디</strong>
                    <p>"${content.quote.text}"</p>
                    <p style="text-align: right; color: hsl(215 15% 50%); margin-top: 0.5rem;">- ${content.quote.author}</p>
                    <div class="preview-actions">
                        <button class="btn-small btn-refresh" onclick="regenerateSection('quote')">🔄 내용교체</button>
                    </div>
                </div>
                <div class="preview-item">
                    <strong>💡 오늘의 실전 팁</strong>
                    <p style="font-weight: 600; color: hsl(215 85% 45%); margin-top: 0.5rem;">${content.tip.title}</p>
                    <p style="margin-top: 0.5rem;">${content.tip.summary}</p>
                    <div class="preview-actions">
                        <button class="btn-small btn-secondary" onclick="showTipPreview()">👁️ 상세보기</button>
                        <button class="btn-small btn-refresh" onclick="regenerateSection('tip')">🔄 내용교체</button>
                    </div>
                </div>
                <div class="preview-item">
                    <strong>🏛️ 공공·정부 AI 활용 사례</strong>
                    <p style="font-weight: 600; margin-top: 0.5rem;">${content.localGovCase.title}</p>
                    <p style="margin-top: 0.5rem;">${content.localGovCase.summary}</p>
                    <p style="margin-top: 0.5rem;"><a href="${content.localGovCase.link}" target="_blank" rel="noopener" class="preview-link">🔗 ${content.localGovCase.link}</a></p>
                    <div class="preview-actions">
                        <button class="btn-small btn-edit" onclick="editLink('localGovCase')">✏️ 링크수정</button>
                        <button class="btn-small btn-refresh" onclick="regenerateSection('localGovCase')">🔄 내용교체</button>
                    </div>
                </div>
                <div class="preview-item">
                    <strong>🔥 AI 핫이슈 (AI 기술·산업)</strong>
                    <p style="font-weight: 600; margin-top: 0.5rem;">${content.hotIssue.title}</p>
                    <p style="margin-top: 0.5rem;">${content.hotIssue.summary}</p>
                    <p style="margin-top: 0.5rem;"><a href="${content.hotIssue.link}" target="_blank" rel="noopener" class="preview-link">🔗 ${content.hotIssue.link}</a></p>
                    <div class="preview-actions">
                        <button class="btn-small btn-edit" onclick="editLink('hotIssue')">✏️ 링크수정</button>
                        <button class="btn-small btn-refresh" onclick="regenerateSection('hotIssue')">🔄 내용교체</button>
                    </div>
                </div>
                <div class="preview-item">
                    <strong>📊 오늘의 AI 트렌드</strong>
                    <p style="margin-top: 0.5rem;">${content.trends.description}</p>
                    <p style="margin-top: 0.5rem;">${content.trends.hashtags.join(' ')}</p>
                    <div class="preview-actions">
                        <button class="btn-small btn-refresh" onclick="regenerateSection('trends')">🔄 내용교체</button>
                    </div>
                </div>
            `;
        }

        // 링크 수정 기능 (AI로 올바른 링크 검색)
        async function editLink(section) {
            if (!currentContent) return;

            const apiKey = document.getElementById('apiKey').value.trim();
            if (!apiKey) {
                showAlert('API 키를 입력해주세요.');
                return;
            }

            const sectionName = section === 'localGovCase' ? '공공·정부 AI 활용 사례' : 'AI 핫이슈 (AI 기술·산업)';
            const newsTitle = currentContent[section].title;
            const newsSummary = currentContent[section].summary;

            addLog(`${sectionName} 링크를 검색하고 있습니다...`);
            showAlert(`${sectionName}의 올바른 링크를 AI로 찾고 있습니다...`, 'success');

            try {
                const prompt = `🌟 **절대적으로 중요: 웹 검색을 사용하여** 다음 뉴스 기사의 정확한 URL을 찾아주세요.

제목: ${newsTitle}
요약: ${newsSummary}

**AI가 생성한 임시 URL이 아닌, 웹 검색으로 찾은 실제 기사 URL을 link 필드에 반드시 삽입하세요.**
웹 검색으로 해당 뉴스의 실제 URL을 찾거나, 관련된 실제 존재하는 공식 기관(정부, 지자체, 공공기관, 언론사) 웹사이트 URL을 제공하세요.
반드시 실제로 접속 가능한 URL이어야 합니다.

JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 반환하세요.

{"link": "https://...", "reason": "링크 선택 이유"}`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        contents: [{parts: [{text: prompt}]}],
                        tools: [{
                            googleSearch: {}
                        }],
                        generationConfig: {temperature: 0.3, maxOutputTokens: 512}
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || 'API 호출 실패');
                }

                const data = await response.json();

                // 에러 체크
                if (!data.candidates || !data.candidates[0]) {
                    addLog('ERROR: API 응답에 candidates가 없습니다.');
                    addLog('전체 응답: ' + JSON.stringify(data, null, 2));
                    throw new Error('API 응답 형식 오류');
                }

                // Grounding metadata에서 실제 URL 추출
                let realUrl = null;
                if (data.candidates[0].groundingMetadata?.groundingChunks) {
                    const chunks = data.candidates[0].groundingMetadata.groundingChunks;
                    addLog(`Grounding chunks 발견: ${chunks.length}개`);

                    for (const chunk of chunks) {
                        if (chunk.web?.uri) {
                            realUrl = chunk.web.uri;
                            addLog(`실제 URL 발견: ${realUrl}`);
                            break;
                        }
                    }
                }

                // API 응답 안전성 체크
                if (!data.candidates || !data.candidates[0]) {
                    addLog('ERROR: API 응답에 candidates가 없습니다.');
                    addLog('API 응답: ' + JSON.stringify(data, null, 2).substring(0, 500));
                    throw new Error('API 응답 없음. 잠시 후 다시 시도해주세요.');
                }

                const candidate = data.candidates[0];

                // finishReason 체크 (SAFETY, MAX_TOKENS 등의 문제)
                if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                    addLog(`ERROR: API 응답이 비정상 종료되었습니다. finishReason: ${candidate.finishReason}`);
                    if (candidate.finishReason === 'SAFETY') {
                        throw new Error('안전 필터로 인해 응답이 차단되었습니다. 다시 시도해주세요.');
                    } else if (candidate.finishReason === 'MAX_TOKENS') {
                        throw new Error('응답이 너무 길어 중단되었습니다. 다시 시도해주세요.');
                    } else {
                        throw new Error(`API 응답 중단 (${candidate.finishReason}). 다시 시도해주세요.`);
                    }
                }

                if (!candidate.content || !candidate.content.parts ||
                    !candidate.content.parts[0] || !candidate.content.parts[0].text) {
                    addLog('ERROR: API 응답 구조가 올바르지 않습니다.');
                    addLog('candidate: ' + JSON.stringify(candidate, null, 2).substring(0, 500));
                    throw new Error('API 응답 구조 오류. 잠시 후 다시 시도해주세요.');
                }

                let jsonText = candidate.content.parts[0].text.trim();
                addLog('AI 응답: ' + jsonText.substring(0, 200));

                if (jsonText.startsWith('```')) {
                    jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
                }

                const result = JSON.parse(jsonText);

                // 실제 URL이 있으면 교체, 없으면 AI가 제공한 URL 사용
                currentContent[section].link = realUrl || result.link;

                if (realUrl) {
                    addLog(`✅ 실제 URL로 교체됨: ${realUrl}`);
                } else {
                    addLog(`⚠️ Grounding metadata 없음, AI 제공 URL 사용: ${result.link}`);
                }

                // HTML 재생성
                const dateInput = document.getElementById('date').value;
                const selectedDate = new Date(dateInput + 'T00:00:00');
                const dateInfo = formatDate(selectedDate);
                const html = generateHTML(currentContent, dateInfo);
                document.getElementById('htmlOutput').value = html;

                // 미리보기 재생성
                document.getElementById('preview').innerHTML = createPreview(currentContent);

                addLog(`링크 수정 완료: ${result.link}`);
                addLog(`이유: ${result.reason}`);
                showAlert(`링크가 수정되었습니다! (${result.reason})`, 'success');

            } catch (error) {
                console.error('Error:', error);
                addLog('ERROR: ' + error.message);
                showAlert('링크 수정 중 오류가 발생했습니다: ' + error.message);
            }
        }

        // 섹션별 재생성 기능
        async function regenerateSection(section) {
            const apiKey = document.getElementById('apiKey').value.trim();
            const dateInput = document.getElementById('date').value;

            if (!apiKey) {
                showAlert('API 키를 입력해주세요.');
                return;
            }

            if (!currentContent) {
                showAlert('먼저 전체 콘텐츠를 생성해주세요.');
                return;
            }

            const selectedDate = new Date(dateInput + 'T00:00:00');
            const dateInfo = formatDate(selectedDate);

            const sectionNames = {
                quote: '오늘의 한마디',
                tip: '오늘의 실전 팁',
                localGovCase: '공공·정부 AI 활용 사례',
                hotIssue: 'AI 핫이슈 (AI 기술·산업)',
                trends: '오늘의 AI 트렌드'
            };

            addLog(`${sectionNames[section]} 재생성 시작...`);
            showAlert('해당 섹션을 재생성하고 있습니다...', 'success');

            try {
                // 뉴스 섹션은 전용 함수 사용 (검증 강화)
                if (section === 'localGovCase' || section === 'hotIssue') {
                    // localStorage에서 재시도 횟수 가져오기
                    const retryKey = `news_retry_${section}`;
                    let retryCount = parseInt(localStorage.getItem(retryKey) || '0');

                    // 재시도 횟수에 따라 날짜 범위 확대
                    const dateRangeDays = retryCount === 0 ? 2   // 1차: 1-2일
                                        : retryCount === 1 ? 5   // 2차: 3-5일
                                        : 7;                     // 3차: 1주일

                    const rangeText = dateRangeDays === 2 ? '1-2일' : dateRangeDays === 5 ? '3-5일' : '1주일';
                    addLog(`🔄 재생성 시도 ${retryCount + 1}회차 (검색 범위: ${rangeText})`);

                    if (retryCount > 0) {
                        showAlert(`더 넓은 기간(${rangeText})에서 검색합니다...`, 'success');
                    }

                    const newsData = await generateNewsSection(apiKey, section, dateInfo, 3, dateRangeDays);
                    currentContent[section] = newsData;

                    // 재시도 횟수 증가 (최대 3회)
                    if (retryCount < 2) {
                        localStorage.setItem(retryKey, (retryCount + 1).toString());
                    } else {
                        // 3회 이후엔 초기화 (다음에는 다시 1-2일부터 시작)
                        localStorage.removeItem(retryKey);
                    }

                    // HTML 재생성
                    const html = generateHTML(currentContent, dateInfo);
                    document.getElementById('htmlOutput').value = html;
                    document.getElementById('preview').innerHTML = createPreview(currentContent);

                    addLog(`✅ ${sectionNames[section]} 재생성 완료`);
                    addLog(`   제목: ${newsData.title.substring(0, 40)}...`);
                    addLog(`   링크: ${newsData.link}`);
                    showAlert('섹션이 재생성되었습니다!', 'success');
                    return;
                }

                // Non-news 섹션은 최적화된 프롬프트 사용
                let prompt = '';
                let maxTokens = 2048; // 기본값

                if (section === 'quote') {
                    prompt = '공직자에게 위로와 힘을 주는 따뜻한 문구 JSON: {"text":"힐링되고 마음이 편안해지는 짧고 감성적인 문구","author":"실존하는 유명인 실명만 (예: 스티브 잡스, 헬렌 켈러, 마더 테레사 등)"}';
                    maxTokens = 4096;
                } else if (section === 'tip') {
                    prompt = '공무원 GPT 활용팁 (개조식 필수). situation/solution/usage는 2-3개 핵심 포인트만 개조식으로. JSON만: {"title":"제목","summary":"요약","situation":"• 핵심1\\n• 핵심2","solution":"• 단계1\\n• 단계2","prompt":"프롬프트","result":"결과","usage":"• 팁1\\n• 팁2"}';
                    maxTokens = 4096;
                } else if (section === 'trends') {
                    prompt = 'AI 트렌드를 1-2문장으로 간결하게. JSON만: {"description":"짧은 설명 (최대 3줄)","hashtags":["#1","#2","#3","#4","#5"]}';
                    maxTokens = 2048;
                }

                addLog('API 요청 전송 중...');

                // callGeminiAPI 헬퍼 사용 (검색 비활성화)
                const data = await callGeminiAPI(apiKey, prompt, false, 0.7, maxTokens);

                // 에러 체크 (깊은 검증)
                if (!data.candidates || !data.candidates[0]) {
                    addLog('ERROR: API 응답에 candidates가 없습니다.');
                    addLog('전체 응답: ' + JSON.stringify(data, null, 2));
                    throw new Error('API 응답 형식 오류');
                }

                // MAX_TOKENS 에러 체크
                if (data.candidates[0].finishReason === 'MAX_TOKENS') {
                    addLog('ERROR: 토큰 제한 초과 (MAX_TOKENS)');
                    addLog(`사용된 maxTokens: ${maxTokens}`);
                    throw new Error('토큰 제한 초과. 프롬프트를 더 간결하게 수정하거나 maxTokens를 늘려주세요.');
                }

                if (!data.candidates[0].content || !data.candidates[0].content.parts ||
                    !data.candidates[0].content.parts[0] || !data.candidates[0].content.parts[0].text) {
                    addLog('ERROR: API 응답 구조가 올바르지 않습니다.');
                    addLog('candidates[0]: ' + JSON.stringify(data.candidates[0], null, 2));
                    throw new Error('API 응답 구조 오류');
                }

                let jsonText = data.candidates[0].content.parts[0].text.trim();
                addLog('AI 응답 원본: ' + jsonText.substring(0, 200) + '...');

                // JSON 추출 (더 정교한 방법)
                // 1. 마크다운 코드블록 제거
                if (jsonText.includes('```')) {
                    const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
                    if (codeBlockMatch) {
                        jsonText = codeBlockMatch[1].trim();
                    }
                }

                // 2. JSON 객체만 추출 (balanced braces)
                let braceCount = 0;
                let startIndex = -1;
                let endIndex = -1;

                for (let i = 0; i < jsonText.length; i++) {
                    if (jsonText[i] === '{') {
                        if (braceCount === 0) startIndex = i;
                        braceCount++;
                    } else if (jsonText[i] === '}') {
                        braceCount--;
                        if (braceCount === 0 && startIndex !== -1) {
                            endIndex = i;
                            break;
                        }
                    }
                }

                if (startIndex !== -1 && endIndex !== -1) {
                    jsonText = jsonText.substring(startIndex, endIndex + 1);
                }

                addLog('파싱할 JSON: ' + jsonText.substring(0, 200) + '...');

                const newData = JSON.parse(jsonText);

                // 현재 콘텐츠 업데이트
                if (section === 'quote') currentContent.quote = newData;
                else if (section === 'tip') currentContent.tip = newData;
                else if (section === 'localGovCase') currentContent.localGovCase = newData;
                else if (section === 'hotIssue') currentContent.hotIssue = newData;
                else if (section === 'trends') currentContent.trends = newData;

                addLog('콘텐츠 업데이트 완료');

                // HTML 재생성
                const html = generateHTML(currentContent, dateInfo);
                document.getElementById('htmlOutput').value = html;

                // 미리보기 재생성
                document.getElementById('preview').innerHTML = createPreview(currentContent);

                addLog(`${sectionNames[section]} 재생성 완료!`);
                showAlert('섹션이 재생성되었습니다!', 'success');

            } catch (error) {
                console.error('Error:', error);
                addLog('ERROR: ' + error.message);
                if (error.stack) addLog('Stack: ' + error.stack);
                showAlert('재생성 중 오류가 발생했습니다: ' + error.message);
            }
        }

        // 생성 버튼 클릭
        document.getElementById('generateBtn').addEventListener('click', async () => {
            const apiKey = document.getElementById('apiKey').value.trim();
            const dateInput = document.getElementById('date').value;
            const customPrompt = document.getElementById('customPrompt').value.trim();

            if (!apiKey) {
                showAlert('API 키를 입력해주세요.');
                return;
            }

            if (!dateInput) {
                showAlert('날짜를 선택해주세요.');
                return;
            }

            const selectedDate = new Date(dateInput + 'T00:00:00');
            const dateInfo = formatDate(selectedDate);

            // UI 업데이트
            document.getElementById('generateBtn').disabled = true;
            document.getElementById('loading').classList.add('active');
            document.getElementById('result').classList.remove('active');

            // 새로운 콘텐츠 생성 시 재시도 카운터 초기화
            localStorage.removeItem('news_retry_localGovCase');
            localStorage.removeItem('news_retry_hotIssue');
            addLog('🔄 뉴스 재시도 카운터 초기화 (새 생성)');

            try {
                // 콘텐츠 생성
                const content = await generateContent(apiKey, dateInfo, customPrompt);

                // HTML 생성
                const html = generateHTML(content, dateInfo);

                // 결과 표시
                document.getElementById('htmlOutput').value = html;
                document.getElementById('preview').innerHTML = createPreview(content);
                document.getElementById('result').classList.add('active');

                showAlert('콘텐츠가 성공적으로 생성되었습니다!', 'success');

                // 결과 영역으로 스크롤
                document.getElementById('result').scrollIntoView({ behavior: 'smooth' });

            } catch (error) {
                console.error('Error:', error);
                showAlert('생성 중 오류가 발생했습니다: ' + error.message);
            } finally {
                document.getElementById('generateBtn').disabled = false;
                document.getElementById('loading').classList.remove('active');
            }
        });

        // 복사 버튼
        document.getElementById('copyBtn').addEventListener('click', () => {
            const textarea = document.getElementById('htmlOutput');
            textarea.select();
            document.execCommand('copy');
            showAlert('HTML이 클립보드에 복사되었습니다!', 'success');
        });

        // 다운로드 버튼
        document.getElementById('downloadBtn').addEventListener('click', () => {
            const html = document.getElementById('htmlOutput').value;
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const dateStr = document.getElementById('date').value.replace(/-/g, ''); // 20250106 형식
            a.href = url;
            a.download = `AI출근길_${dateStr}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showAlert('HTML 파일이 다운로드되었습니다!', 'success');
        });

        // GitHub 푸시 함수
        async function pushToGitHub() {
            const token = document.getElementById('githubToken').value.trim();
            const repo = document.getElementById('githubRepo').value.trim();
            const branch = document.getElementById('githubBranch').value.trim();
            const filePath = document.getElementById('githubFilePath').value.trim();
            const commitMessage = document.getElementById('commitMessage').value.trim();
            const html = document.getElementById('htmlOutput').value;

            // 유효성 검사
            if (!token) {
                showAlert('GitHub Token을 입력해주세요.');
                return;
            }

            if (!html) {
                showAlert('먼저 콘텐츠를 생성해주세요.');
                return;
            }

            if (!repo || !branch || !filePath) {
                showAlert('저장소, 브랜치, 파일 경로를 모두 입력해주세요.');
                return;
            }

            const defaultCommitMessage = `Update daily content for ${document.getElementById('date').value}`;
            const finalCommitMessage = commitMessage || defaultCommitMessage;

            addLog('=== GitHub 푸시 시작 ===');
            addLog(`저장소: ${repo}`);
            addLog(`브랜치: ${branch}`);
            addLog(`파일: ${filePath}`);
            addLog(`커밋 메시지: ${finalCommitMessage}`);

            try {
                showAlert('GitHub에 푸시하고 있습니다...', 'success');

                // 1. 현재 파일의 SHA 가져오기
                addLog('1단계: 현재 파일 정보 가져오기...');
                const getUrl = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`;
                const getResponse = await fetch(getUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                });

                let sha = null;
                if (getResponse.ok) {
                    const currentFile = await getResponse.json();
                    sha = currentFile.sha;
                    addLog(`✅ 기존 파일 SHA: ${sha.substring(0, 7)}...`);
                } else if (getResponse.status === 404) {
                    addLog('⚠️ 파일이 없습니다. 새 파일을 생성합니다.');
                } else {
                    const error = await getResponse.json();
                    throw new Error(error.message || '파일 정보를 가져오는데 실패했습니다.');
                }

                // 2. HTML을 Base64로 인코딩
                addLog('2단계: HTML 인코딩 중...');
                const base64Content = btoa(unescape(encodeURIComponent(html)));
                addLog(`✅ 인코딩 완료 (${base64Content.length} chars)`);

                // 3. 파일 업데이트 (PUT)
                addLog('3단계: GitHub에 커밋 & 푸시 중...');
                const putUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
                const putResponse = await fetch(putUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                        'X-GitHub-Api-Version': '2022-11-28'
                    },
                    body: JSON.stringify({
                        message: finalCommitMessage,
                        content: base64Content,
                        branch: branch,
                        ...(sha && { sha: sha })
                    })
                });

                if (!putResponse.ok) {
                    const error = await putResponse.json();
                    throw new Error(error.message || '푸시에 실패했습니다.');
                }

                const result = await putResponse.json();
                addLog('=== ✅ GitHub 푸시 성공! ===');
                addLog(`커밋 SHA: ${result.commit.sha.substring(0, 7)}...`);
                addLog(`커밋 URL: ${result.commit.html_url}`);

                showAlert(`✅ GitHub에 성공적으로 푸시되었습니다!\n커밋: ${result.commit.sha.substring(0, 7)}`, 'success');

                // 푸시 후 GitHub Pages 링크 표시
                const [owner, repoName] = repo.split('/');
                const pagesUrl = `https://${owner}.github.io/${repoName}/`;
                addLog(`GitHub Pages: ${pagesUrl}`);
                addLog('💡 변경사항은 1-2분 후 반영됩니다.');

            } catch (error) {
                console.error('GitHub Push Error:', error);
                addLog('ERROR: ' + error.message);
                showAlert('GitHub 푸시 중 오류가 발생했습니다: ' + error.message);
            }
        }

        // GitHub 푸시 버튼
        document.getElementById('pushToGitHub').addEventListener('click', pushToGitHub);
