import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// Load the AI behavior guide from the markdown file
function loadBehaviorGuide(): string {
  try {
    const filePath = path.join(process.cwd(), 'docs/campus_map_rules.md')
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

async function callLLM(systemPrompt: string, userText: string, token: string): Promise<string> {
  const response = await fetch('https://models.github.ai/inference/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
      temperature: 0,
      max_tokens: 80,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`LLM API error: ${err}`)
  }

  const data = await response.json()
  const result = data.choices?.[0]?.message?.content?.trim()
  if (!result) throw new Error('Empty LLM response')
  return result
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Accept both field names for backward compatibility during the transition
    const foundAtInput: string = (body.foundAt || body.note || '').trim()
    const handedOffInput: string = (body.handedOffTo || '').trim()

    const token = process.env.GITHUB_TOKEN

    // Fallback: if no token, return raw inputs as-is
    if (!token) {
      console.error('GITHUB_TOKEN is not set')
      return NextResponse.json({
        foundAt: foundAtInput || 'Not specified',
        submittedAt: handedOffInput || 'Not specified',
      })
    }

    const guide = loadBehaviorGuide()

    const foundAtSystemPrompt = `You are a location label extractor for a university Lost & Found platform.

Your job: read the reporter's free-text description of WHERE they found or lost the item and return a clean, readable location label.

${guide}

Return ONLY the clean label — one short line. No JSON. No quotes. No explanation.`

    const submittedAtSystemPrompt = `You are a handoff label extractor for a university Lost & Found platform.

Your job: read the reporter's free-text description of WHERE they handed the item over, who they gave it to, or where they left it — and return a clean, readable label.

${guide}

Return ONLY the clean label — one short line. No JSON. No quotes. No explanation.`

    // Run both extractions in parallel for speed
    const [foundAtResult, submittedAtResult] = await Promise.allSettled([
      foundAtInput ? callLLM(foundAtSystemPrompt, foundAtInput, token) : Promise.resolve(''),
      handedOffInput ? callLLM(submittedAtSystemPrompt, handedOffInput, token) : Promise.resolve(''),
    ])

    const foundAt =
      foundAtResult.status === 'fulfilled' && foundAtResult.value
        ? foundAtResult.value
        : foundAtInput || 'Not specified'

    const submittedAt =
      submittedAtResult.status === 'fulfilled' && submittedAtResult.value
        ? submittedAtResult.value
        : handedOffInput || 'Not specified'

    return NextResponse.json({ foundAt, submittedAt })
  } catch (error: unknown) {
    console.error('Handoff API error:', error)
    return NextResponse.json({ error: 'Failed to process location' }, { status: 500 })
  }
}
