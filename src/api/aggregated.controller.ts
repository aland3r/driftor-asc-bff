import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InvalidInputError } from '../domain/aggregation';
import { GetAggregatedDataHandler } from '../application/get-aggregated-data/handler';
import { GetDocumentationHandler } from '../application/get-documentation/handler';
import { GetOverviewHandler } from '../application/get-overview/handler';

@ApiTags('Agregação')
@Controller()
export class AggregatedController {
  constructor(
    private readonly aggregated: GetAggregatedDataHandler,
    private readonly overview: GetOverviewHandler,
    private readonly documentation: GetDocumentationHandler,
  ) {}

  @Get('aggregated-data')
  @ApiOperation({
    summary: 'Análise (MS2) + processo (MS1) + série tratada (Azure Function) num único JSON',
    description: 'Chamadas em paralelo com timeout; uma fonte que falha volta null e aparece em sources.',
  })
  @ApiQuery({ name: 'analysisId', required: true })
  get(@Query('analysisId') analysisId: string) {
    if (!analysisId) throw new InvalidInputError('Informe analysisId.');
    return this.aggregated.handle(analysisId);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard: processos (MS1), análises (MS2) e saúde da Function' })
  getOverview() {
    return this.overview.handle();
  }

  @Get('documentation/arc42')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  @ApiOperation({ summary: 'arc42 do projeto em Markdown' })
  arc42() {
    return this.documentation.handle();
  }

  @Get('health')
  @ApiTags('Saúde')
  health() {
    return { status: 'ok', service: 'bff' };
  }
}
