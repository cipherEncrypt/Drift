export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return Response.json({
        ok: true,
        service: 'drift-api',
        phase: 0,
      })
    }

    return new Response('Drift API. Phase 0 stub. Try /health.', {
      status: 404,
    })
  },
}
