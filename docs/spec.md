# MdPicker - プロジェクト仕様書

## 概要
「MdPicker」は、Webページ上のリンクや選択した範囲を右クリックし、コンテキストメニュー（右クリックメニュー）から簡単にMarkdown形式や任意のテンプレート形式（Slack、Scrapbox、HTMLなど）へと変換・取得してクリップボードへコピーできる Chrome 拡張機能です。Manifest V3 の仕様に完全に準拠して設計されており、オプション画面から動作のカスタマイズが可能です。

## コア機能仕様

1. **コンテキストメニュー登録**
   * 対象: リンク要素 (`contexts: ["link"]`)。ラベル: `Copy Link as Markdown`。
   * 対象: 選択範囲 (`contexts: ["selection"]`)。ラベル: `Copy selection as Markdown`。
   * 対象: ページ全体・拡張機能アイコン (`contexts: ["page", "action"]`)。ラベル: `Copy Page as Markdown Link` (日本語環境: `このページをリンクとしてコピー`)。
   * **サブメニュー（リンクを別形式でコピー）**: `Copy Link as...`（日本語環境: `リンクを別形式でコピー`、`contexts: ["link"]`）。ユーザーが設定したテンプレート（Markdown, Slack, Scrapbox, HTML等）が動的にサブ階層へ展開されます。
   * **サブメニュー（このページを別形式でコピー）**: `Copy Page as...`（日本語環境: `このページを別形式でコピー`、`contexts: ["page"]`）。ユーザーが設定したテンプレートが動的にサブ階層へ展開され、現在のページのリンクを任意の形式でコピーできます。

2. **テンプレート・フォーマットカスタマイズ機能**
   * **概要**: リンクやページ情報を、Markdownだけでなく各種ツールの記法に合わせて変換してコピーできます。
   * **標準プリセット**:
     * `Markdown`: `[${title}](${url})`
     * `Slack`: `<${url}|${title}>`
     * `Scrapbox`: `[${url} ${title}]`
     * `HTML`: `<a href="${url}">${title}</a>`
     * `Markdown (日付付き)`: `[${title}](${url}) (${date})`
   * **利用可能なプレースホルダー変数**:
     * `${title}`: リンクテキストまたはタブのタイトル
     * `${url}`: リンク先URLまたはタブのURL
     * `${date}`: コピー時の日付（`YYYY-MM-DD`）
     * `${time}`: コピー時の時刻（`HH:mm`）
     * `${favicon}`: ページのファビコン画像URL
   * **テンプレート管理**: オプション画面で新しいテンプレートの追加、削除、初期プリセットへの復元が可能です。設定は `chrome.storage.sync` を通じて即座に反映・同期されます。
   * **デフォルト形式（ショートカット等）の選択**: キーボードショートカット (`Cmd+Shift+M` / `Ctrl+Shift+M`) 実行時などに適用するデフォルト形式を、登録されているテンプレートの中から自由に選択できます。

3. **リンクテキストの取得仕様**
   * **課題**: Chrome の `contextMenu` API では、リンクの URL は取得できるものの、表示テキストは直接取得できません。
   * **解決策**: `content.ts` を全ページへ注入し、`contextmenu` イベントをフックします。`composedPath()` と `nodeName` を用いて確実に対象の `<a>` 要素を特定し、テキスト情報を一時保存します。
   * **データ取得フロー**: メニュークリック時にバックグラウンドから Content Script へ問い合わせを行い、リンクテキストを取得します。

4. **現在のページをリンクとしてコピーする仕様**
   * ページ上の空白部分等を右クリックした際、現在のタブのタイトルとURLを組み合わせて `[タイトル](URL)` のMarkdownリンクを生成します。

5. **favicon付与機能（オプション設定）**
   * オプション画面で設定を有効にすると、ページ全体のコピー時にfavicon画像を先頭に付与します（形式: `![favicon](url) [タイトル](URL)`）。
   * **favicon取得**: Google Favicon Service (`https://www.google.com/s2/favicons?domain={domain}&sz={size}`) を利用し、ドメインに基づいた安定したURLを取得します。
   * **サイズ設定**: 12px / 16px / 24px / 32px から選択可能です（デフォルトは 16px）。

6. **選択範囲のMarkdown変換仕様**
   * **課題**: 標準の `selectionText` ではリッチテキストの情報が欠落します。
   * **解決策**: Content Script 内で `turndown` を使用。選択範囲のHTMLを抽出し、構造を維持したまま精度の高いMarkdownへと変換します。さらに GFM (GitHub Flavored Markdown) プラグインの導入により、HTMLのテーブル（表）要素などもマークダウンの表形式として変換可能です。
   * **相対URLの解決仕様**: 選択範囲内の画像（`<img>`）の `src` 属性やリンク（`<a>`）の `href` 属性が相対パスで記述されている場合、他エディタへ貼り付けた際の表示崩れやリンク切れを防ぐため、コピー時に `document.baseURI` を基準とした絶対パス（ホスト名を含む完全なURL）に自動的に変換してコピーします。

7. **クリップボードへの書き込み仕様**
   * **課題**: Manifest V3 の Service Worker は DOM を持たないため、直接のコピー操作が制限されます。
   * **解決策**: 「Offscreen Document API」を利用。不可視の `offscreen.html` を介して、確実なクリップボードアクセスを実現しています。

8. **ビルド・デプロイ仕様 (CI/CD)**
   * **ビルド出力先**: ソースコード (`src/`) を Webpack と TypeScript でコンパイルし、拡張機能の本体は `package/` ディレクトリに出力される構成となっています。
   * **自動公開 (GitHub Actions)**: リリース作成時に、`chrome-webstore-upload-cli` を利用して Chrome Web Store への自動アップロードおよび審査提出を行う CI/CD パイプラインが構築されています。

## 技術コンポーネント詳細

* **`manifest.json`**:
  * 権限 (`permissions`): `contextMenus`, `clipboardWrite`, `offscreen`, `tabs`, `storage`
  * 設定画面: `options_ui` を定義。

* **`src/template.ts`**:
  * テンプレートインターフェースの定義、標準プリセット（Markdown, Slack, Scrapbox, HTML等）の定義、およびプレースホルダー置換ロジックを担当。

* **`src/background.ts`**:
  * 各種コピー操作のハンドリングを担当。
  * `chrome.storage.sync` からユーザー設定（favicon設定やテンプレート一覧）を読み取り、動的にコンテキストメニューを登録・更新。

* **`src/content.ts`**:
  * リンク要素の特定とテキスト抽出、および `turndown` による選択範囲のMarkdown変換を担当。

* **`src/options.ts` / `options.html`**:
  * ユーザー設定（faviconの利用有無・サイズ、テンプレートの追加/削除/リセット、ショートカット用テンプレートの選択）の保存・管理を担当。設定は `chrome.storage.sync` で同期されます。

* **`offscreen.html` / `src/offscreen.ts`**:
  * Service Worker からのメッセージを受け取り、クリップボードへの書き込みを実行。

## 今後の拡張性への考慮点
* テンプレート機構が汎用的な変数置換ベースで設計されているため、新しいメタデータ変数（ドメイン名、著者情報など）の追加が容易です。
* デバッグやテストを行いやすいよう、機能ごとに明確に責務を分離したアーキテクチャを採用しています。
