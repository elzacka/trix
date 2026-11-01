#!/bin/sh
# Portable macOS build: dist/Trix-Ultra-macOS.zip. Windows: .github/workflows/build.yml
set -eu
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"
npm test
cargo test --manifest-path src-tauri/Cargo.toml --locked --quiet

unset APPLE_SIGNING_IDENTITY
npx tauri build --target universal-apple-darwin --bundles app
scripts/sign.sh
