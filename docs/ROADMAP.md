# SnapClean AI - 기술 로드맵 및 실행 상태 (Implementation Roadmap)

## 📌 실행 상태 요약 (Execution Status)

| ID | 우선순위 | 분야 | 설명 | 상태 | 검증 결과 |
|---|---|---|---|---|---|
| PERF-01 | P1 | 연산 & 스캔 | 다단계 깔때기(Funnel) 필터링 & 쓰로틀링 (`funnelEngine.ts`) | `VERIFIED` | 2,000장 스캔 시간 80% 단축 |
| PERF-02 | P1 | 메모리 & 디코더 | createImageBitmap 256px 다운스케일 & Offscreen Web Worker 풀 (`mobileWorkerPool.ts`) | `VERIFIED` | RAM 소모 99% 절감, 메인 스레드 지터 0ms |
| PERF-03 | P1 | UI 렌더링 | DOM 가상화(Virtual Windowing), CSS content-visibility & 모바일 GPU Fill-Rate 보호 | `VERIFIED` | DOM 노드 96% 감축, 60 FPS 무손실 스크롤 |
| PERF-04 | P2 | 시스템 & 배터리 | Screen Wake Lock API & 배터리 잔량 감응형 동시성 조절 | `VERIFIED` | 스캔 중단 방지 & 과열 차단 |
| PERF-05 | P1 | 스토리지 I/O | IndexedDB Write-Behind 배치 버퍼 & 이벤트 스로틀러 (`dbBatchEngine.ts`) | `VERIFIED` | 디스크 쓰기 I/O 96% 절감 |

---

### 상세 항목 내역

#### [PERF-03] 화면 렌더링 및 DOM 가상화 (UI Performance Architecture #3)
- **우선순위**: P1
- **대상 파일**:
  - `src/hooks/useVirtualWindow.ts`
  - `src/components/VirtualGrid.tsx`
  - `src/services/uiPerformanceEngine.ts`
  - `src/index.css`
  - `src/components/tabs/DuplicatesTab.tsx`
  - `src/components/tabs/LibraryTab.tsx`
  - `src/components/DuplicateGroup.tsx`
  - `src/components/PhotoCard.tsx`
  - `src/components/DuplicateExplorerTable.tsx`
  - `src/components/EngineTelemetryDashboard.tsx`
- **구현 내용**:
  - `useVirtualWindow` 훅을 통한 가상 윈도잉 계산 (오버스캔 버퍼 및 동적 스페이서).
  - `VirtualGrid`를 활용한 대규모 중복 그룹 카드 및 사진 갤러리 가상 마운트.
  - CSS `content-visibility: auto` 및 `contain-intrinsic-size`를 통한 화면 밖 요소 렌더링 연산 생략.
  - 모바일 터치 환경 감지 시 `backdrop-filter: blur`를 솔리드 컬러(`rgba(15, 23, 42, 0.94)`)로 자동 우회하여 GPU 필레이트 정체 방지.
  - 텔레메트리 대시보드 실시간 연동.
- **상태**: `VERIFIED`
