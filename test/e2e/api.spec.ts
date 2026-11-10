import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import express from 'express';
import { AddressInfo } from 'net';
import { Server } from 'http';
import request from 'supertest';
import { AppModule } from '../../src/api/app.module';
import { configure } from '../../src/api/main';

/** Um "microsserviço" falso que ecoa o que recebeu. */
function fakeUpstream(): Promise<Server> {
  const app = express();
  app.use(express.json());
  app.post('/processes', (req, res) => {
    let size = 0;
    req.on('data', (c) => (size += c.length));
    req.on('end', () => res.status(201).json({ id: 'p1', multipart: String(req.headers['content-type']).startsWith('multipart/'), size }));
  });
  app.patch('/analyses/:id', (req, res) => res.json({ id: req.params.id, name: req.body.name }));
  app.get('/analyses', (req, res) => res.json([{ id: 'a1', q: req.query.processId }]));
  app.delete('/processes/:id', (_req, res) => res.status(204).end());
  app.get('/processes/:id', (_req, res) => res.status(404).json({ detail: 'Processo não encontrado.' }));
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

describe('BFF HTTP', () => {
  let app: INestApplication;
  let upstream: Server;

  beforeAll(async () => {
    upstream = await fakeUpstream();
    const url = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppModule.register({
          upstreams: { pminingUrl: url, ipddUrl: url, fnAdwinUrl: url, arc42Url: `${url}/arc42.md`, timeoutMs: 2000, functionTimeoutMs: 2000 },
          documentation: { arc42: async () => '# Driftor' },
        }),
      ],
    }).compile();
    app = configure(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    upstream.close();
  });

  it('repassa upload multipart em stream', async () => {
    const res = await request(app.getHttpServer())
      .post('/processes')
      .field('name', 'Torno')
      .attach('file', Buffer.from('Case;Atividade\n1;A'), 'log.csv')
      .expect(201);
    expect(res.body.multipart).toBe(true);
    expect(res.body.size).toBeGreaterThan(20);
  });

  it('repassa JSON, query, status e erros do microsserviço', async () => {
    const http = request(app.getHttpServer());
    expect((await http.patch('/analyses/a1').send({ name: 'Nova' }).expect(200)).body).toEqual({ id: 'a1', name: 'Nova' });
    expect((await http.get('/analyses?processId=p1').expect(200)).body[0].q).toBe('p1');
    await http.delete('/processes/p1').expect(204);
    expect((await http.get('/processes/x').expect(404)).body.detail).toContain('não encontrado');
  });

  it('publica swagger, documentação e valida aggregated-data', async () => {
    const http = request(app.getHttpServer());
    const docs = await http.get('/docs-json').expect(200);
    expect(Object.keys(docs.body.paths)).toEqual(expect.arrayContaining(['/aggregated-data', '/processes', '/analyses/{id}']));
    expect((await http.get('/documentation/arc42').expect(200)).text).toBe('# Driftor');
    await http.get('/aggregated-data').expect(422);
  });
});
