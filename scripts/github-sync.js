import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncVersion } from './version-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const GITHUB_ACCOUNT = process.env.GITHUB_ACCOUNT || 'AhBiYout-all';
const GITHUB_USERNAME = process.env.GITHUB_USER_NAME || 'AhBiYout-all';
const GITHUB_REPO = process.env.GITHUB_REPO || 'SnapCleanAI';
const REMOTE_URL = `https://github.com/${GITHUB_ACCOUNT}/${GITHUB_REPO}.git`;

function runCmd(cmd, allowFail = false) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (err) {
    if (!allowFail) {
      console.error(`❌ Command failed: ${cmd}\n${err.stderr || err.message}`);
      throw err;
    }
    return '';
  }
}

// 1. Hygiene Audit: Remove temporary or binary files before push
function auditRepositoryHygiene() {
  console.log('\n🔍 [Hygiene Audit] Inspecting workspace for forbidden files...');

  const forbiddenExtensions = [
    '.dll', '.so', '.dylib', '.pdb', '.tmp', '.apk', '.ipa', '.mobileconfig',
    '.aab', '.log', '.bak', '.swp'
  ];
  const forbiddenNames = [
    'replace_keys.js', 'bun.lock', 'bun.lockb', 'yarn.lock', 'pnpm-lock.yaml',
    'Thumbs.db', 'desktop.ini', '.DS_Store'
  ];

  const violations = [];
  const rootFiles = fs.readdirSync(rootDir);

  for (const file of rootFiles) {
    const ext = path.extname(file).toLowerCase();
    if (forbiddenExtensions.includes(ext) || forbiddenNames.includes(file)) {
      violations.push(file);
    }
  }

  if (violations.length > 0) {
    console.warn(`⚠️ Cleaning up temporary or unneeded files before git push:`);
    for (const v of violations) {
      const fullPath = path.join(rootDir, v);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`   ✓ Removed: ${v}`);
      }
    }
  } else {
    console.log('✓ Clean workspace: Only essential source code and configurations present.');
  }
}

// 2. Ensure Git repository and Remote Origin
function ensureGitRepo() {
  console.log(`\n📦 [Git Config] Developer: AhBiYout | Target Repo: ${GITHUB_ACCOUNT}/${GITHUB_REPO}`);

  const isGit = fs.existsSync(path.join(rootDir, '.git'));
  if (!isGit) {
    console.log('Initializing git repository...');
    runCmd('git init');
  }

  // Ensure clean developer identity
  const currentUserName = runCmd('git config user.name', true);
  if (!currentUserName || currentUserName !== GITHUB_USERNAME) {
    runCmd(`git config user.name "${GITHUB_USERNAME}"`);
    console.log(`✓ Set git user.name: ${GITHUB_USERNAME}`);
  }

  const currentUserEmail = runCmd('git config user.email', true);
  if (!currentUserEmail || currentUserEmail.includes('hanil.org')) {
    runCmd('git config user.email "AhBiYout-all@users.noreply.github.com"');
    console.log('✓ Set git user.email: AhBiYout-all@users.noreply.github.com (No personal email)');
  }

  // Ensure default branch is main
  const currentBranch = runCmd('git branch --show-current', true) || 'main';
  if (currentBranch !== 'main') {
    runCmd('git branch -m main', true);
  }

  // Set remote origin
  const existingRemote = runCmd('git remote get-url origin', true);
  if (!existingRemote) {
    runCmd(`git remote add origin ${REMOTE_URL}`);
    console.log(`✓ Added remote origin: ${REMOTE_URL}`);
  } else if (existingRemote !== REMOTE_URL) {
    runCmd(`git remote set-url origin ${REMOTE_URL}`);
    console.log(`✓ Updated remote origin: ${REMOTE_URL}`);
  }
}

// 3. Stage and Commit Core Code
export async function syncAndCommitCore() {
  auditRepositoryHygiene();
  ensureGitRepo();

  const buildInfo = await syncVersion();
  const version = buildInfo.version;

  console.log(`\n📌 Staging essential source files for version: v${version}...`);
  runCmd('git add .');

  const status = runCmd('git status --porcelain', true);
  if (!status) {
    console.log('✓ Repository working tree is clean. No uncommitted changes.');
    return { version, committed: false };
  }

  const commitMsg = `feat(release): update SnapClean AI source code [v${version}]`;
  console.log(`Committing: "${commitMsg}"...`);
  runCmd(`git commit -m "${commitMsg}"`);

  return { version, committed: true };
}

// 4. Push to GitHub
export async function pushToGitHub() {
  const { version } = await syncAndCommitCore();
  console.log(`\n🚀 Pushing code to ${REMOTE_URL} (main)...`);

  try {
    runCmd('git push -u origin main');
    console.log(`\n✨ Successfully pushed SnapClean AI v${version} to GitHub!`);
    console.log(`   Repository URL: ${REMOTE_URL}`);
    console.log(`   Developer: AhBiYout (AhBiYout-all)`);
    console.log(`   Official Blog: https://ahbiyoutvibe.blogspot.com/\n`);
  } catch (e) {
    console.warn('\n⚠️ Push notice: Check remote credentials or network connection.');
  }
}

const action = process.argv[2] || 'sync';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (action === 'push') {
    pushToGitHub().catch(console.error);
  } else {
    syncAndCommitCore().catch(console.error);
  }
}
