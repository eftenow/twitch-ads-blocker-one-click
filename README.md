<p align="center"><img src="extension/icons/icon-128.png" width="96" alt="NoBreak icon"></p>

<h1 align="center">NoBreak — Ad-free Twitch</h1>

[![Latest release](https://img.shields.io/github/v/tag/eftenow/twitch-ads-blocker-one-click?label=release&sort=semver)](https://github.com/eftenow/twitch-ads-blocker-one-click/releases/latest)
[![Release build](https://github.com/eftenow/twitch-ads-blocker-one-click/actions/workflows/release.yml/badge.svg)](https://github.com/eftenow/twitch-ads-blocker-one-click/actions/workflows/release.yml)
[![Last update](https://img.shields.io/github/release-date/eftenow/twitch-ads-blocker-one-click?label=last%20update)](https://github.com/eftenow/twitch-ads-blocker-one-click/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/eftenow/twitch-ads-blocker-one-click/total?label=downloads)](https://github.com/eftenow/twitch-ads-blocker-one-click/releases)
[![Stars](https://img.shields.io/github/stars/eftenow/twitch-ads-blocker-one-click?style=social)](https://github.com/eftenow/twitch-ads-blocker-one-click/stargazers)

A one-click Twitch ad blocker extension for Chrome, Edge, Brave, Opera, Vivaldi, and Firefox, based on `vaft` from [pixeltris/TwitchAdSolutions](https://github.com/pixeltris/TwitchAdSolutions).

You do **not** need to publish anything to any store to use it.

## For normal users (no store needed)

### 1) Download the latest package (recommended)

- Chrome/Brave/Opera/Vivaldi package:
  - [Download Chrome Package](https://github.com/eftenow/twitch-ads-blocker-one-click/releases/latest/download/twitch-ads-blocker-chrome-latest.zip)
- Edge package:
  - [Download Edge Package](https://github.com/eftenow/twitch-ads-blocker-one-click/releases/latest/download/twitch-ads-blocker-edge-latest.zip)
- Firefox (signed, installs permanently and auto-updates):
  - [Install for Firefox](https://github.com/eftenow/twitch-ads-blocker-one-click/releases/latest/download/twitch-ads-blocker-firefox-latest.xpi)

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

### 3) Install on Firefox

1. Click the **Install for Firefox** link above.
2. Firefox asks for permission to install the add-on. Click **Continue to Installation**, then **Add**.

That's it. The add-on is signed by Mozilla, stays installed after restarts and updates itself.
Requires Firefox 140 or newer.

### 4) Use it

1. Open Twitch.
2. Click the extension icon.
3. Keep **Ad Blocking** ON.
4. Keep **Watchdog Recovery** ON (recommended).
5. If stream is stuck, click **Reload Twitch Tab**.
6. If popup shows a conflict warning, disable other Twitch ad blockers.

### 5) Update later

- **Firefox:** updates automatically.
- **Chrome / Edge / Brave / Opera / Vivaldi:** the popup shows **Update available** when a new version is out. Download the new package, replace the old folder and click **Reload** on the extensions page.

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
- Opens a PR only when upstream `vaft.js` changes, with the patch version already bumped.
- Merging that PR publishes the release automatically (`.github/workflows/auto-release.yml` releases any manifest version on `main` that has no release yet).

### Release and package automation

- Release workflow: `.github/workflows/release.yml`
- Firefox signing (unlisted AMO channel): `./scripts/sign-firefox.sh`, needs repo secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`. Without them the release is published without the `.xpi`.
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
