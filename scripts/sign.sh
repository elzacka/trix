#!/bin/sh
# Signs, notarizes and packs the built app: dist/Trix-macOS.dmg. Apple tools only, so no build code runs while the key is unlocked.
set -eu
cd "$(dirname "$0")/.."
APP=${1:-src-tauri/target/universal-apple-darwin/release/bundle/macos/Trix.app}
DMG=dist/Trix-macOS.dmg
mkdir -p dist

# A Developer ID in the keychain: signed and notarized (notarytool profile «trix»). Without one: ad hoc, as built.
IDENTITY=$(security find-identity -v -p codesigning | sed -n 's/.*"\(Developer ID Application: [^"]*\)".*/\1/p' | head -n 1)
notarize() {
  xcrun notarytool submit "$1" --keychain-profile trix ${NOTARY_KEYCHAIN:+--keychain "$NOTARY_KEYCHAIN"} --wait
}
# Opened from inside the app: a save from an editor would break the signature
chmod a-w "$APP/Contents/Resources/BRUKERVEILEDNING.md"
if [ -n "$IDENTITY" ]; then
  codesign --force --options runtime --timestamp --sign "$IDENTITY" "$APP"
  UPLOAD="${TMPDIR:-/tmp}/trix-notarize.zip"
  ditto -c -k --keepParent "$APP" "$UPLOAD"
  notarize "$UPLOAD"
  # Stapled app: opens offline once copied out of the disk image
  xcrun stapler staple "$APP"
fi

# The disk image shows the app left of a link to Applications (Finder: the user's language), an arrow between them: drag it there
VERSION=$(sed -n 's/^version = "\(.*\)"/\1/p' src-tauri/Cargo.toml | head -n 1)
STAGE=$(mktemp -d)
ditto "$APP" "$STAGE/Trix.app"
ln -s /Applications "$STAGE/Applications"
mkdir "$STAGE/.background"
ditto assets/dmg-background.tiff "$STAGE/.background/background.tiff"
RW="$STAGE.dmg"
hdiutil create -volname "Trix $VERSION" -srcfolder "$STAGE" -fs HFS+ -format UDRW -ov "$RW"
MOUNT=$(hdiutil attach -readwrite -noverify -noautoopen "$RW" | sed -n 's|.*\(/Volumes/.*\)$|\1|p')
# Finder writes the window's layout to .DS_Store in the image. HFS+, the picture on the volume and set last:
# else Finder shows no background on older macOS (Apple DTS, developer.apple.com/forums/thread/836253)
osascript - "$MOUNT" <<'EOF'
on run argv
  tell application "Finder"
    set d to (POSIX file (item 1 of argv)) as alias
    open d
    set w to container window of d
    set current view of w to icon view
    set bounds of w to {200, 120, 800, 520}
    set o to icon view options of w
    set arrangement of o to not arranged
    set icon size of o to 128
    set text size of o to 14
    set position of item "Trix.app" of d to {170, 130}
    set position of item "Applications" of d to {430, 130}
    -- Below the window, where Finder shows hidden files
    try
      set position of item ".background" of d to {300, 500}
    end try
    set background picture of o to file ".background:background.tiff" of d
    update d without registering applications
    delay 2
    close w
  end tell
end run
EOF
# Hidden, but shown where Finder shows hidden files
rm -rf "$MOUNT/.fseventsd"
sync
hdiutil detach "$MOUNT"
hdiutil convert "$RW" -format UDZO -ov -o "$DMG"
if [ -n "$IDENTITY" ]; then
  codesign --timestamp --sign "$IDENTITY" "$DMG"
  notarize "$DMG"
  xcrun stapler staple "$DMG"
fi
ls -lh dist
