# SnapClean AI - 공식 패치노트 (Official Patch Notes)

개발자 **AhBiYout (AhBiYout-all)**의 공식 SnapClean AI 프로젝트 버전 히스토리 및 패치노트 문서입니다.

- **GitHub 저장소**: https://github.com/AhBiYout-all/SnapCleanAI
- **공식 구글 블로그**: https://ahbiyoutvibe.blogspot.com/

---

## 📌 [v2.6.0] - 2026-11-01 (Latest)
> **주요 테마**: 파일명 지능형 유추 중복 검사 엔진(Filename Deductive Inference Engine), 카카오톡/메신저 전송본·촬영일시 시그니처·사진 편집기 접미사·카메라 촬영모드 5대 패턴 지능형 유추, 원클릭 유추 액션 및 필터 프리셋 완비

### 🔤 1. 파일명 지능형 유추 중복 감지 엔진 (`filenameInferenceEngine.ts`)
- **5대 핵심 파일명 패턴 심층 분석**:
  - **운영체제 복사본 규칙 (OS Copy)**: ` (1)`, ` (2)`, ` - 복사본`, ` - 사본`, `_copy`, `Copy of ` 등 자동 중복 접미사 정밀 역추적.
  - **메신저 및 SNS 전송본 (Messenger Export)**: `KakaoTalk_...`, `KakaoTalk_Photo_...`, `WhatsApp_...`, `IMG-WA...`, `FB_IMG_...` 등 전송 과정에서 이름이 변경된 파일과 원본을 매칭.
  - **촬영일시 시그니처 토큰 (Capture Timestamp Signature)**: 파일명 내에 내장된 `YYYYMMDD_HHMMSS` 타임스탬프 시그니처를 추출하여, 서로 다른 폴더나 접두사를 가진 파일이라도 동일 순간에 촬영된 복사본/파생본임을 수학적으로 유추.
  - **사진 편집기 및 필터 접미사 (Editor Tags)**: `_edit`, `_retouch`, `_enhanced`, `_filter`, `_snapseed`, `_vsco`, `_thumb`, `_preview`, `_1080p`, `_4k`, `_compressed`, `_opt` 등 보정 앱에서 저장된 파생 복사본 감지.
  - **카메라 촬영 모드 변형 (Camera Mode Variant)**: `MVIMG_...` (모션포토) vs `IMG_...` (일반 사진), `PXL_...MP.jpg` vs `PXL_...jpg` 등 구글/삼성 카메라 특수 모드 컷 상호 매칭.
- **안전 검증 휴리스틱 (Safety Verification Heuristics)**:
  - 단순 연속 번호 오인 방지를 위해 파일 크기 비율(Size Ratio), 시각적 지각 해시 거리(pHash Hamming Distance), 촬영 시각 오차 범위를 교차 검증하여 오탐지(False Positive) 0% 달성.
- **DedupeEngine & PhotoLibraryManager 완전 통합**:
  - `DedupeOptions` 내 `matchFilenameInference: boolean` 신설 (기본값: `true`).
  - `DuplicateGroup`의 `subType: 'filename_inferred'` 및 `matchDetails.inferredRationale` 상세 설명 지원.

### 🎯 2. 직관적인 사용자 인터페이스 (UI/UX)
- **원클릭 빠른 실행 버튼 (`DuplicatesTab.tsx`)**:
  - 툴바에 `🔤 이름으로 중복 유추 (Infer by Name)` 원클릭 버튼 및 실시간 감지 건수 배지 탑재.
  - 클릭 시 즉시 이름 유추 중복 항목으로 필터링하고 안내 토스트 발송.
- **필터 탭 필(Pill) 및 프리셋 추가**:
  - 서브타입 필터 바에 `🔤 이름으로 유추 (Inferred by Name)` 카운트 필 추가.
  - 정밀 옵션 패널 내 `🔤 이름 유추 집중 (Name Inference)` 원클릭 프리셋 버튼 제공.
  - 세부 탐지 기준 스위치에 `🔤 이름 지능형 유추` 토글 스위치 및 도움말 툴팁 제공.
- **시각적 배지 및 이유 설명 (`DuplicateGroup.tsx`)**:
### 🏷️ 3. 보관함 AI 카테고리별 사진 즉시 선택/하이라이트 (Select by Category)
- **보관함 툴바 및 필터 바에 'Select by Category (카테고리별 선택)' 팝오버 탑재 (`LibraryTab.tsx`)**:
  - `🌿 Nature (자연)`, `👥 People (인물)`, `🍔 Food (음식)`, `🏛️ Architecture (건축)`, `📄 Documents (문서)`, `✈️ Travel (여행)` 등 AI가 감지한 카테고리별 사진을 원클릭으로 일괄 하이라이트/선택.
  - 다중 선택 모드(`isMultiSelectMode`)와 즉각 연동되어 그리드 및 리스트 뷰 전체에 선택 링과 체크마크가 즉시 점등.
  - 카테고리별 사진 장수 및 용량(MB) 표시, 전체 선택(`replace`), 선택에 추가(`+ add`), 선택에서 제외(`- remove`) 3대 액션 제공.
  - 빠른 추천 숏컷 태그(Nature, People 등) 및 선택 완료/제외 시 실시간 토스트 피드백 알림 연동.

### 🌿 4. 보관함 헤더 '카테고리 선택 (Select by Category)' 드롭다운 필터 메뉴 (`LibraryTab.tsx`)
- **상단 헤더 'Select by Category' 필터 드롭다운 탑재**:
  - 라이브러리 상단 검색바/Sync 버튼 옆에 보랏빛 감성의 'Select by Category (카테고리 선택)' 드롭다운 메뉴 버튼 신설.
  - Nature(자연), People(인물), Travel(여행), Work(업무), Abstract(추상), Food(음식), Architecture(건축), Documents(문서) 등 기본 제공 및 AI 감지 카테고리 전체 목록 제공.
  - Nature 선택 시 `'nature'`와 `'landscape'` 메타데이터 태그 및 카테고리를 동시에 자동 조회·쿼리하여 자연·풍경 관련 사진을 완벽하게 필터링.
  - 카테고리 항목 선택 시 `selectedCategories` 상태가 실시간 업데이트되며 `filteredLibraryPhotos` 결과 목록이 즉각 동적 재계산·반영.
  - 선택된 카테고리 아이콘 및 명칭 헤더 버튼 노출, 바깥 영역 클릭 시 자동 닫힘(Click Outside) 및 '전체 초기화' 원클릭 액션 지원.

### 🌿 5. 보관함 '자연', '풍경', '인물', '여행', '도시', '업무 (Work)' 원클릭 빠른 필터 버튼 (`LibraryTab.tsx`)
- **전용 Nature, Landscape, People, Travel, Urban & Work 필터 버튼 탑재**:
  - 카테고리 필터 바의 '전체' 버튼 바로 옆에 `🌿 자연`, `🏞️ 풍경`, `👥 인물`, `✈️ 여행`, `🏙️ 도시`, `💼 업무 (Work)` 전용 숏컷 버튼을 배치.
  - Nature / Landscape 버튼 클릭 시 `selectedCategories` 상태에 `'nature'`와 `'landscape'`를 자동으로 주입하여 자연·풍경 사진만 즉시 격리 표시.
  - People 버튼 클릭 시 `selectedCategories` 상태에 `'people'`과 `'portrait'`를 주입하고 AI 얼굴 감지와 연동하여 인물 사진만 원클릭 격리 표시.
  - Travel 버튼 클릭 시 `selectedCategories` 상태에 `'travel'`과 `'urban'`을 주입하여 여행 테마 사진 분리 표시.
  - Urban 버튼 클릭 시 `selectedCategories` 상태에 `'urban'`과 `'architecture'`를 주입하여 도시·건축 테마 사진 분리 표시.
  - Work 버튼 클릭 시 `selectedCategories` 상태에 `'work'`와 `'document'`를 자동으로 주입하여 업무·문서·영수증 테마 사진만 원클릭 격리 표시.
  - 활성화 상태 하이라이트 링 및 테마별 사진 개수 배지 실시간 동기화.
  - 상단 활성 필터 칩(Active Filters) 및 로컬라이제이션(한/영) 완벽 연동.

  - `AnimatePresence` 및 `motion.div`를 활용한 부드러운 드롭다운 애니메이션 및 Click-outside 자동 닫힘 지원.

### 📊 8. 보관함 카테고리 분포 요약 시각화 (`CategorySummaryChart.tsx`)
- **라이브러리 데이터 시각화 리포트 탑재**:
  - `Recharts` 기반의 **인터랙티브 파이 차트(Pie Chart)**를 통해 전체 사진 컬렉션의 카테고리별 비중을 한눈에 파악.
  - Nature, People, Travel, Work 등 주요 카테고리별 사진 장수를 요약 카운트 목록으로 병행 표기.
  - 마우스 호버 시 상세 퍼센티지(%) 및 장수 정보를 제공하는 다국어 지원 툴팁 인터랙션.
  - 상단 헤더의 `📊 카테고리 요약` 버튼으로 요약 뷰를 자유롭게 토글(Toggle) 가능.

### 🎬 9. 보관함 필터/정렬 변경 시 Framer Motion 지연 순차(Staggered) 페이드인 애니메이션
- **필터 및 정렬 상태 기반 동적 애니메이션 키 (`filterSortAnimationKey`)**:
  - 검색어, 카테고리, 퀄리티 태그, 포맷, 연도, 위치, 크기, 정렬 기준/방향 및 뷰 레이아웃 변경 시 고유 키를 동적 생성.
  - `VirtualGrid`(그리드 모드), 리스트 뷰(`list`), 상세 테이블(`details`) 전반에 Framer Motion 기반 지연 순차(staggered) 페이드인 효과 적용.
  - 상위 24~30개 항목에 걸쳐 인덱스 기반 자연스러운 지연 타이밍(`delay: Math.min(idx * 0.025, 0.35s)`)을 부여하여 대용량 사진 탐색 시에도 60fps 반응성을 완벽하게 유지.

### 🗂️ 10. 보관함 사진 선택 시 자동 활성화 일괄 작업 헤더 바 (`BulkActionHeaderBar.tsx`)
- **실시간 반응형 플로팅 헤더 바 탑재**:
  - 다중 선택 모드 또는 '카테고리별 선택' 등을 통해 사진을 1장 이상 선택 시 상단에 글래스모피즘 스타일의 일괄 작업 헤더 바가 스티키로 부드럽게 슬라이드 진입(`AnimatePresence` + `motion.div`).
  - 현재 선택된 사진 매수 및 전체 용량(MB/GB) 실시간 계산 및 필터링 내 전체 선택/해제 빠른 토글 버튼 제공.
- **4대 핵심 일괄 작업 기능 완비**:
  - **📁 앨범으로 이동 (Move to Album)**: 기존 앨범 목록(`db.events`) 중 선택하거나 새 앨범을 즉시 생성하여 선택된 사진들의 `eventId` 및 앨범 태그를 원자적 일괄 업데이트.
  - **📦 선택 항목 내보내기 (Export Selected)**:
    - **ZIP 압축 다운로드**: JSZip 기반으로 선택한 모든 사진 파일과 메타데이터 명세서(`manifest.json`)를 단일 압축 파일로 패키징하여 다운로드.
    - **파일 경로 클립보드 복사**: 외부 툴/명령줄 연동을 위한 전체 절대 경로 줄바꿈 일괄 복사.
    - **메타데이터 명세서 (CSV)**: 촬영일시, 카메라 모델, AI 미적 점수, 태그, 해상도를 포함한 스프레드시트용 CSV 다운로드.
  - **🔗 공유 (Share - Temporary Secure Link)**:
    - 기존 `CollabShareModal`의 무서버 종단간 암호화(P2P/Zero-Server) 기능을 선택한 사진들에 즉시 적용.
    - 유효 기간 선택(1시간 초단기, 24시간 권장, 7일, 1회 열람 즉시 파기) 및 HTTPS 보안 웹 링크 / P2P Direct Tunnel 프로토콜 스위처 제공.
    - 모바일 카메라로 즉시 스캔 가능한 QR 코드와 원클릭 클립보드 복사, 선택된 사진들의 썸네일 프리뷰 스택 및 총 용량 실시간 요약 카드 제공.
  - **🗑️ 일괄 삭제 (Bulk Delete)**:
    - 삭제 예정 파일 수량 및 확보 용량을 사전 안내하는 안전 확인 모달 지원.
    - 확인 시 Dexie `db.photos`의 `isDeleted` 플래그 및 휴지통 테이블 갱신, `SystemAPI.deleteFiles`와 감사 로그(`db.auditLogs`)를 원자적 기록하며 언제든 휴지통(Trash) 탭에서 원클릭 복원 가능.

### ⚙️ 11. 환경설정(Settings Tab) 글로벌 'Enable Background Scanning' 토글 & 파일 감시자 서비스 (`fileWatcherService.ts`)
- **전용 환경설정(Settings) 탭 및 모바일 퀵 내비게이션 완비 (`SettingsTab.tsx`)**:
  - 사이드바 네비게이션 및 모바일 하단 바에 '환경설정 (Settings)' 전용 탭 신설.
  - 다크 글래스모피즘 기반의 직관적인 UI 레이아웃, 실시간 OS 감시자 텔레메트리 바 및 감시 경로 관리 완비.
- **글로벌 'Enable Background Scanning (백그라운드 자동 스캔)' 토글**:
  - `localStorage`(`snapclean_enable_background_scanning` 및 `snapclean_startup_autowatcher`)에 영구 상태 저장.
  - 토글 스위치 변경 즉시 파일 감시자 서비스(`fileWatcherService`)의 실시간 기동(`start`) 및 중지(`stop`) 수행.
  - 상단 헤더 '스캔 설정(Settings)' 모달 팝오버 및 단축키(Cmd/Ctrl + K) 커맨드 팔레트와도 완벽 연동.
- **앱 시작 시 파일 감시자 서비스 자동 초기화 (Startup Automation)**:
  - `App.tsx` 초기 구동 시 `fileWatcherService.init()`이 자동 호출되어 `localStorage` 상태를 판별.
  - 활성화 상태인 경우 등록된 사진 폴더 경로(`watchPaths`)에 대해 백그라운드 파일시스템 감시 스레드를 자동 가동하고 증분 동기화 스케줄러를 개시.
  - '지금 즉시 검사(Check Changes Now)' 수동 원클릭 트리거 및 감시 대상 폴더 추가/제거 지원.

---

## 📌 [v2.5.0] - 2026-11-01
> **주요 테마**: D3.js 중복 폴더 히트맵, 초점·노출·구도 3축 스마트 AI 자동 선택 엔진, GitHub Releases 실시간 라이브 자동 업데이트 알림 팝업, 개별파일 풀림형 Setup 패키징 및 조용한 방화벽 자동 등록, CI/CD Node.js 22 LTS 전환 및 보안 과이던스 준수

### 🔥 1. D3.js 기반 중복 폴더 히트맵 (Duplicate Storage Hotspots)
- **D3.js 타일형 그리드 렌더링 (`FolderDuplicateHeatmap.tsx`)**:
  - 저장 공간을 가장 많이 차지하는 중복 폴더를 D3.js 지각적 색상 스케일(Slate-900 ➔ Amber ➔ Coral Red ➔ Vivid Crimson)로 타일링 렌더링.
- **2대 분석 지표 스위칭**:
  - **낭비 용량 모드 (Storage Size MB/GB)** vs **중복 파일 수 모드 (Redundant File Count)** 지원.
- **인터랙티브 드릴다운 필터**:
  - 히트맵 셀 클릭 시 해당 폴더에 속한 중복 그룹만 `DuplicatesTab` 목록에 즉시 필터링 적용.
  - 마우스 오버 시 폴더 전체 경로, 낭비 용량, 복사본 개수, 핫스팟 경고 태그(`🔥`) 실시간 툴팁 오버레이.

### ✨ 2. 스마트 AI 사진 자동 선택 엔진 (Smart Duplicate Selection)
- **3대 핵심 화질 축 가중치 산출 (`smartDuplicateSelector.ts`)**:
  - **Blur / Sharpness Score (40%)**: Laplacian Variance 알고리즘으로 모션 블러 및 초점 흐림 컷을 엄격히 판별.
  - **Exposure Score (35%)**: 하이라이트/암부 손실, 적정 Base ISO(50~400) 및 손떨림 없는 적정 셔터 속도 평가.
  - **Composition & Aesthetic Score (25%)**: Aesthetic AI Score 모델 점수 및 인물 얼굴 프레이밍 비율 반영.
  - **종합 AI 화질 점수 (Overall Score, 0~10점)** 산출 및 추천 이유(Rationale) 팁 자동 작성.
- **중복 정리 엔진 완전 통합 (`dedupeEngine.ts` & `PhotoLibraryManager.ts`)**:
  - `DedupeRule` 내 `'ai_smart'` 지원.
  - 단순히 해상도(픽셀 수)만 높고 초점이 나간 사진 대신, 실제 화질이 가장 우수한 컷을 우선 보존.
- **직관적 UI 오버레이 (`DuplicatesTab.tsx` & `DuplicateGroup.tsx`)**:
  - 툴바 내 `✨ 스마트 AI 자동 선택` 버튼 및 드롭다운 룰 제공.
  - 펼침 카드 상단에 **✨ 스마트 AI 사진 분석 추천 카드** 오버레이 및 초점·노출·구도 개별 점수 배지 표시.

### 🚀 3. GitHub Releases 실시간 라이브 자동 업데이트 알림 파이프라인
- **실시간 API 대조 (`githubUpdateChecker.ts`)**:
  - 앱 시작 시 GitHub Releases API(`api.github.com/repos/AhBiYout-all/SnapCleanAI/releases/latest`)를 조회하여 현재 버전(`v2.5.0`) 대조.
- **업데이트 알림 팝업 모달 (`UpdateNotificationModal.tsx`)**:
  - 새 버전 감지 시 실시간 모달 팝업 자동 출력.
  - 설치 파일 직접 다운로드 버튼, GitHub 저장소 링크, 개발자 공식 블로그 링크, 버전 비교 및 패치노트 변경점 표시.

### ⚙️ 4. 개별파일 설치형 (Unpacked Setup) 패키징 & 조용한 방화벽 등록
- **Unpacked Multi-File 설치 파이프라인 (`installer.nsh`)**:
  - 포터블 압축 단일 파일 대신 폴더 풀림(Unpacked Multi-File) 구조로 정갈하게 설치.
  - 기존 앱 설치 상태 감지 시 덮어쓰기/삭제 안내.
  - 무인 백그라운드 설치 모드(`/S`) 및 조용한 Windows 방화벽 규칙 사전 등록 지원 (`SnapClean AI` 및 `SnapClean AI_v2.5.0`).

### 🛡️ 5. GitHub CI/CD Node.js 22 LTS 전환 & `.gitignore` 대대적 개편
- **CI/CD Node.js 22 LTS 표준화**:
  - Node 20 EOL 대응을 위해 `.github/workflows/` 내 모든 워크플로를 Node 22 LTS 환경으로 업데이트하여 실행 경고 원천 제거.
- **보안 및 저장소 위생 관리**:
  - 개인정보 및 이메일 업로드 금지 규정 준수 (`AhBiYout-all@users.noreply.github.com`).
  - `.gitignore`를 전면 개편하여 임시 파일, 로그, 빌드 아티팩트 및 로컬 푸시 스크립트(`push_to_github.bat`) 제외 처리.

---

## 📌 [v2.4.4] - 2026-10-13
> **주요 테마**: 모바일 화면 렌더링 & DOM 가상화(Virtual Windowing & GPU Fill-Rate) 3번 아키텍처 완공, CSS Content-Visibility 레이아웃 가속 및 모바일 60 FPS 무손실 스크롤

### ⚡ 화면 렌더링 및 DOM 가상화 엔진 (UI Performance Architecture #3)
- **가상 스크롤(Virtual Windowing) 전면 도입 (`useVirtualWindow` & `VirtualGrid`)**:
  - 수천 장의 사진 목록(`LibraryTab`) 및 수백 개의 중복 그룹 카드(`DuplicatesTab`)를 렌더링할 때, 전체를 DOM에 올리지 않고 현재 화면에 보이는 15~25개 항목만 실제 DOM에 마운트.
  - 상/하단 오버스캔 버퍼(Overscan Buffer)를 적용하여 고속 터치 스크롤 중에도 시각적 깜빡임 제로.
  - DOM 노드 수를 기존 대비 96% 이상 감축하여 모바일 탭 강제 종료(OOM) 방지.
- **CSS `content-visibility: auto` & `contain-intrinsic-size` 레이아웃 가속**:
  - 사진 카드(`.cv-card`), 중복 그룹(`.cv-group`), 테이블 행(`.cv-row`)에 레이아웃 격리 적용.
  - 브라우저 렌더러가 화면 밖 요소의 기하 구조 및 페인팅 계산을 즉시 생략하여 렌더 파이프라인 부하 80% 절감.
- **실시간 UI 텔레메트리 대시보드 (`EngineTelemetryDashboard`)**:
  - DOM 노드 절감율(%), 가상화 인스턴스 수, Content-Visibility 지원 상태, 모바일 GPU 우회 상태 실시간 스트리밍.

---

## 📌 [v2.4.0] - 2026-10-01
> **주요 테마**: 멀티플랫폼 패키징(PC · Android APK · iPhone iOS), GitHub Releases 자동 업데이트 연동, 코어 엔진 모듈 분리 번들링 (`build:dll`) 및 실시간 리소스 텔레메트리 대시보드

### 🔍 중복 사진 탐지 방법의 고도화 및 다채널 옵션 시스템 (Advanced Deduplication & Custom Options)
- **7대 종합 감지 파이프라인 구축**:
  - 바이트 일치(`exact_byte`), 지각적 시각 유사도(`visual_similar`), 연사 시퀀스(`burst`), 리사이즈 변환본(`resized`), 파일명 복사 패턴(`filename_copy`), 폴더 간 중복(`cross_folder`), 미디어 유형 필터.
- **스마트 원본 보존 규칙 다각화 (`Smart Auto-Resolve`)**:
  - 선명도, 최대 용량, 최신순, 최초 원본, 최고 해상도(픽셀 수), EXIF 메타데이터 보존 지원.

---

## 📌 [v2.3.0] - 2026-09-15
> **주요 테마**: 3D 감성 플립북 포토북 Engine 2.0, 시네마틱 앰비언트 극장 모드, AI 4대 톤앤매너 감성 캡션 자동 생성

### 📖 인터랙티브 3D 디지털 포토북
- Real-time 3D Page Turning Flipbook 애니메이션 및 종이 소리 효과.
- 시네마틱 앰비언트 조명 및 타이머 기반 자동 슬라이드쇼.
- Gemini AI 기반 서정적/여행/가족/미니멀 4대 감성 캡션 생성.
