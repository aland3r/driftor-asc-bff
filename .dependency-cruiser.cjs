/** Testes de arquitetura: as camadas só dependem para dentro e as fatias não se conhecem. */
module.exports = {
  forbidden: [
    {
      name: 'dominio-puro',
      severity: 'error',
      comment: 'O domínio não importa nada de fora dele (nem pacotes npm).',
      from: { path: '^src/domain' },
      to: { pathNot: '^src/domain' },
    },
    {
      name: 'aplicacao-sem-infra',
      severity: 'error',
      comment: 'A aplicação conhece só o domínio e as próprias portas.',
      from: { path: '^src/application' },
      to: { path: '^src/(infrastructure|api)' },
    },
    {
      name: 'aplicacao-sem-drivers',
      severity: 'error',
      comment: 'HTTP e Express ficam na infraestrutura e na API.',
      from: { path: '^src/application' },
      to: { path: 'node_modules/(express|@nestjs/platform-express)' },
    },
    {
      name: 'infra-sem-api',
      severity: 'error',
      from: { path: '^src/infrastructure' },
      to: { path: '^src/api' },
    },
    {
      name: 'fatias-independentes',
      severity: 'error',
      comment: 'Uma fatia vertical não importa outra.',
      from: { path: '^src/application/([^/]+)/' },
      to: { path: '^src/application/([^/]+)/', pathNot: '^src/application/$1/' },
    },
    { name: 'sem-ciclos', severity: 'error', from: {}, to: { circular: true } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
};
