# Chrome Web Store Permissions Justification

## Single Purpose Description

### English
MdPicker enables users to copy web links, selected page content, and current page information to the clipboard as Markdown, HTML, or user-defined text templates via context menus, the toolbar popup, or a keyboard shortcut.

### 日本語
MdPicker は、Webページ上のリンク、選択した範囲、および閲覧中のページ情報を、コンテキストメニュー・ツールバーのポップアップ・キーボードショートカットから Markdown、HTML、またはユーザー定義のテンプレート形式に変換してクリップボードへコピーするための拡張機能です。

## Permission Justifications

### `contextMenus`
#### English
Used to dynamically register and update right-click context menu items on links, selected text, page backgrounds, and the extension toolbar icon. Based on the user's template configuration and pinned preferences, the extension displays pinned templates at the top level, groups unpinned templates under an "other formats" submenu, provides a "Copy selection as Markdown" item, and adds an "Open Options" item on the toolbar action icon.

#### 日本語
リンク上、選択テキスト上、ページ余白上、および拡張機能のツールバーアイコン上に右クリックコンテキストメニューを動的に登録・更新するために使用します。ユーザーのテンプレート設定およびピン留め状態に応じて、ピン留めテンプレートの第1階層直出し、未ピン留めテンプレートの「その他の形式でコピー」サブメニューへの集約、「選択範囲をMarkdownとしてコピー」の提供、およびツールバーアイコンからの「オプションを開く」メニュー登録を行います。

### `clipboardWrite`
#### English
Used to write formatted link strings, page links, and converted Markdown selections to the user's system clipboard when the user explicitly triggers a copy action from the context menu, toolbar popup, or keyboard shortcut. Supports writing both plain text (text/plain) and rich HTML hyperlinks with a plain-text fallback (text/html and text/plain) via ClipboardItem or execCommand('copy'). All clipboard operations occur strictly in response to user actions and remain local to the browser.

#### 日本語
ユーザーがコンテキストメニュー、ツールバーのポップアップ、またはキーボードショートカットから明示的にコピー操作を実行した際、フォーマット済みのリンク文字列、ページリンク、および Markdown 変換後の選択テキストをシステムクリップボードへ書き込むために使用します。プレーンテキスト（text/plain）に加え、ClipboardItem API または execCommand('copy') によるリッチテキスト HTML ハイパーリンクおよびフォールバック用プレーンテキスト（text/html と text/plain）の書き込みに対応しています。すべてのクリップボード操作はユーザーの明示的な操作に応じてのみローカルで実行されます。

### `offscreen`
#### English
Used to create a dedicated Offscreen Document (offscreen.html) with chrome.offscreen.Reason.CLIPBOARD so the Manifest V3 background service worker—which has no direct access to DOM or clipboard APIs—can reliably write plain text and multi-MIME HTML content to the clipboard on behalf of context menu, popup, and keyboard shortcut actions.

#### 日本語
DOM やクリップボード API に直接アクセスできない Manifest V3 のバックグラウンド Service Worker から、コンテキストメニュー・ポップアップ・キーボードショートカット操作に伴うクリップボード書き込みを確実に実行するため、chrome.offscreen.Reason.CLIPBOARD を指定した専用の Offscreen Document（offscreen.html）を作成するために使用します。

### `tabs`
#### English
Used to read the active tab's URL, title, and favicon URL when the user triggers a page link copy via the keyboard shortcut or toolbar popup, and to send targeted runtime messages (chrome.tabs.sendMessage) to the content script in the active tab or specific frame to retrieve the clicked link's display text or the user's selected content as Markdown. Tab information is accessed solely when the user interacts with the extension and is never transmitted to external servers.

#### 日本語
ユーザーがキーボードショートカットまたはツールバーのポップアップからページリンクコピーを実行する際にアクティブタブの URL・タイトル・ファビコン URL を取得するため、およびアクティブタブ（または対象フレーム）の Content Script へメッセージ（chrome.tabs.sendMessage）を送信して右クリックされたリンクの表示テキストや選択範囲の Markdown を取得するために使用します。タブ情報へのアクセスはユーザーが拡張機能を操作したときのみ行われ、外部サーバーへ送信されることはありません。

### `storage`
#### English
Used to store and synchronize the user's preferences across devices via chrome.storage.sync, including custom format templates (names, format strings, MIME types, order, and pinned states), the default template for the keyboard shortcut, favicon inclusion and size settings, and the selected display language. Also used via chrome.storage.onChanged to immediately rebuild context menus when templates or language settings change. No browsing history or page content is stored.

#### 日本語
カスタムフォーマットテンプレート（名前・書式・MIMEタイプ・並び順・ピン留め状態）、キーボードショートカット用のデフォルトテンプレート、ファビコン付与の有無およびサイズ設定、表示言語設定を chrome.storage.sync で保存・デバイス間同期するために使用します。また、テンプレートや表示言語が変更された際に chrome.storage.onChanged で検知してコンテキストメニューを即時再構築するためにも使用します。閲覧履歴やページ内容は一切保存しません。

### Host permissions (`content_scripts` matching `<all_urls>`)
#### English
A lightweight content script (js/content.js) is injected into web pages matching <all_urls> at document_start strictly to perform two local DOM extraction tasks in response to user actions: (1) capturing the display text (or fallback img alt, aria-label, or title attribute, including inside open Shadow DOM trees via composedPath) of the anchor element when the user right-clicks a link, and (2) converting the user's current text selection into Markdown while preserving surrounding HTML formatting context and resolving relative image/link URLs to absolute URLs.

Narrower host permissions or activeTab alone cannot fulfill this functionality because users copy links and selections from arbitrary websites across the web rather than a fixed set of domains, and Chrome's contextMenus.onClicked callback only provides the link URL—not the anchor's display text or Shadow DOM target. Capturing the exact right-clicked link element requires a contextmenu event listener registered on the page before the user selects a context menu item. All DOM inspection and Markdown conversion run entirely locally in the browser; no page data, URLs, or user activity are collected or transmitted to any external server.

#### 日本語
<all_urls> に一致する Web ページへ document_start のタイミングで軽量な Content Script（js/content.js）を注入し、ユーザー操作に応じた以下の 2 つのローカル DOM 抽出処理のみを実行します。(1) ユーザーがリンクを右クリックした際に、composedPath() によりオープンな Shadow DOM 内部も含めて対象アンカー要素の表示テキスト（または代替の img alt / aria-label / title 属性）を取得する処理、(2) ユーザーが選択中のテキスト範囲について、周辺の HTML 書式文脈を保持し画像やリンクの相対 URL を絶対 URL へ解決したうえで Markdown に変換する処理。

特定ドメイン限定や activeTab 権限のみでは本機能を実現できません。利用者は特定のサイトに限らず日常的に閲覧するあらゆる Web ページ上でリンクや選択範囲をコピーするためドメイン限定ができず、また Chrome の contextMenus.onClicked コールバックからはリンク先 URL のみ渡されリンクの表示テキストや Shadow DOM 内の要素情報を取得できないため、右クリック発生前にページ側で contextmenu イベントリスナーを登録しておく必要があるためです。すべての DOM 解析と Markdown 変換はブラウザ内のローカル環境のみで完結し、ページ内容・URL・利用履歴などを外部サーバーへ収集・送信することはありません。

## Remote Code Usage

### English
This extension does not use remotely hosted code. All executable code, libraries, and localization files are bundled within the extension package. The extension does not execute dynamic code via eval or remote scripts.

### 日本語
この拡張機能はリモートホストされたコードを使用しません。すべての実行可能コード、ライブラリ、およびローカライズファイルは拡張機能パッケージ内に同梱されています。eval や外部スクリプトによる動的コード実行は一切行いません。
