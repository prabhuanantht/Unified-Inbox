import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics - Get analytics data
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'temp-user-id';
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Check if user has messages, if not, show all messages
    const userMessageCount = await prisma.message.count({
      where: { userId },
    });
    
    const shouldFilterByUser = userMessageCount > 0;

    // Message volume by channel
    const messagesByChannel = await prisma.message.groupBy({
      by: ['channel'],
      where: shouldFilterByUser ? {
        userId,
        createdAt: { gte: startDate },
      } : {
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Get all messages for better analytics
    const allMessages = await prisma.message.findMany({
      where: shouldFilterByUser ? {
        userId,
        createdAt: { gte: startDate },
      } : {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        direction: true,
        contactId: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Calculate response times by grouping messages by contact
    type MessageForAnalytics = {
      createdAt: Date;
      direction: string;
      contactId: string;
    };
    const contactMessages = new Map<string, MessageForAnalytics[]>();
    allMessages.forEach((msg: MessageForAnalytics) => {
      const existing = contactMessages.get(msg.contactId) || [];
      existing.push(msg);
      contactMessages.set(msg.contactId, existing);
    });

    const responseTimes: number[] = [];
    contactMessages.forEach((msgs: MessageForAnalytics[]) => {
      // Find sequences of inbound followed by outbound
      for (let i = 0; i < msgs.length - 1; i++) {
        if (msgs[i].direction === 'INBOUND' && msgs[i + 1].direction === 'OUTBOUND') {
          const diff = msgs[i + 1].createdAt.getTime() - msgs[i].createdAt.getTime();
          responseTimes.push(diff / 1000 / 60); // Convert to minutes
        }
      }
    });

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Message status distribution
    const messagesByStatus = await prisma.message.groupBy({
      by: ['status'],
      where: shouldFilterByUser ? {
        userId,
        createdAt: { gte: startDate },
      } : {
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Daily message volume
    const dailyMessagesMap = new Map<string, number>();
    allMessages.forEach((msg: MessageForAnalytics) => {
      const date = msg.createdAt.toISOString().split('T')[0];
      dailyMessagesMap.set(date, (dailyMessagesMap.get(date) || 0) + 1);
    });

    const dailyMessages = Array.from(dailyMessagesMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate outbound vs inbound messages
    const outboundCount = allMessages.filter((m: MessageForAnalytics) => m.direction === 'OUTBOUND').length;
    const inboundCount = allMessages.filter((m: MessageForAnalytics) => m.direction === 'INBOUND').length;

    return NextResponse.json({
      messagesByChannel,
      messagesByStatus,
      avgResponseTime: Math.round(avgResponseTime),
      dailyMessages,
      totalMessages: allMessages.length,
      outboundCount,
      inboundCount,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
