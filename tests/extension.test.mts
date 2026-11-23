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
import {
  SUPPORTED_LOCALES,
  normalizeLanguageSetting,
  resolveBrowserLocale,
  resolveEffectiveLocale,
  localeToHtmlLang,
  formatChromeMessage,
  createMessageGetter
} from '../src/i18n.ts';

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

test('manifest.json: ポップアップ設定・オプションタブ設定・権限・多言語設定が仕様どおりである', () => {
  const rootDir = path.resolve(import.meta.dirname, '..');
  const manifest = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'package', 'manifest.json'), 'utf8')
  );

  assert.equal(manifest.default_locale, 'en');
  assert.equal(manifest.commands?.['smart-copy']?.description, '__MSG_commandSmartCopyDesc__');
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

test('i18n: 言語設定の正規化とブラウザ言語からのロケール解決・英語フォールバック', () => {
  // 設定値の正規化
  assert.equal(normalizeLanguageSetting('auto'), 'auto');
  assert.equal(normalizeLanguageSetting('ja'), 'ja');
  assert.equal(normalizeLanguageSetting('en'), 'en');
  assert.equal(normalizeLanguageSetting('zh_CN'), 'zh_CN');
  assert.equal(normalizeLanguageSetting('zh_TW'), 'zh_TW');
  assert.equal(normalizeLanguageSetting('ko'), 'ko');
  assert.equal(normalizeLanguageSetting(undefined), 'auto');
  assert.equal(normalizeLanguageSetting(null), 'auto');
  assert.equal(normalizeLanguageSetting('fr'), 'auto');

  // ブラウザ言語解決（日本語・韓国語・英語）
  assert.equal(resolveBrowserLocale('ja'), 'ja');
  assert.equal(resolveBrowserLocale('ja-JP'), 'ja');
  assert.equal(resolveBrowserLocale('JA_jp'), 'ja');
  assert.equal(resolveBrowserLocale('ko'), 'ko');
  assert.equal(resolveBrowserLocale('ko-KR'), 'ko');
  assert.equal(resolveBrowserLocale('en'), 'en');
  assert.equal(resolveBrowserLocale('en-US'), 'en');
  assert.equal(resolveBrowserLocale('en_GB'), 'en');

  // 中国語（簡体字・繁体字）の地域・文字タグ判別
  assert.equal(resolveBrowserLocale('zh'), 'zh_CN');
  assert.equal(resolveBrowserLocale('zh-CN'), 'zh_CN');
  assert.equal(resolveBrowserLocale('zh_CN'), 'zh_CN');
  assert.equal(resolveBrowserLocale('zh-SG'), 'zh_CN');
  assert.equal(resolveBrowserLocale('zh-Hans'), 'zh_CN');
  assert.equal(resolveBrowserLocale('zh-Hans-CN'), 'zh_CN');
  assert.equal(resolveBrowserLocale('zh-TW'), 'zh_TW');
  assert.equal(resolveBrowserLocale('zh_TW'), 'zh_TW');
  assert.equal(resolveBrowserLocale('zh-HK'), 'zh_TW');
  assert.equal(resolveBrowserLocale('zh-MO'), 'zh_TW');
  assert.equal(resolveBrowserLocale('zh-Hant'), 'zh_TW');
  assert.equal(resolveBrowserLocale('zh-Hant-TW'), 'zh_TW');

  // 未対応言語は英語へフォールバック
  assert.equal(resolveBrowserLocale('fr'), 'en');
  assert.equal(resolveBrowserLocale('de-DE'), 'en');
  assert.equal(resolveBrowserLocale('es-ES'), 'en');
  assert.equal(resolveBrowserLocale(''), 'en');
  assert.equal(resolveBrowserLocale(undefined), 'en');

  // 有効ロケール決定（手動優先・auto時はブラウザ追従）
  assert.equal(resolveEffectiveLocale('auto', 'ko-KR'), 'ko');
  assert.equal(resolveEffectiveLocale('auto', 'fr-FR'), 'en');
  assert.equal(resolveEffectiveLocale('zh_TW', 'ja-JP'), 'zh_TW');
  assert.equal(resolveEffectiveLocale('invalid', 'ja-JP'), 'ja');

  // HTML lang 属性変換
  assert.equal(localeToHtmlLang('zh_CN'), 'zh-CN');
  assert.equal(localeToHtmlLang('zh_TW'), 'zh-TW');
  assert.equal(localeToHtmlLang('ja'), 'ja');
});

test('i18n: Chrome messages.json のプレースホルダー置換・$$アンエスケープ・フォールバック解決', () => {
  const formatted = formatChromeMessage(
    {
      message: '$FORMAT$形式でリンクをコピー',
      placeholders: {
        format: { content: '$1' }
      }
    },
    ['Markdown']
  );
  assert.equal(formatted, 'Markdown形式でリンクをコピー');

  // 置換値に $ が含まれていても二重置換されないこと
  const dollarSafe = formatChromeMessage(
    {
      message: 'Copy Link as $FORMAT$',
      placeholders: {
        format: { content: '$1' }
      }
    },
    ['$100 $$test']
  );
  assert.equal(dollarSafe, 'Copy Link as $100 $$test');

  // $$ のアンエスケープ
  const escaped = formatChromeMessage({
    message: 'Format (e.g. [$${title}]($${url}))'
  });
  assert.equal(escaped, 'Format (e.g. [${title}](${url}))');

  // 辞書フォールバック階層（主辞書 -> 英語辞書 -> 最終フォールバック）
  const getMessage = createMessageGetter(
    { onlyPrimary: { message: 'Primary Value' } },
    { onlyFallback: { message: 'English Fallback' } },
    (key) => (key === 'onlyChrome' ? 'Chrome Fallback' : '')
  );
  assert.equal(getMessage('onlyPrimary'), 'Primary Value');
  assert.equal(getMessage('onlyFallback'), 'English Fallback');
  assert.equal(getMessage('onlyChrome'), 'Chrome Fallback');
  assert.equal(getMessage('missing'), '');
});

test('ロケールファイル: 全5ロケールのmessages.jsonのキーが一致し空文字やプレースホルダー不備がない', () => {
  const rootDir = path.resolve(import.meta.dirname, '..');
  const catalogs = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      JSON.parse(
        fs.readFileSync(path.join(rootDir, 'package', '_locales', locale, 'messages.json'), 'utf8')
      )
    ])
  );

  const baseKeys = Object.keys(catalogs.en).sort();
  assert.ok(baseKeys.includes('commandSmartCopyDesc'));
  assert.ok(baseKeys.includes('optionLanguage'));
  assert.ok(baseKeys.includes('optionLanguageAuto'));

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = catalogs[locale];
    const keys = Object.keys(catalog).sort();
    assert.deepEqual(keys, baseKeys, `keys mismatch for locale ${locale}`);

    for (const key of baseKeys) {
      assert.ok(
        typeof catalog[key]?.message === 'string' && catalog[key].message.trim().length > 0,
        `${locale} message for ${key} is empty`
      );
    }

    // プレースホルダーを含む主要メッセージが正しく展開されることを確認
    const linkLabel = formatChromeMessage(catalog.contextMenuCopyLinkAsFormat, ['Markdown']);
    assert.ok(linkLabel.includes('Markdown'), `${locale} link format placeholder failed: ${linkLabel}`);
    assert.ok(!linkLabel.includes('$FORMAT$'), `${locale} unresolved $FORMAT$ in link label`);

    const pageLabel = formatChromeMessage(catalog.contextMenuCopyPageAsFormat, ['Slack']);
    assert.ok(pageLabel.includes('Slack'), `${locale} page format placeholder failed: ${pageLabel}`);
    assert.ok(!pageLabel.includes('$FORMAT$'), `${locale} unresolved $FORMAT$ in page label`);

    // $$ エスケープが正しく展開されることを確認
    const varsHelp = formatChromeMessage(catalog.optionsVariablesHelp);
    assert.ok(varsHelp.includes('${title}'), `${locale} optionsVariablesHelp missing \${title}`);
    assert.ok(varsHelp.includes('${url}'), `${locale} optionsVariablesHelp missing \${url}`);
    assert.ok(!varsHelp.includes('$${'), `${locale} optionsVariablesHelp still contains escaped $$`);
  }
});

test('HTMLファイルとビルド成果物: popup.html/options.htmlおよびバンドルJSが存在する', () => {
  const rootDir = path.resolve(import.meta.dirname, '..');
  const popupHtml = fs.readFileSync(path.join(rootDir, 'package', 'popup.html'), 'utf8');
  const optionsHtml = fs.readFileSync(path.join(rootDir, 'package', 'options.html'), 'utf8');

  assert.match(popupHtml, /src="js\/popup\.js"/);
  assert.match(popupHtml, /id="btn-toggle-other"/);
  assert.match(popupHtml, /<div id="other-formats-list" class="submenu-list" hidden><\/div>/);
  assert.match(popupHtml, /\.menu-section\[hidden\]/);
  assert.doesNotMatch(popupHtml, /other-formats-heading/);
  assert.match(optionsHtml, /src="js\/options\.js"/);
  assert.match(optionsHtml, /id="language-select"/);
  assert.ok(fs.existsSync(path.join(rootDir, 'package', 'js', 'popup.js')));
  assert.ok(fs.existsSync(path.join(rootDir, 'package', 'js', 'options.js')));
  assert.ok(fs.existsSync(path.join(rootDir, 'package', 'js', 'background.js')));
  assert.ok(fs.existsSync(path.join(rootDir, 'package', 'js', 'content.js')));
  assert.ok(fs.existsSync(path.join(rootDir, 'package', 'js', 'offscreen.js')));
});
