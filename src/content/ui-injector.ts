import type { PageState, TranscriptResult, ExtensionSettings } from '@/types';
import { createShadowContainer, injectStyles } from '@/utils/dom-utils';
import { getPlayerContainer } from '@/utils/youtube-api';
import { getUIContainer, detectPageType, detectViewMode } from './page-detector';

// Import UI components (will be created)
import { createSidePanel, SidePanelController } from '@/ui/layouts/SidePanel';
import { createBottomSheet, BottomSheetController } from '@/ui/layouts/BottomSheet';
import { createFullscreenModal, FullscreenModalController } from '@/ui/layouts/FullscreenModal';

const CONTAINER_ID = 'clear-transcript-root';

export type UIController = SidePanelController | BottomSheetController | FullscreenModalController;

interface InjectedUI {
  host: HTMLElement;
  shadow: ShadowRoot;
  controller: UIController;
  cleanup: () => void;
}

let currentUI: InjectedUI | null = null;

/**
 * Inject transcript UI based on current page state
 */
export function injectUI(
  state: PageState,
  settings: ExtensionSettings
): UIController | null {
  // Remove existing UI if any
  removeUI();

  const container = getUIContainer();
  if (!container) {
    console.warn('[ClearTranscript] No container found for UI injection');
    return null;
  }

  // Create shadow DOM container
  const { host, shadow } = createShadowContainer(CONTAINER_ID);

  // Inject global styles
  injectStyles(shadow, getGlobalStyles(settings));

  let controller: UIController;
  let cleanup: () => void;

  // Create appropriate UI based on page type and mode
  if (state.type === 'shorts') {
    const result = createBottomSheet(shadow, settings);
    controller = result.controller;
    cleanup = result.cleanup;
  } else if (state.mode === 'fullscreen') {
    const result = createFullscreenModal(shadow, settings);
    controller = result.controller;
    cleanup = result.cleanup;
  } else {
    // Default and theater mode use side panel
    const result = createSidePanel(shadow, settings);
    controller = result.controller;
    cleanup = result.cleanup;
  }

  // Append to container
  container.appendChild(host);

  currentUI = {
    host,
    shadow,
    controller,
    cleanup,
  };

  return controller;
}

/**
 * Remove existing UI
 */
export function removeUI(): void {
  if (currentUI) {
    currentUI.cleanup();
    currentUI.host.remove();
    currentUI = null;
  }
}

/**
 * Get current UI controller
 */
export function getUIController(): UIController | null {
  return currentUI?.controller || null;
}

/**
 * Update UI for new page state
 */
export function updateUIForState(
  state: PageState,
  settings: ExtensionSettings
): UIController | null {
  // Check if we need to recreate UI for new mode
  if (!currentUI) {
    return injectUI(state, settings);
  }

  const currentType = getCurrentUIType();
  const neededType = getNeededUIType(state);

  if (currentType !== neededType) {
    // Need different UI type
    return injectUI(state, settings);
  }

  return currentUI.controller;
}

/**
 * Get current UI type
 */
function getCurrentUIType(): 'side-panel' | 'bottom-sheet' | 'fullscreen-modal' | null {
  if (!currentUI) return null;

  if ('isModal' in currentUI.controller) return 'fullscreen-modal';
  if ('isBottomSheet' in currentUI.controller) return 'bottom-sheet';
  return 'side-panel';
}

/**
 * Get needed UI type for state
 */
function getNeededUIType(state: PageState): 'side-panel' | 'bottom-sheet' | 'fullscreen-modal' {
  if (state.type === 'shorts') return 'bottom-sheet';
  if (state.mode === 'fullscreen') return 'fullscreen-modal';
  return 'side-panel';
}

/**
 * Get global styles for shadow DOM
 */
function getGlobalStyles(settings: ExtensionSettings): string {
  const isDark = settings.darkMode === 'dark' ||
    (settings.darkMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return `
    :host {
      --ct-bg: ${isDark ? '#1a1a1a' : '#ffffff'};
      --ct-bg-secondary: ${isDark ? '#2d2d2d' : '#f5f5f5'};
      --ct-text: ${isDark ? '#ffffff' : '#0f0f0f'};
      --ct-text-secondary: ${isDark ? '#aaaaaa' : '#606060'};
      --ct-border: ${isDark ? '#3d3d3d' : '#e0e0e0'};
      --ct-accent: #ff0000;
      --ct-highlight: ${isDark ? 'rgba(255, 255, 0, 0.3)' : 'rgba(255, 255, 0, 0.5)'};
      --ct-shadow: 0 4px 12px rgba(0, 0, 0, ${isDark ? '0.5' : '0.15'});
      --ct-radius: 8px;
      --ct-transition: 0.2s ease;

      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      font-family: 'Roboto', 'Arial', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: var(--ct-text);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .ct-container {
      pointer-events: auto;
    }

    .ct-button {
      background: var(--ct-bg);
      border: 1px solid var(--ct-border);
      border-radius: var(--ct-radius);
      color: var(--ct-text);
      cursor: pointer;
      padding: 8px 12px;
      transition: all var(--ct-transition);
    }

    .ct-button:hover {
      background: var(--ct-bg-secondary);
    }

    .ct-button:active {
      transform: scale(0.98);
    }

    .ct-icon-button {
      background: transparent;
      border: none;
      color: var(--ct-text);
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background var(--ct-transition);
    }

    .ct-icon-button:hover {
      background: var(--ct-bg-secondary);
    }

    .ct-input {
      background: var(--ct-bg-secondary);
      border: 1px solid var(--ct-border);
      border-radius: var(--ct-radius);
      color: var(--ct-text);
      padding: 8px 12px;
      width: 100%;
      outline: none;
      transition: border-color var(--ct-transition);
    }

    .ct-input:focus {
      border-color: var(--ct-accent);
    }

    .ct-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: var(--ct-border) transparent;
    }

    .ct-scrollbar::-webkit-scrollbar {
      width: 6px;
    }

    .ct-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }

    .ct-scrollbar::-webkit-scrollbar-thumb {
      background: var(--ct-border);
      border-radius: 3px;
    }

    .ct-highlight {
      background: var(--ct-highlight);
      padding: 0 2px;
      border-radius: 2px;
    }

    @keyframes ct-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes ct-slide-in-right {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    @keyframes ct-slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  `;
}
