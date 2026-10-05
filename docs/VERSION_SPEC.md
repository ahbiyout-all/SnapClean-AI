# SnapClean AI - 버전 관리 및 패치노트 자동화 규칙 (Versioning & Patch Notes Specification)

## 1. 버전 관리 원칙 (Semantic Versioning 2.0.0)

SnapClean AI는 [SemVer 2.0.0](https://semver.org/) 표준을 엄격하게 준수합니다:

$$\text{Format: } \mathbf{MAJOR.MINOR.PATCH} \text{ (예: 2.1.0)}$$

### 1.1. 버전 증가 규칙 (Version Bump Rules)

| 구분 | 증가 규칙 | 적용 기준 | 예시 |
|---|---|---|---|
| **MAJOR (주 버전)** | `X.0.0` | 호환성이 깨지는 대규모 아키텍처 개편, 코어 데이터베이스 스키마 변경 | `1.4.2` → `2.0.0` |
| **MINOR (부 버전)** | `x.Y.0` | 새로운 기능 추가 (예: 자세히 보기 탐색기 뷰, 새 분석 모드 추가) | `2.0.0` → `2.1.0` |
| **PATCH (패치 버전)** | `x.y.Z` | 버그 수정, 성능 최적화, UI/UX 디테일 개선, 안정성 강화 | `2.1.0` → `2.1.1` |

---

## 2. 코드 수정 시 패치노트 자동 기록 규칙 (Automated Patch Notes Workflow)

### 2.1. 자동화 체계 구성
1. **중앙 버전 소스**: `src/version.ts` 및 `package.json`
2. **자동 빌드 스탬퍼**: `scripts/version-manager.js`
   - 빌드(`npm run build`) 실행 시 현재 패키지 버전 및 빌드 메타데이터(빌드 시각, 빌드 번호, 플랫폼 정보)를 자동 생성하여 `dist/build-info.json` 및 클라이언트 런타임에 주입합니다.
3. **패치노트 문서 동기화**: `docs/PATCHNOTES.md`
   - 버전이 갱신될 때마다 패치노트 상단에 새 버전 릴리스 섹션이 정형화된 서식으로 자동 기록됩니다.

### 2.2. 변경 사항 카테고리 태그
패치노트 작성 시 다음 표준 태그를 적용합니다:
- `🚀 [NEW]` : 새로운 기능 및 컴포넌트 추가
- `⚡ [ENHANCE]` : 기존 기능 성능 향상 및 UX 개선
- `🛠️ [FIX]` : 버그 및 오류 수정
- `🔒 [SECURITY]` : 보안 강화 및 데이터 무결성 조치
- `📚 [DOCS]` : 문서화 및 가이드 업데이트

---

## 3. 버전 관리 CLI 스크립트 (NPM Scripts)

```bash
# 1. 패치 버전 자동 증가 및 패치노트 동기화 (2.0.0 -> 2.0.1)
npm run version:patch

# 2. 마이너 버전 자동 증가 및 패치노트 동기화 (2.0.0 -> 2.1.0)
npm run version:minor

# 3. 메이저 버전 자동 증가 및 패치노트 동기화 (2.0.0 -> 3.0.0)
npm run version:major

# 4. 모든 문서 및 소스 간 버전 일관성 검사 및 동기화
npm run version:sync
```
