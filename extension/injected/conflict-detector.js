(() => {
  const currentScript = document.currentScript;
  const requestId = currentScript?.dataset?.requestId || "";
  const source = "twitchadsblocker-conflict-detector";
  const ownScriptPresent = Boolean(document.getElementById("twitchadsblocker-vaft"));
  const markers = [];

  const addMarker = (name, details) => {
    markers.push({ name, details });
  };

  try {
    if (!ownScriptPresent && typeof window.twitchAdSolutionsVersion !== "undefined") {
      addMarker(
        "twitchAdSolutionsVersion",
        `window.twitchAdSolutionsVersion=${String(window.twitchAdSolutionsVersion)}`
      );
    }
  } catch {
    // Ignore access edge cases.
  }

  try {
    const workerString = Function.prototype.toString.call(window.Worker);
    const workerLooksPatched = !workerString.includes("[native code]");
    if (!ownScriptPresent && workerLooksPatched) {
      addMarker(
        "workerPatched",
        workerString.slice(0, 140)
      );
    }
  } catch {
    // Ignore if Worker cannot be inspected.
  }

  try {
    if (document.querySelector('[data-a-target="video-ad-label"]')) {
      addMarker("adLabelVisible", "Twitch ad label present in DOM");
    }
  } catch {
    // Ignore DOM query failures.
  }

  const payload = {
    source,
    requestId,
    hasConflict: markers.length > 0,
    markers,
    checkedAt: Date.now(),
    url: window.location.href
  };

  window.postMessage(payload, "*");
})();
