# 技術スタック (Tech Stack)

MdPicker プロジェクトで使用されている主要な技術、ツール、ディレクトリ構成の概要です。

## 1. コア技術

- **Chrome Extension Manifest V3**: 拡張機能のプラットフォーム基盤。
- **TypeScript (`^5.4.5`)**: 静的型付け言語（ターゲット・モジュール: `ES2022`、`@types/chrome` による Chrome API 型定義）。
- **Turndown (`^7.2.4`) / `turndown-plugin-gfm` (`^1.0.2`)**: Content Script 内で選択範囲の HTML を GFM（テーブル等を含む）対応の Markdown に変換するために使用。

## 2. ビルド・アセット生成・CI/CD ツール

- **Webpack (`^5.91.0`)**: TypeScript モジュールをブラウザ実行可能なバンドル JavaScript へコンパイル・出力（`./package/js/`）。
- **ts-loader (`^9.5.1`)**: Webpack による TypeScript トランスパイル。
- **rimraf (`^6.1.3`)**: ビルド前の `package/js` および `package.zip` クリーンアップ。
- **Sharp (`^0.35.5`)**: `src/icon.svg` から各サイズ（16px, 32px, 48px, 128px）の PNG アイコンを生成するスクリプト（`scripts/generate-icons.js`）で使用。
- **GitHub Actions**:
  - `.github/workflows/create-tag.yml`: `main` ブランチへのプッシュ時に `package/manifest.json` の `version` を読み取り、タグ `vX.Y.Z` を自動作成・プッシュ。
  - `.github/workflows/publish-chrome-web-store.yml`: GitHub Release 公開時に Node.js 24 環境で `npm run build` を実行し、`chrome-webstore-upload-cli` を用いて `package.zip` を Chrome Web Store へ自動アップロード・審査提出。

## 3. ディレクトリ構成

- `src/`: 開発用の TypeScript ソースコードおよび元アセットディレクトリ。
  - `background.ts`: Service Worker として動作するバックグラウンドスクリプト（コンテキストメニュー管理、`smart-copy` ショートカット処理、Offscreen Document 起動）。
  - `content.ts`: 全ページに注入される Content Script（Shadow DOM 対応リンクテキスト抽出、選択範囲の相対 URL 絶対化および Turndown 変換）。
  - `offscreen.ts`: Offscreen Document 用スクリプト（`ClipboardItem` マルチ MIME 書き込みおよび `copy` イベント / `execCommand` フォールバック）。
  - `options.ts`: オプション画面（ツールバーポップアップ表示）の UI 制御、バリデーション、ストレージ保存、多言語適用。
  - `template.ts`: `FormatTemplate` / `TemplateContext` 型定義、標準プリセット（`DEFAULT_TEMPLATES`）、ピン留め判定（`isTemplatePinned`）、プレースホルダー置換（`renderTemplate`）。
  - `icon.svg`: アプリアイコンの元 SVG ファイル。
- `package/`: 拡張機能として Chrome に読み込ませる（配布する）ルートディレクトリ。
  - `manifest.json`: 拡張機能のマニフェスト定義（権限、コマンド、`action.default_popup`、アイコン等）。
  - `options.html`: オプション画面およびツールバーポップアップ画面用の HTML / CSS。
  - `offscreen.html`: クリップボード操作用の不可視 Offscreen Document HTML。
  - `js/`: Webpack によってビルドされた JavaScript ファイル群（`background.js`, `content.js`, `offscreen.js`, `options.js`）が出力される（`.gitignore` 対象）。
  - `images/`: `scripts/generate-icons.js` によって生成されたアイコン画像（`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`）。
  - `_locales/`: `en` と `ja` の国際化（i18n）用メッセージファイル（`messages.json`）。
- `scripts/`: ビルド補助スクリプトディレクトリ。
  - `generate-icons.js`: `src/icon.svg` から `package/images/` 配下に PNG アイコンを生成するスクリプト。
- `store_description.md`: Chrome ウェブストア掲載用の日英説明文。

## 4. npm スクリプト・コマンド

- `npm install`: 依存パッケージのインストール。
- `npm run build`: `package/js/` と `package.zip` を削除し、Webpack の本番ビルドを実行後、`package/` 配下を `package.zip` にパッケージング。
- `npm run dev`: Webpack を開発モード・ウォッチモード（`--watch`）で起動。
- `npm run generate-icons`: `scripts/generate-icons.js` を実行して `package/images/` の PNG アイコンを再生成。
