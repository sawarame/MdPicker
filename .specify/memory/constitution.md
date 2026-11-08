<!--
Sync Impact Report:
- Version change: (initial) → 1.0.0
- List of modified principles:
  - [PRINCIPLE_1_NAME] → 第1原則: Manifest V3 準拠と疎結合コンポーネント設計 (Manifest V3 & Component Isolation)
  - [PRINCIPLE_2_NAME] → 第2原則: 開発ソースと配布パッケージの完全分離 (Separation of Source and Distribution Package)
  - [PRINCIPLE_3_NAME] → 第3原則: 堅牢なクリップボード書き込みとマルチMIMEフォールバック (Robust Clipboard Multi-MIME & Fallback)
  - [PRINCIPLE_4_NAME] → 第4原則: 構造を保全する高精度Markdown変換 (Faithful Markdown Conversion & Context Preservation)
  - [PRINCIPLE_5_NAME] → 第5原則: ドキュメント・コメントの完全日本語化とJSDoc必須 (Japanese Documentation & Comprehensive JSDoc)
- Added sections:
  - 技術制約および品質基準 (Technical Constraints & Quality Standards)
  - 開発ワークフローおよびリリース管理 (Development Workflow & Release Management)
- Removed sections: なし (初期テンプレートからの具体化)
- Follow-up TODOs: なし (すべてのプレースホルダーを具体値で解決)
-->

# MdPicker Constitution

## Core Principles

### 第1原則: Manifest V3 準拠と疎結合コンポーネント設計 (Manifest V3 & Component Isolation)
- Service Worker (`background.ts`) はステートレスかつイベント駆動型で動作し、DOM APIへの直接アクセスを絶対に行ってはならない (MUST NOT)。
- クリップボードへのアクセスおよびDOM操作が必要な処理は、必ずOffscreen Document API (`package/offscreen.html` + `src/offscreen.ts`) を経由して実行しなければならない (MUST)。
- WebページのDOM参照、アンカー要素の特定、選択範囲のMarkdown変換は必ずContent Script (`src/content.ts`) が行い、各コンポーネント間はChrome Message Passing (`chrome.runtime.sendMessage`, `chrome.tabs.sendMessage`) を介して疎結合に連携しなければならない (MUST)。
- 設定値の保存および同期は `chrome.storage.sync` を使用し、変更イベント (`chrome.storage.onChanged`) を購読して動的にUIやコンテキストメニューを更新しなければならない (MUST)。
- **理由**: Manifest V3の制約下で拡張機能の安定性、セキュリティ、高速な応答性を確保し、バックグラウンドのプロセス停止や権限違反による不具合を根絶するため。

### 第2原則: 開発ソースと配布パッケージの完全分離 (Separation of Source and Distribution Package)
- 開発対象のTypeScriptソースコードはすべて `src/` 配下にのみ配置しなければならない (MUST)。
- Chrome拡張機能として読み込まれる実体（配布パッケージ）は `package/` 配下に集約し、ソースコードと明確に分離しなければならない (MUST)。
- Webpackによるビルド出力先は `./package/js/` とし、ビルド開始時には出力先をクリーンアップしなければならない (MUST)。
- `package/manifest.json`、`package/offscreen.html`、`package/options.html`、多言語定義 (`package/_locales/`)、アプリアイコン等の静的アセットは `package/` 内で管理し、`src/` 内で直接管理してはならない (MUST NOT)。
- 配布用アーカイブ (`package.zip`) は `package/` ディレクトリの内容のみを直接パッケージングしなければならない (MUST)。
- **理由**: 開発環境の依存ファイルや未コンパイルのソースコードが配布パッケージに混入するのを防ぎ、拡張機能の容量削減と安全なデプロイを実現するため。

### 第3原則: 堅牢なクリップボード書き込みとマルチMIMEフォールバック (Robust Clipboard Multi-MIME & Fallback)
- クリップボードへのデータ書き込みは、可能な限りモダンな `ClipboardItem` API を用いて `text/html` とフォールバック用 `text/plain` のマルチMIME形式で同時に格納しなければならない (MUST)。
- リッチテキスト対応環境（Notion、Google ドキュメント等）でのクリック可能なハイパーリンク展開と、プレーンテキスト環境（エディタ、ターミナル等）でのテキスト展開の互換性を両立させなければならない (MUST)。
- オフスクリーンドキュメントにおけるフォーカス不在やAPI非対応環境に備え、`copy` イベントフック (`event.clipboardData.setData`)、`textarea` + `execCommand('copy')`、`navigator.clipboard.writeText` による多層的なフォールバック機構を維持しなければならない (MUST)。
- **理由**: ユーザーの貼り付け先環境やブラウザの権限状態に依存せず、常に期待通りにクリップボードへデータを格納できるようにするため。

### 第4原則: 構造を保全する高精度Markdown変換 (Faithful Markdown Conversion & Context Preservation)
- 選択範囲のMarkdown変換には `turndown` およびGFMプラグイン (`turndown-plugin-gfm`) を使用し、表（テーブル）やリスト、装飾構造を忠実に再現しなければならない (MUST)。
- 選択範囲内に含まれる画像 (`<img>`) やリンク (`<a>`) の相対URLは、外部エディタ貼り付け時のリンク切れを防ぐため、必ず `document.baseURI` を基準とした絶対URLに解決してから出力しなければならない (MUST)。
- リンク要素の抽出時は `composedPath()` を使用してShadow DOM境界を透過探索し、アンカーテキストが存在しない場合は `img[alt]`、`aria-label`、`title` の優先順位で代替テキストを取得しなければならない (MUST)。
- **理由**: 変換後のMarkdownがWebページ上の文脈やリンク構造を正確に維持し、外部ツールへ貼り付けた直後から破綻なく利用可能にするため。

### 第5原則: ドキュメント・コメントの完全日本語化とJSDoc必須 (Japanese Documentation & Comprehensive JSDoc)
- すべてのユーザー向けドキュメント、設計書、タスク管理ファイル、およびコード内コメント（インライン・ブロック）は例外なく日本語で記述しなければならない (MUST)。
- すべてのクラス（Class）、関数（Function）、メソッド（Method）には、該当言語の標準形式（JSDoc等）に従ったドキュメントコメントを必ず記述しなければならない (MUST)。
- ドキュメントコメント内には、概要説明、`@param`（引数の説明）、`@returns`（戻り値の説明）を漏れなく日本語で記載しなければならない (MUST)。
- **理由**: プロジェクトの保守性・可読性を向上させ、チーム内およびAIとの協調開発における認識齟齬を完全に排除するため。

## 技術制約および品質基準

### 採用技術スタック
- **プラットフォーム**: Google Chrome 拡張機能 (Manifest V3準拠)
- **開発言語**: TypeScript 5.4.5 (ターゲット: ES2022, モジュール: ES2022)
- **ビルドツール**: Webpack 5, ts-loader, rimraf
- **コアライブラリ**: `turndown` (v7), `turndown-plugin-gfm` (v1), `sharp` (アイコン生成スクリプト用)
- **ランタイム環境**: Node.js 24 (CI/CD実行環境), npm

### 権限管理 (Permissions Guard)
- `manifest.json` の `permissions` は最小特権の原則を遵守しなければならない (MUST)。
- 新たな拡張機能権限を追加する場合は、事前にその目的と影響範囲をユーザー（開発者）に明示し、承認を得なければならない (MUST)。

### ログとエラーハンドリング規約
- 予期せぬ例外や外部API呼び出しの失敗には `try-catch` を配置し、適切なフォールバック処理を提供しなければならない (MUST)。
- `console.warn` および `console.error` は問題調査に必要なコンテキストを含めて出力し、リリースビルドにおける過度なデバッグログ (`console.log`) は抑制しなければならない (MUST)。

## 開発ワークフローおよびリリース管理

### コミットメッセージ規約
- すべてのGitコミットはConventional Commits仕様に準拠しなければならない (MUST)。
- プレフィックス例: `feat:`, `fix:`, `chore:`, `chore(release):`, `docs:`, `refactor:`, `style:`, `test:`。

### ブランチ運用
- 新機能の開発には `feat/<機能名>`、不具合修正には `fix/<修正名>` ブランチを作成し、Pull Requestを通じて `main` ブランチへマージしなければならない (MUST)。

### バージョニングおよびリリース自動化
- バージョン番号はセマンティックバージョニング (MAJOR.MINOR.PATCH) に従い、`package.json` と `package/manifest.json` で完全に同期しなければならない (MUST)。
- `main` ブランチへのプッシュを契機として、GitHub Actions (`create-tag.yml`) によりバージョンに応じたGitタグ (`vX.Y.Z`) が自動生成される。
- GitHub Releaseの公開を契機として、GitHub Actions (`publish-chrome-web-store.yml`) が本番ビルドを実行し、`chrome-webstore-upload-cli` を通じてChrome Web Storeへのアップロードと審査提出を自動実行する。

## Governance

本憲章は、MdPickerプロジェクトにおける最高位の規範として機能し、他のいかなる非公式な合意や慣習にも優先する。

### 改定手続き (Amendment Procedure)
- 憲章の改定には、明確な課題提起、変更理由、および変更に伴う移行計画の提示が必要である。
- 憲章の変更は、コード変更と同様にPull Requestを通じて提案され、十分なレビューと合意形成を経てマージされなければならない。

### バージョニング規則 (Versioning Policy)
本憲章のバージョン管理はセマンティックバージョニングに従う:
- **MAJOR (主改定)**: 既存の原則の削除、根本的なガバナンス方針の転換、または非互換なアーキテクチャの変更を伴う場合。
- **MINOR (副改定)**: 新たな原則やセクションの追加、または既存ルールの実質的な拡張を行う場合。
- **PATCH (微改定)**: 文言の推敲、誤字脱字の修正、または意味内容を変更しない明確化を行う場合。

### コンプライアンス遵守の確認 (Compliance Review)
- すべてのPull Request、コードレビュー、およびAIエージェントによる設計・実装作業において、本憲章への準拠を検証しなければならない。
- 憲章に反する実装やプラクティスが確認された場合、憲章の改定が行われない限りマージおよび採用してはならない。

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08
