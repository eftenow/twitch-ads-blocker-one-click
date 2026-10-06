(() => {
  const api = globalThis.browser ?? globalThis.chrome;

  const enabledToggle = document.getElementById("enabledToggle");
  const watchdogToggle = document.getElementById("watchdogToggle");
  const stateText = document.getElementById("stateText");
  const engineVersion = document.getElementById("engineVersion");
  const conflictText = document.getElementById("conflictText");
  const watchdogText = document.getElementById("watchdogText");
  const reloadBtn = document.getElementById("reloadBtn");
  const statsMain = document.getElementById("statsMain");
  const statsSub = document.getElementById("statsSub");
  const updateBanner = document.getElementById("updateBanner");
  const updateText = document.getElementById("updateText");
  const updateBtn = document.getElementById("updateBtn");
  const starCard = document.getElementById("starCard");
  const starBtn = document.getElementById("starBtn");
  const starDismissBtn = document.getElementById("starDismissBtn");
  const repoLink = document.getElementById("repoLink");
  const issueLink = document.getElementById("issueLink");
  const extVersion = document.getElementById("extVersion");

  const repoUrl = "https://github.com/eftenow/twitch-ads-blocker-one-click";
  const issuesUrl = `${repoUrl}/issues/new/choose`;
  const releasesUrl = `${repoUrl}/releases/latest`;
  const releasesApiUrl = "https://api.github.com/repos/eftenow/twitch-ads-blocker-one-click/releases/latest";
  const updateCacheMs = 6 * 60 * 60 * 1000;
  const starPromptFirstAt = 3;
  const starPromptSnoozeBreaks = 20;
  const currentVersion = api.runtime.getManifest?.().version || "0.0.0";

  const storageGet = (defaults) =>
    new Promise((resolve, reject) => {
      try {
        const maybePromise = api.storage.local.get(defaults, (result) => {
          if (api.runtime?.lastError) {
            reject(new Error(api.runtime.lastError.message));
            return;
          }
          resolve(result);
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });

  const storageSet = (values) =>
    new Promise((resolve, reject) => {
      try {
        const maybePromise = api.storage.local.set(values, () => {
          if (api.runtime?.lastError) {
            reject(new Error(api.runtime.lastError.message));
            return;
          }
          resolve();
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });

  const queryTabs = (queryInfo) =>
    new Promise((resolve, reject) => {
      try {
        const maybePromise = api.tabs.query(queryInfo, (tabs) => {
          if (api.runtime?.lastError) {
            reject(new Error(api.runtime.lastError.message));
            return;
          }
          resolve(tabs || []);
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });

  const reloadTab = (tabId) =>
    new Promise((resolve, reject) => {
      try {
        const maybePromise = api.tabs.reload(tabId, {}, () => {
          if (api.runtime?.lastError) {
            reject(new Error(api.runtime.lastError.message));
            return;
          }
          resolve();
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });

  const createTab = (createProperties) =>
    new Promise((resolve, reject) => {
      try {
        const maybePromise = api.tabs.create(createProperties, (tab) => {
          if (api.runtime?.lastError) {
            reject(new Error(api.runtime.lastError.message));
            return;
          }
          resolve(tab);
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });

  const updateStateText = (enabled) => {
    stateText.textContent = enabled
      ? "Status: ON (reload stream if already playing)"
      : "Status: OFF";
    stateText.classList.toggle("on", enabled);
    stateText.classList.toggle("off", !enabled);
  };

  const formatCheckedAt = (checkedAt) => {
    if (!checkedAt) {
      return "unknown";
    }
    try {
      return new Date(checkedAt).toLocaleTimeString();
    } catch {
      return "unknown";
    }
  };

  const updateConflictText = (conflictInfo) => {
    conflictText.classList.remove("warn", "ok");

    if (!conflictInfo || !conflictInfo.checkedAt) {
      conflictText.textContent = "Conflict check: open/reload a Twitch tab to run detection.";
      return;
    }

    const markerNames = Array.isArray(conflictInfo.markers)
      ? conflictInfo.markers.map((marker) => marker.name).filter(Boolean)
      : [];

    if (conflictInfo.hasConflict) {
      const details = markerNames.length ? ` (${markerNames.join(", ")})` : "";
      conflictText.textContent = `Conflict check: possible conflict detected${details}. Disable other Twitch blockers and reload.`;
      conflictText.classList.add("warn");
      return;
    }

    conflictText.textContent = `Conflict check: no conflict detected (last check ${formatCheckedAt(conflictInfo.checkedAt)}).`;
    conflictText.classList.add("ok");
  };

  const updateWatchdogText = (watchdogEnabled, watchdogInfo) => {
    watchdogText.classList.remove("warn", "ok");

    if (!watchdogEnabled) {
      watchdogText.textContent = "Watchdog: OFF";
      return;
    }

    if (!watchdogInfo || !watchdogInfo.status) {
      watchdogText.textContent = "Watchdog: waiting for Twitch tab data...";
      return;
    }

    const statusMap = {
      starting: "starting",
      warming_up: "warming up",
      waiting_for_video: "waiting for stream video",
      monitoring: "monitoring stream health",
      idle: "idle",
      recovering: "recovering playback",
      reloading_tab: "reloading tab for recovery",
      disabled_by_extension: "disabled because ad blocking is OFF",
      disabled_by_user: "disabled by user"
    };
    const status = statusMap[watchdogInfo.status] || watchdogInfo.status;

    if (watchdogInfo.lastRecoveryAt && watchdogInfo.lastRecoveryAction) {
      const when = formatCheckedAt(watchdogInfo.lastRecoveryAt);
      watchdogText.textContent = `Watchdog: ${status}. Last recovery ${when} via ${watchdogInfo.lastRecoveryAction}.`;
      watchdogText.classList.add("warn");
      return;
    }

    watchdogText.textContent = `Watchdog: ${status}.`;
    watchdogText.classList.add("ok");
  };

  const formatDuration = (ms) => {
    const totalSeconds = Math.round((Number(ms) || 0) / 1000);
    if (totalSeconds < 60) {
      return `${totalSeconds} sec`;
    }
    const totalMinutes = Math.round(totalSeconds / 60);
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
  };

  const formatDate = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const updateStatsText = (stats) => {
    const adBreaks = Number(stats?.adBreaksBlocked) || 0;
    if (!adBreaks) {
      statsMain.textContent = "No ads blocked yet";
      statsSub.textContent = "Blocked ad breaks will show up here.";
      return;
    }
    statsMain.textContent = `${adBreaks} ad ${adBreaks === 1 ? "break" : "breaks"} blocked`;
    const since = stats.firstBlockedAt ? ` since ${formatDate(stats.firstBlockedAt)}` : "";
    statsSub.textContent = `~${formatDuration(stats.blockedMs)} of ads skipped${since}`;
  };

  const updateStarCard = (stats, starPrompt) => {
    const adBreaks = Number(stats?.adBreaksBlocked) || 0;
    const nextAt = Number(starPrompt?.nextAt) || starPromptFirstAt;
    starCard.hidden = Boolean(starPrompt?.done) || adBreaks < nextAt;
  };

  const parseVersion = (version) =>
    String(version || "")
      .replace(/^v/i, "")
      .split(".")
      .map((part) => parseInt(part, 10) || 0);

  const isNewerVersion = (candidate, current) => {
    const a = parseVersion(candidate);
    const b = parseVersion(current);
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      const diff = (a[i] || 0) - (b[i] || 0);
      if (diff !== 0) {
        return diff > 0;
      }
    }
    return false;
  };

  const checkForUpdate = async () => {
    const { updateCheck } = await storageGet({ updateCheck: null });
    let latest = updateCheck;
    if (!latest?.version || Date.now() - (Number(latest.checkedAt) || 0) > updateCacheMs) {
      const response = await fetch(releasesApiUrl, {
        headers: { Accept: "application/vnd.github+json" }
      });
      if (!response.ok) {
        throw new Error("release request failed");
      }
      const release = await response.json();
      latest = {
        checkedAt: Date.now(),
        version: release.tag_name,
        url: release.html_url || releasesUrl
      };
      await storageSet({ updateCheck: latest });
    }
    if (!isNewerVersion(latest.version, currentVersion)) {
      updateBanner.hidden = true;
      return;
    }
    updateText.textContent = `Update available: ${latest.version}`;
    updateBanner.dataset.url = latest.url || releasesUrl;
    updateBanner.hidden = false;
  };

  const openUrl = async (url) => {
    try {
      await createTab({ url });
      window.close();
    } catch {}
  };

  const loadEngineVersion = async () => {
    try {
      const response = await fetch(api.runtime.getURL("injected/upstream.txt"));
      if (!response.ok) {
        throw new Error("metadata request failed");
      }
      const content = await response.text();
      const versionLine = content
        .split("\n")
        .find((line) => line.startsWith("version="));
      const version = versionLine ? versionLine.split("=")[1] : "unknown";
      engineVersion.textContent = `Engine version: ${version}`;
    } catch {
      engineVersion.textContent = "Engine version: unknown";
    }
  };

  const handleReloadClick = async () => {
    try {
      const activeTabs = await queryTabs({ active: true, currentWindow: true });
      const activeTab = activeTabs[0];
      if (activeTab?.id && activeTab.url?.includes("twitch.tv")) {
        await reloadTab(activeTab.id);
        window.close();
        return;
      }

      const twitchTabs = await queryTabs({ url: ["*://*.twitch.tv/*"] });
      const targetTab = twitchTabs[0];
      if (targetTab?.id) {
        await reloadTab(targetTab.id);
        window.close();
        return;
      }

      await createTab({ url: "https://www.twitch.tv" });
      window.close();
    } catch {
      // Keep popup usable even when browser API calls fail.
    }
  };

  const init = async () => {
    const current = await storageGet({
      enabled: true,
      watchdogEnabled: true,
      conflictInfo: null,
      watchdogInfo: null,
      stats: null,
      starPrompt: null
    });
    const enabled = current.enabled !== false;
    const watchdogEnabled = current.watchdogEnabled !== false;
    enabledToggle.checked = enabled;
    watchdogToggle.checked = watchdogEnabled;
    updateStateText(enabled);
    updateConflictText(current.conflictInfo);
    updateWatchdogText(watchdogEnabled, current.watchdogInfo);
    updateStatsText(current.stats);
    updateStarCard(current.stats, current.starPrompt);
    await loadEngineVersion();
  };

  enabledToggle.addEventListener("change", async () => {
    const enabled = enabledToggle.checked;
    updateStateText(enabled);
    try {
      await storageSet({ enabled });
    } catch {
      updateStateText(true);
      enabledToggle.checked = true;
    }
  });

  watchdogToggle.addEventListener("change", async () => {
    const watchdogEnabled = watchdogToggle.checked;
    updateWatchdogText(watchdogEnabled, null);
    try {
      await storageSet({ watchdogEnabled });
    } catch {
      watchdogToggle.checked = true;
      updateWatchdogText(true, null);
    }
  });

  reloadBtn.addEventListener("click", handleReloadClick);

  starBtn.addEventListener("click", async () => {
    try {
      await storageSet({ starPrompt: { done: true } });
    } catch {}
    await openUrl(repoUrl);
  });

  starDismissBtn.addEventListener("click", async () => {
    starCard.hidden = true;
    try {
      const { stats } = await storageGet({ stats: null });
      const adBreaks = Number(stats?.adBreaksBlocked) || 0;
      await storageSet({ starPrompt: { done: false, nextAt: adBreaks + starPromptSnoozeBreaks } });
    } catch {}
  });

  updateBtn.addEventListener("click", () => openUrl(updateBanner.dataset.url || releasesUrl));
  repoLink.addEventListener("click", () => openUrl(repoUrl));
  issueLink.addEventListener("click", () => openUrl(issuesUrl));
  extVersion.textContent = `v${currentVersion}`;

  if (api.storage?.onChanged?.addListener) {
    api.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes.stats) {
        return;
      }
      updateStatsText(changes.stats.newValue);
    });
  }

  checkForUpdate().catch(() => {
    updateBanner.hidden = true;
  });

  init().catch(() => {
    enabledToggle.checked = true;
    updateStateText(true);
    engineVersion.textContent = "Engine version: unknown";
    updateConflictText(null);
    watchdogToggle.checked = true;
    updateWatchdogText(true, null);
  });
})();
