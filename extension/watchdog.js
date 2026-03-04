(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  if (!api?.storage?.local) {
    return;
  }

  const watchdogInfoKey = "watchdogInfo";
  const checkIntervalMs = 2000;
  const stallThresholdMs = 15000;
  const cooldownMs = 120000;
  const preflightMs = 20000;
  const pausePlayDelayMs = 250;

  let extensionEnabled = true;
  let watchdogEnabled = true;
  let initialized = false;
  let activeVideo = null;
  let lastCurrentTime = null;
  let lastProgressAt = Date.now();
  let lastRecoveryAt = 0;
  let recoveryCount = 0;
  let recoveryInProgress = false;
  let lastPublishedSignature = "";
  let currentInfo = {
    status: "starting",
    lastUpdated: Date.now(),
    recoveryCount: 0,
    url: window.location.href
  };

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

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const shouldWatch = () => extensionEnabled && watchdogEnabled;

  const publishInfo = (update, force) => {
    const nextInfoWithoutTimestamp = {
      ...currentInfo,
      ...update,
      url: window.location.href,
      watchdogEnabled,
      extensionEnabled
    };
    const signature = JSON.stringify(nextInfoWithoutTimestamp);
    if (!force && signature === lastPublishedSignature) {
      return;
    }
    lastPublishedSignature = signature;
    currentInfo = {
      ...nextInfoWithoutTimestamp,
      lastUpdated: Date.now()
    };
    storageSet({ [watchdogInfoKey]: currentInfo });
  };

  const describeStatus = () => {
    if (!extensionEnabled) {
      return "disabled_by_extension";
    }
    if (!watchdogEnabled) {
      return "disabled_by_user";
    }
    return "waiting_for_video";
  };

  const resetTrackingForVideo = (video) => {
    activeVideo = video;
    lastCurrentTime = Number(video?.currentTime) || 0;
    lastProgressAt = Date.now();
  };

  const pickVideo = () => {
    const videos = Array.from(document.querySelectorAll("video"));
    if (!videos.length) {
      return null;
    }
    videos.sort((a, b) => {
      const aArea = (a.clientWidth || 0) * (a.clientHeight || 0);
      const bArea = (b.clientWidth || 0) * (b.clientHeight || 0);
      return bArea - aArea;
    });
    return videos[0] || null;
  };

  const markMonitoring = () => {
    publishInfo({
      status: "monitoring",
      recoveryCount,
      stallMs: 0
    });
  };

  const recoverPlayback = async (stallMs) => {
    if (recoveryInProgress) {
      return;
    }
    recoveryInProgress = true;
    recoveryCount += 1;
    lastRecoveryAt = Date.now();

    if (recoveryCount === 1) {
      publishInfo({
        status: "recovering",
        recoveryCount,
        stallMs,
        lastRecoveryAt,
        lastRecoveryAction: "pause_play",
        lastRecoveryReason: `stalled_${Math.round(stallMs / 1000)}s`
      });
      try {
        activeVideo?.pause();
      } catch {
        // Ignore player pause errors.
      }
      await sleep(pausePlayDelayMs);
      try {
        const maybePromise = activeVideo?.play?.();
        if (maybePromise && typeof maybePromise.catch === "function") {
          maybePromise.catch(() => {});
        }
      } catch {
        // Ignore player play errors.
      }
      lastProgressAt = Date.now();
      markMonitoring();
      recoveryInProgress = false;
      return;
    }

    publishInfo({
      status: "reloading_tab",
      recoveryCount,
      stallMs,
      lastRecoveryAt,
      lastRecoveryAction: "tab_reload",
      lastRecoveryReason: `stalled_${Math.round(stallMs / 1000)}s`
    });
    await sleep(50);
    window.location.reload();
  };

  const tick = async () => {
    if (!initialized) {
      return;
    }

    if (!shouldWatch()) {
      publishInfo({ status: describeStatus(), recoveryCount, stallMs: 0 });
      return;
    }

    const pageStart = Number(performance?.timeOrigin) || Date.now();
    if (Date.now() - pageStart < preflightMs) {
      publishInfo({ status: "warming_up", recoveryCount, stallMs: 0 });
      return;
    }

    const video = pickVideo();
    if (!video) {
      activeVideo = null;
      lastCurrentTime = null;
      publishInfo({ status: "waiting_for_video", recoveryCount, stallMs: 0 });
      return;
    }

    if (video !== activeVideo) {
      resetTrackingForVideo(video);
      markMonitoring();
      return;
    }

    if (video.paused || video.ended || video.readyState < 2) {
      lastProgressAt = Date.now();
      lastCurrentTime = Number(video.currentTime) || 0;
      publishInfo({ status: "idle", recoveryCount, stallMs: 0 });
      return;
    }

    const currentTime = Number(video.currentTime) || 0;
    if (lastCurrentTime === null || currentTime > lastCurrentTime + 0.01) {
      lastCurrentTime = currentTime;
      lastProgressAt = Date.now();
      markMonitoring();
      return;
    }

    const stallMs = Date.now() - lastProgressAt;
    const stallForInfo = stallMs >= stallThresholdMs ? stallThresholdMs : 0;
    publishInfo({ status: "monitoring", recoveryCount, stallMs: stallForInfo });
    if (stallMs < stallThresholdMs) {
      return;
    }
    if (Date.now() - lastRecoveryAt < cooldownMs) {
      return;
    }

    await recoverPlayback(stallMs);
  };

  const initialize = async () => {
    const state = await storageGet({ enabled: true, watchdogEnabled: true });
    extensionEnabled = state.enabled !== false;
    watchdogEnabled = state.watchdogEnabled !== false;
    initialized = true;
    publishInfo({ status: describeStatus(), recoveryCount, stallMs: 0 }, true);
  };

  initialize();
  setInterval(() => {
    tick();
  }, checkIntervalMs);

  if (api.storage?.onChanged?.addListener) {
    api.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(changes, "enabled")) {
        extensionEnabled = changes.enabled.newValue !== false;
      }
      if (Object.prototype.hasOwnProperty.call(changes, "watchdogEnabled")) {
        watchdogEnabled = changes.watchdogEnabled.newValue !== false;
      }
    });
  }
})();
