# MdPicker

*[日本語で読む (Read this in Japanese)](./README.ja.md)*

**MdPicker** is a simple yet powerful Chrome extension that allows you to convert links and selected text on your browser into Markdown format and copy them directly to your clipboard using the right-click context menu.

## ✨ Features
- **One-Click Copy**: Simply right-click on a link and select "Copy Link as Markdown" to automatically create a Markdown format.
- **Copy Selection as Markdown**: Select any text on a web page (including headings, bold text, lists, etc.), right-click, and select "Copy selection as Markdown" to automatically convert its visual HTML structure into Markdown syntax.
- **Automatic Link Text Extraction**: Accurately extracts not just the URL, but also the anchor text (the display name set for the link) from the web page.
- **Manifest V3 Fully Supported**: Complies with the latest Chrome extension architecture, ensuring lightweight background operation and robust security features (via Service Workers, Offscreen API, etc.).

## 🎯 Usage

### 🔗 Copying Links
1. Open any web page.
2. Hover your mouse cursor over the link you want to copy (e.g., text wrapped in an `<a>` tag).
3. **Right-click** and select **"Copy Link as Markdown"** from the context menu.
4. A Markdown string like `[Extracted Text](https://example.com...)` will be saved to your clipboard. You can paste it (`Ctrl+V` / `Cmd+V`) directly into your editor or notepad app.

### 📝 Copying Selections
1. Drag to select the text you want to copy (paragraphs, bullet points, multiple lines, etc.) on the webpage.
2. **Right-click** on the selected area and choose **"Copy selection as Markdown"**.
3. The converted Markdown string (e.g., `# Heading` or `- List`) will be saved to your clipboard securely preserving the original HTML tag formats.

## 📦 Installation (Developer Mode)
Since this extension is currently under development, you will need to load it manually from Chrome's extension management page.

1. Download (or clone) this repository to your local development environment.
2. Open the directory in your terminal and build the package:
   ```bash
   npm install
   npm run build
   ```
3. Open Chrome and enter `chrome://extensions/` in the URL bar to open the extensions management page.
4. Turn **ON** the **"Developer mode"** toggle switch in the upper right corner of the screen.
5. Click **"Load unpacked"** in the upper left corner.
6. Select the `MdPicker/MdPicker` directory (it MUST be the folder containing `manifest.json` inside it).
7. Installation is complete. You can verify this by checking that the MdPicker icon has been added next to your browser's address bar.

## 🛠️ Development

This project uses **TypeScript** and **Webpack** for the build process.

```bash
# Install dependencies
npm install

# Production build (outputs minified code and zip release)
npm run build

# Development watch build (automatically rebuilds on code changes)
npm run dev
```

For detailed technical architecture and rules, please refer to `SPEC.md` and `GEMINI.md` within this repository.
