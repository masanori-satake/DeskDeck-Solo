# DeskDeck-Solo

[![Release](https://img.shields.io/github/v/release/masanori-satake/DeskDeck-Solo?color=blue)](https://github.com/masanori-satake/DeskDeck-Solo/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/masanori-satake/DeskDeck-Solo/code-quality.yml?branch=main&label=CI)](https://github.com/masanori-satake/DeskDeck-Solo/actions/workflows/code-quality.yml)
[![Security OSV-Scanner](https://img.shields.io/github/actions/workflow/status/masanori-satake/DeskDeck-Solo/security-scan.yml?branch=main&label=OSV-Scanner)](https://github.com/masanori-satake/DeskDeck-Solo/actions/workflows/security-scan.yml)
[![Local-Only](https://img.shields.io/badge/Policy-Local--Only-success)](PRIVACY.md)
[![Vanilla JS](https://img.shields.io/badge/Code-Vanilla%20JS-blue)](AGENTS.md)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Chromebookのタブレットモード向けChrome拡張機能「**DeskDeck-Solo**」 — Chromeサイドパネル上に再現する、大型タッチ操作対応の仮想外付けハードウェアデッキ。

---

## 💡 プロジェクト概要

Chromebookをキーボードから切り離してタブレットモードで利用する際、Webアプリ特有の小さな操作UIや誤タップ問題を解消します。Chromeサイドパネル内に常駐し、物理コントローラーのような大型ノブ、トグルスイッチ、マルチパッドによる直感的な操作を提供します。

---

## 🔒 Soloシリーズ 4大コアポリシー

1. **Local Only（完全ローカル動作）**:
   すべての処理・データ記憶は端末内で完結。外部サーバーへのネットワーク通信は一切行いません。
2. **Zero Tracking（トラッキングゼロ）**:
   アクセス解析、ユーザー行動追跡、広告トラッカーを一切排除し、プライバシーを厳格に保護します。
3. **Pure JavaScript（ビルド依存なし）**:
   Webpack/Vite/Babelなどのビルドツールや外部ライブラリ（React/Vue/jQuery等）を排除したPure Vanilla Web Stack。
4. **Local Backup（ローカルバックアップ）**:
   デッキ設定や割り当てはブラウザ内 `chrome.storage.local` に保持され、ローカルJSONファイルで出力・復元可能です。

---

## 🎛️ 5種類のプリセットデッキ

1. **Media Deck**: 動画・音楽再生の音量ダイヤル調整、再生/一時停止、トラック移動、消音
2. **Meeting Deck**: Google Meet / Microsoft Teams のマイク・カメラ切り替え、二段階保護カバー付き離脱スイッチ
3. **Reader Deck**: ズーム調整、フォントサイズ切替、ダークモードトグル、スクロール制御
4. **Audio Deck**: チャンネル別ボリュームフェーダー、マスターイコライザ、音声フィードバック
5. **Standard Deck**: マルチタブ切り替え、新規タブ作成、タブ閉じ、クイックアクション

---

## 📁 ディレクトリ構成

```text
DeskDeck-Solo/
├── package.json
├── eslint.config.js
├── .prettierrc
├── .pre-commit-config.yaml
├── AGENTS.md
├── LICENSE
├── PRIVACY.md
├── SECURITY.md
├── README.md
├── docs/
│   ├── specifications/
│   │   ├── requirements.md
│   │   └── design.md
│   ├── legal/
│   │   └── privacy.md
│   └── user-guide/
│       └── quickstart.md
├── projects/
│   ├── app/                # Chrome拡張機能本体
│   │   ├── manifest.json
│   │   ├── _locales/
│   │   ├── icons/
│   │   └── src/
│   └── web/                # ランディングページ (LP)
│       ├── index.html
│       └── locales/
└── tests/
    ├── meeting.test.js
    └── version.test.js
```

---

## 🚀 インストール・使用手順

1. Chromeブラウザで `chrome://extensions/` を開きます。
2. 画面右上の「デベロッパーモード」を有効にします。
3. 「パッケージ化されていない拡張機能を読み込む」をクリックし、`projects/app` ディレクトリを選択します。
4. サイドパネルを開いて `DeskDeck-Solo` を選択すると仮想デッキが表示されます。

---

## 🛠️ 開発・テスト手順

### 必要条件

- Node.js v20 以上

### テスト実行

```bash
npm test
```

### コード品質・フォーマットチェック

```bash
npm run lint
npm run format
```

---

## 📜 ライセンス・著作権

Released under the [MIT License](LICENSE).
Copyright (c) 2026 Masanori SATAKE
