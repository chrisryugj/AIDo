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

// 날짜 포맷팅 함수
function formatDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayName = dayNames[date.getDay()];

    return {
        full: `${year}년 ${month}월 ${day}일 ${dayName}`,
        short: `${year}.${month}.${day}`,
        yymmdd: `${String(year).slice(2)}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
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

// JSON 추출 헬퍼
function extractJSON(text) {
    // 마크다운 코드블록 제거
    let jsonText = text.trim();
    if (jsonText.includes('```')) {
        const match = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
        if (match) jsonText = match[1].trim();
    }

    // Balanced braces 추출
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
        jsonText = jsonText.substring(startIdx, endIdx + 1);
    }

    return JSON.parse(jsonText);
}

// 뉴스 섹션 생성
async function generateNewsSection(section, dateInfo, dateRangeDays = 2) {
    const config = {
        localGovCase: {
            name: '공공·정부 AI 활용 사례',
            searchKeywords: '한국 지자체 공공기관 중앙부처 정부 AI 인공지능 스마트행정 챗봇 디지털전환 활용 도입',
            summaryContext: '지자체 또는 정부기관(중앙부처, 공공기관 포함)이 AI를 실무에 도입/활용한 사례',
            validDomains: ['.go.kr', 'korea.kr', 'etnews.com', 'ddaily.co.kr', 'inews24.com']
        },
        hotIssue: {
            name: 'AI 핫이슈 (AI 기술·산업)',
            searchKeywords: '한국 AI 인공지능 신기술 LLM 생성형AI 모델 칩 산업 스타트업 오픈AI 구글 네이버 카카오',
            summaryContext: '순수 AI 신기술, AI 모델 발표, AI 칩, AI 산업 동향 (공공/정부 관련 제외)',
            validDomains: ['etnews.com', 'ddaily.co.kr', 'inews24.com', 'zdnet.co.kr', 'aitimes.com', 'tech42.co.kr', 'it.chosun.com']
        }
    };

    const sectionConfig = config[section];
    const dateRangeText = dateRangeDays <= 2 ? '최근 1-2일' : dateRangeDays <= 5 ? '최근 3-5일' : '최근 1주일';

    console.log(`📰 ${sectionConfig.name} 검색 중 (${dateRangeText})...`);

    const prompt = `한국어 뉴스 검색: ${sectionConfig.searchKeywords}

${dateRangeText} 이내 ${sectionConfig.summaryContext}를 찾아 요약.
한국어 IT 매체만 (${sectionConfig.validDomains.join(', ')}).

JSON:
{"title":"제목","summary":"2-3문장 요약","link":"실제URL"}`;

    try {
        const data = await callGeminiAPI(prompt, true, 0.3, 2048);
        const newsText = data.candidates[0].content.parts[0].text.trim();
        const newsData = extractJSON(newsText);

        console.log(`✅ ${sectionConfig.name}: ${newsData.title.substring(0, 40)}...`);
        return newsData;
    } catch (error) {
        console.warn(`⚠️ ${sectionConfig.name} 검색 실패:`, error.message);
        return {
            title: '⚠️ 뉴스를 찾지 못했습니다',
            summary: `최근 ${dateRangeText} 이내 관련 뉴스가 없습니다.`,
            link: '#',
            _failed: true
        };
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

    // 2단계: 뉴스 섹션 병렬 생성
    console.log('🔍 2/3: 뉴스 섹션 생성 중...');

    const [localGovResult, hotIssueResult] = await Promise.allSettled([
        generateNewsSection('localGovCase', dateInfo),
        generateNewsSection('hotIssue', dateInfo)
    ]);

    const localGovCase = localGovResult.status === 'fulfilled' ? localGovResult.value : localGovResult.reason;
    const hotIssue = hotIssueResult.status === 'fulfilled' ? hotIssueResult.value : hotIssueResult.reason;

    console.log('✅ 2단계 완료');

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

// HTML 생성 (generator.js의 generateHTML 함수와 동일한 로직)
function generateHTML(content, dateInfo) {
    // generator.js의 index.html 템플릿을 그대로 읽어옴
    const generatorPath = path.join(__dirname, 'generator.js');
    const generatorContent = fs.readFileSync(generatorPath, 'utf8');

    // generateHTML 함수 추출
    const funcMatch = generatorContent.match(/function generateHTML\(content, dateInfo\) \{[\s\S]*?return html;[\s\S]*?\}/);

    if (!funcMatch) {
        throw new Error('generator.js에서 generateHTML 함수를 찾을 수 없습니다.');
    }

    // 함수 실행을 위한 컨텍스트 생성
    const ogTitle = `AI출근길 ${dateInfo.short} - ${content.tip.title}`;
    const ogDescription = content.tip.summary;

    // eval을 사용하여 함수 실행 (보안상 문제가 있지만, 이 경우는 우리 코드이므로 안전)
    const generateHTMLFunc = eval(`(${funcMatch[0]})`);

    return generateHTMLFunc(content, dateInfo);
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
        text: message,
        parse_mode: 'Markdown'
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
        const successMessage = `✅ *AI출근길 자동 생성 성공!*

📅 날짜: ${dateInfo.full}
⏱ 소요시간: ${duration}초

💡 오늘의 팁: ${content.tip.title}
💬 오늘의 한마디: ${content.quote.text.substring(0, 50)}...

🏛️ 공공·정부 AI: ${content.localGovCase._failed ? '❌ 검색 실패' : '✅ ' + content.localGovCase.title.substring(0, 30) + '...'}
🔥 AI 핫이슈: ${content.hotIssue._failed ? '❌ 검색 실패' : '✅ ' + content.hotIssue.title.substring(0, 30) + '...'}

🔗 확인: https://chrisryugj.github.io/AIDo/`;

        await sendTelegramMessage(successMessage);

        console.log(`\n✨ 모든 작업 완료! (${duration}초)\n`);
        process.exit(0);

    } catch (error) {
        console.error('\n❌ 오류 발생:', error);
        console.error(error.stack);

        // 실패 메시지
        const failMessage = `❌ *AI출근길 자동 생성 실패*

📅 날짜: ${formatDate(new Date()).full}
⚠️ 오류: ${error.message}

관리자 확인이 필요합니다.`;

        await sendTelegramMessage(failMessage);

        process.exit(1);
    }
}

// 실행
main();
