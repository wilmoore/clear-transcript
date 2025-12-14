/**
 * Loading state component
 */
export function createLoadingState(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ct-loading-state';

  container.innerHTML = `
    <div class="ct-loading-spinner"></div>
    <p class="ct-loading-text">Loading transcript...</p>
  `;

  return container;
}

/**
 * Error state component
 */
export function createErrorState(message: string, onRetry?: () => void): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ct-error-state';

  container.innerHTML = `
    <svg class="ct-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4m0 4h.01"/>
    </svg>
    <p class="ct-error-text">${message}</p>
    ${onRetry ? '<button class="ct-retry-button ct-button">Retry</button>' : ''}
  `;

  if (onRetry) {
    const retryButton = container.querySelector('.ct-retry-button');
    retryButton?.addEventListener('click', onRetry);
  }

  return container;
}

/**
 * Empty state component
 */
export function createEmptyState(message: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ct-empty-state';

  container.innerHTML = `
    <svg class="ct-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12h6m-6 4h4"/>
    </svg>
    <p class="ct-empty-text">${message}</p>
  `;

  return container;
}

/**
 * Processing state component (for Tier C)
 */
export function createProcessingState(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ct-processing-state';

  container.innerHTML = `
    <div class="ct-processing-animation">
      <div class="ct-processing-bar"></div>
    </div>
    <p class="ct-processing-text">Processing transcript...</p>
    <p class="ct-processing-subtext">This may take a few minutes</p>
  `;

  return container;
}

/**
 * Get loading/error/empty state styles
 */
export function getStateStyles(): string {
  return `
    .ct-loading-state,
    .ct-error-state,
    .ct-empty-state,
    .ct-processing-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      text-align: center;
      gap: 12px;
      height: 100%;
      min-height: 200px;
    }

    .ct-loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--ct-border);
      border-top-color: var(--ct-accent);
      border-radius: 50%;
      animation: ct-spin 0.8s linear infinite;
    }

    .ct-loading-text,
    .ct-error-text,
    .ct-empty-text,
    .ct-processing-text {
      color: var(--ct-text-secondary);
      font-size: 14px;
    }

    .ct-error-icon,
    .ct-empty-icon {
      width: 48px;
      height: 48px;
      color: var(--ct-text-secondary);
    }

    .ct-error-icon {
      color: #f44336;
    }

    .ct-retry-button {
      margin-top: 8px;
    }

    .ct-processing-animation {
      width: 100%;
      max-width: 200px;
      height: 4px;
      background: var(--ct-border);
      border-radius: 2px;
      overflow: hidden;
    }

    .ct-processing-bar {
      height: 100%;
      width: 30%;
      background: var(--ct-accent);
      border-radius: 2px;
      animation: ct-processing 1.5s ease-in-out infinite;
    }

    @keyframes ct-processing {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }

    .ct-processing-subtext {
      font-size: 12px;
      color: var(--ct-text-secondary);
      opacity: 0.7;
    }
  `;
}
