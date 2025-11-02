import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'temp-user-id';

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}

