export async function load(url, context, nextLoad) {
  // Handle .scm extension
  if (url.endsWith('.scm')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${JSON.stringify(new URL(url).pathname)};`,
    };
  }

  // Handle imports with type: "file" attribute (e.g. .wasm imports in OpenTUI)
  if (context.importAttributes?.type === 'file') {
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${JSON.stringify(new URL(url).pathname)};`,
    };
  }

  // Chain to next loader for everything else
  return nextLoad(url, context);
}
