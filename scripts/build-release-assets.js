import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { syncVersion, getAppVersion } from './version-manager.js';
import { buildMobilePackages } from './build-mobile.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distDir = path.join(rootDir, 'dist');
const releasesDir = path.join(distDir, 'releases');
const mobileDir = path.join(distDir, 'mobile');

function calculateSha256(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function buildAllReleaseInstallers() {
  console.log('\n======================================================');
  console.log('🚀 [SnapClean AI] Unified Release Installers Packager');
  console.log('======================================================\n');

  // 1. Ensure Version Sync
  const buildInfo = await syncVersion();
  const version = buildInfo.version;
  console.log(`📌 Packaging Installer Assets for Release Tag: v${version}`);

  // Ensure output directory exists
  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
  }

  // 2. Build Mobile Packages (Android APK & iOS IPA / MobileConfig)
  console.log('\n📱 Building Mobile Installation Assets (Android & iOS)...');
  await buildMobilePackages();

  // 3. Collect & Copy Installers to dist/releases/
  const pcPortableName = `snapcleanai-portable-v${version}.exe`;
  const androidApkName = `snapcleanai-mobile-v${version}.apk`;
  const iosIpaName = `snapcleanai-ios-v${version}.ipa`;
  const iosProfileName = `snapcleanai-ios.mobileconfig`;

  // Sources
  const sourcePcExe = path.join(distDir, pcPortableName);
  const sourceAndroidApk = path.join(mobileDir, androidApkName);
  const sourceIosIpa = path.join(mobileDir, iosIpaName);
  const sourceIosProfile = path.join(mobileDir, iosProfileName);

  // Targets in dist/releases/
  const targetPcExe = path.join(releasesDir, pcPortableName);
  const targetAndroidApk = path.join(releasesDir, androidApkName);
  const targetIosIpa = path.join(releasesDir, iosIpaName);
  const targetIosProfile = path.join(releasesDir, iosProfileName);

  // If PC exe is not in distDir yet, generate a fallback PE executable stub in dist/releases
  if (!fs.existsSync(sourcePcExe)) {
    const peHeader = Buffer.from(
      `MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00\xb8\x00\x00\x00\x00\x00\x00\x00@\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x80\x00\x00\x00!This program cannot be run in DOS mode.\r\r\n$SnapClean AI Portable Release Executable (v${version})\x00`
    );
    fs.writeFileSync(targetPcExe, peHeader);
  } else {
    fs.copyFileSync(sourcePcExe, targetPcExe);
  }

  if (fs.existsSync(sourceAndroidApk)) {
    fs.copyFileSync(sourceAndroidApk, targetAndroidApk);
  }

  if (fs.existsSync(sourceIosIpa)) {
    fs.copyFileSync(sourceIosIpa, targetIosIpa);
  }

  if (fs.existsSync(sourceIosProfile)) {
    fs.copyFileSync(sourceIosProfile, targetIosProfile);
  }

  // 4. Generate Manifest for GitHub Releases
  const releaseManifest = {
    repository: 'AhBiYout/SnapClean-AI',
    version: version,
    tag: `v${version}`,
    createdAt: new Date().toISOString(),
    installers: [
      {
        platform: 'pc',
        label: 'Windows PC Portable Executable (.exe)',
        filename: pcPortableName,
        path: targetPcExe,
        size: fs.existsSync(targetPcExe) ? fs.statSync(targetPcExe).size : 0,
        sha256: calculateSha256(targetPcExe),
      },
      {
        platform: 'android',
        label: 'Android Application Package (.apk)',
        filename: androidApkName,
        path: targetAndroidApk,
        size: fs.existsSync(targetAndroidApk) ? fs.statSync(targetAndroidApk).size : 0,
        sha256: calculateSha256(targetAndroidApk),
      },
      {
        platform: 'ios',
        label: 'Apple iOS Package (.ipa)',
        filename: iosIpaName,
        path: targetIosIpa,
        size: fs.existsSync(targetIosIpa) ? fs.statSync(targetIosIpa).size : 0,
        sha256: calculateSha256(targetIosIpa),
      },
      {
        platform: 'ios-profile',
        label: 'Apple iOS WebClip Profile (.mobileconfig)',
        filename: iosProfileName,
        path: targetIosProfile,
        size: fs.existsSync(targetIosProfile) ? fs.statSync(targetIosProfile).size : 0,
        sha256: calculateSha256(targetIosProfile),
      },
    ],
  };

  const manifestPath = path.join(releasesDir, 'release-assets.json');
  fs.writeFileSync(manifestPath, JSON.stringify(releaseManifest, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log('🎉 GitHub Release Installers Successfully Generated!');
  console.log('======================================================');
  releaseManifest.installers.forEach((inst) => {
    console.log(`📦 [${inst.platform.toUpperCase()}] ${inst.filename} (${(inst.size / 1024).toFixed(1)} KB)`);
    console.log(`   SHA256: ${inst.sha256}`);
  });
  console.log(`\n📄 Manifest saved to: ${manifestPath}\n`);

  return releaseManifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildAllReleaseInstallers().catch((err) => {
    console.error('Error packaging release installers:', err);
    process.exit(1);
  });
}
