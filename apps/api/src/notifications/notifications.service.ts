import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
  ) {}

  async findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  async removeAll(userId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId },
    });
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    eventId?: string;
  }) {
    const notification = await this.prisma.notification.create({ data: data as any });

    // 푸시 알림 전송 (비동기, 실패해도 알림 생성에 영향 없음)
    this.pushService.sendPush(data.userId, {
      title: data.title,
      body: data.message,
      url: data.eventId ? `/change-events/${data.eventId}` : '/notifications',
      tag: data.type,
    }).catch(() => {});

    return notification;
  }

  // 승인 요청 알림 전송 (검토자·중역에게)
  async notifyApprovalRequest(eventId: string, eventTitle: string, reviewerId?: string, executiveId?: string) {
    const notifications: Promise<any>[] = [];
    if (reviewerId) {
      notifications.push(this.create({
        userId: reviewerId,
        type: 'APPROVAL_REQUEST',
        title: '승인 요청',
        message: `"${eventTitle}" 변동점의 검토가 요청되었습니다.`,
        eventId,
      }));
    }
    if (executiveId) {
      notifications.push(this.create({
        userId: executiveId,
        type: 'APPROVAL_REQUEST',
        title: '승인 요청',
        message: `"${eventTitle}" 변동점의 승인이 요청되었습니다.`,
        eventId,
      }));
    }
    return Promise.all(notifications);
  }

  // 승인 완료 알림 (등록자에게)
  async notifyApproved(eventId: string, eventTitle: string, creatorId: string) {
    return this.create({
      userId: creatorId,
      type: 'APPROVED',
      title: '승인 완료',
      message: `"${eventTitle}" 변동점이 승인되었습니다.`,
      eventId,
    });
  }

  // 보완 요청 알림 (등록자에게)
  async notifyReturned(eventId: string, eventTitle: string, creatorId: string, returnComment?: string) {
    const comment = returnComment ? `\n사유: ${returnComment}` : '';
    return this.create({
      userId: creatorId,
      type: 'REVIEW_RETURNED',
      title: '보완 요청',
      message: `"${eventTitle}" 변동점에 보완이 요청되었습니다.${comment}`,
      eventId,
    });
  }
}
