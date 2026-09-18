# Security Policy / セキュリティポリシー

## Reporting a Vulnerability / 脆弱性の報告について

We take the security of **DeskDeck-Solo** seriously. If you discover a security vulnerability or potential security issue, please follow these steps:
**DeskDeck-Solo** ではセキュリティを重視しています。セキュリティ上の脆弱性や潜在的なリスクを発見された場合は、以下の手順に従ってご連絡ください。

1. **Do not disclose publicly**: Avoid opening public issues for sensitive security vulnerabilities.
   **公開不可**: 敏感な脆弱性情報について、公開 Issue を作成しないようお願いいたします。
2. **Contact**: Open a draft security advisory or contact the maintainers directly via repository security contacts.
   **連絡方法**: 下書きセキュリティアドバイザリ（Draft Security Advisory）を作成するか、リポジトリのセキュリティ連絡先に直接ご連絡ください。
3. **Response Time**: We aim to acknowledge reports within 48 hours and provide a timeline for resolution.
   **対応時間**: 48時間以内に報告を確認し、対応スケジュールをご案内できるよう努めます。

## Security Practices / セキュリティに関する取り組み

- **No external dependencies**: DeskDeck-Solo relies purely on Vanilla JavaScript (ES Modules), HTML5, and CSS3 without external npm build pipelines or third-party web libraries.
  **外部依存関係ゼロ**: ビルドパイプラインや第三者Webライブラリを使用せず、Pure Vanilla JavaScript (ES Modules)、HTML5、CSS3 のみで構築されています。
- **Strict Content Security Policy (CSP)**: Built in full compliance with Chrome Manifest V3 standards.
  **厳格な CSP 準拠**: Chrome Manifest V3 規格に完全に準拠して構築されています。
- **Local Isolation**: All actions operate within the Chrome Extension sandbox and local browser environment.
  **ローカル環境分離**: すべての操作は Chrome 拡張機能のサンドボックスおよびローカルブラウザ環境内で完結します。
