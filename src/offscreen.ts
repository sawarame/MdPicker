/**
 * バックグラウンド等からのメッセージを受信してオフスクリーンの処理を実行するリスナー関数。
 * @param message - 受信したメッセージオブジェクト
 * @returns 処理完了のPromise
 */
async function handleMessages(message: any): Promise<void> {
  if (message.target !== 'offscreen') {
    return;
  }

  if (message.type === 'copy-text-to-clipboard') {
    await handleClipboardWrite(message.data, message.mimeType);
  }
}

chrome.runtime.onMessage.addListener(handleMessages);

/**
 * 指定されたMIMEタイプに基づいてテキストをクリップボードへ書き込みます。
 * @param text - クリップボードに書き込むテキストデータ
 * @param mimeType - 書き込み時のMIMEタイプ（'text/plain' または 'text/html'）
 * @returns 処理完了のPromise
 */
async function handleClipboardWrite(text: string, mimeType?: string): Promise<void> {
  // text/html の場合、ClipboardItem を使用して HTML とプレーンテキストの両方を格納
  if (mimeType === 'text/html' && typeof ClipboardItem !== 'undefined') {
    try {
      const blobHtml = new Blob([text], { type: 'text/html' });
      const blobPlain = new Blob([text], { type: 'text/plain' });
      const clipboardItem = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobPlain
      });
      await navigator.clipboard.write([clipboardItem]);
      return;
    } catch (err) {
      // ClipboardItem API での書き込み失敗時は従来のテキストエリア経由にフォールバック
      console.warn('ClipboardItem による書き込みに失敗しました。フォールバック処理を実行します。', err);
    }
  }

  // プレーンテキスト書き込みまたはフォールバック処理
  const textArea = document.getElementById('content') as HTMLTextAreaElement;
  if (textArea) {
    textArea.value = text;
    textArea.select();
    document.execCommand('copy');
  } else {
    await navigator.clipboard.writeText(text);
  }
}
