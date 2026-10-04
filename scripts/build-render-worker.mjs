// Bundles the standalone render worker (src/worker/render-worker.ts) into one ESM file.
// Run by `npm run build`; the image runs it as `node dist/render-worker.mjs`.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Native modules stay external: the image ships them in .next/standalone/node_modules. */
export const WORKER_EXTERNAL = ['sharp', '@img/*'];

/** The worker must not depend on the Next runtime: fail the build if anything pulls it in. */
const forbidNext = {
  name: 'forbid-next',
  setup(context) {
    context.onResolve({ filter: /^(next|next\/.*|server-only)$/ }, (args) => ({
      errors: [{ text: `${args.path} imported by ${path.relative(root, args.importer)}: the render worker runs outside Next` }],
    }));
  },
};

export async function buildRenderWorker(outfile = path.join(root, 'dist/render-worker.mjs')) {
  await build({
    entryPoints: [path.join(root, 'src/worker/render-worker.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    tsconfig: path.join(root, 'tsconfig.json'),
    external: WORKER_EXTERNAL,
    plugins: [forbidNext],
    // Bundled CommonJS dependencies (supabase-js, jszip) still call require().
    banner: { js: "import { createRequire as __workerRequire } from 'node:module'; const require = __workerRequire(import.meta.url);" },
    legalComments: 'none',
    logLevel: 'warning',
  });
  return outfile;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outfile = await buildRenderWorker();
  console.log(`render worker bundled: ${path.relative(root, outfile)}`);
}
