/**
 * GitHub Releases Real-Time Auto-Update Checker Service
 * Developer: AhBiYout
 * Official GitHub: https://github.com/AhBiYout-all/SnapCleanAI
 * Official Google Blog: https://ahbiyoutvibe.blogspot.com/
 */

import metadata from '../../metadata.json';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle: string;
  releaseNotes: string;
  downloadUrl: string;
  htmlUrl: string;
  repoUrl: string;
  blogUrl: string;
  developerName: string;
  publishedAt?: string;
  installerAssets: Array<{
    name: string;
    size: number;
    downloadUrl: string;
  }>;
}

export const OFFICIAL_SPECS = {
  developer: 'AhBiYout',
  githubUsername: 'AhBiYout-all',
  repoName: 'SnapCleanAI',
  githubRepoUrl: 'https://github.com/AhBiYout-all/SnapCleanAI',
  blogUrl: 'https://ahbiyoutvibe.blogspot.com/',
  currentVersion: metadata.version || '2.5.0',
};

function parseSemver(versionStr: string): number[] {
  const clean = versionStr.replace(/^v/i, '').trim();
  return clean.split('.').map(n => parseInt(n, 10) || 0);
}

function isVersionHigher(latest: string, current: string): boolean {
  const latestParts = parseSemver(latest);
  const currentParts = parseSemver(current);

  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

export async function checkForGitHubUpdates(): Promise<UpdateInfo> {
  const currentVersion = OFFICIAL_SPECS.currentVersion;
  const repoEndpoints = [
    `https://api.github.com/repos/${OFFICIAL_SPECS.githubUsername}/${OFFICIAL_SPECS.repoName}/releases/latest`,
    `https://api.github.com/repos/${OFFICIAL_SPECS.githubUsername}/SnapClean-AI/releases/latest`,
  ];

  let releaseData: any = null;

  for (const endpoint of repoEndpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        releaseData = await response.json();
        break;
      }
    } catch (e) {
      console.warn(`[UpdateChecker] Failed fetching from ${endpoint}:`, e);
    }
  }

  if (!releaseData) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseTitle: 'SnapClean AI Latest',
      releaseNotes: '최신 버전을 사용 중입니다.',
      downloadUrl: `${OFFICIAL_SPECS.githubRepoUrl}/releases`,
      htmlUrl: OFFICIAL_SPECS.githubRepoUrl,
      repoUrl: OFFICIAL_SPECS.githubRepoUrl,
      blogUrl: OFFICIAL_SPECS.blogUrl,
      developerName: OFFICIAL_SPECS.developer,
      installerAssets: [],
    };
  }

  const latestVersion = releaseData.tag_name || currentVersion;
  const hasUpdate = isVersionHigher(latestVersion, currentVersion);

  const installerAssets = (releaseData.assets || []).map((asset: any) => ({
    name: asset.name,
    size: asset.size,
    downloadUrl: asset.browser_download_url,
  }));

  const primaryInstaller = installerAssets.find((a: any) =>
    a.name.endsWith('.exe') || a.name.endsWith('.zip')
  );

  return {
    hasUpdate,
    currentVersion,
    latestVersion,
    releaseTitle: releaseData.name || `SnapClean AI ${latestVersion}`,
    releaseNotes: releaseData.body || '새로운 업데이트 버전이 배포되었습니다.',
    downloadUrl: primaryInstaller
      ? primaryInstaller.downloadUrl
      : (releaseData.html_url || `${OFFICIAL_SPECS.githubRepoUrl}/releases`),
    htmlUrl: releaseData.html_url || `${OFFICIAL_SPECS.githubRepoUrl}/releases`,
    repoUrl: OFFICIAL_SPECS.githubRepoUrl,
    blogUrl: OFFICIAL_SPECS.blogUrl,
    developerName: OFFICIAL_SPECS.developer,
    publishedAt: releaseData.published_at,
    installerAssets,
  };
}
