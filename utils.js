// Utility functions for Dev Memory Extension

/**
 * Debounce function to limit how often a function can fire
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Generate a unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format timestamp to readable string
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Sanitize HTML content
 */
function sanitizeHTML(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
}

/**
 * Extract text content from element while preserving structure
 */
function extractTextContent(element) {
    if (!element) return '';

    const clone = element.cloneNode(true);
    const scripts = clone.querySelectorAll('script, style');
    scripts.forEach(s => s.remove());

    return clone.textContent || clone.innerText || '';
}

/**
 * Generate a title from conversation content
 */
function generateConversationTitle(firstMessage, maxLength = 50) {
    if (!firstMessage) return 'Untitled Conversation';

    const text = firstMessage.trim();
    if (text.length <= maxLength) return text;

    return text.substring(0, maxLength) + '...';
}

/**
 * Get current timestamp
 */
function getCurrentTimestamp() {
    return Date.now();
}

/**
 * Check if extension is enabled
 */
async function isExtensionEnabled() {
    try {
        const result = await chrome.storage.local.get(['enabled']);
        return result.enabled !== false;
    } catch (error) {
        console.error('Error checking extension state:', error);
        return true;
    }
}

/**
 * Set extension enabled state
 */
async function setExtensionEnabled(enabled) {
    try {
        await chrome.storage.local.set({ enabled });
        return true;
    } catch (error) {
        console.error('Error setting extension state:', error);
        return false;
    }
}

/**
 * Export to JSON file
 */
function exportToJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

/**
 * Export conversation to Markdown
 */
function exportToMarkdown(conversation, messages) {
    let markdown = `# ${conversation.title}\\n\\n`;
    markdown += `**Platform:** ${conversation.platform}\\n`;
    markdown += `**Date:** ${formatTimestamp(conversation.createdAt)}\\n`;
    markdown += `**Messages:** ${messages.length}\\n\\n`;
    markdown += `---\\n\\n`;

    for (const msg of messages) {
        const role = msg.role === 'user' ? '**You**' : '**Assistant**';
        markdown += `### ${role}\\n\\n`;
        markdown += `${msg.content}\\n\\n`;
        markdown += `---\\n\\n`;
    }

    return markdown;
}

/**
 * Export conversation to HTML
 */
function exportToHTML(conversation, messages) {
    const title = sanitizeHTML(conversation.title);
    const date = formatTimestamp(conversation.createdAt);

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .header h1 { margin-bottom: 10px; }
    .header .meta { opacity: 0.9; font-size: 14px; }
    .message {
      background: white;
      margin: 20px 0;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .message.user { border-left: 4px solid #667eea; }
    .message.assistant { border-left: 4px solid #764ba2; }
    .role {
      font-weight: 600;
      margin-bottom: 10px;
      color: #667eea;
    }
    .message.assistant .role { color: #764ba2; }
    .content {
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="meta">
      <div>Platform: ${conversation.platform}</div>
      <div>Date: ${date}</div>
      <div>Messages: ${messages.length}</div>
    </div>
  </div>
`;

    for (const msg of messages) {
        const roleClass = msg.role === 'user' ? 'user' : 'assistant';
        const roleText = msg.role === 'user' ? 'You' : 'Assistant';
        const content = sanitizeHTML(msg.content);

        html += `  <div class="message ${roleClass}">
    <div class="role">${roleText}</div>
    <div class="content">${content}</div>
  </div>
`;
    }

    html += `  <div class="footer">
    Exported from Dev Memory on ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;

    return html;
}

/**
 * Export all conversations to CSV
 */
function exportToCSV(conversations, allMessages) {
    const rows = [['Conversation', 'Role', 'Content', 'Timestamp', 'Platform']];

    for (const conv of conversations) {
        const messages = allMessages[conv.conversationId] || [];
        for (const msg of messages) {
            rows.push([
                conv.title,
                msg.role,
                msg.content.replace(/"/g, '""'), // Escape quotes
                new Date(msg.timestamp).toISOString(),
                conv.platform
            ]);
        }
    }

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\\n');
}

/**
 * Download file with content
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

/**
 * Log with prefix
 */
function log(...args) {
    console.log('[Dev Memory]', ...args);
}

/**
 * Error log with prefix
 */
function logError(...args) {
    console.error('[Dev Memory]', ...args);
}
