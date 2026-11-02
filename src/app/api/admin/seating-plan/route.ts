import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_REQUEST_BYTES = 4 * 1024 * 1024

function serviceConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const ingestToken = process.env.SEATING_MANUAL_IMPORT_TOKEN
  if (!supabaseUrl || !anonKey || !ingestToken) return null
  return { supabaseUrl, anonKey, ingestToken }
}

async function callImportService(payload: Record<string, unknown>) {
  const config = serviceConfig()
  if (!config) {
    return NextResponse.json(
      { error: 'Seating-plan import is not configured on the server.' },
      { status: 503 },
    )
  }

  const response = await fetch(`${config.supabaseUrl}/functions/v1/seating-plan-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'x-seating-ingest-token': config.ingestToken,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const text = await response.text()
  let result: Record<string, unknown> = {}
  try {
    result = JSON.parse(text)
  } catch {
    result = {}
  }

  if (!response.ok) {
    // Return only the function's intentionally coarse diagnostic; never echo
    // the submitted payload, PDF text, or roll numbers into an error response.
    return NextResponse.json({
      error: typeof result.error === 'string' ? result.error : 'The seating plan could not be imported.',
      ...(typeof result.diagnostic === 'string' ? { diagnostic: result.diagnostic } : {}),
      ...(Number.isInteger(result.page) ? { page: result.page } : {}),
    }, { status: response.status })
  }
  return NextResponse.json(result, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return callImportService({ action: 'status' })
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: 'Parsed seating plan is too large to import.' }, { status: 413 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 })
  }
  if (payload.action !== 'manual-import' || !payload.plan || typeof payload.plan !== 'object') {
    return NextResponse.json({ error: 'Invalid seating-plan import request.' }, { status: 400 })
  }

  try {
    return await callImportService(payload)
  } catch {
    return NextResponse.json({ error: 'Seating service is temporarily unavailable.' }, { status: 502 })
  }
}
