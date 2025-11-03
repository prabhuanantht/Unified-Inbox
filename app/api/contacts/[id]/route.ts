import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { contactSchema } from '@/lib/validations';
import { z } from 'zod';

/**
 * GET /api/contacts/[id] - Fetch a specific contact
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Next.js 14 and 15 param formats
    const resolvedParams = 'then' in params ? await params : params;
    
    const contact = await prisma.contact.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        socialHandles: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            contactId: true,
            userId: true,
            channel: true,
            direction: true,
            content: true,
            status: true,
            metadata: true,
            mediaUrls: true,
            scheduledFor: true,
            sentAt: true,
            deliveredAt: true,
            readAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            contactId: true,
            userId: true,
            content: true,
            isPrivate: true,
            mentions: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contacts/[id] - Update a contact
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Next.js 14 and 15 param formats
    const resolvedParams = 'then' in params ? await params : params;
    const body = await req.json();
    const validatedData = contactSchema.partial().parse(body);

    const contact = await prisma.contact.update({
      where: { id: resolvedParams.id },
      data: validatedData,
    });

    return NextResponse.json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/[id] - Delete a contact
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Next.js 14 and 15 param formats
    const resolvedParams = 'then' in params ? await params : params;
    const contact = await prisma.contact.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Defensive cleanup in case FK cascade isn't present in current DB
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { contactId: resolvedParams.id } }),
      prisma.note.deleteMany({ where: { contactId: resolvedParams.id } }),
      prisma.activityLog.deleteMany({ where: { entityType: 'CONTACT', entityId: resolvedParams.id } }),
      prisma.contact.delete({ where: { id: resolvedParams.id }, select: { id: true } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
