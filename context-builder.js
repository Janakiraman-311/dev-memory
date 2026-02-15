// Context Builder - Format conversations for AI context injection

/**
 * Build formatted context from a conversation
 */
/**
 * Build formatted context from conversations or messages
 * @param {Object|Array} item Single conversation or array of items
 * @param {Array} messages Messages for the single conversation (optional if item is array)
 * @param {Object} options Configuration options
 */
function buildContext(item, messages, options = {}) {
    const {
        maxTokens = 20000,
        includeMetadata = true,
        format = 'xml' // 'xml' | 'markdown'
    } = options;

    let context = '';

    // Handle single conversation (legacy mode)
    if (!Array.isArray(item)) {
        return buildSingleContext(item, messages, options);
    }

    // Handle Context Builder (Array of items)
    context += `I am providing you with context from previous development sessions. Use this to understand the project history and answer my following questions.\n\n`;

    // JSON Format
    if (format === 'json') {
        const data = {
            conversations: item.map(entry => ({
                id: entry.id,
                date: formatDate(entry.timestamp),
                topic: entry.title,
                platform: entry.platform,
                messages: entry.messages.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                }))
            }))
        };
        return JSON.stringify(data, null, 2);
    }

    // Markdown Format
    if (format === 'text' || format === 'markdown') {
        for (const entry of item) {
            context += `## Conversation: ${entry.title} (${formatDate(entry.timestamp)})\n\n`;
            for (const msg of entry.messages) {
                const role = msg.role === 'user' ? 'User' : 'Assistant';
                context += `**${role}:** ${msg.content}\n\n`;
            }
            context += `---\n\n`;
        }
        return context;
    }

    // Default: XML Format (Safest)
    context += `<context>\n`;

    for (const entry of item) {
        if (entry.type === 'conversation') {
            context += `  <conversation id="${entry.id}" date="${formatDate(entry.timestamp)}" topic="${escapeXml(entry.title)}">\n`;

            for (const msg of entry.messages) {
                const role = msg.role === 'user' ? 'User' : 'Assistant';
                context += `    <message role="${role}">\n      ${escapeXmlContent(msg.content)}\n    </message>\n`;
            }

            context += `  </conversation>\n\n`;
        }
    }

    context += `</context>\n`;

    return context;
}

/**
 * Recommend best format based on token budget
 * @param {number} estimatedTokens Token count of content
 * @param {number} budget Token budget (default 100k)
 */
function recommendContextFormat(estimatedTokens, budget = 100000) {
    // XML overhead is ~20%, JSON is ~5%, Text is ~0%

    // If we have plenty of space (< 40% of budget), use XML for best AI comprehension
    if (estimatedTokens < budget * 0.4) {
        return {
            format: 'xml',
            reason: 'Best Quality (Plenty of space)',
            color: 'green'
        };
    }

    // If getting tight (< 70%), use JSON
    if (estimatedTokens < budget * 0.7) {
        return {
            format: 'json',
            reason: 'Efficient (Saves ~15%)',
            color: 'orange'
        };
    }

    // If very tight, use Markdown/Text
    return {
        format: 'text',
        reason: 'Compact (Saves ~20%)',
        color: 'red'
    };
}

/**
 * Build context for a single conversation
 */
function buildSingleContext(conversation, messages, options) {
    let context = '';

    // Metadata
    if (options.includeMetadata) {
        context += `=== Context: ${conversation.title} ===\n`;
        context += `Date: ${formatDate(conversation.createdAt)}\n`;
        context += `Platform: ${conversation.platform}\n\n`;
    }

    // Messages
    for (const msg of messages) {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        context += `**${role}:** ${msg.content}\n\n`;
    }

    return context;
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function escapeXmlContent(content) {
    // Escape CDATA end sequence specifically, otherwise just wrap in CDATA if it contains special chars
    if (content.includes(']]>')) {
        return content.replace(/]]>/g, ']]]]><![CDATA[>');
    }
    if (/[<>&]/.test(content)) {
        return `<![CDATA[${content}]]>`;
    }
    return content;
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
}

/**
 * Truncate text to approximate token limit
 */
function truncateToTokenLimit(text, maxTokens) {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) {
        return text;
    }
    return text.substring(0, maxChars);
}

/**
 * Format date for display
 */
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}

/**
 * Show temporary notification
 */
function showNotification(message, duration = 2000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Hide and remove after duration
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
}
