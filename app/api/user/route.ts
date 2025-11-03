import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

async function getDevUser() {
  const email = 'dev@local';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, name: 'Dev User', role: 'ADMIN' } });
  }
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session) {
      if (process.env.DEV_DISABLE_AUTH === 'true') {
        const user = await getDevUser();
        return NextResponse.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        });
      }
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

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
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session) {
      if (process.env.DEV_DISABLE_AUTH === 'true') {
        const devUser = await getDevUser();
        const body = await req.json();
        const allowedFields: any = {};
        if (body.name !== undefined) allowedFields.name = body.name;
        if (body.role !== undefined) allowedFields.role = body.role;
        const user = await prisma.user.update({
          where: { id: devUser.id },
          data: allowedFields,
          select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
        });
        return NextResponse.json(user);
      }
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await req.json();

    // Only allow updating name and role (admin can change role, users can only change name)
    const allowedFields: any = {};
    if (body.name !== undefined) {
      allowedFields.name = body.name;
    }
    
    // Only allow role change if user is admin
    if (body.role !== undefined && session.user.role === 'ADMIN') {
      allowedFields.role = body.role;
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: allowedFields,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

