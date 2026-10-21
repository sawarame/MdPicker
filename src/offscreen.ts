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
    await handleClipboardWrite(message.data, message.mimeType, message.plainText);
  }
}

chrome.runtime.onMessage.addListener(handleMessages);

/**
 * 指定されたMIMEタイプに基づいてテキストをクリップボードへ書き込みます。
 * @param text - クリップボードに書き込むテキストデータ（HTMLまたはプレーンテキスト）
 * @param mimeType - 書き込み時のMIMEタイプ（'text/plain' または 'text/html'）
 * @param plainText - リッチテキスト時のフォールバック用プレーンテキスト（未指定時はtextを使用）
 * @returns 処理完了のPromise
 */
async function handleClipboardWrite(text: string, mimeType?: string, plainText?: string): Promise<void> {
  // text/html の場合、リッチテキスト（HTML）とプレーンテキストの両方をクリップボードに格納
  if (mimeType === 'text/html') {
    // プレーンテキスト用文字列の決定（指定がない場合はテンプレート展開文字列そのものを維持）
    const fallbackText = plainText !== undefined ? plainText : text;

    // 1. まず ClipboardItem API（モダンAPI）を試行
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      try {
        const blobHtml = new Blob([text], { type: 'text/html' });
        const blobPlain = new Blob([fallbackText], { type: 'text/plain' });
        const clipboardItem = new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobPlain
        });
        await navigator.clipboard.write([clipboardItem]);
        return;
      } catch (err) {
        console.warn('ClipboardItem API での書き込みに失敗しました。イベント方式へフォールバックします。', err);
      }
    }

    // 2. フォーカスがない場合（Offscreen Document特有の制限）は copy イベントをフックして書き込む
    const onCopy = (event: ClipboardEvent) => {
      if (event.clipboardData) {
        event.clipboardData.setData('text/html', text);
        event.clipboardData.setData('text/plain', fallbackText);
        event.preventDefault();
      }
    };

    document.addEventListener('copy', onCopy);
    try {
      const textArea = document.getElementById('content') as HTMLTextAreaElement;
      if (textArea) {
        textArea.value = fallbackText;
        textArea.select();
      }
      const success = document.execCommand('copy');
      if (success) {
        return;
      }
    } catch (err) {
      console.warn('copy イベント経由の書き込みに失敗しました。', err);
    } finally {
      document.removeEventListener('copy', onCopy);
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
