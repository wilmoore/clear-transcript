# 003. Vitest with Happy-DOM for Unit Testing

Date: 2025-12-25

## Status

Accepted

## Context

The extension needed a testing infrastructure that could:

1. Test TypeScript code with path aliases (@/ prefix)
2. Mock Chrome extension APIs (chrome.storage, chrome.runtime)
3. Mock DOM APIs for YouTube page interactions
4. Run fast enough for developer feedback loop
5. Integrate with existing Vite build tooling

## Decision

Use Vitest with happy-dom environment and custom mocks:

- **Vitest**: Native Vite integration, TypeScript support, fast execution
- **happy-dom**: Lightweight DOM implementation for browser-like environment
- **Custom Chrome mock**: Mock `chrome.storage.local` and `chrome.runtime.sendMessage`
- **Custom YouTube DOM mock**: Simulate YouTube page structure for testing

Test structure:
```
src/__tests__/
├── mocks/
│   ├── chrome.ts       # Chrome API mocks
│   └── youtube-dom.ts  # YouTube page structure mocks
├── transcript/
│   └── pipeline.test.ts
├── background/
│   └── cache-manager.test.ts
└── utils/
    ├── youtube-api.test.ts
    └── export.test.ts
```

## Consequences

### Positive

- Fast test execution (~64 tests run quickly)
- Seamless path alias support matches source code
- Mocks are isolated and reusable
- Happy-dom is lighter than jsdom for our needs
- Tests can verify both unit logic and DOM interactions

### Negative

- Chrome mocks require maintenance as APIs are used
- Not a full browser environment - some edge cases may not be caught
- YouTube DOM structure may change, breaking mock assumptions

## Alternatives Considered

1. **Jest**: Rejected due to slower startup and extra configuration for Vite
2. **jsdom**: Rejected as heavier than needed; happy-dom sufficient
3. **Playwright unit mode**: Rejected as too heavy for unit tests (reserved for E2E)
4. **No mocks (integration only)**: Rejected because Chrome APIs unavailable in test environment

## Related

- Planning: `.plan/.done/fix-comprehensive-gap-analysis/`
