# 技術調査および設計判断 (Research & Decisions)

**機能ブランチ**: `001-pin-template-menus`  
**対象仕様書**: [spec.md](./spec.md)  
**作成日**: 2026-11-08  

---

## 1. コンテキストメニューの動的構築と階層制御

### 決定内容 (Decision)
- コンテキストメニュー構築関数（`setupContextMenus()`）において、ストレージから取得したテンプレート一覧を「ピン留め有効（`pinned: true`）」と「ピン留め無効（`pinned: false`）」に分類する。
- **ピン留め有効なテンプレート**:
  - 設定画面の順序のまま、右クリックメニューのトップレベル（第1階層）に登録する。
  - メニューID: `template:link:${t.id}`（リンク用）および `template:page:${t.id}`（ページ用）。
  - タイトル: 多言語リソースから動的に生成（例: `chrome.i18n.getMessage('contextMenuCopyLinkAsFormat', [t.name])`）。
- **ピン留め無効なテンプレート**:
  - 未ピン留めテンプレートが1件以上存在する場合のみ、親メニュー「その他の形式でコピー」（リンク用: `copy-link-as-template-parent`, ページ用: `copy-page-as-template-parent`）を作成し、そのサブメニューとして登録する。
  - サブメニュー内の項目タイトルは従来通りテンプレートの表示名（`t.name`）とする。
- **全テンプレートがピン留め有効な場合**:
  - 親メニュー（サブメニュー）は作成せず、すべてトップレベルに直出しする。
- **全テンプレートがピン留め無効な場合**:
  - トップレベルにはテンプレート項目を出さず、親メニュー（サブメニュー）内に全テンプレートを格納する。

### 採用理由 (Rationale)
- 既存のクリックイベントリスナー（`chrome.contextMenus.onClicked`）は `info.menuItemId.startsWith('template:')` で処理しているため、メニューIDの規則を維持することで、クリックハンドラ側のロジック変更を最小限に抑えつつトップレベルとサブメニューの両方に対応できる。
- 条件分岐がシンプルになり、Manifest V3のService Workerにおけるメモリや実行時間のオーバーヘッドを回避できる。

### 検討した代替案 (Alternatives Considered)
- **代替案A: トップレベル専用の新しいメニューID接頭辞を導入する（例: `pinned:link:${t.id}`）**:
  - 却下理由: クリックハンドラ側で `pinned:` と `template:` の両方を分岐ハンドリングする必要が生じ、ロジックが二重化して不具合のリスクが高まるため。
- **代替案B: サブメニューを常に表示し、ピン留めされた項目も重複してサブメニュー内に残す**:
  - 却下理由: インタビューで合意したとおり、トップレベルに出ている項目がサブメニューにも重複するとメニュー一覧が煩雑になり、ユーザーの認知負荷が高まるため。

---

## 2. メニューラベルの多言語対応方針

### 決定内容 (Decision)
- `package/_locales/ja/messages.json` および `package/_locales/en/messages.json` に以下のメッセージキーを新設・更新する。
  - `contextMenuCopyLinkAsFormat`: 
    - ja: `"$FORMAT$形式でリンクをコピー"` (プレースホルダー: `FORMAT`)
    - en: `"Copy Link as $FORMAT$"` (プレースホルダー: `FORMAT`)
  - `contextMenuCopyPageAsFormat`:
    - ja: `"$FORMAT$形式でページをコピー"` (プレースホルダー: `FORMAT`)
    - en: `"Copy Page as $FORMAT$"` (プレースホルダー: `FORMAT`)
  - `contextMenuOtherFormatsLink`:
    - ja: `"その他の形式でコピー"` (または `"リンクを別形式でコピー"`)
    - en: `"Copy Link in other formats..."`
  - `contextMenuOtherFormatsPage`:
    - ja: `"その他の形式でコピー"` (または `"このページを別形式でコピー"`)
    - en: `"Copy Page in other formats..."`
- `chrome.i18n.getMessage('contextMenuCopyLinkAsFormat', [t.name])` を用いて、テンプレート名（Markdown, Slack, HTML等）を自然に埋め込んだ表示ラベルを生成する。

### 採用理由 (Rationale)
- Chromeの `messages.json` 標準の `placeholders` 機能を使用することで、言語ごとの語順の違い（英語は "Copy Link as Slack"、日本語は "Slack形式でリンクをコピー"）を綺麗に吸収できる。
- ユーザーが作成したカスタムテンプレートの名前も正しく反映される。

---

## 3. データモデルおよび後方互換性（データ移行）方針

### 決定内容 (Decision)
- `FormatTemplate` インターフェースにオプショナルプロパティ `pinned?: boolean` を追加する。
- テンプレート読み込み時の初期値解決ヘルパー関数（`isTemplatePinned(t: FormatTemplate): boolean`）を用意する：
  ```typescript
  function isTemplatePinned(t: FormatTemplate): boolean {
    if (typeof t.pinned === 'boolean') {
      return t.pinned;
    }
    // 既存ストレージデータ（pinned未定義）に対する後方互換性フォールバック
    return t.id === 'markdown';
  }
  ```
- `DEFAULT_TEMPLATES`（初期プリセット）の定義：
  - `markdown`: `pinned: true`
  - `slack`: `pinned: false`
  - `scrapbox`: `pinned: false`
  - `html`: `pinned: false`
  - `markdown-date`: `pinned: false`

### 採用理由 (Rationale)
- 既存のユーザーの `chrome.storage.sync` に保存されているテンプレート配列には `pinned` プロパティが存在しない。移行処理として未定義時に `id === 'markdown'` を true と見なすことで、データ移行スクリプトを走らせることなく完全な後方互換性と無停止移行を実現できる。

---

## 4. オプション画面（設定UI）の設計

### 決定内容 (Decision)
- `package/options.html` のテンプレート一覧テーブル（`<table>`）に「ピン留め (Pin)」列を追加する。
  - 列順序: `[ピン留め]` (チェックボックス) | `[名前]` | `[MIME Type]` | `[書式]` | `[操作]`
  - ピン留め列ヘッダー: `th-pinned`（ラベル: 日本語「トップレベルに表示」/ 英語「Pin to top」）
- 各行のチェックボックスが変更された際（`change` イベント）：
  - 該当インデックスの `template.pinned = checkbox.checked` を設定。
  - 即座に `chrome.storage.sync.set({ templates: currentTemplates })` を呼び出して保存。
  - `background.ts` 側の `chrome.storage.onChanged` リスナーが発火し、コンテキストメニューが即時再構築される。
- 新規テンプレート追加フォーム：
  - デフォルトでは `pinned: false` として追加。追加後、一覧のチェックボックスでいつでもピン留め可能。
- デフォルト復元（「Reset to Defaults」）：
  - `DEFAULT_TEMPLATES` に戻すことで、Markdownのみピン留めONの状態にリセット。

### 採用理由 (Rationale)
- チェックボックス1つの操作で即座に保存・反映されるため、ユーザーにとって直感的で設定の保存漏れが発生しない。
- 既存の `saveTemplates()` の再利用によりコードが簡潔に保たれる。
