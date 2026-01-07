import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global exception filter - siempre retorna JSON
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  // En desarrollo, permitir orígenes típicos (localhost/127.0.0.1 y URLs de ports-forwarding).
  // En producción, restringir a orígenes conocidos.
  const isProduction = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (!isProduction) {
        return callback(null, true);
      }

      // Producción: permitir únicamente orígenes explícitamente aceptados.
      const allowedOriginPatterns: RegExp[] = [
        /^https?:\/\/localhost(?::\d+)?$/,
        /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
        /^https?:\/\/.*\.app\.github\.dev(?::\d+)?$/,
        /^https?:\/\/.*\.githubpreview\.dev(?::\d+)?$/,
        /^https?:\/\/.*\.github\.dev(?::\d+)?$/,
      ];

      const allowed = allowedOriginPatterns.some((pattern) =>
        pattern.test(origin),
      );
      return allowed
        ? callback(null, true)
        : callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Sistema de Reservas API')
    .setDescription('API del sistema de reservas multi-tenant')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API ejecutándose en http://localhost:${port}`);
  console.log(`📚 Documentación en http://localhost:${port}/api/docs`);
}

bootstrap();
