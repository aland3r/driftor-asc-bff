import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError, SourceResult, SourceStatus, TreatedSeries, partial } from '../../domain/aggregation';
import { CLOCK, Clock, FN_ADWIN, FnAdwinClient, IPDD, IpddClient, PMINING, PminingClient } from '../ports';

export interface AggregatedData {
  analysisId: string;
  analysis: any | null;
  process: any | null;
  treatedSeries: TreatedSeries | null;
  sources: SourceStatus[];
  generatedAt: string;
}

/**
 * GET /aggregated-data: junta numa resposta a análise (MS2, Azure SQL), o
 * processo com grafo e variantes (MS1, MongoDB) e a série tratada calculada na
 * hora pela Azure Function. pmining e Function rodam em paralelo; quem falhar
 * vem como null e o restante é devolvido.
 */
@Injectable()
export class GetAggregatedDataHandler {
  constructor(
    @Inject(IPDD) private readonly ipdd: IpddClient,
    @Inject(PMINING) private readonly pmining: PminingClient,
    @Inject(FN_ADWIN) private readonly fn: FnAdwinClient,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async handle(analysisId: string): Promise<AggregatedData> {
    const analysis = await this.attempt('ipdd', () => this.ipdd.getAnalysis(analysisId));
    if (analysis.status.ok && analysis.value === null) throw new NotFoundError('Análise não encontrada.');

    const a = analysis.value;
    const values: number[] = (a?.points ?? []).map((p: any) => p.value);
    const [process, treated] = await Promise.all([
      a ? this.attempt('pmining', () => this.pmining.getProcess(a.processId)) : Promise.resolve(this.skipped('pmining')),
      values.length >= 2
        ? this.attempt('fnAdwin', async () => {
            const r = await this.fn.detect(values, 'treated', a.delta);
            return {
              treatment: 'treated' as const,
              smoothingWindow: r.smoothingWindow,
              processedValues: r.processedValues,
              outlierIndices: r.outlierIndices,
            };
          })
        : Promise.resolve(this.skipped('fnAdwin')),
    ]);

    return {
      analysisId,
      analysis: a,
      process: process.value,
      treatedSeries: treated.value,
      sources: [analysis.status, process.status, treated.status],
      generatedAt: new Date(this.clock.now()).toISOString(),
    };
  }

  private async attempt<T>(source: 'ipdd' | 'pmining' | 'fnAdwin', call: () => Promise<T>): Promise<SourceResult<T>> {
    const started = this.clock.now();
    try {
      return partial(source, started, this.clock.now(), await call());
    } catch (err) {
      return partial<T>(source, started, this.clock.now(), null, err);
    }
  }

  private skipped(source: 'pmining' | 'fnAdwin'): SourceResult<any> {
    const now = this.clock.now();
    return partial(source, now, now, null, new Error('não consultado: a análise não está disponível'));
  }
}
