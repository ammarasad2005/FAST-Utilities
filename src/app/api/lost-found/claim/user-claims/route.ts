import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Query active (pending) claims for this email
    const { data: claims, error: claimsError } = await supabase
      .from('lost_found_claims')
      .select('item_id')
      .eq('claimer_email', email.toLowerCase().trim())
      .eq('status', 'pending')

    if (claimsError) throw claimsError

    const itemIds = (claims || []).map(c => c.item_id)

    return NextResponse.json({ itemIds })

  } catch (error: any) {
    console.error('Fetch user claims error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch active claims' }, { status: 500 })
  }
}
