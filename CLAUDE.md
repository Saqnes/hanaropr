# HANARO — 서울대학교 로켓동아리 웹사이트 (`saqnes/hanaropr`)

과학로켓을 직접 설계·제작·시험·발사하는 SNU 학생 팀 **HANARO**의 공식 웹사이트 +
**비개발자 관리자용 CMS**. 순수 정적 사이트(빌드/프레임워크/외부 의존성 없음)이며
Cloudflare Pages로 배포됩니다.

## 황금률 (먼저 읽기)
- **빌드 스텝·프레임워크·번들러·npm 의존성 없음.** HTML/CSS/바닐라 JS만. 이 원칙을 깨지 말 것.
- **외부 CDN·웹폰트·원격 리소스 금지.** 시스템 폰트만(Helvetica/Arial + Apple SD Gothic Neo/맑은 고딕 + system mono). 모든 자산은 `assets/`에 로컬로.
- **디자인 = 블루프린트/미션터미널 미학.** 그리드 배경, 코너틱 패널, mono 텔레메트리. 브랜드색: `--navy #0a1a3f`, `--gold #f5a623`, `--coral #f98a80`.
- **테마 2종 (기본=밝은 화면).** `css/style.css`의 `:root`=라이트(청사진 용지 `--paper #f6f5f1`), `:root[data-theme="dark"]`=다크(미션 터미널 `--paper #0e1116`).
  **색은 반드시 토큰으로만** 쓸 것 — 하드코딩하면 한쪽 테마가 깨진다. 특히 글자색은 `--gold-ink`/`--gold-hi`/`--coral-ink`(테마별로 읽히는 값), 골드 *면* 위 글자는 `--on-gold`, 면 hover는 `--gold-fill-hi`. 표면은 `--surface`/`--surface-in`/`--surface-hi`/`--panel-grad`, 바 배경은 `--nav-bg`/`--menu-bg`/`--bar-bg`.
  전환: nav의 `#themeToggle`(js/main.js) → `localStorage['hanaro-theme']`. 깜빡임 방지로 각 페이지 `<head>` 인라인 스크립트가 첫 페인트 전에 `data-theme`을 세팅한다(새 페이지 추가 시 이 스크립트와 토글 버튼도 같이 넣을 것). `admin.html`은 인라인 CSS가 어두운 표면 전제라 `data-theme="dark"` 고정.
- **바꾸면 브라우저로 검증 후 커밋.** 로컬 서버 + Playwright(아래). 추측 커밋 금지.
- 로켓 도면 `assets/rocket.svg`는 3D 도색모델 실측 기하(Von Kármán 노즈, 전장 2329mm 등)에서 도출한 것 — 함부로 대충 고치지 말 것.

## 아키텍처 — 정적 사이트 CMS
공개 페이지는 **`assets/data.json`** 을 읽어 콘텐츠를 채우고, **`admin.html`** 이 그 파일을 편집합니다.
```
공개 .html  ──loads──▶  js/cms.js (공용 렌더러)  ──reads──▶  assets/data.json
admin.html  ──loads──▶  js/cms.js + js/admin.js  ──edits──▶  assets/data.json (POST /api/save)
functions/api/save.js   : data.json 을 GitHub에 커밋 (자동 재배포)
functions/api/upload.js : 사진을 assets/uploads/ 에 커밋
```

### 콘텐츠가 채워지는 두 방식
1. **구조화 데이터** (목록/객체) → `data.json`의 키를 `cms.js`가 특정 컨테이너에 렌더:
   - `#cms-projects`,`#cms-filter`(projects.html) · `#cms-launches`,`#cms-awards`(archive.html) · `#cms-sponsors`(archive/index/support) · `#cms-contacts`(contact.html) · `#cms-org-leads`(teams.html 조직도 회장단 줄 — `contacts`를 그대로 렌더, 비면 HTML 기본 노드 유지) · `#cms-account`,`#cms-foundation`,`#cms-launch-count`(support.html) · `#cms-address`,`#cms-map`(contact.html) · `#cms-home-projects`,`#home-projects-sec`(index.html, `featured:true`인 프로젝트만)
2. **페이지에 박힌 문구/사진** → HTML 요소의 마커 속성을 `cms.js`가 덮어씀(값 없으면 원문 유지):
   - `data-cms-text="키"` — 단일 텍스트(textContent)
   - `data-cms-rich="키"` — 텍스트+강조/줄바꿈. 마크업: `*금색*`,`~코랄~`, 줄바꿈=`<br>` (`markupToHtml`이 항상 이스케이프 → XSS 안전)
   - `data-cms-list="키"` (+`data-cms-item="span"`) — 목록(li/span)
   - `data-cms-img="키"` — 사진 자리. placeholder 패널이든 도면(figure/schematic, `rocket.svg` 기본)이든 `data.images[키]`가 있으면 사진으로 교체(`<img class="slot-img">` 오버레이, 기본 도면은 `.has-photo` CSS로 숨김). 관리자 라벨은 `data-cms-img-label="사람이 읽는 이름"`(없으면 eyebrow/ph-note/figcaption/alt 순 폴백)

### `data.json` 스키마
```jsonc
{
  "site":     {"email","instagram","notion","address","apply"},   // 푸터/문의폼 · apply=입부 지원 구글폼 URL
  "contacts": [{"role","name","email","phone"}],                 // 회장단
  "support":  {"bank","number","holder","foundation"},           // 후원 계좌/재단링크
  "location": {"address","mapEmbed"},                            // mapEmbed=지도 iframe src(설정 시 우선). 미설정이면 contact.html에 박힌 카카오맵(Daum 지도퍼가기, daumcdn 로더) 사용 — 지도 하나뿐인 외부 리소스 예외
  "projects": [{"name","ko","year","event","team","status","summary","image","featured"}],
  "launches": [{"date"(YYYY-MM-DD),"status"(go|warn),"name","desc"}], // date→연도(크게)+월.일(작게), 구형 "year"도 표시
  "awards":   [{"year","rank","name","desc"}],
  "sponsors": [{"name","kind"}],
  "content":  {"<page.section.field>": "덮어쓴 문구", ...},        // 바꾼 문구만 저장
  "images":   {"<slot-key>": "assets/uploads/…"}                 // 올린 사진만
}
```
> `assets/data.json`은 **공개 파일**(누구나 읽음) — 비밀/미공개 개인정보 넣지 말 것.
> 기본은 빈 값으로 배포(플레이스홀더 표시). `assets/data.example.json`은 예시(미리보기·참고용).

## 관리자 편집기 (`admin.html` + `js/admin.js`)
- **탭**: 프로젝트·발사기록·수상·후원사·회장단(목록형) / 후원정보·위치·사이트정보(단일형) / **페이지 문구**(마커 문구, 페이지별 아코디언·검색·"원래대로") / **사진**(사진 슬롯 업로드).
- **라이브 미리보기**: 우측 iframe에 실제 페이지를 띄우고 편집 상태를 그대로 반영(`loadFrame`이 `window.HANARO_DATA` 주입 + `applyToFrame`). **미리보기에서 문구/사진 클릭 → 해당 편집칸으로 점프**(`window.__adminEdit`). 모바일은 편집/미리보기 **토글**(`#mobileToggle`, `body.pv-mode`).
- **저장**: `사이트에 반영` → `POST /api/save` (헤더 `x-admin-secret`=ADMIN_SECRET, `x-base-hash`=동시편집 감지). 백엔드 없으면 `JSON 백업`(다운로드). 상세 안내는 `ADMIN.md`.
- **사진 업로드**: 위젯 클릭 또는 **드래그&드롭** → `POST /api/upload` → `assets/uploads/`에 커밋. 백엔드 없으면 소용량은 data URI 폴백.
- **안전장치**: 로드 실패 시 저장잠금(빈화면 저장으로 사이트 삭제 방지) · 초안 자동복원(localStorage) · 삭제/사진제거 확인 · 미저장 이탈 경고 · 저장상태 표시.
- **접근 잠금 `REQUIRE_PASS`** (`js/admin.js` 상단): `true`면 진입 시 소프트 암호(`PASS_HASH`=SHA-256, 기본 "hanaro2026"). Cloudflare **Access**(이메일 로그인)로 `/admin.html`을 막으면 `false`로 꺼도 됨(로그아웃=Access 로그아웃). **이 암호는 보조 잠금** — 진짜 쓰기 보호는 `ADMIN_SECRET`.

## 백엔드 (Cloudflare Pages Functions) + 환경변수
`functions/api/save.js`, `functions/api/upload.js` — **환경변수 미설정이면 403(fail-closed)** 이라 그냥 배포해도 안전. 보안 2단: (1) 선택적 Access JWT 검증, (2) `x-admin-secret`===`ADMIN_SECRET`.

| 변수 | 값 | 비고 |
| --- | --- | --- |
| `ADMIN_SECRET` | 임의의 긴 문자열 | 편집기 "저장 암호"에 입력 |
| `GH_TOKEN` | 파인그레인드 PAT(Contents R/W) | `saqnes/hanaropr` 쓰기 권한 |
| `GH_REPO` | `saqnes/hanaropr` | 배포 리포 |
| `GH_BRANCH` | `claude/aerospace-website-design-9f5g2m` | 현재 배포/커밋 브랜치 |
| `GH_PATH` | `assets/data.json` | 기본값 |
| `ACCESS_TEAM_DOMAIN`,`ACCESS_AUD` | (선택) | Access JWT 검증 활성화 |

## 배포 (Cloudflare Pages)
- **빌드 명령 없음**, 출력 디렉터리 = 루트. `404.html`은 Pages가 자동으로 없는 경로에 노출.
- 현재 **Cloudflare Pages(하나로 계정) ↔ `saqnes/hanaropr`** 연결. 프로덕션 브랜치 = `claude/aerospace-website-design-9f5g2m`. 위 환경변수 설정 시 관리자 저장/업로드 동작.
- Cloudflare **Access가 `/admin.html`·`/api/*`** 를 막아야 실제 접근 제한(관리자 이메일만). `.pages.dev`엔 Access가 안 걸리니 **커스텀 도메인** 필요.

## 로컬 개발 & 검증
빌드 없음 — 루트에서 정적 서버만:
```
python3 -m http.server 8080   # http://localhost:8080/  (admin은 /admin.html)
```
브라우저 검증(설치돼 있음): Playwright at `/opt/node22/lib/node_modules/playwright`, Chromium at `/opt/pw-browsers`. 관리자 흐름·공개 페이지를 실제로 구동해 콘솔 에러/레이아웃/기능을 확인 후 커밋. (참고: `/api/*`는 Cloudflare Functions라 로컬 정적 서버엔 없음 → 업로드/저장은 폴백 경로로 확인.)

## 파일 지도
```
index/about/projects/teams/archive/support/contact.html  공개 7페이지 (+ 404.html)
css/style.css        디자인 시스템 (:root 토큰 + 컴포넌트)
js/cms.js            공용 렌더러 (apply/hydrate/applyContent/applyImages/read*Defaults*)
js/main.js           공개 페이지 UX (nav/모바일메뉴/reveal/카운트업/시계/문의폼) → hydrate() 호출
admin.html + js/admin.js   관리자 편집기
functions/api/save.js, upload.js   백엔드 (fail-closed)
assets/  data.json(공개 콘텐츠) · data.example.json(예시) · rocket.svg · favicon.svg · og.png · uploads/
ADMIN.md             관리자/보안/환경변수 상세 가이드
```

## 흔한 함정
- `js/cms.js`의 `norm()`이 소스 들여쓰기/줄바꿈을 접어 렌더와 일치시킴 — `readContentDefaults`가 이걸 씀.
- 줄바꿈: 관리자가 입력한 값에 `\n`이 있으면 `escLines()`로 `<br>` 보존(프로젝트 summary·발사/수상 desc·`data-cms-text`). 항상 이스케이프 후 `<br>`만 붙이므로 XSS 안전.
- `.ph`(점선 플레이스홀더 서식)는 값이 채워지면 `applyContent`가 자동으로 벗김(`data-ph`로 원복 가능) — 실제 내용이 "입력하세요" 박스처럼 보이지 않게.
- 미리보기 iframe은 `fetch`+`document.write`로 `<base href="/">`와 `window.HANARO_DATA` 스냅샷을 주입 → 실제 페이지 그대로 + 즉시 반영. 방금 올린 사진은 재배포 전이라 `pendingImg`로 로컬 dataURL 대체.
- 새 편집 문구/사진 슬롯을 추가하려면 **HTML에 마커 속성**을 달면 관리자 편집기가 페이지를 읽어 **자동 발견**함(스키마 수정 불필요).
- 목록 항목 `title()`에 `★`=featured 표시(프로젝트). 긴 무공백 문자열 대비 CSS에 말줄임/`min-width:0`/`overflow-wrap` 방어 있음.

## 지금 상태 / 다음 할 일
- 사이트·관리자 기능 완성(안전·명료·모바일·XSS 안전·Playwright 검증 완료). **`saqnes/hanaropr`에서 계속 개발**(조직 리포 이관은 취소).
- 배포: **하나로 계정 Cloudflare Pages ↔ `saqnes/hanaropr`** 연결 중. 테스트 페이즈라 Cloudflare **Access는 OFF**, 편집기 소프트 암호 **`REQUIRE_PASS=true`**(공유 암호로 팀 진입).
- 콘텐츠는 아직 플레이스홀더 — 팀이 `admin.html`에서 실제 데이터/사진을 채우는 단계.
- 권장: 운영 시작 시 Access 다시 켜기 + `PASS_HASH`/`ADMIN_SECRET`을 팀 전용 값으로.
