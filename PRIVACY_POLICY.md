# Privacy Policy for Dev Memory

**Effective Date:** 2026-02-15

## Introduction
Dev Memory ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we handle your data when you use the Dev Memory Chrome Extension.

## Data Collection and Usage
**Dev Memory is a local-first extension.** We do not collect, transmit, or store your personal data on our servers.

### 1. Local Storage
All conversations and messages you capture using Dev Memory are stored locally on your device using the Chrome Storage API (`chrome.storage.local`). This data never leaves your browser unless you explicitly choose to export it.

### 2. No Analytics
We do not use Google Analytics, Mixpanel, or any other third-party tracking services. We do not track your browsing history or behavior.

### 3. Permissions
The extension requests the following permissions to function:
- **storage (including unlimitedStorage):** To save your captured conversations locally without size limits.
- **activeTab / tabs:** To read the content of the current tab when you capture a conversation.
- **sidePanel:** To display your saved library.
- **Host Permissions:** 
  - `claude.ai`
  - `chatgpt.com`
  - `gemini.google.com`
  - `perplexity.ai`
  (Access is strictly limited to capturing chat content on these sites).

## Data Sharing
Since all data is stored locally, we do not share your data with third parties, advertisers, or affiliates.

## User Control
You have full control over your data:
- **Export:** You can export your conversations to JSON, Markdown, or HTML at any time.
- **Delete:** You can delete individual conversations or clear all messages directly within the extension.

## Changes to This Policy
We may update this Privacy Policy from time to time. If we make material changes, we will notify you through the extension (version update notes).

## Contact Us
If you have any questions about this Privacy Policy, please contact us at:
- **Email:** devmemory.extension@gmail.com
- **GitHub Issues:** https://github.com/Janakiraman-311/dev-memory/issues
