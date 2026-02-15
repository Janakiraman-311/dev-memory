/**
 * Simple Tokenizer for estimating token usage
 * Based on rule of thumb: 1 token ~= 4 characters or 0.75 words
 * This is an estimation, not a perfect tokenizer (like tiktoken)
 */

const Tokenizer = {
    /**
     * Estimate token count for a string
     * @param {string} text 
     * @returns {number} Estimated token count
     */
    estimateTokenCount: (text) => {
        if (!text) return 0;

        // Method 1: Character count / 4 (Rough approximation for English)
        const charCount = text.length;
        const method1 = Math.ceil(charCount / 4);

        // Method 2: Word count * 1.3 (Slightly more accurate for some texts)
        const wordCount = text.trim().split(/\s+/).length;
        const method2 = Math.ceil(wordCount * 1.33);

        // Return average of both for better stability
        return Math.floor((method1 + method2) / 2);
    },

    /**
     * Format a number with K/M suffix
     * @param {number} num 
     * @returns {string}
     */
    formatCount: (num) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.Tokenizer = Tokenizer;
}
