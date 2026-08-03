-- Table Definition
CREATE TABLE lost_found_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  handoff_note TEXT,
  parsed_found_at TEXT,
  parsed_submitted_at TEXT,
  raw_found_at TEXT,
  raw_submitted_at TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  contact_info TEXT NOT NULL,
  reporter_name TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by TEXT,
  image_url TEXT,
  resolution_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for resolved items to speed up history section
CREATE INDEX idx_lost_found_items_is_resolved ON lost_found_items(is_resolved);

-- Table for tracking item claims
CREATE TABLE lost_found_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES lost_found_items(id) ON DELETE CASCADE,
  claimer_id TEXT NOT NULL,
  claimer_email TEXT NOT NULL,
  lost_item_id UUID REFERENCES lost_found_items(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'unclaimed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_found_claims ENABLE ROW LEVEL SECURITY;

-- Policies for lost_found_items
-- Allow anyone to read items
CREATE POLICY "Allow public read access"
ON lost_found_items
FOR SELECT
USING (true);

-- Allow anyone to insert items
CREATE POLICY "Allow public insert access"
ON lost_found_items
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update items (for marking as resolved)
CREATE POLICY "Allow public update access"
ON lost_found_items
FOR UPDATE
USING (true);

-- Allow anyone to delete items (for demo purposes)
CREATE POLICY "Allow public delete access"
ON lost_found_items
FOR DELETE
USING (true);

-- Policies for lost_found_claims
CREATE POLICY "Allow public read claims"
ON lost_found_claims
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert claims"
ON lost_found_claims
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public delete claims"
ON lost_found_claims
FOR DELETE
USING (true);

-- Storage Bucket Definition
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lost_found_images', 'lost_found_images', true);

-- Policies for storage
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'lost_found_images' );

CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'lost_found_images' );

-- Table for campus reviews and suggestions
CREATE TABLE IF NOT EXISTS campus_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  category TEXT NOT NULL CHECK (category IN ('bug_report', 'suggestion', 'review', 'inquiry')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE campus_feedback ENABLE ROW LEVEL SECURITY;

-- Enable public insertions (so anyone on the campus can submit feedback)
CREATE POLICY "Allow public insert feedback"
ON campus_feedback FOR INSERT
WITH CHECK (true);

-- Enable public selects (we'll fetch safely on the backend)
CREATE POLICY "Allow public read feedback"
ON campus_feedback FOR SELECT
USING (true);

-- Enable public deletes (used by the secure admin dashboard)
CREATE POLICY "Allow public delete feedback"
ON campus_feedback FOR DELETE
USING (true);

-- Table for Summer Semester Configuration settings
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

-- Enable RLS
ALTER TABLE semester_settings ENABLE ROW LEVEL SECURITY;

-- Policies for semester_settings
CREATE POLICY "Allow public read settings"
ON semester_settings FOR SELECT
USING (true);

CREATE POLICY "Allow public update settings"
ON semester_settings FOR UPDATE
USING (true);

-- Seed initial default settings row
INSERT INTO semester_settings (id, semester_type, bypass_courses_config, google_sheets_url, semester_name, course_mappings, sheet_name_mappings)
VALUES (1, 'regular', false, '', 'Spring 2026', '[]', '{}')
ON CONFLICT (id) DO NOTHING;

