chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-as-markdown",
    title: chrome.i18n.getMessage("contextMenuTitle"),
    contexts: ["link"]
  });

  chrome.contextMenus.create({
    id: "copy-selection-as-markdown",
    title: chrome.i18n.getMessage("contextMenuSelection"),
    contexts: ["selection"]
  });
});

async function setupOffscreenDocument(path: string) {
  // Check if there is already an offscreen document
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // Create document
  await chrome.offscreen.createDocument({
    url: path,
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: "To copy text to clipboard"
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "copy-as-markdown" && info.linkUrl) {
    let linkText = "Link"; // Fallback text

    // Try to get exact text of the clicked link from the content script
    if (tab && tab.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_LAST_LINK_TEXT" });
        if (response && response.text) {
          linkText = response.text;
        }
      } catch (err) {
        console.warn("Could not get link text from content script. Using fallback.", err);
      }
    }

    const markdownStr = `[${linkText}](${info.linkUrl})`;
    await writeToOffscreenClipboard(markdownStr);
  } else if (info.menuItemId === "copy-selection-as-markdown") {
    let markdownStr = info.selectionText || "";

    if (tab && tab.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_LAST_SELECTION_MARKDOWN" });
        if (response && response.markdown) {
          markdownStr = response.markdown;
        }
      } catch (err) {
        console.warn("Could not get markdown from content script. Using fallback text.", err);
      }
    }

    await writeToOffscreenClipboard(markdownStr);
  }
});

async function writeToOffscreenClipboard(text: string) {
  try {
    await setupOffscreenDocument('offscreen.html');
    await chrome.runtime.sendMessage({
      type: 'copy-text-to-clipboard',
      target: 'offscreen',
      data: text
    });
    console.log('Markdown copied to clipboard successfully');
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
  }
}
