import { NextRequest, NextResponse } from 'next/server';
import type { ExamEntry } from '@/lib/types';

// eslint-disable-next-line
const schedule = require('../../../../public/data/regular_schedule.json');

export const runtime = 'edge';

export function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const batch = searchParams.get('batch');
  const dept  = searchParams.get('dept')?.toUpperCase();

  if (!batch || !dept) {
    return NextResponse.json({ error: 'batch and dept required' }, { status: 400 });
  }

  const filtered = (schedule as ExamEntry[]).filter(
    e => e.batch === batch && e.department === dept
  );

  return NextResponse.json(filtered, {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
