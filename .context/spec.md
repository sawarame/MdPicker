# MdPicker 拡張機能 仕様書

## 1. 基本コンセプト

**MdPicker** は、Webページ上のリンク、選択した範囲、または閲覧中のページ情報を、右クリックコンテキストメニューやキーボードショートカットから Markdown 形式や任意のテンプレート形式（Slack、Scrapbox、HTML など）に変換してクリップボードへコピーできる Google Chrome 拡張機能（Manifest V3 準拠）です。

---

## 2. 主要機能

### A. コンテキストメニューによるコピー
テンプレート設定およびピン留め状態に応じて、右クリック時にコンテキストメニューを動的に構築します（メニュー構成は `chrome.storage.onChanged` により再起動不要で即時更新されます）。

1. **リンク上の右クリック (`contexts: ["link"]`)**
   - **第1階層（トップレベル）直出し**: オプション画面でピン留め（`pinned: true`）されたテンプレートは、第1階層に直接展開されます。
     - メニューID: `template:link:${template.id}`
     - ラベル形式: 日本語 `"[テンプレート名]形式でリンクをコピー"`（`$FORMAT$形式でリンクをコピー`） / 英語 `"Copy Link as [Format]"`
   - **サブメニュー（「その他の形式でコピー」）**: ピン留めされていないテンプレート（`pinned: false`）が 1 件以上存在する場合のみ、親メニュー（ID: `copy-link-as-template-parent`、日本語 `"その他の形式でコピー"` / 英語 `"Copy link in other formats..."`）が自動生成され、その配下に未ピン留めテンプレートが並びます。
     - すべてのテンプレートをピン留めした場合は親サブメニューは表示されません。
     - すべてのピン留めを解除した場合は第1階層に親サブメニューのみが表示されます。
   - **表示順序**: 第1階層・サブメニュー内ともに、オプション画面のテンプレート一覧の並び順（上から順）に一致します。

2. **ページ余白上の右クリック (`contexts: ["page"]`)**
   - **第1階層（トップレベル）直出し**: ピン留めされたテンプレートが第1階層に直接展開されます。
     - メニューID: `template:page:${template.id}`
     - ラベル形式: 日本語 `"[テンプレート名]形式でページのリンクを作成"`（`$FORMAT$形式でページのリンクを作成`） / 英語 `"Copy Page Link as [Format]"`
   - **サブメニュー（「その他の形式でコピー」）**: 未ピン留めテンプレートが 1 件以上存在する場合のみ親メニュー（ID: `copy-page-as-template-parent`、日本語 `"その他の形式でコピー"` / 英語 `"Copy page in other formats..."`）が生成され、未ピン留めテンプレートが格納されます。
   - **favicon 付与連携**: `Markdown` テンプレート（`id === 'markdown'`）かつオプションの「ページリンクにfaviconを含める（`includeFavicon`）」が有効な場合、`![favicon](${faviconUrl}) [${title}](${url})` の形式で出力します（favicon URL が取得できない場合は通常の `[${title}](${url})`）。それ以外のテンプレートでは `${favicon}` プレースホルダーを含むテンプレート書式を展開します。

3. **選択範囲の右クリック (`contexts: ["selection"]`)**
   - メニューID: `copy-selection-as-markdown`
   - ラベル: 日本語 `"選択範囲をMarkdownとしてコピー"` / 英語 `"Copy selection as Markdown"`
   - 選択範囲の HTML 構造を解析し、Markdown として `text/plain` でクリップボードへコピーします。

### B. テンプレート・フォーマットカスタマイズ機能
リンクやページ情報を、用途に応じた書式テンプレートで変換できます。

- **標準プリセット (`DEFAULT_TEMPLATES`)**:
  1. **Markdown** (`id: 'markdown'`): `[${title}](${url})` / MIME: `text/plain` / ピン留め: `true`
  2. **Slack** (`id: 'slack'`): `<${url}|${title}>` / MIME: `text/plain` / ピン留め: `false`
  3. **Scrapbox** (`id: 'scrapbox'`): `[${url} ${title}]` / MIME: `text/plain` / ピン留め: `false`
  4. **HTML** (`id: 'html'`): `<a href="${url}">${title}</a>` / MIME: `text/html` / ピン留め: `false`
  5. **Markdown (日付付き)** (`id: 'markdown-date'`): `[${title}](${url}) (${date})` / MIME: `text/plain` / ピン留め: `false`
- **利用可能なプレースホルダー変数 (`renderTemplate`)**:
  - `${title}`: リンクテキストまたはページのタイトル
  - `${url}`: リンク先 URL またはページの URL
  - `${date}`: コピー時の日付（`YYYY-MM-DD` 形式）
  - `${time}`: コピー時の時刻（`HH:mm` 形式）
  - `${favicon}`: 対象ドメインのファビコン画像 URL
- **MIMEタイプ設定**:
  - 各テンプレートに `text/plain` または `text/html` を指定できます。
  - `text/html` 指定時は、Notion、Google ドキュメント、Word、メールアプリ等のリッチテキスト入力欄へ貼り付けた際にクリック可能なハイパーリンクとして展開されます。また、プレーンテキスト専用エディタへの貼り付け互換性も維持するため、展開済み文字列をフォールバック用 `text/plain` として同時に格納します。
- **後方互換性 (`isTemplatePinned`)**:
  - `pinned` プロパティが存在しない既存設定データを読み込んだ場合は、`id === 'markdown'` のみを `pinned: true` とみなし、その他は `false` として扱います。

### C. キーボードショートカット（スマートコピー）
- **コマンド**: `smart-copy`（デフォルトキー: Mac `Command+Shift+M` / Windows・Linux `Ctrl+Shift+M`、`chrome://extensions/shortcuts` で変更可能）
- **挙動**:
  1. アクティブタブの Content Script へ `GET_SMART_MARKDOWN` を問い合わせ、テキスト選択がある場合は選択範囲を Markdown（`text/plain`）としてコピーします。
  2. テキストが選択されていない場合は、オプション画面で指定された「デフォルトの形式（`shortcutTemplateId`、初期値 `'markdown'`）」を使用して現在のタブ情報を変換・コピーします（`id === 'markdown'` かつ `includeFavicon` 有効時は favicon 付き Markdown を出力）。
  3. タイトルが取得できず URL のみ存在する場合は URL 文字列（`text/plain`）をコピーします。

### D. リンクテキスト抽出・選択範囲 Markdown 変換（Content Script）
`src/content.ts` を全 URL（`<all_urls>`、`run_at: "document_start"`）へ注入し、DOM 情報の抽出と変換を行います。

- **リンクテキスト抽出 (`contextmenu` キャプチャフェーズ)**:
  - `e.composedPath()` を用いてオープンな Shadow DOM 境界を貫通しながら `<a>` 要素を特定します（非対応環境では `target.closest('a')` へフォールバック）。
  - テキスト取得優先順: `textContent` / `innerText` → リンク内 `img[alt]` → `aria-label` 属性 → `title` 属性。取得文字列は連続する空白・改行を単一スペースに正規化します。
  - バックグラウンドからの `GET_LAST_LINK_TEXT`（`{ frameId: info.frameId }` 指定）メッセージに対して抽出済みテキストを返却し、取得失敗時は `info.selectionText || 'Link'` をフォールバックとして使用します。
- **選択範囲の高精度 Markdown 変換 (`turndown` + `turndown-plugin-gfm`)**:
  - `TurndownService`（`headingStyle: 'atx'`, `hr: '---'`, `bulletListMarker: '-'`, `codeBlockStyle: 'fenced'`）および `tables` プラグインを使用し、見出し・装飾・リスト・コードブロック・GFM テーブルを忠実に変換します。
  - **相対 URL の絶対 URL 解決**: 選択範囲内の `<img>` の `src` と `<a>` の `href` を、ブラウザ解決済みのプロパティ値（`HTMLImageElement.src` / `HTMLAnchorElement.href`）で上書きし、貼り付け先での画像表示崩れやリンク切れを防止します。
  - **祖先インライン／ブロック要素の文脈保持**: 選択範囲の `commonAncestorContainer` から親要素を遡り、装飾・見出し・リスト項目・テーブル関連タグ（`B`, `STRONG`, `I`, `EM`, `MARK`, `DEL`, `S`, `U`, `H1`-`H6`, `LI`, `A`, `CODE`, `PRE`, `TD`, `TH`, `TR`, `THEAD`, `TBODY`, `TFOOT`, `CAPTION`）でラップし、`UL` / `OL` / `TABLE` に到達した場合はそのコンテナをラップして探索を停止します（標準ブロックコンテナ `P`, `DIV`, `SECTION` 等で停止）。
  - 変換エラー時は `selection.toString()` へフォールバックします。
  - コンテキストメニュー経由時は `GET_LAST_SELECTION_MARKDOWN`、ショートカット経由時は `GET_SMART_MARKDOWN` で取得します。

### E. ファビコン付与機能
- **取得方式**: Google Favicon Service（`https://www.google.com/s2/favicons?domain=${url.hostname}&sz=${faviconSize}`）を利用し、URL 解析失敗時は `tab.favIconUrl`（ページコピー時）または空文字にフォールバックします。
- **サイズ選択肢**: `12px` / `16px` / `24px` / `32px`（デフォルト: `16`）。

### F. クリップボード書き込み（Offscreen Document API）
Manifest V3 の Service Worker は DOM に直接アクセスできないため、`package/offscreen.html` + `src/offscreen.ts`（`Reason.CLIPBOARD`）を経由してクリップボードへの書き込みを実行します。

1. **`text/html` 指定時の書き込みおよびフォールバック階層**:
   - **第1手段**: `ClipboardItem` + `navigator.clipboard.write()` により `'text/html'` と `'text/plain'`（フォールバック文字列）のマルチ MIME 書き込みを試行。
   - **第2手段**: Offscreen Document でのフォーカス不在等により `ClipboardItem` API が失敗した場合は、`copy` イベントをフックして `event.clipboardData.setData('text/html', ...)` および `'text/plain'` を設定し、`document.execCommand('copy')` を実行。
   - **第3手段**: `<textarea id="content">` への値設定と `document.execCommand('copy')`、または `navigator.clipboard.writeText()` へフォールバック。
2. **`text/plain` 指定時の書き込み**:
   - `<textarea id="content">` を選択して `document.execCommand('copy')` を実行し、要素が存在しない場合は `navigator.clipboard.writeText()` を使用。

### G. オプション画面（ポップアップ表示：`package/options.html` / `src/options.ts`）
ツールバーアイコンからのポップアップ表示として単一の `options.html` で設定画面を提供します（`chrome://extensions/` 上の埋め込み `options_ui` 画面は廃止）。

- **アクセス経路**:
  - ツールバーアイコンの左クリック（`manifest.json` の `action.default_popup: "options.html"`）。
  - ツールバーアイコンの右クリックメニュー「オプションを開く」（`contexts: ["action"]`、メニューID: `open-options-popup`、英語: `"Open Options"`）選択時に `chrome.action.openPopup()` を呼び出してポップアップを表示（Chrome 127 以降）。
- **レスポンシブレイアウト**:
  - ポップアップ表示時: `width: 600px; min-width: 600px;`、横スクロールなしで全設定項目にアクセス可能。
  - ワイド画面表示時: `@media (min-width: 700px)` により `width: auto; max-width: 840px;` へ自動拡張。
- **設定・管理機能**:
  - ファビコン設定（「ページリンクにfaviconを含める」チェックボックス、サイズ選択ドロップダウン。未有効時はサイズ選択を半透明・`disabled` 化）。
  - デフォルトの形式（ショートカット等で使用するテンプレート）の選択。
  - テンプレート一覧テーブル（並び替え操作列・ピン留めチェックボックス・名前・MIMEタイプ・形式・削除ボタン）。ドラッグ＆ドロップまたは上下移動ボタン（`↑` / `↓`）による並び替えやピン留め切り替えは即時保存され、`chrome.storage.onChanged` を通じてコンテキストメニュー（第1階層およびサブメニュー内）の順序・構成に即座に反映。
  - 新規テンプレート追加フォーム（表示名・MIMEタイプ `text/plain` / `text/html`・書式文字列。トリム後の空文字入力時はエラー表示。新規追加時の `id` は `custom-${Date.now()}`、`pinned` はデフォルト `false`）。
  - テンプレート削除バリデーション（残り 1 件のテンプレートは削除不可。ショートカット用テンプレートが削除された場合は残存先頭テンプレートを自動的に再割り当て）。
  - 「初期テンプレートに戻す」機能（ポップアップ表示でも確実に動作するよう `window.confirm()` に依存せず、ボタン文言を赤色に変化させて 4 秒以内に再クリックする 2 段階インライン確認を採用。実行時は `DEFAULT_TEMPLATES` と `shortcutTemplateId: 'markdown'` を復元）。
- **多言語対応 (`chrome.i18n`)**:
  - `package/_locales/en/messages.json`（主言語 `default_locale: "en"`）と `package/_locales/ja/messages.json` により UI ラベル・コンテキストメニュー文言・メッセージを切り替え。

---

## 3. データモデル（`chrome.storage.sync`）

すべてのユーザー設定は `chrome.storage.sync` に保存・同期されます。

| キー名 | 型 | デフォルト値 | 説明 |
|---|---|---|---|
| `includeFavicon` | `boolean` | `false` | ページリンク作成時にファビコンを含めるか（`Markdown` テンプレート適用時） |
| `faviconSize` | `string` | `'16'` | ファビコン画像サイズ（`'12' \| '16' \| '24' \| '32'`） |
| `templates` | `FormatTemplate[]` | `DEFAULT_TEMPLATES` | 登録済みフォーマットテンプレートの配列（最低 1 件） |
| `shortcutTemplateId` | `string` | `'markdown'` | キーボードショートカット実行時に適用するテンプレートの `id` |

### `FormatTemplate` インターフェース（`src/template.ts`）

| フィールド | 型 | 必須 | デフォルト値 | 説明 |
|---|---|---|---|---|
| `id` | `string` | 必須 | - | 一意な識別子（例: `'markdown'`, `'custom-1731...'`） |
| `name` | `string` | 必須 | - | テンプレートの表示名（トリム後 1 文字以上） |
| `format` | `string` | 必須 | - | 書式パターン文字列（トリム後 1 文字以上） |
| `mimeType` | `'text/plain' \| 'text/html'` | 任意 | `'text/plain'` | クリップボード書き込み時の MIME タイプ |
| `pinned` | `boolean` | 任意 | `false`（`markdown` のみ `true`） | コンテキストメニュー第1階層へピン留め表示するか |

---

## 4. 拡張機能権限 (Manifest V3)

`package/manifest.json` に定義されている権限は最小特権の原則に基づき以下の通りです。

- `contextMenus`: リンク・選択範囲・ページ余白の右クリックメニュー登録用
- `clipboardWrite`: Offscreen Document 経由でのクリップボード書き込み用
- `offscreen`: DOM 非保持の Service Worker からクリップボード操作用 Offscreen Document を生成するため
- `tabs`: アクティブタブの URL・タイトル・ファビコン取得および Content Script へのメッセージ送信対象特定用
- `storage`: `chrome.storage.sync` による設定の保存・同期・変更検知用
