import { Controller, Delete, Get, Inject, Patch, Post, Put, Req, Res } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { forward } from '../infrastructure/http/proxy';
import type { Upstreams } from '../infrastructure/http/clients';

export const UPSTREAMS = Symbol('Upstreams');

const uploadSchema = {
  schema: {
    type: 'object',
    required: ['name', 'file'],
    properties: { name: { type: 'string', example: 'Torno 02' }, file: { type: 'string', format: 'binary' } },
  },
};

@ApiTags('Processos (MS1 · pmining · MongoDB)')
@Controller('processes')
export class ProcessesProxyController {
  constructor(@Inject(UPSTREAMS) private readonly u: Upstreams) {}

  private to(req: Request, res: Response, path: string) {
    return forward(req, res, this.u.pminingUrl, path, 120000);
  }

  @Post()
  @ApiOperation({ summary: 'Cria o processo a partir do event log (.xes ou .csv)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadSchema)
  create(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, '/processes');
  }

  @Get()
  @ApiOperation({ summary: 'Lista os processos' })
  list(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, '/processes');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do processo com operações, grafo e variantes' })
  get(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, `/processes/${encodeURIComponent(String(req.params.id))}`);
  }

  @Put(':id/operations')
  @ApiOperation({ summary: 'Mapeia operações para atividades' })
  @ApiBody({ schema: { example: { operations: [{ rawLabel: 'Machine_Operating', activity: 'Machine_Operating' }] } } })
  map(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, `/processes/${encodeURIComponent(String(req.params.id))}/operations`);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renomeia o processo' })
  @ApiBody({ schema: { example: { name: 'Torno 02' } } })
  rename(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, `/processes/${encodeURIComponent(String(req.params.id))}`);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Exclui o processo (as análises dele saem pelo evento process-deleted)' })
  remove(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, `/processes/${encodeURIComponent(String(req.params.id))}`);
  }

  @Get(':id/traces')
  @ApiOperation({ summary: 'Traces do processo' })
  @ApiQuery({ name: 'variantId', required: false })
  traces(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, `/processes/${encodeURIComponent(String(req.params.id))}/traces`);
  }

  @Get(':id/series')
  @ApiOperation({ summary: 'Série de duração por trace' })
  @ApiQuery({ name: 'activity', required: false })
  series(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, `/processes/${encodeURIComponent(String(req.params.id))}/series`);
  }
}

@ApiTags('Atividades (MS1 · pmining · MongoDB)')
@Controller('activities')
export class ActivitiesProxyController {
  constructor(@Inject(UPSTREAMS) private readonly u: Upstreams) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de atividades' })
  list(@Req() req: Request, @Res() res: Response) {
    return forward(req, res, this.u.pminingUrl, '/activities', this.u.timeoutMs);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma atividade' })
  @ApiBody({ schema: { example: { name: 'Machine_Operating' } } })
  create(@Req() req: Request, @Res() res: Response) {
    return forward(req, res, this.u.pminingUrl, '/activities', this.u.timeoutMs);
  }
}

@ApiTags('Análises (MS2 · ipdd · Azure SQL)')
@Controller('analyses')
export class AnalysesProxyController {
  constructor(@Inject(UPSTREAMS) private readonly u: Upstreams) {}

  private to(req: Request, res: Response, path: string) {
    return forward(req, res, this.u.ipddUrl, path, 60000);
  }

  @Post()
  @ApiOperation({ summary: 'Cria a análise; o cálculo segue pela fila analysis-requested' })
  @ApiBody({ schema: { example: { processId: '…', delta: 0.002, treatment: 'raw', activity: 'Machine_Operating' } } })
  create(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, '/analyses');
  }

  @Get()
  @ApiOperation({ summary: 'Lista as análises' })
  @ApiQuery({ name: 'processId', required: false })
  list(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, '/analyses');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da análise' })
  @ApiParam({ name: 'id' })
  get(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, `/analyses/${encodeURIComponent(String(req.params.id))}`);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renomeia a análise' })
  @ApiBody({ schema: { example: { name: 'DR_20 · Machine_Operating' } } })
  rename(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, `/analyses/${encodeURIComponent(String(req.params.id))}`);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Exclui a análise' })
  remove(@Req() req: Request, @Res() res: Response) {
    return this.to(req, res, `/analyses/${encodeURIComponent(String(req.params.id))}`);
  }
}
