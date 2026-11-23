/**
 * バックグラウンド処理およびコンテキストメニュー、ショートカットキーのハンドリングを行うスクリプト。
 */

import {
  FormatTemplate,
  DEFAULT_TEMPLATES,
  renderTemplate,
  partitionTemplatesByPinned,
  formatPageWithTemplate
} from './template';
import { LANGUAGE_STORAGE_KEY, loadI18nContext } from './i18n';

/** コンテキストメニュー再構築の競合を防ぐための世代カウンター */
let contextMenuSetupVersion = 0;

/**
 * 現在のタブまたはドメインからファビコンのURLを取得します。
 * @param tabUrl - 対象のページURL
 * @param faviconSize - ファビコンのサイズ（px）
 * @param fallbackUrl - フォールバック用のファビコンURL
 * @returns ファビコン画像のURL
 */
function getFaviconUrl(tabUrl: string, faviconSize: string = '16', fallbackUrl?: string): string {
  try {
    const url = new URL(tabUrl);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=${faviconSize}`;
  } catch (err) {
    return fallbackUrl || '';
  }
}

/**
 * 保存されているテンプレート設定と言語設定を読み込み、コンテキストメニューを再構築します。
 * ピン留めされたテンプレートは第1階層（トップレベル）に直接登録し、
 * 未ピン留めのテンプレートは「その他の形式でコピー」サブメニュー内に集約します。
 */
async function setupContextMenus(): Promise<void> {
  const currentVersion = ++contextMenuSetupVersion;

  // ストレージからテンプレート一覧と言語設定を先に取得
  const stored = await chrome.storage.sync.get({
    templates: DEFAULT_TEMPLATES,
    [LANGUAGE_STORAGE_KEY]: 'auto'
  });

  const i18n = await loadI18nContext(stored[LANGUAGE_STORAGE_KEY]);

  // 待機中に新しい再構築要求が開始されていた場合は古い処理を中断
  if (currentVersion !== contextMenuSetupVersion) {
    return;
  }

  await new Promise<void>((resolve) => {
    chrome.contextMenus.removeAll(() => resolve());
  });

  if (currentVersion !== contextMenuSetupVersion) {
    return;
  }

  const templates = stored.templates;
  const templateList: FormatTemplate[] = templates && templates.length > 0 ? templates : DEFAULT_TEMPLATES;
  const { pinned: pinnedTemplates, unpinned: unpinnedTemplates } = partitionTemplatesByPinned(templateList);

  // 1. リンク用コンテキストメニューの登録
  // ピン留めされた形式をトップレベルに登録
  pinnedTemplates.forEach((t) => {
    const title = i18n.getMessage('contextMenuCopyLinkAsFormat', [t.name]) || `Copy Link as ${t.name}`;
    chrome.contextMenus.create({
      id: `template:link:${t.id}`,
      title: title,
      contexts: ['link']
    });
  });

  // 未ピン留めのテンプレートが1件以上存在する場合はサブメニュー内に格納
  if (unpinnedTemplates.length > 0) {
    const parentTitle = i18n.getMessage('contextMenuOtherFormatsLink') || 'Copy link in other formats...';
    chrome.contextMenus.create({
      id: 'copy-link-as-template-parent',
      title: parentTitle,
      contexts: ['link']
    });

    unpinnedTemplates.forEach((t) => {
      chrome.contextMenus.create({
        id: `template:link:${t.id}`,
        parentId: 'copy-link-as-template-parent',
        title: t.name,
        contexts: ['link']
      });
    });
  }

  // 2. 選択テキスト用コンテキストメニュー（トップレベル）
  chrome.contextMenus.create({
    id: 'copy-selection-as-markdown',
    title: i18n.getMessage('contextMenuSelection') || 'Copy selection as Markdown',
    contexts: ['selection']
  });

  // 3. ページ余白用コンテキストメニューの登録
  // ピン留めされた形式をトップレベルに登録
  pinnedTemplates.forEach((t) => {
    const title = i18n.getMessage('contextMenuCopyPageAsFormat', [t.name]) || `Copy Page Link as ${t.name}`;
    chrome.contextMenus.create({
      id: `template:page:${t.id}`,
      title: title,
      contexts: ['page']
    });
  });

  // 未ピン留めのテンプレートが1件以上存在する場合はサブメニュー内に格納
  if (unpinnedTemplates.length > 0) {
    const parentTitle = i18n.getMessage('contextMenuOtherFormatsPage') || 'Copy page in other formats...';
    chrome.contextMenus.create({
      id: 'copy-page-as-template-parent',
      title: parentTitle,
      contexts: ['page']
    });

    unpinnedTemplates.forEach((t) => {
      chrome.contextMenus.create({
        id: `template:page:${t.id}`,
        parentId: 'copy-page-as-template-parent',
        title: t.name,
        contexts: ['page']
      });
    });
  }

  // 4. 拡張機能アイコン右クリック用のオプション画面（タブ表示）メニュー
  chrome.contextMenus.create({
    id: 'open-options',
    title: i18n.getMessage('contextMenuOpenOptions') || 'Open Options',
    contexts: ['action']
  });
}

// 拡張機能インストール・アップデート時の初期化
chrome.runtime.onInstalled.addListener(() => {
  void setupContextMenus();
});

// ブラウザ起動時の初期化
chrome.runtime.onStartup.addListener(() => {
  void setupContextMenus();
});

// オプション画面等でテンプレート設定や表示言語が変更された際にメニューを自動更新
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && (changes.templates || changes[LANGUAGE_STORAGE_KEY])) {
    void setupContextMenus();
  }
});

/**
 * オフスクリーン ドキュメントを初期化してセットアップします。
 * @param path - オフスクリーンHTMLファイルのパス
 */
async function setupOffscreenDocument(path: string): Promise<void> {
  // 既にオフスクリーンドキュメントが存在するか確認
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // オフスクリーンドキュメントの生成
  await chrome.offscreen.createDocument({
    url: path,
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: 'To copy text to clipboard'
  });
}

/**
 * オフスクリーンドキュメント経由でテキストをクリップボードへ書き込みます。
 * @param text - クリップボードに書き込む文字列（HTMLまたはプレーンテキスト）
 * @param mimeType - 書き込み時のMIMEタイプ（'text/plain' または 'text/html'）
 * @param plainText - リッチテキスト時のフォールバック用プレーンテキスト
 * @returns 書き込みに成功した場合は true、失敗した場合は false
 */
async function writeToOffscreenClipboard(
  text: string,
  mimeType: string = 'text/plain',
  plainText?: string
): Promise<boolean> {
  try {
    await setupOffscreenDocument('offscreen.html');
    const response = await chrome.runtime.sendMessage({
      type: 'copy-text-to-clipboard',
      target: 'offscreen',
      data: text,
      mimeType: mimeType,
      plainText: plainText
    });
    if (response && response.success === false) {
      console.error('Offscreen clipboard write returned failure:', response.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * 指定したタブのページ情報をテンプレートに従ってフォーマットし、クリップボードへコピーします。
 * @param tab - コピー対象のタブ情報
 * @param templateId - 適用するテンプレートのID
 * @returns コピーに成功した場合は true、失敗または対象外の場合は false
 */
async function copyPageTabWithTemplate(
  tab: chrome.tabs.Tab | undefined,
  templateId: string
): Promise<boolean> {
  if (!tab || !tab.url) {
    return false;
  }

  const { templates, faviconSize, includeFavicon } = await chrome.storage.sync.get({
    templates: DEFAULT_TEMPLATES,
    faviconSize: '16',
    includeFavicon: false
  });

  const templateList: FormatTemplate[] = templates && templates.length > 0 ? templates : DEFAULT_TEMPLATES;
  const targetTemplate = templateList.find((t) => t.id === templateId) || templateList[0];
  const mimeType = targetTemplate.mimeType || 'text/plain';
  const pageTitle = tab.title || tab.url;
  const faviconUrl = getFaviconUrl(tab.url, faviconSize, tab.favIconUrl);

  const formatted = formatPageWithTemplate(targetTemplate, {
    title: pageTitle,
    url: tab.url,
    faviconUrl: faviconUrl,
    includeFavicon: Boolean(includeFavicon)
  });

  // リッチテキスト非対応エディタ用（text/plain）にもフォーマット済み文字列を渡す
  return writeToOffscreenClipboard(formatted, mimeType, formatted);
}

/**
 * コンテキストメニューがクリックされた際の処理をハンドリングします。
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // 0. 拡張機能アイコン右クリックからのオプション画面表示（タブで開く）
  if (info.menuItemId === 'open-options' || info.menuItemId === 'open-options-popup') {
    try {
      await chrome.runtime.openOptionsPage();
    } catch (err) {
      console.warn('Could not open options page.', err);
    }
    return;
  }

  // 1. 標準のMarkdownリンクコピー
  if (info.menuItemId === 'copy-as-markdown' && info.linkUrl) {
    let linkText = info.selectionText || 'Link';

    if (tab && tab.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_LAST_LINK_TEXT' }, { frameId: info.frameId });
        if (response && response.text) {
          linkText = response.text;
        }
      } catch (err) {
        console.warn('Could not get link text from content script. Using fallback.', err);
      }
    }

    const markdownStr = `[${linkText}](${info.linkUrl})`;
    await writeToOffscreenClipboard(markdownStr);
    return;
  }

  // 2. 選択範囲のMarkdownコピー
  if (info.menuItemId === 'copy-selection-as-markdown') {
    let markdownStr = info.selectionText || '';

    if (tab && tab.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_LAST_SELECTION_MARKDOWN' });
        if (response && response.markdown) {
          markdownStr = response.markdown;
        }
      } catch (err) {
        console.warn('Could not get markdown from content script. Using fallback text.', err);
      }
    }

    await writeToOffscreenClipboard(markdownStr);
    return;
  }

  // 3. 標準のページ全体リンクコピー
  if (info.menuItemId === 'copy-page-as-markdown') {
    let markdownStr = '';
    if (tab && tab.url && tab.title) {
      const { includeFavicon, faviconSize } = await chrome.storage.sync.get({ 
        includeFavicon: false,
        faviconSize: '16'
      });
      
      if (includeFavicon) {
        const faviconUrl = getFaviconUrl(tab.url, faviconSize, tab.favIconUrl);
        if (faviconUrl) {
          markdownStr = `![favicon](${faviconUrl}) [${tab.title}](${tab.url})`;
        } else {
          markdownStr = `[${tab.title}](${tab.url})`;
        }
      } else {
        markdownStr = `[${tab.title}](${tab.url})`;
      }
    }

    if (markdownStr) {
      await writeToOffscreenClipboard(markdownStr);
    }
    return;
  }

  // 4. テンプレート形式でのコピー（サブメニュー）
  const menuItemIdStr = String(info.menuItemId);
  if (menuItemIdStr.startsWith('template:')) {
    const isLinkAction = menuItemIdStr.startsWith('template:link:') || Boolean(info.linkUrl);
    const templateId = menuItemIdStr.replace(/^template:(link|page):/, '').replace('template:', '');
    const { templates, faviconSize } = await chrome.storage.sync.get({
      templates: DEFAULT_TEMPLATES,
      faviconSize: '16'
    });

    const templateList: FormatTemplate[] = templates && templates.length > 0 ? templates : DEFAULT_TEMPLATES;
    const targetTemplate = templateList.find((t) => t.id === templateId) || templateList[0];
    const mimeType = targetTemplate.mimeType || 'text/plain';

    // リンククリック時かページ余白クリック時かで分岐
    if (isLinkAction && info.linkUrl) {
      let linkText = info.selectionText || 'Link';
      if (tab && tab.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_LAST_LINK_TEXT' }, { frameId: info.frameId });
          if (response && response.text) {
            linkText = response.text;
          }
        } catch (err) {
          console.warn('Could not get link text from content script. Using fallback.', err);
        }
      }

      const faviconUrl = getFaviconUrl(info.linkUrl, faviconSize);
      const formatted = renderTemplate(targetTemplate.format, {
        title: linkText,
        url: info.linkUrl,
        faviconUrl: faviconUrl
      });
      // リッチテキスト非対応エディタ用（text/plain）にもオプションで指定された形式（formatted）を渡す
      await writeToOffscreenClipboard(formatted, mimeType, formatted);
    } else if (!isLinkAction) {
      await copyPageTabWithTemplate(tab, targetTemplate.id);
    }
  }
});

/**
 * キーボードショートカットコマンドの実行をハンドリングします。
 */
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'smart-copy') {
    let targetTab = tab;
    
    // タブが渡されなかった場合はアクティブなタブを取得
    if (!targetTab || !targetTab.id) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      targetTab = tabs[0];
    }

    if (!targetTab) {
      console.error('No active tab found for smart-copy command');
      return;
    }

    let resultText = '';
    let resultMimeType = 'text/plain';

    // 選択範囲がある場合は選択範囲のMarkdown化を優先
    if (targetTab.id) {
      try {
        const response = await chrome.tabs.sendMessage(targetTab.id, { type: 'GET_SMART_MARKDOWN' });
        if (response && response.markdown) {
          resultText = response.markdown;
          resultMimeType = 'text/plain';
        }
      } catch (err) {
        console.warn('Could not get markdown from content script for shortcut.', err);
      }
    }

    // 選択範囲がない場合は、ショートカット用の設定テンプレートでページ情報をコピー
    if (!resultText) {
      if (targetTab.url && targetTab.title) {
        const { includeFavicon, faviconSize, shortcutTemplateId, templates } = await chrome.storage.sync.get({ 
          includeFavicon: false,
          faviconSize: '16',
          shortcutTemplateId: 'markdown',
          templates: DEFAULT_TEMPLATES
        });

        const templateList: FormatTemplate[] = templates && templates.length > 0 ? templates : DEFAULT_TEMPLATES;
        const targetTemplate = templateList.find((t) => t.id === shortcutTemplateId) || templateList[0];
        const faviconUrl = getFaviconUrl(targetTab.url, faviconSize, targetTab.favIconUrl);
        resultMimeType = targetTemplate.mimeType || 'text/plain';

        resultText = formatPageWithTemplate(targetTemplate, {
          title: targetTab.title,
          url: targetTab.url,
          faviconUrl: faviconUrl,
          includeFavicon: Boolean(includeFavicon)
        });
      } else if (targetTab.url) {
        resultText = targetTab.url;
        resultMimeType = 'text/plain';
      }
    }

    if (resultText) {
      // リッチテキスト非対応エディタ用（text/plain）にも生成されたテキスト（resultText）を渡す
      await writeToOffscreenClipboard(resultText, resultMimeType, resultText);
    }
  }
});

/**
 * ポップアップからのコピー要求メッセージを受信してクリップボード処理を実行します。
 * @param message - ポップアップから送信されたメッセージオブジェクト
 * @param _sender - メッセージ送信元情報
 * @param sendResponse - コピー成否を返すコールバック関数
 * @returns 非同期応答を行う場合は true、それ以外は false
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.target === 'offscreen') {
    return false;
  }

  if (message.type === 'POPUP_COPY_PAGE') {
    (async () => {
      let targetTab: chrome.tabs.Tab | undefined;
      if (typeof message.tabId === 'number') {
        try {
          targetTab = await chrome.tabs.get(message.tabId);
        } catch (err) {
          console.warn('指定されたタブ情報の取得に失敗しました:', err);
        }
      }
      if (!targetTab) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        targetTab = tabs[0];
      }
      const success = await copyPageTabWithTemplate(targetTab, String(message.templateId || ''));
      sendResponse({ success });
    })().catch((err) => {
      console.error('POPUP_COPY_PAGE 処理中にエラーが発生しました:', err);
      sendResponse({ success: false });
    });
    return true;
  }

  if (message.type === 'POPUP_COPY_SELECTION') {
    (async () => {
      const markdown = typeof message.markdown === 'string' ? message.markdown : '';
      if (!markdown) {
        sendResponse({ success: false });
        return;
      }
      const success = await writeToOffscreenClipboard(markdown, 'text/plain', markdown);
      sendResponse({ success });
    })().catch((err) => {
      console.error('POPUP_COPY_SELECTION 処理中にエラーが発生しました:', err);
      sendResponse({ success: false });
    });
    return true;
  }

  return false;
});
