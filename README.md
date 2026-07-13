# 서울대학교 로켓동아리 하나로 — 홈페이지

**하늘을 나는 로켓, 하나로.** SNU Rocket Team HANARO 공식 홈페이지 소스입니다.

빌드 도구 없이 동작하는 **순수 정적 사이트**(HTML/CSS/JS)라서, 파일을 그대로
서버에 올리기만 하면 됩니다. 외부 CDN 의존성도 없습니다(폰트 포함 전부 셀프호스팅).
기존 Google Sites 사이트의 실제 콘텐츠(연혁·팀·후원사·회장단 연락처·후원 계좌)를
그대로 옮겨 담고, 요즘 트렌드의 다크 스페이스 테마로 리뉴얼했습니다.

## 페이지 구성

| 파일 | 내용 |
| --- | --- |
| `index.html` | 홈 — 히어로, 소개, 활동 목표, 4개 팀(사진), 연혁 로드맵, 후원사 |
| `members.html` | 멤버 — 회장단·팀 조직도, 팀별 역할 |
| `support.html` | 후원 — 후원 혜택, 후원 방법(재단 기부·계좌·문의) |
| `contact.html` | 연락처 — 회장단 이메일·전화, 동아리방 위치·지도 |
| Archive | 외부 Notion 아카이브로 연결(네비게이션 링크) |

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

- **Archive 링크**: 각 HTML 네비/푸터의 `chief-sing-e0a.notion.site` 링크를
  실제 아카이브 Notion 페이지의 정확한 주소로 바꿔 주세요.
- **회장단 연락처**: `contact.html`의 회장단 카드와 각 페이지 푸터의 이메일을
  임기 교체 시 갱신하세요. (현재 기존 사이트에 공개된 정보 그대로 반영)
- **후원 계좌·재단 절차**: `support.html`의 계좌번호와 문구를 확인/갱신하세요.
- **사진 교체**: `assets/photos/`의 이미지는 기존 사이트에서 추출한 **웹 표시본**입니다.
  가능하면 동아리가 보관 중인 **원본 고해상도 파일**로 교체하세요(같은 파일명 유지).
- **후원사**: `index.html`·`support.html`의 `.sponsors` 블록에서 추가/수정.
- **연혁 추가**: `index.html`의 `.timeline` 안 `.tl-item` 블록을 복사해 채우세요.
- **색상/폰트**: `css/style.css` 상단의 `:root` 토큰만 바꾸면 전체에 반영됩니다.

## 디렉터리 구조

```
├── index.html / members.html / support.html / contact.html
├── css/style.css          # 디자인 시스템 + 전체 스타일
├── js/main.js             # 별 배경, 스크롤 애니메이션, 내비게이션
└── assets/
    ├── favicon.svg
    ├── og.png             # SNS 공유 썸네일
    ├── photos/            # 히어로·팀 사진 (원본 고해상도로 교체 권장)
    └── fonts/             # Pretendard, Space Grotesk (셀프호스팅)
```
