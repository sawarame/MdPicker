# Manifest 仕様契約 (Manifest Contract)

## 概要
`package/manifest.json` におけるツールバーアクション（`action`）の定義スキーマおよび動作仕様規約です。

---

## 1. スキーマ定義

```json
{
  "action": {
    "default_popup": "options.html",
    "default_title": "__MSG_appName__",
    "default_icon": {
      "16": "images/icon16.png",
      "32": "images/icon32.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": false
  }
}
```

### フィールド仕様

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `action.default_popup` | `string` | 必須 | ツールバーアイコンクリック時に開くHTMLのパス。`"options.html"` を指定。 |
| `action.default_title` | `string` | 任意 | アイコンホバー時に表示されるツールチップ文字列。多言語化メッセージ `__MSG_appName__` を参照。 |
| `action.default_icon` | `object` | 必須 | 各種解像度に対応するアイコンパスのマップ。 |
| `options_ui.page` | `string` | 必須 | Chrome拡張機能管理画面や右クリックオプションで開くHTMLパス（`"options.html"`）。 |
| `options_ui.open_in_tab` | `boolean` | 必須 | `false`（インラインダイアログ）または `true`（タブ起動）。 |

---

## 2. 動作保証

1. **ワンクリック表示**:
   - ツールバー上のMdPickerアイコンをクリックすると、遅滞なくポップアップとして `options.html` が描画されること。
2. **既存機能の完全互換**:
   - 右クリックメニューの「オプション」や、拡張機能管理画面（`chrome://extensions/`）からのオプションアクセスも従来通り利用可能であること。
3. **不要な権限の排除**:
   - `action` 設定の追加にあたり、新規の `permissions` や `host_permissions` を要求しないこと。
