import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

interface NodeSpec {
  id: string;
  wasm: string;
  dependsOn?: string[];
}

interface GraphSpec {
  nodes: NodeSpec[];
}

interface ExecutionRecord {
  input: number;
  output: number;
  dependencies: string[];
}

/**
 * Load the graph specification from disk.
 */
async function loadGraph(graphPath: string): Promise<GraphSpec> {
  const payload = await readFile(graphPath, 'utf8');
  const spec = JSON.parse(payload) as GraphSpec;
  if (!Array.isArray(spec.nodes)) {
    throw new Error('Graph specification must contain a nodes array.');
  }
  return spec;
}

/**
 * Perform a Kahn topological sort to ensure deterministic execution order.
 */
function topoSort(nodes: NodeSpec[]): NodeSpec[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const byId = new Map<string, NodeSpec>();

  for (const node of nodes) {
    if (byId.has(node.id)) {
      throw new Error(`Duplicate node id detected: ${node.id}`);
    }
    byId.set(node.id, node);
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const node of nodes) {
    for (const dep of node.dependsOn ?? []) {
      if (!byId.has(dep)) {
        throw new Error(`Node ${node.id} depends on unknown node ${dep}`);
      }
      inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1);
      adjacency.get(dep)?.push(node.id);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const result: NodeSpec[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = byId.get(id);
    if (!node) {
      throw new Error(`Internal error: node ${id} missing during sort.`);
    }
    result.push(node);

    for (const neighbor of adjacency.get(id) ?? []) {
      const nextDegree = (inDegree.get(neighbor) ?? 0) - 1;
      if (nextDegree < 0) {
        throw new Error(`Negative indegree encountered for ${neighbor}`);
      }
      inDegree.set(neighbor, nextDegree);
      if (nextDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (result.length !== nodes.length) {
    throw new Error('Graph contains a cycle; topological sort failed.');
  }

  return result;
}

/**
 * Resolve the numeric input that should be sent into a node. The current
 * implementation reduces the upstream outputs to a single integer by taking
 * the last dependency's value. This keeps the data contract simple for the
 * prototype and mirrors a streaming pipeline.
 */
function resolveInput(node: NodeSpec, state: Map<string, ExecutionRecord>): number {
  const deps = node.dependsOn ?? [];
  if (deps.length === 0) {
    return 0;
  }
  const lastDependency = deps[deps.length - 1];
  const record = state.get(lastDependency);
  if (!record) {
    throw new Error(`Missing state for dependency ${lastDependency}`);
  }
  return record.output;
}

/**
 * Execute a single WASM node and persist its results into the state map.
 */
async function executeNode(baseDir: string, node: NodeSpec, state: Map<string, ExecutionRecord>): Promise<void> {
  const wasmPath = path.resolve(baseDir, node.wasm);
  const wasmBinary = await readFile(wasmPath);
  const instantiated = await WebAssembly.instantiate(wasmBinary, {});
  const entry = (instantiated.instance.exports as Record<string, unknown>).main;
  if (typeof entry !== 'function') {
    throw new Error(`Node ${node.id} does not export a main function.`);
  }
  const input = resolveInput(node, state);
  const output = Reflect.apply(entry as (arg: number) => number, undefined, [input]);
  state.set(node.id, {
    input,
    output,
    dependencies: [...(node.dependsOn ?? [])],
  });
}

/**
 * Run the full graph and return the execution trace for inspection.
 */
async function runGraph(graphPath: string): Promise<Map<string, ExecutionRecord>> {
  const graph = await loadGraph(graphPath);
  const ordered = topoSort(graph.nodes);
  const baseDir = path.dirname(graphPath);
  const state = new Map<string, ExecutionRecord>();

  for (const node of ordered) {
    await executeNode(baseDir, node, state);
  }

  return state;
}

/**
 * Pretty-print the final state as a compact report.
 */
function logState(state: Map<string, ExecutionRecord>): void {
  const lines: string[] = [];
  for (const [id, record] of state.entries()) {
    lines.push(
      `${id}: input=${record.input} -> output=${record.output} (deps: ${record.dependencies.join(', ') || 'none'})`,
    );
  }
  const finalNode = Array.from(state.keys()).pop();
  if (finalNode) {
    const finalOutput = state.get(finalNode)!.output;
    lines.push(`Final narrative: User ${state.get('fetchUser')?.output ?? '???'} receives discount score ${finalOutput}.`);
  }
  console.log(lines.join('\n'));
}

async function main(): Promise<void> {
  const graphPath = path.resolve(process.cwd(), 'graph.json');
  const state = await runGraph(graphPath);
  logState(state);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] === thisFile || process.argv[1] === pathToFileURL(thisFile).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { runGraph, logState };
