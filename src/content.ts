import TurndownService from 'turndown';

let lastClickedLinkText = "";
let lastSelectedMarkdown = "";

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

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

  // Handle generalized text selection
  lastSelectedMarkdown = "";
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
    const range = selection.getRangeAt(0);
    const div = document.createElement('div');
    div.appendChild(range.cloneContents());
    
    let html = div.innerHTML;
    let node: Node | null = range.commonAncestorContainer;
    
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    const tagsToWrap = new Set(['B', 'STRONG', 'I', 'EM', 'MARK', 'DEL', 'S', 'U', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'A', 'CODE', 'PRE']);
    
    while (node && node !== document.body && node instanceof Element) {
      const tagName = node.tagName.toUpperCase();
      if (tagsToWrap.has(tagName)) {
        const wrapper = node.cloneNode(false) as Element;
        wrapper.innerHTML = html;
        html = wrapper.outerHTML;
      }
      
      // If we reach a list container, wrap once more and stop to prevent over-wrapping
      if (['UL', 'OL'].includes(tagName)) {
        const wrapper = node.cloneNode(false) as Element;
        wrapper.innerHTML = html;
        html = wrapper.outerHTML;
        break;
      }
      
      // Stop traversing if we hit a standard block container
      if (['P', 'DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'MAIN', 'BLOCKQUOTE', 'NAV'].includes(tagName)) {
        break;
      }
      
      node = node.parentNode;
    }

    try {
      lastSelectedMarkdown = turndownService.turndown(html);
    } catch (err) {
      console.warn("Failed to convert selection to markdown.", err);
      lastSelectedMarkdown = selection.toString();
    }
  }
}, true); // Use capture phase

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_LAST_LINK_TEXT") {
    sendResponse({ text: lastClickedLinkText });
  } else if (request.type === "GET_LAST_SELECTION_MARKDOWN") {
    sendResponse({ markdown: lastSelectedMarkdown });
  }
});
