# AI-First Graph Runtime Prototype

This repository is a minimal sandbox where Codex fabricates a graph-driven runtime from scratch. The runtime consumes a declarative graph description (`graph.json`), resolves execution order via topological sorting, and executes WebAssembly nodes that exchange simple integer payloads.

## Layout

```
src/runtime.ts        # TypeScript runtime orchestrator
nodes/*.rs            # Rust sources for the WebAssembly nodes
nodes/*.wasm          # Generated WASM artifacts (gitignored)
graph.json            # Graph definition with dependencies and WASM paths
scripts/build-wasm.sh # Helper script that recompiles the node binaries
```

Each WASM binary is produced directly from the adjacent Rust source using `rustc --target wasm32-wasip1`. The artifacts are intentionally tiny, expose a `main` function that accepts a single `i32` input and returns an `i32` output, and are treated purely as build outputs (they are not committed to the repository).

* `fetchUser.{rs,wasm}` – ignores input and yields a fixed user identifier (`1001`).
* `calcDiscount.{rs,wasm}` – derives a pseudo-discount from the upstream identifier.
* `renderProfile.{rs,wasm}` – doubles the discount as the final presentation metric.

The TypeScript runtime loads these modules, executes them in dependency order, and assembles a human-readable report.

### Rebuilding the WASM nodes

Regenerate the `.wasm` blobs whenever you need to execute the graph by running:

```bash
./scripts/build-wasm.sh
```

The helper script ensures the `wasm32-wasip1` target is available (installing it if necessary) and then recompiles every `nodes/*.rs` file in release mode. Because the outputs are gitignored, rebuild them after cloning. If the host environment does not allow downloads, install the target ahead of time or provide an offline `rustup` mirror before invoking the script.
