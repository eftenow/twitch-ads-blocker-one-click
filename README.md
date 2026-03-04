# Twitch Ads Blocker (Easy Wrapper)

[![Latest release](https://img.shields.io/github/v/tag/eftenow/twitch-ads-blocker-one-click?label=release&sort=semver)](https://github.com/eftenow/twitch-ads-blocker-one-click/releases/latest)
[![Release build](https://github.com/eftenow/twitch-ads-blocker-one-click/actions/workflows/release.yml/badge.svg)](https://github.com/eftenow/twitch-ads-blocker-one-click/actions/workflows/release.yml)
[![Stars](https://img.shields.io/github/stars/eftenow/twitch-ads-blocker-one-click?style=social)](https://github.com/eftenow/twitch-ads-blocker-one-click/stargazers)

A one-click Twitch ad blocker extension for Chrome, Edge, Brave, Opera, Vivaldi, and Firefox, based on `vaft` from [pixeltris/TwitchAdSolutions](https://github.com/pixeltris/TwitchAdSolutions).

You do **not** need to publish anything to any store to use it.

## For normal users (no store needed)

### 1) Download the latest package (recommended)

- Chrome/Brave/Opera/Vivaldi package:
  - [Download Chrome Package](https://github.com/eftenow/twitch-ads-blocker-one-click/releases/latest/download/twitch-ads-blocker-chrome-latest.zip)
- Edge package:
  - [Download Edge Package](https://github.com/eftenow/twitch-ads-blocker-one-click/releases/latest/download/twitch-ads-blocker-edge-latest.zip)
- Firefox package:
  - [Download Firefox Package](https://github.com/eftenow/twitch-ads-blocker-one-click/releases/latest/download/twitch-ads-blocker-firefox-latest.zip)

If these links do not work yet, use **Code -> Download ZIP** from the repo page.

### 2) Install on Chrome / Edge / Brave / Opera / Vivaldi

1. Unzip the downloaded file.
2. Open extension settings:
   - Chrome/Brave/Opera/Vivaldi: `chrome://extensions`
   - Edge: `edge://extensions`
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the unzipped folder.
6. Open Twitch and test a stream.

### 3) Install on Firefox (without AMO)

1. Unzip the downloaded file.
2. Open: `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**.
4. Select `manifest.json` from the unzipped folder.

Note: Firefox temporary add-ons are removed when Firefox restarts. You need to load it again after restart.

### 4) Use it

1. Open Twitch.
2. Click the extension icon.
3. Keep **Ad Blocking** ON.
4. Keep **Watchdog Recovery** ON (recommended).
5. If stream is stuck, click **Reload Twitch Tab**.
6. If popup shows a conflict warning, disable other Twitch ad blockers.

### 5) Update later

Option A (easy): download the latest package from the links above and reload extension.

Option B (terminal): from project folder run:

```bash
./scripts/update-vaft.sh
```

Then go back to your extensions page and click **Reload** on this extension.

## Troubleshooting (quick)

- Use only one Twitch ad blocker at a time.
- Reload the extension from the browser extensions page.
- Refresh Twitch tab.
- Restart browser if needed.

## Developer-only section

These are for maintainers/publishers, not normal users.

### Automated upstream sync

- Workflow: `.github/workflows/upstream-sync.yml`
- Runs daily at `07:19 UTC`.
- Opens a PR automatically when upstream `vaft` changes.

### Release and package automation

- Release workflow: `.github/workflows/release.yml`
- Store package workflow: `.github/workflows/store-packages.yml`
- Local package script:

```bash
./scripts/package-stores.sh
```

Optional Firefox ID override:

```bash
FIREFOX_EXTENSION_ID="your-addon-id@example.com" ./scripts/package-stores.sh
```

Artifacts are created in `dist/stores/<version>/`.

Full release checklist:

- `docs/store-publish-checklist.md`

## Limitations

- Twitch ad delivery changes often, so breakage can happen without warning.
- Any ad-blocking method may intermittently buffer or freeze depending on current Twitch behavior.
- Watchdog may trigger pause/play or tab reload if playback appears stalled for too long.
- This project cannot guarantee ad-free playback in every stream/browser combination.

## Attribution

Core ad-block logic is from `pixeltris/TwitchAdSolutions` (`vaft`), licensed under MIT.

- upstream repo: <https://github.com/pixeltris/TwitchAdSolutions>
- license copy: `third_party/LICENSE-pixeltris-TwitchAdSolutions.txt`
