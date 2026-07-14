# 서울대학교 로켓동아리 하나로 — 홈페이지

**하늘을 나는 로켓, 하나로.** SNU Rocket Team HANARO 공식 홈페이지 소스입니다.

빌드 도구 없이 동작하는 **순수 정적 사이트**(HTML/CSS/JS)라서, 파일을 그대로
서버에 올리기만 하면 됩니다. 외부 CDN 의존성도 없습니다(폰트 포함 전부 셀프호스팅).
다크 스페이스 테마에 **하나로 시그니처 컬러(남색 · 골드 · 핑크)** 를 적용하고,
2026 웹 트렌드와 항공우주 기업 사이트의 관례(미션컨트롤 HUD · 스펙 시트 ·
발사 로그)를 참고해 리뉴얼했습니다.

## 페이지 구성 (상단 메뉴)

| 파일 | 메뉴 | 내용 |
| --- | --- | --- |
| `index.html` | Home | 히어로 · 소개 · 팀 · 대표 기체 · 프로젝트 · 비행 기록 · 후원사 |
| `about.html` | About | 정체성 · 우리가 로켓을 만드는 이유 · 개발 과정(설계→제작→시험→발사) · 숫자 · 일하는 방식 |
| `projects.html` | Projects | 최신 프로젝트(목표·기간·팀·과정·결과·갤러리) · 연도별 프로젝트(필터) · 기체 스펙 |
| `teams.html` | Teams | 4팀 심화(추진·공력구조·전자·회수) · 조직도 · 회장단 · 입부 안내 |
| `archive.html` | Archive | 발사 기록 · 수상 · 대외활동 · 협력 (탭) + 노션 전체 아카이브 링크 |
| `support.html` | Support | 후원 필요성 · 후원금 사용처 · 신뢰성 · 후원 예우 · 혜택 · 방법 · 후원사 |
| `contact.html` | Contact | 문의 경로 · 문의 폼 · 회장단 연락처 · 오시는 길(지도) |

## 로컬에서 미리 보기

```bash
# 저장소 루트에서
python3 -m http.server 8000
# → http://localhost:8000 접속
```

## 배포

정적 호스팅이면 어디든 가능합니다.

- **학교 서버 / 기존 호스팅**: 저장소 전체 파일을 웹 루트에 업로드
- **GitHub Pages**: Settings → Pages → 브랜치 선택만 하면 끝

---

## 콘텐츠 수정 가이드 (비전문가용)

각 콘텐츠는 **HTML 블록을 복사·붙여넣기** 해서 추가합니다. 아래 템플릿을
복사한 뒤 내용만 바꾸면 됩니다. 별도의 빌드 과정은 없습니다.

### ① 프로젝트 추가 (`projects.html` → `연도별 프로젝트`)

`id="project-grid"` 안에 아래 블록을 복사해 넣고, 상단 `.filter-bar`에 새
연도 버튼(`<button class="chip" data-filter="2026" aria-pressed="false">2026</button>`)을
추가하세요. `data-year` 값이 필터와 연결됩니다.

```html
<article class="project-card" data-year="2026">
  <span class="ghost" aria-hidden="true">2026</span>
  <span class="project-chip">라벨 · Label</span>
  <h3>로켓 이름</h3>
  <p class="ko">한글 이름</p>
  <p class="desc">한두 문장 설명.</p>
  <div class="spec-row"><span>2026</span><span>태그</span></div>
</article>
```

### ② 발사 · 수상 기록 추가 (`archive.html`)

해당 탭(`발사 기록` / `수상`)의 `.log` 안에 복사해 넣으세요.
상태 배지: 성공은 `pill go`, 이상·부분 성공은 `pill warn`.

```html
<div class="log-entry">
  <span class="yr mono">2026</span>
  <div>
    <p class="name">기체 · 대회</p>
    <p class="desc">활동 설명.</p>
  </div>
  <div class="meta"><span class="pill go">발사 완료</span></div>
</div>
```

### ③ 활동 사진 추가 (`projects.html` → `.gallery`)

사진은 `assets/photos/`에 올리고(가능하면 원본 고해상도), **활동명 · 설명**을
반드시 함께 적어 단순 이미지 나열을 피합니다.

```html
<figure>
  <img src="assets/photos/새사진.jpg" alt="사진 설명" width="1000" height="750" loading="lazy">
  <figcaption><span class="cap-meta mono">활동명 · 날짜</span>사진 설명.</figcaption>
</figure>
```

### ④ 후원사 추가 (`index.html` · `support.html` · `archive.html`의 `.sponsors`)

```html
<div class="sponsor"><span class="name">후원사명</span><span class="kind">English · 후원</span></div>
```

### ⑤ 정기 갱신 항목 (홍보팀 · 담당자)

- **회장단 연락처**: `contact.html`의 회장단 카드와 각 페이지 푸터 이메일 — 임기 교체 시 갱신.
- **후원 계좌 · 재단 절차**: `support.html`의 계좌번호와 문구 확인/갱신.
- **아카이브 · 최신 활동 · 후원 정보**: 학기마다 발사 기록·수상·대외활동을 갱신.
- **노션 아카이브 링크**: 각 페이지의 `chief-sing-e0a.notion.site` 링크를 실제 주소로 확인.

> 업데이트 권한과 책임은 **홍보팀(또는 홈페이지 담당자)** 에게 있습니다.

---

## 디자인 시스템 · 색상/폰트

`css/style.css` 상단의 `:root` 토큰만 바꾸면 전체에 반영됩니다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--bg-0` | `#0a1120` | 딥 네이비(남색) 배경 |
| `--gold` | `#F8B62B` | 시그니처 골드(노란색) · 주 포인트 |
| `--pink` | `#F77D90` | 시그니처 핑크(로켓 화염) · 보조 포인트 |
| `--grad-flame` | gold → pink | 엠블럼 별·로켓 궤적 시그니처 그라데이션 |

- 골드 8 : 핑크 2 비율로 사용(핑크는 회수팀·강조 등 소수 포인트).
- 폰트: 본문·제목 **Pretendard**(한글), 디스플레이·라벨 **Space Grotesk**(영문/숫자),
  데이터·좌표는 시스템 모노스페이스(`--font-mono`) — 전부 셀프호스팅/무의존.

## 영문 페이지 확장 (향후)

핵심 소개(About)와 후원(Support)부터 영문화할 수 있도록 설계했습니다.

- 영문 페이지는 `/en/` 경로에 같은 구조로 복제하고 `<html lang="en">`으로 설정하면,
  `[lang="en"]` 스타일(자간·줄바꿈 규칙)이 자동 적용됩니다.
- 상단 메뉴에 KO/EN 토글을 추가할 때는 **실제 번역 페이지가 준비된 링크만** 노출하세요
  (빈 링크·자동번역 위젯은 지양).

## 디렉터리 구조

```
├── index.html / about.html / projects.html / teams.html
│   / archive.html / support.html / contact.html
├── css/style.css          # 디자인 시스템 + 전체 스타일
├── js/main.js             # 별 배경·스크롤 애니메이션·내비게이션·미션클럭
│                          #  · 프로젝트 필터·아카이브 탭·문의 폼
└── assets/
    ├── favicon.svg · emblem.png · og.png · apple-touch-icon.png
    ├── photos/            # 히어로·팀·활동 사진 (원본 고해상도로 교체 권장)
    └── fonts/             # Pretendard, Space Grotesk (셀프호스팅)
```
