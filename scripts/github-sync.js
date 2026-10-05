import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncVersion, getAppVersion } from './version-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const GITHUB_ACCOUNT = process.env.GITHUB_ACCOUNT || 'AhBiYout';
const GITHUB_USERNAME = process.env.GITHUB_USER_NAME || 'AhBiYout-all';

function getDefaultRepoName() {
  try {
    const metaPath = path.join(rootDir, 'metadata.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (meta.name) {
        return meta.name.trim().replace(/\s+/g, '-');
      }
    }
  } catch {}
  return 'SnapClean-AI';
}

const GITHUB_REPO = process.env.GITHUB_REPO || getDefaultRepoName();
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

// 1. Audit files: check for unwanted binaries or temp files
function auditRepositoryHygiene() {
  console.log('\n🔍 [Hygiene Audit] Inspecting workspace for forbidden files...');

  const forbiddenExtensions = [
    '.exe', '.dll', '.so', '.dylib', '.pdb', '.tmp', '.apk', '.ipa', '.mobileconfig',
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
    console.warn(`⚠️ Warning: Found forbidden or temporary files in project root:`);
    violations.forEach((v) => console.warn(`   - ${v}`));
    console.warn(`Removing or verifying .gitignore rules...`);

    for (const v of violations) {
      const fullPath = path.join(rootDir, v);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`   ✓ Cleaned up: ${v}`);
      }
    }
  } else {
    console.log('✓ Clean workspace: No unwanted binary or temporary files found in root.');
  }
}

// 2. Ensure Git repository and Remote Origin
function ensureGitRepo() {
  console.log(`\n📦 [Git Configuration] Target Repo: ${GITHUB_ACCOUNT}/${GITHUB_REPO}`);

  const isGit = fs.existsSync(path.join(rootDir, '.git'));
  if (!isGit) {
    console.log('Initializing git repository...');
    runCmd('git init');
  }

  // Ensure user identity is configured
  const currentUserName = runCmd('git config user.name', true);
  if (!currentUserName || currentUserName !== GITHUB_USERNAME) {
    runCmd(`git config user.name "${GITHUB_USERNAME}"`);
    console.log(`✓ Configured git user.name: ${GITHUB_USERNAME}`);
  }

  const currentUserEmail = runCmd('git config user.email', true);
  if (!currentUserEmail) {
    runCmd('git config user.email "redmoon@hanil.org"');
    console.log('✓ Configured git user.email: redmoon@hanil.org');
  }

  // Ensure default branch is main
  const currentBranch = runCmd('git branch --show-current', true) || 'main';
  if (currentBranch !== 'main') {
    runCmd('git branch -m main', true);
  }

  // Check remote origin
  const remotes = runCmd('git remote', true);
  if (!remotes.includes('origin')) {
    console.log(`Adding remote origin: ${REMOTE_URL}`);
    runCmd(`git remote add origin ${REMOTE_URL}`);
  } else {
    const currentOrigin = runCmd('git remote get-url origin', true);
    if (!currentOrigin.includes(GITHUB_REPO)) {
      console.log(`Updating remote origin to: ${REMOTE_URL}`);
      runCmd(`git remote set-url origin ${REMOTE_URL}`);
    }
  }
  console.log(`✓ Git remote verified: ${REMOTE_URL} (Branch: main)`);
}

// 3. Automated Version Sync & Git Commit / Tagging
export async function syncAndCommit(options = {}) {
  // Step A: Audit workspace
  auditRepositoryHygiene();

  // Step B: Ensure git setup
  ensureGitRepo();

  // Step C: Run Version Sync
  console.log('\n🔄 [Version Sync] Synchronizing version across all configurations...');
  const buildInfo = await syncVersion();
  const version = buildInfo.version;
  const tag = `v${version}`;

  // Step D: Stage legitimate files
  console.log('\n📥 [Git Staging] Staging tracked source files...');
  runCmd('git add .');

  // Step E: Check if git status has changes
  const status = runCmd('git status --porcelain', true);
  const commitMsg = options.message || `release: ${tag} - ${buildInfo.latestPatchSummary || 'update codebase and version synchronization'}`;

  if (status) {
    console.log(`💾 [Git Commit] Committing changes with message:\n   "${commitMsg}"`);
    runCmd(`git commit -m "${commitMsg}"`);
  } else {
    console.log('ℹ️ Working tree clean. No new code changes to commit.');
  }

  // Step F: Check Tag
  const existingTags = runCmd('git tag', true).split('\n');
  if (!existingTags.includes(tag)) {
    console.log(`🏷️ [Git Tag] Creating tag: ${tag}`);
    runCmd(`git tag -a ${tag} -m "Release ${tag}"`);
    console.log(`✓ Tag ${tag} created successfully.`);
  } else {
    console.log(`✓ Tag ${tag} already exists.`);
  }

  return { version, tag, buildInfo };
}

// 4. Push to GitHub
export async function pushToGitHub(options = {}) {
  const { version, tag } = await syncAndCommit(options);

  console.log(`\n🚀 [GitHub Push] Pushing branch 'main' and tags to ${REMOTE_URL}...`);
  try {
    runCmd('git push -u origin main', true);
    runCmd(`git push origin ${tag}`, true);
    console.log(`\n🎉 Successfully pushed code and tag ${tag} to GitHub!`);
    console.log(`👉 Repository URL: https://github.com/${GITHUB_ACCOUNT}/${GITHUB_REPO}`);
    console.log(`👉 Releases URL:   https://github.com/${GITHUB_ACCOUNT}/${GITHUB_REPO}/releases`);
  } catch (err) {
    console.warn(`\n⚠️ Note: Git push requires GitHub authentication credentials on your local machine.`);
    console.warn(`If pushing failed due to credentials, run:`);
    console.warn(`   git push -u origin main`);
    console.warn(`   git push origin ${tag}`);
  }
}

// CLI
async function main() {
  const action = process.argv[2] || 'sync';
  const customMessage = process.argv.slice(3).join(' ');

  if (action === 'push') {
    await pushToGitHub({ message: customMessage });
  } else if (action === 'release' || action === 'sync') {
    await syncAndCommit({ message: customMessage });
  } else {
    console.log('Usage:');
    console.log('  node scripts/github-sync.js sync');
    console.log('  node scripts/github-sync.js push [commit-message]');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Error in github-sync:', err);
    process.exit(1);
  });
}
