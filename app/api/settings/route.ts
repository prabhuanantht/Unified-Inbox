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
    
    let userId: string | undefined;
    if (!session) {
      if (process.env.DEV_DISABLE_AUTH === 'true') {
        const user = await getDevUser();
        userId = user.id;
      } else {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      userId = session.user.id;
    }

    // Get or create settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId: userId! },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: userId!,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    let userId: string | undefined;
    if (!session) {
      if (process.env.DEV_DISABLE_AUTH === 'true') {
        const user = await getDevUser();
        userId = user.id;
      } else {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      userId = session.user.id;
    }

    const body = await req.json();

    // Get existing settings first
    let existingSettings = await prisma.userSettings.findUnique({
      where: { userId: userId! },
    });

    // If settings don't exist, create with defaults
    if (!existingSettings) {
      existingSettings = await prisma.userSettings.create({
        data: {
          userId: userId!,
        },
      });
    }

    // Merge with existing settings (only update provided fields)
    const updatedSettings = await prisma.userSettings.update({
      where: { userId: userId! },
      data: {
        ...body,
      },
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

