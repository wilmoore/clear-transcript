export interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onClear: () => void;
}

/**
 * Create a search bar component
 */
export function createSearchBar(props: SearchBarProps): {
  element: HTMLElement;
  focus: () => void;
  clear: () => void;
  getValue: () => string;
} {
  const { placeholder = 'Search transcript...', onSearch, onClear } = props;

  const container = document.createElement('div');
  container.className = 'ct-search-bar';

  container.innerHTML = `
    <div class="ct-search-input-wrapper">
      <svg class="ct-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        type="text"
        class="ct-search-input"
        placeholder="${placeholder}"
      />
      <button class="ct-search-clear ct-icon-button" style="display: none;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;

  const input = container.querySelector('.ct-search-input') as HTMLInputElement;
  const clearButton = container.querySelector('.ct-search-clear') as HTMLButtonElement;

  let debounceTimeout: ReturnType<typeof setTimeout>;

  input.addEventListener('input', () => {
    const value = input.value;
    clearButton.style.display = value ? 'flex' : 'none';

    // Debounce search
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      onSearch(value);
    }, 150);
  });

  clearButton.addEventListener('click', () => {
    input.value = '';
    clearButton.style.display = 'none';
    onClear();
    input.focus();
  });

  // Handle escape to clear
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value) {
      e.stopPropagation();
      input.value = '';
      clearButton.style.display = 'none';
      onClear();
    }
  });

  return {
    element: container,
    focus: () => input.focus(),
    clear: () => {
      input.value = '';
      clearButton.style.display = 'none';
    },
    getValue: () => input.value,
  };
}

/**
 * Get search bar styles
 */
export function getSearchBarStyles(): string {
  return `
    .ct-search-bar {
      padding: 12px;
      border-bottom: 1px solid var(--ct-border);
    }

    .ct-search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .ct-search-icon {
      position: absolute;
      left: 10px;
      width: 16px;
      height: 16px;
      color: var(--ct-text-secondary);
      pointer-events: none;
    }

    .ct-search-input {
      width: 100%;
      padding: 8px 36px;
      background: var(--ct-bg-secondary);
      border: 1px solid var(--ct-border);
      border-radius: var(--ct-radius);
      color: var(--ct-text);
      font-size: 14px;
      outline: none;
      transition: border-color var(--ct-transition);
    }

    .ct-search-input:focus {
      border-color: var(--ct-accent);
    }

    .ct-search-input::placeholder {
      color: var(--ct-text-secondary);
    }

    .ct-search-clear {
      position: absolute;
      right: 4px;
      padding: 4px;
    }
  `;
}
