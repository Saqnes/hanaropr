# 서울대학교 로켓동아리 하나로 — 홈페이지

SNU Rocket Team HANARO 공식 홈페이지 소스입니다. 팀이 제공한 2026 브랜드 자산의
핑크·남색·노랑 팔레트와 실제 활동 사진을 사용합니다.

빌드 도구 없이 동작하는 **순수 정적 사이트**(HTML/CSS/JS)라서, 파일을 그대로
서버에 올리기만 하면 됩니다. 외부 CDN 의존성도 없습니다(폰트 포함 전부 셀프호스팅).

## 페이지 구성

| 파일 | 내용 |
| --- | --- |
| `index.html` | 메인 — 히어로, 동아리 소개, 통계, 활동 분야, 대표 프로젝트, 모집 CTA |
| `about.html` | 소개 — 개발 원칙, 검증된 연혁, 팀 구조 |
| `projects.html` | 프로젝트 — HARANG, 2024 NURA, SNUKA-Ⅱ, HARANG 2 기록 |
| `recruit.html` | 모집 — 모집 상태, 합류 절차, 지원 전 확인할 FAQ |
| `contact.html` | 후원·문의 — 입부, 산학협력, 기부 경로, 위치 안내 |

## 로컬에서 미리 보기

```bash
# 저장소 루트에서
python3 -m http.server 8000
# → http://localhost:8000 접속

# 정적 링크·메타데이터·JS 문법 검사
npm run check
```

## 배포

정적 호스팅이면 어디든 가능합니다.

- **학교 서버 / 기존 호스팅**: 저장소 전체 파일을 웹 루트에 업로드
- **GitHub Pages**: Settings → Pages → 브랜치 선택만 하면 끝

기존 Google Sites 경로(`/home`, `/members`, `/support`, `/contact`)에는 정적 이동 페이지가
포함돼 있습니다. 서버 설정이 가능하면 같은 매핑을 301 리디렉션으로 교체하세요.

## 콘텐츠 수정 가이드

- **사실과 수치**: 먼저 [`docs/content-facts.md`](docs/content-facts.md)의 출처와 기준일을 갱신하세요.
  목표치(`Target`)와 실제 결과(`Result`)를 반드시 구분합니다.
- **연락처/SNS**: 각 HTML 하단 `<footer>`와 `contact.html`을 함께 수정하세요.
  대표 이메일에는 기준 연도를 표기하고 임원 변경 시 즉시 교체합니다.
- **모집 공지**: `recruit.html`의 FAQ/절차 문구를 학기별 모집 요강에 맞게 갱신하세요.
- **새 프로젝트 추가**: `projects.html`의 `<article class="project-panel">` 블록을
  복사해 내용을 채우면 됩니다.
- **숫자(통계)**: `data-count` 속성 값을 바꾸면 카운트업 애니메이션 숫자가 바뀝니다.
- **색상/폰트**: `css/style.css` 상단의 `:root` 토큰을 사용합니다. 핵심 브랜드 색은
  Pink `#FE9C9C`, Navy `#253046`, Yellow `#F8B62B`입니다.
- **공개 전 검사**: `npm run check`를 실행하고 모집 일정, 운영진, 후원 절차를 다시 확인합니다.

## 디렉터리 구조

```
├── index.html / about.html / projects.html / recruit.html / contact.html
├── css/style.css          # 디자인 시스템 + 전체 스타일
├── js/main.js             # 별 배경, 스크롤 애니메이션, 내비게이션
├── scripts/check.mjs      # 무의존 정적 사이트 검사
├── docs/content-facts.md  # 검증된 사실·출처·콘텐츠 운영 규칙
├── robots.txt / sitemap.xml
└── assets/
    ├── brand/             # 팀 제공 로고·엠블럼
    ├── images/            # 팀 공식 홈페이지 기반 활동 사진
    ├── favicon.svg
    ├── og-2026.png        # SNS 공유 썸네일
    └── fonts/             # Pretendard, Space Grotesk (셀프호스팅)
```
