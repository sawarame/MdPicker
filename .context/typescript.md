# TypeScript コーディングルール (TypeScript Rules)

## 1. コンパイラ設定 (`tsconfig.json`)

- `target`: `ES2022`、`module`: `ES2022` を使用し、モダンな JavaScript 構文を活用します。
- `strict`: `false`（DOM や Chrome API 型の柔軟性を確保するため部分緩和）ですが、可能な限り型定義を明示的に記述します。
- `outDir`: `./package/js`、`rootDir`: `./src` とし、`src/` 配下の全 `.ts` ファイルを対象とします。
- `types`: `["chrome"]`（`@types/chrome`）を利用します。

## 2. コーディングスタイル

- **コメントおよび JSDoc の日本語化**:
  - コード内に記述するすべてのコメント（インラインコメント、ブロックコメント）は日本語で記述してください。
  - すべてのクラス、関数、メソッドには JSDoc 形式（概要、`@param`、`@returns`）で日本語のドキュメントコメントを必ず記述してください。
- **型の明示**:
  - 変数、関数の引数、戻り値には可能な限り型を明示してください。
  - 共通のデータ構造や定数（例: `FormatTemplate`, `TemplateContext`, `ClipboardMimeType`, `DEFAULT_TEMPLATES`）は `src/template.ts` に定義し、`background.ts` および `options.ts` で共有してください。
- **非同期処理と Chrome API**:
  - Promise を扱う処理は可能な限り `async/await` 構文で記述してください（`chrome.storage.sync.get(...)` 等）。
- **エラーハンドリングとログ管理**:
  - Chrome API 呼び出しやメッセージパッシング、外部データ変換（Turndown 等）の失敗に備え、`try-catch` と適切なフォールバック処理を実装してください。
  - `console.warn` / `console.error` には調査に必要なコンテキストを含め、リリース用ビルドでの過度なデバッグ用 `console.log` の散発を避けてください。

## 3. モジュール分割と責務

- `src/template.ts`: テンプレート型定義・標準プリセット・プレースホルダー展開の純粋ロジック。
- `src/background.ts`: Service Worker としてのイベント駆動処理（コンテキストメニュー構築、ショートカット制御、メッセージ中継、Offscreen Document 起動）。DOM 操作は行わない。
- `src/content.ts`: Web ページ DOM からのリンクテキスト抽出および選択範囲 Markdown 変換（Turndown + 相対 URL 絶対化）。
- `src/offscreen.ts`: Offscreen Document 内でのマルチ MIME クリップボード書き込みおよびフォールバック処理。
- `src/options.ts`: 設定画面の DOM イベント制御、入力バリデーション、i18n 適用、`chrome.storage.sync` への保存・復元。
