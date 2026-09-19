# Privacy Policy / プライバシーポリシー

**Last updated / 最終更新日:** 2026年5月

DeskDeck-Solo is designed with privacy and local security as top priorities.
DeskDeck-Solo は、プライバシーとローカルセキュリティを最優先して設計されています。

---

## 1. Local-First & Zero Data Collection / 完全ローカル動作・データ収集なし

- **DeskDeck-Solo operates entirely locally on your device.**
  DeskDeck-Solo は、お使いのデバイス上で完全にローカル動作します。
- No user data, usage analytics, personal identifiers, browsing history, or deck configurations are ever collected, transmitted, or stored on external servers or third-party services.
  ユーザーデータ、利用統計、個人識別情報、閲覧履歴、デッキ設定などが外部サーバーや第三者サービスに送信・収集・保存されることは一切ありません。

## 2. Chrome Storage API Usage / Chrome Storage API の使用

- Settings and preset deck configurations are saved locally in your browser using Chrome's `chrome.storage.local` API.
  設定およびプリセットデッキの構成は、Chrome の `chrome.storage.local` API を使用してお使いのブラウザ内にローカル保存されます。
- These data remain strictly within your local Chrome profile and are never synced externally.
  これらのデータはローカルの Chrome プロファイル内に留まり、外部へ同期されることはありません。

## 3. Permissions Explanation / 権限（パーミッション）の説明

- **`sidePanel`**: Used to render the virtual hardware deck controller within Chrome's Side Panel UI.
  Chrome のサイドパネル UI 内に仮想ハードウェアデッキコントローラーを表示するために使用します。
- **`storage`**: Used to store user deck preferences, knob levels, toggle states, and custom shortcuts locally.
  デッキ設定、ノブの数値、トグル状態などをローカルに保存するために使用します。
- **`tabs`**: Used to interact with active tabs for media playback control, tab switching, and reading mode adjustments.
  アクティブなタブでのメディア再生操作、タブ切り替え、閲覧モード調整などのために使用します。
- **`audio`**: Used for local audio feedback or sound level controls.
  ローカルでの効果音フィードバックや音量制御のために使用します。
- **`power`**: Used optionally to prevent screen sleep/dimming during active tablet deck usage.
  タブレットデッキ操作中の画面スリープ防止のために使用します。

## 4. Third-Party Services / 第三者サービスについて

- DeskDeck-Solo uses zero third-party analytics, tracking scripts, or external API endpoints.
  DeskDeck-Solo は、第三者の解析ツール、トラッキングスクリプト、外部 API エンドポイントを一切使用していません。

## 5. Contact & Support / お問い合わせ・サポート

If you have any questions or concerns regarding privacy, please open an issue in the official project repository.
プライバシーに関するご質問やご懸念がある場合は、本プロジェクトの公式リポジトリにて Issue を作成してください。

---

Copyright (c) 2026 Masanori SATAKE
