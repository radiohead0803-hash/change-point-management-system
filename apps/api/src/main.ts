import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  // Validate required environment variables
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`,
    );
  }

  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global prefix - must be set before Swagger setup
  app.setGlobalPrefix('api');

  // Security
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger (path 'api/docs' to avoid conflict with global prefix)
  const config = new DocumentBuilder()
    .setTitle('변동점 관리 시스템 API')
    .setDescription('변동점 관리 시스템의 REST API 문서')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on port ${port}`);
  logger.log(`Swagger documentation: /api/docs`);
  logger.log(`Health check: /api/health`);
}
bootstrap();
