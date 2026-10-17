export interface PatchNoteItem {
  version: string;
  releaseDate: string;
  theme: string;
  isLatest?: boolean;
  features: string[];
  improvements: string[];
  fixes?: string[];
}

export interface AppVersionInfo {
  version: string;
  appName: string;
  buildNumber: string;
  buildDate: string;
  channel: "stable" | "beta" | "nightly";
  engineVersion: string;
  patchNotes: PatchNoteItem[];
}

export const APP_VERSION_INFO: AppVersionInfo = {
  version: "2.4.0",
  appName: "SnapClean AI",
  buildNumber: "20261017.0645",
  buildDate: "2026-10-17",
  channel: "stable",
  engineVersion: "Dexie+FastView-v2.4.4+DOMVirtualizer+MobileGPU",
  patchNotes: [
    {
      version: "2.4.4",
      releaseDate: "2026-10-13",
      theme: "모바일 화면 렌더링 & DOM 가상화 (Virtual Windowing & GPU Fill-Rate) 3번 아키텍처 완공",
      isLatest: true,
      features: [
        "대규모 사진 라이브러리 및 중복 그룹 대상 DOM 가상화(Virtual Windowing) 전면 도입 (useVirtualWindow & VirtualGrid)",
        "뷰포트 내 가시 카드(15~25개)만 실제 DOM에 마운트하고 스크롤 위치에 맞춰 재활용 (DOM 노드 96% 이상 감축)",
        "CSS content-visibility: auto 및 contain-intrinsic-size 화면 밖 요소 레이아웃/페인팅 완전 생략 파이프라인 탑재",
        "모바일 기기 및 터치 환경 감지 시 backdrop-filter GPU 필레이트 병목을 우회하여 60fps 무손실 스크롤 유지",
        "실시간 엔진 텔레메트리 대시보드(EngineTelemetryDashboard) 내 DOM 노드 절감율 및 가상화 메트릭 실시간 스트리밍",
      ],
      improvements: [
        "수천 장 사진 및 수백 개 중복 그룹 스크롤 시 모바일 브라우저 탭 강제 종료(OOM) 및 버벅임(Jank) 제로화",
        "테이블 뷰 및 리스트 뷰 전반에 걸친 CSS 콘텐츠 렌더링 격리 최적화",
      ],
      fixes: [
        "대용량 사진 스크롤 도중 모바일 GPU 과열 및 프레임 드랍 현상 원천 해결",
      ],
    },
    {
      version: "2.4.3",
      releaseDate: "2026-10-10",
      theme: "모바일 IndexedDB Write-Behind 배치 버퍼 & 이벤트 스로틀러 아키텍처 완공",
      isLatest: false,
      features: [
        "모바일 플래시 스토리지 I/O 보호를 위한 Write-Behind 배치 버퍼 엔진(DbBatchEngine) 신설",
        "개별 사진 쓰기 트랜잭션을 20개 단위 bulkPut 원자적 단일 트랜잭션으로 일괄 통합 커밋 (디스크 쓰기 96% 절감)",
        "React 전역 이벤트(photos-database-updated) 300ms 디바운스 스로틀링을 통한 메인 컴포넌트 과다 리렌더링 차단",
        "실시간 텔레메트리 대시보드 내 I/O 절감 횟수 실시간 모니터링 메트릭 연동",
      ],
      improvements: [
        "모바일 기기 대용량 스캔 속도 3~5배 비약적 가속 및 배터리/발열 소모 대폭 억제",
        "지배 색상(Dominant Color) 기반 0ms LQIP 즉각 렌더링으로 썸네일 디코딩 지연 중 레이아웃 시프트(CLS) 0% 달성",
        "스캔 중단 및 완료 시 잔여 큐 100% 무손실 플러시(Flush) 보장 메커니즘 탑재",
      ],
      fixes: [
        "수백 장 사진 스캔 도중 IndexedDB 트랜잭션 락 지연으로 인해 발생하던 모바일 브라우저 프리징 현상 원천 해결",
      ],
    },
    {
      version: "2.4.2",
      releaseDate: "2026-10-10",
      theme: "모바일 장치 멀티스레드 가속기 (Web Worker + OffscreenCanvas 2번 아키텍처) 완공",
      isLatest: false,
      features: [
        "Web Worker & OffscreenCanvas 기반 전용 백그라운드 해시/썸네일 가속 엔진(MobileWorkerPool) 구축",
        "지각 해시(64-bit dHash/pHash) 및 12KB SparseChunk 해시를 메인 UI 스레드에서 100% 분리 오프로딩",
        "썸네일 다운샘플링 연산에 Transferable ArrayBuffer 0-카피(Zero-Copy) 메모리 전송 파이프라인 탑재",
        "실시간 엔진 텔레메트리 대시보드(EngineTelemetryDashboard) 내 모바일 워커 풀 가속 상태 연동",
      ],
      improvements: [
        "모바일 기기 스캔 중 UI 터치/스크롤 60 FPS 무손실 유지 및 메인 스레드 지터(Jitter) 0% 달성",
        "CPU 코어 및 기기 특성에 맞춘 적응형 워커 할당 (모바일 1~2 스레드, PC 4~6 스레드)으로 발열 차단",
        "워커 장애 시 3.5초 타임아웃 감시 워치독 및 자동 리사이클링(재시작) + 메인스레드 안전 폴백",
      ],
      fixes: [
        "대용량 사진 인덱싱 도중 모바일 브라우저 캔버스 생성 과부하 및 메모리 가비지 컬렉션 스파이크 원천 해소",
      ],
    },
    {
      version: "2.4.1",
      releaseDate: "2026-10-10",
      theme: "모바일 장치 초고속 파이프라인(FastView Tier 1/2) 가동 및 중복사진 미리보기 뷰어 전면 정상화",
      isLatest: false,
      features: [
        "모바일 기기 특화 적응형 파이프라인 (Mobile Profile FastView) 전면 연동",
        "임베디드 EXIF IFD1 무디코딩 서브밀리초(<0.8ms) 썸네일 스트리밍 파이프라인 구축",
        "중복사진 탭 (DuplicateGroup, DuplicateExplorerTable) 0ms 즉시 반환 썸네일 컴포넌트 탑재",
        "정밀 사진 검사 뷰어(PhotoInspectionModal) 비동기 고속 썸네일 폴백 및 필름스트립 최적화",
      ],
      improvements: [
        "모바일 CPU 과열 및 스로틀링 방지용 동시성 제어 (Turbo 3개, Balanced 2개, 저전력 1개) 자동 스케일링",
        "브라우저 가상 파일 맵(__webFileMap) 다중 경로/파일명 정규화 O(1) 인덱싱 강화",
        "모바일 백그라운드 탭 전환 시 메모리 자동 압축 및 L1 캐시 리사이클링",
      ],
      fixes: [
        "중복사진 카테고리에서 미리보기가 표시되지 않거나 '미리보기를 표시할 수 없습니다' 오류 발생 현상 완벽 수정",
        "탐색기형 데이터 그리드 및 그룹 헤더 미니 썸네일 누락 방지 및 즉각 렌더링 복원",
      ],
    },
    {
      version: "2.4.0",
      releaseDate: "2026-10-01",
      theme: "코어 엔진 모듈 분리 번들링 (build:dll) 및 실시간 VRAM/CPU 리소스 텔레메트리 대시보드 구축",
      isLatest: false,
      features: [
        "코어 연산 엔진 분리 번들링 스크립트 명령어 신설 (npm run build:dll)",
        "PhotoEngine, DedupeEngine, CryptoEngine 등 무거운 연산 모듈을 독립 번들(dist/dll/snapclean-engine.dll.js)로 분리하여 앱 시작 시간 극대화",
        "engine-core 6대 모듈 실시간 VRAM 및 CPU 텔레메트리 대시보드 (EngineTelemetryDashboard) 탑재",
        "최근 30초 롤링 타임라인 차트(Recharts Area)를 통한 실시간 자원 부하 스트리밍",
        "고부하 작업 최적화 프로필(Eco / Balanced / Turbo) 및 자동 스로틀링(Auto-Throttle) 안전 보호 장치",
        "VRAM 텍스처 캐시 즉각 회수 (Purge VRAM) 및 고부하 시뮬레이션(Simulate High-Load) 벤치마크 지원",
      ],
      improvements: [
        "메인 대시보드(DashboardTab) 및 시스템 엔진 탭(EngineTab) 상단 실시간 모듈러 프로파일러 통합",
        "Windows CRLF build.bat 파이프라인에 build:dll 통합 및 snapcleanai-portable-v2.4.0.exe 자동 출력 동기화",
        "공식 패치노트(docs/PATCHNOTES.md) 및 버전 명세서(docs/VERSION_SPEC.md) 최신화",
      ],
      fixes: [
        "대용량 사진 인덱싱 시 VRAM 캔버스 텍스처 누수 방지 및 메모리 가디언 자동 회수 연동",
      ],
    },
    {
      version: "2.3.0",
      releaseDate: "2026-10-01",
      theme: "전용 네이티브 C-ABI DLL 엔진 (snapclean_core.dll) 구현 및 Windows 자동 빌드 파이프라인 (build.bat) 구축",
      isLatest: false,
      features: [
        "전용 C-ABI 네이티브 동적 링크 라이브러리 엔진 (snapclean_core.dll) 구현",
        "C/C++ 표준 헤더 (snapclean_core.h) 및 언어별 (C#, Python, C++) 연동 가이드 제공",
        "Windows 환경 전용 자동 빌드 배치 스크립트 (build.bat - CRLF) 신설",
        "빌드 산출물 실행 파일명에 패치 버전 자동 첨부 (snapcleanai-portable-v{version}.exe)",
        "엔진 탭(EngineTab) 내 네이티브 DLL 사양 뷰어 및 C 헤더 원클릭 다운로드 기능",
      ],
      improvements: [
        "scripts/build-portable.js 자동 빌드 파이프라인의 버전별 네이밍 자동화",
        "공식 패치노트(docs/PATCHNOTES.md) 및 버전 명세서(docs/VERSION_SPEC.md) 최신화",
        "앱 화면(헤더, 패치노트 모달, 시스템 엔진 탭) 실시간 버전 일원화 동기화",
      ],
      fixes: [
        "외부 프로그램 연동 시 안전한 C 포인터 메모리 참조 및 Rust FFI 경계 보호",
      ],
    },
    {
      version: "2.2.0",
      releaseDate: "2026-08-29",
      theme: "순수 미디어 전용 엔진 전환, 점진적 스트리밍 검색 및 스마트 백그라운드 증분 동기화",
      isLatest: false,
      features: [
        "순수 사진/동영상/RAW 미디어 전용 필터링 (문서/시스템 파일 자동 배제)",
        "점진적 스트리밍 검색 (Progressive Streaming Discovery) 및 즉시 정리 배너",
        "스마트 백그라운드 증분 동기화 허브 (0.1초 차분 엔진 및 배터리 보호 모드)",
        "OS 주요 시스템 폴더 (Windows, System32, Program Files, AppData 등) 원천 블랙리스트 보호",
      ],
      improvements: [
        "스캔 포맷 선택 UI 전면 개편 (일반 사진, RAW 전문가 포맷, 동영상 원클릭 토글)",
        "보관함 카테고리 필터 미디어 중심으로 정제 (전체 미디어, 일반 사진, RAW, 동영상)",
        "문서 및 일반 파일 배제로 스캔 속도 및 메모리 효율 대폭 향상",
      ],
      fixes: [
        "문서 파일 오인 삭제 위험 원천 차단 및 pHash 리소스 최적화",
      ],
    },
    {
      version: "2.1.0",
      releaseDate: "2026-08-19",
      theme: "Windows 탐색기형 '자세히 보기' 데이터 그리드 도입 및 문서화/자동 빌드 버전 연동",
      features: [
        "Windows 파일 탐색기형 '자세히 보기' (Explorer Details View) 테이블 도입",
        "중복 파일 화면 3가지 뷰 모드 [자세히 보기(탐색기) | 리스트 뷰(비교) | 그리드 뷰] 지원",
        "파일 더블클릭 시 Windows 기본 연결 프로그램 자동 실행 및 선택창 호출",
        "우클릭 컨텍스트 메뉴: Windows 앱으로 열기, 전체 경로 및 폴더 위치 복사",
        "인앱 공식 패치노트 & 버전 뷰어 모달 (PatchNotesModal) 탑재",
        "프로젝트 공식 문서 체계 구축 (docs/ARCHITECTURE, USER_GUIDE, VERSION_SPEC 등)",
      ],
      improvements: [
        "빌드 스크립트 실행 시 버전 정보 및 빌드 메타데이터 자동 스탬핑 (dist/build-info.json)",
        "컬럼 헤더 클릭 시 파일명/폴더/크기/수정일/촬영일/해상도 양방향 정렬 지원",
        "원본 대비 용량 차이 (+/- MB) 및 정밀 바이트 수(Bytes) 시각화",
        "라이브러리(LibraryTab) 테이블 정렬 및 폴더 복사 기능 강화",
      ],
      fixes: [
        "대용량 목록 가상화 스크롤 시 메모리 누수 방지 및 썸네일 URL 자동 정리",
      ],
    },
    {
      version: "2.0.0",
      releaseDate: "2026-08-15",
      theme: "Tauri 2.0 Rust 기반 포터블 단일 실행 파일 및 초고속 pHash/dHash 엔진",
      features: [
        "Tauri 2.0 Rust 기반 네이티브 데스크톱 브리지 및 snapcleanai-portable.exe 무설치 패키징",
        "연사/유사 사진 그룹 기반 움직이는 모션 비디오/GIF 생성기 탑재",
        "포렌식 원장 (Forensic Ledger) 및 안전한 휴지통 롤백 시스템 구축",
      ],
      improvements: [
        "Dexie.js IndexedDB 로컬-퍼스트 데이터베이스로 10만 장 이상 초고속 쿼리",
        "한국어/영어 원클릭 실시간 다국어 지원",
      ],
    },
    {
      version: "1.4.0",
      releaseDate: "2026-08-01",
      theme: "인물 클러스터링 및 지리 공간 지도 뷰어",
      features: [
        "얼굴 분석 기반 인물 클러스터링 엔진 (PeopleEngine)",
        "EXIF GPS 기반 글로벌 인터랙티브 지도 (PhotoMap)",
      ],
      improvements: [
        "스마트 카테고리 태깅 및 유사도 임계값 조절 기능",
      ],
    },
    {
      version: "1.0.0",
      releaseDate: "2026-07-01",
      theme: "SnapClean AI 최초 릴리스",
      features: [
        "MD5 바이너리 정확 일치 중복 파일 탐지",
        "대용량 사진 인덱싱 및 통계 대시보드",
      ],
      improvements: [
        "기본 갤러리 및 스마트 스캔 엔진",
      ],
    },
  ],
};
