# E2E チェック（tests/e2e）

実 Chromium に拡張機能をそのまま読み込み、サイドパネルと同じメッセージ経路で操作して、DOM 上の効果を検証するチェックです。単体テスト（`node --test`）がモックで担保する範囲の外側――実コード同士のメッセージの流れと、実 DOM 構造への依存――を担当します。

0.3.12 の実機確認で見つかった3件（YouTube で Scroll Wheel がシークに化ける、Shorts で Play/Pause が別のリールを操作する、設定がパネル外のタブで開く）は、いずれも単体テストを通過していました。この層はその再発防止です。

## 実行方法

```sh
npm run test:e2e
```

ディスプレイの無い環境では仮想ディスプレイ経由で実行します（CI もこの形です）。

```sh
xvfb-run -a npm run test:e2e
```

初回は Playwright の Chromium 取得が必要です（`npx playwright install chromium`）。Playwright は devDependency で、拡張機能の配布物には含まれません。

## 仕組み

- `run.mjs` が永続コンテキストで Chromium を起動し、`projects/app` を拡張として読み込む。
- youtube.com へのリクエストを傍受し、`fixtures/` の HTML を実 URL で返す。コンテンツスクリプトの URL マッチと hostname 判定が実機どおりに働く。フィクスチャは、コードが実際に参照する DOM 構造だけを再現する。
- 動画要素には canvas の captureStream を流し、play()/pause() と paused が本物として振る舞うようにしている。
- 操作はサービスワーカーから `chrome.tabs.sendMessage` で、パネルが送るのと同じ `{action, payload}` を送る。

## 新しいチェックを足すとき

実機でしか分からなかった不具合を直したら、まずその壊れ方を再現するチェックをここに足し、修正前ツリーで FAIL になることを `EXT_PATH` で確認してから修正側で PASS にするのが手順です。

```sh
EXT_PATH=/path/to/old-tree/projects/app xvfb-run -a npm run test:e2e
```
