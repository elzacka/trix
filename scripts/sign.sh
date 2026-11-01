#!/bin/sh
# Signs, notarizes and zips the built app: dist/Trix-Ultra-macOS.zip. Apple tools only, so no build code runs while the key is unlocked.
set -eu
cd "$(dirname "$0")/.."
APP=${1:-src-tauri/target/universal-apple-darwin/release/bundle/macos/Trix Ultra.app}
mkdir -p dist

# A Developer ID in the keychain: signed and notarized (notarytool profile «trix»). Without one: ad hoc, as built.
IDENTITY=$(security find-identity -v -p codesigning | sed -n 's/.*"\(Developer ID Application: [^"]*\)".*/\1/p' | head -n 1)
if [ -n "$IDENTITY" ]; then
  codesign --force --options runtime --timestamp --sign "$IDENTITY" "$APP"
  UPLOAD="${TMPDIR:-/tmp}/trix-ultra-notarize.zip"
  ditto -c -k --keepParent "$APP" "$UPLOAD"
  xcrun notarytool submit "$UPLOAD" --keychain-profile trix ${NOTARY_KEYCHAIN:+--keychain "$NOTARY_KEYCHAIN"} --wait
  xcrun stapler staple "$APP"
fi
ditto -c -k --keepParent "$APP" dist/Trix-Ultra-macOS.zip
ls -lh dist
