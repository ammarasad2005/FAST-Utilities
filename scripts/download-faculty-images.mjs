/**
 * Download all faculty photos from isb.nu.edu.pk into public/faculty-img/
 * and rewrite faculty_data.json so `image_url` points to the local copy.
 *
 * Idempotent: re-running skips images that are already downloaded.
 *
 * Usage:
 *   node scripts/download-faculty-images.mjs            # download + update JSON
 *   node scripts/download-faculty-images.mjs --check     # only report missing/broken
 *
 * Why this exists:
 *   The faculty page hotlinked ~248 portraits from isb.nu.edu.pk. Hotlinking a
 *   third-party host is unreliable (slow / hotlink-protection / renames) and
 *   bypasses Vercel image optimization. Self-hosting makes the photos first-party,
 *   cacheable, and eligible for next/image optimization.
 */
import { readFile, writeFile, mkdir, access, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_FILE = join(ROOT, 'public', 'data', 'faculty', 'faculty_data.json');
const IMG_DIR = join(ROOT, 'public', 'faculty-img');
const ORIGIN_HOST = 'https://isb.nu.edu.pk';

const CONCURRENCY = 6;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 1500;

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetries(url, retries = MAX_RETRIES) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          Accept: 'image/webp,image/*;q=0.8,*/*;q=0.5',
        },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) throw new Error(`suspiciously small (${buf.length} bytes)`);
      return buf;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(RETRY_BACKOFF_MS * attempt);
    }
  }
  throw lastErr;
}

async function downloadPool(tasks) {
  const results = { ok: 0, skipped: 0, failed: [], total: tasks.length };
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      const { filename, url } = tasks[i];
      const dest = join(IMG_DIR, filename);

      // Idempotent skip
      if (existsSync(dest)) {
        try {
          const st = await stat(dest);
          if (st.size > 100) {
            results.skipped++;
            continue;
          }
        } catch {
          /* fall through to re-download */
        }
      }

      try {
        const buf = await fetchWithRetries(url);
        await writeFile(dest, buf);
        results.ok++;
      } catch (e) {
        results.failed.push({ filename, url, error: String(e.message || e) });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return results;
}

async function main() {
  const raw = await readFile(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);

  // Collect every image to fetch + its location in the JSON
  const tasks = [];
  for (const dept of data) {
    for (const m of dept.faculty) {
      if (!m.image_url || !m.image_url.startsWith(ORIGIN_HOST)) continue;
      const filename = m.image_url.split('/').pop();
      tasks.push({ filename, url: m.image_url });
    }
  }

  console.log(`Faculty image downloader`);
  console.log(`  data file:  ${DATA_FILE}`);
  console.log(`  image dir:  ${IMG_DIR}`);
  console.log(`  remote host: ${ORIGIN_HOST}`);
  console.log(`  total images: ${tasks.length}`);
  console.log(`  mode: ${CHECK_ONLY ? 'CHECK ONLY' : 'download + rewrite JSON'}`);
  console.log('');

  if (!CHECK_ONLY) await mkdir(IMG_DIR, { recursive: true });

  if (CHECK_ONLY) {
    let missing = 0;
    let small = 0;
    for (const { filename } of tasks) {
      const dest = join(IMG_DIR, filename);
      if (!existsSync(dest)) {
        console.log(`  MISSING: ${filename}`);
        missing++;
      } else {
        const st = await stat(dest);
        if (st.size < 100) {
          console.log(`  SMALL/BROKEN (${st.size}B): ${filename}`);
          small++;
        }
      }
    }
    console.log('');
    console.log(`Summary: ${tasks.length} total, ${missing} missing, ${small} small/broken`);
    return;
  }

  const results = await downloadPool(tasks);

  // Rewrite JSON to point at local copies (only for images we successfully
  // fetched OR that already existed). Leave any failed ones on the remote URL
  // so the UI keeps working via the remotePatterns fallback in next/image.
  let rewritten = 0;
  for (const dept of data) {
    for (const m of dept.faculty) {
      if (!m.image_url || !m.image_url.startsWith(ORIGIN_HOST)) continue;
      const filename = m.image_url.split('/').pop();
      const dest = join(IMG_DIR, filename);
      if (existsSync(dest)) {
        try {
          const st = await stat(dest);
          if (st.size > 100) {
            m.image_url = `/faculty-img/${filename}`;
            rewritten++;
          }
        } catch {
          /* leave remote */
        }
      }
    }
  }

  await writeFile(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');

  console.log(`Summary:`);
  console.log(`  downloaded:  ${results.ok}`);
  console.log(`  skipped:     ${results.skipped}`);
  console.log(`  failed:      ${results.failed.length}`);
  console.log(`  JSON rewritten to local paths: ${rewritten} / ${tasks.length}`);
  if (results.failed.length) {
    console.log('');
    console.log('Failed images (left on remote URL as fallback):');
    for (const f of results.failed) console.log(`  - ${f.filename}: ${f.error}`);
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
