import { GetAggregatedDataHandler } from '../../src/application/get-aggregated-data/handler';
import { GetDocumentationHandler } from '../../src/application/get-documentation/handler';
import { GetOverviewHandler } from '../../src/application/get-overview/handler';
import { NotFoundError } from '../../src/domain/aggregation';

const analysis = { id: 'a1', processId: 'p1', delta: 0.002, points: [{ value: 1 }, { value: 2 }, { value: 3 }] };
const clock = { now: () => 1000 };

function clients(over: Partial<Record<string, any>> = {}) {
  return {
    ipdd: { getAnalysis: jest.fn(async (id: string) => (id === 'a1' ? analysis : null)), listAnalyses: jest.fn(async () => [analysis]) },
    pmining: { getProcess: jest.fn(async () => ({ id: 'p1', name: 'DR_20' })), listProcesses: jest.fn(async () => [{ id: 'p1' }]) },
    fn: {
      detect: jest.fn(async () => ({ smoothingWindow: 3, processedValues: [1.5, 2, 2.5], outlierIndices: [] })),
      health: jest.fn(async () => true),
    },
    ...over,
  };
}

describe('GET /aggregated-data', () => {
  it('junta MS2, MS1 e a Function num JSON', async () => {
    const c = clients();
    const data = await new GetAggregatedDataHandler(c.ipdd, c.pmining, c.fn, clock).handle('a1');
    expect(data.analysis.id).toBe('a1');
    expect(data.process.name).toBe('DR_20');
    expect(data.treatedSeries?.processedValues).toEqual([1.5, 2, 2.5]);
    expect(c.fn.detect).toHaveBeenCalledWith([1, 2, 3], 'treated', 0.002);
    expect(data.sources.every((s) => s.ok)).toBe(true);
  });

  it('devolve resposta parcial quando uma fonte falha', async () => {
    const c = clients({ fn: { detect: jest.fn(async () => { throw new Error('timeout'); }), health: jest.fn() } });
    const data = await new GetAggregatedDataHandler(c.ipdd, c.pmining, c.fn, clock).handle('a1');
    expect(data.treatedSeries).toBeNull();
    expect(data.process).not.toBeNull();
    expect(data.sources.find((s) => s.source === 'fnAdwin')).toMatchObject({ ok: false, error: 'timeout' });
  });

  it('404 quando a análise não existe; ipdd fora do ar vira parcial', async () => {
    const c = clients();
    await expect(new GetAggregatedDataHandler(c.ipdd, c.pmining, c.fn, clock).handle('x')).rejects.toBeInstanceOf(NotFoundError);
    const down = clients({ ipdd: { getAnalysis: jest.fn(async () => { throw new Error('502'); }), listAnalyses: jest.fn() } });
    const data = await new GetAggregatedDataHandler(down.ipdd, down.pmining, down.fn, clock).handle('a1');
    expect(data.analysis).toBeNull();
    expect(data.sources.map((s) => s.ok)).toEqual([false, false, false]);
  });
});

describe('overview e documentação', () => {
  it('overview traz as três fontes', async () => {
    const c = clients();
    const o = await new GetOverviewHandler(c.ipdd, c.pmining, c.fn, clock).handle();
    expect(o.processes).toHaveLength(1);
    expect(o.analyses).toHaveLength(1);
    expect(o.functionOnline).toBe(true);
  });

  it('documentação fica em cache e sobrevive a falha da origem', async () => {
    let calls = 0;
    let fail = false;
    const source = { arc42: async () => { calls++; if (fail) throw new Error('x'); return '# arc42'; } };
    let now = 0;
    const handler = new GetDocumentationHandler(source, { now: () => now });
    expect(await handler.handle()).toBe('# arc42');
    expect(await handler.handle()).toBe('# arc42');
    expect(calls).toBe(1);
    now = 11 * 60 * 1000;
    fail = true;
    expect(await handler.handle()).toBe('# arc42');
  });
});
