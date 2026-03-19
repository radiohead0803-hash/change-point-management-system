import { Module } from '@nestjs/common';
import { ChangeEventsService } from './change-events.service';
import { ChangeEventsController } from './change-events.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ChangeEventsController],
  providers: [ChangeEventsService],
  exports: [ChangeEventsService],
})
export class ChangeEventsModule {}
