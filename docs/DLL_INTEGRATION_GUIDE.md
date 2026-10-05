# SnapClean Core - 네이티브 DLL (`snapclean_core.dll`) 개발 및 연동 가이드

## 1. 개요 (Overview)
`snapclean_core.dll`은 SnapClean AI의 고속 미디어 처리 알고리즘(SHA-256 해시, 지각 해시 pHash, 무결성 검증 파일 자동 정리, 디렉토리 고속 순회)을 **순수 Rust로 컴파일한 윈도우 네이티브 동적 링크 라이브러리(DLL)**입니다.

- **라이브러리 파일명**: `snapclean_core.dll` (Linux: `libsnapclean_core.so`, macOS: `libsnapclean_core.dylib`)
- **인터페이스**: 표준 C-ABI (`extern "C"`, `__declspec(dllexport)`)
- **지원 언어**: C#, .NET, Python, C/C++, Java(JNI/JNA), Go, Windows PowerShell 등 모든 C 호출 규약 지원 언어

---

## 2. DLL 빌드 방법 (How to Build)

### 2.1. 로컬 환경 빌드
Rust가 설치된 개발 PC에서 아래 명령어를 실행합니다:

```bash
cd src-tauri
cargo build --release
```

빌드가 완료되면 다음 위치에 DLL 파일이 생성됩니다:
- 윈도우: `src-tauri/target/release/snapclean_core.dll`

### 2.2. GitHub Actions 자동 빌드
GitHub 저장소에 푸시하면 `.github/workflows/tauri-build.yml`에 의해 Windows x64 환경에서 DLL과 실행 파일이 자동 빌드되어 Release 에셋으로 패키징됩니다.

---

## 3. C-ABI 함수 명세 (Exported Functions)

| 함수명 | 반환 타입 | 매개변수 | 설명 |
| :--- | :--- | :--- | :--- |
| `snapclean_version` | `const char*` | `void` | 엔진 버전 문자열 반환 (예: `"2.1.0-native-dll"`) |
| `snapclean_calculate_sha256` | `int32_t` | `file_path`, `out_buf`, `out_len` | 파일의 SHA-256 해시를 계산하여 버퍼에 기록 (성공 시 0) |
| `snapclean_calculate_phash` | `int32_t` | `file_path`, `out_buf`, `out_len` | 이미지의 지각 해시(pHash)를 계산하여 Base64로 기록 (성공 시 0) |
| `snapclean_compare_phash` | `int32_t` | `hash1`, `hash2` | 두 pHash 간의 해밍 거리 반환 (0~64, 10 이하 시 중복/유사본) |
| `snapclean_organize_file` | `int32_t` | `src_path`, `target_dir`, `is_move` | 파일 암호화 검증 복사/이동 (1: 이동, 0: 복사, 무결성 보장) |
| `snapclean_count_media_files`| `int64_t` | `dir_path` | 디렉토리 내 미디어 파일(사진/영상) 개수 고속 전수 카운트 |

---

## 4. 언어별 연동 예제 (Integration Examples)

### 4.1. C# (.NET / WPF / WinForms) 연동
```csharp
using System;
using System.Runtime.InteropServices;
using System.Text;

class Program
{
    const string DllPath = "snapclean_core.dll";

    [DllImport(DllPath, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr snapclean_version();

    [DllImport(DllPath, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    public static extern int snapclean_calculate_sha256(string filePath, StringBuilder outBuf, UIntPtr outLen);

    [DllImport(DllPath, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    public static extern int snapclean_organize_file(string srcPath, string targetDir, int isMove);

    static void Main()
    {
        // 1. 버전 확인
        string version = Marshal.PtrToStringAnsi(snapclean_version());
        Console.WriteLine($"[SnapClean Engine] Version: {version}");

        // 2. 고속 SHA256 계산
        var hashBuf = new StringBuilder(65);
        int result = snapclean_calculate_sha256(@"C:\Photos\sample.jpg", hashBuf, (UIntPtr)65);
        if (result == 0) {
            Console.WriteLine($"SHA-256: {hashBuf}");
        }

        // 3. 파일 안전 이동 (무결성 검증 포함)
        int moveResult = snapclean_organize_file(@"C:\Photos\sample.jpg", @"D:\Organized\2026-09", 1);
        Console.WriteLine($"이동 결과 코드: {moveResult}");
    }
}
```

---

### 4.2. Python (`ctypes`) 연동
```python
import ctypes
import os

# DLL 로드
dll_path = os.path.abspath("snapclean_core.dll")
snapclean = ctypes.CDLL(dll_path)

# 1. 버전 확인
snapclean.snapclean_version.restype = ctypes.c_char_p
version = snapclean.snapclean_version().decode('utf-8')
print(f"SnapClean Engine Version: {version}")

# 2. SHA-256 해시 계산
buf = ctypes.create_string_buffer(65)
ret = snapclean.snapclean_calculate_sha256(b"C:/Photos/test.jpg", buf, 65)
if ret == 0:
    print(f"SHA-256: {buf.value.decode('utf-8')}")

# 3. pHash 유사도 비교
hash1 = b"3/38//8/7/8="
hash2 = b"3/38//8/7/8="
dist = snapclean.snapclean_compare_phash(hash1, hash2)
print(f"Hamming Distance: {dist} (0이면 100% 동일 이미지)")
```

---

### 4.3. C/C++ 연동
```cpp
#include <iostream>
#include "include/snapclean_core.h"

int main() {
    std::cout << "Engine: " << snapclean_version() << std::endl;
    
    char sha[65] = {0};
    if (snapclean_calculate_sha256("test.jpg", sha, sizeof(sha)) == 0) {
        std::cout << "SHA256: " << sha << std::endl;
    }
    
    return 0;
}
```

---

## 5. 결론 및 실무 활용
이 DLL을 통해:
1. **타 개발사/외부 솔루션에 SnapClean 중복정리 코어를 라이브러리 형태로 공급**할 수 있습니다.
2. **윈도우 탐색기 컨텍스트 메뉴**나 **사내 배치 스크립트**에서도 최소한의 메모리 점유율로 네이티브 초고속 파일 연산 기능을 직접 실행할 수 있습니다.
