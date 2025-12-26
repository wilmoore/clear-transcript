/**
 * Chrome API mock for testing
 * Provides mock implementations of Chrome extension APIs
 */

import { vi } from 'vitest';

// Storage mock with in-memory store
const storageData: Record<string, Record<string, unknown>> = {
  sync: {},
  local: {},
};

const createStorageArea = (area: 'sync' | 'local') => ({
  get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
    if (keys === null || keys === undefined) {
      return storageData[area];
    }
    if (typeof keys === 'string') {
      return { [keys]: storageData[area][keys] };
    }
    if (Array.isArray(keys)) {
      const result: Record<string, unknown> = {};
      keys.forEach((key) => {
        result[key] = storageData[area][key];
      });
      return result;
    }
    // Object with defaults
    const result: Record<string, unknown> = {};
    Object.keys(keys).forEach((key) => {
      result[key] = storageData[area][key] ?? (keys as Record<string, unknown>)[key];
    });
    return result;
  }),
  set: vi.fn(async (items: Record<string, unknown>) => {
    Object.assign(storageData[area], items);
  }),
  remove: vi.fn(async (keys: string | string[]) => {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach((key) => {
      delete storageData[area][key];
    });
  }),
  clear: vi.fn(async () => {
    storageData[area] = {};
  }),
  getBytesInUse: vi.fn(async () => {
    return JSON.stringify(storageData[area]).length;
  }),
});

// Message listeners
const messageListeners: ((
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => boolean | void)[] = [];

// Alarm listeners
const alarmListeners: ((alarm: chrome.alarms.Alarm) => void)[] = [];

// Mock chrome object
const chromeMock = {
  storage: {
    sync: createStorageArea('sync'),
    local: createStorageArea('local'),
  },
  runtime: {
    onMessage: {
      addListener: vi.fn((callback) => {
        messageListeners.push(callback);
      }),
      removeListener: vi.fn((callback) => {
        const index = messageListeners.indexOf(callback);
        if (index > -1) messageListeners.splice(index, 1);
      }),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    sendMessage: vi.fn(async (message: unknown) => {
      // Simulate message passing
      return new Promise((resolve) => {
        messageListeners.forEach((listener) => {
          listener(message, { id: 'test-extension' }, resolve);
        });
      });
    }),
    openOptionsPage: vi.fn(),
    id: 'test-extension-id',
  },
  tabs: {
    query: vi.fn(async () => [{ id: 1, url: 'https://www.youtube.com/watch?v=test123' }]),
    sendMessage: vi.fn(async () => ({})),
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn((callback) => {
        alarmListeners.push(callback);
      }),
    },
    clear: vi.fn(),
    get: vi.fn(async () => null),
  },
  commands: {
    onCommand: {
      addListener: vi.fn(),
    },
  },
  action: {
    onClicked: {
      addListener: vi.fn(),
    },
  },
};

// Expose to global
(globalThis as unknown as { chrome: typeof chromeMock }).chrome = chromeMock;

// Helper functions for tests
export function resetChromeMock(): void {
  storageData.sync = {};
  storageData.local = {};
  messageListeners.length = 0;
  alarmListeners.length = 0;
  vi.clearAllMocks();
}

export function triggerAlarm(name: string): void {
  alarmListeners.forEach((listener) => {
    listener({ name, scheduledTime: Date.now() });
  });
}

export function getStorageData(area: 'sync' | 'local'): Record<string, unknown> {
  return storageData[area];
}

export function setStorageData(area: 'sync' | 'local', data: Record<string, unknown>): void {
  storageData[area] = data;
}

export { chromeMock };
