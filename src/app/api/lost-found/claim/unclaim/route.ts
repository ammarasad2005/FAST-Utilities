import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendUnclaimNotification } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { claimId, email } = await request.json()

    if (!claimId || !email) {
      return NextResponse.json({ error: 'Claim ID and email are required' }, { status: 400 })
    }

    // 1. Fetch claim and item details (specifying item_id relationship explicitly)
    const { data: claim, error: claimError } = await supabase
      .from('lost_found_claims')
      .select('*, lost_found_items!lost_found_claims_item_id_fkey(title)')
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    // 2. Verify claimant email matches (case insensitive, trimmed)
    const dbEmail = (claim.claimer_email || '').toLowerCase().trim()
    const inputEmail = email.toLowerCase().trim()

    if (dbEmail !== inputEmail) {
      return NextResponse.json({ 
        error: 'Email address does not match the email associated with this claim. Claim cannot be undone.' 
      }, { status: 400 })
    }

    // 3. Update claim status to 'unclaimed'
    const { error: updateError } = await supabase
      .from('lost_found_claims')
      .update({ status: 'unclaimed' })
      .eq('id', claimId)

    if (updateError) throw updateError

    // 4. Send notification
    await sendUnclaimNotification(claim.claimer_email, (claim.lost_found_items as any).title)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Unclaim error:', error)
    return NextResponse.json({ error: error.message || 'Unclaim failed' }, { status: 500 })
  }
}
