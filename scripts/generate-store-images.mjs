#!/usr/bin/env node
/**
 * Chrome ウェブストア用の多言語スクリーンショット画像を自動生成するスクリプト。
 *
 * 特徴:
 * - package/_locales/（フォールバックで他候補）から有効な言語フォルダを自動判定
 * - ローカルの Google Chrome（Headless + Chrome DevTools Protocol）で HTML/CSS テンプレートを描画
 * - deviceScaleFactor: 1 を明示して実ピクセル寸法（1280x800 または 640x400）を完全一致させる
 * - sharp により透過チャンネルを除去した 24-bit RGB PNG（または JPEG）を images/ 直下にフラット出力
 *
 * 使い方:
 *   node scripts/generate-store-images.mjs
 *   node scripts/generate-store-images.mjs --size=640x400
 *   node scripts/generate-store-images.mjs --lang=ja,en
 *   node scripts/generate-store-images.mjs --size=1280x800 --format=jpg
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SLIDES_BY_LANG } from './store-images/slides-data.mjs';
import { buildSlideHtml } from './store-images/template.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

/** 生成対象のスライド連番一覧 */
const SLIDE_NUMBERS = ['01', '02', '03', '04'];

/** 許可されている出力サイズマップ */
const ALLOWED_SIZES = {
  '1280x800': { width: 1280, height: 800 },
  '640x400': { width: 640, height: 400 },
};

/** 透過除去時に合成する背景色 */
const OPAQUE_BG = '#0b1220';

/**
 * コマンドライン引数を解析します。
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{ sizeKey: string, width: number, height: number, langs: string[] | null, format: 'png' | 'jpg' }}
 */
function parseCliArgs(argv) {
  let sizeKey = '1280x800';
  let langs = null;
  let format = 'png';

  for (const arg of argv) {
    if (arg.startsWith('--size=')) {
      sizeKey = arg.slice('--size='.length).trim();
    } else if (arg.startsWith('--lang=')) {
      const raw = arg.slice('--lang='.length).trim();
      if (raw) {
        langs = raw
          .split(',')
          .map((item) => item.trim().replace(/_/g, '-'))
          .filter(Boolean);
      }
    } else if (arg.startsWith('--format=')) {
      const rawFmt = arg.slice('--format='.length).trim().toLowerCase();
      if (rawFmt === 'png' || rawFmt === 'jpg' || rawFmt === 'jpeg') {
        format = rawFmt === 'jpeg' ? 'jpg' : rawFmt;
      } else {
        throw new Error(`未対応の出力形式です: ${rawFmt}（png または jpg を指定してください）`);
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log(`使い方: node scripts/generate-store-images.mjs [オプション]
  --size=1280x800 | 640x400   出力サイズ（デフォルト: 1280x800）
  --lang=en,ja,...            対象言語をカンマ区切りで指定（省略時は _locales から自動判定）
  --format=png | jpg          出力形式（デフォルト: png［透過なし 24-bit］）`);
      process.exit(0);
    }
  }

  const size = ALLOWED_SIZES[sizeKey];
  if (!size) {
    throw new Error(`未対応のサイズです: ${sizeKey}（1280x800 または 640x400 を指定してください）`);
  }

  return { sizeKey, width: size.width, height: size.height, langs, format };
}

/**
 * プロジェクト内の _locales ディレクトリを探索し、messages.json を含む有効な言語コード一覧を返します。
 * 見つからない場合は ['en', 'ja'] へフォールバックします。
 * @returns {Promise<{ localesDir: string | null, langs: string[] }>}
 */
async function detectTargetLanguages() {
  const candidates = [
    path.join(PROJECT_ROOT, 'package', '_locales'),
    path.join(PROJECT_ROOT, '_locales'),
    path.join(PROJECT_ROOT, 'public', '_locales'),
    path.join(PROJECT_ROOT, 'src', '_locales'),
  ];

  for (const dir of candidates) {
    if (!fsSync.existsSync(dir)) {
      continue;
    }
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const detected = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) {
        continue;
      }
      const msgPath = path.join(dir, entry.name, 'messages.json');
      if (fsSync.existsSync(msgPath)) {
        detected.push(entry.name.replace(/_/g, '-'));
      }
    }
    if (detected.length > 0) {
      detected.sort();
      return { localesDir: path.relative(PROJECT_ROOT, dir), langs: detected };
    }
  }

  return { localesDir: null, langs: ['en', 'ja'] };
}

/**
 * ローカル環境にインストールされている Chrome / Chromium 実行ファイルのパスを検出します。
 * 環境変数 CHROME_PATH が設定されている場合はそれを最優先します。
 * @returns {string} ブラウザ実行ファイルのパス
 */
function resolveChromeExecutable() {
  if (process.env.CHROME_PATH && fsSync.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'Google Chrome / Chromium が見つかりません。環境変数 CHROME_PATH にブラウザ実行パスを指定してください。'
  );
}

/**
 * Headless Chrome を起動し、DevTools WebSocket URL と終了用関数を返します。
 * @param {string} chromePath - Chrome 実行ファイルのパス
 * @param {number} width - ウィンドウ幅
 * @param {number} height - ウィンドウ高さ
 * @returns {Promise<{ wsUrl: string, close: () => Promise<void> }>}
 */
async function launchHeadlessChrome(chromePath, width, height) {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdpicker-store-img-'));
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-extensions',
    '--hide-scrollbars',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    'about:blank',
  ];

  const proc = spawn(chromePath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  const wsUrl = await new Promise((resolve, reject) => {
    let stderrBuf = '';
    const timeout = setTimeout(() => {
      reject(new Error(`Headless Chrome の起動がタイムアウトしました。\n${stderrBuf}`));
    }, 15000);

    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      const match = stderrBuf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });

    proc.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Headless Chrome が予期せず終了しました (code=${code})\n${stderrBuf}`));
    });
  });

  const close = async () => {
    if (!proc.killed) {
      proc.kill('SIGTERM');
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          proc.kill('SIGKILL');
          resolve();
        }, 3000);
        proc.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  };

  return { wsUrl, close };
}

/**
 * Node.js 標準の WebSocket を用いた軽量な Chrome DevTools Protocol (CDP) クライアント。
 */
class SimpleCdpClient {
  /**
   * @param {string} wsUrl - 接続先の WebSocket URL
   */
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.eventListeners = new Map();
  }

  /**
   * WebSocket 接続を確立します。
   */
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve(), { once: true });
      this.ws.addEventListener('error', (err) => reject(err), { once: true });
    });

    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (typeof msg.id === 'number') {
        const handler = this.pending.get(msg.id);
        if (handler) {
          this.pending.delete(msg.id);
          if (msg.error) {
            handler.reject(new Error(`CDP Error (${msg.error.code}): ${msg.error.message}`));
          } else {
            handler.resolve(msg.result);
          }
        }
      } else if (msg.method) {
        const listeners = this.eventListeners.get(msg.method);
        if (listeners) {
          for (const fn of listeners) {
            fn(msg.params, msg.sessionId);
          }
        }
      }
    });
  }

  /**
   * CDP コマンドを送信します。
   * @param {string} method - CDP メソッド名
   * @param {object} [params] - パラメータ
   * @param {string} [sessionId] - ターゲットセッション ID
   * @returns {Promise<any>} 実行結果
   */
  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) {
      payload.sessionId = sessionId;
    }

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  /**
   * 指定の CDP イベントが発火するまで待機します。
   * @param {string} method - 待機するイベント名
   * @param {string} [sessionId] - 対象セッション ID
   * @param {number} [timeoutMs] - タイムアウト時間（ミリ秒）
   * @returns {Promise<any>} イベントパラメータ
   */
  waitForEvent(method, sessionId = undefined, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`CDP イベント待機タイムアウト: ${method}`));
      }, timeoutMs);

      const listener = (params, evtSessionId) => {
        if (sessionId && evtSessionId !== sessionId) {
          return;
        }
        cleanup();
        resolve(params);
      };

      const cleanup = () => {
        clearTimeout(timer);
        const set = this.eventListeners.get(method);
        if (set) {
          set.delete(listener);
        }
      };

      if (!this.eventListeners.has(method)) {
        this.eventListeners.set(method, new Set());
      }
      this.eventListeners.get(method).add(listener);
    });
  }

  /**
   * WebSocket 接続を閉じます。
   */
  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

/**
 * メイン処理：対象言語ごとに 4 枚のスライドを生成し images/ へ保存します。
 */
async function main() {
  const { sizeKey, width, height, langs: explicitLangs, format } = parseCliArgs(process.argv.slice(2));
  const detected = await detectTargetLanguages();
  const targetLangs = explicitLangs || detected.langs;

  console.log(
    `[generate-store-images] サイズ: ${sizeKey} / 形式: ${format.toUpperCase()} / 言語ソース: ${
      explicitLangs ? 'CLI 指定' : detected.localesDir || '既定フォールバック'
    } / 対象言語: ${targetLangs.join(', ')}`
  );

  // 定義が存在しない言語が含まれていないか検証
  const unsupported = targetLangs.filter((lang) => !SLIDES_BY_LANG[lang]);
  if (unsupported.length > 0) {
    throw new Error(
      `スライド定義が見つからない言語があります: ${unsupported.join(', ')}（scripts/store-images/slides-data.mjs に定義を追加してください）`
    );
  }

  const iconSvgPath = path.join(PROJECT_ROOT, 'src', 'icon.svg');
  const iconSvg = await fs.readFile(iconSvgPath, 'utf8');
  const outDir = path.join(PROJECT_ROOT, 'images');
  await fs.mkdir(outDir, { recursive: true });

  const chromePath = resolveChromeExecutable();
  const browser = await launchHeadlessChrome(chromePath, width, height);
  const cdp = new SimpleCdpClient(browser.wsUrl);

  try {
    await cdp.connect();

    // 専用ページターゲットを作成してアタッチ
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    // HiDPI 環境でも必ず 1x の実ピクセル寸法で撮影するため deviceScaleFactor: 1 を明示
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      },
      sessionId
    );

    const { frameTree } = await cdp.send('Page.getFrameTree', {}, sessionId);
    const frameId = frameTree.frame.id;

    const generatedFiles = [];

    for (const lang of targetLangs) {
      const data = SLIDES_BY_LANG[lang];

      for (const slideNumber of SLIDE_NUMBERS) {
        const html = buildSlideHtml({ slideNumber, lang, data, iconSvg, width, height });

        await cdp.send('Page.setDocumentContent', { frameId, html }, sessionId);
        // フォント適用とレイアウト計算の完了を待機
        await cdp.send(
          'Runtime.evaluate',
          {
            expression:
              'document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))',
            awaitPromise: true,
          },
          sessionId
        );

        const { data: base64Png } = await cdp.send(
          'Page.captureScreenshot',
          {
            format: 'png',
            clip: { x: 0, y: 0, width, height, scale: 1 },
          },
          sessionId
        );

        const rawBuffer = Buffer.from(base64Png, 'base64');
        const ext = format === 'jpg' ? 'jpg' : 'png';
        const fileName = `store-${slideNumber}.${lang}.${ext}`;
        const outPath = path.join(outDir, fileName);

        // アルファチャンネルを完全に除去し、透過なし 24-bit RGB PNG（または JPEG）として書き出す
        const pipeline = sharp(rawBuffer).flatten({ background: OPAQUE_BG }).removeAlpha();
        if (format === 'jpg') {
          await pipeline.jpeg({ quality: 92, mozjpeg: true }).toFile(outPath);
        } else {
          await pipeline.png({ compressionLevel: 9, palette: false }).toFile(outPath);
        }

        generatedFiles.push(path.relative(PROJECT_ROOT, outPath));
        console.log(`  ✔ ${fileName}`);
      }
    }

    await cdp.send('Target.closeTarget', { targetId });
    console.log(`[generate-store-images] 完了: ${generatedFiles.length} ファイルを生成しました。`);
  } finally {
    cdp.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[generate-store-images] エラー:', err);
  process.exit(1);
});
