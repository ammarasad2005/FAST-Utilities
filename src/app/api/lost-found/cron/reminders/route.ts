import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendVerificationRequestEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Protect this cron route in production using the secret token header
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Fetch all pending claims with their associated items (specifying item_id relationship explicitly)
    const { data: pendingClaims, error: claimsError } = await supabase
      .from('lost_found_claims')
      .select('*, lost_found_items!lost_found_claims_item_id_fkey(*)')
      .eq('status', 'pending');

    if (claimsError) {
      console.error('Cron: Error fetching pending claims:', claimsError);
      return NextResponse.json({ error: claimsError.message }, { status: 500 });
    }

    if (!pendingClaims || pendingClaims.length === 0) {
      return NextResponse.json({ message: 'No pending claims found.' });
    }

    const { origin } = new URL(request.url);
    let sentCount = 0;

    for (const claim of pendingClaims) {
      // Supabase returns the joined item as a single object (postgrest mapping)
      const associatedItem = claim.lost_found_items;

      // Only send reminders if the found item is still active
      if (associatedItem && !associatedItem.is_resolved) {
        await sendVerificationRequestEmail(claim.claimer_email, associatedItem.title, claim.id, origin);
        sentCount++;
      }
    }

    return NextResponse.json({ 
      message: `Cron job run successfully. Sent ${sentCount} reminders.`,
      sentCount
    });

  } catch (error: any) {
    console.error('Cron job execution failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
