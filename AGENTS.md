# Project Instructions (MdPicker)

このファイルは MdPicker プロジェクトの基本的なガイドラインと開発規約を定めたものです。
開発にあたっては、以下のアーキテクチャ原則および `.context/` フォルダ内にある基礎ドキュメントを必ず参照し、その指示に従ってください。

## 基礎ドキュメント

- **[仕様書](.context/spec.md)**
  - プロジェクトの基本コンセプト、機能仕様、データ構造、拡張機能権限について記述されています。
- **[技術スタック](.context/tech_stack.md)**
  - 使用されている技術・ライブラリ、ディレクトリ構成、npm スクリプト、CI/CD パイプラインについて記述されています。
- **[開発ワークフロー](.context/development.md)**
  - 環境構築、ビルド、ブラウザ検証、デバッグ、バージョニングとリリースの手順について記述されています。

## コーディング・多言語規約

- **[TypeScript コーディングルール](.context/typescript.md)**
  - コンパイラ設定、型定義、日本語コメント・JSDoc 必須規約、エラーハンドリング、モジュール分割が記述されています。
- **使用言語の統一**: ユーザーとのやり取り、ドキュメント、設計メモ、コード内のコメント・JSDoc はすべて日本語で記述してください。
- **多言語対応リソース (`package/_locales/en/messages.json`, `package/_locales/ja/messages.json`)**:
  - UI ラベルやコンテキストメニューの文言を追加・変更する際は、ハードコードせず必ず英語・日本語双方の `messages.json` を更新してください。

## アーキテクチャと設計原則

- **Manifest V3 準拠と疎結合コンポーネント設計**:
  - Service Worker (`src/background.ts`) はステートレスかつイベント駆動で動作し、DOM API に直接アクセスしないでください。
  - クリップボード書き込み等の DOM 操作は必ず Offscreen Document API（`package/offscreen.html` + `src/offscreen.ts`）経由で実行してください。
  - Web ページの DOM 参照、アンカー要素の特定、選択範囲の Markdown 変換は必ず Content Script（`src/content.ts`）が担当し、各コンポーネント間は Chrome Message Passing（`chrome.runtime.sendMessage`, `chrome.tabs.sendMessage`）で疎結合に連携してください。
  - 設定の保存・同期には `chrome.storage.sync` を使用し、`chrome.storage.onChanged` を購読してコンテキストメニューを動的に即時更新してください。
- **開発ソースと配布パッケージの分離**:
  - TypeScript ソースコードおよび元 SVG（`src/icon.svg`）は `src/` 配下にのみ配置し、Chrome に読み込ませる実体（`manifest.json`, HTML, `_locales`, `images`, ビルド済み `js/`）は `package/` 配下で管理してください。
- **堅牢なクリップボード書き込みとマルチ MIME フォールバック**:
  - `text/html` 出力時は `ClipboardItem` API により `text/html` とフォールバック用 `text/plain` を同時に書き込み、フォーカス不在や API 非対応環境に備えて `copy` イベントフック（`event.clipboardData.setData`）、`<textarea>` + `document.execCommand('copy')`、`navigator.clipboard.writeText` の多層フォールバックを維持してください。
- **構造を保全する高精度 Markdown 変換**:
  - 選択範囲の変換には `turndown` と `turndown-plugin-gfm`（`tables`）を用い、相対 URL（`<img src>` / `<a href>`）はブラウザ解決済み URL で絶対化してください。
  - リンク要素の抽出では `composedPath()` により Shadow DOM を透過探索し、テキストが空の場合は `img[alt]` → `aria-label` → `title` の順で代替テキストを取得してください。

## 実装時の重要ガードレール

- **ソースコードの編集場所とビルド**: ロジック変更は常に `src/` 配下に対して行い、`package/js/` 配下のビルド成果物は直接編集しないでください。`src/` を変更した後は必ず `npm run build` を実行して成果物と `package.zip` を更新してください。
- **権限追加の事前合意**: `package/manifest.json` の `permissions` や `host_permissions` を追加する場合は、最小特権の原則に基づき、必ず事前にユーザー（開発者）へ意図と影響範囲を説明し合意を得てください。
- **コミットおよびブランチ規約**:
  - コミットメッセージは **Conventional Commits**（`feat:`, `fix:`, `chore:`, `docs:`, `refactor:` 等）に準拠してください。
  - ブランチは `feat/<機能名>` または `fix/<修正名>` を使用してください。
  - バージョン番号は `package.json`・`package-lock.json`・`package/manifest.json` で完全に同期させてください。
- **ドキュメントの同期**: 機能や仕様、ディレクトリ構成、権限を変更した場合は、コードと合わせて `.context/spec.md` や `.context/tech_stack.md` などの関連ドキュメントも最新状態に更新してください。
