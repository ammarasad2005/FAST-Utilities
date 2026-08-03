import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // 1. Verify admin authentication
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Read GITHUB_TOKEN
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) {
    return NextResponse.json(
      { error: 'GitHub Personal Access Token (GITHUB_TOKEN) is not configured in environment variables.' },
      { status: 500 }
    )
  }

  const owner = 'ammarasad2005'
  const repo = 'Exam-Table'
  const workflowId = 'update-timetable.yml'

  try {
    // 3. Trigger the GitHub Actions workflow dispatch
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'FAST-ISB-Schedule-Platform',
        },
        body: JSON.stringify({
          ref: 'main',
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GitHub API returned an error:', errorText)
      return NextResponse.json(
        { error: `GitHub API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'GitHub Actions workflow triggered successfully. The timetable will regenerate, commit, and redeploy in a few minutes.',
    })
  } catch (err: any) {
    console.error('Failed to trigger GitHub Action:', err)
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred while contacting GitHub.' },
      { status: 500 }
    )
  }
}
