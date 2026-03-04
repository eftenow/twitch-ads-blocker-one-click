(() => {
  const api = globalThis.browser ?? globalThis.chrome;

  const enabledToggle = document.getElementById("enabledToggle");
  const stateText = document.getElementById("stateText");
  const engineVersion = document.getElementById("engineVersion");
  const conflictText = document.getElementById("conflictText");
  const reloadBtn = document.getElementById("reloadBtn");

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
    const current = await storageGet({ enabled: true, conflictInfo: null });
    const enabled = current.enabled !== false;
    enabledToggle.checked = enabled;
    updateStateText(enabled);
    updateConflictText(current.conflictInfo);
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

  reloadBtn.addEventListener("click", handleReloadClick);

  init().catch(() => {
    enabledToggle.checked = true;
    updateStateText(true);
    engineVersion.textContent = "Engine version: unknown";
    updateConflictText(null);
  });
})();
