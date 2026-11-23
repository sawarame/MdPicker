/**
 * 拡張機能全体の多言語（i18n）設定、ロケール解決、および翻訳メッセージ読み込みを管理するモジュール。
 */

/**
 * サポート対象のロケールコード一覧。
 */
export const SUPPORTED_LOCALES = ['en', 'ja', 'zh_CN', 'zh_TW', 'ko'] as const;

/**
 * サポート対象のロケールコード型。
 */
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * ユーザーが保存できる表示言語設定の型（'auto' はブラウザ言語への自動追従）。
 */
export type LanguageSetting = 'auto' | SupportedLocale;

/**
 * 未対応言語時のフォールバック先ロケール。
 */
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/**
 * chrome.storage.sync に保存する言語設定キー名。
 */
export const LANGUAGE_STORAGE_KEY = 'language';

/**
 * オプション画面の言語選択肢定義。
 */
export interface LanguageOption {
  /** ロケールコード */
  value: SupportedLocale;
  /** 自言語による表示ラベル（エンドニム） */
  label: string;
}

/**
 * オプション画面に表示する手動選択用言語一覧。
 */
export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'zh_CN', label: '简体中文' },
  { value: 'zh_TW', label: '繁體中文' },
  { value: 'ko', label: '한국어' }
] as const;

/**
 * Chrome messages.json 内のプレースホルダー定義型。
 */
export interface ChromeMessagePlaceholder {
  /** 置換内容（例: "$1"） */
  content: string;
  /** 例示文字列（任意） */
  example?: string;
}

/**
 * Chrome messages.json の1メッセージエントリ型。
 */
export interface ChromeMessageEntry {
  /** メッセージ本文 */
  message: string;
  /** メッセージの説明（任意） */
  description?: string;
  /** 名前付きプレースホルダー定義（任意） */
  placeholders?: Record<string, ChromeMessagePlaceholder>;
}

/**
 * ロケールごとのメッセージ辞書型。
 */
export type MessageCatalog = Record<string, ChromeMessageEntry>;

/**
 * 解決済みの多言語コンテキストインターフェース。
 */
export interface I18nContext {
  /** ストレージに設定されている値（'auto' またはロケールコード） */
  readonly setting: LanguageSetting;
  /** 実際に適用されているロケールコード */
  readonly locale: SupportedLocale;
  /** HTML の lang 属性に指定する BCP 47 形式の言語コード */
  readonly htmlLang: string;
  /**
   * メッセージキーから翻訳済み文字列を取得します。
   * @param key - messages.json のメッセージキー
   * @param substitutions - プレースホルダー置換引数（任意）
   * @returns 翻訳済み文字列（取得不可時は空文字）
   */
  getMessage: (key: string, substitutions?: string | string[]) => string;
}

/** 繁体字中国語として判定する地域・文字サブタグ集合 */
const TRADITIONAL_CHINESE_SUBTAGS = new Set(['tw', 'hk', 'mo', 'hant']);

/** 読み込み済みメッセージ辞書のメモリキャッシュ */
const catalogCache = new Map<SupportedLocale, MessageCatalog>();

/**
 * 値がサポート対象ロケールであるかを判定します。
 * @param value - 判定対象の値
 * @returns サポート対象ロケールの場合は true
 */
export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * ストレージ等から取得した言語設定値を正規化します。
 * 未設定または不正な値の場合は 'auto' を返します。
 * @param value - 正規化対象の言語設定値
 * @returns 正規化された言語設定（'auto' または SupportedLocale）
 */
export function normalizeLanguageSetting(value: unknown): LanguageSetting {
  if (value === 'auto') {
    return 'auto';
  }
  if (isSupportedLocale(value)) {
    return value;
  }
  return 'auto';
}

/**
 * ブラウザの UI 言語コードから対応する拡張機能ロケールを解決します。
 * 未対応の言語や空文字の場合は英語（'en'）へフォールバックします。
 * @param uiLanguage - ブラウザの言語タグ（例: 'ja', 'en-US', 'zh-TW', 'zh_CN', 'ko-KR'）
 * @returns 解決されたサポート対象ロケール
 */
export function resolveBrowserLocale(uiLanguage?: string): SupportedLocale {
  if (typeof uiLanguage !== 'string') {
    return DEFAULT_LOCALE;
  }

  const normalized = uiLanguage.trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) {
    return DEFAULT_LOCALE;
  }

  const parts = normalized.split('-').filter((part) => part.length > 0);
  const primary = parts[0];

  if (primary === 'ja') {
    return 'ja';
  }

  if (primary === 'ko') {
    return 'ko';
  }

  if (primary === 'zh') {
    const hasTraditionalSubtag = parts.slice(1).some((subtag) => TRADITIONAL_CHINESE_SUBTAGS.has(subtag));
    return hasTraditionalSubtag ? 'zh_TW' : 'zh_CN';
  }

  if (primary === 'en') {
    return 'en';
  }

  return DEFAULT_LOCALE;
}

/**
 * ユーザー言語設定とブラウザ言語から、実際に適用するロケールを決定します。
 * @param setting - ユーザー設定値（'auto' またはロケールコード）
 * @param browserLanguage - ブラウザの UI 言語タグ
 * @returns 適用するサポート対象ロケール
 */
export function resolveEffectiveLocale(setting: unknown, browserLanguage?: string): SupportedLocale {
  const normalizedSetting = normalizeLanguageSetting(setting);
  if (normalizedSetting === 'auto') {
    return resolveBrowserLocale(browserLanguage);
  }
  return normalizedSetting;
}

/**
 * サポート対象ロケールを HTML の lang 属性用形式（例: 'zh_CN' -> 'zh-CN'）へ変換します。
 * @param locale - サポート対象ロケール
 * @returns BCP 47 形式の言語コード
 */
export function localeToHtmlLang(locale: SupportedLocale): string {
  return locale.replace('_', '-');
}

/**
 * Chrome messages.json の仕様に準拠してプレースホルダー置換と $$ アンエスケープを行います。
 * @param entry - メッセージエントリ
 * @param substitutions - 置換文字列または置換文字列配列（任意）
 * @returns 展開済みメッセージ文字列
 */
export function formatChromeMessage(
  entry: ChromeMessageEntry,
  substitutions?: string | string[]
): string {
  const subs: string[] =
    substitutions === undefined
      ? []
      : Array.isArray(substitutions)
        ? substitutions
        : [substitutions];

  // 名前付きプレースホルダーの置換値を事前に解決（大文字・小文字を区別しない）
  const placeholderValues = new Map<string, string>();
  if (entry.placeholders) {
    for (const [name, placeholder] of Object.entries(entry.placeholders)) {
      if (!placeholder || typeof placeholder.content !== 'string') {
        continue;
      }
      const resolvedContent = placeholder.content.replace(
        /\$\$|\$([1-9])/g,
        (match: string, indexStr?: string) => {
          if (match === '$$') {
            return '$';
          }
          const idx = Number(indexStr) - 1;
          return subs[idx] ?? '';
        }
      );
      placeholderValues.set(name.toLowerCase(), resolvedContent);
    }
  }

  // 1パスの正規表現で $$、$NAME$、$1〜$9 を展開して二重置換を防止
  return entry.message.replace(
    /\$\$|\$([A-Za-z0-9_@]+)\$|\$([1-9])/g,
    (match: string, namedKey?: string, positionalIndex?: string) => {
      if (match === '$$') {
        return '$';
      }
      if (namedKey !== undefined) {
        const lowerKey = namedKey.toLowerCase();
        if (placeholderValues.has(lowerKey)) {
          return placeholderValues.get(lowerKey) ?? '';
        }
        return match;
      }
      if (positionalIndex !== undefined) {
        const idx = Number(positionalIndex) - 1;
        return subs[idx] ?? '';
      }
      return match;
    }
  );
}

/**
 * 主辞書・英語フォールバック辞書・最終フォールバック関数からメッセージ取得関数を生成します。
 * @param primaryCatalog - 適用ロケールのメッセージ辞書
 * @param fallbackCatalog - フォールバック用（英語）メッセージ辞書
 * @param fallbackFn - 辞書から取得できなかった場合の最終フォールバック関数（任意）
 * @returns キーと置換引数から翻訳文字列を返す関数
 */
export function createMessageGetter(
  primaryCatalog: MessageCatalog | null,
  fallbackCatalog: MessageCatalog | null,
  fallbackFn?: (key: string, substitutions?: string | string[]) => string
): (key: string, substitutions?: string | string[]) => string {
  return (key: string, substitutions?: string | string[]): string => {
    const primaryEntry = primaryCatalog?.[key];
    if (primaryEntry && typeof primaryEntry.message === 'string' && primaryEntry.message.length > 0) {
      return formatChromeMessage(primaryEntry, substitutions);
    }

    const fallbackEntry = fallbackCatalog?.[key];
    if (fallbackEntry && typeof fallbackEntry.message === 'string' && fallbackEntry.message.length > 0) {
      return formatChromeMessage(fallbackEntry, substitutions);
    }

    if (fallbackFn) {
      return fallbackFn(key, substitutions) || '';
    }

    return '';
  };
}

/**
 * 現在のブラウザ UI 言語タグを取得します。
 * @returns ブラウザの言語タグ（取得できない場合は英語）
 */
export function getBrowserUiLanguage(): string {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
      return chrome.i18n.getUILanguage();
    }
  } catch (err) {
    console.warn('chrome.i18n.getUILanguage の取得に失敗しました:', err);
  }

  if (typeof navigator !== 'undefined' && typeof navigator.language === 'string') {
    return navigator.language;
  }

  return DEFAULT_LOCALE;
}

/**
 * 指定ロケールの messages.json を拡張機能パッケージから読み込みます。
 * 読み込み済みの辞書はメモリにキャッシュして再利用します。
 * @param locale - 読み込み対象のロケールコード
 * @returns 読み込んだメッセージ辞書（失敗時は null）
 */
export async function loadMessageCatalog(locale: SupportedLocale): Promise<MessageCatalog | null> {
  const cached = catalogCache.get(locale);
  if (cached) {
    return cached;
  }

  try {
    if (typeof chrome === 'undefined' || !chrome.runtime || typeof chrome.runtime.getURL !== 'function') {
      return null;
    }

    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`ロケールファイル (${locale}) の読み込みに失敗しました: HTTP ${response.status}`);
      return null;
    }

    const data = (await response.json()) as MessageCatalog;
    if (data && typeof data === 'object') {
      catalogCache.set(locale, data);
      return data;
    }
  } catch (err) {
    console.warn(`ロケールファイル (${locale}) の取得中にエラーが発生しました:`, err);
  }

  return null;
}

/**
 * ストレージの言語設定（または引数で指定した言語設定）に基づいて多言語コンテキストを構築します。
 * @param explicitLanguageSetting - 明示的に適用する言語設定（省略時は chrome.storage.sync から読み込み）
 * @returns 構築された多言語コンテキスト
 */
export async function loadI18nContext(explicitLanguageSetting?: unknown): Promise<I18nContext> {
  let rawSetting: unknown = explicitLanguageSetting;

  if (rawSetting === undefined) {
    try {
      const stored = await chrome.storage.sync.get({ [LANGUAGE_STORAGE_KEY]: 'auto' });
      rawSetting = stored[LANGUAGE_STORAGE_KEY];
    } catch (err) {
      console.warn('言語設定の読み込みに失敗したため自動設定を使用します:', err);
      rawSetting = 'auto';
    }
  }

  const setting = normalizeLanguageSetting(rawSetting);
  const locale = resolveEffectiveLocale(setting, getBrowserUiLanguage());

  let primaryCatalog: MessageCatalog | null = null;
  let fallbackCatalog: MessageCatalog | null = null;

  if (locale === DEFAULT_LOCALE) {
    fallbackCatalog = await loadMessageCatalog(DEFAULT_LOCALE);
    primaryCatalog = fallbackCatalog;
  } else {
    [primaryCatalog, fallbackCatalog] = await Promise.all([
      loadMessageCatalog(locale),
      loadMessageCatalog(DEFAULT_LOCALE)
    ]);
  }

  const chromeFallback = (key: string, substitutions?: string | string[]): string => {
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
        return chrome.i18n.getMessage(key, substitutions) || '';
      }
    } catch (err) {
      console.warn(`chrome.i18n.getMessage(${key}) の呼び出しに失敗しました:`, err);
    }
    return '';
  };

  return {
    setting,
    locale,
    htmlLang: localeToHtmlLang(locale),
    getMessage: createMessageGetter(primaryCatalog, fallbackCatalog, chromeFallback)
  };
}
