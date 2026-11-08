# 実装計画書: コンテキストメニュー第1階層へのテンプレートピン留め機能 (Pin Templates to Context Menu)

**機能ブランチ**: `001-pin-template-menus` | **作成日**: 2026-11-08 | **仕様書**: [spec.md](./spec.md)

---

## 概要 (Summary)

Webページ上のリンクやページ情報をコピーする際、サブメニューを介さずにワンクリックでコピーできるようにするため、テンプレートごとに「トップレベル（第1階層）に表示する（ピン留め）」設定を導入します。

- **技術的アプローチ**:
  - `FormatTemplate` に `pinned?: boolean` プロパティを追加（未定義時は Markdown のみ true として後方互換性を担保）。
  - オプション画面（`options.html` / `options.ts`）にピン留めチェックボックス列を追加し、チェック変更時に `chrome.storage.sync` を即時更新。
  - バックグラウンドの `setupContextMenus()` において、ピン留めされたテンプレートを第1階層に直接展開し、ピン留めされていないテンプレートを「その他の形式でコピー」サブメニューに自動集約。
  - `messages.json` にプレースホルダー付きメッセージキーを追加し、「Slack形式でリンクをコピー」「HTML形式でページをコピー」等の自然な多言語ラベルを動的生成。

---

## 技術コンテキスト (Technical Context)

- **言語 / バージョン**: TypeScript 5.4.5 (ターゲット: ES2022, モジュール: ES2022)
- **主要依存ライブラリ**: Webpack 5, ts-loader, Chrome Extension Manifest V3 API
- **ストレージ**: `chrome.storage.sync`（テンプレート一覧配列の保持および端末間同期）
- **テスト**: Chrome ブラウザ上での拡張機能読み込みと手動シナリオ検証（[quickstart.md](./quickstart.md) 準拠）
- **対象プラットフォーム**: Google Chrome (デスクトップ版)
- **プロジェクト種別**: Chrome 拡張機能 (Browser Extension)
- **パフォーマンス目標**: 設定変更から右クリックメニュー再構築完了まで 500ms 以内（即時反映）
- **制約事項**: 
  - Manifest V3 の Service Worker 制約（DOM直接アクセス不可、ステートレス動作）
  - 拡張機能権限の追加なし（最小権限の原則の遵守）
  - 既存ユーザーの保存データに対する無停止・完全後方互換性の担保

---

## 憲章適合性チェック (Constitution Check)

*GATE: 設計前および設計後において全原則への適合を検証*

| 憲章原則 | 適合状況 | 検証内容・根拠 |
| :--- | :---: | :--- |
| **第1原則: Manifest V3 準拠と疎結合コンポーネント設計** | **適合 (PASS)** | Service Worker (`background.ts`) はステートレスに保たれ、メニュー再構築は `chrome.storage.onChanged` イベント駆動で実行される。DOMアクセスは行わない。 |
| **第2原則: 開発ソースと配布パッケージの完全分離** | **適合 (PASS)** | 変更対象のTypeScriptコードはすべて `src/` 配下に配置し、HTMLやメッセージ定義は `package/` 配下に配置。Webpackによるビルド成果物は `package/js/` へ出力される。 |
| **第3原則: 堅牢なクリップボード書き込みとマルチMIME** | **適合 (PASS)** | クリップボードへのデータ書き込みロジックは既存の Offscreen Document API および `ClipboardItem` 機構をそのまま再利用し、変更を加えない。 |
| **第4原則: 構造を保全する高精度Markdown変換** | **適合 (PASS)** | 既存の turndown 変換およびリンクテキスト抽出ロジックへの副作用はなく、従来どおりの精度が維持される。 |
| **第5原則: ドキュメント・コメントの完全日本語化とJSDoc必須** | **適合 (PASS)** | 本計画書、設計成果物、新規追加・修正するすべての関数・インターフェースに日本語ドキュメントおよびJSDocを完全付与する。 |

---

## プロジェクト構造 (Project Structure)

### 本機能に関連するドキュメント

```text
specs/001-pin-template-menus/
├── spec.md                  # 機能仕様書
├── plan.md                  # 実装計画書 (本ファイル)
├── research.md              # Phase 0: 技術調査および設計判断
├── data-model.md            # Phase 1: データモデルおよび状態遷移図
├── quickstart.md            # Phase 1: 動作検証シナリオガイド
├── contracts/               # Phase 1: 外部・内部インターフェース規約
│   ├── storage-schema.md    # ストレージスキーマ定義
│   └── context-menu-contract.md # コンテキストメニュー構成規約
└── checklists/
    └── requirements.md      # 仕様品質チェックリスト
```

### 変更対象ソースコード

```text
src/
├── template.ts              # FormatTemplate インターフェース更新、初期プリセット定義
├── background.ts            # setupContextMenus() のピン留め展開・サブメニュー構築改修
└── options.ts               # オプション画面のテーブル描画、ピン留めチェックボックス制御

package/
├── options.html             # テンプレートテーブルへのピン留め列追加
└── _locales/
    ├── ja/messages.json     # 日本語ラベル・メッセージ追加
    └── en/messages.json     # 英語ラベル・メッセージ追加
```

---

## 設計アーティファクト一覧 (Phase 0 & Phase 1 Outputs)

1. [技術調査および設計判断 (research.md)](./research.md)
   - メニュー動的構築ロジック、多言語メッセージ生成、データ移行・後方互換性方針の決定。
2. [データモデル設計書 (data-model.md)](./data-model.md)
   - `FormatTemplate` への `pinned` フィールド拡張、エンティティ関連図、変更シーケンス図。
3. [ストレージスキーマ規約 (contracts/storage-schema.md)](./contracts/storage-schema.md)
   - `chrome.storage.sync` 内のデータ定義と後方互換性保証ルール。
4. [コンテキストメニュー規約 (contracts/context-menu-contract.md)](./contracts/context-menu-contract.md)
   - リンク・ページコンテキストにおけるメニュー配置規則とメッセージキー定義。
5. [クイックスタート・動作検証ガイド (quickstart.md)](./quickstart.md)
   - デフォルト動作、ピン留め切り替え、全ピン留め、全解除、ページコピー連動の5つのエンドツーエンド検証手順。

---

## 複雑性追跡 (Complexity Tracking)

> 憲章違反や過度なアーキテクチャの導入はありません。既存の `chrome.storage.sync` とコンテキストメニュー構築の枠組みの中で最小限かつ疎結合に変更を適用します。
