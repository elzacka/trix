#!/bin/sh
# Portable macOS build: dist/Trix-macOS.zip. Windows: .github/workflows/build.yml
set -eu
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"
npm test
mkdir -p dist

npx tauri build --target universal-apple-darwin --bundles app
ditto -c -k --keepParent src-tauri/target/universal-apple-darwin/release/bundle/macos/"Trix Universal.app" dist/Trix-macOS.zip
ls -lh dist
