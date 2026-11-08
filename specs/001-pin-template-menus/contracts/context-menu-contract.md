# コンテキストメニュー規約 (Context Menu Contract)

**機能ブランチ**: `001-pin-template-menus`  
**対象仕様書**: [spec.md](../spec.md)  
**作成日**: 2026-11-08  

---

## 1. メニュー構成ルール

### 1.1 リンク右クリック時 (`contexts: ['link']`)

1. **ピン留め有効項目 (`pinned: true`)**:
   - ID: `template:link:${template.id}`
   - 親ID (`parentId`): なし（トップレベル）
   - ラベル: `chrome.i18n.getMessage('contextMenuCopyLinkAsFormat', [template.name])`
   - 表示順: テンプレート設定順
2. **サブメニュー親項目（未ピン留め項目が1件以上存在する場合のみ生成）**:
   - ID: `copy-link-as-template-parent`
   - 親ID (`parentId`): なし（トップレベル）
   - ラベル: `chrome.i18n.getMessage('contextMenuOtherFormatsLink')`（例: "その他の形式でコピー"）
3. **未ピン留め項目 (`pinned: false`)**:
   - ID: `template:link:${template.id}`
   - 親ID (`parentId`): `copy-link-as-template-parent`
   - ラベル: `template.name`（例: "HTML"）

---

### 1.2 ページ余白右クリック時 (`contexts: ['page']`)

1. **ピン留め有効項目 (`pinned: true`)**:
   - ID: `template:page:${template.id}`
   - 親ID (`parentId`): なし（トップレベル）
   - ラベル: `chrome.i18n.getMessage('contextMenuCopyPageAsFormat', [template.name])`
   - 表示順: テンプレート設定順
2. **サブメニュー親項目（未ピン留め項目が1件以上存在する場合のみ生成）**:
   - ID: `copy-page-as-template-parent`
   - 親ID (`parentId`): なし（トップレベル）
   - ラベル: `chrome.i18n.getMessage('contextMenuOtherFormatsPage')`（例: "その他の形式でコピー"）
3. **未ピン留め項目 (`pinned: false`)**:
   - ID: `template:page:${template.id}`
   - 親ID (`parentId`): `copy-page-as-template-parent`
   - ラベル: `template.name`（例: "HTML"）

---

## 2. 国際化メッセージ定義規約 (`messages.json`)

| キー名 | 日本語 (`ja`) | 英語 (`en`) | プレースホルダー |
| :--- | :--- | :--- | :--- |
| `contextMenuCopyLinkAsFormat` | `$FORMAT$形式でリンクをコピー` | `Copy Link as $FORMAT$` | `FORMAT`: テンプレート名 |
| `contextMenuCopyPageAsFormat` | `$FORMAT$形式でページをコピー` | `Copy Page as $FORMAT$` | `FORMAT`: テンプレート名 |
| `contextMenuOtherFormatsLink` | `その他の形式でコピー` | `Copy Link in other formats...` | なし |
| `contextMenuOtherFormatsPage` | `その他の形式でコピー` | `Copy Page in other formats...` | なし |
| `thPinned` | `トップレベル` | `Pin to top` | なし |
