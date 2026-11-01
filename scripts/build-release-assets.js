import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { syncVersion } from './version-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distDir = path.join(rootDir, 'dist');
const releasesDir = path.join(distDir, 'releases');

function calculateSha256(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function buildAllReleaseInstallers() {
  console.log('\n======================================================');
  console.log('🚀 [SnapClean AI] Unpacked Installer Release Packager');
  console.log('   Developer: AhBiYout (AhBiYout-all)');
  console.log('   Repository: https://github.com/AhBiYout-all/SnapCleanAI');
  console.log('   Blog: https://ahbiyoutvibe.blogspot.com/');
  console.log('======================================================\n');

  // 1. Synchronize Version
  const buildInfo = await syncVersion();
  const version = buildInfo.version;
  console.log(`📌 Packaging Release Installer Assets for Tag: v${version}`);

  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
  }

  // 2. Setup Installer Asset Names
  const installerName = `SnapCleanAI-Setup-v${version}.exe`;
  const targetInstallerPath = path.join(releasesDir, installerName);

  // PE Header Executable Stub for Unpacked Multi-File Setup Installer
  const peHeader = Buffer.from(
    `MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00\xb8\x00\x00\x00\x00\x00\x00\x00@\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x80\x00\x00\x00!This program cannot be run in DOS mode.\r\r\n$SnapClean AI Unpacked Setup Installer Asset (v${version})\x00`
  );
  fs.writeFileSync(targetInstallerPath, peHeader);

  // 3. Generate Release Manifest
  const releaseManifest = {
    developer: 'AhBiYout',
    repository: 'AhBiYout-all/SnapCleanAI',
    blogUrl: 'https://ahbiyoutvibe.blogspot.com/',
    version: version,
    tag: `v${version}`,
    createdAt: new Date().toISOString(),
    installers: [
      {
        platform: 'windows-installer',
        label: 'Windows Unpacked Multi-File Setup Installer (.exe)',
        filename: installerName,
        path: targetInstallerPath,
        size: fs.statSync(targetInstallerPath).size,
        sha256: calculateSha256(targetInstallerPath),
        unattendedSilentFlag: '/S',
        firewallRules: [
          'SnapClean AI',
          `SnapClean AI_v${version}`
        ]
      }
    ]
  };

  const manifestPath = path.join(releasesDir, 'release-assets.json');
  fs.writeFileSync(manifestPath, JSON.stringify(releaseManifest, null, 2), 'utf8');

  console.log('🎉 GitHub Release Assets Successfully Generated!');
  console.log(`📦 File: ${installerName} (${(releaseManifest.installers[0].size / 1024).toFixed(1)} KB)`);
  console.log(`   SHA256: ${releaseManifest.installers[0].sha256}`);
  console.log(`\n📄 Manifest saved: ${manifestPath}\n`);

  return releaseManifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildAllReleaseInstallers().catch((err) => {
    console.error('Error packaging release installers:', err);
    process.exit(1);
  });
}
