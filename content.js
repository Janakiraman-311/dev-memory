// -----------------------------------------------------------------------------
// Dev Memory - Content Script (Unified)
// -----------------------------------------------------------------------------

(async () => {
    // Config
    /** @type {boolean} Toggle detailed console logging (Set to false for production) */
    const DEBUG = false;

    /**
     * Internal state management for the capture process.
     * @property {?string} conversationId - The current conversation ID.
     * @property {number} messageOrder - Counter for message ordering.
     * @property {Set<string>} capturedMessageIds - Set of IDs to prevent duplicates.
     * @property {boolean} isCapturing - Whether capture is globally enabled.
     */
    const STATE = {
        conversationId: null,
        messageOrder: 0,
        capturedMessageIds: new Set(),
        isCapturing: true
    };

    /**
     * Logs messages to the console if DEBUG is true.
     * @param {string} msg - The message to log.
     */
    function log(msg) {
        if (!DEBUG) return;

        // Check if extension context is still valid
        try {
            if (!chrome.runtime.id) throw new Error('Context invalidated');
            console.log(`[DevMem] ${msg}`);
        } catch (e) {
            console.warn('[DevMem] Extension updated/reloaded. Please refresh the page to continue capturing.');
        }
    }

    log('Script starting on: ' + window.location.hostname);

    // ==========================================
    // Platform Adapters
    // ==========================================

    /**
     * Configuration adapters for supported AI platforms.
     * Each adapter defines how to extract conversation ID, title, messages, roles, and content.
     */
    const ADAPTERS = {
        'claude.ai': {
            name: 'Claude',

            getConversationId: () => {
                const match = window.location.href.match(/\/chat\/([a-zA-Z0-9-]+)/);
                return match ? match[1] : null;
            },

            getTitle: () => {
                const el = document.querySelector('[data-testid="conversation-title"], .conversation-title, h1');
                return el ? el.textContent.trim() : 'New Chat';
            },

            getMessageElements: () => {
                // Claude's specific message containers
                const selectors = [
                    '.font-claude-message',
                    '.font-claude-response-body',
                    '.font-user-message',
                    '[data-testid="user-message"]',
                    '[data-testid="assistant-message"]'
                ];
                const nodes = document.querySelectorAll(selectors.join(', '));
                return Array.from(nodes).filter(el => {
                    // Filter out empty or structural divs
                    return el.innerText && el.innerText.trim().length > 0;
                });
            },

            getRole: (el) => {
                if (el.classList.contains('font-user-message')) return 'user';
                if (el.querySelector('.font-user-message')) return 'user';
                if (el.dataset.testid === 'user-message') return 'user';
                if (el.dataset.isUserMessage) return 'user';

                // Check internal content
                if (el.textContent.startsWith('User:')) return 'user';

                // Check Icon presence (Assistant usually has the logo)
                if (el.querySelector('svg[aria-label="Claude"]')) return 'assistant';

                return 'assistant';
            },

            getContent: (el) => {
                const contentEl = el.querySelector('.font-claude-message, [data-message-content], .message-content, .prose, .grid');
                let content = contentEl ? contentEl.textContent.trim() : el.textContent.trim();

                // Cleanup Claude artifacts UI noise
                content = content.replace(/^Artifacts\s*/i, '');
                content = content.replace(/Download all/gi, '');
                content = content.replace(/Code · (HTML|JavaScript|Python|CSS|TypeScript|Bash|JSON|SQL|Text)/gi, '');

                return content.trim();
            },

            isReady: () => !!document.querySelector('.font-claude-message, .font-user-message, [data-testid="user-message"], .font-claude-response-body')
        },

        'chatgpt.com': {
            name: 'ChatGPT',

            getConversationId: () => {
                const match = window.location.href.match(/\/c\/([a-zA-Z0-9-]+)/);
                return match ? match[1] : null; // UUID
            },

            getTitle: () => {
                return document.title.replace('ChatGPT', '').trim() || 'New Chat';
            },

            getMessageElements: () => {
                // ChatGPT uses <article> tags for messages
                return document.querySelectorAll('article');
            },

            getRole: (el) => {
                // Check for user avatar or specific classes
                const isUser = el.querySelector('[data-message-author-role="user"]');
                if (isUser) return 'user';

                // Fallback: Check for user avatar SVG path (simpler)
                const userIcon = el.querySelector('img[alt="User"], svg circle');
                // Assistant usually has the ChatGPT logo (or no user icon)
                return userIcon ? 'user' : (el.dataset.testid ? 'assistant' : 'assistant');
            },

            getContent: (el) => {
                // Main content container
                const contentEl = el.querySelector('.markdown, .whitespace-pre-wrap');
                return contentEl ? contentEl.textContent.trim() : el.textContent.trim();
            },

            isReady: () => !!document.querySelector('article')
        },

        'gemini.google.com': {
            name: 'Gemini',

            getConversationId: () => {
                const match = window.location.href.match(/\/app\/([a-zA-Z0-9]+)/);
                return match ? match[1] : null;
            },

            getTitle: () => {
                const el = document.querySelector('h1, .conversation-title, [data-test-id="conversation-title"]');
                return el ? el.textContent.trim() : 'Gemini Chat';
            },

            getMessageElements: () => {
                // Gemini uses custom elements and classes
                // Targeting both message content and specific user query containers
                return document.querySelectorAll('message-content, .message-content, .model-response-container, .user-query, .query-text');
            },

            getRole: (el) => {
                if (el.classList.contains('user-query') || el.classList.contains('query-text')) return 'user';
                if (el.getAttribute('data-is-user') === 'true') return 'user';
                if (el.closest('.user-query')) return 'user';
                return 'assistant';
            },

            getContent: (el) => {
                return el.textContent.trim();
            },

            isReady: () => !!document.querySelector('message-content, .message-content, .user-query')
        },

        'perplexity.ai': {
            name: 'Perplexity',

            getConversationId: () => {
                const match = window.location.href.match(/\/search\/([a-zA-Z0-9-]+)/);
                return match ? match[1] : null;
            },

            getTitle: () => {
                return document.querySelector('h1')?.textContent.trim() || 'Perplexity Search';
            },

            getMessageElements: () => {
                // Perplexity Selectors (Structure Based)
                // Assistant: .prose (The content block)
                // User: h1 (often group/query), or .bg-offset (User bubble)

                const selectors = [
                    '.prose',
                    'h1',
                    '.bg-offset' // The gray user bubble
                ];

                const candidates = Array.from(document.querySelectorAll(selectors.join(', ')));
                const validNodes = [];

                candidates.forEach(el => {
                    // 1. Sidebar/UI Filter
                    if (el.closest('nav') || el.closest('aside')) return;
                    if (el.tagName === 'BUTTON' || el.closest('button')) return;

                    // 2. Nesting Filter
                    // Don't capture .bg-offset if it's inside .prose (unlikely but safe)
                    // Don't capture .prose if it's inside another captured .prose
                    if (el.closest('.prose') && el !== el.closest('.prose')) return;

                    // 3. User Bubble Specifics
                    if (el.classList.contains('bg-offset')) {
                        // User bubbles usually have rounded corners and specific styling
                        // Filter out generic bg-offset uses (like full layout wrappers)
                        // User bubble usually has 'rounded-2xl' or similar
                        if (!el.className.includes('rounded')) return;
                    }

                    // 4. Noise Filter
                    const text = el.innerText?.trim();
                    if (!text || text.length < 2) return;
                    if (['Sources', 'Related', 'View detailed', 'Rewrite', 'Copy'].includes(text)) return;

                    if (validNodes.includes(el)) return;

                    validNodes.push(el);
                });
                return validNodes;
            },

            getRole: (el) => {
                if (el.tagName === 'H1') return 'user';
                if (el.classList.contains('bg-offset')) return 'user';
                return 'assistant'; // Default (.prose)
            },

            getContent: (el) => {
                // Clone to avoid modifying DOM
                const clone = el.cloneNode(true);

                // Remove citation numbers (often sup or .citation)
                const citations = clone.querySelectorAll('.citation, sup, a.citation');
                citations.forEach(c => c.remove());

                return clone.innerText.trim();
            },

            isReady: () => !!document.querySelector('.prose')
        }
    };

    // ==========================================
    // Initialization
    // ==========================================

    // Detect Platform
    const host = window.location.hostname;
    let adapter = null;

    for (const [domain, config] of Object.entries(ADAPTERS)) {
        if (host.includes(domain) || (domain === 'chatgpt.com' && host.includes('openai'))) {
            adapter = config;
            break;
        }
    }

    if (!adapter) {
        log(`Platform not explicitly supported: ${host}. Extension inactive.`);
        return;
    }

    log(`Initialized for ${adapter.name}`);

    /**
     * Checks if capture is enabled in extension storage.
     * @returns {Promise<boolean>} True if capture is enabled.
     */
    async function checkEnabled() {
        try {
            const result = await chrome.storage.local.get(['enabled']);
            STATE.isCapturing = result.enabled !== false;
            if (!STATE.isCapturing) log('Capture disabled by user');
            return STATE.isCapturing;
        } catch (e) {
            log('Error checking enabled status: ' + e);
            return false;
        }
    }

    // ==========================================
    // Capture Logic
    // ==========================================

    /**
     * Main capture function. Scans the DOM for messages and saves them.
     * @returns {Promise<void>}
     */
    async function captureMessages() {
        if (!STATE.isCapturing) return;

        // Ensure we have an ID
        if (!STATE.conversationId) {
            STATE.conversationId = adapter.getConversationId() || generateId();
        }

        log(`Capturing for ID: ${STATE.conversationId}`); // DEBUG LOG

        const title = adapter.getTitle();

        // Save conversation metadata
        const conversation = {
            conversationId: STATE.conversationId,
            title: title,
            platform: adapter.name,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            url: window.location.href
        };

        await saveConversation(conversation);

        // Process messages
        const elements = adapter.getMessageElements();

        if (!elements || elements.length === 0) {
            log('No message elements found (Selector mismatch?)'); // DEBUG LOG
            return;
        }

        log(`Found ${elements.length} message elements`);

        for (const el of elements) {
            await processMessageElement(el);
        }
    }

    /**
     * Processes a single message DOM element.
     * Extracts content, role, detects duplicates, and saves to storage.
     * @param {HTMLElement} el - The message DOM element.
     * @returns {Promise<void>}
     */
    async function processMessageElement(el) {
        try {
            const content = adapter.getContent(el);

            // Skip empty or very short technical noise (but keep "Yes", "No")
            if (!content || content.trim().length === 0) return;

            const role = adapter.getRole(el);

            // Create stable ID
            const msgId = await generateMessageId(role, content);

            if (STATE.capturedMessageIds.has(msgId)) return;

            const message = {
                conversationId: STATE.conversationId,
                role: role,
                content: content,
                timestamp: Date.now(),
                order: STATE.messageOrder++
            };

            await saveMessage(message);
            STATE.capturedMessageIds.add(msgId);
            log(`Captured [${role}]: ${content.substring(0, 30)}...`);

        } catch (e) {
            log('Error processing message: ' + e);
        }
    }

    // ==========================================
    // Storage Helpers
    // ==========================================

    /**
     * Saves or updates conversation metadata in Chrome Local Storage.
     * @param {Object} conversation - The conversation object.
     * @returns {Promise<void>}
     */
    async function saveConversation(conversation) {
        try {
            // Get existing to preserve createdAt
            const result = await chrome.storage.local.get(['dev_memory_conversations']);
            let conversations = result.dev_memory_conversations || {};

            // If it's an array (from old buggy version), convert to object
            if (Array.isArray(conversations)) {
                log('Migrating conversations from Array to Object...');
                const convObj = {};
                conversations.forEach(c => {
                    convObj[c.conversationId] = c;
                });
                conversations = convObj;
            }

            const existing = conversations[conversation.conversationId];

            if (existing) {
                // Update existing
                conversations[conversation.conversationId] = {
                    ...existing,
                    ...conversation,
                    updatedAt: Date.now(),
                    // Preserve messageCount if not in update
                    messageCount: conversation.messageCount || existing.messageCount
                };
            } else {
                // Add new
                conversations[conversation.conversationId] = {
                    ...conversation,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    messageCount: 0
                };
            }

            await chrome.storage.local.set({ dev_memory_conversations: conversations });
        } catch (e) {
            log('Error saving conversation: ' + e);
        }
    }

    /**
     * Saves a message to Chrome Local Storage, handling streaming updates.
     * @param {Object} message - The message object.
     * @returns {Promise<void>}
     */
    async function saveMessage(message) {
        try {
            const key = 'dev_memory_messages';
            const result = await chrome.storage.local.get([key]);
            const allMessages = result[key] || {};

            if (!allMessages[message.conversationId]) {
                allMessages[message.conversationId] = [];
            }

            const messages = allMessages[message.conversationId];
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

            // STREAMING SUPPORT:
            // If the last message has the same role and is recent (< 5 mins), update it instead of adding new
            // This handles AI streaming where content grows incrementally
            const isStreamingUpdate = lastMessage &&
                lastMessage.role === message.role &&
                (Date.now() - (lastMessage.timestamp || 0) < 5 * 60 * 1000);

            if (isStreamingUpdate) {
                // Only update if content is longer (growing) or different
                if (message.content.length > lastMessage.content.length) {
                    lastMessage.content = message.content;
                    lastMessage.timestamp = Date.now(); // Update timestamp to show activity
                    log('Updated existing message (streaming)');
                } else {
                    return; // Ignore if content shrank or same (dedupe)
                }
            } else {
                // Check for exact duplicates (for non-streaming cases)
                const isDuplicate = messages.some(m =>
                    m.role === message.role &&
                    m.content === message.content
                );

                if (isDuplicate) {
                    return;
                }

                messages.push(message);
            }

            // Clean up old messages (keep last 100 per conv to be safe during dev)
            // In prod updates, we rely on unlimitedStorage

            await chrome.storage.local.set({ [key]: allMessages });

            // Update conversation count
            await updateConversationCount(message.conversationId, allMessages[message.conversationId].length);

        } catch (e) {
            log('Error saving message: ' + e);
        }
    }

    /**
     * Updates the message count for a specific conversation.
     * @param {string} conversationId - The conversation ID.
     * @param {number} count - The new message count.
     * @returns {Promise<void>}
     */
    async function updateConversationCount(conversationId, count) {
        try {
            const result = await chrome.storage.local.get(['dev_memory_conversations']);
            const conversations = result.dev_memory_conversations || {};

            if (conversations[conversationId]) {
                conversations[conversationId].messageCount = count;
                conversations[conversationId].updatedAt = Date.now();
                await chrome.storage.local.set({ dev_memory_conversations: conversations });
            }
        } catch (e) {
            log('Error updating count: ' + e);
        }
    }

    /**
     * Generates a random conversation ID.
     * @returns {string} The generated ID.
     */
    function generateId() {
        return 'conv-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
    }

    /**
     * Generates a stable content-based hash ID for messages.
     * @param {string} role - Message role.
     * @param {string} content - Message content.
     * @returns {Promise<string>} The generated hash ID.
     */
    async function generateMessageId(role, content) {
        // Simple hash for stability
        const str = `${role}:${content.trim()}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `msg-${hash}`;
    }

    /**
     * Debounces a function call.
     * @param {Function} func - The function to debounce.
     * @param {number} wait - Wait time in milliseconds.
     * @returns {Function} Debounced function.
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

    // ==========================================
    // Observers & Events
    // ==========================================

    function setupObservers() {
        // 1. URL Observer
        let lastUrl = window.location.href;
        const urlObserver = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                log('URL changed, resetting...');
                STATE.conversationId = adapter.getConversationId(); // Try to get ID from URL
                STATE.capturedMessageIds.clear();
                STATE.messageOrder = 0;
                // Re-check capture
                captureMessages();
            }
        });
        urlObserver.observe(document.body, { childList: true, subtree: true });

        // 2. DOM Observer (Auto-capture)
        const domObserver = new MutationObserver(debounce(() => {
            if (adapter.isReady()) {
                captureMessages();
            }
        }, 1000));

        domObserver.observe(document.body, { childList: true, subtree: true });

        log('Observers active');
    }

    // Initialize
    if (await checkEnabled()) {
        setupObservers();
        // Initial capture attempt
        setTimeout(captureMessages, 2000);
    }

    // Listen for toggle changes
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.enabled) {
            STATE.isCapturing = changes.enabled.newValue !== false;
            log(`Capture state changed: ${STATE.isCapturing}`);
            if (STATE.isCapturing) captureMessages();
        }
    });

})();
