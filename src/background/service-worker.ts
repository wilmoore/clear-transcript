import { setupMessageHandler, saveSettings } from './message-handler';
import { cleanupExpiredEntries, getCacheStats } from './cache-manager';
import { DEFAULT_SETTINGS } from '@/types';

/**
 * Service Worker entry point
 *
 * Handles:
 * - Extension installation/updates
 * - Message routing
 * - Keyboard commands
 * - Cache management
 * - Periodic cleanup
 */

// ============================================================================
// Initialization
// ============================================================================

console.log('[ClearTranscript] Service worker starting...');

// Set up message handling
setupMessageHandler();

// ============================================================================
// Extension Lifecycle
// ============================================================================

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[ClearTranscript] Extension installed:', details.reason);

  if (details.reason === 'install') {
    // Initialize default settings
    await saveSettings(DEFAULT_SETTINGS);
    console.log('[ClearTranscript] Default settings initialized');
  }

  if (details.reason === 'update') {
    // Migrate settings if needed
    console.log('[ClearTranscript] Extension updated');
  }

  // Set up periodic cache cleanup
  await setupCacheCleanup();
});

/**
 * Handle service worker startup
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('[ClearTranscript] Service worker started');
  await setupCacheCleanup();
});

// ============================================================================
// Keyboard Commands
// ============================================================================

/**
 * Handle keyboard command from manifest
 */
chrome.commands.onCommand.addListener(async (command) => {
  console.log('[ClearTranscript] Command received:', command);

  if (command === 'toggle-transcript') {
    // Get active tab and send toggle message
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab?.id && isYouTubeTab(tab.url)) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
    }
  }
});

// ============================================================================
// Extension Icon Click
// ============================================================================

/**
 * Handle extension icon click
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && isYouTubeTab(tab.url)) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
  } else {
    // Open options page if not on YouTube
    chrome.runtime.openOptionsPage();
  }
});

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Set up periodic cache cleanup
 */
async function setupCacheCleanup(): Promise<void> {
  // Clean up immediately on startup
  const removed = await cleanupExpiredEntries();
  console.log(`[ClearTranscript] Cleaned up ${removed} expired cache entries`);

  // Set up alarm for periodic cleanup (every 6 hours)
  chrome.alarms.create('cache-cleanup', {
    periodInMinutes: 360,
  });
}

/**
 * Handle cache cleanup alarm
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cache-cleanup') {
    const removed = await cleanupExpiredEntries();
    const stats = await getCacheStats();
    console.log(
      `[ClearTranscript] Cache cleanup: removed ${removed}, total ${stats.entries} entries (${formatBytes(stats.bytesUsed)})`
    );
  }
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if URL is a YouTube page
 */
function isYouTubeTab(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('youtube.com/watch') || url.includes('youtube.com/shorts');
}

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// Context Menu (optional, for future use)
// ============================================================================

// Uncomment to add right-click context menu
/*
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clear-transcript-open',
    title: 'Open Transcript',
    contexts: ['page'],
    documentUrlPatterns: ['*://www.youtube.com/*', '*://youtube.com/*'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'clear-transcript-open' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
  }
});
*/
