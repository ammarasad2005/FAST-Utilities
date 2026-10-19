/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
const fsModule = require('fs');
const pathModule = require('path');
const { execSync } = require('child_process');

// Ensure the 'pg' module is installed for database communication
function ensurePgInstalled() {
  try {
    require.resolve('pg');
  } catch (e) {
    console.log("Installing 'pg' and '@types/pg' dependencies...");
    execSync('npm install pg @types/pg', { stdio: 'inherit' });
  }
}

// Read database connection string from environment or .env.local/dotenv files
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;
  if (process.env.POSTGRES_PRISMA_URL) return process.env.POSTGRES_PRISMA_URL;

  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const envPath = pathModule.join(process.cwd(), file);
    if (fsModule.existsSync(envPath)) {
      const content = fsModule.readFileSync(envPath, 'utf-8');
      const env: Record<string, string> = {};
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const index = trimmed.indexOf('=');
        if (index > 0) {
          const key = trimmed.substring(0, index).trim();
          let val = trimmed.substring(index + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          env[key] = val;
        }
      }
      
      const dbUrl = env.DATABASE_URL || env.POSTGRES_URL || env.POSTGRES_PRISMA_URL;
      if (dbUrl) {
        return dbUrl;
      }
      
      if (env.POSTGRES_USER && env.POSTGRES_PASSWORD && env.POSTGRES_HOST && env.POSTGRES_DATABASE) {
        return `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}/${env.POSTGRES_DATABASE}`;
      }
    }
  }

  throw new Error('Database connection URL not found in process.env or .env.local/.env files');
}

async function run() {
  ensurePgInstalled();
  
  // Dynamically import pg after ensuring it's installed
  const { Client } = require('pg');
  
  const connectionString = getDatabaseUrl();
  // Safe logging: redact password from connection string in logs
  const parsedUrl = new URL(connectionString.replace('postgresql://', 'http://').replace('postgres://', 'http://'));
  console.log(`Connecting to database host: ${parsedUrl.hostname}, database: ${parsedUrl.pathname.slice(1)}`);
  
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase') || connectionString.includes('aiven') || connectionString.includes('neondb') ? { rejectUnauthorized: false } : undefined
  });
  
  await client.connect();
  
  try {
    console.log("Creating table 'semester_settings'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS semester_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1) DEFAULT 1,
        semester_type TEXT NOT NULL DEFAULT 'regular' CHECK (semester_type IN ('regular', 'summer')),
        bypass_courses_config BOOLEAN NOT NULL DEFAULT false,
        google_sheets_url TEXT NOT NULL DEFAULT '',
        semester_name TEXT NOT NULL DEFAULT 'Spring 2026',
        course_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
        sheet_name_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log("Migrating table 'semester_settings' to include 'sheet_name_mappings'...");
    await client.query(`
      ALTER TABLE semester_settings 
      ADD COLUMN IF NOT EXISTS sheet_name_mappings JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);

    console.log("Migrating table 'semester_settings' to include 'semester_name'...");
    await client.query(`
      ALTER TABLE semester_settings 
      ADD COLUMN IF NOT EXISTS semester_name TEXT NOT NULL DEFAULT 'Spring 2026';
    `);
    
    console.log("Enabling Row Level Security...");
    await client.query(`
      ALTER TABLE semester_settings ENABLE ROW LEVEL SECURITY;
    `);
    
    console.log("Creating policies...");
    await client.query(`
      DROP POLICY IF EXISTS "Allow public read settings" ON semester_settings;
      CREATE POLICY "Allow public read settings" ON semester_settings FOR SELECT USING (true);
    `);
    
    await client.query(`
      DROP POLICY IF EXISTS "Allow public update settings" ON semester_settings;
      CREATE POLICY "Allow public update settings" ON semester_settings FOR UPDATE USING (true);
    `);
    
    console.log("Seeding default row...");
    await client.query(`
      INSERT INTO semester_settings (id, semester_type, bypass_courses_config, google_sheets_url, semester_name, course_mappings, sheet_name_mappings)
      VALUES (1, 'regular', false, '', 'Spring 2026', '[]'::jsonb, '{}'::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `);
    
    console.log("Verifying setup...");
    const res = await client.query(`SELECT * FROM semester_settings;`);
    console.log("Current semester_settings row(s) in database:");
    console.log(JSON.stringify(res.rows, null, 2));
    
    if (res.rows.length === 1 && res.rows[0].id === 1) {
      console.log("✅ Database table semester_settings successfully set up and seeded!");
    } else {
      console.error("❌ Setup verification failed: expected 1 row with id = 1.");
    }
  } catch (err) {
    console.error("Error setting up database:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
