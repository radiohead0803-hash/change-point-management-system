import { Module } from '@nestjs/common';
import { ChangeEventsService } from './change-events.service';
import { ChangeEventsController } from './change-events.controller';

@Module({
  controllers: [ChangeEventsController],
  providers: [ChangeEventsService],
  exports: [ChangeEventsService],
})
export class ChangeEventsModule {}
