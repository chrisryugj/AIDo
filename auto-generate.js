#!/usr/bin/env node

/**
 * AI출근길 자동 콘텐츠 생성 스크립트
 *
 * 기능:
 * - Gemini API를 사용하여 매일 새로운 콘텐츠 생성
 * - index.html 자동 업데이트
 * - Telegram으로 성공/실패 알림 전송
 *
 * 환경변수:
 * - GEMINI_API_KEY: Google Gemini API 키
 * - TELEGRAM_BOT_TOKEN: Telegram Bot 토큰
 * - TELEGRAM_CHAT_ID: Telegram Chat ID
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 환경변수 확인
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
    process.exit(1);
}

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram 환경변수가 없습니다. 알림을 건너뜁니다.');
}

// 날짜 포맷팅 함수 (한국 시간 기준)
function formatDate(date) {
    // UTC 시간을 한국 시간(UTC+9)으로 변환
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));

    const year = kstDate.getUTCFullYear();
    const month = kstDate.getUTCMonth() + 1;
    const day = kstDate.getUTCDate();
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayNamesShort = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[kstDate.getUTCDay()];
    const dayShort = dayNamesShort[kstDate.getUTCDay()];

    return {
        full: `${year}년 ${month}월 ${day}일 ${dayName}`,
        short: `${year}.${month}.${day}`,
        yymmdd: `${String(year).slice(2)}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`,
        dayShort: dayShort
    };
}

// HTTPS 요청 헬퍼 (Promise 기반)
function httpsRequest(url, options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);

        if (postData) {
            req.write(postData);
        }

        req.end();
    });
}

// Gemini API 호출
async function callGeminiAPI(prompt, useSearch = false, temperature = 0.7, maxTokens = 4096) {
    console.log(`🤖 Gemini API 호출 중... (검색: ${useSearch}, 온도: ${temperature})`);

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            topK: 40,
            topP: 0.95
        }
    };

    if (useSearch) {
        requestBody.tools = [{ googleSearch: {} }];
    }

    const postData = JSON.stringify(requestBody);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const data = await httpsRequest(url, options, postData);

    if (!data.candidates || !data.candidates[0]) {
        throw new Error('API 응답에 candidates가 없습니다.');
    }

    return data;
}

// JSON 추출 헬퍼 (강화된 버전)
function extractJSON(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input');
    }

    let jsonText = text.trim();

    // 시도 1: 마크다운 코드블록 (```json ... ```)
    if (jsonText.includes('```')) {
        const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
        if (codeBlockMatch) {
            try {
                return JSON.parse(codeBlockMatch[1].trim());
            } catch (e) {
                // 코드블록 내에서도 파싱 실패하면 계속 진행
            }
        }
    }

    // 시도 2: Balanced braces로 첫 번째 JSON 객체 추출
    let braceCount = 0, startIdx = -1, endIdx = -1;
    for (let i = 0; i < jsonText.length; i++) {
        if (jsonText[i] === '{') {
            if (braceCount === 0) startIdx = i;
            braceCount++;
        } else if (jsonText[i] === '}') {
            braceCount--;
            if (braceCount === 0 && startIdx !== -1) {
                endIdx = i;
                break;
            }
        }
    }

    if (startIdx !== -1 && endIdx !== -1) {
        const extracted = jsonText.substring(startIdx, endIdx + 1);
        try {
            return JSON.parse(extracted);
        } catch (e) {
            throw new Error(`JSON 파싱 실패: ${e.message} (추출된 텍스트: ${extracted.substring(0, 100)}...)`);
        }
    }

    // 시도 3: 전체 텍스트를 JSON으로 파싱
    try {
        return JSON.parse(jsonText);
    } catch (e) {
        throw new Error(`JSON을 찾을 수 없습니다. 응답 내용: ${jsonText.substring(0, 200)}...`);
    }
}

// ===== 뉴스 생성 헬퍼 함수 =====

// 뉴스 히스토리 파일 경로
const NEWS_HISTORY_FILE = path.join(__dirname, '.news-history.json');

// 이전 뉴스 가져오기 (14일 이내)
function getPreviousNews() {
    try {
        if (!fs.existsSync(NEWS_HISTORY_FILE)) {
            return [];
        }

        const stored = fs.readFileSync(NEWS_HISTORY_FILE, 'utf8');
        const news = JSON.parse(stored);
        const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);

        // 14일 이내 뉴스만 필터링
        return news.filter(item => item.timestamp > fourteenDaysAgo);
    } catch (error) {
        console.warn('⚠️ 뉴스 히스토리 로드 실패:', error.message);
        return [];
    }
}

// 새 뉴스 저장
function saveNews(title, url) {
    try {
        const news = getPreviousNews();
        news.push({
            title: title,
            url: url,
            timestamp: Date.now()
        });

        // 최근 100개만 유지
        const recentNews = news.slice(-100);
        fs.writeFileSync(NEWS_HISTORY_FILE, JSON.stringify(recentNews, null, 2), 'utf8');
    } catch (error) {
        console.warn('⚠️ 뉴스 히스토리 저장 실패:', error.message);
    }
}

// 뉴스 중복 체크
function isDuplicateNews(title, url) {
    const previousNews = getPreviousNews();
    return previousNews.some(item =>
        item.url === url || item.title === title
    );
}

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
        return true;
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

// 뉴스 섹션 생성 (TEXT PARSING 방식 - generator.js 참고)
async function generateNewsSection(section, dateInfo, maxRetries = 5) {
    const config = {
        localGovCase: {
            name: '공공·정부 AI 활용 사례',
            searchKeywords: '한국 지자체 공공기관 중앙부처 정부 AI 인공지능 스마트행정 챗봇 디지털전환 활용 도입',
            summaryContext: '지자체 또는 정부기관(중앙부처, 공공기관 포함)이 AI를 실무에 도입/활용한 사례',
            validDomains: ['.go.kr', 'korea.kr', 'etnews.com', 'ddaily.co.kr', 'inews24.com', 'zdnet.co.kr', 'aitimes.com', 'yna.co.kr']
        },
        hotIssue: {
            name: 'AI 핫이슈 (AI 기술·산업)',
            searchKeywords: '한국 AI 인공지능 신기술 LLM 생성형AI 모델 칩 산업 스타트업 오픈AI 구글 네이버 카카오',
            summaryContext: '순수 AI 신기술, AI 모델 발표, AI 칩, AI 산업 동향, 글로벌 AI 기업 뉴스 (공공/정부 관련 제외)',
            validDomains: ['etnews.com', 'ddaily.co.kr', 'inews24.com', 'zdnet.co.kr', 'aitimes.com', 'tech42.co.kr', 'it.chosun.com']
        }
    };

    const sectionConfig = config[section];

    // 재시도 로직: 점진적으로 날짜 범위 확대
    const retryConfigs = [
        { days: 2, text: '최근 1-2일' },
        { days: 3, text: '최근 2-3일' },
        { days: 5, text: '최근 3-5일' },
        { days: 7, text: '최근 1주일' },
        { days: 14, text: '최근 2주일' }
    ];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const retryConfig = retryConfigs[Math.min(attempt, retryConfigs.length - 1)];
        const dateRangeText = retryConfig.text;

        console.log(`📰 ${sectionConfig.name} 검색 중 (${dateRangeText}, 시도 ${attempt + 1}/${maxRetries})...`);

        try {
            // 날짜 정보 (한국 시간 기준)
            const now = new Date();
            const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
            const yesterday = new Date(kstNow);
            yesterday.setUTCDate(yesterday.getUTCDate() - 1);
            const dateStr = `${yesterday.getUTCMonth() + 1}월 ${yesterday.getUTCDate()}일`;

            // 이전 뉴스 가져오기 (중복 방지)
            const previousNews = getPreviousNews();
            const previousNewsTitles = previousNews.map(n => n.title).slice(-10);
            const newsExclusionNote = previousNewsTitles.length > 0
                ? `\n\n⚠️ 최근 사용한 뉴스 (중복 금지):\n${previousNewsTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n위 뉴스들과 다른 새로운 뉴스를 찾아주세요.`
                : '';

            // TEXT 형식 프롬프트 (JSON 아님!)
            const searchPrompt = `${sectionConfig.searchKeywords} ${dateRangeText}`;
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

            // API 호출 (temperature: 0.3, maxTokens: 2048)
            let data;
            try {
                data = await callGeminiAPI(finalPrompt, true, 0.3, 2048);
            } catch (apiError) {
                // MAX_TOKENS 에러시 4096으로 재시도
                if (apiError.message.includes('MAX_TOKENS') || apiError.message.includes('RECITATION')) {
                    console.log(`   🔄 4096 토큰으로 재시도...`);
                    data = await callGeminiAPI(finalPrompt, true, 0.3, 4096);
                } else {
                    throw apiError;
                }
            }

            // 응답 텍스트 추출
            let responseText = '';
            if (data.candidates && data.candidates[0] &&
                data.candidates[0].content &&
                data.candidates[0].content.parts &&
                data.candidates[0].content.parts[0]) {
                responseText = data.candidates[0].content.parts[0].text.trim();
            }

            console.log(`   📄 AI 응답 길이: ${responseText.length}자`);

            if (!responseText || responseText.length < 50) {
                console.log(`   ⚠️ ${sectionConfig.name} 시도 ${attempt + 1} 실패: AI 응답 없음`);
                if (attempt < maxRetries - 1) {
                    console.log(`   🔄 재시도 중... (${attempt + 2}/${maxRetries})`);
                    continue;
                }
                throw new Error('AI 응답 없음');
            }

            // TEXT 파싱 (정규식 사용)
            const titleMatch = responseText.match(/제목:\s*([^\n]+)/);
            const sourceMatch = responseText.match(/출처:\s*([^\n]+)/);
            const dateMatch = responseText.match(/날짜:\s*([^\n]+)/);
            const urlMatch = responseText.match(/URL:\s*([^\n]+)/);
            const summaryMatch = responseText.match(/요약:\s*([^\n]+(?:\n[^\n]+)?)/);

            if (!titleMatch || !urlMatch) {
                console.log(`   ⚠️ ${sectionConfig.name} 시도 ${attempt + 1} 실패: 필수 정보 누락 (제목/URL)`);
                console.log(`   [DEBUG] 응답 일부: ${responseText.substring(0, 200)}...`);
                if (attempt < maxRetries - 1) {
                    console.log(`   🔄 재시도 중... (${attempt + 2}/${maxRetries})`);
                    continue;
                }
                throw new Error('뉴스 정보 파싱 실패');
            }

            const extractedTitle = titleMatch[1].trim();
            const extractedUrl = urlMatch[1].trim();
            const extractedSummary = summaryMatch ? summaryMatch[1].trim() : '';

            console.log(`   📰 추출된 제목: ${extractedTitle.substring(0, 50)}...`);
            console.log(`   🔗 추출된 URL: ${extractedUrl.substring(0, 60)}...`);

            // Grounding metadata에서 실제 redirect URL 찾기
            const metadata = data.candidates?.[0]?.groundingMetadata;
            const chunks = metadata?.groundingChunks || [];

            console.log(`   🔍 Grounding chunks: ${chunks.length}개`);

            let finalUrl = extractedUrl;

            // chunks에서 redirect URL 찾기
            if (chunks.length > 0) {
                const webChunks = chunks.filter(c => c.web && c.web.uri);
                if (webChunks.length > 0) {
                    // 추출된 URL과 가장 관련있는 chunk 찾기
                    const matchedChunk = webChunks.find(c => {
                        const uri = c.web.uri;
                        return uri.includes('vertexaisearch.cloud.google.com');
                    });

                    if (matchedChunk) {
                        finalUrl = matchedChunk.web.uri;
                        console.log(`   ✅ Redirect URL 발견`);
                    }
                }
            }

            // URL 검증
            if (!isValidNewsUrl(finalUrl)) {
                console.log(`   ⚠️ ${sectionConfig.name} 시도 ${attempt + 1} 실패: 유효하지 않은 URL`);
                if (attempt < maxRetries - 1) {
                    console.log(`   🔄 재시도 중... (${attempt + 2}/${maxRetries})`);
                    continue;
                }
                throw new Error('유효하지 않은 URL');
            }

            // 제목 검증
            if (!isValidNewsTitle(extractedTitle)) {
                console.log(`   ⚠️ ${sectionConfig.name} 시도 ${attempt + 1} 실패: 유효하지 않은 제목`);
                if (attempt < maxRetries - 1) {
                    console.log(`   🔄 재시도 중... (${attempt + 2}/${maxRetries})`);
                    continue;
                }
                throw new Error('유효하지 않은 제목');
            }

            // 중복 체크
            if (isDuplicateNews(extractedTitle, finalUrl)) {
                console.log(`   ⚠️ ${sectionConfig.name} 시도 ${attempt + 1} 실패: 중복된 뉴스 (최근 14일 내 사용)`);
                if (attempt < maxRetries - 1) {
                    console.log(`   🔄 재시도 중... (${attempt + 2}/${maxRetries})`);
                    continue;
                }
                throw new Error('중복된 뉴스');
            }

            // 요약 최적화
            let finalSummary = '';

            if (extractedSummary && extractedSummary.trim().length > 30) {
                // AI가 이미 요약을 제공한 경우 그대로 사용
                finalSummary = extractedSummary.trim();
                console.log(`   ✅ AI 제공 요약 사용: ${finalSummary.substring(0, 60)}...`);
            } else {
                // 추가 요약이 필요한 경우
                console.log(`   📝 추가 요약 생성 중...`);
                try {
                    const summaryPrompt = `"${extractedTitle}"

위 뉴스를 공무원 독자를 위해 핵심만 간결하게 요약해주세요.
${sectionConfig.summaryContext}의 관점에서 중요한 점을 강조하되, 1-2문장으로 최대 2줄 이내로만 작성해주세요.

요약:`;

                    const summaryData = await callGeminiAPI(summaryPrompt, false, 0.7, 256);

                    if (summaryData.candidates?.[0]?.content?.parts?.[0]) {
                        finalSummary = summaryData.candidates[0].content.parts[0].text.trim();
                        finalSummary = finalSummary.replace(/^요약:\s*/i, '');
                        console.log(`   ✅ 추가 요약 생성됨`);
                    }
                } catch (summaryError) {
                    console.log(`   ⚠️ 추가 요약 실패: ${summaryError.message}`);
                    finalSummary = `${extractedTitle}에 관한 최신 뉴스입니다.`;
                }
            }

            // 최종 검증 (너무 짧으면 기본 문장 사용)
            if (finalSummary.length < 15) {
                finalSummary = `${extractedTitle}에 관한 최신 뉴스입니다.`;
            }

            console.log(`   📋 최종 요약: ${finalSummary.substring(0, 60)}...`);

            // 뉴스 히스토리에 저장
            saveNews(extractedTitle, finalUrl);

            return {
                title: extractedTitle,
                summary: finalSummary,
                link: finalUrl
            };

        } catch (error) {
            console.log(`   ⚠️ ${sectionConfig.name} 시도 ${attempt + 1} 실패: ${error.message}`);
            if (attempt < maxRetries - 1) {
                console.log(`   🔄 재시도 중... (${attempt + 2}/${maxRetries})`);
                continue;
            }
            throw new Error(`[${sectionConfig.name}] 생성 실패: ${error.message}`);
        }
    }
}

// 메인 콘텐츠 생성
async function generateContent(dateInfo) {
    console.log('=== 🚀 콘텐츠 생성 시작 ===');

    // 1단계: 기본 섹션 (quote, tip, trends)
    console.log('📝 1/3: 기본 섹션 생성 중...');

    const basePrompt = `공무원 AI 뉴스레터 콘텐츠 생성.
날짜: ${dateInfo.full}

quote: 공직자에게 위로와 힘을 주는 따뜻한 문구. 힐링되고 마음이 편안해지는 내용. 부담 없이 읽을 수 있는 짧고 감성적인 표현.
quote.author: 반드시 실존하는 유명인의 실명만 사용. 예: 스티브 잡스, 빌 게이츠, 헬렌 켈러, 마더 테레사, 넬슨 만델라, 무명 작가나 "~이" 같은 표현 금지.

tip: 공무원들이 실무에서 바로 활용할 수 있는 AI 실전 팁. 다양한 주제로 매일 새로운 내용 제공.
tip.situation: 문제 상황을 2-3개 핵심 포인트로 개조식 작성 (각 항목 1줄, 짧고 명확하게)
tip.solution: 해결방법을 2-3개 핵심 단계로 개조식 작성 (각 항목 1줄, 실행 가능한 구체적 방법)
tip.usage: 업무 적용 팁을 2-3개 핵심 포인트로 개조식 작성 (각 항목 1줄, 실용적이고 간결하게)
⚠️ situation, solution, usage는 반드시 개조식(bullet list)으로 작성. 각 항목은 짧은 한 줄로, 불필요한 서술 금지.

JSON만:
{
  "quote": {"text": "위로와 힘이 되는 문구", "author": "실명"},
  "tip": {"title": "제목", "summary": "요약", "situation": "• 핵심포인트1\\n• 핵심포인트2", "solution": "• 단계1\\n• 단계2", "prompt": "프롬프트", "result": "결과", "usage": "• 팁1\\n• 팁2"},
  "trends": {"description": "1-2문장 간결하게 (최대 3줄)", "hashtags": ["#1","#2","#3","#4","#5"]}
}`;

    const baseData = await callGeminiAPI(basePrompt, false, 0.7, 6144);
    const baseText = baseData.candidates[0].content.parts[0].text.trim();
    const baseContent = extractJSON(baseText);

    console.log('✅ 1단계 완료');

    // 2단계: 뉴스 섹션 생성 (재시도 포함)
    console.log('🔍 2/3: 뉴스 섹션 생성 중 (각각 최대 5번 재시도)...');

    // 순차적으로 실행해서 로그가 깔끔하게 보이도록
    const localGovCase = await generateNewsSection('localGovCase', dateInfo, 5);
    const hotIssue = await generateNewsSection('hotIssue', dateInfo, 5);

    // 성공 여부 확인
    const successCount = [localGovCase, hotIssue].filter(news => !news._failed).length;
    console.log(`✅ 2단계 완료 (성공: ${successCount}/2)`);

    if (successCount < 2) {
        console.warn(`⚠️ ${2 - successCount}개 뉴스 섹션이 실패했습니다.`);
    }

    // 3단계: 최종 조합
    console.log('🎨 3/3: 콘텐츠 조합 중...');

    const content = {
        quote: baseContent.quote,
        tip: baseContent.tip,
        localGovCase,
        hotIssue,
        trends: baseContent.trends
    };

    console.log('✅ 콘텐츠 생성 완료!');
    return content;
}

// HTML 생성 헬퍼: 배열/객체/문자열을 안전하게 문자열로 변환
function toSafeString(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join('\n• ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

// HTML 생성 (generator.js의 generateHTML 함수와 동일한 로직)
function generateHTML(content, dateInfo) {
    // OG 태그 동적 생성
    const ogTitle = `AI출근길 (${dateInfo.yymmdd.slice(0,2)}.${dateInfo.yymmdd.slice(2,4)}.${dateInfo.yymmdd.slice(4,6)}.${dateInfo.dayShort}) - 공공 AI 실전팁`;
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
            text: "${toSafeString(content.quote?.text).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            author: "${toSafeString(content.quote?.author).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}"
        };

        // 💡 오늘의 실전 팁 (매일 새 주제)
        const todayTip = {
            title: "${toSafeString(content.tip?.title).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            summary: "${toSafeString(content.tip?.summary).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            situation: "${toSafeString(content.tip?.situation).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            solution: "${toSafeString(content.tip?.solution).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            prompt: \`${toSafeString(content.tip?.prompt).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\r/g, '')}\`,
            result: \`${toSafeString(content.tip?.result).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\r/g, '')}\`,
            usage: "${toSafeString(content.tip?.usage).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}"
        };

        // 🏛️ 공공·정부 AI 활용 사례
        const localGovCase = {
            title: "${toSafeString(content.localGovCase?.title).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            summary: "${toSafeString(content.localGovCase?.summary).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            link: "${content.localGovCase?.link || '#'}"
        };

        // 🔥 AI 핫이슈 (AI 기술·산업)
        const hotIssue = {
            title: "${toSafeString(content.hotIssue?.title).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            summary: "${toSafeString(content.hotIssue?.summary).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            link: "${content.hotIssue?.link || '#'}"
        };

        // 📊 오늘의 AI 트렌드
        const todayTrendsDescription = "${toSafeString(content.trends?.description).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}";
        const todayTrends = ${JSON.stringify(content.trends?.hashtags || [])};

        // 🏷️ OG 태그 (매일 업데이트)
        const ogTags = {
            title: "${toSafeString(ogTitle).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}",
            description: "${toSafeString(ogDescription).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}"
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

// Telegram 메시지 전송
async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('⏭️ Telegram 알림 건너뛰기 (환경변수 없음)');
        return;
    }

    console.log('📱 Telegram 알림 전송 중...');

    const postData = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message
    });

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    try {
        await httpsRequest(url, options, postData);
        console.log('✅ Telegram 알림 전송 완료');
    } catch (error) {
        console.error('❌ Telegram 알림 전송 실패:', error.message);
    }
}

// 메인 실행
async function main() {
    const startTime = Date.now();

    try {
        // 오늘 날짜
        const today = new Date();
        const dateInfo = formatDate(today);

        console.log(`\n📅 날짜: ${dateInfo.full}\n`);

        // 콘텐츠 생성
        const content = await generateContent(dateInfo);

        // HTML 생성
        console.log('📄 HTML 생성 중...');
        const html = generateHTML(content, dateInfo);

        // index.html 저장
        const indexPath = path.join(__dirname, 'index.html');
        fs.writeFileSync(indexPath, html, 'utf8');
        console.log('✅ index.html 저장 완료');

        // 실행 시간 계산
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        // 성공 메시지
        const successMessage = `✅ AI출근길 자동 생성 성공!

📅 날짜: ${dateInfo.full}
⏱ 소요시간: ${duration}초

💡 오늘의 팁: ${toSafeString(content.tip.title).substring(0, 60)}
💬 오늘의 한마디: ${toSafeString(content.quote.text).substring(0, 50)}...

🏛️ 공공·정부 AI: ${content.localGovCase._failed ? '❌ 검색 실패' : '✅ ' + toSafeString(content.localGovCase.title).substring(0, 30) + '...'}
🔥 AI 핫이슈: ${content.hotIssue._failed ? '❌ 검색 실패' : '✅ ' + toSafeString(content.hotIssue.title).substring(0, 30) + '...'}

🔗 확인: https://chrisryugj.github.io/AIDo/`;

        await sendTelegramMessage(successMessage);

        console.log(`\n✨ 모든 작업 완료! (${duration}초)\n`);
        process.exit(0);

    } catch (error) {
        console.error('\n❌ 오류 발생:', error);
        console.error(error.stack);

        // 실패 메시지
        const failMessage = `❌ AI출근길 자동 생성 실패

📅 날짜: ${formatDate(new Date()).full}
⚠️ 오류: ${error.message}

관리자 확인이 필요합니다.`;

        await sendTelegramMessage(failMessage);

        process.exit(1);
    }
}

// 실행
main();
