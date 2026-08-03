/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Exam Schedule Parser Dispatcher
 * ================================
 *
 * Mirrors scripts/run_parser.py (the timetable dispatcher). Reads
 * semester_type from Supabase semester_settings, then launches the
 * appropriate exam parser:
 *
 *   semester_type = "regular" → scripts/parse-excel.ts        → regular_schedule.json
 *   semester_type = "summer"  → scripts/parse-summer-exam.ts   → summer_schedule.json
 *
 * If Supabase credentials are not found (e.g., local dev without .env.local),
 * BOTH parsers run as a safety fallback — this ensures both JSON files exist
 * so the frontend can serve either semester type without a rebuild.
 *
 * This script is invoked by the `prebuild` npm script (see package.json),
 * so it runs before every `next build` and every `next dev`.
 *
 * Env vars (read from process.env or .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Load .env.local if it exists (mirrors run_parser.py behavior) ─────────────
function loadEnvLocal() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    // .env.local doesn't exist — that's fine, env vars may already be set
  }
}

loadEnvLocal();

// ── Query Supabase for the active semester type ──────────────────────────────
async function getSemesterType() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.log('ℹ️  Supabase credentials not found — running BOTH exam parsers as fallback.');
    return 'both';
  }

  try {
    const url = `${supabaseUrl}/rest/v1/semester_settings?id=eq.1&select=semester_type`;
    const https = require('https');
    const http = require('http');
    const client = url.startsWith('https') ? https : http;

    const data = await new Promise<any>((resolve, reject) => {
      const req = client.get(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        timeout: 6000,
      }, (res: any) => {
        let body = '';
        res.on('data', (chunk: string) => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e: any) {
            reject(new Error(`Failed to parse Supabase response: ${e.message}`));
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Supabase request timed out'));
      });
    });

    if (Array.isArray(data) && data.length > 0) {
      return data[0].semester_type || 'regular';
    }
    return 'regular';
  } catch (err: any) {
    console.log(`⚠️  Could not query semester type from Supabase: ${err.message}`);
    console.log('   Running BOTH exam parsers as fallback.');
    return 'both';
  }
}

// ── Run a parser script via ts-node ───────────────────────────────────────────
function runParser(scriptPath: string): boolean {
  const fullPath = path.join(__dirname, scriptPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  Parser script not found: ${fullPath} — skipping.`);
    return false;
  }
  try {
    execSync(`npx --no-install ts-node ${fullPath}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    return true;
  } catch (err: any) {
    console.error(`❌ Parser failed: ${scriptPath}`);
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const semType = await getSemesterType();
  console.log(`\n🎓 Active Semester Type: ${semType}\n`);

  if (semType === 'summer') {
    console.log('Launching Summer Exam Parser...');
    runParser('parse-summer-exam.ts');
  } else if (semType === 'regular') {
    console.log('Launching Regular Exam Parser...');
    runParser('parse-excel.ts');
  } else {
    // Fallback: run both (local dev or Supabase unreachable)
    console.log('Launching BOTH Exam Parsers (fallback mode)...');
    console.log('  → Regular:');
    runParser('parse-excel.ts');
    console.log('  → Summer:');
    runParser('parse-summer-exam.ts');
  }

  console.log('\n✅ Exam parser dispatcher complete.\n');
}

main();
