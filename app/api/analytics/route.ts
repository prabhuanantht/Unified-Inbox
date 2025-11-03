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

    // =============================
    // Call analytics (Twilio voice via metadata.voiceCall)
    // =============================
    const callCandidates = await prisma.message.findMany({
      where: shouldFilterByUser ? {
        userId,
        createdAt: { gte: startDate },
        metadata: { not: null },
      } : {
        createdAt: { gte: startDate },
        metadata: { not: null },
      },
      select: {
        createdAt: true,
        status: true,
        metadata: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const callMessages = callCandidates.filter((m) => (m.metadata as any)?.voiceCall === true);

    const totalCalls = callMessages.length;

    // Calls by type (IMMEDIATE vs SCHEDULED)
    const callsByTypeMap = new Map<string, number>();
    callMessages.forEach((m) => {
      const callType = (m.metadata as any)?.callType || 'UNKNOWN';
      callsByTypeMap.set(callType, (callsByTypeMap.get(callType) || 0) + 1);
    });
    const callsByType = Array.from(callsByTypeMap.entries()).map(([type, _count]) => ({ type, _count }));

    // Calls by status
    const callsByStatusMap = new Map<string, number>();
    callMessages.forEach((m) => {
      callsByStatusMap.set(m.status, (callsByStatusMap.get(m.status) || 0) + 1);
    });
    const callsByStatus = Array.from(callsByStatusMap.entries()).map(([status, _count]) => ({ status, _count }));

    // Daily calls
    const dailyCallsMap = new Map<string, number>();
    callMessages.forEach((m) => {
      const date = m.createdAt.toISOString().split('T')[0];
      dailyCallsMap.set(date, (dailyCallsMap.get(date) || 0) + 1);
    });
    const dailyCalls = Array.from(dailyCallsMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const scheduledCalls = callMessages.filter((m) => m.status === 'SCHEDULED').length;
    const successfulCalls = callMessages.filter((m) => m.status === 'SENT' || m.status === 'DELIVERED').length;
    const failedCalls = callMessages.filter((m) => m.status === 'FAILED').length;
    const callSuccessRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

    return NextResponse.json({
      messagesByChannel,
      messagesByStatus,
      avgResponseTime: Math.round(avgResponseTime),
      dailyMessages,
      totalMessages: allMessages.length,
      outboundCount,
      inboundCount,
      // Call analytics
      totalCalls,
      scheduledCalls,
      successfulCalls,
      failedCalls,
      callSuccessRate,
      callsByType,
      callsByStatus,
      dailyCalls,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
