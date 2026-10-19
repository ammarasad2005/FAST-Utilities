import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { query, items } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ suggestions: [], alternatives: [] })
    }

    const queryLower = query.toLowerCase().trim()
    const queryWords = queryLower.split(/\s+/).filter((w: string) => w.length > 2)

    // Find similar items using keyword matching and fuzzy logic
    const scored = items
      .filter((item: { isResolved?: boolean }) => !item.isResolved)
      .map((item: { id?: string; title?: string; description?: string; category?: string; location?: string; type?: string; createdAt?: string }) => {
        let score = 0
        const titleLower = (item.title || '').toLowerCase()
        const descLower = (item.description || '').toLowerCase()
        const catLower = (item.category || '').toLowerCase()
        const locLower = (item.location || '').toLowerCase()

        // Word match scoring
        for (const word of queryWords) {
          if (titleLower.includes(word)) score += 3
          if (descLower.includes(word)) score += 2
          if (catLower.includes(word)) score += 2
          if (locLower.includes(word)) score += 1
        }

        return { ...item, score }
      })
      .filter((item: { score: number }) => item.score > 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)

    const suggestions = scored.slice(0, 5).map((item: { id?: string; title?: string; type?: string; category?: string; location?: string; createdAt?: string; score?: number }) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      category: item.category,
      location: item.location,
      createdAt: item.createdAt,
      relevanceScore: item.score,
    }))

    const categories = [...new Set(scored.slice(0, 10).map((i: { category?: string }) => i.category))]
    const alternatives: string[] = categories.slice(0, 4).filter(Boolean) as string[]

    const token = process.env.GITHUB_TOKEN
    if (token) {
      try {
        const response = await fetch("https://models.github.io/inference/chat/completions", {
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
                content: "You are a helpful assistant for a university Lost & Found system. Suggest alternative search terms based on user input. Return ONLY a JSON object with 'alternatives' (array) and 'suggestion' (string)."
              },
              {
                role: "user",
                content: `Search query: "${query}". Categories found: ${alternatives.join(', ')}`
              }
            ],
            response_format: { type: "json_object" }
          })
        })

        if (response.ok) {
          const data = await response.json()
          const parsed = JSON.parse(data.choices[0]?.message?.content || '{}')
          return NextResponse.json({
            suggestions,
            alternatives: parsed.alternatives || alternatives,
            aiSuggestion: parsed.suggestion || null,
            source: 'ai',
          })
        }
      } catch (err) {
        console.error('GitHub Smart Search failed:', err)
      }
    }

    return NextResponse.json({
      suggestions,
      alternatives,
      source: 'local',
    })
  } catch (error) {
    console.error('Smart search error:', error)
    return NextResponse.json({ error: 'Smart search failed' }, { status: 500 })
  }
}
