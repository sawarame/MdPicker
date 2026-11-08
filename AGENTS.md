# Project Rules (MdPicker)

このドキュメントは、このプロジェクトにおいて AI とコミュニケーションを取る際の基本的なルール・前提条件を定めたものです。

## 1. 最上位規範: プロジェクト憲章 (Constitution)
本プロジェクトは **Spec Kit** による仕様駆動開発を採用しています。プロジェクトの設計原則、アーキテクチャ制約、コーディング規約、ガバナンス方針はすべて [プロジェクト憲章 (.specify/memory/constitution.md)](.specify/memory/constitution.md) に定義されており、他のいかなる取り決めにも優先します。

* **使用言語**: すべてのコミュニケーション、コメント、ドキュメント作成は**日本語（Japanese）**で行ってください。
* **主要技術スタック**:
  * Chrome 拡張機能 (Manifest V3)
  * TypeScript 5.4+ (ターゲット/モジュール: ES2022)
  * Webpack 5 (モジュールバンドラー)
  * Node.js / npm (パッケージ・スクリプト管理)

## 2. プロジェクトのディレクトリ構成ルール
このプロジェクトは、ソースコードと拡張機能のパッケージ本体（Chrome に読み込ませるディレクトリ）を明確に分離しています。

* `src/` : TypeScript のソースコードを格納するディレクトリ（`background.ts`, `content.ts`, `offscreen.ts`, `options.ts`, `template.ts` など）
* `package/` : **拡張機能本体のルートディレクトリ**。Chrome 拡張機能として読み込まれる実体です。
  * `package/manifest.json` : 拡張機能の設定ファイル。
  * `package/offscreen.html` : クリップボードなどの DOM 操作を行うバックグラウンド用 HTML。
  * `package/options.html` : オプション（設定）画面用 HTML。
  * `package/js/` : Webpack によってコンパイル・出力された JavaScript ファイルが格納されるディレクトリ（出力時に自動クリーン）。
  * `package/_locales/` : 多言語リソースファイル。
  * `package/images/` : 拡張機能のアイコン画像。
* `docs/` : 機能仕様書などのドキュメントを格納するディレクトリ。
* `.specify/` : Spec Kit 関連のテンプレート、スクリプト、憲章 (`.specify/memory/constitution.md`) を格納するディレクトリ。
* `webpack.config.js` : ビルド設定。出力を `./package/js/` フォルダへ行うよう構成されています。
* `tsconfig.json` : TypeScript 設定（ビルドパスが `package/js` を向くように設定されています）。

## 3. 実装の取り決めと制約案 (Manifest V3)
* **DOMアクセスの分離**: Service Worker (`background.ts`) は DOM へのアクセス権を持たないため、クリップボードへの書き込みなどは必ず **Offscreen Document API** (`offscreen.html` + `offscreen.ts`) を用いて行ってください。
* **Content Script との連携**: ユーザーがフォーカスした HTML 要素のテキストや選択範囲のMarkdown変換結果を取得する場合は必ず **Content Script** (`content.ts`) を経由し、Message Passing（`chrome.runtime.sendMessage` や `chrome.tabs.sendMessage`）等で連携してください。
* **クリップボードマルチMIME対応**: クリップボード書き込み時は `ClipboardItem` による `text/html` と `text/plain` のマルチMIME同時格納を行い、API非対応環境やフォーカス喪失時のフォールバックを維持してください。
* **ドキュメントコメント (JSDoc)**: すべてのクラス、関数、メソッドには、概要、`@param`、`@returns` を漏れなく**日本語**で記述した JSDoc を付与してください。
* **ログ管理**: `console.log` やエラー出力は適切に残しつつも、リリース用ビルドでの過度なログ散発にならないよう注意してください。
* **権限追加の事前合意**: 拡張機能の権限 (`permissions`, `host_permissions`) を追加する場合は、必ず事前にユーザー (開発者) へ意図と理由を説明し合意を得てください。

## 4. コミットおよびブランチ規約
* コミットメッセージは **Conventional Commits**（`feat:`, `fix:`, `chore:`, `docs:` 等）に準拠してください。
* ブランチは `feat/<機能名>` または `fix/<修正名>` を使用してください。

## 5. 仕様書および仕様駆動開発 (Spec Kit)
* プロジェクトの機能仕様については [docs/spec.md](docs/spec.md) を参照してください。
* 新機能の設計や機能改修を行う際は、Spec Kit のワークフロー（`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement` 等）を活用し、憲章および仕様との整合性を保って進めてください。
