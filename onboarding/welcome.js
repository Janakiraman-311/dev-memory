// Welcome page script
document.addEventListener('DOMContentLoaded', () => {
    // Get all buttons that should open Dev Memory
    const buttons = document.querySelectorAll('#getStartedBtn, .cta-primary');

    buttons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();

            try {
                // Get the current window
                const windows = await chrome.windows.getAll();
                const currentWindow = windows[0];

                if (currentWindow) {
                    // Open the side panel
                    await chrome.sidePanel.open({ windowId: currentWindow.id });

                    // Wait a moment then close this tab
                    setTimeout(async () => {
                        const tab = await chrome.tabs.getCurrent();
                        if (tab && tab.id) {
                            await chrome.tabs.remove(tab.id);
                        }
                    }, 300);
                }
            } catch (error) {
                console.error('Error opening side panel:', error);

                // Fallback: try to close the tab anyway
                try {
                    const tab = await chrome.tabs.getCurrent();
                    if (tab && tab.id) {
                        await chrome.tabs.remove(tab.id);
                    }
                } catch (closeError) {
                    console.error('Error closing tab:', closeError);
                }
            }
        });
    });
});
