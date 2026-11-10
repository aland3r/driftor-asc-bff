import type { Request, Response } from 'express';

// "expect: 100-continue" (curl em uploads grandes) é recusado pelo fetch do Node.
const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'host', 'content-length', 'upgrade', 'expect']);

/**
 * Repassa a requisição ao microsserviço e devolve a resposta como veio.
 * Upload multipart segue em stream (o Nest não consome esse corpo); JSON é
 * reserializado a partir do corpo já lido.
 */
export async function forward(req: Request, res: Response, baseUrl: string, path: string, timeoutMs: number) {
  const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(key) && typeof value === 'string' && !key.startsWith('ocp-apim')) headers[key] = value;
  }
  const contentType = String(req.headers['content-type'] ?? '');
  let body: any = undefined;
  if (!['GET', 'HEAD', 'DELETE'].includes(req.method)) {
    if (contentType.startsWith('multipart/')) body = req;
    else if (req.body !== undefined) body = JSON.stringify(req.body);
  }
  try {
    // duplex 'half' é exigido pelo fetch do Node quando o corpo é um stream.
    const init: RequestInit & { duplex?: 'half' } = {
      method: req.method,
      headers,
      body,
      duplex: body === req ? 'half' : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    };
    const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}${path}${query}`, init);
    res.status(upstream.status);
    const type = upstream.headers.get('content-type');
    if (type) res.setHeader('content-type', type);
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    res.status(502).json({ detail: `Serviço indisponível: ${(err as Error).message}` });
  }
}
