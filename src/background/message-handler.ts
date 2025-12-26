import type {
  Message,
  GetTranscriptMessage,
  ChangeLanguageMessage,
  SubmitTierCMessage,
  CacheTranscriptMessage,
  TranscriptResult,
  ExtensionSettings,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getCachedTranscript, cacheTranscript } from './cache-manager';

type SendResponse = (response: unknown) => void;

/**
 * Message handler for communication between content script and service worker
 */
export function setupMessageHandler(): void {
  chrome.runtime.onMessage.addListener(
    (message: Message, sender, sendResponse: SendResponse) => {
      handleMessage(message, sender, sendResponse);
      return true; // Indicates async response
    }
  );
}

/**
 * Route messages to appropriate handlers
 */
async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: SendResponse
): Promise<void> {
  try {
    switch (message.type) {
      case 'GET_TRANSCRIPT':
        await handleGetTranscript(message, sender, sendResponse);
        break;

      case 'CHANGE_LANGUAGE':
        await handleChangeLanguage(message, sender, sendResponse);
        break;

      case 'SUBMIT_TIER_C':
        await handleSubmitTierC(message, sender, sendResponse);
        break;

      case 'GET_SETTINGS':
        await handleGetSettings(sendResponse);
        break;

      case 'CACHE_TRANSCRIPT':
        await handleCacheTranscript(message, sendResponse);
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[ClearTranscript] Message handler error:', error);
    sendResponse({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle GET_TRANSCRIPT request
 */
async function handleGetTranscript(
  message: GetTranscriptMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: SendResponse
): Promise<void> {
  const { videoId, preferredLanguage } = message;

  // Check cache first
  const cached = await getCachedTranscript(videoId);
  if (cached) {
    sendResponse({
      type: 'TRANSCRIPT_RESULT',
      videoId,
      result: cached,
      cached: true,
    });
    return;
  }

  // Execute transcript retrieval in content script context
  // (since we need access to YouTube's DOM)
  if (!sender.tab?.id) {
    sendResponse({ error: 'No tab context' });
    return;
  }

  // Send message to content script to fetch transcript
  // The content script will handle the pipeline execution
  sendResponse({
    type: 'TRANSCRIPT_PROCESSING',
    videoId,
  });
}

/**
 * Handle CHANGE_LANGUAGE request
 */
async function handleChangeLanguage(
  message: ChangeLanguageMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: SendResponse
): Promise<void> {
  const { videoId, languageCode } = message;

  // Language changes need to go through content script
  // since captions are fetched from page context
  if (!sender.tab?.id) {
    sendResponse({ error: 'No tab context' });
    return;
  }

  sendResponse({
    type: 'TRANSCRIPT_PROCESSING',
    videoId,
  });
}

/**
 * Handle SUBMIT_TIER_C request (manual backend submission)
 */
async function handleSubmitTierC(
  message: SubmitTierCMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: SendResponse
): Promise<void> {
  const { videoId } = message;
  const settings = await getSettings();

  if (!settings.backendUrl) {
    sendResponse({
      error: 'No backend URL configured',
    });
    return;
  }

  // Tier C requests go through service worker since they're external API calls
  sendResponse({
    type: 'TRANSCRIPT_PROCESSING',
    videoId,
  });
}

/**
 * Handle GET_SETTINGS request
 */
async function handleGetSettings(sendResponse: SendResponse): Promise<void> {
  const settings = await getSettings();
  sendResponse({
    type: 'SETTINGS_RESULT',
    settings,
  });
}

/**
 * Handle CACHE_TRANSCRIPT request
 */
async function handleCacheTranscript(
  message: CacheTranscriptMessage,
  sendResponse: SendResponse
): Promise<void> {
  const { videoId, result } = message;
  await cacheTranscript(videoId, result);
  sendResponse({ success: true });
}

/**
 * Get extension settings from storage
 */
async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get('settings');
  return (result.settings as ExtensionSettings) || DEFAULT_SETTINGS;
}

/**
 * Save extension settings
 */
export async function saveSettings(
  settings: ExtensionSettings
): Promise<void> {
  await chrome.storage.sync.set({ settings });
}

/**
 * Send message to content script
 */
export async function sendToContentScript(
  tabId: number,
  message: Message
): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, message);
}

/**
 * Cache transcript result (exported for use by content script)
 */
export async function cacheResult(
  videoId: string,
  result: TranscriptResult
): Promise<void> {
  await cacheTranscript(videoId, result);
}
