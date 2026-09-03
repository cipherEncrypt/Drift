import {
  handleClaim,
  handleCheer,
  handleConfig,
  handleCreatePlane,
  handleGetPlane,
  handleInbox,
  handleRelay,
  handleSent,
  handleSky,
} from './planes'
import {
  handleGetProfile,
  handleProfileBatch,
  handleProfileByAddress,
  handleProfileClaim,
  handleProfileRename,
  handleProfileSearch,
} from './profiles'
import type { Env } from './env'

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

function serverError(err: unknown): Response {
  const message = err instanceof Error ? err.message : 'server error'
  return withCors(Response.json({ error: message }, { status: 500 }))
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }))
    }

    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (path === '/health') {
        return withCors(Response.json({ ok: true, service: 'drift-api' }))
      }

      if (path === '/config' && request.method === 'GET') {
        return withCors(await handleConfig(env))
      }

      if (path === '/profiles/search' && request.method === 'GET') {
        return withCors(await handleProfileSearch(url, env))
      }

      if (path === '/profiles/by-address' && request.method === 'GET') {
        return withCors(await handleProfileByAddress(url, env))
      }

      if (path === '/profiles/batch' && request.method === 'GET') {
        return withCors(await handleProfileBatch(url, env))
      }

      if (path === '/profiles/claim' && request.method === 'POST') {
        return withCors(await handleProfileClaim(request, env))
      }

      if (path === '/profiles/rename' && request.method === 'POST') {
        return withCors(await handleProfileRename(request, env))
      }

      const profileMatch = path.match(/^\/profiles\/([a-z0-9_]{3,20})$/)
      if (profileMatch && request.method === 'GET') {
        return withCors(await handleGetProfile(profileMatch[1], env))
      }

      if (path === '/inbox' && request.method === 'GET') {
        return withCors(await handleInbox(url, env))
      }

      if (path === '/sent' && request.method === 'GET') {
        return withCors(await handleSent(url, env))
      }

      if (path === '/planes/sky' && request.method === 'GET') {
        return withCors(await handleSky(url, env))
      }

      if (path === '/planes' && request.method === 'POST') {
        return withCors(await handleCreatePlane(request, env))
      }

      const planeMatch = path.match(/^\/planes\/([^/]+)$/)
      if (planeMatch && request.method === 'GET') {
        return withCors(await handleGetPlane(planeMatch[1], env))
      }

      const cheerMatch = path.match(/^\/planes\/([^/]+)\/cheer$/)
      if (cheerMatch && request.method === 'POST') {
        return withCors(await handleCheer(cheerMatch[1], request, env))
      }

      const relayMatch = path.match(/^\/planes\/([^/]+)\/relay$/)
      if (relayMatch && request.method === 'POST') {
        return withCors(await handleRelay(relayMatch[1], request, env))
      }

      const claimMatch = path.match(/^\/planes\/([^/]+)\/claim$/)
      if (claimMatch && request.method === 'POST') {
        return withCors(await handleClaim(claimMatch[1], request, env))
      }

      return withCors(new Response('not found', { status: 404 }))
    } catch (err) {
      return serverError(err)
    }
  },
}
