#!/usr/bin/env bash
set -euo pipefail

TARGET="wasm32-wasip1"

if ! rustup target list --installed | grep -q "^${TARGET}$"; then
  echo "Installing Rust target ${TARGET}..." >&2
  if ! rustup target add "${TARGET}"; then
    cat >&2 <<'EOF'
Failed to install the required Rust target.
If the environment blocks network access, install the target ahead of time or
configure rustup with an offline mirror before running this script.
EOF
    exit 1
  fi
fi

for src in nodes/*.rs; do
  name="$(basename "${src}" .rs)"
  echo "Compiling ${src} -> nodes/${name}.wasm" >&2
  rustc --target "${TARGET}" "${src}" -O -o "nodes/${name}.wasm"
done
