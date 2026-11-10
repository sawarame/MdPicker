# UIおよび画面契約 (UI Contract)

## 概要
`package/options.html` におけるUI要素の配置、ID/クラス規約、およびレスポンシブスタイリングの契約仕様です。

---

## 1. ヘッダーナビゲーション契約

オプション画面の上部にヘッダーコンテナを配置し、「別タブで開く」操作ボタンを提供する。

```html
<header class="options-header">
  <h1 class="options-title" id="options-title">MdPicker</h1>
  <button type="button" id="btn-open-tab" class="btn-icon" title="別タブで開く" aria-label="Open in new tab">
    <!-- タブ展開アイコン (SVG) -->
  </button>
</header>
```

### 要素仕様
| 要素ID / クラス | 要素種別 | 必須 | 役割 |
|---|---|---|---|
| `.options-header` | `header` | 必須 | タイトルとタブ展開ボタンを横並び（`display: flex; justify-content: space-between;`）で保持する領域。 |
| `#options-title` | `h1` | 必須 | 拡張機能のタイトル。ポップアップ内でも適切なフォントサイズで表示。 |
| `#btn-open-tab` | `button` | 必須 | クリック時に `chrome.runtime.openOptionsPage()` を呼び出すボタン。 |

---

## 2. レイアウトおよびサイズ契約

| 画面表示コンテキスト | 想定幅 (Width) | スタイリング規約 |
|---|---|---|
| **ポップアップ表示時** | `min-width: 480px; max-width: 540px;` | ・外枠パディングは `16px` 〜 `20px`。<br>・テーブルがはみ出さないよう `word-break: break-all;` や適切な横幅比率を指定。<br>・縦スクロールバーを許容し、コンテンツ全体の視認性を確保。 |
| **フルタブ表示時** | `max-width: 840px;` | ・中央配置（`margin: 0 auto;`）され、大画面でも読みやすい横幅を維持。<br>・「別タブで開く」ボタンは非表示または控えめなアイコンとして表示。 |

---

## 3. レスポンシブテーブル契約

テンプレート管理テーブル (`table`) の各カラム幅比率：
- ピン留め列 (`.col-pinned`): `10%` 〜 `12%` (中央揃え)
- テンプレート名 (`.col-name`): `20%` 〜 `24%`
- MIMEタイプ (`.col-mimetype`): `16%` 〜 `18%`
- フォーマット列 (`.col-format`): `36%` 〜 `42%` (改行対応)
- 操作列 (`.col-actions`): `12%` 〜 `14%` (削除ボタン)

追加フォーム (`.add-form`) は幅が狭い場合にも折り返し可能（`flex-wrap: wrap;`）とし、入力欄が潰れないように構成する。
