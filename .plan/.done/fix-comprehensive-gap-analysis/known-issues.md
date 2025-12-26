# Clear Transcript - Known Issues & Future Work

## Branch: fix/comprehensive-gap-analysis

### Completed Fixes (This PR)

#### Testing Infrastructure
- Added Vitest with happy-dom environment
- Created Chrome API and YouTube DOM mocks
- 64 tests covering critical paths: pipeline, cache, youtube-api, export

#### Bug Fixes
1. **Memory Leaks** (navigation-observer.ts, page-detector.ts)
   - Added debouncing to prevent rapid-fire callbacks
   - Reduced observer scope for Shorts container
   - Added `isConnected` checks before DOM operations
   - Proper cleanup of observers and timers

2. **Race Conditions** (pipeline.ts, content/index.ts)
   - Added `activePolls` Map to track and cancel pending polls
   - Added `cancelActivePoll()` export for video change handling
   - Added video ID check after async operations to prevent stale updates
   - Wrapped poll function in try-catch with proper error handling

3. **Missing Message Handler** (message-handler.ts, types/index.ts)
   - Added `CACHE_TRANSCRIPT` message type and handler

4. **Network Timeouts**
   - tier-c-backend.ts: 30s for submission, 10s for status checks
   - youtube-api.ts: 15s for transcript fetch

5. **Input Validation**
   - Added `isValidVideoId()` regex validator (11 chars, alphanumeric/underscore/hyphen)
   - Added `isValidBackendUrl()` URL validation
   - Added try-catch guards around JSON.parse operations

6. **Language Change Event** (layouts/*.ts, content/index.ts)
   - Added `bubbles: true, composed: true` to CustomEvent to cross shadow DOM boundary
   - Added document-level event listener in content script

7. **Manifest Keyboard Shortcuts**
   - Removed `commands` section (bare keys can't be declared in manifest)
   - Content script handles 'T' key directly

---

### Known Issues (To Address Later)

#### 1. E2E Tests
- **Priority:** Medium
- **Description:** No Playwright tests against real YouTube pages
- **Impact:** Complex SPA navigation edge cases may not be fully tested
- **Workaround:** Manual testing on YouTube

#### 2. Full Test Coverage
- **Priority:** Low
- **Description:** Only critical paths covered (~64 tests)
- **Missing Coverage:**
  - UI components (SidePanel, BottomSheet, FullscreenModal)
  - TranscriptPanel component
  - DOM utilities
  - Service worker lifecycle
- **Note:** Acceptable for MVP, expand coverage iteratively

#### 3. History API Override
- **Priority:** Low
- **Description:** Navigation observer overrides `history.pushState/replaceState`
- **Impact:** Potential conflict with other extensions that also override these
- **Location:** `src/content/navigation-observer.ts` lines 38-49
- **Mitigation:** Stores original functions and calls them

#### 4. Backend Integration E2E
- **Priority:** Medium
- **Description:** Tier C backend tests require running server
- **Impact:** Cannot fully test transcription pipeline in CI
- **Workaround:** Mock backend responses in tests

#### 5. Shorts Navigation Complexity
- **Priority:** Low
- **Description:** YouTube Shorts SPA navigation is complex
- **Impact:** Edge cases with rapid scrolling may cause issues
- **Mitigation:** Debounced observer callbacks added

#### 6. Auto-Generated Caption Quality
- **Priority:** Info Only
- **Description:** YouTube's ASR captions may have errors
- **Impact:** User sees inaccurate transcript text
- **Note:** Outside our control - transcription quality is YouTube's responsibility

---

### Security Considerations

- All fetch calls now have timeouts to prevent hanging
- Backend URLs validated before use
- Video IDs validated with regex
- JSON parsing wrapped in try-catch
- No storage of sensitive credentials
- Content script isolated via Shadow DOM

---

### Performance Notes

- Observers scoped to minimal DOM subset
- Debouncing prevents rapid-fire callbacks
- Polls cancelled on video change to prevent resource waste
- Cache TTLs: Tier A (24h), Tier B (1h), Tier C (7d)

---

## Files Modified

### New Files
- `vitest.config.ts`
- `src/__tests__/mocks/chrome.ts`
- `src/__tests__/mocks/youtube-dom.ts`
- `src/__tests__/transcript/pipeline.test.ts`
- `src/__tests__/background/cache-manager.test.ts`
- `src/__tests__/utils/youtube-api.test.ts`
- `src/__tests__/utils/export.test.ts`
- `.plan/known-issues.md`

### Modified Files
- `package.json` - test scripts, upgraded deps
- `tsconfig.json` - test includes
- `src/content/navigation-observer.ts` - memory leak fixes
- `src/content/page-detector.ts` - memory leak fixes
- `src/content/index.ts` - race conditions, language event
- `src/transcript/pipeline.ts` - race conditions, poll cancellation
- `src/background/message-handler.ts` - CACHE_TRANSCRIPT handler
- `src/types/index.ts` - CacheTranscriptMessage type
- `src/transcript/tier-c-backend.ts` - timeouts, validation
- `src/utils/youtube-api.ts` - timeouts, validation
- `src/ui/layouts/SidePanel.ts` - event composition
- `src/ui/layouts/BottomSheet.ts` - event composition
- `src/ui/layouts/FullscreenModal.ts` - event composition
- `manifest.json` - removed commands section
- `src/options/options.ts` - type cast fix
- `src/background/cache-manager.ts` - type cast fix

---

## Related ADRs

- [001. Tiered Transcript Retrieval Pipeline](../../doc/decisions/001-tiered-transcript-retrieval-pipeline.md)
- [002. Poll Cancellation for Race Condition Prevention](../../doc/decisions/002-poll-cancellation-for-race-condition-prevention.md)
- [003. Vitest with Happy-DOM for Unit Testing](../../doc/decisions/003-vitest-with-happy-dom-for-unit-testing.md)
