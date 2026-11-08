# ストレージおよびデータ構造規約 (Storage Schema Contract)

**機能ブランチ**: `001-pin-template-menus`  
**対象仕様書**: [spec.md](../spec.md)  
**作成日**: 2026-11-08  

---

## 1. `chrome.storage.sync` スキーマ

本拡張機能の設定データは、Chrome Sync ストレージに保存されます。

### キー: `templates`
フォーマットテンプレートの配列オブジェクト。

```typescript
export interface FormatTemplate {
  /** テンプレートの一意なID (英数字) */
  id: string;
  /** 表示名 */
  name: string;
  /** フォーマット書式 (例: '[${title}](${url})') */
  format: string;
  /** クリップボード書き込み時のMIMEタイプ ('text/plain' | 'text/html') */
  mimeType?: 'text/plain' | 'text/html';
  /**
   * コンテキストメニューの第1階層（トップレベル）にピン留め表示するかどうか。
   * @default false (id === 'markdown' の場合のみ未指定時に true とフォールバック)
   */
  pinned?: boolean;
}
```

### JSON スキーマ例

```json
{
  "templates": [
    {
      "id": "markdown",
      "name": "Markdown",
      "format": "[${title}](${url})",
      "mimeType": "text/plain",
      "pinned": true
    },
    {
      "id": "slack",
      "name": "Slack",
      "format": "<${url}|${title}>",
      "mimeType": "text/plain",
      "pinned": true
    },
    {
      "id": "html",
      "name": "HTML",
      "format": "<a href=\"${url}\">${title}</a>",
      "mimeType": "text/html",
      "pinned": false
    }
  ]
}
```

---

## 2. 後方互換性保証規約

1. **既存データの読み込み時**:
   - `pinned` プロパティが存在しないレコードを読み込んだ場合、`id === 'markdown'` であるレコードのみ `pinned = true` として扱い、それ以外は `pinned = false` として扱う。
2. **ストレージ書き込み時**:
   - 設定画面でテンプレート一覧が更新された際は、各オブジェクトに明示的に `pinned: boolean` を付与して保存する。
