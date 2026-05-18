import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');

  const port = Number(process.env.PORT ?? 8080);
  const env = process.env.NODE_ENV ?? 'development';
  const corsOrigins = (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim());

  // Security headers
  app.use(helmet());

  // CORS multi-origen (admin web + mobile dev server)
  app.enableCors({
    origin: corsOrigins[0] === '*' ? true : corsOrigins,
    credentials: true,
  });

  // Stripe webhooks necesitan el cuerpo raw — se monta antes de json parser
  // (configurado en webhooks/stripe.webhook.controller.ts).

  // Validación global con DTOs + class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Prefijo + versionado por URI
  app.setGlobalPrefix('api');

  // OpenAPI (Swagger) sólo en dev/staging
  if (env !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('G3 Backend API')
      .setDescription('Multi-tenant SaaS para logística de transporte — Drive + Admin')
      .setVersion('0.1')
      .addBearerAuth()
      .addTag('auth')
      .addTag('companies')
      .addTag('subscriptions')
      .addTag('trips')
      .addTag('drivers')
      .addTag('tractors')
      .addTag('trailers')
      .addTag('alerts')
      .addTag('ai')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log(`Swagger UI en http://localhost:${port}/docs`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`G3 Backend escuchando en :${port} · env=${env}`);
}

bootstrap();
