/**
 * テンプレート置換およびフォーマット定義を管理するモジュール。
 */

/**
 * フォーマットテンプレートの定義を表すインターフェース。
 */
export interface FormatTemplate {
  /** テンプレートの一意な識別子 */
  id: string;
  /** テンプレートの表示名 */
  name: string;
  /** テンプレートの書式文字列（例: '[${title}](${url})'） */
  format: string;
}

/**
 * テンプレート置換処理に渡すコンテキスト情報。
 */
export interface TemplateContext {
  /** リンクまたはページのタイトル */
  title: string;
  /** リンクまたはページのURL */
  url: string;
  /** ファビコンの画像URL（任意） */
  faviconUrl?: string;
}

/**
 * デフォルトで提供される標準プリセットテンプレートの一覧。
 */
export const DEFAULT_TEMPLATES: FormatTemplate[] = [
  {
    id: 'markdown',
    name: 'Markdown',
    format: '[${title}](${url})'
  },
  {
    id: 'slack',
    name: 'Slack',
    format: '<${url}|${title}>'
  },
  {
    id: 'scrapbox',
    name: 'Scrapbox',
    format: '[${url} ${title}]'
  },
  {
    id: 'html',
    name: 'HTML',
    format: '<a href="${url}">${title}</a>'
  },
  {
    id: 'markdown-date',
    name: 'Markdown (日付付き)',
    format: '[${title}](${url}) (${date})'
  }
];

/**
 * 数値を2桁のゼロ埋め文字列に変換します。
 * @param num - 変換対象の数値
 * @returns 2桁にゼロ埋めされた文字列
 */
function padZero(num: number): string {
  return num.toString().padStart(2, '0');
}

/**
 * テンプレート文字列内のプレースホルダーを変数値で置換して展開します。
 *
 * サポートする変数:
 * - `${title}`: タイトルまたはリンクテキスト
 * - `${url}`: URL
 * - `${date}`: 現在の日付（YYYY-MM-DD）
 * - `${time}`: 現在の時刻（HH:mm）
 * - `${favicon}`: ファビコンURL
 *
 * @param templateStr - 置換前のテンプレート文字列
 * @param context - タイトルやURLを含むコンテキストオブジェクト
 * @returns 変数が置換された文字列
 */
export function renderTemplate(templateStr: string, context: TemplateContext): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${padZero(now.getMonth() + 1)}-${padZero(now.getDate())}`;
  const timeStr = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
  const favicon = context.faviconUrl || '';

  return templateStr
    .replace(/\$\{title\}/g, context.title)
    .replace(/\$\{url\}/g, context.url)
    .replace(/\$\{date\}/g, dateStr)
    .replace(/\$\{time\}/g, timeStr)
    .replace(/\$\{favicon\}/g, favicon);
}
