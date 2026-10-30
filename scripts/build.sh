#!/bin/sh
# Portable macOS build: dist/Trix-macOS.zip. Windows: .github/workflows/build.yml
set -eu
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"
npm test
mkdir -p dist

# A Developer ID in the keychain: signed and notarized (notarytool profile «trix»). Without one, as in CI: ad hoc.
IDENTITY=$(security find-identity -v -p codesigning | sed -n 's/.*"\(Developer ID Application: [^"]*\)".*/\1/p' | head -n 1)
[ -n "$IDENTITY" ] && export APPLE_SIGNING_IDENTITY="$IDENTITY"

npx tauri build --target universal-apple-darwin --bundles app
APP=src-tauri/target/universal-apple-darwin/release/bundle/macos/Trix.app
if [ -n "$IDENTITY" ]; then
  UPLOAD="${TMPDIR:-/tmp}/trix-notarize.zip"
  ditto -c -k --keepParent "$APP" "$UPLOAD"
  xcrun notarytool submit "$UPLOAD" --keychain-profile trix --wait
  xcrun stapler staple "$APP"
fi
ditto -c -k --keepParent "$APP" dist/Trix-macOS.zip
ls -lh dist
