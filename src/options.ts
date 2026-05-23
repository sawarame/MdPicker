/**
 * オプション画面の制御を行うスクリプト。
 */

/**
 * 設定を保存します。
 */
const saveOptions = () => {
  const includeFavicon = (document.getElementById('include-favicon') as HTMLInputElement).checked;
  const faviconSize = (document.getElementById('favicon-size') as HTMLSelectElement).value;

  chrome.storage.sync.set(
    { 
      includeFavicon: includeFavicon,
      faviconSize: faviconSize
    },
    () => {
      const status = document.getElementById('status');
      if (status) {
        status.textContent = chrome.i18n.getMessage("optionsSaved");
        setTimeout(() => {
          status.textContent = '';
        }, 750);
      }
    }
  );
};

/**
 * 設定を読み込みます。
 */
const restoreOptions = () => {
  // ラベルの国際化
  const labelInclude = document.getElementById('label-include-favicon');
  if (labelInclude) {
    labelInclude.textContent = chrome.i18n.getMessage("optionIncludeFavicon");
  }
  const labelSize = document.getElementById('label-favicon-size');
  if (labelSize) {
    labelSize.textContent = chrome.i18n.getMessage("optionFaviconSize");
  }

  chrome.storage.sync.get(
    { 
      includeFavicon: false,
      faviconSize: '16'
    },
    (items) => {
      const includeCheckbox = document.getElementById('include-favicon') as HTMLInputElement;
      const sizeSelect = document.getElementById('favicon-size') as HTMLSelectElement;
      
      includeCheckbox.checked = items.includeFavicon;
      sizeSelect.value = items.faviconSize;
      
      toggleSizeVisibility(items.includeFavicon);
    }
  );
};

/**
 * faviconが無効な場合にサイズ選択を制御します。
 */
const toggleSizeVisibility = (visible: boolean) => {
  const container = document.getElementById('favicon-size-container');
  const sizeSelect = document.getElementById('favicon-size') as HTMLSelectElement;
  if (container) {
    container.style.opacity = visible ? '1' : '0.5';
  }
  if (sizeSelect) {
    sizeSelect.disabled = !visible;
  }
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('include-favicon')?.addEventListener('change', (e) => {
  toggleSizeVisibility((e.target as HTMLInputElement).checked);
  saveOptions();
});
document.getElementById('favicon-size')?.addEventListener('change', saveOptions);
