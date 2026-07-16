# 관리자 페이지 가이드 (`/admin.html`)

일반 방문자는 로그인할 필요가 없습니다. **관리자만** `/admin.html`에서 사이트의
거의 모든 가변 콘텐츠를 **사이트와 똑같은 포맷으로** 편집합니다:

- **프로젝트**(현황 포함) · **발사 기록** · **수상** · **후원사**
- **회장단 연락처** · **후원 정보(계좌·재단 링크)** · **위치(주소·지도)**
- **사이트 정보**(대표 이메일 · 인스타그램 · 아카이브 링크 · 푸터 주소)

## 어떻게 동작하나

공개 페이지는 **`assets/data.json`** 을 읽어 위 섹션들을 렌더링합니다(빈 값이면
빈 상태 표시). `admin.html`은 그 `data.json`을 폼으로 편집하고 **실시간 미리보기**
후 저장합니다. 편집 로직은 `js/admin.js`, 렌더링은 공개 페이지와 **동일한
`js/cms.js`** 를 씁니다(포맷이 항상 일치).

## 편집하는 법

1. `/admin.html` 접속 → 암호 입력(기본 `hanaro2026`, **반드시 변경 — ①**).
2. 상단 8개 탭에서 **+ 추가**(목록형: 프로젝트·발사기록·수상·후원사·회장단) 또는
   폼 입력(단일형: 후원 정보·위치·사이트 정보). 입력하면 오른쪽 미리보기가 즉시 갱신,
   ↑ ↓ 로 순서 변경, **삭제** 가능.
3. **저장** — 두 가지:
   - **JSON 다운로드**(백엔드 0): 받은 `data.json`을 `assets/data.json`에 커밋 →
     Cloudflare Pages 자동 재배포.
   - **서버에 저장**(옵션 ③): 버튼 하나로 GitHub 자동 커밋 → 자동 재배포(1–2분).

## ① 암호 변경 (필수)

`js/admin.js` 맨 위 `PASS_HASH`를 새 암호의 SHA-256으로 교체:
```bash
node -e "console.log(require('crypto').createHash('sha256').update('새암호').digest('hex'))"
```
> ⚠️ 이 암호는 **보조 잠금**입니다. 정적 사이트라 브라우저 코드/`data.json`은
> 누구나 볼 수 있어 암호만으로는 완전한 보안이 아닙니다. **진짜 접근 제한은 ②**.

## ② 진짜 접근 제한 — Cloudflare Access (권장·무료)

`/admin.html`(과 `/api/*`) 경로를 지정한 이메일만 열도록 네트워크 레벨에서 잠급니다.

1. Cloudflare 대시보드 → **Zero Trust** → **Access** → **Applications** →
   *Add an application* → **Self-hosted**.
2. Application domain에 사이트 도메인 + 경로 `/*admin.html*`, 두 번째 앱으로 `/api/*`.
3. **Policy**: Action *Allow*, Include → *Emails* 에 관리자 이메일.
4. 저장. 이제 두 경로는 이메일 OTP/SSO 로그인 후에만 열립니다(무료 최대 50인).

## ③ 자동 저장 백엔드 (옵션) — 2중 보안

`functions/api/save.js`(Cloudflare Pages Function)가 포함돼 있습니다. **환경변수
설정 전엔 403(fail-closed)** 이라 그냥 배포해도 안전합니다.

보안은 2단계로 걸립니다:
1. **Cloudflare Access JWT (강함)** — `ACCESS_AUD`·`ACCESS_TEAM_DOMAIN` 설정 시,
   Access 로그인으로 발급된 JWT(RS256·aud·만료 검증)가 **필수**. 실제 SSO/OTP
   로그인과 쓰기 권한이 묶입니다.
2. **공유 비밀 (항상)** — 편집기의 "서버 저장 암호"(`ADMIN_SECRET`)가 일치해야 함.

Cloudflare Pages → 프로젝트 → **Settings → Environment variables**:

| 변수 | 값 | 비고 |
| --- | --- | --- |
| `ADMIN_SECRET` | 임의의 긴 문자열 | 편집기 "서버 저장 암호" 칸에 입력 |
| `GH_TOKEN` | GitHub 파인그레인드 PAT | **Secret**. *Contents: Read and write* |
| `GH_REPO` | `owner/repo` | 예: `saqnes/hanaropr` |
| `GH_BRANCH` | 커밋 브랜치 | 기본 `main` |
| `GH_PATH` | `assets/data.json` | 기본값 |
| `ACCESS_TEAM_DOMAIN` | `<team>.cloudflareaccess.com` | (선택) Access JWT 검증 활성화 |
| `ACCESS_AUD` | Access 애플리케이션 Audience(AUD) | (선택) Access JWT 검증 활성화 |

설정 후 편집기에서 **서버에 저장** → GitHub 커밋 → Pages 자동 재배포.

## 보안 · 개인정보 요약 (중요)

- **쓰기(저장)** 는 강하게 보호됩니다: ②의 Cloudflare Access + ③의 Access JWT +
  공유 비밀. 백엔드 미설정이면 쓰기 엔드포인트는 403(무해).
- **표시 데이터는 공개**입니다: `admin.html`·`js/*.js`·`assets/data.json`은 정적
  파일이라 URL을 알면 누구나 읽습니다. 즉 **화면에 보이는 값(계좌·연락처 등)은
  숨길 수 없습니다.** 암호 게이트는 편집 UI만 가립니다.
- 그래서 입력 시 원칙:
  - **후원 계좌**: 후원을 받으려면 공개돼야 하므로 공개해도 되는 정보입니다.
  - **회장단 개인 연락처(전화)**: 공개를 원치 않으면 비워 두세요(선택 항목). 대신
    대표 이메일 + 문의 폼으로 유도하는 것을 권장합니다.
  - 공개하면 안 되는 개인정보·비밀은 `data.json`에 넣지 마세요.

## 파일

```
admin.html            # 관리자 편집기 UI (noindex)
js/admin.js           # 편집 로직 (PASS_HASH 여기서 변경)
js/cms.js             # 공개/관리자 공용 렌더러
assets/data.json      # 콘텐츠 데이터 (편집 대상, 기본은 빈 값 → 빈 상태)
assets/data.example.json # 입력 예시(참고용)
functions/api/save.js # 옵션 자동커밋 백엔드 (Access JWT + 비밀, fail-closed)
```
