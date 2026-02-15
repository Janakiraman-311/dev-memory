// Simple storage wrapper using Chrome Storage API
// This works across all extension contexts (content, popup, background)

class SimpleStorage {
    constructor() {
        this.CONVERSATIONS_KEY = 'dev_memory_conversations';
        this.MESSAGES_KEY = 'dev_memory_messages';
    }

    /**
     * Save or update a conversation
     */
    async saveConversation(conversationData) {
        try {
            // Get existing conversations
            const result = await chrome.storage.local.get([this.CONVERSATIONS_KEY]);
            const conversations = result[this.CONVERSATIONS_KEY] || {};

            // Update or add conversation
            const convId = conversationData.conversationId;
            if (conversations[convId]) {
                conversations[convId] = {
                    ...conversations[convId],
                    ...conversationData,
                    updatedAt: Date.now()
                };
            } else {
                conversations[convId] = {
                    ...conversationData,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
            }

            // Save back
            await chrome.storage.local.set({ [this.CONVERSATIONS_KEY]: conversations });
            return true;
        } catch (error) {
            console.error('[Storage] Error saving conversation:', error);
            return false;
        }
    }

    /**
     * Save a message
     */
    async saveMessage(messageData) {
        try {
            // Get existing messages
            const result = await chrome.storage.local.get([this.MESSAGES_KEY]);
            const allMessages = result[this.MESSAGES_KEY] || {};

            // Get messages for this conversation
            const convId = messageData.conversationId;
            if (!allMessages[convId]) {
                allMessages[convId] = [];
            }

            // Check if message already exists (by content hash)
            const messageHash = `${messageData.role}-${messageData.content.substring(0, 100)}`;
            const exists = allMessages[convId].some(m =>
                `${m.role}-${m.content.substring(0, 100)}` === messageHash
            );

            if (!exists) {
                allMessages[convId].push({
                    ...messageData,
                    timestamp: messageData.timestamp || Date.now()
                });

                // Save back
                await chrome.storage.local.set({ [this.MESSAGES_KEY]: allMessages });

                // Update Conversation Metadata (Count + Timestamp)
                const convResult = await chrome.storage.local.get([this.CONVERSATIONS_KEY]);
                const conversations = convResult[this.CONVERSATIONS_KEY] || {};

                if (conversations[convId]) {
                    conversations[convId].messageCount = allMessages[convId].length;
                    conversations[convId].updatedAt = Date.now();
                    await chrome.storage.local.set({ [this.CONVERSATIONS_KEY]: conversations });
                }
            }

            return true;
        } catch (error) {
            console.error('[Storage] Error saving message:', error);
            return false;
        }
    }

    /**
     * Get all conversations
     */
    async getConversations(limit = 100) {
        try {
            const result = await chrome.storage.local.get([this.CONVERSATIONS_KEY]);
            const conversations = result[this.CONVERSATIONS_KEY] || {};
            let convArray = Object.values(conversations);

            // Check if any missing count (backfill logic)
            const missingCounts = convArray.some(c => typeof c.messageCount !== 'number');

            if (missingCounts) {
                // Fetch messages only if needed
                const msgResult = await chrome.storage.local.get([this.MESSAGES_KEY]);
                const allMessages = msgResult[this.MESSAGES_KEY] || {};

                let updated = false;
                for (const conv of convArray) {
                    if (typeof conv.messageCount !== 'number') {
                        const count = (allMessages[conv.conversationId] || []).length;
                        conv.messageCount = count;
                        conversations[conv.conversationId].messageCount = count;
                        updated = true;
                    }
                }

                if (updated) {
                    chrome.storage.local.set({ [this.CONVERSATIONS_KEY]: conversations });
                }
            }

            return convArray
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                .slice(0, limit);
        } catch (error) {
            console.error('[Storage] Error getting conversations:', error);
            return [];
        }
    }

    /**
     * Get messages for a conversation
     */
    async getMessages(conversationId) {
        try {
            const result = await chrome.storage.local.get([this.MESSAGES_KEY]);
            const allMessages = result[this.MESSAGES_KEY] || {};

            const messages = allMessages[conversationId] || [];
            // Sort by order/timestamp
            messages.sort((a, b) => (a.order || a.timestamp || 0) - (b.order || b.timestamp || 0));

            return messages;
        } catch (error) {
            console.error('[Storage] Error getting messages:', error);
            return [];
        }
    }

    /**
     * Search conversations
     */
    async searchConversations(query) {
        try {
            const conversations = await this.getConversations(1000);
            const lowerQuery = query.toLowerCase();

            return conversations.filter(conv =>
                conv.title?.toLowerCase().includes(lowerQuery) ||
                conv.url?.toLowerCase().includes(lowerQuery)
            );
        } catch (error) {
            console.error('[Storage] Error searching:', error);
            return [];
        }
    }

    /**
     * Export all data
     */
    async exportAllData() {
        try {
            const conversations = await this.getConversations(10000);
            const allData = [];

            for (const conv of conversations) {
                const messages = await this.getMessages(conv.conversationId);
                allData.push({
                    conversation: conv,
                    messages: messages
                });
            }

            return allData;
        } catch (error) {
            console.error('[Storage] Error exporting:', error);
            return [];
        }
    }

    /**
     * Get storage usage info
     */
    async getStorageInfo() {
        try {
            const result = await chrome.storage.local.getBytesInUse(null);
            return {
                bytesUsed: result,
                megabytesUsed: (result / 1024 / 1024).toFixed(2)
            };
        } catch (error) {
            return { bytesUsed: 0, megabytesUsed: 0 };
        }
    }

    /**
     * Enhanced search - Search messages with snippets
     */
    async searchMessages(query, limit = 50) {
        try {
            const result = await chrome.storage.local.get([this.MESSAGES_KEY, this.CONVERSATIONS_KEY]);
            const allMessages = result[this.MESSAGES_KEY] || {};
            const conversations = result[this.CONVERSATIONS_KEY] || {};

            const matches = [];
            const lowerQuery = query.toLowerCase();

            for (const [convId, messages] of Object.entries(allMessages)) {
                for (const msg of messages) {
                    if (msg.content.toLowerCase().includes(lowerQuery)) {
                        matches.push({
                            conversationId: convId,
                            conversationTitle: conversations[convId]?.title || 'Untitled',
                            message: msg,
                            snippet: this.createSnippet(msg.content, query, 100)
                        });
                    }
                }
            }

            return matches.slice(0, limit);
        } catch (error) {
            console.error('[Storage] Error searching messages:', error);
            return [];
        }
    }

    /**
     * Create snippet with context around query
     */
    createSnippet(content, query, contextLength = 100) {
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerContent.indexOf(lowerQuery);

        if (index === -1) return content.substring(0, contextLength) + '...';

        const start = Math.max(0, index - contextLength);
        const end = Math.min(content.length, index + query.length + contextLength);

        let snippet = content.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';

        return snippet;
    }

    /**
     * Delete a conversation and its messages
     */
    async deleteConversation(conversationId) {
        try {
            const result = await chrome.storage.local.get([this.CONVERSATIONS_KEY, this.MESSAGES_KEY]);
            const conversations = result[this.CONVERSATIONS_KEY] || {};
            const messages = result[this.MESSAGES_KEY] || {};

            delete conversations[conversationId];
            delete messages[conversationId];

            await chrome.storage.local.set({
                [this.CONVERSATIONS_KEY]: conversations,
                [this.MESSAGES_KEY]: messages
            });

            return true;
        } catch (error) {
            console.error('[Storage] Error deleting conversation:', error);
            return false;
        }
    }

    /**
     * Update conversation title
     */
    async updateConversationTitle(conversationId, newTitle) {
        try {
            const result = await chrome.storage.local.get([this.CONVERSATIONS_KEY]);
            const conversations = result[this.CONVERSATIONS_KEY] || {};

            if (conversations[conversationId]) {
                conversations[conversationId].title = newTitle;
                conversations[conversationId].updatedAt = Date.now();
                await chrome.storage.local.set({ [this.CONVERSATIONS_KEY]: conversations });
                return true;
            }
            return false;
        } catch (error) {
            console.error('[Storage] Error updating title:', error);
            return false;
        }
    }

    /**
     * Toggle favorite status
     */
    async toggleFavorite(conversationId) {
        try {
            const result = await chrome.storage.local.get([this.CONVERSATIONS_KEY]);
            const conversations = result[this.CONVERSATIONS_KEY] || {};

            if (conversations[conversationId]) {
                conversations[conversationId].favorite = !conversations[conversationId].favorite;
                conversations[conversationId].updatedAt = Date.now();
                await chrome.storage.local.set({ [this.CONVERSATIONS_KEY]: conversations });
                return conversations[conversationId].favorite;
            }
            return false;
        } catch (error) {
            console.error('[Storage] Error toggling favorite:', error);
            return false;
        }
    }

    /**
     * Get analytics data
     */
    async getAnalytics() {
        try {
            const conversations = await this.getConversations(10000);
            const result = await chrome.storage.local.get([this.MESSAGES_KEY]);
            const allMessages = result[this.MESSAGES_KEY] || {};

            const analytics = {
                totalConversations: conversations.length,
                totalMessages: 0,
                totalWords: 0,
                messagesByDate: {},
                topConversations: [],
                averageMessagesPerConversation: 0
            };

            for (const conv of conversations) {
                const messages = allMessages[conv.conversationId] || [];
                analytics.totalMessages += messages.length;

                for (const msg of messages) {
                    analytics.totalWords += msg.content.split(/\s+/).length;

                    const date = new Date(msg.timestamp).toISOString().split('T')[0];
                    analytics.messagesByDate[date] = (analytics.messagesByDate[date] || 0) + 1;
                }
            }

            analytics.averageMessagesPerConversation = conversations.length > 0
                ? Math.round(analytics.totalMessages / conversations.length)
                : 0;

            analytics.topConversations = conversations
                .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))
                .slice(0, 5);

            return analytics;
        } catch (error) {
            console.error('[Storage] Error getting analytics:', error);
            return null;
        }
    }

    /**
     * Add tag to conversation
     */
    async addTag(conversationId, tag) {
        try {
            const result = await chrome.storage.local.get([this.CONVERSATIONS_KEY]);
            const conversations = result[this.CONVERSATIONS_KEY] || {};

            if (conversations[conversationId]) {
                if (!conversations[conversationId].tags) {
                    conversations[conversationId].tags = [];
                }

                // Add tag if not already present
                const normalizedTag = tag.trim().toLowerCase();
                if (!conversations[conversationId].tags.includes(normalizedTag)) {
                    conversations[conversationId].tags.push(normalizedTag);
                    conversations[conversationId].updatedAt = Date.now();
                    await chrome.storage.local.set({ [this.CONVERSATIONS_KEY]: conversations });
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('[Storage] Error adding tag:', error);
            return false;
        }
    }

    /**
     * Remove tag from conversation
     */
    async removeTag(conversationId, tag) {
        try {
            const result = await chrome.storage.local.get([this.CONVERSATIONS_KEY]);
            const conversations = result[this.CONVERSATIONS_KEY] || {};

            if (conversations[conversationId] && conversations[conversationId].tags) {
                const normalizedTag = tag.trim().toLowerCase();
                conversations[conversationId].tags = conversations[conversationId].tags.filter(
                    t => t !== normalizedTag
                );
                conversations[conversationId].updatedAt = Date.now();
                await chrome.storage.local.set({ [this.CONVERSATIONS_KEY]: conversations });
                return true;
            }
            return false;
        } catch (error) {
            console.error('[Storage] Error removing tag:', error);
            return false;
        }
    }

    /**
     * Get all unique tags
     */
    async getAllTags() {
        try {
            const conversations = await this.getConversations(10000);
            const tagSet = new Set();

            for (const conv of conversations) {
                if (conv.tags && Array.isArray(conv.tags)) {
                    conv.tags.forEach(tag => tagSet.add(tag));
                }
            }

            return Array.from(tagSet).sort();
        } catch (error) {
            console.error('[Storage] Error getting all tags:', error);
            return [];
        }
    }

    /**
     * Get conversations by tag
     */
    async getConversationsByTag(tag) {
        try {
            const conversations = await this.getConversations(10000);
            const normalizedTag = tag.trim().toLowerCase();

            return conversations.filter(conv =>
                conv.tags && conv.tags.includes(normalizedTag)
            );
        } catch (error) {
            console.error('[Storage] Error getting conversations by tag:', error);
            return [];
        }
    }
}

// Create singleton instance
const simpleStorage = new SimpleStorage();
