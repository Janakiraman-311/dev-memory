# Dev Memory - Personal Intelligence Extension

A Chrome extension that automatically captures and stores your AI conversations from **Claude, ChatGPT, Gemini, and Perplexity** for future reference and knowledge retention.

## Features

✨ **Multi-Platform Capture** - Automatically captures conversations from:
   - Claude.ai
   - ChatGPT.com
   - Gemini (Google)
   - Perplexity.ai
🗄️ **Local Storage** - All data stored locally in Chrome Storage (100% privacy, no cloud).
🔍 **Search & Filter** - Quickly find past conversations by keyword, platform, or tag.
🚀 **Launch AI** - Quick access dropdown to launch your favorite AI tools.
📊 **Statistics** - Track your conversation and message counts.
💾 **Export** - Export your conversations to JSON, Markdown, or HTML.
🎨 **Modern UI** - Clean, dark-themed interface with Tree View navigation.

## Installation

### Load Unpacked Extension (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dev-memory-extension` folder
5. The extension icon should appear in your toolbar

## Usage

1. **Enable the Extension**: Click the extension icon and ensure the toggle is ON (green).
2. **Visit an AI Site**: Navigate to Claude, ChatGPT, Gemini, or Perplexity.
3. **Automatic Capture**: The extension will automatically capture messages as you chat.
4. **View Conversations**: Open the Side Panel (or click the extension icon).
5. **Launch AI**: Use the "Launch AI" dropdown in the popup to switch platforms quickly.
6. **Export**: Use the Export button to save your data.

## Project Structure

```
dev-memory-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for extension lifecycle
├── content.js            # Unified capture logic (All platforms)
├── storage.js            # Chrome Storage API wrapper
├── utils.js              # Utility functions
├── sidepanel/            # Side Panel UI (Main Interface)
│   ├── sidepanel.html
│   ├── sidepanel.css
│   └── sidepanel.js
├── popup/                # Popup UI (Quick Access)
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── icons/                # Extension icons
```

## Technical Details

### Storage
- **System**: Chrome Storage API (`chrome.storage.local`)
- **Capacity**: Unlimited (via `unlimitedStorage` permission)
- **Data Model**:
  - `dev_memory_conversations`: Metadata index
  - `dev_memory_messages`: Message content by ID

### Supported Platforms
| Platform | Domain | Capture Strategy |
|----------|--------|------------------|
| Claude | claude.ai | DOM Observation (MutationObserver) |
| ChatGPT | chatgpt.com | DOM Observation |
| Gemini | gemini.google.com | Custom DOM Selectors |
| Perplexity | perplexity.ai | DOM Observation |

## Privacy

🔒 **100% Local** - All data is stored locally on your device. Nothing is sent to external servers.

## Development

### commands
- **Debug Mode**: Edit `content.js` and set `DEBUG = true` to see console logs `[DevMem]`.

## License

MIT License - Feel free to modify and distribute.

## Support

- **Email:** devmemory.extension@gmail.com
- **Issues:** [GitHub Issues](https://github.com/Janakiraman-311/dev-memory/issues)
- **Repository:** [github.com/Janakiraman-311/dev-memory](https://github.com/Janakiraman-311/dev-memory)

## Contributing

This is a personal project, but suggestions and improvements are welcome! Feel free to:
- Report bugs via [GitHub Issues](https://github.com/Janakiraman-311/dev-memory/issues)
- Submit feature requests
- Fork and create pull requests

---

**Note**: This extension is not affiliated with Anthropic, OpenAI, Google, or Perplexity. It's an independent tool for personal knowledge management.
