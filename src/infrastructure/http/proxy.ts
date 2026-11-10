import type { Request, Response } from 'express';

/**
 * Só estes cabeçalhos seguem para o microsserviço. Os do navegador (Origin,
 * Accept-Encoding com br/zstd, sec-fetch-*, cookies) e os do API Management
 * ficam no BFF: o microsserviço responde sempre sem compressão, e o BFF
 * devolve exatamente os bytes que leu.
 */
const FORWARDED = ['content-type', 'accept', 'accept-language'];

export async function forward(req: Request, res: Response, baseUrl: string, path: string, timeoutMs: number) {
  const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
  const headers: Record<string, string> = { 'accept-encoding': 'identity' };
  for (const key of FORWARDED) {
    const value = req.headers[key];
    if (typeof value === 'string') headers[key] = value;
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
    const payload = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    const type = upstream.headers.get('content-type');
    if (type) res.setHeader('content-type', type);
    res.setHeader('cache-control', 'no-store');
    if (upstream.status === 204 || upstream.status === 304) res.end();
    else res.send(payload);
  } catch (err) {
    res.status(502).json({ detail: `Serviço indisponível: ${(err as Error).message}` });
  }
}
