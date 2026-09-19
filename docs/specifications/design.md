# DeskDeck-Solo アーキテクチャ設計・データ構造仕様書

## 1. システムアーキテクチャ概要

DeskDeck-Solo は Chrome Extension Manifest V3 規格に準拠し、非同期 ES Modules により疎結合に設計されています。

```text
[Chrome Side Panel UI]  <--->  [Background Service Worker]  <--->  [Content Scripts]
  (sidepanel.js)                 (background.js)                 (meet.js, teams.js, youtube.js)
        |                              |
        v                              v
 [Storage Module]               [Chrome Storage API]
  (storage.js)               (chrome.storage.local)
```

## 2. ディレクトリ構造

```text
projects/app/
├── manifest.json
├── _locales/
│   ├── ja/messages.json
│   └── en/messages.json
├── icons/
│   └── icon128.png
└── src/
    ├── background/
    │   └── background.js
    ├── sidepanel/
    │   ├── sidepanel.html
    │   ├── sidepanel.css
    │   └── sidepanel.js
    ├── content/
    │   ├── content.js
    │   ├── meet.js
    │   ├── teams.js
    │   └── youtube.js
    ├── options/
    │   ├── options.html
    │   ├── options.css
    │   └── options.js
    └── lib/
        ├── storage.js
        ├── audio.js
        ├── deck-manager.js
        └── system.js
```

## 3. データ構造 (Data Structure Specifications)

### 3.1 アクティブデッキ ID (`activeDeckId`)

- Key: `"activeDeckId"`
- Type: `string`
- Values: `'media' | 'meeting' | 'reader' | 'audio' | 'standard'`

### 3.2 スロット状態オブジェクト (`deckSlotStates`)

- Key: `"deckSlotStates_${deckId}"`
- Type: `Object<string, number | boolean | Object>`
- Example:

```json
{
  "media_volume": 75,
  "media_play_pause": true,
  "meeting_mic_switch": false,
  "meeting_leave_cover": false
}
```

### 3.3 アプリケーション設定 (`appSettings`)

- Key: `"appSettings"`
- Type: `Object`
- Schema:

```json
{
  "soundEffects": true,
  "hapticFeedback": true,
  "theme": "dark",
  "touchSensitivity": 1.0
}
```

## 4. UIコンポーネント設計

### 4.1 回転ノブ (Rotary Knob Widget)

- 角度範囲: -135度 〜 +135度（計270度）
- 座標計算: `Math.atan2(e.clientY - centerY, e.clientX - centerX)`
- ラップアラウンド（180度境界）正規化処理実装

### 4.2 二段階安全保護フリップスイッチ (Flip Switch Widget)

- 構造: 保護カバー（hinged cover）+ 内部切替スイッチ
- 操作仕様: スワイプアップまたはタップでカバー開放後、内部スイッチ有効化

---

Copyright (c) 2026 Masanori SATAKE
