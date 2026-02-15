// Side Panel JavaScript
let allConversations = [];
let selectedConversationId = null;

// Context Builder State
let contextStaging = [];
let graphViz = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await init();
});

async function init() {
    // Load initial data
    await loadConversations();
    await updateStats();
    await populateTagFilter();

    // Check enabled status
    const result = await chrome.storage.local.get(['enabled']);
    const enabled = result.enabled !== false;
    updateToggleUI(enabled);

    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Toggle
    document.getElementById('toggleBtn').addEventListener('click', handleToggle);

    // Collapse sidebar
    document.getElementById('collapseSidebarBtn').addEventListener('click', toggleSidebar);
    document.getElementById('expandSidebarBtn').addEventListener('click', toggleSidebar);

    // Collapse filters
    document.getElementById('collapseFiltersBtn').addEventListener('click', toggleFilters);

    // Platform filter
    document.getElementById('platformFilter').addEventListener('change', filterAndRender);

    // Search
    document.getElementById('searchInput').addEventListener('input', filterAndRender);

    // Sort
    document.getElementById('sortBy').addEventListener('change', filterAndRender);

    // Tag filter
    document.getElementById('tagFilter').addEventListener('change', handleTagFilter);

    // Actions
    document.getElementById('copyContextBtn').addEventListener('click', handleCopyContext);
    // ... existing code ...
    /**
     * Handle tag filter (fetches new base set)
     */
    async function handleTagFilter(e) {
        const tag = e.target.value;

        if (!tag) {
            allConversations = await simpleStorage.getConversations(1000);
        } else {
            allConversations = await simpleStorage.getConversationsByTag(tag);
        }

        filterAndRender();
    }

    /**
     * Unified Filter and Render
     */
    function filterAndRender() {
        const platform = document.getElementById('platformFilter').value;
        const query = document.getElementById('searchInput').value.toLowerCase().trim();
        const sortBy = document.getElementById('sortBy').value;

        let filtered = [...allConversations];

        // 1. Filter by Platform
        if (platform) {
            filtered = filtered.filter(conv => {
                const p = (conv.platform || '').toLowerCase();
                return p.includes(platform.toLowerCase());
            });
        }

        // 2. Filter by Search Query
        if (query) {
            filtered = filtered.filter(conv =>
                (conv.title || '').toLowerCase().includes(query)
            );
        }

        // 3. Sort
        filtered = sortConversations(filtered, sortBy);

        // 4. Render
        renderConversationList(filtered);
    }
    document.getElementById('exportConvBtn').addEventListener('click', handleExport);
    document.getElementById('deleteConvBtn').addEventListener('click', () => showDeleteDialog());

    // Context Builder Actions
    document.getElementById('addToContextBtn').addEventListener('click', () => {
        if (selectedConversationId) {
            const conv = allConversations.find(c => c.conversationId === selectedConversationId);
            if (conv) addToContext(conv);
        }
    });

    document.getElementById('clearContextBtn').addEventListener('click', clearContext);
    document.getElementById('copyStagedBtn').addEventListener('click', copyStagedContext);

    // Context Format Change
    const formatSelect = document.getElementById('contextFormat');
    if (formatSelect) {
        // Recalculate estimates when format changes
        formatSelect.addEventListener('change', () => {
            recalculateStagingEstimates();
            renderContextStaging();
            updateTokenCount();
        });
    }

    // View Tabs
    const tabs = document.querySelectorAll('.view-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchTab(e.currentTarget.dataset.tab);
        });
    });

    // Delete dialog
    document.getElementById('deleteCancel').addEventListener('click', hideDeleteDialog);
    document.getElementById('deleteConfirm').addEventListener('click', handleDelete);

    // Listen for storage changes (Real-time updates)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.dev_memory_conversations) {
                loadConversations();
                updateStats();
            }
            if (changes.dev_memory_messages) {
                // If current conversation updated, refresh messages
                if (selectedConversationId) {
                    const newMessages = changes.dev_memory_messages.newValue || {};
                    const convMessages = newMessages[selectedConversationId];
                    if (convMessages) {
                        renderMessages(convMessages);
                        document.getElementById('conversationMessageCount').textContent = `${convMessages.length} messages`;
                    }
                }
                updateStats();
            }
        }
    });
}

// Global handler for Graph interactions - REMOVED

// ==========================================
// Context Builder Functions
// ==========================================

function switchTab(tabName) {
    // Update tabs
    document.querySelectorAll('.view-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabName);
    });

    // Show/hide content
    const list = document.getElementById('conversationList');
    const staging = document.getElementById('contextStaging');
    const filters = document.getElementById('filtersSection');
    const search = document.querySelector('.search-section');

    // Hide all first
    list.classList.add('hidden');
    staging.classList.add('hidden');
    if (filters) filters.classList.add('hidden');
    if (search) search.classList.add('hidden');

    if (tabName === 'conversations') {
        list.classList.remove('hidden');
        if (filters) filters.classList.remove('hidden');
        if (search) search.classList.remove('hidden');
    } else if (tabName === 'context') {
        staging.classList.remove('hidden');
        recalculateStagingEstimates(); // Ensure fresh on tab switch
        renderContextStaging();
        updateTokenCount(); // Trigger recommendation check
    }
}

function recalculateStagingEstimates() {
    const format = document.getElementById('contextFormat')?.value || 'xml';

    // Resolve 'auto' to ensure consistent estimates
    let resolvedFormat = format;
    if (format === 'auto') {
        const rawEstimate = contextStaging.reduce((acc, item) => acc + Tokenizer.estimateTokenCount(JSON.stringify(item.messages)), 0);
        const rec = recommendContextFormat(rawEstimate, 100000);
        resolvedFormat = rec.format;
    }

    // Update each item's estimate based on format
    contextStaging.forEach(item => {
        const contextStr = buildSingleContext(item, item.messages, { format: resolvedFormat });
        item.tokenEstimate = Math.ceil(contextStr.length / 4);
    });
}

async function addToContext(item) {
    // Check if already added
    if (contextStaging.some(i => i.id === item.conversationId)) {
        showNotification('Already in context', 1500);
        return;
    }

    // Fetch messages for accurate token count and content
    const messages = await simpleStorage.getMessages(item.conversationId);

    const newItem = {
        type: 'conversation',
        id: item.conversationId,
        title: item.title,
        platform: item.platform,
        timestamp: item.createdAt,
        messages: messages, // Store messages for generation
        tokenEstimate: 0
    };

    contextStaging.push(newItem);

    // Calculate accurate estimate immediately
    recalculateStagingEstimates();

    showNotification('Added to Context Builder', 1500);
    renderContextStaging();
    updateTokenCount();

    // Animate tab to show activity
    const contextTab = document.querySelector('.view-tab[data-tab="context"]');
    contextTab.classList.add('flash');
    setTimeout(() => contextTab.classList.remove('flash'), 500);
}

function removeFromContext(index) {
    contextStaging.splice(index, 1);
    renderContextStaging();
    updateTokenCount();
}

function clearContext() {
    contextStaging = [];
    renderContextStaging();
    updateTokenCount();
}

function renderContextStaging() {
    const list = document.getElementById('stagingList');
    const countSpan = document.getElementById('contextCount');
    const copyBtn = document.getElementById('copyStagedBtn');

    countSpan.textContent = `(${contextStaging.length})`;
    copyBtn.disabled = contextStaging.length === 0;

    if (contextStaging.length === 0) {
        list.innerHTML = `
            <div class="empty-staging">
                <p>No conversations selected</p>
                <small>Click "Add" on conversations to build your prompt package.</small>
            </div>
        `;
        return;
    }

    list.innerHTML = contextStaging.map((item, index) => `
        <div class="staged-item">
            <div class="staged-item-info">
                <span class="staged-title" title="${item.title}">${item.title}</span>
                <div class="staged-meta">
                    ${item.messages.length} msgs • ~${Tokenizer.formatCount(item.tokenEstimate)} tokens
                </div>
            </div>
            <button class="remove-item-btn" onclick="document.dispatchEvent(new CustomEvent('remove-context', {detail: ${index}}))" title="Remove">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `).join('');

    // Re-attach listeners for dynamic buttons
    list.querySelectorAll('.remove-item-btn').forEach((btn, idx) => {
        btn.onclick = () => removeFromContext(idx);
    });
}

function updateTokenCount() {
    if (contextStaging.length === 0) {
        document.getElementById('tokenCount').textContent = '0 tokens';
        document.getElementById('tokenFill').style.width = '0%';
        document.getElementById('formatRecommendation').classList.add('hidden');
        return;
    }

    // 1. Calculate raw estimate for recommendation logic
    const rawEstimate = contextStaging.reduce((acc, item) => acc + item.tokenEstimate, 0);
    const limit = 100000;

    const tokenCountEl = document.getElementById('tokenCount');
    const fillEl = document.getElementById('tokenFill');
    const formatSelect = document.getElementById('contextFormat');
    const recommendationEl = document.getElementById('formatRecommendation');

    // 2. Resolve Format
    let format = formatSelect.value;
    if (format === 'auto') {
        const rec = recommendContextFormat(rawEstimate, limit);
        format = rec.format;

        // Show Recommendation
        recommendationEl.textContent = `💡 Recommended: ${rec.reason}`;
        recommendationEl.className = `format-tip ${rec.color}`;
        recommendationEl.classList.remove('hidden');
    } else {
        recommendationEl.classList.add('hidden');
    }

    // 3. Calculate ACTUAL size by building the context (Dry Run)
    // This ensures "est" matches "copied" exactly
    const context = buildContext(contextStaging, null, {
        format: format,
        includeMetadata: true
    });

    // Simple char-based token count (same as used in copy)
    const exactTokens = Math.ceil(context.length / 4);

    // 4. Update UI
    tokenCountEl.textContent = `${Tokenizer.formatCount(exactTokens)} tokens`; // Removed 'est' to imply accuracy

    // Meter
    const percentage = Math.min((exactTokens / limit) * 100, 100);
    fillEl.style.width = `${percentage}%`;
    fillEl.className = 'token-fill';
    if (exactTokens > 50000) fillEl.classList.add('warning');
    if (exactTokens > 90000) fillEl.classList.add('danger');
}

async function copyStagedContext() {
    if (contextStaging.length === 0) return;

    let format = document.getElementById('contextFormat').value;

    // Resolve 'auto' to actual format
    if (format === 'auto') {
        const totalTokens = contextStaging.reduce((acc, item) => acc + item.tokenEstimate, 0);
        const rec = recommendContextFormat(totalTokens, 100000);
        format = rec.format;
        showNotification(`Auto-selected: ${format.toUpperCase()}`, 1000);
    }

    // Build Context
    const context = buildContext(contextStaging, null, {
        format: format,
        includeMetadata: true
    });

    const success = await copyToClipboard(context);

    if (success) {
        // Recalculate size of actual copied text
        const actualTokens = Math.ceil(context.length / 4);
        showNotification(`✓ Copied! (~${Tokenizer.formatCount(actualTokens)} tokens)`, 2000);
    } else {
        showNotification('Failed to copy', 2000);
    }
}



/**
 * Populate tag filter dropdown
 */
async function populateTagFilter() {
    const tagFilter = document.getElementById('tagFilter');
    const currentValue = tagFilter.value;

    const tags = await simpleStorage.getAllTags();

    // Clear and rebuild options
    tagFilter.innerHTML = '<option value="">All Tags</option>';
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
    });

    // Restore selection if still valid
    if (currentValue && tags.includes(currentValue)) {
        tagFilter.value = currentValue;
    }
}

/**
 * Load and display messages for a conversation
 */
async function loadMessages(conversationId) {
    const messages = await simpleStorage.getMessages(conversationId);
    const conversation = allConversations.find(c => c.conversationId === conversationId);

    if (!conversation) return;

    // Update conversation view header
    document.getElementById('conversationTitle').textContent = conversation.title;
    document.getElementById('conversationPlatform').textContent = conversation.platform || 'Unknown';
    document.getElementById('conversationMessageCount').textContent = `${messages.length} messages`;

    // Render messages
    renderMessages(messages);

    // Show conversation view, hide empty state
    document.getElementById('conversationView').classList.remove('hidden');
    document.getElementById('emptyState').classList.add('hidden');
}

/**
 * Render messages in the conversation view
 */
function renderMessages(messages) {
    const container = document.getElementById('messagesContainer');

    if (!container) {
        console.error('messagesContainer element not found in HTML');
        return;
    }

    if (!messages || messages.length === 0) {
        container.innerHTML = '<div class="empty-messages">No messages found</div>';
        return;
    }

    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.role}">
            <div class="message-header">
                <span class="message-role">${msg.role === 'user' ? 'You' : 'Assistant'}</span>
                <span class="message-time">${formatTimestamp(msg.timestamp)}</span>
            </div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
        </div>
    `).join('');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Update statistics
 */
async function updateStats() {
    const analytics = await simpleStorage.getAnalytics();

    if (analytics) {
        document.getElementById('totalConversations').textContent = analytics.totalConversations;
        document.getElementById('totalMessages').textContent = analytics.totalMessages;
    }
}

/**
 * Select and display a conversation
 */
async function selectConversation(conversationId) {
    selectedConversationId = conversationId;

    // Highlight selected conversation
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === conversationId);
    });

    // Load and display messages
    await loadMessages(conversationId);
}

/**
 * Sort conversations based on selected criteria
 */
function sortConversations(conversations, sortBy) {
    const sorted = [...conversations];

    switch (sortBy) {
        case 'date-desc':
            return sorted.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
        case 'date-asc':
            return sorted.sort((a, b) => (a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt));
        case 'messages-desc':
            return sorted.sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));
        case 'messages-asc':
            return sorted.sort((a, b) => (a.messageCount || 0) - (b.messageCount || 0));
        case 'title-asc':
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case 'title-desc':
            return sorted.sort((a, b) => b.title.localeCompare(a.title));
        default:
            return sorted;
    }
}

/**
 * Load conversations
 */
async function loadConversations() {
    allConversations = await simpleStorage.getConversations(1000);

    // Apply current sort
    const sortBy = document.getElementById('sortBy').value;
    allConversations = sortConversations(allConversations, sortBy);

    renderConversationList(allConversations);
}

/**
 * Render conversation list
 */
/**
 * Render conversation list
 * @param {Array} conversations - List of conversation objects to render
 */
function renderConversationList(conversations) {
    const listElement = document.getElementById('conversationList');

    if (conversations.length === 0) {
        // ... (Empty state HTML remains same)
        listElement.innerHTML = `
            <div class="sidebar-empty">
                <div style="font-size: 40px; margin-bottom: 20px;">🚀</div>
                <h3>Get Started</h3>
                <ol>
                    <li>📌 Pin <b>Dev Memory</b> to specific toolbar</li>
                    <li>🌐 Visit <a href="https://claude.ai" target="_blank" style="color:#4ade80">Claude.ai</a> or ChatGPT</li>
                    <li>💬 Start chatting</li>
                </ol>
                <p class="hint">Ensure capture is toggled <b>ON</b> in header</p>
            </div>
        `;
        return;
    }

    const sortBy = document.getElementById('sortBy').value;
    const showDateHeaders = sortBy.includes('date');
    let lastDateHeader = '';

    listElement.innerHTML = conversations.map(conv => {
        let headerHtml = '';

        if (showDateHeaders) {
            const timestamp = conv.updatedAt || conv.createdAt;
            const header = getDateHeader(timestamp);

            if (header !== lastDateHeader) {
                lastDateHeader = header;
                headerHtml = `<div class="date-header">${header}</div>`;
            }
        }

        return `
            ${headerHtml}
            <div class="conversation-item ${conv.conversationId === selectedConversationId ? 'active' : ''}" 
                 data-id="${conv.conversationId}">
                <div class="conversation-item-title">${conv.title}</div>
                <div class="conversation-item-meta">
                    <span>${conv.platform}</span>
                    <span>${conv.messageCount || 0} msgs</span>
                    <span>${formatTimestamp(conv.updatedAt || conv.createdAt)}</span>
                </div>
                
                <!-- Quick Actions (Hover) -->
                <div class="quick-actions">
                    <button class="quick-btn export" title="Export JSON" onclick="event.stopPropagation(); handleExport(event, '${conv.conversationId}')">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                    <button class="quick-btn delete" title="Delete" onclick="event.stopPropagation(); showDeleteDialog(); selectConversation('${conv.conversationId}')">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            selectConversation(id);
        });
    });
}
// ... existing code ...

/**
 * Handle toggle
 */
async function handleToggle() {
    const result = await chrome.storage.local.get(['enabled']);
    const currentState = result.enabled !== false;
    const newState = !currentState;

    await chrome.storage.local.set({ enabled: newState });
    updateToggleUI(newState);
}

function updateToggleUI(enabled) {
    const toggleSwitch = document.querySelector('.toggle-switch');
    if (enabled) {
        toggleSwitch.classList.add('active');
    } else {
        toggleSwitch.classList.remove('active');
    }
}

/**
 * Toggle filters visibility
 */
function toggleFilters() {
    const filtersContent = document.getElementById('filtersContent');
    const collapseBtn = document.getElementById('collapseFiltersBtn');
    const isCollapsed = filtersContent.classList.toggle('collapsed');

    // Rotate arrow
    collapseBtn.classList.toggle('collapsed', isCollapsed);
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const expandBtn = document.getElementById('expandSidebarBtn');
    const isCollapsed = sidebar.classList.toggle('collapsed');

    // Show/hide expand button
    expandBtn.classList.toggle('hidden', !isCollapsed);
}

/**
 * Handle copy context
 */
async function handleCopyContext() {
    if (!selectedConversationId) return;

    const conversation = allConversations.find(c => c.conversationId === selectedConversationId);
    const messages = await simpleStorage.getMessages(selectedConversationId);

    if (!conversation || messages.length === 0) {
        showNotification('No messages to copy', 2000);
        return;
    }

    const context = buildContext(conversation, messages, {
        maxTokens: 8000,
        includeMetadata: true
    });

    const success = await copyToClipboard(context);

    if (success) {
        const tokens = estimateTokens(context);
        showNotification(`✓ Copied! (~${tokens} tokens)`, 2500);
    } else {
        showNotification('Failed to copy', 2000);
    }
}

/**
 * Handle export
 */
async function handleExport() {
    if (!selectedConversationId) return;

    const conversation = allConversations.find(c => c.conversationId === selectedConversationId);
    const messages = await simpleStorage.getMessages(selectedConversationId);

    const data = {
        conversation,
        messages
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('✓ Exported!', 2000);
}

/**
 * Show/hide delete dialog
 */
function showDeleteDialog() {
    console.log('showDeleteDialog called', selectedConversationId);
    if (!selectedConversationId) {
        console.warn('No conversation selected for deletion');
        return;
    }
    const dialog = document.getElementById('deleteDialog');
    if (dialog) {
        dialog.classList.remove('hidden');
        console.log('Dialog class removed');
    } else {
        console.error('Delete dialog element not found');
    }
}

function hideDeleteDialog() {
    document.getElementById('deleteDialog').classList.add('hidden');
}

/**
 * Handle delete
 */
async function handleDelete() {
    console.log('handleDelete called');
    if (!selectedConversationId) return;

    await simpleStorage.deleteConversation(selectedConversationId);
    console.log('Conversation deleted from storage');

    hideDeleteDialog();
    selectedConversationId = null;

    // Hide conversation view
    document.getElementById('conversationView').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');

    // Reload list
    await loadConversations();
    await updateStats();

    showNotification('✓ Deleted', 2000);
}

/**
 * Show notification
 */
function showNotification(message, duration = 2000) {
    // Create notification element
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
        return 'Just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
    }

    // Less than 1 day
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    }

    // Less than 7 days
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days}d ago`;
    }

    // Format as date
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function getDateHeader(timestamp) {
    if (!timestamp) return 'Older';
    const d = new Date(timestamp);
    const now = new Date();

    // Reset hours to compare dates only
    const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const nDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = nDate - dDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return 'Previous 7 Days';
    if (diffDays < 30) return 'Previous 30 Days';

    return 'Older';
}
