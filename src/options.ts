/**
 * オプション画面の制御およびテンプレート管理を行うスクリプト。
 */

import { FormatTemplate, DEFAULT_TEMPLATES } from './template';

/**
 * 現在管理されているテンプレート一覧のインメモリ配列。
 */
let currentTemplates: FormatTemplate[] = [];

/**
 * 保存完了ステータスを表示します。
 */
const showSavedStatus = (): void => {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = chrome.i18n.getMessage('optionsSaved');
    setTimeout(() => {
      status.textContent = '';
    }, 1000);
  }
};

/**
 * 基本オプション（ファビコン設定）を保存します。
 */
const saveBaseOptions = (): void => {
  const includeFavicon = (document.getElementById('include-favicon') as HTMLInputElement).checked;
  const faviconSize = (document.getElementById('favicon-size') as HTMLSelectElement).value;

  chrome.storage.sync.set(
    { 
      includeFavicon: includeFavicon,
      faviconSize: faviconSize
    },
    () => {
      showSavedStatus();
    }
  );
};

/**
 * ショートカット実行時のテンプレート設定を保存します。
 */
const saveShortcutOption = (): void => {
  const shortcutSelect = document.getElementById('shortcut-template') as HTMLSelectElement;
  const shortcutTemplateId = shortcutSelect.value;

  chrome.storage.sync.set(
    { shortcutTemplateId: shortcutTemplateId },
    () => {
      showSavedStatus();
    }
  );
};

/**
 * テンプレート一覧を保存し、画面を再描画します。
 */
const saveTemplates = (): void => {
  chrome.storage.sync.set(
    { templates: currentTemplates },
    () => {
      renderTemplates();
      showSavedStatus();
    }
  );
};

/**
 * ショートカット選択ドロップダウンの選択肢を更新します。
 * @param selectedId - 選択状態にするテンプレートID
 */
const updateShortcutSelect = (selectedId: string): void => {
  const shortcutSelect = document.getElementById('shortcut-template') as HTMLSelectElement;
  if (!shortcutSelect) return;

  shortcutSelect.innerHTML = '';
  currentTemplates.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.name} (${t.format})`;
    if (t.id === selectedId) {
      opt.selected = true;
    }
    shortcutSelect.appendChild(opt);
  });
};

/**
 * テンプレートテーブルとショートカット選択肢を描画します。
 */
const renderTemplates = (): void => {
  const tbody = document.getElementById('template-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  currentTemplates.forEach((template, index) => {
    const tr = document.createElement('tr');

    // テンプレート名
    const tdName = document.createElement('td');
    tdName.className = 'col-name';
    tdName.textContent = template.name;
    tr.appendChild(tdName);

    // フォーマット文字列
    const tdFormat = document.createElement('td');
    tdFormat.className = 'col-format';
    tdFormat.textContent = template.format;
    tr.appendChild(tdFormat);

    // 操作（削除ボタン）
    const tdActions = document.createElement('td');
    tdActions.className = 'col-actions';
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = chrome.i18n.getMessage('optionsDelete') || '削除';
    deleteBtn.addEventListener('click', () => {
      deleteTemplate(index);
    });
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  // 現在選択されているショートカット用IDを反映
  chrome.storage.sync.get({ shortcutTemplateId: 'markdown' }, (res) => {
    updateShortcutSelect(res.shortcutTemplateId);
  });
};

/**
 * 指定したインデックスのテンプレートを削除します。
 * @param index - 削除対象のインデックス番号
 */
const deleteTemplate = (index: number): void => {
  if (currentTemplates.length <= 1) {
    alert('少なくとも1つのテンプレートが必要です。');
    return;
  }
  const deleted = currentTemplates.splice(index, 1)[0];
  
  // もし削除したものがショートカット用だった場合、先頭のテンプレートを割り当てる
  chrome.storage.sync.get({ shortcutTemplateId: 'markdown' }, (res) => {
    if (res.shortcutTemplateId === deleted.id) {
      chrome.storage.sync.set({ shortcutTemplateId: currentTemplates[0].id });
    }
    saveTemplates();
  });
};

/**
 * 新規テンプレートを追加します。
 */
const addTemplate = (): void => {
  const nameInput = document.getElementById('new-template-name') as HTMLInputElement;
  const formatInput = document.getElementById('new-template-format') as HTMLInputElement;

  const name = nameInput.value.trim();
  const format = formatInput.value.trim();

  if (!name || !format) {
    alert('名前と形式を両方入力してください。');
    return;
  }

  const newTemplate: FormatTemplate = {
    id: `custom-${Date.now()}`,
    name: name,
    format: format
  };

  currentTemplates.push(newTemplate);
  nameInput.value = '';
  formatInput.value = '';

  saveTemplates();
};

/**
 * テンプレートを初期プリセットにリセットします。
 */
const resetTemplates = (): void => {
  if (confirm('テンプレート一覧を初期状態に戻しますか？')) {
    currentTemplates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
    chrome.storage.sync.set({ shortcutTemplateId: 'markdown' }, () => {
      saveTemplates();
    });
  }
};

/**
 * 各種テキストラベルを国際化対応（i18n）して適用します。
 */
const applyLocalization = (): void => {
  const elementsToLocalize: Array<{ id: string; key: string }> = [
    { id: 'label-include-favicon', key: 'optionIncludeFavicon' },
    { id: 'label-favicon-size', key: 'optionFaviconSize' },
    { id: 'heading-templates', key: 'optionsTemplatesTitle' },
    { id: 'desc-templates', key: 'optionsTemplatesDesc' },
    { id: 'label-shortcut-template', key: 'optionsShortcutTemplate' },
    { id: 'btn-reset-templates', key: 'optionsResetTemplates' },
    { id: 'btn-add-template', key: 'optionsAddTemplate' },
    { id: 'variables-help', key: 'optionsVariablesHelp' }
  ];

  elementsToLocalize.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      const msg = chrome.i18n.getMessage(key);
      if (msg) el.textContent = msg;
    }
  });

  const nameInput = document.getElementById('new-template-name') as HTMLInputElement;
  if (nameInput) {
    nameInput.placeholder = chrome.i18n.getMessage('optionsTemplateNamePlaceholder') || 'Name';
  }

  const formatInput = document.getElementById('new-template-format') as HTMLInputElement;
  if (formatInput) {
    formatInput.placeholder = chrome.i18n.getMessage('optionsTemplateFormatPlaceholder') || 'Format';
  }
};

/**
 * 保存された設定をストレージから読み込み、画面に反映します。
 */
const restoreOptions = (): void => {
  applyLocalization();

  chrome.storage.sync.get(
    { 
      includeFavicon: false,
      faviconSize: '16',
      templates: DEFAULT_TEMPLATES,
      shortcutTemplateId: 'markdown'
    },
    (items) => {
      const includeCheckbox = document.getElementById('include-favicon') as HTMLInputElement;
      const sizeSelect = document.getElementById('favicon-size') as HTMLSelectElement;
      
      includeCheckbox.checked = items.includeFavicon;
      sizeSelect.value = items.faviconSize;
      
      toggleSizeVisibility(items.includeFavicon);

      currentTemplates = items.templates && items.templates.length > 0 
        ? items.templates 
        : JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));

      renderTemplates();
    }
  );
};

/**
 * ファビコンが無効な場合にサイズ選択ドロップダウンを非活性化します。
 * @param visible - ファビコン設定が有効かどうか
 */
const toggleSizeVisibility = (visible: boolean): void => {
  const container = document.getElementById('favicon-size-container');
  const sizeSelect = document.getElementById('favicon-size') as HTMLSelectElement;
  if (container) {
    container.style.opacity = visible ? '1' : '0.5';
  }
  if (sizeSelect) {
    sizeSelect.disabled = !visible;
  }
};

// イベントリスナーの登録
document.addEventListener('DOMContentLoaded', restoreOptions);

document.getElementById('include-favicon')?.addEventListener('change', (e) => {
  toggleSizeVisibility((e.target as HTMLInputElement).checked);
  saveBaseOptions();
});

document.getElementById('favicon-size')?.addEventListener('change', saveBaseOptions);
document.getElementById('shortcut-template')?.addEventListener('change', saveShortcutOption);
document.getElementById('btn-add-template')?.addEventListener('click', addTemplate);
document.getElementById('btn-reset-templates')?.addEventListener('click', resetTemplates);
