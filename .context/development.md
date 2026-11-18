# 開発ワークフロー (Development Workflow)

## 1. 開発の準備

1. プロジェクトルートで `npm install` を実行し、依存パッケージをインストールします。
2. アイコンが生成されていない、または `src/icon.svg` を更新した場合は `npm run generate-icons` を実行し、`package/images/` 配下にアイコンを生成します。

## 2. ソースコードの編集

- ロジックや型の変更は常に `src/` ディレクトリ内の `.ts` ファイルに対して行います。
- **重要: `src/` 以下のソースコードを変更した後は、必ず `npm run build`（または `npm run dev`）を実行してビルド成果物を更新してください。ビルドを行わないと変更が反映されません。**
- `package/js/` 以下のファイルはビルド成果物であるため、直接編集しないでください。
- 静的 HTML（`options.html`, `offscreen.html`）、多言語リソース（`_locales/*/messages.json`）、マニフェスト（`manifest.json`）の変更は `package/` 配下を直接編集します。
- **権限追加の事前合意**: `package/manifest.json` の `permissions` や `host_permissions` を追加する場合は、最小特権の原則に基づき、必ず事前にユーザー（開発者）へ意図と影響範囲を説明し合意を得てください。

## 3. ビルドの実行

ソースコードの変更が完了したら、以下のコマンドを実行してビルドを行います。

```bash
npm run build
```

これにより、以下の処理が自動で行われます。

1. `package/js/` フォルダおよび既存の `package.zip` の削除。
2. Webpack による TypeScript ファイルの本番ビルドおよびバンドル（出力先: `package/js/`）。
3. `package/` フォルダ全体の zip 圧縮（`package.zip` の生成）。

開発中に変更を自動反映したい場合は、以下のウォッチビルドを使用します。

```bash
npm run dev
```

## 4. ブラウザでの動作検証

1. Google Chrome を開き、`chrome://extensions/` にアクセスします。
2. 右上の「デベロッパー モード」をオンにします。
3. 「パッケージ化されていない拡張機能を読み込む (Load unpacked)」ボタンをクリックし、このプロジェクト内の `package` フォルダを選択します。
4. 変更を加えた場合は、拡張機能カードの「再読み込み (更新)」アイコンをクリックして変更を反映させます（Content Script を変更した場合は確認対象の Web ページもリロードしてください）。
5. 以下の主要動作を確認します。
   - **リンクコピー**: Web ページ上のリンクを右クリックし、ピン留めされた形式（トップレベル）および「その他の形式でコピー」（サブメニュー）からコピーできること。
   - **選択範囲コピー**: 見出し・太字・テーブル・相対 URL のリンクや画像を含む範囲を選択し、「選択範囲をMarkdownとしてコピー」またはショートカットで絶対 URL 付きの Markdown としてコピーできること。
   - **ページリンクコピー**: ページ余白を右クリックし、ピン留め／サブメニューの各形式および favicon 設定が反映されること。
   - **リッチテキスト貼り付け**: `HTML` テンプレート（`text/html`）でコピーした内容を、Notion や Google ドキュメント等ではハイパーリンク、テキストエディタではフォールバック文字列として貼り付けられること。
   - **オプション画面・ポップアップ**: ツールバーアイコン左クリックまたはアイコン右クリックメニュー「オプションを開く」でポップアップが開き、横スクロールなしで設定変更・追加・削除・2段階リセットが動作すること。
   - **ショートカット**: `Command+Shift+M`（Mac）または `Ctrl+Shift+M`（Windows/Linux）でスマートコピーが動作すること。

## 5. デバッグ

- **Service Worker (`background.ts`)**: `chrome://extensions/` の拡張機能カード内「Service Worker」リンクから DevTools を開き、Console タブでコンテキストメニュー登録やメッセージングのログを確認します。
- **Content Script (`content.ts`)**: 対象 Web ページ上で DevTools の Console タブを開き、エラーや警告ログを確認します。
- **オプション画面 (`options.html` / `options.ts`)**: ポップアップまたはタブ上で右クリック ＞ 「検証 (Inspect)」から DevTools を開いて UI・ストレージ状態を確認します。
- **Offscreen Document (`offscreen.html` / `offscreen.ts`)**: `chrome://extensions/` の「ビューを検証」等に `offscreen.html` が表示されている場合に DevTools でクリップボード書き込み時のフォールバックログを確認します。

## 6. バージョニングとリリース

- バージョン番号はセマンティックバージョニング（`MAJOR.MINOR.PATCH`）に従い、`package.json`・`package-lock.json`・`package/manifest.json` のバージョンを必ず同期させます。
- **コミット規約**: Conventional Commits（`feat:`, `fix:`, `chore:`, `docs:`, `refactor:` 等）に従います。
- **ブランチ運用**: 新機能は `feat/<機能名>`、不具合修正は `fix/<修正名>` ブランチで作業します。
- `main` へのマージ後に GitHub Actions（`create-tag.yml`）が `vX.Y.Z` タグを自動生成し、GitHub Release を公開すると `publish-chrome-web-store.yml` が Chrome Web Store へのアップロードと審査提出を自動実行します。
