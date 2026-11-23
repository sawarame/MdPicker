/**
 * オプション画面の制御およびテンプレート管理を行うスクリプト。
 */

import { FormatTemplate, DEFAULT_TEMPLATES, ClipboardMimeType, isTemplatePinned, reorderTemplates } from './template';
import {
  I18nContext,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  loadI18nContext,
  normalizeLanguageSetting
} from './i18n';

/**
 * 現在管理されているテンプレート一覧のインメモリ配列。
 */
let currentTemplates: FormatTemplate[] = [];

/**
 * 現在適用されている多言語コンテキスト。
 */
let currentI18n: I18nContext | null = null;

/**
 * 言語切り替えの非同期処理競合を防ぐための世代カウンター。
 */
let languageSwitchVersion = 0;

/**
 * ドラッグ中のテンプレート行のインデックス番号。ドラッグ中でない場合は null。
 */
let dragSourceIndex: number | null = null;

/**
 * 現在適用されている言語設定に従って翻訳メッセージを取得します。
 * @param key - messages.json のメッセージキー
 * @param substitutions - プレースホルダー置換引数（任意）
 * @returns 翻訳済み文字列
 */
const getLocalizedMessage = (key: string, substitutions?: string | string[]): string => {
  if (currentI18n) {
    return currentI18n.getMessage(key, substitutions);
  }
  return chrome.i18n.getMessage(key, substitutions) || '';
};

/**
 * 保存完了ステータスを表示します。
 */
const showSavedStatus = (): void => {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = getLocalizedMessage('optionsSaved') || 'Options saved';
    status.style.color = '#28a745';
    setTimeout(() => {
      status.textContent = '';
      status.style.color = '';
    }, 1000);
  }
};

/**
 * エラーステータスを表示します。
 * @param message - 表示するエラーメッセージ文字列
 */
const showErrorStatus = (message: string): void => {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = message;
    status.style.color = '#d73a49';
    setTimeout(() => {
      status.textContent = '';
      status.style.color = '';
    }, 3000);
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
 * @param onSaved - 再描画後に実行する任意のコールバック関数
 */
const saveTemplates = (onSaved?: () => void): void => {
  chrome.storage.sync.set(
    { templates: currentTemplates },
    () => {
      renderTemplates();
      showSavedStatus();
      if (onSaved) {
        onSaved();
      }
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
 * テーブル行からドラッグ時のドロップ先ハイライト表示をすべて除去します。
 * @param tbody - テンプレート一覧の tbody 要素
 */
const clearDragIndicators = (tbody: HTMLElement): void => {
  tbody.querySelectorAll('tr').forEach((row) => {
    row.classList.remove('drag-over-above', 'drag-over-below');
  });
};

/**
 * ドラッグオーバーまたはドロップ時のカーソル位置から移動先の配列インデックスを算出します。
 * @param fromIndex - 移動元のインデックス番号
 * @param hoverIndex - カーソルが乗っている行のインデックス番号
 * @param insertAfter - 行の下半分（後ろ）に挿入する場合は true、上半分（前）の場合は false
 * @returns 移動先の配列インデックス番号
 */
const calculateDropTargetIndex = (fromIndex: number, hoverIndex: number, insertAfter: boolean): number => {
  if (fromIndex < hoverIndex) {
    return insertAfter ? hoverIndex : hoverIndex - 1;
  }
  return insertAfter ? hoverIndex + 1 : hoverIndex;
};

/**
 * 移動後に同じテンプレートの移動ボタンへキーボードフォーカスを戻します。
 * @param templateId - 移動したテンプレートのID
 * @param preferredDirection - 優先してフォーカスする移動方向
 */
const restoreMoveButtonFocus = (templateId: string, preferredDirection: 'up' | 'down'): void => {
  const tbody = document.getElementById('template-table-body');
  if (!tbody) return;

  const targetRow = tbody.querySelector<HTMLTableRowElement>(`tr[data-template-id="${CSS.escape(templateId)}"]`);
  if (!targetRow) return;

  const preferredBtn = targetRow.querySelector<HTMLButtonElement>(`button[data-move="${preferredDirection}"]`);
  if (preferredBtn && !preferredBtn.disabled) {
    preferredBtn.focus();
    return;
  }

  // 端まで到達して優先方向が無効になった場合は反対側のボタンへフォーカスを移す
  const fallbackDirection = preferredDirection === 'up' ? 'down' : 'up';
  const fallbackBtn = targetRow.querySelector<HTMLButtonElement>(`button[data-move="${fallbackDirection}"]`);
  if (fallbackBtn && !fallbackBtn.disabled) {
    fallbackBtn.focus();
  }
};

/**
 * 指定位置のテンプレートを別の位置へ移動し、設定を保存して再描画します。
 * @param fromIndex - 移動元のインデックス番号
 * @param toIndex - 移動先のインデックス番号
 * @param focusDirection - ボタン操作による移動時にフォーカスを復元する方向（任意）
 */
const moveTemplate = (fromIndex: number, toIndex: number, focusDirection?: 'up' | 'down'): void => {
  if (fromIndex === toIndex) return;
  const targetTemplate = currentTemplates[fromIndex];
  if (!targetTemplate) return;

  const reordered = reorderTemplates(currentTemplates, fromIndex, toIndex);
  currentTemplates = reordered;

  saveTemplates(() => {
    if (focusDirection) {
      restoreMoveButtonFocus(targetTemplate.id, focusDirection);
    }
  });
};

/**
 * 並び替え操作セル（ドラッグハンドルおよび上下移動ボタン）を生成します。
 * @param index - 対象テンプレートのインデックス番号
 * @returns 生成された td 要素
 */
const createOrderCell = (index: number): HTMLTableCellElement => {
  const tdOrder = document.createElement('td');
  tdOrder.className = 'col-order';

  const controls = document.createElement('div');
  controls.className = 'order-controls';

  const dragHandle = document.createElement('span');
  dragHandle.className = 'drag-handle';
  dragHandle.textContent = '⋮⋮';
  const dragLabel = getLocalizedMessage('optionsDragHandle') || 'Drag to reorder';
  dragHandle.title = dragLabel;
  dragHandle.setAttribute('aria-label', dragLabel);
  if (currentTemplates.length <= 1) {
    dragHandle.style.opacity = '0.35';
    dragHandle.style.cursor = 'default';
  }
  controls.appendChild(dragHandle);

  const upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.className = 'btn-move';
  upBtn.dataset.move = 'up';
  upBtn.textContent = '↑';
  const upLabel = getLocalizedMessage('optionsMoveUp') || 'Move up';
  upBtn.title = upLabel;
  upBtn.setAttribute('aria-label', upLabel);
  upBtn.disabled = index === 0;
  upBtn.addEventListener('click', () => {
    moveTemplate(index, index - 1, 'up');
  });
  controls.appendChild(upBtn);

  const downBtn = document.createElement('button');
  downBtn.type = 'button';
  downBtn.className = 'btn-move';
  downBtn.dataset.move = 'down';
  downBtn.textContent = '↓';
  const downLabel = getLocalizedMessage('optionsMoveDown') || 'Move down';
  downBtn.title = downLabel;
  downBtn.setAttribute('aria-label', downLabel);
  downBtn.disabled = index === currentTemplates.length - 1;
  downBtn.addEventListener('click', () => {
    moveTemplate(index, index + 1, 'down');
  });
  controls.appendChild(downBtn);

  tdOrder.appendChild(controls);
  return tdOrder;
};

/**
 * テンプレート行にドラッグ＆ドロップによる並び替えイベントを登録します。
 * @param tr - 対象の tr 要素
 * @param tbody - 親の tbody 要素
 * @param index - 対象テンプレートのインデックス番号
 */
const attachRowDragEvents = (tr: HTMLTableRowElement, tbody: HTMLElement, index: number): void => {
  if (currentTemplates.length <= 1) {
    tr.draggable = false;
    return;
  }

  tr.draggable = true;

  tr.addEventListener('dragstart', (e: DragEvent) => {
    dragSourceIndex = index;
    tr.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  });

  tr.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    if (dragSourceIndex === null || dragSourceIndex === index) {
      clearDragIndicators(tbody);
      return;
    }

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    const rect = tr.getBoundingClientRect();
    const insertAfter = e.clientY >= rect.top + rect.height / 2;
    const toIndex = calculateDropTargetIndex(dragSourceIndex, index, insertAfter);

    clearDragIndicators(tbody);
    if (toIndex !== dragSourceIndex) {
      tr.classList.add(insertAfter ? 'drag-over-below' : 'drag-over-above');
    }
  });

  tr.addEventListener('dragleave', () => {
    tr.classList.remove('drag-over-above', 'drag-over-below');
  });

  tr.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();
    clearDragIndicators(tbody);
    if (dragSourceIndex === null || dragSourceIndex === index) {
      return;
    }

    const rect = tr.getBoundingClientRect();
    const insertAfter = e.clientY >= rect.top + rect.height / 2;
    const toIndex = calculateDropTargetIndex(dragSourceIndex, index, insertAfter);
    const fromIndex = dragSourceIndex;
    dragSourceIndex = null;

    moveTemplate(fromIndex, toIndex);
  });

  tr.addEventListener('dragend', () => {
    dragSourceIndex = null;
    tr.classList.remove('dragging');
    clearDragIndicators(tbody);
  });
};

/**
 * テンプレートテーブルとショートカット選択肢を描画します。
 */
const renderTemplates = (): void => {
  const tbody = document.getElementById('template-table-body');
  if (!tbody) return;

  dragSourceIndex = null;
  tbody.innerHTML = '';

  currentTemplates.forEach((template, index) => {
    const tr = document.createElement('tr');
    tr.dataset.templateId = template.id;

    // 並び替え操作列（ドラッグハンドル・上下移動ボタン）
    tr.appendChild(createOrderCell(index));
    attachRowDragEvents(tr, tbody, index);

    // ピン留め（トップレベル表示）
    const tdPinned = document.createElement('td');
    tdPinned.className = 'col-pinned cell-pinned';
    const pinCheckbox = document.createElement('input');
    pinCheckbox.type = 'checkbox';
    pinCheckbox.checked = isTemplatePinned(template);
    pinCheckbox.title = getLocalizedMessage('optionsThPinned') || 'Pin to top';
    pinCheckbox.addEventListener('change', () => {
      template.pinned = pinCheckbox.checked;
      saveTemplates();
    });
    tdPinned.appendChild(pinCheckbox);
    tr.appendChild(tdPinned);

    // テンプレート名
    const tdName = document.createElement('td');
    tdName.className = 'col-name';
    tdName.textContent = template.name;
    tr.appendChild(tdName);

    // MIMEタイプ
    const tdMime = document.createElement('td');
    tdMime.className = 'col-mimetype';
    tdMime.textContent = template.mimeType || 'text/plain';
    tr.appendChild(tdMime);

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
    deleteBtn.textContent = getLocalizedMessage('optionsDelete') || 'Delete';
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
    showErrorStatus('少なくとも1つのテンプレートが必要です。');
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
  const mimeSelect = document.getElementById('new-template-mimetype') as HTMLSelectElement;
  const formatInput = document.getElementById('new-template-format') as HTMLInputElement;

  const name = nameInput.value.trim();
  const mimeType = (mimeSelect ? mimeSelect.value : 'text/plain') as ClipboardMimeType;
  const format = formatInput.value.trim();

  if (!name || !format) {
    showErrorStatus('名前と形式を両方入力してください。');
    return;
  }

  const newTemplate: FormatTemplate = {
    id: `custom-${Date.now()}`,
    name: name,
    format: format,
    mimeType: mimeType,
    pinned: false
  };

  currentTemplates.push(newTemplate);
  nameInput.value = '';
  formatInput.value = '';
  if (mimeSelect) {
    mimeSelect.value = 'text/plain';
  }

  saveTemplates();
};

/** リセット確認待機中かどうかのフラグ */
let isResetConfirming = false;
/** リセット確認タイマーID */
let resetTimer: number | null = null;

/**
 * テンプレートを初期プリセットにリセットします。
 * ポップアップ画面でも確実に動作するよう、ブラウザの confirm() に依存せず
 * ボタンのインライン切り替えによる2段階確認を行います。
 */
const resetTemplates = (): void => {
  const btn = document.getElementById('btn-reset-templates') as HTMLButtonElement;
  if (!btn) return;

  if (!isResetConfirming) {
    // 1回目のクリック: 確認状態へ移行
    isResetConfirming = true;
    const confirmMsg = getLocalizedMessage('optionsResetConfirm') || 'Click again to confirm reset';
    btn.textContent = confirmMsg;
    btn.style.backgroundColor = '#d73a49';
    btn.style.color = '#ffffff';
    btn.style.borderColor = '#d73a49';

    // 4秒間再クリックがなければ通常表示に戻す
    if (resetTimer !== null) {
      window.clearTimeout(resetTimer);
    }
    resetTimer = window.setTimeout(() => {
      isResetConfirming = false;
      resetTimer = null;
      btn.textContent = getLocalizedMessage('optionsResetTemplates') || 'Reset to default templates';
      btn.style.backgroundColor = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 4000);
    return;
  }

  // 2回目のクリック: リセット処理を実行
  if (resetTimer !== null) {
    window.clearTimeout(resetTimer);
    resetTimer = null;
  }
  isResetConfirming = false;
  btn.textContent = getLocalizedMessage('optionsResetTemplates') || 'Reset to default templates';
  btn.style.backgroundColor = '';
  btn.style.color = '';
  btn.style.borderColor = '';

  currentTemplates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
  chrome.storage.sync.set({ shortcutTemplateId: 'markdown' }, () => {
    saveTemplates();
  });
};

/**
 * 表示言語ドロップダウンの選択肢を構築・更新します。
 * @param selectedSetting - 選択状態にする言語設定値
 */
const renderLanguageOptions = (selectedSetting: string): void => {
  const languageSelect = document.getElementById('language-select') as HTMLSelectElement | null;
  if (!languageSelect) return;

  const autoLabel = getLocalizedMessage('optionLanguageAuto') || 'Auto (Browser language)';
  languageSelect.innerHTML = '';

  const autoOpt = document.createElement('option');
  autoOpt.value = 'auto';
  autoOpt.textContent = autoLabel;
  languageSelect.appendChild(autoOpt);

  LANGUAGE_OPTIONS.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    languageSelect.appendChild(opt);
  });

  languageSelect.value = normalizeLanguageSetting(selectedSetting);
};

/**
 * 表示言語設定を保存し、リロード不要でオプション画面全体へ即時反映します。
 */
const saveLanguageOption = async (): Promise<void> => {
  const languageSelect = document.getElementById('language-select') as HTMLSelectElement | null;
  if (!languageSelect) return;

  const nextLanguage = normalizeLanguageSetting(languageSelect.value);
  const currentVersion = ++languageSwitchVersion;

  await chrome.storage.sync.set({ [LANGUAGE_STORAGE_KEY]: nextLanguage });
  const nextI18n = await loadI18nContext(nextLanguage);

  if (currentVersion !== languageSwitchVersion) {
    return;
  }

  currentI18n = nextI18n;
  renderLanguageOptions(currentI18n.setting);
  applyLocalization();
  renderTemplates();
  showSavedStatus();
};

/**
 * 各種テキストラベルを国際化対応（i18n）して適用します。
 */
const applyLocalization = (): void => {
  if (currentI18n) {
    document.documentElement.lang = currentI18n.htmlLang;
  }

  const elementsToLocalize: Array<{ id: string; key: string }> = [
    { id: 'label-language', key: 'optionLanguage' },
    { id: 'label-include-favicon', key: 'optionIncludeFavicon' },
    { id: 'label-favicon-size', key: 'optionFaviconSize' },
    { id: 'heading-templates', key: 'optionsTemplatesTitle' },
    { id: 'desc-templates', key: 'optionsTemplatesDesc' },
    { id: 'label-shortcut-template', key: 'optionsShortcutTemplate' },
    { id: 'th-order', key: 'optionsThOrder' },
    { id: 'th-pinned', key: 'optionsThPinned' },
    { id: 'th-name', key: 'optionsThName' },
    { id: 'th-mimetype', key: 'optionsThMimeType' },
    { id: 'th-format', key: 'optionsThFormat' },
    { id: 'th-actions', key: 'optionsThActions' },
    {
      id: 'btn-reset-templates',
      key: isResetConfirming ? 'optionsResetConfirm' : 'optionsResetTemplates'
    },
    { id: 'btn-add-template', key: 'optionsAddTemplate' },
    { id: 'variables-help', key: 'optionsVariablesHelp' }
  ];

  elementsToLocalize.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      const msg = getLocalizedMessage(key);
      if (msg) el.textContent = msg;
    }
  });

  const nameInput = document.getElementById('new-template-name') as HTMLInputElement;
  if (nameInput) {
    nameInput.placeholder = getLocalizedMessage('optionsTemplateNamePlaceholder') || 'Name';
  }

  const formatInput = document.getElementById('new-template-format') as HTMLInputElement;
  if (formatInput) {
    formatInput.placeholder = getLocalizedMessage('optionsTemplateFormatPlaceholder') || 'Format';
  }
};

/**
 * 保存された設定をストレージから読み込み、画面に反映します。
 */
const restoreOptions = async (): Promise<void> => {
  const items = await chrome.storage.sync.get({
    includeFavicon: false,
    faviconSize: '16',
    templates: DEFAULT_TEMPLATES,
    shortcutTemplateId: 'markdown',
    [LANGUAGE_STORAGE_KEY]: 'auto'
  });

  currentI18n = await loadI18nContext(items[LANGUAGE_STORAGE_KEY]);
  renderLanguageOptions(currentI18n.setting);
  applyLocalization();

  const includeCheckbox = document.getElementById('include-favicon') as HTMLInputElement;
  const sizeSelect = document.getElementById('favicon-size') as HTMLSelectElement;

  includeCheckbox.checked = Boolean(items.includeFavicon);
  sizeSelect.value = String(items.faviconSize || '16');

  toggleSizeVisibility(Boolean(items.includeFavicon));

  const rawTemplates: FormatTemplate[] =
    items.templates && items.templates.length > 0
      ? items.templates
      : JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));

  // 既存設定に mimeType や pinned が未設定の場合は補完（HTMLプリセットは text/html、その他は text/plain）
  currentTemplates = rawTemplates.map((t: FormatTemplate) => ({
    ...t,
    mimeType: t.mimeType || (t.id === 'html' ? 'text/html' : 'text/plain'),
    pinned: isTemplatePinned(t)
  }));

  renderTemplates();
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
document.addEventListener('DOMContentLoaded', () => {
  void restoreOptions();
});

document.getElementById('language-select')?.addEventListener('change', () => {
  void saveLanguageOption();
});

document.getElementById('include-favicon')?.addEventListener('change', (e) => {
  toggleSizeVisibility((e.target as HTMLInputElement).checked);
  saveBaseOptions();
});

document.getElementById('favicon-size')?.addEventListener('change', saveBaseOptions);
document.getElementById('shortcut-template')?.addEventListener('change', saveShortcutOption);
document.getElementById('btn-add-template')?.addEventListener('click', addTemplate);
document.getElementById('btn-reset-templates')?.addEventListener('click', resetTemplates);
