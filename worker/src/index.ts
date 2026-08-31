import {
  handleClaim,
  handleCreatePlane,
  handleGetPlane,
  handleInbox,
} from './planes'
import type { Env } from './types'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS)) {
    headers.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }))
    }

    const url = new URL(request.url)
    const path = url.pathname

    if (path === '/health') {
      return withCors(Response.json({ ok: true, service: 'drift-api' }))
    }

    if (path === '/inbox' && request.method === 'GET') {
      return withCors(await handleInbox(url, env))
    }

    if (path === '/planes' && request.method === 'POST') {
      return withCors(await handleCreatePlane(request, env))
    }

    const planeMatch = path.match(/^\/planes\/([^/]+)$/)
    if (planeMatch && request.method === 'GET') {
      return withCors(await handleGetPlane(planeMatch[1], env))
    }

    const claimMatch = path.match(/^\/planes\/([^/]+)\/claim$/)
    if (claimMatch && request.method === 'POST') {
      return withCors(await handleClaim(claimMatch[1], request, env))
    }

    return withCors(new Response('not found', { status: 404 }))
  },
}
