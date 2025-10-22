# Graph Runtime PoC

This repository prototypes an AI-first graph runtime that executes WebAssembly nodes produced from Rust sources.

## WebAssembly artifacts

The compiled `nodes/*.wasm` binaries are **not** committed. Regenerate them whenever you need to run the graph:

```bash
./scripts/build-wasm.sh
```

The helper script compiles each `nodes/*.rs` file for the `wasm32-wasip1` target and places the outputs alongside the sources. Keep the resulting `.wasm` files untracked—only the Rust sources and build script live in git.
