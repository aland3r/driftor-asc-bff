import { Inject, Injectable } from '@nestjs/common';
import { SourceResult, SourceStatus, partial } from '../../domain/aggregation';
import { CLOCK, Clock, FN_ADWIN, FnAdwinClient, IPDD, IpddClient, PMINING, PminingClient } from '../ports';

export interface Overview {
  processes: any[] | null;
  analyses: any[] | null;
  functionOnline: boolean | null;
  sources: SourceStatus[];
  generatedAt: string;
}

/** Dashboard: processos (MS1), análises (MS2) e saúde da Function, em paralelo. */
@Injectable()
export class GetOverviewHandler {
  constructor(
    @Inject(IPDD) private readonly ipdd: IpddClient,
    @Inject(PMINING) private readonly pmining: PminingClient,
    @Inject(FN_ADWIN) private readonly fn: FnAdwinClient,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async handle(): Promise<Overview> {
    const [processes, analyses, fn] = await Promise.all([
      this.attempt('pmining', () => this.pmining.listProcesses()),
      this.attempt('ipdd', () => this.ipdd.listAnalyses()),
      this.attempt('fnAdwin', () => this.fn.health()),
    ]);
    return {
      processes: processes.value,
      analyses: analyses.value,
      functionOnline: fn.value,
      sources: [processes.status, analyses.status, fn.status],
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
}
