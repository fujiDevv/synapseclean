#!/usr/bin/env bash
# Build a Chrome Web Store zip for the open-source SynapseClean extension.
# No license API / Worker — product is fully client-side.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
NC=$'\033[0m'

die() {
  echo "${RED}error:${NC} $*" >&2
  exit 1
}

info() {
  echo "${GREEN}→${NC} $*"
}

warn() {
  echo "${YELLOW}warn:${NC} $*" >&2
}

VERSION="$(node -p "require('./package.json').version")"
ZIP_NAME="synapseclean-${VERSION}-store.zip"
ZIP_PATH="${ROOT}/${ZIP_NAME}"

info "Version: $VERSION"

if [[ "${PACKAGE_STORE_SKIP_TESTS:-}" == "1" ]]; then
  warn "PACKAGE_STORE_SKIP_TESTS=1 — type-check + build only"
  bun run type-check
  bun run build
else
  info "Running type-check + tests + build…"
  bun run type-check
  bun run test
  bun run build
fi

DIST="${ROOT}/dist"
[[ -d "$DIST" ]] || die "dist/ missing after build"
[[ -f "$DIST/manifest.json" ]] || die "dist/manifest.json missing"

if [[ "${PACKAGE_STORE_RUN_E2E:-}" == "1" ]]; then
  info "PACKAGE_STORE_RUN_E2E=1 — running Playwright e2e…"
  bun run test:e2e
fi

rm -f "$ZIP_PATH"
info "Creating $ZIP_NAME from dist/ …"
(
  cd "$DIST"
  zip -r -q "$ZIP_PATH" . -x "*.DS_Store" -x "**/.DS_Store"
)

[[ -f "$ZIP_PATH" ]] || die "Zip was not created"

SIZE="$(du -h "$ZIP_PATH" | awk '{print $1}')"
info "Done: $ZIP_PATH ($SIZE)"
echo
echo "Next: Chrome Web Store Developer Dashboard → Upload package"
echo "  Privacy policy: https://synapseclean.com/privacy"
echo "  After publish, set CHROME_STORE_LISTING_LIVE in synapseclean-web constants."
