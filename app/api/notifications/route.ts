import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'temp-user-id';

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'temp-user-id';
    const body = await req.json();

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: body.type || 'info',
        title: body.title,
        message: body.message,
        link: body.link,
        metadata: body.metadata,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

