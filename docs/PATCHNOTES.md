# SnapClean AI - 공식 패치노트 (Official Patch Notes)

모든 릴리스와 주요 업데이트 내역을 기록하는 공식 패치노트 문서입니다.

---

## 📌 [v2.4.0] - 2026-10-01 (Latest)
> **주요 테마**: 멀티플랫폼 패키징(PC · Android APK · iPhone iOS), GitHub Releases 자동 업데이트 연동, 코어 엔진 모듈 분리 번들링 (`build:dll`) 및 실시간 리소스 텔레메트리 대시보드

### 📱 멀티플랫폼 배포 및 모바일/아이폰 지원 (Multiplatform & Mobile)
- **안드로이드(Android) 정식 APK 패키징 (`snapcleanai-mobile-v2.4.0.apk`)**:
  - `build-mobile.bat` 및 `npm run build:mobile` 파이프라인을 통해 독립 실행형 APK 자동 생성.
  - 별도 스토어 승인 없이 안드로이드 기기에서 즉시 다운로드 및 터치 설치 지원.
- **아이폰 / iPad (iOS) 지원 및 웹 PWA 단일화**:
  - **작동 원리 및 지원 방식**: WebKit 하드웨어 가속 Canvas 지각 해시(pHash) 및 브라우저 독립 데이터베이스(Dexie.js / IndexedDB)를 기반으로 하여, 클라우드 전송 없이 **아이폰 내부에서 100% 프라이빗하게 사진 보관함 정리 및 중복 탐색 완벽 수행**.
  - **설치 파일 생성 중단 안내**: 애플의 바이너리 샌드박스 및 인증서 정책에 따라 **아이폰용 별도 설치 파일(.ipa 및 .mobileconfig) 생성은 당분간 일시 중단**되었습니다.
  - **Safari 1-Click PWA 웹앱 구동**: 아이폰에서는 별도 파일 다운로드 없이 Safari [공유] ➔ [홈 화면에 추가]를 통해 3초 만에 주소창 없는 전체화면 독립 앱으로 100% 동일하게 실행됩니다.
- **통합 멀티플랫폼 설치 모달 (`MultiplatformInstallModal`)**:
  - 상단 헤더 및 설정 화면에서 원클릭으로 PC(Windows Portable), Android(APK) 설치 파일을 직접 다운로드하고, 아이폰용 Safari PWA 설치 가이드를 확인할 수 있는 직관적인 UI 제공.

### 🚀 새 기능 (New Features)
- **GitHub Releases 실시간 라이브 자동 업데이트 시스템**:
  - `AhBiYout/AhBiYout-all` 레포지토리와 연동되어 새 버전 출시 시 자동 감지 및 실시간 알림 모달 제공.
- **코어 엔진 전용 분리 번들링 명령어 (`npm run build:dll`)**:
  - `PhotoEngine`, `DedupeEngine`, `CryptoEngine`, `BurstEngine`, `FunnelEngine`, `PeopleEngine` 등 무거운 연산 엔진 모듈을 별도 독립 번들(`dist/dll/snapclean-engine.dll.js`, `.cjs`)로 분리 생성.
  - 메인 애플리케이션 번들의 크기와 초기 로드 시 메인 스레드 파싱 오버헤드를 대폭 경감하여 **앱 초기 실행 및 시작 속도(Startup Time)를 극대화**.
  - 네이티브 Rust C-ABI DLL(`snapclean_core.dll`) 및 C 헤더(`snapclean_core.h`), 상세 명세서(`dist/dll/manifest.json`) 동시 패키징.
- **실시간 VRAM & CPU 텔레메트리 대시보드 (`EngineTelemetryDashboard`)**:
  - `engine-core` 6대 모듈의 실시간 CPU 부하(%) 및 VRAM 텍스처 버퍼(MB)를 1.5초 주기로 정밀 스트리밍 시각화.
  - 최근 30초 롤링 타임라인 차트(Recharts Area)를 통해 실시간 자원 사용량 트렌드 파악.
  - 고부하 작업 최적화 프로필 전환(Eco / Balanced / Turbo) 기능으로 시스템 발열 및 배터리 절약 또는 초고속 병렬 처리 선택 지원.
  - **VRAM 캐시 즉시 회수 (Purge VRAM)**: 버튼 클릭으로 불필요한 캔버스 텍스처, 메모리 객체 URL(`blobRegistry`)을 정리하여 즉각적인 메모리 확보.
  - **자동 스로틀링(Auto-Throttle)**: CPU/VRAM 85% 초과 시 UI 멈춤 방지를 위한 백프레셔 자동 주입.
  - **고부하 시뮬레이션(Simulate High-Load)**: 실제 대용량 작업 상황을 단계별로 재현하여 시스템 한계 및 복구 상태 벤치마크 테스트 지원.
- **메인 대시보드 및 엔진 관리 탭 통합**:
  - `DashboardTab` 및 `EngineTab` 양측에 실시간 프로파일러를 기본 배치하여 상시 모니터링 가능.

### ⚡ 개선 사항 (Improvements)
- **Windows 원클릭 자동 빌드 스크립트 (`build.bat`) v2.4.0 최적화**:
  - 빌드 파이프라인 Step 4에 `build:dll`을 통합하여 네이티브 및 모듈러 엔진 DLL을 자동 생성.
  - 산출물 실행 파일명에 패치 버전 자동 첨부 (`snapcleanai-portable-v2.4.0.exe`).
  - Windows 표준 CRLF 개행 및 100% 영문 콘솔 인터페이스 유지.

---

## 📌 [v2.3.0] - 2026-10-01
> **주요 테마**: 전용 네이티브 C-ABI DLL 엔진 (`snapclean_core.dll`) 구현, C 표준 헤더 제공 및 Windows 자동 빌드 파이프라인 (`build.bat`) 구축

### 🚀 새 기능 (New Features)
- **전용 C-ABI 네이티브 동적 링크 라이브러리 엔진 (`snapclean_core.dll`)**:
  - Rust로 구현된 고성능 파일 무결성 및 지각 해시 엔진을 윈도우 표준 C-ABI DLL로 컴파일 지원 (`src-tauri/Cargo.toml` `cdylib` 타겟 등록).
  - C#, Python, C++, Windows 탐색기 확장 등 외부 프로그램에서 직접 호출 가능한 6대 핵심 API 익스포트:
    - `snapclean_version()`: 엔진 버전 확인
    - `snapclean_calculate_sha256()`: SHA-256 고속 바이너리 해시 계산
    - `snapclean_calculate_phash()`: 지각 해시(pHash) Base64 생성
    - `snapclean_compare_phash()`: 해밍 거리(Hamming Distance) 측정 (유사본 판별)
    - `snapclean_organize_file()`: 암호화 해시 사전/사후 검증 기반 파일 안전 복사/이동
    - `snapclean_count_media_files()`: 디렉토리 내 미디어 파일 고속 카운트
- **C/C++ 표준 헤더 및 언어별 연동 가이드 (`src-tauri/include/snapclean_core.h`)**:
  - C/C++ 프로젝트에서 `#include "snapclean_core.h"`를 통해 즉시 네이티브 API 호출 가능.
  - `docs/DLL_INTEGRATION_GUIDE.md`를 통해 C# (.NET P/Invoke), Python (`ctypes`), C++ 연동 예제 및 사용법 완비.
- **Windows 자동 빌드 배치 스크립트 (`build.bat`)**:
  - Windows 표준 CRLF 개행 및 100% 영문 환경으로 제작된 통합 원클릭 빌드 파이프라인.
  - 패치노트 및 `package.json`의 버전을 자동 파싱하여 실행 파일명 끝에 버전 번호 자동 첨부 (`snapcleanai-portable-v2.3.0.exe`).
- **엔진 탭(EngineTab) 내 네이티브 DLL 사양 뷰어 & 헤더 다운로드 기능**:
  - UI 상에서 DLL 인터페이스 사양, 언어별 호출 코드 복사 및 `snapclean_core.h` 원클릭 다운로드 기능 지원.

### ⚡ 개선 사항 (Improvements)
- **버전 동기화 파이프라인 고도화**:
  - `scripts/build-portable.js`에서 빌드 시 패치노트와 일치하는 버전 접미사(`-v2.3.0.exe`)를 루트 및 `dist/` 폴더에 동시 출력하도록 개선.
  - 문서(`docs/BUILD_AND_RELEASE.md`, `docs/VERSION_SPEC.md`) 및 앱 상단 버전 배지 실시간 동기화.

---

## 📌 [v2.2.0] - 2026-08-29
> **주요 테마**: 순수 미디어 전용 엔진 전환, 점진적 스트리밍 검색 및 스마트 백그라운드 증분 동기화 허브

### 🚀 새 기능 (New Features)
- **순수 미디어 파이프라인 (Pure Media Engine)**:
  - 사진(`images`), 전문가 RAW(`raw`), 동영상(`videos`)의 3대 미디어 영역에만 100% 최적화.
  - 일반 문서(`.pdf`, `.docx`, `.txt`, `.xlsx`, `.csv`, `.json`, `.md`), 소스 코드, 바이너리/실행 파일(`.exe`, `.dll`) 및 압축 파일(`.zip`)을 스캔 단계에서 사전 제외하여 지각 해시(pHash) 및 선명도 분석 리소스 낭비와 오인 삭제 위험을 원천 방지.
- **점진적 스트리밍 검색 (Progressive Streaming Discovery)**:
  - 1~2초 고속 1차 패스(Fast Pass)를 통해 초기 식별된 중복 파일을 상단 배너로 즉시 스트리밍.
  - 전체 심층 AI 분석이 백그라운드에서 계속 진행되는 동안에도 사용자가 대기 없이 **`[발견된 사진 즉시 정리]`** 액션을 실행할 수 있는 논블로킹 UI 도입.
- **스마트 백그라운드 증분 동기화 허브 (Smart Background Sync Manager)**:
  - 0.1초 초고속 차분 엔진(`mtime` 및 `size` 비교)으로 변경/추가된 미디어만 선별 동기화.
  - 10분/1시간/6시간/충전유휴/수동 감시 주기 설정 지원.
  - 모바일 및 랩톱 배터리가 20% 미만일 때 백그라운드 동기화를 자동 일시정지하는 배터리 보호 모드 탑재.
- **OS 시스템 폴더 원천 블랙리스트 보호 (System Folder Blacklist Guard)**:
  - `Windows`, `System32`, `Program Files`, `AppData`, `System Volume Information`, `/System`, `node_modules` 등 주요 시스템 경로를 자동 우회(Bypass).

### ⚡ 개선 사항 (Improvements)
- **스캔 포맷 선택 UI 전면 개편**:
  - 일반 사진(JPG, PNG, HEIC, WEBP, AVIF 등), RAW 전문가 포맷(DNG, CR2, CR3, NEF, ARW, ORF, RW2), 동영상(MP4, MOV, MKV 등) 카테고리별 원클릭 토글 지원.
- **보관함(LibraryTab) 필터 정제**:
  - 미디어 중심 카테고리 탭(전체 미디어, 일반 사진, RAW 고화질, 동영상)으로 필터링 고도화.

---

## 📌 [v2.1.0] - 2026-08-19
> **주요 테마**: Windows 탐색기형 '자세히 보기' 데이터 그리드 도입 및 프로젝트 문서화/자동 빌드 버전 연동 파이프라인 완성

### 🚀 새 기능 (New Features)
- **Windows 파일 탐색기형 '자세히 보기' (Explorer Details View)**:
  - 중복 파일 관리(Duplicates) 및 라이브러리(Library)에 완전한 Windows 파일 탐색기 스타일 데이터 그리드 테이블 구현.
  - 컬럼 구성: 상태(KEEP/DEL), 썸네일+파일명, 폴더 경로(Folder Path), 용량(Size & Bytes), 수정일자, EXIF 촬영일자, 파일 형식, 해상도/스펙, 기종 정보.
  - 모든 컬럼(이름, 폴더, 크기, 일자, 해상도 등) 클릭 시 오름차순(▲)/내림차순(▼) 양방향 정렬 지원.
- **3가지 뷰 모드 스위처 (View Mode Switcher)**:
  - `[ 📊 자세히 보기(탐색기) | 📋 리스트 뷰(비교) | 🖼️ 그리드 뷰 ]` 3가지 모드 자유 전환 및 로컬 스토리지 상태 기억.
- **Windows 연결 프로그램 직접 실행 (Open in Default Windows App)**:
  - 파일 더블클릭 시 Windows의 기본 뷰어 및 연결 프로그램 선택 창 호출.
  - 마우스 우클릭 컨텍스트 메뉴로 빠른 실행 및 경로 복사 지원.
- **인앱 패치노트 & 버전 뷰어 모달 (In-App Patch Notes Modal)**:
  - 앱 헤더 및 설정 메뉴에서 최신 패치노트와 빌드 메타데이터를 즉시 확인할 수 있는 전용 뷰어 추가.
- **공식 문서화 (Documentation System)**:
  - `docs/` 디렉터리 신설: `ARCHITECTURE.md`, `USER_GUIDE.md`, `VERSION_SPEC.md`, `BUILD_AND_RELEASE.md`, `PATCHNOTES.md` 생성.

### ⚡ 개선 사항 (Improvements)
- **자동 빌드 스크립트 버전 스탬핑 (`scripts/version-manager.js`)**:
  - `npm run build` 및 `npm run build:portable` 실행 시 버전 정보와 빌드 번호가 `dist/build-info.json` 및 클라이언트 런타임에 자동 동기화.
- **폴더 경로 원클릭 복사**:
  - 탐색기 테이블 및 리스트 행에서 파일 전체 경로와 상위 폴더 경로를 원클릭으로 클립보드에 복사할 수 있는 기능 추가.
- **메타데이터 비교 시각화 강화**:
  - 기준 원본 대비 용량 차이(`+5.2 MB`, `-1.1 MB` 등) 및 포맷팅된 바이트 크기 병기.

---

## 📌 [v2.0.0] - 2026-08-15
> **주요 테마**: Tauri 2.0 Rust 기반 포터블 단일 실행 파일 아키텍처 및 초고속 pHash/dHash 엔진 구축

### 🚀 새 기능 (New Features)
- **Tauri Rust 네이티브 브리지 통합**:
  - 브라우저 제약을 넘어 로컬 파일 시스템 직접 탐색 및 초고속 I/O 스트리밍 구현.
  - `snapcleanai-portable.exe` 무설치 단일 파일 패키징 지원.
- **모션 비디오 생성기 (Motion Creator)**:
  - 유사 사진 및 연사 그룹을 결합하여 GIF 및 애니메이션 비디오를 생성하는 크리에이터 모달 탑재.
- **포렌식 원장 (Forensic Ledger) & 감사 로그 (Audit Tab)**:
  - 안전한 파일 정리 이력 기록 및 롤백 가능한 휴지통 시스템 구축.

### ⚡ 개선 사항 (Improvements)
- **Dexie IndexedDB 로컬 엔진 도입**: 10만 장 이상의 사진 메타데이터를 50ms 이내에 즉시 쿼리할 수 있도록 스토리지 고도화.
- **다국어 (한국어/영어) 완벽 지원**: 실시간 원클릭 언어 전환 지원.

---

## 📌 [v1.4.0] - 2026-08-01
- **인물 클러스터링 엔진 (PeopleEngine)**: 로컬 얼굴 특징 분석 및 클러스터링 지원.
- **지리 공간 지도 (PhotoMap)**: EXIF GPS 기반 전 세계 촬영 위치 시각화.
- **카테고리 자동 분류기 (Category Classifier)**: 텍스트 및 메타데이터 기반 스마트 카테고리 태깅.

---

## 📌 [v1.0.0] - 2026-07-01
- **최초 릴리스 (Initial Release)**:
  - MD5 기반 완벽 일치 중복 파일 탐지.
  - 대용량 라이브러리 기본 스캐너 및 통계 대시보드.
