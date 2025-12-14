# YouTube Transcript Browser Extension - Feature Plan

## Overview
Chrome MV3 browser extension that injects a reliable transcript system into YouTube video pages, including regular videos, Shorts, theater mode, and fullscreen.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Extension                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │  Content Script │◄──►│ Service Worker  │◄──►│   Storage   │ │
│  │                 │    │  (Background)   │    │  (Cache)    │ │
│  └────────┬────────┘    └────────┬────────┘    └─────────────┘ │
│           │                      │                              │
│           ▼                      ▼                              │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   Shadow DOM    │    │ Transcript API  │                    │
│  │   UI Components │    │   Pipeline      │                    │
│  └─────────────────┘    └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
clear-transcript/
├── manifest.json
├── src/
│   ├── background/
│   │   ├── service-worker.ts
│   │   ├── transcript-fetcher.ts
│   │   ├── cache-manager.ts
│   │   └── message-handler.ts
│   ├── content/
│   │   ├── index.ts
│   │   ├── page-detector.ts
│   │   ├── navigation-observer.ts
│   │   └── ui-injector.ts
│   ├── ui/
│   │   ├── components/
│   │   │   ├── TranscriptPanel.ts
│   │   │   ├── TranscriptLine.ts
│   │   │   ├── SearchBar.ts
│   │   │   ├── SourceIndicator.ts
│   │   │   └── LoadingState.ts
│   │   ├── layouts/
│   │   │   ├── SidePanel.ts
│   │   │   ├── BottomSheet.ts
│   │   │   └── FullscreenModal.ts
│   │   └── styles/
│   │       └── transcript.css
│   ├── transcript/
│   │   ├── pipeline.ts
│   │   ├── tier-a-youtube.ts
│   │   ├── tier-b-fallback.ts
│   │   └── tier-c-backend.ts
│   ├── utils/
│   │   ├── youtube-api.ts
│   │   ├── video-controller.ts
│   │   └── dom-utils.ts
│   └── types/
│       └── index.ts
├── build/
│   └── (compiled output)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Implementation Plan

### Phase 1: Foundation
1. Set up project structure with TypeScript and Vite
2. Create manifest.json (MV3 compliant)
3. Implement page detection (watch, shorts)
4. Set up SPA navigation observer

### Phase 2: Transcript Pipeline
1. Tier A: YouTube caption extraction
   - Parse ytInitialPlayerResponse
   - Fetch timedtext endpoints
   - Prefer human captions over auto-generated
2. Tier B: Fallback content extraction
   - Description text
   - Chapter markers
   - Label as partial
3. Tier C: Backend transcription service
   - Define API contract
   - Implement polling/websocket for status
   - Cache results

### Phase 3: UI Components
1. Shadow DOM container setup
2. Side panel for default/theater mode
3. Bottom sheet for Shorts
4. Fullscreen modal overlay
5. Transcript features:
   - Search
   - Click-to-seek
   - Active line highlight
   - Copy button
   - Source indicator

### Phase 4: Integration
1. Message passing between content script and service worker
2. Chrome storage caching
3. Video player sync
4. State management

### Phase 5: Polish
1. Performance optimization
2. Error handling
3. Edge cases
4. Testing

## Transcript Retrieval Tiers

### Tier A: YouTube Native (Fast, Free)
```typescript
interface TierAResult {
  source: 'youtube-captions' | 'youtube-auto-generated';
  transcript: TranscriptLine[];
  language: string;
}

// Sources checked in order:
// 1. ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer
// 2. Direct timedtext API fetch
// 3. Player API captionTracks
```

### Tier B: Fallback Content
```typescript
interface TierBResult {
  source: 'fallback-partial';
  description?: string;
  chapters?: Chapter[];
  isPartial: true;
}
```

### Tier C: Backend Transcription
```typescript
interface TierCResult {
  source: 'server-transcription';
  transcript: TranscriptLine[];
  status: 'processing' | 'complete' | 'error';
}

// Backend API contract:
// POST /api/transcribe { videoId }
// GET /api/transcript/:videoId
```

## UI Modes

### Default/Theater Mode: Side Panel
- Anchored to right edge of video player
- Collapsed: 32px vertical tab
- Expanded: 320px overlay
- Slides in/out with animation

### Shorts: Bottom Sheet
- Floating trigger button
- Three snap points: peek (15%), half (50%), full (85%)
- Drag gesture support

### Fullscreen: Modal
- Small floating button (bottom-right)
- Centered modal on click
- Esc to close
- Semi-transparent backdrop

## Message Types

```typescript
type Message =
  | { type: 'GET_TRANSCRIPT'; videoId: string }
  | { type: 'TRANSCRIPT_READY'; data: TranscriptResult }
  | { type: 'TRANSCRIPT_PROCESSING'; videoId: string }
  | { type: 'CACHE_HIT'; videoId: string; data: TranscriptResult }
  | { type: 'VIDEO_CHANGED'; videoId: string };
```

## Storage Schema

```typescript
interface CacheEntry {
  videoId: string;
  transcript: TranscriptResult;
  timestamp: number;
  ttl: number; // 24 hours for Tier A/B, 7 days for Tier C
}
```

## Decisions Made

1. **Backend Service**: Configurable URL approach
   - Settings page for backend URL configuration
   - Graceful degradation when no backend configured
   - Tier A/B work independently

2. **Feature Set**: Full features
   - Core: Search, click-to-seek, highlight, copy, source indicator
   - Downloads: SRT/VTT export
   - Multi-language: Language selector for videos with multiple tracks
   - Keyboard shortcuts: Power user support

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `T` | Toggle transcript panel |
| `Ctrl/Cmd + F` | Focus search (when panel open) |
| `Escape` | Close panel/modal |
| `↑/↓` | Navigate transcript lines |
| `Enter` | Seek to selected line |
| `Ctrl/Cmd + C` | Copy full transcript |
| `Ctrl/Cmd + D` | Download transcript |
