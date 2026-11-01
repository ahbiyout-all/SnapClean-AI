# SnapClean AI - GitHub Repository & Auto-Push Developer Guide

본 문서는 개발자 **AhBiYout (AhBiYout-all)**의 공식 SnapClean AI GitHub 저장소 연동, CI/CD 워크플로 관리 및 로컬 저장소 동기화 가이드입니다.

- **Developer**: AhBiYout
- **GitHub Username**: AhBiYout-all
- **Repository URL**: https://github.com/AhBiYout-all/SnapCleanAI
- **Official Google Blog**: https://ahbiyoutvibe.blogspot.com/

---

## 1. GitHub 저장소 연동 규칙 및 보안 가이드라인
- **개인정보 및 이메일 업로드 금지**:
  - 소스코드 및 커밋 내 개인 이메일 노출을 금지합니다.
  - Git 사용자 이메일은 보안 노릴레이 계정인 `AhBiYout-all@users.noreply.github.com`을 사용하도록 자동 설정됩니다.
- **불필요한 파일 업로드 방지 (`.gitignore` Overhaul)**:
  - `node_modules/`, `dist/`, `target/` (Cargo 빌드)
  - 임시/로그 파일, 개인 `.env` 키, 포터블 바이너리, 패키징 임시 파일
  - 로컬 전용 자동 푸시 스크립트 (`push_to_github.bat`)

---

## 2. 로컬 자동 푸시 스크립트 (`push_to_github.bat`) 사용법
프로젝트 루트 디렉터리에 위치한 `push_to_github.bat` 파일은 깃허브 업로드에서 자동으로 제외되며, 개발자가 원클릭으로 핵심 코드만 선별 푸시할 수 있도록 지원합니다.

### 실행 방법:
```cmd
push_to_github.bat
```

### 작동 순서:
1. 로컬 작업 공간 내 불필요한 임시 파일 정화 검사 실행
2. Git 사용자 이름(`AhBiYout-all`) 및 노릴레이 이메일(`AhBiYout-all@users.noreply.github.com`) 자동 설정
3. 원격 리모트 URL `https://github.com/AhBiYout-all/SnapCleanAI.git` 연결 확인 및 업데이트
4. 타임스탬프가 포함된 릴리스 커밋 메시지 자동 생성
5. `main` 브랜치로 안전 푸시

---

## 3. GitHub Actions CI/CD 파이프라인 (Node.js 22 LTS)
GitHub Actions 환경에서의 Node.js 20 EOL (2026년 4월 수명 종료) 노란색 경고 방지를 위해 최신 **Node.js 22 LTS** 파이프라인이 전면 적용되어 있습니다.

- **릴리스 자동 패키징 (`.github/workflows/github-release.yml`)**:
  - `v*` 태그 푸시 또는 수동 트리거 시 실행 (최신 버전: `v2.6.0`)
  - Node.js 22 LTS 환경에서 TypeScript 검사, Vite 번들링 및 Unpacked Setup 설치 패키지 생성
  - 파일명 지능형 유추 엔진(`FilenameInferenceEngine`), 스마트 AI 화질 선택기, D3 히트맵 등 신규 기능 포함
  - GitHub Releases 항목에 패치노트와 함께 자동 첨부
- **GitHub Pages 자동 배포 (`.github/workflows/deploy-pages.yml`)**:
  - `main` 브랜치 푸시 시 최신 라이브 웹 PWA 자동 배포
