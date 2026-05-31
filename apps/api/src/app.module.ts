import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChatsModule } from './chats/chats.module';
import { MessagesModule } from './messages/messages.module';
import { MongoModule } from './mongo/mongo.module';
import { PerformanceAnalyticsModule } from './performance-analytics/performance-analytics.module';
import { PerformanceInterceptor } from './shared/interceptors/performance.interceptor';
import { UserActionsModule } from './user-actions/user-actions.module';
import { MessageBurndownSnapshotsModule } from './message-burndown-snapshots/message-burndown-snapshots.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ChatsModule,
    MessagesModule,
    MongoModule,
    PerformanceAnalyticsModule,
    UserActionsModule,
    MessageBurndownSnapshotsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
})
export class AppModule {}
