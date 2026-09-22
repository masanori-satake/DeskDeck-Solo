"""共通CIポリシーチェックの単一エントリ (Single entry point for CI policy checks).

common-workflows の base-ci.yml は、このファイルが存在すれば自動的に実行する。
プロジェクト固有のチェックをここに集約し、呼び出し側ワークフローの `with:` を空に保つ。

DeskDeck-Solo のチェックは Node スクリプトで実装されているため、Python から
subprocess で呼び出す。

現在のチェック項目:
  - マニフェスト・多言語構成検証 (validate-manifest-locales.js)

注: バージョン更新確認 (旧 check-version-bump.js 相当) は base-version-bump.yml に
委譲したため、ここには含めない。
"""

import subprocess
import sys

# 実行するチェックの一覧（順に実行する）
CHECKS = [
    (
        "マニフェスト・多言語構成検証 (Manifest & Locales)",
        ["node", "scripts/validate-manifest-locales.js"],
    ),
]


def main() -> int:
    failed = []
    for label, command in CHECKS:
        print(f"::group::{label}")
        result = subprocess.run(command, check=False)
        print("::endgroup::")
        if result.returncode != 0:
            failed.append(label)

    if failed:
        print("::error::以下のチェックに失敗しました: " + ", ".join(failed))
        return 1

    print("すべてのCIポリシーチェックに合格しました。 (All CI policy checks passed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
