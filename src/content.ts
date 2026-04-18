let lastClickedLinkText = "";

function extractLinkText(link: HTMLAnchorElement): string {
  // innerText retrieves visually rendered text and ignores hidden elements
  let text = link.innerText?.trim() || link.textContent?.trim() || "";

  // If text is still empty, fallback to alt, aria-label, or title
  if (!text) {
    const img = link.querySelector("img");
    if (img && img.alt) {
      text = img.alt.trim();
    }
  }
  
  if (!text) {
    text = link.getAttribute("aria-label")?.trim() || link.getAttribute("title")?.trim() || "";
  }
  
  // Normalize whitespaces and newlines
  return text.replace(/\s+/g, ' ');
}

document.addEventListener("contextmenu", (e) => {
  let link: HTMLAnchorElement | null = null;

  // Use composedPath() to traverse through open Shadow DOM boundaries
  if (e.composedPath) {
    for (const node of e.composedPath()) {
      if (node instanceof Element && node.tagName && node.tagName.toLowerCase() === 'a') {
        link = node as HTMLAnchorElement;
        break;
      }
    }
  } else {
    // Fallback for older browsers
    const target = e.target;
    if (target instanceof Element) {
      link = target.closest("a");
    }
  }

  if (link) {
    lastClickedLinkText = extractLinkText(link);
  }
}, true); // Use capture phase

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_LAST_LINK_TEXT") {
    sendResponse({ text: lastClickedLinkText });
  }
});
