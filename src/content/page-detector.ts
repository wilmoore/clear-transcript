import type { PageType, ViewMode, PageState } from '@/types';
import { extractVideoId, isFullscreen, isTheaterMode } from '@/utils/youtube-api';

/**
 * Page detection utilities for YouTube
 *
 * Detects:
 * - Page type (watch, shorts, other)
 * - View mode (default, theater, fullscreen)
 * - Current video ID
 */

/**
 * Get current page state
 */
export function getPageState(): PageState {
  return {
    type: detectPageType(),
    mode: detectViewMode(),
    videoId: extractVideoId(window.location.href),
  };
}

/**
 * Detect current page type
 */
export function detectPageType(): PageType {
  const url = window.location.href;

  if (url.includes('/watch')) {
    return 'watch';
  }

  if (url.includes('/shorts/')) {
    return 'shorts';
  }

  return 'other';
}

/**
 * Detect current view mode
 */
export function detectViewMode(): ViewMode {
  if (isFullscreen()) {
    return 'fullscreen';
  }

  if (isTheaterMode()) {
    return 'theater';
  }

  return 'default';
}

/**
 * Check if we should inject UI on current page
 */
export function shouldInjectUI(): boolean {
  const pageType = detectPageType();
  return pageType === 'watch' || pageType === 'shorts';
}

/**
 * Get the appropriate container element for UI injection
 */
export function getUIContainer(): HTMLElement | null {
  const pageType = detectPageType();

  switch (pageType) {
    case 'watch':
      // For regular videos, attach to the player
      return document.querySelector('#movie_player');

    case 'shorts':
      // For shorts, attach to the shorts container
      return document.querySelector('ytd-reel-video-renderer[is-active]');

    default:
      return null;
  }
}

/**
 * Get video title
 */
export function getVideoTitle(): string {
  // Try various selectors
  const titleElement =
    document.querySelector('h1.ytd-video-primary-info-renderer') ||
    document.querySelector('h1.ytd-watch-metadata') ||
    document.querySelector('[class*="title"]');

  if (titleElement?.textContent) {
    return titleElement.textContent.trim();
  }

  // Fallback to document title
  return document.title.replace(' - YouTube', '').trim();
}

/**
 * Watch for page state changes
 */
export function watchPageState(
  callback: (state: PageState) => void
): () => void {
  let currentState = getPageState();

  // Watch for fullscreen changes
  const fullscreenHandler = () => {
    const newState = getPageState();
    if (newState.mode !== currentState.mode) {
      currentState = newState;
      callback(currentState);
    }
  };
  document.addEventListener('fullscreenchange', fullscreenHandler);

  // Watch for theater mode changes
  const theaterObserver = new MutationObserver(() => {
    const newState = getPageState();
    if (newState.mode !== currentState.mode) {
      currentState = newState;
      callback(currentState);
    }
  });

  const watchFlexy = document.querySelector('ytd-watch-flexy');
  if (watchFlexy) {
    theaterObserver.observe(watchFlexy, {
      attributes: true,
      attributeFilter: ['theater', 'fullscreen'],
    });
  }

  // Return cleanup function
  return () => {
    document.removeEventListener('fullscreenchange', fullscreenHandler);
    theaterObserver.disconnect();
  };
}

/**
 * Check if current video has changed
 */
export function hasVideoChanged(previousId: string | null): boolean {
  const currentId = extractVideoId(window.location.href);
  return currentId !== previousId;
}
