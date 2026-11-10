import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DomainErrorFilter } from './error.filter';

export function configure(app: INestApplication): INestApplication {
  app.enableCors({ origin: (process.env.CORS_ORIGINS ?? '*').split(',') });
  app.useGlobalFilters(new DomainErrorFilter());
  const config = new DocumentBuilder()
    .setTitle('Driftor ASC · BFF')
    .setDescription(
      'Backend for Frontend do Driftor ASC: única API que o front chama (pelo Azure API Management). ' +
        'Repassa os CRUDs de processos (MS1, MongoDB) e de análises (MS2, Azure SQL) e compõe o GET /aggregated-data.',
    )
    .setVersion('1.0.0')
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, config));
  return app;
}

async function bootstrap() {
  const app = configure(await NestFactory.create(AppModule.register(), { bodyParser: true }));
  await app.listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
}

if (require.main === module) {
  bootstrap();
}
