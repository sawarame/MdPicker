/**
 * ツールバーアイコンクリック時に表示されるコピーメニューポップアップを制御するスクリプト。
 */

import { FormatTemplate, DEFAULT_TEMPLATES, partitionTemplatesByPinned } from './template';

/** バックグラウンド側へのコピー要求メッセージの応答型 */
interface CopyResponse {
  /** クリップボードへの書き込みに成功したかどうか */
  success: boolean;
  /** エラー発生時のメッセージ */
  error?: string;
}

/** コピー完了後の自動クローズまでの待機時間（ミリ秒） */
const AUTO_CLOSE_DELAY_MS = 3000;

/** 選択範囲のMarkdownテキスト（存在しない場合は空文字） */
let cachedSelectionMarkdown = '';

/** コピー処理実行中かどうかのフラグ */
let isCopying = false;

/**
 * ステータスメッセージを指定した種別で表示します。
 * @param message - 表示するテキスト
 * @param isError - エラー表示にする場合は true
 */
function showStatus(message: string, isError: boolean = false): void {
  const statusEl = document.getElementById('popup-status');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = isError ? 'popup-status is-error' : 'popup-status is-success';
}

/**
 * メニュー内の操作可能なボタン群の有効・無効を一括で切り替えます。
 * @param disabled - 無効化する場合は true
 */
function setAllCopyButtonsDisabled(disabled: boolean): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.menu-item-btn');
  buttons.forEach((btn) => {
    if (disabled) {
      btn.disabled = true;
    } else if (btn.dataset.initiallyDisabled !== 'true') {
      btn.disabled = false;
    }
  });
}

/**
 * コピー処理を実行し、完了フィードバック表示後にポップアップを自動で閉じます。
 * @param action - 実行する非同期コピー処理
 */
async function executeCopyAndClose(action: () => Promise<CopyResponse>): Promise<void> {
  if (isCopying) return;
  isCopying = true;
  setAllCopyButtonsDisabled(true);

  try {
    const response = await action();
    if (response && response.success) {
      const copiedMsg = chrome.i18n.getMessage('popupCopied') || 'コピーしました';
      showStatus(copiedMsg, false);
      window.setTimeout(() => {
        window.close();
      }, AUTO_CLOSE_DELAY_MS);
    } else {
      const failedMsg = chrome.i18n.getMessage('popupCopyFailed') || 'コピーに失敗しました';
      showStatus(failedMsg, true);
      isCopying = false;
      setAllCopyButtonsDisabled(false);
    }
  } catch (err) {
    console.warn('ポップアップからのコピー処理中にエラーが発生しました:', err);
    const failedMsg = chrome.i18n.getMessage('popupCopyFailed') || 'コピーに失敗しました';
    showStatus(failedMsg, true);
    isCopying = false;
    setAllCopyButtonsDisabled(false);
  }
}

/**
 * 指定テンプレートを使って現在のアクティブタブをページコピーするボタン要素を生成します。
 * @param template - 対象のフォーマットテンプレート
 * @param labelText - ボタンに表示するラベル文字列
 * @param tabId - 対象タブID
 * @param pageAvailable - ページ情報が取得可能かどうか
 * @param isSubItem - サブメニュー配下の項目かどうか
 * @returns 生成されたボタン要素
 */
function createPageCopyButton(
  template: FormatTemplate,
  labelText: string,
  tabId: number | undefined,
  pageAvailable: boolean,
  isSubItem: boolean = false
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = isSubItem ? 'menu-item-btn menu-sub-item-btn' : 'menu-item-btn';
  btn.textContent = labelText;

  if (!pageAvailable) {
    btn.disabled = true;
    btn.dataset.initiallyDisabled = 'true';
    btn.title = chrome.i18n.getMessage('popupPageUnavailable') || 'このページの情報を取得できません';
  }

  btn.addEventListener('click', () => {
    if (!pageAvailable) return;
    void executeCopyAndClose(() =>
      chrome.runtime.sendMessage({
        type: 'POPUP_COPY_PAGE',
        templateId: template.id,
        tabId: tabId
      })
    );
  });

  return btn;
}

/**
 * 現在のアクティブタブで選択中のテキストを Markdown として取得します。
 * 特殊ページや Content Script 未注入環境では空文字を返します。
 * @param tabId - 確認対象のタブID
 * @returns 選択範囲の Markdown 文字列（未選択または取得不可時は空文字）
 */
async function fetchActiveSelectionMarkdown(tabId?: number): Promise<string> {
  if (tabId === undefined) {
    return '';
  }

  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_SMART_MARKDOWN' });
    if (response && typeof response.markdown === 'string') {
      return response.markdown;
    }
  } catch (err) {
    // chrome:// や未対応ページでは Content Script が存在しないため通常動作として空文字を返す
    console.debug('Content Script から選択範囲を取得できませんでした:', err);
  }

  return '';
}

/**
 * ポップアップ内のテンプレートメニューおよび各種ボタンを初期化・描画します。
 */
async function initializePopup(): Promise<void> {
  // ヘッダーのオプションボタンに多言語ラベルを適用
  const openOptionsBtn = document.getElementById('btn-open-options') as HTMLButtonElement | null;
  if (openOptionsBtn) {
    const openOptionsLabel = chrome.i18n.getMessage('contextMenuOpenOptions') || 'オプションを開く';
    openOptionsBtn.textContent = openOptionsLabel;
    openOptionsBtn.title = openOptionsLabel;
    openOptionsBtn.addEventListener('click', async () => {
      await chrome.runtime.openOptionsPage();
      window.close();
    });
  }

  // アクティブタブとストレージ設定を並列取得
  const [tabs, storageResult] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    chrome.storage.sync.get({ templates: DEFAULT_TEMPLATES })
  ]);

  const activeTab = tabs[0];
  const pageAvailable = Boolean(activeTab && activeTab.url);

  const rawTemplates: FormatTemplate[] = storageResult.templates;
  const templateList = rawTemplates && rawTemplates.length > 0 ? rawTemplates : DEFAULT_TEMPLATES;
  const { pinned, unpinned } = partitionTemplatesByPinned(templateList);

  const pinnedContainer = document.getElementById('pinned-menu-list');
  const otherSection = document.getElementById('other-formats-section');
  const otherToggleBtn = document.getElementById('btn-toggle-other') as HTMLButtonElement | null;
  const otherSubmenu = document.getElementById('other-formats-list');
  const selectionBtn = document.getElementById('btn-copy-selection') as HTMLButtonElement | null;

  // 1. ピン留めテンプレートのページリンクコピー項目を描画
  if (pinnedContainer) {
    pinnedContainer.innerHTML = '';
    pinned.forEach((template) => {
      const label =
        chrome.i18n.getMessage('contextMenuCopyPageAsFormat', [template.name]) ||
        `${template.name}形式でページのリンクを作成`;
      const btn = createPageCopyButton(template, label, activeTab?.id, pageAvailable, false);
      pinnedContainer.appendChild(btn);
    });
  }

  // 2. 未ピン留めテンプレートが1件以上ある場合は「その他の形式でコピー」セクションを構築
  if (otherSection && otherToggleBtn && otherSubmenu) {
    if (unpinned.length > 0) {
      otherSection.hidden = false;
      const otherLabel = chrome.i18n.getMessage('contextMenuOtherFormatsPage') || 'その他の形式でコピー';
      const labelSpan = otherToggleBtn.querySelector('.toggle-label');
      if (labelSpan) {
        labelSpan.textContent = otherLabel;
      } else {
        otherToggleBtn.textContent = otherLabel;
      }

      otherSubmenu.innerHTML = '';
      unpinned.forEach((template) => {
        const btn = createPageCopyButton(template, template.name, activeTab?.id, pageAvailable, true);
        otherSubmenu.appendChild(btn);
      });

      otherToggleBtn.addEventListener('click', () => {
        const isExpanded = otherToggleBtn.getAttribute('aria-expanded') === 'true';
        const nextExpanded = !isExpanded;
        otherToggleBtn.setAttribute('aria-expanded', String(nextExpanded));
        otherSubmenu.hidden = !nextExpanded;
      });
    } else {
      otherSection.hidden = true;
    }
  }

  // 3. 選択範囲をMarkdownとしてコピー項目の設定・選択有無確認
  if (selectionBtn) {
    selectionBtn.textContent =
      chrome.i18n.getMessage('contextMenuSelection') || '選択範囲をMarkdownとしてコピー';

    // 選択確認が完了するまでは非活性として誤操作を防ぐ
    selectionBtn.disabled = true;
    selectionBtn.dataset.initiallyDisabled = 'true';

    cachedSelectionMarkdown = await fetchActiveSelectionMarkdown(activeTab?.id);

    if (cachedSelectionMarkdown) {
      selectionBtn.disabled = false;
      selectionBtn.dataset.initiallyDisabled = 'false';
      selectionBtn.title = '';
    } else {
      selectionBtn.disabled = true;
      selectionBtn.dataset.initiallyDisabled = 'true';
      selectionBtn.title =
        chrome.i18n.getMessage('popupNoSelection') || 'ページ上でテキストが選択されていません';
    }

    selectionBtn.addEventListener('click', () => {
      if (!cachedSelectionMarkdown) return;
      void executeCopyAndClose(() =>
        chrome.runtime.sendMessage({
          type: 'POPUP_COPY_SELECTION',
          markdown: cachedSelectionMarkdown
        })
      );
    });
  }

  // ページ情報が利用できないタブの場合は案内を表示
  if (!pageAvailable) {
    showStatus(
      chrome.i18n.getMessage('popupPageUnavailable') || 'このページの情報を取得できません',
      true
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  void initializePopup();
});
