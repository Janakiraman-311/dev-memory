// Welcome page script
document.addEventListener('DOMContentLoaded', () => {
    const getStartedBtn = document.getElementById('getStartedBtn');

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            // Close the welcome tab and open the extension popup
            chrome.tabs.getCurrent((tab) => {
                // Open the side panel
                chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });

                // Close the welcome tab
                if (tab) {
                    chrome.tabs.remove(tab.id);
                }
            });
        });
    }
});
