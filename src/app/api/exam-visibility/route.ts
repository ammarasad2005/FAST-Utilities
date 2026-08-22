import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/exam-visibility
 *
 * Returns the admin-controlled exam-finder visibility flag plus a small set of
 * semester settings, so clients (e.g. the native mobile app) can honour the
 * "show exams" toggle without shipping Supabase credentials.
 *
 * Defaults to `show_exams: false` (hidden) on any error, matching the web
 * client's "hidden until admin turns on" behaviour.
 */
export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('semester_settings')
      .select('show_exams, semester_type, semester_name')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return NextResponse.json({ show_exams: false, semester_type: 'regular', semester_name: null });
    }

    return NextResponse.json(
      {
        show_exams: data.show_exams ?? false,
        semester_type: data.semester_type ?? 'regular',
        semester_name: data.semester_name ?? null,
      },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    console.error('Error fetching exam visibility:', err);
    return NextResponse.json({ show_exams: false, semester_type: 'regular', semester_name: null });
  }
}
