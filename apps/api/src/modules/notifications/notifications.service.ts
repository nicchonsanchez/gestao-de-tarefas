import { Injectable } from '@nestjs/common';
import type { NotificationType } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

interface CreateNotificationParams {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(params: CreateNotificationParams) {
    return this.prisma.notification.create({ data: params });
  }

  async createMany(items: CreateNotificationParams[]) {
    if (items.length === 0) return { count: 0 };
    return this.prisma.notification.createMany({ data: items, skipDuplicates: true });
  }

  list(userId: string, opts: { onlyUnread?: boolean; take?: number } = {}) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(opts.onlyUnread ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: opts.take ?? 50,
    });
  }

  countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllAsRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { count: res.count };
  }
}
