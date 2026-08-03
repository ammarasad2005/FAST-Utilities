import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { foundItemId, claimerEmail } = await request.json()

    if (!foundItemId || !claimerEmail) {
      return NextResponse.json({ error: 'Found item ID and email are required' }, { status: 400 })
    }

    // 1. Fetch the found item details
    const { data: foundItem, error: foundError } = await supabase
      .from('lost_found_items')
      .select('*')
      .eq('id', foundItemId)
      .single()

    if (foundError || !foundItem) {
      return NextResponse.json({ error: 'Found item not found' }, { status: 404 })
    }

    // 2. Fetch all active lost items by this user's email
    const { data: lostItems, error: lostError } = await supabase
      .from('lost_found_items')
      .select('*')
      .eq('type', 'lost')
      .eq('is_resolved', false)
      .eq('contact_info', claimerEmail.toLowerCase().trim())

    if (lostError) throw lostError

    if (!lostItems || lostItems.length === 0) {
      return NextResponse.json({ 
        match: false, 
        message: 'No active lost reports found for this email. Please report your item as lost first.' 
      })
    }

    // 3. AI Semantic Check
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      console.error('GITHUB_TOKEN not set for semantic sync')
      return NextResponse.json({ error: 'AI matching unavailable' }, { status: 500 })
    }

    const lostItemsList = lostItems.map(li => `[ID: ${li.id}] Title: ${li.title}, Desc: ${li.description}`).join('\n')
    
    const response = await fetch("https://models.github.ai/inference/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert Lost & Found synchronization system. Your goal is to compare a FOUND item against a list of reported LOST items to identify if they refer to the exact same physical object.

            Semantic Equivalence Rules:
            - **Synonyms & Phrasing:** Core items represented by equivalent terms MUST match (e.g., "headphone" = "headset" = "earphone" = "audio headset", "glasses" = "spectacles" = "specs").
            - **Generics vs. Specifics:** A generic term matches a specific brand or model (e.g., "phone" matches "iPhone 15", "laptop" matches "Dell Inspiron").
            - **Complementary Details:** Different, non-contradictory details in the descriptions are highly likely to refer to the same item (e.g., "blue color" and "belkin sticker attached" are complementary properties of the same headset and should match with high confidence).
            
            Negative Contradiction Rules (Do NOT Match):
            - Reject match ONLY if there is a flat, mutually exclusive contradiction (e.g., different colors like "Red" vs "Blue", different brands like "Sony" vs "Bose", or entirely different categories).
            
            Return ONLY a valid JSON object matching this schema:
            {
              "matchId": string | null (the ID of the matching lost item, or null if no match),
              "confidence": number (0-100, representing your match confidence)
            }`
          },
          {
            role: "user",
            content: `FOUND ITEM: ${foundItem.title} - ${foundItem.description}\n\nUSER'S LOST ITEMS:\n${lostItemsList}`
          }
        ],
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) throw new Error('AI Semantic Match failed')

    const data = await response.json()
    const result = JSON.parse(data?.choices[0]?.message?.content || '{}')

    if (result.matchId && result.confidence >= 80) {
      const matchedItem = lostItems.find(li => li.id === result.matchId)
      return NextResponse.json({ 
        match: true, 
        matchId: result.matchId, 
        confidence: result.confidence,
        matchedItem: {
          title: matchedItem?.title,
          description: matchedItem?.description
        }
      })
    }

    return NextResponse.json({ 
      match: false, 
      message: 'We found your reports, but none seem to match this item. Please ensure you have reported the correct item as lost.' 
    })

  } catch (error: any) {
    console.error('Sync check error:', error)
    return NextResponse.json({ error: error.message || 'Semantic check failed' }, { status: 500 })
  }
}
