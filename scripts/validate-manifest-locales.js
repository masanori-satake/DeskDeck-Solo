import fs from 'node:fs';
import path from 'node:path';

function writeSummary(markdownText) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    fs.appendFileSync(summaryFile, markdownText + '\n', 'utf8');
  }
}

function main() {
  const errors = [];
  const checkedFiles = [];

  try {
    const pkgPath = path.resolve('package.json');
    const manifestPath = path.resolve('projects/app/manifest.json');

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    checkedFiles.push({ file: 'package.json', status: '✅ Parsed' });
    checkedFiles.push({ file: 'projects/app/manifest.json', status: '✅ Parsed' });

    if (pkg.version !== manifest.version) {
      errors.push(
        `Version mismatch! package.json: \`${pkg.version}\`, manifest.json: \`${manifest.version}\``
      );
    }

    if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) {
      errors.push(
        `Invalid version format in package.json: \`${pkg.version}\` (Expected SemVer x.y.z)`
      );
    }

    const localeFiles = [
      'projects/app/_locales/ja/messages.json',
      'projects/app/_locales/en/messages.json',
      'projects/web/locales/ja.json',
      'projects/web/locales/en.json',
    ];

    for (const localeFile of localeFiles) {
      const fullPath = path.resolve(localeFile);
      if (!fs.existsSync(fullPath)) {
        errors.push(`Locale file missing: \`${localeFile}\``);
        checkedFiles.push({ file: localeFile, status: '❌ Missing' });
        continue;
      }
      try {
        JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        checkedFiles.push({ file: localeFile, status: '✅ Valid JSON' });
      } catch (err) {
        errors.push(`Invalid JSON syntax in \`${localeFile}\`: ${err.message}`);
        checkedFiles.push({ file: localeFile, status: '❌ Invalid JSON' });
      }
    }

    const summaryRows = checkedFiles
      .map((item) => `| \`${item.file}\` | ${item.status} |`)
      .join('\n');

    let summaryMarkdown = `### 📋 マニフェスト・ロケール検証結果 (Manifest & Locales Validation)\n\n`;
    summaryMarkdown += `| ファイル (File) | 状態 (Status) |\n| --- | --- |\n${summaryRows}\n\n`;
    summaryMarkdown += `**統一バージョン (Unified Version):** \`${pkg.version}\`\n\n`;

    if (errors.length > 0) {
      summaryMarkdown += `#### ❌ 検出されたエラー (Errors Detected)\n`;
      errors.forEach((err) => {
        summaryMarkdown += `- ${err}\n`;
      });
      writeSummary(summaryMarkdown);
      console.error('Validation failed with the following errors:');
      errors.forEach((err) => console.error(` - ${err}`));
      process.exit(1);
    } else {
      summaryMarkdown += `✅ すべての検証項目が正常にクリアされました。(All validation checks passed successfully.)\n`;
      writeSummary(summaryMarkdown);
      console.log(`All JSON files are valid and version is unified at ${pkg.version}!`);
    }
  } catch (err) {
    console.error('Unexpected error during validation:', err);
    process.exit(1);
  }
}

main();
