# Testing the Updated Extension

## What Changed

I've updated the `content.js` file with:
- ✅ Better message detection with multiple fallback strategies
- ✅ Enhanced debugging logs to see what's happening
- ✅ More robust content extraction
- ✅ Smarter filtering to avoid capturing UI elements

## How to Test

### Step 1: Reload the Extension

1. Go to `chrome://extensions/`
2. Find "Dev Memory"
3. Click the **refresh icon** (circular arrow) on the extension card
4. This will reload the extension with the new code

### Step 2: Refresh Claude.ai

1. Go back to your Claude.ai tab
2. Press **F5** or **Ctrl+R** to refresh the page
3. Wait for the page to fully load

### Step 3: Check Console Logs

1. Press **F12** to open DevTools
2. Go to the **Console** tab
3. Look for `[Dev Memory]` messages

**You should see:**
```
[Dev Memory] Content script loaded on Claude.ai
[Dev Memory] Database initialized successfully
[Dev Memory] Initializing capture for conversation: [id]
[Dev Memory] Scanning for existing messages...
[Dev Memory] Found container: main
[Dev Memory] Found X elements matching: [selector]
[Dev Memory] Extracted user message: "..."
[Dev Memory] ✓ Captured user message (...)
[Dev Memory] Updated conversation: X messages
```

### Step 4: Send a Test Message

1. Type a message in Claude.ai: "Test message for Dev Memory"
2. Send it
3. Watch the console for new `[Dev Memory]` logs
4. You should see: `✓ Captured user message (Test message...)`

### Step 5: Check the Extension Popup

1. Click the Dev Memory icon in your toolbar
2. You should now see:
   - **Conversations count** > 0
   - **Messages count** > 0
   - Your conversation listed below

### Step 6: Verify Database

1. In DevTools, go to **Application** tab
2. Expand **IndexedDB** → **DevMemoryDB**
3. Click on **conversations** - you should see your conversation
4. Click on **messages** - you should see the captured messages

## Troubleshooting

### Still showing 0 conversations?

**Check the console for:**
- Any error messages
- How many messages were found during scan
- If messages are being extracted

**If you see "Found 0 elements":**
- The page structure might be different
- Take a screenshot of the Claude.ai page
- I can help create custom selectors

### Messages captured but not showing in popup?

**Try:**
1. Close and reopen the popup
2. Click the refresh button in the popup
3. Check if the database has data (Application → IndexedDB)

### Console shows errors?

**Copy the error message and share it** - I can fix it quickly

## What to Look For

✅ **Success indicators:**
- Console shows "Extracted user message: ..."
- Console shows "✓ Captured [role] message"
- Console shows "Updated conversation: X messages"
- Popup shows conversation count > 0
- IndexedDB has data

❌ **Problem indicators:**
- "Found 0 elements matching"
- "No messages captured"
- Errors in console
- Popup still shows 0

## Next Steps

Once messages are capturing:
1. Test with multiple messages
2. Test search functionality
3. Test export feature
4. Try different conversation types

Let me know what you see in the console!
