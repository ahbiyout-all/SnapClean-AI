# SnapClean AI - 자동 빌드 및 릴리스 가이드 (Build & Release Guide)

## 1. 개요 (Overview)
SnapClean AI는 일관된 프로덕션 빌드와 포터블 단일 실행 파일(Portable Executable) 생성을 위한 자동화된 빌드 파이프라인을 갖추고 있습니다.

---

## 2. 자동 빌드 파이프라인 (Automated Build Pipeline)

```
[ 소스 코드 수정 ]
       │
       ▼
[ 버전 관리자 (version-manager.js) ] ──> package.json, version.ts, docs/PATCHNOTES.md 동기화
       │
       ▼
[ 1단계: Vite Frontend Build ] ─────> dist/ 정적 클라이언트 에셋 번들링
       │
       ▼
[ 2단계: Express Server Bundle ] ───> dist/server.cjs 생성 (esbuild CJS 번들링)
       │
       ▼
[ 3단계: 빌드 메타데이터 스탬핑 ] ───> dist/build-info.json 및 콘솔 버전 요약 출력
       │
       ▼
[ 4단계: 포터블/설치 파일 패키징 ] ──> snapcleanai-portable.exe 배포 준비 완료
```

---

## 3. 주요 빌드 명령어 (Build Commands)

### 3.1. 표준 프로덕션 빌드
```bash
npm run build
```
- 프론트엔드 Vite 컴파일 및 백엔드 Express 서버(`dist/server.cjs`) 번들링을 수행합니다.
- 빌드 결과물에 버전 정보, 빌드 타임스탬프, 최근 패치노트 요약이 자동 주입됩니다.

### 3.2. 포터블 실행 파일 빌드
```bash
npm run build:portable
```
- React + Express + Tauri Rust 엔진을 단일 무설치 포터블 실행 파일(`snapcleanai-portable.exe` 및 `snapcleanai-portable-v{version}.exe`)로 패키징합니다.

### 3.3. Windows 전용 원클릭 자동 빌드 스크립트 (`build.bat`)
Windows 개발 환경에서 콘솔 또는 파일 더블클릭으로 전체 프로세스를 한 번에 실행할 수 있는 공식 배치 스크립트입니다:

```cmd
# 기본 전체 빌드 (Frontend + Server + DLL + Executable with Version Tag)
build.bat

# 이전 빌드 정리 후 전체 재빌드
build.bat clean
```
- **특징**:
  - Windows 표준 CRLF 개행 및 100% 영문 콘솔 인터페이스로 동작
  - `package.json` 및 패치노트의 버전을 자동 인식하여 `snapcleanai-portable-v{version}.exe`로 자동 명명
  - Rust 컴파일러 감지 시 `snapclean_core.dll` 자동 컴파일 및 `dist/` 복사
  - 빌드 산출물 목록 및 파일 크기 자동 요약 리포트

### 3.4. 전용 DLL 및 코어 엔진 모듈 번들링
```bash
npm run build:dll
```
- 네이티브 Rust C-ABI DLL(`snapclean_core.dll`) 컴파일과 코어 연산 엔진 모듈(`PhotoEngine`, `DedupeEngine`, `CryptoEngine`, `BurstEngine`, `FunnelEngine`, `PeopleEngine` 등)을 별도 독립 번들(`dist/dll/snapclean-engine.dll.js`, `.cjs`)로 분리 생성합니다.
- 메인 애플리케이션 번들에서 무거운 해시 및 암호화 연산 모듈을 격리하여 **앱 초기 실행 및 시작 속도(Startup Time)를 극대화**합니다.

### 3.5. 정적 타입 검사 및 린트
```bash
npm run lint
```

---

## 4. 빌드 결과물 산출 규칙
빌드 완료 시 다음과 같은 아티팩트가 생성됩니다:

| 산출물 경로 | 설명 |
| :--- | :--- |
| `snapcleanai-portable-v{version}.exe` | 루트 디렉터리 버전 명시형 포터블 실행 파일 (예: `v2.3.0`) |
| `dist/snapcleanai-portable-v{version}.exe` | 배포 패키지 디렉터리 버전 명시형 실행 파일 |
| `dist/snapcleanai-portable.exe` | 버전 태그 없는 범용 포터블 실행 파일 |
| `dist/dll/snapclean_core.dll` | C-ABI 표준 네이티브 DLL |
| `dist/dll/snapclean_core.h` | C/C++ 표준 헤더 파일 |
| `dist/dll/snapclean-engine.dll.js` | 고속 구동용 분리 번들 코어 엔진 모듈 (ESM) |
| `dist/dll/snapclean-engine.dll.cjs` | 고속 구동용 분리 번들 코어 엔진 모듈 (CommonJS) |
| `dist/dll/manifest.json` | DLL 규격 및 시작 최적화 메타데이터 |
| `dist/build-info.json` | 빌드 시각 및 환경 메타데이터 |

---

## 5. 빌드 결과물 메타데이터 (`dist/build-info.json`)
빌드 완료 시 다음과 같은 규격의 `build-info.json` 파일이 자동 생성됩니다:

```json
{
  "name": "SnapClean AI",
  "version": "2.4.0",
  "buildNumber": "20261003.0856",
  "builtAt": "2026-10-03T08:56:00.000Z",
  "channel": "stable",
  "engine": "Dexie+pHash-v2.4+NativeDLL+Telemetry+GitHubLiveUpdater",
  "github": {
    "owner": "AhBiYout",
    "repo": "AhBiYout-all",
    "releasesUrl": "https://github.com/AhBiYout/AhBiYout-all/releases"
  },
  "environment": "production",
  "latestPatchSummary": "GitHub Releases 기반 실시간 자동 업데이트 시스템 및 깃허브 자동화 파이프라인 구축"
}
```

---

## 6. GitHub 자동 배포 및 동기화 파이프라인 (GitHub Automation)

- **공식 계정**: `AhBiYout`
- **저장소 이름**: `AhBiYout-all`
- **GitHub 저장소 URL**: `https://github.com/AhBiYout/AhBiYout-all`
- **GitHub Releases URL**: `https://github.com/AhBiYout/AhBiYout-all/releases`

### 6.1. Windows 원클릭 깃허브 배포 스크립트 (`github-push.bat`)
Windows 환경에서 실행하여 버전 동기화, 위생 검사, 커밋 및 태그 생성을 원클릭으로 진행합니다:
```cmd
github-push.bat
```
또는 커밋 메시지를 직접 지정하여 실행:
```cmd
github-push.bat "feat: add real-time auto-updater system"
```

### 6.2. 크로스 플랫폼 NPM 스크립트
```bash
# 1. 버전 동기화 및 깃 상태 검증 (커밋/태깅)
npm run github:sync

# 2. 동적 버전 태그와 함께 GitHub 원격(origin main) 푸시
npm run github:push

# 3. 신규 패치 버전 증가 + 자동 동기화
npm run version:patch
```

### 6.3. 버전 정보 연속 자동 연동 원리 (Single Source of Truth)
코드를 수정하고 깃허브에 올릴 때 버전 정보는 다음과 같이 **완전 자동으로 상호 연동**됩니다:
1. `version-manager.js`가 단일 기준점(`package.json` 또는 `docs/PATCHNOTES.md`)에서 버전(`vX.Y.Z`)을 추출합니다.
2. `package.json`, `metadata.json`, `src/version.ts`, `src-tauri/tauri.conf.json`, `dist/build-info.json`의 버전/빌드번호/릴리스날짜를 일괄 갱신합니다.
3. 앱 상단 헤더, 설정 화면, 엔진 탭, 정보 모달의 UI 버전 표기가 실시간 자동 변경됩니다.
4. Git 커밋 메시지 및 Git Release Tag(`vX.Y.Z`)가 동적으로 생성되어 GitHub에 함께 업로드됩니다.
5. GitHub Actions CI/CD 파이프라인(`.github/workflows/github-release.yml`)이 해당 태그를 감지하여 릴리스 노트를 자동 추출하고 포터블 실행 파일 및 DLL 에셋을 GitHub Releases에 자동 첨부합니다.

---

## 7. GitHub Releases 기반 실시간 자동 업데이트 시스템 (Live Auto-Updater)

SnapClean AI는 GitHub Releases API(`https://api.github.com/repos/AhBiYout/AhBiYout-all/releases/latest`)와 실시간으로 통신하여 사용자에게 끊김 없는 최신 패치를 제공합니다:

1. **실시간 버전 비교 엔진 (`updateChecker.ts`)**:
   - Semantic Versioning 규칙에 따라 로컬 설치 버전과 원격 최신 릴리스 태그를 비교합니다.
   - 새 릴리스 발견 시 `snapclean-update-available` 이벤트를 즉각 브로드캐스트합니다.
2. **반응형 UI 알림 (`UpdateNotificationModal.tsx` & `GitHubUpdateCard.tsx`)**:
   - 상단 헤더의 버전 뱃지가 `v{latestVersion} UPDATE`로 강조 점멸하며 클릭 시 업데이트 모달을 엽니다.
   - 릴리스에 포함된 신규 기능, 개선 사항, 버그 수정 내역을 한눈에 파악할 수 있는 다크 글래스모피즘 모달을 제공합니다.
   - 최신 포터블 실행 파일(`snapcleanai-portable-v{version}.exe`) 및 DLL의 직관적인 다이렉트 원클릭 다운로드를 지원합니다.
3. **개발 및 시연용 시뮬레이터 (Simulator)**:
   - 원격 배포 전에도 `[시뮬레이터]` 버튼을 통해 실시간 업데이트 알림창과 다운로드 인터페이스의 동작을 즉시 검증할 수 있습니다.

---

## 8. 저장소 위생 관리 및 제외 파일 규칙 (Git Hygiene & Exclusions)

바이너리 실행 파일이나 임시 파일이 Git 히스토리에 포함되어 저장소 용량이 비대해지는 것을 방지하기 위해 엄격한 위생 검사 규칙이 적용됩니다:

| 구분 | 제외 파일/폴더 패턴 | 관리 및 배포 위치 |
| :--- | :--- | :--- |
| **바이너리 실행 파일** | `*.exe`, `snapcleanai-portable*.exe` | GitHub Releases 자산으로 배포 |
| **동적 링크 라이브러리** | `*.dll`, `snapclean_core.dll`, `*.so` | GitHub Releases 자산으로 배포 |
| **빌드 산출물** | `dist/`, `build/`, `bin/`, `out/` | CI/CD 아티팩트 |
| **운영체제 및 임시 파일** | `.DS_Store`, `Thumbs.db`, `*.tmp` | 영구 로컬 무시 |
| **중복 패키지 락파일** | `bun.lock` (npm `package-lock.json` 단일화) | 저장소 정리 완료 |
---

## 9. 모바일(Android APK) 패키징 파이프라인 (Mobile Distribution)

SnapClean AI는 PC(Windows)뿐만 아니라 모바일 스마트폰(Android) 환경을 위한 전용 APK 패키징 자동화 파이프라인을 지원합니다.

### 9.1. 모바일 패키징 명령어
```bash
# 원클릭 모바일 APK 패키지 생성
npm run build:mobile

# 또는 Windows 환경에서 배치 스크립트 실행
build-mobile.bat
```

### 9.2. 생성 산출물 목록 (`dist/mobile/`)
- `snapcleanai-mobile-v{version}.apk`: 안드로이드 전용 독립 설치 패키지 (API 24+)
- `mobile-info.json`: 모바일 빌드 메타데이터 및 SHA-256 무결성 해시

### 9.3. 아이폰(iOS) 지원 및 설치 파일 중단 안내
- **설치 파일(.ipa / .mobileconfig) 생성 일시 중단**:
  - 애플의 코드 사이닝 샌드박스 및 프로비저닝 정책에 따라, **아이폰용 별도 바이너리 설치 파일(.ipa 및 .mobileconfig) 생성은 당분간 중단**되었습니다.
- **Safari 1-클릭 PWA 웹앱 완벽 지원**:
  - 아이폰에서는 별도 파일 다운로드 없이, Safari 브라우저에서 사이트 접속 후 **하단 공유 버튼 ➔ [홈 화면에 추가]**를 통해 주소창 없는 전체화면 독립 앱으로 100% 동일하게 실행됩니다.
  - WebKit 하드웨어 가속 Canvas 지각 해시(pHash)와 브라우저 로컬 IndexedDB를 통해 기기 내부에서 100% 프라이빗하게 사진 관리가 수행됩니다.


