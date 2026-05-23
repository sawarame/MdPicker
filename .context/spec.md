# MdPicker - プロジェクト仕様書

## 概要
「MdPicker」は、Webページ上のリンクや選択した範囲を右クリックし、コンテキストメニュー（右クリックメニュー）から簡単にMarkdown形式へと変換・取得してクリップボードへコピーできる Chrome 拡張機能です。Manifest V3 の仕様に完全に準拠して設計されており、オプション画面から動作のカスタマイズが可能です。

## コア機能仕様

1. **コンテキストメニュー登録**
   * 対象: リンク要素 (`contexts: ["link"]`)。ラベル: `Copy Link as Markdown`。
   * 対象: 選択範囲 (`contexts: ["selection"]`)。ラベル: `Copy selection as Markdown`。
   * 対象: ページ全体・拡張機能アイコン (`contexts: ["page", "action"]`)。ラベル: `Copy Page as Markdown Link` (日本語環境: `このページをリンクとしてコピー`)。

2. **リンクテキストの取得仕様**
   * **課題**: Chrome の `contextMenu` API では、リンクの URL は取得できるものの、表示テキストは直接取得できません。
   * **解決策**: `content.ts` を全ページへ注入し、`contextmenu` イベントをフックします。`composedPath()` と `nodeName` を用いて確実に対象の `<a>` 要素を特定し、テキスト情報を一時保存します。
   * **データ取得フロー**: メニュークリック時にバックグラウンドから Content Script へ問い合わせを行い、リンクテキストを取得します。

3. **現在のページをリンクとしてコピーする仕様**
   * ページ上の空白部分等を右クリックした際、現在のタブのタイトルとURLを組み合わせて `[タイトル](URL)` のMarkdownリンクを生成します。

4. **favicon付与機能（オプション設定）**
   * オプション画面で設定を有効にすると、ページ全体のコピー時にfavicon画像を先頭に付与します（形式: `![favicon](url) [タイトル](URL)`）。
   * **favicon取得**: Google Favicon Service (`https://www.google.com/s2/favicons?domain={domain}&sz={size}`) を利用し、ドメインに基づいた安定したURLを取得します。
   * **サイズ設定**: 12px / 16px / 24px / 32px から選択可能です（デフォルトは 16px）。

5. **選択範囲のMarkdown変換仕様**
   * **課題**: 標準の `selectionText` ではリッチテキストの情報が欠落します。
   * **解決策**: Content Script 内で `turndown` を使用。選択範囲のHTMLを抽出し、構造を維持したまま精度の高いMarkdownへと変換します。

6. **クリップボードへの書き込み仕様**
   * **課題**: Manifest V3 の Service Worker は DOM を持たないため、直接のコピー操作が制限されます。
   * **解決策**: 「Offscreen Document API」を利用。不可視の `offscreen.html` を介して、確実なクリップボードアクセスを実現しています。

## 技術コンポーネント詳細

* **`manifest.json`**:
  * 権限 (`permissions`): `contextMenus`, `clipboardWrite`, `offscreen`, `tabs`, `storage`
  * 設定画面: `options_ui` を定義。

* **`src/background.ts`**:
  * 各種コピー操作のハンドリングを担当。
  * `chrome.storage.sync` からユーザー設定（faviconの有無やサイズ）を読み取り、動的にマークダウン文字列を生成。

* **`src/content.ts`**:
  * リンク要素の特定とテキスト抽出、および `turndown` による選択範囲のMarkdown変換を担当。

* **`src/options.ts` / `options.html`**:
  * ユーザー設定（faviconの利用有無、アイコンサイズ）の保存・管理を担当。設定は `chrome.storage.sync` で同期されます。

* **`offscreen.html` / `src/offscreen.ts`**:
  * Service Worker からのメッセージを受け取り、クリップボードへの書き込みを実行。

## 今後の拡張性への考慮点
* オプション画面の基盤が整っているため、Markdown以外（HTML、リッチテキスト等）のフォーマット追加や、カスタムテンプレート機能の実装も容易な構成です。
* デバッグやテストを行いやすいよう、機能ごとに明確に責務を分離したアーキテクチャを採用しています。
