import { NextRequest } from 'next/server'

export function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  
  if (!username || !password) {
    console.warn("WARNING: ADMIN_USERNAME or ADMIN_PASSWORD is not set in environment variables.")
  }
  
  return { 
    username: username || '', 
    password: password || '' 
  }
}

export function getAdminSessionToken(): string {
  const { username, password } = getAdminCredentials()
  if (!username || !password) {
    return 'invalid-session-token'
  }
  // Generate a simple secure token based on the credentials
  return Buffer.from(`${username}:${password}`).toString('base64')
}

export function verifyAdminCredentials(usernameInput: string, passwordInput: string): boolean {
  const { username, password } = getAdminCredentials()
  if (!username || !password) return false
  return usernameInput === username && passwordInput === password
}

export function isAdminAuthenticated(request: NextRequest): boolean {
  const adminSession = request.cookies.get('admin_session')?.value
  if (!adminSession) return false
  
  const expectedToken = getAdminSessionToken()
  return adminSession === expectedToken
}
