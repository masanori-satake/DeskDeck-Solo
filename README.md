# DeskDeck-Solo

Chromebookのタブレットモード向けChrome拡張機能「DeskDeck-Solo」 - Chromeサイドパネル上に再現する、大型タッチ操作対応の仮想外付けハードウェアデッキ。

## 特徴
- **完全ローカル動作・依存なし**: ビルドツール（Webpack/Vite等）や外部ライブラリは一切使用せず、Pure Vanilla JavaScript (ES Modules), HTML5, CSS3 のみで構築。
- **タブレット操作最適化**: Chromebookのタッチパネルで快適に操作できる超大型タッチターゲット、大型回転ノブ、トグルスイッチ、大判ボタン。
- **5種類のプリセットデッキ**:
  1. **Media Deck**: 動画・音楽再生の音量調整、再生/一時停止、トラック送り/戻し
  2. **Meeting Deck**: マイクミュート、カメラトグル、挙手、退室/参加
  3. **Reader Deck**: ズーム調整、フォントサイズ、ダークモード切り替え、スクロール制御
  4. **Audio Deck**: チャンネル別ボリューム調整、マスターイコライザ・消音トグル
  5. **Standard Deck**: タブ切り替え、新規タブ作成、タブ閉じ、お気に入りアクション
- **Material Design 3 (M3) トーン**: ダーク/ライトテーマ対応、触覚的なフィードバックを考慮した見た目。

## ディレクトリ構成
```text
DeskDeck-Solo/
├── README.md
├── LICENSE
├── PRIVACY.md
├── SECURITY.md
├── AGENTS.md
└── projects/
    ├── app/
    │   ├── manifest.json
    │   ├── _locales/
    │   │   ├── ja/messages.json
    │   │   └── en/messages.json
    │   ├── icons/
    │   │   └── icon128.png
    │   └── src/
    │       ├── background/
    │       │   └── background.js
    │       ├── sidepanel/
    │       │   ├── sidepanel.html
    │       │   ├── sidepanel.css
    │       │   └── sidepanel.js
    │       ├── content/
    │       │   └── content.js
    │       ├── options/
    │       │   ├── options.html
    │       │   ├── options.css
    │       │   └── options.js
    │       └── lib/
    │           ├── storage.js
    │           ├── audio.js
    │           └── deck-manager.js
    └── web/
        └── index.html
```

## インストール・使用方法
1. Chromeブラウザで `chrome://extensions/` を開きます。
2. 右上の「デベロッパーモード」を有効にします。
3. 「パッケージ化されていない拡張機能を読み込む」をクリックし、`projects/app` ディレクトリを選択します。
4. サイドパネルを開いて `DeskDeck-Solo` を選択すると仮想デッキが表示されます。

## ライセンス
MIT License
