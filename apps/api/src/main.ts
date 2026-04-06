import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const serverPort = configService.get<string>('PORT');
  if (!frontendUrl || !serverPort) {
    console.error(
      'Missing required environment variables: FRONTEND_URL or PORT',
      { frontendUrl, serverPort },
    );
    return;
  }

  const port = Number.parseInt(serverPort, 10);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['health'] });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Later')
    .setDescription('Later API documentation')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(port);
}

void bootstrap();
