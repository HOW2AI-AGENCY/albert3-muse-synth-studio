import { promises as fs } from 'fs';
import path from 'path';
import { gzipSync } from 'zlib';

const BASELINE_KB = 322;
const BASELINE_BYTES = BASELINE_KB * 1024;
const distAssetsDir = path.resolve('dist', 'assets');
const ALLOWED_EXTENSIONS = new Set(['.js', '.css']);

const formatBytes = (bytes) => `${(bytes / 1024).toFixed(2)} KB`;

async function getBundleSize() {
  try {
    const stats = await fs.stat(distAssetsDir);
    if (!stats.isDirectory()) {
      throw new Error(`Expected ${distAssetsDir} to be a directory`);
    }
  } catch (error) {
    throw new Error(`Unable to access build output at ${distAssetsDir}. Did you run 'npm run build'?\n${error.message}`);
  }

  const files = await fs.readdir(distAssetsDir);
  if (!files.length) {
    throw new Error(`No assets found in ${distAssetsDir}`);
  }

  let total = 0;

  for (const file of files) {
    const fullPath = path.join(distAssetsDir, file);
    const stat = await fs.stat(fullPath);
    const ext = path.extname(file).toLowerCase();
    if (stat.isFile() && ALLOWED_EXTENSIONS.has(ext)) {
      const contents = await fs.readFile(fullPath);
      total += gzipSync(contents).length;
    }
  }

  return total;
}

(async () => {
  const totalSize = await getBundleSize();
  const diff = totalSize - BASELINE_BYTES;
  const humanReadable = formatBytes(totalSize);

  console.log(`Bundle size (gzipped .js/.css): ${humanReadable} (baseline: ${BASELINE_KB} KB)`);

  if (diff > 0) {
    console.error(`Bundle size regression detected: +${formatBytes(diff)} over baseline.`);
    process.exit(1);
  }

  console.log('Bundle size check passed.');
})();
