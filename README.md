# 🚀 Universal React NAS Engine (Windows)

Windows 시스템의 모든 드라이브를 웹 브라우저에서 안전하게 탐색, 업로드/다운로드하고 고성능 온더플라이(On-The-Fly) 스트리밍을 제공하는 범용 React NAS 엔진입니다.

---

## 🌟 핵심 특징

1. **전체 드라이브 웹 탐색 (Windows Multi-Drive Support)**
   - `C:`, `D:`, `E:` 등 시스템에 마운트된 모든 로컬/외장 드라이브를 웹 UI에서 원클릭으로 탐색.
   - 드라이브별 총 용량 및 사용량 실시간 모니터링.

2. **철저한 시스템 파일 & 사용자 디렉토리 보호 (Exclusion Policy)**
   - `C:\Windows`, `C:\Program Files`, `C:\ProgramData`, `C:\Users` 및 시스템 복원/휴지통(`$Recycle.Bin`, `System Volume Information`) 자동 필터링 및 접근 차단.
   - 정규화된 절대 경로 기준 Path Traversal 공격 원천 방어.

3. **강력한 미디어 스트리밍 엔진 (FFmpeg & Artplayer 재활용 및 고도화)**
   - **듀얼 스트리밍 모드**:
     - 대용량 비디오 HTTP 206 Partial Content (Range Header) 고속 재생.
     - 다중 오디오 트랙 및 비호환 오디오(DTS/AC3)의 온더플라이 AAC 리먹싱(Remuxing) 스트리밍.
   - **정밀 Seek 지원**: 원하는 재생 위치부터 즉시 FFmpeg 분기 스트리밍.
   - **자막 통합**: 비디오 내장 자막 스트림 추출 및 외장 자막(`.srt`, `.smi`) 실시간 파싱/매핑.

4. **무차별 대입(Brute-Force) 방어 인증 시스템**
   - 단일 마스터 암호화 보호.
   - IP 기반 Rate Limiter 및 실패 횟수 누적 시 점진적 딜레이(Exponential Backoff) 및 계정/IP 일시 잠금(Lockout).
   - `crypto.timingSafeEqual`을 통한 타이밍 공격 방지.

5. **모던 프론트엔드 UI (React + Tailwind CSS)**
   - 기존 `web-drive-project`의 유려한 UX를 React 컴포넌트 아키텍처로 리팩토링.
   - 반응형 사이드바, 그리드/리스트 뷰 전환, 줌(Zoom) 슬라이더, 드래그 앤 드롭 업로드 토스트.

---

## 🏗 프로젝트 구조 계획

```text
NAS-with-windows/
├── client/                     # 프론트엔드 (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── explorer/       # FileGrid, FileList, Breadcrumb, DriveSelector
│   │   │   ├── player/         # ArtplayerWrapper, AudioSelector, SubtitleSelector
│   │   │   ├── preview/        # ImagePreview, DocumentPreview
│   │   │   ├── layout/         # Sidebar, Header, SelectionToolbar
│   │   │   └── modal/          # AuthModal, ConfirmDialog, UploadToast
│   │   ├── hooks/              # useFiles, useDrives, useAuth, useUpload
│   │   ├── services/           # api.js (Axios / Fetch 클라이언트)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
│
├── server/                     # 백엔드 (Node.js + Express + FFmpeg)
│   ├── src/
│   │   ├── config/             # 환경변수, 보안 정책, 블랙리스트 규칙
│   │   ├── middleware/         # auth.js, rateLimiter.js, pathSecurity.js
│   │   ├── routes/             # drives.js, files.js, media.js, auth.js
│   │   ├── services/           # driveService.js, fileService.js, ffmpegService.js
│   │   └── index.js
│   └── package.json
│
├── tray/                       # Windows 시스템 트레이 애플리케이션 (.NET C#)
│   ├── ReelDriveTray.cs        # 트레이 소스 코드 (Nginx & Node 백그라운드 제어/헬스체크)
│   ├── ReelDriveTray.exe       # 단일 실행 파일 (초경량 15KB)
│   └── build.bat               # 빌드 스크립트
│
├── .gitignore
├── README.md                   # 프로젝트 개요 및 빠른 시작 가이드
└── PLAN.md                     # 상세 아키텍처 설계서 및 구현 로드맵
```

---

## 🖥️ Windows 시스템 트레이 & 자동 시작

- **시스템 트레이 상주**: 작업표시줄 알림 영역에 ReelDrive 보라색 아이콘 상주.
  - **더블클릭**: 기본 웹 브라우저에서 `https://pc.codingbot.kr` 즉시 열기.
  - **우클릭 메뉴**: 웹 저장소 열기, 로컬 주소 열기, 실시간 작동 상태 확인, 서버 재시작, 서버 일시 중지, Windows 시작 시 자동 실행 토글, 저장소 폴더 열기, 종료.
- **부팅 시 자동 시작**: Windows 시작프로그램 레지스트리에 자동 등록되어 PC 재부팅 후에도 Nginx 및 백엔드 서버가 백그라운드에서 자동으로 기동됩니다.

---

## 🔒 SSL/HTTPS 보안 연결 (Let's Encrypt)

- **도메인**: `https://pc.codingbot.kr` (정식 공인 SSL 인증서 적용)
- **HTTP -> HTTPS 자동 전환**: 포트 80으로 들어오는 모든 웹 요청을 443(HTTPS)으로 자동 301 리다이렉트.
- **인증서 자동 갱신 스크립트**: [`renew-ssl.bat`](renew-ssl.bat) 실행 시 간편 갱신 및 Nginx 자동 반영.

---

## 📋 상세 설계 문서

상세한 보안 아키텍처, FFmpeg 파이프라인 명세, API 설계 및 구현 로드맵은 [PLAN.md](PLAN.md)를 참조하세요.
