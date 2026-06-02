# Render 배포 (PostgreSQL + Firebase Storage)

## 1) Firebase Storage Rules 추가

onandme Firebase 프로젝트(`onnme-website`) Storage Rules에 아래를 추가한 뒤 배포하세요.

```
match /wedding/uploads/{allPaths=**} {
  allow read: if true;
  allow write: if false;
}
```

서버는 Admin SDK로 업로드하므로 클라이언트 write는 막아도 됩니다.

## 2) GitHub에 push

```bash
git init
git add .
git commit -m "Render 배포 설정"
git remote add origin https://github.com/YOUR_USER/wedding.git
git push -u origin main
```

## 3) Render Blueprint 배포

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. GitHub 저장소 연결
3. `render.yaml`이 Web Service + PostgreSQL 생성
4. 환경변수 설정:
   - `ADMIN_PASSWORD` — 관리자 비밀번호
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — Firebase 서비스 계정 JSON **전체 내용** (한 줄)

`FIREBASE_STORAGE_BUCKET`은 `render.yaml`에 `onnme-website.firebasestorage.app`으로 설정되어 있습니다.

## 4) 배포 확인

- `https://<render-url>/api/health` → `{ "ok": true, "db": "postgres", "storage": "firebase" }`
- 메인: `https://<render-url>/`
- 게시판: `https://<render-url>/info/board.html`
- 관리자: `https://<render-url>/admin/`

## 5) 커스텀 도메인

Render Web Service → **Settings** → **Custom Domains** → DNS(CNAME) 등록

## 6) 로컬 개발

```bash
npm install
npm start
```

`DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT_JSON` 없이 실행하면 JSON 파일 + `uploads/` 폴더로 동작합니다.

## 7) 운영 흐름

| 작업 | 방법 |
|---|---|
| HTML/CSS 수정 | Git push → Render 자동 배포 |
| 게시글·팝업 | `/admin/` 에서 수정 (PostgreSQL 저장) |
| 이미지 업로드 | 관리자 → Firebase Storage `wedding/uploads/` |

재배포해도 게시글·팝업·업로드 이미지는 유지됩니다.
