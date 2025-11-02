import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { contactSchema } from '@/lib/validations';
import { z } from 'zod';

/**
 * GET /api/contacts - Fetch all contacts for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: Get userId from session
    let userId = req.headers.get('x-user-id') || 'temp-user-id';

    // Get or create a valid user
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // If user doesn't exist, get or create the first user
      user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'system@example.com',
            name: 'System User',
          },
        });
      }
      userId = user.id;
    }

    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts - Create a new contact
 */
export async function POST(req: NextRequest) {
  try {
    let userId = req.headers.get('x-user-id') || 'temp-user-id';
    const body = await req.json();

    const validatedData = contactSchema.parse(body);

    // Get or create a valid user
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // If user doesn't exist, get or create the first user
      user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'system@example.com',
            name: 'System User',
          },
        });
      }
      userId = user.id;
    }

    const contact = await prisma.contact.create({
      data: {
        ...validatedData,
        userId,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
