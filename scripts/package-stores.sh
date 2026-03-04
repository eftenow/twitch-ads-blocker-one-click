#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="$ROOT_DIR/extension"
DIST_BASE="$ROOT_DIR/dist/stores"

MANIFEST_PATH="$EXT_DIR/manifest.json"
VERSION="$(node -e 'const fs=require("fs");const p=process.argv[1];const m=JSON.parse(fs.readFileSync(p,"utf8"));if(!m.version){process.exit(2)};process.stdout.write(String(m.version));' "$MANIFEST_PATH" 2>/dev/null)"

if [[ -z "$VERSION" ]]; then
  echo "Could not read version from $MANIFEST_PATH"
  exit 1
fi

FIREFOX_EXTENSION_ID="${FIREFOX_EXTENSION_ID:-twitch-ads-blocker-one-click@eftenow.github.io}"
FIREFOX_MIN_VERSION="${FIREFOX_MIN_VERSION:-109.0}"

RELEASE_DIR="$DIST_BASE/$VERSION"
WORK_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$RELEASE_DIR"
rm -f "$RELEASE_DIR"/*.zip "$RELEASE_DIR"/SHA256SUMS.txt

copy_extension() {
  local target_dir="$1"
  mkdir -p "$target_dir/extension"
  cp -R "$EXT_DIR"/. "$target_dir/extension"
  find "$target_dir" -name '.DS_Store' -delete
}

build_zip() {
  local source_dir="$1"
  local out_path="$2"
  (
    cd "$source_dir"
    zip -r "$out_path" . -x '*.DS_Store' >/dev/null
  )
}

# Chrome package
CHROME_DIR="$WORK_DIR/chrome"
copy_extension "$CHROME_DIR"
CHROME_ZIP="$RELEASE_DIR/twitch-ads-blocker-chrome-v$VERSION.zip"
CHROME_ZIP_LATEST="$RELEASE_DIR/twitch-ads-blocker-chrome-latest.zip"
build_zip "$CHROME_DIR/extension" "$CHROME_ZIP"
cp "$CHROME_ZIP" "$CHROME_ZIP_LATEST"

# Edge package (same extension contents, separate artifact for store upload)
EDGE_DIR="$WORK_DIR/edge"
copy_extension "$EDGE_DIR"
EDGE_ZIP="$RELEASE_DIR/twitch-ads-blocker-edge-v$VERSION.zip"
EDGE_ZIP_LATEST="$RELEASE_DIR/twitch-ads-blocker-edge-latest.zip"
build_zip "$EDGE_DIR/extension" "$EDGE_ZIP"
cp "$EDGE_ZIP" "$EDGE_ZIP_LATEST"

# Firefox package (adds browser_specific_settings.gecko.id)
FIREFOX_DIR="$WORK_DIR/firefox"
copy_extension "$FIREFOX_DIR"
node - "$FIREFOX_DIR/extension/manifest.json" "$FIREFOX_EXTENSION_ID" "$FIREFOX_MIN_VERSION" <<'NODE'
const fs = require('fs');
const manifestPath = process.argv[2];
const geckoId = process.argv[3];
const minVersion = process.argv[4];

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.browser_specific_settings = {
  ...(manifest.browser_specific_settings || {}),
  gecko: {
    ...(manifest.browser_specific_settings?.gecko || {}),
    id: geckoId,
    strict_min_version: minVersion
  }
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
NODE
FIREFOX_ZIP="$RELEASE_DIR/twitch-ads-blocker-firefox-v$VERSION.zip"
FIREFOX_ZIP_LATEST="$RELEASE_DIR/twitch-ads-blocker-firefox-latest.zip"
build_zip "$FIREFOX_DIR/extension" "$FIREFOX_ZIP"
cp "$FIREFOX_ZIP" "$FIREFOX_ZIP_LATEST"

# Checksums for release integrity
(
  cd "$RELEASE_DIR"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 *.zip > SHA256SUMS.txt
  else
    sha256sum *.zip > SHA256SUMS.txt
  fi
)

echo "Built store packages in: $RELEASE_DIR"
echo "- $(basename "$CHROME_ZIP")"
echo "- $(basename "$CHROME_ZIP_LATEST")"
echo "- $(basename "$EDGE_ZIP")"
echo "- $(basename "$EDGE_ZIP_LATEST")"
echo "- $(basename "$FIREFOX_ZIP")"
echo "- $(basename "$FIREFOX_ZIP_LATEST")"
echo "- SHA256SUMS.txt"
echo "Firefox extension ID used: $FIREFOX_EXTENSION_ID"
