#!/bin/sh
# Signs, notarizes and packs the built app: dist/Trix-Ultra-macOS.dmg. Apple tools only, so no build code runs while the key is unlocked.
set -eu
cd "$(dirname "$0")/.."
APP=${1:-src-tauri/target/universal-apple-darwin/release/bundle/macos/Trix Ultra.app}
DMG=dist/Trix-Ultra-macOS.dmg
mkdir -p dist

# A Developer ID in the keychain: signed and notarized (notarytool profile «trix»). Without one: ad hoc, as built.
IDENTITY=$(security find-identity -v -p codesigning | sed -n 's/.*"\(Developer ID Application: [^"]*\)".*/\1/p' | head -n 1)
notarize() {
  xcrun notarytool submit "$1" --keychain-profile trix ${NOTARY_KEYCHAIN:+--keychain "$NOTARY_KEYCHAIN"} --wait
}
if [ -n "$IDENTITY" ]; then
  codesign --force --options runtime --timestamp --sign "$IDENTITY" "$APP"
  UPLOAD="${TMPDIR:-/tmp}/trix-ultra-notarize.zip"
  ditto -c -k --keepParent "$APP" "$UPLOAD"
  notarize "$UPLOAD"
  # Stapled app: opens offline once copied out of the disk image
  xcrun stapler staple "$APP"
fi

# The disk image shows the app beside a link to Applications (Finder: the user's language), to drag it there
STAGE=$(mktemp -d)
ditto "$APP" "$STAGE/Trix Ultra.app"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname "Trix Ultra" -srcfolder "$STAGE" -format UDZO -ov "$DMG"
if [ -n "$IDENTITY" ]; then
  codesign --timestamp --sign "$IDENTITY" "$DMG"
  notarize "$DMG"
  xcrun stapler staple "$DMG"
fi
ls -lh dist
