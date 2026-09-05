/**
 * 20-minute backup sweep (GitHub Action `push-sweep.yml`).
 *
 * Covers every campus dataset that does NOT get an event-driven instant
 * trigger from the update workflows: exam-visibility (admin toggle), faculty,
 * semester calendar, student events, slate calendar. Hashes each payload,
 * diffs against `.github/state/push-hashes.json` (committed back by the
 * workflow), and pings campus_updates once with the changed keys.
 *
 * First run seeds baselines silently — no notification storm.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sendCampusPing } = require('./fcm');

const API_BASE = process.env.CAMPUS_API_BASE || 'https://fast-nuces-isb.vercel.app';
const STATE_FILE = path.join(process.cwd(), '.github/state/push-hashes.json');

const DATASETS = {
  'data:exam_visibility': `${API_BASE}/api/exam-visibility`,
  'data:faculty': `${API_BASE}/data/faculty/faculty_data.json`,
  'data:semester': `${API_BASE}/data/semester_calendar.json`,
  'data:student_events': `${API_BASE}/data/student_events.json`,
  'data:slate_events': `${API_BASE}/data/slate_calendar_events.json`,
};

async function hashUrl(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'fast-utilities-push-sweep/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  return crypto.createHash('sha1').update(text).digest('hex');
}

(async () => {
  let previous = {};
  try {
    previous = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch { /* first run */ }

  const next = { ...previous };
  const changed = [];
  let firstRun = Object.keys(previous).length === 0;

  for (const [key, url] of Object.entries(DATASETS)) {
    let hash = null;
    try {
      hash = await hashUrl(url);
    } catch (e) {
      console.warn(`[sweep] fetch failed for ${key}: ${e.message} — skipped this tick`);
      continue;
    }
    if (previous[key] === undefined) {
      next[key] = hash; // seed baseline
    } else if (previous[key] !== hash) {
      changed.push(key);
      next[key] = hash;
    }
  }

  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2) + '\n');

  if (firstRun) {
    console.log('[sweep] baseline seeded silently (first run)');
    // Forces the commit in the workflow so the baseline is persisted.
    process.exit(0);
  }

  if (changed.length === 0) {
    console.log('[sweep] no dataset changes');
    // State file content may be byte-identical — workflow will no-op the commit.
    process.exit(0);
  }

  await sendCampusPing(changed);
  process.exit(0);
})().catch((e) => {
  console.error(`[sweep] fatal: ${e.message}`);
  process.exit(1);
});
