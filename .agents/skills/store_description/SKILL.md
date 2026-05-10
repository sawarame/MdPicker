---
name: store-description
description: Manage and generate Chrome Web Store descriptions for MdPicker in English and Japanese, ensuring compliance with character limits and highlighting key features.
---

# Store Description Management

MdPicker の Chrome ウェブストア掲載用説明文（英語・日本語）を管理・生成するためのスキルです。

## 掲載内容の制約

- **短い説明 (Short Description)**: 132文字以内
- **詳細な説明 (Detailed Description)**: 16,000文字以内
- **言語**: 英語 (主言語) および 日本語 (追加ロケール)

## 基本構造と必須項目

詳細な説明は、以下の構成を維持してください。

1.  **概要**: MdPicker が何であるか、主要な3つの機能を簡潔に説明。
2.  **KEY FEATURES / 主な機能**:
    - 🔗 リンクをMarkdown形式でコピー (Copy Link as Markdown)
    - 📝 選択範囲をMarkdown形式でコピー (Copy Selection as Markdown)
    - 🌐 現在のページをリンクとしてコピー (Copy Page as Markdown Link)
3.  **WHO IS IT FOR? / こんな方におすすめ**: 開発者、ライター、Obsidian/Notion ユーザーなど。
4.  **HOW TO USE / 使い方**: 3つの機能それぞれの操作手順。
5.  **PERMISSIONS EXPLAINED / 必要な権限について**:
    - `contextMenus`, `clipboardWrite`, `offscreen` の説明。
    - Manifest V3 準拠であること、Offscreen Document API を使用していることの明記。
6.  **Open Source / オープンソース**: GitHub へのリンク。

## 執筆ガイドライン

- **トーン**: 信頼感があり、かつ親しみやすいトーン。
- **技術的背景**: Manifest V3 への完全準拠と、プライバシーへの配慮（トラッキングなし、ローカル完結）を強調する。
- **Markdown 互換**: 出力は Markdown 形式で行う（ウェブストアの入力欄にはプレーンテキストとして貼り付けるが、管理上 Markdown を使用する）。

## 更新と管理

作成した説明文は `store_description.md` に保存してください。新機能の追加や仕様変更があった場合は、説明文も適宜修正して最新の状態を保つようにしてください。
