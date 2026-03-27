import { Controller, Post, Delete, Get, Body, Req } from '@nestjs/common';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { key: this.pushService.getVapidPublicKey() };
  }

  @Post('subscribe')
  subscribe(
    @Req() req: any,
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.pushService.subscribe(req.user.id, body);
  }

  @Delete('unsubscribe')
  unsubscribe(@Req() req: any, @Body() body: { endpoint: string }) {
    return this.pushService.unsubscribe(req.user.id, body.endpoint);
  }
}
