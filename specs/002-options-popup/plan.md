# 実装計画書: オプション画面のポップアップ表示 (002-options-popup)

**Branch**: `002-options-popup` | **Date**: 2026-11-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-options-popup/spec.md`

## 概要 (Summary)

ブラウザのツールバーにある拡張機能アイコンをクリックした際に、オプション画面（`options.html`）をポップアップとして直接表示できるようにし、現在のWebページから離れずにワンクリックで設定を確認・変更できるようにします。
また、ポップアップ幅（約480px〜540px）に最適化されたレスポンシブレイアウトを適用し、広い画面で編集したい場合のためにヘッダー領域に「新しいタブで開く」ボタン（`chrome.runtime.openOptionsPage()` 呼び出し）を配置します。

技術的アプローチとしては、`package/manifest.json` に `"action": { "default_popup": "options.html" }` を追加し、既存の `options.html` と `src/options.ts` を単一の共用コンポーネントとして拡張することで、保守性の向上と二重管理の根絶（DRY原則）を実現します。

---

## 技術コンテキスト (Technical Context)

- **言語およびバージョン**: TypeScript 5.4.5 (ターゲット: ES2022, モジュール: ES2022)
- **主要な依存ライブラリ**: Chrome Extensions API (Manifest V3), Webpack 5, ts-loader
- **ストレージ**: `chrome.storage.sync` (ユーザー設定の永続化およびリアルタイム同期)
- **テスト方針**: 手動E2E検証（[quickstart.md](quickstart.md) に準拠）および TypeScript型チェック・ビルド検証
- **対象プラットフォーム**: Google Chrome (デスクトップ環境, Manifest V3準拠)
- **プロジェクト種別**: Chrome拡張機能 (ブラウザ拡張)
- **パフォーマンス目標**: ポップアップの表示・初期化 < 100ms、設定変更の保存・同期反映 < 500ms
- **技術的制約**: Chromeポップアップ領域サイズ（最大 800px × 600px、推奨幅 480px〜540px）、Service WorkerのDOM非アクセス性
- **規模とスコープ**: 影響ファイル 4ファイル（`manifest.json`, `options.html`, `options.ts`, `messages.json`）、新規権限追加なし

---

## 憲章チェック (Constitution Check)

*GATE: Phase 0 リサーチ前および Phase 1 設計完了後に検証。すべて適合 (PASS)*

| 憲章の原則 | 適合状況 | 検証内容および根拠 |
|---|---|---|
| **第1原則: Manifest V3 準拠と疎結合コンポーネント設計** | **適合 (PASS)** | ポップアップ表示は `options.html` のページコンテキストで完結し、Service Worker (`background.ts`) は一切DOMにアクセスしません。設定の保存と同期には `chrome.storage.sync` を使用します。 |
| **第2原則: 開発ソースと配布パッケージの完全分離** | **適合 (PASS)** | 変更対象は `src/options.ts`（TypeScriptソース）と `package/manifest.json`, `package/options.html`, `package/_locales/`（配布パッケージ実体）に明確に分離されています。 |
| **第3原則: 堅牢なクリップボード書き込みとフォールバック** | **適合 (PASS)** | 本機能はクリップボード操作に直接影響を与えず、既存のマルチMIME書き込み機構はそのまま維持されます。 |
| **第4原則: 構造を保全する高精度Markdown変換** | **適合 (PASS)** | Markdown変換処理ロジックへの影響はありません。 |
| **第5原則: ドキュメント・コメントの完全日本語化とJSDoc必須** | **適合 (PASS)** | 新規追加・修正するTypeScript関数やインターフェース、設計ドキュメントはすべて日本語で記述し、JSDocを完備します。 |
| **権限管理 (Permissions Guard)** | **適合 (PASS)** | `action` の追加のみであり、新規の `permissions` や `host_permissions` の追加は一切ありません（最小特権の原則を遵守）。 |

---

## プロジェクト構成 (Project Structure)

### ドキュメント構成 (本フィーチャー)

```text
specs/002-options-popup/
├── spec.md                  # 仕様書 (User Scenarios, Requirements, Success Criteria)
├── checklists/
│   └── requirements.md      # 品質チェックリスト
├── plan.md                  # 実装計画書 (本ドキュメント)
├── research.md              # リサーチおよび設計比較 (Phase 0)
├── data-model.md            # データモデルおよびシーケンス図 (Phase 1)
├── quickstart.md            # クイックスタート検証ガイド (Phase 1)
└── contracts/               # インターフェース規約 (Phase 1)
    ├── manifest-contract.md # Manifest アクション定義規約
    └── ui-contract.md       # ポップアップ・オプション画面UI規約
```

### ソースコードおよびアセット構成

```text
src/
└── options.ts               # 「新しいタブで開く」イベントハンドラおよびコンテキスト制御の追加
package/
├── manifest.json            # "action" 定義の追加 (default_popup: "options.html")
├── options.html             # ヘッダー領域の新設、別タブ展開ボタン配置、レスポンシブCSS調整
└── _locales/
    ├── en/messages.json     # 「別タブで開く」ツールチップ等の英語メッセージ定義
    └── ja/messages.json     # 「別タブで開く」ツールチップ等の日本語メッセージ定義
```

---

## 複雑性トラッキング (Complexity Tracking)

> *憲章違反や過度な複雑性の導入はありません。*

| 項目 | 状態 | 備考 |
|---|---|---|
| アーキテクチャ逸脱 | なし | Manifest V3 標準の `action.default_popup` パターンに厳格に準拠 |
| 新規外部依存ライブラリ | なし | 追加のnpmパッケージ導入なし |
| 新規権限要求 | なし | 最小特権の原則を維持 |
