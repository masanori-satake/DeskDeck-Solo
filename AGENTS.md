# AGENTS.md - AIエージェント開発・保守規約

## 概要

**DeskDeck-Solo** は、Chromebookのタブレットモード向けに設計されたChrome拡張機能です。ChromeのサイドパネルUI上に、大型タッチ操作対応の仮想外付けハードウェアデッキを再現します。

## 開発思想・"Solo" シリーズ共通ガイドライン

1. **完全ローカル動作・依存なし（Zero Dependencies & Pure Vanilla Web Stack）**:
   - Webpack, Vite, Rollup, Babel などのビルドツールは一切使用しないでください。
   - React, Vue, Tailwind, Bootstrap, jQuery などの外部ライブラリやUIフレームワークは一切導入しないでください。
   - Pure Vanilla JavaScript (ES Modules), HTML5, CSS3 のみで構築してください。
2. **ディレクトリ構造規約**:
   - 拡張機能本体のコードは `projects/app/` 配下に配置します。
   - ランディングページ (LP) および紹介サイトは `projects/web/` 配下に配置します。
   - 技術ドキュメント仕様は `docs/` 配下に整理します。
3. **バージョン管理の一元化**:
   - `package.json` および `projects/app/manifest.json` の `"version"` （現在: `0.1.0`）を唯一の真実のソースとします。
   - バージョン不整合を検出するため `tests/version.test.js` を維持・実行してください。
4. **テスト・品質検証要件**:
   - テストの実行は Node.js 組み込みテストランナーを使用します: `node --test tests/*.test.js`
   - スタイルチェック・コード品質検証には ESLint および Prettier を使用します: `npm run lint`, `npm run format`
5. **著作権表記・言語要件**:
   - プロジェクト全体の著作権表示は `Copyright (c) 2026 Masanori SATAKE` を使用してください。
   - `AGENTS.md` は日本語で記述します。
   - `PRIVACY.md` および `SECURITY.md` は日本語・英語のバイリンガルで記述してください。
   - `LICENSE` ファイル（MIT License）は一切変更・編集しないでください。
