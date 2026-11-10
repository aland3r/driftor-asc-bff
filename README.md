# Driftor ASC · BFF

Backend for Frontend do **Driftor ASC**, entrega 3 de Arquitetura e Soluções Cloud (PUCPR). É a única API que o [front](https://github.com/aland3r/driftor-asc-mfe) chama, sempre passando pelo Azure API Management. Repassa os CRUDs dos dois microsserviços e compõe o `GET /aggregated-data`.

## Na nuvem

| | URL |
|---|---|
| Pelo API Management (usado pelo front) | https://driftor-asc-apim.azure-api.net |
| BFF direto | https://driftor-asc-bff.fly.dev |
| Swagger | https://driftor-asc-bff.fly.dev/docs |
| Imagem | [aland3r/driftor-asc-bff](https://hub.docker.com/r/aland3r/driftor-asc-bff) |

## `GET /aggregated-data?analysisId=`

Junta numa resposta só:

| Campo | Fonte |
|---|---|
| `analysis` | MS2 [ipdd](https://github.com/aland3r/driftor-asc-ipdd) (Azure SQL): análise, desvios, série e segmentos |
| `process` | MS1 [pmining](https://github.com/aland3r/driftor-asc-pmining) (MongoDB): processo, grafo e variantes |
| `treatedSeries` | Azure Function [fn-adwin](https://github.com/aland3r/driftor-asc-fn-adwin) (HTTP): a série tratada que o gráfico mostra |
| `sources` | tempo e situação de cada chamada |

A análise vem primeiro (ela diz qual é o processo); pmining e Function são chamados em paralelo. Cada chamada tem timeout e, se uma falhar, o campo dela vem `null` e o resto é devolvido.

```json
{
  "analysisId": "…",
  "analysis": { "name": "DR_20 · Machine_Operating", "status": "concluida", "driftCount": 4, "drifts": [ … ], "points": [ … ], "segments": [ … ] },
  "process": { "name": "DR_20", "graph": { "nodes": [ … ], "edges": [ … ] }, "variants": [ … ] },
  "treatedSeries": { "smoothingWindow": 15, "processedValues": [ … ], "outlierIndices": [ … ] },
  "sources": [ { "source": "ipdd", "ok": true, "ms": 180 }, { "source": "pmining", "ok": true, "ms": 240 }, { "source": "fnAdwin", "ok": true, "ms": 310 } ],
  "generatedAt": "2026-11-11T14:00:00.000Z"
}
```

## Outras rotas

| Rota | Destino |
|---|---|
| `/processes`, `/processes/{id}`, `/processes/{id}/operations`, `/processes/{id}/traces`, `/processes/{id}/series`, `/activities` | pmining |
| `/analyses`, `/analyses/{id}` | ipdd |
| `GET /overview` | dashboard: processos, análises e saúde da Function, em paralelo |
| `GET /documentation/arc42` | o arc42 do projeto em Markdown, com cache de 10 minutos |

## Arquitetura

```
src/
  domain/          composição parcial (fonte ok ou null com o motivo)
  application/     get-aggregated-data/  get-overview/  get-documentation/  e as portas
  infrastructure/  clientes HTTP dos microsserviços e da Function; proxy em stream
  api/             NestJS: controllers, Swagger, composição
```

Os testes de arquitetura rodam o [dependency-cruiser](.dependency-cruiser.cjs): domínio sem imports externos, aplicação sem infraestrutura nem Express, fatias independentes e sem ciclos.

## Tecnologias

Node 20, TypeScript, NestJS, Swagger (OpenAPI), Jest, Supertest, dependency-cruiser, Docker, GitHub Actions, Fly.io, Azure API Management.

## Rodar localmente

```bash
npm ci
npm test
cp .env.example .env
npm run build && node --env-file=.env dist/api/main.js   # http://localhost:8080/docs
```

Ou com Docker:

```bash
docker run -p 8080:8080 --env-file .env aland3r/driftor-asc-bff:v1
```

## Pipeline

A cada push na `main`, o GitHub Actions roda os testes, publica a imagem no Docker Hub (`v1` e o hash do commit) e implanta essa imagem no Fly.io. Secrets usados: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `FLY_API_TOKEN`.

## Grupo

- Alander Menezes Arantes de Ávila
- Bernardo Creplive Vieira
- Emanuelle Skolut Jose
- Murilo Regnier Stange
