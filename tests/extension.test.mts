/**
 * テンプレートロジックおよび拡張機能パッケージ構成の自動テスト。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_TEMPLATES,
  isTemplatePinned,
  partitionTemplatesByPinned,
  reorderTemplates,
  renderTemplate,
  formatPageWithTemplate
} from '../src/template.ts';

test('partitionTemplatesByPinned: デフォルトテンプレートをピン留めと未ピン留めに振り分ける', () => {
  const { pinned, unpinned } = partitionTemplatesByPinned(DEFAULT_TEMPLATES);
  assert.deepEqual(pinned.map((t) => t.id), ['markdown']);
  assert.deepEqual(unpinned.map((t) => t.id), ['slack', 'scrapbox', 'html', 'markdown-date']);
});

test('partitionTemplatesByPinned: 並び順を維持しつつレガシーデータの後方互換性を保つ', () => {
  const legacyTemplates = [
    { id: 'slack', name: 'Slack', format: '<${url}|${title}>' },
    { id: 'markdown', name: 'Markdown', format: '[${title}](${url})' },
    { id: 'custom-1', name: 'Custom', format: '${title}: ${url}', pinned: true }
  ];

  assert.equal(isTemplatePinned(legacyTemplates[0]), false);
  assert.equal(isTemplatePinned(legacyTemplates[1]), true);
  assert.equal(isTemplatePinned(legacyTemplates[2]), true);

  const { pinned, unpinned } = partitionTemplatesByPinned(legacyTemplates);
  assert.deepEqual(pinned.map((t) => t.id), ['markdown', 'custom-1']);
  assert.deepEqual(unpinned.map((t) => t.id), ['slack']);
});

test('reorderTemplates: 指定位置への並び替えが正しく動作し元配列を変更しない', () => {
  const original = [...DEFAULT_TEMPLATES];
  const reordered = reorderTemplates(original, 1, 0);
  assert.equal(reordered[0].id, 'slack');
  assert.equal(reordered[1].id, 'markdown');
  assert.equal(original[0].id, 'markdown');
});

test('formatPageWithTemplate: Markdownかつfavicon有効時はfavicon画像付きMarkdownを返す', () => {
  const mdTemplate = DEFAULT_TEMPLATES[0];
  const withFavicon = formatPageWithTemplate(mdTemplate, {
    title: 'Example',
    url: 'https://example.com',
    faviconUrl: 'https://www.google.com/s2/favicons?domain=example.com&sz=16',
    includeFavicon: true
  });
  assert.equal(
    withFavicon,
    '![favicon](https://www.google.com/s2/favicons?domain=example.com&sz=16) [Example](https://example.com)'
  );

  const withoutFaviconUrl = formatPageWithTemplate(mdTemplate, {
    title: 'Example',
    url: 'https://example.com',
    faviconUrl: '',
    includeFavicon: true
  });
  assert.equal(withoutFaviconUrl, '[Example](https://example.com)');

  const disabledFavicon = formatPageWithTemplate(mdTemplate, {
    title: 'Example',
    url: 'https://example.com',
    faviconUrl: 'https://www.google.com/s2/favicons?domain=example.com&sz=16',
    includeFavicon: false
  });
  assert.equal(disabledFavicon, '[Example](https://example.com)');
});

test('formatPageWithTemplate: 非MarkdownテンプレートではrenderTemplateでプレースホルダーを展開する', () => {
  const htmlTemplate = DEFAULT_TEMPLATES.find((t) => t.id === 'html')!;
  const htmlResult = formatPageWithTemplate(htmlTemplate, {
    title: 'Example',
    url: 'https://example.com',
    faviconUrl: 'https://example.com/favicon.ico',
    includeFavicon: true
  });
  assert.equal(htmlResult, '<a href="https://example.com">Example</a>');

  const customFaviconTemplate = {
    id: 'custom-fav',
    name: 'WithIcon',
    format: '<img src="${favicon}"> ${title} - ${url}'
  };
  const customResult = formatPageWithTemplate(customFaviconTemplate, {
    title: 'Example',
    url: 'https://example.com',
    faviconUrl: 'https://example.com/favicon.ico',
    includeFavicon: false
  });
  assert.equal(customResult, '<img src="https://example.com/favicon.ico"> Example - https://example.com');
});

test('renderTemplate: 日付・時刻・タイトル・URLがすべて置換される', () => {
  const rendered = renderTemplate('[${title}](${url}) ${date} ${time}', {
    title: 'MdPicker',
    url: 'https://github.com/sawarame/MdPicker'
  });
  assert.match(rendered, /^\[MdPicker\]\(https:\/\/github\.com\/sawarame\/MdPicker\) \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
});

test('manifest.json: ポップアップ設定・オプションタブ設定・権限が仕様どおりである', () => {
  const rootDir = path.resolve(import.meta.dirname, '..');
  const manifest = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'package', 'manifest.json'), 'utf8')
  );

  assert.equal(manifest.action?.default_popup, 'popup.html');
  assert.deepEqual(manifest.options_ui, {
    page: 'options.html',
    open_in_tab: true
  });
  assert.deepEqual(manifest.permissions, [
    'contextMenus',
    'clipboardWrite',
    'offscreen',
    'tabs',
    'storage'
  ]);
  assert.equal(manifest.host_permissions, undefined);
});

test('ロケールファイル: 日英messages.jsonのキーが一致し空文字が存在しない', () => {
  const rootDir = path.resolve(import.meta.dirname, '..');
  const enMessages = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'package', '_locales', 'en', 'messages.json'), 'utf8')
  );
  const jaMessages = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'package', '_locales', 'ja', 'messages.json'), 'utf8')
  );

  const enKeys = Object.keys(enMessages).sort();
  const jaKeys = Object.keys(jaMessages).sort();
  assert.deepEqual(enKeys, jaKeys);

  for (const key of enKeys) {
    assert.ok(enMessages[key].message.trim().length > 0, `en message for ${key} is empty`);
    assert.ok(jaMessages[key].message.trim().length > 0, `ja message for ${key} is empty`);
  }
});

test('HTMLファイルとビルド成果物: popup.html/options.htmlおよびバンドルJSが存在する', () => {
  const rootDir = path.resolve(import.meta.dirname, '..');
  const popupHtml = fs.readFileSync(path.join(rootDir, 'package', 'popup.html'), 'utf8');
  const optionsHtml = fs.readFileSync(path.join(rootDir, 'package', 'options.html'), 'utf8');

  assert.match(popupHtml, /src="js\/popup\.js"/);
  assert.match(optionsHtml, /src="js\/options\.js"/);
  assert.ok(fs.existsSync(path.join(rootDir, 'package', 'js', 'popup.js')));
  assert.ok(fs.existsSync(path.join(rootDir, 'package', 'js', 'options.js')));
  assert.ok(fs.existsSync(path.join(rootDir, 'package', 'js', 'background.js')));
  assert.ok(fs.existsSync(path.join(rootDir, 'package', 'js', 'content.js')));
  assert.ok(fs.existsSync(path.join(rootDir, 'package', 'js', 'offscreen.js')));
});
