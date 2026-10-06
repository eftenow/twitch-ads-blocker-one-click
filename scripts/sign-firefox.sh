#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST_PATH="$ROOT_DIR/extension/manifest.json"
VERSION="$(node -e 'const fs=require("fs");process.stdout.write(String(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).version||""));' "$MANIFEST_PATH")"
RELEASE_DIR="$ROOT_DIR/dist/stores/$VERSION"
FIREFOX_ZIP="$RELEASE_DIR/twitch-ads-blocker-firefox-v$VERSION.zip"
REPO="${GITHUB_REPOSITORY:-eftenow/twitch-ads-blocker-one-click}"
WEB_EXT_VERSION="${WEB_EXT_VERSION:-10}"

: "${AMO_JWT_ISSUER:?AMO_JWT_ISSUER is required}"
: "${AMO_JWT_SECRET:?AMO_JWT_SECRET is required}"

if [[ ! -f "$FIREFOX_ZIP" ]]; then
  echo "Missing $FIREFOX_ZIP. Run ./scripts/package-stores.sh first."
  exit 1
fi

WORK_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

unzip -q "$FIREFOX_ZIP" -d "$WORK_DIR/src"

npx --yes "web-ext@$WEB_EXT_VERSION" sign \
  --channel unlisted \
  --source-dir "$WORK_DIR/src" \
  --artifacts-dir "$WORK_DIR/signed" \
  --api-key "$AMO_JWT_ISSUER" \
  --api-secret "$AMO_JWT_SECRET"

SIGNED_XPI="$(find "$WORK_DIR/signed" -name '*.xpi' | head -n 1)"
if [[ -z "$SIGNED_XPI" ]]; then
  echo "Signing finished without producing an .xpi"
  exit 1
fi

XPI_NAME="twitch-ads-blocker-firefox-v$VERSION.xpi"
cp "$SIGNED_XPI" "$RELEASE_DIR/$XPI_NAME"
cp "$SIGNED_XPI" "$RELEASE_DIR/twitch-ads-blocker-firefox-latest.xpi"

node - "$WORK_DIR/src/manifest.json" "$VERSION" "https://github.com/$REPO/releases/download/v$VERSION/$XPI_NAME" "$RELEASE_DIR/updates.json" <<'NODE'
const fs = require('fs');
const [manifestPath, version, updateLink, outPath] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const geckoId = manifest.browser_specific_settings.gecko.id;
const updates = {
  addons: {
    [geckoId]: {
      updates: [{ version, update_link: updateLink }]
    }
  }
};
fs.writeFileSync(outPath, JSON.stringify(updates, null, 2) + '\n', 'utf8');
NODE

(
  cd "$RELEASE_DIR"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 *.zip *.xpi > SHA256SUMS.txt
  else
    sha256sum *.zip *.xpi > SHA256SUMS.txt
  fi
)

echo "Signed Firefox package: $RELEASE_DIR/$XPI_NAME"
echo "Firefox update manifest: $RELEASE_DIR/updates.json"
