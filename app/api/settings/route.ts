import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'temp-user-id';

    // Get or create settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
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
    const userId = req.headers.get('x-user-id') || 'temp-user-id';
    const body = await req.json();

    // Get existing settings first
    let existingSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // If settings don't exist, create with defaults
    if (!existingSettings) {
      existingSettings = await prisma.userSettings.create({
        data: {
          userId,
        },
      });
    }

    // Merge with existing settings (only update provided fields)
    const updatedSettings = await prisma.userSettings.update({
      where: { userId },
      data: {
        ...body, // Only update fields provided in the request
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

