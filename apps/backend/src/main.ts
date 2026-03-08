import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const frontendUrl = configService.get<string>('FRONTEND_BASE_URL');
      if (!origin || origin === frontendUrl) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
