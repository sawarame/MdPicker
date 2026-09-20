/**
 * バックグラウンド処理およびコンテキストメニュー、ショートカットキーのハンドリングを行うスクリプト。
 */

import { FormatTemplate, DEFAULT_TEMPLATES, renderTemplate } from './template';

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
 * 保存されているテンプレート設定を読み込み、コンテキストメニューを再構築します。
 */
async function setupContextMenus(): Promise<void> {
  chrome.contextMenus.removeAll(async () => {
    // 既存の標準コンテキストメニュー（トップレベル）
    chrome.contextMenus.create({
      id: 'copy-as-markdown',
      title: chrome.i18n.getMessage('contextMenuTitle'),
      contexts: ['link']
    });

    chrome.contextMenus.create({
      id: 'copy-selection-as-markdown',
      title: chrome.i18n.getMessage('contextMenuSelection'),
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'copy-page-as-markdown',
      title: chrome.i18n.getMessage('contextMenuPage'),
      contexts: ['page']
    });

    // 「リンクを別形式でコピー」親メニューの作成
    chrome.contextMenus.create({
      id: 'copy-link-as-template-parent',
      title: chrome.i18n.getMessage('contextMenuCopyLinkAs') || 'リンクを別形式でコピー',
      contexts: ['link']
    });

    // 「このページを別形式でコピー」親メニューの作成
    chrome.contextMenus.create({
      id: 'copy-page-as-template-parent',
      title: chrome.i18n.getMessage('contextMenuCopyPageAs') || 'このページを別形式でコピー',
      contexts: ['page']
    });

    // ストレージからテンプレート一覧を取得
    const { templates } = await chrome.storage.sync.get({
      templates: DEFAULT_TEMPLATES
    });

    const templateList: FormatTemplate[] = templates && templates.length > 0 ? templates : DEFAULT_TEMPLATES;

    // 各テンプレートをサブメニューとして追加（リンク用およびページ用）
    templateList.forEach((t) => {
      // リンク用のサブ項目
      chrome.contextMenus.create({
        id: `template:link:${t.id}`,
        parentId: 'copy-link-as-template-parent',
        title: t.name,
        contexts: ['link']
      });

      // ページ用のサブ項目
      chrome.contextMenus.create({
        id: `template:page:${t.id}`,
        parentId: 'copy-page-as-template-parent',
        title: t.name,
        contexts: ['page']
      });
    });
  });
}

// 拡張機能インストール・アップデート時の初期化
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

// ブラウザ起動時の初期化
chrome.runtime.onStartup.addListener(() => {
  setupContextMenus();
});

// オプション画面等でテンプレート設定が変更された際にメニューを自動更新
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.templates) {
    setupContextMenus();
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
 * @param text - クリップボードに書き込む文字列
 */
async function writeToOffscreenClipboard(text: string): Promise<void> {
  try {
    await setupOffscreenDocument('offscreen.html');
    await chrome.runtime.sendMessage({
      type: 'copy-text-to-clipboard',
      target: 'offscreen',
      data: text
    });
    console.log('Text copied to clipboard successfully');
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
  }
}

/**
 * コンテキストメニューがクリックされた際の処理をハンドリングします。
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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
      await writeToOffscreenClipboard(formatted);
    } else if (tab && tab.url && tab.title) {
      const faviconUrl = getFaviconUrl(tab.url, faviconSize, tab.favIconUrl);
      const formatted = renderTemplate(targetTemplate.format, {
        title: tab.title,
        url: tab.url,
        faviconUrl: faviconUrl
      });
      await writeToOffscreenClipboard(formatted);
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

    // 選択範囲がある場合は選択範囲のMarkdown化を優先
    if (targetTab.id) {
      try {
        const response = await chrome.tabs.sendMessage(targetTab.id, { type: 'GET_SMART_MARKDOWN' });
        if (response && response.markdown) {
          resultText = response.markdown;
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

        // 標準Markdownでかつfavicon付与がONの場合は、favicon画像付きMarkdown形式を適用
        if (targetTemplate.id === 'markdown' && includeFavicon) {
          if (faviconUrl) {
            resultText = `![favicon](${faviconUrl}) [${targetTab.title}](${targetTab.url})`;
          } else {
            resultText = `[${targetTab.title}](${targetTab.url})`;
          }
        } else {
          resultText = renderTemplate(targetTemplate.format, {
            title: targetTab.title,
            url: targetTab.url,
            faviconUrl: faviconUrl
          });
        }
      } else if (targetTab.url) {
        resultText = targetTab.url;
      }
    }

    if (resultText) {
      await writeToOffscreenClipboard(resultText);
    }
  }
});
