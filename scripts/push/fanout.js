/**
 * Instant fan-out trigger (event-driven path).
 *
 * Invoked by the timetable update workflows ONLY when they just committed new
 * data. It waits until the live website actually serves the new file (Vercel
 * redeploys take 1–4 min after the push), then pings the campus_updates topic.
 *
 * Usage:
 *   node scripts/push/fanout.js \
 *     --keys=data:timetable:FSC \
 *     --file=public/data/timetable.json \
 *     --url=https://fast-nuces-isb.vercel.app/data/timetable.json
 */
const fs = require('fs');
const crypto = require('crypto');
const { sendCampusPing } = require('./fcm');

const POLL_EVERY_MS = 15_000;
const POLL_TIMEOUT_MS = 7 * 60_000;

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const sha1 = (bufOrText) => crypto.createHash('sha1').update(bufOrText).digest('hex');

async function fetchHash(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return sha1(await res.text());
}

(async () => {
  const keys = (arg('keys') || '').split(',').filter(Boolean);
  const file = arg('file');
  const url = arg('url');
  if (!keys.length || !file || !url) {
    console.error('missing --keys / --file / --url');
    process.exit(1);
  }

  const expected = sha1(fs.readFileSync(file));
  console.log(`[fanout] waiting for ${url} to serve sha1=${expected.slice(0, 10)}…`);

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let matched = false;
  while (Date.now() < deadline && !matched) {
    try {
      const live = await fetchHash(url);
      if (live === expected) {
        matched = true;
        break;
      }
    } catch (e) {
      console.warn(`[fanout] poll error (retrying): ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
  }

  console.log(matched ? '[fanout] live site is serving the new data ✓' : '[fanout] timeout — sending anyway (phones self-heal via periodic sync)');
  await sendCampusPing(keys);
  process.exit(0);
})().catch((e) => {
  console.error(`[fanout] fatal: ${e.message}`);
  process.exit(1);
});
