import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const claimId = searchParams.get('claimId')

    if (!claimId) {
      return NextResponse.json({ error: 'Claim ID is required' }, { status: 400 })
    }

    // Query claim details and join lost_found_items (specifying item_id relationship explicitly)
    const { data: claim, error: claimError } = await supabase
      .from('lost_found_claims')
      .select('*, lost_found_items!lost_found_claims_item_id_fkey(*)')
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    const matchedItem = claim.lost_found_items

    return NextResponse.json({
      claim: {
        id: claim.id,
        claimerId: claim.claimer_id,
        claimerEmail: claim.claimer_email,
        status: claim.status,
        item: matchedItem ? {
          id: matchedItem.id,
          type: matchedItem.type,
          category: matchedItem.category,
          title: matchedItem.title,
          description: matchedItem.description,
          location: matchedItem.location,
          isResolved: matchedItem.is_resolved,
          imageUrl: matchedItem.image_url
        } : null
      }
    })

  } catch (error: any) {
    console.error('Fetch claim details error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch details' }, { status: 500 })
  }
}
