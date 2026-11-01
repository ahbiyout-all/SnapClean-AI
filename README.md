# 📸 SnapClean AI (v2.5.0)

> **스마트 AI 중복 사진 정리, D3.js 폴더별 용량 히트맵 & 인터랙티브 3D 감성 디지털 포토북**

- **Developer**: AhBiYout (AhBiYout-all)
- **GitHub Storage**: https://github.com/AhBiYout-all/SnapCleanAI
- **Official Google Blog**: https://ahbiyoutvibe.blogspot.com/

---

## 🚀 Key Features

### 1. 🔥 D3.js 중복 폴더 히트맵 (Duplicate Storage Hotspots)
- D3.js 기반 인터랙티브 셀 타일로 저장 공간을 압박하는 중복 디렉터리 핫스팟 시각화.
- 낭비 용량(MB/GB) vs 중복 파일 수 토글 및 셀 클릭 시 해당 폴더 중복 항목만 원클릭 필터링.

### 2. ✨ 초점·노출·구도 3축 스마트 AI 사진 자동 선택
- **Blur / Sharpness (40%)**: Laplacian Variance 알고리즘으로 또렷한 피사체 선별.
- **Exposure (35%)**: 하이라이트/암부 손실 차단 및 적정 Base ISO (50~400) 보존.
- **Composition & Aesthetics (25%)**: Aesthetic AI Score 및 얼굴 프레이밍 비율 반영.
- 단순 해상도가 높은 사진 대신 실제 화질이 가장 우수한 베스트 컷 자동 지정.

### 3. 📖 감성 인터랙티브 3D 디지털 포토북 2.0
- Real-time 3D Page Turning 애니메이션, 종이 바스락 음향 효과 및 시네마틱 앰비언트 극장 모드.
- Gemini AI 기반 서정적/여행/가족/미니멀 4대 감성 캡션 자동 작성.

### 4. 🚀 GitHub Releases 실시간 라이브 자동 업데이트 알림
- `api.github.com/repos/AhBiYout-all/SnapCleanAI/releases/latest` 실시간 API 대조.
- 새 릴리스 감지 시 실행 화면에서 알림 팝업창 자동 출력 및 직접 다운로드 링크 제공.

### ⚙️ 5. Unpacked Setup 패키징 & 조용한 방화벽 자동 등록
- 개별파일 풀림(Unpacked Multi-File) 구조 및 무인 백그라운드 설치 지원 (`/S`).
- 설치 진행 시 `SnapClean AI` 및 `SnapClean AI_v2.5.0` Windows 방화벽 인바운드 규칙 자동 등록.

---

## 🛠️ Tech Stack & Architecture
- **Frontend Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Lucide Icons + Motion (Framer Motion)
- **Visualization**: D3.js + Recharts
- **Database & Offline Index**: Dexie.js (IndexedDB)
- **AI Vision Engine**: @google/genai (Gemini 3.8 Flash) + On-Device Vision Classifier
- **Native Desktop App**: Tauri 2.0 (Rust) + PE Unpacked Installer Packager

---

## 📜 Development & Deployment

### Run Development Server
```bash
npm run dev
```

### Build Web Production Bundle
```bash
npm run build
```

### Local GitHub Push Script (Windows)
```cmd
push_to_github.bat
```

---

## 📄 License & Official Channels
- **Author**: AhBiYout
- **GitHub Repository**: https://github.com/AhBiYout-all/SnapCleanAI
- **Official Blog**: https://ahbiyoutvibe.blogspot.com/
- **License**: MIT
