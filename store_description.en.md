# MdPicker - Chrome Web Store Listing (English)

### **Name**
MdPicker - Markdown Link Copier

### **Short Description**
```
Copy links, selections, and pages as Markdown, HTML, or custom templates via right-click, popup, or shortcut. 5 languages.
```

### **Detailed Description**
```
MdPicker is a lightweight Chrome extension that lets you copy web links, selected text, and page information as Markdown, HTML, or custom template formats via the right-click context menu, toolbar popup, or keyboard shortcut.

[ CORE FEATURES ]

- Copy Link in Any Format
Automatically extracts the link's display text and URL. Even when a link wraps an image or uses Shadow DOM, it resolves fallback text from img alt, aria-label, or title attributes.

- Copy Selection as Markdown
Analyzes the HTML structure of your selected text (headings, bold/italic text, lists, code blocks, and GFM tables) and converts it into clean Markdown while preserving formatting context. Relative image and link paths are automatically resolved to absolute URLs to prevent broken images or links when pasting.

- Copy Page Link
Copies the current page's title and URL in Markdown or any registered format with a single click.

- Customizable Format Templates & Rich Text (HTML) Support
Includes built-in presets for Markdown, chat syntax (<URL|Title>), wiki syntax ([URL Title]), HTML (<a href="URL">Title</a>), and Markdown with date. You can add custom templates using dynamic variables: ${title}, ${url}, ${date}, ${time}, and ${favicon}. Selecting text/html as the MIME type copies clickable hyperlinks for rich-text editors, document tools, and email clients while also storing a plain-text fallback.

- Top-Level Pinning & Reordering
Pin frequently used templates directly to the top level of the right-click menu ("Copy Link as [Format]" / "Copy Page Link as [Format]"), while grouping unpinned templates under "Copy link in other formats..." and "Copy page in other formats...". Reorder templates via drag-and-drop or up/down buttons in the options tab, with instant updates.

- Toolbar Popup Menu
Click the toolbar icon to copy the current page link or the selected text as Markdown directly from a compact popup menu with copy confirmation feedback.

- Favicon Support
Optionally include the page's favicon image in Markdown page links and select from 4 sizes: 12px, 16px, 24px, or 32px.

- Smart Keyboard Shortcut
Press Ctrl+Shift+M (Cmd+Shift+M on Mac) to copy selected text as Markdown. If no text is selected, it copies the current page using your configured default format.

- Multi-Language Support (5 Languages)
Supports English, Japanese, Simplified Chinese, Traditional Chinese, and Korean. Automatically follows your browser language or can be switched manually in the options tab without reloading.

[ KEY HIGHLIGHTS ]

- Preserves surrounding formatting context (headings, lists, tables, inline styles) when copying partial text selections.
- Multi-MIME clipboard writing supports both rich-text paste and plain-text editors seamlessly.
- Dedicated full-tab options page provides a spacious workspace for managing templates and preferences.

[ 💡 HOW TO USE ]

1. Copy a link: Right-click any link and select "Copy Link as [Format]" or choose from "Copy link in other formats...".
2. Copy selected text: Select text on a page, then right-click and choose "Copy selection as Markdown", click the toolbar icon, or press Ctrl+Shift+M (Cmd+Shift+M on Mac).
3. Copy a page link: Right-click on the page and choose "Copy Page Link as [Format]" or "Copy page in other formats...", click the toolbar icon, or press the keyboard shortcut with no text selected.
4. Customize templates & settings: Click "Open Options" in the toolbar popup (or right-click the toolbar icon and select "Open Options") to add, reorder, pin, or delete templates, configure MIME types, enable favicons, or switch the display language.

[ DEVELOPER & POWER USER FEATURES ]

- Manifest V3 Architecture: Built with a stateless service worker and the official Offscreen Document API for reliable clipboard writes.
- Shadow DOM Traversal: Uses composedPath() to accurately detect anchor elements inside open Shadow DOM trees.
- Cross-Device Sync: Saves templates, pinned states, favicon options, and language preferences via Chrome Storage Sync.
```
