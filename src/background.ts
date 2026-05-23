chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
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

    chrome.contextMenus.create({
      id: "copy-page-as-markdown",
      title: chrome.i18n.getMessage("contextMenuPage"),
      contexts: ["page"]
    });
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
    let linkText = info.selectionText || "Link"; // Fallback text, use selection if available

    // Try to get exact text of the clicked link from the content script
    if (tab && tab.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_LAST_LINK_TEXT" }, { frameId: info.frameId });
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
  } else if (info.menuItemId === "copy-page-as-markdown") {
    let markdownStr = "";
    if (tab && tab.url && tab.title) {
      const { includeFavicon, faviconSize } = await chrome.storage.sync.get({ 
        includeFavicon: false,
        faviconSize: '16'
      });
      
      if (includeFavicon) {
        let faviconUrl = "";
        try {
          const url = new URL(tab.url);
          // 設定されたサイズを使用
          faviconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=${faviconSize}`;
        } catch (err) {
          faviconUrl = tab.favIconUrl || "";
        }

        if (faviconUrl) {
          markdownStr = `![favicon](${faviconUrl}) [${tab.title}](${tab.url})`;
        } else {
          markdownStr = `[${tab.title}](${tab.url})`;
        }
      } else {
        markdownStr = `[${tab.title}](${tab.url})`;
      }
    }

    if (markdownStr) {
      await writeToOffscreenClipboard(markdownStr);
    }
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "smart-copy") {
    let targetTab = tab;
    
    // Fallback if tab is not passed by the API
    if (!targetTab || !targetTab.id) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      targetTab = tabs[0];
    }

    if (!targetTab) {
      console.error("No active tab found for smart-copy command");
      return;
    }

    let markdownStr = "";
    if (targetTab.id) {
      try {
        const response = await chrome.tabs.sendMessage(targetTab.id, { type: "GET_SMART_MARKDOWN" });
        if (response && response.markdown) {
          markdownStr = response.markdown;
        }
      } catch (err) {
        console.warn("Could not get markdown from content script for shortcut.", err);
      }
    }

    // If no selection markdown, fallback to page markdown
    if (!markdownStr) {
      if (targetTab.url && targetTab.title) {
        const { includeFavicon, faviconSize } = await chrome.storage.sync.get({ 
          includeFavicon: false,
          faviconSize: '16'
        });
        if (includeFavicon) {
          let faviconUrl = "";
          try {
            const url = new URL(targetTab.url);
            faviconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=${faviconSize}`;
          } catch (err) {
            faviconUrl = targetTab.favIconUrl || "";
          }

          if (faviconUrl) {
            markdownStr = `![favicon](${faviconUrl}) [${targetTab.title}](${targetTab.url})`;
          } else {
            markdownStr = `[${targetTab.title}](${targetTab.url})`;
          }
        } else {
          markdownStr = `[${targetTab.title}](${targetTab.url})`;
        }
      } else if (targetTab.url) {
        markdownStr = `[${targetTab.url}](${targetTab.url})`;
      }
    }

    if (markdownStr) {
      await writeToOffscreenClipboard(markdownStr);
    }
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
