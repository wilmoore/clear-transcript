import { extractVideoId } from '@/utils/youtube-api';

/**
 * Navigation observer for YouTube SPA
 *
 * YouTube uses client-side navigation, so we need to watch for
 * URL changes without full page reloads.
 */

export type NavigationCallback = (videoId: string | null) => void;

// Debounce timer for video change checks
let checkVideoChangeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Create a navigation observer that watches for video changes
 */
export function createNavigationObserver(
  callback: NavigationCallback
): () => void {
  let currentVideoId = extractVideoId(window.location.href);

  // Debounced check for video change to prevent rapid-fire callbacks
  const checkVideoChange = () => {
    if (checkVideoChangeTimer) {
      clearTimeout(checkVideoChangeTimer);
    }
    checkVideoChangeTimer = setTimeout(() => {
      const newVideoId = extractVideoId(window.location.href);
      if (newVideoId !== currentVideoId) {
        currentVideoId = newVideoId;
        callback(newVideoId);
      }
    }, 50);
  };

  // Method 1: Watch for URL changes via history API
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    checkVideoChange();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    checkVideoChange();
  };

  // Method 2: Watch for popstate events (back/forward navigation)
  const popstateHandler = () => checkVideoChange();
  window.addEventListener('popstate', popstateHandler);

  // Method 3: Watch for YouTube's custom navigation events
  const ytNavigateHandler = () => {
    // Small delay to ensure URL is updated
    setTimeout(checkVideoChange, 100);
  };
  window.addEventListener('yt-navigate-finish', ytNavigateHandler);

  // Method 4: MutationObserver as fallback
  // Watch for changes to the video player that indicate a new video
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        checkVideoChange();
        break;
      }
    }
  });

  // Observe the video player container (only if it exists)
  const playerContainer = document.querySelector('#movie_player');
  if (playerContainer) {
    observer.observe(playerContainer, {
      attributes: true,
      attributeFilter: ['video-id'],
    });
  }

  // Method 5: Watch for changes to Shorts content
  // Only observe if shorts container exists to prevent unnecessary observers
  const contentObserver = new MutationObserver(() => {
    // Debounced via checkVideoChange
    checkVideoChange();
  });

  const shortsContainer = document.querySelector('ytd-shorts');
  if (shortsContainer) {
    contentObserver.observe(shortsContainer, {
      childList: true,
      subtree: false, // Reduced scope - only direct children
      attributes: true,
      attributeFilter: ['is-active'],
    });
  }

  // Return cleanup function
  return () => {
    // Clear any pending timers
    if (checkVideoChangeTimer) {
      clearTimeout(checkVideoChangeTimer);
      checkVideoChangeTimer = null;
    }

    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener('popstate', popstateHandler);
    window.removeEventListener('yt-navigate-finish', ytNavigateHandler);
    observer.disconnect();
    contentObserver.disconnect();
  };
}

/**
 * Wait for YouTube's player to be ready
 */
export function waitForPlayer(): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const checkPlayer = () => {
      const player = document.querySelector('#movie_player');
      if (player) {
        resolve(player as HTMLElement);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkPlayer()) return;

    // Set up observer
    const observer = new MutationObserver(() => {
      if (checkPlayer()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      observer.disconnect();
      reject(new Error('Player not found within timeout'));
    }, 30000);
  });
}

/**
 * Wait for Shorts player to be ready
 */
export function waitForShortsPlayer(): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const checkPlayer = () => {
      const player = document.querySelector(
        'ytd-reel-video-renderer[is-active] #player'
      );
      if (player) {
        resolve(player as HTMLElement);
        return true;
      }
      return false;
    };

    if (checkPlayer()) return;

    const observer = new MutationObserver(() => {
      if (checkPlayer()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error('Shorts player not found within timeout'));
    }, 30000);
  });
}

/**
 * Watch for active Shorts changes
 */
export function watchActiveShortsChange(
  callback: (videoId: string | null) => void
): () => void {
  const observer = new MutationObserver(() => {
    const activeShort = document.querySelector(
      'ytd-reel-video-renderer[is-active]'
    );
    if (activeShort) {
      // Extract video ID from the active short
      const videoId = extractVideoId(window.location.href);
      callback(videoId);
    }
  });

  const container = document.querySelector('ytd-shorts');
  if (container) {
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['is-active'],
    });
  }

  return () => observer.disconnect();
}
