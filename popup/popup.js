// Dev Memory Popup Script

let currentSearchMode = 'conversation';
let allConversations = [];
let currentRenameId = null;
let currentDeleteId = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await loadConversations();
    setupEventListeners();
    await updateStats();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Enable/disable toggle
    const enableToggle = document.getElementById('enableToggle');
    enableToggle.addEventListener('change', async (e) => {
        await setExtensionEnabled(e.target.checked);
    });

    // Load initial state
    isExtensionEnabled().then(enabled => {
        enableToggle.checked = enabled;
    });

    // Search mode toggle
    document.querySelectorAll('input[name="searchMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentSearchMode = e.target.value;
            document.getElementById('searchInput').placeholder =
                currentSearchMode === 'conversation' ? 'Search conversations...' : 'Search messages...';

            // Re-run search
            const query = document.getElementById('searchInput').value.trim();
            performSearch(query);
        });
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce((e) => performSearch(e.target.value.trim()), 300));

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        await loadConversations();
        await updateStats();
    });

    // Export button and menu
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');

    exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle('hidden');
    });

    // Close export menu when clicking outside
    document.addEventListener('click', () => {
        exportMenu.classList.add('hidden');
    });

    // Export format buttons
    exportMenu.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const format = btn.dataset.format;
            await handleExport(format);
            exportMenu.classList.add('hidden');
        });
    });

    // Sort dropdown
    const sortBy = document.getElementById('sortBy');
    sortBy.addEventListener('change', async (e) => {
        const sortValue = e.target.value;
        await chrome.storage.local.set({ sortPreference: sortValue });
        renderConversations(sortConversations(allConversations, sortValue));
    });

    // Load sort preference
    chrome.storage.local.get(['sortPreference']).then(result => {
        if (result.sortPreference) {
            sortBy.value = result.sortPreference;
        }
    });

    // Tag filter dropdown
    const tagFilter = document.getElementById('tagFilter');
    tagFilter.addEventListener('change', async (e) => {
        const selectedTag = e.target.value;
        if (selectedTag) {
            const filtered = await simpleStorage.getConversationsByTag(selectedTag);
            const result = await chrome.storage.local.get(['sortPreference']);
            const sortValue = result.sortPreference || 'date-desc';
            renderConversations(sortConversations(filtered, sortValue));
        } else {
            await loadConversations();
        }
    });

    // Populate tag filter on load
    populateTagFilter();

    // Import button
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    // Import file handler
    document.getElementById('importFile').addEventListener('change', handleImport);

    // Launch AI Dropdown
    const launchBtn = document.getElementById('launchBtn');
    const launchMenu = document.getElementById('launchMenu');

    if (launchBtn && launchMenu) {
        launchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            launchMenu.classList.toggle('hidden');
            // Close other menus
            document.getElementById('exportMenu').classList.add('hidden');
        });

        // Launch buttons
        launchMenu.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = btn.dataset.url;
                if (url) {
                    chrome.tabs.create({ url: url });
                }
                launchMenu.classList.add('hidden');
            });
        });
    }

    // Close menus when clicking outside
    document.addEventListener('click', () => {
        const exportMenu = document.getElementById('exportMenu');
        if (exportMenu) exportMenu.classList.add('hidden');

        if (launchMenu) launchMenu.classList.add('hidden');
    });

    // Dialog handlers
    document.getElementById('confirmCancel').addEventListener('click', hideConfirmDialog);
    document.getElementById('confirmOk').addEventListener('click', handleConfirmOk);
    document.getElementById('renameCancel').addEventListener('click', hideRenameDialog);
    document.getElementById('renameSave').addEventListener('click', handleRenameSave);
}

/**
 * Load and display conversations
 */
async function loadConversations() {
    const listElement = document.getElementById('conversationsList');

    try {
        allConversations = await simpleStorage.getConversations(100);

        if (allConversations.length === 0) {
            listElement.innerHTML = `
        <div class="empty-state">
          <p>No conversations captured yet</p>
          <p>Visit <a href="https://claude.ai" target="_blank">claude.ai</a> to start capturing</p>
        </div>
      `;
            return;
        }

        // Apply saved sort preference
        const result = await chrome.storage.local.get(['sortPreference']);
        const sortValue = result.sortPreference || 'date-desc';
        const sorted = sortConversations(allConversations, sortValue);

        renderConversations(sorted);
    } catch (error) {
        console.error('Error loading conversations:', error);
        listElement.innerHTML = '<div class="error">Error loading conversations</div>';
    }
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
 * Render conversations list
 */
function renderConversations(conversations) {
    const listElement = document.getElementById('conversationsList');

    listElement.innerHTML = conversations.map(conv => `
    <div class="conversation-item" data-id="${conv.conversationId}">
      <div class="conversation-actions">
        <button class="action-icon favorite ${conv.favorite ? 'active' : ''}" 
                data-id="${conv.conversationId}" 
                data-action="favorite"
                title="Toggle favorite">
          <svg viewBox="0 0 24 24" fill="${conv.favorite ? '#ffd700' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
        <button class="action-icon" 
                data-id="${conv.conversationId}"
                data-action="rename"
                data-title="${escapeHtml(conv.title)}"
                title="Rename">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="action-icon" 
                data-id="${conv.conversationId}"
                data-action="delete"
                title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
        <button class="action-icon context-btn" 
                data-id="${conv.conversationId}"
                data-action="copy-context"
                title="Copy as Context">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      </div>
      <div class="conversation-title">${conv.title}</div>
      <div class="conversation-meta">
        <span>${conv.platform}</span>
        <span>${conv.messageCount || 0} messages</span>
        <span>${formatTimestamp(conv.updatedAt || conv.createdAt)}</span>
      </div>
      <div class="conversation-tags">
        ${(conv.tags || []).map(tag => `
          <span class="tag" data-tag="${tag}" data-id="${conv.conversationId}">
            ${tag}
            <button class="tag-remove" data-tag="${tag}" data-id="${conv.conversationId}">×</button>
          </span>
        `).join('')}
        <input type="text" class="tag-input" data-id="${conv.conversationId}" placeholder="+ tag" />
      </div>
    </div>
  `).join('');

    // Add action button listeners
    document.querySelectorAll('.action-icon').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const id = btn.dataset.id;

            if (action === 'favorite') {
                await handleToggleFavorite(id);
            } else if (action === 'rename') {
                const title = btn.dataset.title;
                showRenameDialog(id, title);
            } else if (action === 'delete') {
                showDeleteDialog(id);
            } else if (action === 'copy-context') {
                await handleCopyContext(id);
            }
        });
    });

    // Tag input handlers
    document.querySelectorAll('.tag-input').forEach(input => {
        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                const tag = e.target.value.trim();
                const id = e.target.dataset.id;
                await simpleStorage.addTag(id, tag);
                e.target.value = '';
                await loadConversations();
                await populateTagFilter();
            }
        });
    });

    // Tag remove handlers
    document.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const tag = e.target.dataset.tag;
            const id = e.target.dataset.id;
            await simpleStorage.removeTag(id, tag);
            await loadConversations();
            await populateTagFilter();
        });
    });
}

/**
 * Escape HTML for safe insertion
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Perform search
 */
async function performSearch(query) {
    if (!query) {
        renderConversations(allConversations);
        return;
    }

    if (currentSearchMode === 'conversation') {
        // Search conversations by title
        const filtered = allConversations.filter(conv =>
            conv.title.toLowerCase().includes(query.toLowerCase())
        );
        renderConversations(filtered);
    } else {
        // Search messages
        const results = await simpleStorage.searchMessages(query, 50);
        renderMessageResults(results, query);
    }
}

/**
 * Render message search results
 */
function renderMessageResults(results, query) {
    const listElement = document.getElementById('conversationsList');

    if (results.length === 0) {
        listElement.innerHTML = '<div class="empty-state"><p>No messages found</p></div>';
        return;
    }

    listElement.innerHTML = results.map(result => {
        const snippet = highlightQuery(result.snippet, query);
        return `
      <div class="message-result">
        <div class="message-result-header">
          ${result.conversationTitle} • ${result.message.role}
        </div>
        <div class="message-result-snippet">${snippet}</div>
      </div>
    `;
    }).join('');
}

/**
 * Highlight query in text
 */
function highlightQuery(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Handle export
 */
async function handleExport(format) {
    try {
        const conversations = await simpleStorage.getConversations(10000);
        const result = await chrome.storage.local.get(['dev_memory_messages']);
        const allMessages = result.dev_memory_messages || {};

        const timestamp = new Date().toISOString().split('T')[0];

        if (format === 'json') {
            const exportData = conversations.map(conv => {
                let messages = allMessages[conv.conversationId] || [];
                // Sort messages
                messages = messages.sort((a, b) => {
                    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
                    return (a.timestamp || 0) - (b.timestamp || 0);
                });

                return {
                    conversation: conv,
                    messages: messages
                };
            });
            exportToJSON(exportData, `dev-memory-export-${timestamp}.json`);
        }
        else if (format === 'markdown' || format === 'html') {
            // Export all conversations
            for (const conv of conversations) {
                let messages = allMessages[conv.conversationId] || [];
                // Sort messages
                messages = messages.sort((a, b) => {
                    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
                    return (a.timestamp || 0) - (b.timestamp || 0);
                });

                const content = format === 'markdown'
                    ? exportToMarkdown(conv, messages)
                    : exportToHTML(conv, messages);

                const mimeType = format === 'markdown' ? 'text/markdown' : 'text/html';
                const ext = format === 'markdown' ? 'md' : 'html';
                const filename = `${conv.title.replace(/[^a-z0-9]/gi, '-')}-${timestamp}.${ext}`;

                downloadFile(content, filename, mimeType);
            }
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Export failed. Please try again.');
    }
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
 * Toggle favorite
 */
async function handleToggleFavorite(conversationId) {
    await simpleStorage.toggleFavorite(conversationId);
    await loadConversations();
}

/**
 * Show rename dialog
 */
function showRenameDialog(conversationId, currentTitle) {
    currentRenameId = conversationId;
    document.getElementById('renameInput').value = currentTitle;
    document.getElementById('renameDialog').classList.remove('hidden');
    document.getElementById('renameInput').focus();
}

/**
 * Hide rename dialog
 */
function hideRenameDialog() {
    document.getElementById('renameDialog').classList.add('hidden');
    currentRenameId = null;
}

/**
 * Handle rename save
 */
async function handleRenameSave() {
    const newTitle = document.getElementById('renameInput').value.trim();

    if (newTitle && currentRenameId) {
        await simpleStorage.updateConversationTitle(currentRenameId, newTitle);
        await loadConversations();
    }

    hideRenameDialog();
}

/**
 * Show delete confirmation dialog
 */
function showDeleteDialog(conversationId) {
    currentDeleteId = conversationId;
    document.getElementById('confirmTitle').textContent = 'Delete Conversation';
    document.getElementById('confirmMessage').textContent =
        'Are you sure you want to delete this conversation? This action cannot be undone.';
    document.getElementById('confirmDialog').classList.remove('hidden');
}

/**
 * Hide confirm dialog
 */
function hideConfirmDialog() {
    document.getElementById('confirmDialog').classList.add('hidden');
    currentDeleteId = null;
}

/**
 * Handle confirm OK
 */
async function handleConfirmOk() {
    if (currentDeleteId) {
        await simpleStorage.deleteConversation(currentDeleteId);
        await loadConversations();
        await updateStats();
    }

    hideConfirmDialog();
}

/**
 * Handle import file selection
 */
async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate data structure
        if (!Array.isArray(data)) {
            alert('Invalid import file format. Expected an array of conversations.');
            return;
        }

        // Get existing conversations for duplicate check
        const existingConvs = await simpleStorage.getConversations(10000);
        const existingIds = new Set(existingConvs.map(c => c.conversationId));

        let imported = 0;
        let skipped = 0;

        for (const item of data) {
            if (!item.conversation || !item.messages) {
                skipped++;
                continue;
            }

            const conv = item.conversation;
            const messages = item.messages;

            // Check if conversation already exists
            if (existingIds.has(conv.conversationId)) {
                skipped++;
                continue;
            }

            // Import conversation
            await simpleStorage.saveConversation(conv);

            // Import messages
            for (const msg of messages) {
                await simpleStorage.saveMessage(msg);
            }

            imported++;
        }

        // Show summary
        alert(`Import complete!\n\nImported: ${imported} conversations\nSkipped (duplicates): ${skipped}`);

        // Refresh UI
        await loadConversations();
        await updateStats();

        // Reset file input
        event.target.value = '';

    } catch (error) {
        console.error('Import error:', error);
        alert(`Failed to import file: ${error.message}\n\nPlease check the file format and try again.`);
    }
}

/**
 * Handle copy conversation as context
 */
async function handleCopyContext(conversationId) {
    try {
        // Find conversation
        const conversation = allConversations.find(c => c.conversationId === conversationId);
        if (!conversation) {
            showNotification('Conversation not found', 2000);
            return;
        }

        // Get messages
        const result = await chrome.storage.local.get(['dev_memory_messages']);
        const allMessages = result.dev_memory_messages || {};
        const messages = allMessages[conversationId] || [];

        if (messages.length === 0) {
            showNotification('No messages to copy', 2000);
            return;
        }

        // Sort messages
        const sortedMessages = [...messages].sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
            return (a.timestamp || 0) - (b.timestamp || 0);
        });

        // Build context
        const context = buildContext(conversation, sortedMessages, {
            maxTokens: 8000,
            includeMetadata: true
        });

        // Copy to clipboard
        const success = await copyToClipboard(context);

        if (success) {
            const tokens = estimateTokens(context);
            showNotification(`✓ Copied! (~${tokens} tokens)`, 2500);
        } else {
            showNotification('Failed to copy', 2000);
        }

    } catch (error) {
        console.error('Copy context error:', error);
        showNotification('Error copying context', 2000);
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
