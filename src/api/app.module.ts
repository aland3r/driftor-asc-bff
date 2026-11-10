import { DynamicModule, Module } from '@nestjs/common';
import { GetAggregatedDataHandler } from '../application/get-aggregated-data/handler';
import { GetDocumentationHandler } from '../application/get-documentation/handler';
import { GetOverviewHandler } from '../application/get-overview/handler';
import { CLOCK, DOCUMENTATION, DocumentationSource, FN_ADWIN, FnAdwinClient, IPDD, IpddClient, PMINING, PminingClient } from '../application/ports';
import {
  GithubDocumentation,
  HttpFnAdwinClient,
  HttpIpddClient,
  HttpPminingClient,
  Upstreams,
  upstreamsFromEnv,
} from '../infrastructure/http/clients';
import { AggregatedController } from './aggregated.controller';
import { ActivitiesProxyController, AnalysesProxyController, ProcessesProxyController, UPSTREAMS } from './proxy.controllers';

export interface BffOptions {
  upstreams: Upstreams;
  ipdd?: IpddClient;
  pmining?: PminingClient;
  fnAdwin?: FnAdwinClient;
  documentation?: DocumentationSource;
  clock?: { now(): number };
}

@Module({})
export class AppModule {
  static register(o: BffOptions = { upstreams: upstreamsFromEnv() }): DynamicModule {
    return {
      module: AppModule,
      controllers: [AggregatedController, ProcessesProxyController, ActivitiesProxyController, AnalysesProxyController],
      providers: [
        { provide: UPSTREAMS, useValue: o.upstreams },
        { provide: IPDD, useValue: o.ipdd ?? new HttpIpddClient(o.upstreams) },
        { provide: PMINING, useValue: o.pmining ?? new HttpPminingClient(o.upstreams) },
        { provide: FN_ADWIN, useValue: o.fnAdwin ?? new HttpFnAdwinClient(o.upstreams) },
        { provide: DOCUMENTATION, useValue: o.documentation ?? new GithubDocumentation(o.upstreams) },
        { provide: CLOCK, useValue: o.clock ?? { now: () => performance.timeOrigin + performance.now() } },
        GetAggregatedDataHandler,
        GetOverviewHandler,
        GetDocumentationHandler,
      ],
    };
  }
}
