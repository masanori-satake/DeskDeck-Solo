import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function runGit(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function parseSemver(v) {
  if (!v) return null;
  const match = v.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    raw: v.trim(),
  };
}

function isVersionBumped(oldVer, newVer) {
  if (!oldVer || !newVer) return false;
  if (newVer.major > oldVer.major) return true;
  if (newVer.major < oldVer.major) return false;
  if (newVer.minor > oldVer.minor) return true;
  if (newVer.minor < oldVer.minor) return false;
  return newVer.patch > oldVer.patch;
}

function resolveBaseRef() {
  const candidates = [];
  if (process.env.BASE_REF) candidates.push(process.env.BASE_REF);
  if (process.env.GITHUB_BASE_REF) {
    candidates.push(`origin/${process.env.GITHUB_BASE_REF}`);
    candidates.push(process.env.GITHUB_BASE_REF);
  }
  candidates.push('origin/main');
  candidates.push('HEAD~1');

  for (const ref of candidates) {
    const res = runGit(`git rev-parse --verify ${ref}`);
    if (res) return ref;
  }
  return null;
}

function main() {
  const baseRef = resolveBaseRef();
  if (!baseRef) {
    console.log('No valid base git ref found for comparison. Skipping version bump check.');
    process.exit(0);
  }

  const diffOutput = runGit(`git diff --name-only ${baseRef}`) || '';
  const changedFiles = diffOutput
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);

  const packageFilesChanged = changedFiles.filter((f) => f.startsWith('projects/app/'));

  if (packageFilesChanged.length === 0) {
    console.log('No files in projects/app/ were modified. Version bump check passed.');
    process.exit(0);
  }

  const basePackageJsonRaw = runGit(`git show ${baseRef}:package.json`);
  if (!basePackageJsonRaw) {
    console.log(`Could not retrieve package.json from ${baseRef}. Skipping check.`);
    process.exit(0);
  }

  let oldVersionStr;
  try {
    oldVersionStr = JSON.parse(basePackageJsonRaw).version;
  } catch {
    console.error(`Failed to parse package.json from ${baseRef}.`);
    process.exit(1);
  }

  const currentPkgPath = path.join(process.cwd(), 'package.json');
  const currentPkg = JSON.parse(fs.readFileSync(currentPkgPath, 'utf8'));
  const newVersionStr = currentPkg.version;

  const oldVer = parseSemver(oldVersionStr);
  const newVer = parseSemver(newVersionStr);

  console.log(`Base ref (${baseRef}) version: ${oldVersionStr}`);
  console.log(`Current branch version: ${newVersionStr}`);
  console.log(`Modified package files count: ${packageFilesChanged.length}`);

  if (!isVersionBumped(oldVer, newVer)) {
    console.error(
      `\n[ERROR] Files in 'projects/app/' were modified, but the version in package.json was not bumped!\n` +
        `Base version: ${oldVersionStr}\n` +
        `Current version: ${newVersionStr}\n` +
        `Please bump the version (minor or patch) in package.json and projects/app/manifest.json.`
    );
    process.exit(1);
  }

  console.log('Version bump check passed successfully.');
}

main();
