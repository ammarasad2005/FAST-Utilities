import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authenticated = isAdminAuthenticated(request)
  return NextResponse.json({ authenticated })
}
