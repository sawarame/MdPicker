---
trigger: always_on
---

# カスタム AI 指示書 (GEMINI.md)

このドキュメントは、このプロジェクトにおいて AI とコミュニケーションを取る際の基本的なルール・前提条件を定めたものです。

## 1. 基本設定
* **使用言語**: すべてのコミュニケーション、コメント、ドキュメント作成は**日本語（Japanese）**でおこなってください。
* **主要技術スタック**:
  * Chrome 拡張機能 (Manifest V3)
  * TypeScript (トランスパイル対象)
  * Webpack (モジュールハンドラ・ビルダー)
  * Node.js / npm (パッケージ・スクリプト管理)

## 2. プロジェクトのディレクトリ構成ルール
このプロジェクトは、ソースコードと拡張機能のパッケージ本体（Chrome に読み込ませるディレクトリ）を明確に分離しています。

* `src/` : TypeScript のソースコードを格納するディレクトリ（`background.ts`, `content.ts`, `offscreen.ts` など）
* `MdPicker/` : **拡張機能本体のルートディレクトリ**。Chrome 拡張機能として読み込まれる実体です。
  * `MdPicker/manifest.json` : 拡張機能の設定ファイル。
  * `MdPicker/offscreen.html` : クリップボードなどの DOM 操作を行うバックグラウンド用 HTML。
  * `MdPicker/js/` : Webpack によってコンパイル・出力された JavaScript ファイルが格納されるディレクトリ。
* `webpack.config.js` : ビルド設定。出力を `./MdPicker/js/` フォルダへ行うよう構成されています。
* `tsconfig.json` : TypeScript 設定（ビルドパスが `MdPicker/js` を向くように設定されています）。

## 3. 実装の取り決めと制約案 (Manifest V3)
* Service Worker (`background.ts`) は DOM へのアクセス権を持たないため、クリップボードへの書き込みなどは必ず **Offscreen Document API** などを用いて行ってください。
* ユーザーがフォーカスした HTML 要素のテキストなどを取得する場合は必ず **Content Script** を経由し、Message Passing（`chrome.runtime.sendMessage` や `chrome.tabs.sendMessage`）等で連携してください。
* `console.log` やエラー出力は適切に残しつつも、リリース用ビルドでの過度なログ散発にならないよう注意してください。
* 追加で拡張機能の権限を追加する場合は、必ず User (開発者) へ事前に意図を説明した上で `manifest.json` を更新してください。

