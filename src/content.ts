let lastClickedLinkText = "";

document.addEventListener("contextmenu", (e) => {
  const target = e.target as HTMLElement;
  const link = target.closest("a");
  if (link) {
    lastClickedLinkText = link.textContent?.trim() || "";
  }
}, true); // Use capture phase to ensure we catch it early

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_LAST_LINK_TEXT") {
    sendResponse({ text: lastClickedLinkText });
  }
});
