# Dev Memory - Your AI Conversation Library

[![Available in the Microsoft Edge Add-ons Store](https://img.shields.io/badge/Edge%20Add--ons-Available-blue?logo=microsoft-edge)](https://microsoftedge.microsoft.com/addons/detail/mdhocmgamippibldedfddfofnekmfjkc)

> 🚀 **[Install from Microsoft Edge Add-ons Store](https://microsoftedge.microsoft.com/addons/detail/mdhocmgamippibldedfddfofnekmfjkc)**

A browser extension that automatically captures and organizes your conversations from ChatGPT, Claude, Gemini, and Perplexity—all stored privately on your device.

## Why Dev Memory?

**The Problem:** You have valuable AI conversations scattered across multiple platforms. When you need to reference a past discussion, build on previous work, or share context with AI, you're stuck searching through chat histories or worse—you've lost the conversation entirely.

**The Solution:** Dev Memory automatically captures every AI conversation, stores it locally on your device, and gives you powerful tools to search, organize, and reuse your knowledge.

### Real-World Use Cases

- **Developers**: Reference past debugging sessions, code explanations, and architecture discussions
- **Researchers**: Build a searchable library of research conversations and insights
- **Writers**: Keep track of brainstorming sessions, outlines, and creative ideas
- **Students**: Organize study sessions and explanations across different topics
- **Professionals**: Maintain a knowledge base of AI-assisted problem-solving

### Key Benefits

✅ **Never Lose Context** - All conversations automatically saved  
✅ **Cross-Platform Search** - Find any conversation across ChatGPT, Claude, Gemini, or Perplexity  
✅ **Build Better Prompts** - Combine past conversations to give AI more context  
✅ **100% Private** - Everything stays on your device, no cloud sync  
✅ **Export Anywhere** - Download as JSON, Markdown, or HTML  

## Features

### 🤖 Multi-Platform Capture
Automatically captures conversations from:
- **ChatGPT** (chatgpt.com, chat.openai.com)
- **Claude** (claude.ai)
- **Gemini** (gemini.google.com)
- **Perplexity** (perplexity.ai)

### 🔍 Powerful Search & Organization
- Search by keywords across all platforms
- Filter by platform, date, or custom tags
- Sort by date, message count, or title
- Tag conversations for easy categorization

### 🧠 Context Builder
- Combine multiple past conversations
- Create context-rich prompts for AI
- Estimate token usage before copying
- One-click copy to clipboard

### 💾 Export & Import
- Export conversations as JSON, Markdown, or HTML
- Import previous exports to restore data
- Backup your entire conversation library
- Transfer data between devices

### 🔒 Privacy First
- All data stored locally using Chrome Storage API
- No cloud sync, no external servers
- No analytics or tracking
- Open source and transparent

## Installation

### Microsoft Edge (Recommended)

1. **From Edge Add-ons Store** (Coming Soon)
   - Visit the Edge Add-ons store
   - Search for "Dev Memory"
   - Click "Get" to install

2. **Load Unpacked (Development)**
   - Download or clone this repository
   - Open Edge and navigate to `edge://extensions/`
   - Enable "Developer mode" (toggle in bottom left)
   - Click "Load unpacked"
   - Select the `dev-memory-extension` folder
   - The extension icon should appear in your toolbar

### Google Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dev-memory-extension` folder
5. The extension icon should appear in your toolbar

## Quick Start

1. **Pin the Extension**: Click the puzzle piece icon in your toolbar, then pin Dev Memory
2. **Enable Capture**: Click the Dev Memory icon and ensure the toggle is ON (green)
3. **Start Chatting**: Visit ChatGPT, Claude, Gemini, or Perplexity and have a conversation
4. **View Your Library**: Click the Dev Memory icon to open the side panel and see your saved conversations

## Usage Guide

### Capturing Conversations
- Conversations are captured automatically when you chat on supported platforms
- Look for the "Saved" notification to confirm capture
- Toggle capture on/off anytime from the popup

### Viewing Conversations
- Click the extension icon to open the side panel
- Browse conversations by date (Today, Yesterday, Previous 7 Days, etc.)
- Click any conversation to view full message history

### Searching & Filtering
- Use the search bar to find conversations by keywords
- Filter by platform using the dropdown
- Filter by tags you've added

### Organizing with Tags
- Click the "+ tag" button on any conversation
- Add custom tags for categorization
- Filter conversations by tag

### Building Context
- Select a conversation
- Click "Add to Context Builder"
- Combine multiple conversations
- Copy the combined context to use in new AI chats

### Exporting Data
- Click the "Export" button in the popup
- Choose format: JSON, Markdown, or HTML
- Save your conversation library

## Project Structure

```
dev-memory-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for extension lifecycle
├── content.js            # Unified capture logic (All platforms)
├── storage.js            # Chrome Storage API wrapper
├── utils.js              # Utility functions
├── context-builder.js    # Context building logic
├── sidepanel/            # Side Panel UI (Main Interface)
│   ├── sidepanel.html
│   ├── sidepanel.css
│   └── sidepanel.js
├── popup/                # Popup UI (Quick Access)
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── onboarding/           # Welcome page
│   ├── welcome.html
│   ├── style.css
│   └── welcome.js
├── utils/                # Utilities
│   └── tokenizer.js      # Token estimation
└── icons/                # Extension icons
```

## Technical Details

### Storage
- **System**: Chrome Storage API (`chrome.storage.local`)
- **Capacity**: Unlimited (via `unlimitedStorage` permission)
- **Data Model**:
  - Conversations: Metadata index with title, platform, timestamp
  - Messages: Individual messages stored by conversation ID
  - Tags: Custom tags for organization

### Supported Platforms
| Platform | Domain | Capture Method |
|----------|--------|----------------|
| ChatGPT | chatgpt.com, chat.openai.com | MutationObserver |
| Claude | claude.ai | MutationObserver |
| Gemini | gemini.google.com | Custom DOM Selectors |
| Perplexity | perplexity.ai | MutationObserver |

### Privacy & Security
- **Local Storage Only**: All data stored in Chrome's local storage
- **No External Requests**: Extension never sends data to external servers
- **No Analytics**: No tracking, no telemetry, no data collection
- **Open Source**: Full transparency - review the code yourself

## Roadmap

### ✅ Completed
- [x] Multi-platform capture (Claude, ChatGPT, Gemini, Perplexity)
- [x] Local storage with privacy-first approach
- [x] Export to JSON/Markdown/HTML formats
- [x] Search and filtering by platform, date, keywords
- [x] Platform selector dropdown for quick access
- [x] Tag-based organization
- [x] Side panel UI with conversation browsing
- [x] Modern glassmorphism onboarding page

### 🚧 In Progress
- [ ] Context Builder for IDE injection
- [ ] Token estimation and optimization
- [ ] Auto-synthesis of conversations to numbered points
- [ ] Advanced search with date range filters

### 🔮 Planned

#### v1.1 (Next Release)
- [ ] Conversation notes and annotations
- [ ] Keyboard shortcuts for quick access
- [ ] Dark/light theme toggle
- [ ] Conversation sharing (export single conversation)

#### v1.2 (Future)
- [ ] IDE plugins (VSCode, Cursor, Windsurf)
- [ ] Semantic search across conversations
- [ ] Knowledge graph visualization
- [ ] Automatic tagging suggestions
- [ ] Statistics dashboard (usage analytics)
- [ ] Custom export templates

#### v2.0 (Long-term Vision)
- [ ] XML context format optimization
- [ ] Team collaboration features
- [ ] AI-powered conversation summaries
- [ ] Conversation branching visualization
- [ ] Optional cloud sync (with encryption)

### 💡 Under Consideration
- [ ] Firefox browser support
- [ ] Mobile companion app
- [ ] Support for additional AI platforms
- [ ] Browser-agnostic web app version

**Want to contribute?** Check [open issues](https://github.com/Janakiraman-311/dev-memory/issues) or suggest features!

## Development

### Debug Mode
Edit `content.js` and set `DEBUG = true` to see detailed console logs with `[DevMem]` prefix.

### Testing
1. Load the extension in developer mode
2. Visit supported AI platforms
3. Check browser console for capture logs
4. Verify data in side panel

## Privacy Policy

Read our full [Privacy Policy](PRIVACY_POLICY.md) to understand how Dev Memory handles your data.

**TL;DR**: Everything stays on your device. We don't collect, transmit, or store any of your data.

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Support

- **Email**: [devmemory.extension@gmail.com](mailto:devmemory.extension@gmail.com)
- **Issues**: [GitHub Issues](https://github.com/Janakiraman-311/dev-memory/issues)
- **Repository**: [github.com/Janakiraman-311/dev-memory](https://github.com/Janakiraman-311/dev-memory)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Quick ways to contribute:
- Report bugs via [GitHub Issues](https://github.com/Janakiraman-311/dev-memory/issues)
- Suggest features or improvements
- Submit pull requests
- Improve documentation
- Share feedback

## Acknowledgments

Built with ❤️ for the AI community. Special thanks to all users who provided feedback and suggestions.

---

**Note**: Dev Memory is an independent project and is not affiliated with OpenAI, Anthropic, Google, or Perplexity.
