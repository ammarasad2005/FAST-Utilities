import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { claimId, resolutionImageUrl } = await request.json()

    if (!claimId) {
      return NextResponse.json({ error: 'Claim ID is required' }, { status: 400 })
    }

    // 1. Fetch the claim details
    const { data: claim, error: claimError } = await supabase
      .from('lost_found_claims')
      .select('*')
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    if (claim.status === 'unclaimed') {
      return NextResponse.json({ error: 'This claim has already been cancelled/unclaimed.' }, { status: 400 })
    }

    // 2. Mark the claim as verified
    const { error: claimUpdateError } = await supabase
      .from('lost_found_claims')
      .update({ status: 'verified' })
      .eq('id', claimId)

    if (claimUpdateError) throw claimUpdateError

    // 3. Mark the associated found item as resolved with the resolution photo
    const { error: foundItemError } = await supabase
      .from('lost_found_items')
      .update({ 
        is_resolved: true,
        resolved_by: claim.lost_item_id ? `${claim.claimer_id}:${claim.lost_item_id}` : `Claimant verified (${claim.claimer_email})`,
        resolution_image_url: resolutionImageUrl || null
      })
      .eq('id', claim.item_id)

    if (foundItemError) throw foundItemError

    // 4. If there is a linked lost item report, mark it as resolved simultaneously with the resolution photo
    if (claim.lost_item_id) {
      const { error: lostItemError } = await supabase
        .from('lost_found_items')
        .update({ 
          is_resolved: true,
          resolved_by: `${claim.claimer_id}:${claim.item_id}`,
          resolution_image_url: resolutionImageUrl || null
        })
        .eq('id', claim.lost_item_id)

      if (lostItemError) throw lostItemError
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Verify hold error:', error)
    return NextResponse.json({ error: error.message || 'Verification process failed' }, { status: 500 })
  }
}
