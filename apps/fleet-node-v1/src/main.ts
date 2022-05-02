import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import {
  SwaggerAnnotatedLinkedDataProof,
  SwaggerAnnotatedVerifiableCredential,
  SwaggerAnnotatedVerifiablePresentation,
} from '@bloxmove-com/did-asset-library-nestjs-obfuscated';

import * as fs from 'fs';

// tslint:disable-next-line: no-var-requires
const YAML = require('json-to-pretty-yaml');
const appVersion = process.env.npm_package_version;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const options = new DocumentBuilder()
    .addApiKey(
      {
        type: 'apiKey',
      },
      'apiKey',
    )
    .setTitle(`Fleet Node`)
    .setDescription('The FleetNode API description.')
    .setVersion(appVersion)
    .addServer(process.env.SWAGGER_BASE_PATH || '/')
    .build();
  const document = SwaggerModule.createDocument(app, options, {
    extraModels: [SwaggerAnnotatedLinkedDataProof, SwaggerAnnotatedVerifiableCredential, SwaggerAnnotatedVerifiablePresentation],
  });

  if (process.env['GENERATE_SWAGGER_DOC'] === 'true') {
    const swaggerYml = YAML.stringify(document);
    fs.writeFileSync('./api/fleet-node-spec.yaml', swaggerYml);
  }

  SwaggerModule.setup('api', app, document);
  const portKey = 'PORT';
  const endpoint = process.env[portKey] || 3000;
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  await app.listen(endpoint);
}
bootstrap();
