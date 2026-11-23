/**
 * Chrome ウェブストア用スクリーンショット（4 枚構成）の HTML/CSS テンプレートを生成するモジュール。
 * 1280x800 を基準キャンバスとして設計し、640x400 指定時は CSS transform で崩れなく 0.5 倍スケーリングします。
 * すべてのアイコン・図形はインライン SVG で完結し、外部ネットワークには一切依存しません。
 */

import { FONT_STACKS } from './slides-data.mjs';

/**
 * HTML 文字列のエスケープ処理を行います。
 * @param {string} value - エスケープ対象の文字列
 * @returns {string} HTML エスケープ済み文字列
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * テンプレートカードのコード例 HTML（シンタックスハイライト付き）を生成します。
 * @param {'markdown' | 'chat' | 'wiki' | 'html'} codeType - コード記法の種別
 * @param {string} sampleTitle - サンプル表示タイトル
 * @returns {string} コード表示用 HTML
 */
function renderFormatCode(codeType, sampleTitle) {
  const title = escapeHtml(sampleTitle);
  switch (codeType) {
    case 'markdown':
      return `<span class="tk-punc">[</span><span class="tk-title">${title}</span><span class="tk-punc">](</span><span class="tk-url">https://example.com</span><span class="tk-punc">)</span>`;
    case 'chat':
      return `<span class="tk-punc">&lt;</span><span class="tk-url">https://example.com</span><span class="tk-punc">|</span><span class="tk-title">${title}</span><span class="tk-punc">&gt;</span>`;
    case 'wiki':
      return `<span class="tk-punc">[</span><span class="tk-url">https://example.com</span> <span class="tk-title">${title}</span><span class="tk-punc">]</span>`;
    case 'html':
      return `<span class="tk-tag">&lt;a</span> <span class="tk-attr">href</span><span class="tk-punc">=</span><span class="tk-str">"https://example.com"</span><span class="tk-tag">&gt;</span><span class="tk-title">${title}</span><span class="tk-tag">&lt;/a&gt;</span>`;
    default:
      return title;
  }
}

/**
 * 4 枚のスライドすべてで共通利用するベーススタイルを返します。
 * @param {string} fontFamily - 対象言語のフォントファミリー
 * @param {number} width - 出力キャンバス幅（1280 または 640）
 * @param {number} height - 出力キャンバス高さ（800 または 400）
 * @returns {string} CSS 文字列
 */
function buildCommonCss(fontFamily, width, height) {
  const scale = width / 1280;
  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background-color: #0b1220;
      font-family: ${fontFamily};
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    .canvas {
      width: 1280px;
      height: 800px;
      transform: scale(${scale});
      transform-origin: top left;
      background:
        radial-gradient(circle at 78% 22%, rgba(56, 189, 248, 0.14), transparent 44%),
        radial-gradient(circle at 18% 82%, rgba(30, 64, 175, 0.16), transparent 48%),
        linear-gradient(160deg, #0b1220 0%, #0f172a 55%, #090f1c 100%);
      color: #f8fafc;
      position: relative;
      overflow: hidden;
    }
    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 14px;
    }
    .brand-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(148, 163, 184, 0.2);
      overflow: hidden;
      flex-shrink: 0;
      display: flex;
    }
    .brand-icon svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .brand-name {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #ffffff;
    }
    .accent {
      color: #38bdf8;
    }
    .subcopy {
      font-size: 20px;
      line-height: 1.6;
      color: #94a3b8;
      overflow-wrap: break-word;
    }
    .mini-icon {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      overflow: hidden;
      flex-shrink: 0;
      display: inline-flex;
    }
    .mini-icon svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .tk-punc { color: #94a3b8; }
    .tk-title { color: #38bdf8; font-weight: 600; }
    .tk-url { color: #a5b4fc; }
    .tk-tag { color: #f472b6; }
    .tk-attr { color: #4ade80; }
    .tk-str { color: #fbbf24; }
    .mono {
      font-family: "SF Mono", "JetBrains Mono", Menlo, Consolas, Monaco, monospace;
    }
  `;
}

/**
 * スライド 01: ヒーロー（右クリック＆ショートカットで即コピー）の HTML を生成します。
 * @param {object} data - 対象言語のスライドデータ
 * @param {string} iconSvg - インライン SVG 文字列
 * @returns {{ css: string, body: string }} スライド 01 固有の CSS と HTML
 */
function renderSlide01(data, iconSvg) {
  const s = data.slide01;
  const isEn = data.htmlLang === 'en';
  const isJa = data.htmlLang === 'ja';
  const css = `
    .slide01 {
      display: grid;
      grid-template-columns: 524px 1fr;
      gap: 40px;
      align-items: center;
      padding: 64px 68px;
      height: 100%;
    }
    .s1-left {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .s1-headline {
      font-size: ${isEn ? '50px' : isJa ? '44px' : '46px'};
      font-weight: 800;
      line-height: ${isEn ? '1.14' : '1.26'};
      letter-spacing: -0.025em;
      color: #ffffff;
    }
    .s1-meta {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 8px;
    }
    .shortcut-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 15px;
      color: #94a3b8;
    }
    .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      padding: 0 9px;
      border-radius: 6px;
      background: #1e293b;
      border: 1px solid rgba(148, 163, 184, 0.3);
      color: #e2e8f0;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 2px 0 rgba(2, 6, 23, 0.6);
    }
    .lang-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      align-self: flex-start;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #7dd3fc;
      font-size: 14px;
      font-weight: 600;
    }
    .s1-right {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .browser-win {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 28px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08);
      position: relative;
      color: #0f172a;
      height: 356px;
    }
    .browser-bar {
      height: 48px;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      border-radius: 16px 16px 0 0;
      display: flex;
      align-items: center;
      padding: 0 18px;
      gap: 14px;
    }
    .dots {
      display: flex;
      gap: 8px;
    }
    .dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }
    .dot-r { background: #f87171; }
    .dot-y { background: #facc15; }
    .dot-g { background: #4ade80; }
    .url-bar {
      flex: 1;
      height: 30px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      display: flex;
      align-items: center;
      padding: 0 12px;
      font-size: 13px;
      color: #64748b;
    }
    .browser-body {
      padding: 28px 32px;
    }
    .page-h {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 16px;
    }
    .page-p {
      font-size: 17px;
      line-height: 1.7;
      color: #334155;
    }
    .page-link {
      color: #0369a1;
      background: #e0f2fe;
      border-bottom: 2px solid #0284c7;
      padding: 2px 8px;
      border-radius: 5px;
      font-weight: 700;
    }
    .ctx-menu {
      position: absolute;
      right: 26px;
      top: 150px;
      width: 344px;
      background: #ffffff;
      border-radius: 12px;
      padding: 8px;
      box-shadow: 0 22px 46px rgba(2, 6, 23, 0.32), 0 0 0 1px rgba(15, 23, 42, 0.1);
      display: flex;
      flex-direction: column;
      gap: 3px;
      z-index: 2;
    }
    .ctx-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 500;
      color: #1e293b;
      position: relative;
    }
    .ctx-item.active {
      background: linear-gradient(90deg, #0b6cf5 0%, #2563eb 100%);
      color: #ffffff;
      font-weight: 600;
    }
    .ctx-sep {
      height: 1px;
      background: #e2e8f0;
      margin: 4px 6px;
    }
    .ctx-arrow {
      margin-left: auto;
      font-size: 10px;
      color: #94a3b8;
    }
    .cursor-svg {
      position: absolute;
      right: 16px;
      top: 18px;
      width: 24px;
      height: 24px;
      filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.35));
    }
    .result-card {
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: 16px;
      padding: 22px 26px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
    }
    .result-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .result-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #94a3b8;
    }
    .copied-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.14);
      border: 1px solid rgba(52, 211, 153, 0.4);
      color: #34d399;
      font-size: 13px;
      font-weight: 700;
    }
    .result-code {
      font-size: 18px;
      line-height: 1.5;
      color: #e2e8f0;
      word-break: break-all;
    }
  `;

  const body = `
    <div class="slide01">
      <div class="s1-left">
        <div class="brand-pill">
          <div class="brand-icon">${iconSvg}</div>
          <span class="brand-name">${escapeHtml(data.appName)}</span>
        </div>
        <h1 class="s1-headline">
          ${escapeHtml(s.headlineBefore)}<br>
          <span class="accent">${escapeHtml(s.headlineAccent)}</span> ${escapeHtml(s.headlineAfter)}
        </h1>
        <p class="subcopy">${escapeHtml(s.subcopy)}</p>
        <div class="s1-meta">
          <div class="shortcut-row">
            <span>${escapeHtml(s.shortcutLabel)}</span>
            <span class="kbd">⌘</span><span class="kbd">⇧</span><span class="kbd">M</span>
            <span>/</span>
            <span class="kbd">Ctrl</span><span class="kbd">Shift</span><span class="kbd">M</span>
          </div>
          <div class="lang-pill">
            <span>🌐</span>
            <span>${escapeHtml(s.langBadge)}</span>
          </div>
        </div>
      </div>

      <div class="s1-right">
        <div class="browser-win">
          <div class="browser-bar">
            <div class="dots">
              <span class="dot dot-r"></span>
              <span class="dot dot-y"></span>
              <span class="dot dot-g"></span>
            </div>
            <div class="url-bar">${escapeHtml(s.browserUrl)}</div>
          </div>
          <div class="browser-body">
            <div class="page-h">${escapeHtml(s.pageTitle)}</div>
            <p class="page-p">
              ${escapeHtml(s.pageTextBefore)}<span class="page-link">${escapeHtml(s.pageLinkText)}</span>${escapeHtml(s.pageTextAfter)}
            </p>
          </div>
          <div class="ctx-menu">
            <div class="ctx-item active">
              <span class="mini-icon">${iconSvg}</span>
              <span>${escapeHtml(s.menuItem1)}</span>
              <svg class="cursor-svg" viewBox="0 0 24 24" fill="none">
                <path d="M5 3L19 12.5L12.2 13.8L9.2 20L5 3Z" fill="#0f172a" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="ctx-item">
              <span class="mini-icon">${iconSvg}</span>
              <span>${escapeHtml(s.menuItem2)}</span>
            </div>
            <div class="ctx-item">
              <span class="mini-icon">${iconSvg}</span>
              <span>${escapeHtml(s.menuItem3)}</span>
              <span class="ctx-arrow">▶</span>
            </div>
            <div class="ctx-sep"></div>
            <div class="ctx-item">
              <span class="mini-icon">${iconSvg}</span>
              <span>${escapeHtml(s.menuItem4)}</span>
            </div>
          </div>
        </div>

        <div class="result-card">
          <div class="result-top">
            <span class="result-label">${escapeHtml(s.resultLabel)}</span>
            <span class="copied-pill">✓ ${escapeHtml(s.copiedBadge)}</span>
          </div>
          <div class="result-code mono">
            <span class="tk-punc">[</span><span class="tk-title">${escapeHtml(s.resultLinkText)}</span><span class="tk-punc">](</span><span class="tk-url">https://example.com/guide</span><span class="tk-punc">)</span>
          </div>
        </div>
      </div>
    </div>
  `;

  return { css, body };
}

/**
 * スライド 02: 選択範囲の構造そのまま Markdown 変換（ビフォー／アフター）の HTML を生成します。
 * @param {object} data - 対象言語のスライドデータ
 * @param {string} iconSvg - インライン SVG 文字列
 * @returns {{ css: string, body: string }} スライド 02 固有の CSS と HTML
 */
function renderSlide02(data, iconSvg) {
  const s = data.slide02;
  const isEn = data.htmlLang === 'en';
  const css = `
    .slide02 {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 52px 72px 60px;
      height: 100%;
    }
    .s2-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      margin-bottom: 42px;
      max-width: 1040px;
    }
    .s2-headline {
      font-size: ${isEn ? '44px' : '46px'};
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: -0.025em;
    }
    .s2-grid {
      width: 100%;
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 84px 1fr;
      align-items: stretch;
      gap: 12px;
    }
    .panel {
      border-radius: 18px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 52px rgba(0, 0, 0, 0.45);
    }
    .panel-light {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.14);
    }
    .panel-dark {
      background: #0f1a2d;
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.25);
    }
    .panel-head {
      height: 54px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 15px;
      font-weight: 700;
    }
    .panel-light .panel-head {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    .panel-dark .panel-head {
      background: #132138;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      color: #7dd3fc;
    }
    .panel-badge {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #0284c7;
    }
    .panel-dark .panel-badge {
      color: #38bdf8;
    }
    .panel-body {
      flex: 1;
      padding: 26px 24px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .selection-box {
      background: #e0f2fe;
      border-left: 4px solid #0284c7;
      border-radius: 10px;
      padding: 24px 24px 22px;
    }
    .sel-h2 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 14px;
    }
    .sel-ul {
      list-style: disc;
      padding-left: 20px;
      margin-bottom: 18px;
      font-size: 15px;
      line-height: 1.75;
      color: #1e293b;
    }
    .sel-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      font-size: 14px;
      border: 1px solid #cbd5e1;
    }
    .sel-table th, .sel-table td {
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .sel-table th {
      background: #eef2f7;
      font-weight: 700;
      color: #334155;
    }
    .sel-table tr:last-child td {
      border-bottom: none;
    }
    .arrow-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .arrow-circle {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 800;
      box-shadow: 0 12px 28px rgba(14, 165, 233, 0.4);
    }
    .arrow-kbd {
      padding: 5px 10px;
      border-radius: 6px;
      background: #1e293b;
      border: 1px solid rgba(148, 163, 184, 0.28);
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 700;
    }
    .md-pre {
      font-size: 13.5px;
      line-height: 1.9;
      white-space: pre-wrap;
      color: #cbd5e1;
    }
    .md-h { color: #38bdf8; font-weight: 700; }
    .md-b { color: #f8fafc; font-weight: 700; }
    .md-pipe { color: #64748b; }
  `;

  const body = `
    <div class="slide02">
      <div class="s2-header">
        <div class="brand-pill">
          <div class="brand-icon">${iconSvg}</div>
          <span class="brand-name">${escapeHtml(data.appName)}</span>
        </div>
        <h1 class="s2-headline">
          ${escapeHtml(s.headlineBefore)}<span class="accent">${escapeHtml(s.headlineAccent)}</span>${escapeHtml(s.headlineAfter)}
        </h1>
        <p class="subcopy">${escapeHtml(s.subcopy)}</p>
      </div>

      <div class="s2-grid">
        <div class="panel panel-light">
          <div class="panel-head">
            <span>${escapeHtml(s.leftHeader)}</span>
            <span class="panel-badge">${escapeHtml(s.leftBadge)}</span>
          </div>
          <div class="panel-body">
            <div class="selection-box">
              <div class="sel-h2">${escapeHtml(s.sampleHeading)}</div>
              <ul class="sel-ul">
                <li><strong>${escapeHtml(s.sampleBullet1Bold)}</strong>${escapeHtml(s.sampleBullet1Text)}</li>
                <li><strong>${escapeHtml(s.sampleBullet2Bold)}</strong>${escapeHtml(s.sampleBullet2Text)}</li>
              </ul>
              <table class="sel-table">
                <thead>
                  <tr>
                    <th>${escapeHtml(s.tableCol1)}</th>
                    <th>${escapeHtml(s.tableCol2)}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${escapeHtml(s.tableRow1Col1)}</td>
                    <td>${escapeHtml(s.tableRow1Col2)}</td>
                  </tr>
                  <tr>
                    <td>${escapeHtml(s.tableRow2Col1)}</td>
                    <td>${escapeHtml(s.tableRow2Col2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="arrow-col">
          <div class="arrow-circle">→</div>
          <div class="arrow-kbd">⌘⇧M</div>
        </div>

        <div class="panel panel-dark">
          <div class="panel-head">
            <span>${escapeHtml(s.rightHeader)}</span>
            <span class="panel-badge mono">${escapeHtml(s.rightBadge)}</span>
          </div>
          <div class="panel-body">
            <div class="md-pre mono"><span class="md-h">## ${escapeHtml(s.sampleHeading)}</span>

- <span class="md-b">**${escapeHtml(s.sampleBullet1Bold)}**</span>${escapeHtml(s.sampleBullet1Text)}
- <span class="md-b">**${escapeHtml(s.sampleBullet2Bold)}**</span>${escapeHtml(s.sampleBullet2Text)}

<span class="md-pipe">|</span> ${escapeHtml(s.tableCol1)} <span class="md-pipe">|</span> ${escapeHtml(s.tableCol2)} <span class="md-pipe">|</span>
<span class="md-pipe">|---|---|</span>
<span class="md-pipe">|</span> ${escapeHtml(s.tableRow1Col1)} <span class="md-pipe">|</span> ${escapeHtml(s.tableRow1Col2)} <span class="md-pipe">|</span>
<span class="md-pipe">|</span> ${escapeHtml(s.tableRow2Col1)} <span class="md-pipe">|</span> ${escapeHtml(s.tableRow2Col2)} <span class="md-pipe">|</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  return { css, body };
}

/**
 * スライド 03: 用途別フォーマットテンプレート＆HTML リッチテキスト対応の HTML を生成します。
 * @param {object} data - 対象言語のスライドデータ
 * @param {string} iconSvg - インライン SVG 文字列
 * @returns {{ css: string, body: string }} スライド 03 固有の CSS と HTML
 */
function renderSlide03(data, iconSvg) {
  const s = data.slide03;
  const isEn = data.htmlLang === 'en';
  const css = `
    .slide03 {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 52px 72px 54px;
      height: 100%;
    }
    .s3-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      margin-bottom: 42px;
      max-width: 1040px;
    }
    .s3-headline {
      font-size: ${isEn ? '46px' : '46px'};
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: -0.025em;
    }
    .s3-grid {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 34px;
    }
    .fmt-card {
      background: rgba(17, 28, 45, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 18px;
      padding: 26px 28px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
    }
    .fmt-card.active {
      border-color: rgba(56, 189, 248, 0.72);
      box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.28), 0 20px 44px rgba(2, 132, 199, 0.22);
    }
    .fmt-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .fmt-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .fmt-title {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
    }
    .mime-tag {
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      background: rgba(148, 163, 184, 0.14);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.22);
    }
    .mime-tag.is-html {
      background: rgba(244, 114, 182, 0.14);
      color: #f9a8d4;
      border-color: rgba(244, 114, 182, 0.35);
    }
    .fmt-badge {
      font-size: 13.5px;
      color: #94a3b8;
      text-align: right;
    }
    .fmt-code {
      background: #0a1120;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 12px;
      padding: 18px 20px;
      font-size: 15.5px;
      line-height: 1.5;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .vars-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: auto;
    }
    .vars-label {
      font-size: 15px;
      font-weight: 600;
      color: #94a3b8;
    }
    .var-chip {
      padding: 7px 15px;
      border-radius: 999px;
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: #7dd3fc;
      font-size: 14px;
      font-weight: 600;
    }
  `;

  const cardsHtml = s.cards
    .map(
      (card) => `
      <div class="fmt-card ${card.active ? 'active' : ''}">
        <div class="fmt-top">
          <div class="fmt-title-wrap">
            <span class="fmt-title">${escapeHtml(card.title)}</span>
            <span class="mime-tag mono ${card.mime === 'text/html' ? 'is-html' : ''}">${escapeHtml(card.mime)}</span>
          </div>
          <span class="fmt-badge">${escapeHtml(card.badge)}</span>
        </div>
        <div class="fmt-code mono">${renderFormatCode(card.codeType, card.sampleTitle)}</div>
      </div>`
    )
    .join('');

  const body = `
    <div class="slide03">
      <div class="s3-header">
        <div class="brand-pill">
          <div class="brand-icon">${iconSvg}</div>
          <span class="brand-name">${escapeHtml(data.appName)}</span>
        </div>
        <h1 class="s3-headline">
          ${escapeHtml(s.headlineBefore)}<span class="accent">${escapeHtml(s.headlineAccent)}</span>${escapeHtml(s.headlineAfter)}
        </h1>
        <p class="subcopy">${escapeHtml(s.subcopy)}</p>
      </div>

      <div class="s3-grid">${cardsHtml}</div>

      <div class="vars-bar">
        <span class="vars-label">${escapeHtml(s.variablesLabel)}</span>
        <span class="var-chip mono">\${title}</span>
        <span class="var-chip mono">\${url}</span>
        <span class="var-chip mono">\${date}</span>
        <span class="var-chip mono">\${time}</span>
        <span class="var-chip mono">\${favicon}</span>
      </div>
    </div>
  `;

  return { css, body };
}

/**
 * スライド 04: ツールバーポップアップ＆タブ表示オプション画面（ピン留め・並び替え・5言語切替）の HTML を生成します。
 * @param {object} data - 対象言語のスライドデータ
 * @param {string} iconSvg - インライン SVG 文字列
 * @returns {{ css: string, body: string }} スライド 04 固有の CSS と HTML
 */
function renderSlide04(data, iconSvg) {
  const s = data.slide04;
  const isEn = data.htmlLang === 'en';
  const css = `
    .slide04 {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 46px 64px 52px;
      height: 100%;
    }
    .s4-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 34px;
      max-width: 1060px;
    }
    .s4-headline {
      font-size: ${isEn ? '44px' : '44px'};
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: -0.025em;
    }
    .s4-stage {
      width: 100%;
      flex: 1;
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 32px;
      align-items: start;
    }
    .mock-col {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .mock-caption {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #7dd3fc;
      padding-left: 4px;
    }
    /* ツールバーポップアップの実 UI 忠実モック */
    .popup-mock {
      background: #ffffff;
      color: #24292f;
      border-radius: 14px;
      padding: 10px 0 12px;
      box-shadow: 0 24px 54px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.14);
    }
    .pop-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 16px 12px;
      border-bottom: 1px solid #eaeef2;
      margin-bottom: 6px;
    }
    .pop-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      color: #1f2328;
    }
    .pop-opt-btn {
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      color: #24292f;
    }
    .pop-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      color: #24292f;
    }
    .pop-item.hover {
      background: #f0f6ff;
      color: #0969da;
      font-weight: 600;
    }
    .pop-sub-box {
      background: #f8fafc;
      border-top: 1px solid #f0f2f5;
      border-bottom: 1px solid #f0f2f5;
    }
    .pop-sub-item {
      padding: 8px 16px 8px 32px;
      font-size: 13px;
      color: #334155;
    }
    .pop-div {
      height: 1px;
      background: #eaeef2;
      margin: 6px 0;
    }
    .pop-status {
      margin: 10px 14px 2px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #dafbe1;
      color: #116329;
      border: 1px solid #4ac26b;
      font-size: 14px;
      font-weight: 700;
      text-align: center;
    }
    /* オプション画面（タブ表示）の実 UI 忠実モック */
    .options-mock {
      background: #ffffff;
      color: #24292f;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 24px 54px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.14);
    }
    .opt-chrome {
      height: 40px;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 12px;
    }
    .opt-tab {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      padding: 6px 14px;
      margin-top: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }
    .opt-body {
      padding: 20px 24px 22px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .opt-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      padding-bottom: 14px;
      border-bottom: 1px solid #eaeef2;
    }
    .opt-control-group {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13.5px;
      color: #334155;
      font-weight: 600;
    }
    .opt-select {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #0f172a;
      font-size: 13px;
      font-weight: 600;
    }
    .opt-check {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: #0366d6;
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      line-height: 1;
      flex-shrink: 0;
    }
    .opt-check.off {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      color: transparent;
    }
    .opt-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .opt-table th {
      background: #f7f8fa;
      color: #475569;
      font-weight: 700;
      padding: 9px 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    .opt-table td {
      padding: 10px 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }
    .opt-table tr:last-child td {
      border-bottom: none;
    }
    .opt-table tr.is-pinned {
      background: #f8fbff;
    }
    .order-cell {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #64748b;
    }
    .drag-dots {
      font-weight: 800;
      letter-spacing: -1px;
      margin-right: 2px;
    }
    .move-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      font-size: 11px;
      color: #334155;
    }
    .fmt-cell {
      color: #475569;
      font-size: 12px;
    }
    .mime-pill {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #475569;
      font-size: 11.5px;
    }
    .mime-pill.html {
      background: #fce7f3;
      color: #be185d;
    }
  `;

  const body = `
    <div class="slide04">
      <div class="s4-header">
        <div class="brand-pill">
          <div class="brand-icon">${iconSvg}</div>
          <span class="brand-name">${escapeHtml(data.appName)}</span>
        </div>
        <h1 class="s4-headline">
          ${escapeHtml(s.headlineBefore)}<span class="accent">${escapeHtml(s.headlineAccent)}</span>${escapeHtml(s.headlineAfter)}
        </h1>
        <p class="subcopy">${escapeHtml(s.subcopy)}</p>
      </div>

      <div class="s4-stage">
        <div class="mock-col">
          <div class="mock-caption">${escapeHtml(s.popupCaption)}</div>
          <div class="popup-mock">
            <div class="pop-head">
              <div class="pop-brand">
                <span class="mini-icon">${iconSvg}</span>
                <span>MdPicker</span>
              </div>
              <span class="pop-opt-btn">${escapeHtml(s.popupOpenOptions)}</span>
            </div>
            <div class="pop-item hover">${escapeHtml(s.popupPinned1)}</div>
            <div class="pop-item">${escapeHtml(s.popupPinned2)}</div>
            <div class="pop-item">
              <span>${escapeHtml(s.popupOther)}</span>
              <span style="font-size: 10px; color: #64748b;">▼</span>
            </div>
            <div class="pop-sub-box">
              <div class="pop-sub-item">${escapeHtml(s.popupSub1)}</div>
              <div class="pop-sub-item">${escapeHtml(s.popupSub2)}</div>
            </div>
            <div class="pop-div"></div>
            <div class="pop-item">${escapeHtml(s.popupSelection)}</div>
            <div class="pop-status">✓ ${escapeHtml(s.popupCopied)}</div>
          </div>
        </div>

        <div class="mock-col">
          <div class="mock-caption">${escapeHtml(s.optionsCaption)}</div>
          <div class="options-mock">
            <div class="opt-chrome">
              <div class="dots" style="display:flex;gap:6px;">
                <span style="width:10px;height:10px;border-radius:50%;background:#f87171;"></span>
                <span style="width:10px;height:10px;border-radius:50%;background:#facc15;"></span>
                <span style="width:10px;height:10px;border-radius:50%;background:#4ade80;"></span>
              </div>
              <div class="opt-tab">
                <span class="mini-icon">${iconSvg}</span>
                <span>MdPicker Options</span>
              </div>
            </div>
            <div class="opt-body">
              <div class="opt-controls">
                <div class="opt-control-group">
                  <span>${escapeHtml(s.optLangLabel)}</span>
                  <span class="opt-select">${escapeHtml(s.optLangValue)} <span style="font-size:10px;color:#64748b;">▾</span></span>
                </div>
                <div class="opt-control-group">
                  <span class="opt-check">✓</span>
                  <span>${escapeHtml(s.optFaviconLabel)}</span>
                  <span class="opt-select" style="padding:3px 9px;font-size:12px;">16px ▾</span>
                </div>
              </div>

              <table class="opt-table">
                <thead>
                  <tr>
                    <th>${escapeHtml(s.optThOrder)}</th>
                    <th style="text-align:center;">${escapeHtml(s.optThPin)}</th>
                    <th>${escapeHtml(s.optThName)}</th>
                    <th>${escapeHtml(s.optThMime)}</th>
                    <th>${escapeHtml(s.optThFormat)}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="is-pinned">
                    <td><span class="order-cell"><span class="drag-dots">⋮⋮</span><span class="move-btn" style="opacity:0.4;">↑</span><span class="move-btn">↓</span></span></td>
                    <td style="text-align:center;"><span class="opt-check">✓</span></td>
                    <td><strong>${escapeHtml(s.optRow1Name)}</strong></td>
                    <td><span class="mime-pill mono">text/plain</span></td>
                    <td class="fmt-cell mono">[\${title}](\${url})</td>
                  </tr>
                  <tr class="is-pinned">
                    <td><span class="order-cell"><span class="drag-dots">⋮⋮</span><span class="move-btn">↑</span><span class="move-btn">↓</span></span></td>
                    <td style="text-align:center;"><span class="opt-check">✓</span></td>
                    <td><strong>${escapeHtml(s.optRow2Name)}</strong></td>
                    <td><span class="mime-pill html mono">text/html</span></td>
                    <td class="fmt-cell mono">&lt;a href="\${url}"&gt;\${title}&lt;/a&gt;</td>
                  </tr>
                  <tr>
                    <td><span class="order-cell"><span class="drag-dots">⋮⋮</span><span class="move-btn">↑</span><span class="move-btn">↓</span></span></td>
                    <td style="text-align:center;"><span class="opt-check off">✓</span></td>
                    <td>${escapeHtml(s.optRow3Name)}</td>
                    <td><span class="mime-pill mono">text/plain</span></td>
                    <td class="fmt-cell mono">&lt;\${url}|\${title}&gt;</td>
                  </tr>
                  <tr>
                    <td><span class="order-cell"><span class="drag-dots">⋮⋮</span><span class="move-btn">↑</span><span class="move-btn" style="opacity:0.4;">↓</span></span></td>
                    <td style="text-align:center;"><span class="opt-check off">✓</span></td>
                    <td>${escapeHtml(s.optRow4Name)}</td>
                    <td><span class="mime-pill mono">text/plain</span></td>
                    <td class="fmt-cell mono">[\${title}](\${url}) (\${date})</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  return { css, body };
}

/**
 * 指定されたスライド番号と言語データから、完全な HTML ドキュメント文字列を生成します。
 * @param {object} params - 描画パラメータ
 * @param {'01' | '02' | '03' | '04'} params.slideNumber - 2 桁のスライド番号
 * @param {string} params.lang - 正規化済み言語コード（例: 'en', 'ja', 'zh-CN'）
 * @param {object} params.data - 対象言語のスライドデータ
 * @param {string} params.iconSvg - src/icon.svg の内容
 * @param {number} params.width - 出力幅（px）
 * @param {number} params.height - 出力高さ（px）
 * @returns {string} ブラウザ描画用の完全な HTML 文字列
 */
export function buildSlideHtml({ slideNumber, lang, data, iconSvg, width, height }) {
  const fontFamily = FONT_STACKS[lang] || FONT_STACKS.en;
  const commonCss = buildCommonCss(fontFamily, width, height);

  let rendered;
  switch (slideNumber) {
    case '01':
      rendered = renderSlide01(data, iconSvg);
      break;
    case '02':
      rendered = renderSlide02(data, iconSvg);
      break;
    case '03':
      rendered = renderSlide03(data, iconSvg);
      break;
    case '04':
      rendered = renderSlide04(data, iconSvg);
      break;
    default:
      throw new Error(`未対応のスライド番号です: ${slideNumber}`);
  }

  return `<!DOCTYPE html>
<html lang="${escapeHtml(data.htmlLang)}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(data.appName)} - Slide ${slideNumber}</title>
  <style>${commonCss}${rendered.css}</style>
</head>
<body>
  <div class="canvas">${rendered.body}</div>
</body>
</html>`;
}
