(() => {
  const scriptId = "twitchadsblocker-vaft";
  const detectorScriptId = "twitchadsblocker-conflict-detector-script";
  const conflictStorageKey = "conflictInfo";
  const detectorSource = "twitchadsblocker-conflict-detector";
  const detectorTimeoutMs = 1500;
  const api = globalThis.browser ?? globalThis.chrome;
  if (!api?.runtime?.getURL) {
    return;
  }

  const inject = () => {
    if (document.getElementById(scriptId)) {
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = api.runtime.getURL("injected/vaft.js");
    script.async = false;
    (document.head || document.documentElement).appendChild(script);
  };

  const storageSet = (values) =>
    new Promise((resolve) => {
      try {
        const maybePromise = api.storage.local.set(values, () => {
          resolve();
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve).catch(resolve);
        }
      } catch {
        resolve();
      }
    });

  const getEnabled = () =>
    new Promise((resolve) => {
      try {
        const maybePromise = api.storage.local.get({ enabled: true }, (items) => {
          if (api.runtime?.lastError) {
            resolve(true);
            return;
          }
          resolve(items?.enabled !== false);
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise
            .then((items) => resolve(items?.enabled !== false))
            .catch(() => resolve(true));
        }
      } catch {
        resolve(true);
      }
    });

  const runConflictDetection = () =>
    new Promise((resolve) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let settled = false;
      let timeoutId = null;
      const detectorScript = document.createElement("script");

      const finish = (result) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        window.removeEventListener("message", onMessage);
        detectorScript.remove();
        resolve(result);
      };

      const onMessage = (event) => {
        const data = event.data;
        if (
          event.source !== window ||
          !data ||
          data.source !== detectorSource ||
          data.requestId !== requestId
        ) {
          return;
        }

        finish({
          hasConflict: Boolean(data.hasConflict),
          markers: Array.isArray(data.markers) ? data.markers : [],
          checkedAt: Number(data.checkedAt) || Date.now(),
          url: typeof data.url === "string" ? data.url : window.location.href
        });
      };

      window.addEventListener("message", onMessage);
      timeoutId = setTimeout(() => {
        finish({
          hasConflict: false,
          markers: [],
          checkedAt: Date.now(),
          url: window.location.href,
          status: "timeout"
        });
      }, detectorTimeoutMs);

      detectorScript.id = detectorScriptId;
      detectorScript.src = api.runtime.getURL("injected/conflict-detector.js");
      detectorScript.async = false;
      detectorScript.dataset.requestId = requestId;
      (document.head || document.documentElement).appendChild(detectorScript);
    });

  Promise.all([getEnabled(), runConflictDetection()]).then(([enabled, conflictInfo]) => {
    storageSet({ [conflictStorageKey]: conflictInfo });
    if (enabled) {
      inject();
    }
  });
})();
