(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  if (!api?.storage?.local) {
    return;
  }

  const statsKey = "stats";
  const pollIntervalMs = 1000;
  const maxBreakMs = 10 * 60 * 1000;
  const emptyStats = {
    adBreaksBlocked: 0,
    blockedMs: 0,
    firstBlockedAt: 0,
    lastBlockedAt: 0
  };

  let breakStartedAt = 0;
  let writeQueue = Promise.resolve();

  const storageGet = (defaults) =>
    new Promise((resolve) => {
      try {
        const maybePromise = api.storage.local.get(defaults, (items) => {
          if (api.runtime?.lastError) {
            resolve(defaults);
            return;
          }
          resolve(items || defaults);
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve).catch(() => resolve(defaults));
        }
      } catch {
        resolve(defaults);
      }
    });

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

  const updateStats = (mutate) => {
    writeQueue = writeQueue.then(async () => {
      const current = await storageGet({ [statsKey]: emptyStats });
      const stats = { ...emptyStats, ...(current?.[statsKey] || {}) };
      mutate(stats);
      await storageSet({ [statsKey]: stats });
    });
    return writeQueue;
  };

  const isOverlayVisible = () => {
    const overlay = document.querySelector(".video-player .adblock-overlay");
    return Boolean(overlay) && overlay.style.display !== "none";
  };

  const startBreak = () => {
    breakStartedAt = Date.now();
    const startedAt = breakStartedAt;
    updateStats((stats) => {
      stats.adBreaksBlocked += 1;
      stats.firstBlockedAt = stats.firstBlockedAt || startedAt;
      stats.lastBlockedAt = startedAt;
    });
  };

  const endBreak = () => {
    const durationMs = Math.min(Date.now() - breakStartedAt, maxBreakMs);
    breakStartedAt = 0;
    updateStats((stats) => {
      stats.blockedMs += durationMs;
    });
  };

  setInterval(() => {
    const visible = isOverlayVisible();
    if (visible && !breakStartedAt) {
      startBreak();
    } else if (!visible && breakStartedAt) {
      endBreak();
    }
  }, pollIntervalMs);

  window.addEventListener("pagehide", () => {
    if (breakStartedAt) {
      endBreak();
    }
  });
})();
