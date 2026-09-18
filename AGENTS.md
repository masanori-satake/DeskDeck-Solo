# AGENTS.md

## 概要
**DeskDeck-Solo** は、Chromebookのタブレットモード向けに設計されたChrome拡張機能です。ChromeのサイドパネルUI上に、大型タッチ操作対応の仮想外付けハードウェアデッキを再現します。

## "Solo" シリーズ開発ガイドライン
1. **完全ローカル動作・依存なし（Zero Dependencies & Pure Vanilla Web Stack）**:
   - ビルドツール（Webpack, Vite, Rollup, Babel, Parcel等）は一切使用しないでください。
   - 外部ライブラリやUIフレームワーク（React, Vue, Tailwind, Bootstrap, jQuery等）は一切導入しないでください。
   - Pure Vanilla JavaScript (ES Modules), HTML5, CSS3 のみで構築してください。
2. **ディレクトリ構成**:
   - 拡張機能本体は `projects/app/` 配下に配置します。
   - 紹介用Webサイトは `projects/web/` 配下に配置します。
3. **Manifest V3 準拠**:
   - `projects/app/manifest.json` をエントリーポイントとします。
   - 権限（permissions）: `sidePanel`, `storage`, `tabs`, `audio`, `power`
4. **i18n 国際化対応**:
   - `chrome.i18n.getMessage` API を使用して多言語表示に対応します。
   - 言語定義は `projects/app/_locales/ja/messages.json` および `en/messages.json` に配置します。
5. **タッチ・タブレットUX最適化**:
   - タッチターゲット（最小 48px/64px 以上）の大型コンポーネント設計。
   - 回転ノブやスライダー操作には `touch-action: none` および Pointer Events（`pointerdown`, `pointermove`, `pointerup`, `pointercancel`）を使用します。
