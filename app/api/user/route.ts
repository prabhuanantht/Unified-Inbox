import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'temp-user-id';

    // Try to find user by ID or get first user
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'temp-user-id';
    const body = await req.json();

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

