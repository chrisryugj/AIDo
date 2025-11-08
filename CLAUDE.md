# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI출근길 (AI-Do)** is a daily newsletter web application designed for Korean public servants, providing AI-related tips, news, and practical GPT prompts to help improve their daily work efficiency. The project delivers curated content including quotes, practical tips, local government AI use cases, hot AI news, and trending topics.

## Project Structure

- **index.html** - Main daily newsletter page with embedded JavaScript for dynamic content
- **Content Generator (3 separate files for maintainability)**:
  - **generator.html** (174 lines) - HTML structure only
  - **generator.css** (320 lines) - All UI styles
  - **generator.js** (1980 lines) - All logic including Gemini API integration
    - ⚠️ News collection settings at ~line 800
    - ⚠️ HTML template at ~line 1600
    - ⚠️ Prompt configuration at ~line 1050
- **daily-update-prompt.md** - Comprehensive guide for manual content updates (Korean)
- **README.md** - Project documentation and usage guide
- **CLAUDE.md** - This file, guidance for Claude Code
- **250829_gpt.html, 250902.html, 250903.html** - Archived daily editions
- **coupon.html** - Separate HTML page (likely for special promotions or events)
- **images/** - Contains cover images and OG (Open Graph) images for social media sharing
- **250903.html** - NotebookLM tutorial guide (a separate educational resource)

### Generator File Breakdown (as of 2025-11-08)

The content generator was refactored from a monolithic 2390-line file into three modular files for easier maintenance:

**Before refactoring:**
- `generator.html`: 95KB, 2390 lines (difficult to edit)

**After refactoring:**
- `generator.html`: 8.9KB, 174 lines (HTML structure + external references)
- `generator.css`: 6.5KB, 320 lines (all styles)
- `generator.js`: 81KB, 1980 lines (all logic)

Each file includes comprehensive header documentation explaining:
- Purpose and usage
- Warning about what NOT to modify
- Common modification scenarios
- Change history
- Related files

## Architecture

### Single-Page Architecture
The project uses a **static HTML architecture** with inline CSS and JavaScript. All daily content is configured via JavaScript variables at the top of the HTML file (lines 461-533 in index.html), making it easy to update without touching the layout or styling code.

### Content Update System
The daily content update process is separated into two clear sections:
1. **Dynamic Content Variables** (lines 461-533): All date-sensitive content is defined as JavaScript objects
2. **Static Layout & Styling** (remainder of file): UI structure and design that remains constant

Key content variables that change daily:
- `currentDate` - Today's date in Korean format
- `todayQuote` - Inspirational quote with author
- `todayTip` - Practical GPT usage tip with detailed structure (title, summary, situation, solution, prompt, result, usage)
- `localGovCase` - Local government AI use case with link
- `hotIssue` - Current AI hot news with link
- `todayTrendsDescription` - AI trend description
- `todayTrends` - Array of 5 hashtags

### Modal System
The "오늘의 실전 팁" (Today's Practical Tip) card opens a detailed modal showing:
- Problem situation
- Solution approach
- Copy-pasteable GPT prompt
- Expected result example
- Practical application tips

### Download Feature
Users can download the current day's HTML as a standalone file via the download button in the header (downloadHTML function, line 742).

## Development Commands

Since this is a static HTML project, no build system or package manager is required.

### Local Development
```bash
# Simply open the HTML file in a browser
start index.html  # Windows
open index.html   # macOS
xdg-open index.html  # Linux
```

### Testing
No automated test suite exists. Manual testing involves:
1. Opening index.html in a browser
2. Verifying all content renders correctly
3. Testing the modal popup functionality
4. Testing the download HTML feature
5. Checking responsive design on mobile viewports

## Daily Content Update Workflow

There are two methods for updating daily content:

### Method 1: Automated Generation (NEW - Recommended)

Using **generator.html**, an AI-powered web app:

1. Open `generator.html` in a browser (or access via GitHub Pages)
2. Enter Gemini API key (saved in localStorage for future use)
3. Select date and optionally add custom instructions
4. Click "✨ 콘텐츠 생성하기" to generate content using Gemini API
5. Review the generated content preview
6. Copy or download the complete HTML
7. Replace `index.html` with the generated content
8. Commit and push to GitHub

**generator.html Features:**
- Uses Google Gemini API (gemini-2.0-flash-exp model)
- Generates all content sections automatically based on structured prompts
- Provides content preview before applying
- One-click copy to clipboard
- Direct HTML download
- API key stored securely in browser localStorage
- Custom prompt support for specific themes or keywords

### Method 2: Manual Update (Traditional)

Refer to `daily-update-prompt.md` for the complete Korean guide:

1. Modify the JavaScript variables in the "매일 변경되는 콘텐츠 영역" section
2. Update date, quote, tip details, news links, and hashtags
3. Ensure all external links are valid
4. Test the modal popup with the new tip content
5. Verify the download function generates the correct filename with today's date

### Content Guidelines (from daily-update-prompt.md)
- Quotes should be motivational and relevant to public servants
- Tips should include practical, copy-pasteable GPT prompts
- News should link to official government or reputable AI media sources
- Always use exactly 5 hashtags for trends
- Include page/source references where applicable
- OG tags must be updated daily with date and tip summary

## Key Implementation Details

### Font Usage
- Custom Korean font: 'GiantsInline' loaded from CDN for the main title
- System fonts for body text: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Color Scheme
- Primary blue gradient: `hsl(215 85% 45%)` to `hsl(210 80% 55%)`
- Background: Soft blue-gray gradient
- Cards: White with subtle shadows

### Responsive Design
- Mobile-first approach with `max-width: 48rem` container
- Media queries for title sizing at `min-width: 768px`
- Uses Korean `word-break: keep-all` to prevent awkward line breaks

### Animation Effects
- "오늘의 실전 팁" card has a pulsing animation (`tip-pulse`) to draw attention
- Hover effects with scale transforms and color transitions
- Pulsing dot indicator on the date badge

## File Naming Convention

Archived HTML files use the format: `YYMMDD.html` (e.g., `250902.html` for September 2, 2025)

Downloaded files use: `AI-Do_오늘뭐이슈_YYMMDD.html`

## Important Notes

- **No external dependencies**: index.html is self-contained; generator.html only requires internet for Gemini API calls
- **Security**: The footer includes contact email (ryuseungin@gwangjin.go.kr) for the project maintainer
- **Analytics**: Uses hitscounter.dev for page view tracking
- **OG Tags**: Fully implemented with dynamic updates via JavaScript. Title and description change daily based on content
- **NotebookLM Guide**: The 250903.html file is a separate educational resource about Google NotebookLM, not part of the daily newsletter structure
- **API Security**: Gemini API keys stored in browser localStorage only, never transmitted to servers other than Google's API
- **Content Validation**: Generated news links should be manually verified as the AI may generate plausible but non-existent URLs

## Generator Technical Details

### File Organization (Refactored 2025-11-08)

The generator is split across three files for maintainability:

**generator.html** (174 lines)
- Minimal HTML structure
- Links to external CSS and JS
- Contains all UI elements (forms, inputs, buttons, modals)
- Easy to modify layout without touching logic

**generator.css** (320 lines)
- All styling for the generator interface
- Fonts: Atomy, SimGyeongha
- Blue gradient color scheme matching index.html
- Button styles, form controls, loading spinners, alerts
- Note: This is NOT for index.html - those styles are embedded in generator.js

**generator.js** (1980 lines)
- All JavaScript logic
- Complete header documentation with function index
- Three critical sections to modify:
  1. **News collection config (~line 800)**:
     - Public/Gov AI news: Keywords, domains, date range
     - AI Hot Issue: Tech/industry focus, Korean sources only
  2. **HTML template (~line 1600)**:
     - Complete index.html structure embedded as template literal
     - Modify this to change the final output HTML
  3. **Prompt configuration (~line 1050)**:
     - AI prompt structure that affects content quality
     - Adjust for different content styles

### API Integration (in generator.js)
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- **Model**: `gemini-2.5-flash` with grounding (Google Search integration)
- **Parameters**:
  - temperature: 0.3-0.9 (varies by section)
  - maxOutputTokens: 2048-8192
  - topK: 40, topP: 0.95
  - tools: googleSearch (for news collection)

### News Collection Strategy (Updated 2025-11-08)
- **Public/Government AI Cases**:
  - Focus: Local gov + central gov + public institutions
  - Keywords: 지자체, 공공기관, 중앙부처, 정부, AI, 스마트행정, 디지털전환
  - Time range: 1-2 days (tightened from 1 week)
  - Language: Korean only

- **AI Hot Issues**:
  - Focus: Pure AI tech/industry (NOT public sector)
  - Keywords: AI 신기술, LLM, 생성형AI, 모델, 칩, 산업, 스타트업
  - Sources: Korean IT media (etnews, ddaily, inews24, zdnet, aitimes, tech42, it.chosun)
  - Time range: 1-2 days
  - Language: Korean only

### Prompt Engineering
The generator uses a structured prompt that requests JSON output with specific fields matching the index.html content structure. The prompt includes:
- Context: AI newsletter for public servants
- Date information
- Required JSON schema with all content fields
- Validation rules (e.g., exactly 5 hashtags)
- Optional custom instructions from user input

### Error Handling
- API key validation before generation
- JSON parsing with markdown code block stripping
- User-friendly error messages
- Loading indicators during API calls
- News deduplication (tracks last 14 days in localStorage)

### Data Flow
1. User inputs date and optional custom prompt in generator.html
2. generator.js builds structured prompt
3. Structured prompt sent to Gemini API (with Google Search grounding)
4. API returns JSON with all content sections
5. JSON parsed and validated
6. Content inserted into embedded index.html template (in generator.js)
7. Full HTML displayed for copy/download

### Maintenance Notes
- To modify news keywords: Edit generator.js ~line 800
- To modify UI colors: Edit generator.css
- To modify HTML layout: Edit generator.html (structure) or generator.js (template)
- All files have detailed header comments explaining their role
