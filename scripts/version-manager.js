import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const packageJsonPath = path.join(rootDir, 'package.json');
const metadataJsonPath = path.join(rootDir, 'metadata.json');
const versionTsPath = path.join(rootDir, 'src', 'version.ts');
const patchNotesMdPath = path.join(rootDir, 'docs', 'PATCHNOTES.md');
const tauriConfJsonPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
const distDir = path.join(rootDir, 'dist');
const buildInfoPath = path.join(distDir, 'build-info.json');

// Zero-dependency JSON helpers
function readJson(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

function writeJson(filePath, data, spaces = 2) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, spaces) + '\n', 'utf8');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Fallback: Extract version from docs/PATCHNOTES.md if package.json has issues
export async function getVersionFromPatchNotes() {
  if (fs.existsSync(patchNotesMdPath)) {
    const content = fs.readFileSync(patchNotesMdPath, 'utf8');
    const match = content.match(/##\s*📌\s*\[v?([0-9]+\.[0-9]+\.[0-9]+)\]/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  return '2.4.0';
}

// Get authoritative version (1st: package.json, 2nd: docs/PATCHNOTES.md)
export async function getAppVersion() {
  const pkg = await readJson(packageJsonPath);
  if (pkg && pkg.version) {
    return pkg.version;
  }
  return await getVersionFromPatchNotes();
}

// Format Date YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const pad = (n) => (n < 10 ? '0' + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Generate Build Number YYYYMMDD.XXX
function generateBuildNumber() {
  const d = new Date();
  const pad = (n) => (n < 10 ? '0' + n : n);
  const timeStr = `${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${timeStr}`;
}

// Increment SemVer
function bumpSemVer(version, type = 'patch') {
  const parts = version.split('.').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);

  if (type === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  } else {
    // patch
    parts[2] += 1;
  }

  return parts.join('.');
}

// Sync all version files and generate dist/build-info.json
export async function syncVersion(options = {}) {
  const pkg = await readJson(packageJsonPath);
  let currentVersion = options.newVersion;

  if (!currentVersion) {
    if (pkg && pkg.version) {
      currentVersion = pkg.version;
    } else {
      currentVersion = await getVersionFromPatchNotes();
    }
  }

  const buildNumber = generateBuildNumber();
  const buildDate = getTodayString();

  console.log(`\n======================================================`);
  console.log(`🚀 [SnapClean Version Manager] Syncing Version: v${currentVersion}`);
  console.log(`📦 Build Number: ${buildNumber} | Release Date: ${buildDate}`);
  console.log(`======================================================\n`);

  // 1. Update package.json
  if (pkg) {
    pkg.version = currentVersion;
    writeJson(packageJsonPath, pkg, 2);
    console.log(`✓ Updated package.json -> v${currentVersion}`);
  }

  // 2. Update metadata.json if exists
  if (fs.existsSync(metadataJsonPath)) {
    const meta = readJson(metadataJsonPath);
    if (meta) {
      meta.version = currentVersion;
      writeJson(metadataJsonPath, meta, 2);
      console.log(`✓ Updated metadata.json -> v${currentVersion}`);
    }
  }

  // 3. Update src/version.ts (Single Source of Truth for App UI)
  if (fs.existsSync(versionTsPath)) {
    let versionTs = fs.readFileSync(versionTsPath, 'utf8');

    // Replace version: "..."
    versionTs = versionTs.replace(
      /version:\s*["'][0-9]+\.[0-9]+\.[0-9]+["']/,
      `version: "${currentVersion}"`
    );
    // Replace buildNumber: "..."
    versionTs = versionTs.replace(
      /buildNumber:\s*["'][^"']+["']/,
      `buildNumber: "${buildNumber}"`
    );
    // Replace buildDate: "..."
    versionTs = versionTs.replace(
      /buildDate:\s*["'][^"']+["']/,
      `buildDate: "${buildDate}"`
    );

    // If options.newPatchNote provided, prepend to patchNotes
    if (options.newPatchNote) {
      const noteStr = JSON.stringify(options.newPatchNote, null, 4).replace(/^/gm, '    ');
      versionTs = versionTs.replace(
        /patchNotes:\s*\[/,
        `patchNotes: [\n${noteStr},`
      );
    }

    fs.writeFileSync(versionTsPath, versionTs, 'utf8');
    console.log(`✓ Updated src/version.ts -> v${currentVersion} (Build: ${buildNumber})`);
  }

  // 4. Update src-tauri/tauri.conf.json if exists
  if (fs.existsSync(tauriConfJsonPath)) {
    try {
      const tauriConf = readJson(tauriConfJsonPath);
      if (tauriConf) {
        tauriConf.version = currentVersion;
        writeJson(tauriConfJsonPath, tauriConf, 2);
        console.log(`✓ Updated src-tauri/tauri.conf.json -> v${currentVersion}`);
      }
    } catch (e) {
      console.warn(`⚠️ Warning: Could not update tauri.conf.json:`, e.message);
    }
  }

  // 5. Ensure dist directory & write dist/build-info.json
  ensureDir(distDir);
  const buildInfo = {
    name: 'SnapClean AI',
    version: currentVersion,
    buildNumber,
    builtAt: new Date().toISOString(),
    channel: 'stable',
    engine: 'Dexie+pHash-v2.4+NativeDLL+Telemetry+GitHubLiveUpdater',
    github: {
      owner: 'AhBiYout-all',
      repo: 'SnapClean-AI',
      releasesUrl: 'https://github.com/AhBiYout-all/SnapClean-AI/releases'
    },
    environment: process.env.NODE_ENV || 'production',
    latestPatchSummary: 'GitHub Releases 기반 실시간 자동 업데이트 시스템 및 깃허브 자동화 파이프라인 구축',
  };
  writeJson(buildInfoPath, buildInfo, 2);
  console.log(`✓ Generated build artifact: dist/build-info.json`);

  return buildInfo;
}

// Bump version CLI action
export async function bumpVersion(type = 'patch', customTheme = '') {
  const currentVersion = await getAppVersion();
  const newVersion = bumpSemVer(currentVersion, type);
  const today = getTodayString();
  const theme = customTheme || `릴리스 v${newVersion} 기능 개선 및 안정화 업데이트`;

  console.log(`\nBumping version: v${currentVersion} -> v${newVersion} (${type})`);

  const newPatchNote = {
    version: newVersion,
    releaseDate: today,
    theme: theme,
    isLatest: true,
    features: [
      `v${newVersion} 신규 기능 탑재 및 자동화 파이프라인 연동`,
      'GitHub Releases 실시간 자동 업데이트 시스템 동기화'
    ],
    improvements: [
      '시스템 메모리 최적화 및 런타임 안정성 향상',
      '문서 및 버전 동기화 파이프라인 최신화'
    ],
    fixes: [
      '버전 태깅 및 릴리스 배포 아티팩트 정합성 검증 완료'
    ]
  };

  // 1. Update all files with new patch note
  await syncVersion({ newVersion, newPatchNote });

  // 2. Update docs/PATCHNOTES.md
  if (fs.existsSync(patchNotesMdPath)) {
    let content = fs.readFileSync(patchNotesMdPath, 'utf8');

    // Mark previous "Latest" as regular if present
    content = content.replace(/\(Latest\)/g, '');

    const newEntry = `
---

## 📌 [v${newVersion}] - ${today} (Latest)
> **주요 테마**: ${theme}

### 🚀 새 기능 (New Features)
- **v${newVersion} 릴리스 기능 및 GitHub 자동 업데이트 배포**:
  - GitHub Actions CI/CD 파이프라인과 실시간 릴리스 자동 배포 연동.
  - 최신 휴대용 실행 파일(\`snapcleanai-portable-v${newVersion}.exe\`) 및 코어 DLL 산출물 생성.

### ⚡ 개선 사항 (Improvements)
- 시스템 안정성 강화 및 리소스 텔레메트리 최적화.
- GitHub Releases 기반 자동 버전 확인 및 다운로드 안내 체계 가동.
`;

    // Insert after title header
    const titleMatch = content.indexOf('---');
    if (titleMatch !== -1) {
      content = content.slice(0, titleMatch) + newEntry + '\n' + content.slice(titleMatch);
      fs.writeFileSync(patchNotesMdPath, content, 'utf8');
      console.log(`✓ Automatically appended release section in docs/PATCHNOTES.md`);
    }
  }

  console.log(`\n🎉 Version successfully updated to v${newVersion}!\n`);
  return newVersion;
}

// CLI handler
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'sync';

  if (command === 'bump') {
    const type = args[1] || 'patch';
    const theme = args.slice(2).join(' ') || '';
    await bumpVersion(type, theme);
  } else if (command === 'sync') {
    await syncVersion();
  } else if (command === 'get') {
    const ver = await getAppVersion();
    console.log(ver);
  } else {
    console.log('Usage:');
    console.log('  node scripts/version-manager.js sync');
    console.log('  node scripts/version-manager.js bump [patch|minor|major] [optional-theme-note]');
    console.log('  node scripts/version-manager.js get');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Error in version-manager:', err);
    process.exit(1);
  });
}
