# Store Publish Checklist

Use this checklist for each release.

## 1) Prepare artifacts

1. Update upstream bundle if needed:
   ```bash
   ./scripts/update-vaft.sh
   ```
2. Build store packages:
   ```bash
   ./scripts/package-stores.sh
   ```
   Or trigger `.github/workflows/store-packages.yml` from GitHub Actions.
3. Optional: set a custom Firefox add-on ID before packaging:
   ```bash
   FIREFOX_EXTENSION_ID="your-addon-id@example.com" ./scripts/package-stores.sh
   ```
4. Confirm outputs exist in `dist/stores/<version>/`:
   - `twitch-ads-blocker-chrome-v<version>.zip`
   - `twitch-ads-blocker-chrome-latest.zip`
   - `twitch-ads-blocker-edge-v<version>.zip`
   - `twitch-ads-blocker-edge-latest.zip`
   - `twitch-ads-blocker-firefox-v<version>.zip`
   - `twitch-ads-blocker-firefox-latest.zip`
   - `SHA256SUMS.txt`

## 2) Chrome Web Store

1. Open Chrome Web Store Developer Dashboard.
2. Create new item (or update existing item).
3. Upload `twitch-ads-blocker-chrome-v<version>.zip`.
4. Verify permissions shown are expected: `storage`, `tabs`.
5. Update release notes.
6. Submit for review.

## 3) Microsoft Edge Add-ons

1. Open Microsoft Partner Center (Edge Add-ons).
2. Create new submission/version.
3. Upload `twitch-ads-blocker-edge-v<version>.zip`.
4. Verify listing metadata and release notes.
5. Submit for review.

## 4) Firefox Add-ons (AMO)

1. Open AMO Developer Hub.
2. Create new version upload.
3. Upload `twitch-ads-blocker-firefox-v<version>.zip`.
4. Confirm the add-on ID matches expected value in manifest (`browser_specific_settings.gecko.id`).
5. Update release notes.
6. Submit for review.

## 5) Post-submit checks

1. Verify all store submissions show the same extension version.
2. Verify release notes are consistent across stores.
3. Tag release in GitHub and attach zipped artifacts from `dist/stores/<version>/`.
   - Or use `.github/workflows/release.yml` with tag `v<manifest-version>`.
4. Test installed store versions on a real Twitch stream.
