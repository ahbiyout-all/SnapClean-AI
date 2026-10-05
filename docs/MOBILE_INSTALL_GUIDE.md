# SnapClean AI - 모바일(Android / iPhone) 및 PC 설치 가이드

본 문서는 SnapClean AI의 멀티 플랫폼(Windows PC, 안드로이드 APK, 아이폰 iOS) 배포 패키지 설치 방법을 상세히 안내합니다.

---

## 1. 플랫폼별 설치 파일 요약 (Package Matrix)

| 플랫폼 | 설치 파일 형식 | 파일명 형식 | 설치 소요 시간 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **Windows PC** | 무설치 단일 포터블 실행 파일 | `snapcleanai-portable-v{ver}.exe` | 즉시 실행 (0초) | 더블 클릭 실행 |
| **Android 스마트폰/태블릿** | 안드로이드 패키지 (APK) | `snapcleanai-mobile-v{ver}.apk` | 약 30초 | 출처 허용 후 즉시 설치 |
| **iPhone / iPad (iOS)** | Apple 모바일 구성 프로필 | `snapcleanai-ios.mobileconfig` | 약 10초 | **원클릭 홈 화면 앱 설치 (추천)** |
| **iPhone / iPad (iOS)** | iOS 애플리케이션 아카이브 (IPA) | `snapcleanai-ios-v{ver}.ipa` | 약 2분 | AltStore/Sideloadly 사이드로딩 |
| **iPhone Safari PWA** | 웹 앱 바로가기 | 브라우저 직접 추가 | 약 5초 | Safari [공유] ➔ [홈 화면에 추가] |

---

## 2. 안드로이드 (Android) APK 설치 가이드

1. **APK 파일 다운로드**:
   - 앱 내 업데이트 창 또는 [GitHub Releases](https://github.com/AhBiYout/AhBiYout-all/releases)에서 `snapcleanai-mobile-v{version}.apk`를 다운로드합니다.
2. **설치 허용**:
   - 다운로드 완료 팝업 또는 파일 관리자에서 APK를 터치합니다.
   - *"보안상의 이유로 이 출처의 알 수 없는 앱을 설치할 수 없습니다"* 경고가 뜨면 **[설정]**으로 이동합니다.
   - **[이 출처의 앱 허용]** 스위치를 켭니다.
3. **설치 완료**:
   - **[설치]** 버튼을 누르면 안드로이드 앱 목록 및 홈 화면에 SnapClean AI가 즉시 등록됩니다.

---

## 3. 아이폰 (iPhone / iOS) 설치 가이드

Apple의 보안 정책상 아이폰에서는 `.apk` 파일을 직접 실행할 수 없으므로, SnapClean AI는 **3가지 공식 설치 방식**을 지원합니다.

### 방법 A: 1초 원클릭 프로필 설치 (가장 추천 ⭐)
Apple의 정식 모바일 구성 프로필(WebClip)을 이용해 홈 화면에 네이티브 풀스크린 앱 아이콘을 추가합니다.
1. 아이폰의 **Safari** 브라우저에서 `snapcleanai-ios.mobileconfig` 링크를 탭합니다.
2. *"웹사이트에서 구성 프로필을 다운로드하려고 합니다. 허용하겠습니까?"* 팝업에서 **[허용]**을 누릅니다.
3. 아이폰 **[설정]** 앱을 엽니다.
4. 상단에 표시되는 **[프로필이 다운로드됨]**을 탭합니다.
5. 우측 상단의 **[설치]**를 누르고 기기 암호를 입력한 후 설치를 완료합니다.
6. 이제 홈 화면에 네이티브 앱 아이콘이 생성되어 독립 실행형 앱으로 동작합니다.

### 방법 B: Safari 홈 화면에 추가 (PWA 무설치)
1. 아이폰 Safari에서 SnapClean AI 웹사이트에 접속합니다.
2. 화면 하단 중앙의 **[공유(Share)]** 아이콘(네모 상자 위 화살표)을 탭합니다.
3. 메뉴를 아래로 스크롤하여 **[홈 화면에 추가 (Add to Home Screen)]**를 선택합니다.
4. 우측 상단 **[추가]**를 누르면 즉시 홈 화면에 앱이 추가됩니다.

### 방법 C: IPA 패키지 사이드로딩 (고급 사용자)
1. GitHub Releases에서 `snapcleanai-ios-v{version}.ipa` 파일을 다운로드합니다.
2. PC에서 **AltStore**, **Sideloadly**, 또는 **TrollStore** 프로그램을 실행합니다.
3. 아이폰을 PC와 케이블로 연결한 뒤 다운로드한 `.ipa` 파일을 드래그하여 서명 및 전송합니다.
4. 아이폰 [설정] ➔ [일반] ➔ [VPN 및 기기 관리]에서 개발자 앱을 [신뢰]하면 네이티브 바이너리로 실행됩니다.

---

## 4. Windows PC 포터블 실행 파일 가이드

1. `snapcleanai-portable-v{version}.exe` 파일을 다운로드합니다.
2. 레지스트리 등록이나 별도의 설치 과정 없이, 원하는 폴더(또는 USB 메모리)에 넣고 더블 클릭하면 바로 실행됩니다.
3. 앱 시작 시 `dist/dll/snapclean_core.dll` 및 Rust 기반 네이티브 하드웨어 가속이 자동 구동됩니다.

---

## 5. 실시간 업데이트 연동

* 앱 상단의 버전 버튼 또는 **[설정] ➔ [GitHub Releases 실시간 자동 업데이트]** 카드에서 언제든 최신 버전을 확인할 수 있습니다.
* 새 버전이 GitHub에 등록되면 PC, 안드로이드, 아이폰용 다운로드 링크가 자동으로 사용자 기기 환경에 맞춰 강조됩니다.
