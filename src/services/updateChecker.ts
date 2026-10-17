import { APP_VERSION_INFO } from '../version';

export interface GitHubReleaseAsset {
  id: number;
  name: string;
  size: number;
  downloadUrl: string;
  contentType: string;
  downloadCount: number;
  updatedAt: string;
}

export interface ParsedChangelog {
  features: string[];
  improvements: string[];
  fixes: string[];
  rawBody: string;
}

export interface GitHubReleaseInfo {
  id: number;
  tagName: string;
  version: string;
  name: string;
  body: string;
  htmlUrl: string;
  publishedAt: string;
  isPrerelease: boolean;
  isDraft: boolean;
  assets: GitHubReleaseAsset[];
  primaryExecutableAsset?: GitHubReleaseAsset;
  androidApkAsset?: GitHubReleaseAsset;
  iosIpaAsset?: GitHubReleaseAsset;
  iosMobileConfigAsset?: GitHubReleaseAsset;
  parsedChangelog: ParsedChangelog;
}

export type UpdateCheckStatus = 'idle' | 'checking' | 'available' | 'up-to-date' | 'error' | 'rate-limited';

export interface UpdateCheckResult {
  status: UpdateCheckStatus;
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  release?: GitHubReleaseInfo;
  checkedAt: string;
  errorMessage?: string;
  isSimulated?: boolean;
}

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  releasesUrl: string;
  apiUrl: string;
}

export const GITHUB_REPO_CONFIG: GitHubRepoConfig = {
  owner: 'AhBiYout-all',
  repo: 'SnapClean-AI',
  releasesUrl: 'https://github.com/AhBiYout-all/SnapClean-AI/releases',
  apiUrl: 'https://api.github.com/repos/AhBiYout-all/SnapClean-AI/releases/latest',
};

const STORAGE_KEYS = {
  AUTO_CHECK: 'snapclean_update_auto_check',
  LAST_CHECK_RESULT: 'snapclean_update_last_result',
  IGNORED_VERSION: 'snapclean_update_ignored_version',
  LAST_CHECK_TIME: 'snapclean_update_last_time',
};

/**
 * Compare two semantic versions (e.g. "2.4.0" vs "2.4.1")
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function semverCompare(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();

  const parts1 = clean1.split(/[-+.]/).map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split(/[-+.]/).map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length, 3);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Parse markdown changelog into categorized lists
 */
export function parseChangelog(bodyText: string): ParsedChangelog {
  const features: string[] = [];
  const improvements: string[] = [];
  const fixes: string[] = [];

  if (!bodyText) {
    return { features, improvements, fixes, rawBody: '' };
  }

  const lines = bodyText.split('\n');
  let currentCategory: 'features' | 'improvements' | 'fixes' | 'none' = 'none';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect section headers
    if (/###?\s*(?:🚀|새\s*기능|Features?|New\s*Features?)/i.test(line)) {
      currentCategory = 'features';
      continue;
    }
    if (/###?\s*(?:⚡|개선\s*사항|Improvements?|Optimizations?|Changes?)/i.test(line)) {
      currentCategory = 'improvements';
      continue;
    }
    if (/###?\s*(?:🐞|버그\s*수정|Bug\s*Fixes?|Fixes?)/i.test(line)) {
      currentCategory = 'fixes';
      continue;
    }

    // Check list item
    if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s+/.test(line)) {
      const cleanItem = line.replace(/^[-*]|\d+\.\s*/, '').trim();
      if (cleanItem.length > 0) {
        if (currentCategory === 'features') {
          features.push(cleanItem);
        } else if (currentCategory === 'improvements') {
          improvements.push(cleanItem);
        } else if (currentCategory === 'fixes') {
          fixes.push(cleanItem);
        } else {
          // If no category header matched yet, default to improvements or features
          features.push(cleanItem);
        }
      }
    }
  }

  return {
    features,
    improvements,
    fixes,
    rawBody: bodyText,
  };
}

class UpdateCheckerService {
  private lastResult: UpdateCheckResult | null = null;
  private isChecking: boolean = false;
  private timer: number | null = null;

  constructor() {
    this.loadCachedResult();
    if (this.isAutoCheckEnabled()) {
      // Auto check after initial boot
      setTimeout(() => {
        this.checkForUpdates(false).catch(() => {});
      }, 3500);

      // Periodic check every 30 minutes
      this.timer = window.setInterval(() => {
        this.checkForUpdates(false).catch(() => {});
      }, 30 * 60 * 1000);
    }
  }

  public isAutoCheckEnabled(): boolean {
    const val = localStorage.getItem(STORAGE_KEYS.AUTO_CHECK);
    return val === null ? true : val === 'true';
  }

  public setAutoCheckEnabled(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEYS.AUTO_CHECK, String(enabled));
  }

  public getIgnoredVersion(): string | null {
    return localStorage.getItem(STORAGE_KEYS.IGNORED_VERSION);
  }

  public setIgnoredVersion(version: string): void {
    localStorage.setItem(STORAGE_KEYS.IGNORED_VERSION, version);
  }

  public clearIgnoredVersion(): void {
    localStorage.removeItem(STORAGE_KEYS.IGNORED_VERSION);
  }

  public getLastResult(): UpdateCheckResult | null {
    return this.lastResult;
  }

  private loadCachedResult() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_CHECK_RESULT);
      if (data) {
        this.lastResult = JSON.parse(data);
      }
    } catch {
      this.lastResult = null;
    }
  }

  private saveResult(result: UpdateCheckResult) {
    this.lastResult = result;
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_CHECK_RESULT, JSON.stringify(result));
      localStorage.setItem(STORAGE_KEYS.LAST_CHECK_TIME, new Date().toISOString());
    } catch {
      // ignore quota error
    }
  }

  private dispatchUpdateEvent(result: UpdateCheckResult) {
    window.dispatchEvent(
      new CustomEvent('snapclean-update-check', {
        detail: result,
      })
    );
    if (result.hasUpdate) {
      window.dispatchEvent(
        new CustomEvent('snapclean-update-available', {
          detail: result,
        })
      );
    }
  }

  /**
   * Real-time query to GitHub Releases API
   */
  public async checkForUpdates(force: boolean = false): Promise<UpdateCheckResult> {
    if (this.isChecking) {
      return this.lastResult || {
        status: 'checking',
        hasUpdate: false,
        currentVersion: APP_VERSION_INFO.version,
        latestVersion: APP_VERSION_INFO.version,
        checkedAt: new Date().toISOString(),
      };
    }

    const currentVersion = APP_VERSION_INFO.version;
    const nowIso = new Date().toISOString();

    // Cache guard: If checked within last 5 minutes and not forced
    if (!force && this.lastResult) {
      const lastTimeStr = localStorage.getItem(STORAGE_KEYS.LAST_CHECK_TIME);
      if (lastTimeStr) {
        const diffMs = Date.now() - new Date(lastTimeStr).getTime();
        if (diffMs < 5 * 60 * 1000) {
          return this.lastResult;
        }
      }
    }

    this.isChecking = true;
    this.dispatchUpdateEvent({
      status: 'checking',
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      checkedAt: nowIso,
    });

    try {
      const response = await fetch(GITHUB_REPO_CONFIG.apiUrl, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      // 404: No releases published yet on this repository
      if (response.status === 404) {
        const notFoundResult: UpdateCheckResult = {
          status: 'up-to-date',
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          checkedAt: nowIso,
          errorMessage: 'GitHub 리포지토리(AhBiYout-all/SnapClean-AI)에 등록된 릴리스가 아직 없습니다. 현재 빌드가 최신입니다.',
        };
        this.saveResult(notFoundResult);
        this.dispatchUpdateEvent(notFoundResult);
        this.isChecking = false;
        return notFoundResult;
      }

      // 403: Rate Limit Exceeded
      if (response.status === 403) {
        const rateLimitResult: UpdateCheckResult = {
          status: 'rate-limited',
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          checkedAt: nowIso,
          errorMessage: 'GitHub API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        };
        this.saveResult(rateLimitResult);
        this.dispatchUpdateEvent(rateLimitResult);
        this.isChecking = false;
        return rateLimitResult;
      }

      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
      }

      const releaseData = await response.json();
      const rawTag = releaseData.tag_name || '';
      const remoteVersion = rawTag.replace(/^v/i, '').trim();

      const assets: GitHubReleaseAsset[] = (releaseData.assets || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        downloadUrl: a.browser_download_url,
        contentType: a.content_type,
        downloadCount: a.download_count,
        updatedAt: a.updated_at,
      }));

      // Find primary executable asset (e.g. portable exe or setup exe)
      const primaryExecutableAsset = assets.find(
        (a) => a.name.endsWith('.exe') || a.name.includes('portable')
      ) || assets[0];

      const androidApkAsset = assets.find((a) => a.name.endsWith('.apk'));
      const iosIpaAsset = assets.find((a) => a.name.endsWith('.ipa'));
      const iosMobileConfigAsset = assets.find((a) => a.name.endsWith('.mobileconfig'));

      const releaseInfo: GitHubReleaseInfo = {
        id: releaseData.id,
        tagName: rawTag,
        version: remoteVersion,
        name: releaseData.name || `Release ${rawTag}`,
        body: releaseData.body || '',
        htmlUrl: releaseData.html_url || GITHUB_REPO_CONFIG.releasesUrl,
        publishedAt: releaseData.published_at || nowIso,
        isPrerelease: Boolean(releaseData.prerelease),
        isDraft: Boolean(releaseData.draft),
        assets,
        primaryExecutableAsset,
        androidApkAsset,
        iosIpaAsset,
        iosMobileConfigAsset,
        parsedChangelog: parseChangelog(releaseData.body || ''),
      };

      const cmp = semverCompare(remoteVersion, currentVersion);
      const isNewer = cmp > 0;
      const ignored = this.getIgnoredVersion();
      const hasUpdate = isNewer && ignored !== remoteVersion;

      const result: UpdateCheckResult = {
        status: hasUpdate ? 'available' : 'up-to-date',
        hasUpdate,
        currentVersion,
        latestVersion: remoteVersion,
        release: releaseInfo,
        checkedAt: nowIso,
      };

      this.saveResult(result);
      this.dispatchUpdateEvent(result);
      this.isChecking = false;
      return result;
    } catch (err: any) {
      console.warn('[UpdateChecker] Failed to fetch GitHub release:', err);
      const errorResult: UpdateCheckResult = {
        status: 'error',
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        checkedAt: nowIso,
        errorMessage: err.message || '네트워크 연결 오류로 GitHub Releases 조회가 지연되었습니다.',
      };
      this.saveResult(errorResult);
      this.dispatchUpdateEvent(errorResult);
      this.isChecking = false;
      return errorResult;
    }
  }

  /**
   * Development & Verification Simulator:
   * Instantly simulate a newer version release (e.g. v2.5.0) to test the UI notification,
   * changelog display, and direct download links without needing live GitHub upload.
   */
  public simulateNewRelease(simulatedVersion: string = '2.5.0'): UpdateCheckResult {
    const currentVersion = APP_VERSION_INFO.version;
    const nowIso = new Date().toISOString();

    const mockBody = `
### 🚀 새 기능 (New Features)
- **GitHub Releases 실시간 자동 업데이트 시스템**: 원클릭 최신 버전 확인 및 다운로드 안내
- **원격 자산 무결성 검증**: SHA-256 체크섬 기반의 안전한 실행 파일 다운로드
- **고효율 백그라운드 텔레메트리 연동**: VRAM 누수 모니터링 자동 경고

### ⚡ 개선 사항 (Improvements)
- 시스템 초기 부팅 시간 40% 단축 (DLL 모듈 분리 로딩)
- GitHub CI/CD 파이프라인과 완벽 연동되는 동적 버전 관리 자동화

### 🐞 버그 수정 (Fixes)
- 특정 GPU 환경에서 캔버스 컨텍스트 손실 시 자동 복구 로직 보강
`;

    const simulatedRelease: GitHubReleaseInfo = {
      id: 999999,
      tagName: `v${simulatedVersion}`,
      version: simulatedVersion,
      name: `SnapClean AI v${simulatedVersion} - GitHub Releases 자동 업데이트`,
      body: mockBody,
      htmlUrl: `https://github.com/AhBiYout-all/SnapClean-AI/releases/tag/v${simulatedVersion}`,
      publishedAt: nowIso,
      isPrerelease: false,
      isDraft: false,
      assets: [
        {
          id: 101,
          name: `snapcleanai-portable-v${simulatedVersion}.exe`,
          size: 64 * 1024 * 1024,
          downloadUrl: `https://github.com/AhBiYout-all/SnapClean-AI/releases/download/v${simulatedVersion}/snapcleanai-portable-v${simulatedVersion}.exe`,
          contentType: 'application/vnd.microsoft.portable-executable',
          downloadCount: 42,
          updatedAt: nowIso,
        },
        {
          id: 102,
          name: 'snapclean_core.dll',
          size: 4 * 1024 * 1024,
          downloadUrl: `https://github.com/AhBiYout-all/SnapClean-AI/releases/download/v${simulatedVersion}/snapclean_core.dll`,
          contentType: 'application/x-msdownload',
          downloadCount: 42,
          updatedAt: nowIso,
        },
        {
          id: 103,
          name: `snapcleanai-mobile-v${simulatedVersion}.apk`,
          size: 18 * 1024 * 1024,
          downloadUrl: `https://github.com/AhBiYout-all/SnapClean-AI/releases/download/v${simulatedVersion}/snapcleanai-mobile-v${simulatedVersion}.apk`,
          contentType: 'application/vnd.android.package-archive',
          downloadCount: 88,
          updatedAt: nowIso,
        },
        {
          id: 104,
          name: `snapcleanai-ios-v${simulatedVersion}.ipa`,
          size: 22 * 1024 * 1024,
          downloadUrl: `https://github.com/AhBiYout-all/SnapClean-AI/releases/download/v${simulatedVersion}/snapcleanai-ios-v${simulatedVersion}.ipa`,
          contentType: 'application/octet-stream',
          downloadCount: 54,
          updatedAt: nowIso,
        },
        {
          id: 105,
          name: `snapcleanai-ios.mobileconfig`,
          size: 4 * 1024,
          downloadUrl: `https://github.com/AhBiYout-all/SnapClean-AI/releases/download/v${simulatedVersion}/snapcleanai-ios.mobileconfig`,
          contentType: 'application/x-apple-aspen-config',
          downloadCount: 130,
          updatedAt: nowIso,
        }
      ],
      primaryExecutableAsset: {
        id: 101,
        name: `snapcleanai-portable-v${simulatedVersion}.exe`,
        size: 64 * 1024 * 1024,
        downloadUrl: `https://github.com/AhBiYout-all/SnapClean-AI/releases/download/v${simulatedVersion}/snapcleanai-portable-v${simulatedVersion}.exe`,
        contentType: 'application/vnd.microsoft.portable-executable',
        downloadCount: 42,
        updatedAt: nowIso,
      },
      androidApkAsset: {
        id: 103,
        name: `snapcleanai-mobile-v${simulatedVersion}.apk`,
        size: 18 * 1024 * 1024,
        downloadUrl: `https://github.com/AhBiYout-all/SnapClean-AI/releases/download/v${simulatedVersion}/snapcleanai-mobile-v${simulatedVersion}.apk`,
        contentType: 'application/vnd.android.package-archive',
        downloadCount: 88,
        updatedAt: nowIso,
      },
      iosIpaAsset: {
        id: 104,
        name: `snapcleanai-ios-v${simulatedVersion}.ipa`,
        size: 22 * 1024 * 1024,
        downloadUrl: `https://github.com/AhBiYout-all/SnapClean-AI/releases/download/v${simulatedVersion}/snapcleanai-ios-v${simulatedVersion}.ipa`,
        contentType: 'application/octet-stream',
        downloadCount: 54,
        updatedAt: nowIso,
      },
      iosMobileConfigAsset: {
        id: 105,
        name: `snapcleanai-ios.mobileconfig`,
        size: 4 * 1024,
        downloadUrl: `https://github.com/AhBiYout-all/SnapClean-AI/releases/download/v${simulatedVersion}/snapcleanai-ios.mobileconfig`,
        contentType: 'application/x-apple-aspen-config',
        downloadCount: 130,
        updatedAt: nowIso,
      },
      parsedChangelog: parseChangelog(mockBody),
    };

    const result: UpdateCheckResult = {
      status: 'available',
      hasUpdate: true,
      currentVersion,
      latestVersion: simulatedVersion,
      release: simulatedRelease,
      checkedAt: nowIso,
      isSimulated: true,
    };

    this.saveResult(result);
    this.dispatchUpdateEvent(result);
    return result;
  }
}

export const updateChecker = new UpdateCheckerService();
