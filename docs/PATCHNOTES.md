# SnapClean AI - 공식 패치노트 (Official Patch Notes)

개발자 **AhBiYout (AhBiYout-all)**의 공식 SnapClean AI 프로젝트 버전 히스토리 및 패치노트 문서입니다.

- **GitHub 저장소**: https://github.com/AhBiYout-all/SnapCleanAI
- **공식 구글 블로그**: https://ahbiyoutvibe.blogspot.com/

---

## 📌 [v2.5.0] - 2026-11-01 (Latest)
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
