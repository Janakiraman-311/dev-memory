# Quick Start Guide - Dev Memory Extension

## Installation Steps

### 1. Open Chrome Extensions Page
- Open Google Chrome
- Type `chrome://extensions/` in the address bar and press Enter
- OR click the three dots menu → More tools → Extensions

### 2. Enable Developer Mode
- Look for the "Developer mode" toggle in the top-right corner
- Click to enable it (it should turn blue/on)

### 3. Load the Extension
- Click the "Load unpacked" button (appears after enabling Developer mode)
- Navigate to: `C:\Users\Janak\OneDrive\Documents\Dev-Memory modal (PI)\dev-memory-extension`
- Click "Select Folder"

### 4. Verify Installation
- You should see "Dev Memory" appear in your extensions list
- The extension icon should appear in your Chrome toolbar
- If you don't see the icon, click the puzzle piece icon and pin "Dev Memory"

## First Use

### 1. Enable the Extension
- Click the Dev Memory icon in your toolbar
- Make sure the toggle switch is ON (green)

### 2. Visit Claude.ai
- Open a new tab
- Go to https://claude.ai
- Log in if needed

### 3. Start a Conversation
- Start a new conversation or open an existing one
- Type a message and send it
- The extension will automatically capture the conversation

### 4. View Your Conversations
- Click the Dev Memory icon
- You should see your conversation listed
- Click on it to view details

## Troubleshooting

### Extension won't load
- Make sure you selected the correct folder (`dev-memory-extension`)
- Check that all files are present
- Look for error messages in the extensions page

### Not capturing conversations
- Verify the toggle is ON (green)
- Refresh the Claude.ai page
- Open DevTools (F12) and check Console for errors

### Can't see the extension icon
- Click the puzzle piece icon in Chrome toolbar
- Find "Dev Memory" and click the pin icon

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Extension icon appears in toolbar
- [ ] Popup opens when clicking icon
- [ ] Toggle switch works
- [ ] Can navigate to Claude.ai
- [ ] Conversations are captured
- [ ] Conversations appear in popup
- [ ] Search works
- [ ] Export works

## Next Steps

Once you've verified the extension works:
1. Test with multiple conversations
2. Try the search functionality
3. Export your data
4. Provide feedback on what works and what needs improvement

## Need Help?

Check the console logs:
- **Content Script**: F12 on Claude.ai page → Console tab
- **Popup**: Right-click extension icon → Inspect popup
- **Background**: chrome://extensions/ → Click "service worker"

Look for messages starting with `[Dev Memory]`
