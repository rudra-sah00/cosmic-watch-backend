import { prisma } from '../../config';

export const AlertService = {
  /**
   * Get user's alerts
   */
  async getUserAlerts(userId: string, page: number, limit: number, unreadOnly = false) {
    const where = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const [items, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.alert.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Mark alert as read
   */
  async markAsRead(alertId: string, userId: string) {
    return prisma.alert.updateMany({
      where: { id: alertId, userId },
      data: { isRead: true },
    });
  },

  /**
   * Mark all alerts as read
   */
  async markAllAsRead(userId: string) {
    return prisma.alert.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },

  /**
   * Get unread alert count
   */
  async getUnreadCount(userId: string) {
    return prisma.alert.count({
      where: { userId, isRead: false },
    });
  },

  /**
   * Create alert for close approach
   */
  async createAlert(data: {
    userId: string;
    asteroidId: string;
    asteroidName: string;
    alertType: 'CLOSE_APPROACH' | 'HAZARDOUS_DETECTED' | 'WATCHLIST_UPDATE';
    message: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    approachDate: Date;
    missDistanceKm: number;
    velocityKmph: number;
  }) {
    return prisma.alert.create({ data });
  },
};
