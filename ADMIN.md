# 관리자 페이지 가이드 (`/admin.html`)

일반 방문자는 로그인할 필요가 없습니다. **관리자만** `/admin.html`에서 아카이브
(발사 기록·수상·후원사)와 프로젝트 현황을 사이트와 똑같은 포맷으로 편집합니다.

## 어떻게 동작하나

- 공개 페이지(Projects·Archive·Support·Home)는 **`assets/data.json`** 을 읽어
  발사기록·수상·프로젝트·후원사 섹션을 렌더링합니다.
- `admin.html`은 그 `data.json`을 폼으로 편집하고 **실시간 미리보기**를 보여준 뒤
  저장합니다. 편집 로직은 `js/admin.js`, 렌더링은 공개 페이지와 **동일한
  `js/cms.js`** 를 씁니다(포맷이 항상 일치).

## 편집하는 법

1. `/admin.html` 접속 → 암호 입력(기본 `hanaro2026`, **반드시 변경**).
2. 상단 탭(프로젝트 / 발사 기록 / 수상 / 후원사)에서 **+ 추가**로 항목 생성,
   입력하면 오른쪽 미리보기가 즉시 갱신. ↑ ↓ 로 순서 변경, **삭제** 가능.
   - 프로젝트 현황: `상태`를 설계/제작/시험/발사/완료 중 선택(진행 중은 코럴,
     완료는 골드 배지로 표시).
   - 발사 기록: `상태`를 성공(발사 완료)/부분·이상으로 선택.
3. **저장** — 두 가지 방식:
   - **JSON 다운로드**(기본, 백엔드 0): 받은 `data.json`을 저장소
     `assets/data.json`에 커밋 → Cloudflare Pages가 자동 재배포.
   - **서버에 저장**(옵션): 아래 백엔드를 설정하면 버튼 하나로 GitHub에 자동
     커밋 → 자동 재배포(1–2분 후 반영).

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
2. Application domain에 사이트 도메인 + 경로 `/*admin.html*` (그리고 두 번째 앱으로
   `/api/*`) 지정.
3. **Policy**: Action *Allow*, Include → *Emails* 에 관리자 이메일 추가.
4. 저장. 이제 해당 경로는 이메일 OTP/SSO 로그인 후에만 열립니다(무료 최대 50인).

## ③ 자동 저장 백엔드 (옵션)

`functions/api/save.js`(Cloudflare Pages Function)가 이미 포함돼 있습니다.
**환경변수를 설정하기 전까지는 아무 동작도 하지 않습니다(403, fail-closed).**

Cloudflare Pages → 프로젝트 → **Settings → Environment variables** 에 추가:

| 변수 | 값 | 비고 |
| --- | --- | --- |
| `ADMIN_SECRET` | 임의의 긴 문자열 | 편집기 "서버 저장 암호" 칸에 입력하는 값 |
| `GH_TOKEN` | GitHub 파인그레인드 PAT | **Secret**. 대상 저장소에 *Contents: Read and write* |
| `GH_REPO` | `owner/repo` | 예: `saqnes/hanaropr` |
| `GH_BRANCH` | 커밋할 브랜치 | 기본 `main` |
| `GH_PATH` | `assets/data.json` | 기본값 그대로 |

설정 후 편집기에서 **서버에 저장** → `data.json`이 GitHub에 커밋 → Pages 자동
재배포. (반드시 ②의 Cloudflare Access와 함께 사용하세요. `ADMIN_SECRET`은
편집기로 전달되는 베어러 값이라 Access로 경로를 잠그는 게 안전합니다.)

## 보안 요약

- `admin.html`·`js/admin.js`·`assets/data.json`은 정적 파일이라 **URL을 알면 누구나
  읽을 수 있습니다.** 암호 게이트는 편집 UI를 가릴 뿐입니다.
- **쓰기(저장)** 보호: 백엔드 미설정 시 서버 저장 엔드포인트는 403(무해). 설정 시
  `ADMIN_SECRET` + **Cloudflare Access**로 이중 보호하세요.
- 민감정보(후원 계좌 등)를 `data.json`에 넣지 마세요 — 공개됩니다.

## 파일

```
admin.html            # 관리자 편집기 UI (noindex)
js/admin.js           # 편집 로직 (PASS_HASH 여기서 변경)
js/cms.js             # 공개/관리자 공용 렌더러
assets/data.json      # 콘텐츠 데이터 (편집 대상, 기본은 빈 배열 → 빈 상태 표시)
assets/data.example.json # 입력 예시(참고용). 실제 사이트는 data.json만 읽음
functions/api/save.js # 옵션 자동커밋 백엔드 (fail-closed)
```
