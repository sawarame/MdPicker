# MdPicker - プロジェクト仕様書

## 概要
「MdPicker」は、Webページ上のリンクや選択した範囲を右クリックし、コンテキストメニュー（右クリックメニュー）から簡単にMarkdown形式へと変換・取得してクリップボードへコピーできる Chrome 拡張機能です。Manifest V3 の仕様に完全に準拠して設計されています。

## コア機能仕様

1. **コンテキストメニュー登録**
   * 対象: リンク要素 (`contexts: ["link"]`)。ラベル: `Copy Link as Markdown`。
   * 対象: 選択範囲 (`contexts: ["selection"]`)。ラベル: `Copy selection as Markdown`。
   * 対象: ページ全体・拡張機能アイコン (`contexts: ["page", "action"]`)。ラベル: `Copy Page as Markdown Link` (日本語環境: `このページをリンクとしてコピー`)。

2. **リンクテキストの取得仕様**
   * **課題**: Chrome の `contextMenu` API では、リンクの URL は取得できるものの、表示テキストは直接取得できません。また SPA (React等) における要素判定の難しさや、iframe 内での動作という課題がありました。
   * **解決策**: `content.ts` を全ページへ注入し、`contextmenu` イベントをフックします。`composedPath()` と `nodeName` を用いて確実に対象の `<a>` 要素を特定し、`textContent`、`alt`、`aria-label` 等からテキストを一時保存します。
   * **データ取得フロー**: コンテキストメニューをクリックした際、バックグラウンドから Content Script (該当の `frameId` を指定) に対してメッセージ通信を行いテキストを取得。取得できない場合は `selectionText`（選択範囲）、それもなければ `Link` にフォールバックします。

3. **現在のページをリンクとしてコピーする仕様 (新規追加)**
   * ページ上の空白部分、または拡張機能アイコンを右クリックした際、現在のタブのタイトル (`tab.title`) と URL (`tab.url`) を組み合わせて `[タイトル](URL)` のMarkdownリンクを生成しクリップボードに保存します。

3. **選択範囲のMarkdown変換仕様**
   * **課題**: Chrome 標準APIの `selectionText` ではプレーンテキストしか持たないため、元のWebページにある太字や見出しなどのタグ情報が欠落してしまいます。
   * **解決策**: Content Script 内に `turndown` パッケージを組み込んでいます。右クリック時に `window.getSelection()` を使って現在のHTML要素を抽出し、さらに親要素までタグ要素（`<h1>`や`<ul>`等）を辿ることで、部分的な選択であっても構造を維持したまま精度の高いMarkdownへと変換して保存します。

4. **クリップボードへの書き込み仕様**
   * **課題**: Manifest V3 拡張機能の Service Worker はブラウザの DOM 機構を持たないため、古い `document.execCommand('copy')` が動作せず、`navigator.clipboard` の挙動も制限があります。
   * **解決策**: 「Offscreen Document API」を利用します。バックグラウンド上で不可視のHTML文書 (`offscreen.html`) を動的に生成し、Service Worker からメッセージを送って Offscreen 側の JavaScript (`offscreen.ts`) で確実にクリップボードにアクセス・コピーを行います。

## 技術コンポーネント詳細

* **`manifest.json`**:
  * バージョン: `manifest_version: 3`
  * 権限 (`permissions`): `contextMenus`, `clipboardWrite`, `offscreen`
  * バックグラウンド: `js/background.js` (Service Worker)
  * コンテントスクリプト: `<all_urls>` で動作予定 (`document_start` もしくは `document_idle`)。

* **`src/background.ts`**:
  * インストール時に3種類のコンテキストメニュー（URLリンク用、選択範囲用、ページ全体/アイコン用）を作成。
  * メニュークリックを監視し、Content Script に「リンクテキスト」または「選択範囲のMarkdown」を問い合わせる。ページ全体のコピー時は `tab.title` と `tab.url` を使用。
  * `Offscreen Document` を作成（すでに存在する場合はスキップ）。
  * テキストとURLを組み合わせて `[Text](URL)` フォーマットの文字列を作成、もしくは取得したMarkdownをそのまま Offscreen に送信。

* **`src/content.ts`**:
  * EventListener で `contextmenu` をキャプチャし、クリックされた要素から `.closest('a')` でリンクを見つけテキストを保持。
  * 同時に `window.getSelection()` から選択範囲を抽出し、親要素を遡ってタグ構造を再構成の上 `turndown` でMarkdownに変換。
  * バックグラウンドからの `GET_LAST_LINK_TEXT` および `GET_LAST_SELECTION_MARKDOWN` リクエストに対してデータを返却。

* **`offscreen.html` / `src/offscreen.ts`**:
  * DOM(textarea等)を使用した高互換なクリップボードコピーロジックの実装（`execCommand` または `navigator.clipboard` の呼び出し）。

## 今後の拡張性への考慮点
* オプションページを用意し、Markdown以外（HTML、リッチテキスト等）のフォーマット変更機能追加も可能な構成としています。
* デバッグやテストを行いやすいよう、バックグラウンドプロセスから機能ごとにモジュール分割しやすいアーキテクチャを持ち合わせています。
