/**
 * YouTube DOM mock for testing
 * Provides mock implementations of YouTube page structure and player response
 */

import type { YouTubePlayerResponse, YouTubeCaptionTrack } from '@/types';

// Sample player response with captions
export const mockPlayerResponse: YouTubePlayerResponse = {
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en',
          name: { simpleText: 'English' },
          vssId: '.en',
          languageCode: 'en',
          isTranslatable: true,
        },
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=es',
          name: { simpleText: 'Spanish' },
          vssId: '.es',
          languageCode: 'es',
          isTranslatable: true,
        },
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en&kind=asr',
          name: { simpleText: 'English (auto-generated)' },
          vssId: 'a.en',
          languageCode: 'en',
          kind: 'asr',
          isTranslatable: true,
        },
      ],
    },
  },
  videoDetails: {
    videoId: 'dQw4w9WgXcQ',
    title: 'Test Video Title',
    shortDescription: 'This is a test video description.',
    lengthSeconds: '212',
  },
};

// Sample timed text response (transcript data)
export const mockTimedTextResponse = {
  events: [
    { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: 'Hello, ' }, { utf8: 'world!' }] },
    { tStartMs: 2000, dDurationMs: 3000, segs: [{ utf8: "This is a test transcript." }] },
    { tStartMs: 5000, dDurationMs: 2500, segs: [{ utf8: "Testing captions." }] },
    { tStartMs: 7500, dDurationMs: 2000, segs: [{ utf8: "End of transcript." }] },
  ],
};

// Empty player response (no captions)
export const mockPlayerResponseNoCaptions: YouTubePlayerResponse = {
  videoDetails: {
    videoId: 'noCaptions123',
    title: 'Video Without Captions',
    shortDescription: 'This video has no captions available.',
    lengthSeconds: '120',
  },
};

// ytInitialData mock for description and chapters
export const mockInitialData = {
  contents: {
    twoColumnWatchNextResults: {
      results: {
        results: {
          contents: [
            {
              videoSecondaryInfoRenderer: {
                attributedDescription: {
                  content: 'This is the full video description with links and timestamps.',
                },
              },
            },
          ],
        },
      },
    },
  },
  playerOverlays: {
    playerOverlayRenderer: {
      decoratedPlayerBarRenderer: {
        decoratedPlayerBarRenderer: {
          playerBar: {
            multiMarkersPlayerBarRenderer: {
              markersMap: [
                {
                  value: {
                    chapters: [
                      {
                        chapterRenderer: {
                          title: { simpleText: 'Introduction' },
                          timeRangeStartMillis: 0,
                          thumbnail: { thumbnails: [{ url: 'https://example.com/thumb1.jpg' }] },
                        },
                      },
                      {
                        chapterRenderer: {
                          title: { simpleText: 'Main Content' },
                          timeRangeStartMillis: 60000,
                          thumbnail: { thumbnails: [{ url: 'https://example.com/thumb2.jpg' }] },
                        },
                      },
                      {
                        chapterRenderer: {
                          title: { simpleText: 'Conclusion' },
                          timeRangeStartMillis: 180000,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
};

/**
 * Set up YouTube page DOM with player response embedded
 */
export function setupYouTubeDOM(
  playerResponse: YouTubePlayerResponse = mockPlayerResponse,
  initialData: object = mockInitialData
): void {
  // Clear existing scripts
  document.querySelectorAll('script').forEach((s) => s.remove());

  // Add ytInitialPlayerResponse script
  const playerScript = document.createElement('script');
  playerScript.textContent = `var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};`;
  document.head.appendChild(playerScript);

  // Add ytInitialData script
  const dataScript = document.createElement('script');
  dataScript.textContent = `var ytInitialData = ${JSON.stringify(initialData)};`;
  document.head.appendChild(dataScript);

  // Add video player container
  const playerContainer = document.createElement('div');
  playerContainer.id = 'movie_player';
  document.body.appendChild(playerContainer);

  // Add video element
  const video = document.createElement('video');
  video.className = 'html5-main-video';
  video.currentTime = 0;
  playerContainer.appendChild(video);

  // Add title element
  const titleEl = document.createElement('h1');
  titleEl.className = 'ytd-video-primary-info-renderer';
  titleEl.textContent = playerResponse.videoDetails?.title || 'Test Video';
  document.body.appendChild(titleEl);

  // Add meta description
  const meta = document.createElement('meta');
  meta.name = 'description';
  meta.content = playerResponse.videoDetails?.shortDescription || '';
  document.head.appendChild(meta);
}

/**
 * Set up YouTube Shorts DOM
 */
export function setupShortsDOM(): void {
  const shortsContainer = document.createElement('ytd-shorts');
  const activeReel = document.createElement('ytd-reel-video-renderer');
  activeReel.setAttribute('is-active', '');

  const player = document.createElement('div');
  player.id = 'player';
  activeReel.appendChild(player);

  shortsContainer.appendChild(activeReel);
  document.body.appendChild(shortsContainer);
}

/**
 * Set up theater mode
 */
export function setTheaterMode(enabled: boolean): void {
  let watchFlexy = document.querySelector('ytd-watch-flexy');
  if (!watchFlexy) {
    watchFlexy = document.createElement('ytd-watch-flexy');
    document.body.appendChild(watchFlexy);
  }

  if (enabled) {
    watchFlexy.setAttribute('theater', '');
  } else {
    watchFlexy.removeAttribute('theater');
  }
}

/**
 * Clean up YouTube DOM
 */
export function cleanupYouTubeDOM(): void {
  document.querySelectorAll('script').forEach((s) => s.remove());
  document.querySelector('#movie_player')?.remove();
  document.querySelector('ytd-shorts')?.remove();
  document.querySelector('ytd-watch-flexy')?.remove();
  document.querySelector('h1.ytd-video-primary-info-renderer')?.remove();
  document.querySelector('meta[name="description"]')?.remove();
}

/**
 * Mock fetch for timedtext endpoint
 */
export function mockFetch(): void {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('/api/timedtext') || url.includes('timedtext')) {
      return new Response(JSON.stringify(mockTimedTextResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Default mock response
    return new Response('{}', { status: 200 });
  };
}

/**
 * Restore fetch
 */
export function restoreFetch(): void {
  // happy-dom should have its own fetch, but we can reset by reloading
}
