type ExtensionRoot = typeof chrome & {
  browserAction?: typeof chrome.action;
};

function getExtensionRoot(): ExtensionRoot | undefined {
  const globalScope = globalThis as typeof globalThis & {
    browser?: ExtensionRoot;
    chrome?: ExtensionRoot;
  };
  return globalScope.browser ?? globalScope.chrome;
}

function isPromiseApi(): boolean {
  return typeof (globalThis as typeof globalThis & { browser?: unknown }).browser !== 'undefined';
}

function getLastRuntimeError(): chrome.runtime.LastError | undefined {
  try {
    if (typeof chrome !== 'undefined') return chrome.runtime?.lastError;
  } catch {
    // Runtime can disappear while extension pages are being unloaded.
  }
  return undefined;
}

function toPromise<T>(target: any, methodName: string, args: unknown[] = []): Promise<T> {
  const method = target?.[methodName];
  if (typeof method !== 'function') {
    return Promise.reject(new Error(`Extension API method unavailable: ${methodName}`));
  }

  if (isPromiseApi()) {
    try {
      return Promise.resolve(method.apply(target, args));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  return new Promise<T>((resolve, reject) => {
    try {
      method.apply(target, [
        ...args,
        (value: T) => {
          const lastError = getLastRuntimeError();
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }
          resolve(value);
        },
      ]);
    } catch (err) {
      reject(err);
    }
  });
}

export const extensionApi = {
  runtime: {
    get id(): string | undefined {
      return getExtensionRoot()?.runtime?.id;
    },
    get onMessage() {
      return getExtensionRoot()?.runtime?.onMessage;
    },
    get onInstalled() {
      return getExtensionRoot()?.runtime?.onInstalled;
    },
    getURL(path: string): string {
      return getExtensionRoot()?.runtime?.getURL(path) ?? '';
    },
    getManifest(): chrome.runtime.Manifest | undefined {
      return getExtensionRoot()?.runtime?.getManifest?.();
    },
    openOptionsPage(): Promise<void> {
      return toPromise<void>(getExtensionRoot()?.runtime, 'openOptionsPage');
    },
    sendMessage<T = unknown>(message: unknown): Promise<T> {
      return toPromise<T>(getExtensionRoot()?.runtime, 'sendMessage', [message]);
    },
  },
  storage: {
    get onChanged() {
      return getExtensionRoot()?.storage?.onChanged;
    },
    local: {
      get<T = Record<string, unknown>>(keys?: string | string[] | Record<string, unknown> | null): Promise<T> {
        return toPromise<T>(getExtensionRoot()?.storage?.local, 'get', keys === undefined ? [] : [keys]);
      },
      set(items: Record<string, unknown>): Promise<void> {
        return toPromise<void>(getExtensionRoot()?.storage?.local, 'set', [items]);
      },
      remove(keys: string | string[]): Promise<void> {
        return toPromise<void>(getExtensionRoot()?.storage?.local, 'remove', [keys]);
      },
    },
  },
  tabs: {
    query(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
      return toPromise<chrome.tabs.Tab[]>(getExtensionRoot()?.tabs, 'query', [queryInfo]);
    },
    create(createProperties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> {
      return toPromise<chrome.tabs.Tab>(getExtensionRoot()?.tabs, 'create', [createProperties]);
    },
    sendMessage<T = unknown>(tabId: number, message: unknown): Promise<T> {
      return toPromise<T>(getExtensionRoot()?.tabs, 'sendMessage', [tabId, message]);
    },
  },
  contextMenus: {
    get onClicked() {
      return getExtensionRoot()?.contextMenus?.onClicked;
    },
    create(createProperties: chrome.contextMenus.CreateProperties): void {
      getExtensionRoot()?.contextMenus?.create?.(createProperties);
    },
    removeAll(callback?: () => void): void {
      getExtensionRoot()?.contextMenus?.removeAll?.(callback);
    },
  },
  commands: {
    get onCommand() {
      return getExtensionRoot()?.commands?.onCommand;
    },
  },
  scripting: {
    executeScript<T = unknown>(injection: chrome.scripting.ScriptInjection<unknown[], T>): Promise<chrome.scripting.InjectionResult<T>[]> {
      return toPromise<chrome.scripting.InjectionResult<T>[]>(getExtensionRoot()?.scripting, 'executeScript', [injection]);
    },
  },
  alarms: {
    get onAlarm() {
      return getExtensionRoot()?.alarms?.onAlarm;
    },
    create(name: string, alarmInfo: chrome.alarms.AlarmCreateInfo): void {
      getExtensionRoot()?.alarms?.create?.(name, alarmInfo);
    },
  },
};

export function getRuntimeUrl(path = ''): string {
  try {
    return extensionApi.runtime.getURL(path);
  } catch {
    return '';
  }
}