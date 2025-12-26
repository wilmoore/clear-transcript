# 002. Poll Cancellation for Race Condition Prevention

Date: 2025-12-25

## Status

Accepted

## Context

When Tier C backend transcription is used, the extension polls for completion status. A race condition occurred when:

1. User navigates to Video A, Tier C poll starts
2. User navigates to Video B before poll completes
3. Video A's poll completes and updates UI with wrong transcript

Additionally, multiple polls could run simultaneously for the same video if the user triggered transcript fetching repeatedly.

## Decision

Implement a cancellation mechanism using an `activePolls` Map:

```typescript
const activePolls = new Map<string, { cancel: () => void }>();

export function cancelActivePoll(videoId: string): void {
  const activePoll = activePolls.get(videoId);
  if (activePoll) {
    activePoll.cancel();
    activePolls.delete(videoId);
  }
}
```

Key implementation:
- Each poll registers itself in `activePolls` with a cancel function
- Cancel clears timeouts and sets `cancelled` flag
- Poll checks `cancelled` after async operations before updating UI
- Video change handler calls `cancelActivePoll()` for previous video
- New polls cancel existing polls for the same video

## Consequences

### Positive

- Prevents stale transcript updates when navigating between videos
- Prevents resource waste from orphaned polls
- Clean cancellation - no memory leaks from pending timeouts
- Content script can cancel polls on video change

### Negative

- Adds complexity to polling logic
- Requires careful placement of cancellation checks after every await

## Alternatives Considered

1. **AbortController**: Considered but doesn't integrate well with setTimeout polling
2. **Global poll counter**: Rejected because doesn't support per-video cancellation
3. **Ignore and let overwrite**: Rejected because causes UI flickering

## Related

- Planning: `.plan/.done/fix-comprehensive-gap-analysis/`
