#!/usr/bin/env python3
"""バージョン整合性チェックのテンプレート (Version Consistency Check Template).

プロジェクト内の複数ファイルに散らばるバージョン表記が一致しているかを検証する。
common-workflows の Chrome 拡張機能テンプレートの `scripts/check_version.py` を、本リポジトリの
ファイル構成（package.json / package-lock.json / projects/app/manifest.json）に合わせて
`VERSION_SOURCES` を編集したもの。

呼び出し元:
  - `scripts/update_version.py`（`npm run update-version -- <X.Y.Z>`）の最後
  - PR の `/ai-bump`（共通ワークフローの bump_version.sh）による更新後の検証
  - 手動: `python3 scripts/check_version.py`
  `scripts/ci_checks.py` の `CHECKS` には含めていない（CI では実行しない）。

拡張方法:
  1. `VERSION_SOURCES` に (ラベル, パス, 抽出関数) を追加/削除する。
  2. JSON の "version" フィールドは `json_version` を使う。
  3. README バッジや任意テキストからの抽出は `regex_version` を使う。
  4. ファイルが存在しない場合はスキップ（任意ファイル扱い）。必須にしたい場合は
     `required=True` を指定する。

いずれのソースも「基準バージョン（最初に見つかった必須ソース）」と一致しなければ
終了コード 1 で失敗する。
"""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass
from typing import Callable, Optional


def json_version(field: str = "version") -> Callable[[str], Optional[str]]:
    """JSON ファイルの指定フィールドからバージョンを取り出す抽出関数を返す。"""

    def extract(path: str) -> Optional[str]:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f).get(field)

    return extract


def regex_version(pattern: str) -> Callable[[str], Optional[str]]:
    """テキストファイルから正規表現の第1グループでバージョンを取り出す抽出関数を返す。"""

    def extract(path: str) -> Optional[str]:
        with open(path, "r", encoding="utf-8") as f:
            match = re.search(pattern, f.read())
            return match.group(1) if match else None

    return extract


def lockfile_root_package_version() -> Callable[[str], Optional[str]]:
    """package-lock.json の packages[""].version を取り出す抽出関数を返す。"""

    def extract(path: str) -> Optional[str]:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f).get("packages", {}).get("", {}).get("version")

    return extract


@dataclass
class VersionSource:
    label: str
    path: str
    extract: Callable[[str], Optional[str]]
    required: bool = False


# ---------------------------------------------------------------------------
# ★ プロジェクトごとに編集する箇所 ★
# 実際のファイル構成に合わせて追加・削除する。
# ---------------------------------------------------------------------------
VERSION_SOURCES: list[VersionSource] = [
    VersionSource("package.json", "package.json", json_version(), required=True),
    VersionSource("package-lock.json", "package-lock.json", json_version(), required=True),
    VersionSource(
        "package-lock.json (packages[''])",
        "package-lock.json",
        lockfile_root_package_version(),
        required=True,
    ),
    VersionSource(
        "manifest.json", "projects/app/manifest.json", json_version(), required=True
    ),
]


def main() -> int:
    found: dict[str, str] = {}
    baseline: Optional[str] = None

    for src in VERSION_SOURCES:
        if not os.path.exists(src.path):
            if src.required:
                print(
                    f"Error: 必須ファイルが見つかりません: {src.path}", file=sys.stderr
                )
                return 1
            continue
        try:
            version = src.extract(src.path)
        except Exception as e:  # noqa: BLE001 - CI ログに原因を残す
            print(f"Error: {src.path} の解析に失敗しました: {e}", file=sys.stderr)
            return 1
        if version is None:
            if src.required:
                print(
                    f"Error: {src.path} からバージョンを抽出できませんでした。",
                    file=sys.stderr,
                )
                return 1
            continue
        found[src.label] = version
        if baseline is None:
            baseline = version

    if baseline is None:
        print(
            "Error: バージョンを持つソースが1つも見つかりませんでした。",
            file=sys.stderr,
        )
        return 1

    # Chrome の manifest の制約: X.Y.Z（ASCII 数字）、各数値 0〜65535、すべて 0 は不可
    numbers = re.fullmatch(
        r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)", baseline
    )
    if (
        not numbers
        or any(int(n) > 65535 for n in numbers.groups())
        or all(int(n) == 0 for n in numbers.groups())
    ):
        print(
            f"Error: Chrome 拡張機能で使えないバージョンです: {baseline}",
            file=sys.stderr,
        )
        return 1

    print("バージョン整合性チェック (Version Consistency):")
    for label, version in found.items():
        marker = "OK" if version == baseline else "NG"
        print(f"  [{marker}] {label}: {version}")

    mismatches = {k: v for k, v in found.items() if v != baseline}
    if mismatches:
        print(
            f"\nError: バージョン不一致を検出しました（基準: {baseline}）: {mismatches}",
            file=sys.stderr,
        )
        return 1

    print(f"\nすべてのバージョンが一致しています: {baseline}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
