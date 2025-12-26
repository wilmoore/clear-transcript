# 001. Tiered Transcript Retrieval Pipeline

Date: 2025-12-25

## Status

Accepted

## Context

YouTube videos may or may not have captions. When captions exist, they can be official (uploaded by creators) or auto-generated (ASR). When captions don't exist, users still need a way to access video content in text form. The extension needed a strategy that:

1. Works fast when captions are available
2. Provides partial content (description, chapters) as fallback
3. Supports optional backend transcription services

## Decision

Implement a three-tier pipeline:

- **Tier A**: YouTube native captions (fastest, free, most accurate when available)
- **Tier B**: Fallback content including video description and chapters (immediate, partial)
- **Tier C**: Backend transcription service (configurable, async, for videos without captions)

The pipeline tries tiers in order A→B→C, returning immediately with the best available result while optionally continuing to fetch better results in the background.

Key implementation details:
- Tier A extracts `ytInitialPlayerResponse` from YouTube page scripts
- Tier B provides immediate fallback so UI is never empty
- Tier C starts in background when Tier B returns, calling `onUpdate` callback when complete
- Each tier has specific cache TTLs: A=24h, B=1h, C=7d

## Consequences

### Positive

- Fast response for majority of videos (those with captions)
- Never shows empty state - always has at least description
- Progressive enhancement - UI updates as better results arrive
- Flexible - backend transcription is optional
- Cache-aware - respects tier-specific freshness requirements

### Negative

- Complexity in managing three code paths
- Background polling requires race condition handling
- Tier C requires external service configuration

## Alternatives Considered

1. **Single tier with YouTube captions only**: Rejected because many videos lack captions
2. **Immediate backend transcription**: Rejected because adds latency for videos with existing captions
3. **No fallback tier**: Rejected because empty state is poor UX

## Related

- Planning: `.plan/.done/fix-comprehensive-gap-analysis/`
