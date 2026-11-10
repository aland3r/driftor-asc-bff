import { DocumentationSource, FnAdwinClient, IpddClient, PminingClient } from '../../application/ports';

export interface Upstreams {
  pminingUrl: string;
  ipddUrl: string;
  fnAdwinUrl: string;
  arc42Url: string;
  timeoutMs: number;
  functionTimeoutMs: number;
}

export function upstreamsFromEnv(): Upstreams {
  return {
    pminingUrl: process.env.PMINING_URL ?? 'http://localhost:8081',
    ipddUrl: process.env.IPDD_URL ?? 'http://localhost:8082',
    fnAdwinUrl: process.env.FN_ADWIN_URL ?? 'http://localhost:7071',
    arc42Url:
      process.env.ARC42_URL ?? 'https://raw.githubusercontent.com/aland3r/deviante-docs/main/architecture/arc42.md',
    timeoutMs: Number(process.env.UPSTREAM_TIMEOUT_MS ?? 10000),
    functionTimeoutMs: Number(process.env.FUNCTION_TIMEOUT_MS ?? 20000),
  };
}

async function getJson(url: string, timeoutMs: number, init?: RequestInit): Promise<any | null> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${new URL(url).host} respondeu ${res.status}`);
  return res.json();
}

const join = (base: string, path: string) => `${base.replace(/\/$/, '')}${path}`;

export class HttpIpddClient implements IpddClient {
  constructor(private readonly u: Upstreams) {}
  getAnalysis(id: string) {
    return getJson(join(this.u.ipddUrl, `/analyses/${encodeURIComponent(id)}`), this.u.timeoutMs);
  }
  async listAnalyses() {
    return (await getJson(join(this.u.ipddUrl, '/analyses'), this.u.timeoutMs)) ?? [];
  }
}

export class HttpPminingClient implements PminingClient {
  constructor(private readonly u: Upstreams) {}
  getProcess(id: string) {
    return getJson(join(this.u.pminingUrl, `/processes/${encodeURIComponent(id)}`), this.u.timeoutMs);
  }
  async listProcesses() {
    return (await getJson(join(this.u.pminingUrl, '/processes'), this.u.timeoutMs)) ?? [];
  }
}

export class HttpFnAdwinClient implements FnAdwinClient {
  constructor(private readonly u: Upstreams) {}
  detect(values: number[], treatment: 'raw' | 'treated', delta: number) {
    return getJson(join(this.u.fnAdwinUrl, '/api/adwin'), this.u.functionTimeoutMs, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ values, treatment, delta }),
    });
  }
  async health() {
    const body = await getJson(join(this.u.fnAdwinUrl, '/api/health'), this.u.functionTimeoutMs);
    return body?.status === 'ok';
  }
}

export class GithubDocumentation implements DocumentationSource {
  constructor(private readonly u: Upstreams) {}
  async arc42() {
    const res = await fetch(this.u.arc42Url, { signal: AbortSignal.timeout(this.u.timeoutMs) });
    if (!res.ok) throw new Error(`documentação indisponível (${res.status})`);
    return res.text();
  }
}
