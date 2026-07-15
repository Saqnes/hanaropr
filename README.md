# HANARO — 서울대학교 로켓동아리 홈페이지

**Per Ardua ad Astra.** SNU Rocket Team HANARO 공식 홈페이지 소스입니다.

빌드 도구·프레임워크·외부 CDN 없이 동작하는 **순수 정적 사이트**(HTML/CSS/JS).
파일을 그대로 서버에 올리기만 하면 됩니다. **웹폰트도 쓰지 않습니다**(시스템
폰트만 사용 — Helvetica/Arial + 시스템 한글).

## 디자인

- 팀의 3D 도색 파일에서 가져온 **딥 네이비 · 골드 · 코럴** 팔레트와
  시스템 폰트, **엔지니어링 블루프린트 / 미션 터미널** 무드.
- 히어로 중심은 3D 파일의 실측 지오메트리(Von Kármán 노즈 · 전장 2329mm ·
  Ø85mm · 2단 · 스테이지 분리 1400mm)로 생성한 **로켓 도면(`assets/rocket.svg`)**.
- 별(스타필드) 없음, 그라데이션 텍스트 없음 — 정밀한 도면·모노스페이스 데이터
  중심의 절제된 스타일.

## 페이지 구성 (상단 메뉴)

| 파일 | 메뉴 | 내용 |
| --- | --- | --- |
| `index.html` | Home | 로켓 도면 히어로 · 소개 · 기준 기체 제원 · 4개 시스템 · 개발 과정 |
| `about.html` | About | 정체성 · 로켓을 만드는 이유 · 설계→제작→시험→발사 · 일하는 방식 |
| `projects.html` | Projects | 기준 기체(목표·과정·제원·갤러리) + 연도별 프로젝트 카드 템플릿 |
| `teams.html` | Teams | 4팀 심화(추진·공력구조·전자·회수) · 조직도 · 입부 안내 |
| `archive.html` | Archive | 발사 기록 · 수상 · 대외활동 · 협력 (탭) |
| `support.html` | Support | 후원 필요성·사용처·신뢰성·후원 예우(티어)·방법 |
| `contact.html` | Contact | 문의 경로 · 문의 폼 · 회장단 연락처 · 오시는 길 |

## ⚠️ 채워야 할 내용 (플레이스홀더)

이 사이트는 **주어진 파일(요구사항 PDF · 로고 · 3D 로켓)에서 확인되는 정보만**
실제로 채웠습니다. 동아리 고유 정보는 **금색 점선 자리표시(`.ph`)** 로 남겨
두었으니, 아래 항목을 실제 값으로 교체하세요.

- 회장단 이름·연락처 (`contact.html`, 각 페이지 푸터)
- 연도별 발사 이력·수상 (`archive.html`, `projects.html`)
- 후원사 로고·목록 (`index.html`, `support.html`, `archive.html`)
- 후원 계좌·재단 기부 절차 (`support.html`)
- 동아리방 주소·지도 (`contact.html`)
- 문의 폼 **수신 이메일**: `contact.html`의 `<form id="contactForm" data-to="여기에@메일">`
- 활동 사진: `projects.html`·`teams.html`의 "사진 자리"에 실제 사진 삽입
- 소셜 공유 썸네일 `assets/og.png` (선택)

> 자리표시는 `<span class="ph">…</span>` 로 표시됩니다. 텍스트만 바꾸고
> `class="ph"` 를 지우면 일반 텍스트가 됩니다.

## 콘텐츠 수정 템플릿 (비전문가용)

각 콘텐츠는 **HTML 블록을 복사·붙여넣기**로 추가합니다. 빌드 과정 없음.

**발사·수상 기록** — `archive.html`의 `.log` 안에 복사:
```html
<div class="log-row"><span class="yr mono">2026</span>
  <div><p class="nm">기체 · 대회</p><p class="ds">설명.</p></div>
  <div class="mt"><span class="pill go">발사 완료</span></div></div>
```
성공은 `pill go`(골드), 이상·부분 성공은 `pill warn`(코럴).

**프로젝트 카드** — `projects.html`의 `#project-grid` 안에 복사:
```html
<article class="panel" data-year="2026"><span class="eyebrow no-rule">Project</span>
  <h3 style="margin-top:6px">로켓 이름</h3><p style="margin-top:10px">요약.</p>
  <div class="tags"><span>2026</span><span>대회</span></div></article>
```
상단 `.filter`에 `<button class="chip" data-filter="2026" aria-pressed="false">2026</button>` 추가.

## 로컬 미리보기 · 배포

```bash
python3 -m http.server 8000   # → http://localhost:8000
```
정적 호스팅이면 어디든 가능(학교 서버 · GitHub Pages 등). 저장소 전체를
웹 루트에 올리면 됩니다.

## 색상 · 폰트

`css/style.css` 상단 `:root` 토큰만 바꾸면 전체 반영됩니다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--paper` | `#0e1116` | 딥 네이비 배경(3D 파일) |
| `--navy` | `#0a1a3f` | 브랜드 남색 |
| `--gold` | `#f5a623` | 시그니처 골드 · 주 포인트 |
| `--coral` | `#f98a80` | 로고 코럴 · 보조 포인트 |

- 폰트: 시스템 Helvetica/Arial(영문·숫자) + 시스템 한글(Apple SD Gothic Neo /
  Malgun Gothic), 데이터는 시스템 모노스페이스. **웹폰트/외부 의존 없음.**

## 영문 페이지 확장 (향후)

`/en/` 경로에 같은 구조로 복제하고 `<html lang="en">`으로 설정하면
`[lang="en"]` 스타일이 자동 적용됩니다. 상단 메뉴에 KO/EN 토글을 추가할 때는
**실제 번역이 준비된 링크만** 노출하세요.

## 디렉터리 구조

```
├── index.html / about.html / projects.html / teams.html
│   / archive.html / support.html / contact.html
├── css/style.css          # 디자인 시스템 + 전체 스타일 (from scratch)
├── js/main.js             # 내비게이션·스크롤 리빌·미션클럭·프로젝트 필터
│                          #  · 아카이브 탭·문의 폼
└── assets/
    ├── rocket.svg         # 3D 파일 지오메트리로 생성한 로켓 도면
    ├── favicon.svg        # 코럴 로켓 마크
    └── og.png             # SNS 공유 썸네일 (교체 권장)
```
