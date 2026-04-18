# MdPicker - プロジェクト仕様書 (SPEC.md)

## 概要
「MdPicker」は、Webページ上のリンクを右クリックし、コンテキストメニュー（右クリックメニュー）から簡単に「Markdown形式のリンク ( `[リンクテキスト](URL)` )」としてクリップボードへコピーできる Chrome 拡張機能です。Manifest V3 の仕様に完全に準拠して設計されています。

## コア機能仕様

1. **コンテキストメニュー登録**
   * 対象: リンク要素（`<a>`タグ）のみに表示される（`contexts: ["link"]`）。
   * ラベル: `Copy as Markdown`

2. **リンクテキストの取得仕様**
   * **課題**: Chrome の `contextMenu` API（`OnClickData`）では、リンクの URL(`linkUrl`) は取得できるものの、リンクのアンカーテキスト（表示テキスト）は直接取得できません。
   * **解決策**: `content.ts` (Content Script) を全てのページへ注入しておき、`contextmenu`（右クリック）イベントをフックして、直前に右クリックされた `<a>` 要素の `textContent` を常に一時保存します。
   * **データ取得フロー**: 「Copy as Markdown」をクリックした際、バックグラウンドスクリプトから Content Script に対してメッセージ通信を行い、保存されているテキストを取得。取得できない場合は `Link` という文字列にフォールバックします。

3. **クリップボードへの書き込み仕様**
   * **課題**: Manifest V3 拡張機能の Service Worker はブラウザの DOM 機構を持たないため、古い `document.execCommand('copy')` が動作せず、`navigator.clipboard` の挙動も制限があります。
   * **解決策**: 「Offscreen Document API」を利用します。バックグラウンド上で不可視のHTML文書 (`offscreen.html`) を動的に生成し、Service Worker からメッセージを送って Offscreen 側の JavaScript (`offscreen.ts`) で確実にクリップボードにアクセス・コピーを行います。

## 技術コンポーネント詳細

* **`manifest.json`**:
  * バージョン: `manifest_version: 3`
  * 権限 (`permissions`): `contextMenus`, `clipboardWrite`, `offscreen`
  * バックグラウンド: `js/background.js` (Service Worker)
  * コンテントスクリプト: `<all_urls>` で動作予定 (`document_start` もしくは `document_idle`)。

* **`src/background.ts`**:
  * インストール時にコンテキストメニューを作成。
  * メニュークリックを監視し、Content Script に「リンクテキスト」を問い合わせる。
  * `Offscreen Document` を作成（すでに存在する場合はスキップ）。
  * テキストとURLを組み合わせて `[Text](URL)` フォーマットの文字列を作成後、Offscreen に送信。

* **`src/content.ts`**:
  * EventListener で `contextmenu` をキャプチャし、クリックされた要素から `.closest('a')` でリンクを見つけテキストを保持。
  * バックグラウンドからの `GET_LAST_LINK_TEXT` リクエストに対してテキストを返却。

* **`offscreen.html` / `src/offscreen.ts`**:
  * DOM(textarea等)を使用した高互換なクリップボードコピーロジックの実装（`execCommand` または `navigator.clipboard` の呼び出し）。

## 今後の拡張性への考慮点
* オプションページを用意し、Markdown以外（HTML、リッチテキスト等）のフォーマット変更機能追加も可能な構成としています。
* デバッグやテストを行いやすいよう、バックグラウンドプロセスから機能ごとにモジュール分割しやすいアーキテクチャを持ち合わせています。
