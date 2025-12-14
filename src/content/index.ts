import type { PageState, TranscriptResult, ExtensionSettings, Message } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { extractVideoId } from '@/utils/youtube-api';
import { getPageState, shouldInjectUI, watchPageState, getVideoTitle } from './page-detector';
import { createNavigationObserver, waitForPlayer } from './navigation-observer';
import { injectUI, removeUI, getUIController, updateUIForState } from './ui-injector';
import { getTranscript, getTranscriptForLanguage, getSourceLabel } from '@/transcript/pipeline';

/**
 * Content Script Entry Point
 *
 * Responsibilities:
 * - Detect page type and view mode
 * - Inject appropriate UI
 * - Handle navigation (SPA)
 * - Coordinate transcript fetching
 * - Handle keyboard shortcuts
 */

console.log('[ClearTranscript] Content script loaded');

// ============================================================================
// State
// ============================================================================

let currentVideoId: string | null = null;
let currentPageState: PageState | null = null;
let currentTranscript: TranscriptResult | null = null;
let settings: ExtensionSettings = DEFAULT_SETTINGS;
let cleanupFunctions: (() => void)[] = [];

// ============================================================================
// Initialization
// ============================================================================

async function init(): Promise<void> {
  console.log('[ClearTranscript] Initializing...');

  // Load settings
  await loadSettings();

  // Set up navigation observer
  const cleanupNav = createNavigationObserver(handleVideoChange);
  cleanupFunctions.push(cleanupNav);

  // Set up page state watcher
  const cleanupState = watchPageState(handlePageStateChange);
  cleanupFunctions.push(cleanupState);

  // Set up message listener
  chrome.runtime.onMessage.addListener(handleMessage);

  // Set up keyboard shortcuts
  document.addEventListener('keydown', handleKeyDown);
  cleanupFunctions.push(() => document.removeEventListener('keydown', handleKeyDown));

  // Initial page check
  const state = getPageState();
  if (shouldInjectUI()) {
    await handlePageStateChange(state);
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle video change (navigation)
 */
async function handleVideoChange(videoId: string | null): Promise<void> {
  if (videoId === currentVideoId) return;

  console.log('[ClearTranscript] Video changed:', videoId);
  currentVideoId = videoId;
  currentTranscript = null;

  // Update UI if needed
  const state = getPageState();
  await handlePageStateChange(state);

  // Fetch new transcript
  if (videoId) {
    await fetchTranscript(videoId);
  }
}

/**
 * Handle page state change (mode changes)
 */
async function handlePageStateChange(state: PageState): Promise<void> {
  console.log('[ClearTranscript] Page state changed:', state);
  currentPageState = state;

  if (!shouldInjectUI()) {
    removeUI();
    return;
  }

  // Wait for player to be ready
  try {
    await waitForPlayer();
  } catch (error) {
    console.warn('[ClearTranscript] Player not ready:', error);
    return;
  }

  // Update or inject UI
  const controller = updateUIForState(state, settings);

  // Update controller with current transcript if available
  if (controller && currentTranscript) {
    controller.setTranscript(currentTranscript);
  }

  // Auto-open if enabled and we have a video
  if (settings.autoOpen && state.videoId && controller) {
    controller.open();
  }
}

/**
 * Handle messages from background script
 */
function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): boolean {
  switch (message.type) {
    case 'TOGGLE_PANEL':
      togglePanel();
      sendResponse({ success: true });
      break;

    case 'TRANSCRIPT_RESULT':
      handleTranscriptResult(message.result);
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true;
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (!settings.keyboardShortcutsEnabled) return;

  const controller = getUIController();
  if (!controller) return;

  // Don't handle if user is typing in an input
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  ) {
    return;
  }

  switch (event.key.toLowerCase()) {
    case 't':
      // Toggle panel
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        togglePanel();
      }
      break;

    case 'escape':
      // Close panel
      if (controller.isOpen()) {
        event.preventDefault();
        controller.close();
      }
      break;

    case 'f':
      // Focus search
      if ((event.ctrlKey || event.metaKey) && controller.isOpen()) {
        event.preventDefault();
        controller.focusSearch();
      }
      break;

    case 'c':
      // Copy transcript
      if ((event.ctrlKey || event.metaKey) && controller.isOpen()) {
        event.preventDefault();
        controller.copyTranscript();
      }
      break;

    case 'd':
      // Download transcript
      if ((event.ctrlKey || event.metaKey) && controller.isOpen()) {
        event.preventDefault();
        controller.downloadTranscript(settings.defaultDownloadFormat);
      }
      break;

    case 'arrowup':
      if (controller.isOpen()) {
        event.preventDefault();
        controller.navigateLines(-1);
      }
      break;

    case 'arrowdown':
      if (controller.isOpen()) {
        event.preventDefault();
        controller.navigateLines(1);
      }
      break;

    case 'enter':
      if (controller.isOpen()) {
        event.preventDefault();
        controller.seekToSelectedLine();
      }
      break;
  }
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Toggle transcript panel
 */
function togglePanel(): void {
  const controller = getUIController();
  if (!controller) return;

  if (controller.isOpen()) {
    controller.close();
  } else {
    controller.open();
  }
}

/**
 * Fetch transcript for video
 */
async function fetchTranscript(videoId: string): Promise<void> {
  const controller = getUIController();

  // Show loading state
  if (controller) {
    controller.setLoading(true);
  }

  try {
    const result = await getTranscript(
      videoId,
      settings,
      handleTranscriptUpdate
    );

    currentTranscript = result;

    if (controller) {
      controller.setTranscript(result);
      controller.setLoading(false);
    }

    // Cache result
    cacheTranscript(videoId, result);
  } catch (error) {
    console.error('[ClearTranscript] Transcript fetch failed:', error);
    if (controller) {
      controller.setError(
        error instanceof Error ? error.message : 'Failed to load transcript'
      );
      controller.setLoading(false);
    }
  }
}

/**
 * Handle transcript update (e.g., Tier C completion)
 */
function handleTranscriptUpdate(result: TranscriptResult): void {
  currentTranscript = result;

  const controller = getUIController();
  if (controller) {
    controller.setTranscript(result);
  }

  // Update cache
  if (currentVideoId) {
    cacheTranscript(currentVideoId, result);
  }
}

/**
 * Handle transcript result from background script
 */
function handleTranscriptResult(result: TranscriptResult): void {
  currentTranscript = result;

  const controller = getUIController();
  if (controller) {
    controller.setTranscript(result);
  }
}

/**
 * Change transcript language
 */
async function changeLanguage(languageCode: string): Promise<void> {
  if (!currentVideoId) return;

  const controller = getUIController();
  if (controller) {
    controller.setLoading(true);
  }

  try {
    const result = await getTranscriptForLanguage(currentVideoId, languageCode);

    if (result) {
      currentTranscript = result;

      if (controller) {
        controller.setTranscript(result);
      }

      cacheTranscript(currentVideoId, result);
    }
  } catch (error) {
    console.error('[ClearTranscript] Language change failed:', error);
  } finally {
    if (controller) {
      controller.setLoading(false);
    }
  }
}

// ============================================================================
// Settings & Cache
// ============================================================================

/**
 * Load settings from storage
 */
async function loadSettings(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (response?.settings) {
      settings = response.settings;
    }
  } catch (error) {
    console.error('[ClearTranscript] Failed to load settings:', error);
  }
}

/**
 * Cache transcript via background script
 */
function cacheTranscript(videoId: string, result: TranscriptResult): void {
  chrome.runtime.sendMessage({
    type: 'CACHE_TRANSCRIPT',
    videoId,
    result,
  });
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Cleanup on unload
 */
window.addEventListener('unload', () => {
  cleanupFunctions.forEach((fn) => fn());
  removeUI();
});

// ============================================================================
// Start
// ============================================================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for external access
export { changeLanguage, fetchTranscript };
