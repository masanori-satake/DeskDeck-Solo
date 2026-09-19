# DeskDeck-Solo 機能・非機能要件仕様書

## 1. 概要

DeskDeck-Solo は、Chromebook をタブレットモードで使用する際に、画面サイドパネル上に大型タッチ操作対応の仮想外付けハードウェアデッキを提供する Chrome 拡張機能です。

## 2. 機能要件 (Functional Requirements)

### FR-01: 5種類のプリセットハードウェアデッキ

1. **Media Deck (動画・音楽)**:
   - 大型音量回転ノブ (Pointer Events Polar Angle 制御)
   - 再生 / 一時停止、トラック送り / 戻し、ワンタップ消音
2. **Meeting Deck (Web会議)**:
   - Google Meet / Microsoft Teams 対応
   - マイクミュートトグル、カメラスイッチ、挙手・リアクション
   - 誤操作防止機能付き保護カバー式離脱（flip_switch）
3. **Reader Deck (ドキュメント・電子書籍)**:
   - ズーム調整ノブ、フォントサイズ切替、ダークモードトグル、スクロール制御
4. **Audio Deck (ミキサー・EQ)**:
   - チャンネル別ボリュームフェーダー、マスターイコライザー、オーディオフィードバック制御
5. **Standard Deck (ブラウザ操作・ランチャー)**:
   - タブ切り替え、新規タブ作成、タブ閉じ、クイックショートカット

### FR-02: タッチ・ポインターUI操作

- 最小 64px 以上の大型タッチターゲット設計
- 3D質感アニメーションおよび Pointer Events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) による高精度追従
- タッチ操作保護（二段階誤操作防止カバー）

### FR-03: 国際化 (i18n)

- `chrome.i18n` API による日本語 (`ja`) および英語 (`en`) の自動切り替え

### FR-04: 設定およびカスタム割り当て

- オプション画面からのスロット機能再割り当て (`getSlotMappings` / `saveSlotMappings`)
- 設定・構成のローカル JSON ファイル出力および復元機能

## 3. 非機能要件 (Non-Functional Requirements)

### NFR-01: Local-Only & Zero-Tracking (ローカルファースト・無追跡)

- 外部サーバーやサードパーティサービスへのネットワーク通信を一切行わない (Zero External API calls)
- ユーザーログ、アナリティクス、広告追跡スクリプトの完全排除

### NFR-02: Zero External Dependencies & Pure Vanilla Stack

- Webpack, Vite, React, Vue, jQuery などのビルドツール・フレームワークを一切使用しない
- Pure Vanilla JavaScript (ES Modules), HTML5, CSS3 のみで構築

### NFR-03: セキュリティ & Manifest V3

- Chrome Manifest V3 規格に完全準拠
- 最小限の権限付与 (`sidePanel`, `storage`, `tabs`, `audio`, `power`)

### NFR-04: 応答性 & パフォーマンス

- サイドパネル描画時間 100ms 以内
- 操作に対する視覚・聴覚フィードバック遅延 16ms (60fps) 以内

---

Copyright (c) 2026 Masanori SATAKE
