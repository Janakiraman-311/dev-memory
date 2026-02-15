// Background service worker for Dev Memory Extension

chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
        console.log('[Dev Memory] Extension installed');

        // Set default enabled state
        chrome.storage.local.set({ enabled: true });

        // Open Welcome Page
        chrome.tabs.create({ url: 'onboarding/welcome.html' });
    }
});
