# SnapClean AI - 시스템 아키텍처 명세서 (Architecture Specification)

## 1. 개요 (Overview)
**SnapClean AI**는 수십만 장 이상의 대용량 사진/동영상/문서 라이브러리를 초고속으로 인덱싱하고, 인공지능(AI)과 고성능 이미지 해싱 알고리즘을 결합하여 완벽한 중복 제거 및 지능형 미디어 정리를 지원하는 엔터프라이즈급 데스크톱/웹 하이브리드 미디어 관리 솔루션입니다.

---

## 2. 시스템 아키텍처 다이어그램 (Architecture Diagram)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Presentation Layer                     │
│  React 19 + Vite 6 + Tailwind CSS v4 + Motion + Lucide Icons           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Tabs: Dashboard | Duplicates | Library | People | Trash | Sync    │  │
│  │ Views: Explorer Details Table | Comparison List | Visual Grid     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│     Local Client Engine         │   │   Express Server Engine (:3000) │
│ - Dexie.js (IndexedDB Engine)   │   │ - File System & EXIF Scanner    │
│ - Web Workers (dHash, pHash)    │   │ - Sharp Image Pipeline          │
│ - Tesseract OCR Local Parser    │   │ - Gemini AI Proxy Handler       │
│ - Leaflet Geospatial Heatmap    │   │ - Windows Default App Launcher  │
└────────────────┬────────────────┘   └────────────────┬────────────────┘
                 │                                     │
                 └───────────────────┬─────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Native Desktop Bridge / Tauri Rust                    │
│ - Windows Explorer System Shell & Default Application Association       │
│ - Native File Watcher (Chokidar / Rust Notify)                          │
│ - Portable Single Executable Packaging (NSIS / Portable Binary)         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 핵심 모듈 구성 (Core Modules)

### 3.1. 중복 파일 분석 엔진 (Deduplication Engine)
1. **MD5 / SHA-256 정확 일치 (Exact Match)**
   - 바이너리 레벨에서 100% 동일한 파일을 O(1) 해시 룩업으로 검출.
2. **지각 해시 유사도 분석 (Perceptual Hash - pHash / dHash / aHash)**
   - 리사이징, 압축 품질 변환, 색감 보정된 사진 간의 해밍 거리(Hamming Distance) 계산.
3. **연사/버스트 샷 클러스터링 (Burst & Sequential Shots)**
   - 시간차(0.1초~2초 이내) 및 시각적 유사성을 기반으로 최상의 베스트 컷 자동 추천.
4. **비디오 중복 분석 (Video Fingerprinting)**
   - 프레임 인터벌 샘플링 및 메타데이터 듀레이션을 조합한 영상 중복 탐지.

### 3.2. 프레젠테이션 & Windows 탐색기 뷰 (Presentation Views)
- **자세히 보기 (Explorer Details Table View)**:
  - Windows 탐색기와 동일한 컬럼(상태, 파일명, 폴더 경로, 용량, 수정일자, EXIF 촬영일자, 파일 유형, 해상도/스펙, 기종) 정렬 및 조작 지원.
- **리스트 뷰 (Comparison Cards)**:
  - 메타데이터 간의 직접적인 차이(용량 차이 `+`/`-`, 날짜 차이, 해상도 차이)를 카드 단위로 비교.
- **그리드 뷰 (Visual Cards)**:
  - 썸네일 중심의 비주얼 그리드로 빠른 육안 검토 가능.

### 3.3. 로컬 퍼시스턴스 (Local Persistence)
- **Dexie.js (IndexedDB)** 기반의 클라이언트 로컬 데이터베이스를 채택하여 수백만 건의 파일 메타데이터 및 썸네일을 네트워크 지연 없이 즉각 로드.
- 오프라인 퍼스트(Offline-first) 아키텍처로 인터넷 연결 없이도 모든 기능 100% 작동.

### 3.4. 순수 미디어 전용 필터링 및 시스템 폴더 안전 격리 (Pure Media & System Safety Engine)
- **순수 미디어 파이프라인 (Pure Media Focus)**:
  - 사진(`images`), 전문가 RAW(`raw`), 동영상(`videos`) 3대 미디어 영역에만 100% 집중.
  - 일반 문서(`.txt`, `.pdf`, `.docx`, `.xlsx`, `.csv`, `.json`, `.md`), 소스 코드, 바이너리/실행 파일(`.exe`, `.dll`, `.sys`), 압축 파일(`.zip`)을 원천 배제하여 지각 해시(pHash) 및 선명도 분석 리소스 낭비와 오인 삭제 위험을 원천 차단.
- **시스템 폴더 원천 블랙리스트 (Blacklist Guard)**:
  - `Windows`, `System32`, `Program Files`, `AppData`, `System Volume Information`, `/System`, `/proc`, `/sys`, `node_modules`, `.git` 등 OS 핵심 영역은 디렉토리 순회 시 자동 바이패스(Bypass)하여 기기 무결성 보호.

### 3.5. 점진적 스트리밍 검색 (Progressive Streaming Discovery)
- **초고속 1차 패스 (Fast Pass, 1~2초)**:
  - 심층 AI 모델(선명도, aesthetic, 블러) 분석 완료를 기다리지 않고, 고속 메타데이터/크기/부분 해시 기반으로 식별된 명백한 중복본 및 스크린샷을 즉시 UI에 스트리밍.
  - 상단 **`[발견된 사진 즉시 정리]`** 배너를 통해 백그라운드 스캔 도중에도 논블로킹(Non-blocking)으로 즉각적인 정리 가능.

### 3.6. 스마트 증분 백그라운드 동기화 (Smart Background Sync Manager)
- **0.1초 초고속 차분 검사 (Incremental Diff)**:
  - 파일 수정 시각(`mtime`)과 파일 크기(`size`)를 IndexedDB 로컬 캐시와 대조하여 신규/수정된 파일만 선별 처리.
  - 전체 재스캔 대비 CPU 점유율 및 디스크 I/O를 99% 이상 절감.
- **배터리 & 전력 보호 모드 (Battery & Eco Saver)**:
  - 모바일 및 노트북 환경에서 배터리가 20% 미만일 경우 백그라운드 작업을 자동 중지하여 배터리 방전 방지.
  - 유휴 상태(Idle) 및 충전 중 전용 스마트 동기화 스케줄링 지원.

### 3.7. 보안 및 외부 연동 (Security & API Layer)
- **Google Gemini API**: 서버 측(`/api/*`) 프록시를 통해 API 키를 브라우저에 노출하지 않고 안전하게 처리.
- **Windows System API**: 로컬 파일 시스템 경로 열기 및 Windows 기본 앱 연결을 시스템 레벨에서 안전하게 브리지.

---

## 4. 성능 최적화 전략 (Performance Strategy)
- **가상 스크롤 및 지연 렌더링 (Virtualization & Lazy Loading)**: 대용량 리스트에서도 DOM 노드를 제한하여 60FPS 스크롤 보장.
- **웹 워커(Web Workers) 병렬 처리**: 해시 계산 및 블러 감지 알고리즘을 백그라운드 스레드로 격리하여 UI 프리징 방지.
- **메모리 절약형 Blob 레지스트리 (Blob Registry)**: 생성된 오브젝트 URL의 생명주기를 엄격히 관리하여 메모리 누수 방지.
