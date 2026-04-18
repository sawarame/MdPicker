chrome.runtime.onMessage.addListener(handleMessages);

async function handleMessages(message: any) {
  if (message.target !== 'offscreen') {
    return;
  }

  if (message.type === 'copy-text-to-clipboard') {
    handleClipboardWrite(message.data);
  }
}

function handleClipboardWrite(text: string) {
  const textArea = document.getElementById('content') as HTMLTextAreaElement;
  if (textArea) {
    textArea.value = text;
    textArea.select();
    document.execCommand('copy');
  } else {
    navigator.clipboard.writeText(text);
  }
}
