import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Version Consistency Check', () => {
  const rootDir = process.cwd();
  const pkgPath = path.join(rootDir, 'package.json');
  const manifestPath = path.join(rootDir, 'projects', 'app', 'manifest.json');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.equal(pkg.version, '0.1.0', 'package.json version should be 0.1.0');
  assert.equal(manifest.version, '0.1.0', 'projects/app/manifest.json version should be 0.1.0');
  assert.equal(pkg.version, manifest.version, 'package.json and manifest.json versions must match');
});
