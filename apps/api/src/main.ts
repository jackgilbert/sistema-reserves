import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // Validate required environment variables
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  const app = await NestFactory.create(AppModule);

  // API versioning
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'], // Exclude health check from versioning
  });

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
  
  // Define allowed origin patterns
  const allowedOriginPatterns: RegExp[] = [
    /^https?:\/\/localhost(?::\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
  ];
  
  // Add dev/preview patterns only in non-production
  if (!isProduction) {
    allowedOriginPatterns.push(
      /^https?:\/\/.*\.app\.github\.dev(?::\d+)?$/,
      /^https?:\/\/.*\.githubpreview\.dev(?::\d+)?$/,
      /^https?:\/\/.*\.github\.dev(?::\d+)?$/,
    );
  }
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Validate origin format to prevent header injection
      if (typeof origin !== 'string' || origin.length > 2048) {
        return callback(new Error('Invalid origin format'));
      }

      // Check if origin matches any allowed pattern
      const allowed = allowedOriginPatterns.some((pattern) => pattern.test(origin));
      
      if (allowed) {
        return callback(null, true);
      }
      
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
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
