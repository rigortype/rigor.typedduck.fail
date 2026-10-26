import { checkBuiltApi } from './api-reference/check-built.mjs';

try {
  const result = await checkBuiltApi('dist');
  console.log(`API check: ${result.pages} pages, ${result.links} valid links, ${result.searchTargets} valid search targets.`);
} catch (error) {
  console.error(`API check failed: ${error.message}`);
  process.exitCode = 1;
}
