# 서울대학교 로켓동아리 하나로 — 홈페이지

**하늘을 나는 로켓, 하나로.** SNU Rocket Team HANARO 공식 홈페이지 소스입니다.

빌드 도구 없이 동작하는 **순수 정적 사이트**(HTML/CSS/JS)라서, 파일을 그대로
서버에 올리기만 하면 됩니다. 외부 CDN 의존성도 없습니다(폰트 포함 전부 셀프호스팅).

## 페이지 구성

| 파일 | 내용 |
| --- | --- |
| `index.html` | 메인 — 히어로, 동아리 소개, 통계, 활동 분야, 대표 프로젝트, 모집 CTA |
| `about.html` | 소개 — 미션, 30년 연혁 타임라인, 사람들(지도교수·부원) |
| `projects.html` | 프로젝트 — HARANG, SNUKA-Ⅱ 등 로켓 아카이브 |
| `recruit.html` | 모집 — 하나로에서의 경험, 합류 절차, FAQ |
| `contact.html` | 연락처 — SNS, 위치(공대 31동 401호), 후원·협력 문의 |

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

## 콘텐츠 수정 가이드

- **연락처/SNS**: 각 HTML 하단 `<footer>`와 `contact.html`의 링크를 수정하세요.
  (이메일·전화번호는 담당자 변경이 잦아 SNS 채널 중심으로 구성했습니다.)
- **모집 공지**: `recruit.html`의 FAQ/절차 문구를 학기별 모집 요강에 맞게 갱신하세요.
- **새 프로젝트 추가**: `projects.html`의 `<article class="project-panel">` 블록을
  복사해 내용을 채우면 됩니다.
- **숫자(통계)**: `data-count` 속성 값을 바꾸면 카운트업 애니메이션 숫자가 바뀝니다.
- **색상/폰트**: `css/style.css` 상단의 `:root` 토큰만 바꾸면 전체에 반영됩니다.

## 디렉터리 구조

```
├── index.html / about.html / projects.html / recruit.html / contact.html
├── css/style.css          # 디자인 시스템 + 전체 스타일
├── js/main.js             # 별 배경, 스크롤 애니메이션, 내비게이션
└── assets/
    ├── favicon.svg
    ├── og.png             # SNS 공유 썸네일
    └── fonts/             # Pretendard, Space Grotesk (셀프호스팅)
```
